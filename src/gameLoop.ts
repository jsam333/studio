// src/gameLoop.ts
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent, GameMode, Brick, GameState } from './interfaces';
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
import { handleSpawnEvents } from './gameUpdates/gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS,
    TARGET_FPS
} from './constants';
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect, drawPowerUpPreviews } from './drawFunctions';

// Function to handle paddle shrink countdown
const updatePaddleShrinkTimer = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number
) => {
    if (refs.paddleShrinkCountdownRef?.current !== null) {
        refs.paddleShrinkCountdownRef.current -= elapsedTime;
        if (refs.paddleShrinkCountdownRef.current <= 0) {
            refs.paddleShrinkCountdownRef.current = null;
            callbacks.executePaddleShrink();
        }
    }
};

export const gameUpdate = (
    ctx: CanvasRenderingContext2D,
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number
) => {
    const currentGameState = refs.gameOverStateRef.current;

    // --- Draw End Message if applicable --- 
    // Note: This check is moved up because 'level_reset' is technically not playing, 
    // but we don't want to draw the end message for it.
    if (currentGameState === 'won' || currentGameState === 'lost' || currentGameState === 'shop' || currentGameState === 'menu') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        callbacks.drawEndMessage(ctx, currentGameState, refs.scoreRef.current);
        return; // Stop further processing for these states
    }
    
    // If the state is level_reset, we still want the loop to proceed once to handle the reset
    // but we might not want to update/draw everything normally.
    // However, the state change in useGameLogic is quick, so this might not be strictly necessary.
    // We proceed with updates and drawing for 'playing' and 'level_reset' states.

    const currentTime = Date.now();
    const gameSpeedFactor = refs.gameSpeedFactorRef.current;
    const targetFrameTime = 1000 / TARGET_FPS;
    const scaledDeltaTime = elapsedTime / targetFrameTime;

    let spawnRequests: PowerUpSpawnEvent[] = [];
    const previousBallCount = refs.ballsRef.current.length + refs.stuckBallsRef.current.length;

    const columns = refs.brickColumnsRef.current;
    const rows = refs.brickRowsRef.current;
    const gameMode = refs.gameModeRef.current;
    const isTestMode = gameMode === 'test';

    // --- UPDATES (Only if playing or resetting) --- 
    updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    updateBalls(refs, callbacks, spawnRequests, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows);

    // --- DRAWING --- 
    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows);
    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    // *** MODIFIED: Pass livesRef.current to drawGameInfo ***
    drawGameInfo(ctx, refs.scoreRef.current, refs.targetScoreRef.current, refs.goldRef.current, refs.bonusGoldRef.current, isTestMode, refs.livesRef.current);
    // *** END MODIFICATION ***
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);
    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }

    // --- PRE-GAME STATE DRAWING --- 
    if (!refs.isGameStartedRef.current) {
        // Draw stuck balls
        drawBalls(ctx, refs.stuckBallsRef.current);
        if (gameMode === 'main') {
            drawPowerUpPreviews(ctx, refs.spawnablePowerUpsRef.current);
        }
        ctx.restore();
        return; // Exit early, no further updates needed
    }

    // --- GAME STARTED UPDATES & DRAWING (Only if playing or resetting) --- 
    let collectedPowerUpTypes: PowerUpType[] = [];
    updateLasers(refs, callbacks, spawnRequests, currentTime, scaledDeltaTime, columns, rows);

    const currentFallingPowerUpCount = refs.powerUpsRef.current.filter(p => p.status === 'falling').length;
    const availablePowerUpsForSpawning = gameMode === 'main'
        ? refs.spawnablePowerUpsRef.current
        : refs.enabledPowerUpsRef.current;

    const { newPowerUps, newBalls } = handleSpawnEvents(
        spawnRequests,
        currentFallingPowerUpCount,
        availablePowerUpsForSpawning,
        gameMode,
        currentTime,
        gameSpeedFactor
    );

    refs.ballsRef.current.push(...newBalls);
    refs.powerUpsRef.current = updatePowerUps( refs, gameSpeedFactor, newPowerUps, collectedPowerUpTypes, scaledDeltaTime );

    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypes, currentTime, gameSpeedFactor);

    // --- Draw Active Game Elements --- 
    const allBallsToDraw = [...refs.ballsRef.current, ...refs.stuckBallsRef.current];
    drawBalls(ctx, allBallsToDraw);
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);

    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore(); // Restore context after all drawing

    // --- Check Game Status --- 
    // Note: checkGameStatus now handles setting the gameOverState via callbacks
    // It returns the *next* state, but the actual state change might be asynchronous.
    // We rely on the useEffect in useGameLogic to handle the consequences of the state change.
    checkGameStatus(refs, callbacks, previousBallCount);

    // No need to manually set the state here or draw end message again,
    // as checkGameStatus calls callbacks.setGameOverState,
    // and the useEffect in useGameLogic handles the 'level_reset' logic,
    // and the top of this function handles drawing for terminal states.
};
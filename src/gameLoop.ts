// src/gameLoop.ts (Corrected)
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent, GameMode, Brick, GameState } from './interfaces';
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
// *** MODIFIED: Import handleSpawnEvents instead of trySpawnPowerUp ***
import { handleSpawnEvents } from './gameUpdates/gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS,
    TARGET_FPS
} from './constants';
// *** MODIFIED: Import drawPowerUpPreviews ***
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect, drawPowerUpPreviews } from './drawFunctions';

// Helper function to count active bricks (Kept for drawGameInfo)
const countActiveBricks = (bricks: Brick[][], columns: number, rows: number): number => {
    let count = 0;
    for (let c = 0; c < columns; c++) {
        if (bricks[c]) {
            for (let r = 0; r < rows; r++) {
                if (bricks[c][r] && bricks[c][r].status === 1) {
                    count++;
                }
            }
        }
    }
    return count;
};

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
    if (currentGameState !== 'playing') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        callbacks.drawEndMessage(ctx, currentGameState, refs.scoreRef.current);
        return;
    }

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

    // --- UPDATES --- 
    updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    updateBalls(refs, callbacks, spawnRequests, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows);

    // --- DRAWING --- (Moved drawing before game started updates for preview)
    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows);
    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    drawGameInfo(ctx, refs.scoreRef.current, refs.targetScoreRef.current, refs.goldRef.current, refs.bonusGoldRef.current, isTestMode);
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);
    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }

    // --- PRE-GAME STATE DRAWING --- 
    if (!refs.isGameStartedRef.current) {
        // Draw stuck balls
        drawBalls(ctx, refs.stuckBallsRef.current);
        // *** NEW: Draw power-up previews if in main mode and not started ***
        if (gameMode === 'main') {
            drawPowerUpPreviews(ctx, refs.spawnablePowerUpsRef.current);
        }
        ctx.restore(); // Restore context after drawing everything for pre-game
        return; // Exit early, no further updates needed
    }

    // --- GAME STARTED UPDATES & DRAWING --- 
    let collectedPowerUpTypes: PowerUpType[] = [];
    updateLasers(refs, callbacks, spawnRequests, currentTime, scaledDeltaTime, columns, rows);

    // *** MODIFIED: Use handleSpawnEvents ***
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
        gameSpeedFactor // Pass gameSpeedFactor for ball creation
    );

    // Add newly spawned balls to the main balls array
    refs.ballsRef.current.push(...newBalls);

    // Pass newly spawned power-ups to updatePowerUps
    refs.powerUpsRef.current = updatePowerUps( refs, gameSpeedFactor, newPowerUps, collectedPowerUpTypes, scaledDeltaTime );
    // *** END MODIFICATION ***

    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypes, currentTime, gameSpeedFactor);

    // --- Draw Active Game Elements --- 
    const allBallsToDraw = [...refs.ballsRef.current, ...refs.stuckBallsRef.current]; // Make sure stuck balls are still drawn if any remain for some reason
    drawBalls(ctx, allBallsToDraw);
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);

    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore(); // Restore context after all drawing

    // --- Check Game Status --- 
    const finalStatus = checkGameStatus(refs, callbacks, previousBallCount);

    if (finalStatus !== 'playing' && refs.gameOverStateRef.current === 'playing') {
        callbacks.setGameOverState(finalStatus);
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        callbacks.drawEndMessage(ctx, finalStatus, refs.scoreRef.current);
    }
};
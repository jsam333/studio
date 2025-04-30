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
    TARGET_FPS, BONUS_GOLD_TARGET, BONUS_GOLD_TIMER_DURATION
} from './constants';
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect, drawPowerUpPreviews } from './drawFunctions';

// Function to handle paddle shrink countdown (Unchanged)
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

// *** MODIFIED: Function to handle Bonus Gold Timer ***
const updateBonusGoldTimer = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number
) => {
    // Check if the bonus gold target is reached, the initial decrement is complete, and the timer hasn't started
    if (
        refs.bonusGoldRef.current === BONUS_GOLD_TARGET && // Use === for exact match
        refs.initialBonusGoldDecrementCompleteRef.current && // Check if initial decrement is done
        refs.bonusGoldTimerCountdownRef.current === null   // Check if 20s timer isn't already running
    ) {
        console.log(`Bonus Gold reached ${BONUS_GOLD_TARGET} AFTER initial decrement, starting ${BONUS_GOLD_TIMER_DURATION / 1000}s timer!`);
        refs.bonusGoldTimerCountdownRef.current = BONUS_GOLD_TIMER_DURATION; // Start the timer
    }

    // If the 20s timer is running, decrement it
    if (refs.bonusGoldTimerCountdownRef.current !== null) {
        refs.bonusGoldTimerCountdownRef.current -= elapsedTime;
        // If the timer runs out, reset bonus gold
        if (refs.bonusGoldTimerCountdownRef.current <= 0) {
            console.log("Bonus Gold timer expired!");
            callbacks.resetBonusGoldCallback(); // Call the reset callback (this also resets the flags)
            // refs.bonusGoldTimerCountdownRef.current = null; // resetBonusGoldCallback handles this
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

    // Draw End Message if applicable (Unchanged)
    if (currentGameState === 'won' || currentGameState === 'lost' || currentGameState === 'shop' || currentGameState === 'menu') {
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

    // --- UPDATES (Only if playing or resetting) ---
    updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    // *** Update bonus gold timer (Now checks the completion flag) ***
    updateBonusGoldTimer(refs, callbacks, elapsedTime);
    updateBalls(refs, callbacks, spawnRequests, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows);

    // --- DRAWING --- (Unchanged)
    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows);
    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    drawGameInfo(
        ctx,
        refs.scoreRef.current,
        refs.targetScoreRef.current,
        refs.goldRef.current,
        refs.bonusGoldRef.current,
        isTestMode,
        refs.livesRef.current,
        refs.bonusGoldTimerCountdownRef.current
    );
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);
    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }

    // --- PRE-GAME STATE DRAWING --- (Unchanged)
    if (!refs.isGameStartedRef.current) {
        drawBalls(ctx, refs.stuckBallsRef.current);
        if (gameMode === 'main') {
            drawPowerUpPreviews(ctx, refs.spawnablePowerUpsRef.current);
        }
        ctx.restore();
        return;
    }

    // --- GAME STARTED UPDATES & DRAWING --- (Unchanged)
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

    // --- Draw Active Game Elements --- (Unchanged)
    const allBallsToDraw = [...refs.ballsRef.current, ...refs.stuckBallsRef.current];
    drawBalls(ctx, allBallsToDraw);
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);

    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    // --- Check Game Status --- (Unchanged)
    checkGameStatus(refs, callbacks, previousBallCount);

};
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

// Function to handle Bonus Gold Timer
const updateBonusGoldTimer = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number
) => {
    if (
        refs.bonusGoldRef.current === BONUS_GOLD_TARGET &&
        refs.initialBonusGoldDecrementCompleteRef.current && 
        refs.bonusGoldTimerCountdownRef.current === null
    ) {
        refs.bonusGoldTimerCountdownRef.current = BONUS_GOLD_TIMER_DURATION;
    }

    if (refs.bonusGoldTimerCountdownRef.current !== null) {
        refs.bonusGoldTimerCountdownRef.current -= elapsedTime;
        if (refs.bonusGoldTimerCountdownRef.current <= 0) {
            callbacks.resetBonusGoldCallback(); 
        }
    }
};

// --- Optimization: Reusable arrays --- 
const collectedPowerUpTypesReusable: PowerUpType[] = [];
const spawnRequestsReusable: PowerUpSpawnEvent[] = []; // Reusable array for spawn requests

export const gameUpdate = (
    ctx: CanvasRenderingContext2D,
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number
) => {
    const currentGameState = refs.gameOverStateRef.current;

    if (currentGameState === 'won' || currentGameState === 'lost' || currentGameState === 'shop' || currentGameState === 'menu') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        callbacks.drawEndMessage(ctx, currentGameState, refs.scoreRef.current);
        return;
    }

    const currentTime = Date.now();
    const gameSpeedFactor = refs.gameSpeedFactorRef.current;
    const targetFrameTime = 1000 / TARGET_FPS;
    const scaledDeltaTime = elapsedTime / targetFrameTime;

    // --- Optimization: Clear reusable spawn requests array ---
    spawnRequestsReusable.length = 0; 

    const previousBallCount = refs.ballsRef.current.length + refs.stuckBallsRef.current.length;

    const columns = refs.brickColumnsRef.current;
    const rows = refs.brickRowsRef.current;
    const gameMode = refs.gameModeRef.current;
    const isTestMode = gameMode === 'test';

    // --- UPDATES ---
    updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    updateBonusGoldTimer(refs, callbacks, elapsedTime);
    // Pass the reusable array to updateBalls
    updateBalls(refs, callbacks, spawnRequestsReusable, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows); 

    // --- DRAWING --- 
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

    // --- PRE-GAME STATE DRAWING ---
    if (!refs.isGameStartedRef.current) {
        drawBalls(ctx, [], refs.stuckBallsRef.current); 
        if (gameMode === 'main') {
            drawPowerUpPreviews(ctx, refs.spawnablePowerUpsRef.current);
        }
        ctx.restore();
        return;
    }

    // --- GAME STARTED UPDATES & DRAWING ---
    
    // --- Optimization: Clear reusable collected types array ---
    collectedPowerUpTypesReusable.length = 0; 

    // Pass the reusable array to updateLasers
    updateLasers(refs, callbacks, spawnRequestsReusable, currentTime, scaledDeltaTime, columns, rows);

    // --- Optimization: Use reduce to count falling power-ups without intermediate array ---
    const currentFallingPowerUpCount = refs.powerUpsRef.current.reduce((count, p) => {
        return p.status === 'falling' ? count + 1 : count;
    }, 0);
    
    const availablePowerUpsForSpawning = gameMode === 'main'
        ? refs.spawnablePowerUpsRef.current
        : refs.enabledPowerUpsRef.current;

    // Pass the reusable array to handleSpawnEvents
    const { newPowerUps, newBalls } = handleSpawnEvents(
        spawnRequestsReusable, 
        currentFallingPowerUpCount,
        availablePowerUpsForSpawning,
        gameMode,
        currentTime,
        gameSpeedFactor
    );

    if (newBalls.length > 0) {
        refs.ballsRef.current.push(...newBalls);
    }

    // Pass the reusable array to updatePowerUps
    updatePowerUps( refs, gameSpeedFactor, newPowerUps, collectedPowerUpTypesReusable, scaledDeltaTime );

    // Pass the reusable array to applyPowerUpEffects
    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypesReusable, currentTime, gameSpeedFactor);

    // --- Draw Active Game Elements ---
    drawBalls(ctx, refs.ballsRef.current, refs.stuckBallsRef.current);
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);

    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    // --- Check Game Status ---
    checkGameStatus(refs, callbacks, previousBallCount);

};
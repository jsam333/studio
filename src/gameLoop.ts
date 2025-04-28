// src/gameLoop.ts (Modified)
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent, GameMode, Brick, GameState } from './interfaces'; // Added GameState import
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
import { trySpawnPowerUp } from './gameUpdates/gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS,
    TARGET_FPS // Import TARGET_FPS
} from './constants';
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect } from './drawFunctions';

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
    elapsedTime: number // Use elapsed time in ms
) => {
    if (refs.paddleShrinkCountdownRef?.current !== null) {
        refs.paddleShrinkCountdownRef.current -= elapsedTime; // Decrease by elapsed time
        if (refs.paddleShrinkCountdownRef.current <= 0) {
            refs.paddleShrinkCountdownRef.current = null; // Reset timer before executing
            callbacks.executePaddleShrink(); // Call the logic to shrink the paddle
        }
    }
};

export const gameUpdate = (
    ctx: CanvasRenderingContext2D,
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number // Receive elapsed time in ms
) => {
    const currentGameState = refs.gameOverStateRef.current;
    if (currentGameState !== 'playing') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        callbacks.drawEndMessage(ctx, currentGameState, refs.scoreRef.current);
        return;
    }

    const currentTime = Date.now();
    const gameSpeedFactor = refs.gameSpeedFactorRef.current;

    // Calculate scaledDeltaTime factor for physics based on target FPS
    const targetFrameTime = 1000 / TARGET_FPS;
    const scaledDeltaTime = elapsedTime / targetFrameTime; // Keep this for physics scaling

    let spawnRequests: PowerUpSpawnEvent[] = [];
    const previousBallCount = refs.ballsRef.current.length + refs.stuckBallsRef.current.length;

    const columns = refs.brickColumnsRef.current;
    const rows = refs.brickRowsRef.current;
    const gameMode = refs.gameModeRef.current;
    const isTestMode = gameMode === 'test';

    // --- UPDATES --- 
    // Pass raw elapsedTime (ms) to the timer function
    updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    // Pass scaledDeltaTime to physics updates
    updateBalls(refs, callbacks, spawnRequests, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows);

    // If game hasn't started, only draw static + info and return
    if (!refs.isGameStartedRef.current) {
        const currentScore = refs.scoreRef.current;
        const targetScore = refs.targetScoreRef.current;
        const currentGold = refs.goldRef.current;
        const currentBonusGold = refs.bonusGoldRef.current;

        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        drawBricks(ctx, refs.bricksRef.current, columns, rows);
        drawPaddle(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, 0, 0);
        drawBalls(ctx, refs.stuckBallsRef.current);
        drawGameInfo(ctx, currentScore, targetScore, currentGold, currentBonusGold, isTestMode);
        return;
    }

    // --- Game Started Updates --- 
    let collectedPowerUpTypes: PowerUpType[] = [];
    // Pass scaledDeltaTime to physics updates
    updateLasers(refs, callbacks, spawnRequests, currentTime, scaledDeltaTime, columns, rows);

    // Process spawn requests
    let newlySpawnedPowerUps: PowerUp[] = [];
    const currentFallingPowerUpCount = refs.powerUpsRef.current.filter(p => p.status === 'falling').length;
    const availablePowerUpsForSpawning = gameMode === 'main'
        ? refs.spawnablePowerUpsRef.current
        : refs.enabledPowerUpsRef.current;

    spawnRequests.forEach(request => {
        trySpawnPowerUp(
            request.brickX,
            request.brickY,
            request.brickWidth,
            request.marker === 'SPAWN_SPECIAL',
            currentFallingPowerUpCount,
            newlySpawnedPowerUps,
            availablePowerUpsForSpawning,
            gameMode,
            currentTime
        );
    });

    // Pass scaledDeltaTime to physics updates
    refs.powerUpsRef.current = updatePowerUps( refs, gameSpeedFactor, newlySpawnedPowerUps, collectedPowerUpTypes, scaledDeltaTime );
    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypes, currentTime, gameSpeedFactor);

    // --- Drawing --- 
    const currentScore = refs.scoreRef.current;
    const targetScore = refs.targetScoreRef.current;
    const currentGold = refs.goldRef.current;
    const currentBonusGold = refs.bonusGoldRef.current;

    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows);
    const allBallsToDraw = [...refs.ballsRef.current, ...refs.stuckBallsRef.current];
    drawBalls(ctx, allBallsToDraw);
    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }
    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);
    drawGameInfo(ctx, currentScore, targetScore, currentGold, currentBonusGold, isTestMode);
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);
    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    // --- Check Game Status --- 
    const finalStatus = checkGameStatus(refs, callbacks, previousBallCount);

    if (finalStatus !== 'playing' && refs.gameOverStateRef.current === 'playing') {
        callbacks.setGameOverState(finalStatus);
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        callbacks.drawEndMessage(ctx, finalStatus, refs.scoreRef.current);
    }
};
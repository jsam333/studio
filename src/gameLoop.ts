// src/gameLoop.ts
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent, GameMode, Brick, GameState, PointsField } from './interfaces';
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
import { handleSpawnEvents } from './gameUpdates/gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS,
    TARGET_FPS, BONUS_GOLD_TARGET, BONUS_GOLD_TIMER_DURATION,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, POINTS_FIELD_DURATION
} from './constants';
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect, drawPowerUpPreviews, drawPointsFields } from './drawFunctions';

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

// Function to update PointsFields (remove after duration)
const updatePointsFields = (pointsFields: PointsField[], currentTime: number) => {
    if (!pointsFields) return;
    for (let i = pointsFields.length - 1; i >= 0; i--) {
        const field = pointsFields[i];
        if (currentTime - field.createdAt > POINTS_FIELD_DURATION) {
            pointsFields.splice(i, 1); // Remove the field if its duration has expired
        }
    }
};

// Function to check for ball collision with PointsFields (entry-only points)
const checkPointsFieldCollisions = (
    balls: Ball[],
    pointsFields: PointsField[],
    updateScoreCallback: (points: number) => void
) => {
    if (!pointsFields || pointsFields.length === 0) return;

    balls.forEach(ball => {
        const ballRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
        const currentFrameInteractions = new Set<number>();

        pointsFields.forEach(field => {
            // Basic AABB collision detection for ball center (more accurate for small balls)
            // or ball bounding box for larger ones.
            // For simplicity, let's use ball center vs field rect.
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;

            if (
                ballCenterX + ballRadius > field.x &&
                ballCenterX - ballRadius < field.x + field.width &&
                ballCenterY + ballRadius > field.y &&
                ballCenterY - ballRadius < field.y + field.height
            ) {
                currentFrameInteractions.add(field.id);
                // Check if this is a new entry
                if (!ball.lastFramePointsFieldIds.has(field.id)) {
                    updateScoreCallback(1); // Award 1 point on entry
                }
            }
        });
        // Update the ball's last frame interactions for the next cycle
        ball.lastFramePointsFieldIds = currentFrameInteractions;
    });
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

    spawnRequestsReusable.length = 0; 

    const previousBallCount = refs.ballsRef.current.length + refs.stuckBallsRef.current.length;

    const columns = refs.brickColumnsRef.current;
    const rows = refs.brickRowsRef.current;
    const gameMode = refs.gameModeRef.current;
    const isTestMode = gameMode === 'test';

    // --- UPDATES ---
    updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    updateBonusGoldTimer(refs, callbacks, elapsedTime);
    updateBalls(refs, callbacks, spawnRequestsReusable, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows); 
    updatePointsFields(refs.pointsFieldsRef.current, currentTime); 
    checkPointsFieldCollisions(refs.ballsRef.current, refs.pointsFieldsRef.current, callbacks.updateScoreCallback);

    // --- DRAWING --- 
    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows);
    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    drawPointsFields(ctx, refs.pointsFieldsRef.current); 
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

    if (!refs.isGameStartedRef.current) {
        drawBalls(ctx, [], refs.stuckBallsRef.current); 
        if (gameMode === 'main') {
            drawPowerUpPreviews(ctx, refs.spawnablePowerUpsRef.current);
        }
        ctx.restore();
        return;
    }
    
    collectedPowerUpTypesReusable.length = 0; 
    updateLasers(refs, callbacks, spawnRequestsReusable, currentTime, scaledDeltaTime, columns, rows);

    const currentFallingPowerUpCount = refs.powerUpsRef.current.reduce((count, p) => {
        return p.status === 'falling' ? count + 1 : count;
    }, 0);
    
    const availablePowerUpsForSpawning = gameMode === 'main'
        ? refs.spawnablePowerUpsRef.current
        : refs.enabledPowerUpsRef.current;

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

    updatePowerUps( refs, gameSpeedFactor, newPowerUps, collectedPowerUpTypesReusable, scaledDeltaTime );
    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypesReusable, currentTime, gameSpeedFactor);

    drawBalls(ctx, refs.ballsRef.current, refs.stuckBallsRef.current);
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);

    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    checkGameStatus(refs, callbacks, previousBallCount);

};
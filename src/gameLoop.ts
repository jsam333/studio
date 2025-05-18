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
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, POINTS_FIELD_DURATION, POINTS_FIELD_MAX_BALLS
} from './constants'; 
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect, drawPowerUpPreviews, drawPointsFields } from './drawFunctions';

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

const updatePointsFields = (pointsFields: PointsField[], currentTime: number) => {
    if (!pointsFields) return;
    for (let i = pointsFields.length - 1; i >= 0; i--) {
        const field = pointsFields[i];
        if (currentTime - field.createdAt > POINTS_FIELD_DURATION || field.ballsPassed >= POINTS_FIELD_MAX_BALLS) {
            pointsFields.splice(i, 1); 
        }
    }
};

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
            const ballCenterX = ball.x;
            const ballCenterY = ball.y;

            if (
                ballCenterX + ballRadius > field.x &&
                ballCenterX - ballRadius < field.x + field.width &&
                ballCenterY + ballRadius > field.y &&
                ballCenterY - ballRadius < field.y + field.height
            ) {
                currentFrameInteractions.add(field.id);
                if (!ball.lastFramePointsFieldIds.has(field.id)) {
                    updateScoreCallback(1); 
                    field.ballsPassed += 1; 
                }
            }
        });
        ball.lastFramePointsFieldIds = currentFrameInteractions;
    });
};


const collectedPowerUpTypesReusable: PowerUpType[] = [];
const spawnRequestsReusable: PowerUpSpawnEvent[] = [];

export const gameUpdate = (
    ctx: CanvasRenderingContext2D,
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    elapsedTime: number
) => {
    const currentGameState = refs.gameOverStateRef.current;
    const gameMode = refs.gameModeRef.current;
    const isTestPreview = gameMode === 'test' && currentGameState === 'menu';

    if (!isTestPreview && (currentGameState === 'won' || currentGameState === 'lost' || currentGameState === 'shop' || currentGameState === 'menu')) {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        if (currentGameState === 'won' || currentGameState === 'lost') {
            callbacks.drawEndMessage(ctx, currentGameState, refs.scoreRef.current);
        }
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
    
    // Update paddle shrink timer if a shrink is scheduled, regardless of mode
    if (refs.paddleShrinkCountdownRef?.current !== null) {
        updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    }

    // Bonus gold timer only for main game mode and not in test preview
    if (!isTestPreview) {
        updateBonusGoldTimer(refs, callbacks, elapsedTime);
    }

    updateBalls(refs, callbacks, spawnRequestsReusable, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows); 
    updateLasers(refs, callbacks, spawnRequestsReusable, currentTime, scaledDeltaTime, columns, rows); 
    updatePointsFields(refs.pointsFieldsRef.current, currentTime); 
    checkPointsFieldCollisions(refs.ballsRef.current, refs.pointsFieldsRef.current, callbacks.updateScoreCallback);

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
        gameMode === 'test', 
        refs.livesRef.current,
        refs.bonusGoldTimerCountdownRef.current
    );
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);
    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }

    if (!refs.isGameStartedRef.current && !isTestPreview) { 
        drawBalls(ctx, [], refs.stuckBallsRef.current); 
        if (gameMode === 'main') {
            // If power-ups are pre-placed by useLevelLogic into powerUpsRef, 
            // drawPowerUps below will handle them. drawPowerUpPreviews might be redundant or for a different type of preview.
            // For now, relying on drawPowerUps to render static pre-placed powerups.
            // drawPowerUpPreviews(ctx, refs.spawnablePowerUpsRef.current);
        }
    } 
    
    if (isTestPreview && !refs.isGameStartedRef.current) {
        drawBalls(ctx, [], refs.stuckBallsRef.current);
    }
    
    collectedPowerUpTypesReusable.length = 0; 

    const availablePowerUpsForSpawning = gameMode === 'test' 
        ? refs.enabledPowerUpsRef.current
        : refs.spawnablePowerUpsRef.current;

    const { newPowerUps, newBalls } = handleSpawnEvents(
        spawnRequestsReusable, 
        refs.powerUpsRef.current.reduce((count, p) => p.status === 'falling' ? count + 1 : count, 0),
        availablePowerUpsForSpawning,
        gameMode,
        currentTime,
        gameSpeedFactor
    );

    if (newPowerUps.length > 0) {
        refs.powerUpsRef.current.push(...newPowerUps);
    }
    if (newBalls.length > 0) { 
        refs.ballsRef.current.push(...newBalls);
    }

    // Only update power-up positions (make them fall) and apply their effects 
    // if the game has started or if it's the interactive test preview.
    if (refs.isGameStartedRef.current || isTestPreview) {
        updatePowerUps( refs, gameSpeedFactor, [], collectedPowerUpTypesReusable, scaledDeltaTime );
        applyPowerUpEffects(refs, callbacks, collectedPowerUpTypesReusable, currentTime, gameSpeedFactor); 
    }

    drawBalls(ctx, refs.ballsRef.current, (isTestPreview || !refs.isGameStartedRef.current) ? [] : refs.stuckBallsRef.current); 
    drawPowerUps(ctx, refs.powerUpsRef.current); // This will draw all powerups in powerUpsRef
    drawLasers(ctx, refs.lasersRef.current);

    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) {
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(1)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    checkGameStatus(refs, callbacks, previousBallCount);

    if (isTestPreview && 
        refs.ballsRef.current.length === 0 && 
        refs.stuckBallsRef.current.length === 0 && 
        previousBallCount > 0 &&
        refs.gameOverStateRef.current === 'menu' 
    ) {
        console.log("Test preview: All balls lost, setting state to 'lost' to trigger reset.");
        callbacks.setGameOverState('lost');
    }
};
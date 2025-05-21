// src/gameLoop.ts
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent, GameMode, Brick, GameState, PointsField, Particle } from './interfaces'; 
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
import { handleSpawnEvents } from './gameUpdates/gameLoopUtils';
import { updateParticles } from './gameUpdates/particleUpdates'; 
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS,
    TARGET_FPS, BONUS_GOLD_TARGET, BONUS_GOLD_TIMER_DURATION,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, POINTS_FIELD_DURATION, POINTS_FIELD_MAX_BALLS,
    BRICK_FLASH_DURATION, BRICK_FADE_SPEED,
    PADDLE_WIDEN_VISUAL_EFFECT_DURATION_MS, PADDLE_WIDEN_VISUAL_EFFECT_AMOUNT,
    BRICK_REGEN_VISUAL_EFFECT_DURATION_MS, BRICK_DARK_FLASH_DURATION_MS,
    BRICK_SPECIAL_FLASH_DURATION_MS, DOUBLE_BALL_VISUAL_EFFECT_DURATION_MS
} from './constants'; 
import { 
    drawPaddle, drawBalls, drawBricks, drawGameInfo, 
    drawPowerUps, drawLasers, drawSafetyNet, 
    drawPowerUpPreviews, // Removed drawCollectionFieldRect
    drawPointsFields, drawParticles 
} from './drawFunctions';

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

const updateBrickStateAndAnimations = (bricks: Brick[][], columns: number, rows: number, currentTime: number, scaledDeltaTime: number) => {
    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            if (brick) {
                if (brick.status === 2) { 
                    if (brick.isFlashing) {
                        if (brick.flashStartTime === undefined) {
                            brick.flashStartTime = currentTime;
                        }
                        if (currentTime - (brick.flashStartTime || 0) >= BRICK_FLASH_DURATION) {
                            brick.isFlashing = false;
                            brick.fadeOutAlpha = 1.0;
                            delete brick.flashStartTime; 
                        }
                    } else if (brick.fadeOutAlpha !== undefined && brick.fadeOutAlpha > 0) {
                        brick.fadeOutAlpha -= BRICK_FADE_SPEED * scaledDeltaTime;
                        if (brick.fadeOutAlpha <= 0) {
                            brick.fadeOutAlpha = 0;
                            brick.status = 0; 
                        }
                    }
                }

                if (brick.isRegenVisualEffectActive && brick.regenVisualEffectStartTime) {
                    if (currentTime - brick.regenVisualEffectStartTime >= BRICK_REGEN_VISUAL_EFFECT_DURATION_MS) {
                        brick.isRegenVisualEffectActive = false;
                        delete brick.regenVisualEffectStartTime;
                    }
                }

                if (brick.isDarkFlashActive && brick.darkFlashStartTime) {
                    if (currentTime - brick.darkFlashStartTime >= BRICK_DARK_FLASH_DURATION_MS) {
                        brick.isDarkFlashActive = false;
                        delete brick.darkFlashStartTime;
                    }
                }

                if (brick.isSpecialFlashActive && brick.specialFlashStartTime) {
                    if (currentTime - brick.specialFlashStartTime >= BRICK_SPECIAL_FLASH_DURATION_MS) {
                        brick.isSpecialFlashActive = false;
                        delete brick.specialFlashStartTime;
                    }
                }
            }
        }
    }
};

const updateBallGlowEffects = (balls: Ball[], currentTime: number) => {
    balls.forEach(ball => {
        if (ball.isGlowEffectActive && typeof ball.glowEffectStartTime === 'number') {
            if (currentTime - ball.glowEffectStartTime >= DOUBLE_BALL_VISUAL_EFFECT_DURATION_MS) {
                ball.isGlowEffectActive = false;
                delete ball.glowEffectStartTime;
            }
        }
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

    // Update per-ball glow effect timers
    updateBallGlowEffects(refs.ballsRef.current, currentTime);
    updateBallGlowEffects(refs.stuckBallsRef.current, currentTime); // Also for stuck balls

    updateBrickStateAndAnimations(refs.bricksRef.current, columns, rows, currentTime, scaledDeltaTime); 
    updateParticles(refs, currentTime, elapsedTime); 
    
    if (refs.paddleShrinkCountdownRef?.current !== null) {
        updatePaddleShrinkTimer(refs, callbacks, elapsedTime);
    }

    if (!isTestPreview) {
        updateBonusGoldTimer(refs, callbacks, elapsedTime);
    }

    // Removed global black ball effect timer update

    updateBalls(refs, callbacks, spawnRequestsReusable, currentTime, gameSpeedFactor, scaledDeltaTime, columns, rows); 
    updateLasers(refs, callbacks, spawnRequestsReusable, currentTime, scaledDeltaTime, columns, rows); 
    updatePointsFields(refs.pointsFieldsRef.current, currentTime); 
    checkPointsFieldCollisions(refs.ballsRef.current, refs.pointsFieldsRef.current, callbacks.updateScoreCallback);

    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows, currentTime);

    let visualPaddleWidth = refs.paddleWidthRef.current;
    let visualPaddleX = refs.paddleXRef.current;
    if (refs.paddleVisualEffectActiveRef?.current && refs.paddleVisualEffectStartTimeRef?.current) {
        const effectElapsedTime = currentTime - refs.paddleVisualEffectStartTimeRef.current;
        if (effectElapsedTime < PADDLE_WIDEN_VISUAL_EFFECT_DURATION_MS) {
            const progress = effectElapsedTime / PADDLE_WIDEN_VISUAL_EFFECT_DURATION_MS;
            const offset = PADDLE_WIDEN_VISUAL_EFFECT_AMOUNT * Math.sin(progress * Math.PI);
            visualPaddleWidth = refs.paddleWidthRef.current + offset;
            visualPaddleX = refs.paddleXRef.current - offset / 2; 
        } else {
            refs.paddleVisualEffectActiveRef.current = false;
            refs.paddleVisualEffectStartTimeRef.current = null;
        }
    }

    // Updated drawPaddle call to include collection field parameters
    drawPaddle(
        ctx, 
        visualPaddleX, 
        visualPaddleWidth, 
        refs.laserShotsRef.current, 
        refs.stickyPaddleChargesRef.current,
        refs.collectionFieldHeightRef.current, 
        refs.collectionFieldWidthOffsetRef.current
    );
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
    // Removed the old drawCollectionFieldRect call block

    // Updated calls to drawBalls, removing global effect parameters
    if (!refs.isGameStartedRef.current && !isTestPreview) { 
        drawBalls(ctx, [], refs.stuckBallsRef.current, currentTime); 
        if (gameMode === 'main') {
        }
    } 
    
    if (isTestPreview && !refs.isGameStartedRef.current) {
        drawBalls(ctx, [], refs.stuckBallsRef.current, currentTime);
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

    if (refs.isGameStartedRef.current || isTestPreview) {
        updatePowerUps( refs, gameSpeedFactor, [], collectedPowerUpTypesReusable, scaledDeltaTime );
        applyPowerUpEffects(refs, callbacks, collectedPowerUpTypesReusable, currentTime, gameSpeedFactor); 
    }

    drawBalls(ctx, refs.ballsRef.current, (isTestPreview || !refs.isGameStartedRef.current) ? [] : refs.stuckBallsRef.current, currentTime); 
    drawPowerUps(ctx, refs.powerUpsRef.current); 
    drawLasers(ctx, refs.lasersRef.current);
    drawParticles(ctx, refs.particlesRef.current); 

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
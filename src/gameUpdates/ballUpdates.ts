// src/gameUpdates/ballUpdates.ts
import { Ball, Brick, PowerUpSpawnEvent, Particle, HomingTrail } from '../interfaces'; // Added HomingTrail
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { checkBrickCollision } from '../gameLogic';
import { createNewBall, findClosestBrick } from './gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_Y, BALL_SIZE, MAX_BALL_SPEED_X, SAFETY_NET_HEIGHT,
    BIG_BALL_SIZE_INCREASE, PADDLE_HEIGHT, BASE_BALL_SPEED_FACTOR,
    PADDLE_SIDE_SAVE_THRESHOLD,
    POINTS_FIELD_DURATION, 
    ZIP_TO_PADDLE_DURATION,
    PARTICLE_LIFESPAN, 
    PARTICLE_SPEED_FACTOR,
    POWER_UP_COLORS, // Added POWER_UP_COLORS
    SPLITTING_BALL_PARTICLE_SIZE,
    HOMING_TRAIL_DURATION,
    INITIAL_BALL_SPEED_Y // Added for default split speed
} from '../constants';

export const updateBalls = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[],
    currentTime: number,
    gameSpeedFactor: number,
    deltaTime: number,
    columns: number,
    rows: number
): void => {
    const currentMaxBallSpeedX = MAX_BALL_SPEED_X * gameSpeedFactor;
    let ballsToAdd: Ball[] = [];
    let ballsToRemoveIds = new Set<number>();

    if (refs.homingTrailsRef) {
        refs.homingTrailsRef.current = refs.homingTrailsRef.current.filter(
            trail => currentTime - trail.createdAt < HOMING_TRAIL_DURATION
        );
    }

    refs.stuckBallsRef.current.forEach(stuckBall => {
        const currentBallSize = stuckBall.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
        if (stuckBall.stuckSide) {
            const sideOffset = currentBallSize;
            stuckBall.x = stuckBall.stuckSide === 'left'
                ? refs.paddleXRef.current - sideOffset
                : refs.paddleXRef.current + refs.paddleWidthRef.current + sideOffset;
            stuckBall.y = PADDLE_Y + PADDLE_HEIGHT / 2 + (stuckBall.stuckSideOffset ?? -PADDLE_HEIGHT / 2);
        } else {
            const offset = stuckBall.stuckOffset ?? refs.paddleWidthRef.current / 2;
            stuckBall.x = refs.paddleXRef.current + offset;
            stuckBall.y = PADDLE_Y - currentBallSize;
        }
    });

    const isTestModePreview = refs.gameModeRef.current === 'test' && refs.gameOverStateRef.current === 'menu';

    if (refs.isGameStartedRef.current || isTestModePreview) {
        for (let i = 0; i < refs.ballsRef.current.length; i++) {
            const ball = refs.ballsRef.current[i];
            let processNormalUpdate = true;
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

            if (ball.isZipping) {
                if (ball.zipStartTime && ball.initialZipX !== undefined && ball.initialZipY !== undefined && ball.zipTargetX !== undefined && ball.zipTargetY !== undefined) {
                    const elapsedZipTime = currentTime - ball.zipStartTime;
                    if (elapsedZipTime < ZIP_TO_PADDLE_DURATION) {
                        const progress = elapsedZipTime / ZIP_TO_PADDLE_DURATION;
                        ball.x = ball.initialZipX + (ball.zipTargetX - ball.initialZipX) * progress;
                        ball.y = ball.initialZipY + (ball.zipTargetY - ball.initialZipY) * progress;
                        processNormalUpdate = false;
                    } else {
                        ball.x = ball.zipTargetX;
                        ball.y = ball.zipTargetY;
                        ball.isZipping = false;
                        ball.stuckSide = ball.targetStuckSideValue;
                        ball.stuckSideOffset = -PADDLE_HEIGHT / 2;
                        ball.speedX = 0;
                        ball.speedY = 0;
                        ball.stuckOffset = undefined;
                        refs.stuckBallsRef.current.push(ball);
                        ballsToRemoveIds.add(ball.id);
                        processNormalUpdate = false;
                    }
                } else {
                    ball.isZipping = false;
                }
            }

            if (processNormalUpdate) {
                if (ball.stuckOffset === undefined && !ball.stuckSide) {
                    if (ball.isDouble && ball.doubleEndTime && currentTime >= ball.doubleEndTime) { ball.isDouble = false; ball.doubleEndTime = undefined; }
                    if (ball.isBlue && ball.blueEndTime && currentTime >= ball.blueEndTime) { ball.isBlue = false; ball.blueEndTime = undefined; }
                    if (ball.isBig && ball.bigEndTime && currentTime >= ball.bigEndTime) { ball.isBig = false; ball.bigEndTime = undefined; }
                    if (ball.isSplitting && ball.splittingEndTime && currentTime >= ball.splittingEndTime) { ball.isSplitting = false; ball.splittingEndTime = undefined; }
                }

                let currentSpeedX = ball.speedX;
                let currentSpeedY = ball.speedY;

                const brickCollisionResult = checkBrickCollision(ball, refs.bricksRef.current, columns, rows, deltaTime, refs, currentTime);
                if (brickCollisionResult.collision) {
                    // Store the speeds *before* homing deactivation, for splitting logic if it was homing
                    const speedXBeforeHomingDeactivation = brickCollisionResult.newSpeedX;
                    const speedYBeforeHomingDeactivation = brickCollisionResult.newSpeedY;

                    currentSpeedX = brickCollisionResult.newSpeedX;
                    currentSpeedY = brickCollisionResult.newSpeedY;

                    if (ball.isHomingSpeedActive && ball.originalSpeedX !== undefined && ball.originalSpeedY !== undefined) {
                        const currentMagnitude = Math.sqrt(currentSpeedX * currentSpeedX + currentSpeedY * currentSpeedY);
                        const originalMagnitude = Math.sqrt(ball.originalSpeedX * ball.originalSpeedX + ball.originalSpeedY * ball.originalSpeedY);

                        if (currentMagnitude > 0 && originalMagnitude > 0) {
                            const factor = originalMagnitude / currentMagnitude;
                            currentSpeedX *= factor;
                            currentSpeedY *= factor;
                        }
                        else if (currentMagnitude === 0 && originalMagnitude > 0) {
                            currentSpeedX = ball.originalSpeedX; 
                            currentSpeedY = ball.originalSpeedY > 0 ? -ball.originalSpeedY : ball.originalSpeedY;
                        }
                        // After this block, currentSpeedX and currentSpeedY are now the 1x speeds.
                        ball.isHomingSpeedActive = false;
                        ball.originalSpeedX = undefined;
                        ball.originalSpeedY = undefined;
                    }

                    if (brickCollisionResult.pierceOccurred) { /* Speed unchanged by pierce itself, homing deactivation handled above */ }
                    else if (ball.isSplitting && brickCollisionResult.brickHit) {
                        // Use currentSpeedX and currentSpeedY which are now corrected (1x) if ball was homing.
                        // If the ball was not homing, these are simply brickCollisionResult.newSpeedX/Y.
                        let newBallBaseSpeedX = -currentSpeedX / gameSpeedFactor;
                        let newBallBaseSpeedY = -currentSpeedY / gameSpeedFactor;

                        // If the parent ball stopped (e.g. hit a special brick that stops it), give new ball a default speed
                        if (newBallBaseSpeedX === 0 && newBallBaseSpeedY === 0) {
                            newBallBaseSpeedX = (Math.random() - 0.5) * 2; // Small random horizontal
                            newBallBaseSpeedY = -INITIAL_BALL_SPEED_Y; // Default upward speed
                        }
                        
                        const newBall = createNewBall(ball.x, ball.y, newBallBaseSpeedX, newBallBaseSpeedY, BASE_BALL_SPEED_FACTOR);
                        
                        // Calculate offset based on the new ball's actual initial direction (after potential default speed)
                        const newBallActualSpeedX = newBall.speedX; // This is base * speedFactor
                        const newBallActualSpeedY = newBall.speedY;
                        const speedMagnitudeForOffset = Math.sqrt(newBallActualSpeedX**2 + newBallActualSpeedY**2);

                        if (speedMagnitudeForOffset > 0) {
                            newBall.x -= (newBallActualSpeedX / speedMagnitudeForOffset) * 2 * currentBallSize;
                            newBall.y -= (newBallActualSpeedY / speedMagnitudeForOffset) * 2 * currentBallSize;
                        }
                        ballsToAdd.push(newBall);
                        
                        const numParticles = 5;
                        // Particle speed should also be based on the new ball's (1x) speed
                        const particleSpeedBase = Math.sqrt(newBallActualSpeedX**2 + newBallActualSpeedY**2) * (PARTICLE_SPEED_FACTOR || 0.8);
                        const finalParticleColor = '#FFFFFF';
                        for (let k = 0; k < numParticles; k++) {
                            const angleOffset = (Math.random() - 0.5) * (Math.PI / 4);
                            const newAngle = Math.atan2(newBallActualSpeedY, newBallActualSpeedX) + angleOffset;
                            const particleSpeed = particleSpeedBase * (0.8 + Math.random() * 0.4);
                            const particle: Particle = {
                                id: Date.now() + Math.random(),
                                x: ball.x, y: ball.y,
                                speedX: Math.cos(newAngle) * particleSpeed,
                                speedY: Math.sin(newAngle) * particleSpeed,
                                lifespan: (PARTICLE_LIFESPAN || 300) * (0.8 + Math.random() * 0.4),
                                color: finalParticleColor,
                                size: SPLITTING_BALL_PARTICLE_SIZE || 2,
                                createdAt: currentTime, alpha: 1
                            };
                            refs.particlesRef.current.push(particle);
                        }
                    }
                    if (brickCollisionResult.pointsAwarded > 0) { callbacks.updateScoreCallback(brickCollisionResult.pointsAwarded); }
                    spawnRequests.push(...brickCollisionResult.spawnEvents);
                }

                const effectiveSpeedX = currentSpeedX * deltaTime;
                const effectiveSpeedY = currentSpeedY * deltaTime;
                let nextX = ball.x + effectiveSpeedX;
                let nextY = ball.y + effectiveSpeedY;
                const paddleLeft = refs.paddleXRef.current;
                const paddleRight = paddleLeft + refs.paddleWidthRef.current;

                if (nextX > BOARD_WIDTH - currentBallSize || nextX < currentBallSize) {
                    const overshoot = nextX > BOARD_WIDTH - currentBallSize ? (nextX - (BOARD_WIDTH - currentBallSize)) : (currentBallSize - nextX);
                    currentSpeedX = -currentSpeedX;
                    nextX = (nextX > BOARD_WIDTH - currentBallSize) ? (BOARD_WIDTH - currentBallSize) - overshoot : currentBallSize + overshoot;
                }
                if (nextY < currentBallSize) {
                    const overshoot = currentBallSize - nextY;
                    currentSpeedY = -currentSpeedY;
                    nextY = currentBallSize + overshoot;
                }
                else if (nextY + currentBallSize > BOARD_HEIGHT) {
                    let stickToSide: 'left' | 'right' | null = null;
                    const paddleCenterX = paddleLeft + refs.paddleWidthRef.current / 2;
                    if (nextX < paddleCenterX) {
                        if (Math.abs(nextX - paddleLeft) < PADDLE_SIDE_SAVE_THRESHOLD) stickToSide = 'left';
                    } else {
                        if (Math.abs(nextX - paddleRight) < PADDLE_SIDE_SAVE_THRESHOLD) stickToSide = 'right';
                    }
                    if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig && stickToSide) {
                        refs.stickyPaddleChargesRef.current--;
                        ball.isZipping = true;
                        ball.zipStartTime = currentTime;
                        ball.initialZipX = ball.x; ball.initialZipY = ball.y;
                        ball.targetStuckSideValue = stickToSide;
                        const sideOffset = currentBallSize;
                        ball.zipTargetX = stickToSide === 'left' ? paddleLeft - sideOffset : paddleRight + sideOffset;
                        ball.zipTargetY = PADDLE_Y;
                        ball.speedX = 0; ball.speedY = 0;
                        if (ball.isHoming) ball.isHoming = false;
                        if (ball.isHomingSpeedActive) {
                            ball.isHomingSpeedActive = false;
                            ball.originalSpeedX = undefined; ball.originalSpeedY = undefined;
                        }
                        if (ball.isDouble && ball.doubleEndTime) { ball.doublePausedDuration = ball.doubleEndTime - currentTime; ball.doubleEndTime = undefined; }
                        if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                        if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }
                        processNormalUpdate = false;
                    } else if (refs.safetyNetCountRef.current > 0) {
                        currentSpeedY = -Math.abs(currentSpeedY);
                        ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT;
                        refs.safetyNetCountRef.current--;
                        nextY = ball.y + currentSpeedY * deltaTime;
                    } else {
                        ballsToRemoveIds.add(ball.id);
                        processNormalUpdate = false;
                    }
                }
                else if (currentSpeedY > 0 && ball.y + currentBallSize <= PADDLE_Y && nextY + currentBallSize > PADDLE_Y) {
                    const timeToPaddleY = (PADDLE_Y - (ball.y + currentBallSize)) / effectiveSpeedY;
                    const collisionX = ball.x + effectiveSpeedX * timeToPaddleY;
                    if (collisionX + currentBallSize > paddleLeft && collisionX - currentBallSize < paddleRight) {
                        const paddleImpactX = collisionX;
                        const paddleImpactY = PADDLE_Y - currentBallSize;
                        ball.y = paddleImpactY;
                        const incomingSpeedX = currentSpeedX;
                        const incomingSpeedY = currentSpeedY;
                        currentSpeedY = -Math.abs(incomingSpeedY);

                        if (ball.isHoming) {
                            const closestBrick = findClosestBrick(ball, refs.bricksRef.current, columns, rows);
                            if (closestBrick) {
                                const targetX = closestBrick.x + closestBrick.width / 2;
                                const targetY = closestBrick.y + closestBrick.height / 2;
                                if (refs.homingTrailsRef) {
                                    refs.homingTrailsRef.current.push({
                                        id: Date.now() + Math.random(),
                                        startX: paddleImpactX, startY: paddleImpactY,
                                        endX: targetX, endY: targetY,
                                        color: POWER_UP_COLORS.HOMING_BALL || '#DAA520',
                                        createdAt: currentTime,
                                    });
                                }
                                const dX = targetX - ball.x;
                                const dY = targetY - ball.y;
                                if (dY !== 0) {
                                    ball.originalSpeedX = incomingSpeedX;
                                    ball.originalSpeedY = -Math.abs(incomingSpeedY);
                                    ball.isHomingSpeedActive = true;

                                    let newSpeedX = (dX / dY) * currentSpeedY;
                                    let newSpeedY = currentSpeedY;

                                    const baseMagnitude = Math.sqrt(ball.originalSpeedX * ball.originalSpeedX + ball.originalSpeedY * ball.originalSpeedY);
                                    const targetMagnitude = baseMagnitude * 3;

                                    const homingDirectionMagnitude = Math.sqrt(newSpeedX * newSpeedX + newSpeedY * newSpeedY);
                                    
                                    if (homingDirectionMagnitude > 0) {
                                        const factor = targetMagnitude / homingDirectionMagnitude;
                                        currentSpeedX = newSpeedX * factor;
                                        currentSpeedY = newSpeedY * factor;
                                    } else {
                                        currentSpeedX = ball.originalSpeedX * 3;
                                        currentSpeedY = ball.originalSpeedY * 3; 
                                    }

                                    currentSpeedX = Math.max(-currentMaxBallSpeedX * 3, Math.min(currentMaxBallSpeedX * 3, currentSpeedX));
                                    currentSpeedY = Math.max(-MAX_BALL_SPEED_X * 3, Math.min(MAX_BALL_SPEED_X * 3, currentSpeedY)); 
                                } else {
                                    currentSpeedX = incomingSpeedX;
                                }
                            }
                            ball.isHoming = false;
                        } else {
                            let deltaX = collisionX - (paddleLeft + refs.paddleWidthRef.current / 2);
                            currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, incomingSpeedX + (deltaX * 0.1)));
                        }
                        if (ball.isBig) {
                            ballsToAdd.push(createNewBall(collisionX, PADDLE_Y - BALL_SIZE - 5, (Math.random() - 0.5) * 6, -3 - Math.random() * 2, BASE_BALL_SPEED_FACTOR));
                        }
                        const remainingTimeFactor = Math.max(0, 1 - timeToPaddleY);
                        nextX = collisionX + currentSpeedX * remainingTimeFactor * deltaTime;
                        nextY = ball.y + currentSpeedY * remainingTimeFactor * deltaTime;
                    }
                }

                if (processNormalUpdate) {
                    ball.x = nextX;
                    ball.y = nextY;
                    ball.speedX = currentSpeedX;
                    ball.speedY = currentSpeedY;
                }
            }
        }
    }

    if (refs.pointsFieldsRef.current && refs.pointsFieldsRef.current.length > 0) {
        refs.pointsFieldsRef.current = refs.pointsFieldsRef.current.filter(field => {
            return currentTime - field.createdAt < POINTS_FIELD_DURATION;
        });
    }

    if (ballsToRemoveIds.size > 0) {
        let writeIndex = 0;
        for (let readIndex = 0; readIndex < refs.ballsRef.current.length; readIndex++) {
            if (!ballsToRemoveIds.has(refs.ballsRef.current[readIndex].id)) {
                if (writeIndex !== readIndex) {
                    refs.ballsRef.current[writeIndex] = refs.ballsRef.current[readIndex];
                }
                writeIndex++;
            }
        }
        refs.ballsRef.current.length = writeIndex;
    }

    if (ballsToAdd.length > 0) {
        refs.ballsRef.current.push(...ballsToAdd);
    }
};

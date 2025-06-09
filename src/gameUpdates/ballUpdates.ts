// src/gameUpdates/ballUpdates.ts
import { Ball, Brick, PowerUpSpawnEvent, Particle, HomingTrail, PaddleTarget } from '../interfaces'; // Added PaddleTarget
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
    INITIAL_BALL_SPEED_Y, // Added for default split speed
    TARGET_FPS
} from '../constants';

const predictPaddleCollisionX = (
    ball: Ball,
    speedX: number,
    durationMs: number,
    gameSpeedFactor: number,
    currentBallSize: number
): number => {
    let remainingMs = durationMs;
    let currentX = ball.x;
    let currentSpeedX_pxPerFrame = speedX * gameSpeedFactor;

    if (Math.abs(currentSpeedX_pxPerFrame) < 0.001) {
        return currentX; // Not moving horizontally
    }

    const timeStep = 1000 / TARGET_FPS;

    while (remainingMs > 0.001) {
        const speed_px_per_ms = currentSpeedX_pxPerFrame / timeStep;
        
        let timeToWallMs: number;

        if (speed_px_per_ms > 0) {
            const distanceToWall = (BOARD_WIDTH - currentBallSize) - currentX;
            timeToWallMs = distanceToWall / speed_px_per_ms;
        } else {
            const distanceToWall = currentX - currentBallSize;
            timeToWallMs = distanceToWall / -speed_px_per_ms; // Ensure time is positive
        }

        if (timeToWallMs > 0 && timeToWallMs < remainingMs) {
            currentX += speed_px_per_ms * timeToWallMs;
            currentSpeedX_pxPerFrame *= -1; // Bounce
            remainingMs -= timeToWallMs;
        } else {
            currentX += speed_px_per_ms * remainingMs;
            remainingMs = 0;
        }
    }
    return currentX;
};

const attemptToCreatePaddleTarget = (
    ball: Ball,
    newSpeedX: number,
    newSpeedY: number,
    refs: GameStateRefs,
    currentTime: number,
    gameSpeedFactor: number,
    bricks: Brick[][],
    columns: number,
    rows: number
): { finalSpeedY: number; newTarget: PaddleTarget } | null => {
    const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

    if (newSpeedY <= 0 || refs.gameModeRef.current !== 'test') return null;

    // --- Trajectory interception check ---
    let willBeIntercepted = false;
    const simBall = { 
        x: ball.x, 
        y: ball.y, 
        speedX: newSpeedX * gameSpeedFactor, 
        speedY: newSpeedY * gameSpeedFactor 
    };
    const simBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
    const timeStep = 1 / (Math.abs(simBall.speedY) || 1);

    while (simBall.y < PADDLE_Y) {
        simBall.x += simBall.speedX * timeStep;
        simBall.y += simBall.speedY * timeStep;

        if (simBall.x > BOARD_WIDTH - simBallSize || simBall.x < simBallSize) {
            simBall.speedX = -simBall.speedX;
        }
        
        for (let c = 0; c < columns; c++) {
            if (willBeIntercepted) break;
            if (!bricks[c]) continue;
            for (let r = 0; r < rows; r++) {
                if (willBeIntercepted) break;
                const brick = bricks[c][r];
                if (brick && brick.status === 1) {
                    if (
                        simBall.x + simBallSize > brick.x &&
                        simBall.x - simBallSize < brick.x + brick.width &&
                        simBall.y + simBallSize > brick.y &&
                        simBall.y - simBallSize < brick.y + brick.height
                    ) {
                        const brickCenterY = brick.y + brick.height / 2;
                        const vecY = simBall.y - brickCenterY;
                        if (vecY < 0) {
                             willBeIntercepted = true;
                        }
                    }
                }
            }
        }
        if (willBeIntercepted) break;
    }
    
    if (willBeIntercepted) {
        return null; 
    }
    // --- End of interception check ---

    const paddleTop = PADDLE_Y - currentBallSize;
    const deltaY = paddleTop - ball.y;

    const initialActualSpeedY = newSpeedY * gameSpeedFactor;
    if (initialActualSpeedY <= 0) return null;

    const initialPixelsPerMs = initialActualSpeedY / (1000 / TARGET_FPS);
    if (initialPixelsPerMs <= 0) return null;

    let totalDurationMs = deltaY / initialPixelsPerMs;
    
    // --- Conflict Detection and Speed Adjustment ---
    let stillHasConflicts = true;
    let safetyBreak = 0;

    while (stillHasConflicts && safetyBreak < 10) {
        safetyBreak++;
        stillHasConflicts = false;

        const conflictingTargetsInWindow: PaddleTarget[] = [];
        const newImpactTime = currentTime + totalDurationMs;

        for (const target of refs.paddleTargetsRef.current) {
            if (target.isHit) continue;

            const existingImpactTime = target.startTime + target.totalDuration;
            const timeDifference = Math.abs(newImpactTime - existingImpactTime);
            
            if (timeDifference < 200) {
                conflictingTargetsInWindow.push(target);
            }
        }

        if (conflictingTargetsInWindow.length >= 2) {
            stillHasConflicts = true; 
            
            const latestConflictingImpactTime = Math.max(
                ...conflictingTargetsInWindow.map(t => t.startTime + t.totalDuration)
            );
            const earliestConflictingImpactTime = Math.min(
                ...conflictingTargetsInWindow.map(t => t.startTime + t.totalDuration)
            );

            const slowDownImpactTime = latestConflictingImpactTime + 200;
            const slowDownDuration = slowDownImpactTime - currentTime;

            const speedUpImpactTime = earliestConflictingImpactTime - 200;
            const speedUpDuration = speedUpImpactTime - currentTime;

            const originalSpeed = deltaY / totalDurationMs;

            let slowDownSpeedChange = Infinity;
            if (slowDownDuration > 50) {
                const newSlowDownSpeed = deltaY / slowDownDuration;
                slowDownSpeedChange = Math.abs(newSlowDownSpeed - originalSpeed);
            }

            let speedUpSpeedChange = Infinity;
            if (speedUpDuration > 50) {
                const newSpeedUpSpeed = deltaY / speedUpDuration;
                speedUpSpeedChange = Math.abs(newSpeedUpSpeed - originalSpeed);
            }
            
            if (speedUpSpeedChange < slowDownSpeedChange) {
                totalDurationMs = speedUpDuration;
            } else {
                totalDurationMs = slowDownDuration;
            }
        }
    }
    // After the loop, calculate the final speed based on the final deconflicted duration
    const finalPixelsPerMs = deltaY / totalDurationMs;
    const finalActualSpeedY = finalPixelsPerMs * (1000 / TARGET_FPS);
    const finalSpeedY = finalActualSpeedY / gameSpeedFactor;
    // --- End of Conflict Detection ---

    if (totalDurationMs > 50 && totalDurationMs < 4000) { 
        const predictedX = predictPaddleCollisionX(ball, newSpeedX, totalDurationMs, gameSpeedFactor, currentBallSize);

        const newTarget: PaddleTarget = {
            id: Date.now() + Math.random(),
            x: predictedX,
            y: PADDLE_Y,
            startTime: currentTime,
            totalDuration: totalDurationMs,
            initialRadius: 15,
            isHit: false,
        };
        
        return { finalSpeedY, newTarget };
    }

    return null;
};

export const updateBalls = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[],
    currentTime: number,
    gameSpeedFactor: number,
    deltaTime: number,
    columns: number,
    rows: number,
    elapsedTime: number
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

                    if (brickCollisionResult.hitUnderside) {
                        const targetResult = attemptToCreatePaddleTarget(ball, currentSpeedX, currentSpeedY, refs, currentTime, gameSpeedFactor, refs.bricksRef.current, columns, rows);
                        if (targetResult) {
                            currentSpeedY = targetResult.finalSpeedY;
                            refs.paddleTargetsRef.current.push(targetResult.newTarget);
                        }
                    }
                }

                const effectiveSpeedX = currentSpeedX * deltaTime;
                const effectiveSpeedY = currentSpeedY * deltaTime;
                let nextX = ball.x + effectiveSpeedX;
                let nextY = ball.y + effectiveSpeedY;
                const paddleLeft = refs.paddleXRef.current;
                const paddleRight = paddleLeft + refs.paddleWidthRef.current;

                if (nextX > BOARD_WIDTH - currentBallSize) {
                    const overshoot = nextX - (BOARD_WIDTH - currentBallSize);
                    currentSpeedX = -currentSpeedX;
                    nextX = BOARD_WIDTH - currentBallSize - overshoot;
                    refs.soundSystemRef.current?.playPaddleHitSound();
                } else if (nextX < currentBallSize) {
                    const overshoot = currentBallSize - nextX;
                    currentSpeedX = -currentSpeedX;
                    nextX = currentBallSize + overshoot;
                    refs.soundSystemRef.current?.playPaddleHitSound();
                }

                if (nextY < currentBallSize) {
                    const overshoot = currentBallSize - nextY;
                    currentSpeedY = -currentSpeedY;
                    nextY = currentBallSize + overshoot;
                    refs.soundSystemRef.current?.playPaddleHitSound(); // Play sound on top wall hit

                    const targetResult = attemptToCreatePaddleTarget(ball, currentSpeedX, currentSpeedY, refs, currentTime, gameSpeedFactor, refs.bricksRef.current, columns, rows);
                    if (targetResult) {
                        currentSpeedY = targetResult.finalSpeedY;
                        refs.paddleTargetsRef.current.push(targetResult.newTarget);
                    }
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
                        refs.soundSystemRef.current?.playPaddleHitSound(); // Play paddle hit sound

                        let hitTarget = false;
                        if (refs.paddleTargetsRef) {
                            const paddleCollisionPointX = collisionX;
                            refs.paddleTargetsRef.current.forEach(target => {
                                const hitRadius = target.initialRadius * 0.5; // Ball must hit within 50% of the original target radius
                                if (!target.isHit && Math.abs(paddleCollisionPointX - target.x) < hitRadius) {
                                    target.isHit = true;
                                    hitTarget = true;
                                }
                            });
                        }
                        
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

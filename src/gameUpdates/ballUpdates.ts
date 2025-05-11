// src/gameUpdates/ballUpdates.ts
import { Ball, PowerUp, Brick, PowerUpSpawnEvent, PointsField } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { checkBrickCollision } from '../gameLogic';
import { createNewBall, findClosestBrick } from './gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_Y, BALL_SIZE, MAX_BALL_SPEED_X, SAFETY_NET_HEIGHT,
    BIG_BALL_SIZE_INCREASE, BRICK_WIDTH, BRICK_HEIGHT, PADDLE_HEIGHT, BASE_BALL_SPEED_FACTOR,
    PADDLE_EDGE_STICK_THRESHOLD, PADDLE_SIDE_SAVE_THRESHOLD,
    POINTS_FIELD_DURATION // Import POINTS_FIELD_DURATION
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

    if (refs.isGameStartedRef.current) {
        for (let i = 0; i < refs.ballsRef.current.length; i++) {
            const ball = refs.ballsRef.current[i];
            let processBallUpdate = true;

            if (ball.stuckOffset === undefined && !ball.stuckSide) {
                if (ball.isBlack && ball.blackEndTime && currentTime >= ball.blackEndTime) { ball.isBlack = false; ball.blackEndTime = undefined; }
                if (ball.isBlue && ball.blueEndTime && currentTime >= ball.blueEndTime) { ball.isBlue = false; ball.blueEndTime = undefined; }
                if (ball.isBig && ball.bigEndTime && currentTime >= ball.bigEndTime) { ball.isBig = false; ball.bigEndTime = undefined; }
                if (ball.isSplitting && ball.splittingEndTime && currentTime >= ball.splittingEndTime) { ball.isSplitting = false; ball.splittingEndTime = undefined; }
            }

            let currentSpeedX = ball.speedX, currentSpeedY = ball.speedY;
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

            const brickCollisionResult = checkBrickCollision(ball, refs.bricksRef.current, columns, rows, deltaTime);
            if (brickCollisionResult.collision) {
                currentSpeedX = brickCollisionResult.newSpeedX;
                currentSpeedY = brickCollisionResult.newSpeedY;

                if (brickCollisionResult.pierceOccurred) {
                    // Speed doesn't change
                } else if (ball.isSplitting && brickCollisionResult.brickHit) {
                    const newBall = createNewBall(ball.x, ball.y, -brickCollisionResult.newSpeedX, -brickCollisionResult.newSpeedY, 1.0);
                    const speedMagnitude = Math.sqrt(brickCollisionResult.newSpeedX * brickCollisionResult.newSpeedX + brickCollisionResult.newSpeedY * brickCollisionResult.newSpeedY);
                    if (speedMagnitude > 0) {
                        newBall.x -= (brickCollisionResult.newSpeedX / speedMagnitude) * 2;
                        newBall.y -= (brickCollisionResult.newSpeedY / speedMagnitude) * 2;
                    }
                    ballsToAdd.push(newBall);
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
                const isNearLeft = Math.abs(nextX - paddleLeft) < PADDLE_SIDE_SAVE_THRESHOLD;
                const isNearRight = Math.abs(nextX - paddleRight) < PADDLE_SIDE_SAVE_THRESHOLD;

                if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig && (isNearLeft || isNearRight)) {
                    refs.stickyPaddleChargesRef.current--;
                    ball.stuckSide = isNearLeft ? 'left' : 'right';
                    ball.stuckSideOffset = -PADDLE_HEIGHT / 2;
                    const sideOffset = currentBallSize;
                    ball.x = ball.stuckSide === 'left' ? paddleLeft - sideOffset : paddleRight + sideOffset;
                    ball.y = PADDLE_Y + PADDLE_HEIGHT / 2 + ball.stuckSideOffset;
                    ball.speedX = 0; ball.speedY = 0;
                    ball.stuckOffset = undefined;
                    if (ball.isHoming) { ball.isHoming = false; }
                    if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                    if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                    if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }
                    refs.stuckBallsRef.current.push(ball);
                    ballsToRemoveIds.add(ball.id);
                    processBallUpdate = false;
                } else if (refs.safetyNetCountRef.current > 0) {
                    currentSpeedY = -Math.abs(currentSpeedY);
                    ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT;
                    refs.safetyNetCountRef.current--;
                    nextY = ball.y + currentSpeedY * deltaTime;
                } else {
                    ballsToRemoveIds.add(ball.id);
                    processBallUpdate = false;
                }
            }
            else if (currentSpeedY > 0 && ball.y + currentBallSize <= PADDLE_Y && nextY + currentBallSize > PADDLE_Y) {
                const timeToPaddleY = (PADDLE_Y - (ball.y + currentBallSize)) / effectiveSpeedY;
                const collisionX = ball.x + effectiveSpeedX * timeToPaddleY;

                if (collisionX + currentBallSize > paddleLeft && collisionX - currentBallSize < paddleRight) {
                    if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig) {
                        refs.stickyPaddleChargesRef.current--;
                        const relativeCollisionX = collisionX - paddleLeft;
                        const edgeThreshold = PADDLE_EDGE_STICK_THRESHOLD * refs.paddleWidthRef.current;
                        if (relativeCollisionX < edgeThreshold) {
                            ball.stuckSide = 'left';
                            ball.stuckSideOffset = -PADDLE_HEIGHT / 2;
                            ball.x = paddleLeft - currentBallSize;
                            ball.y = PADDLE_Y + PADDLE_HEIGHT / 2 + ball.stuckSideOffset;
                        } else if (relativeCollisionX > refs.paddleWidthRef.current - edgeThreshold) {
                            ball.stuckSide = 'right';
                            ball.stuckSideOffset = -PADDLE_HEIGHT / 2;
                            ball.x = paddleRight + currentBallSize;
                            ball.y = PADDLE_Y + PADDLE_HEIGHT / 2 + ball.stuckSideOffset;
                        } else {
                            ball.stuckSide = null;
                            ball.stuckSideOffset = undefined;
                            ball.stuckOffset = relativeCollisionX;
                            ball.x = paddleLeft + ball.stuckOffset;
                            ball.y = PADDLE_Y - currentBallSize;
                        }
                        ball.speedX = 0; ball.speedY = 0;
                        if (ball.isHoming) { ball.isHoming = false; }
                        if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                        if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                        if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }
                        refs.stuckBallsRef.current.push(ball);
                        ballsToRemoveIds.add(ball.id);
                        processBallUpdate = false;
                        currentSpeedX = 0;
                        currentSpeedY = 0;
                    } else {
                        ball.y = PADDLE_Y - currentBallSize;
                        currentSpeedY = -Math.abs(currentSpeedY);
                        let deltaX = collisionX - (paddleLeft + refs.paddleWidthRef.current / 2);
                        let speedAdjustment = deltaX * 0.1;
                        currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, currentSpeedX + speedAdjustment));
                        if (ball.isHoming) {
                            const closestBrick = findClosestBrick(ball, refs.bricksRef.current, columns, rows);
                            if (closestBrick) {
                                const targetX = closestBrick.x + BRICK_WIDTH / 2;
                                const targetY = closestBrick.y + BRICK_HEIGHT / 2;
                                const vectorX = targetX - ball.x; const vectorY = targetY - ball.y;
                                const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
                                const currentSpeedMagnitude = Math.sqrt(currentSpeedX * currentSpeedX + currentSpeedY * currentSpeedY);
                                if (magnitude > 0) {
                                    currentSpeedX = (vectorX / magnitude) * currentSpeedMagnitude;
                                    currentSpeedY = (vectorY / magnitude) * currentSpeedMagnitude;
                                    currentSpeedY = -Math.abs(currentSpeedY);
                                }
                            }
                            ball.isHoming = false;
                        }
                        if (ball.isBig) {
                            let sx = (Math.random() - 0.5) * 6;
                            let sy = -3 - Math.random() * 2;
                            const newBall = createNewBall(collisionX, PADDLE_Y - BALL_SIZE - 5, sx, sy, BASE_BALL_SPEED_FACTOR);
                            ballsToAdd.push(newBall);
                        }
                        const remainingTimeFactor = Math.max(0, 1 - timeToPaddleY);
                        nextX = collisionX + currentSpeedX * remainingTimeFactor * deltaTime;
                        nextY = ball.y + currentSpeedY * remainingTimeFactor * deltaTime;
                    }
                }
            }

            // Points Field Interaction
            if (refs.pointsFieldsRef.current && refs.pointsFieldsRef.current.length > 0) {
                for (let j = refs.pointsFieldsRef.current.length - 1; j >= 0; j--) { // Iterate backwards for safe removal
                    const field = refs.pointsFieldsRef.current[j];
                    // Check if ball is within the field boundaries
                    if (
                        ball.x + currentBallSize > field.x &&
                        ball.x - currentBallSize < field.x + field.width &&
                        ball.y + currentBallSize > field.y &&
                        ball.y - currentBallSize < field.y + field.height
                    ) {
                        // Check if ball wasn't in this field last frame
                        if (!ball.lastFramePointsFieldIds.has(field.id)) {
                            callbacks.updateScoreCallback(1); // Award 1 point
                            field.ballsPassed += 1;
                            ball.lastFramePointsFieldIds.add(field.id); // Mark as entered this frame

                            if (field.ballsPassed >= 5) {
                                refs.pointsFieldsRef.current.splice(j, 1); // Remove field if 5 balls passed
                                // Potentially remove from all ball.lastFramePointsFieldIds as well if field is gone
                                refs.ballsRef.current.forEach(b => b.lastFramePointsFieldIds.delete(field.id));
                                if (refs.stuckBallsRef.current) {
                                    refs.stuckBallsRef.current.forEach(b => b.lastFramePointsFieldIds.delete(field.id));
                                }
                                continue; // Continue to next field as this one is removed
                            }
                        }
                    } else {
                        // If ball is outside the field, remove it from the set for this field
                        ball.lastFramePointsFieldIds.delete(field.id);
                    }
                }
            }

            if (processBallUpdate) {
                ball.x = nextX;
                ball.y = nextY;
                ball.speedX = currentSpeedX;
                ball.speedY = currentSpeedY;
            }
        }
    }

    // Remove points fields that have expired by time (ballsPassed check is now inline)
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

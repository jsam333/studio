// src/gameUpdates/ballUpdates.ts
import { Ball, Brick, PowerUpSpawnEvent } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { checkBrickCollision } from '../gameLogic';
import { createNewBall, findClosestBrick } from './gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_Y, BALL_SIZE, MAX_BALL_SPEED_X, SAFETY_NET_HEIGHT,
    BIG_BALL_SIZE_INCREASE, BRICK_WIDTH, BRICK_HEIGHT, PADDLE_HEIGHT, BASE_BALL_SPEED_FACTOR,
    PADDLE_SIDE_SAVE_THRESHOLD,
    POINTS_FIELD_DURATION, 
    ZIP_TO_PADDLE_DURATION
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
                    if (ball.isBlack && ball.blackEndTime && currentTime >= ball.blackEndTime) { ball.isBlack = false; ball.blackEndTime = undefined; }
                    if (ball.isBlue && ball.blueEndTime && currentTime >= ball.blueEndTime) { ball.isBlue = false; ball.blueEndTime = undefined; }
                    if (ball.isBig && ball.bigEndTime && currentTime >= ball.bigEndTime) { ball.isBig = false; ball.bigEndTime = undefined; }
                    if (ball.isSplitting && ball.splittingEndTime && currentTime >= ball.splittingEndTime) { ball.isSplitting = false; ball.splittingEndTime = undefined; }
                }

                let currentSpeedX = ball.speedX;
                let currentSpeedY = ball.speedY;

                const brickCollisionResult = checkBrickCollision(ball, refs.bricksRef.current, columns, rows, deltaTime, refs); // Pass gameStateRefs here
                if (brickCollisionResult.collision) {
                    currentSpeedX = brickCollisionResult.newSpeedX;
                    currentSpeedY = brickCollisionResult.newSpeedY;
                    if (brickCollisionResult.pierceOccurred) { /* Speed unchanged */ }
                    else if (ball.isSplitting && brickCollisionResult.brickHit) {
                        const newBall = createNewBall(ball.x, ball.y, -brickCollisionResult.newSpeedX, -brickCollisionResult.newSpeedY, 1.0);
                        const speedMagnitude = Math.sqrt(brickCollisionResult.newSpeedX**2 + brickCollisionResult.newSpeedY**2);
                        if (speedMagnitude > 0) {
                            newBall.x -= (brickCollisionResult.newSpeedX / speedMagnitude) * 2 * currentBallSize;
                            newBall.y -= (brickCollisionResult.newSpeedY / speedMagnitude) * 2 * currentBallSize;
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

                    // Sticky Paddle, Safety Net now active in test preview if charges/count > 0
                    if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig && (isNearLeft || isNearRight)) { 
                        refs.stickyPaddleChargesRef.current--;
                        ball.isZipping = true;
                        ball.zipStartTime = currentTime;
                        ball.initialZipX = ball.x; 
                        ball.initialZipY = ball.y;
                        ball.targetStuckSideValue = isNearLeft ? 'left' : 'right';
                        const sideOffset = currentBallSize;
                        ball.zipTargetX = ball.targetStuckSideValue === 'left' ? paddleLeft - sideOffset : paddleRight + sideOffset;
                        ball.zipTargetY = PADDLE_Y + PADDLE_HEIGHT / 2 - PADDLE_HEIGHT / 2;
                        ball.speedX = 0; ball.speedY = 0; 
                        if (ball.isHoming) { ball.isHoming = false; }
                        if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                        if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                        if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }
                        processNormalUpdate = false; 
                    } else if (refs.safetyNetCountRef.current > 0) { 
                        currentSpeedY = -Math.abs(currentSpeedY);
                        ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT;
                        refs.safetyNetCountRef.current--; // Consume safety net charge
                        nextY = ball.y + currentSpeedY * deltaTime; 
                    } else { // Ball loss (applies to both main game and test preview if not caught by above)
                        ballsToRemoveIds.add(ball.id);
                        processNormalUpdate = false;
                    }
                }
                else if (currentSpeedY > 0 && ball.y + currentBallSize <= PADDLE_Y && nextY + currentBallSize > PADDLE_Y) {
                    const timeToPaddleY = (PADDLE_Y - (ball.y + currentBallSize)) / effectiveSpeedY;
                    const collisionX = ball.x + effectiveSpeedX * timeToPaddleY;
                    if (collisionX + currentBallSize > paddleLeft && collisionX - currentBallSize < paddleRight) {
                        ball.y = PADDLE_Y - currentBallSize;
                        currentSpeedY = -Math.abs(currentSpeedY);
                        let deltaX = collisionX - (paddleLeft + refs.paddleWidthRef.current / 2);
                        currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, currentSpeedX + (deltaX * 0.1)));
                        
                        // Homing ball logic now active in test preview if ball.isHoming
                        if (ball.isHoming) {
                            const closestBrick = findClosestBrick(ball, refs.bricksRef.current, columns, rows);
                            if (closestBrick) {
                                const targetX = closestBrick.x + BRICK_WIDTH / 2;
                                const targetY = closestBrick.y + BRICK_HEIGHT / 2;
                                const dX = targetX - ball.x, dY = targetY - ball.y;
                                const mag = Math.sqrt(dX**2 + dY**2);
                                const speedMag = Math.sqrt(currentSpeedX**2 + currentSpeedY**2);
                                if (mag > 0) {
                                    currentSpeedX = (dX / mag) * speedMag;
                                    currentSpeedY = (dY / mag) * speedMag;
                                    currentSpeedY = -Math.abs(currentSpeedY);
                                }
                            }
                            ball.isHoming = false; // Consume homing effect
                        }
                        // Big ball splitting on paddle now active in test preview if ball.isBig
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

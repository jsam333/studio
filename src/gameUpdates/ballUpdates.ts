// src/gameUpdates/ballUpdates.ts
import { Ball, PowerUp, Brick, PowerUpSpawnEvent } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { checkBrickCollision } from '../gameLogic';
// Import the updated findClosestBrick signature if necessary (it's used here)
import { createNewBall, findClosestBrick } from './gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_Y, BALL_SIZE, MAX_BALL_SPEED_X, SAFETY_NET_HEIGHT,
    BIG_BALL_SIZE_INCREASE, BRICK_WIDTH, BRICK_HEIGHT, PADDLE_HEIGHT, BASE_BALL_SPEED_FACTOR,
    PADDLE_EDGE_STICK_THRESHOLD, PADDLE_SIDE_SAVE_THRESHOLD // Include the new constant
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
): Ball[] => {
    const currentMaxBallSpeedX = MAX_BALL_SPEED_X * gameSpeedFactor;
    let ballsToAdd: Ball[] = [];
    let ballsToRemoveIds: number[] = [];

    // Update Stuck Balls
    refs.stuckBallsRef.current.forEach(stuckBall => {
        const currentBallSize = stuckBall.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
        if (stuckBall.stuckSide) {
            // Side Stuck Update
            const sideOffset = currentBallSize;
            stuckBall.x = stuckBall.stuckSide === 'left'
                ? refs.paddleXRef.current - sideOffset
                : refs.paddleXRef.current + refs.paddleWidthRef.current + sideOffset;
            // Calculate y based on the stored offset relative to paddle center
            stuckBall.y = PADDLE_Y + PADDLE_HEIGHT / 2 + (stuckBall.stuckSideOffset ?? -PADDLE_HEIGHT / 2); // Default to top if offset is missing
        } else {
            // Top Stuck Update
            const offset = stuckBall.stuckOffset ?? refs.paddleWidthRef.current / 2;
            stuckBall.x = refs.paddleXRef.current + offset;
            stuckBall.y = PADDLE_Y - currentBallSize;
        }
    });

    // Update Active Balls
    if (refs.isGameStartedRef.current) {
        refs.ballsRef.current.forEach(ball => {
            let processBallUpdate = true;

            // Effect Expiration Check
            if (ball.stuckOffset === undefined && !ball.stuckSide) {
                if (ball.isBlack && ball.blackEndTime && currentTime >= ball.blackEndTime) { ball.isBlack = false; ball.blackEndTime = undefined; }
                if (ball.isBlue && ball.blueEndTime && currentTime >= ball.blueEndTime) { ball.isBlue = false; ball.blueEndTime = undefined; }
                if (ball.isBig && ball.bigEndTime && currentTime >= ball.bigEndTime) { ball.isBig = false; ball.bigEndTime = undefined; }
                if (ball.isSplitting && ball.splittingEndTime && currentTime >= ball.splittingEndTime) { ball.isSplitting = false; ball.splittingEndTime = undefined; }
            }

            let currentSpeedX = ball.speedX, currentSpeedY = ball.speedY;
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

            // Brick Collision
            const brickCollisionResult = checkBrickCollision(ball, refs.bricksRef.current, columns, rows, deltaTime);
            if (brickCollisionResult.collision) {
                currentSpeedX = brickCollisionResult.newSpeedX;
                currentSpeedY = brickCollisionResult.newSpeedY;

                if (brickCollisionResult.pierceOccurred) {
                    // Speed doesn't change
                } else if (ball.isSplitting && brickCollisionResult.brickHit) {
                     const newBall = createNewBall(ball.x, ball.y, -brickCollisionResult.newSpeedX, -brickCollisionResult.newSpeedY, 1.0);
                     const speedMagnitude = Math.sqrt(brickCollisionResult.newSpeedX*brickCollisionResult.newSpeedX + brickCollisionResult.newSpeedY*brickCollisionResult.newSpeedY);
                     if (speedMagnitude > 0) {
                         newBall.x -= (brickCollisionResult.newSpeedX / speedMagnitude) * 2;
                         newBall.y -= (brickCollisionResult.newSpeedY / speedMagnitude) * 2;
                     }
                     ballsToAdd.push(newBall);
                }
                if (brickCollisionResult.pointsAwarded > 0) { callbacks.updateScoreCallback(brickCollisionResult.pointsAwarded); }
                spawnRequests.push(...brickCollisionResult.spawnEvents);
            }


            // Movement & Wall/Paddle Collision
            const effectiveSpeedX = currentSpeedX * deltaTime;
            const effectiveSpeedY = currentSpeedY * deltaTime;
            let nextX = ball.x + effectiveSpeedX;
            let nextY = ball.y + effectiveSpeedY;
            const paddleLeft = refs.paddleXRef.current;
            const paddleRight = paddleLeft + refs.paddleWidthRef.current;

            // Wall collisions
            if (nextX > BOARD_WIDTH - currentBallSize || nextX < currentBallSize) {
                const overshoot = nextX > BOARD_WIDTH - currentBallSize ?
                                    (nextX - (BOARD_WIDTH - currentBallSize)) :
                                    (currentBallSize - nextX);
                currentSpeedX = -currentSpeedX;
                nextX = (nextX > BOARD_WIDTH - currentBallSize) ?
                        (BOARD_WIDTH - currentBallSize) - overshoot :
                        currentBallSize + overshoot;
            }
             if (nextY < currentBallSize) {
                 const overshoot = currentBallSize - nextY;
                 currentSpeedY = -currentSpeedY;
                 nextY = currentBallSize + overshoot;
             }
            // Bottom collision (or sticky side save)
            else if (nextY + currentBallSize > BOARD_HEIGHT) {
                const isNearLeft = Math.abs(nextX - paddleLeft) < PADDLE_SIDE_SAVE_THRESHOLD;
                const isNearRight = Math.abs(nextX - paddleRight) < PADDLE_SIDE_SAVE_THRESHOLD;

                if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig && (isNearLeft || isNearRight)) {
                    // *** Sticky Side Save ***
                    refs.stickyPaddleChargesRef.current--;

                    ball.stuckSide = isNearLeft ? 'left' : 'right';
                    // Set vertical offset to stick to the *top* edge of the paddle side
                    ball.stuckSideOffset = -PADDLE_HEIGHT / 2; // Offset relative to paddle center for top edge

                    const sideOffset = currentBallSize;
                    ball.x = ball.stuckSide === 'left'
                        ? paddleLeft - sideOffset
                        : paddleRight + sideOffset;
                    // Calculate Y position based on paddle center and the fixed top offset
                    ball.y = PADDLE_Y + PADDLE_HEIGHT / 2 + ball.stuckSideOffset; // Sets y position to PADDLE_Y

                    ball.speedX = 0; ball.speedY = 0;
                    ball.stuckOffset = undefined;

                    // Pause effects
                    if (ball.isHoming) { ball.isHoming = false; }
                    if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                    if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                    // Big ball effect is removed by !ball.isBig check above
                    if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }

                    refs.stuckBallsRef.current.push(ball);
                    ballsToRemoveIds.push(ball.id);
                    processBallUpdate = false;
                } else if (refs.safetyNetCountRef.current > 0) {
                    // Safety Net Save
                    currentSpeedY = -Math.abs(currentSpeedY);
                    ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT;
                    refs.safetyNetCountRef.current--;
                    nextY = ball.y + currentSpeedY * deltaTime;
                } else {
                    // Ball Dies
                    ballsToRemoveIds.push(ball.id);
                    processBallUpdate = false;
                }
            }
            // Paddle collision check (Top)
            else if (currentSpeedY > 0 &&
                     ball.y + currentBallSize <= PADDLE_Y &&
                     nextY + currentBallSize > PADDLE_Y)
             {
                const timeToPaddleY = (PADDLE_Y - (ball.y + currentBallSize)) / effectiveSpeedY;
                const collisionX = ball.x + effectiveSpeedX * timeToPaddleY;

                if (collisionX + currentBallSize > paddleLeft && collisionX - currentBallSize < paddleRight) {
                    if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig) {
                        // *** Sticky Top/Edge Catch ***
                        refs.stickyPaddleChargesRef.current--;

                        const relativeCollisionX = collisionX - paddleLeft;
                        const edgeThreshold = PADDLE_EDGE_STICK_THRESHOLD * refs.paddleWidthRef.current; // Use a percentage of paddle width

                        if (relativeCollisionX < edgeThreshold) {
                            // Stick to Left Side (from top collision)
                            ball.stuckSide = 'left';
                            // Set vertical offset to stick to the *top* edge of the paddle side
                            ball.stuckSideOffset = -PADDLE_HEIGHT / 2; // Offset relative to paddle center for top edge
                            ball.x = paddleLeft - currentBallSize;
                            ball.y = PADDLE_Y + PADDLE_HEIGHT / 2 + ball.stuckSideOffset; // Sets y to PADDLE_Y
                        } else if (relativeCollisionX > refs.paddleWidthRef.current - edgeThreshold) {
                            // Stick to Right Side (from top collision)
                            ball.stuckSide = 'right';
                            // Set vertical offset to stick to the *top* edge of the paddle side
                            ball.stuckSideOffset = -PADDLE_HEIGHT / 2; // Offset relative to paddle center for top edge
                            ball.x = paddleRight + currentBallSize;
                            ball.y = PADDLE_Y + PADDLE_HEIGHT / 2 + ball.stuckSideOffset; // Sets y to PADDLE_Y
                        } else {
                            // Stick to Top (Original)
                            ball.stuckSide = null;
                            ball.stuckSideOffset = undefined;
                            ball.stuckOffset = relativeCollisionX;
                            ball.x = paddleLeft + ball.stuckOffset;
                            ball.y = PADDLE_Y - currentBallSize;
                        }

                        // Common sticking logic
                        ball.speedX = 0; ball.speedY = 0;
                        if (ball.isHoming) { ball.isHoming = false; }
                        if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                        if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                        // Big ball effect is removed by !ball.isBig check above
                        if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }
                        refs.stuckBallsRef.current.push(ball);
                        ballsToRemoveIds.push(ball.id);
                        processBallUpdate = false;
                        currentSpeedX = 0;
                        currentSpeedY = 0;
                    } else {
                        // Normal Bounce
                        ball.y = PADDLE_Y - currentBallSize;
                        currentSpeedY = -Math.abs(currentSpeedY);
                        let deltaX = collisionX - (paddleLeft + refs.paddleWidthRef.current / 2);
                        let speedAdjustment = deltaX * 0.1;
                        currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, currentSpeedX + speedAdjustment));

                        if (ball.isHoming) {
                             // Pass dimensions to findClosestBrick
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

                        // *** START: Big Ball Spawn Logic ***
                        if (ball.isBig) {
                            // Spawn a new ball similar to MULTI_BALL power-up
                            let sx = (Math.random() - 0.5) * 6;
                            let sy = -3 - Math.random() * 2;
                            const newBall = createNewBall(
                                collisionX, // Spawn at the collision point
                                PADDLE_Y - BALL_SIZE - 5, // Spawn just above the paddle
                                sx, sy, BASE_BALL_SPEED_FACTOR
                            );
                            ballsToAdd.push(newBall);
                        }
                        // *** END: Big Ball Spawn Logic ***

                        const remainingTimeFactor = Math.max(0, 1 - timeToPaddleY);
                        nextX = collisionX + currentSpeedX * remainingTimeFactor * deltaTime;
                        nextY = ball.y + currentSpeedY * remainingTimeFactor * deltaTime;
                    }
                }
            }

            if (processBallUpdate) {
                ball.x = nextX;
                ball.y = nextY;
                ball.speedX = currentSpeedX;
                ball.speedY = currentSpeedY;
            }
        });
    }

    const nextActiveBalls = refs.ballsRef.current.filter(ball => !ballsToRemoveIds.includes(ball.id));
    nextActiveBalls.push(...ballsToAdd);
    refs.ballsRef.current = nextActiveBalls;
    return nextActiveBalls;
};

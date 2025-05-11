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

            if (nextX > BOARD_WIDTH - currentBallSize || nextX < currentBallSize) { // Wall bounce (left/right)
                const overshoot = nextX > BOARD_WIDTH - currentBallSize ? (nextX - (BOARD_WIDTH - currentBallSize)) : (currentBallSize - nextX);
                currentSpeedX = -currentSpeedX;
                nextX = (nextX > BOARD_WIDTH - currentBallSize) ? (BOARD_WIDTH - currentBallSize) - overshoot : currentBallSize + overshoot;
            }
            if (nextY < currentBallSize) { // Wall bounce (top)
                const overshoot = currentBallSize - nextY;
                currentSpeedY = -currentSpeedY;
                nextY = currentBallSize + overshoot;
            }
            // Ball is below paddle level / going off screen (bottom)
            else if (nextY + currentBallSize > BOARD_HEIGHT) {
                const isNearLeft = Math.abs(nextX - paddleLeft) < PADDLE_SIDE_SAVE_THRESHOLD;
                const isNearRight = Math.abs(nextX - paddleRight) < PADDLE_SIDE_SAVE_THRESHOLD;

                // SIDE STICKING LOGIC (REMAINS UNCHANGED)
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
                } else if (refs.safetyNetCountRef.current > 0) { // Safety net
                    currentSpeedY = -Math.abs(currentSpeedY);
                    ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT;
                    refs.safetyNetCountRef.current--;
                    nextY = ball.y + currentSpeedY * deltaTime;
                } else { // Ball lost
                    ballsToRemoveIds.add(ball.id);
                    processBallUpdate = false;
                }
            }
            // Potential collision with paddle top
            else if (currentSpeedY > 0 && ball.y + currentBallSize <= PADDLE_Y && nextY + currentBallSize > PADDLE_Y) {
                const timeToPaddleY = (PADDLE_Y - (ball.y + currentBallSize)) / effectiveSpeedY;
                const collisionX = ball.x + effectiveSpeedX * timeToPaddleY;

                // Check if collisionX is within paddle horizontal bounds
                if (collisionX + currentBallSize > paddleLeft && collisionX - currentBallSize < paddleRight) {
                    // Ball hits the top of the paddle. ALWAYS bounce. Side-sticking is separate.
                    ball.y = PADDLE_Y - currentBallSize; // Position ball right above paddle
                    currentSpeedY = -Math.abs(currentSpeedY); // Reverse Y speed

                    // Adjust horizontal speed based on where it hit the paddle (spin effect)
                    let deltaX = collisionX - (paddleLeft + refs.paddleWidthRef.current / 2);
                    let speedAdjustment = deltaX * 0.1; // More off-center = more spin
                    currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, currentSpeedX + speedAdjustment));

                    // Homing ball logic (if applicable)
                    if (ball.isHoming) {
                        const closestBrick = findClosestBrick(ball, refs.bricksRef.current, columns, rows);
                        if (closestBrick) {
                            const targetX = closestBrick.x + BRICK_WIDTH / 2;
                            const targetY = closestBrick.y + BRICK_HEIGHT / 2;
                            const vectorX = targetX - ball.x;
                            const vectorY = targetY - ball.y;
                            const magnitude = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
                            const currentSpeedMagnitude = Math.sqrt(currentSpeedX * currentSpeedX + currentSpeedY * currentSpeedY);
                            if (magnitude > 0) {
                                currentSpeedX = (vectorX / magnitude) * currentSpeedMagnitude;
                                currentSpeedY = (vectorY / magnitude) * currentSpeedMagnitude;
                                currentSpeedY = -Math.abs(currentSpeedY); // Ensure it moves up
                            }
                        }
                        ball.isHoming = false; // Homing effect consumed
                    }

                    // Big ball effect (spawns new ball on paddle hit)
                    if (ball.isBig) {
                        let sx = (Math.random() - 0.5) * 6; // Random X speed for new ball
                        let sy = -3 - Math.random() * 2;   // Upward Y speed for new ball
                        const newBall = createNewBall(collisionX, PADDLE_Y - BALL_SIZE - 5, sx, sy, BASE_BALL_SPEED_FACTOR);
                        ballsToAdd.push(newBall);
                    }

                    // Update ball's position for the remainder of the frame after collision
                    const remainingTimeFactor = Math.max(0, 1 - timeToPaddleY); // Remaining fraction of the frame
                    nextX = collisionX + currentSpeedX * remainingTimeFactor * deltaTime;
                    nextY = ball.y + currentSpeedY * remainingTimeFactor * deltaTime; // ball.y is PADDLE_Y - currentBallSize
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

    // Remove points fields that have expired by time
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

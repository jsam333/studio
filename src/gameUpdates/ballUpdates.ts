// src/gameUpdates/ballUpdates.ts
import { Ball, PowerUp, Brick, PowerUpSpawnEvent } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { checkBrickCollision } from '../gameLogic';
import { createNewBall, findClosestBrick } from './gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_Y, BALL_SIZE, MAX_BALL_SPEED_X, SAFETY_NET_HEIGHT, 
    BIG_BALL_SIZE_INCREASE, BRICK_WIDTH, BRICK_HEIGHT
    // Removed MAX_BALL_SPEED_Y, MIN_BALL_SPEED_Y imports from reverted code
} from '../constants';

export const updateBalls = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[],
    currentTime: number,
    gameSpeedFactor: number
): Ball[] => {
    const currentMaxBallSpeedX = MAX_BALL_SPEED_X * gameSpeedFactor;
    let ballsToAdd: Ball[] = [];
    let ballsToRemoveIds: number[] = [];

    // --- Update Positions of Stuck Balls (Including initial ball) ---
    refs.stuckBallsRef.current.forEach(stuckBall => {
        const currentBallSize = stuckBall.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
        // Ensure stuckOffset is defined before using it
        const offset = stuckBall.stuckOffset ?? refs.paddleWidthRef.current / 2;
        stuckBall.x = refs.paddleXRef.current + offset;
        stuckBall.y = PADDLE_Y - currentBallSize;
    });

    // Only update active balls if the game has started
    if (refs.isGameStartedRef.current) { 
        refs.ballsRef.current.forEach(ball => {
            let processBallUpdate = true;

            // --- Effect Expiration Check (Active Balls Only) ---
            if (ball.stuckOffset === undefined) { 
                if (ball.isBlack && ball.blackEndTime && currentTime >= ball.blackEndTime) { ball.isBlack = false; ball.blackEndTime = undefined; }
                if (ball.isBlue && ball.blueEndTime && currentTime >= ball.blueEndTime) { ball.isBlue = false; ball.blueEndTime = undefined; }
                if (ball.isBig && ball.bigEndTime && currentTime >= ball.bigEndTime) { ball.isBig = false; ball.bigEndTime = undefined; }
                if (ball.isSplitting && ball.splittingEndTime && currentTime >= ball.splittingEndTime) { ball.isSplitting = false; ball.splittingEndTime = undefined; }
            }

            let currentSpeedX = ball.speedX, currentSpeedY = ball.speedY;
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

            // --- Brick Collision ---
            const brickCollisionResult = checkBrickCollision(ball, refs.bricksRef.current);
            if (brickCollisionResult.collision) {
                if (!brickCollisionResult.pierceOccurred) {
                    currentSpeedX = brickCollisionResult.newSpeedX;
                    currentSpeedY = brickCollisionResult.newSpeedY;
                    if (ball.isSplitting && brickCollisionResult.brickHit) {
                        const newBall = createNewBall(ball.x, ball.y, -currentSpeedX, -currentSpeedY, 1.0);
                        newBall.x -= (currentSpeedX > 0 ? 1 : -1);
                        newBall.y -= (currentSpeedY > 0 ? 1 : -1);
                        ballsToAdd.push(newBall);
                    }
                }
                if (brickCollisionResult.pointsAwarded > 0) { callbacks.updateScoreCallback(brickCollisionResult.pointsAwarded); }
                spawnRequests.push(...brickCollisionResult.spawnEvents);
            }

            // --- Movement & Wall/Paddle Collision ---
            const effectiveSpeedX = currentSpeedX;
            const effectiveSpeedY = currentSpeedY;
            let nextX = ball.x + effectiveSpeedX;
            let nextY = ball.y + effectiveSpeedY;

            // Wall collisions
            if (nextX > BOARD_WIDTH - currentBallSize || nextX < currentBallSize) {
                currentSpeedX = -currentSpeedX;
                nextX = ball.x + currentSpeedX;
            }
            if (nextY < currentBallSize) {
                currentSpeedY = -currentSpeedY;
                nextY = ball.y + currentSpeedY;
            }
            // Bottom collision
            else if (nextY + currentBallSize > BOARD_HEIGHT) {
                if (refs.safetyNetCountRef.current > 0) {
                    currentSpeedY = -Math.abs(currentSpeedY);
                    ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT;
                    refs.safetyNetCountRef.current--;
                    nextY = ball.y + currentSpeedY;
                } else {
                    ballsToRemoveIds.push(ball.id);
                    processBallUpdate = false;
                }
            }
            // Paddle collision check
            else if (currentSpeedY > 0 &&
                    (nextY + currentBallSize) >= PADDLE_Y &&
                    (ball.y + currentBallSize) < PADDLE_Y) { 
                if (nextX + currentBallSize > refs.paddleXRef.current &&
                    nextX - currentBallSize < refs.paddleXRef.current + refs.paddleWidthRef.current) {
                    if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig /* Prevent big balls sticking? */) {
                        // Sticky Catch
                        refs.stickyPaddleChargesRef.current--;
                        ball.stuckOffset = ball.x - refs.paddleXRef.current;
                        ball.speedX = 0; ball.speedY = 0;
                        ball.y = PADDLE_Y - currentBallSize;
                        ball.x = refs.paddleXRef.current + ball.stuckOffset;
                        if (ball.isHoming) { ball.isHoming = false; }

                        // PAUSE TIMERS
                         if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                         if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                         if (ball.isBig && ball.bigEndTime) { ball.bigPausedDuration = ball.bigEndTime - currentTime; ball.bigEndTime = undefined; }
                         if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }

                        refs.stuckBallsRef.current.push(ball);
                        ballsToRemoveIds.push(ball.id);
                        processBallUpdate = false;
                    } else {
                        // Normal Bounce
                        currentSpeedY = -Math.abs(currentSpeedY);
                        let deltaX = nextX - (refs.paddleXRef.current + refs.paddleWidthRef.current / 2);
                        let speedAdjustment = deltaX * 0.1;
                        // Re-added clamping with currentMaxBallSpeedX
                        currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, currentSpeedX + speedAdjustment));
                        ball.y = PADDLE_Y - currentBallSize;
                        nextY = ball.y + currentSpeedY;
                        // Homing logic
                         if (ball.isHoming) {
                             const closestBrick = findClosestBrick(ball, refs.bricksRef.current);
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
                    }
                }
            }
            // Removed vertical speed clamping from reverted code

            if (processBallUpdate) {
                ball.x = nextX;
                ball.y = nextY;
                ball.speedX = currentSpeedX;
                ball.speedY = currentSpeedY;
            }
        });
    } // End if (refs.isGameStartedRef.current)

    // Filter out lost/stuck balls from the active list
    const nextActiveBalls = refs.ballsRef.current.filter(ball => !ballsToRemoveIds.includes(ball.id));
    // Add newly split balls
    nextActiveBalls.push(...ballsToAdd);
    // Update active balls ref
    refs.ballsRef.current = nextActiveBalls;

    // Return value isn't strictly needed if ref is updated directly, but keep for consistency
    return nextActiveBalls;
};
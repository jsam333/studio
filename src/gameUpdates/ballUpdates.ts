// src/gameUpdates/ballUpdates.ts
import { Ball, PowerUp, Brick, PowerUpSpawnEvent } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { checkBrickCollision } from '../gameLogic';
import { createNewBall, findClosestBrick } from './gameLoopUtils';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_Y, BALL_SIZE, MAX_BALL_SPEED_X, SAFETY_NET_HEIGHT, 
    BIG_BALL_SIZE_INCREASE, BRICK_WIDTH, BRICK_HEIGHT, PADDLE_HEIGHT
} from '../constants';

export const updateBalls = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[],
    currentTime: number,
    gameSpeedFactor: number,
    deltaTime: number // Add deltaTime parameter
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
            // Pass deltaTime to checkBrickCollision 
            const brickCollisionResult = checkBrickCollision(ball, refs.bricksRef.current, deltaTime);
            if (brickCollisionResult.collision) {
                // Use the potentially modified speeds from collision result
                currentSpeedX = brickCollisionResult.newSpeedX;
                currentSpeedY = brickCollisionResult.newSpeedY;

                if (brickCollisionResult.pierceOccurred) {
                    // Speed doesn't change on pierce, handled inside checkBrickCollision's return
                } else if (ball.isSplitting && brickCollisionResult.brickHit) {
                     // Adjust split ball position slightly based on impact direction to avoid immediate re-collision
                     const newBall = createNewBall(ball.x, ball.y, -brickCollisionResult.newSpeedX, -brickCollisionResult.newSpeedY, 1.0); // Use reflected speed from result
                     const speedMagnitude = Math.sqrt(brickCollisionResult.newSpeedX*brickCollisionResult.newSpeedX + brickCollisionResult.newSpeedY*brickCollisionResult.newSpeedY);
                     if (speedMagnitude > 0) {
                         newBall.x -= (brickCollisionResult.newSpeedX / speedMagnitude) * 2; // Move slightly away from impact normal
                         newBall.y -= (brickCollisionResult.newSpeedY / speedMagnitude) * 2;
                     }
                     ballsToAdd.push(newBall);
                }
                // Apply points and spawn events regardless of bounce type 
                if (brickCollisionResult.pointsAwarded > 0) { callbacks.updateScoreCallback(brickCollisionResult.pointsAwarded); }
                spawnRequests.push(...brickCollisionResult.spawnEvents);

                // --- Adjust ball position slightly after collision? ---
                // Optional: Move ball slightly away from collision normal based on reflected speed to prevent sticking.
                // const moveOutFactor = 0.1; 
                // ball.x += currentSpeedX * moveOutFactor * deltaTime;
                // ball.y += currentSpeedY * moveOutFactor * deltaTime;
            }


            // --- Movement & Wall/Paddle Collision ---
            // Apply deltaTime to movement calculation using the potentially updated speeds from brick collision
            const effectiveSpeedX = currentSpeedX * deltaTime;
            const effectiveSpeedY = currentSpeedY * deltaTime;
            let nextX = ball.x + effectiveSpeedX;
            let nextY = ball.y + effectiveSpeedY;

            // Wall collisions (using potentially updated speeds)
            if (nextX > BOARD_WIDTH - currentBallSize || nextX < currentBallSize) {
                const overshoot = nextX > BOARD_WIDTH - currentBallSize ?
                                    (nextX - (BOARD_WIDTH - currentBallSize)) :
                                    (currentBallSize - nextX);
                currentSpeedX = -currentSpeedX; // Reflect speed
                // Reflect position based on overshoot
                nextX = (nextX > BOARD_WIDTH - currentBallSize) ?
                        (BOARD_WIDTH - currentBallSize) - overshoot :
                        currentBallSize + overshoot;
            }
             if (nextY < currentBallSize) {
                 const overshoot = currentBallSize - nextY;
                 currentSpeedY = -currentSpeedY; // Reflect speed
                 // Reflect position based on overshoot
                 nextY = currentBallSize + overshoot;
             }
            // Bottom collision (using potentially updated speeds)
            else if (nextY + currentBallSize > BOARD_HEIGHT) {
                if (refs.safetyNetCountRef.current > 0) {
                    const overshoot = (nextY + currentBallSize) - BOARD_HEIGHT;
                    currentSpeedY = -Math.abs(currentSpeedY); // Reflect speed
                    ball.y = BOARD_HEIGHT - currentBallSize - refs.safetyNetCountRef.current * SAFETY_NET_HEIGHT; // Place on net
                    refs.safetyNetCountRef.current--;
                    nextY = ball.y + currentSpeedY * deltaTime; // Recalculate nextY for the rest of the frame after bounce
                } else {
                    ballsToRemoveIds.push(ball.id);
                    processBallUpdate = false;
                }
            }
            // Paddle collision check (using potentially updated speeds)
            // More robust check: Consider ball's position relative to paddle edges
            else if (currentSpeedY > 0 && // Moving down
                     ball.y + currentBallSize <= PADDLE_Y && // Was above paddle top last frame
                     nextY + currentBallSize > PADDLE_Y) // Will be below paddle top this frame
             {
                const paddleLeft = refs.paddleXRef.current;
                const paddleRight = paddleLeft + refs.paddleWidthRef.current;

                // Calculate time of potential vertical collision (0 to 1 within the frame)
                const timeToPaddleY = (PADDLE_Y - (ball.y + currentBallSize)) / effectiveSpeedY;
                const collisionX = ball.x + effectiveSpeedX * timeToPaddleY;

                // Check if horizontally aligned with paddle at the time of vertical collision
                if (collisionX + currentBallSize > paddleLeft && collisionX - currentBallSize < paddleRight) {
                    if (refs.stickyPaddleChargesRef.current > 0 && !ball.isBig) {
                        // Sticky Catch
                        refs.stickyPaddleChargesRef.current--;
                        ball.stuckOffset = collisionX - paddleLeft; // Stick based on collision point
                        ball.speedX = 0; ball.speedY = 0;
                        ball.y = PADDLE_Y - currentBallSize; // Place on paddle
                        ball.x = paddleLeft + ball.stuckOffset;
                        if (ball.isHoming) { ball.isHoming = false; }

                        // PAUSE TIMERS
                        if (ball.isBlack && ball.blackEndTime) { ball.blackPausedDuration = ball.blackEndTime - currentTime; ball.blackEndTime = undefined; }
                        if (ball.isBlue && ball.blueEndTime) { ball.bluePausedDuration = ball.blueEndTime - currentTime; ball.blueEndTime = undefined; }
                        if (ball.isBig && ball.bigEndTime) { ball.bigPausedDuration = ball.bigEndTime - currentTime; ball.bigEndTime = undefined; }
                        if (ball.isSplitting && ball.splittingEndTime) { ball.splittingPausedDuration = ball.splittingEndTime - currentTime; ball.splittingEndTime = undefined; }

                        refs.stuckBallsRef.current.push(ball);
                        ballsToRemoveIds.push(ball.id);
                        processBallUpdate = false; // Stop further processing this frame
                        currentSpeedX = 0; // Ensure speeds are zeroed
                        currentSpeedY = 0;
                    } else {
                        // Normal Bounce
                        ball.y = PADDLE_Y - currentBallSize; // Place ball exactly on paddle surface
                        currentSpeedY = -Math.abs(currentSpeedY); // Reflect vertical speed
                        let deltaX = collisionX - (paddleLeft + refs.paddleWidthRef.current / 2);
                        let speedAdjustment = deltaX * 0.1; // Adjust horizontal speed based on impact point

                        currentSpeedX = Math.max(-currentMaxBallSpeedX, Math.min(currentMaxBallSpeedX, currentSpeedX + speedAdjustment));

                        // Homing logic (adjusts speeds *after* bounce calculation)
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
                                   currentSpeedY = -Math.abs(currentSpeedY); // Ensure it moves upwards
                               }
                            }
                           ball.isHoming = false;
                        }

                        // Recalculate position for the *remaining* time in the frame using new speeds
                        const remainingTimeFactor = Math.max(0, 1 - timeToPaddleY); // Factor of frame remaining
                        nextX = collisionX + currentSpeedX * remainingTimeFactor * deltaTime;
                        nextY = ball.y + currentSpeedY * remainingTimeFactor * deltaTime;
                    }
                }
            }


            if (processBallUpdate) {
                // Update ball state with final calculated positions and speeds for this frame
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
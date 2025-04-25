import { Brick, CollisionResult, Ball, SpawnMarker, PowerUpSpawnEvent } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, 
    BRICK_WIDTH, BRICK_HEIGHT, BRICK_COLUMNS, BRICK_ROWS, BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP,
    NORMAL_BRICK_STRENGTH, REINFORCED_BRICK_STRENGTH, UPGRADED_BRICK_STRENGTH, BUILDER_BRICK_STRENGTH,
    REINFORCED_BRICK_POINTS, NORMAL_BRICK_POINTS, SPECIAL_BRICK_POINTS, UPGRADED_BRICK_POINTS, BUILDER_BRICK_POINTS,
    MAX_BRICK_UPGRADE_LEVEL, BOMB_BRICK_POINTS, BOMB_DAMAGE_POINTS, INITIAL_PADDLE_WIDTH // Added INITIAL_PADDLE_WIDTH
    // Re-added strength constants, MAX_BRICK_UPGRADE_LEVEL, BOMB_BRICK_POINTS, BOMB_DAMAGE_POINTS
} from './constants';

export const initializeBricks = (): Brick[][] => {
    const newBricks: Brick[][] = [];
    for (let c = 0; c < BRICK_COLUMNS; c++) {
      newBricks[c] = [];
      for (let r = 0; r < BRICK_ROWS; r++) {
        const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
        const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        newBricks[c][r] = {
            x: brickX, y: brickY, status: 1,
            strength: NORMAL_BRICK_STRENGTH, // Re-added strength property
            isSpecial: false,
            upgradeLevel: 0,
            isBomb: false
        };
      }
    }
    return newBricks;
};

// Initial state places ball stuck to center of paddle
export const initialBallState: Ball = {
  x: (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2 + INITIAL_PADDLE_WIDTH / 2, // Centered on initial paddle
  y: PADDLE_Y - BALL_SIZE, // Position just above paddle
  speedX: 0, // Start with no speed
  speedY: 0,
  id: 0, // Placeholder ID
  stuckOffset: INITIAL_PADDLE_WIDTH / 2, // Stuck to center of initial paddle
  // Reset other effects
  isBlack: false,
  blackEndTime: undefined,
  blackPausedDuration: undefined,
  pierceHitsRemaining: 0,
  isBlue: false,
  blueEndTime: undefined,
  bluePausedDuration: undefined,
  isBig: false,
  bigEndTime: undefined,
  bigPausedDuration: undefined,
  isSplitting: false,
  splittingEndTime: undefined,
  splittingPausedDuration: undefined,
  isHoming: false,
};

// Helper function to handle damage/destruction of a single brick
const damageBrick = (brick: Brick, bricks: Brick[][], spawnEvents: PowerUpSpawnEvent[]): number => {
    let points = 0;
    let destroyed = false;
    if (brick.status !== 1) return 0;

    if (brick.isSpecial) { points = SPECIAL_BRICK_POINTS; brick.status = 0; destroyed = true; }
    else if (brick.isBomb) { points = BOMB_BRICK_POINTS; brick.status = 0; destroyed = true; } // Use BOMB_BRICK_POINTS again
    // Reverted upgrade level checks to original
    else if (brick.upgradeLevel === 3) { points = BUILDER_BRICK_POINTS; brick.upgradeLevel--; } 
    else if (brick.upgradeLevel === 2) { points = UPGRADED_BRICK_POINTS; brick.upgradeLevel--; }
    else if (brick.upgradeLevel === 1) { points = REINFORCED_BRICK_POINTS; brick.upgradeLevel--; }
    else { points = NORMAL_BRICK_POINTS; brick.status = 0; destroyed = true; } 

    if (destroyed) {
        const marker: SpawnMarker = brick.isSpecial ? 'SPAWN_SPECIAL' : 'PENDING';
        if (!brick.isBomb) { 
             spawnEvents.push({ marker, brickX: brick.x, brickY: brick.y });
        }
    }
    return points;
};

// Helper function for bomb explosion
const handleBombExplosion = (
    bombC: number, bombR: number,
    bricks: Brick[][],
    spawnEvents: PowerUpSpawnEvent[]
): number => {
    let explosionPoints = 0;
    const neighbors = [
        { nc: bombC + 1, nr: bombR }, { nc: bombC - 1, nr: bombR },
        { nc: bombC, nr: bombR + 1 }, { nc: bombC, nr: bombR - 1 }
    ];

    neighbors.forEach(({ nc, nr }) => {
        if (nc >= 0 && nc < BRICK_COLUMNS && nr >= 0 && nr < BRICK_ROWS) {
            const neighborBrick = bricks[nc]?.[nr];
            if (neighborBrick && neighborBrick.status === 1) {
                const damagePoints = damageBrick(neighborBrick, bricks, spawnEvents);
                // Use BOMB_DAMAGE_POINTS again
                explosionPoints += damagePoints > 0 ? BOMB_DAMAGE_POINTS : 0; 
                 if (neighborBrick.isBomb && neighborBrick.status === 0) { // Chain reaction
                    explosionPoints += handleBombExplosion(nc, nr, bricks, spawnEvents);
                 }
            }
        }
    });
    return explosionPoints;
};


export const checkBrickCollision = (
    ball: Ball,
    bricks: Brick[][],
    deltaTime: number // Add deltaTime parameter
): CollisionResult => {
    let newSpeedX = ball.speedX;
    let newSpeedY = ball.speedY;
    let pointsAwarded = 0;
    const spawnEvents: PowerUpSpawnEvent[] = [];
    let pierceOccurred = false;
    let builderHitOccurred = false;
    let collisionDetected = false;
    let brickWasHit = false;

    const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

    // Calculate potential next position based on deltaTime
    const nextBallX = ball.x + ball.speedX * deltaTime;
    const nextBallY = ball.y + ball.speedY * deltaTime;

    // Expand the check slightly beyond just the next point to handle fast balls potentially skipping over bricks
    // Check along the path from current position to next position
    const checkRadius = currentBallSize; // Use ball radius for collision check
    const movementVectorX = nextBallX - ball.x;
    const movementVectorY = nextBallY - ball.y;
    const movementLength = Math.sqrt(movementVectorX * movementVectorX + movementVectorY * movementVectorY);


    for (let c = 0; c < BRICK_COLUMNS; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < BRICK_ROWS; r++) {
            const brick = bricks[c][r];
            if (brick.status === 1) {
                
                // Simplified AABB check using the predicted next position
                // This is less accurate than swept AABB but simpler for now.
                if (nextBallX + checkRadius > brick.x && nextBallX - checkRadius < brick.x + BRICK_WIDTH &&
                    nextBallY + checkRadius > brick.y && nextBallY - checkRadius < brick.y + BRICK_HEIGHT) {

                    brickWasHit = true;
                    collisionDetected = true;

                    // --- Collision Response ---
                    // Calculate collision based on ENTRY point, not just next position
                    // For simplicity, we'll approximate based on overlap at the predicted 'next' position
                    // Calculate overlap assuming collision occurred
                    const overlapX = Math.min(nextBallX + checkRadius, brick.x + BRICK_WIDTH) - Math.max(nextBallX - checkRadius, brick.x);
                    const overlapY = Math.min(nextBallY + checkRadius, brick.y + BRICK_HEIGHT) - Math.max(nextBallY - checkRadius, brick.y);


                    let tempSpeedX = ball.speedX;
                    let tempSpeedY = ball.speedY;

                    // Determine reflection direction (Simplistic: based on collision normal derived from relative positions)
                     if (!(ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0)) {
                         // Determine collision side based on ball's position *before* this frame's movement
                         // Find center of brick
                         const brickCenterX = brick.x + BRICK_WIDTH / 2;
                         const brickCenterY = brick.y + BRICK_HEIGHT / 2;
                         // Vector from brick center to ball center BEFORE movement
                         const vecX = ball.x - brickCenterX;
                         const vecY = ball.y - brickCenterY;
                         // Calculate the widths and heights involved
                         const w = (BRICK_WIDTH / 2) + checkRadius;
                         const h = (BRICK_HEIGHT / 2) + checkRadius;
                         const crossWidth = w * vecY;
                         const crossHeight = h * vecX;

                         // Determine collision side
                         if (Math.abs(crossWidth) > Math.abs(crossHeight)) {
                             // Collision is on top or bottom
                             tempSpeedY = -ball.speedY;
                             // Correct position slightly based on overlap if needed (can be complex)
                             // ball.y = (vecY > 0 ? brick.y + BRICK_HEIGHT + checkRadius : brick.y - checkRadius); 
                         } else {
                             // Collision is on left or right
                             tempSpeedX = -ball.speedX;
                              // Correct position slightly based on overlap if needed
                             // ball.x = (vecX > 0 ? brick.x + BRICK_WIDTH + checkRadius : brick.x - checkRadius);
                         }

                     }

                    // Apply effects / damage / etc.
                    if (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) {
                        pierceOccurred = true;
                        ball.pierceHitsRemaining--;
                        pointsAwarded += damageBrick(brick, bricks, spawnEvents);
                         if (brick.isBomb && brick.status === 0) {
                            pointsAwarded += handleBombExplosion(c, r, bricks, spawnEvents);
                         }
                        // Speed remains unchanged for pierce
                        newSpeedX = ball.speedX;
                        newSpeedY = ball.speedY;
                    } else if (ball.isBlue) {
                        builderHitOccurred = true;
                        if (!brick.isSpecial && !brick.isBomb) {
                            // Use MAX_BRICK_UPGRADE_LEVEL again
                            brick.upgradeLevel = MAX_BRICK_UPGRADE_LEVEL;
                            brick.isSpecial = false; // Ensure it's not marked special if upgraded
                        }
                        // Use reflected speeds
                        newSpeedX = tempSpeedX;
                        newSpeedY = tempSpeedY;

                    } else { // Normal hit
                        const pointsFromHit = damageBrick(brick, bricks, spawnEvents);
                        pointsAwarded += pointsFromHit;
                        const brickDestroyed = brick.status === 0;

                        // Use reflected speeds
                        newSpeedX = tempSpeedX;
                        newSpeedY = tempSpeedY;

                        if (brick.isBomb && brickDestroyed) {
                            pointsAwarded += handleBombExplosion(c, r, bricks, spawnEvents);
                        }
                        else if (brickDestroyed && ball.isBlack) {
                             const neighbors = [{ nc: c + 1, nr: r }, { nc: c - 1, nr: r }, { nc: c, nr: r + 1 }, { nc: c, nr: r - 1 }];
                             const validNeighbors: { brick: Brick, col: number, row: number }[] = [];
                             neighbors.forEach(n => {
                                 if (n.nc >= 0 && n.nc < BRICK_COLUMNS && n.nr >= 0 && n.nr < BRICK_ROWS) {
                                     const neighborBrick = bricks[n.nc]?.[n.nr];
                                     if (neighborBrick && neighborBrick.status === 1 && !neighborBrick.isBomb) {
                                         validNeighbors.push({ brick: neighborBrick, col: n.nc, row: n.nr });
                                     }
                                 }
                             });
                             if (validNeighbors.length > 0) {
                                const targetNeighborData = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
                                const targetNeighbor = targetNeighborData.brick;
                                const splashPoints = damageBrick(targetNeighbor, bricks, spawnEvents);
                                pointsAwarded += splashPoints;
                                if(targetNeighbor.isBomb && targetNeighbor.status === 0){
                                   pointsAwarded += handleBombExplosion(targetNeighborData.col, targetNeighborData.row, bricks, spawnEvents);
                                }
                            }
                        }
                    }
                     // Return immediately after handling the first detected collision for this ball in this frame
                     return { collision: true, newSpeedX, newSpeedY, spawnEvents, pointsAwarded, pierceOccurred, builderHitOccurred, brickHit: true };
                }
            }
        }
    }
    // No collision detected with any brick
    return { collision: false, newSpeedX: ball.speedX, newSpeedY: ball.speedY, spawnEvents: [], pointsAwarded: 0, pierceOccurred: false, builderHitOccurred: false, brickHit: false };
};
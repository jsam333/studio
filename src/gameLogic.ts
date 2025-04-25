import { Brick, CollisionResult, Ball, SpawnMarker, PowerUpSpawnEvent } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, 
    BRICK_HEIGHT, LEVEL1_BRICK_HEIGHT, // Use both height constants
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP,
    NORMAL_BRICK_STRENGTH, REINFORCED_BRICK_STRENGTH, UPGRADED_BRICK_STRENGTH, BUILDER_BRICK_STRENGTH,
    REINFORCED_BRICK_POINTS, NORMAL_BRICK_POINTS, SPECIAL_BRICK_POINTS, UPGRADED_BRICK_POINTS, BUILDER_BRICK_POINTS,
    MAX_BRICK_UPGRADE_LEVEL, BOMB_BRICK_POINTS, BOMB_DAMAGE_POINTS, INITIAL_PADDLE_WIDTH
} from './constants';

// Updated initializeBricks to calculate width dynamically and use conditional height
export const initializeBricks = (columns: number, rows: number): Brick[][] => {
    const newBricks: Brick[][] = [];
    
    // Calculate available width and dynamic brick width
    const availableWidth = BOARD_WIDTH - 2 * BRICK_OFFSET_LEFT;
    const totalPaddingWidth = (columns - 1) * BRICK_PADDING;
    const calculatedBrickWidth = (availableWidth - totalPaddingWidth) / columns;
    
    // Determine brick height based on the number of columns (simple check for level 1)
    const isLevel1 = columns === 4; 
    const calculatedBrickHeight = isLevel1 ? LEVEL1_BRICK_HEIGHT : BRICK_HEIGHT;

    for (let c = 0; c < columns; c++) {
      newBricks[c] = [];
      for (let r = 0; r < rows; r++) {
        const brickX = (c * (calculatedBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
        // Use calculated height for Y position calculation
        const brickY = (r * (calculatedBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        newBricks[c][r] = {
            x: brickX, 
            y: brickY, 
            width: calculatedBrickWidth, 
            height: calculatedBrickHeight, // Store calculated height
            status: 1,
            strength: NORMAL_BRICK_STRENGTH, 
            isSpecial: false,
            upgradeLevel: 0,
            isBomb: false
        };
      }
    }
    return newBricks;
};

export const initialBallState: Ball = {
  x: (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2 + INITIAL_PADDLE_WIDTH / 2, 
  y: PADDLE_Y - BALL_SIZE, 
  speedX: 0, 
  speedY: 0,
  id: 0, 
  stuckOffset: INITIAL_PADDLE_WIDTH / 2, 
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

// Update damageBrick to use brick dimensions and pass width to spawn event
const damageBrick = (brick: Brick, bricks: Brick[][], columns: number, rows: number, spawnEvents: PowerUpSpawnEvent[]): number => {
    let points = 0;
    let destroyed = false;
    if (brick.status !== 1) return 0;

    if (brick.isSpecial) { points = SPECIAL_BRICK_POINTS; brick.status = 0; destroyed = true; }
    else if (brick.isBomb) { points = BOMB_BRICK_POINTS; brick.status = 0; destroyed = true; } 
    else if (brick.upgradeLevel === 3) { points = BUILDER_BRICK_POINTS; brick.upgradeLevel--; } 
    else if (brick.upgradeLevel === 2) { points = UPGRADED_BRICK_POINTS; brick.upgradeLevel--; }
    else if (brick.upgradeLevel === 1) { points = REINFORCED_BRICK_POINTS; brick.upgradeLevel--; }
    else { points = NORMAL_BRICK_POINTS; brick.status = 0; destroyed = true; } 

    if (destroyed) {
        const marker: SpawnMarker = brick.isSpecial ? 'SPAWN_SPECIAL' : 'PENDING';
        if (!brick.isBomb) { 
             spawnEvents.push({ marker, brickX: brick.x, brickY: brick.y, brickWidth: brick.width });
        }
    }
    return points;
};

// Update handleBombExplosion to use brick dimensions
const handleBombExplosion = (
    bombC: number, bombR: number,
    bricks: Brick[][],
    columns: number, rows: number, 
    spawnEvents: PowerUpSpawnEvent[]
): number => {
    let explosionPoints = 0;
    const neighbors = [
        { nc: bombC + 1, nr: bombR }, { nc: bombC - 1, nr: bombR },
        { nc: bombC, nr: bombR + 1 }, { nc: bombC, nr: bombR - 1 }
    ];

    neighbors.forEach(({ nc, nr }) => {
        if (nc >= 0 && nc < columns && nr >= 0 && nr < rows) { 
            const neighborBrick = bricks[nc]?.[nr];
            if (neighborBrick && neighborBrick.status === 1) {
                const damagePoints = damageBrick(neighborBrick, bricks, columns, rows, spawnEvents);
                explosionPoints += damagePoints > 0 ? BOMB_DAMAGE_POINTS : 0; 
                 if (neighborBrick.isBomb && neighborBrick.status === 0) { 
                    explosionPoints += handleBombExplosion(nc, nr, bricks, columns, rows, spawnEvents);
                 }
            }
        }
    });
    return explosionPoints;
};

// Update checkBrickCollision to use brick dimensions
export const checkBrickCollision = (
    ball: Ball,
    bricks: Brick[][],
    columns: number, rows: number, 
    deltaTime: number 
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
    const nextBallX = ball.x + ball.speedX * deltaTime;
    const nextBallY = ball.y + ball.speedY * deltaTime;
    const checkRadius = currentBallSize;

    for (let c = 0; c < columns; c++) { 
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) { 
            const brick = bricks[c][r];
            if (brick && brick.status === 1) { 
                if (nextBallX + checkRadius > brick.x && nextBallX - checkRadius < brick.x + brick.width &&
                    nextBallY + checkRadius > brick.y && nextBallY - checkRadius < brick.y + brick.height) {

                    brickWasHit = true;
                    collisionDetected = true;

                    let tempSpeedX = ball.speedX;
                    let tempSpeedY = ball.speedY;

                     if (!(ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0)) {
                         const brickCenterX = brick.x + brick.width / 2;
                         const brickCenterY = brick.y + brick.height / 2;
                         const vecX = ball.x - brickCenterX;
                         const vecY = ball.y - brickCenterY;
                         const w = (brick.width / 2) + checkRadius;
                         const h = (brick.height / 2) + checkRadius;
                         const crossWidth = w * vecY;
                         const crossHeight = h * vecX;

                         if (Math.abs(crossWidth) > Math.abs(crossHeight)) {
                             tempSpeedY = -ball.speedY;
                         } else {
                             tempSpeedX = -ball.speedX;
                         }
                     }

                    if (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) {
                        pierceOccurred = true;
                        ball.pierceHitsRemaining--;
                        pointsAwarded += damageBrick(brick, bricks, columns, rows, spawnEvents);
                         if (brick.isBomb && brick.status === 0) {
                            pointsAwarded += handleBombExplosion(c, r, bricks, columns, rows, spawnEvents);
                         }
                        newSpeedX = ball.speedX;
                        newSpeedY = ball.speedY;
                    } else if (ball.isBlue) {
                        builderHitOccurred = true;
                        if (!brick.isSpecial && !brick.isBomb) {
                            brick.upgradeLevel = MAX_BRICK_UPGRADE_LEVEL;
                            brick.isSpecial = false; 
                        }
                        newSpeedX = tempSpeedX;
                        newSpeedY = tempSpeedY;

                    } else { 
                        const pointsFromHit = damageBrick(brick, bricks, columns, rows, spawnEvents);
                        pointsAwarded += pointsFromHit;
                        const brickDestroyed = brick.status === 0;

                        newSpeedX = tempSpeedX;
                        newSpeedY = tempSpeedY;

                        if (brick.isBomb && brickDestroyed) {
                            pointsAwarded += handleBombExplosion(c, r, bricks, columns, rows, spawnEvents);
                        }
                        else if (brickDestroyed && ball.isBlack) {
                             const neighbors = [{ nc: c + 1, nr: r }, { nc: c - 1, nr: r }, { nc: c, nr: r + 1 }, { nc: c, nr: r - 1 }];
                             const validNeighbors: { brick: Brick, col: number, row: number }[] = [];
                             neighbors.forEach(n => {
                                 if (n.nc >= 0 && n.nc < columns && n.nr >= 0 && n.nr < rows) { 
                                     const neighborBrick = bricks[n.nc]?.[n.nr];
                                     if (neighborBrick && neighborBrick.status === 1 && !neighborBrick.isBomb) {
                                         validNeighbors.push({ brick: neighborBrick, col: n.nc, row: n.nr });
                                     }
                                 }
                             });
                             if (validNeighbors.length > 0) {
                                const targetNeighborData = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
                                const targetNeighbor = targetNeighborData.brick;
                                const splashPoints = damageBrick(targetNeighbor, bricks, columns, rows, spawnEvents);
                                pointsAwarded += splashPoints;
                                if(targetNeighbor.isBomb && targetNeighbor.status === 0){
                                   pointsAwarded += handleBombExplosion(targetNeighborData.col, targetNeighborData.row, bricks, columns, rows, spawnEvents);
                                }
                            }
                        }
                    }
                     return { collision: true, newSpeedX, newSpeedY, spawnEvents, pointsAwarded, pierceOccurred, builderHitOccurred, brickHit: true };
                }
            }
        }
    }
    return { collision: false, newSpeedX: ball.speedX, newSpeedY: ball.speedY, spawnEvents: [], pointsAwarded: 0, pierceOccurred: false, builderHitOccurred: false, brickHit: false };
};
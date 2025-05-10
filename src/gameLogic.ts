import { Brick, CollisionResult, Ball, SpawnMarker, PowerUpSpawnEvent, GameMode } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y,
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP,
    NORMAL_BRICK_STRENGTH, REINFORCED_BRICK_STRENGTH, UPGRADED_BRICK_STRENGTH, BUILDER_BRICK_STRENGTH,
    BOMB_BRICK_POINTS,
    MAX_BRICK_UPGRADE_LEVEL,
    INITIAL_PADDLE_WIDTH
} from './constants';

export const initializeBricks = (columns: number, rows: number, brickHeight: number, currentLevel: number, gameMode: GameMode | null): Brick[][] => {
    const newBricks: Brick[][] = [];

    let currentBrickOffsetLeft = BRICK_OFFSET_LEFT;
    let actualBoardWidth = BOARD_WIDTH;

    if (gameMode === 'main' && currentLevel === 2) {
        actualBoardWidth = BOARD_WIDTH * (2 / 3); // Changed from BOARD_WIDTH / 2
        currentBrickOffsetLeft = (BOARD_WIDTH / 6) + BRICK_OFFSET_LEFT / 2; // Adjusted for 2/3 width centering
    }

    const availableWidth = actualBoardWidth - 2 * BRICK_OFFSET_LEFT;
    const totalPaddingWidth = (columns - 1) * BRICK_PADDING;
    const calculatedBrickWidth = (availableWidth - totalPaddingWidth) / columns;
    const calculatedBrickHeight = brickHeight;

    let skipColumns: number[] = [];
    if (gameMode === 'main') {
        if (currentLevel === 3) {
            // For 9 columns (0-8), skip middle 5 (indices 2,3,4,5,6 which are columns 3-7)
            if (columns === 9) { 
                 skipColumns = [2, 3, 4, 5, 6];
            }
        } else if (currentLevel === 4) {
            // For 14 columns (0-13), skip 3-6 (indices 2,3,4,5) and 9-12 (indices 8,9,10,11)
            if (columns === 14) {
                skipColumns = [2, 3, 4, 5, 8, 9, 10, 11];
            } 
        } else if (currentLevel === 5) {
            // For 30 columns (0-29), only spawn 4 on each side.
            // This means columns 0,1,2,3 and 26,27,28,29 should spawn.
            // So, skip columns 4 through 25 (indices 4-25).
            if (columns === 30) { 
                skipColumns = [];
                for (let i = 4; i <= 25; i++) {
                    skipColumns.push(i);
                }
            }
        }
    }

    for (let c = 0; c < columns; c++) {
      newBricks[c] = [];
      // Apply skip logic only if the current level and column count match the condition for which skipColumns was defined.
      if (skipColumns.includes(c) && gameMode === 'main' && 
          ((currentLevel === 3 && columns === 9) || 
           (currentLevel === 4 && columns === 14) || 
           (currentLevel === 5 && columns === 30))) {
        continue; 
      }

      for (let r = 0; r < rows; r++) {
        const brickX = (c * (calculatedBrickWidth + BRICK_PADDING)) + currentBrickOffsetLeft;
        const brickY = (r * (calculatedBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        newBricks[c][r] = { 
            x: brickX, 
            y: brickY, 
            width: calculatedBrickWidth, 
            height: calculatedBrickHeight, 
            status: 1, 
            strength: NORMAL_BRICK_STRENGTH, 
            isSpecial: false, 
            upgradeLevel: 0, 
            isBomb: false, 
            holdsBall: false 
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
  lastFramePointsFieldIds: new Set(),
  // @ts-ignore 
  pierceHitsRemaining: 0 
};

const damageBrick = (brick: Brick, bricks: Brick[][], columns: number, rows: number, spawnEvents: PowerUpSpawnEvent[]): number => {
    if (brick.status !== 1) return 0;
    let points = 0;
    let destroyed = false;
    let wasHoldingBall = brick.holdsBall ?? false; 

    if (brick.isSpecial) { points = 1; brick.status = 0; destroyed = true; }
    else if (brick.isBomb) { points = BOMB_BRICK_POINTS; brick.status = 0; destroyed = true; }
    else if (brick.holdsBall) { points = 1; brick.status = 0; destroyed = true; }
    else { points = 1; if (brick.upgradeLevel && brick.upgradeLevel > 0) { brick.upgradeLevel--; } else { brick.status = 0; destroyed = true; } }

    if (destroyed) {
        let marker: SpawnMarker = 'PENDING';
        if (wasHoldingBall) {
            marker = 'SPAWN_BALL'; 
        } else if (brick.isSpecial) {
            marker = 'SPAWN_SPECIAL';
        }

        if (!brick.isBomb) {
            spawnEvents.push({ marker, brickX: brick.x, brickY: brick.y, brickWidth: brick.width, brickHeight: brick.height });
        }
    }
    return points;
};

export const handleBombExplosion = ( bombC: number, bombR: number, bricks: Brick[][], columns: number, rows: number, spawnEvents: PowerUpSpawnEvent[] ): number => {
    let explosionPoints = 0; const neighbors = [ { nc: bombC + 1, nr: bombR }, { nc: bombC - 1, nr: bombR }, { nc: bombC, nr: bombR + 1 }, { nc: bombC, nr: bombR - 1 } ];
    neighbors.forEach(({ nc, nr }) => { if (nc >= 0 && nc < columns && nr >= 0 && nr < rows) { const neighborBrick = bricks[nc]?.[nr]; if (neighborBrick && neighborBrick.status === 1) { const pointsFromNeighborHit = damageBrick(neighborBrick, bricks, columns, rows, spawnEvents); explosionPoints += pointsFromNeighborHit; if (neighborBrick.isBomb && neighborBrick.status === 0) { explosionPoints += handleBombExplosion(nc, nr, bricks, columns, rows, spawnEvents); } } } });
    return explosionPoints;
};

export const checkBrickCollision = ( ball: Ball, bricks: Brick[][], columns: number, rows: number, deltaTime: number ): CollisionResult => {
    let newSpeedX = ball.speedX; let newSpeedY = ball.speedY; let pointsAwarded = 0; const spawnEvents: PowerUpSpawnEvent[] = []; let pierceOccurred = false; let builderHitOccurred = false; let collisionDetected = false; let brickWasHit = false; const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE; const nextBallX = ball.x + ball.speedX * deltaTime; const nextBallY = ball.y + ball.speedY * deltaTime; const checkRadius = currentBallSize;
    for (let c = 0; c < columns; c++) {
         if (!bricks[c] || bricks[c].length === 0) continue; 
         for (let r = 0; r < rows; r++) {
             const brick = bricks[c][r];
             if (brick && brick.status === 1) {
                 if (nextBallX + checkRadius > brick.x && nextBallX - checkRadius < brick.x + brick.width && nextBallY + checkRadius > brick.y && nextBallY - checkRadius < brick.y + brick.height) {
                     brickWasHit = true;
                     collisionDetected = true;
                     let tempSpeedX = ball.speedX;
                     let tempSpeedY = ball.speedY;
                     // @ts-ignore
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
                     // @ts-ignore
                    if (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) {
                         pierceOccurred = true;
                         // @ts-ignore
                         ball.pierceHitsRemaining--;
                         pointsAwarded += damageBrick(brick, bricks, columns, rows, spawnEvents);
                         if (brick.isBomb && brick.status === 0) {
                             pointsAwarded += handleBombExplosion(c, r, bricks, columns, rows, spawnEvents);
                         }
                         newSpeedX = ball.speedX; 
                         newSpeedY = ball.speedY;
                     } else if (ball.isBlue) {
                         builderHitOccurred = true;
                         if (!brick.isSpecial && !brick.isBomb && !brick.holdsBall) { 
                             brick.upgradeLevel = Math.min((brick.upgradeLevel || 0) + 1, MAX_BRICK_UPGRADE_LEVEL);
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
                         } else if (brickDestroyed && ball.isBlack && !brick.isBomb && !brick.holdsBall) { 
                             const neighbors = [{ nc: c + 1, nr: r }, { nc: c - 1, nr: r }, { nc: c, nr: r + 1 }, { nc: c, nr: r - 1 }];
                             const validNeighbors: { brick: Brick, col: number, row: number }[] = [];
                             neighbors.forEach(n => {
                                 if (n.nc >= 0 && n.nc < columns && n.nr >= 0 && n.nr < rows) {
                                     const neighborBrick = bricks[n.nc]?.[n.nr];
                                     if (neighborBrick && neighborBrick.status === 1 && !neighborBrick.isBomb && !neighborBrick.holdsBall) {
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

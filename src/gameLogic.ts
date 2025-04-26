import { Brick, CollisionResult, Ball, SpawnMarker, PowerUpSpawnEvent } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, 
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP,
    NORMAL_BRICK_STRENGTH, REINFORCED_BRICK_STRENGTH, UPGRADED_BRICK_STRENGTH, BUILDER_BRICK_STRENGTH,
    BOMB_BRICK_POINTS, // Keep points for direct hit on bomb
    MAX_BRICK_UPGRADE_LEVEL, // Keep max level for builder ball
    // BOMB_DAMAGE_POINTS, // REMOVED - No longer used
    INITIAL_PADDLE_WIDTH
} from './constants';

// InitializeBricks remains the same
export const initializeBricks = (columns: number, rows: number, brickHeight: number): Brick[][] => {
    const newBricks: Brick[][] = [];
    const availableWidth = BOARD_WIDTH - 2 * BRICK_OFFSET_LEFT;
    const totalPaddingWidth = (columns - 1) * BRICK_PADDING;
    const calculatedBrickWidth = (availableWidth - totalPaddingWidth) / columns;
    const calculatedBrickHeight = brickHeight; 
    for (let c = 0; c < columns; c++) {
      newBricks[c] = [];
      for (let r = 0; r < rows; r++) {
        const brickX = (c * (calculatedBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
        const brickY = (r * (calculatedBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
        newBricks[c][r] = { x: brickX, y: brickY, width: calculatedBrickWidth, height: calculatedBrickHeight, status: 1, strength: NORMAL_BRICK_STRENGTH, isSpecial: false, upgradeLevel: 0, isBomb: false };
      }
    }
    return newBricks;
};

// initialBallState remains the same
export const initialBallState: Ball = {
  x: (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2 + INITIAL_PADDLE_WIDTH / 2, y: PADDLE_Y - BALL_SIZE, speedX: 0, speedY: 0, id: 0, stuckOffset: INITIAL_PADDLE_WIDTH / 2, isBlack: false, blackEndTime: undefined, blackPausedDuration: undefined, pierceHitsRemaining: 0, isBlue: false, blueEndTime: undefined, bluePausedDuration: undefined, isBig: false, bigEndTime: undefined, bigPausedDuration: undefined, isSplitting: false, splittingEndTime: undefined, splittingPausedDuration: undefined, isHoming: false,
};

// damageBrick remains the same (awards 1 for standard/special, BOMB_BRICK_POINTS for bomb)
const damageBrick = (brick: Brick, bricks: Brick[][], columns: number, rows: number, spawnEvents: PowerUpSpawnEvent[]): number => {
    if (brick.status !== 1) return 0; 
    let points = 0;
    let destroyed = false;
    if (brick.isSpecial) { points = 1; brick.status = 0; destroyed = true; } 
    else if (brick.isBomb) { points = BOMB_BRICK_POINTS; brick.status = 0; destroyed = true; } 
    else { points = 1; if (brick.upgradeLevel && brick.upgradeLevel > 0) { brick.upgradeLevel--; } else { brick.status = 0; destroyed = true; } }
    if (destroyed) { const marker: SpawnMarker = brick.isSpecial ? 'SPAWN_SPECIAL' : 'PENDING'; if (!brick.isBomb) { spawnEvents.push({ marker, brickX: brick.x, brickY: brick.y, brickWidth: brick.width }); } }
    return points;
};

// --- MODIFIED: handleBombExplosion function ---
// Now defined as exportable to be used by laserUpdates
export const handleBombExplosion = (
    bombC: number, bombR: number,
    bricks: Brick[][],
    columns: number, rows: number, 
    spawnEvents: PowerUpSpawnEvent[]
): number => {
    let explosionPoints = 0; // Points *from the explosion itself*, not the initial bomb hit
    const neighbors = [
        { nc: bombC + 1, nr: bombR }, { nc: bombC - 1, nr: bombR },
        { nc: bombC, nr: bombR + 1 }, { nc: bombC, nr: bombR - 1 }
    ];

    neighbors.forEach(({ nc, nr }) => {
        if (nc >= 0 && nc < columns && nr >= 0 && nr < rows) { 
            const neighborBrick = bricks[nc]?.[nr];
            if (neighborBrick && neighborBrick.status === 1) {
                // Damage the neighbor and get the points awarded (1 for standard/special, BOMB_BRICK_POINTS for bomb)
                const pointsFromNeighborHit = damageBrick(neighborBrick, bricks, columns, rows, spawnEvents);
                
                // Add the points from hitting the neighbor directly to the explosion total
                explosionPoints += pointsFromNeighborHit;

                // If the neighbor was ALSO a bomb and got destroyed by this explosion, trigger its explosion too
                // Add the points *from that secondary explosion* to our current total
                 if (neighborBrick.isBomb && neighborBrick.status === 0) { 
                    // Note: The points for hitting the neighborBomb itself (BOMB_BRICK_POINTS) were already added above.
                    // This recursive call adds points from *its* neighbors.
                    explosionPoints += handleBombExplosion(nc, nr, bricks, columns, rows, spawnEvents);
                 }
            }
        }
    });
    return explosionPoints; // Return total points from damaging neighbors
};
// --- END MODIFICATION ---

// checkBrickCollision remains largely the same, but calls the updated handleBombExplosion
export const checkBrickCollision = ( ball: Ball, bricks: Brick[][], columns: number, rows: number, deltaTime: number ): CollisionResult => {
    let newSpeedX = ball.speedX; let newSpeedY = ball.speedY; let pointsAwarded = 0; const spawnEvents: PowerUpSpawnEvent[] = []; let pierceOccurred = false; let builderHitOccurred = false; let collisionDetected = false; let brickWasHit = false; const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE; const nextBallX = ball.x + ball.speedX * deltaTime; const nextBallY = ball.y + ball.speedY * deltaTime; const checkRadius = currentBallSize;
    for (let c = 0; c < columns; c++) { if (!bricks[c]) continue; for (let r = 0; r < rows; r++) { const brick = bricks[c][r]; if (brick && brick.status === 1) { if (nextBallX + checkRadius > brick.x && nextBallX - checkRadius < brick.x + brick.width && nextBallY + checkRadius > brick.y && nextBallY - checkRadius < brick.y + brick.height) { brickWasHit = true; collisionDetected = true; let tempSpeedX = ball.speedX; let tempSpeedY = ball.speedY; if (!(ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0)) { const brickCenterX = brick.x + brick.width / 2; const brickCenterY = brick.y + brick.height / 2; const vecX = ball.x - brickCenterX; const vecY = ball.y - brickCenterY; const w = (brick.width / 2) + checkRadius; const h = (brick.height / 2) + checkRadius; const crossWidth = w * vecY; const crossHeight = h * vecX; if (Math.abs(crossWidth) > Math.abs(crossHeight)) { tempSpeedY = -ball.speedY; } else { tempSpeedX = -ball.speedX; } }
                    if (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) { pierceOccurred = true; ball.pierceHitsRemaining--; pointsAwarded += damageBrick(brick, bricks, columns, rows, spawnEvents); if (brick.isBomb && brick.status === 0) { pointsAwarded += handleBombExplosion(c, r, bricks, columns, rows, spawnEvents); } newSpeedX = ball.speedX; newSpeedY = ball.speedY; }
                    else if (ball.isBlue) { builderHitOccurred = true; if (!brick.isSpecial && !brick.isBomb) { brick.upgradeLevel = MAX_BRICK_UPGRADE_LEVEL; brick.isSpecial = false; pointsAwarded += 1; } newSpeedX = tempSpeedX; newSpeedY = tempSpeedY; }
                    else { const pointsFromHit = damageBrick(brick, bricks, columns, rows, spawnEvents); pointsAwarded += pointsFromHit; const brickDestroyed = brick.status === 0; newSpeedX = tempSpeedX; newSpeedY = tempSpeedY; if (brick.isBomb && brickDestroyed) { pointsAwarded += handleBombExplosion(c, r, bricks, columns, rows, spawnEvents); } else if (brickDestroyed && ball.isBlack && !brick.isBomb) { const neighbors = [{ nc: c + 1, nr: r }, { nc: c - 1, nr: r }, { nc: c, nr: r + 1 }, { nc: c, nr: r - 1 }]; const validNeighbors: { brick: Brick, col: number, row: number }[] = []; neighbors.forEach(n => { if (n.nc >= 0 && n.nc < columns && n.nr >= 0 && n.nr < rows) { const neighborBrick = bricks[n.nc]?.[n.nr]; if (neighborBrick && neighborBrick.status === 1 && !neighborBrick.isBomb) { validNeighbors.push({ brick: neighborBrick, col: n.nc, row: n.nr }); } } }); if (validNeighbors.length > 0) { const targetNeighborData = validNeighbors[Math.floor(Math.random() * validNeighbors.length)]; const targetNeighbor = targetNeighborData.brick; const splashPoints = damageBrick(targetNeighbor, bricks, columns, rows, spawnEvents); pointsAwarded += splashPoints; if(targetNeighbor.isBomb && targetNeighbor.status === 0){ pointsAwarded += handleBombExplosion(targetNeighborData.col, targetNeighborData.row, bricks, columns, rows, spawnEvents); } } } }
                     return { collision: true, newSpeedX, newSpeedY, spawnEvents, pointsAwarded, pierceOccurred, builderHitOccurred, brickHit: true }; } } } } 
    return { collision: false, newSpeedX: ball.speedX, newSpeedY: ball.speedY, spawnEvents: [], pointsAwarded: 0, pierceOccurred: false, builderHitOccurred: false, brickHit: false };
};
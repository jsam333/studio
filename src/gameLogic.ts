import { Brick, CollisionResult, Ball, SpawnMarker, PowerUpSpawnEvent, GameMode, GameStateRefs } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y,
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP,
    NORMAL_BRICK_STRENGTH, REINFORCED_BRICK_STRENGTH, UPGRADED_BRICK_STRENGTH, BUILDER_BRICK_STRENGTH,
    BOMB_BRICK_POINTS,
    MAX_BRICK_UPGRADE_LEVEL,
    INITIAL_PADDLE_WIDTH,
    POWER_UP_SPAWN_THRESHOLD, // Added for main mode spawn chance
    BOMB_GLOW_DURATION
} from './constants';

export const initializeBricks = (columns: number, rows: number, brickHeight: number, currentLevel: number, gameMode: GameMode | null): Brick[][] => {
    const newBricks: Brick[][] = [];

    let currentBrickOffsetLeft = BRICK_OFFSET_LEFT;
    let actualBoardWidth = BOARD_WIDTH;

    if (gameMode === 'main' && currentLevel === 1) { 
        actualBoardWidth = BOARD_WIDTH * (4 / 5);
        currentBrickOffsetLeft = (BOARD_WIDTH / 10) + BRICK_OFFSET_LEFT / 2; 
    } else if (gameMode === 'main' && currentLevel === 2) {
        actualBoardWidth = BOARD_WIDTH * (2 / 3);
        currentBrickOffsetLeft = (BOARD_WIDTH / 6) + BRICK_OFFSET_LEFT / 2; 
    }

    const availableWidth = actualBoardWidth - 2 * BRICK_OFFSET_LEFT;
    const totalPaddingWidth = (columns - 1) * BRICK_PADDING;
    const calculatedBrickWidth = (availableWidth - totalPaddingWidth) / columns;
    const calculatedBrickHeight = brickHeight;

    let skipColumns: number[] = [];
    if (gameMode === 'main') {
        if (currentLevel === 3) {
            if (columns === 9) { 
                 skipColumns = [2, 3, 4, 5, 6];
            }
        } else if (currentLevel === 4) {
            if (columns === 13) {
                skipColumns = [2, 3, 4, 5, 7, 8, 9, 10];
            } 
        } else if (currentLevel === 5) {
            if (columns === 26) { 
                skipColumns = [];
                for (let i = 4; i <= 21; i++) {
                    skipColumns.push(i);
                }
                skipColumns.push(0);
                skipColumns.push(25);
            }
        }
    }

    for (let c = 0; c < columns; c++) {
      newBricks[c] = [];
      if (skipColumns.includes(c) && gameMode === 'main' && 
          ((currentLevel === 3 && columns === 9) || 
           (currentLevel === 4 && columns === 13) || 
           (currentLevel === 5 && columns === 26))) {
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
            status: 1, // Initial status: Active
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
  isDouble: false, 
  doubleEndTime: undefined, 
  doublePausedDuration: undefined, 
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

// Returns points awarded. Modifies brick status directly.
export const damageBrick = (brick: Brick, spawnEvents: PowerUpSpawnEvent[], gameStateRefs: GameStateRefs, currentTime: number): number => {
    // Brick must be active (status 1) to be damaged or to start glowing if it's a bomb.
    if (brick.status !== 1) return 0;

    let points = 0;
    let wasHoldingBall = brick.holdsBall ?? false;
    let willBeDestroyed = false;

    if (brick.isBomb) {
        // Instead of immediate destruction, start the glow
        brick.status = 3; // Set to bomb_glowing phase
        brick.isBombGlowActive = true;
        brick.bombGlowStartTime = currentTime;
        // No points awarded yet, points come when it explodes
        return 0; 
    } else if (brick.isSpecial) {
        points = 1; 
        willBeDestroyed = true;
    } else if (brick.holdsBall) {
        points = 1; 
        willBeDestroyed = true;
    } else { // Regular brick
        points = 1;
        if (brick.upgradeLevel && brick.upgradeLevel > 0) {
            brick.upgradeLevel--;
            // Brick is damaged but not destroyed yet, no status change or flashing
        } else {
            willBeDestroyed = true;
        }
    }

    if (willBeDestroyed) {
        brick.status = 2; // Set to Destroying phase
        brick.isFlashing = true; // Start flashing animation
        brick.flashStartTime = currentTime; // Set flash start time
        // fadeOutAlpha will be handled by updateBrickAnimations

        let marker: SpawnMarker = 'NONE';
        if (wasHoldingBall) {
            marker = 'SPAWN_BALL'; 
        } else if (brick.isSpecial) {
            marker = 'SPAWN_SPECIAL';
        } else { // Regular bricks can spawn PENDING powerups
            const gameMode = gameStateRefs.gameModeRef.current;
            if (gameMode === 'test') {
                if (Math.random() < gameStateRefs.testPowerUpSpawnChanceRef.current) {
                    marker = 'PENDING';
                }
            } else { 
                marker = 'PENDING'; 
            }
        }

        if (marker !== 'NONE') { // Bombs don't spawn powerups directly from damageBrick
            spawnEvents.push({ marker, brickX: brick.x, brickY: brick.y, brickWidth: brick.width, brickHeight: brick.height });
        }
    }
    return points;
};

export const updateBombGlowsAndTriggerExplosions = (bricks: Brick[][], columns: number, rows: number, spawnEvents: PowerUpSpawnEvent[], gameStateRefs: GameStateRefs, currentTime: number): number => {
    let totalPointsFromExplosions = 0;
    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            if (brick && brick.isBombGlowActive && brick.bombGlowStartTime && (currentTime - brick.bombGlowStartTime >= BOMB_GLOW_DURATION)) {
                brick.isBombGlowActive = false; // End glow
                
                // Now, actually "destroy" the bomb brick
                brick.status = 2; // Set to Destroying phase
                brick.isFlashing = true; // Start flashing animation
                brick.flashStartTime = currentTime; // Set flash start time
                totalPointsFromExplosions += BOMB_BRICK_POINTS; // Award points for this bomb

                // Trigger explosion for its neighbors
                totalPointsFromExplosions += handleBombExplosion(brick, c, r, bricks, columns, rows, spawnEvents, gameStateRefs, currentTime);
            }
        }
    }
    return totalPointsFromExplosions;
};

// This function is now called *after* a bomb has finished glowing and its status is 2.
export const handleBombExplosion = (bombBrick: Brick, bombC: number, bombR: number, bricks: Brick[][], columns: number, rows: number, spawnEvents: PowerUpSpawnEvent[], gameStateRefs: GameStateRefs, currentTime: number): number => {
    let explosionPoints = 0; 

    const neighbors = [ { nc: bombC + 1, nr: bombR }, { nc: bombC - 1, nr: bombR }, { nc: bombC, nr: bombR + 1 }, { nc: bombC, nr: bombR - 1 } ];
    neighbors.forEach(({ nc, nr }) => { 
        if (nc >= 0 && nc < columns && nr >= 0 && nr < rows) { 
            const neighborBrick = bricks[nc]?.[nr]; 
            // Only damage active (status 1) neighbors or start glow for other active bombs
            if (neighborBrick && neighborBrick.status === 1) { 
                // damageBrick will set other bombs to glowing (status 3) or destroy other types (status 2)
                const pointsFromNeighborHit = damageBrick(neighborBrick, spawnEvents, gameStateRefs, currentTime); 
                explosionPoints += pointsFromNeighborHit; // This will be 0 if neighbor is a bomb, >0 for other types
            } 
        } 
    });
    return explosionPoints;
};

export const checkBrickCollision = ( ball: Ball, bricks: Brick[][], columns: number, rows: number, deltaTime: number, gameStateRefs: GameStateRefs, currentTime: number ): CollisionResult => {
    let newSpeedX = ball.speedX; let newSpeedY = ball.speedY; let pointsAwarded = 0; const spawnEvents: PowerUpSpawnEvent[] = []; let pierceOccurred = false; let builderHitOccurred = false; let collisionDetected = false; let brickWasHit = false; const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE; const nextBallX = ball.x + ball.speedX * deltaTime; const nextBallY = ball.y + ball.speedY * deltaTime; const checkRadius = currentBallSize;
    
    for (let c = 0; c < columns; c++) {
         if (!bricks[c] || bricks[c].length === 0) continue; 
         for (let r = 0; r < rows; r++) {
             const brick = bricks[c][r];
             // Only check for collision with bricks that are active (status 1)
             // Bomb glow (status 3) bricks are no longer active for collision until they explode.
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
                        const crossWidth = w * vecY; // Added definition
                        const crossHeight = h * vecX; // Added definition
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
                        // damageBrick will handle starting glow for bombs, or destroying others
                        pointsAwarded += damageBrick(brick, spawnEvents, gameStateRefs, currentTime); 
                        newSpeedX = ball.speedX; // Ball continues without changing direction
                        newSpeedY = ball.speedY;
                    } else if (ball.isBlue) { // Builder Ball
                        builderHitOccurred = true;
                        // Builder ball does not trigger bomb glow, it upgrades or does nothing to bombs
                        if (!brick.isSpecial && !brick.isBomb && !brick.holdsBall) { 
                            brick.upgradeLevel = Math.min((brick.upgradeLevel || 0) + 1, MAX_BRICK_UPGRADE_LEVEL);
                            brick.isDarkFlashActive = true;
                            brick.darkFlashStartTime = currentTime;
                            brick.isFlashing = false;
                            delete brick.flashStartTime;
                            brick.isRegenVisualEffectActive = false;
                            delete brick.regenVisualEffectStartTime;
                            brick.isSpecialFlashActive = false;
                            delete brick.specialFlashStartTime;
                        }
                        newSpeedX = tempSpeedX; 
                        newSpeedY = tempSpeedY;
                    } else { // Regular hit
                        // damageBrick handles starting glow for bombs, or destroying others
                        pointsAwarded += damageBrick(brick, spawnEvents, gameStateRefs, currentTime);
                        newSpeedX = tempSpeedX; 
                        newSpeedY = tempSpeedY;

                        // If ball is double, apply splash damage to a neighbor
                        if (ball.isDouble) {
                            const neighbors = [{ nc: c + 1, nr: r }, { nc: c - 1, nr: r }, { nc: c, nr: r + 1 }, { nc: c, nr: r - 1 }];
                            const validNeighbors: { brick: Brick, col: number, row: number }[] = [];
                            neighbors.forEach(n => {
                                if (n.nc >= 0 && n.nc < columns && n.nr >= 0 && n.nr < rows) {
                                    const neighborBrick = bricks[n.nc]?.[n.nr];
                                    // Only splash active (status 1) neighbors
                                    if (neighborBrick && neighborBrick.status === 1) { 
                                        validNeighbors.push({ brick: neighborBrick, col: n.nc, row: n.nr });
                                    }
                                }
                            });
                            if (validNeighbors.length > 0) {
                                const targetNeighborData = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
                                const targetNeighbor = targetNeighborData.brick;
                                // damageBrick handles starting glow for bombs, or destroying others
                                const splashPoints = damageBrick(targetNeighbor, spawnEvents, gameStateRefs, currentTime);
                                pointsAwarded += splashPoints;
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

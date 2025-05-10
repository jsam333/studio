// src/gameUpdates/gameLoopUtils.ts
import { Ball, Brick, PowerUp, PowerUpType, GameMode, SpawnMarker, PowerUpSpawnEvent } from '../interfaces'; // Added SpawnMarker, PowerUpSpawnEvent
import {
    POWER_UP_SIZE,
    ALL_TOGGLEABLE_POWER_UPS, // Used for test mode
    INITIAL_BALL_SPEED_X, // Added for new ball spawn
    INITIAL_BALL_SPEED_Y, // Added for new ball spawn
    BALL_SIZE // Added for new ball spawn
} from '../constants';

// Constants for spawn logic
export const TEST_MODE_BASE_SPAWN_CHANCE = 1.0; // Base chance for test mode
export const MAIN_GAME_BASE_SPAWN_CHANCE = 0.0; // Base chance for main game mode (0%)
export const MAIN_GAME_CHANCE_INCREASE_PER_TYPE = 0.08; // +8% chance per available power-up type
export const POWER_UP_SPAWN_THRESHOLD = 20; // Limit before chance reduction starts
export const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.02; // Reduction factor per extra power-up

// ---- Optimization: Shared empty arrays ----
const EMPTY_POWERUPS: PowerUp[] = [];
const EMPTY_BALLS: Ball[] = [];
Object.freeze(EMPTY_POWERUPS); // Prevent accidental modification
Object.freeze(EMPTY_BALLS);   // Prevent accidental modification
// ------------------------------------------

export const createPowerUp = (x: number, y: number, brickWidth: number, type: PowerUpType, timeCreated?: number): PowerUp => ({
    x: x + brickWidth / 2 - POWER_UP_SIZE / 2,
    y: y + 5, // Spawn slightly below the brick
    type,
    status: 'falling',
    id: Date.now() + Math.random() * 10, // Unique ID
    timeCreated
});

// Exported function to calculate the initial spawn chance before reductions
export const calculateBaseSpawnChance = (
    availablePowerUps: Set<PowerUpType>,
    gameMode: GameMode | null
): number => {
    const possibleTypesCount = availablePowerUps.size;
    if (possibleTypesCount === 0 && gameMode === 'main') {
        return 0; // No chance if no power-ups are spawnable in main mode
    }

    let baseChance: number;

    if (gameMode === 'main') {
        const chanceIncrease = possibleTypesCount * MAIN_GAME_CHANCE_INCREASE_PER_TYPE;
        baseChance = MAIN_GAME_BASE_SPAWN_CHANCE + chanceIncrease;
        baseChance = Math.min(1.0, baseChance); // Clamp the initial chance at 100%
    } else {
        // Test mode uses a simple base chance (or if gameMode is null)
        baseChance = TEST_MODE_BASE_SPAWN_CHANCE;
    }
    return baseChance;
};

// --- MODIFIED: handleSpawnEvents function ---
export const handleSpawnEvents = (
    spawnRequests: PowerUpSpawnEvent[],
    currentFallingPowerUpCount: number,
    availablePowerUps: Set<PowerUpType>,
    gameMode: GameMode | null,
    currentTime: number,
    currentSpeedFactor: number
): { newPowerUps: PowerUp[], newBalls: Ball[] } => {
     // Optimization: Initialize only if needed, or return shared empty arrays
    let newlySpawnedPowerUps: PowerUp[] | null = null;
    let newlySpawnedBalls: Ball[] | null = null;

    spawnRequests.forEach(event => {
        if (event.marker === 'SPAWN_SPECIAL') {
            if (!newlySpawnedPowerUps) newlySpawnedPowerUps = []; // Create only when needed
            newlySpawnedPowerUps.push(createPowerUp(event.brickX, event.brickY, event.brickWidth, 'ALL_IN_ONE', currentTime));
        } else if (event.marker === 'SPAWN_BALL') {
            const brickCenterX = event.brickX + event.brickWidth / 2;
            const brickCenterY = event.brickY + event.brickHeight / 2;
            const newBall = createNewBall(
                brickCenterX,
                brickCenterY - BALL_SIZE, 
                (Math.random() - 0.5) * 4, 
                -INITIAL_BALL_SPEED_Y, 
                currentSpeedFactor
            );
            if (!newlySpawnedBalls) newlySpawnedBalls = []; // Create only when needed
            newlySpawnedBalls.push(newBall);
        } else if (event.marker === 'PENDING') {
             let spawnChance = calculateBaseSpawnChance(availablePowerUps, gameMode);

            if (spawnChance > 0) {
                 // Apply reduction based on falling power-ups
                const totalEffectivePowerUpCount = currentFallingPowerUpCount + (newlySpawnedPowerUps?.length ?? 0); // Adjust count check
                if (totalEffectivePowerUpCount > POWER_UP_SPAWN_THRESHOLD) {
                    const excessPowerUps = totalEffectivePowerUpCount - POWER_UP_SPAWN_THRESHOLD;
                    spawnChance -= excessPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
                    spawnChance = Math.max(0, spawnChance); // Clamp final chance at 0%
                }

                // Roll for spawn
                if (Math.random() < spawnChance) {
                    if (availablePowerUps.size > 0) { // NEW: Check Set size directly
                        // NEW: Efficiently pick a random item from Set without Array.from
                        const randomIndex = Math.floor(Math.random() * availablePowerUps.size);
                        let i = 0;
                        let typeToSpawn: PowerUpType | undefined = undefined; 
                        for (const item of availablePowerUps) { // Iterate the Set
                            if (i === randomIndex) {
                                typeToSpawn = item;
                                break;
                            }
                            i++;
                        }

                        if (typeToSpawn) { // Check if a type was actually selected
                           if (!newlySpawnedPowerUps) newlySpawnedPowerUps = [];
                           newlySpawnedPowerUps.push(createPowerUp(event.brickX, event.brickY, event.brickWidth, typeToSpawn, currentTime));
                        }
                    }
                }
            }
        }
    });

    // Return the created arrays or the shared empty ones
    return {
        newPowerUps: newlySpawnedPowerUps ?? EMPTY_POWERUPS,
        newBalls: newlySpawnedBalls ?? EMPTY_BALLS
    };
};
// --- END MODIFICATION ---

// --- Other Utility Functions ---

export const createNewBall = (x: number, y: number, speedX: number, speedY: number, currentSpeedFactor: number): Ball => ({
    x,
    y,
    speedX: speedX * currentSpeedFactor,
    speedY: speedY * currentSpeedFactor,
    id: Date.now() + Math.random() * 100,
    isBlack: false, 
    // @ts-ignore
    pierceHitsRemaining: 0, 
    isBlue: false, 
    isBig: false, 
    isSplitting: false, 
    isHoming: false,
    lastFramePointsFieldIds: new Set() // Added initialization
});

export const findClosestBrick = (ball: Ball, bricks: Brick[][], columns: number, rows: number): Brick | null => {
    let closestBrick: Brick | null = null;
    let minDistSq = Infinity;
    const specialBricks: Brick[] = [];

    const ballCenterX = ball.x;
    const ballCenterY = ball.y;

    // First, identify all special bricks
    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            if (brick && brick.status === 1) {
                if (brick.isSpecial || brick.isBomb || brick.holdsBall) {
                    specialBricks.push(brick);
                }
            }
        }
    }

    // If special bricks exist, find the closest among them
    if (specialBricks.length > 0) {
        for (const brick of specialBricks) {
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;
            const distSq = Math.pow(ballCenterX - brickCenterX, 2) + Math.pow(ballCenterY - brickCenterY, 2);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestBrick = brick;
            }
        }
    } else {
        // Fallback: if no special bricks, find the closest of any brick
        for (let c = 0; c < columns; c++) {
            if (!bricks[c]) continue;
            for (let r = 0; r < rows; r++) {
                const brick = bricks[c][r];
                if (brick && brick.status === 1) {
                    const brickCenterX = brick.x + brick.width / 2;
                    const brickCenterY = brick.y + brick.height / 2;
                    const distSq = Math.pow(ballCenterX - brickCenterX, 2) + Math.pow(ballCenterY - brickCenterY, 2);
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestBrick = brick;
                    }
                }
            }
        }
    }
    return closestBrick;
};

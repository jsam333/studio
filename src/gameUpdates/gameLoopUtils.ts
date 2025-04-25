// src/gameUpdates/gameLoopUtils.ts
import { Ball, Brick, PowerUp, PowerUpType, GameMode } from '../interfaces';
import {
    POWER_UP_SIZE, 
    ALL_TOGGLEABLE_POWER_UPS // Used for test mode
} from '../constants';

// Constants for spawn logic
export const TEST_MODE_BASE_SPAWN_CHANCE = 1.0; // Base chance for test mode
export const MAIN_GAME_BASE_SPAWN_CHANCE = 0.2; // Base chance for main game mode (20%)
export const MAIN_GAME_CHANCE_INCREASE_PER_TYPE = 0.1; // +10% chance per available power-up type
export const POWER_UP_SPAWN_THRESHOLD = 20; // Limit before chance reduction starts
export const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.02; // Reduction factor per extra power-up

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

// trySpawnPowerUp now uses the exported calculation function
export const trySpawnPowerUp = (
    brickX: number,
    brickY: number,
    brickWidth: number, 
    wasSpecial: boolean,
    currentFallingPowerUpCount: number,
    newlySpawnedPowerUps: PowerUp[],
    availablePowerUps: Set<PowerUpType>, 
    gameMode: GameMode | null, 
    currentTime?: number
): void => {
    if (wasSpecial) {
        newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, brickWidth, 'ALL_IN_ONE', currentTime));
        return; 
    }

    // Get the initial spawn chance using the calculation function
    let spawnChance = calculateBaseSpawnChance(availablePowerUps, gameMode);

    if (spawnChance <= 0) {
        return; // No chance to spawn
    }

    // Apply reduction based on falling power-ups
    const totalEffectivePowerUpCount = currentFallingPowerUpCount + newlySpawnedPowerUps.length;
    if (totalEffectivePowerUpCount > POWER_UP_SPAWN_THRESHOLD) {
        const excessPowerUps = totalEffectivePowerUpCount - POWER_UP_SPAWN_THRESHOLD;
        spawnChance -= excessPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
        spawnChance = Math.max(0, spawnChance); // Clamp final chance at 0%
    }

    // Roll for spawn
    if (Math.random() < spawnChance) {
        const possibleTypes = Array.from(availablePowerUps);
        const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
        newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, brickWidth, type, currentTime));
    }
};

// --- Other Utility Functions (Unchanged) ---

export const createNewBall = (x: number, y: number, speedX: number, speedY: number, currentSpeedFactor: number): Ball => ({
    x, y,
    speedX: speedX * currentSpeedFactor,
    speedY: speedY * currentSpeedFactor,
    id: Date.now() + Math.random() * 100,
    isBlack: false, pierceHitsRemaining: 0, isBlue: false, isBig: false, isSplitting: false, isHoming: false
});

export const findClosestBrick = (ball: Ball, bricks: Brick[][], columns: number, rows: number): Brick | null => {
    let closestBrick: Brick | null = null;
    let minDistSq = Infinity;

    const ballCenterX = ball.x;
    const ballCenterY = ball.y;

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
    return closestBrick;
};

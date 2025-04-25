// src/gameUpdates/gameLoopUtils.ts
import { Ball, Brick, PowerUp, PowerUpType, GameMode } from '../interfaces';
import {
    POWER_UP_SIZE, 
    ALL_TOGGLEABLE_POWER_UPS // Used for test mode
} from '../constants';

// Constants for spawn logic
const BASE_SPAWN_CHANCE = 1.0; // Base chance is 100% if conditions met
const POWER_UP_SPAWN_THRESHOLD = 20; // Limit before chance reduction starts
const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.02; // Reduction factor per extra power-up

export const createPowerUp = (x: number, y: number, brickWidth: number, type: PowerUpType, timeCreated?: number): PowerUp => ({
    x: x + brickWidth / 2 - POWER_UP_SIZE / 2, 
    y: y + 5, // Spawn slightly below the brick
    type, 
    status: 'falling', 
    id: Date.now() + Math.random() * 10, // Unique ID
    timeCreated
});

// Updated trySpawnPowerUp to apply spawn chance reduction in both modes
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
        // Special bricks always drop ALL_IN_ONE
        newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, brickWidth, 'ALL_IN_ONE', currentTime));
        return; 
    }

    const possibleTypes = Array.from(availablePowerUps);
    if (possibleTypes.length === 0) {
        return; // No power-ups available to spawn (either none purchased in main, or none enabled in test)
    }

    // Apply spawn chance reduction based on currently falling power-ups (Applies to both modes)
    const totalEffectivePowerUpCount = currentFallingPowerUpCount + newlySpawnedPowerUps.length;
    let spawnChance = BASE_SPAWN_CHANCE; // Start with 100% base chance
    if (totalEffectivePowerUpCount > POWER_UP_SPAWN_THRESHOLD) {
        const excessPowerUps = totalEffectivePowerUpCount - POWER_UP_SPAWN_THRESHOLD;
        spawnChance -= excessPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
        spawnChance = Math.max(0, spawnChance); // Clamp chance at 0%
    }

    // Roll for spawn based on calculated chance
    if (Math.random() < spawnChance) {
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

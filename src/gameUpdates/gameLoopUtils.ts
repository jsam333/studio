// src/gameUpdates/gameLoopUtils.ts
import { Ball, Brick, PowerUp, PowerUpType } from '../interfaces';
import {
    BRICK_WIDTH, BRICK_HEIGHT, POWER_UP_SIZE, BRICK_COLUMNS, BRICK_ROWS,
    ALL_TOGGLEABLE_POWER_UPS // Use the complete list
} from '../constants';

// Constants for power-up spawning logic
const POWER_UP_SPAWN_THRESHOLD = 20;
const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.02; // 2% reduction per extra power-up

export const createPowerUp = (x: number, y: number, type: PowerUpType, timeCreated?: number): PowerUp => ({
    x: x + BRICK_WIDTH / 2 - POWER_UP_SIZE / 2, y: y + 5,
    type, status: 'falling', id: Date.now() + Math.random() * 10, timeCreated
});

/**
 * Determines if a power-up should spawn from a broken brick and creates it.
 * @param brickX X position of the broken brick.
 * @param brickY Y position of the broken brick.
 * @param wasSpecial Whether the broken brick was a special type.
 * @param currentFallingPowerUpCount Count of power-ups already falling (excluding those being spawned now).
 * @param newlySpawnedPowerUps The array to add the new power-up to if spawned.
 * @param enabledPowerUps Set of PowerUpType strings that are currently allowed to spawn.
 * @param currentTime The current game time, used for specific power-ups like ALL_IN_ONE.
 */
export const trySpawnPowerUp = (
    brickX: number,
    brickY: number,
    wasSpecial: boolean,
    currentFallingPowerUpCount: number,
    newlySpawnedPowerUps: PowerUp[],
    enabledPowerUps: Set<PowerUpType>, // Added parameter
    currentTime?: number
): void => {
    if (wasSpecial) {
        // Special bricks always drop 'ALL_IN_ONE'
        newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, 'ALL_IN_ONE', currentTime));
    } else {
        // Filter the list of all possible power-ups based on the enabled set
        const possibleTypes = ALL_TOGGLEABLE_POWER_UPS.filter(type => enabledPowerUps.has(type));

        // If no power-ups are enabled, don't spawn anything
        if (possibleTypes.length === 0) {
            return;
        }

        // Basic brick: Calculate spawn chance based on current power-up count
        const totalEffectivePowerUpCount = currentFallingPowerUpCount + newlySpawnedPowerUps.length;
        let spawnChance = 1.0; // Start at 100%

        if (totalEffectivePowerUpCount > POWER_UP_SPAWN_THRESHOLD) {
            const excessPowerUps = totalEffectivePowerUpCount - POWER_UP_SPAWN_THRESHOLD;
            spawnChance -= excessPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
            spawnChance = Math.max(0, spawnChance); // Clamp chance at 0%
        }

        if (Math.random() < spawnChance) {
            // Select randomly from the *filtered* list of possible types
            const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
            newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, type));
        }
    }
};

export const createNewBall = (x: number, y: number, speedX: number, speedY: number, currentSpeedFactor: number): Ball => ({
    x, y,
    speedX: speedX * currentSpeedFactor,
    speedY: speedY * currentSpeedFactor,
    id: Date.now() + Math.random() * 100,
    isBlack: false, pierceHitsRemaining: 0, isBlue: false, isBig: false, isSplitting: false, isHoming: false
});

export const findClosestBrick = (ball: Ball, bricks: Brick[][]): Brick | null => {
    let closestBrick: Brick | null = null;
    let minDistSq = Infinity;

    const ballCenterX = ball.x;
    const ballCenterY = ball.y;

    for (let c = 0; c < BRICK_COLUMNS; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < BRICK_ROWS; r++) {
            const brick = bricks[c][r];
            if (brick && brick.status === 1) {
                const brickCenterX = brick.x + BRICK_WIDTH / 2;
                const brickCenterY = brick.y + BRICK_HEIGHT / 2;
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

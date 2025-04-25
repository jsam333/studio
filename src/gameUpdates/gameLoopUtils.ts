// src/gameUpdates/gameLoopUtils.ts
import { Ball, Brick, PowerUp, PowerUpType } from '../interfaces';
import {
    BRICK_HEIGHT, POWER_UP_SIZE, 
    ALL_TOGGLEABLE_POWER_UPS 
} from '../constants';

const POWER_UP_SPAWN_THRESHOLD = 20;
const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.02; 

// Updated createPowerUp to accept brickWidth
export const createPowerUp = (x: number, y: number, brickWidth: number, type: PowerUpType, timeCreated?: number): PowerUp => ({
    // Use brickWidth for centering
    x: x + brickWidth / 2 - POWER_UP_SIZE / 2, 
    y: y + 5,
    type, status: 'falling', id: Date.now() + Math.random() * 10, timeCreated
});

// Updated trySpawnPowerUp to accept brickWidth
export const trySpawnPowerUp = (
    brickX: number,
    brickY: number,
    brickWidth: number, // Added brickWidth
    wasSpecial: boolean,
    currentFallingPowerUpCount: number,
    newlySpawnedPowerUps: PowerUp[],
    enabledPowerUps: Set<PowerUpType>, 
    currentTime?: number
): void => {
    if (wasSpecial) {
        // Pass brickWidth to createPowerUp
        newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, brickWidth, 'ALL_IN_ONE', currentTime));
    } else {
        const possibleTypes = ALL_TOGGLEABLE_POWER_UPS.filter(type => enabledPowerUps.has(type));
        if (possibleTypes.length === 0) {
            return;
        }
        const totalEffectivePowerUpCount = currentFallingPowerUpCount + newlySpawnedPowerUps.length;
        let spawnChance = 1.0; 
        if (totalEffectivePowerUpCount > POWER_UP_SPAWN_THRESHOLD) {
            const excessPowerUps = totalEffectivePowerUpCount - POWER_UP_SPAWN_THRESHOLD;
            spawnChance -= excessPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
            spawnChance = Math.max(0, spawnChance); 
        }
        if (Math.random() < spawnChance) {
            const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
            // Pass brickWidth to createPowerUp
            newlySpawnedPowerUps.push(createPowerUp(brickX, brickY, brickWidth, type));
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

// Updated findClosestBrick to use brick dimensions
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
                // Use brick.width and brick.height for center calculation
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

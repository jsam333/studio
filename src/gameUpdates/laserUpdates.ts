// src/gameUpdates/laserUpdates.ts
import { Laser, Brick, PowerUp, SpawnMarker, PowerUpType, PowerUpSpawnEvent } from '../interfaces'; // Added PowerUpSpawnEvent
import { GameStateRefs } from '../interfaces'; 
import { GameLoopCallbacks } from '../interfaces';
import {
    BRICK_COLUMNS, BRICK_ROWS, BRICK_WIDTH, BRICK_HEIGHT,
    SPECIAL_BRICK_POINTS, BUILDER_BRICK_POINTS, UPGRADED_BRICK_POINTS,
    REINFORCED_BRICK_POINTS, NORMAL_BRICK_POINTS
    // Removed SPAWNABLE_POWER_UP_TYPES, POWER_UP_SPAWN_THRESHOLD, POWER_UP_CHANCE_REDUCTION_PER_EXTRA
} from '../constants';
// Removed createPowerUp import

export const updateLasers = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[], // Changed parameter name
    currentTime: number,
    deltaTime: number // Add deltaTime parameter
): void => { // Return type is void, it modifies refs directly
    let nextLasersArray: Laser[] = [];
    refs.lasersRef.current.forEach(laser => {
        let laserHit = false;
        // Apply deltaTime to movement
        const movement = laser.speed * deltaTime;
        const nextLaserY = laser.y - movement;
        let brickDestroyed = false, dBrickX = 0, dBrickY = 0, dBrickWasSpecial = false;

        // Collision check remains largely the same, checking the next projected position
        for (let c = 0; c < BRICK_COLUMNS && !laserHit; c++) {
            for (let r = 0; r < BRICK_ROWS && !laserHit; r++) {
                const brick = refs.bricksRef.current[c]?.[r];
                if (brick && brick.status === 1 &&
                    laser.x < brick.x + BRICK_WIDTH && // Laser right edge vs Brick left edge
                    laser.x + laser.width > brick.x && // Laser left edge vs Brick right edge
                    nextLaserY < brick.y + BRICK_HEIGHT && // Laser bottom edge vs Brick top edge
                    nextLaserY + laser.height > brick.y) { // Laser top edge vs Brick bottom edge

                    let pts = 0;
                    if (brick.isSpecial) pts = SPECIAL_BRICK_POINTS;
                    else if (brick.upgradeLevel === 3) pts = BUILDER_BRICK_POINTS;
                    else if (brick.upgradeLevel === 2) pts = UPGRADED_BRICK_POINTS;
                    else if (brick.upgradeLevel === 1) pts = REINFORCED_BRICK_POINTS;
                    else pts = NORMAL_BRICK_POINTS;

                    if (pts > 0) callbacks.updateScoreCallback(pts);
                    brick.status = 0;
                    brick.upgradeLevel = 0;
                    laserHit = true;
                    brickDestroyed = true;
                    dBrickX = brick.x;
                    dBrickY = brick.y;
                    dBrickWasSpecial = brick.isSpecial;
                }
            }
        }

        if (brickDestroyed) {
            // Add a spawn request event instead of directly creating the power-up
            const marker: SpawnMarker = dBrickWasSpecial ? 'SPAWN_SPECIAL' : 'PENDING';
            spawnRequests.push({ marker, brickX: dBrickX, brickY: dBrickY });
        }

        // Keep the laser if it hasn't hit anything and is still on screen
        if (!laserHit && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; // Update the lasers ref directly
};

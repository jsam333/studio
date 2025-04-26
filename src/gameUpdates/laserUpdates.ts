// src/gameUpdates/laserUpdates.ts
import { Laser, Brick, PowerUp, SpawnMarker, PowerUpType, PowerUpSpawnEvent } from '../interfaces'; 
import { GameStateRefs } from '../interfaces'; 
import { GameLoopCallbacks } from '../interfaces';
import {
    BOMB_BRICK_POINTS // Only need points for direct bomb hit
    // Removed BOMB_DAMAGE_POINTS and SPECIAL_BRICK_POINTS
} from '../constants';
// --- MODIFIED: Import handleBombExplosion ---
import { handleBombExplosion } from '../gameLogic';
// --- END MODIFICATION ---

export const updateLasers = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[], 
    currentTime: number,
    deltaTime: number, 
    columns: number, 
    rows: number     
): void => { 
    let nextLasersArray: Laser[] = [];
    refs.lasersRef.current.forEach(laser => {
        let laserHit = false;
        const movement = laser.speed * deltaTime;
        const nextLaserY = laser.y - movement;
        let brickDestroyed = false;
        let dBrickX = 0, dBrickY = 0, dBrickWidth = 0, dBrickWasSpecial = false, dBrickWasBomb = false, hitBrickC = -1, hitBrickR = -1;

        for (let c = 0; c < columns && !laserHit; c++) {
             if (!refs.bricksRef.current[c]) continue; 
            for (let r = 0; r < rows && !laserHit; r++) {
                const brick = refs.bricksRef.current[c]?.[r];
                if (brick && brick.status === 1 &&
                    laser.x < brick.x + brick.width && 
                    laser.x + laser.width > brick.x && 
                    nextLaserY < brick.y + brick.height && 
                    laser.y > brick.y) { 

                    laserHit = true; 
                    let pointsFromHit = 0;

                    if (brick.isSpecial) {
                        pointsFromHit = 1;
                        brick.status = 0;
                        brickDestroyed = true;
                        dBrickWasSpecial = true;
                    } else if (brick.isBomb) {
                        pointsFromHit = BOMB_BRICK_POINTS; // Points for the direct hit
                        brick.status = 0;
                        brickDestroyed = true;
                        dBrickWasBomb = true;
                        hitBrickC = c; // Store coords for explosion
                        hitBrickR = r;
                        // --- MODIFIED: Trigger bomb explosion ---
                        // Use the imported handleBombExplosion
                        // Add points from the explosion neighbors to the pointsFromHit
                        pointsFromHit += handleBombExplosion(c, r, refs.bricksRef.current, columns, rows, spawnRequests);
                        // --- END MODIFICATION ---
                    } else {
                        pointsFromHit = 1;
                        if (brick.upgradeLevel && brick.upgradeLevel > 0) {
                            brick.upgradeLevel--; 
                        } else {
                            brick.status = 0; 
                            brickDestroyed = true;
                            dBrickWasSpecial = false;
                        }
                    }

                    if (pointsFromHit > 0) {
                        // Update score with the total points (direct hit + explosion if applicable)
                        callbacks.updateScoreCallback(pointsFromHit);
                    }

                    if (brickDestroyed) {
                        dBrickX = brick.x;
                        dBrickY = brick.y;
                        dBrickWidth = brick.width;
                    }
                }
            }
        }

        if (brickDestroyed && !dBrickWasBomb) {
            const marker: SpawnMarker = dBrickWasSpecial ? 'SPAWN_SPECIAL' : 'PENDING';
            spawnRequests.push({ marker, brickX: dBrickX, brickY: dBrickY, brickWidth: dBrickWidth }); 
        }

        if (!laserHit && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; 
};

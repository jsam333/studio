import { Laser, Brick, PowerUp, SpawnMarker, PowerUpSpawnEvent, PowerUpType } from '../interfaces'; 
import { GameStateRefs } from '../interfaces'; 
import { GameLoopCallbacks } from '../interfaces';
import {
    BOMB_BRICK_POINTS,
    POWER_UP_SPAWN_THRESHOLD // Added for main mode spawn chance
} from '../constants';
// Import damageBrick and handleBombExplosion from gameLogic
import { damageBrick, handleBombExplosion } from '../gameLogic';

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
        let laserHitBrick = false; // Renamed for clarity
        const movement = laser.speed * deltaTime;
        const nextLaserY = laser.y - movement;

        for (let c = 0; c < columns && !laserHitBrick; c++) {
             if (!refs.bricksRef.current[c]) continue; 
            for (let r = 0; r < rows && !laserHitBrick; r++) {
                const brick = refs.bricksRef.current[c]?.[r];
                // Check collision only with active bricks (status 1)
                if (brick && brick.status === 1 &&
                    laser.x < brick.x + brick.width && 
                    laser.x + laser.width > brick.x && 
                    nextLaserY < brick.y + brick.height && 
                    laser.y > brick.y) { 

                    laserHitBrick = true; 
                    const originalBrickStatus = brick.status; // Will be 1
                    let pointsFromHit = 0;

                    // Call damageBrick to handle brick state, animations, and base points/spawns
                    pointsFromHit += damageBrick(brick, spawnRequests, refs);

                    if (pointsFromHit > 0) {
                        callbacks.updateScoreCallback(pointsFromHit);
                    }

                    // If the hit brick was a bomb and was just set to destroying (status 2)
                    if (brick.isBomb && originalBrickStatus === 1 && brick.status === 2) {
                        // handleBombExplosion itself calls damageBrick for neighbors and returns points
                        const bombExplosionPoints = handleBombExplosion(brick, c, r, refs.bricksRef.current, columns, rows, spawnRequests, refs);
                        if (bombExplosionPoints > 0) {
                            callbacks.updateScoreCallback(bombExplosionPoints);
                        }
                    }
                    // No need for separate spawn logic here, damageBrick handles it.
                }
            }
        }

        // If laser didn't hit a brick and is still on screen, add to next frame's lasers
        if (!laserHitBrick && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; 
};
// src/gameUpdates/laserUpdates.ts
import { Laser, Brick, PowerUp, SpawnMarker, PowerUpType, PowerUpSpawnEvent } from '../interfaces'; 
import { GameStateRefs } from '../interfaces'; 
import { GameLoopCallbacks } from '../interfaces';
import {
    // Removed BRICK_WIDTH, BRICK_HEIGHT as they are now on the brick object
    SPECIAL_BRICK_POINTS, BUILDER_BRICK_POINTS, UPGRADED_BRICK_POINTS,
    REINFORCED_BRICK_POINTS, NORMAL_BRICK_POINTS
} from '../constants';

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
        let brickDestroyed = false, dBrickX = 0, dBrickY = 0, dBrickWidth = 0, dBrickWasSpecial = false; // Added dBrickWidth

        for (let c = 0; c < columns && !laserHit; c++) {
             if (!refs.bricksRef.current[c]) continue; 
            for (let r = 0; r < rows && !laserHit; r++) {
                const brick = refs.bricksRef.current[c]?.[r];
                // Use brick.width and brick.height for collision check
                if (brick && brick.status === 1 &&
                    laser.x < brick.x + brick.width && 
                    laser.x + laser.width > brick.x && 
                    nextLaserY < brick.y + brick.height && 
                    nextLaserY + laser.height > brick.y) { 

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
                    dBrickWidth = brick.width; // Store width of destroyed brick
                    dBrickWasSpecial = brick.isSpecial;
                }
            }
        }

        if (brickDestroyed) {
            const marker: SpawnMarker = dBrickWasSpecial ? 'SPAWN_SPECIAL' : 'PENDING';
            // Pass the stored brickWidth
            spawnRequests.push({ marker, brickX: dBrickX, brickY: dBrickY, brickWidth: dBrickWidth }); 
        }

        if (!laserHit && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; 
};

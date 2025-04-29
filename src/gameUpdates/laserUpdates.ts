import { Laser, Brick, PowerUp, SpawnMarker, PowerUpSpawnEvent, PowerUpType } from '../interfaces'; 
import { GameStateRefs } from '../interfaces'; 
import { GameLoopCallbacks } from '../interfaces';
import {
    BOMB_BRICK_POINTS
} from '../constants';
import { handleBombExplosion } from '../gameLogic';

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
        // --- MODIFIED: Added dBrickHeight and dBrickHoldsBall ---
        let dBrickX = 0, dBrickY = 0, dBrickWidth = 0, dBrickHeight = 0, dBrickWasSpecial = false, dBrickWasBomb = false, dBrickHoldsBall = false, hitBrickC = -1, hitBrickR = -1;
        // --- END MODIFICATION ---

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
                        pointsFromHit = 1; // Special bricks might have different point values later
                        brick.status = 0;
                        brickDestroyed = true;
                        dBrickWasSpecial = true;
                        dBrickHoldsBall = false; // Explicitly false if special
                    // --- MODIFIED: Added check for holdsBall ---
                    } else if (brick.holdsBall) {
                         pointsFromHit = 1; // Or specific points for BALL_BRICK if desired
                         brick.status = 0;
                         brickDestroyed = true;
                         dBrickHoldsBall = true;
                         dBrickWasSpecial = false; // Explicitly false if holds ball
                    // --- END MODIFICATION ---
                    } else if (brick.isBomb) {
                        pointsFromHit = BOMB_BRICK_POINTS; // Points for the direct hit
                        brick.status = 0;
                        brickDestroyed = true;
                        dBrickWasBomb = true;
                        dBrickWasSpecial = false; // Explicitly false if bomb
                        dBrickHoldsBall = false; // Explicitly false if bomb
                        hitBrickC = c; // Store coords for explosion
                        hitBrickR = r;
                        pointsFromHit += handleBombExplosion(c, r, refs.bricksRef.current, columns, rows, spawnRequests);
                    } else { // Regular brick or upgradeable brick
                        pointsFromHit = 1;
                        if (brick.upgradeLevel && brick.upgradeLevel > 0) {
                            brick.upgradeLevel--; 
                            // Brick is damaged but not destroyed
                        } else {
                            brick.status = 0; 
                            brickDestroyed = true;
                            dBrickWasSpecial = false;
                            dBrickHoldsBall = false;
                        }
                    }

                    if (pointsFromHit > 0) {
                        callbacks.updateScoreCallback(pointsFromHit);
                    }

                    if (brickDestroyed) {
                        dBrickX = brick.x;
                        dBrickY = brick.y;
                        dBrickWidth = brick.width;
                        // --- MODIFIED: Capture height ---
                        dBrickHeight = brick.height;
                        // --- END MODIFICATION ---
                    }
                }
            }
        }

        // --- MODIFIED: Updated spawn logic ---
        if (brickDestroyed && !dBrickWasBomb) {
            let marker: SpawnMarker = 'PENDING'; // Default for normal bricks
            if (dBrickHoldsBall) {
                marker = 'SPAWN_BALL';
            } else if (dBrickWasSpecial) {
                marker = 'SPAWN_SPECIAL';
            }
            // Pass height to the event
            spawnRequests.push({ marker, brickX: dBrickX, brickY: dBrickY, brickWidth: dBrickWidth, brickHeight: dBrickHeight }); 
        }
        // --- END MODIFICATION ---


        if (!laserHit && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; 
};
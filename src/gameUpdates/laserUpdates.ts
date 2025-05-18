import { Laser, Brick, PowerUp, SpawnMarker, PowerUpSpawnEvent, PowerUpType } from '../interfaces'; 
import { GameStateRefs } from '../interfaces'; 
import { GameLoopCallbacks } from '../interfaces';
import {
    BOMB_BRICK_POINTS,
    POWER_UP_SPAWN_THRESHOLD // Added for main mode spawn chance
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
        let dBrickX = 0, dBrickY = 0, dBrickWidth = 0, dBrickHeight = 0, dBrickWasSpecial = false, dBrickWasBomb = false, dBrickHoldsBall = false, hitBrickC = -1, hitBrickR = -1;

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
                        dBrickHoldsBall = false; 
                    } else if (brick.holdsBall) {
                         pointsFromHit = 1; 
                         brick.status = 0;
                         brickDestroyed = true;
                         dBrickHoldsBall = true;
                         dBrickWasSpecial = false; 
                    } else if (brick.isBomb) {
                        pointsFromHit = BOMB_BRICK_POINTS; 
                        brick.status = 0;
                        brickDestroyed = true;
                        dBrickWasBomb = true;
                        dBrickWasSpecial = false; 
                        dBrickHoldsBall = false; 
                        hitBrickC = c; 
                        hitBrickR = r;
                        pointsFromHit += handleBombExplosion(c, r, refs.bricksRef.current, columns, rows, spawnRequests, refs); // Pass refs
                    } else { 
                        pointsFromHit = 1;
                        if (brick.upgradeLevel && brick.upgradeLevel > 0) {
                            brick.upgradeLevel--; 
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
                        dBrickHeight = brick.height;
                    }
                }
            }
        }

        if (brickDestroyed && !dBrickWasBomb) {
            let marker: SpawnMarker = 'NONE'; // Default to NONE

            if (dBrickHoldsBall) {
                marker = 'SPAWN_BALL';
            } else if (dBrickWasSpecial) {
                marker = 'SPAWN_SPECIAL';
            } else { // Regular brick destroyed by laser, not a bomb itself
                const gameMode = refs.gameModeRef.current;
                if (gameMode === 'test') {
                    if (Math.random() < refs.testPowerUpSpawnChanceRef.current) {
                        marker = 'PENDING';
                    }
                } else { // Main game mode or if gameMode is somehow null
                    // if (Math.random() < POWER_UP_SPAWN_THRESHOLD) { // Using constant for main mode
                    //    marker = 'PENDING';
                    // }
                    // Fallback to original behavior for main game (always PENDING if not special/bomb/ball)
                     marker = 'PENDING'; 
                }
            }
            
            if (marker !== 'NONE') {
                spawnRequests.push({ marker, brickX: dBrickX, brickY: dBrickY, brickWidth: dBrickWidth, brickHeight: dBrickHeight }); 
            }
        }

        if (!laserHit && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; 
};
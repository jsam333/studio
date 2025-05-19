import { Laser, Brick, PowerUp, SpawnMarker, PowerUpSpawnEvent, PowerUpType, Particle, GameStateRefs, GameLoopCallbacks } from '../interfaces'; 
import {
    BOMB_BRICK_POINTS,
    POWER_UP_SPAWN_THRESHOLD,
    LASER_TRAIL_PARTICLE_COUNT_PER_FRAME,
    LASER_TRAIL_PARTICLE_SPEED_MIN_Y,
    LASER_TRAIL_PARTICLE_SPEED_MAX_Y,
    LASER_TRAIL_PARTICLE_SPREAD_X,
    LASER_TRAIL_PARTICLE_SIZE,
    LASER_TRAIL_PARTICLE_LIFESPAN_MS,
    LASER_TRAIL_PARTICLE_COLOR
} from '../constants';
import { damageBrick, handleBombExplosion } from '../gameLogic';

let nextLaserParticleId = 0; // Local ID counter for laser particles

export const updateLasers = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    spawnRequests: PowerUpSpawnEvent[], 
    currentTime: number,
    deltaTime: number, // This is scaledDeltaTime from gameLoop
    columns: number, 
    rows: number     
): void => { 
    let nextLasersArray: Laser[] = [];
    refs.lasersRef.current.forEach(laser => {
        let laserHitBrick = false; 
        const movement = laser.speed * deltaTime; // Use scaledDeltaTime for movement
        const nextLaserY = laser.y - movement;

        // Spawn trail particles before collision check for the current frame position
        for (let i = 0; i < LASER_TRAIL_PARTICLE_COUNT_PER_FRAME; i++) {
            const speedX = (Math.random() - 0.5) * 2 * LASER_TRAIL_PARTICLE_SPREAD_X;
            const speedY = LASER_TRAIL_PARTICLE_SPEED_MIN_Y + Math.random() * (LASER_TRAIL_PARTICLE_SPEED_MAX_Y - LASER_TRAIL_PARTICLE_SPEED_MIN_Y);
            const particle: Particle = {
                id: nextLaserParticleId++, // Use local ID counter
                x: laser.x + laser.width / 2, // Center X of the laser
                y: laser.y + laser.height,    // Bottom of the laser
                speedX: speedX,
                speedY: speedY,               // Positive for downward
                size: LASER_TRAIL_PARTICLE_SIZE,
                color: LASER_TRAIL_PARTICLE_COLOR,
                alpha: 1.0,
                lifespan: LASER_TRAIL_PARTICLE_LIFESPAN_MS,
                createdAt: currentTime,
            };
            refs.particlesRef.current.push(particle);
        }

        for (let c = 0; c < columns && !laserHitBrick; c++) {
             if (!refs.bricksRef.current[c]) continue; 
            for (let r = 0; r < rows && !laserHitBrick; r++) {
                const brick = refs.bricksRef.current[c]?.[r];
                if (brick && brick.status === 1 &&
                    laser.x < brick.x + brick.width && 
                    laser.x + laser.width > brick.x && 
                    nextLaserY < brick.y + brick.height && // Use nextLaserY for collision
                    laser.y > brick.y) { 

                    laserHitBrick = true; 
                    const originalBrickStatus = brick.status; 
                    let pointsFromHit = 0;

                    pointsFromHit += damageBrick(brick, spawnRequests, refs);

                    if (pointsFromHit > 0) {
                        callbacks.updateScoreCallback(pointsFromHit);
                    }

                    if (brick.isBomb && originalBrickStatus === 1 && brick.status === 2) {
                        const bombExplosionPoints = handleBombExplosion(brick, c, r, refs.bricksRef.current, columns, rows, spawnRequests, refs);
                        if (bombExplosionPoints > 0) {
                            callbacks.updateScoreCallback(bombExplosionPoints);
                        }
                    }
                }
            }
        }

        if (!laserHitBrick && nextLaserY + laser.height > 0) {
            nextLasersArray.push({ ...laser, y: nextLaserY });
        }
    });
    refs.lasersRef.current = nextLasersArray; 
};
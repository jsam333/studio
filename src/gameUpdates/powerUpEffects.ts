// src/gameUpdates/powerUpEffects.ts
import { PowerUpType, Particle } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { applyBrickEffects } from './powerUpEffects/brickEffects';
import { applyBallEffects } from './powerUpEffects/ballEffects';
import { applyPaddleEffects } from './powerUpEffects/paddleEffects';
import { applyGameEffects } from './powerUpEffects/gameEffects';
import { 
    ALL_TOGGLEABLE_POWER_UPS,
    PADDLE_Y, 
    MULTIBALL_PARTICLE_COUNT,
    MULTIBALL_PARTICLE_SPEED_MIN,
    MULTIBALL_PARTICLE_SPEED_MAX,
    MULTIBALL_PARTICLE_SIZE, // Updated to fixed size
    MULTIBALL_PARTICLE_LIFESPAN_MS,
    MULTIBALL_PARTICLE_COLOR // Updated to white
} from '../constants'; 

let nextParticleId = 0;

const spawnMultiballParticles = (refs: GameStateRefs, currentTime: number) => {
    const paddleCenterX = refs.paddleXRef.current + refs.paddleWidthRef.current / 2;
    const particleSpawnY = PADDLE_Y; // Spawn at the top of the paddle

    const baseAngle = -Math.PI / 2; // Straight up
    const coneSpread = Math.PI / 4; // 90 degrees cone means +/- 45 degrees (PI/4 radians)

    for (let i = 0; i < MULTIBALL_PARTICLE_COUNT; i++) {
        const angle = baseAngle + (Math.random() * coneSpread * 2) - coneSpread;
        const speed = MULTIBALL_PARTICLE_SPEED_MIN + Math.random() * (MULTIBALL_PARTICLE_SPEED_MAX - MULTIBALL_PARTICLE_SPEED_MIN);
        // const size = MULTIBALL_PARTICLE_SIZE_MIN + Math.random() * (MULTIBALL_PARTICLE_SIZE_MAX - MULTIBALL_PARTICLE_SIZE_MIN);

        const particle: Particle = {
            id: nextParticleId++,
            x: paddleCenterX,
            y: particleSpawnY,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed, 
            size: MULTIBALL_PARTICLE_SIZE, // Use fixed size
            color: MULTIBALL_PARTICLE_COLOR, // Use white color
            alpha: 1.0,
            lifespan: MULTIBALL_PARTICLE_LIFESPAN_MS,
            createdAt: currentTime,
        };
        refs.particlesRef.current.push(particle);
    }
};

export const applyPowerUpEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    collectedPowerUpTypes: PowerUpType[],
    currentTime: number,
    gameSpeedFactor: number
) => {
    collectedPowerUpTypes.forEach(type => {
        if (type === 'MULTI_BALL' || type === 'MULTI_BALL_L2' || type === 'MULTI_BALL_L3') {
            spawnMultiballParticles(refs, currentTime);
        }

        if (type === 'ALL_IN_ONE') {
            const ownedPowerUps = refs.spawnablePowerUpsRef.current;
            const powerUpsToActivate: PowerUpType[] = [];

            ALL_TOGGLEABLE_POWER_UPS.forEach(l1PowerUp => {
                if (l1PowerUp === 'ALL_IN_ONE' || l1PowerUp === 'MAKE_SPECIAL') return; 

                const l2PowerUp = `${l1PowerUp}_L2` as PowerUpType;
                const l3PowerUp = `${l1PowerUp}_L3` as PowerUpType;

                if (ownedPowerUps.has(l1PowerUp) || 
                    ownedPowerUps.has(l2PowerUp) || 
                    ownedPowerUps.has(l3PowerUp)) {
                    powerUpsToActivate.push(l1PowerUp);
                }
            });

            if (powerUpsToActivate.length > 0) {
                const multiBallInAllInOne = powerUpsToActivate.some(pu => pu.startsWith('MULTI_BALL'));
                if (multiBallInAllInOne) {
                    spawnMultiballParticles(refs, currentTime); 
                }
                applyPowerUpEffects(refs, callbacks, powerUpsToActivate, currentTime, gameSpeedFactor);
            }
        } else {
            applyBrickEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyBallEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyPaddleEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyGameEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
        }
    });
};

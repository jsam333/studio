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
    MULTIBALL_PARTICLE_SIZE,
    MULTIBALL_PARTICLE_LIFESPAN_MS,
    MULTIBALL_PARTICLE_COLOR
} from '../constants'; 

let nextParticleId = 0;

const spawnMultiballParticles = (refs: GameStateRefs, currentTime: number) => {
    const paddleCenterX = refs.paddleXRef.current + refs.paddleWidthRef.current / 2;
    const particleSpawnY = PADDLE_Y;
    const baseAngle = -Math.PI / 2;
    const coneSpread = Math.PI / 4;
    for (let i = 0; i < MULTIBALL_PARTICLE_COUNT; i++) {
        const angle = baseAngle + (Math.random() * coneSpread * 2) - coneSpread;
        const speed = MULTIBALL_PARTICLE_SPEED_MIN + Math.random() * (MULTIBALL_PARTICLE_SPEED_MAX - MULTIBALL_PARTICLE_SPEED_MIN);
        const particle: Particle = {
            id: nextParticleId++,
            x: paddleCenterX,
            y: particleSpawnY,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed, 
            size: MULTIBALL_PARTICLE_SIZE,
            color: MULTIBALL_PARTICLE_COLOR,
            alpha: 1.0,
            lifespan: MULTIBALL_PARTICLE_LIFESPAN_MS,
            createdAt: currentTime,
        };
        refs.particlesRef.current.push(particle);
    }
};

function shuffleArray<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

export const applyPowerUpEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    collectedPowerUpTypes: PowerUpType[],
    currentTime: number,
    gameSpeedFactor: number
) => {
    collectedPowerUpTypes.forEach(type => {
        // Specific handling for MULTI_BALL particles, even when part of ALL_IN_ONE
        if (type === 'MULTI_BALL' || type === 'MULTI_BALL_L2' || type === 'MULTI_BALL_L3') {
            // This particle spawn will also be handled by the ALL_IN_ONE logic if MULTI_BALL is selected,
            // but having it here ensures it triggers if MULTI_BALL is collected directly.
            if (!collectedPowerUpTypes.includes('ALL_IN_ONE')) { // Avoid double spawn if ALL_IN_ONE also includes it
                 spawnMultiballParticles(refs, currentTime);
            }
        }

        if (type === 'ALL_IN_ONE') {
            const gameMode = refs.gameModeRef.current;
            let availableL1PowerUps: PowerUpType[] = [];

            if (gameMode === 'test') {
                const sidebarEnabledPowerUps = refs.enabledPowerUpsRef.current; // Powerups enabled in sidebar (e.g., 'WIDEN_PADDLE_L2')
                const uniqueL1TypesFromSidebar = new Set<PowerUpType>();

                sidebarEnabledPowerUps.forEach(activePowerUpInSidebar => {
                    const baseL1Type = activePowerUpInSidebar.replace('_L2', '').replace('_L3', '') as PowerUpType;
                    if (baseL1Type === 'ALL_IN_ONE' || baseL1Type === 'MAKE_SPECIAL') return;
                    if (ALL_TOGGLEABLE_POWER_UPS.includes(baseL1Type)) {
                        uniqueL1TypesFromSidebar.add(baseL1Type);
                    }
                });
                availableL1PowerUps = Array.from(uniqueL1TypesFromSidebar);
            } else { // Main game mode
                const ownedPowerUps = refs.spawnablePowerUpsRef.current; // Powerups collected/unlocked (e.g. 'MULTI_BALL_L2')
                ALL_TOGGLEABLE_POWER_UPS.forEach(l1PowerUp => {
                    if (l1PowerUp === 'ALL_IN_ONE' || l1PowerUp === 'MAKE_SPECIAL') return;
                    const l2PowerUp = `${l1PowerUp}_L2` as PowerUpType;
                    const l3PowerUp = `${l1PowerUp}_L3` as PowerUpType;
                    if (ownedPowerUps.has(l1PowerUp) || ownedPowerUps.has(l2PowerUp) || ownedPowerUps.has(l3PowerUp)) {
                        availableL1PowerUps.push(l1PowerUp);
                    }
                });
            }

            let powerUpsToActivate: PowerUpType[] = [];
            if (availableL1PowerUps.length > 0) {
                if (availableL1PowerUps.length <= 5) {
                    powerUpsToActivate = availableL1PowerUps;
                } else {
                    powerUpsToActivate = shuffleArray(availableL1PowerUps).slice(0, 5);
                }
                
                const multiBallInAllInOne = powerUpsToActivate.some(pu => pu.startsWith('MULTI_BALL'));
                if (multiBallInAllInOne) {
                    spawnMultiballParticles(refs, currentTime); 
                }

                const filteredPowerUpsToActivate = powerUpsToActivate.filter(pu => pu !== 'ALL_IN_ONE');
                if (filteredPowerUpsToActivate.length > 0) {
                   applyPowerUpEffects(refs, callbacks, filteredPowerUpsToActivate, currentTime, gameSpeedFactor);
                }
            }
        } else {
            // Apply individual powerup effects if not ALL_IN_ONE
            applyBrickEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyBallEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyPaddleEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyGameEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
        }
    });
};

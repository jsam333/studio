// src/gameUpdates/powerUpEffects.ts
import { PowerUpType } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { applyBrickEffects } from './powerUpEffects/brickEffects';
import { applyBallEffects } from './powerUpEffects/ballEffects';
import { applyPaddleEffects } from './powerUpEffects/paddleEffects';
import { applyGameEffects } from './powerUpEffects/gameEffects';
import { ALL_TOGGLEABLE_POWER_UPS } from '../constants'; // Import the list of spawnable power-ups

export const applyPowerUpEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    collectedPowerUpTypes: PowerUpType[],
    currentTime: number,
    gameSpeedFactor: number
) => {
    collectedPowerUpTypes.forEach(type => {
        if (type === 'ALL_IN_ONE') {
            // Use spawnablePowerUpsRef as the source of truth for owned power-ups
            const ownedPowerUps = refs.spawnablePowerUpsRef.current;
            const powerUpsToActivate: PowerUpType[] = [];

            ALL_TOGGLEABLE_POWER_UPS.forEach(l1PowerUp => {
                // Skip ALL_IN_ONE itself and MAKE_SPECIAL
                if (l1PowerUp === 'ALL_IN_ONE' || l1PowerUp === 'MAKE_SPECIAL') return; 

                // Check if any level of this power-up is owned
                const l2PowerUp = `${l1PowerUp}_L2` as PowerUpType;
                const l3PowerUp = `${l1PowerUp}_L3` as PowerUpType;

                if (ownedPowerUps.has(l1PowerUp) || 
                    ownedPowerUps.has(l2PowerUp) || 
                    ownedPowerUps.has(l3PowerUp)) {
                    // If any level is owned, activate the L1 version
                    powerUpsToActivate.push(l1PowerUp);
                }
            });

            if (powerUpsToActivate.length > 0) {
                applyPowerUpEffects(refs, callbacks, powerUpsToActivate, currentTime, gameSpeedFactor);
            }
        } else {
            // Delegate to specific effect handlers
            applyBrickEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyBallEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyPaddleEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyGameEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
        }
    });
};

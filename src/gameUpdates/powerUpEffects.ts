// src/gameUpdates/powerUpEffects.ts
import { PowerUpType } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { applyBrickEffects } from './powerUpEffects/brickEffects';
import { applyBallEffects } from './powerUpEffects/ballEffects';
import { applyPaddleEffects } from './powerUpEffects/paddleEffects';
import { applyGameEffects } from './powerUpEffects/gameEffects';

export const applyPowerUpEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    collectedPowerUpTypes: PowerUpType[],
    currentTime: number,
    gameSpeedFactor: number
) => {
    collectedPowerUpTypes.forEach(type => {
        if (type === 'ALL_IN_ONE') {
            // Apply all individual power-up effects recursively
            const allTypes: PowerUpType[] = [
                'HOMING_BALL', 'COLLECTION_FIELD', 'SPLITTING_BALL', 'BIG_BALL',
                'MULTI_BALL', 'BUILDER_BALL', 'BLACK_BALL', 'PIERCE_BALL',
                'WIDEN_PADDLE', 'LASER_PADDLE', 'REGEN_BRICK', 'SAFETY_NET',
                'MAKE_SPECIAL', 'BOMB_BRICK', 'STICKY_PADDLE',
                'REINFORCE_BRICK', 'UPGRADE_BRICK'
            ];
            // Apply all effects except 'ALL_IN_ONE' itself to avoid infinite loop
            applyPowerUpEffects(refs, callbacks, allTypes, currentTime, gameSpeedFactor);
        } else {
            // Delegate to specific effect handlers
            applyBrickEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyBallEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyPaddleEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
            applyGameEffects(refs, callbacks, type, currentTime, gameSpeedFactor);
        }
    });
};

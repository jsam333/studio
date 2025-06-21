// src/gameUpdates/powerUpEffects/paddleEffects.ts
import { PowerUpType } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    PADDLE_WIDEN_INCREMENT, MAX_PADDLE_WIDTH, BOARD_WIDTH
} from '../../constants';


export const applyPaddleEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    type: PowerUpType,
    currentTime: number,
    gameSpeedFactor: number
) => {
    switch (type) {
        case 'WIDEN_PADDLE':
        case 'WIDEN_PADDLE_L2':
        case 'WIDEN_PADDLE_L3': {
            let multiplier = 1;
            if (type === 'WIDEN_PADDLE_L2') {
                multiplier = 2;
            } else if (type === 'WIDEN_PADDLE_L3') {
                multiplier = 3;
            }

            const totalWidenIncrement = PADDLE_WIDEN_INCREMENT * multiplier;
            const originalWidth = refs.paddleWidthRef.current;
            const currentPaddleX = refs.paddleXRef.current;

            const newWidthAttempt = originalWidth + totalWidenIncrement;
            const finalNewWidth = Math.min(MAX_PADDLE_WIDTH, newWidthAttempt);
            const actualWidthIncrease = finalNewWidth - originalWidth;

            if (actualWidthIncrease > 0) {
                let newPaddleX = currentPaddleX - actualWidthIncrease / 2;
                newPaddleX = Math.max(0, newPaddleX);
                newPaddleX = Math.min(BOARD_WIDTH - finalNewWidth, newPaddleX);

                refs.paddleWidthRef.current = finalNewWidth;
                refs.paddleXRef.current = newPaddleX;
                refs.widenLevelRef.current += multiplier;
                callbacks.schedulePaddleShrink();

                // Trigger visual effect
                if (refs.paddleVisualEffectActiveRef && refs.paddleVisualEffectStartTimeRef) {
                    refs.paddleVisualEffectActiveRef.current = true;
                    refs.paddleVisualEffectStartTimeRef.current = currentTime;
                }
            } else if (originalWidth >= MAX_PADDLE_WIDTH) {
                 callbacks.schedulePaddleShrink();
                 // Optionally trigger visual effect even if at max width, if desired
                 // if (refs.paddleVisualEffectActiveRef && refs.paddleVisualEffectStartTimeRef) {
                 //     refs.paddleVisualEffectActiveRef.current = true;
                 //     refs.paddleVisualEffectStartTimeRef.current = currentTime;
                 // }
            }
            break;
        }
        case 'LASER_PADDLE':
        case 'LASER_PADDLE_L2':
        case 'LASER_PADDLE_L3': {
            let shotsToAdd = 2; 
            if (type === 'LASER_PADDLE_L2') {
                shotsToAdd = 4; 
            } else if (type === 'LASER_PADDLE_L3') {
                shotsToAdd = 6; 
            }
             refs.laserShotsRef.current += shotsToAdd;
            break;
        }
        case 'RECOVERY_PADDLE':
        case 'RECOVERY_PADDLE_L2':
        case 'RECOVERY_PADDLE_L3': {
             let chargesToAdd = 2; 
             if (type === 'RECOVERY_PADDLE_L2') {
                 chargesToAdd = 4; 
             } else if (type === 'RECOVERY_PADDLE_L3') {
                 chargesToAdd = 6; 
             }
             refs.stickyPaddleChargesRef.current += chargesToAdd;
            break;
        }
        default:
            break;
    }
};

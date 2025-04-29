import { PowerUpType } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    PADDLE_WIDEN_INCREMENT, MAX_PADDLE_WIDTH, BOARD_WIDTH
    // Removed non-existent constants:
    // LASER_SHOTS_INCREMENT_L1, LASER_SHOTS_INCREMENT_L2, LASER_SHOTS_INCREMENT_L3,
    // STICKY_PADDLE_CHARGES_L1, STICKY_PADDLE_CHARGES_L2, STICKY_PADDLE_CHARGES_L3
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
            } else if (originalWidth >= MAX_PADDLE_WIDTH) {
                 callbacks.schedulePaddleShrink();
            }
            break;
        }
        case 'LASER_PADDLE':
        case 'LASER_PADDLE_L2':
        case 'LASER_PADDLE_L3': {
            // Add 2, 3, or 4 shots based on level
            let shotsToAdd = 2; // Level 1 gives 2 shots
            if (type === 'LASER_PADDLE_L2') {
                shotsToAdd = 4; // Level 2 gives 3 shots
            } else if (type === 'LASER_PADDLE_L3') {
                shotsToAdd = 6; // Level 3 gives 4 shots
            }
             refs.laserShotsRef.current += shotsToAdd;
            break;
        }
        case 'STICKY_PADDLE':
        case 'STICKY_PADDLE_L2':
        case 'STICKY_PADDLE_L3': {
             // Simplified logic: Add 1, 2, or 3 charges based on level
             let chargesToAdd = 1;
             if (type === 'STICKY_PADDLE_L2') {
                 chargesToAdd = 2;
             } else if (type === 'STICKY_PADDLE_L3') {
                 chargesToAdd = 3;
             }
             refs.stickyPaddleChargesRef.current += chargesToAdd;
            break;
        }
        default:
            break;
    }
};

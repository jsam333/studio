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
        case 'WIDEN_PADDLE': {
            const originalWidth = refs.paddleWidthRef.current;
            const currentPaddleX = refs.paddleXRef.current;
            const newWidthAttempt = originalWidth + PADDLE_WIDEN_INCREMENT;
            const finalNewWidth = Math.min(MAX_PADDLE_WIDTH, newWidthAttempt);
            const widthIncrease = finalNewWidth - originalWidth;

            if (widthIncrease > 0) {
                let newPaddleX = currentPaddleX - widthIncrease / 2;
                newPaddleX = Math.max(0, newPaddleX);
                newPaddleX = Math.min(BOARD_WIDTH - finalNewWidth, newPaddleX);
                refs.paddleWidthRef.current = finalNewWidth;
                refs.paddleXRef.current = newPaddleX;
                refs.widenLevelRef.current++;
                callbacks.schedulePaddleShrink();
            } else {
                callbacks.schedulePaddleShrink();
            }
            break;
        }
        case 'LASER_PADDLE': {
            refs.laserShotsRef.current++;
            break;
        }
        case 'STICKY_PADDLE': {
            refs.stickyPaddleChargesRef.current++;
            break;
        }
        default:
            break;
    }
};

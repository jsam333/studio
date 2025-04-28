// src/hooks/usePaddleLogic.ts
import { useRef, useCallback, MutableRefObject } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, PADDLE_WIDEN_INCREMENT
} from '../constants';
import { calculateShrinkDuration } from '../gameUtils';

interface UsePaddleLogicProps {
    paddleXRef: MutableRefObject<number>;
    paddleWidthRef: MutableRefObject<number>;
    widenLevelRef: MutableRefObject<number>;
    paddleShrinkCountdownRef: MutableRefObject<number | null>;
}

export function usePaddleLogic({
    paddleXRef,
    paddleWidthRef,
    widenLevelRef,
    paddleShrinkCountdownRef
}: UsePaddleLogicProps) {

    const schedulePaddleShrink = useCallback(() => {
        const currentWidth = paddleWidthRef.current;
        const duration = calculateShrinkDuration(currentWidth);
        paddleShrinkCountdownRef.current = duration;
    }, [paddleWidthRef, paddleShrinkCountdownRef]); // Added refs to dependency array

    const executePaddleShrink = useCallback(() => {
        if (widenLevelRef.current > 0) {
            const oldWidth = paddleWidthRef.current;
            if (oldWidth > INITIAL_PADDLE_WIDTH) {
                const currentPaddleXLocal = paddleXRef.current;
                const newWidth = Math.max(INITIAL_PADDLE_WIDTH, oldWidth - PADDLE_WIDEN_INCREMENT);
                const widthDecrease = oldWidth - newWidth;
                let newPaddleX = currentPaddleXLocal + widthDecrease / 2;
                newPaddleX = Math.max(0, newPaddleX);
                newPaddleX = Math.min(BOARD_WIDTH - newWidth, newPaddleX);
                paddleWidthRef.current = newWidth;
                paddleXRef.current = newPaddleX;
            }
            widenLevelRef.current--;

            if (widenLevelRef.current > 0 && paddleWidthRef.current > INITIAL_PADDLE_WIDTH) {
                schedulePaddleShrink();
            } else {
                 // Ensure paddle doesn't shrink below initial width if widenLevel drops to 0
                 if (paddleWidthRef.current < INITIAL_PADDLE_WIDTH) {
                     const currentPaddleXLocal = paddleXRef.current;
                     const widthIncrease = INITIAL_PADDLE_WIDTH - paddleWidthRef.current;
                     let newPaddleX = currentPaddleXLocal - widthIncrease / 2; // Adjust X position
                     newPaddleX = Math.max(0, newPaddleX);
                     newPaddleX = Math.min(BOARD_WIDTH - INITIAL_PADDLE_WIDTH, newPaddleX);
                     paddleWidthRef.current = INITIAL_PADDLE_WIDTH;
                     paddleXRef.current = newPaddleX;
                 }
                 widenLevelRef.current = 0; // Explicitly set to 0
                 paddleShrinkCountdownRef.current = null;
            }
        } else {
             paddleShrinkCountdownRef.current = null; // Ensure countdown is cleared if widenLevel is 0
        }
    }, [schedulePaddleShrink, paddleXRef, paddleWidthRef, widenLevelRef, paddleShrinkCountdownRef]); // Added refs to dependency array

    // Function to reset paddle state (can be called from handleResetGame)
    const resetPaddle = useCallback(() => {
        paddleWidthRef.current = INITIAL_PADDLE_WIDTH;
        paddleXRef.current = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
        widenLevelRef.current = 0;
        paddleShrinkCountdownRef.current = null;
    }, [paddleXRef, paddleWidthRef, widenLevelRef, paddleShrinkCountdownRef]); // Added refs


    return {
        schedulePaddleShrink,
        executePaddleShrink,
        resetPaddle // Expose reset function
    };
}

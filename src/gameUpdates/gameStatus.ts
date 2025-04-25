// src/gameUpdates/gameStatus.ts
import { GameStateRefs, GameLoopCallbacks, GameState } from '../interfaces';

// Helper to clear bonus timers (to avoid duplication)
const clearBonusTimers = (refs: GameStateRefs) => {
    if (refs.bonusGoldTimerRef?.current) clearTimeout(refs.bonusGoldTimerRef.current);
    if (refs.bonusGoldDecrementIntervalRef?.current) clearInterval(refs.bonusGoldDecrementIntervalRef.current);
    refs.bonusGoldTimerRef.current = null;
    refs.bonusGoldDecrementIntervalRef.current = null;
    if (refs.bonusCountdownStartedRef) {
      refs.bonusCountdownStartedRef.current = false;
    }   
};

export const checkGameStatus = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    previousBallCount: number,
    columns: number, 
    rows: number     
): GameState => {
    if (refs.gameOverStateRef.current !== 'playing') {
        return refs.gameOverStateRef.current;
    }

    let nextState: GameState = 'playing';

    // Check for loss condition
    if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0 && !refs.isGameStartedRef.current) {
        // Ball lost before launch - potential edge case, treat as loss or allow reset?
        // Currently treating as loss if balls existed previously.
        nextState = 'lost';
    } else if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0 && refs.isGameStartedRef.current) {
         // All balls lost after game started
         nextState = 'lost';
    }

    // Check for win/shop condition only if not already lost
    if (nextState === 'playing') {
        let remainingBricks = 0;
        for (let c = 0; c < columns; c++) {
            if (!refs.bricksRef.current[c]) continue;
            for (let r = 0; r < rows; r++) {
                if (refs.bricksRef.current[c]?.[r]?.status === 1) {
                    remainingBricks++;
                }
            }
        }
        
        // Win/Shop condition met
        if (remainingBricks === 0) { 
             const currentMode = refs.gameModeRef.current;
             if (currentMode === 'main') {
                 nextState = 'shop'; 
                 // Award bonus gold instead of fixed amount
                 const bonusEarned = Math.max(0, refs.bonusGoldRef.current); // Ensure non-negative
                 refs.goldRef.current += bonusEarned; 
                 console.log(`Level complete! Awarded ${bonusEarned} bonus gold. Total gold: ${refs.goldRef.current}`);
             } else {
                 nextState = 'won'; // Regular win for test level
             }
        }
    }

    // Handle Game End state update if necessary
    if (nextState !== 'playing') {
        // Clear bonus timers when game ends (win/loss/shop)
        clearBonusTimers(refs);
        
        if (refs.gameOverStateRef.current !== nextState) {
             callbacks.setGameOverState(nextState);
        }
        refs.gameIsRunningRef.current = false;
    }

    return nextState;
};

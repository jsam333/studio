// src/gameUpdates/gameStatus.ts
import { GameStateRefs, GameLoopCallbacks, GameState } from '../interfaces';

// Define minimum bonus gold here or import from constants if moved
const MINIMUM_BONUS_GOLD = 5; 
const FINAL_LEVEL = 20; // Define the final level number

// Helper to clear bonus timers (to avoid duplication)
const clearBonusTimers = (refs: GameStateRefs) => {
    if (refs.bonusGoldTimerRef?.current) clearTimeout(refs.bonusGoldTimerRef.current);
    if (refs.bonusGoldDecrementIntervalRef?.current) clearInterval(refs.bonusGoldDecrementIntervalRef.current);
    // Ensure refs exist before accessing .current
    if (refs.bonusGoldTimerRef) refs.bonusGoldTimerRef.current = null;
    if (refs.bonusGoldDecrementIntervalRef) refs.bonusGoldDecrementIntervalRef.current = null;
    if (refs.bonusCountdownStartedRef) {
      refs.bonusCountdownStartedRef.current = false;
    }   
};

export const checkGameStatus = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    previousBallCount: number,
    // columns and rows parameters are no longer needed for the win condition check
    // columns: number, 
    // rows: number     
): GameState => {
    if (refs.gameOverStateRef.current !== 'playing') {
        return refs.gameOverStateRef.current;
    }

    let nextState: GameState = 'playing';

    // Check for loss condition
    if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0 && refs.isGameStartedRef.current) {
         nextState = 'lost';
    }

    // Check for win/shop condition only if not already lost
    if (nextState === 'playing') {
        // --- MODIFIED: Check win condition using score ---
        // Check if the current score meets or exceeds the target score for the level
        if (refs.scoreRef.current >= refs.targetScoreRef.current && refs.targetScoreRef.current > 0) { // Ensure target score is set
             const currentMode = refs.gameModeRef.current;
             if (currentMode === 'main') {
                 // Check if it's the final level
                 if (refs.currentLevelRef.current === FINAL_LEVEL) {
                     nextState = 'won'; // Final win state
                     console.log(`Final Level (${FINAL_LEVEL}) complete! You Win! Final Score: ${refs.scoreRef.current}`);
                 } else {
                     nextState = 'shop'; // Go to shop for intermediate levels
                     const bonusEarned = Math.max(MINIMUM_BONUS_GOLD, refs.bonusGoldRef.current);
                     refs.goldRef.current += bonusEarned; 
                     console.log(`Level ${refs.currentLevelRef.current} complete! Score: ${refs.scoreRef.current}. Awarded ${bonusEarned} bonus gold. Total gold: ${refs.goldRef.current}`);
                 }
             } else {
                 nextState = 'won'; // Regular win for test level
                 console.log(`Test Level complete! Final Score: ${refs.scoreRef.current}`);
             }
        }
        // --- END MODIFICATION ---
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

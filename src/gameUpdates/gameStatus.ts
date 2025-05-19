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
): GameState => {
    // Check if already in a terminal state or reset state
    if (refs.gameOverStateRef.current !== 'playing') {
        return refs.gameOverStateRef.current;
    }

    let nextState: GameState = 'playing';

    // Check for loss condition (all balls gone)
    if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0 && refs.isGameStartedRef.current) {
        if (refs.gameModeRef.current === 'test') { // Check if in test mode
            nextState = 'lost'; // Directly go to 'lost' state for test mode
            console.log("Test mode: All balls lost.");
        } else { // Main game mode logic
            if (refs.livesRef.current > 1) {
                nextState = 'level_reset';
            } else {
                nextState = 'lost';
                console.log("Game Over! Ran out of lives.");
            }
        }
    }

    // Check for win/shop condition only if not already lost or resetting
    if (nextState === 'playing') {
        // Check if the current score meets or exceeds the target score for the level
        // AND if level completion hasn't been processed yet for this attempt
        if (refs.scoreRef.current >= refs.targetScoreRef.current &&
            refs.targetScoreRef.current > 0 &&
            !refs.levelCompletionProcessedRef.current) { // *** NEW CHECK ADDED HERE ***

             // Mark level completion as processed to prevent duplicate execution
             refs.levelCompletionProcessedRef.current = true; // *** SET FLAG IMMEDIATELY ***

             const currentMode = refs.gameModeRef.current;
             if (currentMode === 'main') {
                 if (refs.currentLevelRef.current === FINAL_LEVEL) {
                     nextState = 'won';
                     console.log(`Final Level (${FINAL_LEVEL}) complete! You Win! Final Score: ${refs.scoreRef.current}`);
                 } else {
                     nextState = 'shop';
                     const bonusEarned = Math.max(MINIMUM_BONUS_GOLD, refs.bonusGoldRef.current);
                     refs.goldRef.current += bonusEarned;
                     console.log(`Level ${refs.currentLevelRef.current} complete! Score: ${refs.scoreRef.current}. Awarded ${bonusEarned} bonus gold. Total gold: ${refs.goldRef.current}`);
                 }
             } else {
                 nextState = 'won';
                 console.log(`Test Level complete! Final Score: ${refs.scoreRef.current}`);
             }
        }
    }

    if (nextState !== 'playing') {
        clearBonusTimers(refs);
        if (refs.gameOverStateRef.current !== nextState) {
             callbacks.setGameOverState(nextState);
        }
        if (nextState === 'won' || nextState === 'lost' || nextState === 'shop' || nextState === 'menu') {
            refs.gameIsRunningRef.current = false;
        }
    }
    return nextState;
};

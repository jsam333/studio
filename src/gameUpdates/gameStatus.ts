// src/gameUpdates/gameStatus.ts
import { GameStateRefs, GameLoopCallbacks, GameState } from '../interfaces'; // Import GameState

// This function now returns the determined game state, including 'shop'
export const checkGameStatus = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    previousBallCount: number,
    columns: number, 
    rows: number     
): GameState => { // Return type is now GameState
    // Check current state first
    if (refs.gameOverStateRef.current !== 'playing') {
        return refs.gameOverStateRef.current; // Return existing end state
    }

    let nextState: GameState = 'playing';

    // Check for loss condition
    if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0 && !refs.isGameStartedRef.current) {
        // Don't lose immediately if ball hasn't been launched yet
    } else if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0) {
         nextState = 'lost';
    }

    // Check for win/shop condition
    if (nextState === 'playing') { // Only check win if not already lost
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
                 nextState = 'shop'; // Go to shop after winning a level in main mode
                 refs.goldRef.current += 20; // AWARD GOLD
             } else {
                 nextState = 'won'; // Regular win for test level
             }
        }
    }

    // Handle Game End state update if necessary
    if (nextState !== 'playing') {
        // Update state only if it has changed
        if (refs.gameOverStateRef.current !== nextState) {
             callbacks.setGameOverState(nextState);
        }
        refs.gameIsRunningRef.current = false; // Stop game logic updates
    }

    return nextState;
};

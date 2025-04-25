// src/gameUpdates/gameStatus.ts
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';

// This function now returns the determined game state
// And accepts grid dimensions
export const checkGameStatus = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    previousBallCount: number,
    columns: number, // Add grid dimensions
    rows: number     // Add grid dimensions
): 'playing' | 'won' | 'lost' => {
    let currentGameOverState: 'playing' | 'won' | 'lost' = 'playing';

    // Check for loss condition
    if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0) {
        currentGameOverState = 'lost';
    }

    // Check for win condition using provided dimensions
    let remainingBricks = 0;
    for (let c = 0; c < columns; c++) {
        if (!refs.bricksRef.current[c]) continue;
        for (let r = 0; r < rows; r++) {
            if (refs.bricksRef.current[c]?.[r]?.status === 1) {
                remainingBricks++;
            }
        }
    }
    
    if (remainingBricks === 0 && refs.scoreRef.current > 0 && currentGameOverState === 'playing') {
        currentGameOverState = 'won';
    }

    // Handle Game End state update if necessary
    if (currentGameOverState !== 'playing') {
        if (refs.gameOverStateRef.current !== currentGameOverState) {
             callbacks.setGameOverState(currentGameOverState);
        }
        refs.gameIsRunningRef.current = false; 
    }

    return currentGameOverState;
};

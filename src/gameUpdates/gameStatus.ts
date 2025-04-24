// src/gameUpdates/gameStatus.ts
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';

// This function now returns the determined game state
export const checkGameStatus = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    previousBallCount: number
): 'playing' | 'won' | 'lost' => {
    let currentGameOverState: 'playing' | 'won' | 'lost' = 'playing';

    // Check for loss condition
    if (refs.ballsRef.current.length === 0 && refs.stuckBallsRef.current.length === 0 && previousBallCount > 0) {
        currentGameOverState = 'lost';
    }

    // Check for win condition
    const remainingBricks = refs.bricksRef.current.flat().filter(brick => brick?.status === 1).length;
    if (remainingBricks === 0 && refs.scoreRef.current > 0 && currentGameOverState === 'playing') {
        currentGameOverState = 'won';
    }

    // Handle Game End state update if necessary
    if (currentGameOverState !== 'playing') {
        // Only update state if it has changed
        if (refs.gameOverStateRef.current !== currentGameOverState) {
             callbacks.setGameOverState(currentGameOverState);
        }
        refs.gameIsRunningRef.current = false; // Stop game logic updates
    }

    // Return the determined state
    return currentGameOverState;
};

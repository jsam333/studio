'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT 
} from '../constants';
import { GameLoopCallbacks } from '../interfaces';
import { drawEndMessage } from '../drawFunctions'; // Assuming drawEndMessage is standalone or refactored
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { PowerUpSidebar } from '../components/PowerUpSidebar';
import { useGameLogic, GameStateRefs } from '../hooks/useGameLogic'; // Import the hook

const SIDEBAR_WIDTH_PX = 192;
const TOTAL_SIDEBAR_SPACE = SIDEBAR_WIDTH_PX;

// --- Maximum allowed deltaTime factor ---
// This prevents excessively large updates if the frame rate drops significantly,
// mitigating potential issues like tunneling (objects passing through each other).
// A value of 3 means the physics will simulate at most 3x the normal movement per frame,
// even if the actual time elapsed was longer.
const MAX_DELTA_TIME_FACTOR = 3;


export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // --- Use the custom hook for game logic --- 
    const {
        // score, // REMOVED - No longer returned or needed from hook
        gameOverState,
        enabledPowerUps,
        setGameOverState,
        updateScoreCallback,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        schedulePaddleShrink,
        scheduleFieldShrink,
        gameStateRefs, // Contains all the refs needed for game updates and setup
    } = useGameLogic();

    // --- Canvas size state (remains in component as it relates to rendering layout) --- 
    const [canvasWidth, setCanvasWidth] = useState(BOARD_WIDTH);
    const [canvasHeight, setCanvasHeight] = useState(BOARD_HEIGHT);

    const targetFps = 60; // Target FPS
    const targetFrameTime = 1000 / targetFps; // Ideal time between frames in ms

    // --- Draw End Message (remains or moves to drawFunctions) --- 
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: 'won' | 'lost', finalScore: number) => {
        // This function implementation was provided earlier and can stay here or be moved
        const message = state === 'won' ? `You Win! Score: ${finalScore}` : 'Game Over!';
        const subMessage = 'Click to Restart';
        const logicalCenterX = BOARD_WIDTH / 2;
        const logicalCenterY = BOARD_HEIGHT / 2;
        context.save();
        context.textAlign = 'center';
        context.fillStyle = 'white';
        context.font = '30px Arial';
        context.fillText(message, logicalCenterX, logicalCenterY - 15);
        context.font = '20px Arial';
        context.fillText(subMessage, logicalCenterX, logicalCenterY + 15);
        context.restore();
    }, []);

    // --- Game Loop --- 
    // Ref for the gameLoop function itself to ensure the latest version is always called
    const gameLoopRef = useRef<(timestamp: number) => void>();

    useEffect(() => {
        // Define gameLoop inside useEffect so it captures the latest state/refs from the hook
        const gameLoop = (timestamp: number) => {
            // Use the ref from useGameLogic directly
             if (!gameStateRefs.gameIsRunningRef.current) return; 

             if (!lastTimeRef.current) lastTimeRef.current = timestamp;
             const elapsed = timestamp - lastTimeRef.current;
             
             // Don't skip frames, update lastTimeRef unconditionally
             lastTimeRef.current = timestamp;

             // Calculate raw deltaTime factor
             const rawDeltaTime = elapsed / targetFrameTime;
             // Cap the deltaTime to prevent excessive updates on frame drops
             const deltaTime = Math.min(rawDeltaTime, MAX_DELTA_TIME_FACTOR);

             const canvas = canvasRef.current;
             const ctx = canvas?.getContext('2d');
                 
             // Pass the up-to-date refs, callbacks, and the (potentially capped) deltaTime
             if (ctx && gameLoopCallbacksRef.current) {
                 // Pass the refs object from useGameLogic and the capped deltaTime factor
                 gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, deltaTime); // Pass capped deltaTime
             }


            // Continue the loop if the game is still running
            if (gameStateRefs.gameIsRunningRef.current) { 
                animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); // Use ref to the loop function
            }
        };
        // Store the latest gameLoop function in the ref
        gameLoopRef.current = gameLoop; 
    }); // No dependency array needed here if it relies only on refs and callbacks stored in refs

    // --- Game Loop Callbacks --- 
     // Ref for callbacks to avoid redefining gameLoop unnecessarily
     const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();
     useEffect(() => {
         // Update the callbacks ref with the latest functions from the hook
         gameLoopCallbacksRef.current = {
             updateScoreCallback,
             setGameOverState, // From useGameLogic
             schedulePaddleShrink, // From useGameLogic
             scheduleFieldShrink, // From useGameLogic
             drawEndMessage: drawEndMessageCallback, // Use the local/imported draw function
         };
     }, [updateScoreCallback, setGameOverState, schedulePaddleShrink, scheduleFieldShrink, drawEndMessageCallback]);

    // --- Setup Canvas and Event Listeners --- 
    useEffect(() => {
        // Note: handleResetGame and launchStuckBalls are now stable references from useGameLogic

        const cleanupCanvas = setupGameCanvas({
            gameContainerRef, 
            canvasRef, 
            gameLoop: gameLoopRef.current!, // Pass the function from ref
            scaleRef, 
            animationFrameIdRef, 
            handleResetGame, // From useGameLogic
            gameStateRefs, // Pass the refs object from useGameLogic
            gameLoopCallbacks: gameLoopCallbacksRef.current!, // Pass callbacks from ref
            lastTimeRef: lastTimeRef,
            totalSidebarSpace: TOTAL_SIDEBAR_SPACE,
            sidebarWidthPx: SIDEBAR_WIDTH_PX,
            launchStuckBalls: () => launchStuckBalls(true), // Initial launch on click
        });

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault(); 
            // Use refs from useGameLogic
            if (gameStateRefs.gameIsRunningRef.current && gameStateRefs.isGameStartedRef.current) { 
                launchStuckBalls(false); // Launch sticky balls straight up
            }
        };

        const containerElement = gameContainerRef.current;
        if (containerElement) {
            containerElement.addEventListener('contextmenu', handleContextMenu);
        }

        // Start animation loop if game state is 'playing'
        if (gameOverState === 'playing' && !animationFrameIdRef.current) {
           lastTimeRef.current = performance.now();
           // Ensure gameLoopRef.current is defined before requesting frame
           if (gameLoopRef.current) {
             animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current); 
           }
        }

        // Cleanup field shrink timer (moved responsibility partially to useGameLogic, but cleanup needs coordination)
        const fieldTimerCleanup = () => {
             const timerRef = gameStateRefs.collectionFieldShrinkTimerRef?.current; 
             if (timerRef) {
                clearInterval(timerRef);
                // Optionally set the ref in useGameLogic to null here if needed, though hook manages it
                // gameStateRefs.collectionFieldShrinkTimerRef.current = null;
             }
        };

        return () => {
            cleanupCanvas(); 
            fieldTimerCleanup(); 
            if (containerElement) {
                containerElement.removeEventListener('contextmenu', handleContextMenu); 
            }
            // Cancel animation frame on unmount or state change
            if (animationFrameIdRef.current) {
                 cancelAnimationFrame(animationFrameIdRef.current);
                 animationFrameIdRef.current = null;
            }
            // Cleanup widen paddle timer on unmount
            const widenTimerRef = gameStateRefs.widenTimeoutRef?.current;
            if (widenTimerRef) {
                clearTimeout(widenTimerRef);
                // Optionally set the ref in useGameLogic to null here if needed
                // gameStateRefs.widenTimeoutRef.current = null;
            }
        };
    // Dependencies include states and callbacks that influence the setup or require cleanup coordination.
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs]); // Added gameStateRefs

    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
            <div 
                ref={gameContainerRef} 
                className="flex flex-row items-start border border-white" 
                style={{ width: canvasWidth + TOTAL_SIDEBAR_SPACE, height: canvasHeight }} // Example dynamic sizing
            >
                <canvas 
                    ref={canvasRef} 
                    width={canvasWidth} // Use state for canvas dimensions
                    height={canvasHeight} 
                    className="block flex-shrink-0" 
                    // Style canvas directly if needed, e.g., style={{ border: '1px solid white' }} 
                />
                <PowerUpSidebar 
                    enabledPowerUps={enabledPowerUps} // From useGameLogic
                    onTogglePowerUp={handlePowerUpToggle} // From useGameLogic
                />
            </div>
        </div>
    );
}

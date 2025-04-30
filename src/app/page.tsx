'use client'

import React, { useRef, useEffect, useCallback } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT,
} from '../constants';
// MODIFIED: Import GameLoopCallbacks type
import { GameLoopCallbacks, GameState } from '../interfaces';
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { useGameLogic } from '../hooks/useGameLogic';
import { useIsMobile } from '../hooks/use-mobile';
import { GameMenu } from '../components/GameMenu';
import { ShopScreen } from '../components/ShopScreen';
import { GameView } from '../components/GameView';

const SIDEBAR_WIDTH_PX = 192;
const MAX_DELTA_TIME_FACTOR = 3; // Retained for potential future use or reference

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const isMobile = useIsMobile();

    // --- MODIFIED: Destructure gameLoopCallbacksPartial and necessary state/refs ---
    const {
        gameOverState,
        enabledPowerUps,
        showSidebar,
        currentLevel,
        lives, // Get lives for potential display or logic if needed here
        score, // Get score for potential display or logic if needed here
        gold, // Get gold for potential display or logic if needed here
        setGameOverState, // Keep this separate as it's UI state setter
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        startGame,
        startNextLevel,
        addSpawnablePowerUp,
        gameStateRefs, // Contains all refs
        gameLoopCallbacksPartial, // Contains most callbacks
    } = useGameLogic();
    // --- END MODIFICATION ---

    // Draw end message callback (remains the same)
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: GameState, finalScore: number) => {
        // Allow 'shop' state through, as GameView handles rendering for it
        // Only draw end message for 'won' or 'lost'
        if (state !== 'won' && state !== 'lost') return;

        const message = state === 'won' ? `You Win! Score: ${finalScore}` : 'Game Over!';
        const subMessage = 'Click to Restart';
        const logicalCenterX = BOARD_WIDTH / 2;
        const logicalCenterY = BOARD_HEIGHT / 2;
        context.save();
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        context.textAlign = 'center';
        context.fillStyle = 'white';
        context.font = '30px Arial';
        context.fillText(message, logicalCenterX, logicalCenterY - 15);
        context.font = '20px Arial';
        context.fillText(subMessage, logicalCenterX, logicalCenterY + 15);
        context.restore();
    }, []);

    const gameLoopRef = useRef<(timestamp: number) => void>();

    // Main game loop effect (logic remains similar)
    useEffect(() => {
        const gameLoop = (timestamp: number) => {
            const currentGameState = gameStateRefs.gameOverStateRef.current;

            // Check if we should stop the loop (terminal states)
            if (currentGameState === 'menu' || currentGameState === 'shop') {
                 lastTimeRef.current = 0; // Reset time for next play session
                 if (animationFrameIdRef.current) {
                     cancelAnimationFrame(animationFrameIdRef.current);
                     animationFrameIdRef.current = null;
                 }
                 return;
             }

            // Draw End Message only for 'won' or 'lost' states and stop the loop
            if (currentGameState === 'won' || currentGameState === 'lost') {
                 lastTimeRef.current = 0;
                 const canvas = canvasRef.current;
                 const ctx = canvas?.getContext('2d');
                 if (ctx && gameLoopCallbacksRef.current) {
                     // Ensure drawEndMessage is called only once per state transition if needed,
                     // but calling it here ensures it's drawn if the state persists.
                     gameLoopCallbacksRef.current.drawEndMessage(ctx, currentGameState, gameStateRefs.scoreRef.current);
                 }
                 if (animationFrameIdRef.current) {
                     cancelAnimationFrame(animationFrameIdRef.current);
                     animationFrameIdRef.current = null;
                 }
                 return;
             }

            // Proceed with game update for 'playing' and 'level_reset' states
            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const elapsed = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            const clampedElapsed = Math.min(elapsed, 100); // Limit elapsed time

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && gameLoopCallbacksRef.current) {
                gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, clampedElapsed);
            }

            // Request next frame only if the state is still playing or resetting
            if (gameStateRefs.gameOverStateRef.current === 'playing' || gameStateRefs.gameOverStateRef.current === 'level_reset') {
               animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); 
            } else {
                // If state changed to something else (e.g., won/lost/shop) during the update, ensure loop stops
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                    animationFrameIdRef.current = null;
                }
            }
        };
        gameLoopRef.current = gameLoop;
        // Re-run effect if gameStateRefs changes (shouldn't often) or draw callback changes
    }, [gameStateRefs, drawEndMessageCallback]);

    // Game loop callbacks ref
    const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();

    // --- MODIFIED: Create the full callbacks object --- 
    useEffect(() => {
        // Combine the partial object from the hook with the locally defined draw function
        gameLoopCallbacksRef.current = {
            ...gameLoopCallbacksPartial, // Spread the callbacks from the hook
            drawEndMessage: drawEndMessageCallback, // Add the draw function
        };
        // Update if the partial object or the draw function changes
    }, [gameLoopCallbacksPartial, drawEndMessageCallback]);
    // --- END MODIFICATION ---

    // Effect to setup canvas, handle game state transitions, and add cheat code
    useEffect(() => {
        // Cheat code listener
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing' && gameLoopCallbacksRef.current?.updateScoreCallback) {
                console.log("Cheat code activated: +1,000,000 points");
                // Access updateScoreCallback via the ref now
                gameLoopCallbacksRef.current.updateScoreCallback(1000000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        if (gameOverState === 'menu' || gameOverState === 'shop') {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
             return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }

        if (!gameContainerRef.current || !canvasRef.current) {
             return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }

        const sidebarWidthForSetup = showSidebar ? SIDEBAR_WIDTH_PX : 0;
        const totalSidebarSpaceForSetup = sidebarWidthForSetup;

        // Ensure gameLoopCallbacksRef.current is defined before passing
        if (!gameLoopCallbacksRef.current) {
             return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }

        const cleanupCanvas = setupGameCanvas({
            gameContainerRef,
            canvasRef,
            gameLoop: gameLoopRef.current!,
            scaleRef,
            animationFrameIdRef,
            handleResetGame,
            gameStateRefs,
            gameLoopCallbacks: gameLoopCallbacksRef.current, // Pass the ref's current value
            lastTimeRef: lastTimeRef,
            totalSidebarSpace: totalSidebarSpaceForSetup,
            sidebarWidthPx: sidebarWidthForSetup,
            launchStuckBalls: launchStuckBalls,
            isMobile: isMobile,
        });

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            if (gameStateRefs.gameOverStateRef.current === 'playing' && gameStateRefs.isGameStartedRef.current) {
                launchStuckBalls(false); // Right-click to launch
            }
        };

        const containerElement = gameContainerRef.current;
        if (containerElement) {
            containerElement.addEventListener('contextmenu', handleContextMenu);
        }

        // Start the loop if state is playing and it's not already running
        if (gameOverState === 'playing' && !animationFrameIdRef.current) {
           lastTimeRef.current = performance.now();
           if (gameLoopRef.current) {
             animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current);
           }
        }

        const fieldTimerCleanup = () => {
             const timerRef = gameStateRefs.collectionFieldShrinkTimerRef?.current;
             if (timerRef) {
                clearInterval(timerRef);
             }
        };

        return () => {
            cleanupCanvas();
            fieldTimerCleanup();
            if (containerElement) {
                containerElement.removeEventListener('contextmenu', handleContextMenu);
            }
            if (animationFrameIdRef.current) {
                 cancelAnimationFrame(animationFrameIdRef.current);
                 animationFrameIdRef.current = null;
            }
             window.removeEventListener('keydown', handleKeyDown);
        };
        // --- MODIFIED: Update dependencies --- 
        // Add gameLoopCallbacksPartial to dependencies, remove individual callbacks
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs, showSidebar, isMobile, drawEndMessageCallback, gameLoopCallbacksPartial]); 
    // --- END MODIFICATION ---

    // --- Render Logic ---
    if (gameOverState === 'menu') {
        return <GameMenu onStartGame={startGame} />;
    }

    if (gameOverState === 'shop') {
        return (
            <ShopScreen
                gameStateRefs={gameStateRefs}
                currentLevel={currentLevel}
                addSpawnablePowerUp={addSpawnablePowerUp}
                startNextLevel={startNextLevel}
                handleResetGame={handleResetGame}
            />
        );
    }

    // Render Game View (Playing, Won, Lost)
    return (
        <GameView
            gameContainerRef={gameContainerRef}
            canvasRef={canvasRef}
            gameOverState={gameOverState}
            showSidebar={showSidebar}
            enabledPowerUps={enabledPowerUps}
            onTogglePowerUp={handlePowerUpToggle}
            handleResetGame={handleResetGame} 
        />
    );
}

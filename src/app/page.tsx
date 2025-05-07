// src/app/page.tsx
'use client'

import React, { useRef, useEffect, useCallback } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT,
} from '../constants';
// MODIFIED: Import GameLoopCallbacks type
import { GameLoopCallbacks, GameState, GameStateRefs } from '../interfaces'; // Added GameStateRefs
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { useGameLogic } from '../hooks/useGameLogic';
import { useIsMobile } from '../hooks/use-mobile';
import { GameMenu } from '../components/GameMenu';
// import { ShopScreen } from '../components/ShopScreen'; // ShopScreen is now part of GameView
import { GameView } from '../components/GameView';
import { PowerUpType } from '../interfaces'; // For ShopScreen props

const SIDEBAR_WIDTH_PX = 192;
const MAX_DELTA_TIME_FACTOR = 3; // Retained for potential future use or reference

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const isMobile = useIsMobile();

    // --- MODIFIED: Destructure gameLoopCallbacks (not partial) ---
    const {
        gameOverState,
        enabledPowerUps,
        showSidebar,
        currentLevel,
        lives,
        score,
        gold,
        setGameOverState,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        startGame,
        startNextLevel,
        addSpawnablePowerUp,
        gameStateRefs,
        gameLoopCallbacks, // <<< Destructure the correct object name
    } = useGameLogic();
    // --- END MODIFICATION ---

    // Draw end message callback (remains the same)
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: GameState, finalScore: number) => {
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

            if (currentGameState === 'menu' || currentGameState === 'shop') {
                 lastTimeRef.current = 0;
                 if (animationFrameIdRef.current) {
                     cancelAnimationFrame(animationFrameIdRef.current);
                     animationFrameIdRef.current = null;
                 }
                 return;
             }

            if (currentGameState === 'won' || currentGameState === 'lost') {
                 lastTimeRef.current = 0;
                 const canvas = canvasRef.current;
                 const ctx = canvas?.getContext('2d');
                 if (ctx && gameLoopCallbacksRef.current) {
                     gameLoopCallbacksRef.current.drawEndMessage(ctx, currentGameState, gameStateRefs.scoreRef.current);
                 }
                 if (animationFrameIdRef.current) {
                     cancelAnimationFrame(animationFrameIdRef.current);
                     animationFrameIdRef.current = null;
                 }
                 return;
             }

            if (!lastTimeRef.current) lastTimeRef.current = timestamp;
            const elapsed = timestamp - lastTimeRef.current;
            lastTimeRef.current = timestamp;

            const clampedElapsed = Math.min(elapsed, 100);

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            // *** Ensure gameLoopCallbacksRef.current is populated before calling gameUpdate ***
            if (ctx && gameLoopCallbacksRef.current) {
                gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, clampedElapsed);
            }

            if (gameStateRefs.gameOverStateRef.current === 'playing' || gameStateRefs.gameOverStateRef.current === 'level_reset') {
               // Check if gameLoopRef.current is defined before requesting frame
               if(gameLoopRef.current) {
                   animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current);
               }
            } else {
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                    animationFrameIdRef.current = null;
                }
            }
        };
        gameLoopRef.current = gameLoop;
    }, [gameStateRefs]); // Removed drawEndMessageCallback from dependencies as it's stable via useCallback

    // Game loop callbacks ref
    const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();

    // --- MODIFIED: Create the full callbacks object using the correct variable ---
    useEffect(() => {
        // Combine the object from the hook with the locally defined draw function
        gameLoopCallbacksRef.current = {
            ...gameLoopCallbacks, // <<< Use the correct variable name here
            drawEndMessage: drawEndMessageCallback,
        };
    // Update if the object from the hook or the draw function changes
    }, [gameLoopCallbacks, drawEndMessageCallback]); // <<< Update dependency array
    // --- END MODIFICATION ---

    // Effect to setup canvas, handle game state transitions, and add cheat code
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing' && gameLoopCallbacksRef.current?.updateScoreCallback) {
                console.log("Cheat code activated: +1,000,000 points");
                gameLoopCallbacksRef.current.updateScoreCallback(1000000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        // If game state is menu or shop, don't setup game canvas, just clear it
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
             console.warn("gameLoopCallbacksRef not ready for setupGameCanvas");
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
        // Use gameLoopCallbacks instead of gameLoopCallbacksPartial
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs, showSidebar, isMobile, drawEndMessageCallback, gameLoopCallbacks]);
    // --- END MODIFICATION ---

    // --- Render Logic ---
    if (gameOverState === 'menu') {
        return <GameMenu onStartGame={startGame} />;
    }

    // Shop is now rendered inside GameView
    // if (gameOverState === 'shop') {
    //     return (
    //         <ShopScreen
    //             gameStateRefs={gameStateRefs}
    //             currentLevel={currentLevel}
    //             addSpawnablePowerUp={addSpawnablePowerUp}
    //             startNextLevel={startNextLevel}
    //             handleResetGame={handleResetGame}
    //         />
    //     );
    // }

    // Render Game View (Playing, Won, Lost, Shop)
    return (
        <GameView
            gameContainerRef={gameContainerRef}
            canvasRef={canvasRef}
            gameOverState={gameOverState}
            showSidebar={showSidebar}
            enabledPowerUps={enabledPowerUps}
            onTogglePowerUp={handlePowerUpToggle}
            handleResetGame={handleResetGame}
            // Props for ShopScreen
            gameStateRefs={gameStateRefs} // Pass gameStateRefs
            currentLevel={currentLevel}
            addSpawnablePowerUp={addSpawnablePowerUp}
            startNextLevel={startNextLevel}
            // Removed gold and lives as they are in gameStateRefs
        />
    );
}

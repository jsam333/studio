'use client'

import React, { useRef, useEffect, useCallback } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT,
} from '../constants';
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

    const {
        gameOverState,
        enabledPowerUps,
        showSidebar,
        currentLevel,
        setGameOverState,
        updateScoreCallback,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        schedulePaddleShrink,
        scheduleFieldShrink,
        startGame,
        startNextLevel,
        addSpawnablePowerUp,
        executePaddleShrink,
        gameStateRefs,
    } = useGameLogic();

    // Draw end message callback
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: 'won' | 'lost' | 'shop', finalScore: number) => {
        if (state === 'shop') return; // Don't draw if transitioning to shop
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

    // Main game loop effect
    useEffect(() => {
        const gameLoop = (timestamp: number) => {
            const currentGameState = gameStateRefs.gameOverStateRef.current;
            if (currentGameState !== 'playing') {
                lastTimeRef.current = 0;
                if (currentGameState === 'won' || currentGameState === 'lost') {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    if (ctx && gameLoopCallbacksRef.current) {
                        gameLoopCallbacksRef.current.drawEndMessage(ctx, currentGameState, gameStateRefs.scoreRef.current);
                    }
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
            if (ctx && gameLoopCallbacksRef.current) {
                gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, clampedElapsed);
            }
            if (gameStateRefs.gameOverStateRef.current === 'playing') {
               animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); 
            }
        };
        gameLoopRef.current = gameLoop;
    }, [gameStateRefs, drawEndMessageCallback]); // Added drawEndMessageCallback as dependency

    // Game loop callbacks ref
    const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();
    useEffect(() => {
        gameLoopCallbacksRef.current = {
            updateScoreCallback,
            setGameOverState,
            schedulePaddleShrink,
            executePaddleShrink,
            scheduleFieldShrink,
            drawEndMessage: drawEndMessageCallback,
        };
    }, [updateScoreCallback, setGameOverState, schedulePaddleShrink, executePaddleShrink, scheduleFieldShrink, drawEndMessageCallback]);

    // Effect to setup canvas, handle game state transitions, and add cheat code
    useEffect(() => {
        // Cheat code listener
        const handleKeyDown = (event: KeyboardEvent) => {
            // Use gameStateRefs.gameOverStateRef.current to check the *current* state
            if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing') {
                console.log("Cheat code activated: +1,000,000 points");
                updateScoreCallback(1000000);
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
                // Clear canvas only if it exists, might not be mounted in menu/shop
                 ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            // Cleanup listener when in menu/shop
             return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }

        if (!gameContainerRef.current || !canvasRef.current) {
            // Cleanup listener if refs aren't ready
             return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }

        const sidebarWidthForSetup = showSidebar ? SIDEBAR_WIDTH_PX : 0;
        const totalSidebarSpaceForSetup = sidebarWidthForSetup;

        const cleanupCanvas = setupGameCanvas({
            gameContainerRef,
            canvasRef,
            gameLoop: gameLoopRef.current!,
            scaleRef,
            animationFrameIdRef,
            handleResetGame, // Pass reset handler for canvas click on game over
            gameStateRefs,
            gameLoopCallbacks: gameLoopCallbacksRef.current!,
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

        // Combined cleanup function
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
             window.removeEventListener('keydown', handleKeyDown); // Ensure listener is removed
        };
    // Ensure all dependencies used in the effect, including the cheat code logic, are listed.
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs, showSidebar, isMobile, drawEndMessageCallback, scheduleFieldShrink, schedulePaddleShrink, executePaddleShrink, setGameOverState, updateScoreCallback]);

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
            handleResetGame={handleResetGame} // Pass reset for click handling within GameView
        />
    );
}

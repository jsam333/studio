// src/app/page.tsx
'use client'

import React, { useRef, useEffect, useCallback } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT,
} from '../constants';
import { GameLoopCallbacks, GameState, GameStateRefs, PowerUpType } from '../interfaces';
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { useGameLogic } from '../hooks/useGameLogic';
import { useIsMobile } from '../hooks/use-mobile';
import { GameMenu } from '../components/GameMenu';
import { GameView } from '../components/GameView';

const SIDEBAR_WIDTH_PX = 192;

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
        currentLevel, // Assuming this is restored/available from useGameLogic
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        startGame,
        startNextLevel, // Assuming this is restored/available from useGameLogic
        addSpawnablePowerUp, // Assuming this is restored/available from useGameLogic
        gameStateRefs,
        gameLoopCallbacks,
    } = useGameLogic();

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

    useEffect(() => {
        const gameLoop = (timestamp: number) => {
            const currentGameState = gameStateRefs.gameOverStateRef.current;
            if (currentGameState === 'menu' || currentGameState === 'shop') { // 'shop' state will pause the game loop
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
            if (ctx && gameLoopCallbacksRef.current) {
                gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, clampedElapsed);
            }
            if (gameStateRefs.gameOverStateRef.current === 'playing' || gameStateRefs.gameOverStateRef.current === 'level_reset') {
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
    }, [gameStateRefs]);

    const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();

    useEffect(() => {
        gameLoopCallbacksRef.current = {
            ...gameLoopCallbacks,
            drawEndMessage: drawEndMessageCallback,
        };
    }, [gameLoopCallbacks, drawEndMessageCallback]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing' && gameLoopCallbacksRef.current?.updateScoreCallback) {
                console.log("Cheat code activated: +1,000,000 points");
                gameLoopCallbacksRef.current.updateScoreCallback(1000000);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        if (gameOverState === 'menu' || gameOverState === 'shop') { // 'shop' state will prevent canvas setup/resetup, relying on GameView to show overlay
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
                animationFrameIdRef.current = null;
            }
            // Don't clear canvas if it's shop state, to keep the last frame visible under the overlay
            if (gameOverState === 'menu') {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
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
            gameLoopCallbacks: gameLoopCallbacksRef.current,
            lastTimeRef: lastTimeRef,
            totalSidebarSpace: totalSidebarSpaceForSetup,
            sidebarWidthPx: sidebarWidthForSetup,
            launchStuckBalls: launchStuckBalls,
            isMobile: isMobile,
        });

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            if (gameStateRefs.gameOverStateRef.current === 'playing' && gameStateRefs.isGameStartedRef.current) {
                launchStuckBalls(false);
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
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs, showSidebar, isMobile, drawEndMessageCallback, gameLoopCallbacks]);

    if (gameOverState === 'menu') {
        return <GameMenu onStartGame={startGame} />;
    }

    return (
        <GameView
            gameContainerRef={gameContainerRef}
            canvasRef={canvasRef}
            gameOverState={gameOverState}
            showSidebar={showSidebar}
            enabledPowerUps={enabledPowerUps}
            onTogglePowerUp={handlePowerUpToggle}
            handleResetGame={handleResetGame}
            // Props for ShopScreen overlay
            gameStateRefs={gameStateRefs}
            currentLevel={currentLevel} // Assuming currentLevel is available from useGameLogic
            addSpawnablePowerUp={addSpawnablePowerUp} // Assuming addSpawnablePowerUp is available
            startNextLevel={startNextLevel} // Assuming startNextLevel is available
            // Pass scaleRef if ShopScreen overlay needs to react to scaling, or for positioning
            // For now, let's assume ShopScreen is styled to fit, but gameContainerRef itself will be scaled.
            scaleRef={scaleRef} 
            gameWidth={BOARD_WIDTH}
            gameHeight={BOARD_HEIGHT}
        />
    );
}

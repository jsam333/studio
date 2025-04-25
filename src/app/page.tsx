'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT 
} from '../constants';
import { GameLoopCallbacks, GameState } from '../interfaces'; // Import GameState
import { drawEndMessage } from '../drawFunctions'; 
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { PowerUpSidebar } from '../components/PowerUpSidebar';
import { useGameLogic, GameStateRefs } from '../hooks/useGameLogic'; 
import { Button } from '../components/ui/button'; // Import Button component

const SIDEBAR_WIDTH_PX = 192;
// No longer a constant, will depend on showSidebar state
// const TOTAL_SIDEBAR_SPACE = SIDEBAR_WIDTH_PX;
const MAX_DELTA_TIME_FACTOR = 3;

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // --- Use the custom hook for game logic --- 
    const {
        gameOverState,
        enabledPowerUps,
        showSidebar, // Get the sidebar state
        setGameOverState,
        updateScoreCallback,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        schedulePaddleShrink,
        scheduleFieldShrink,
        startGame, // Get the modified startGame function
        gameStateRefs, 
    } = useGameLogic();

    // --- Canvas size state --- 
    // These might not be strictly necessary anymore if container dictates size
    const [canvasWidth, setCanvasWidth] = useState(BOARD_WIDTH);
    const [canvasHeight, setCanvasHeight] = useState(BOARD_HEIGHT);

    const targetFps = 60; 
    const targetFrameTime = 1000 / targetFps; 

    // Calculate total space needed based on sidebar visibility
    const currentSidebarWidth = showSidebar ? SIDEBAR_WIDTH_PX : 0;
    const totalGameWidth = BOARD_WIDTH + currentSidebarWidth;

    // --- Draw End Message Callback --- 
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: 'won' | 'lost', finalScore: number) => {
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

    // --- Game Loop Ref --- 
    const gameLoopRef = useRef<(timestamp: number) => void>();

    useEffect(() => {
        const gameLoop = (timestamp: number) => {
             if (gameOverState !== 'playing') { 
                 lastTimeRef.current = 0; 
                 return; 
             }
             if (!lastTimeRef.current) lastTimeRef.current = timestamp;
             const elapsed = timestamp - lastTimeRef.current;
             lastTimeRef.current = timestamp;
             const rawDeltaTime = elapsed / targetFrameTime;
             const deltaTime = Math.min(rawDeltaTime, MAX_DELTA_TIME_FACTOR);
             const canvas = canvasRef.current;
             const ctx = canvas?.getContext('2d');
             if (ctx && gameLoopCallbacksRef.current) {
                 gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, deltaTime); 
             }
            animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); 
        };
        gameLoopRef.current = gameLoop; 
    }, [gameOverState, gameStateRefs]); 

    // --- Game Loop Callbacks Ref --- 
     const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();
     useEffect(() => {
         gameLoopCallbacksRef.current = {
             updateScoreCallback,
             setGameOverState,
             schedulePaddleShrink, 
             scheduleFieldShrink, 
             drawEndMessage: drawEndMessageCallback,
         };
     }, [updateScoreCallback, setGameOverState, schedulePaddleShrink, scheduleFieldShrink, drawEndMessageCallback]);

    // --- Setup Canvas and Event Listeners --- 
    useEffect(() => {
        if (gameOverState === 'menu' || !gameContainerRef.current || !canvasRef.current) {
            return; 
        }

        // Use the current sidebar width for setup
        const sidebarWidthForSetup = showSidebar ? SIDEBAR_WIDTH_PX : 0;
        const totalSidebarSpaceForSetup = sidebarWidthForSetup;

        const cleanupCanvas = setupGameCanvas({
            gameContainerRef, 
            canvasRef, 
            gameLoop: gameLoopRef.current!, 
            scaleRef, 
            animationFrameIdRef, 
            handleResetGame, 
            gameStateRefs, 
            gameLoopCallbacks: gameLoopCallbacksRef.current!, 
            lastTimeRef: lastTimeRef,
            // Pass the calculated space based on current state
            totalSidebarSpace: totalSidebarSpaceForSetup,
            sidebarWidthPx: sidebarWidthForSetup,
            launchStuckBalls: () => launchStuckBalls(true), 
        });

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault(); 
            if (gameStateRefs.gameIsRunningRef.current && gameStateRefs.isGameStartedRef.current) { 
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
            const widenTimerRef = gameStateRefs.widenTimeoutRef?.current;
            if (widenTimerRef) {
                clearTimeout(widenTimerRef);
            }
        };
    // Add showSidebar to dependencies, as it affects the layout setup
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs, showSidebar]); 

    // --- Render Logic --- 
    if (gameOverState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
                <h1 className="text-4xl font-bold mb-8">Brick Breaker</h1>
                <Button
                    onClick={() => startGame('main')} // Start main game (no sidebar)
                    className="px-8 py-4 text-xl bg-green-600 hover:bg-green-700 mb-4" // Changed style, removed disabled
                >
                    main game
                </Button>
                <Button 
                    onClick={() => startGame('test')} // Start test level (with sidebar)
                    className="px-8 py-4 text-xl bg-blue-600 hover:bg-blue-700"
                >
                    test level
                </Button>
            </div>
        );
    }

    // Render Game View
    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
            {/* Container width now depends on totalGameWidth */} 
            <div 
                ref={gameContainerRef} 
                className="flex flex-row items-start border border-white relative" 
                style={{ width: totalGameWidth, height: canvasHeight }} // Use dynamic width
            >
                <canvas 
                    ref={canvasRef} 
                    width={canvasWidth} // Canvas logical width remains BOARD_WIDTH
                    height={canvasHeight} 
                    className="block flex-shrink-0" 
                />
                {/* Conditionally render the sidebar */} 
                {showSidebar && (
                    <PowerUpSidebar 
                        enabledPowerUps={enabledPowerUps} 
                        onTogglePowerUp={handlePowerUpToggle} 
                    />
                )}
                {/* Overlay for Won/Lost messages */} 
                {(gameOverState === 'won' || gameOverState === 'lost') && (
                    <div 
                        className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white cursor-pointer"
                        onClick={handleResetGame} 
                    >
                        <p className="text-3xl font-bold">
                            {gameOverState === 'won' ? `You Win! Score: ${gameStateRefs.scoreRef.current}` : 'Game Over!'}
                        </p>
                        <p className="text-xl mt-2">Click to Restart</p>
                    </div>
                )}
            </div>
        </div>
    );
}

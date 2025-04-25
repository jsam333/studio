'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT, GOLD_COLOR, 
    ALL_TOGGLEABLE_POWER_UPS 
} from '../constants';
import { GameLoopCallbacks, GameState, PowerUpType } from '../interfaces'; 
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { PowerUpSidebar } from '../components/PowerUpSidebar';
import { useGameLogic } from '../hooks/useGameLogic'; 
import { Button } from '../components/ui/button'; 

const SIDEBAR_WIDTH_PX = 192;
const MAX_DELTA_TIME_FACTOR = 3;
const SHOP_ITEMS_COUNT = 5;

// Helper function to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const scaleRef = useRef(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

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
        gameStateRefs, // Contains spawnablePowerUpsRef
    } = useGameLogic();

    const [shopItems, setShopItems] = useState<PowerUpType[]>([]); 
    // State to track items purchased *in this specific shop session* for immediate feedback
    const [purchasedInSession, setPurchasedInSession] = useState<Set<PowerUpType>>(new Set());

    const targetFps = 60; 
    const targetFrameTime = 1000 / targetFps; 

    // Draw end message callback (only for won/lost on canvas)
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: 'won' | 'lost' | 'shop', finalScore: number) => {
        if (state === 'shop') return; 
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
             const rawDeltaTime = elapsed / targetFrameTime;
             const deltaTime = Math.min(rawDeltaTime, MAX_DELTA_TIME_FACTOR);
             const canvas = canvasRef.current;
             const ctx = canvas?.getContext('2d');
             if (ctx && gameLoopCallbacksRef.current) {
                 gameUpdate(ctx, gameStateRefs, gameLoopCallbacksRef.current, deltaTime); 
             }
             if (gameStateRefs.gameOverStateRef.current === 'playing') { 
                animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); 
             }
        };
        gameLoopRef.current = gameLoop; 
    }, [gameStateRefs]); 

     // Game loop callbacks ref
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

    // Effect to generate shop items and reset purchased items when entering shop state
    useEffect(() => {
        if (gameOverState === 'shop') {
            const eligiblePowerUps = ALL_TOGGLEABLE_POWER_UPS.filter(p => p !== 'ALL_IN_ONE');
            const shuffled = shuffleArray(eligiblePowerUps);
            setShopItems(shuffled.slice(0, SHOP_ITEMS_COUNT));
            setPurchasedInSession(new Set()); // Reset purchased items for the new shop session
        }
    }, [gameOverState]);

    // Canvas setup and game state effect
    useEffect(() => {
        if (gameOverState === 'menu' || gameOverState === 'shop') {
             if (animationFrameIdRef.current) {
                 cancelAnimationFrame(animationFrameIdRef.current);
                 animationFrameIdRef.current = null;
             }
             const canvas = canvasRef.current;
             const ctx = canvas?.getContext('2d');
             if (ctx) {
                 ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
             }
             return; 
        }
        
        if (!gameContainerRef.current || !canvasRef.current) {
            return;
        }

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
            totalSidebarSpace: totalSidebarSpaceForSetup,
            sidebarWidthPx: sidebarWidthForSetup,
            launchStuckBalls: () => launchStuckBalls(true), 
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
            const widenTimerRef = gameStateRefs.widenTimeoutRef?.current;
            if (widenTimerRef) {
                clearTimeout(widenTimerRef);
            }
        };
    }, [gameOverState, handleResetGame, launchStuckBalls, gameStateRefs, showSidebar]); 

    // --- Render Logic --- 
    if (gameOverState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
                <h1 className="text-4xl font-bold mb-8">Brick Breaker</h1>
                <Button
                    onClick={() => startGame('main')} 
                    className="px-8 py-4 text-xl bg-green-600 hover:bg-green-700 mb-4" 
                >
                    Main Game
                </Button>
                <Button 
                    onClick={() => startGame('test')} 
                    className="px-8 py-4 text-xl bg-blue-600 hover:bg-blue-700"
                >
                    Test Level
                </Button>
            </div>
        );
    }

    // Render Shop Screen using UI components
    if (gameOverState === 'shop') {
        const handlePurchase = (item: PowerUpType) => {
            // Prevent purchase if already owned globally or purchased in this session
            if (gameStateRefs.spawnablePowerUpsRef.current.has(item) || purchasedInSession.has(item)) return; 

            // TODO: Implement cost checking
            // const cost = 10; 
            // if (gameStateRefs.goldRef.current < cost) return; 
            // gameStateRefs.goldRef.current -= cost;

            addSpawnablePowerUp(item);
            setPurchasedInSession(prev => new Set(prev).add(item));
            console.log(`Purchased and added to spawn pool: ${item}`); 
        };

        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-800 text-white">
                <h1 className="text-4xl font-bold mb-6">Level Complete!</h1>
                <p className="text-3xl mb-10" style={{ color: GOLD_COLOR || '#FFD700' }}>
                    Gold: {gameStateRefs.goldRef.current}
                </p>
                
                <h2 className="text-2xl font-semibold mb-4">Power-up Shop</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10 w-full max-w-4xl px-4">
                    {shopItems.length > 0 ? (
                        shopItems.map(item => {
                            // Check if already owned globally (from previous shops)
                            const isGloballyOwned = gameStateRefs.spawnablePowerUpsRef.current.has(item);
                            // Check if purchased in this specific session
                            const isPurchasedThisSession = purchasedInSession.has(item);
                            // Disable if owned globally OR purchased in this session
                            const isDisabled = isGloballyOwned || isPurchasedThisSession;

                            return (
                                <Button 
                                    key={item}
                                    onClick={() => handlePurchase(item)} 
                                    disabled={isDisabled}
                                    className={`py-3 px-2 text-sm flex flex-col h-24 justify-center items-center ${isDisabled ? 'bg-gray-500 opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    <span>{item.replace(/_/g, ' ')}</span> 
                                    {/* Show (Owned) if globally owned, (Added) if purchased this session */}
                                    {isGloballyOwned && !isPurchasedThisSession && <span className="text-xs mt-1 text-yellow-300">(Owned)</span>}
                                    {isPurchasedThisSession && <span className="text-xs mt-1">(Added)</span>}
                                    {/* <span className="text-xs mt-1">(Cost: 10)</span> */} 
                                </Button>
                            );
                        })
                    ) : (
                        <p className="text-center col-span-full">Loading Shop...</p>
                    )}
                </div>

                 <Button 
                    onClick={startNextLevel} 
                    className="mb-4 px-6 py-3 text-lg bg-purple-600 hover:bg-purple-700"
                >
                    Start Level {currentLevel + 1}
                </Button>
                <Button 
                    onClick={handleResetGame} 
                    className="px-6 py-3 text-lg bg-yellow-600 hover:bg-yellow-700"
                >
                    Back to Menu 
                </Button>
            </div>
        );
    }

    // Render Game View (Playing, Won, Lost)
    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
            <div 
                ref={gameContainerRef} 
                className="flex flex-row items-start border border-white relative"
            >
                <canvas 
                    ref={canvasRef} 
                    className="block flex-shrink-0" 
                    onClick={(gameOverState === 'won' || gameOverState === 'lost') ? handleResetGame : undefined}
                    style={{ cursor: (gameOverState === 'won' || gameOverState === 'lost') ? 'pointer' : 'default' }} 
                />
                {showSidebar && (
                    <PowerUpSidebar 
                        enabledPowerUps={enabledPowerUps} 
                        onTogglePowerUp={handlePowerUpToggle} 
                    />
                )}
            </div>
        </div>
    );
}

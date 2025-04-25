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
// Import the calculation function
import { calculateBaseSpawnChance } from '../gameUpdates/gameLoopUtils';

const SIDEBAR_WIDTH_PX = 192;
const MAX_DELTA_TIME_FACTOR = 3;
const SHOP_ITEMS_COUNT = 5;
const POWERUP_COST = 10; 

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
        gameStateRefs, 
    } = useGameLogic();

    const [shopItems, setShopItems] = useState<PowerUpType[]>([]); 
    const [purchasedInSession, setPurchasedInSession] = useState<Set<PowerUpType>>(new Set());
    const [goldDisplay, setGoldDisplay] = useState(gameStateRefs.goldRef.current);
    // State to store the calculated spawn chance for display
    const [currentSpawnChance, setCurrentSpawnChance] = useState(0);

    const targetFps = 60; 
    const targetFrameTime = 1000 / targetFps; 

    // Draw end message callback
    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: 'won' | 'lost' | 'shop', finalScore: number) => {
        // ... (draw won/lost message as before) ...
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
        // ... (game loop logic as before) ...
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

    // Effect to setup shop state when entering shop
    useEffect(() => {
        if (gameOverState === 'shop') {
            // Generate items
            const eligiblePowerUps = ALL_TOGGLEABLE_POWER_UPS.filter(p => p !== 'ALL_IN_ONE');
            const shuffled = shuffleArray(eligiblePowerUps);
            setShopItems(shuffled.slice(0, SHOP_ITEMS_COUNT));
            // Reset session purchases
            setPurchasedInSession(new Set()); 
            // Sync gold display
            setGoldDisplay(gameStateRefs.goldRef.current); 
            // Calculate and set initial spawn chance for display
            const chance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
            setCurrentSpawnChance(chance);
        }
    }, [gameOverState, gameStateRefs.goldRef, gameStateRefs.spawnablePowerUpsRef]); // Add spawnablePowerUpsRef dependency

    // Canvas setup and game state effect
    useEffect(() => {
        // ... (canvas setup logic as before) ...
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
        // ... (menu render logic as before) ...
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
            if (gameStateRefs.spawnablePowerUpsRef.current.has(item) || purchasedInSession.has(item)) return; 
            const cost = POWERUP_COST; 
            if (gameStateRefs.goldRef.current < cost) return;
            
            gameStateRefs.goldRef.current -= cost;
            setGoldDisplay(gameStateRefs.goldRef.current); 
            addSpawnablePowerUp(item);
            setPurchasedInSession(prev => new Set(prev).add(item));
            
            // Recalculate spawn chance after purchase for display update
            const newChance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
            setCurrentSpawnChance(newChance);

            console.log(`Purchased ${item} for ${cost} gold. Remaining: ${gameStateRefs.goldRef.current}. New Spawn Chance: ${newChance * 100}%`); 
        };

        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-800 text-white">
                <h1 className="text-4xl font-bold mb-6">Level Complete!</h1>
                {/* Display Gold and Spawn Chance */}
                <div className="flex items-center space-x-6 mb-10">
                    <p className="text-3xl" style={{ color: GOLD_COLOR || '#FFD700' }}>
                        Gold: {goldDisplay}
                    </p>
                    <p className="text-xl text-blue-300">
                        {/* Format chance as percentage */}
                        Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
                    </p>
                </div>
                
                <h2 className="text-2xl font-semibold mb-4">Power-up Shop</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10 w-full max-w-4xl px-4">
                    {shopItems.length > 0 ? (
                        shopItems.map(item => {
                            const isGloballyOwned = gameStateRefs.spawnablePowerUpsRef.current.has(item);
                            const isPurchasedThisSession = purchasedInSession.has(item);
                            const canAfford = goldDisplay >= POWERUP_COST;
                            const isDisabled = isGloballyOwned || isPurchasedThisSession || !canAfford;
                            let buttonText = `Cost: ${POWERUP_COST}`;
                            let buttonStyle = 'bg-blue-600 hover:bg-blue-700';
                            if (isGloballyOwned) {
                                buttonText = '(Owned)';
                                buttonStyle = 'bg-gray-500 opacity-70';
                            } else if (isPurchasedThisSession) {
                                buttonText = '(Added)';
                                buttonStyle = 'bg-gray-500 opacity-70';
                            } else if (!canAfford) {
                                buttonStyle = 'bg-red-800 opacity-50'; 
                            }

                            return (
                                <Button 
                                    key={item}
                                    onClick={() => handlePurchase(item)} 
                                    disabled={isDisabled}
                                    className={`py-3 px-2 text-sm flex flex-col h-24 justify-center items-center ${buttonStyle}`}
                                >
                                    <span className="mb-1">{item.replace(/_/g, ' ')}</span> 
                                    <span className="text-xs mt-1">{buttonText}</span> 
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
        // ... (game view render logic as before) ...
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

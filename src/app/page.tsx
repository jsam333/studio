// src/app/page.tsx
'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT,
} from '../constants';
import { GameLoopCallbacks, GameState, GameStateRefs, PowerUpType, GameMode } from '../interfaces';
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { useGameLogic } from '../hooks/useGameLogic';
import { useIsMobile } from '../hooks/use-mobile';
import { GameMenu } from '../components/GameMenu';
import { GameView } from '../components/GameView';

const SIDEBAR_WIDTH_PX = 192; // This constant is already defined

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const testCanvasRef = useRef<HTMLCanvasElement>(null);
    const testGameContainerRef = useRef<HTMLDivElement>(null);

    const scaleRef = useRef(1); 
    const testScaleRef = useRef(1); 

    const animationFrameIdRef = useRef<number | null>(null);
    const testAnimationFrameIdRef = useRef<number | null>(null);

    const lastTimeRef = useRef<number>(0);
    const testLastTimeRef = useRef<number>(0);
    const isMobile = useIsMobile();
    const [isInitialTestSetupDone, setIsInitialTestSetupDone] = useState(false);

    const {
        gameOverState,
        activeGameMode, 
        enabledPowerUps,
        showSidebar,
        currentLevel,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        startGame, 
        startNextLevel,
        addSpawnablePowerUp,
        gameStateRefs,
        gameLoopCallbacks, 
        testPowerUpSpawnChance, 
        setTestPowerUpSpawnChance, 
        testBrickColumns, 
        setTestBrickColumns, 
        testBrickRows, 
        setTestBrickRows, 
    } = useGameLogic();

    useEffect(() => {
        if (!isInitialTestSetupDone) {
            console.log("Starting test mode for preview...");
            startGame('test');
            setIsInitialTestSetupDone(true);
        }
    }, [startGame, isInitialTestSetupDone]);

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
    const testGameLoopRef = useRef<(timestamp: number) => void>();
    const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();

    useEffect(() => {
        gameLoopCallbacksRef.current = {
            ...gameLoopCallbacks,
            drawEndMessage: drawEndMessageCallback,
        };
    }, [gameLoopCallbacks, drawEndMessageCallback]);

    const createGameLoop = (gsRefs: GameStateRefs, gcbs: GameLoopCallbacks, lTimeRef: React.MutableRefObject<number>, mode: GameMode | null) => (timestamp: number) => {
        const currentGameState = gsRefs.gameOverStateRef.current;
        const currentActiveMode = gsRefs.gameModeRef.current; 

        if (mode === 'test' && currentGameState === 'menu' && currentActiveMode === 'test') {
        } else if (currentGameState === 'menu' || currentGameState === 'shop') {
            lTimeRef.current = 0;
            return;
        }

        if (currentGameState === 'won' || currentGameState === 'lost') {
            lTimeRef.current = 0;
            const canvas = mode === 'test' ? testCanvasRef.current : canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx && gcbs.drawEndMessage) {
                gcbs.drawEndMessage(ctx, currentGameState, gsRefs.scoreRef.current);
            }
            return;
        }

        if (!lTimeRef.current) lTimeRef.current = timestamp;
        const elapsed = timestamp - lTimeRef.current;
        lTimeRef.current = timestamp;
        const clampedElapsed = Math.min(elapsed, 100); 
        
        const canvas = mode === 'test' ? testCanvasRef.current : canvasRef.current;
        const ctx = canvas?.getContext('2d');

        if (ctx && gcbs) {
            gameUpdate(ctx, gsRefs, gcbs, clampedElapsed);
        }
        
        const shouldContinueAnimation = (mode === 'test' && currentGameState === 'menu' && currentActiveMode === 'test') || 
                                        (currentGameState === 'playing' || currentGameState === 'level_reset');

        if (shouldContinueAnimation) {
            const animFrameIdRef = mode === 'test' ? testAnimationFrameIdRef : animationFrameIdRef;
            const gLoopRef = mode === 'test' ? testGameLoopRef : gameLoopRef;
            if(gLoopRef.current) {
                animFrameIdRef.current = requestAnimationFrame(gLoopRef.current);
            }
        } 
    };
    
    useEffect(() => {
        if (gameLoopCallbacksRef.current) { 
            gameLoopRef.current = createGameLoop(gameStateRefs, gameLoopCallbacksRef.current, lastTimeRef, 'main');
            testGameLoopRef.current = createGameLoop(gameStateRefs, gameLoopCallbacksRef.current, testLastTimeRef, 'test');
        }
    }, [gameStateRefs, gameLoopCallbacks, drawEndMessageCallback]); 

    useEffect(() => {
        const isTestPreviewActive = activeGameMode === 'test' && gameOverState === 'menu';
        const isMainGameActive = gameOverState === 'playing' || gameOverState === 'lost' || gameOverState === 'won';

        let cleanupCanvas: () => void = () => {};
        let cleanupTestCanvas: () => void = () => {};

        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
        if (testAnimationFrameIdRef.current) cancelAnimationFrame(testAnimationFrameIdRef.current);
        testAnimationFrameIdRef.current = null;

        if (isTestPreviewActive) {
            if (testGameContainerRef.current && testCanvasRef.current && gameLoopCallbacksRef.current && testGameLoopRef.current) {
                console.log("Setting up test preview canvas");
                cleanupTestCanvas = setupGameCanvas({
                    gameContainerRef: testGameContainerRef,
                    canvasRef: testCanvasRef,
                    gameLoop: testGameLoopRef.current,
                    scaleRef: testScaleRef, 
                    animationFrameIdRef: testAnimationFrameIdRef,
                    handleResetGame, 
                    gameStateRefs, 
                    gameLoopCallbacks: gameLoopCallbacksRef.current,
                    lastTimeRef: testLastTimeRef,
                    sidebarWidthPx: SIDEBAR_WIDTH_PX,
                    totalSidebarSpace: SIDEBAR_WIDTH_PX, 
                    launchStuckBalls, 
                    isMobile,
                    showSidebarState: true 
                });
                testLastTimeRef.current = performance.now();
                testAnimationFrameIdRef.current = requestAnimationFrame(testGameLoopRef.current);
            }
        }

        if (isMainGameActive) {
            if (gameContainerRef.current && canvasRef.current && gameLoopCallbacksRef.current && gameLoopRef.current) {
                console.log("Setting up main game canvas");
                cleanupCanvas = setupGameCanvas({
                    gameContainerRef,
                    canvasRef,
                    gameLoop: gameLoopRef.current,
                    scaleRef,
                    animationFrameIdRef,
                    handleResetGame,
                    gameStateRefs,
                    gameLoopCallbacks: gameLoopCallbacksRef.current,
                    lastTimeRef,
                    sidebarWidthPx: SIDEBAR_WIDTH_PX,
                    totalSidebarSpace: showSidebar ? SIDEBAR_WIDTH_PX : 0,
                    launchStuckBalls,
                    isMobile,
                    showSidebarState: showSidebar
                });
                if (gameOverState === 'playing' && !animationFrameIdRef.current) {
                    lastTimeRef.current = performance.now();
                    animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current);
                }
            }
        }
        
        if (gameOverState === 'menu' && !isTestPreviewActive) {
            const mainCtx = canvasRef.current?.getContext('2d');
            if (mainCtx) mainCtx.clearRect(0, 0, mainCtx.canvas.width, mainCtx.canvas.height);
            const testCtx = testCanvasRef.current?.getContext('2d');
            if (testCtx) testCtx.clearRect(0, 0, testCtx.canvas.width, testCtx.canvas.height);
        }

        const handleKeyDownGlobal = (event: KeyboardEvent) => {
          if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing' && gameLoopCallbacksRef.current?.updateScoreCallback) {
              console.log("Cheat code activated: +1,000,000 points");
              gameLoopCallbacksRef.current.updateScoreCallback(1000000);
          }
        };
        window.addEventListener('keydown', handleKeyDownGlobal);

        const fieldTimerCleanup = () => {
            const timerRef = gameStateRefs.collectionFieldShrinkTimerRef?.current;
            if (timerRef) clearInterval(timerRef);
        };

        return () => {
            console.log("Cleaning up canvases and listeners");
            cleanupCanvas();
            cleanupTestCanvas();
            fieldTimerCleanup();
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            if (testAnimationFrameIdRef.current) cancelAnimationFrame(testAnimationFrameIdRef.current);
            window.removeEventListener('keydown', handleKeyDownGlobal);
        };
    }, [gameOverState, activeGameMode, showSidebar, handleResetGame, launchStuckBalls, gameStateRefs, isMobile, drawEndMessageCallback, gameLoopCallbacks]);

    return (
        <div style={{
             display: 'flex', 
             flexDirection: 'column', 
             alignItems: 'center', 
             minHeight: '100vh', 
        }}>
            {gameOverState === 'menu' && (
                <GameMenu 
                    onStartGame={(mode) => {
                        if (mode === 'main') startGame('main');
                    }} 
                />
            )}

            {gameOverState === 'menu' && activeGameMode === 'test' && (
                <div style={{ marginTop: '0px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}> 
                    <GameView
                        gameContainerRef={testGameContainerRef} 
                        canvasRef={testCanvasRef} 
                        gameOverState={gameOverState} 
                        showSidebar={true} 
                        enabledPowerUps={enabledPowerUps} 
                        onTogglePowerUp={handlePowerUpToggle} 
                        handleResetGame={() => startGame('test')} 
                        gameStateRefs={gameStateRefs} 
                        currentLevel={1} 
                        addSpawnablePowerUp={addSpawnablePowerUp}
                        startNextLevel={() => {}} 
                        scaleRef={testScaleRef} 
                        gameWidth={BOARD_WIDTH} 
                        gameHeight={BOARD_HEIGHT}
                        isTestPreview={true} 
                    />
                    <div 
                        style={{
                            width: `${(BOARD_WIDTH * testScaleRef.current) + SIDEBAR_WIDTH_PX}px`, // Updated width calculation
                            padding: '10px',
                            backgroundColor: '#111927', 
                            display: 'flex',
                            flexDirection: 'row', 
                            alignItems: 'flex-start', 
                            justifyContent: 'space-between', 
                            color: '#FFFFFF',
                            boxSizing: 'border-box',
                            gap: '15px',
                            border: '1px solid white'
                        }}
                    >
                        {/* Power-up Spawn Chance Control Group */}
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 2}}>
                            <label htmlFor="powerUpSpawnChance" style={{ marginBottom: '5px' }}>
                                Spawn Chance: {Math.round(testPowerUpSpawnChance * 100)}%
                            </label>
                            <input 
                                type="range" 
                                id="powerUpSpawnChance" 
                                min="0" 
                                max="1" 
                                step="0.01" 
                                value={testPowerUpSpawnChance}
                                onChange={(e) => setTestPowerUpSpawnChance(parseFloat(e.target.value))}
                                style={{ width: '100%' }} 
                            />
                        </div>
                        {/* Brick Rows Control Group */}
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1}}>
                            <label htmlFor="testBrickRows" style={{ marginBottom: '5px' }}>
                                Rows: {testBrickRows}
                            </label>
                            <input 
                                type="number" 
                                id="testBrickRows" 
                                min="1" 
                                max="50" 
                                value={testBrickRows}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 1 && val <= 50) { 
                                        setTestBrickRows(val);
                                        startGame('test', testBrickColumns, val);
                                    }
                                }}
                                style={{ width: '80px', padding: '5px', color: '#000000', textAlign: 'center' }} 
                            />
                        </div>
                        {/* Brick Columns Control Group */}
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1}}>
                            <label htmlFor="testBrickColumns" style={{ marginBottom: '5px' }}>
                                Columns: {testBrickColumns}
                            </label>
                            <input 
                                type="number" 
                                id="testBrickColumns" 
                                min="1" 
                                max="100" 
                                value={testBrickColumns}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 1 && val <= 100) { 
                                        setTestBrickColumns(val);
                                        startGame('test', val, testBrickRows);
                                    }
                                }}
                                style={{ width: '80px', padding: '5px', color: '#000000', textAlign: 'center' }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {(gameOverState === 'playing' || gameOverState === 'shop' || gameOverState === 'lost' || gameOverState === 'won') && activeGameMode === 'main' && (
                <GameView
                    gameContainerRef={gameContainerRef}
                    canvasRef={canvasRef}
                    gameOverState={gameOverState}
                    showSidebar={showSidebar}
                    enabledPowerUps={enabledPowerUps}
                    onTogglePowerUp={handlePowerUpToggle}
                    handleResetGame={handleResetGame}
                    gameStateRefs={gameStateRefs}
                    currentLevel={currentLevel}
                    addSpawnablePowerUp={addSpawnablePowerUp}
                    startNextLevel={startNextLevel}
                    scaleRef={scaleRef}
                    gameWidth={BOARD_WIDTH}
                    gameHeight={BOARD_HEIGHT}
                />
            )}
        </div>
    );
}

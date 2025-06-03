// src/app/page.tsx
'use client'

import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT, TARGET_TOTAL_BRICK_GRID_HEIGHT, BRICK_HEIGHT as MIN_BRICK_GRID_HEIGHT, BRICK_OFFSET_TOP, PADDLE_HEIGHT
} from '../constants';
import { GameLoopCallbacks, GameState, GameStateRefs, PowerUpType, GameMode } from '../interfaces';
import { gameUpdate } from '../gameLoop';
import { setupGameCanvas } from '../gameCanvas';
import { useGameLogic } from '../hooks/useGameLogic';
import { useIsMobile } from '../hooks/use-mobile';
import { GameMenu } from '../components/GameMenu';
import { GameView } from '../components/GameView';
import { Button } from '../components/ui/button';
import { SoundSystem } from '../soundSystem';

const SIDEBAR_WIDTH_PX = 192; 
const MAX_BRICK_GRID_HEIGHT = BOARD_HEIGHT - BRICK_OFFSET_TOP - PADDLE_HEIGHT - 30; // 30 for some spacing

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
    const soundSystemRef = useRef<SoundSystem | null>(null);

    const {
        gameOverState,
        activeGameMode, 
        enabledPowerUps,
        showSidebar,
        currentLevel,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        toggleAllTestPowerUps, 
        addTestLaserCharges, 
        addTestRecoveryCharges, 
        addTestSafetyNetCharge,
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
        testBrickGridHeight, 
        setTestBrickGridHeight, 
        testPowerUpLevels, 
        setTestPowerUpLevel, 
        setAllTestPowerUpLevels,
        isPaintModeActive,
        togglePaintMode,
        isUpgradePaintModeActive,
        toggleUpgradePaintMode,
        isReinforcePaintModeActive,
        toggleReinforcePaintMode,
        isBombPaintModeActive,
        toggleBombPaintMode,
        isBallBrickPaintModeActive,
        toggleBallBrickPaintMode,
        triggerTestLevelReset,
        isRemoveBrickPaintModeActive,
        toggleRemoveBrickPaintMode,
        isAddBrickPaintModeActive,
        toggleAddBrickPaintMode,
    } = useGameLogic();

    useEffect(() => {
        if (typeof window !== 'undefined' && !soundSystemRef.current) {
            soundSystemRef.current = new SoundSystem();
        }
    }, []);

    useEffect(() => {
        if (gameStateRefs && soundSystemRef.current) {
            (gameStateRefs as any).soundSystemRef = soundSystemRef;
        }
    }, [gameStateRefs, soundSystemRef.current]);

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
                    {/* Test Window Controls - Removed */}
                    {/* <h3 style={{ color: 'white', textAlign: 'center', margin: '10px 0', fontSize: '1.25rem' }}>Test Window Controls</h3> */}
                    
                    <GameView
                        gameContainerRef={testGameContainerRef} 
                        canvasRef={testCanvasRef} 
                        gameOverState={gameOverState} 
                        showSidebar={true} 
                        enabledPowerUps={enabledPowerUps} 
                        onTogglePowerUp={handlePowerUpToggle} 
                        toggleAllTestPowerUps={toggleAllTestPowerUps} 
                        addTestLaserCharges={addTestLaserCharges} 
                        addTestRecoveryCharges={addTestRecoveryCharges} 
                        addTestSafetyNetCharge={addTestSafetyNetCharge} // Ensured this is passed
                        handleResetGame={() => startGame('test')} 
                        gameStateRefs={gameStateRefs} 
                        currentLevel={1} 
                        addSpawnablePowerUp={addSpawnablePowerUp}
                        startNextLevel={() => {}} 
                        isTestPreview={true} 
                        testPowerUpLevels={testPowerUpLevels} 
                        setTestPowerUpLevel={setTestPowerUpLevel} 
                        setAllTestPowerUpLevels={setAllTestPowerUpLevels}
                        isPaintModeActive={isPaintModeActive}
                        togglePaintMode={togglePaintMode}
                        isUpgradePaintModeActive={isUpgradePaintModeActive}
                        toggleUpgradePaintMode={toggleUpgradePaintMode}
                        isReinforcePaintModeActive={isReinforcePaintModeActive}
                        toggleReinforcePaintMode={toggleReinforcePaintMode}
                        isBombPaintModeActive={isBombPaintModeActive}
                        toggleBombPaintMode={toggleBombPaintMode}
                        isBallBrickPaintModeActive={isBallBrickPaintModeActive}
                        toggleBallBrickPaintMode={toggleBallBrickPaintMode}
                        triggerTestLevelReset={triggerTestLevelReset}
                        isRemoveBrickPaintModeActive={isRemoveBrickPaintModeActive}
                        toggleRemoveBrickPaintMode={toggleRemoveBrickPaintMode}
                        isAddBrickPaintModeActive={isAddBrickPaintModeActive}
                        toggleAddBrickPaintMode={toggleAddBrickPaintMode}
                    />
                    <div 
                        style={{
                            width: `${(BOARD_WIDTH * testScaleRef.current) + SIDEBAR_WIDTH_PX}px`,
                            padding: '5px 10px',
                            backgroundColor: '#111927', 
                            display: 'flex',
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#FFFFFF',
                            boxSizing: 'border-box',
                            gap: '10px', 
                            borderLeft: '1px solid white',
                            borderRight: '1px solid white',
                            borderBottom: '1px solid white'
                        }}
                    >
                        {/* Power-up Spawn Chance Control Group */}
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.5}}>
                            <label htmlFor="powerUpSpawnChance" style={{ marginBottom: '5px', fontSize: '0.75rem' }}>
                                PU Spawn: {Math.round(testPowerUpSpawnChance * 100)}%
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
                        {/* Brick Grid Height Control Group */}
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.5}}>
                             <label htmlFor="testBrickGridHeight" style={{ marginBottom: '5px', fontSize: '0.75rem'}}>
                                Grid H: {testBrickGridHeight}
                            </label>
                            <input 
                                type="range" 
                                id="testBrickGridHeight" 
                                min={MIN_BRICK_GRID_HEIGHT} 
                                max={MAX_BRICK_GRID_HEIGHT} 
                                step="1" 
                                value={testBrickGridHeight}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setTestBrickGridHeight(val);
                                    startGame('test', testBrickColumns, testBrickRows, val);
                                }}
                                style={{ 
                                    width: '100%', 
                                    height: 'auto',
                                }} 
                            />
                        </div>
                        {/* Brick Rows Control Group */}
                        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', flex: 0.6, justifyContent: 'center'}}>
                            <label htmlFor="testBrickRows" style={{ marginRight: '5px', fontSize: '0.75rem' }}>
                                Rows:
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
                                        startGame('test', testBrickColumns, val, testBrickGridHeight);
                                    }
                                }}
                                style={{ width: '60px', padding: '3px', fontSize: '0.75rem', color: '#000000', textAlign: 'center' }}
                            />
                        </div>
                        {/* Brick Columns Control Group */}
                        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', flex: 0.6, gap: '8px'}}> 
                            <label htmlFor="testBrickColumns" style={{ fontSize: '0.75rem' }}> 
                                Cols:
                            </label>
                            {/* New inner div for input and button */}
                            <div style={{display: 'flex', alignItems: 'center', gap: '8px', flex: 1}}>
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
                                            startGame('test', val, testBrickRows, testBrickGridHeight);
                                        }
                                    }}
                                    style={{ padding: '3px', fontSize: '0.75rem', color: '#000000', textAlign: 'center', minWidth: '60px' }}
                                />
                                <Button
                                    onClick={toggleRemoveBrickPaintMode} 
                                    variant="outline"
                                    className={`text-white text-[0.8rem] py-[3px] px-2 rounded shadow-md focus:ring-1 focus:ring-white ${isRemoveBrickPaintModeActive ? 'bg-red-500 hover:bg-red-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    Remove
                                </Button>
                                <Button
                                    onClick={toggleAddBrickPaintMode} 
                                    variant="outline"
                                    className={`text-white text-[0.8rem] py-[3px] px-2 rounded shadow-md focus:ring-1 focus:ring-white ${isAddBrickPaintModeActive ? 'bg-green-500 hover:bg-green-400' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    Add
                                </Button>
                                <Button
                                    onClick={triggerTestLevelReset} 
                                    variant="outline"
                                    className="bg-gray-700 hover:bg-gray-600 text-white text-[0.8rem] py-[3px] px-2 rounded shadow-md focus:ring-1 focus:ring-white"
                                >
                                    Reset
                                </Button>
                            </div>
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
                    isPaintModeActive={isPaintModeActive}
                    togglePaintMode={togglePaintMode}
                    isUpgradePaintModeActive={isUpgradePaintModeActive}
                    toggleUpgradePaintMode={toggleUpgradePaintMode}
                    isReinforcePaintModeActive={isReinforcePaintModeActive}
                    toggleReinforcePaintMode={toggleReinforcePaintMode}
                    isBombPaintModeActive={isBombPaintModeActive}
                    toggleBombPaintMode={toggleBombPaintMode}
                    isBallBrickPaintModeActive={isBallBrickPaintModeActive}
                    toggleBallBrickPaintMode={toggleBallBrickPaintMode}
                />
            )}
        </div>
    );
}

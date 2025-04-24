'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, PADDLE_Y,
    INITIAL_PADDLE_WIDTH, PADDLE_WIDEN_INCREMENT,
    BASE_BALL_SPEED_FACTOR, INITIAL_BALL_SPEED_Y, // Reverted to BASE_BALL_SPEED_FACTOR
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W, FIELD_SHRINK_INTERVAL,
    ALL_TOGGLEABLE_POWER_UPS, 
    POWER_UP_COLORS, 
} from '../constants';
import { Ball, Laser, PowerUp, Brick, PowerUpType } from '../interfaces'; 
import { initializeBricks, initialBallState } from '../gameLogic';
import { drawPaddle, drawBalls, drawBricks, drawScore, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect } from '../drawFunctions';
import { calculateShrinkDuration } from '../gameUtils';
import { gameUpdate } from '../gameLoop';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { setupGameCanvas } from '../gameCanvas';

const SIDEBAR_WIDTH_PX = 192; 
const TOTAL_SIDEBAR_SPACE = SIDEBAR_WIDTH_PX;

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameContainerRef = useRef<HTMLDivElement>(null); 

    // --- Refs for mutable game state --- 
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const bricksRef = useRef<Brick[][]>(initializeBricks());
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const gameIsRunningRef = useRef(false);
    const animationFrameIdRef = useRef<number | null>(null);
    const paddleWidthRef = useRef(INITIAL_PADDLE_WIDTH);
    const widenLevelRef = useRef(0);
    const widenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scaleRef = useRef(1);
    const laserShotsRef = useRef(0);
    const lasersRef = useRef<Laser[]>([]);
    const safetyNetCountRef = useRef(0);
    // Reverted to BASE_BALL_SPEED_FACTOR
    const gameSpeedFactorRef = useRef<number>(BASE_BALL_SPEED_FACTOR);
    const lastTimeRef = useRef<number>(0);
    const collectionFieldHeightRef = useRef<number>(FIELD_INITIAL_HEIGHT_OFFSET); 
    const collectionFieldWidthOffsetRef = useRef<number>(FIELD_INITIAL_WIDTH_OFFSET);
    const collectionFieldShrinkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const stickyPaddleChargesRef = useRef(0); 
    const stuckBallsRef = useRef<Ball[]>([]);
    const enabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(['MULTI_BALL'])); 
    const isGameStartedRef = useRef(false); 

    // --- State --- 
    const [score, setScore] = useState(0);
    const [canvasWidth, setCanvasWidth] = useState(BOARD_WIDTH);
    const [canvasHeight, setCanvasHeight] = useState(BOARD_HEIGHT);
    const [gameOverState, setGameOverState] = useState<'playing' | 'won' | 'lost'>('playing');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(['MULTI_BALL']));

    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';
     }, [gameOverState]);

    const fpsInterval = 1000 / 60;

    const drawEndMessage = useCallback(/* ... */ (context: CanvasRenderingContext2D, state: 'won' | 'lost', finalScore: number) => {
        const message = state === 'won' ? `You Win! Score: ${finalScore}` : 'Game Over!';
        const subMessage = 'Click to Restart';
        const logicalCenterX = BOARD_WIDTH / 2;
        const logicalCenterY = BOARD_HEIGHT / 2;
        context.save(); context.textAlign = 'center'; context.fillStyle = 'white'; context.font = '30px Arial';
        context.fillText(message, logicalCenterX, logicalCenterY - 15);
        context.font = '20px Arial'; context.fillText(subMessage, logicalCenterX, logicalCenterY + 15);
        context.restore();
    }, []);

    const updateScoreCallback = useCallback((points: number) => {
        scoreRef.current += points; 
        setScore(s => s + points); 
    }, []);

    const schedulePaddleShrink = useCallback(() => {
        if (widenTimeoutRef.current) { clearTimeout(widenTimeoutRef.current); }
        const currentWidth = paddleWidthRef.current;
        const duration = calculateShrinkDuration(currentWidth);
        widenTimeoutRef.current = setTimeout(() => {
            if (widenLevelRef.current > 0) {
                 const oldWidth = paddleWidthRef.current;
                 if (oldWidth > INITIAL_PADDLE_WIDTH) {
                     const currentPaddleXLocal = paddleXRef.current;
                     const newWidth = Math.max(INITIAL_PADDLE_WIDTH, oldWidth - PADDLE_WIDEN_INCREMENT);
                     const widthDecrease = oldWidth - newWidth;
                     let newPaddleX = currentPaddleXLocal + widthDecrease / 2;
                     newPaddleX = Math.max(0, newPaddleX); newPaddleX = Math.min(BOARD_WIDTH - newWidth, newPaddleX);
                     paddleWidthRef.current = newWidth;
                     paddleXRef.current = newPaddleX;
                 }
                 widenLevelRef.current--;
                 if (widenLevelRef.current > 0 && paddleWidthRef.current > INITIAL_PADDLE_WIDTH) {
                    schedulePaddleShrink();
                 } else {
                    if (paddleWidthRef.current < INITIAL_PADDLE_WIDTH) {
                        paddleWidthRef.current = INITIAL_PADDLE_WIDTH;
                        let currentPaddleXLocal = paddleXRef.current;
                        let newPaddleX = currentPaddleXLocal;
                        newPaddleX = Math.max(0, newPaddleX); newPaddleX = Math.min(BOARD_WIDTH - INITIAL_PADDLE_WIDTH, newPaddleX);
                        paddleXRef.current = newPaddleX;
                    }
                    widenLevelRef.current = 0;
                 }
            }
        }, duration);
    }, []);

    const scheduleFieldShrink = useCallback(() => {
        if (collectionFieldShrinkTimerRef.current) {
            clearInterval(collectionFieldShrinkTimerRef.current);
        }
        collectionFieldShrinkTimerRef.current = setInterval(() => {
            let heightChanged = false;
            let widthChanged = false;

            if (collectionFieldHeightRef.current > 0) {
                collectionFieldHeightRef.current = Math.max(0, collectionFieldHeightRef.current - FIELD_SHRINK_RATE_H);
                heightChanged = true;
            }
            if (collectionFieldWidthOffsetRef.current > 0) {
                collectionFieldWidthOffsetRef.current = Math.max(0, collectionFieldWidthOffsetRef.current - FIELD_SHRINK_RATE_W);
                widthChanged = true;
            }
            if (!heightChanged && !widthChanged && collectionFieldShrinkTimerRef.current) {
                 clearInterval(collectionFieldShrinkTimerRef.current);
                 collectionFieldShrinkTimerRef.current = null;
            }
        }, FIELD_SHRINK_INTERVAL); 
    }, []); 

    const setupInitialBall = useCallback(() => {
        ballsRef.current = [];
        stuckBallsRef.current = [{ 
            ...initialBallState,
            id: Date.now() 
        }];
        paddleWidthRef.current = INITIAL_PADDLE_WIDTH;
        paddleXRef.current = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
    }, []);

    const handleResetGame = useCallback(() => {
        if (animationFrameIdRef.current) { cancelAnimationFrame(animationFrameIdRef.current); animationFrameIdRef.current = null; }
        gameIsRunningRef.current = false; 
        isGameStartedRef.current = false; 
        if (widenTimeoutRef.current) { clearTimeout(widenTimeoutRef.current); widenTimeoutRef.current = null; }
        if (collectionFieldShrinkTimerRef.current) { clearInterval(collectionFieldShrinkTimerRef.current); collectionFieldShrinkTimerRef.current = null; }

        bricksRef.current = initializeBricks();
        powerUpsRef.current = [];
        lasersRef.current = [];
        scoreRef.current = 0;
        widenLevelRef.current = 0;
        laserShotsRef.current = 0;
        safetyNetCountRef.current = 0;
        // Reverted to BASE_BALL_SPEED_FACTOR
        gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
        collectionFieldHeightRef.current = FIELD_INITIAL_HEIGHT_OFFSET;
        collectionFieldWidthOffsetRef.current = FIELD_INITIAL_WIDTH_OFFSET;
        stickyPaddleChargesRef.current = 0; 
        lastTimeRef.current = 0;

        setupInitialBall(); 

        setScore(0);
        setGameOverState('playing'); 
        // Restart the animation loop immediately upon reset if state is 'playing'
         if (!animationFrameIdRef.current) {
              lastTimeRef.current = performance.now();
              animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current); // Use ref to gameLoop
         }

    }, [setupInitialBall]); 

    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        if (stuckBallsRef.current.length > 0) {
            const currentPaddleX = paddleXRef.current; 
            const currentPaddleWidth = paddleWidthRef.current; 
            const gameSpeed = gameSpeedFactorRef.current;
            const launchTime = Date.now(); 

            const launchedBalls = stuckBallsRef.current.map(ball => {
                const absoluteX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2); 
                
                // Timer resume logic ...
                 let resumedBlackEndTime = undefined;
                 if (ball.isBlack && ball.blackPausedDuration) { resumedBlackEndTime = launchTime + ball.blackPausedDuration; ball.blackPausedDuration = undefined; }
                 let resumedBlueEndTime = undefined;
                 if (ball.isBlue && ball.bluePausedDuration) { resumedBlueEndTime = launchTime + ball.bluePausedDuration; ball.bluePausedDuration = undefined; }
                 let resumedBigEndTime = undefined;
                 if (ball.isBig && ball.bigPausedDuration) { resumedBigEndTime = launchTime + ball.bigPausedDuration; ball.bigPausedDuration = undefined; }
                 let resumedSplittingEndTime = undefined;
                 if (ball.isSplitting && ball.splittingPausedDuration) { resumedSplittingEndTime = launchTime + ball.splittingPausedDuration; ball.splittingPausedDuration = undefined; }

                let launchSpeedX = 0;
                let launchSpeedY = INITIAL_BALL_SPEED_Y * gameSpeed; 

                if (isInitialLaunch) {
                    launchSpeedX = 3 * gameSpeed; 
                    launchSpeedY = INITIAL_BALL_SPEED_Y * gameSpeed; 
                    isGameStartedRef.current = true; 
                }

                return {
                    ...ball,
                    x: absoluteX, 
                    y: PADDLE_Y - (ball.isBig ? BALL_SIZE * 1.5 : BALL_SIZE) - 1, 
                    speedY: launchSpeedY, 
                    speedX: launchSpeedX, 
                    stuckOffset: undefined, 
                    blackEndTime: resumedBlackEndTime ?? ball.blackEndTime,
                    blueEndTime: resumedBlueEndTime ?? ball.blueEndTime,
                    bigEndTime: resumedBigEndTime ?? ball.bigEndTime,
                    splittingEndTime: resumedSplittingEndTime ?? ball.splittingEndTime,
                };
            });
            ballsRef.current = [...ballsRef.current, ...launchedBalls];
            stuckBallsRef.current = []; 
        }
    }, []); 

    const handlePowerUpToggle = useCallback((type: PowerUpType) => {
        setEnabledPowerUps(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    }, []);

    // Create a ref for the gameLoop function to avoid dependency issues in handleResetGame
    const gameLoopRef = useRef<(timestamp: number) => void>();

    useEffect(() => {
        // Define gameLoop inside useEffect so it captures the latest state/refs
        const gameLoop = (timestamp: number) => {
             // Check refs directly within the loop
             if (!gameIsRunningRef.current) return; 
             if (!lastTimeRef.current) lastTimeRef.current = timestamp;
             const elapsed = timestamp - lastTimeRef.current;
             if (elapsed > fpsInterval) {
                 lastTimeRef.current = timestamp - (elapsed % fpsInterval);
                 const canvas = canvasRef.current;
                 const ctx = canvas?.getContext('2d');
                 // Update refs used by gameUpdate just before calling it
                  const currentGameStateRefs: GameStateRefs = {
                        paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, paddleWidthRef,
                        widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
                        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
                        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
                        stickyPaddleChargesRef,
                        stuckBallsRef,
                        enabledPowerUpsRef, 
                        isGameStartedRef,
                    };
                 if (ctx) {
                     gameUpdate(ctx, currentGameStateRefs, gameLoopCallbacksRef.current); // Use ref for callbacks
                 }
             }
            // Continue the loop if the game is still running
            if (gameIsRunningRef.current) { 
                animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); // Use ref
            }
        };
        gameLoopRef.current = gameLoop; // Store the latest gameLoop function in the ref
    }); // No dependency array - captures latest state on every render

     // Ref for callbacks to avoid dependency issues
     const gameLoopCallbacksRef = useRef<GameLoopCallbacks>();
     useEffect(() => {
         gameLoopCallbacksRef.current = {
             updateScoreCallback,
             setGameOverState,
             schedulePaddleShrink,
             scheduleFieldShrink,
             drawEndMessage,
         };
     });

    useEffect(() => {
        setupInitialBall();
    }, [setupInitialBall]); 

    useEffect(() => {
         const currentGameStateRefs: GameStateRefs = {
            paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, paddleWidthRef,
            widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
            gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
            collectionFieldHeightRef, collectionFieldWidthOffsetRef,
            stickyPaddleChargesRef,
            stuckBallsRef,
            enabledPowerUpsRef, 
            isGameStartedRef,
        };

        const cleanupCanvas = setupGameCanvas({
            gameContainerRef, 
            canvasRef, 
            gameLoop: gameLoopRef.current!, // Pass the function from ref
            scaleRef, 
            animationFrameIdRef, 
            handleResetGame, 
            gameStateRefs: currentGameStateRefs, 
            gameLoopCallbacks: gameLoopCallbacksRef.current!, // Pass callbacks from ref
            lastTimeRef: lastTimeRef,
            totalSidebarSpace: TOTAL_SIDEBAR_SPACE,
            sidebarWidthPx: SIDEBAR_WIDTH_PX,
            launchStuckBalls, 
        });

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault(); 
            if (gameIsRunningRef.current && isGameStartedRef.current) { 
                launchStuckBalls(false); 
            }
        };

        const containerElement = gameContainerRef.current;
        if (containerElement) {
            containerElement.addEventListener('contextmenu', handleContextMenu);
        }

        // Start animation loop immediately if state is 'playing'
        if (gameOverState === 'playing' && !animationFrameIdRef.current) {
           lastTimeRef.current = performance.now();
           animationFrameIdRef.current = requestAnimationFrame(gameLoopRef.current!); // Use ref
        }

        const fieldTimerCleanup = () => {
             if (collectionFieldShrinkTimerRef.current) {
                clearInterval(collectionFieldShrinkTimerRef.current);
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
        };
    // Explicitly list dependencies needed for setting up canvas and listeners
    }, [gameOverState, handleResetGame, launchStuckBalls, setupInitialBall]); 


    return (
        <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
            <div 
                ref={gameContainerRef} 
                className="flex flex-row items-start border border-white" 
            >
                <canvas 
                    ref={canvasRef} 
                    width={canvasWidth} 
                    height={canvasHeight} 
                    className="block flex-shrink-0" 
                />
                <div 
                    data-role="powerup-sidebar" 
                    className="h-full p-4 border-l border-gray-700 bg-gray-800 text-white overflow-y-auto flex flex-col space-y-2 flex-shrink-0" 
                >
                    <h3 className="text-lg font-semibold mb-2 text-center sticky top-0 bg-gray-800 py-1">Enabled Power-ups</h3>
                    {ALL_TOGGLEABLE_POWER_UPS.map(type => {
                        const isEnabled = enabledPowerUps.has(type);
                        const bgColor = isEnabled ? (POWER_UP_COLORS[type] || '#cccccc') : '#4a5568'; 
                        const textColor = isEnabled && (type === 'BLACK_BALL' || type === 'ALL_IN_ONE') ? '#ffffff' : '#000000'; 
                        return (
                            <button
                                key={type}
                                onClick={() => handlePowerUpToggle(type)}
                                className={`px-3 py-1 rounded text-sm font-medium transition-colors duration-150 w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white hover:opacity-80`}
                                style={{
                                    backgroundColor: bgColor,
                                    color: textColor,
                                }}
                            >
                                {type.replace(/_/g, ' ')} 
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

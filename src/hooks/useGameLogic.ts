// src/hooks/useGameLogic.ts (Modified)
import { useRef, useCallback, useEffect, useState } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    PADDLE_WIDEN_INCREMENT, FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W,
    FIELD_SHRINK_INTERVAL,
    BRICK_COLUMNS, BRICK_ROWS, 
    BRICK_HEIGHT, TALL_BRICK_HEIGHT, 
    BRICK_PADDING, TARGET_TOTAL_BRICK_GRID_HEIGHT // Import constants needed for calculation
} from '../constants';
import { Ball, Brick, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs } from '../interfaces';
import { initializeBricks, initialBallState } from '../gameLogic';
import { calculateShrinkDuration } from '../gameUtils';

export interface GameStateRefs extends IGameStateRefs {
    widenTimeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    collectionFieldShrinkTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    animationFrameIdRef?: React.MutableRefObject<number | null>; 
    lastTimeRef?: React.MutableRefObject<number>; 
    currentLevelRef: React.MutableRefObject<number>; 
}

export function useGameLogic() {
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const bricksRef = useRef<Brick[][]>([]); 
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const gameIsRunningRef = useRef(false);
    const paddleWidthRef = useRef(INITIAL_PADDLE_WIDTH);
    const widenLevelRef = useRef(0);
    const widenTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const laserShotsRef = useRef(0);
    const lasersRef = useRef<Laser[]>([]);
    const safetyNetCountRef = useRef(0);
    const gameSpeedFactorRef = useRef<number>(BASE_BALL_SPEED_FACTOR);
    const collectionFieldHeightRef = useRef<number>(FIELD_INITIAL_HEIGHT_OFFSET); 
    const collectionFieldWidthOffsetRef = useRef<number>(FIELD_INITIAL_WIDTH_OFFSET);
    const collectionFieldShrinkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const stickyPaddleChargesRef = useRef(0); 
    const stuckBallsRef = useRef<Ball[]>([]);
    const enabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(['MULTI_BALL'])); 
    const isGameStartedRef = useRef(false);
    const gameModeRef = useRef<GameMode | null>(null); 
    const brickColumnsRef = useRef<number>(BRICK_COLUMNS);
    const brickRowsRef = useRef<number>(BRICK_ROWS);
    const currentLevelRef = useRef<number>(1); 

    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState); 
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(['MULTI_BALL']));
    const [showSidebar, setShowSidebar] = useState<boolean>(false);

    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';
    }, [gameOverState]);

    const updateScoreCallback = useCallback((points: number) => {
        scoreRef.current += points; 
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

    const schedulePaddleShrink = useCallback(() => {
        // ... (no changes)
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
                        newPaddleX = Math.max(0, newPaddleX); 
                        newPaddleX = Math.min(BOARD_WIDTH - INITIAL_PADDLE_WIDTH, newPaddleX);
                        paddleXRef.current = newPaddleX;
                    }
                    widenLevelRef.current = 0;
                 }
            }
        }, duration);
    }, []);

    const scheduleFieldShrink = useCallback(() => {
        // ... (no changes)
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

    // Updated resetLevel to calculate height for levels 8+
    const resetLevel = useCallback((mode: GameMode | null) => {
        const currentMode = mode ?? gameModeRef.current; 
        if (!currentMode) return; 
        
        let cols = BRICK_COLUMNS;
        let rows = BRICK_ROWS;    
        let targetHeight = BRICK_HEIGHT; // Default height

        if (currentMode === 'main') {
            const level = currentLevelRef.current;
            if (level === 1) {
                cols = 3;
                rows = 2;
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 2) {
                cols = 4;
                rows = 3;
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 3) {
                cols = 5;
                rows = 4;
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 4) { 
                cols = 7; 
                rows = 5; 
                targetHeight = TALL_BRICK_HEIGHT;
            } else if (level === 5) { 
                cols = 9; 
                rows = 6; 
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 6) { 
                cols = 11; 
                rows = 7; 
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 7) { 
                cols = 13; 
                rows = 8; 
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 8) { 
                cols = 15; 
                rows = 9; 
                targetHeight = TALL_BRICK_HEIGHT; 
            } else if (level === 9) { 
                cols = 17; 
                rows = 10; 
                targetHeight = TALL_BRICK_HEIGHT; 
            } 
            // Levels 10+
            else { 
                cols = 4; // Default cols for these levels
                // Determine rows based on level, e.g., increase rows for higher levels
                if (level === 10) { 
                    cols = 20; 
                    rows = 11; 
                } else if (level === 11) { 
                    cols = 22; 
                    rows = 12; 
                } else if (level === 12) { 
                    cols = 25; 
                    rows = 13; 
                } else if (level === 13) { 
                    cols = 28; 
                    rows = 14; 
                } else if (level === 14) { 
                    cols = 31; 
                    rows = 15; 
                } else if (level === 15) { 
                    cols = 35; 
                    rows = 16; 
                } else if (level === 16) { 
                    cols = 40; 
                    rows = 17; 
                } else if (level === 17) { 
                    cols = 45; 
                    rows = 18; 
                } else if (level === 18) { 
                    cols = 50; 
                    rows = 19; 
                } else if (level === 19) { 
                    cols = 55; 
                    rows = 20; 
                } else if (level === 20) { 
                    cols = 60; 
                    rows = 23; 
                } else { 
                    // Default for level 8+ (e.g., stay at 7 rows or increase further)
                    rows = 7; 
                } 

                // Calculate individual brick height to meet target total height
                if (rows > 0) {
                    targetHeight = (TARGET_TOTAL_BRICK_GRID_HEIGHT - (rows - 1) * BRICK_PADDING) / rows;
                    // Ensure minimum height 
                    targetHeight = Math.max(1, targetHeight); 
                } else {
                    targetHeight = BRICK_HEIGHT; // Fallback
                }
            }
        } else { 
            // Test mode uses default cols, rows, and height
            cols = BRICK_COLUMNS;
            rows = BRICK_ROWS;
            targetHeight = BRICK_HEIGHT;
        }

        brickColumnsRef.current = cols;
        brickRowsRef.current = rows;
        // Pass the determined targetHeight to initializeBricks
        bricksRef.current = initializeBricks(cols, rows, targetHeight);
        
        // Reset other game elements
        powerUpsRef.current = [];
        lasersRef.current = [];
        widenLevelRef.current = 0;
        laserShotsRef.current = 0;
        safetyNetCountRef.current = 0;
        gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
        collectionFieldHeightRef.current = FIELD_INITIAL_HEIGHT_OFFSET;
        collectionFieldWidthOffsetRef.current = FIELD_INITIAL_WIDTH_OFFSET;
        stickyPaddleChargesRef.current = 0; 
        setupInitialBall();
        isGameStartedRef.current = false;
    }, [setupInitialBall]); 

    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false; 
        isGameStartedRef.current = false; 
        if (widenTimeoutRef.current) { clearTimeout(widenTimeoutRef.current); widenTimeoutRef.current = null; }
        if (collectionFieldShrinkTimerRef.current) { clearInterval(collectionFieldShrinkTimerRef.current); collectionFieldShrinkTimerRef.current = null; }
        scoreRef.current = 0; 
        currentLevelRef.current = 1; 
        resetLevel(null); 
        setGameOverState('menu');
        setShowSidebar(false); 
        gameModeRef.current = null; 
    }, [resetLevel]); 

    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        // ... (no changes)
         if (gameOverStateRef.current !== 'playing') return; 
        
        if (stuckBallsRef.current.length > 0) {
            const currentPaddleX = paddleXRef.current;
            const currentPaddleWidth = paddleWidthRef.current;
            const gameSpeed = gameSpeedFactorRef.current;
            const launchTime = Date.now();

            const launchedBalls = stuckBallsRef.current.map(ball => {
                const absoluteX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2);
                const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

                 let resumedBlackEndTime = undefined;
                 if (ball.isBlack && ball.blackPausedDuration) { resumedBlackEndTime = launchTime + ball.blackPausedDuration; }
                 let resumedBlueEndTime = undefined;
                 if (ball.isBlue && ball.bluePausedDuration) { resumedBlueEndTime = launchTime + ball.bluePausedDuration; }
                 let resumedBigEndTime = undefined;
                 if (ball.isBig && ball.bigPausedDuration) { resumedBigEndTime = launchTime + ball.bigPausedDuration; }
                 let resumedSplittingEndTime = undefined;
                 if (ball.isSplitting && ball.splittingPausedDuration) { resumedSplittingEndTime = launchTime + ball.splittingPausedDuration; }

                let launchSpeedX = 0;
                let launchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y * gameSpeed);

                if (isInitialLaunch) {
                    launchSpeedX = 3 * gameSpeed; 
                    isGameStartedRef.current = true; 
                } else {
                    launchSpeedX = 0; 
                }
                
                return {
                    ...ball,
                    x: absoluteX,
                    y: PADDLE_Y - currentBallSize - 1,
                    speedY: launchSpeedY,
                    speedX: launchSpeedX,
                    stuckOffset: undefined, 
                    blackEndTime: resumedBlackEndTime ?? ball.blackEndTime,
                    blueEndTime: resumedBlueEndTime ?? ball.blueEndTime,
                    bigEndTime: resumedBigEndTime ?? ball.bigEndTime,
                    splittingEndTime: resumedSplittingEndTime ?? ball.splittingEndTime,
                    blackPausedDuration: undefined,
                    bluePausedDuration: undefined,
                    bigPausedDuration: undefined,
                    splittingPausedDuration: undefined,
                };
            });
            ballsRef.current.push(...launchedBalls); 
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

    const startGame = useCallback((mode: GameMode) => {
        if (gameOverStateRef.current === 'menu') {
            scoreRef.current = 0; 
            currentLevelRef.current = 1; 
            gameModeRef.current = mode; 
            resetLevel(mode); 
            setShowSidebar(mode === 'test');
            setGameOverState('playing');
        }
    }, [resetLevel]); 

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            currentLevelRef.current++; 
            const nextMode: GameMode = 'main'; 
            gameModeRef.current = nextMode;
            resetLevel(nextMode); 
            setShowSidebar(false); 
            setGameOverState('playing');
        }
    }, [resetLevel]);

    const gameStateRefs: GameStateRefs = {
        paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, paddleWidthRef,
        widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        widenTimeoutRef, collectionFieldShrinkTimerRef,
        brickColumnsRef, brickRowsRef, 
        gameModeRef, 
        currentLevelRef, 
    };

    return {
        gameOverState,
        enabledPowerUps,
        showSidebar,
        currentLevel: currentLevelRef.current, 
        setGameOverState, 
        updateScoreCallback,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        schedulePaddleShrink,
        scheduleFieldShrink,
        startGame,
        startNextLevel, 
        gameStateRefs,
    };
}

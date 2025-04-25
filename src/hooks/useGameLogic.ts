// src/hooks/useGameLogic.ts (Modified)
import { useRef, useCallback, useEffect, useState } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    PADDLE_WIDEN_INCREMENT, FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W,
    FIELD_SHRINK_INTERVAL,
    BRICK_COLUMNS, BRICK_ROWS // Import default brick dimensions
} from '../constants';
import { Ball, Brick, PowerUp, Laser, PowerUpType, GameState, GameStateRefs as IGameStateRefs } from '../interfaces';
// Import the updated initializeBricks
import { initializeBricks, initialBallState } from '../gameLogic';
import { calculateShrinkDuration } from '../gameUtils';

// Use the imported interface definition
export interface GameStateRefs extends IGameStateRefs {
    widenTimeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    collectionFieldShrinkTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    animationFrameIdRef?: React.MutableRefObject<number | null>; 
    lastTimeRef?: React.MutableRefObject<number>; 
    // Add grid dimensions to refs
    brickColumnsRef: React.MutableRefObject<number>;
    brickRowsRef: React.MutableRefObject<number>;
}

type GameMode = 'main' | 'test';


export function useGameLogic() {
    // --- Refs for mutable game state ---
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const bricksRef = useRef<Brick[][]>([]); // Initialize empty, will be set by startGame/handleResetGame
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
    // Ref to store the current game mode
    const gameModeRef = useRef<GameMode | null>(null);
    // Refs to store current grid dimensions
    const brickColumnsRef = useRef<number>(BRICK_COLUMNS);
    const brickRowsRef = useRef<number>(BRICK_ROWS);


    // --- State ---
    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState); 
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(['MULTI_BALL']));
    const [showSidebar, setShowSidebar] = useState<boolean>(false);

    // Sync state with refs
    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';
    }, [gameOverState]);

    // --- Callbacks ---
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

    // Helper to reset common game elements based on mode
    const resetLevel = useCallback((mode: GameMode | null) => {
        const currentMode = mode ?? gameModeRef.current; // Use provided mode or stored mode
        if (!currentMode) return; // Should not happen if called after start/during reset

        // Determine dimensions based on mode
        const cols = currentMode === 'main' ? 4 : BRICK_COLUMNS;
        const rows = currentMode === 'main' ? 2 : BRICK_ROWS;
        
        // Update dimension refs
        brickColumnsRef.current = cols;
        brickRowsRef.current = rows;

        // Reset bricks with correct dimensions
        bricksRef.current = initializeBricks(cols, rows);

        // Reset other game elements
        powerUpsRef.current = [];
        lasersRef.current = [];
        scoreRef.current = 0;
        widenLevelRef.current = 0;
        laserShotsRef.current = 0;
        safetyNetCountRef.current = 0;
        gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
        collectionFieldHeightRef.current = FIELD_INITIAL_HEIGHT_OFFSET;
        collectionFieldWidthOffsetRef.current = FIELD_INITIAL_WIDTH_OFFSET;
        stickyPaddleChargesRef.current = 0; 

        setupInitialBall();

        // Reset start flag
        isGameStartedRef.current = false;

    }, [setupInitialBall]); // Dependency on setupInitialBall

    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false; 
        isGameStartedRef.current = false; // Ensure start flag is reset here too
        if (widenTimeoutRef.current) { clearTimeout(widenTimeoutRef.current); widenTimeoutRef.current = null; }
        if (collectionFieldShrinkTimerRef.current) { clearInterval(collectionFieldShrinkTimerRef.current); collectionFieldShrinkTimerRef.current = null; }

        // Re-initialize level based on the *last* played mode
        resetLevel(null); // Pass null to use the stored gameModeRef

        // Reset state variables
        setGameOverState('menu');
        setShowSidebar(false); 
        gameModeRef.current = null; // Clear the stored mode

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


    // --- Initial setup (Now handled by startGame) ---
    // useEffect(() => {
    //     setupInitialBall(); // Removed: Ball setup happens after bricks are ready
    // }, [setupInitialBall]); 

    // --- Start Game Function (Modified) ---
    const startGame = useCallback((mode: GameMode) => {
        if (gameOverStateRef.current === 'menu') {
            gameModeRef.current = mode; // Store the selected mode
            resetLevel(mode); // Initialize level based on mode
            setShowSidebar(mode === 'test');
            setGameOverState('playing');
        }
    }, [resetLevel]); // Depends on resetLevel


    // --- Return values ---
    const gameStateRefs: GameStateRefs = {
        paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, paddleWidthRef,
        widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        widenTimeoutRef, collectionFieldShrinkTimerRef,
        // Pass dimension refs
        brickColumnsRef, brickRowsRef, 
    };

    return {
        // State values
        gameOverState,
        enabledPowerUps,
        showSidebar,

        // State setters 
        setGameOverState, 
        
        // Callback functions
        updateScoreCallback,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        schedulePaddleShrink,
        scheduleFieldShrink,
        startGame,

        // Refs collection 
        gameStateRefs,
    };
}

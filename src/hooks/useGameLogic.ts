// src/hooks/useGameLogic.ts (Modified)
import { useRef, useCallback, useEffect, useState } from 'react'; // Keep useState for now for gameOverState etc.
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    PADDLE_WIDEN_INCREMENT, FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W,
    FIELD_SHRINK_INTERVAL
} from '../constants';
import { Ball, Brick, PowerUp, Laser, PowerUpType } from '../interfaces'; 
import { initializeBricks, initialBallState } from '../gameLogic';
import { calculateShrinkDuration } from '../gameUtils';

export interface GameStateRefs {
    // ... (keep existing refs definition)
    paddleXRef: React.MutableRefObject<number>;
    ballsRef: React.MutableRefObject<Ball[]>;
    bricksRef: React.MutableRefObject<Brick[][]>;
    powerUpsRef: React.MutableRefObject<PowerUp[]>;
    scoreRef: React.MutableRefObject<number>;
    paddleWidthRef: React.MutableRefObject<number>;
    widenLevelRef: React.MutableRefObject<number>;
    laserShotsRef: React.MutableRefObject<number>;
    lasersRef: React.MutableRefObject<Laser[]>;
    safetyNetCountRef: React.MutableRefObject<number>;
    gameIsRunningRef: React.MutableRefObject<boolean>;
    gameOverStateRef: React.MutableRefObject<'playing' | 'won' | 'lost'>;
    gameSpeedFactorRef: React.MutableRefObject<number>;
    collectionFieldHeightRef: React.MutableRefObject<number>;
    collectionFieldWidthOffsetRef: React.MutableRefObject<number>;
    stickyPaddleChargesRef: React.MutableRefObject<number>;
    stuckBallsRef: React.MutableRefObject<Ball[]>;
    enabledPowerUpsRef: React.MutableRefObject<Set<PowerUpType>>;
    isGameStartedRef: React.MutableRefObject<boolean>;
    widenTimeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    collectionFieldShrinkTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    animationFrameIdRef?: React.MutableRefObject<number | null>; 
    lastTimeRef?: React.MutableRefObject<number>; 
}


export function useGameLogic() {
    // --- Refs for mutable game state ---
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const bricksRef = useRef<Brick[][]>(initializeBricks());
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0); // Score managed solely by ref now
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

    // --- State (Score state removed) ---
    // const [score, setScore] = useState(0); // REMOVED
    const [gameOverState, setGameOverState] = useState<'playing' | 'won' | 'lost'>('playing');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(['MULTI_BALL']));

    // Sync state with refs where needed
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
        // setScore(s => s + points); // REMOVED - This caused re-renders
    }, []); // No dependencies needed

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
        // ... (no changes needed in this function)
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
        // ... (no changes needed in this function)
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

    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false; 
        isGameStartedRef.current = false; 
        if (widenTimeoutRef.current) { clearTimeout(widenTimeoutRef.current); widenTimeoutRef.current = null; }
        if (collectionFieldShrinkTimerRef.current) { clearInterval(collectionFieldShrinkTimerRef.current); collectionFieldShrinkTimerRef.current = null; }

        // Reset game state refs
        bricksRef.current = initializeBricks();
        powerUpsRef.current = [];
        lasersRef.current = [];
        scoreRef.current = 0; // Reset ref directly
        widenLevelRef.current = 0;
        laserShotsRef.current = 0;
        safetyNetCountRef.current = 0;
        gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
        collectionFieldHeightRef.current = FIELD_INITIAL_HEIGHT_OFFSET;
        collectionFieldWidthOffsetRef.current = FIELD_INITIAL_WIDTH_OFFSET;
        stickyPaddleChargesRef.current = 0; 

        setupInitialBall(); 

        // Reset state variables
        // setScore(0); // REMOVED
        setGameOverState('playing'); 

    }, [setupInitialBall]); 

    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        // ... (no changes needed in this function)
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


    // --- Initial setup ---
    useEffect(() => {
        setupInitialBall();
    }, [setupInitialBall]); 

    // --- Return values ---
    const gameStateRefs: GameStateRefs = {
        paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, paddleWidthRef,
        widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        widenTimeoutRef, collectionFieldShrinkTimerRef,
    };

    return {
        // State values
        // score, // REMOVED
        gameOverState,
        enabledPowerUps,

        // State setters (if needed externally)
        setGameOverState, 
        
        // Callback functions
        updateScoreCallback,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        schedulePaddleShrink,
        scheduleFieldShrink,

        // Refs collection 
        gameStateRefs,
    };
}

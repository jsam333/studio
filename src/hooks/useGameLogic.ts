// src/hooks/useGameLogic.ts
import { useRef, useCallback, useEffect, useState } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W, FIELD_SHRINK_INTERVAL,
    ALL_TOGGLEABLE_POWER_UPS
} from '../constants';
import { Ball, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs } from '../interfaces';
import { initialBallState } from '../gameLogic';
import { useLevelLogic } from './useLevelLogic';
import { usePaddleLogic } from './usePaddleLogic';

// Helper to get the PowerUpType for a specific Multiball level (1-3)
// Copied from ShopScreen for use here
const getMultiballPowerUpType = (level: number): PowerUpType | null => {
    const MAX_MULTIBALL_LEVEL = 3; // Define locally for this helper
    if (level < 1 || level > MAX_MULTIBALL_LEVEL) return null;
    if (level === 1) return 'MULTI_BALL';
    return `MULTI_BALL_L${level}` as PowerUpType; 
};

export function useGameLogic() {
    // --- Core Game State Refs ---
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const goldRef = useRef<number>(0);
    const spawnablePowerUpsRef = useRef<Set<PowerUpType>>(new Set());
    const gameIsRunningRef = useRef(false);
    const paddleWidthRef = useRef(INITIAL_PADDLE_WIDTH);
    const widenLevelRef = useRef(0);
    const paddleShrinkCountdownRef = useRef<number | null>(null);
    const laserShotsRef = useRef(0);
    const lasersRef = useRef<Laser[]>([]);
    const safetyNetCountRef = useRef(0);
    const gameSpeedFactorRef = useRef<number>(BASE_BALL_SPEED_FACTOR);
    const collectionFieldHeightRef = useRef<number>(FIELD_INITIAL_HEIGHT_OFFSET);
    const collectionFieldWidthOffsetRef = useRef<number>(FIELD_INITIAL_WIDTH_OFFSET);
    const collectionFieldShrinkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const stickyPaddleChargesRef = useRef(0);
    const stuckBallsRef = useRef<Ball[]>([]);
    const enabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(ALL_TOGGLEABLE_POWER_UPS)); // Used for Test Mode sidebar
    const isGameStartedRef = useRef(false);
    const gameModeRef = useRef<GameMode | null>(null);
    const currentLevelRef = useRef<number>(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // --- UI State ---
    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(ALL_TOGGLEABLE_POWER_UPS)); // Used for Test Mode sidebar UI
    const [showSidebar, setShowSidebar] = useState<boolean>(false);

    // --- Instantiate Paddle Logic Hook FIRST ---
    const {
        schedulePaddleShrink,
        executePaddleShrink,
        resetPaddle,
    } = usePaddleLogic({
        paddleXRef,
        paddleWidthRef,
        widenLevelRef,
        paddleShrinkCountdownRef,
    });

    // --- Define Callbacks that depend on child hooks SECOND ---
    const setupInitialBall = useCallback(() => {
        ballsRef.current = [];
        stuckBallsRef.current = [{
            ...initialBallState,
            id: Date.now()
        }];
        resetPaddle();
    }, [resetPaddle]);

    // --- Instantiate Level Logic Hook THIRD ---
    const {
        bricksRef,
        targetScoreRef,
        totalBricksRef,
        brickColumnsRef,
        brickRowsRef,
        bonusGoldRef,
        bonusCountdownStartedRef,
        clearBonusGoldTimers,
        startBonusGoldCountdown,
        resetLevel,
    } = useLevelLogic({
        gameModeRef,
        gameOverStateRef,
        currentLevelRef,
        scoreRef,
        goldRef,
        powerUpsRef,
        lasersRef,
        widenLevelRef,
        laserShotsRef,
        safetyNetCountRef,
        gameSpeedFactorRef,
        collectionFieldHeightRef,
        collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef,
        paddleShrinkCountdownRef,
        setupInitialBall,
        isGameStartedRef
    });

    // --- Effects ---
    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';
        if (gameOverState !== 'playing') {
            clearBonusGoldTimers();
            paddleShrinkCountdownRef.current = null;
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
                 gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
        }
    }, [gameOverState, clearBonusGoldTimers]); // Removed paddleShrinkCountdownRef dependency

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (gameOverStateRef.current === 'playing' && event.code === 'Space' && !event.repeat) {
                event.preventDefault();
            }
        };
        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                event.preventDefault();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
               gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
        };
    }, []);

    // --- Score Update ---
    const updateScoreCallback = useCallback((points: number) => {
        scoreRef.current += points;
    }, []);

    // --- Field Shrink Logic ---
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

    // --- Game Control Functions ---
    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false;
        isGameStartedRef.current = false;
        if (collectionFieldShrinkTimerRef.current) clearInterval(collectionFieldShrinkTimerRef.current);
        collectionFieldShrinkTimerRef.current = null;

        scoreRef.current = 0;
        goldRef.current = 0;
        spawnablePowerUpsRef.current = new Set(); // Reset spawnable power-ups
        currentLevelRef.current = 1;
        gameModeRef.current = null;

        resetLevel(null, true); 
        resetPaddle();

        setGameOverState('menu');
        setShowSidebar(false);
        setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS)); // Reset test mode sidebar toggles
        clearBonusGoldTimers();

    }, [resetLevel, resetPaddle, clearBonusGoldTimers]);

    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        if (gameOverStateRef.current !== 'playing' || stuckBallsRef.current.length === 0) return;
        const launchTime = Date.now();
        const currentPaddleX = paddleXRef.current;
        const currentPaddleWidth = paddleWidthRef.current;
        const launchedBalls = stuckBallsRef.current.map(ball => {
             const absoluteX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2);
             const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
             let resumedBlackEndTime = undefined; if (ball.isBlack && ball.blackPausedDuration) resumedBlackEndTime = launchTime + ball.blackPausedDuration;
             let resumedBlueEndTime = undefined; if (ball.isBlue && ball.bluePausedDuration) resumedBlueEndTime = launchTime + ball.bluePausedDuration;
             let resumedBigEndTime = undefined; if (ball.isBig && ball.bigPausedDuration) resumedBigEndTime = launchTime + ball.bigPausedDuration;
             let resumedSplittingEndTime = undefined; if (ball.isSplitting && ball.splittingPausedDuration) resumedSplittingEndTime = launchTime + ball.splittingPausedDuration;
             let launchSpeedX = 0;
             let launchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y);
             if (isInitialLaunch) {
                launchSpeedX = 3;
                isGameStartedRef.current = true;
                startBonusGoldCountdown();
             } else {
                launchSpeedX = 0;
             }
            return { ...ball, x: absoluteX, y: PADDLE_Y - currentBallSize - 1, speedY: launchSpeedY, speedX: launchSpeedX, stuckOffset: undefined, blackEndTime: resumedBlackEndTime ?? ball.blackEndTime, blueEndTime: resumedBlueEndTime ?? ball.blueEndTime, bigEndTime: resumedBigEndTime ?? ball.bigEndTime, splittingEndTime: resumedSplittingEndTime ?? ball.splittingEndTime, blackPausedDuration: undefined, bluePausedDuration: undefined, bigPausedDuration: undefined, splittingPausedDuration: undefined };
        });
        ballsRef.current.push(...launchedBalls);
        stuckBallsRef.current = [];
    }, [startBonusGoldCountdown]); // Added startBonusGoldCountdown dependency

    const handlePowerUpToggle = useCallback((type: PowerUpType) => {
        setEnabledPowerUps(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            return next;
        });
    }, []);

    const startGame = useCallback((mode: GameMode) => {
         if (gameOverStateRef.current === 'menu') {
            scoreRef.current = 0;
            goldRef.current = 0;
            // Initialize spawnablePowerUpsRef based on mode ONLY if it needs reset
            if (mode === 'main') {
                 spawnablePowerUpsRef.current = new Set(); 
             } else { // Test mode starts with all base power-ups available
                 spawnablePowerUpsRef.current = new Set(ALL_TOGGLEABLE_POWER_UPS);
             }
            currentLevelRef.current = 1;
            gameModeRef.current = mode;

            resetLevel(mode, false);

            setShowSidebar(mode === 'test');
            // Set enabledPowerUps for test mode UI sidebar
            setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS)); 
           
            setGameOverState('playing');
        }
    }, [resetLevel]);

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            scoreRef.current = 0; // Reset score for the new level
            currentLevelRef.current++;
            const nextMode: GameMode = 'main'; // Assume next level is main game mode
            gameModeRef.current = nextMode;

            resetLevel(nextMode, false); // Reset level state

            setShowSidebar(false);
            setGameOverState('playing');
        }
    }, [resetLevel]);

    // --- MODIFIED addSpawnablePowerUp --- 
    const addSpawnablePowerUp = useCallback((typeToAdd: PowerUpType) => {
        const currentSpawnables = spawnablePowerUpsRef.current;
        
        // Add the new type
        currentSpawnables.add(typeToAdd);

        // If the added type is a Multiball upgrade, remove lower levels
        if (typeToAdd.startsWith('MULTI_BALL')) {
            let levelAdded = 0;
            if (typeToAdd === 'MULTI_BALL') levelAdded = 1;
            else if (typeToAdd === 'MULTI_BALL_L2') levelAdded = 2;
            else if (typeToAdd === 'MULTI_BALL_L3') levelAdded = 3;
            // L4, L5 removed

            if (levelAdded > 0) {
                // Remove levels lower than the one just added
                for (let levelToRemove = 1; levelToRemove < levelAdded; levelToRemove++) {
                    const lowerLevelType = getMultiballPowerUpType(levelToRemove);
                    if (lowerLevelType) {
                        currentSpawnables.delete(lowerLevelType);
                        // console.log(`Removed ${lowerLevelType} from spawnables because ${typeToAdd} was added.`);
                    }
                }
            }
        }
        // No need to explicitly set the ref again, modification is done in place.
    }, []);


    // --- GameStateRefs (Updated) ---
    const gameStateRefs: IGameStateRefs = {
        paddleXRef, ballsRef, powerUpsRef, scoreRef, goldRef, spawnablePowerUpsRef,
        paddleWidthRef, widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        paddleShrinkCountdownRef,
        collectionFieldShrinkTimerRef,
        animationFrameIdRef, lastTimeRef,
        gameModeRef,
        currentLevelRef,
        bricksRef,
        targetScoreRef,
        totalBricksRef,
        brickColumnsRef,
        brickRowsRef,
        bonusGoldRef,
        bonusCountdownStartedRef,
    };

    return {
        gameOverState, enabledPowerUps, showSidebar, currentLevel: currentLevelRef.current,
        setGameOverState, updateScoreCallback, handleResetGame, launchStuckBalls, handlePowerUpToggle,
        schedulePaddleShrink, 
        scheduleFieldShrink,
        startGame, startNextLevel, addSpawnablePowerUp,
        executePaddleShrink, 
        gameStateRefs,
    };
}

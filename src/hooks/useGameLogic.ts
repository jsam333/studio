// src/hooks/useGameLogic.ts (Modified)
import { useRef, useCallback, useEffect, useState } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR, INITIAL_POWER_UP_SPEED,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    PADDLE_WIDEN_INCREMENT, FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W,
    FIELD_SHRINK_INTERVAL,
    BRICK_COLUMNS, BRICK_ROWS,
    BRICK_HEIGHT, TALL_BRICK_HEIGHT,
    BRICK_PADDING, TARGET_TOTAL_BRICK_GRID_HEIGHT,
    ALL_TOGGLEABLE_POWER_UPS
} from '../constants';
import { Ball, Brick, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs } from '../interfaces'; // GameState is imported here
import { initializeBricks, initialBallState } from '../gameLogic';
import { calculateShrinkDuration } from '../gameUtils';

// Constants for Bonus Gold
const INITIAL_BONUS_GOLD = 30;
const MINIMUM_BONUS_GOLD = 5; // Minimum bonus gold awarded
const BONUS_GOLD_START_DELAY = 10000; // Changed to 10 seconds (10000ms)
const BONUS_GOLD_DECREMENT_INTERVAL = 1000; // 1 second (1000ms)

export interface GameStateRefs extends IGameStateRefs {
    widenTimeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    collectionFieldShrinkTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    bonusGoldTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    bonusGoldDecrementIntervalRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    animationFrameIdRef?: React.MutableRefObject<number | null>;
    lastTimeRef?: React.MutableRefObject<number>;
    currentLevelRef: React.MutableRefObject<number>;
    bonusGoldRef: React.MutableRefObject<number>;
    bonusCountdownStartedRef: React.MutableRefObject<boolean>;
}

export function useGameLogic() {
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const bricksRef = useRef<Brick[][]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const totalBricksRef = useRef<number>(0);
    const goldRef = useRef<number>(0);
    const bonusGoldRef = useRef<number>(INITIAL_BONUS_GOLD);
    const bonusCountdownStartedRef = useRef<boolean>(false);
    const bonusGoldTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bonusGoldDecrementIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const spawnablePowerUpsRef = useRef<Set<PowerUpType>>(new Set());
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
    const enabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(ALL_TOGGLEABLE_POWER_UPS));
    const isGameStartedRef = useRef(false);
    const gameModeRef = useRef<GameMode | null>(null);
    const brickColumnsRef = useRef<number>(BRICK_COLUMNS);
    const brickRowsRef = useRef<number>(BRICK_ROWS);
    const currentLevelRef = useRef<number>(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(ALL_TOGGLEABLE_POWER_UPS));
    const [showSidebar, setShowSidebar] = useState<boolean>(false);

    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    const clearBonusGoldTimers = useCallback(() => {
        if (bonusGoldTimerRef.current) clearTimeout(bonusGoldTimerRef.current);
        if (bonusGoldDecrementIntervalRef.current) clearInterval(bonusGoldDecrementIntervalRef.current);
        bonusGoldTimerRef.current = null;
        bonusGoldDecrementIntervalRef.current = null;
        bonusCountdownStartedRef.current = false;
    }, []);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';
        if (gameOverState !== 'playing') {
            clearBonusGoldTimers();
            // Also reset speed if game ends while space is held
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
                 // No need to adjust speeds here, as game loop stops
                 gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
        }
    }, [gameOverState, clearBonusGoldTimers]);

    // Helper function to adjust speeds of balls and power-ups
    const adjustSpeeds = useCallback((ratio: number) => {
        ballsRef.current.forEach(ball => {
            ball.speedX *= ratio;
            ball.speedY *= ratio;
        });
        powerUpsRef.current.forEach(powerUp => {
             // Only adjust if power-up has a speed property (it should)
            if (powerUp.speedY !== undefined) {
                 powerUp.speedY *= ratio;
            }
        });
        // Note: Stuck balls' speeds are set on launch, so no need to adjust them here.
        // Lasers move instantly, so they are unaffected by game speed factor.
    }, []);


    // useEffect hook for spacebar speed control
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (gameOverStateRef.current === 'playing' && event.code === 'Space' && !event.repeat) { // Check !event.repeat
                event.preventDefault();
                if (gameSpeedFactorRef.current === BASE_BALL_SPEED_FACTOR) {
                    const newSpeedFactor = BASE_BALL_SPEED_FACTOR * 3; // Changed from 2 to 3
                    const ratio = newSpeedFactor / gameSpeedFactorRef.current;
                    gameSpeedFactorRef.current = newSpeedFactor;
                    adjustSpeeds(ratio); // Adjust speeds immediately (ratio will be 3)
                }
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                event.preventDefault();
                 // Check if the speed was indeed tripled by the spacebar
                if (gameSpeedFactorRef.current === BASE_BALL_SPEED_FACTOR * 3) { // Changed from 2 to 3
                    const newSpeedFactor = BASE_BALL_SPEED_FACTOR;
                    const ratio = newSpeedFactor / gameSpeedFactorRef.current; // Should be 1/3
                    gameSpeedFactorRef.current = newSpeedFactor;
                    adjustSpeeds(ratio); // Adjust speeds immediately
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            // Ensure speed resets and adjusts items if component unmounts while space is held
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
               const ratio = BASE_BALL_SPEED_FACTOR / gameSpeedFactorRef.current;
               adjustSpeeds(ratio); // Adjust speeds back to normal
               gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
        };
        // Add adjustSpeeds to dependency array as it's used inside the effect
    }, [adjustSpeeds]);


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
        // ... (no changes) ...
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
        // ... (no changes) ...
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

    const startBonusGoldCountdown = useCallback(() => {
        if (gameModeRef.current !== 'main' || bonusCountdownStartedRef.current) return;
        bonusCountdownStartedRef.current = true;
        clearBonusGoldTimers();
        bonusGoldTimerRef.current = setTimeout(() => {
            bonusGoldDecrementIntervalRef.current = setInterval(() => {
                // Stop decrementing if bonus reaches the minimum or game ends
                if (bonusGoldRef.current > MINIMUM_BONUS_GOLD && gameOverStateRef.current === 'playing') {
                    bonusGoldRef.current -= 1;
                } else {
                    if (bonusGoldDecrementIntervalRef.current) {
                        clearInterval(bonusGoldDecrementIntervalRef.current);
                        bonusGoldDecrementIntervalRef.current = null;
                    }
                }
            }, BONUS_GOLD_DECREMENT_INTERVAL);
        // Use updated start delay constant
        }, BONUS_GOLD_START_DELAY);
    }, [clearBonusGoldTimers]);

    const resetLevel = useCallback((mode: GameMode | null) => {
        // ... (brick setup logic remains the same) ...
        const currentMode = mode ?? gameModeRef.current;
        if (!currentMode) return;
        let cols = BRICK_COLUMNS; let rows = BRICK_ROWS; let targetHeight = BRICK_HEIGHT;
        if (currentMode === 'main') { const level = currentLevelRef.current; if (level === 1) { cols = 3; rows = 2; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 2) { cols = 4; rows = 3; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 3) { cols = 5; rows = 4; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 4) { cols = 7; rows = 5; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 5) { cols = 9; rows = 6; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 6) { cols = 11; rows = 7; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 7) { cols = 13; rows = 8; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 8) { cols = 15; rows = 9; targetHeight = TALL_BRICK_HEIGHT; } else if (level === 9) { cols = 17; rows = 10; targetHeight = TALL_BRICK_HEIGHT; } else { cols = 4; if (level === 10) { cols = 20; rows = 11; } else if (level === 11) { cols = 22; rows = 12; } else if (level === 12) { cols = 25; rows = 13; } else if (level === 13) { cols = 28; rows = 14; } else if (level === 14) { cols = 31; rows = 15; } else if (level === 15) { cols = 35; rows = 16; } else if (level === 16) { cols = 40; rows = 17; } else if (level === 17) { cols = 45; rows = 18; } else if (level === 18) { cols = 50; rows = 19; } else if (level === 19) { cols = 55; rows = 20; } else if (level === 20) { cols = 60; rows = 23; } else { rows = 7; } if (rows > 0) { targetHeight = (TARGET_TOTAL_BRICK_GRID_HEIGHT - (rows - 1) * BRICK_PADDING) / rows; targetHeight = Math.max(1, targetHeight); } else { targetHeight = BRICK_HEIGHT; } } } else { cols = BRICK_COLUMNS; rows = BRICK_ROWS; targetHeight = BRICK_HEIGHT; }
        brickColumnsRef.current = cols; brickRowsRef.current = rows; bricksRef.current = initializeBricks(cols, rows, targetHeight);
        let count = 0; for (let c = 0; c < bricksRef.current.length; c++) { if (bricksRef.current[c]) { for (let r = 0; r < bricksRef.current[c].length; r++) { if (bricksRef.current[c][r] && bricksRef.current[c][r].status === 1) { count++; } } } } totalBricksRef.current = count;
        powerUpsRef.current = []; lasersRef.current = []; widenLevelRef.current = 0; laserShotsRef.current = 0; safetyNetCountRef.current = 0; gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR; collectionFieldHeightRef.current = FIELD_INITIAL_HEIGHT_OFFSET; collectionFieldWidthOffsetRef.current = FIELD_INITIAL_WIDTH_OFFSET; stickyPaddleChargesRef.current = 0;
        setupInitialBall(); isGameStartedRef.current = false;
        bonusGoldRef.current = INITIAL_BONUS_GOLD; bonusCountdownStartedRef.current = false; clearBonusGoldTimers();
    }, [setupInitialBall, clearBonusGoldTimers]);

    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false; isGameStartedRef.current = false;
        if (widenTimeoutRef.current) clearTimeout(widenTimeoutRef.current); widenTimeoutRef.current = null;
        if (collectionFieldShrinkTimerRef.current) clearInterval(collectionFieldShrinkTimerRef.current); collectionFieldShrinkTimerRef.current = null;
        scoreRef.current = 0; totalBricksRef.current = 0; goldRef.current = 0;
        bonusGoldRef.current = INITIAL_BONUS_GOLD; clearBonusGoldTimers();
        spawnablePowerUpsRef.current = new Set(); currentLevelRef.current = 1;
        resetLevel(null); setGameOverState('menu'); setShowSidebar(false); gameModeRef.current = null;
        setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
        // Ensure speed is reset on game reset
        if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
            gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            // No need to call adjustSpeeds as entities are cleared in resetLevel
        }
    }, [resetLevel, clearBonusGoldTimers]);

    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        if (gameOverStateRef.current !== 'playing' || stuckBallsRef.current.length === 0) return;
        const launchTime = Date.now(); const currentPaddleX = paddleXRef.current; const currentPaddleWidth = paddleWidthRef.current; const gameSpeed = gameSpeedFactorRef.current; // Use current game speed
        const launchedBalls = stuckBallsRef.current.map(ball => {
             const absoluteX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2); const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
             let resumedBlackEndTime = undefined; if (ball.isBlack && ball.blackPausedDuration) resumedBlackEndTime = launchTime + ball.blackPausedDuration;
             let resumedBlueEndTime = undefined; if (ball.isBlue && ball.bluePausedDuration) resumedBlueEndTime = launchTime + ball.bluePausedDuration;
             let resumedBigEndTime = undefined; if (ball.isBig && ball.bigPausedDuration) resumedBigEndTime = launchTime + ball.bigPausedDuration;
             let resumedSplittingEndTime = undefined; if (ball.isSplitting && ball.splittingPausedDuration) resumedSplittingEndTime = launchTime + ball.splittingPausedDuration;
             let launchSpeedX = 0;
             // Apply game speed factor to the initial Y speed
             let launchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y * gameSpeed); // Use gameSpeed here
             if (isInitialLaunch) {
                // Apply game speed factor to the initial X speed as well
                launchSpeedX = 3 * gameSpeed; // Use gameSpeed here
                isGameStartedRef.current = true;
                startBonusGoldCountdown();
             } else {
                launchSpeedX = 0; // No horizontal speed for subsequent launches from sticky paddle
             }
            return { ...ball, x: absoluteX, y: PADDLE_Y - currentBallSize - 1, speedY: launchSpeedY, speedX: launchSpeedX, stuckOffset: undefined, blackEndTime: resumedBlackEndTime ?? ball.blackEndTime, blueEndTime: resumedBlueEndTime ?? ball.blueEndTime, bigEndTime: resumedBigEndTime ?? ball.bigEndTime, splittingEndTime: resumedSplittingEndTime ?? ball.splittingEndTime, blackPausedDuration: undefined, bluePausedDuration: undefined, bigPausedDuration: undefined, splittingPausedDuration: undefined };
        });
        ballsRef.current.push(...launchedBalls); stuckBallsRef.current = [];
    }, [startBonusGoldCountdown]); // gameSpeedFactorRef is a ref, doesn't need to be in dependency array

    const handlePowerUpToggle = useCallback((type: PowerUpType) => {
        setEnabledPowerUps(prev => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
    }, []);

    const startGame = useCallback((mode: GameMode) => {
         if (gameOverStateRef.current === 'menu') {
            scoreRef.current = 0; totalBricksRef.current = 0; goldRef.current = 0; bonusGoldRef.current = INITIAL_BONUS_GOLD; clearBonusGoldTimers();
            spawnablePowerUpsRef.current = mode === 'main' ? new Set() : new Set(ALL_TOGGLEABLE_POWER_UPS);
            currentLevelRef.current = 1; gameModeRef.current = mode;
            // Reset speed factor before resetting level (which initializes balls/powerups)
            gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            resetLevel(mode);
            setShowSidebar(mode === 'test');
            if (mode === 'test') setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
            setGameOverState('playing');
        }
    }, [resetLevel, clearBonusGoldTimers]);

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            currentLevelRef.current++; const nextMode: GameMode = 'main'; gameModeRef.current = nextMode;
            // Reset speed factor before resetting level
            gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            resetLevel(nextMode);
            setShowSidebar(false); setGameOverState('playing');
        }
    }, [resetLevel]);

    const addSpawnablePowerUp = useCallback((type: PowerUpType) => {
        spawnablePowerUpsRef.current.add(type);
    }, []);

    const gameStateRefs: GameStateRefs = {
        paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, totalBricksRef, goldRef, bonusGoldRef, bonusCountdownStartedRef, spawnablePowerUpsRef,
        paddleWidthRef, widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        widenTimeoutRef, collectionFieldShrinkTimerRef, bonusGoldTimerRef, bonusGoldDecrementIntervalRef,
        animationFrameIdRef, lastTimeRef,
        brickColumnsRef, brickRowsRef,
        gameModeRef,
        currentLevelRef,
    };

    return {
        gameOverState, enabledPowerUps, showSidebar, currentLevel: currentLevelRef.current,
        setGameOverState, updateScoreCallback, handleResetGame, launchStuckBalls, handlePowerUpToggle,
        schedulePaddleShrink, scheduleFieldShrink, startGame, startNextLevel, addSpawnablePowerUp,
        gameStateRefs,
    };
}

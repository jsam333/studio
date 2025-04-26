// src/hooks/useGameLogic.ts (Modified within resetLevel)
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
    ALL_TOGGLEABLE_POWER_UPS, POWER_UP_SIZE
} from '../constants';
import { Ball, Brick, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs } from '../interfaces';
import { initializeBricks, initialBallState } from '../gameLogic';
import { calculateShrinkDuration } from '../gameUtils';

// Constants for Bonus Gold
const INITIAL_BONUS_GOLD = 30;
const MINIMUM_BONUS_GOLD = 5;
const BONUS_GOLD_START_DELAY = 5000;
const BONUS_GOLD_DECREMENT_INTERVAL = 1000;

export function useGameLogic() {
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const bricksRef = useRef<Brick[][]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const targetScoreRef = useRef(0); 
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
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
                 gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
             paddleShrinkCountdownRef.current = null;
        }
    }, [gameOverState, clearBonusGoldTimers]);

    const schedulePaddleShrink = useCallback(() => {
        const currentWidth = paddleWidthRef.current;
        const duration = calculateShrinkDuration(currentWidth);
        paddleShrinkCountdownRef.current = duration;
    }, []);

    const executePaddleShrink = useCallback(() => {
        if (widenLevelRef.current > 0) {
            const oldWidth = paddleWidthRef.current;
            if (oldWidth > INITIAL_PADDLE_WIDTH) {
                const currentPaddleXLocal = paddleXRef.current;
                const newWidth = Math.max(INITIAL_PADDLE_WIDTH, oldWidth - PADDLE_WIDEN_INCREMENT);
                const widthDecrease = oldWidth - newWidth;
                let newPaddleX = currentPaddleXLocal + widthDecrease / 2;
                newPaddleX = Math.max(0, newPaddleX);
                newPaddleX = Math.min(BOARD_WIDTH - newWidth, newPaddleX);
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
                 paddleShrinkCountdownRef.current = null;
            }
        } else {
             paddleShrinkCountdownRef.current = null;
        }
    }, [schedulePaddleShrink]);


    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (gameOverStateRef.current === 'playing' && event.code === 'Space' && !event.repeat) {
                event.preventDefault();
                if (gameSpeedFactorRef.current === BASE_BALL_SPEED_FACTOR) {
                    gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR * 2;
                }
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            if (event.code === 'Space') {
                event.preventDefault();
                if (gameSpeedFactorRef.current === BASE_BALL_SPEED_FACTOR * 2) {
                    gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
                }
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

    const startBonusGoldCountdown = useCallback(() => {
        if (gameModeRef.current !== 'main' || bonusCountdownStartedRef.current) return;
        bonusCountdownStartedRef.current = true;
        clearBonusGoldTimers();
        bonusGoldTimerRef.current = setTimeout(() => {
            bonusGoldDecrementIntervalRef.current = setInterval(() => {
                if (bonusGoldRef.current > MINIMUM_BONUS_GOLD && gameOverStateRef.current === 'playing') {
                    bonusGoldRef.current -= 1;
                } else {
                    if (bonusGoldDecrementIntervalRef.current) {
                        clearInterval(bonusGoldDecrementIntervalRef.current);
                        bonusGoldDecrementIntervalRef.current = null;
                    }
                }
            }, BONUS_GOLD_DECREMENT_INTERVAL);
        }, BONUS_GOLD_START_DELAY);
    }, [clearBonusGoldTimers]);

    // --- MODIFIED: resetLevel function ---
    const resetLevel = useCallback((mode: GameMode | null) => {
        const currentMode = mode ?? gameModeRef.current;
        if (!currentMode) return;
        let cols = BRICK_COLUMNS; let rows = BRICK_ROWS; let targetHeight = BRICK_HEIGHT;
        const level = currentLevelRef.current; // Get current level

        // Define level layout
        if (currentMode === 'main') { 
             if (level === 1) { cols = 3; rows = 2; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 2) { cols = 4; rows = 3; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 3) { cols = 5; rows = 4; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 4) { cols = 7; rows = 5; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 5) { cols = 9; rows = 6; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 6) { cols = 11; rows = 7; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 7) { cols = 13; rows = 8; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 8) { cols = 15; rows = 9; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 9) { cols = 17; rows = 10; targetHeight = TALL_BRICK_HEIGHT; } 
             else { // Levels 10+ use calculated height
                 cols = 4; // Default starting columns for calculated height levels
                 if (level === 10) { cols = 20; rows = 11; } 
                 else if (level === 11) { cols = 22; rows = 12; } 
                 else if (level === 12) { cols = 25; rows = 13; } 
                 else if (level === 13) { cols = 28; rows = 14; } 
                 else if (level === 14) { cols = 31; rows = 15; } 
                 else if (level === 15) { cols = 35; rows = 16; } 
                 else if (level === 16) { cols = 40; rows = 17; } 
                 else if (level === 17) { cols = 45; rows = 18; } 
                 else if (level === 18) { cols = 50; rows = 19; } 
                 else if (level === 19) { cols = 55; rows = 20; } 
                 else if (level === 20) { cols = 60; rows = 23; } 
                 else { rows = 7; } // Default rows if level > 20 (adjust as needed)
                 
                 if (rows > 0) {
                     targetHeight = (TARGET_TOTAL_BRICK_GRID_HEIGHT - (rows - 1) * BRICK_PADDING) / rows;
                     targetHeight = Math.max(1, targetHeight); // Ensure minimum height
                 } else {
                     targetHeight = BRICK_HEIGHT; // Fallback default height
                 }
             }
        } else { // Test mode uses default constants
            cols = BRICK_COLUMNS; rows = BRICK_ROWS; targetHeight = BRICK_HEIGHT;
        }

        // Initialize bricks based on determined layout
        brickColumnsRef.current = cols; 
        brickRowsRef.current = rows;
        bricksRef.current = initializeBricks(cols, rows, targetHeight);

        // Calculate initial brick count
        let count = 0;
        for (let c = 0; c < bricksRef.current.length; c++) {
            if (bricksRef.current[c]) {
                for (let r = 0; r < bricksRef.current[c].length; r++) {
                    if (bricksRef.current[c]?.[r]?.status === 1) {
                        count++;
                    }
                }
            }
        }
        totalBricksRef.current = count;

        // Set target score: base count + adjustment for level 6
        let scoreGoal = count;
        if (currentMode === 'main' && level === 6) {
            scoreGoal += 10; 
        }
        if (currentMode === 'main' && level === 7) {
            scoreGoal += 20; 
        }
        if (currentMode === 'main' && level === 8) {
            scoreGoal += 40; 
        }
        if (currentMode === 'main' && level === 9) {
            scoreGoal += 100; 
        }
        if (currentMode === 'main' && level === 10) {
            scoreGoal += 200; 
        }
        if (currentMode === 'main' && level === 11) {
            scoreGoal += 400; 
        }
        if (currentMode === 'main' && level === 12) {
            scoreGoal += 600; 
        }
        if (currentMode === 'main' && level === 13) {
            scoreGoal += 800; 
        }
        if (currentMode === 'main' && level === 14) {
            scoreGoal += 1000; 
        }
        if (currentMode === 'main' && level === 15) {
            scoreGoal += 1300; 
        }
        if (currentMode === 'main' && level === 16) {
            scoreGoal += 1600; 
        }
        if (currentMode === 'main' && level === 17) {
            scoreGoal += 2000; 
        }
        if (currentMode === 'main' && level === 18) {
            scoreGoal += 3000; 
        }
        if (currentMode === 'main' && level === 19) {
            scoreGoal += 4000; 
        }
        if (currentMode === 'main' && level === 20) {
            scoreGoal += 5000; 
        }

        targetScoreRef.current = scoreGoal;

        // Reset other game state elements
        powerUpsRef.current = []; 
        lasersRef.current = []; 
        widenLevelRef.current = 0;
        laserShotsRef.current = 0; 
        safetyNetCountRef.current = 0;
        gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
        collectionFieldHeightRef.current = FIELD_INITIAL_HEIGHT_OFFSET;
        collectionFieldWidthOffsetRef.current = FIELD_INITIAL_WIDTH_OFFSET;
        stickyPaddleChargesRef.current = 0;
        paddleShrinkCountdownRef.current = null;
        setupInitialBall();
        isGameStartedRef.current = false;
        bonusGoldRef.current = INITIAL_BONUS_GOLD; 
        bonusCountdownStartedRef.current = false; 
        clearBonusGoldTimers();

    }, [setupInitialBall, clearBonusGoldTimers]);
    // --- END MODIFICATION ---


    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false; isGameStartedRef.current = false;
        if (collectionFieldShrinkTimerRef.current) clearInterval(collectionFieldShrinkTimerRef.current); collectionFieldShrinkTimerRef.current = null;
        paddleShrinkCountdownRef.current = null;
        scoreRef.current = 0; 
        targetScoreRef.current = 0; 
        totalBricksRef.current = 0; 
        goldRef.current = 0;
        bonusGoldRef.current = INITIAL_BONUS_GOLD; clearBonusGoldTimers();
        spawnablePowerUpsRef.current = new Set(); currentLevelRef.current = 1;
        resetLevel(null); 
        setGameOverState('menu'); setShowSidebar(false); gameModeRef.current = null;
        setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));

    }, [resetLevel, clearBonusGoldTimers]);


    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        if (gameOverStateRef.current !== 'playing' || stuckBallsRef.current.length === 0) return;
        const launchTime = Date.now(); const currentPaddleX = paddleXRef.current; const currentPaddleWidth = paddleWidthRef.current; 
        const launchedBalls = stuckBallsRef.current.map(ball => {
             const absoluteX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2); const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
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
        ballsRef.current.push(...launchedBalls); stuckBallsRef.current = [];
    }, [startBonusGoldCountdown]);

    const handlePowerUpToggle = useCallback((type: PowerUpType) => {
        setEnabledPowerUps(prev => { const next = new Set(prev); if (next.has(type)) next.delete(type); else next.add(type); return next; });
    }, []);

    const startGame = useCallback((mode: GameMode) => {
         if (gameOverStateRef.current === 'menu') {
            scoreRef.current = 0; 
            totalBricksRef.current = 0; goldRef.current = 0; bonusGoldRef.current = INITIAL_BONUS_GOLD; clearBonusGoldTimers();
            spawnablePowerUpsRef.current = mode === 'main' ? new Set() : new Set(ALL_TOGGLEABLE_POWER_UPS);
            currentLevelRef.current = 1; gameModeRef.current = mode;
            resetLevel(mode); 
            setShowSidebar(mode === 'test');
            if (mode === 'test') setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
            setGameOverState('playing');
        }
    }, [resetLevel, clearBonusGoldTimers]);

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            scoreRef.current = 0; // Reset score between levels
            currentLevelRef.current++; const nextMode: GameMode = 'main'; gameModeRef.current = nextMode;
            resetLevel(nextMode); 
            setShowSidebar(false); setGameOverState('playing');
        }
    }, [resetLevel]);

    const addSpawnablePowerUp = useCallback((type: PowerUpType) => {
        spawnablePowerUpsRef.current.add(type);
    }, []);

    const gameStateRefs: IGameStateRefs = {
        paddleXRef, ballsRef, bricksRef, powerUpsRef, scoreRef, targetScoreRef, 
        totalBricksRef, goldRef, bonusGoldRef, bonusCountdownStartedRef, spawnablePowerUpsRef,
        paddleWidthRef, widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        paddleShrinkCountdownRef,
        collectionFieldShrinkTimerRef, bonusGoldTimerRef, bonusGoldDecrementIntervalRef,
        animationFrameIdRef, lastTimeRef,
        brickColumnsRef, brickRowsRef,
        gameModeRef,
        currentLevelRef,
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

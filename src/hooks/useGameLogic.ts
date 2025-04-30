// src/hooks/useGameLogic.ts
import { useRef, useCallback, useEffect, useState } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W, FIELD_SHRINK_INTERVAL,
    ALL_TOGGLEABLE_POWER_UPS, PADDLE_HEIGHT, BOARD_HEIGHT // Added BOARD_HEIGHT
} from '../constants';
import { Ball, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs } from '../interfaces';
import { initialBallState } from '../gameLogic';
import { useLevelLogic } from './useLevelLogic';
import { usePaddleLogic } from './usePaddleLogic';

const MAX_UPGRADE_LEVEL = 3;

// Generic function to get PowerUpType for a given level
const getPowerUpTypeForLevel = (baseType: PowerUpType, level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_UPGRADE_LEVEL) return null;
    if (level === 1) return baseType;
    return `${baseType}_L${level}` as PowerUpType;
};

// *** Define UPGRADABLE_POWER_UPS here, visible to the entire hook scope ***
const UPGRADABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', 'WIDEN_PADDLE', 'LASER_PADDLE', 'STICKY_PADDLE',
    'REGEN_BRICK', 'SAFETY_NET', 'REINFORCE_BRICK', 'MAKE_SPECIAL', 'BLACK_BALL',
    'PIERCE_BALL', 'UPGRADE_BRICK', 'BUILDER_BALL', 'BIG_BALL', 'SPLITTING_BALL',
    'COLLECTION_FIELD', 'HOMING_BALL', 'BOMB_BRICK',
    'BALL_BRICK' // Added BALL_BRICK here
];

export function useGameLogic() {
    // --- Core Game State Refs ---
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const ballsRef = useRef<Ball[]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const scoreRef = useRef(0);
    const goldRef = useRef<number>(0);
    // *** Initialize spawnablePowerUpsRef for main game (empty initially) ***
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
    const currentLevelRef = useRef<number>(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);

    // --- UI State ---
    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(ALL_TOGGLEABLE_POWER_UPS));
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
        isGameStartedRef,
        spawnablePowerUpsRef // Pass the ref here
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
    }, [gameOverState, clearBonusGoldTimers]);

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
        spawnablePowerUpsRef.current = new Set(); // Reset spawnables on full game reset
        currentLevelRef.current = 1;
        gameModeRef.current = null;

        resetLevel(null, true);
        resetPaddle();

        setGameOverState('menu');
        setShowSidebar(false);
        setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
        clearBonusGoldTimers();

    }, [resetLevel, resetPaddle, clearBonusGoldTimers]);

    const launchStuckBalls = useCallback((isInitialLaunch = false) => {
        if (gameOverStateRef.current !== 'playing' || stuckBallsRef.current.length === 0) return;
        const launchTime = Date.now();
        const currentPaddleX = paddleXRef.current;
        const currentPaddleWidth = paddleWidthRef.current;

        const launchedBalls = stuckBallsRef.current.map(ball => {
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
            let launchX = 0, launchY = 0;
            // Set launchSpeedX conditionally based on initial launch
            const launchSpeedX = isInitialLaunch ? 3 : 0;
            const launchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y);

            if (ball.stuckSide) {
                 // Launching from side
                 const sideOffset = currentBallSize;
                 launchX = ball.stuckSide === 'left'
                     ? currentPaddleX - sideOffset
                     : currentPaddleX + currentPaddleWidth + sideOffset;
                 // Use the stored vertical offset relative to paddle center
                 launchY = PADDLE_Y + PADDLE_HEIGHT / 2 + (ball.stuckSideOffset ?? 0);
                 // Ensure ball is slightly outside paddle bounds visually
                 launchY = Math.min(BOARD_HEIGHT - currentBallSize -1, Math.max(currentBallSize + 1, launchY))

            } else {
                 // Launching from top
                 launchX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2);
                 launchY = PADDLE_Y - currentBallSize - 1; // Position just above the paddle
            }

            // Common launch logic
            if (isInitialLaunch && !isGameStartedRef.current) {
                isGameStartedRef.current = true;
                startBonusGoldCountdown();
            }

            let resumedBlackEndTime = undefined; if (ball.isBlack && ball.blackPausedDuration) resumedBlackEndTime = launchTime + ball.blackPausedDuration;
            let resumedBlueEndTime = undefined; if (ball.isBlue && ball.bluePausedDuration) resumedBlueEndTime = launchTime + ball.bluePausedDuration;
            let resumedBigEndTime = undefined; if (ball.isBig && ball.bigPausedDuration) resumedBigEndTime = launchTime + ball.bigPausedDuration;
            let resumedSplittingEndTime = undefined; if (ball.isSplitting && ball.splittingPausedDuration) resumedSplittingEndTime = launchTime + ball.splittingPausedDuration;

            return {
                ...ball,
                x: launchX,
                y: launchY,
                speedX: launchSpeedX, // Now conditional
                speedY: launchSpeedY,
                stuckOffset: undefined,
                stuckSide: null,
                stuckSideOffset: undefined,
                blackEndTime: resumedBlackEndTime ?? ball.blackEndTime,
                blueEndTime: resumedBlueEndTime ?? ball.blueEndTime,
                bigEndTime: resumedBigEndTime ?? ball.bigEndTime,
                splittingEndTime: resumedSplittingEndTime ?? ball.splittingEndTime,
                blackPausedDuration: undefined,
                bluePausedDuration: undefined,
                bigPausedDuration: undefined,
                splittingPausedDuration: undefined
            };
        });
        ballsRef.current.push(...launchedBalls);
        stuckBallsRef.current = [];
    }, [startBonusGoldCountdown]);

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
            if (mode === 'main') {
                 // Main game starts with NO spawnable power-ups (must be bought)
                 spawnablePowerUpsRef.current = new Set();
             } else {
                 // Test mode starts with ALL spawnable power-ups
                 spawnablePowerUpsRef.current = new Set(ALL_TOGGLEABLE_POWER_UPS);
             }
            currentLevelRef.current = 1;
            gameModeRef.current = mode;

            resetLevel(mode, false); // Pass mode to resetLevel

            setShowSidebar(mode === 'test');
            setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));

            setGameOverState('playing');
        }
    }, [resetLevel]);

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            scoreRef.current = 0;
            currentLevelRef.current++;
            const nextMode: GameMode = 'main';
            gameModeRef.current = nextMode;

            resetLevel(nextMode, false); // Pass mode to resetLevel

            setShowSidebar(false);
            setGameOverState('playing');
        }
    }, [resetLevel]);

    // --- Corrected addSpawnablePowerUp --- 
    const addSpawnablePowerUp = useCallback((typeToAdd: PowerUpType) => {
        const currentSpawnables = spawnablePowerUpsRef.current;
        currentSpawnables.add(typeToAdd);

        // Generic handler for removing lower levels of upgradable power-ups
        const handleUpgrade = (baseType: string) => {
            // Check if the added type belongs to this upgrade family
            if (typeToAdd.startsWith(baseType)) {
                let levelAdded = 0;
                if (typeToAdd === baseType) levelAdded = 1;
                else {
                    const match = typeToAdd.match(/_L(\d+)$/);
                    if (match) levelAdded = parseInt(match[1], 10);
                }

                // Remove levels lower than the one just added
                if (levelAdded > 0 && levelAdded <= MAX_UPGRADE_LEVEL) {
                    for (let levelToRemove = 1; levelToRemove < levelAdded; levelToRemove++) {
                        const lowerLevelType = getPowerUpTypeForLevel(baseType as PowerUpType, levelToRemove);
                        if (lowerLevelType) {
                            currentSpawnables.delete(lowerLevelType);
                        }
                    }
                }
            }
        };

        // Apply handler for ALL upgradable base types (using the array defined at the hook level)
        UPGRADABLE_POWER_UPS.forEach(baseType => {
            handleUpgrade(baseType);
        });

        // Optional: Force UI update if spawnablePowerUpsRef changes need to reflect immediately
        // This depends on how ShopScreen consumes this state. If it reads directly from the ref
        // on re-render, this might not be needed. If it relies on state, you might need:
        // setSpawnablePowerUps(new Set(currentSpawnables)); // Assuming a state setter exists

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

// Removed the redundant definition of UPGRADABLE_POWER_UPS at the bottom

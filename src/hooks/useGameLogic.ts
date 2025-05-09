// src/hooks/useGameLogic.ts
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W, FIELD_SHRINK_INTERVAL,
    ALL_TOGGLEABLE_POWER_UPS, PADDLE_HEIGHT, BOARD_HEIGHT
} from '../constants';
import { Ball, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs, GameLoopCallbacks, PointsField } from '../interfaces';
import { initialBallState } from '../gameLogic';
import { useLevelLogic } from './useLevelLogic';
import { usePaddleLogic } from './usePaddleLogic';

const MAX_UPGRADE_LEVEL = 3;
const INITIAL_LIVES = 3;

const getPowerUpTypeForLevel = (baseType: PowerUpType, level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_UPGRADE_LEVEL) return null;
    if (level === 1) return baseType;
    return `${baseType}_L${level}` as PowerUpType;
};

// Moved UPGRADABLE_POWER_UPS to be defined once, accessible by functions in this module scope
const UPGRADABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', 'WIDEN_PADDLE', 'LASER_PADDLE', 'STICKY_PADDLE',
    'REGEN_BRICK', 'SAFETY_NET', 'REINFORCE_BRICK', 'MAKE_SPECIAL', 'BLACK_BALL',
    'PIERCE_BALL', 'UPGRADE_BRICK', 'BUILDER_BALL', 'BIG_BALL', 'SPLITTING_BALL',
    'COLLECTION_FIELD', 'HOMING_BALL', 'BOMB_BRICK',
    'BALL_BRICK',
    'POINTS_FIELD' // Ensure POINTS_FIELD is here
];

export function useGameLogic() {
    // Core Game State Refs
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
    const enabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(ALL_TOGGLEABLE_POWER_UPS));
    const isGameStartedRef = useRef(false);
    const gameModeRef = useRef<GameMode | null>(null);
    const currentLevelRef = useRef<number>(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const livesRef = useRef<number>(INITIAL_LIVES);
    const bonusGoldTimerCountdownRef = useRef<number | null>(null);
    const initialBonusGoldDecrementCompleteRef = useRef<boolean>(false);
    const firstTestRunCompletedRef = useRef<boolean>(false);
    const pointsFieldsRef = useRef<PointsField[]>([]);

    // UI State
    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(ALL_TOGGLEABLE_POWER_UPS));
    const [showSidebar, setShowSidebar] = useState<boolean>(false);

    // Paddle Logic Hook
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

    // Callbacks
    const setupInitialBall = useCallback(() => {
        ballsRef.current = [];
        stuckBallsRef.current = [{
            ...initialBallState,
            id: Date.now()
        }];
        resetPaddle();
    }, [resetPaddle]);

    // Level Logic Hook
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
        spawnablePowerUpsRef,
        initialBonusGoldDecrementCompleteRef,
    });

    // Effects
    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';

        if (gameOverState === 'level_reset') {
            livesRef.current--;
            resetLevel(gameModeRef.current, true);
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = []; 
            setGameOverState('playing');
        } else if (gameOverState !== 'playing') {
            paddleShrinkCountdownRef.current = null;
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = []; 
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
                 gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameOverState, resetLevel]); // Intentionally omitting gameModeRef from deps as resetLevel handles it

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

    const updateScoreCallback = useCallback((points: number) => {
        scoreRef.current += points;
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

    const resetBonusGoldCallback = useCallback(() => {
        bonusGoldRef.current = 0;
        bonusGoldTimerCountdownRef.current = null;
        bonusCountdownStartedRef.current = false;
        initialBonusGoldDecrementCompleteRef.current = false;
        ballsRef.current = [];
        stuckBallsRef.current = [];
    }, [bonusGoldRef, bonusGoldTimerCountdownRef, bonusCountdownStartedRef, initialBonusGoldDecrementCompleteRef, ballsRef, stuckBallsRef]);

    const handleResetGame = useCallback(() => {
        gameIsRunningRef.current = false;
        isGameStartedRef.current = false;
        if (collectionFieldShrinkTimerRef.current) clearInterval(collectionFieldShrinkTimerRef.current);
        collectionFieldShrinkTimerRef.current = null;

        scoreRef.current = 0;
        goldRef.current = 0;
        spawnablePowerUpsRef.current = new Set();
        currentLevelRef.current = 1;
        livesRef.current = INITIAL_LIVES;
        bonusGoldTimerCountdownRef.current = null;
        initialBonusGoldDecrementCompleteRef.current = false;
        pointsFieldsRef.current = []; 

        resetLevel(null, true);
        resetPaddle();

        setGameOverState('menu');
        setShowSidebar(false);
        if (gameModeRef.current !== 'test') {
            setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
            firstTestRunCompletedRef.current = false; 
        }
        gameModeRef.current = null;
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
            const launchSpeedX = isInitialLaunch ? 3 : 0;
            const launchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y);

            if (ball.stuckSide) {
                 const sideOffset = currentBallSize;
                 launchX = ball.stuckSide === 'left'
                     ? currentPaddleX - sideOffset
                     : currentPaddleX + currentPaddleWidth + sideOffset;
                 launchY = PADDLE_Y + PADDLE_HEIGHT / 2 + (ball.stuckSideOffset ?? 0);
                 launchY = Math.min(BOARD_HEIGHT - currentBallSize -1, Math.max(currentBallSize + 1, launchY))
            } else {
                 launchX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2);
                 launchY = PADDLE_Y - currentBallSize - 1;
            }

            if (isInitialLaunch && !isGameStartedRef.current) {
                isGameStartedRef.current = true;
                if (gameModeRef.current === 'main') {
                    startBonusGoldCountdown();
                }
            }

            let resumedBlackEndTime = undefined; if (ball.isBlack && ball.blackPausedDuration) resumedBlackEndTime = launchTime + ball.blackPausedDuration;
            let resumedBlueEndTime = undefined; if (ball.isBlue && ball.bluePausedDuration) resumedBlueEndTime = launchTime + ball.bluePausedDuration;
            let resumedBigEndTime = undefined; if (ball.isBig && ball.bigPausedDuration) resumedBigEndTime = launchTime + ball.bigPausedDuration;
            let resumedSplittingEndTime = undefined; if (ball.isSplitting && ball.splittingPausedDuration) resumedSplittingEndTime = launchTime + ball.splittingPausedDuration;

            return {
                ...ball,
                x: launchX,
                y: launchY,
                speedX: launchSpeedX,
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
            livesRef.current = INITIAL_LIVES;
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = []; 

            if (mode === 'main') {
                 spawnablePowerUpsRef.current = new Set();
                 setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS)); 
                 firstTestRunCompletedRef.current = false; 
             } else if (mode === 'test') {
                 spawnablePowerUpsRef.current = new Set(ALL_TOGGLEABLE_POWER_UPS);
                 if (!firstTestRunCompletedRef.current) {
                     setEnabledPowerUps(new Set(['MULTI_BALL'] as PowerUpType[])); // Example: Only enable MULTI_BALL initially for test
                     firstTestRunCompletedRef.current = true;
                 } 
             }

            currentLevelRef.current = 1;
            gameModeRef.current = mode;
            resetLevel(mode, true);
            setShowSidebar(mode === 'test');
            setGameOverState('playing');
        }
    }, [resetLevel]);

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            scoreRef.current = 0;
            currentLevelRef.current++;
            const nextMode: GameMode = 'main';
            gameModeRef.current = nextMode;
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = []; 

            resetLevel(nextMode, false);

            setShowSidebar(false);
            setGameOverState('playing');
        }
    }, [resetLevel]);

    const addSpawnablePowerUp = useCallback((typeToAdd: PowerUpType) => {
        const currentSpawnables = spawnablePowerUpsRef.current;
        currentSpawnables.add(typeToAdd);

        const handleUpgrade = (baseTypeStr: string) => {
            const baseType = baseTypeStr as PowerUpType;
            if (typeToAdd.startsWith(baseType)) {
                let levelAdded = 0;
                if (typeToAdd === baseType) levelAdded = 1;
                else {
                    const match = typeToAdd.match(/_L(\d+)$/);
                    if (match) levelAdded = parseInt(match[1], 10);
                }
                if (levelAdded > 0 && levelAdded <= MAX_UPGRADE_LEVEL) {
                    for (let levelToRemove = 1; levelToRemove < levelAdded; levelToRemove++) {
                        const lowerLevelType = getPowerUpTypeForLevel(baseType, levelToRemove);
                        if (lowerLevelType) {
                            currentSpawnables.delete(lowerLevelType);
                        }
                    }
                }
            }
        };
        UPGRADABLE_POWER_UPS.forEach(baseType => {
            handleUpgrade(baseType);
        });
    }, []);

    const resetLevelCallback = useCallback((mode: GameMode | null, resetScoreAndGold: boolean) => {
        bonusGoldTimerCountdownRef.current = null;
        initialBonusGoldDecrementCompleteRef.current = false;
        pointsFieldsRef.current = []; 
        resetLevel(mode, resetScoreAndGold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetLevel]); // bonusCountdownStartedRef removed as it's managed by startBonusGoldCountdown

    const gameStateRefs: IGameStateRefs = useMemo(() => ({
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
        livesRef,
        bonusGoldTimerCountdownRef,
        initialBonusGoldDecrementCompleteRef,
        // firstTestRunCompletedRef, // This ref seems not used outside this hook, consider localizing if true
        pointsFieldsRef,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [/* All refs listed explicitly to satisfy exhaustive-deps, or disable rule */
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
        livesRef,
        bonusGoldTimerCountdownRef,
        initialBonusGoldDecrementCompleteRef,
        pointsFieldsRef,
    ]);

    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: GameState, finalScore: number) => { 
        // This function is a placeholder. The actual drawing should be passed from the parent component.
        // For now, just log or clear to avoid errors.
        // context.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        // console.warn("drawEndMessage called within useGameLogic, ideally passed from parent."); 
    }, []);

    const gameLoopCallbacks: GameLoopCallbacks = useMemo(() => ({
        updateScoreCallback,
        setGameOverState,
        schedulePaddleShrink,
        executePaddleShrink,
        scheduleFieldShrink,
        resetLevelCallback,
        drawEndMessage: drawEndMessageCallback, 
        resetBonusGoldCallback,
    }), [
        updateScoreCallback, setGameOverState, schedulePaddleShrink, executePaddleShrink, 
        scheduleFieldShrink, resetLevelCallback, drawEndMessageCallback, resetBonusGoldCallback
    ]);

    return {
        gameOverState,
        enabledPowerUps,
        showSidebar,
        currentLevel: currentLevelRef.current,
        setGameOverState,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        startGame,
        startNextLevel,
        addSpawnablePowerUp,
        gameStateRefs, 
        gameLoopCallbacks, 
        lives: livesRef.current,
        score: scoreRef.current,
        gold: goldRef.current,
    };
}

// src/hooks/useGameLogic.ts
import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W, FIELD_SHRINK_INTERVAL,
    ALL_TOGGLEABLE_POWER_UPS, PADDLE_HEIGHT, BOARD_HEIGHT,
    INITIAL_TEST_POWER_UP_SPAWN_CHANCE,
    BRICK_COLUMNS as DEFAULT_BRICK_COLUMNS 
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

const UPGRADABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', 'WIDEN_PADDLE', 'LASER_PADDLE', 'RECOVERY_PADDLE',
    'REGEN_BRICK', 'SAFETY_NET', 'REINFORCE_BRICK', 'MAKE_SPECIAL', 'BLACK_BALL',
    'PIERCE_BALL', 'UPGRADE_BRICK', 'BUILDER_BALL', 'BIG_BALL', 'SPLITTING_BALL',
    'COLLECTION_FIELD', 'HOMING_BALL', 'BOMB_BRICK',
    'BALL_BRICK',
    'POINTS_FIELD'
];

export function useGameLogic() {
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
    const testPreviewInitialLaunchDoneRef = useRef(false); 
    const gameModeRef = useRef<GameMode | null>(null); 
    const currentLevelRef = useRef<number>(1);
    const animationFrameIdRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const livesRef = useRef<number>(INITIAL_LIVES);
    const bonusGoldTimerCountdownRef = useRef<number | null>(null);
    const initialBonusGoldDecrementCompleteRef = useRef<boolean>(false);
    const firstTestRunCompletedRef = useRef<boolean>(false);
    const pointsFieldsRef = useRef<PointsField[]>([]);
    const levelCompletionProcessedRef = useRef<boolean>(false);
    const testPowerUpSpawnChanceRef = useRef<number>(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 
    const testBrickColumnsRef = useRef<number>(DEFAULT_BRICK_COLUMNS); 

    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(ALL_TOGGLEABLE_POWER_UPS));
    const [showSidebar, setShowSidebar] = useState<boolean>(false);
    const [activeGameMode, setActiveGameMode] = useState<GameMode | null>(null);
    const [testPowerUpSpawnChance, setTestPowerUpSpawnChance] = useState<number>(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 
    const [testBrickColumns, setTestBrickColumns] = useState<number>(DEFAULT_BRICK_COLUMNS); 

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

    const setupInitialBall = useCallback(() => {
        ballsRef.current = [];
        stuckBallsRef.current = [{
            ...initialBallState,
            id: Date.now()
        }];
        resetPaddle();
    }, [resetPaddle]);

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
        testBrickColumnsRef,
    });

    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    useEffect(() => {
        testPowerUpSpawnChanceRef.current = testPowerUpSpawnChance;
    }, [testPowerUpSpawnChance]);

    // This useEffect ensures testBrickColumnsRef is generally in sync with the state.
    // For immediate resets triggered by column input, startGame will handle the ref directly.
    useEffect(() => {
        testBrickColumnsRef.current = testBrickColumns;
    }, [testBrickColumns]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';

        if (gameOverState === 'lost' && activeGameMode === 'test') {
            resetLevel(activeGameMode, true); 
            testPreviewInitialLaunchDoneRef.current = false; 
            setGameOverState('menu'); 
            return; 
        }

        if (gameOverState === 'level_reset') {
            livesRef.current--;
            scoreRef.current = 0;
            resetLevel(gameModeRef.current, false);
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = [];
            levelCompletionProcessedRef.current = false;
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
    }, [gameOverState, resetLevel, activeGameMode, setGameOverState]);

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
        testPreviewInitialLaunchDoneRef.current = false; 
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
        levelCompletionProcessedRef.current = false;
        testPowerUpSpawnChanceRef.current = INITIAL_TEST_POWER_UP_SPAWN_CHANCE; 
        setTestPowerUpSpawnChance(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 
        testBrickColumnsRef.current = DEFAULT_BRICK_COLUMNS; 
        setTestBrickColumns(DEFAULT_BRICK_COLUMNS); 

        resetLevel(null, true); 
        resetPaddle();

        setActiveGameMode(null); 
        setGameOverState('menu');
        setShowSidebar(false);
        setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
        firstTestRunCompletedRef.current = false; 
        
        gameModeRef.current = null; 
        clearBonusGoldTimers();

    }, [resetLevel, resetPaddle, clearBonusGoldTimers, setGameOverState, setActiveGameMode, setShowSidebar, setEnabledPowerUps]);

    const launchStuckBalls = useCallback((isInitialLaunchArgument = false) => { 
        const isTestModePreview = activeGameMode === 'test' && gameOverStateRef.current === 'menu';
        if (!((gameOverStateRef.current === 'playing') || isTestModePreview) || stuckBallsRef.current.length === 0) return;
        
        const launchTime = Date.now();
        const currentPaddleX = paddleXRef.current;
        const currentPaddleWidth = paddleWidthRef.current;

        let trulyInitialLaunch = false;
        let launchSpeedX = 0;
        const launchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y);

        if (isTestModePreview) {
            if (!testPreviewInitialLaunchDoneRef.current) {
                launchSpeedX = 3; 
                testPreviewInitialLaunchDoneRef.current = true;
                trulyInitialLaunch = true; 
            } else {
                launchSpeedX = 0; 
            }
        } else { 
            if (isInitialLaunchArgument) { 
                launchSpeedX = 3;
                trulyInitialLaunch = true;
            } else {
                launchSpeedX = 0;
            }
        }

        const launchedBalls = stuckBallsRef.current.map(ball => {
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
            let currentLaunchX = 0, currentLaunchY = 0;

            if (ball.stuckSide) {
                 const sideOffset = currentBallSize;
                 currentLaunchX = ball.stuckSide === 'left'
                     ? currentPaddleX - sideOffset
                     : currentPaddleX + currentPaddleWidth + sideOffset;
                 currentLaunchY = PADDLE_Y + PADDLE_HEIGHT / 2 + (ball.stuckSideOffset ?? 0);
                 currentLaunchY = Math.min(BOARD_HEIGHT - currentBallSize -1, Math.max(currentBallSize + 1, currentLaunchY))
            } else {
                 currentLaunchX = currentPaddleX + (ball.stuckOffset ?? currentPaddleWidth / 2);
                 currentLaunchY = PADDLE_Y - currentBallSize - 1;
            }

            if (trulyInitialLaunch && !isGameStartedRef.current) {
                if (!isTestModePreview) { 
                    isGameStartedRef.current = true;
                    if (gameModeRef.current === 'main') {
                        startBonusGoldCountdown();
                    }
                }
            }

            let resumedBlackEndTime = undefined; if (ball.isBlack && ball.blackPausedDuration) resumedBlackEndTime = launchTime + ball.blackPausedDuration;
            let resumedBlueEndTime = undefined; if (ball.isBlue && ball.bluePausedDuration) resumedBlueEndTime = launchTime + ball.bluePausedDuration;
            let resumedBigEndTime = undefined; if (ball.isBig && ball.bigPausedDuration) resumedBigEndTime = launchTime + ball.bigPausedDuration;
            let resumedSplittingEndTime = undefined; if (ball.isSplitting && ball.splittingPausedDuration) resumedSplittingEndTime = launchTime + ball.splittingPausedDuration;

            return {
                ...ball,
                x: currentLaunchX,
                y: currentLaunchY,
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
    }, [startBonusGoldCountdown, activeGameMode, gameOverStateRef]);

    const handlePowerUpToggle = useCallback((type: PowerUpType) => {
        setEnabledPowerUps(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            return next;
        });
    }, []);

    // Modified startGame to accept optional newTestBrickColumns
    const startGame = useCallback((mode: GameMode, newTestBrickColumns?: number) => {
        if (gameOverStateRef.current === 'menu' || mode === 'test') {
            scoreRef.current = 0;
            goldRef.current = 0;
            livesRef.current = INITIAL_LIVES;
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = [];
            levelCompletionProcessedRef.current = false;
            testPreviewInitialLaunchDoneRef.current = false; 
            testPowerUpSpawnChanceRef.current = INITIAL_TEST_POWER_UP_SPAWN_CHANCE; 
            setTestPowerUpSpawnChance(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 

            if (mode === 'test' && newTestBrickColumns !== undefined) {
                testBrickColumnsRef.current = newTestBrickColumns;
                // setTestBrickColumns(newTestBrickColumns); // Also update state if direct ref manipulation is too fast for other useEffects
            } else if (mode === 'test') {
                // If no newTestBrickColumns passed, ensure ref is synced with current state for other startGame calls
                testBrickColumnsRef.current = testBrickColumns; 
            }

            gameModeRef.current = mode; 
            setActiveGameMode(mode); 

            if (mode === 'main') {
                 spawnablePowerUpsRef.current = new Set();
                 setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS));
                 firstTestRunCompletedRef.current = false;
                 setShowSidebar(false);
                 setGameOverState('playing');
                 isGameStartedRef.current = false; 
             } else if (mode === 'test') {
                 spawnablePowerUpsRef.current = new Set(ALL_TOGGLEABLE_POWER_UPS);
                 if (!firstTestRunCompletedRef.current) {
                     setEnabledPowerUps(new Set(['MULTI_BALL'] as PowerUpType[]));
                 }
                 setShowSidebar(true);
                 setGameOverState('menu'); 
                 isGameStartedRef.current = false; 
             }

            currentLevelRef.current = 1; 
            resetLevel(mode, true); 
            if (mode === 'test') {
                setupInitialBall(); 
            }
        }
    }, [resetLevel, setupInitialBall, setActiveGameMode, setEnabledPowerUps, setShowSidebar, setGameOverState, testBrickColumns]); // Added testBrickColumns to dep array

    const startNextLevel = useCallback(() => {
        if (gameOverStateRef.current === 'shop') {
            scoreRef.current = 0;
            currentLevelRef.current++;
            const nextMode: GameMode = 'main';
            gameModeRef.current = nextMode;
            setActiveGameMode(nextMode);
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = [];
            levelCompletionProcessedRef.current = false;
            testPreviewInitialLaunchDoneRef.current = false; 
            testPowerUpSpawnChanceRef.current = INITIAL_TEST_POWER_UP_SPAWN_CHANCE; 
            setTestPowerUpSpawnChance(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 
            testBrickColumnsRef.current = DEFAULT_BRICK_COLUMNS; 
            setTestBrickColumns(DEFAULT_BRICK_COLUMNS); 

            resetLevel(nextMode, false);
            isGameStartedRef.current = false; 

            setShowSidebar(false);
            setGameOverState('playing');
        }
    }, [resetLevel, setActiveGameMode, setShowSidebar, setGameOverState]); 

    const addSpawnablePowerUp = useCallback((typeToAdd: PowerUpType) => {
        const currentSpawnables = spawnablePowerUpsRef.current;
        const currentActiveGameMode = gameModeRef.current; 

        currentSpawnables.add(typeToAdd);

        if (currentActiveGameMode === 'main') {
            const baseTypeStr = typeToAdd.split('_L')[0];
            const isUpgradable = UPGRADABLE_POWER_UPS.some(up => up === baseTypeStr);

            if (isUpgradable) {
                const baseType = baseTypeStr as PowerUpType;
                let levelAdded = 0;
                if (typeToAdd === baseType) {
                    levelAdded = 1;
                } else {
                    const match = typeToAdd.match(/_L(\d+)$/);
                    if (match) levelAdded = parseInt(match[1], 10);
                }

                if (levelAdded > 0 && levelAdded <= MAX_UPGRADE_LEVEL) {
                    for (let levelToRemove = 1; levelToRemove <= MAX_UPGRADE_LEVEL; levelToRemove++) {
                        if (levelToRemove !== levelAdded) {
                            const otherLevelType = getPowerUpTypeForLevel(baseType, levelToRemove);
                            if (otherLevelType && currentSpawnables.has(otherLevelType)) {
                                currentSpawnables.delete(otherLevelType);
                            }
                        }
                    }
                }
            }
        }
    }, []);

    const resetLevelCallback = useCallback((mode: GameMode | null, resetScoreAndGold: boolean) => {
        bonusGoldTimerCountdownRef.current = null;
        initialBonusGoldDecrementCompleteRef.current = false;
        pointsFieldsRef.current = [];
        resetLevel(mode, resetScoreAndGold);
        isGameStartedRef.current = false; 
        if (mode === 'test' || (gameModeRef.current === 'test' && mode === null)) { 
            testPreviewInitialLaunchDoneRef.current = false;
        }
    }, [resetLevel]);

    const gameStateRefs: IGameStateRefs = useMemo(() => ({
        paddleXRef, ballsRef, powerUpsRef, scoreRef, goldRef, spawnablePowerUpsRef,
        paddleWidthRef, widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        testPreviewInitialLaunchDoneRef, 
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
        levelCompletionProcessedRef,
        testPowerUpSpawnChanceRef, 
        testBrickColumnsRef, 
    }), [
        paddleXRef, ballsRef, powerUpsRef, scoreRef, goldRef, spawnablePowerUpsRef,
        paddleWidthRef, widenLevelRef, laserShotsRef, lasersRef, safetyNetCountRef,
        gameIsRunningRef, gameOverStateRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, stuckBallsRef, enabledPowerUpsRef, isGameStartedRef,
        testPreviewInitialLaunchDoneRef, 
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
        levelCompletionProcessedRef,
        testPowerUpSpawnChanceRef, 
        testBrickColumnsRef,
    ]);

    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: GameState, finalScore: number) => {
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
        activeGameMode, 
        enabledPowerUps,
        showSidebar,
        currentLevel: currentLevelRef.current,
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
        testPowerUpSpawnChance, 
        setTestPowerUpSpawnChance, 
        testBrickColumns, 
        setTestBrickColumns, 
    };
}

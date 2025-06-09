import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
    BOARD_WIDTH, INITIAL_PADDLE_WIDTH, BASE_BALL_SPEED_FACTOR,
    FIELD_INITIAL_HEIGHT_OFFSET, FIELD_INITIAL_WIDTH_OFFSET,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, PADDLE_Y, INITIAL_BALL_SPEED_Y,
    FIELD_SHRINK_RATE_H, FIELD_SHRINK_RATE_W, FIELD_SHRINK_INTERVAL,
    ALL_TOGGLEABLE_POWER_UPS, PADDLE_HEIGHT, BOARD_HEIGHT,
    INITIAL_TEST_POWER_UP_SPAWN_CHANCE, MIN_BALL_SPEED_Y,
    FIELD_MAX_HEIGHT_OFFSET, FIELD_MAX_WIDTH_OFFSET, FIELD_SHRINK_ACCELERATION_FACTOR,
    TARGET_TOTAL_BRICK_GRID_HEIGHT,
} from '../constants'; 
import { Ball, PowerUp, Laser, PowerUpType, GameState, GameMode, GameStateRefs as IGameStateRefs, GameLoopCallbacks, PointsField, Particle, HomingTrail, SavedLevelData, Brick, PaddleTarget } from '../interfaces';
import { initialBallState, initializeBricks as initializeBricksLogic } from '../gameLogic';
import { useLevelLogic, getBrickConfiguration as getBrickConfigurationLogic, getLevelStats as getLevelStatsLogic } from './useLevelLogic';
import { usePaddleLogic } from './usePaddleLogic';
import { useTestModeSettings, TEST_DEFAULT_BRICK_COLUMNS, TEST_DEFAULT_BRICK_ROWS } from './useTestModeSettings';
import { useToast } from './use-toast';

const MAX_UPGRADE_LEVEL = 3;
const INITIAL_LIVES = 3;
const MAX_LEVEL_NAME_LENGTH = 15;

const getPowerUpTypeForLevel = (baseType: PowerUpType, level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_UPGRADE_LEVEL) return null;
    if (level === 1) return baseType; // Base type itself is L1
    const base = baseType.split('_L')[0] as PowerUpType;
    return `${base}_L${level}` as PowerUpType;
};

const UPGRADABLE_POWER_UPS: PowerUpType[] = ALL_TOGGLEABLE_POWER_UPS;

const initialTestPowerUpLevels = ALL_TOGGLEABLE_POWER_UPS.reduce((acc, type) => {
    acc[type] = 1;
    return acc;
}, {} as Record<PowerUpType, number>);

export function useGameLogic() {
    const paddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const prevPaddleXRef = useRef((BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2);
    const resourceMeterRef = useRef(0);
    const ballsRef = useRef<Ball[]>([]);
    const powerUpsRef = useRef<PowerUp[]>([]);
    const particlesRef = useRef<Particle[]>([]); 
    const homingTrailsRef = useRef<HomingTrail[]>([]); 
    const paddleTargetsRef = useRef<PaddleTarget[]>([]);
    const scoreRef = useRef(0);
    const goldRef = useRef<number>(0);
    const spawnablePowerUpsRef = useRef<Set<PowerUpType>>(new Set());
    const gameIsRunningRef = useRef(false);
    const paddleWidthRef = useRef(INITIAL_PADDLE_WIDTH);
    const widenLevelRef = useRef(0);
    const paddleShrinkCountdownRef = useRef<number | null>(null);
    const laserShotsRef = useRef(0);
    const lasersRef = useRef<Laser[]>([]);
    const laserIntervalRef = useRef<number | null>(null); 
    const safetyNetCountRef = useRef(0);
    const gameSpeedFactorRef = useRef<number>(BASE_BALL_SPEED_FACTOR);
    const collectionFieldHeightRef = useRef<number>(FIELD_INITIAL_HEIGHT_OFFSET);
    const collectionFieldWidthOffsetRef = useRef<number>(FIELD_INITIAL_WIDTH_OFFSET);
    const collectionFieldShrinkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const stickyPaddleChargesRef = useRef(0);
    const stuckBallsRef = useRef<Ball[]>([]);
    const enabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(['MULTI_BALL'] as PowerUpType[])); 
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
    const paddleVisualEffectActiveRef = useRef<boolean>(false);
    const paddleVisualEffectStartTimeRef = useRef<number | null>(null);
    const testPowerUpLevelsRef = useRef<Record<PowerUpType, number>>({ ...initialTestPowerUpLevels });
    const [isPaintModeActive, setIsPaintModeActive] = useState<boolean>(false);
    const [isUpgradePaintModeActive, setIsUpgradePaintModeActive] = useState<boolean>(false);
    const [isReinforcePaintModeActive, setIsReinforcePaintModeActive] = useState<boolean>(false);
    const [isBombPaintModeActive, setIsBombPaintModeActive] = useState<boolean>(false);
    const [isBallBrickPaintModeActive, setIsBallBrickPaintModeActive] = useState<boolean>(false);
    const [isRemoveBrickPaintModeActive, setIsRemoveBrickPaintModeActive] = useState<boolean>(false);
    const [isAddBrickPaintModeActive, setIsAddBrickPaintModeActive] = useState<boolean>(false);
    const { toast } = useToast();

    const {
        testPowerUpSpawnChanceRef,
        testBrickColumnsRef,
        testBrickRowsRef,
        testBrickGridHeightRef,
        testPowerUpSpawnChance,
        testBrickColumns,
        setTestBrickColumns,
        testBrickRows,
        setTestBrickRows,
        testBrickGridHeight,
        setTestBrickGridHeight,
    } = useTestModeSettings();

    const [actualTestPowerUpSpawnChance, setActualTestPowerUpSpawnChance] = useState<number>(INITIAL_TEST_POWER_UP_SPAWN_CHANCE);

    // Wrapped setter for testPowerUpSpawnChance
    const setTestPowerUpSpawnChanceWithReset = useCallback((value: number | ((prevState: number) => number)) => {
        setDeleteConfirmationPendingFor(null);
        setActualTestPowerUpSpawnChance(value);
    }, [setActualTestPowerUpSpawnChance]);

    useEffect(() => {
        testPowerUpSpawnChanceRef.current = actualTestPowerUpSpawnChance;
    }, [actualTestPowerUpSpawnChance]);

    const [gameOverState, setGameOverState] = useState<GameState>('menu');
    const gameOverStateRef = useRef(gameOverState);
    const [enabledPowerUps, setEnabledPowerUps] = useState<Set<PowerUpType>>(() => new Set(['MULTI_BALL'] as PowerUpType[])); 
    const [showSidebar, setShowSidebar] = useState<boolean>(true); 
    const [activeGameMode, setActiveGameMode] = useState<GameMode | null>('test'); 
    const [testPowerUpLevels, setTestPowerUpLevelsState] = useState<Record<PowerUpType, number>>({ ...initialTestPowerUpLevels });

    // New ref for persisting test mode enabled power-ups
    const persistedTestEnabledPowerUpsRef = useRef<Set<PowerUpType>>(new Set(['MULTI_BALL'] as PowerUpType[]));

    // New state for Save/Load UI
    const [levelNameInput, setLevelNameInput] = useState<string>("");
    const [savedLevels, setSavedLevels] = useState<string[]>([]);
    const [selectedLevelToLoad, setSelectedLevelToLoad] = useState<string>("");
    const [deleteConfirmationPendingFor, setDeleteConfirmationPendingFor] = useState<string | null>(null);

    useEffect(() => {
        testPowerUpLevelsRef.current = testPowerUpLevels;
    }, [testPowerUpLevels]);

    const isPaintModeActiveRef = useRef(isPaintModeActive);
    useEffect(() => {
        isPaintModeActiveRef.current = isPaintModeActive;
    }, [isPaintModeActive]);

    const isUpgradePaintModeActiveRef = useRef(isUpgradePaintModeActive);
    useEffect(() => {
        isUpgradePaintModeActiveRef.current = isUpgradePaintModeActive;
    }, [isUpgradePaintModeActive]);

    const isReinforcePaintModeActiveRef = useRef(isReinforcePaintModeActive);
    useEffect(() => {
        isReinforcePaintModeActiveRef.current = isReinforcePaintModeActive;
    }, [isReinforcePaintModeActive]);

    const isBombPaintModeActiveRef = useRef(isBombPaintModeActive);
    useEffect(() => {
        isBombPaintModeActiveRef.current = isBombPaintModeActive;
    }, [isBombPaintModeActive]);

    const isBallBrickPaintModeActiveRef = useRef(isBallBrickPaintModeActive);
    useEffect(() => {
        isBallBrickPaintModeActiveRef.current = isBallBrickPaintModeActive;
    }, [isBallBrickPaintModeActive]);

    const isRemoveBrickPaintModeActiveRef = useRef(isRemoveBrickPaintModeActive);
    useEffect(() => {
        isRemoveBrickPaintModeActiveRef.current = isRemoveBrickPaintModeActive;
    }, [isRemoveBrickPaintModeActive]);

    const isAddBrickPaintModeActiveRef = useRef(isAddBrickPaintModeActive);
    useEffect(() => {
        isAddBrickPaintModeActiveRef.current = isAddBrickPaintModeActive;
    }, [isAddBrickPaintModeActive]);

    // Load saved level names on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const { getSavedLevelNames } = require('../utils/localStorage'); // Dynamically import for client-side
            setSavedLevels(getSavedLevelNames());
        }
    }, []);

    useEffect(() => {
        // If a delete confirmation was pending for a specific level,
        // and the currently selected level to load is now different (or empty),
        // then cancel the pending delete confirmation.
        if (deleteConfirmationPendingFor && selectedLevelToLoad !== deleteConfirmationPendingFor) {
            setDeleteConfirmationPendingFor(null);
        }
    }, [selectedLevelToLoad, deleteConfirmationPendingFor]);

    const togglePaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsPaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsUpgradePaintModeActive(false);
                    setIsReinforcePaintModeActive(false);
                    setIsBombPaintModeActive(false);
                    setIsBallBrickPaintModeActive(false);
                    setIsRemoveBrickPaintModeActive(false);
                    setIsAddBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const toggleUpgradePaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsUpgradePaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsPaintModeActive(false);
                    setIsReinforcePaintModeActive(false);
                    setIsBombPaintModeActive(false);
                    setIsBallBrickPaintModeActive(false);
                    setIsRemoveBrickPaintModeActive(false);
                    setIsAddBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const toggleReinforcePaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsReinforcePaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsPaintModeActive(false);
                    setIsUpgradePaintModeActive(false);
                    setIsBombPaintModeActive(false);
                    setIsBallBrickPaintModeActive(false);
                    setIsRemoveBrickPaintModeActive(false);
                    setIsAddBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const toggleBombPaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsBombPaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsPaintModeActive(false);
                    setIsUpgradePaintModeActive(false);
                    setIsReinforcePaintModeActive(false);
                    setIsBallBrickPaintModeActive(false);
                    setIsRemoveBrickPaintModeActive(false);
                    setIsAddBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const toggleBallBrickPaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsBallBrickPaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsPaintModeActive(false);
                    setIsUpgradePaintModeActive(false);
                    setIsReinforcePaintModeActive(false);
                    setIsBombPaintModeActive(false);
                    setIsRemoveBrickPaintModeActive(false);
                    setIsAddBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const toggleRemoveBrickPaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsRemoveBrickPaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsPaintModeActive(false);
                    setIsUpgradePaintModeActive(false);
                    setIsReinforcePaintModeActive(false);
                    setIsBombPaintModeActive(false);
                    setIsBallBrickPaintModeActive(false);
                    setIsAddBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const toggleAddBrickPaintMode = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            setIsAddBrickPaintModeActive(prev => {
                const newState = !prev;
                if (newState) {
                    setIsPaintModeActive(false);
                    setIsUpgradePaintModeActive(false);
                    setIsReinforcePaintModeActive(false);
                    setIsBombPaintModeActive(false);
                    setIsBallBrickPaintModeActive(false);
                    setIsRemoveBrickPaintModeActive(false);
                }
                return newState;
            });
        }
    }, [selectedLevelToLoad, toast]);

    const setTestPowerUpLevel = useCallback((type: PowerUpType, level: number) => {
        setDeleteConfirmationPendingFor(null);
        setTestPowerUpLevelsState(prevLevels => ({
            ...prevLevels,
            [type]: level
        }));
    }, []);

    const setAllTestPowerUpLevels = useCallback((level: number) => {
        setDeleteConfirmationPendingFor(null);
        if (level >= 1 && level <= MAX_UPGRADE_LEVEL) {
            const newLevels = { ...initialTestPowerUpLevels };
            for (const type in newLevels) {
                newLevels[type as PowerUpType] = level;
            }
            setTestPowerUpLevelsState(newLevels);
        }
    }, []);

    const toggleAllTestPowerUps = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        setEnabledPowerUps(prevEnabled => {
            const allCurrentlyEnabled = ALL_TOGGLEABLE_POWER_UPS.every(type => prevEnabled.has(type)) && prevEnabled.size === ALL_TOGGLEABLE_POWER_UPS.length;
            let newSet: Set<PowerUpType>;
            if (allCurrentlyEnabled) {
                newSet = new Set<PowerUpType>(); // Disable all
            } else {
                newSet = new Set<PowerUpType>(ALL_TOGGLEABLE_POWER_UPS); // Enable all
            }
            if (gameModeRef.current === 'test') { // Only update persisted ref if in test mode
                persistedTestEnabledPowerUpsRef.current = newSet;
            }
            return newSet;
        });
    }, [gameModeRef]);

    const addTestLaserCharges = useCallback((count: number) => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            laserShotsRef.current += count;
            console.log(`Added ${count} laser charges. Total: ${laserShotsRef.current}`);
        }
    }, []);

    const addTestRecoveryCharges = useCallback((count: number) => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            stickyPaddleChargesRef.current += count;
            console.log(`Added ${count} recovery charges. Total: ${stickyPaddleChargesRef.current}`);
        }
    }, []);

    const addTestSafetyNetCharge = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            safetyNetCountRef.current += 1;
            console.log(`Added 1 safety net. Total: ${safetyNetCountRef.current}`);
        }
    }, []);

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
        testBrickRowsRef,
        testBrickGridHeightRef,
        isPaintModeActiveRef,
    });

    useEffect(() => {
        enabledPowerUpsRef.current = enabledPowerUps;
    }, [enabledPowerUps]);

    const startGameCallbackRef = useRef<((mode: GameMode, newTestBrickColumns?: number, newTestBrickRows?: number, newTestBrickGridHeight?: number) => void) | null>(null);

    const startGame = useCallback((
        mode: GameMode, 
        newTestBrickColumns?: number, 
        newTestBrickRows?: number, 
        newTestBrickGridHeight?: number,
        loadedLevelData?: SavedLevelData // Added for loading levels
    ) => {
        setDeleteConfirmationPendingFor(null);
        if (gameOverStateRef.current === 'menu' || mode === 'test' || loadedLevelData) { // Allow loading to override menu state
            scoreRef.current = 0;
            goldRef.current = 0;
            livesRef.current = INITIAL_LIVES;
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = [];
            particlesRef.current = []; 
            homingTrailsRef.current = []; 
            levelCompletionProcessedRef.current = false;
            testPreviewInitialLaunchDoneRef.current = false; 
            paddleVisualEffectActiveRef.current = false;
            paddleVisualEffectStartTimeRef.current = null;
            
            gameModeRef.current = mode; 
            setActiveGameMode(mode); 

            if (loadedLevelData) {
                // Apply loaded data
                setTestBrickColumns(loadedLevelData.brickColumns);
                setTestBrickRows(loadedLevelData.brickRows);
                setTestBrickGridHeight(loadedLevelData.brickGridHeight);
                bricksRef.current = loadedLevelData.bricks; // Directly use loaded bricks
                setEnabledPowerUps(new Set(loadedLevelData.enabledPowerUps));
                setTestPowerUpLevelsState(loadedLevelData.powerUpLevels);
                setTestPowerUpSpawnChanceWithReset(loadedLevelData.powerUpSpawnChance);
                laserShotsRef.current = loadedLevelData.initialLaserCharges;
                stickyPaddleChargesRef.current = loadedLevelData.initialRecoveryCharges;
                safetyNetCountRef.current = loadedLevelData.initialSafetyNets;
                
                // Update refs based on loaded state
                testBrickColumnsRef.current = loadedLevelData.brickColumns;
                testBrickRowsRef.current = loadedLevelData.brickRows;
                testBrickGridHeightRef.current = loadedLevelData.brickGridHeight;
                enabledPowerUpsRef.current = new Set(loadedLevelData.enabledPowerUps);
                testPowerUpLevelsRef.current = loadedLevelData.powerUpLevels;
                testPowerUpSpawnChanceRef.current = loadedLevelData.powerUpSpawnChance;


                // Calculate target score based on loaded bricks
                let loadedBrickCount = 0;
                for (let c = 0; c < loadedLevelData.bricks.length; c++) {
                    if (loadedLevelData.bricks[c]) {
                        for (let r = 0; r < loadedLevelData.bricks[c].length; r++) {
                            if (loadedLevelData.bricks[c][r]?.status === 1) {
                                loadedBrickCount++;
                            }
                        }
                    }
                }
                targetScoreRef.current = loadedBrickCount; // Simple target score for now
                totalBricksRef.current = loadedBrickCount;
                brickColumnsRef.current = loadedLevelData.brickColumns;
                brickRowsRef.current = loadedLevelData.brickRows;


            } else if (mode === 'main') {
                 spawnablePowerUpsRef.current = new Set(); 
                 setEnabledPowerUps(new Set(ALL_TOGGLEABLE_POWER_UPS)); 
                 // firstTestRunCompletedRef.current = false; // DO NOT RESET THIS HERE
                 setShowSidebar(false);
                 setGameOverState('playing');
                 isGameStartedRef.current = false; 
             } else if (mode === 'test') {
                 spawnablePowerUpsRef.current = new Set(ALL_TOGGLEABLE_POWER_UPS); 
                 setShowSidebar(true);
                 // setGameOverState('menu');  // Keep as menu for test, startGame will be called again if user clicks start
                 isGameStartedRef.current = false; 

                 if (!firstTestRunCompletedRef.current) {
                    const defaultTestEnabledPowerUps = new Set(['MULTI_BALL'] as PowerUpType[]);
                    setEnabledPowerUps(defaultTestEnabledPowerUps);
                    persistedTestEnabledPowerUpsRef.current = defaultTestEnabledPowerUps; // Initialize persisted ref

                    setTestPowerUpSpawnChanceWithReset(INITIAL_TEST_POWER_UP_SPAWN_CHANCE);
                    testPowerUpSpawnChanceRef.current = INITIAL_TEST_POWER_UP_SPAWN_CHANCE; // Initialize ref

                    setTestBrickColumns(newTestBrickColumns !== undefined ? newTestBrickColumns : TEST_DEFAULT_BRICK_COLUMNS);
                    setTestBrickRows(newTestBrickRows !== undefined ? newTestBrickRows : TEST_DEFAULT_BRICK_ROWS);
                    setTestBrickGridHeight(newTestBrickGridHeight !== undefined ? newTestBrickGridHeight : TARGET_TOTAL_BRICK_GRID_HEIGHT);
                    // Refs for dimensions are updated via useEffect on their state variables

                    setTestPowerUpLevelsState({ ...initialTestPowerUpLevels }); 
                    testPowerUpLevelsRef.current = { ...initialTestPowerUpLevels }; // Initialize ref

                    firstTestRunCompletedRef.current = true;
                 } else {
                    // Persist settings from refs to state if it's not the first run
                    const restoredTestEnabledPowerUps = new Set(persistedTestEnabledPowerUpsRef.current);
                    setEnabledPowerUps(restoredTestEnabledPowerUps); 
                    enabledPowerUpsRef.current = restoredTestEnabledPowerUps; // Also directly update the main ref

                    setTestPowerUpLevelsState({ ...testPowerUpLevelsRef.current });
                    setTestPowerUpSpawnChanceWithReset(testPowerUpSpawnChanceRef.current);

                    // Update dimensions if new values are explicitly passed, otherwise they persist from current state/ref
                    if (newTestBrickColumns !== undefined) {
                        setTestBrickColumns(newTestBrickColumns);
                    } else {
                        setTestBrickColumns(testBrickColumnsRef.current); 
                    }
                    if (newTestBrickRows !== undefined) {
                        setTestBrickRows(newTestBrickRows);
                    } else {
                        setTestBrickRows(testBrickRowsRef.current); 
                    }
                    if (newTestBrickGridHeight !== undefined) {
                        setTestBrickGridHeight(newTestBrickGridHeight);
                    } else {
                        setTestBrickGridHeight(testBrickGridHeightRef.current); 
                    }
                 }
             }

            currentLevelRef.current = 1; 
            if (!loadedLevelData) { // Only call resetLevel if not loading (resetLevel re-initializes bricks)
                 resetLevel(mode, true, newTestBrickColumns, newTestBrickRows, newTestBrickGridHeight); 
            }
            resetPaddle(); // Always reset paddle
            setupInitialBall(); 
            if (loadedLevelData || mode === 'test') {
                setGameOverState('menu'); // Ensure it's menu after setup for test/load
            }
        }
    }, [
        resetLevel, setupInitialBall, setActiveGameMode, setEnabledPowerUps, setShowSidebar, setGameOverState,
        setTestPowerUpSpawnChanceWithReset, setTestBrickColumns, setTestBrickRows, setTestBrickGridHeight,
        testBrickColumns, testBrickRows, testBrickGridHeight,
        isPaintModeActiveRef, resetPaddle,
    ]);

    useEffect(() => {
        startGameCallbackRef.current = startGame;
    }, [startGame]);

    useEffect(() => {
        gameOverStateRef.current = gameOverState;
        gameIsRunningRef.current = gameOverState === 'playing';

        if (gameOverState === 'lost' && activeGameMode === 'test') {
            if (startGameCallbackRef.current) {
                startGameCallbackRef.current('test'); 
            }
            return; 
        }

        if (gameOverState === 'level_reset') {
            livesRef.current--;
            scoreRef.current = 0;
            resetLevel(gameModeRef.current, false);
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = [];
            particlesRef.current = []; 
            homingTrailsRef.current = []; 
            levelCompletionProcessedRef.current = false;
            paddleVisualEffectActiveRef.current = false;
            paddleVisualEffectStartTimeRef.current = null;
            setGameOverState('playing');
        } else if (gameOverState !== 'playing') {
            paddleShrinkCountdownRef.current = null;
            bonusGoldTimerCountdownRef.current = null;
            initialBonusGoldDecrementCompleteRef.current = false;
            pointsFieldsRef.current = [];
            particlesRef.current = []; 
            homingTrailsRef.current = []; 
            paddleVisualEffectActiveRef.current = false;
            paddleVisualEffectStartTimeRef.current = null;
            if (gameSpeedFactorRef.current !== BASE_BALL_SPEED_FACTOR) {
                 gameSpeedFactorRef.current = BASE_BALL_SPEED_FACTOR;
            }
        }
    }, [gameOverState, activeGameMode, resetLevel, setGameOverState]);

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
                const heightRatio = collectionFieldHeightRef.current / FIELD_MAX_HEIGHT_OFFSET;
                const dynamicShrinkRateH = FIELD_SHRINK_RATE_H * (1 + heightRatio * FIELD_SHRINK_ACCELERATION_FACTOR);
                collectionFieldHeightRef.current = Math.max(0, collectionFieldHeightRef.current - dynamicShrinkRateH);
                heightChanged = true;
            }

            if (collectionFieldWidthOffsetRef.current > 0) {
                const widthRatio = collectionFieldWidthOffsetRef.current / FIELD_MAX_WIDTH_OFFSET;
                const dynamicShrinkRateW = FIELD_SHRINK_RATE_W * (1 + widthRatio * FIELD_SHRINK_ACCELERATION_FACTOR);
                collectionFieldWidthOffsetRef.current = Math.max(0, collectionFieldWidthOffsetRef.current - dynamicShrinkRateW);
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
        // testPreviewInitialLaunchDoneRef.current = false; // This seems to be mostly for the initial ball launch X speed.
        if (collectionFieldShrinkTimerRef.current) clearInterval(collectionFieldShrinkTimerRef.current);
        collectionFieldShrinkTimerRef.current = null;
        if (laserIntervalRef.current) clearInterval(laserIntervalRef.current); 
        laserIntervalRef.current = null;

        scoreRef.current = 0;
        goldRef.current = 0;
        spawnablePowerUpsRef.current = new Set();
        currentLevelRef.current = 1;
        livesRef.current = INITIAL_LIVES;
        bonusGoldTimerCountdownRef.current = null;
        initialBonusGoldDecrementCompleteRef.current = false;
        pointsFieldsRef.current = [];
        particlesRef.current = []; 
        homingTrailsRef.current = []; 
        paddleTargetsRef.current = [];
        levelCompletionProcessedRef.current = false;
        paddleVisualEffectActiveRef.current = false;
        paddleVisualEffectStartTimeRef.current = null;
        resourceMeterRef.current = 0;
        prevPaddleXRef.current = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
        
        // Reset paint mode states
        setIsPaintModeActive(false);
        setIsUpgradePaintModeActive(false);
        setIsReinforcePaintModeActive(false);
        setIsBombPaintModeActive(false);
        setIsBallBrickPaintModeActive(false);
        setIsRemoveBrickPaintModeActive(false);
        setIsAddBrickPaintModeActive(false);

        // // Do not reset test settings here to allow persistence across main game sessions
        // setTestPowerUpSpawnChanceWithReset(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 
        // setTestBrickColumns(TEST_DEFAULT_BRICK_COLUMNS); 
        // setTestBrickRows(TEST_DEFAULT_BRICK_ROWS); 
        // setTestBrickGridHeight(TARGET_TOTAL_BRICK_GRID_HEIGHT);
        // setEnabledPowerUps(new Set(['MULTI_BALL'] as PowerUpType[]));
        // setTestPowerUpLevelsState({ ...initialTestPowerUpLevels }); 
        // firstTestRunCompletedRef.current = false; // DO NOT RESET THIS HERE

        gameModeRef.current = 'test'; 
        setActiveGameMode('test'); 
        setGameOverState('menu');
        setEnabledPowerUps(new Set(persistedTestEnabledPowerUpsRef.current)); // Restore persisted test enabled PUs
        setShowSidebar(true); 
        
        resetLevel('test', true); 
        resetPaddle();
        setupInitialBall();
        clearBonusGoldTimers();
        
        // Clear save/load UI state
        setLevelNameInput("");
        setSelectedLevelToLoad("");


    }, [
        resetLevel, resetPaddle, clearBonusGoldTimers, setGameOverState, setActiveGameMode, setShowSidebar, setEnabledPowerUps, setupInitialBall,
        setIsPaintModeActive, setIsUpgradePaintModeActive, setIsReinforcePaintModeActive,
        setIsBombPaintModeActive, setIsBallBrickPaintModeActive, setIsRemoveBrickPaintModeActive, setIsAddBrickPaintModeActive
    ]);

    const launchStuckBalls = useCallback((isInitialLaunchArgument = false) => { 
        const isTestModePreview = activeGameMode === 'test' && gameOverStateRef.current === 'menu';
        if (!((gameOverStateRef.current === 'playing') || isTestModePreview) || stuckBallsRef.current.length === 0) return;
        
        const launchTime = Date.now();
        const currentPaddleX = paddleXRef.current;
        const currentPaddleWidth = paddleWidthRef.current;

        let trulyInitialLaunch = false;
        let initialLaunchSpeedX = 0;
        let initialLaunchSpeedY = -Math.abs(INITIAL_BALL_SPEED_Y);

        if (isTestModePreview) {
            if (!testPreviewInitialLaunchDoneRef.current) {
                initialLaunchSpeedX = 3; 
                testPreviewInitialLaunchDoneRef.current = true;
                trulyInitialLaunch = true; 
            } else {
                initialLaunchSpeedX = 0; 
            }
        } else { 
            if (isInitialLaunchArgument) { 
                initialLaunchSpeedX = 3;
                trulyInitialLaunch = true;
            } else {
                initialLaunchSpeedX = 0;
            }
        }

        const launchedBalls = stuckBallsRef.current.map(ball => {
            const currentBallSize = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
            let currentLaunchX = 0, currentLaunchY = 0;
            let speedX = initialLaunchSpeedX;
            let speedY = initialLaunchSpeedY;

            if (ball.stuckSide) {
                 const sideOffset = currentBallSize;
                 currentLaunchX = ball.stuckSide === 'left'
                     ? currentPaddleX - sideOffset
                     : currentPaddleX + currentPaddleWidth + sideOffset;
                 currentLaunchY = PADDLE_Y + PADDLE_HEIGHT / 2 + (ball.stuckSideOffset ?? 0);
                 currentLaunchY = Math.min(BOARD_HEIGHT - currentBallSize -1, Math.max(currentBallSize + 1, currentLaunchY));

                const angleDeviation = (Math.random() - 0.5) * (6 * Math.PI / 180); 
                const speedMultiplier = 1 + (Math.random() - 0.5) * 0.2; 

                const baseSpeed = Math.sqrt(speedX * speedX + speedY * speedY); 
                const currentAngle = Math.atan2(speedY, speedX);

                let newAngle = currentAngle + angleDeviation;
                let newSpeed = baseSpeed * speedMultiplier;

                speedX = newSpeed * Math.cos(newAngle);
                speedY = -Math.abs(newSpeed * Math.sin(newAngle)); 
                speedY = Math.min(speedY, -MIN_BALL_SPEED_Y); 

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

            let resumedDoubleEndTime = undefined; if (ball.isDouble && ball.doublePausedDuration) resumedDoubleEndTime = launchTime + ball.doublePausedDuration;
            let resumedBlueEndTime = undefined; if (ball.isBlue && ball.bluePausedDuration) resumedBlueEndTime = launchTime + ball.bluePausedDuration;
            let resumedBigEndTime = undefined; if (ball.isBig && ball.bigPausedDuration) resumedBigEndTime = launchTime + ball.bigPausedDuration;
            let resumedSplittingEndTime = undefined; if (ball.isSplitting && ball.splittingPausedDuration) resumedSplittingEndTime = launchTime + ball.splittingPausedDuration;

            return {
                ...ball,
                x: currentLaunchX,
                y: currentLaunchY,
                speedX: speedX, 
                speedY: speedY,
                stuckOffset: undefined,
                stuckSide: null,
                stuckSideOffset: undefined,
                doubleEndTime: resumedDoubleEndTime ?? ball.doubleEndTime,
                blueEndTime: resumedBlueEndTime ?? ball.blueEndTime,
                bigEndTime: resumedBigEndTime ?? ball.bigEndTime,
                splittingEndTime: resumedSplittingEndTime ?? ball.splittingEndTime,
                doublePausedDuration: undefined,
                bluePausedDuration: undefined,
                bigPausedDuration: undefined,
                splittingPausedDuration: undefined
            };
        });
        ballsRef.current.push(...launchedBalls);
        stuckBallsRef.current = [];
    }, [startBonusGoldCountdown, activeGameMode, gameOverStateRef]);

    const handlePowerUpToggle = useCallback((type: PowerUpType) => {
        setDeleteConfirmationPendingFor(null);
        setEnabledPowerUps(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            if (gameModeRef.current === 'test') { // This was already correctly conditional
                persistedTestEnabledPowerUpsRef.current = next; 
            }
            return next;
        });
    }, [gameModeRef]);

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
            particlesRef.current = []; 
            homingTrailsRef.current = []; 
            paddleTargetsRef.current = [];
            levelCompletionProcessedRef.current = false;
            testPreviewInitialLaunchDoneRef.current = false; 
            paddleVisualEffectActiveRef.current = false;
            paddleVisualEffectStartTimeRef.current = null;
            resourceMeterRef.current = 0;
            prevPaddleXRef.current = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
            setTestPowerUpSpawnChanceWithReset(INITIAL_TEST_POWER_UP_SPAWN_CHANCE); 
            setTestBrickColumns(TEST_DEFAULT_BRICK_COLUMNS); 
            setTestBrickRows(TEST_DEFAULT_BRICK_ROWS); 
            setTestBrickGridHeight(TARGET_TOTAL_BRICK_GRID_HEIGHT);
            setTestPowerUpLevelsState({ ...initialTestPowerUpLevels }); 

            resetLevel(nextMode, false);
            isGameStartedRef.current = false; 

            setShowSidebar(false);
            setGameOverState('playing');
        }
    }, [
        resetLevel, setActiveGameMode, setShowSidebar, setGameOverState,
        setTestPowerUpSpawnChanceWithReset, setTestBrickColumns, setTestBrickRows, setTestBrickGridHeight
    ]); 

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
        particlesRef.current = []; 
        homingTrailsRef.current = []; 
        paddleTargetsRef.current = [];
        paddleVisualEffectActiveRef.current = false;
        paddleVisualEffectStartTimeRef.current = null;
        resourceMeterRef.current = 0;
        prevPaddleXRef.current = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
        resetLevel(mode, resetScoreAndGold);
        isGameStartedRef.current = false; 
        if (mode === 'test' || (gameModeRef.current === 'test' && mode === null)) { 
            testPreviewInitialLaunchDoneRef.current = false;
        }
    }, [resetLevel]);

    const triggerTestLevelReset = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current === 'test') {
            resetLevel('test', true, testBrickColumnsRef.current, testBrickRowsRef.current, testBrickGridHeightRef.current);
            resetPaddle(); // Ensure paddle is reset
            setupInitialBall(); // Ensure ball is reset for the new layout
            resourceMeterRef.current = 0;
            prevPaddleXRef.current = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
            // Optionally, ensure the game state is appropriate for a test reset, e.g., menu
            setGameOverState('menu'); 
            // Ensure the game isn't considered "started" in a way that prevents interaction
            isGameStartedRef.current = false; 
            testPreviewInitialLaunchDoneRef.current = false; 
        }
    }, [resetLevel, setupInitialBall, testBrickColumnsRef, testBrickRowsRef, testBrickGridHeightRef, setGameOverState, resetPaddle]); // Added resetPaddle

    const gameStateRefs: IGameStateRefs = useMemo(() => ({
        paddleXRef, prevPaddleXRef, resourceMeterRef, ballsRef, powerUpsRef, particlesRef, homingTrailsRef, paddleTargetsRef, scoreRef, goldRef, spawnablePowerUpsRef, 
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
        paddleVisualEffectActiveRef, 
        paddleVisualEffectStartTimeRef,
        laserIntervalRef, 
        testPowerUpLevelsRef, 
        testPowerUpSpawnChanceRef,
        testBrickColumnsRef,
        testBrickRowsRef,
        testBrickGridHeightRef,
        isPaintModeActiveRef,
        isUpgradePaintModeActiveRef,
        isReinforcePaintModeActiveRef,
        isBombPaintModeActiveRef,
        isBallBrickPaintModeActiveRef,
        isRemoveBrickPaintModeActiveRef,
        isAddBrickPaintModeActiveRef,
        triggerTestLevelReset,
    }), [
        paddleXRef, prevPaddleXRef, resourceMeterRef, ballsRef, powerUpsRef, particlesRef, homingTrailsRef, paddleTargetsRef, scoreRef, goldRef, spawnablePowerUpsRef, 
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
        paddleVisualEffectActiveRef, 
        paddleVisualEffectStartTimeRef,
        laserIntervalRef,
        testPowerUpLevelsRef, 
        testPowerUpSpawnChanceRef,
        testBrickColumnsRef,
        testBrickRowsRef,
        testBrickGridHeightRef,
        isPaintModeActiveRef,
        isUpgradePaintModeActiveRef,
        isReinforcePaintModeActiveRef,
        isBombPaintModeActiveRef,
        isBallBrickPaintModeActiveRef,
        isRemoveBrickPaintModeActiveRef,
        isAddBrickPaintModeActiveRef,
        triggerTestLevelReset,
    ]);

    const drawEndMessageCallback = useCallback((context: CanvasRenderingContext2D, state: GameState, finalScore: number) => {
    }, [
        testBrickColumns, 
        setTestBrickColumns, 
        testBrickRows, 
        setTestBrickRows, 
        testBrickGridHeight,      
        setTestBrickGridHeight,   
        isPaintModeActive,
        togglePaintMode,
        isUpgradePaintModeActive,
        toggleUpgradePaintMode,
        isReinforcePaintModeActive,
        toggleReinforcePaintMode,
        isBombPaintModeActive,
        toggleBombPaintMode,
        isBallBrickPaintModeActive,
        toggleBallBrickPaintMode,
        triggerTestLevelReset,
        isRemoveBrickPaintModeActive,
        toggleRemoveBrickPaintMode,
        isAddBrickPaintModeActive,
        toggleAddBrickPaintMode,
    ]);

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

    // Save and Load Logic
    const handleSaveCurrentLevel = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (gameModeRef.current !== 'test' || !levelNameInput.trim()) {
            toast({ title: "Save Error", description: "Please enter a level name to save.", variant: "destructive" });
            return;
        }

        let nameToSave = levelNameInput.trim();
        if (nameToSave.length > MAX_LEVEL_NAME_LENGTH) {
            nameToSave = nameToSave.substring(0, MAX_LEVEL_NAME_LENGTH - 3) + "...";
            setLevelNameInput(nameToSave);
        }

        const currentBricks = bricksRef.current;
        const levelData: SavedLevelData = {
            name: nameToSave,
            brickColumns: testBrickColumnsRef.current,
            brickRows: testBrickRowsRef.current,
            brickGridHeight: testBrickGridHeightRef.current,
            bricks: JSON.parse(JSON.stringify(currentBricks)),
            enabledPowerUps: Array.from(enabledPowerUpsRef.current),
            powerUpLevels: { ...testPowerUpLevelsRef.current },
            powerUpSpawnChance: testPowerUpSpawnChanceRef.current,
            initialLaserCharges: laserShotsRef.current,
            initialRecoveryCharges: stickyPaddleChargesRef.current,
            initialSafetyNets: safetyNetCountRef.current,
        };

        const { saveLevelData, getSavedLevelNames } = require('../utils/localStorage');
        const success = saveLevelData(nameToSave, levelData);

        if (success) {
            const updatedNames = getSavedLevelNames();
            setSavedLevels(updatedNames);
            toast({ title: "Success", description: `Level "${nameToSave}" saved.` });
        } else {
            toast({ title: "Save Error", description: `Level "${nameToSave}" already exists. Choose a different name.`, variant: "destructive" });
        }
    }, [levelNameInput, toast, setLevelNameInput]);

    const handleLoadSelectedLevel = useCallback(() => {
        setDeleteConfirmationPendingFor(null);
        if (!selectedLevelToLoad) {
            toast({ title: "Load Error", description: "Please select a level to load.", variant: "destructive" });
            return;
        }
        const { loadLevelData } = require('../utils/localStorage'); // Dynamic import
        const loadedData: SavedLevelData | null = loadLevelData(selectedLevelToLoad);

        if (loadedData) {
            // Call startGame with the loaded data
            startGame('test', undefined, undefined, undefined, loadedData);
            toast({ title: "Success", description: `Level "${selectedLevelToLoad}" loaded!` });
        } else {
            toast({ title: "Load Error", description: `Failed to load level: "${selectedLevelToLoad}".`, variant: "destructive" });
        }
    }, [selectedLevelToLoad, startGame, toast]);
    
    const handleDeleteSelectedLevel = useCallback(() => {
        if (!selectedLevelToLoad) {
            toast({ title: "Delete Error", description: "Please select a level to delete.", variant: "destructive" });
            return;
        }

        if (deleteConfirmationPendingFor === selectedLevelToLoad) {
            // Actual deletion
            const { deleteLevelData, getSavedLevelNames } = require('../utils/localStorage'); // Dynamic import
            deleteLevelData(selectedLevelToLoad);
            const updatedNames = getSavedLevelNames();
            setSavedLevels(updatedNames);
            toast({ title: "Success", description: `Level "${selectedLevelToLoad}" deleted.` });
            setSelectedLevelToLoad(""); // Clear selection
            setDeleteConfirmationPendingFor(null); // Reset confirmation
        } else {
            // Pending confirmation
            setDeleteConfirmationPendingFor(selectedLevelToLoad);
            toast({ title: "Confirm Deletion", description: `Click Delete again to confirm deletion of "${selectedLevelToLoad}".` });
        }
    }, [selectedLevelToLoad, deleteConfirmationPendingFor, toast]);


    return {
        gameOverState,
        activeGameMode, 
        enabledPowerUps,
        showSidebar,
        currentLevel: currentLevelRef.current,
        handleResetGame,
        launchStuckBalls,
        handlePowerUpToggle,
        toggleAllTestPowerUps,
        addTestLaserCharges, 
        addTestRecoveryCharges,
        addTestSafetyNetCharge, // Expose new function
        startGame,
        startNextLevel,
        addSpawnablePowerUp,
        gameStateRefs,
        gameLoopCallbacks,
        lives: livesRef.current,
        score: scoreRef.current,
        gold: goldRef.current,
        testPowerUpLevels, 
        setTestPowerUpLevel, 
        setAllTestPowerUpLevels,
        testPowerUpSpawnChance: actualTestPowerUpSpawnChance,
        setTestPowerUpSpawnChance: setTestPowerUpSpawnChanceWithReset, // EXPOSE WRAPPED SETTER
        testBrickColumns, 
        setTestBrickColumns, 
        testBrickRows, 
        setTestBrickRows, 
        testBrickGridHeight,      
        setTestBrickGridHeight,   
        isPaintModeActive,
        togglePaintMode,
        isUpgradePaintModeActive,
        toggleUpgradePaintMode,
        isReinforcePaintModeActive,
        toggleReinforcePaintMode,
        isBombPaintModeActive,
        toggleBombPaintMode,
        isBallBrickPaintModeActive,
        toggleBallBrickPaintMode,
        triggerTestLevelReset,
        isRemoveBrickPaintModeActive,
        toggleRemoveBrickPaintMode,
        isAddBrickPaintModeActive,
        toggleAddBrickPaintMode,
        // Save/Load state and handlers
        levelNameInput,
        setLevelNameInput,
        savedLevels,
        selectedLevelToLoad,
        setSelectedLevelToLoad,
        handleSaveCurrentLevel,
        handleLoadSelectedLevel,
        handleDeleteSelectedLevel,
        deleteConfirmationPendingFor,
    };
}

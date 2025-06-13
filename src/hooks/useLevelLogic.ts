// src/hooks/useLevelLogic.ts
import { useRef, useCallback, MutableRefObject } from 'react';
import {
    BRICK_COLUMNS as DEFAULT_BRICK_COLUMNS, 
    BRICK_ROWS as DEFAULT_BRICK_ROWS, // Renamed for clarity
    BRICK_HEIGHT, TALL_BRICK_HEIGHT,
    BRICK_PADDING, TARGET_TOTAL_BRICK_GRID_HEIGHT, INITIAL_BONUS_GOLD, MINIMUM_BONUS_GOLD,
    BONUS_GOLD_DECREMENT_INTERVAL,
    FIELD_INITIAL_HEIGHT_OFFSET,
    FIELD_INITIAL_WIDTH_OFFSET,
    BASE_BALL_SPEED_FACTOR,
    BOARD_WIDTH,
    POWER_UP_SIZE,
    BOARD_HEIGHT,
} from '../constants';
import { Brick, GameMode, Ball, PowerUp, Laser, PowerUpType, GameStateRefs } from '../interfaces'; 
import { initializeBricks } from '../gameLogic'; 

const INITIAL_BONUS_GOLD_CONST = INITIAL_BONUS_GOLD;
const MINIMUM_BONUS_GOLD_CONST = MINIMUM_BONUS_GOLD;

// Updated getBrickConfiguration to accept testBrickColumns, testBrickRows, and testBrickGridHeight
export const getBrickConfiguration = (
    level: number, 
    gameMode: GameMode | null, 
    testBrickColumns?: number, 
    testBrickRows?: number, 
    testBrickGridHeight?: number
): { brickColumns: number, brickRows: number, brickHeight: number, actualGridHeight: number } => {
  let cols = DEFAULT_BRICK_COLUMNS;
  let rows = DEFAULT_BRICK_ROWS;
  let targetIndividualBrickHeight = BRICK_HEIGHT;
  let actualTotalGridHeight = TARGET_TOTAL_BRICK_GRID_HEIGHT;

  if (gameMode === 'main') {
    if (level === 1) { cols = 2; rows = 2; targetIndividualBrickHeight = 25; }
    else if (level === 2) { cols = 3; rows = 2; targetIndividualBrickHeight = 25; }
    else if (level === 3) { cols = 9; rows = 2; targetIndividualBrickHeight = 25; }
    else if (level === 4) { cols = 13; rows = 3; targetIndividualBrickHeight = 21; }
    else if (level === 5) { cols = 26; rows = 4; targetIndividualBrickHeight = TALL_BRICK_HEIGHT; }
    else if (level === 6) { cols = 8; rows = 5; targetIndividualBrickHeight = TALL_BRICK_HEIGHT; }
    else if (level === 7) { cols = 9; rows = 6; targetIndividualBrickHeight = TALL_BRICK_HEIGHT; }
    else if (level === 8) { cols = 10; rows = 7; targetIndividualBrickHeight = TALL_BRICK_HEIGHT; }
    else if (level === 9) { cols = 11; rows = 8; targetIndividualBrickHeight = TALL_BRICK_HEIGHT; }
    else {
      cols = 4; 
      if (level === 10) { cols = 13; rows = 8; }
      else if (level === 11) { cols = 15; rows = 9; }
      else if (level === 12) { cols = 17; rows = 10; }
      else if (level === 13) { cols = 19; rows = 11; }
      else if (level === 14) { cols = 21; rows = 12; }
      else if (level === 15) { cols = 24; rows = 12; }
      else if (level === 16) { cols = 27; rows = 13; }
      else if (level === 17) { cols = 30; rows = 14; }
      else if (level === 18) { cols = 34; rows = 14; }
      else if (level === 19) { cols = 38; rows = 15; }
      else if (level >= 20) { cols = 43; rows = 16; }
      else { rows = 7; }

      if (rows > 0) {
        targetIndividualBrickHeight = (TARGET_TOTAL_BRICK_GRID_HEIGHT - (rows - 1) * BRICK_PADDING) / rows;
        targetIndividualBrickHeight = Math.max(1, targetIndividualBrickHeight);
      } else {
        targetIndividualBrickHeight = BRICK_HEIGHT; // Fallback
      }
    }
    actualTotalGridHeight = (targetIndividualBrickHeight * rows) + (Math.max(0, rows - 1) * BRICK_PADDING);

  } else if (gameMode === 'test') {
    cols = testBrickColumns ?? DEFAULT_BRICK_COLUMNS; 
    rows = testBrickRows ?? DEFAULT_BRICK_ROWS; 
    actualTotalGridHeight = testBrickGridHeight ?? TARGET_TOTAL_BRICK_GRID_HEIGHT;

    if (rows > 0) {
        targetIndividualBrickHeight = (actualTotalGridHeight - (rows - 1) * BRICK_PADDING) / rows;
        targetIndividualBrickHeight = Math.max(1, targetIndividualBrickHeight);
    } else {
        targetIndividualBrickHeight = BRICK_HEIGHT; // Fallback if rows is 0 or undefined
    }
    // Recalculate actualTotalGridHeight based on integer brick height to avoid floating point issues if necessary
    actualTotalGridHeight = (targetIndividualBrickHeight * rows) + (Math.max(0, rows - 1) * BRICK_PADDING);

  } else {
    // Fallback for null gameMode or other unhandled modes
    cols = DEFAULT_BRICK_COLUMNS;
    rows = DEFAULT_BRICK_ROWS;
    targetIndividualBrickHeight = BRICK_HEIGHT;
    actualTotalGridHeight = (targetIndividualBrickHeight * rows) + (Math.max(0, rows - 1) * BRICK_PADDING);
  }
  return { brickColumns: cols, brickRows: rows, brickHeight: targetIndividualBrickHeight, actualGridHeight: actualTotalGridHeight };
};

// Updated getLevelStats to accept testBrickColumns, testBrickRows, and testBrickGridHeight
export const getLevelStats = (level: number, gameMode: GameMode | null, testBrickColumns?: number, testBrickRows?: number, testBrickGridHeight?: number): { totalBricks: number, targetScore: number } => {
    const config = getBrickConfiguration(level, gameMode, testBrickColumns, testBrickRows, testBrickGridHeight);
    const bricksForStats = initializeBricks(config.brickColumns, config.brickRows, config.brickHeight, level, gameMode, config.actualGridHeight);

    let count = 0;
    for (let c = 0; c < bricksForStats.length; c++) {
        if (bricksForStats[c]) {
            for (let r = 0; r < bricksForStats[c].length; r++) {
                if (bricksForStats[c]?.[r]?.status === 1) {
                    count++;
                }
            }
        }
    }

    let scoreGoal = count;
    if (gameMode === 'main') {
        if (level === 6) { scoreGoal += 2; } 
        else if (level === 7) { scoreGoal += 6; }
        else if (level === 8) { scoreGoal += 12; }
        else if (level === 9) { scoreGoal += 20; }
        else if (level === 10) { scoreGoal += 29; }
        else if (level === 11) { scoreGoal += 45; }
        else if (level === 12) { scoreGoal += 65; }
        else if (level === 13) { scoreGoal += 91; }
        else if (level === 14) { scoreGoal += 124; }
        else if (level === 15) { scoreGoal += 158; }
        else if (level === 16) { scoreGoal += 218; }
        else if (level === 17) { scoreGoal += 302; }
        else if (level === 18) { scoreGoal += 390; }
        else if (level === 19) { scoreGoal += 524; }
        else if (level >= 20) { scoreGoal += 702; }
    }
    return { totalBricks: count, targetScore: scoreGoal };
};

interface UseLevelLogicProps {
    gameModeRef: MutableRefObject<GameMode | null>;
    gameOverStateRef: MutableRefObject<string>; 
    currentLevelRef: MutableRefObject<number>;
    scoreRef: MutableRefObject<number>;
    goldRef: MutableRefObject<number>;
    powerUpsRef: MutableRefObject<PowerUp[]>;
    lasersRef: MutableRefObject<Laser[]>;
    widenLevelRef: MutableRefObject<number>;
    laserShotsRef: MutableRefObject<number>;
    safetyNetCountRef: MutableRefObject<number>;
    gameSpeedFactorRef: MutableRefObject<number>;
    collectionFieldHeightRef: MutableRefObject<number>;
    collectionFieldWidthOffsetRef: MutableRefObject<number>;
    stickyPaddleChargesRef: MutableRefObject<number>;
    paddleShrinkCountdownRef: MutableRefObject<number | null>;
    setupInitialBall: () => void;
    isGameStartedRef: MutableRefObject<boolean>;
    spawnablePowerUpsRef: MutableRefObject<Set<PowerUpType>>;
    initialBonusGoldDecrementCompleteRef: MutableRefObject<boolean>;
    testBrickColumnsRef?: MutableRefObject<number>; 
    testBrickRowsRef?: MutableRefObject<number>; 
    testBrickGridHeightRef?: MutableRefObject<number>; // Added new ref
}

export function useLevelLogic({
    gameModeRef, gameOverStateRef, currentLevelRef, scoreRef, goldRef,
    powerUpsRef, lasersRef, widenLevelRef, laserShotsRef, safetyNetCountRef,
    gameSpeedFactorRef, collectionFieldHeightRef, collectionFieldWidthOffsetRef,
    stickyPaddleChargesRef, paddleShrinkCountdownRef, setupInitialBall, isGameStartedRef,
    spawnablePowerUpsRef,
    initialBonusGoldDecrementCompleteRef,
    testBrickColumnsRef, 
    testBrickRowsRef, 
    testBrickGridHeightRef // Destructure new ref
}: UseLevelLogicProps) {
    const bricksRef = useRef<Brick[][]>([]);
    const targetScoreRef = useRef(0);
    const totalBricksRef = useRef<number>(0);
    const brickColumnsRef = useRef<number>(DEFAULT_BRICK_COLUMNS); 
    const brickRowsRef = useRef<number>(DEFAULT_BRICK_ROWS); 
    const bonusGoldRef = useRef<number>(INITIAL_BONUS_GOLD_CONST);
    const bonusCountdownStartedRef = useRef<boolean>(false);
    const bonusGoldTimerRef = useRef<NodeJS.Timeout | null>(null);
    const bonusGoldDecrementIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const clearBonusGoldTimers = useCallback(() => {
        if (bonusGoldTimerRef.current) clearTimeout(bonusGoldTimerRef.current);
        if (bonusGoldDecrementIntervalRef.current) clearInterval(bonusGoldDecrementIntervalRef.current);
        bonusGoldTimerRef.current = null;
        bonusGoldDecrementIntervalRef.current = null;
        bonusCountdownStartedRef.current = false;
        initialBonusGoldDecrementCompleteRef.current = false;
    }, [initialBonusGoldDecrementCompleteRef]);

    const startBonusGoldCountdown = useCallback(() => {
        if (gameModeRef.current !== 'main' || bonusCountdownStartedRef.current) return;
        bonusCountdownStartedRef.current = true;
        clearBonusGoldTimers();

        const currentLevel = currentLevelRef.current;
        const baseDelay = 5000;
        const incrementPerLevel = 800;
        let startDelay = baseDelay + (currentLevel - 1) * incrementPerLevel;

        const maxDelayForLevel20 = baseDelay + (20 - 1) * incrementPerLevel;
        if (startDelay > maxDelayForLevel20 && currentLevel > 20) {
            startDelay = maxDelayForLevel20;
        }

        bonusGoldTimerRef.current = setTimeout(() => {
            bonusGoldDecrementIntervalRef.current = setInterval(() => {
                if (bonusGoldRef.current > MINIMUM_BONUS_GOLD_CONST && gameOverStateRef.current === 'playing') {
                    bonusGoldRef.current -= 1;
                } else {
                    if (gameOverStateRef.current === 'playing') { 
                         initialBonusGoldDecrementCompleteRef.current = true;
                         console.log("Initial Bonus Gold Decrement Complete.");
                    }
                    if (bonusGoldDecrementIntervalRef.current) {
                        clearInterval(bonusGoldDecrementIntervalRef.current);
                        bonusGoldDecrementIntervalRef.current = null;
                    }
                }
            }, BONUS_GOLD_DECREMENT_INTERVAL);
        }, startDelay);
    }, [clearBonusGoldTimers, gameModeRef, currentLevelRef, gameOverStateRef, initialBonusGoldDecrementCompleteRef]);


    const resetLevel = useCallback((
        mode: GameMode | null, 
        resetScoreAndGold: boolean = true,
        overrideTestCols?: number,
        overrideTestRows?: number,
        overrideTestGridHeight?: number
    ) => {
        const currentMode = mode ?? gameModeRef.current;
        if (!currentMode) return;
        const level = currentLevelRef.current;
        
        let testColsToUse: number | undefined = undefined;
        let testRowsToUse: number | undefined = undefined;
        let testGridHeightToUse: number | undefined = undefined;

        if (currentMode === 'test') {
            testColsToUse = overrideTestCols !== undefined ? overrideTestCols : (testBrickColumnsRef ? testBrickColumnsRef.current : undefined);
            testRowsToUse = overrideTestRows !== undefined ? overrideTestRows : (testBrickRowsRef ? testBrickRowsRef.current : undefined);
            testGridHeightToUse = overrideTestGridHeight !== undefined ? overrideTestGridHeight : (testBrickGridHeightRef ? testBrickGridHeightRef.current : undefined);
        }

        const stats = getLevelStats(level, currentMode, testColsToUse, testRowsToUse, testGridHeightToUse);
        totalBricksRef.current = stats.totalBricks;
        targetScoreRef.current = stats.targetScore;

        const config = getBrickConfiguration(level, currentMode, testColsToUse, testRowsToUse, testGridHeightToUse);
        brickColumnsRef.current = config.brickColumns; 
        brickRowsRef.current = config.brickRows; 
        
        bricksRef.current = initializeBricks(config.brickColumns, config.brickRows, config.brickHeight, level, currentMode, config.actualGridHeight);

        if (resetScoreAndGold) {
            scoreRef.current = 0;
            goldRef.current = 0;
        }
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
        bonusGoldRef.current = INITIAL_BONUS_GOLD_CONST;
        clearBonusGoldTimers();

        if (currentMode === 'main') {
            const spawnableTypes = Array.from(spawnablePowerUpsRef.current);
            const totalSpawnable = spawnableTypes.length;
            if (totalSpawnable > 0) {
                const spacing = (BOARD_WIDTH - (totalSpawnable * POWER_UP_SIZE)) / (totalSpawnable + 1);
                const startY = (BOARD_HEIGHT * 3) / 5;
                let currentX = spacing;

                spawnableTypes.forEach((type) => {
                    const newPowerUp: PowerUp = {
                        x: currentX,
                        y: startY,
                        type: type,
                        status: 'falling',
                        id: Date.now() + Math.random(),
                    };
                    powerUpsRef.current.push(newPowerUp);
                    currentX += POWER_UP_SIZE + spacing;
                });
            }
        }

    }, [ 
        gameModeRef, currentLevelRef, scoreRef, goldRef, powerUpsRef, lasersRef,
        widenLevelRef, laserShotsRef, safetyNetCountRef, gameSpeedFactorRef,
        collectionFieldHeightRef, collectionFieldWidthOffsetRef,
        stickyPaddleChargesRef, paddleShrinkCountdownRef,
        setupInitialBall, isGameStartedRef, clearBonusGoldTimers,
        spawnablePowerUpsRef,
        initialBonusGoldDecrementCompleteRef,
        testBrickColumnsRef, 
        testBrickRowsRef, 
        testBrickGridHeightRef // Added dependency
    ]);

    return {
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
    };
}

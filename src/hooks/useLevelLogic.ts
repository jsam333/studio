// src/hooks/useLevelLogic.ts
import { useRef, useCallback, MutableRefObject } from 'react';
import {
    BRICK_COLUMNS, BRICK_ROWS, BRICK_HEIGHT, TALL_BRICK_HEIGHT,
    BRICK_PADDING, TARGET_TOTAL_BRICK_GRID_HEIGHT, INITIAL_BONUS_GOLD, MINIMUM_BONUS_GOLD,
    BONUS_GOLD_START_DELAY_DEFAULT, BONUS_GOLD_START_DELAY_EXTENDED,
    BONUS_GOLD_START_DELAY_HIGH, BONUS_GOLD_START_DELAY_MAX, BONUS_GOLD_DECREMENT_INTERVAL,
    FIELD_INITIAL_HEIGHT_OFFSET,
    FIELD_INITIAL_WIDTH_OFFSET,
    BASE_BALL_SPEED_FACTOR,
    BOARD_WIDTH,
    POWER_UP_SIZE,
    BOARD_HEIGHT,
} from '../constants';
import { Brick, GameMode, Ball, PowerUp, Laser, PowerUpType } from '../interfaces';
import { initializeBricks } from '../gameLogic';

const INITIAL_BONUS_GOLD_CONST = INITIAL_BONUS_GOLD;
const MINIMUM_BONUS_GOLD_CONST = MINIMUM_BONUS_GOLD;

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
}

export function useLevelLogic({
    gameModeRef, gameOverStateRef, currentLevelRef, scoreRef, goldRef,
    powerUpsRef, lasersRef, widenLevelRef, laserShotsRef, safetyNetCountRef,
    gameSpeedFactorRef, collectionFieldHeightRef, collectionFieldWidthOffsetRef,
    stickyPaddleChargesRef, paddleShrinkCountdownRef, setupInitialBall, isGameStartedRef,
    spawnablePowerUpsRef,
    initialBonusGoldDecrementCompleteRef
}: UseLevelLogicProps) {
    const bricksRef = useRef<Brick[][]>([]);
    const targetScoreRef = useRef(0);
    const totalBricksRef = useRef<number>(0);
    const brickColumnsRef = useRef<number>(BRICK_COLUMNS);
    const brickRowsRef = useRef<number>(BRICK_ROWS);
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
        let startDelay;
        if (currentLevel >= 16 && currentLevel <= 20) {
            startDelay = BONUS_GOLD_START_DELAY_MAX;
        } else if (currentLevel >= 11 && currentLevel <= 15) {
            startDelay = BONUS_GOLD_START_DELAY_HIGH;
        } else if (currentLevel >= 6 && currentLevel <= 10) {
            startDelay = BONUS_GOLD_START_DELAY_EXTENDED;
        } else {
            startDelay = BONUS_GOLD_START_DELAY_DEFAULT;
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


    const resetLevel = useCallback((mode: GameMode | null, resetScoreAndGold: boolean = true) => {
        const currentMode = mode ?? gameModeRef.current;
        if (!currentMode) return;
        let cols = BRICK_COLUMNS; let rows = BRICK_ROWS; let targetHeight = BRICK_HEIGHT;
        const level = currentLevelRef.current;

        if (currentMode === 'main') {
             if (level === 1) { cols = 3; rows = 2; targetHeight = 20; }
             else if (level === 2) { cols = 4; rows = 3; targetHeight = 18; }
             else if (level === 3) { cols = 9; rows = 4; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 4) { cols = 14; rows = 5; targetHeight = TALL_BRICK_HEIGHT; } 
             else if (level === 5) { cols = 30; rows = 6; targetHeight = TALL_BRICK_HEIGHT; } // Changed cols to 30 for level 5
             else if (level === 6) { cols = 11; rows = 7; targetHeight = TALL_BRICK_HEIGHT; }
             else if (level === 7) { cols = 13; rows = 8; targetHeight = TALL_BRICK_HEIGHT; }
             else if (level === 8) { cols = 15; rows = 9; targetHeight = TALL_BRICK_HEIGHT; }
             else if (level === 9) { cols = 17; rows = 10; targetHeight = TALL_BRICK_HEIGHT; }
             else { 
                 cols = 4; 
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
                 else if (level === 20) { cols = 60; rows = 21; }
                 else { rows = 7; } 

                 if (rows > 0) {
                     targetHeight = (TARGET_TOTAL_BRICK_GRID_HEIGHT - (rows - 1) * BRICK_PADDING) / rows;
                     targetHeight = Math.max(1, targetHeight); 
                 } else {
                     targetHeight = BRICK_HEIGHT; 
                 }
             }
        } else {
            cols = BRICK_COLUMNS; rows = BRICK_ROWS; targetHeight = BRICK_HEIGHT;
        }

        brickColumnsRef.current = cols;
        brickRowsRef.current = rows;
        bricksRef.current = initializeBricks(cols, rows, targetHeight, currentLevelRef.current, gameModeRef.current);

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

         let scoreGoal = count;
        if (currentMode === 'main' && level === 6) { scoreGoal += 8; }
        if (currentMode === 'main' && level === 7) { scoreGoal += 21; }
        if (currentMode === 'main' && level === 8) { scoreGoal += 41; }
        if (currentMode === 'main' && level === 9) { scoreGoal += 68; }
        if (currentMode === 'main' && level === 10) { scoreGoal += 110; }
        if (currentMode === 'main' && level === 11) { scoreGoal += 158; }
        if (currentMode === 'main' && level === 12) { scoreGoal += 228; }
        if (currentMode === 'main' && level === 13) { scoreGoal += 314; }
        if (currentMode === 'main' && level === 14) { scoreGoal += 419; }
        if (currentMode === 'main' && level === 15) { scoreGoal += 560; }
        if (currentMode === 'main' && level === 16) { scoreGoal += 816; }
        if (currentMode === 'main' && level === 17) { scoreGoal += 1134; }
        if (currentMode === 'main' && level === 18) { scoreGoal += 1520; }
        if (currentMode === 'main' && level === 19) { scoreGoal += 2090; }
        if (currentMode === 'main' && level === 20) { scoreGoal += 2898; }
        targetScoreRef.current = scoreGoal;

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
        initialBonusGoldDecrementCompleteRef
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

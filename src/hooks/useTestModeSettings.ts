// src/hooks/useTestModeSettings.ts
import { useRef, useState, useEffect } from 'react';
import {
    INITIAL_TEST_POWER_UP_SPAWN_CHANCE,
    TARGET_TOTAL_BRICK_GRID_HEIGHT,
} from '../constants';

export const TEST_DEFAULT_BRICK_COLUMNS = 12;
export const TEST_DEFAULT_BRICK_ROWS = 8;

export function useTestModeSettings() {
    const testPowerUpSpawnChanceRef = useRef<number>(INITIAL_TEST_POWER_UP_SPAWN_CHANCE);
    const testBrickColumnsRef = useRef<number>(TEST_DEFAULT_BRICK_COLUMNS);
    const testBrickRowsRef = useRef<number>(TEST_DEFAULT_BRICK_ROWS);
    const testBrickGridHeightRef = useRef<number>(TARGET_TOTAL_BRICK_GRID_HEIGHT);

    const [testPowerUpSpawnChance, setTestPowerUpSpawnChance] = useState<number>(INITIAL_TEST_POWER_UP_SPAWN_CHANCE);
    const [testBrickColumns, setTestBrickColumns] = useState<number>(TEST_DEFAULT_BRICK_COLUMNS);
    const [testBrickRows, setTestBrickRows] = useState<number>(TEST_DEFAULT_BRICK_ROWS);
    const [testBrickGridHeight, setTestBrickGridHeight] = useState<number>(TARGET_TOTAL_BRICK_GRID_HEIGHT);

    useEffect(() => {
        testPowerUpSpawnChanceRef.current = testPowerUpSpawnChance;
    }, [testPowerUpSpawnChance]);

    useEffect(() => {
        testBrickColumnsRef.current = testBrickColumns;
    }, [testBrickColumns]);

    useEffect(() => {
        testBrickRowsRef.current = testBrickRows;
    }, [testBrickRows]);

    useEffect(() => {
        testBrickGridHeightRef.current = testBrickGridHeight;
    }, [testBrickGridHeight]);

    return {
        testPowerUpSpawnChanceRef,
        testBrickColumnsRef,
        testBrickRowsRef,
        testBrickGridHeightRef,
        testPowerUpSpawnChance,
        setTestPowerUpSpawnChance,
        testBrickColumns,
        setTestBrickColumns,
        testBrickRows,
        setTestBrickRows,
        testBrickGridHeight,
        setTestBrickGridHeight,
    };
}

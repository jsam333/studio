// src/gameUtils.ts
import {
    INITIAL_PADDLE_WIDTH, MAX_PADDLE_WIDTH, MIN_PADDLE_WIDEN_DURATION, MAX_PADDLE_WIDEN_DURATION,
    BASE_POWER_UP_CHANCE, POWER_UP_COUNT_THRESHOLD, POWER_UP_CHANCE_REDUCTION_PER_EXTRA, // Reverted imports
    POWER_UP_SECOND_THRESHOLD, POWER_UP_SECOND_CHANCE_REDUCTION_PER_EXTRA // Reverted imports
} from './constants';

// --- Helper to calculate dynamic power-up chance ---
// Reverted to original logic
export const calculatePowerUpChance = (currentPowerUpCount: number): number => {
    if (currentPowerUpCount <= POWER_UP_COUNT_THRESHOLD) {
        return BASE_POWER_UP_CHANCE;
    } else if (currentPowerUpCount <= POWER_UP_SECOND_THRESHOLD) {
        const extraPowerUps = currentPowerUpCount - POWER_UP_COUNT_THRESHOLD;
        const reduction = extraPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
        return Math.max(0, BASE_POWER_UP_CHANCE - reduction);
    } else {
        const extraPowerUps = currentPowerUpCount - POWER_UP_SECOND_THRESHOLD;
        const reduction = (POWER_UP_SECOND_THRESHOLD - POWER_UP_COUNT_THRESHOLD) * POWER_UP_CHANCE_REDUCTION_PER_EXTRA + extraPowerUps * POWER_UP_SECOND_CHANCE_REDUCTION_PER_EXTRA;
        return Math.max(0, BASE_POWER_UP_CHANCE - reduction);
    }
};

// --- Calculate Dynamic Shrink Duration (Exponential Curve) ---
export const calculateShrinkDuration = (currentWidth: number): number => {
    const widthRange = MAX_PADDLE_WIDTH - INITIAL_PADDLE_WIDTH;

    if (widthRange <= 0) { // Avoid division by zero or invalid range
        return MAX_PADDLE_WIDEN_DURATION;
    }

    // Normalize current width to a 0-1 range relative to initial and max widths
    const normalizedWidth = Math.max(0, Math.min(1, (currentWidth - INITIAL_PADDLE_WIDTH) / widthRange));

    // Use an exponential curve for duration decrease
    const exponent = 3; // Adjust exponent for curve steepness
    const duration = MIN_PADDLE_WIDEN_DURATION +
                     (MAX_PADDLE_WIDEN_DURATION - MIN_PADDLE_WIDEN_DURATION) *
                     Math.pow(1 - normalizedWidth, exponent);

    // Clamp duration just in case
    return Math.max(MIN_PADDLE_WIDEN_DURATION, Math.min(MAX_PADDLE_WIDEN_DURATION, duration));
};
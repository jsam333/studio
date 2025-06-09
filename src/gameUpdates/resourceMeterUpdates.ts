import { GameStateRefs } from '../interfaces';

const SLOW_THRESHOLD = 0.5; // Velocity threshold to start gaining resource
const FAST_THRESHOLD = 2.0; // Velocity threshold to start draining resource
const EXTREME_THRESHOLD = 5.0; // New threshold for instant drain
const GAIN_RATE = 0.1;    // Resource points per millisecond when slow
const DRAIN_RATE = 1.0;   // Resource points per millisecond when fast
const EXTREME_DRAIN_RATE = 1.5; // New drain rate for extreme speed
const MAX_RESOURCE = 100;

export const updateResourceMeter = (refs: GameStateRefs, elapsedTime: number) => {
    if (elapsedTime <= 0) return;

    const distanceMoved = Math.abs(refs.paddleXRef.current - refs.prevPaddleXRef.current);
    const velocity = distanceMoved / elapsedTime; // pixels per millisecond

    let currentResource = refs.resourceMeterRef.current;

    if (velocity < SLOW_THRESHOLD) {
        currentResource += GAIN_RATE * elapsedTime;
    } else if (velocity > EXTREME_THRESHOLD) {
        currentResource -= EXTREME_DRAIN_RATE * elapsedTime;
    } else if (velocity > FAST_THRESHOLD) {
        currentResource -= DRAIN_RATE * elapsedTime;
    }

    // Clamp the resource value between 0 and MAX_RESOURCE
    refs.resourceMeterRef.current = Math.max(0, Math.min(MAX_RESOURCE, currentResource));

    // Update the previous paddle position for the next frame's calculation
    refs.prevPaddleXRef.current = refs.paddleXRef.current;
}; 

// src/gameUpdates/powerUpUpdates.ts
import { PowerUp, PowerUpType } from '../interfaces';
import { GameStateRefs } from '../interfaces'; // Corrected import path/type if needed
import { BASE_POWER_UP_SPEED, BOARD_HEIGHT, PADDLE_HEIGHT, POWER_UP_SIZE, PADDLE_Y } from '../constants'; // Reverted to BASE_POWER_UP_SPEED, Added PADDLE_Y

export const updatePowerUps = (
    refs: GameStateRefs,
    gameSpeedFactor: number, // Keep parameter for signature consistency, but don't use it for speed calculation
    newlySpawnedPowerUps: PowerUp[],
    collectedPowerUpTypes: PowerUpType[], // Pass this array to add collected types
    deltaTime: number // Add deltaTime parameter
): void => { // Return void as we modify the array in place
    const currentPowerUpSpeed = BASE_POWER_UP_SPEED;
    const currentFieldHeight = refs.collectionFieldHeightRef.current;
    const currentFieldWidthOffset = refs.collectionFieldWidthOffsetRef.current;
    const paddleTopY = PADDLE_Y;
    const fieldTopY = paddleTopY - currentFieldHeight;
    const currentPaddleWidth = refs.paddleWidthRef.current;
    const currentPaddleX = refs.paddleXRef.current;
    const fieldLeftX = currentPaddleX - currentFieldWidthOffset;
    const fieldRightX = currentPaddleX + currentPaddleWidth + currentFieldWidthOffset;

    const powerUpsToRemoveIndices = new Set<number>();

    // Iterate through existing power-ups to update and mark for removal
    for (let i = 0; i < refs.powerUpsRef.current.length; i++) {
        const pu = refs.powerUpsRef.current[i];
        
        if (pu.status === 'falling') {
            const movement = currentPowerUpSpeed * deltaTime;
            const nextY = pu.y + movement;
            let collected = false;
            let remove = false;

            const puBottom = nextY + POWER_UP_SIZE;
            const puRight = pu.x + POWER_UP_SIZE;

            // Check collision with paddle area
            if (puBottom >= paddleTopY &&
                nextY < paddleTopY + PADDLE_HEIGHT && 
                puRight > currentPaddleX &&
                pu.x < currentPaddleX + currentPaddleWidth) {
                collected = true;
            }

            // Check collision with collection field
            if (!collected && (currentFieldHeight > 0 || currentFieldWidthOffset > 0)) {
                if (puRight > fieldLeftX &&
                    pu.x < fieldRightX && 
                    puBottom > fieldTopY && 
                    nextY < paddleTopY) {
                    collected = true;
                }
            }

            if (collected) {
                remove = true;
                collectedPowerUpTypes.push(pu.type);
            } else if (nextY >= BOARD_HEIGHT) { // Fell off screen
                remove = true;
            }

            if (remove) {
                powerUpsToRemoveIndices.add(i);
            } else {
                // Update position if not removed
                pu.y = nextY;
            }
        }
        // Add logic here if power-ups can expire or have other statuses that cause removal
    }

    // Remove marked power-ups by iterating backwards
    if (powerUpsToRemoveIndices.size > 0) {
         let writeIndex = 0;
         for (let readIndex = 0; readIndex < refs.powerUpsRef.current.length; readIndex++) {
             if (!powerUpsToRemoveIndices.has(readIndex)) {
                  if (writeIndex !== readIndex) {
                       refs.powerUpsRef.current[writeIndex] = refs.powerUpsRef.current[readIndex];
                  }
                  writeIndex++;
             }
         }
         refs.powerUpsRef.current.length = writeIndex; // Truncate the array
    }

    // Add newly spawned power-ups
    if (newlySpawnedPowerUps.length > 0) {
        refs.powerUpsRef.current.push(...newlySpawnedPowerUps);
    }
    // The function now modifies refs.powerUpsRef.current directly
};

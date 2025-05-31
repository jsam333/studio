// src/gameUpdates/powerUpUpdates.ts
import { PowerUp, PowerUpType } from '../interfaces';
import { GameStateRefs } from '../interfaces';
import { BASE_POWER_UP_SPEED, BOARD_HEIGHT, PADDLE_HEIGHT, POWER_UP_SIZE, PADDLE_Y } from '../constants';
import { soundSystem } from '../soundSystem'; // Import the sound system

const POWER_UP_ANIMATION_DURATION_MS = 75; // Changed to 75

export const updatePowerUps = (
    refs: GameStateRefs,
    gameSpeedFactor: number, 
    newlySpawnedPowerUps: PowerUp[],
    collectedPowerUpTypes: PowerUpType[],
    deltaTime: number 
): void => {
    const currentTime = Date.now();
    const currentPowerUpSpeed = BASE_POWER_UP_SPEED;
    const currentFieldHeight = refs.collectionFieldHeightRef.current;
    const currentFieldWidthOffset = refs.collectionFieldWidthOffsetRef.current;
    const paddleTopY = PADDLE_Y;
    const fieldTopY = paddleTopY - currentFieldHeight;
    const currentPaddleWidth = refs.paddleWidthRef.current;
    const currentPaddleX = refs.paddleXRef.current;
    const fieldLeftX = currentPaddleX - currentFieldWidthOffset;
    const fieldRightX = currentPaddleX + currentPaddleWidth + currentFieldWidthOffset;

    const targetAnimX = currentPaddleX + (currentPaddleWidth / 2) - (POWER_UP_SIZE / 2);
    const targetAnimY = paddleTopY;

    const powerUpsToRemoveIndices = new Set<number>();

    for (let i = 0; i < refs.powerUpsRef.current.length; i++) {
        const pu = refs.powerUpsRef.current[i];
        let remove = false;

        if (pu.status === 'collected') {
            // This case handles power-ups already marked as collected in a previous frame (e.g., by animation completion)
            // The sound should play when it *becomes* collected.
            collectedPowerUpTypes.push(pu.type);
            powerUpsToRemoveIndices.add(i);
            continue; 
        }

        if (pu.status === 'falling') {
            const movement = currentPowerUpSpeed * deltaTime;
            const nextY = pu.y + movement;
            let collectedByPaddle = false;
            let collectedByField = false;

            const puBottom = nextY + POWER_UP_SIZE;
            const puRight = pu.x + POWER_UP_SIZE;

            if (puBottom >= paddleTopY &&
                nextY < paddleTopY + PADDLE_HEIGHT && 
                puRight > currentPaddleX &&
                pu.x < currentPaddleX + currentPaddleWidth) {
                collectedByPaddle = true;
            }

            if (!collectedByPaddle && (currentFieldHeight > 0 || currentFieldWidthOffset > 0)) {
                if (puRight > fieldLeftX &&
                    pu.x < fieldRightX && 
                    puBottom > fieldTopY && 
                    nextY < paddleTopY) {
                    collectedByField = true;
                }
            }

            if (collectedByPaddle) {
                pu.status = 'collected'; 
                soundSystem.playPowerUpSound(); // Play sound on direct paddle collection
            } else if (collectedByField) {
                pu.status = 'animatingToPaddle';
                pu.animationStartTime = currentTime;
                pu.startX = pu.x;
                pu.startY = pu.y;
                // Sound will play when animation finishes and status becomes 'collected'
            } else if (nextY >= BOARD_HEIGHT) { 
                remove = true; 
            }

            if (remove) {
                powerUpsToRemoveIndices.add(i);
            } else if (pu.status === 'falling') { 
                pu.y = nextY;
            }
        } else if (pu.status === 'animatingToPaddle') {
            const elapsedTime = currentTime - (pu.animationStartTime || currentTime);
            const animationProgress = Math.min(1, elapsedTime / POWER_UP_ANIMATION_DURATION_MS);

            if (pu.startX !== undefined && pu.startY !== undefined) {
                pu.x = pu.startX + (targetAnimX - pu.startX) * animationProgress;
                pu.y = pu.startY + (targetAnimY - pu.startY) * animationProgress;
            }

            if (animationProgress >= 1) {
                pu.status = 'collected'; 
                soundSystem.playPowerUpSound(); // Play sound when collection animation finishes
                pu.x = targetAnimX; // Ensure final position
                pu.y = targetAnimY;
            }
        }
    }

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
         refs.powerUpsRef.current.length = writeIndex;
    }

    if (newlySpawnedPowerUps.length > 0) {
        refs.powerUpsRef.current.push(...newlySpawnedPowerUps);
    }
};

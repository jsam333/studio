
// src/gameUpdates/powerUpUpdates.ts
import { PowerUp, PowerUpType } from '../interfaces';
import { GameStateRefs } from '../interfaces'; // Corrected import path/type if needed
import { BASE_POWER_UP_SPEED, BOARD_HEIGHT, PADDLE_HEIGHT, POWER_UP_SIZE } from '../constants'; // Reverted to BASE_POWER_UP_SPEED

export const updatePowerUps = (
    refs: GameStateRefs,
    gameSpeedFactor: number,
    newlySpawnedPowerUps: PowerUp[],
    collectedPowerUpTypes: PowerUpType[] // Pass this array to add collected types
): PowerUp[] => {
    const nextPowerUpsArray: PowerUp[] = [];
    // Reverted to BASE_POWER_UP_SPEED
    const currentPowerUpSpeed = BASE_POWER_UP_SPEED * gameSpeedFactor;
    const currentFieldHeight = refs.collectionFieldHeightRef.current;
    const currentFieldWidthOffset = refs.collectionFieldWidthOffsetRef.current;
    const paddleTopY = BOARD_HEIGHT - PADDLE_HEIGHT;
    const fieldTopY = paddleTopY - currentFieldHeight;
    const currentPaddleWidth = refs.paddleWidthRef.current;
    const currentPaddleX = refs.paddleXRef.current;
    const fieldLeftX = currentPaddleX - currentFieldWidthOffset;
    const fieldRightX = currentPaddleX + currentPaddleWidth + currentFieldWidthOffset;

    refs.powerUpsRef.current.forEach(pu => {
        const nextY = pu.y + currentPowerUpSpeed;
        let collected = false;
        let keep = true;

        if (pu.status === 'falling') {
            // Check collision with paddle
            if (nextY + POWER_UP_SIZE > paddleTopY && nextY < paddleTopY + currentPowerUpSpeed /* Check if crossed paddle top line */) {
                if (pu.x + POWER_UP_SIZE > currentPaddleX && pu.x < currentPaddleX + currentPaddleWidth) {
                    collected = true;
                }
            }

            // Check collision with collection field (if active)
            if (!collected && (currentFieldHeight > 0 || currentFieldWidthOffset > 0)) {
                const puBottom = nextY + POWER_UP_SIZE;
                const puRight = pu.x + POWER_UP_SIZE;
                if (puRight > fieldLeftX && pu.x < fieldRightX && puBottom > fieldTopY && nextY < paddleTopY) {
                    collected = true;
                }
            }

            if (collected) {
                keep = false;
                collectedPowerUpTypes.push(pu.type);
            } else if (nextY >= BOARD_HEIGHT) {
                // Fell off screen
                keep = false;
            }
        }

        if (keep) {
            nextPowerUpsArray.push({ ...pu, y: nextY });
        }
    });

    return nextPowerUpsArray.concat(newlySpawnedPowerUps);
};

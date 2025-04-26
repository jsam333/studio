
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
): PowerUp[] => {
    const nextPowerUpsArray: PowerUp[] = [];
    // *** MODIFIED: Removed gameSpeedFactor multiplication ***
    const currentPowerUpSpeed = BASE_POWER_UP_SPEED;
    const currentFieldHeight = refs.collectionFieldHeightRef.current;
    const currentFieldWidthOffset = refs.collectionFieldWidthOffsetRef.current;
    // Use PADDLE_Y constant instead of calculating from BOARD_HEIGHT
    // const paddleTopY = BOARD_HEIGHT - PADDLE_HEIGHT; // Less reliable if PADDLE_Y is defined
    const paddleTopY = PADDLE_Y;
    const fieldTopY = paddleTopY - currentFieldHeight;
    const currentPaddleWidth = refs.paddleWidthRef.current;
    const currentPaddleX = refs.paddleXRef.current;
    const fieldLeftX = currentPaddleX - currentFieldWidthOffset;
    const fieldRightX = currentPaddleX + currentPaddleWidth + currentFieldWidthOffset;

    refs.powerUpsRef.current.forEach(pu => {
        // Apply deltaTime to movement
        const movement = currentPowerUpSpeed * deltaTime;
        const nextY = pu.y + movement;
        let collected = false;
        let keep = true;

        if (pu.status === 'falling') {
            const puBottom = nextY + POWER_UP_SIZE;
            const puRight = pu.x + POWER_UP_SIZE;

            // Check collision with paddle area (Simplified AABB check)
            // Check if vertical range overlaps paddle's vertical range and horizontal range overlaps paddle's horizontal range
            if (puBottom >= paddleTopY && // Bottom edge is at or below paddle top
                nextY < paddleTopY + PADDLE_HEIGHT && // Top edge is above paddle bottom (using nextY, simplified)
                puRight > currentPaddleX && // Right edge is past paddle left
                pu.x < currentPaddleX + currentPaddleWidth) // Left edge is before paddle right
            {
                collected = true;
            }

            // Check collision with collection field (if active and not already collected)
            if (!collected && (currentFieldHeight > 0 || currentFieldWidthOffset > 0)) {
                if (puRight > fieldLeftX && // Right edge past field left
                    pu.x < fieldRightX && // Left edge before field right
                    puBottom > fieldTopY && // Bottom edge below field top
                    nextY < paddleTopY) // Top edge above paddle top (ensures it's in the field area)
                {
                    collected = true;
                }
            }


            if (collected) {
                keep = false;
                collectedPowerUpTypes.push(pu.type);
            } else if (nextY >= BOARD_HEIGHT) { // Check against BOARD_HEIGHT
                // Fell off screen
                keep = false;
            }
        }

        if (keep) {
            // Only update position if not collected or fallen off
            nextPowerUpsArray.push({ ...pu, y: nextY });
        }
    });

    // Combine existing (kept) power-ups with newly spawned ones
    return nextPowerUpsArray.concat(newlySpawnedPowerUps);
};

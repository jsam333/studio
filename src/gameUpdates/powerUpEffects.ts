// src/gameUpdates/powerUpEffects.ts
import { PowerUpType, Ball, Brick } from '../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../interfaces';
import { createNewBall } from './gameLoopUtils';
import {
    FIELD_MAX_HEIGHT_OFFSET, FIELD_HEIGHT_INCREMENT,
    FIELD_MAX_WIDTH_OFFSET, FIELD_WIDTH_INCREMENT, SPEED_UP_INCREMENT,
    SPLITTING_BALL_DURATION, BIG_BALL_DURATION, BOARD_HEIGHT, PADDLE_HEIGHT,
    BALL_SIZE, BUILDER_BALL_DURATION, BLACK_BALL_DURATION, BRICK_COLUMNS,
    BRICK_ROWS, PIERCE_BALL_HITS, PADDLE_WIDEN_INCREMENT, MAX_PADDLE_WIDTH,
    BOARD_WIDTH, MAX_BRICK_UPGRADE_LEVEL // Added MAX_BRICK_UPGRADE_LEVEL
    // STICKY_PADDLE_DURATION // Removed duration constant
    // Re-added SPEED_UP_INCREMENT, SPLITTING_BALL_DURATION, BIG_BALL_DURATION, BUILDER_BALL_DURATION, BLACK_BALL_DURATION
} from '../constants';

export const applyPowerUpEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    collectedPowerUpTypes: PowerUpType[],
    currentTime: number,
    gameSpeedFactor: number
) => {
    collectedPowerUpTypes.forEach(type => {
        switch (type) {
            // ... (other power-up cases) ...

            case 'REINFORCE_BRICK': { // Change to set upgradeLevel to 2
                const candidates: { c: number; r: number }[] = [];
                for (let c = 0; c < BRICK_COLUMNS; c++) {
                    for (let r = 0; r < BRICK_ROWS; r++) {
                        const brick = refs.bricksRef.current[c]?.[r];
                        // Find active bricks that are level 0 or 1 (can be reinforced to level 2)
                        if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && (!brick.upgradeLevel || brick.upgradeLevel < 2)) {
                            candidates.push({ c, r });
                        }
                    }
                }
                if (candidates.length > 0) {
                    const index = Math.floor(Math.random() * candidates.length);
                    const chosenCandidate = candidates[index];
                    const brickToReinforce = refs.bricksRef.current[chosenCandidate.c]?.[chosenCandidate.r];
                    if (brickToReinforce) {
                        brickToReinforce.upgradeLevel = 2; // *** Set upgrade level to 2 ***
                        brickToReinforce.isSpecial = false;
                        brickToReinforce.isBomb = false;
                    }
                }
                break;
            }

            case 'BOMB_BRICK': {
                const candidates: { c: number; r: number }[] = [];
                for (let c = 0; c < BRICK_COLUMNS; c++) {
                    for (let r = 0; r < BRICK_ROWS; r++) {
                        const brick = refs.bricksRef.current[c]?.[r];
                        if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && (!brick.upgradeLevel || brick.upgradeLevel === 0)) {
                           candidates.push({ c, r });
                        }
                    }
                }
                if (candidates.length > 0) {
                    const index = Math.floor(Math.random() * candidates.length);
                    const chosenCandidate = candidates[index];
                    const brickToBomb = refs.bricksRef.current[chosenCandidate.c]?.[chosenCandidate.r];
                    if (brickToBomb) {
                        brickToBomb.isBomb = true;
                        brickToBomb.isSpecial = false;
                        brickToBomb.upgradeLevel = 0;
                    }
                }
                break;
            }
            case 'HOMING_BALL': {
                const targetBall = refs.ballsRef.current.find(b => !b.isHoming);
                if (targetBall) {
                    targetBall.isHoming = true;
                } else if (refs.ballsRef.current.length > 0) {
                    refs.ballsRef.current[0].isHoming = true;
                }
                break;
            }
            case 'COLLECTION_FIELD': {
                refs.collectionFieldHeightRef.current = Math.min(
                    FIELD_MAX_HEIGHT_OFFSET,
                    refs.collectionFieldHeightRef.current + FIELD_HEIGHT_INCREMENT
                );
                refs.collectionFieldWidthOffsetRef.current = Math.min(
                    FIELD_MAX_WIDTH_OFFSET,
                    refs.collectionFieldWidthOffsetRef.current + FIELD_WIDTH_INCREMENT
                );
                callbacks.scheduleFieldShrink();
                break;
            }
            case 'SPEED_UP': {
                const previousFactor = refs.gameSpeedFactorRef.current;
                // Reverted to use SPEED_UP_INCREMENT constant
                refs.gameSpeedFactorRef.current += SPEED_UP_INCREMENT;
                const newFactor = refs.gameSpeedFactorRef.current;
                const actualIncreaseFactor = newFactor / previousFactor;
                refs.ballsRef.current.forEach(ball => {
                    ball.speedX *= actualIncreaseFactor;
                    ball.speedY *= actualIncreaseFactor;
                });
                break;
            }
             case 'SPLITTING_BALL': {
                 const targetBall = refs.ballsRef.current.find(b => !b.isSplitting);
                 if (targetBall) {
                     targetBall.isSplitting = true;
                     targetBall.splittingEndTime = currentTime + SPLITTING_BALL_DURATION; // Re-added duration usage
                 } else if (refs.ballsRef.current.length > 0) {
                     refs.ballsRef.current[0].isSplitting = true;
                     refs.ballsRef.current[0].splittingEndTime = currentTime + SPLITTING_BALL_DURATION; // Re-added duration usage
                 }
                 break;
             }
             case 'BIG_BALL': {
                 const targetBall = refs.ballsRef.current.find(b => !b.isBig);
                 if (targetBall) {
                     targetBall.isBig = true;
                     targetBall.bigEndTime = currentTime + BIG_BALL_DURATION; // Re-added duration usage
                 } else if (refs.ballsRef.current.length > 0) {
                     refs.ballsRef.current[0].isBig = true;
                     refs.ballsRef.current[0].bigEndTime = currentTime + BIG_BALL_DURATION; // Re-added duration usage
                 }
                 break;
             }
             case 'MULTI_BALL': {
                 let sx = (Math.random() - 0.5) * 6;
                 let sy = -3 - Math.random() * 2;
                 refs.ballsRef.current.push(createNewBall(
                     refs.paddleXRef.current + refs.paddleWidthRef.current / 2 + (Math.random() - 0.5) * 10,
                     BOARD_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 5,
                     sx, sy, gameSpeedFactor
                 ));
                 break;
             }
             case 'BUILDER_BALL': {
                 const targetBall = refs.ballsRef.current.find(b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
                 if (targetBall) {
                     targetBall.isBlue = true;
                     targetBall.blueEndTime = currentTime + BUILDER_BALL_DURATION; // Re-added duration usage
                     targetBall.isBlack = false; targetBall.pierceHitsRemaining = 0; targetBall.blackEndTime = undefined;
                 } else {
                     const fallbackBall = refs.ballsRef.current.find(b => !b.isBlack && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
                     if (fallbackBall) {
                         fallbackBall.isBlue = true;
                         fallbackBall.blueEndTime = currentTime + BUILDER_BALL_DURATION; // Re-added duration usage
                         fallbackBall.isBlack = false; fallbackBall.pierceHitsRemaining = 0; fallbackBall.blackEndTime = undefined;
                     }
                 }
                 break;
             }
             case 'BLACK_BALL': {
                 const targetBall = refs.ballsRef.current.find(b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
                 if (targetBall) {
                     targetBall.isBlack = true; targetBall.blackEndTime = currentTime + BLACK_BALL_DURATION; // Reverted to use BLACK_BALL_DURATION
                     targetBall.pierceHitsRemaining = 0; targetBall.isBlue = false; targetBall.blueEndTime = undefined;
                 } else if (refs.ballsRef.current.length > 0) {
                     const firstBall = refs.ballsRef.current[0];
                     firstBall.isBlack = true; firstBall.blackEndTime = currentTime + BLACK_BALL_DURATION; // Reverted to use BLACK_BALL_DURATION
                     firstBall.pierceHitsRemaining = 0; firstBall.isBlue = false; firstBall.blueEndTime = undefined;
                 }
                 break;
             }
             case 'UPGRADE_BRICK': { // Change to set upgradeLevel to 3
                 const candidates: { c: number; r: number }[] = [];
                 for (let c = 0; c < BRICK_COLUMNS; c++) {
                     for (let r = 0; r < BRICK_ROWS; r++) {
                         const brick = refs.bricksRef.current[c]?.[r];
                         // Find active bricks that are not special, not bomb, and below max upgrade level (3)
                         if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && (!brick.upgradeLevel || brick.upgradeLevel < MAX_BRICK_UPGRADE_LEVEL)) {
                            candidates.push({ c, r });
                         }
                     }
                 }
                 if (candidates.length > 0) {
                     const index = Math.floor(Math.random() * candidates.length);
                     const chosenCandidate = candidates[index];
                     const brickToUpgrade = refs.bricksRef.current[chosenCandidate.c]?.[chosenCandidate.r];
                     if (brickToUpgrade) {
                         // *** Set upgrade level directly to 3 ***
                         brickToUpgrade.upgradeLevel = 3; 
                         // Ensure it's not marked as special or bomb
                         brickToUpgrade.isSpecial = false;
                         brickToUpgrade.isBomb = false;
                     }
                 }
                 break;
             }
             case 'PIERCE_BALL': {
                 const targetBall = refs.ballsRef.current.find(b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
                 if (targetBall) {
                     targetBall.pierceHitsRemaining = PIERCE_BALL_HITS;
                     targetBall.isBlue = false; targetBall.blueEndTime = undefined;
                 } else if (refs.ballsRef.current.length > 0 && !refs.ballsRef.current[0].isBlack && !refs.ballsRef.current[0].isBlue) {
                     const firstBall = refs.ballsRef.current[0];
                     firstBall.pierceHitsRemaining = PIERCE_BALL_HITS;
                     firstBall.isBlue = false; firstBall.blueEndTime = undefined;
                 }
                 break;
             }
             case 'WIDEN_PADDLE': {
                 const originalWidth = refs.paddleWidthRef.current;
                 const currentPaddleX = refs.paddleXRef.current;
                 const newWidthAttempt = originalWidth + PADDLE_WIDEN_INCREMENT;
                 const finalNewWidth = Math.min(MAX_PADDLE_WIDTH, newWidthAttempt);
                 const widthIncrease = finalNewWidth - originalWidth;

                 if (widthIncrease > 0) {
                     let newPaddleX = currentPaddleX - widthIncrease / 2;
                     newPaddleX = Math.max(0, newPaddleX);
                     newPaddleX = Math.min(BOARD_WIDTH - finalNewWidth, newPaddleX);
                     refs.paddleWidthRef.current = finalNewWidth;
                     refs.paddleXRef.current = newPaddleX;
                     refs.widenLevelRef.current++;
                     callbacks.schedulePaddleShrink();
                 } else {
                     callbacks.schedulePaddleShrink();
                 }
                 break;
             }
             case 'LASER_PADDLE': {
                 refs.laserShotsRef.current++;
                 break;
             }
             case 'REGEN_BRICK': {
                 const destroyedBricks: { c: number; r: number }[] = [];
                 for (let c = 0; c < BRICK_COLUMNS; c++) {
                     for (let r = 0; r < BRICK_ROWS; r++) {
                         const brick = refs.bricksRef.current[c]?.[r];
                         if (brick && brick.status === 0) {
                             destroyedBricks.push({ c, r });
                         }
                     }
                 }
                 if (destroyedBricks.length > 0) {
                     const index = Math.floor(Math.random() * destroyedBricks.length);
                     const targetCoords = destroyedBricks[index];
                     const brickToRegen = refs.bricksRef.current[targetCoords.c]?.[targetCoords.r];
                     if (brickToRegen) {
                         brickToRegen.status = 1;
                         brickToRegen.isSpecial = false;
                         brickToRegen.isBomb = false;
                         brickToRegen.upgradeLevel = 0;
                     }
                 }
                 break;
             }
             case 'SAFETY_NET': {
                 refs.safetyNetCountRef.current++;
                 break;
             }
             case 'MAKE_SPECIAL': {
                 const specialCandidates: { c: number; r: number }[] = [];
                 for (let c = 0; c < BRICK_COLUMNS; c++) {
                     for (let r = 0; r < BRICK_ROWS; r++) {
                         const brick = refs.bricksRef.current[c]?.[r];
                         if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb) {
                             specialCandidates.push({ c, r });
                         }
                     }
                 }
                 if (specialCandidates.length > 0) {
                     const index = Math.floor(Math.random() * specialCandidates.length);
                     const targetCoords = specialCandidates[index];
                     const brickToMakeSpecial = refs.bricksRef.current[targetCoords.c]?.[targetCoords.r];
                     if (brickToMakeSpecial) {
                         brickToMakeSpecial.isSpecial = true;
                         brickToMakeSpecial.upgradeLevel = 0;
                         brickToMakeSpecial.isBomb = false;
                     }
                 }
                 break;
             }
            case 'STICKY_PADDLE': { // Changed sticky paddle activation
                refs.stickyPaddleChargesRef.current++; // Increment charges
                break;
            }
             case 'ALL_IN_ONE': {
                // Apply effects individually
                applyPowerUpEffects(refs, callbacks, ['HOMING_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['COLLECTION_FIELD'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['SPEED_UP'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['SPLITTING_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['BIG_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['MULTI_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['BUILDER_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['BLACK_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['PIERCE_BALL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['WIDEN_PADDLE'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['LASER_PADDLE'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['REGEN_BRICK'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['SAFETY_NET'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['MAKE_SPECIAL'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['BOMB_BRICK'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['STICKY_PADDLE'], currentTime, gameSpeedFactor);
                // *** Add REINFORCE_BRICK and UPGRADE_BRICK to ALL_IN_ONE ***
                applyPowerUpEffects(refs, callbacks, ['REINFORCE_BRICK'], currentTime, gameSpeedFactor);
                applyPowerUpEffects(refs, callbacks, ['UPGRADE_BRICK'], currentTime, gameSpeedFactor); // Also add UPGRADE_BRICK
                break;
            }
        }
    });
};
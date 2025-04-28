import { PowerUpType } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    BRICK_COLUMNS, BRICK_ROWS, MAX_BRICK_UPGRADE_LEVEL
} from '../../constants';

export const applyBrickEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    type: PowerUpType,
    currentTime: number,
    gameSpeedFactor: number
) => {
    switch (type) {
        case 'REINFORCE_BRICK': {
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

        default:
            // Handle cases not related to bricks or do nothing
            break;
    }
};

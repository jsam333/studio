import { PowerUpType, Brick } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    BRICK_COLUMNS, BRICK_ROWS, MAX_BRICK_UPGRADE_LEVEL
} from '../../constants';

// Helper function to shuffle an array in place
function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


export const applyBrickEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    type: PowerUpType,
    currentTime: number,
    gameSpeedFactor: number
) => {
    let numToAffect = 1;
    // *** MODIFIED: Determine numToAffect based on _L2 or _L3 suffix for all relevant types ***
    if (type.endsWith('_L2')) {
        numToAffect = 2;
    } else if (type.endsWith('_L3')) {
        numToAffect = 3;
    }

    // Extract the base type for the switch statement
    const baseType = type.replace('_L2', '').replace('_L3', '');

    switch (baseType) { // Use baseType in switch
        case 'REINFORCE_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Active, not special, not bomb, not holdsBall, level < 2
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && !brick.holdsBall && (!brick.upgradeLevel || brick.upgradeLevel < 2)) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    brick.upgradeLevel = 2; // Reinforce sets level to 2
                    brick.isSpecial = false;
                    brick.isBomb = false;
                    brick.holdsBall = false; // Ensure mutually exclusive
                }
            });
            break;
        }

        case 'BOMB_BRICK': {
             const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Active, not special, not bomb, not holdsBall
                    if (brick && brick.status === 1 && !brick.isBomb && !brick.isSpecial && !brick.holdsBall) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    brick.isBomb = true;
                    brick.isSpecial = false; // Ensure mutually exclusive
                    brick.holdsBall = false; // Ensure mutually exclusive
                    brick.upgradeLevel = 0; // Bombs don't have levels
                }
            });
            break;
        }

        case 'MAKE_SPECIAL': {
             const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                     // Eligible: Active, not special, not bomb, not holdsBall
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && !brick.holdsBall) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                 if (brick) {
                    brick.isSpecial = true;
                    brick.isBomb = false; // Ensure mutually exclusive
                    brick.holdsBall = false; // Ensure mutually exclusive
                    brick.upgradeLevel = 0; // Special bricks don't have levels
                 }
            });
            break;
        }

        case 'UPGRADE_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Active, not special, not bomb, level is 0 or undefined, not holdsBall
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && !brick.holdsBall && (!brick.upgradeLevel || brick.upgradeLevel === 0) ) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    brick.upgradeLevel = 3;
                    brick.isSpecial = false;
                    brick.isBomb = false;
                    brick.holdsBall = false; // Ensure mutually exclusive
                }
            });
            break;
        }

        case 'REGEN_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Destroyed (status === 0)
                    if (brick && brick.status === 0) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    brick.status = 1; // Regenerate
                    // Reset other properties
                    brick.isSpecial = false;
                    brick.isBomb = false;
                    brick.holdsBall = false;
                    brick.upgradeLevel = 0;
                    // TODO: Consider if regen should restore original strength/properties?
                    // Currently resets to a basic brick.
                }
            });
            break;
        }

        // *** MODIFIED CASE FOR BALL_BRICK (handles L1, L2, L3) ***
        case 'BALL_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Active, not special, not bomb, not already holding a ball, upgrade level 0 or undefined
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && !brick.holdsBall && (!brick.upgradeLevel || brick.upgradeLevel === 0)) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            // Use numToAffect determined earlier based on the original type (L1, L2, L3)
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    brick.holdsBall = true;
                    brick.isSpecial = false; // Ensure mutually exclusive
                    brick.isBomb = false; // Ensure mutually exclusive
                    brick.upgradeLevel = 0; // Reset level if it was somehow defined but 0
                }
            });
            break;
        }
        // *** END MODIFICATION ***

        default:
            // Handle cases not related to bricks or do nothing
            break;
    }
};

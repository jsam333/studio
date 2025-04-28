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
    if (type.endsWith('_L2')) {
        numToAffect = 2;
    } else if (type.endsWith('_L3')) {
        numToAffect = 3;
    }

    switch (type) {
        case 'REINFORCE_BRICK':
        case 'REINFORCE_BRICK_L2':
        case 'REINFORCE_BRICK_L3': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Active, not special, not bomb, level < 2
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && (!brick.upgradeLevel || brick.upgradeLevel < 2)) {
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
                }
            });
            break;
        }

        case 'BOMB_BRICK':
        case 'BOMB_BRICK_L2':
        case 'BOMB_BRICK_L3': {
             const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // Eligible: Active, not special, not bomb
                    if (brick && brick.status === 1 && !brick.isBomb && !brick.isSpecial) {
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
                    brick.upgradeLevel = 0; // Bombs don't have levels
                }
            });
            break;
        }

        case 'MAKE_SPECIAL':
        case 'MAKE_SPECIAL_L2':
        case 'MAKE_SPECIAL_L3': {
             const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                     // Eligible: Active, not special, not bomb
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb) {
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
                    brick.upgradeLevel = 0; // Special bricks don't have levels
                 }
            });
            break;
        }

        case 'UPGRADE_BRICK':
        case 'UPGRADE_BRICK_L2':
        case 'UPGRADE_BRICK_L3': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < BRICK_COLUMNS; c++) {
                for (let r = 0; r < BRICK_ROWS; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    // *** CHANGE: Target basic bricks (level 0 or undefined) ***
                    // Eligible: Active, not special, not bomb, level is 0 or undefined
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && (!brick.upgradeLevel || brick.upgradeLevel === 0) ) {
                        candidates.push({ c, r });
                    }
                }
            }

            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);

            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    // *** CHANGE: Upgrade basic bricks to level 3 ***
                    brick.upgradeLevel = 3;
                    brick.isSpecial = false;
                    brick.isBomb = false;
                }
            });
            break;
        }

        case 'REGEN_BRICK':
        case 'REGEN_BRICK_L2':
        case 'REGEN_BRICK_L3': {
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
                    brick.upgradeLevel = 0;
                    // TODO: Consider if regen should restore original strength/properties?
                    // Currently resets to a basic brick.
                }
            });
            break;
        }

        default:
            // Handle cases not related to bricks or do nothing
            break;
    }
};

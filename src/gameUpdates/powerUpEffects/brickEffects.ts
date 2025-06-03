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

    const baseType = type.replace('_L2', '').replace('_L3', '');

    const isTestMode = refs.gameModeRef.current === 'test';
    const columnsToIterate = isTestMode ? 100 : BRICK_COLUMNS;
    const rowsToIterate = isTestMode ? 50 : BRICK_ROWS;

    switch (baseType) {
        case 'REINFORCE_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < columnsToIterate; c++) {
                for (let r = 0; r < rowsToIterate; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
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
                    brick.upgradeLevel = 2; 
                    brick.isSpecial = false;
                    brick.isBomb = false;
                    brick.holdsBall = false; 
                    brick.isFlashing = false;
                    brick.fadeOutAlpha = 0;
                    delete brick.flashStartTime;
                    brick.isRegenVisualEffectActive = false; 
                    delete brick.regenVisualEffectStartTime;
                    brick.isSpecialFlashActive = false; // Ensure special flash is off
                    delete brick.specialFlashStartTime;
                    brick.isDarkFlashActive = true;
                    brick.darkFlashStartTime = currentTime;
                }
            });
            break;
        }
        case 'BOMB_BRICK': {
             const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < columnsToIterate; c++) {
                for (let r = 0; r < rowsToIterate; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
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
                    brick.isSpecial = false; 
                    brick.holdsBall = false; 
                    brick.upgradeLevel = 0; 
                    brick.isFlashing = false;
                    brick.fadeOutAlpha = 0;
                    delete brick.flashStartTime;
                    brick.isRegenVisualEffectActive = false; 
                    delete brick.regenVisualEffectStartTime;
                    brick.isDarkFlashActive = false; 
                    delete brick.darkFlashStartTime;
                    brick.isSpecialFlashActive = false; 
                    delete brick.specialFlashStartTime;
                }
            });
            break;
        }
        case 'MAKE_SPECIAL': {
             const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < columnsToIterate; c++) {
                for (let r = 0; r < rowsToIterate; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
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
                    brick.isBomb = false; 
                    brick.holdsBall = false; 
                    brick.upgradeLevel = 0; 
                    brick.isFlashing = false;
                    brick.fadeOutAlpha = 0;
                    delete brick.flashStartTime;
                    brick.isRegenVisualEffectActive = false; 
                    delete brick.regenVisualEffectStartTime;
                    brick.isDarkFlashActive = false; 
                    delete brick.darkFlashStartTime;
                    brick.isSpecialFlashActive = true; // Trigger special flash
                    brick.specialFlashStartTime = currentTime;
                 }
            });
            break;
        }
        case 'UPGRADE_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < columnsToIterate; c++) {
                for (let r = 0; r < rowsToIterate; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
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
                    brick.holdsBall = false; 
                    brick.isFlashing = false;
                    brick.fadeOutAlpha = 0;
                    delete brick.flashStartTime;
                    brick.isRegenVisualEffectActive = false; 
                    delete brick.regenVisualEffectStartTime;
                    brick.isSpecialFlashActive = false; // Ensure special flash is off
                    delete brick.specialFlashStartTime;
                    brick.isDarkFlashActive = true;
                    brick.darkFlashStartTime = currentTime;
                }
            });
            break;
        }
        case 'REGEN_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < columnsToIterate; c++) {
                for (let r = 0; r < rowsToIterate; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
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
                    brick.status = 1; 
                    brick.isSpecial = false;
                    brick.isBomb = false;
                    brick.holdsBall = false;
                    brick.upgradeLevel = 0; 
                    brick.isFlashing = false; 
                    brick.fadeOutAlpha = 0;
                    delete brick.flashStartTime;
                    brick.isDarkFlashActive = false; 
                    delete brick.darkFlashStartTime;
                    brick.isSpecialFlashActive = false; 
                    delete brick.specialFlashStartTime;
                    brick.isRegenVisualEffectActive = true;
                    brick.regenVisualEffectStartTime = currentTime;
                }
            });
            break;
        }
        case 'BALL_BRICK': {
            const candidates: { c: number; r: number }[] = [];
            for (let c = 0; c < columnsToIterate; c++) {
                for (let r = 0; r < rowsToIterate; r++) {
                    const brick = refs.bricksRef.current[c]?.[r];
                    if (brick && brick.status === 1 && !brick.isSpecial && !brick.isBomb && !brick.holdsBall && (!brick.upgradeLevel || brick.upgradeLevel === 0)) {
                        candidates.push({ c, r });
                    }
                }
            }
            shuffleArray(candidates);
            const bricksToModify = candidates.slice(0, numToAffect);
            bricksToModify.forEach(coords => {
                const brick = refs.bricksRef.current[coords.c]?.[coords.r];
                if (brick) {
                    brick.holdsBall = true;
                    brick.isSpecial = false; 
                    brick.isBomb = false; 
                    brick.upgradeLevel = 0; 
                    brick.isFlashing = false;
                    brick.fadeOutAlpha = 0;
                    delete brick.flashStartTime;
                    brick.isRegenVisualEffectActive = false; 
                    delete brick.regenVisualEffectStartTime;
                    brick.isDarkFlashActive = false; 
                    delete brick.darkFlashStartTime;
                    brick.isSpecialFlashActive = false; 
                    delete brick.specialFlashStartTime;
                }
            });
            break;
        }
        default:
            break;
    }
};

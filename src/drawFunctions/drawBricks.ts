import { Brick } from '../interfaces';
import {
    NORMAL_BRICK_COLOR, REINFORCED_BRICK_COLOR, UPGRADED_BRICK_COLOR, BUILDER_BRICK_COLOR,
    SPECIAL_BRICK_COLOR, BOMB_BRICK_COLOR, BALL_BRICK_COLOR,
    BRICK_REGEN_VISUAL_EFFECT_DURATION_MS, BRICK_REGEN_VISUAL_EFFECT_SCALE_AMOUNT,
    BRICK_DARK_FLASH_DURATION_MS, BRICK_DARK_FLASH_DARKEN_AMOUNT,
    BRICK_SPECIAL_FLASH_DURATION_MS, BRICK_SPECIAL_FLASH_LIGHTEN_AMOUNT
} from '../constants';
import { hexToRgb, lightenRgb, darkenRgb } from './drawUtils';

export const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[][], columns: number, rows: number, currentTime: number) => {
    if (!bricks) return;
    const destructionFlashLightenFactor = 0.7; 

    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            if (brick && (brick.status === 1 || brick.status === 2)) {
                ctx.save();
                
                let currentX = brick.x;
                let currentY = brick.y;
                let currentWidth = brick.width;
                let currentHeight = brick.height;
                let baseFillStyle = NORMAL_BRICK_COLOR; // Default

                // Determine base color first based on current state (ignoring transient visual effects for this step)
                if (brick.holdsBall) {
                    baseFillStyle = BALL_BRICK_COLOR;
                } else if (brick.isBomb) {
                    baseFillStyle = BOMB_BRICK_COLOR;
                } else if (brick.isSpecial) {
                    baseFillStyle = SPECIAL_BRICK_COLOR;
                } else if (brick.upgradeLevel === 3) {
                    baseFillStyle = BUILDER_BRICK_COLOR;
                } else if (brick.upgradeLevel === 2) {
                    baseFillStyle = REINFORCED_BRICK_COLOR;
                } else if (brick.upgradeLevel === 1) {
                    baseFillStyle = REINFORCED_BRICK_COLOR; 
                } // else NORMAL_BRICK_COLOR is already set

                let finalFillStyle = baseFillStyle;

                // Apply visual effects for status 1 bricks
                if (brick.status === 1) {
                    if (brick.isDarkFlashActive && typeof brick.darkFlashStartTime === 'number') {
                        const effectElapsedTime = currentTime - brick.darkFlashStartTime;
                        if (effectElapsedTime < BRICK_DARK_FLASH_DURATION_MS) {
                            const rgbColor = hexToRgb(baseFillStyle); 
                            if (rgbColor) {
                                const progress = effectElapsedTime / BRICK_DARK_FLASH_DURATION_MS;
                                const pulseFactor = Math.sin(progress * Math.PI);
                                finalFillStyle = darkenRgb(rgbColor, BRICK_DARK_FLASH_DARKEN_AMOUNT * pulseFactor);
                            }
                        } 
                    } else if (brick.isSpecialFlashActive && typeof brick.specialFlashStartTime === 'number') {
                        const effectElapsedTime = currentTime - brick.specialFlashStartTime;
                        if (effectElapsedTime < BRICK_SPECIAL_FLASH_DURATION_MS) {
                            // The baseFillStyle should be SPECIAL_BRICK_COLOR if brick.isSpecial is true
                            const rgbColor = hexToRgb(SPECIAL_BRICK_COLOR); 
                            if (rgbColor) {
                                const progress = effectElapsedTime / BRICK_SPECIAL_FLASH_DURATION_MS;
                                const pulseFactor = Math.sin(progress * Math.PI);
                                finalFillStyle = lightenRgb(rgbColor, BRICK_SPECIAL_FLASH_LIGHTEN_AMOUNT * pulseFactor);
                            }
                        } 
                    } else if (brick.isRegenVisualEffectActive && typeof brick.regenVisualEffectStartTime === 'number') {
                        const effectElapsedTime = currentTime - brick.regenVisualEffectStartTime;
                        if (effectElapsedTime < BRICK_REGEN_VISUAL_EFFECT_DURATION_MS) {
                            const progress = effectElapsedTime / BRICK_REGEN_VISUAL_EFFECT_DURATION_MS;
                            const scaleAddition = BRICK_REGEN_VISUAL_EFFECT_SCALE_AMOUNT * Math.sin(progress * Math.PI);
                            const visualScale = 1 + scaleAddition;
                            currentWidth = brick.width * visualScale;
                            currentHeight = brick.height * visualScale;
                            currentX = brick.x - (currentWidth - brick.width) / 2;
                            currentY = brick.y - (currentHeight - brick.height) / 2;
                            // fillStyle remains baseFillStyle for regen pop
                        } 
                    }
                }

                ctx.beginPath();
                ctx.rect(currentX, currentY, currentWidth, currentHeight);
                
                // Destruction animations for status 2 bricks (takes precedence over fillStyle from status 1 effects if brick is dying)
                if (brick.status === 2) {
                    if (brick.isFlashing) {
                        const rgbColor = hexToRgb(baseFillStyle); // Lighten the base color
                        if (rgbColor) {
                            ctx.fillStyle = lightenRgb(rgbColor, destructionFlashLightenFactor);
                        } else {
                            ctx.fillStyle = "#FFFFFF"; 
                        }
                    } else if (brick.fadeOutAlpha !== undefined && brick.fadeOutAlpha > 0) {
                        ctx.globalAlpha = brick.fadeOutAlpha;
                        ctx.fillStyle = baseFillStyle; // Fade out the base color
                    } else {
                         ctx.fillStyle = baseFillStyle; // Fallback if somehow status 2 but no animation state
                    }
                } else {
                    ctx.fillStyle = finalFillStyle; // Apply the determined fill style for status 1 bricks
                }
                
                ctx.fill();
                ctx.closePath();
                ctx.restore(); 

                const noVisualEffectActive = !(brick.isRegenVisualEffectActive || brick.isDarkFlashActive || brick.isSpecialFlashActive);
                if (noVisualEffectActive && (brick.status === 1 || (brick.status === 2 && (brick.isFlashing || (brick.fadeOutAlpha && brick.fadeOutAlpha > 0.5))))) {
                    if (brick.isBomb) {
                        ctx.fillStyle = '#000000'; 
                        ctx.beginPath();
                        ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width / 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.closePath();
                    } else if (brick.holdsBall) {
                        ctx.fillStyle = '#AAAAAA'; 
                        ctx.beginPath();
                        ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width / 4, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.closePath();
                    }
                }
            }
        }
    }
};

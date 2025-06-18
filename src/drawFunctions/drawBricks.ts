import { Brick } from '../interfaces';
import {
    NORMAL_BRICK_COLOR, REINFORCED_BRICK_COLOR, UPGRADED_BRICK_COLOR, BUILDER_BRICK_COLOR,
    SPECIAL_BRICK_COLOR, BOMB_BRICK_COLOR, BALL_BRICK_COLOR,
    BRICK_REGEN_VISUAL_EFFECT_DURATION_MS, BRICK_REGEN_VISUAL_EFFECT_SCALE_AMOUNT,
    BRICK_DARK_FLASH_DURATION_MS, BRICK_DARK_FLASH_DARKEN_AMOUNT,
    BRICK_SPECIAL_FLASH_DURATION_MS, BRICK_SPECIAL_FLASH_LIGHTEN_AMOUNT,
    BOMB_GLOW_DURATION, BOMB_GLOW_LIGHTEN_FACTOR
} from '../constants';
import { hexToRgb, lightenRgb, darkenRgb } from './drawUtils';

export const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[][], columns: number, rows: number, currentTime: number) => {
    if (!bricks) return;
    const destructionFlashLightenFactor = 0.7; 

    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            // Render active, destroying, or glowing bombs
            if (brick && (brick.status === 1 || brick.status === 2 || brick.status === 3)) {
                ctx.save();
                
                let currentX = brick.x;
                let currentY = brick.y;
                let currentWidth = brick.width;
                let currentHeight = brick.height;
                let baseFillStyle = NORMAL_BRICK_COLOR; // Default

                // Determine base color first based on current state
                if (brick.holdsBall) {
                    baseFillStyle = BALL_BRICK_COLOR;
                } else if (brick.isBomb) {
                    baseFillStyle = BOMB_BRICK_COLOR;
                } else if (brick.isSpecial) {
                    baseFillStyle = SPECIAL_BRICK_COLOR;
                } else if (brick.upgradeLevel === 3) {
                    baseFillStyle = BUILDER_BRICK_COLOR;
                } else if (brick.upgradeLevel === 2) {
                    baseFillStyle = UPGRADED_BRICK_COLOR;
                } else if (brick.upgradeLevel === 1) {
                    baseFillStyle = REINFORCED_BRICK_COLOR; 
                } // Level 0 (or undefined) uses default NORMAL_BRICK_COLOR 

                let finalFillStyle = baseFillStyle;

                // Apply visual effects for status 1 bricks (active, not glowing bomb)
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
                        } 
                    }
                }

                ctx.beginPath();
                ctx.rect(currentX, currentY, currentWidth, currentHeight);
                
                if (brick.status === 3 && brick.isBombGlowActive && brick.bombGlowStartTime) { // Bomb Glowing (status 3)
                    const glowElapsedTime = currentTime - brick.bombGlowStartTime;
                    const glowProgress = Math.min(glowElapsedTime / BOMB_GLOW_DURATION, 1);
                    
                    const bombRgbColor = hexToRgb(BOMB_BRICK_COLOR);
                    if (bombRgbColor) {
                        const currentLightenFactor = BOMB_GLOW_LIGHTEN_FACTOR * glowProgress;
                        ctx.fillStyle = lightenRgb(bombRgbColor, currentLightenFactor);
                    } else {
                        ctx.fillStyle = BOMB_BRICK_COLOR; // Fallback
                    }
                    ctx.fill(); // Fill the lightened body

                    // Draw the dark center circle on top of the glow
                    ctx.fillStyle = '#000000'; 
                    ctx.beginPath(); // Start a new path for the circle
                    const radius = Math.min(brick.width / 4, brick.height / 4); // Adjusted radius
                    ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();

                } else if (brick.status === 2) { // Destroying (status 2)
                    if (brick.isFlashing) {
                        const rgbColor = hexToRgb(baseFillStyle); 
                        if (rgbColor) {
                            ctx.fillStyle = lightenRgb(rgbColor, destructionFlashLightenFactor);
                        } else {
                            ctx.fillStyle = "#FFFFFF"; 
                        }
                    } else if (brick.fadeOutAlpha !== undefined && brick.fadeOutAlpha > 0) {
                        ctx.globalAlpha = brick.fadeOutAlpha;
                        ctx.fillStyle = baseFillStyle; 
                    } else {
                         ctx.fillStyle = baseFillStyle; 
                    }
                    ctx.fill();
                    ctx.globalAlpha = 1.0; // Reset alpha if it was changed for fadeOut
                } else { // Active (status 1) or other non-handled status
                    ctx.fillStyle = finalFillStyle; 
                    ctx.fill();
                    
                    // ADDED: Draw shine animation on top
                    if (brick.isShining && brick.shineStartTime) {
                        const SHINE_DURATION = 800; // ms, increased from 500
                        const shineProgress = (currentTime - brick.shineStartTime) / SHINE_DURATION;
                    
                        if (shineProgress >= 0 && shineProgress <= 1) {
                            // To make the shine appear more horizontal, we make the gradient more vertical
                            // by extending its y-axis, which changes the angle of the perpendicular shine.
                            const gradient = ctx.createLinearGradient(
                                brick.x,
                                brick.y + brick.height * 1.5, // y-start (extended downwards)
                                brick.x + brick.width,
                                brick.y - brick.height * 0.5  // y-end (extended upwards)
                            );
                    
                            const shineWidth = 0.3; // Half the width of the shine falloff
                    
                            // Remap progress to a range that starts and ends outside the brick [0,1] range
                            // so the full shine effect is visible as it enters and exits.
                            const totalMovementRange = 1 + shineWidth * 2;
                            const shinePosition = -shineWidth + (shineProgress * totalMovementRange);

                            const start = shinePosition - shineWidth;
                            const end = shinePosition + shineWidth;
                            
                            const shineColor = 'rgba(255, 255, 255, 0.3)';
                            const transparentColor = 'rgba(255, 255, 255, 0)';
                    
                            // This logic ensures the shine band is correctly drawn even when it's partially off the brick.
                            const visibleStart = Math.max(0, start);
                            const visibleEnd = Math.min(1, end);

                            if (visibleStart < visibleEnd) {
                                const peakPosition = Math.max(visibleStart, Math.min(visibleEnd, shinePosition));

                                // Add start stop
                                gradient.addColorStop(visibleStart, transparentColor);

                                // Add peak stop
                                gradient.addColorStop(peakPosition, shineColor);

                                // Add end stop, but only if it's different from the peak
                                if (visibleEnd > peakPosition) {
                                    gradient.addColorStop(visibleEnd, transparentColor);
                                }
                            }
                            
                            ctx.fillStyle = gradient;
                            ctx.fill(); // Fills the same brick path again with the shine gradient
                        }
                    }
                }
                
                // For status 1 and status 2 (during flash/fade), we might have already closed the path for the main rect.
                // For status 3, the main rect path was used, then a new one for the circle.
                // Ensure path is closed if it was for the main rectangle and not handled by circle already.
                if (brick.status !== 3) {
                    ctx.closePath();
                }
                ctx.restore(); 

                // Draw bomb/ball indicator for non-glowing (status 1), non-destroying bricks.
                // The glowing bomb (status 3) now handles its own indicator (the dark circle) above.
                const noVisualEffectActive = !(brick.isRegenVisualEffectActive || brick.isDarkFlashActive || brick.isSpecialFlashActive );
                if (brick.status === 1 && noVisualEffectActive) { 
                    const radius = Math.min(brick.width / 4, brick.height / 4); // Adjusted radius
                    if (brick.isBomb) {
                        ctx.fillStyle = '#000000'; 
                        ctx.beginPath();
                        ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.closePath();
                    } else if (brick.holdsBall) {
                        ctx.fillStyle = '#AAAAAA'; 
                        ctx.beginPath();
                        ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, radius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.closePath();
                    }
                }
            }
        }
    }
};

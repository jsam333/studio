import { Brick, PowerUp, Ball, Laser, PowerUpType, GameState, PointsField, Particle } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, PADDLE_Y,
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP, POWER_UP_SIZE,
    INITIAL_PADDLE_WIDTH, LASER_WIDTH, SAFETY_NET_HEIGHT,
    LASER_STRIPE_WIDTH_PER_SHOT,
    STICKY_INDICATOR_WIDTH_PER_CHARGE, 
    NORMAL_BRICK_COLOR, REINFORCED_BRICK_COLOR, UPGRADED_BRICK_COLOR, BUILDER_BRICK_COLOR,
    POWER_UP_COLORS,
    SPECIAL_BRICK_COLOR,
    RAINBOW_COLORS,
    RAINBOW_FLASH_INTERVAL,
    BIG_BALL_SIZE_INCREASE,
    BOMB_BRICK_COLOR,
    GOLD_COLOR,
    BALL_BRICK_COLOR, 
    POINTS_FIELD_COLOR, 
    BONUS_GOLD_TIMER_DURATION,
    BRICK_REGEN_VISUAL_EFFECT_DURATION_MS, BRICK_REGEN_VISUAL_EFFECT_SCALE_AMOUNT,
    BRICK_DARK_FLASH_DURATION_MS, BRICK_DARK_FLASH_DARKEN_AMOUNT,
    BRICK_SPECIAL_FLASH_DURATION_MS, BRICK_SPECIAL_FLASH_LIGHTEN_AMOUNT // Added special flash constants
} from './constants';

let multiBallImage: HTMLImageElement;
let widenPaddleImage: HTMLImageElement;
let laserPaddleImage: HTMLImageElement;
let regenBrickImage: HTMLImageElement;
let upgradeBrickImage: HTMLImageElement;
let reinforceBrickImage: HTMLImageElement;
let safetyNetImage: HTMLImageElement;
let makeSpecialImage: HTMLImageElement;
let recoveryPaddleImage: HTMLImageElement;
let bombBrickImage: HTMLImageElement;
let ballBrickImage: HTMLImageElement;
let collectionFieldImage: HTMLImageElement;
let bigBallImage: HTMLImageElement;
let blackBallImage: HTMLImageElement;
let builderBallImage: HTMLImageElement;
let homingBallImage: HTMLImageElement;
let pierceBallImage: HTMLImageElement;
let splittingBallImage: HTMLImageElement;
let pointsFieldImage: HTMLImageElement; 

if (typeof window !== 'undefined') {
    multiBallImage = new Image();
    multiBallImage.src = '/images/multiball.png';
    widenPaddleImage = new Image();
    widenPaddleImage.src = '/images/widen paddle.png';
    laserPaddleImage = new Image();
    laserPaddleImage.src = '/images/laser paddle.png';
    regenBrickImage = new Image();
    regenBrickImage.src = '/images/regen brick.png';
    upgradeBrickImage = new Image();
    upgradeBrickImage.src = '/images/upgrade brick.png';
    reinforceBrickImage = new Image();
    reinforceBrickImage.src = '/images/reinforce brick.png';
    safetyNetImage = new Image();
    safetyNetImage.src = '/images/safety net.png';
    makeSpecialImage = new Image();
    makeSpecialImage.src = '/images/make special.png';
    recoveryPaddleImage = new Image();
    recoveryPaddleImage.src = '/images/sticky paddle.png';
    bombBrickImage = new Image();
    bombBrickImage.src = '/images/bomb brick.png';
    ballBrickImage = new Image();
    ballBrickImage.src = '/images/ball brick.png';
    collectionFieldImage = new Image();
    collectionFieldImage.src = '/images/collection field.png';
    bigBallImage = new Image();
    bigBallImage.src = '/images/big ball.png';
    blackBallImage = new Image();
    blackBallImage.src = '/images/black ball.png';
    builderBallImage = new Image();
    builderBallImage.src = '/images/builder ball.png';
    homingBallImage = new Image();
    homingBallImage.src = '/images/homing ball.png';
    pierceBallImage = new Image();
    pierceBallImage.src = '/images/pierce ball.png';
    splittingBallImage = new Image();
    splittingBallImage.src = '/images/splitting ball.png';
    pointsFieldImage = new Image(); 
    pointsFieldImage.src = '/images/points field.png';
}

const getBasePowerUpType = (type: PowerUpType): PowerUpType => {
    const baseType = type.split('_L')[0];
    return baseType as PowerUpType;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const lightenRgb = (rgb: { r: number; g: number; b: number }, factor: number): string => {
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
    return `rgb(${r},${g},${b})`;
};

const darkenRgb = (rgb: { r: number; g: number; b: number }, factor: number): string => {
    const r = Math.max(0, Math.round(rgb.r * (1 - factor)));
    const g = Math.max(0, Math.round(rgb.g * (1 - factor)));
    const b = Math.max(0, Math.round(rgb.b * (1 - factor)));
    return `rgb(${r},${g},${b})`;
};

export const drawPaddle = (
    ctx: CanvasRenderingContext2D,
    paddleX: number,
    currentWidth: number = INITIAL_PADDLE_WIDTH,
    laserShots: number = 0,
    stickyCharges: number = 0
) => {
  ctx.fillStyle = "#ffffff"; 
  ctx.beginPath();
  ctx.rect(paddleX, PADDLE_Y, currentWidth, PADDLE_HEIGHT);
  ctx.fill();
  ctx.closePath();

  if (stickyCharges > 0) {
      const stickyColor = POWER_UP_COLORS['RECOVERY_PADDLE'] || '#B8860B'; 
      const totalIndicatorWidth = stickyCharges * STICKY_INDICATOR_WIDTH_PER_CHARGE;
      const clampedIndicatorWidth = Math.max(1, Math.min(totalIndicatorWidth, currentWidth / 2));
      ctx.fillStyle = stickyColor + '99'; 
      ctx.beginPath();
      ctx.rect(paddleX, PADDLE_Y, clampedIndicatorWidth, PADDLE_HEIGHT);
      ctx.fill();
      ctx.closePath();
      ctx.beginPath();
      ctx.rect(paddleX + currentWidth - clampedIndicatorWidth, PADDLE_Y, clampedIndicatorWidth, PADDLE_HEIGHT);
      ctx.fill();
      ctx.closePath();
  }

  if (laserShots > 0) {
      const stripeTotalWidth = laserShots * LASER_STRIPE_WIDTH_PER_SHOT;
      const clampedStripeWidth = Math.min(stripeTotalWidth, currentWidth - 2); 
      const stripeX = paddleX + (currentWidth / 2) - (clampedStripeWidth / 2);
      const stripePixelExtendAbove = 4;
      const stripeY = PADDLE_Y - stripePixelExtendAbove;
      const stripeHeight = PADDLE_HEIGHT + stripePixelExtendAbove;
      ctx.beginPath();
      ctx.rect(stripeX, stripeY, clampedStripeWidth, stripeHeight);
      ctx.fillStyle = POWER_UP_COLORS['LASER_PADDLE']!;
      ctx.fill();
      ctx.closePath();
  }
};

export const drawCollectionFieldRect = (
    ctx: CanvasRenderingContext2D,
    paddleX: number,
    paddleWidth: number,
    fieldHeightOffset: number,
    fieldWidthOffset: number
) => {
    if (fieldHeightOffset <= 0 && fieldWidthOffset <= 0) return;
    const fieldTopY = PADDLE_Y - fieldHeightOffset;
    const fieldX = paddleX - fieldWidthOffset;
    const fieldWidth = paddleWidth + (fieldWidthOffset * 2);
    const fieldHeight = fieldHeightOffset;
    const paddleTopY = PADDLE_Y;
    ctx.save();
    const fieldColor = POWER_UP_COLORS['COLLECTION_FIELD'] || '#2ecc71';
    let r = 0, g = 0, b = 0;
    if (fieldColor.length === 7) {
        r = parseInt(fieldColor.substring(1, 3), 16);
        g = parseInt(fieldColor.substring(3, 5), 16);
        b = parseInt(fieldColor.substring(5, 7), 16);
    }
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (fieldHeight > 0) { ctx.rect(fieldX, fieldTopY, fieldWidth, fieldHeight); }
    if (fieldWidthOffset > 0) { ctx.rect(fieldX, paddleTopY, fieldWidthOffset, PADDLE_HEIGHT); ctx.rect(paddleX + paddleWidth, paddleTopY, fieldWidthOffset, PADDLE_HEIGHT); }
    ctx.fill();
    ctx.closePath();
    if (fieldHeight > 0) { ctx.strokeRect(fieldX, fieldTopY, fieldWidth, fieldHeight); }
    if (fieldWidthOffset > 0) {
        ctx.beginPath();
        ctx.moveTo(fieldX, paddleTopY + PADDLE_HEIGHT);
        ctx.lineTo(fieldX, paddleTopY);
        if (fieldHeight <= 0) ctx.lineTo(fieldX + fieldWidthOffset, paddleTopY);
        ctx.moveTo(paddleX + paddleWidth, paddleTopY);
        if (fieldHeight <= 0) ctx.lineTo(paddleX + paddleWidth + fieldWidthOffset, paddleTopY);
        ctx.lineTo(paddleX + paddleWidth + fieldWidthOffset, paddleTopY + PADDLE_HEIGHT);
        ctx.stroke();
        ctx.closePath();
    }
    ctx.restore();
};

export const drawPointsFields = (ctx: CanvasRenderingContext2D, pointsFields: PointsField[]) => {
    if (!pointsFields) return;
    pointsFields.forEach(field => {
        ctx.save();
        ctx.fillStyle = POINTS_FIELD_COLOR;
        ctx.beginPath();
        ctx.rect(field.x, field.y, field.width, field.height);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'; 
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    });
};

export const drawBalls = (ctx: CanvasRenderingContext2D, activeBalls: Ball[], stuckBalls: Ball[]) => {
    const drawBall = (ball: Ball) => { 
         ctx.save();
         const currentRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
         ctx.beginPath();
         ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2);

         if (ball.stuckOffset !== undefined || ball.stuckSide) { 
             ctx.fillStyle = "#cccccc";
         } else if (ball.isHoming) {
             ctx.fillStyle = POWER_UP_COLORS['HOMING_BALL'] || '#f1c40f';
         } else if (ball.isSplitting) {
             ctx.fillStyle = POWER_UP_COLORS['SPLITTING_BALL'] || '#9b59b6';
         } else if (ball.isBlue) {
             ctx.fillStyle = POWER_UP_COLORS['BUILDER_BALL']!;
         } else if (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) {
             ctx.fillStyle = POWER_UP_COLORS['PIERCE_BALL']!;
         } else if (ball.isBlack) {
             ctx.fillStyle = "#808080";
         } else {
             ctx.fillStyle = "#ffffff";
         }
         ctx.fill();

         if (ball.stuckOffset !== undefined || ball.stuckSide) {
             ctx.strokeStyle = '#000000'; 
         } else if (ball.isBlack) {
             ctx.strokeStyle = '#ffffff'; 
         } else if (ball.isSplitting || ball.isHoming) {
             ctx.strokeStyle = '#000000'; 
         }
         if (ctx.strokeStyle) {
             ctx.lineWidth = 1;
             ctx.stroke();
         }
         ctx.closePath();
         ctx.restore();
    };

    activeBalls.forEach(drawBall);
    stuckBalls.forEach(drawBall);
};

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

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    if (!particles) return;
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    });
};

export const drawGameInfo = (
    ctx: CanvasRenderingContext2D,
    currentScore: number,
    targetScore: number,
    gold: number,
    bonusGold: number,
    isTestMode: boolean,
    lives: number,
    bonusGoldTimerCountdown: number | null
) => {
  ctx.font = "16px Arial";
  ctx.textBaseline = 'top';
  const yPos = 10;
  const xStart = 8;
  const padding = 15;

  const scoreText = `Score: ${currentScore}/${targetScore}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = 'left';
  ctx.fillText(scoreText, xStart, yPos);
  let currentX = xStart + ctx.measureText(scoreText).width + padding;

  if (!isTestMode) {
    const goldText = `Gold: ${gold}`;
    ctx.fillStyle = GOLD_COLOR || "#FFD700";
    ctx.fillText(goldText, currentX, yPos);
    currentX += ctx.measureText(goldText).width + padding;

    if (bonusGold > 0) {
        const bonusText = `(+${bonusGold})`;
        ctx.fillStyle = '#90EE90'; 
        ctx.fillText(bonusText, currentX, yPos);
        currentX += ctx.measureText(bonusText).width; 

        if (bonusGoldTimerCountdown !== null && bonusGoldTimerCountdown > 0) {
            const secondsLeft = Math.ceil(bonusGoldTimerCountdown / 1000);
            const timerText = ` ${secondsLeft} seconds left!`; 
            const ratio = Math.max(0, Math.min(1, bonusGoldTimerCountdown / BONUS_GOLD_TIMER_DURATION));
            const red = Math.round(255 * (1 - ratio));
            const green = Math.round(255 * ratio);
            ctx.fillStyle = `rgb(${red},${green},0)`; 
            ctx.fillText(timerText, currentX, yPos);
            currentX += ctx.measureText(timerText).width;
        }
        currentX += padding;
    }
  }

  if (!isTestMode) {
    const livesText = `Lives: ${lives}`;
    ctx.fillStyle = "#ff6347"; 
    ctx.fillText(livesText, currentX, yPos);
  }
};

export const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
    const currentTime = Date.now();
    powerUps.forEach(powerUp => {
        if (powerUp.status === 'falling') {
            let imageToDraw: HTMLImageElement | null = null;
            const baseType = getBasePowerUpType(powerUp.type);

            switch (baseType) {
                case 'MULTI_BALL': imageToDraw = multiBallImage; break;
                case 'WIDEN_PADDLE': imageToDraw = widenPaddleImage; break;
                case 'LASER_PADDLE': imageToDraw = laserPaddleImage; break;
                case 'REGEN_BRICK': imageToDraw = regenBrickImage; break;
                case 'UPGRADE_BRICK': imageToDraw = upgradeBrickImage; break;
                case 'REINFORCE_BRICK': imageToDraw = reinforceBrickImage; break;
                case 'SAFETY_NET': imageToDraw = safetyNetImage; break;
                case 'MAKE_SPECIAL': imageToDraw = makeSpecialImage; break;
                case 'RECOVERY_PADDLE': imageToDraw = recoveryPaddleImage; break;
                case 'BOMB_BRICK': imageToDraw = bombBrickImage; break;
                case 'BALL_BRICK': imageToDraw = ballBrickImage; break;
                case 'COLLECTION_FIELD': imageToDraw = collectionFieldImage; break;
                case 'BIG_BALL': imageToDraw = bigBallImage; break;
                case 'BLACK_BALL': imageToDraw = blackBallImage; break;
                case 'BUILDER_BALL': imageToDraw = builderBallImage; break;
                case 'HOMING_BALL': imageToDraw = homingBallImage; break;
                case 'PIERCE_BALL': imageToDraw = pierceBallImage; break;
                case 'SPLITTING_BALL': imageToDraw = splittingBallImage; break;
                case 'POINTS_FIELD': imageToDraw = pointsFieldImage; break;
            }

            if (imageToDraw && imageToDraw.complete) { 
                ctx.drawImage(imageToDraw, powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
            } else if (!imageToDraw || (baseType === 'POINTS_FIELD' && !imageToDraw)) { 
                ctx.beginPath(); ctx.rect(powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
                if (powerUp.type === 'ALL_IN_ONE' && powerUp.timeCreated) {
                    const timeElapsed = currentTime - powerUp.timeCreated;
                    const colorIndex = Math.floor(timeElapsed / RAINBOW_FLASH_INTERVAL) % RAINBOW_COLORS.length;
                    ctx.fillStyle = RAINBOW_COLORS[colorIndex];
                } else {
                    ctx.fillStyle = POWER_UP_COLORS[powerUp.type as PowerUpType] || POWER_UP_COLORS['NONE']!;
                }
                ctx.fill();
                if (powerUp.type === 'BLACK_BALL' || powerUp.type === 'BOMB_BRICK' || powerUp.type === 'ALL_IN_ONE' || powerUp.type === 'RECOVERY_PADDLE') {
                    ctx.strokeStyle = (powerUp.type === 'ALL_IN_ONE') ? '#000000' : '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.closePath();
            }
        }
    });
};

export const drawPowerUpPreviews = (ctx: CanvasRenderingContext2D, spawnablePowerUpTypes: Set<PowerUpType>) => {
    const typesArray = Array.from(spawnablePowerUpTypes);
    const totalSpawnable = typesArray.length;
    if (totalSpawnable === 0) return;

    const spacing = (BOARD_WIDTH - (totalSpawnable * POWER_UP_SIZE)) / (totalSpawnable + 1);
    const startY = (BOARD_HEIGHT * 3) / 5; 
    let currentX = spacing;
    const previewAlpha = '80'; 

    ctx.save(); 
    typesArray.forEach((type) => {
        ctx.globalAlpha = parseFloat((parseInt(previewAlpha, 16) / 255).toFixed(2));
        let imageToDraw: HTMLImageElement | null = null;
        const baseType = getBasePowerUpType(type);

        switch (baseType) {
            case 'MULTI_BALL': imageToDraw = multiBallImage; break;
            case 'WIDEN_PADDLE': imageToDraw = widenPaddleImage; break;
            case 'LASER_PADDLE': imageToDraw = laserPaddleImage; break;
            case 'REGEN_BRICK': imageToDraw = regenBrickImage; break;
            case 'UPGRADE_BRICK': imageToDraw = upgradeBrickImage; break;
            case 'REINFORCE_BRICK': imageToDraw = reinforceBrickImage; break;
            case 'SAFETY_NET': imageToDraw = safetyNetImage; break;
            case 'MAKE_SPECIAL': imageToDraw = makeSpecialImage; break;
            case 'RECOVERY_PADDLE': imageToDraw = recoveryPaddleImage; break;
            case 'BOMB_BRICK': imageToDraw = bombBrickImage; break;
            case 'BALL_BRICK': imageToDraw = ballBrickImage; break;
            case 'COLLECTION_FIELD': imageToDraw = collectionFieldImage; break;
            case 'BIG_BALL': imageToDraw = bigBallImage; break;
            case 'BLACK_BALL': imageToDraw = blackBallImage; break;
            case 'BUILDER_BALL': imageToDraw = builderBallImage; break;
            case 'HOMING_BALL': imageToDraw = homingBallImage; break;
            case 'PIERCE_BALL': imageToDraw = pierceBallImage; break;
            case 'SPLITTING_BALL': imageToDraw = splittingBallImage; break;
            case 'POINTS_FIELD': imageToDraw = pointsFieldImage; break;
        }
        
        if (imageToDraw && imageToDraw.complete) { 
            ctx.drawImage(imageToDraw, currentX, startY, POWER_UP_SIZE, POWER_UP_SIZE);
        } else if (!imageToDraw || (baseType === 'POINTS_FIELD' && !imageToDraw)) { 
            ctx.globalAlpha = 1.0; 
            const color = POWER_UP_COLORS[type] || POWER_UP_COLORS['NONE']!;
            ctx.fillStyle = color + previewAlpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.rect(currentX, startY, POWER_UP_SIZE, POWER_UP_SIZE);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }
        ctx.globalAlpha = 1.0; 
        currentX += POWER_UP_SIZE + spacing;
    });
    ctx.restore(); 
};

export const drawLasers = (ctx: CanvasRenderingContext2D, lasers: Laser[]) => {
    lasers.forEach(laser => { ctx.beginPath(); ctx.rect(laser.x, laser.y, laser.width, laser.height); ctx.fillStyle = "#e74c3c"; ctx.fill(); ctx.closePath(); });
};

export const drawSafetyNet = (ctx: CanvasRenderingContext2D, count: number) => {
    if (count > 0) {
      ctx.save();
      ctx.fillStyle = POWER_UP_COLORS['SAFETY_NET']! + 'CC'; // Added non-null assertion 
      for (let i = 0; i < count; i++) {
         ctx.beginPath();
         const yPosition = BOARD_HEIGHT - (i + 1) * SAFETY_NET_HEIGHT;
         if (yPosition < 0) continue; 
         ctx.rect(0, yPosition, BOARD_WIDTH, SAFETY_NET_HEIGHT);
         ctx.fill();
         if (i > 0) {
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; 
             ctx.lineWidth = 0.5;
             ctx.beginPath();
             ctx.moveTo(0, yPosition + SAFETY_NET_HEIGHT);
             ctx.lineTo(BOARD_WIDTH, yPosition + SAFETY_NET_HEIGHT);
             ctx.stroke();
         }
         ctx.closePath();
      }
      ctx.restore();
    }
};

export const drawEndMessage = (
    ctx: CanvasRenderingContext2D,
    state: GameState, 
    finalScore: number
) => {
    ctx.font = "48px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let message = "";
    if (state === 'won') {
        message = "You Won!";
    } else if (state === 'lost') {
        message = "Game Over";
    }
    ctx.fillText(message, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 - 40);

    ctx.font = "24px Arial";
    ctx.fillText(`Final Score: ${finalScore}`, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 + 20);
};

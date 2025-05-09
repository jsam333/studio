import { Brick, PowerUp, Ball, Laser, PowerUpType, GameState } from './interfaces'; // Added GameState
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, PADDLE_Y,
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP, POWER_UP_SIZE,
    INITIAL_PADDLE_WIDTH, LASER_WIDTH, SAFETY_NET_HEIGHT,
    LASER_STRIPE_WIDTH_PER_SHOT,
    NORMAL_BRICK_COLOR, REINFORCED_BRICK_COLOR, UPGRADED_BRICK_COLOR, BUILDER_BRICK_COLOR,
    POWER_UP_COLORS,
    SPECIAL_BRICK_COLOR,
    RAINBOW_COLORS,
    RAINBOW_FLASH_INTERVAL,
    BIG_BALL_SIZE_INCREASE,
    BOMB_BRICK_COLOR,
    GOLD_COLOR,
    BALL_BRICK_COLOR, // Added import for the new brick color
    BONUS_GOLD_TIMER_DURATION // Import for timer color logic
} from './constants';

// --- Preload Power-Up Images --- 
let multiBallImage: HTMLImageElement;
let widenPaddleImage: HTMLImageElement;
let laserPaddleImage: HTMLImageElement;
let regenBrickImage: HTMLImageElement;
let upgradeBrickImage: HTMLImageElement;
let reinforceBrickImage: HTMLImageElement;
let safetyNetImage: HTMLImageElement;
let makeSpecialImage: HTMLImageElement;
let stickyPaddleImage: HTMLImageElement;
let bombBrickImage: HTMLImageElement;
let ballBrickImage: HTMLImageElement;
let collectionFieldImage: HTMLImageElement;
let bigBallImage: HTMLImageElement;
let blackBallImage: HTMLImageElement;
let builderBallImage: HTMLImageElement;
let homingBallImage: HTMLImageElement;
let pierceBallImage: HTMLImageElement;
let splittingBallImage: HTMLImageElement;

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
    stickyPaddleImage = new Image();
    stickyPaddleImage.src = '/images/sticky paddle.png';
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
}
// --------------------------------

// Helper function to get the base power-up type
const getBasePowerUpType = (type: PowerUpType): PowerUpType => {
    const baseType = type.split('_L')[0];
    return baseType as PowerUpType;
};


// Draw Paddle (Unchanged)
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
      ctx.fillStyle = POWER_UP_COLORS['STICKY_PADDLE'] + '99';
      ctx.beginPath();
      ctx.rect(paddleX, PADDLE_Y, currentWidth, PADDLE_HEIGHT);
      ctx.fill();
      ctx.closePath();
      ctx.save();
      ctx.font = "bold 12px Arial";
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${stickyCharges}`, paddleX + currentWidth / 2, PADDLE_Y + PADDLE_HEIGHT / 2 + 1);
      ctx.restore();
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

// Draw Collection Field (Unchanged)
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


// Draw Balls (Modified to accept active and stuck balls separately)
export const drawBalls = (ctx: CanvasRenderingContext2D, activeBalls: Ball[], stuckBalls: Ball[]) => {
    const drawBall = (ball: Ball) => { // Helper function to draw a single ball
         ctx.save();
         const currentRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
         ctx.beginPath();
         ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2);

         if (ball.stuckOffset !== undefined || ball.stuckSide) { // Check both top and side stuck
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
             ctx.fillStyle = "#000000";
         } else {
             ctx.fillStyle = "#ffffff";
         }
         ctx.fill();

         // Adjust stroke logic for clarity
         if (ball.stuckOffset !== undefined || ball.stuckSide) {
             ctx.strokeStyle = '#000000'; // Black stroke for stuck balls
         } else if (ball.isBlack) {
             ctx.strokeStyle = '#ffffff'; // White stroke for black ball
         } else if (ball.isSplitting || ball.isHoming) {
             ctx.strokeStyle = '#000000'; // Black stroke for splitting/homing
         }
         // Apply stroke if a strokeStyle was set
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

// Draw Bricks (Reverted to original implementation)
export const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[][], columns: number, rows: number) => {
    if (!bricks) return;
    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            if (brick && brick.status === 1) {
                ctx.beginPath();
                ctx.rect(brick.x, brick.y, brick.width, brick.height);
                // Determine the fill style based on brick properties
                if (brick.holdsBall) {
                    ctx.fillStyle = BALL_BRICK_COLOR; // Use the new color for bricks holding a ball
                } else if (brick.isBomb) {
                    ctx.fillStyle = BOMB_BRICK_COLOR;
                } else if (brick.isSpecial) {
                    ctx.fillStyle = SPECIAL_BRICK_COLOR;
                } else if (brick.upgradeLevel === 3) {
                    ctx.fillStyle = BUILDER_BRICK_COLOR;
                } else if (brick.upgradeLevel === 2) {
                    ctx.fillStyle = UPGRADED_BRICK_COLOR;
                } else if (brick.upgradeLevel === 1) {
                    ctx.fillStyle = REINFORCED_BRICK_COLOR;
                } else {
                    ctx.fillStyle = NORMAL_BRICK_COLOR;
                }
                ctx.fill();
                ctx.closePath();

                // Add visual indicator for bomb or ball-holding brick
                if (brick.isBomb) {
                    ctx.fillStyle = '#000000'; // Black center for bomb
                    ctx.beginPath();
                    ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                } else if (brick.holdsBall) {
                    ctx.fillStyle = '#AAAAAA'; // Gray center for ball-holding brick
                    ctx.beginPath();
                    ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width / 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }
    }
};


// --- MODIFIED: drawGameInfo ---
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

  // 1. Draw Score
  const scoreText = `Score: ${currentScore}/${targetScore}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = 'left';
  ctx.fillText(scoreText, xStart, yPos);
  let currentX = xStart + ctx.measureText(scoreText).width + padding;

  // 2. Draw Gold (if not test mode)
  if (!isTestMode) {
    const goldText = `Gold: ${gold}`;
    ctx.fillStyle = GOLD_COLOR || "#FFD700";
    ctx.fillText(goldText, currentX, yPos);
    currentX += ctx.measureText(goldText).width + padding;

    // 3. Draw Bonus Gold (if not test mode and bonus > 0)
    if (bonusGold > 0) {
        const bonusText = `(+${bonusGold})`;
        ctx.fillStyle = '#90EE90'; // Light green for bonus
        ctx.fillText(bonusText, currentX, yPos);
        currentX += ctx.measureText(bonusText).width; // Remove padding here, add after timer if drawn

        // *** ADDED: Draw Bonus Gold Timer if active ***
        if (bonusGoldTimerCountdown !== null && bonusGoldTimerCountdown > 0) {
            const secondsLeft = Math.ceil(bonusGoldTimerCountdown / 1000);
            // --- MODIFIED: Changed timer text format --- 
            const timerText = ` ${secondsLeft} seconds left!`; // Changed text format

            // Make timer color fade from green to red
            const ratio = Math.max(0, Math.min(1, bonusGoldTimerCountdown / BONUS_GOLD_TIMER_DURATION));
            const red = Math.round(255 * (1 - ratio));
            const green = Math.round(255 * ratio);
            ctx.fillStyle = `rgb(${red},${green},0)`; // Fade from green to red

            ctx.fillText(timerText, currentX, yPos);
            currentX += ctx.measureText(timerText).width;
        }
         // Add padding after bonus gold section (including timer if present)
        currentX += padding;
    }
  }

  // 4. Draw Lives
  const livesText = `Lives: ${lives}`;
  ctx.fillStyle = "#ff6347"; // Tomato color for lives
  ctx.fillText(livesText, currentX, yPos);
};
// --- END MODIFICATION ---

// Draw PowerUps (Uses preloaded images)
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
                case 'STICKY_PADDLE': imageToDraw = stickyPaddleImage; break;
                case 'BOMB_BRICK': imageToDraw = bombBrickImage; break;
                case 'BALL_BRICK': imageToDraw = ballBrickImage; break;
                case 'COLLECTION_FIELD': imageToDraw = collectionFieldImage; break;
                case 'BIG_BALL': imageToDraw = bigBallImage; break;
                case 'BLACK_BALL': imageToDraw = blackBallImage; break;
                case 'BUILDER_BALL': imageToDraw = builderBallImage; break;
                case 'HOMING_BALL': imageToDraw = homingBallImage; break;
                case 'PIERCE_BALL': imageToDraw = pierceBallImage; break;
                case 'SPLITTING_BALL': imageToDraw = splittingBallImage; break;
            }

            if (imageToDraw && imageToDraw.complete) { // check if image is loaded
                ctx.drawImage(imageToDraw, powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
            } else if (!imageToDraw) { // Fallback for non-image power-ups or if image is not defined (e.g. server-side)
                ctx.beginPath(); ctx.rect(powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
                if (powerUp.type === 'ALL_IN_ONE' && powerUp.timeCreated) {
                    const timeElapsed = currentTime - powerUp.timeCreated;
                    const colorIndex = Math.floor(timeElapsed / RAINBOW_FLASH_INTERVAL) % RAINBOW_COLORS.length;
                    ctx.fillStyle = RAINBOW_COLORS[colorIndex];
                } else {
                    ctx.fillStyle = POWER_UP_COLORS[powerUp.type as PowerUpType] || POWER_UP_COLORS['NONE']!;
                }
                ctx.fill();
                if (powerUp.type === 'BLACK_BALL' || powerUp.type === 'BOMB_BRICK' || powerUp.type === 'ALL_IN_ONE' || powerUp.type === 'STICKY_PADDLE') {
                    ctx.strokeStyle = (powerUp.type === 'ALL_IN_ONE') ? '#000000' : '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.closePath();
            }
        }
    });
};

// Draw PowerUp Previews (Uses preloaded images - Base images only)
export const drawPowerUpPreviews = (ctx: CanvasRenderingContext2D, spawnablePowerUpTypes: Set<PowerUpType>) => {
    const typesArray = Array.from(spawnablePowerUpTypes);
    const totalSpawnable = typesArray.length;
    if (totalSpawnable === 0) return;

    const spacing = (BOARD_WIDTH - (totalSpawnable * POWER_UP_SIZE)) / (totalSpawnable + 1);
    const startY = (BOARD_HEIGHT * 3) / 5; // Spawn 3/5 down the screen
    let currentX = spacing;
    const previewAlpha = '80'; // Hex alpha for ~50% transparency

    ctx.save(); // Save context state
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
            case 'STICKY_PADDLE': imageToDraw = stickyPaddleImage; break;
            case 'BOMB_BRICK': imageToDraw = bombBrickImage; break;
            case 'BALL_BRICK': imageToDraw = ballBrickImage; break;
            case 'COLLECTION_FIELD': imageToDraw = collectionFieldImage; break;
            case 'BIG_BALL': imageToDraw = bigBallImage; break;
            case 'BLACK_BALL': imageToDraw = blackBallImage; break;
            case 'BUILDER_BALL': imageToDraw = builderBallImage; break;
            case 'HOMING_BALL': imageToDraw = homingBallImage; break;
            case 'PIERCE_BALL': imageToDraw = pierceBallImage; break;
            case 'SPLITTING_BALL': imageToDraw = splittingBallImage; break;
        }
        
        if (imageToDraw && imageToDraw.complete) { // check if image is loaded
            ctx.drawImage(imageToDraw, currentX, startY, POWER_UP_SIZE, POWER_UP_SIZE);
        } else if (!imageToDraw) { // Fallback for non-image power-ups or if image is not defined (e.g. server-side)
            // Fallback for non-image power-ups
            ctx.globalAlpha = 1.0; // Reset alpha for non-image power-ups before applying color alpha
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
        ctx.globalAlpha = 1.0; // Reset alpha for the next iteration
        currentX += POWER_UP_SIZE + spacing;
    });
    ctx.restore(); // Restore context state
};

// Draw Lasers (Unchanged)
export const drawLasers = (ctx: CanvasRenderingContext2D, lasers: Laser[]) => {
    lasers.forEach(laser => { ctx.beginPath(); ctx.rect(laser.x, laser.y, laser.width, laser.height); ctx.fillStyle = "#e74c3c"; ctx.fill(); ctx.closePath(); });
};


// Draw Safety Net (Unchanged)
export const drawSafetyNet = (ctx: CanvasRenderingContext2D, count: number) => {
    if (count > 0) {
      ctx.save();
      ctx.fillStyle = POWER_UP_COLORS['SAFETY_NET'] + 'CC'; // Apply transparency
      for (let i = 0; i < count; i++) {
         ctx.beginPath();
         // Stack nets from the bottom up
         const yPosition = BOARD_HEIGHT - (i + 1) * SAFETY_NET_HEIGHT;
         if (yPosition < 0) continue; // Don't draw off-screen nets
         ctx.rect(0, yPosition, BOARD_WIDTH, SAFETY_NET_HEIGHT);
         ctx.fill();
         // Add a subtle border between stacked nets for visual clarity
         if (i > 0) {
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // Faint white line
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

// Draw End Message (Unchanged)
export const drawEndMessage = (
    ctx: CanvasRenderingContext2D,
    state: GameState, // Use GameState type
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

    // Draw final score below the message
    ctx.font = "24px Arial";
    ctx.fillText(`Final Score: ${finalScore}`, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 + 20);
};

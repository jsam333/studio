import { Brick, PowerUp, Ball, Laser, PowerUpType, GameStateRefs } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, /*Removed BRICK_WIDTH, BRICK_HEIGHT */ PADDLE_Y,
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
    GOLD_COLOR // Assuming GOLD_COLOR is defined in constants
} from './constants';

// Draw Paddle
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

// Draw Collection Field
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


// Draw Balls
export const drawBalls = (ctx: CanvasRenderingContext2D, allBalls: Ball[]) => {
  allBalls.forEach(ball => {
    ctx.save();
    const currentRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2);

    if (ball.stuckOffset !== undefined) {
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

    if (ball.isBlack || ball.isSplitting || ball.isHoming || ball.stuckOffset !== undefined) {
        ctx.strokeStyle = '#ffffff';
        if ((ball.isSplitting || ball.isHoming || (ball.stuckOffset !== undefined && !ball.isBlack)) && !ball.isBlack) {
            ctx.strokeStyle = '#000000';
        }
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.closePath();
    ctx.restore();
  });
};

// Draw Bricks - Updated to use brick.width and brick.height
export const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[][], columns: number, rows: number) => {
  if (!bricks) return;
  for (let c = 0; c < columns; c++) {
    if (!bricks[c]) continue;
    for (let r = 0; r < rows; r++) {
        const brick = bricks[c][r];
        if (brick && brick.status === 1) { 
            ctx.beginPath();
            // Use brick.width and brick.height from the object
            ctx.rect(brick.x, brick.y, brick.width, brick.height);
            if (brick.isBomb) {
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

            // Use brick.width for bomb indicator size
            if (brick.isBomb) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.width / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }
      }
    }
  }
};

// Draw Brick Counter and Gold (Replaces drawBrickCounter)
export const drawGameInfo = (ctx: CanvasRenderingContext2D, currentBrickCount: number, totalBricks: number, gold: number, isTestMode: boolean) => {
  const bricksBroken = totalBricks - currentBrickCount;
  const brickText = `Bricks: ${bricksBroken}/${totalBricks}`;
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff"; // White for brick count
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top'; 

  const yPos = 10; // Y position for the text line
  const xStart = 8; // Starting X position
  const padding = 15; // Padding between texts

  ctx.fillText(brickText, xStart, yPos);

  // Only display gold if not in test mode
  if (!isTestMode) {
    const goldText = `Gold: ${gold}`;
    // Measure the brick text width to position gold next to it
    const brickTextWidth = ctx.measureText(brickText).width;
    const goldXPos = xStart + brickTextWidth + padding;
    ctx.fillStyle = GOLD_COLOR || "#FFD700"; // Gold color for gold count
    ctx.fillText(goldText, goldXPos, yPos);
  }
};


// Draw PowerUps
export const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
  const currentTime = Date.now();
  powerUps.forEach(powerUp => {
    if (powerUp.status === 'falling') {
      ctx.beginPath(); ctx.rect(powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
      if (powerUp.type === 'ALL_IN_ONE' && powerUp.timeCreated) {
          const timeElapsed = currentTime - powerUp.timeCreated; const colorIndex = Math.floor(timeElapsed / RAINBOW_FLASH_INTERVAL) % RAINBOW_COLORS.length;
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
  });
};


// Draw Lasers
export const drawLasers = (ctx: CanvasRenderingContext2D, lasers: Laser[]) => {
    lasers.forEach(laser => { ctx.beginPath(); ctx.rect(laser.x, laser.y, laser.width, laser.height); ctx.fillStyle = "#e74c3c"; ctx.fill(); ctx.closePath(); });
};


// Draw Safety Net
export const drawSafetyNet = (ctx: CanvasRenderingContext2D, count: number) => {
    if (count > 0) {
      ctx.save();
      ctx.fillStyle = POWER_UP_COLORS['SAFETY_NET'] + 'CC'; 
      for (let i = 0; i < count; i++) {
         ctx.beginPath();
         const yPosition = BOARD_HEIGHT - (i + 1) * SAFETY_NET_HEIGHT;
         if (yPosition < 0) continue;
         ctx.rect(0, yPosition, BOARD_WIDTH, SAFETY_NET_HEIGHT);
         ctx.fill();
         ctx.closePath();
      }
      ctx.restore();
    }
};

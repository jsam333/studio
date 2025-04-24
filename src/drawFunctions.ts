import { Brick, PowerUp, Ball, Laser, PowerUpType, GameStateRefs } from './interfaces';
import {
    BOARD_WIDTH, BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, BRICK_WIDTH, BRICK_HEIGHT, PADDLE_Y,
    BRICK_PADDING, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP, POWER_UP_SIZE,
    INITIAL_PADDLE_WIDTH, LASER_WIDTH, SAFETY_NET_HEIGHT,
    LASER_STRIPE_WIDTH_PER_SHOT,
    NORMAL_BRICK_COLOR, REINFORCED_BRICK_COLOR, UPGRADED_BRICK_COLOR, BUILDER_BRICK_COLOR,
    POWER_UP_COLORS,
    SPECIAL_BRICK_COLOR,
    RAINBOW_COLORS,
    RAINBOW_FLASH_INTERVAL,
    BIG_BALL_SIZE_INCREASE,
    BOMB_BRICK_COLOR
} from './constants';

// Draw Paddle - Updated for sticky charges
export const drawPaddle = (
    ctx: CanvasRenderingContext2D,
    paddleX: number,
    currentWidth: number = INITIAL_PADDLE_WIDTH,
    laserShots: number = 0,
    stickyCharges: number = 0 // Changed parameter to stickyCharges
) => {
  // Base paddle color
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.rect(paddleX, PADDLE_Y, currentWidth, PADDLE_HEIGHT);
  ctx.fill();
  ctx.closePath();

  // Sticky Paddle Indicator (Golden Overlay & Charge Count)
  if (stickyCharges > 0) {
      // Overlay
      ctx.fillStyle = POWER_UP_COLORS['STICKY_PADDLE'] + '99'; // GoldenRod with alpha
      ctx.beginPath();
      ctx.rect(paddleX, PADDLE_Y, currentWidth, PADDLE_HEIGHT);
      ctx.fill();
      ctx.closePath();

      // Charge Count Text
      ctx.save();
      ctx.font = "bold 12px Arial";
      ctx.fillStyle = "#000000"; // Black text for visibility on gold
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${stickyCharges}`, paddleX + currentWidth / 2, PADDLE_Y + PADDLE_HEIGHT / 2 + 1); // Center text
      ctx.restore();
  }

  // Laser Stripe Indicator
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

// Draw Collection Field (Expanding Rectangular) - Unchanged
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


// Draw Balls - Unchanged (logic handles active vs stuck)
export const drawBalls = (ctx: CanvasRenderingContext2D, allBalls: Ball[]) => {
  allBalls.forEach(ball => {
    ctx.save();
    const currentRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2);

    if (ball.stuckOffset !== undefined) { 
        ctx.fillStyle = "#cccccc"; // Indicate stuck ball visually
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

// Draw Bricks - Unchanged
export const drawBricks = (ctx: CanvasRenderingContext2D, bricks: Brick[][]) => {
  if (!bricks) return;
  for (let c = 0; c < bricks.length; c++) {
    if (!bricks[c]) continue;
    for (let r = 0; r < bricks[c].length; r++) {
        const brick = bricks[c][r];
        if (brick.status === 1) {
            ctx.beginPath();
            ctx.rect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
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

            if (brick.isBomb) {
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(brick.x + BRICK_WIDTH / 2, brick.y + BRICK_HEIGHT / 2, BRICK_WIDTH / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.closePath();
            }
      }
    }
  }
};

// Draw Score - Unchanged
export const drawScore = (ctx: CanvasRenderingContext2D, score: number) => {
  ctx.font = "16px Arial"; ctx.fillStyle = "#ffffff"; ctx.textAlign = 'left'; ctx.fillText("Score: " + score, 8, 20);
};


// Draw PowerUps - Unchanged
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


// Draw Lasers - Unchanged
export const drawLasers = (ctx: CanvasRenderingContext2D, lasers: Laser[]) => {
    lasers.forEach(laser => { ctx.beginPath(); ctx.rect(laser.x, laser.y, laser.width, laser.height); ctx.fillStyle = "#e74c3c"; ctx.fill(); ctx.closePath(); });
};


// Draw Safety Net - Reverted to original calculation
export const drawSafetyNet = (ctx: CanvasRenderingContext2D, count: number) => {
    if (count > 0) { 
      ctx.save(); 
      ctx.fillStyle = POWER_UP_COLORS['SAFETY_NET']! + 'CC'; 
      for (let i = 0; i < count; i++) {
         ctx.beginPath();
         // Reverted yPosition calculation
         const yPosition = PADDLE_Y + PADDLE_HEIGHT + i * SAFETY_NET_HEIGHT + 2; 
         ctx.rect(0, yPosition, BOARD_WIDTH, SAFETY_NET_HEIGHT);
         ctx.fill();
         ctx.closePath();
      }
      ctx.restore();
    }
};

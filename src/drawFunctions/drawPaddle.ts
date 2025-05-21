import { PADDLE_HEIGHT, PADDLE_Y, INITIAL_PADDLE_WIDTH, LASER_STRIPE_WIDTH_PER_SHOT, STICKY_INDICATOR_WIDTH_PER_CHARGE, POWER_UP_COLORS } from '../constants';

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

    // NEW MERGED DRAWING LOGIC
    // The rectangle's height will be the sum of the paddle's height and the offset above the paddle.
    const singleRectHeight = PADDLE_HEIGHT + fieldHeightOffset;

    ctx.beginPath();
    // Draw the single encompassing rectangle using fieldX, fieldTopY, fieldWidth, and singleRectHeight
    ctx.rect(fieldX, fieldTopY, fieldWidth, singleRectHeight);
    ctx.fill();
    ctx.stroke(); 
    ctx.closePath();
    // END OF NEW MERGED DRAWING LOGIC

    ctx.restore();
};

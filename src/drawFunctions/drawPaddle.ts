import { PADDLE_HEIGHT, PADDLE_Y, INITIAL_PADDLE_WIDTH, LASER_STRIPE_WIDTH_PER_SHOT, STICKY_INDICATOR_WIDTH_PER_CHARGE, POWER_UP_COLORS } from '../constants';

// Scanner line state variables
const SCANNER_SPEED_PPS = 18.75; 
const SCANNER_SPAWN_INTERVAL_MS = 562.5; // 375 * 1.5, to make lines 50% further apart
let scannerPatternOffset = 0; // Represents the total downward scroll of the pattern
let lastFrameTimeMs = Date.now(); // For delta time calculation

export const drawPaddle = (
    ctx: CanvasRenderingContext2D,
    paddleX: number,
    currentWidth: number = INITIAL_PADDLE_WIDTH,
    laserShots: number = 0,
    stickyCharges: number = 0,
    fieldHeightOffset: number = 0, // For collection field
    fieldWidthOffset: number = 0    // For collection field
) => {
    const nowMs = Date.now();
    const deltaSeconds = (nowMs - lastFrameTimeMs) / 1000.0;
    lastFrameTimeMs = nowMs;

    const isFieldActive = fieldHeightOffset > 0 || fieldWidthOffset > 0;

    if (isFieldActive) {
        // Update the scanner pattern's total scroll offset (pattern moves downwards)
        scannerPatternOffset += SCANNER_SPEED_PPS * deltaSeconds;

        const fieldTopY = PADDLE_Y - fieldHeightOffset;
        const fieldX = paddleX - fieldWidthOffset;
        const fieldWidth = currentWidth + (fieldWidthOffset * 2);
        const singleRectHeight = PADDLE_HEIGHT + fieldHeightOffset;
        const fieldBottomY = fieldTopY + singleRectHeight;

        ctx.save();
        const fieldColorHex = POWER_UP_COLORS['COLLECTION_FIELD'] || '#2ecc71';
        let r = 46, g = 204, b = 113; // Default to #2ecc71 color
        if (fieldColorHex.length === 7 && fieldColorHex.startsWith('#')) {
            r = parseInt(fieldColorHex.substring(1, 3), 16);
            g = parseInt(fieldColorHex.substring(3, 5), 16);
            b = parseInt(fieldColorHex.substring(5, 7), 16);
        }
        
        // Draw the main collection field rectangle
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.rect(fieldX, fieldTopY, fieldWidth, singleRectHeight);
        ctx.fill();
        ctx.stroke(); 
        ctx.closePath();

        // Draw scanner lines based on the continuous pattern moving downwards
        const lineSpacing = SCANNER_SPEED_PPS * (SCANNER_SPAWN_INTERVAL_MS / 1000.0);

        if (lineSpacing > 0) {
            // Calculate the Y coordinate of the first visible scanner line.
            // scannerPatternOffset increases as the pattern effectively moves downwards.
            // We find the multiple of lineSpacing (relative to the scrolled pattern origin) 
            // that places the line at or after fieldTopY.
            const k_start = Math.ceil((fieldTopY - scannerPatternOffset) / lineSpacing);
            let lineY = scannerPatternOffset + k_start * lineSpacing;

            // Draw lines as long as they are within the field boundaries
            while (lineY <= fieldBottomY) {
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(fieldX, lineY);
                ctx.lineTo(fieldX + fieldWidth, lineY);
                ctx.stroke();
                ctx.closePath();
                lineY += lineSpacing;
            }
        }
        ctx.restore(); // Restore context after drawing field and scanner
    } 
    // Note: If field is not active, scannerPatternOffset retains its value and is not updated,
    // so the pattern will resume correctly if the field becomes active again.

    // --- End of collection field and scanner logic ---

    // Draw the paddle itself (on top of the field)
    ctx.fillStyle = "#ffffff"; 
    ctx.beginPath();
    ctx.rect(paddleX, PADDLE_Y, currentWidth, PADDLE_HEIGHT);
    ctx.fill();
    ctx.closePath();

    // Draw sticky charges indicator (on top of paddle)
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

    // Draw laser shots indicator (on top of paddle)
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

import { BOARD_WIDTH, BOARD_HEIGHT, GOLD_COLOR } from '../constants';

const MAX_SHAKE_AMOUNT = 10; // pixels
const SHAKE_DURATION = 250; // ms, the shake will fade out over this duration

export const drawLevelClearedMessage = (ctx: CanvasRenderingContext2D, elapsedTime: number, goldEarned: number) => {
    ctx.save();
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const progress = Math.min(elapsedTime / SHAKE_DURATION, 1);
    // Using an ease-out quadratic function for intensity fade
    const shakeIntensity = MAX_SHAKE_AMOUNT * (1 - progress * progress);

    const offsetX = (Math.random() - 0.5) * shakeIntensity * 2;
    const offsetY = (Math.random() - 0.5) * shakeIntensity * 2;


    ctx.fillText("Level Cleared!", BOARD_WIDTH / 2 + offsetX, BOARD_HEIGHT / 2 + offsetY);
    
    // Display gold earned
    ctx.font = "22px Arial";
    ctx.fillStyle = GOLD_COLOR || "#FFD700";
    ctx.fillText(`+${goldEarned} Gold`, BOARD_WIDTH / 2 + offsetX, BOARD_HEIGHT / 2 + offsetY + 35);
    
    ctx.restore();
}; 
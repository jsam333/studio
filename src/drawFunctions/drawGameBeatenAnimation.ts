import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

const MAX_SHAKE_AMOUNT = 15;
const SHAKE_DURATION = 500; // ms

export const drawGameBeatenAnimation = (ctx: CanvasRenderingContext2D, elapsedTime: number) => {
    ctx.save();
    
    ctx.font = `bold 48px Arial`;
    ctx.fillStyle = "#ffffff"; // Changed to white
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Gentle shake for emphasis
    const progress = Math.min(elapsedTime / SHAKE_DURATION, 1);
    const shakeIntensity = MAX_SHAKE_AMOUNT * (1 - progress * progress);
    const offsetX = (Math.random() - 0.5) * shakeIntensity;
    const offsetY = (Math.random() - 0.5) * shakeIntensity;
    
    ctx.fillText("You Win!", BOARD_WIDTH / 2 + offsetX, BOARD_HEIGHT / 2 + offsetY);
    
    ctx.restore();
}; 
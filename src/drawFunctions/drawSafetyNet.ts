import { BOARD_WIDTH, BOARD_HEIGHT, SAFETY_NET_HEIGHT, POWER_UP_COLORS } from '../constants';

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

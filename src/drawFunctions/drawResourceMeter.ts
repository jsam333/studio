import { BOARD_WIDTH } from '../constants';

const METER_HEIGHT = 5;
const MAX_RESOURCE = 100;

export const drawResourceMeter = (
    ctx: CanvasRenderingContext2D,
    resourceLevel: number
) => {
    ctx.save();

    // Draw the background bar
    ctx.fillStyle = 'rgba(80, 80, 80, 0.7)'; // Dark grey background
    ctx.fillRect(0, 0, BOARD_WIDTH, METER_HEIGHT);

    // Calculate the width of the filled portion
    const filledWidth = (resourceLevel / MAX_RESOURCE) * BOARD_WIDTH;
    
    // Draw the filled portion
    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)'; // Cyan fill color
    ctx.fillRect(0, 0, filledWidth, METER_HEIGHT);

    // Optional: Draw a thin border around the meter for definition
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, BOARD_WIDTH, METER_HEIGHT);

    ctx.restore();
}; 
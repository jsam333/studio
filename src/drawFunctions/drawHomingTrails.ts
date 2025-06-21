// src/drawFunctions/drawHomingTrails.ts
import { HomingTrail } from '../interfaces';

export const drawHomingTrails = (
    context: CanvasRenderingContext2D,
    trails: HomingTrail[],
    currentTime: number,
    trailDuration: number
): void => {
    if (!context || trails.length === 0) return;

    trails.forEach(trail => {
        const elapsedTime = currentTime - trail.createdAt;
        const alpha = Math.max(0, 1 - (elapsedTime / trailDuration));

        if (alpha <= 0) return; // Don't draw if fully faded

        context.save();
        context.beginPath();
        context.moveTo(trail.startX, trail.startY);
        context.lineTo(trail.endX, trail.endY);
        
        context.strokeStyle = trail.color;
        context.lineWidth = 2;
        context.globalAlpha = alpha;
        context.setLineDash([5, 5]); // Dash pattern: 5 pixels on, 5 pixels off
        context.stroke();
        context.restore();
    });
};

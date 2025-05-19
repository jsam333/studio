import { PointsField } from '../interfaces';
import { POINTS_FIELD_COLOR } from '../constants';

export const drawPointsFields = (ctx: CanvasRenderingContext2D, pointsFields: PointsField[]) => {
    if (!pointsFields) return;
    pointsFields.forEach(field => {
        ctx.save();
        ctx.fillStyle = POINTS_FIELD_COLOR;
        ctx.beginPath();
        ctx.rect(field.x, field.y, field.width, field.height);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)'; 
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    });
};

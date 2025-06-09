import { PaddleTarget } from '../interfaces';

export const drawPaddleTargets = (
    ctx: CanvasRenderingContext2D,
    targets: PaddleTarget[],
    currentTime: number
) => {
    if (!targets || targets.length === 0) return;

    targets.forEach(target => {
        if (target.isHit) return;

        const elapsedTime = currentTime - target.startTime;
        if (elapsedTime < 0 || elapsedTime > target.totalDuration) return;

        const progress = elapsedTime / target.totalDuration;
        const currentRadius = target.initialRadius * (1 - progress);

        if (currentRadius > 0.5) { // Only draw if the radius is meaningful
            ctx.save();
            ctx.beginPath();
            ctx.arc(target.x, target.y, currentRadius, 0, Math.PI * 2);

            ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
            ctx.lineWidth = 1 + (1 * (1 - progress)); // Line gets thinner as it shrinks
            
            ctx.shadowColor = `rgba(255, 255, 255, 0.7)`;
            ctx.shadowBlur = 8 * (1 - progress);

            ctx.stroke();
            ctx.restore();
        }
    });
}; 
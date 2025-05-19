import { Particle } from '../interfaces';

export const drawParticles = (ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    if (!particles) return;
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    });
};

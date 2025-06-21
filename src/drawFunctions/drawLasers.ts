import { Laser } from '../interfaces';

export const drawLasers = (ctx: CanvasRenderingContext2D, lasers: Laser[]) => {
    lasers.forEach(laser => { ctx.beginPath(); ctx.rect(laser.x, laser.y, laser.width, laser.height); ctx.fillStyle = "#e74c3c"; ctx.fill(); ctx.closePath(); });
};

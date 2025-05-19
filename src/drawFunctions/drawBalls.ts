import { Ball } from '../interfaces';
import {
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, POWER_UP_COLORS, 
    BLACK_BALL_VISUAL_EFFECT_DURATION_MS, BLACK_BALL_GLOW_MAX_RADIUS_ADDITION 
} from '../constants';

const drawBlackBallRadialGlow = (
    ctx: CanvasRenderingContext2D,
    ball: Ball,
    currentTime: number,
    // effectStartTime is now read directly from ball.glowEffectStartTime
) => {
    if (typeof ball.glowEffectStartTime !== 'number') return;

    const elapsedTime = currentTime - ball.glowEffectStartTime;
    if (elapsedTime >= BLACK_BALL_VISUAL_EFFECT_DURATION_MS || elapsedTime < 0) {
        return;
    }

    const progress = elapsedTime / BLACK_BALL_VISUAL_EFFECT_DURATION_MS;
    const overallEffectAlpha = 1 - progress; // General fade for the entire effect

    // Glow size starts big and shrinks
    const sizeFactor = 1 - progress; // Goes from 1 down to 0
    const currentGlowRadiusAddition = BLACK_BALL_GLOW_MAX_RADIUS_ADDITION * sizeFactor;
    
    const ballPhysicalRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
    const glowOuterRadius = ballPhysicalRadius + currentGlowRadiusAddition;

    ctx.save();

    const gradient = ctx.createRadialGradient(
        ball.x, 
        ball.y, 
        0, 
        ball.x, 
        ball.y, 
        Math.max(0, glowOuterRadius)
    );

    gradient.addColorStop(0, `rgba(255, 255, 255, ${overallEffectAlpha})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, Math.max(0, glowOuterRadius), 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
};

export const drawBalls = (
    ctx: CanvasRenderingContext2D, 
    activeBalls: Ball[], 
    stuckBalls: Ball[], 
    // blackBallEffectActive, blackBallEffectStartTime removed
    currentTime?: number // currentTime is still needed for the effect calculation
) => {
    const drawBall = (ball: Ball) => { 
         ctx.save();

         const currentRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;
         
         // Draw the main ball first
         ctx.beginPath();
         ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2);

         let fillStyle = "#ffffff";
         if (ball.stuckOffset !== undefined || ball.stuckSide) { 
             fillStyle = "#cccccc";
         } else if (ball.isHoming) {
             fillStyle = POWER_UP_COLORS['HOMING_BALL'] || '#f1c40f';
         } else if (ball.isSplitting) {
             fillStyle = POWER_UP_COLORS['SPLITTING_BALL'] || '#9b59b6';
         } else if (ball.isBlue) {
             fillStyle = POWER_UP_COLORS['BUILDER_BALL']!;
         } else if (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) {
             fillStyle = POWER_UP_COLORS['PIERCE_BALL']!;
         } else if (ball.isBlack) {
             fillStyle = "#808080";
         } else {
             fillStyle = "#ffffff";
         }
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.closePath(); 

        // Then draw the glow effect if applicable, using per-ball state
        if (ball.isBlack && ball.isGlowEffectActive && typeof ball.glowEffectStartTime === 'number' && typeof currentTime === 'number') {
            drawBlackBallRadialGlow(ctx, ball, currentTime);
        }

        // Stroke logic
        let strokeStyle: string | undefined = undefined;
        if (ball.stuckOffset !== undefined || ball.stuckSide) { 
            strokeStyle = '#000000'; 
        } else if (ball.isBlack) {
            strokeStyle = '#A9A9A9';
        } else if (ball.isSplitting || ball.isHoming) {
            strokeStyle = '#000000'; 
        }

        if (strokeStyle) {
            ctx.beginPath(); 
            ctx.arc(ball.x, ball.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
        }
        
        ctx.restore();
    };

    activeBalls.forEach(drawBall);
    stuckBalls.forEach(drawBall);
};

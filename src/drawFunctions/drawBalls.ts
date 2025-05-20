import { Ball } from '../interfaces';
import {
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, POWER_UP_COLORS, 
    DOUBLE_BALL_VISUAL_EFFECT_DURATION_MS, DOUBLE_BALL_GLOW_MAX_RADIUS_ADDITION,
    BALL_POP_EFFECT_DURATION_MS, BALL_POP_EFFECT_SCALE_AMOUNT
} from '../constants';

const drawRadialGlowEffect = (
    ctx: CanvasRenderingContext2D,
    ball: Ball,
    currentTime: number
) => {
    if (typeof ball.glowEffectStartTime !== 'number') return;

    const elapsedTime = currentTime - ball.glowEffectStartTime;
    if (elapsedTime >= DOUBLE_BALL_VISUAL_EFFECT_DURATION_MS || elapsedTime < 0) {
        return;
    }

    const progress = elapsedTime / DOUBLE_BALL_VISUAL_EFFECT_DURATION_MS;
    const overallEffectAlpha = 1 - progress; 

    const sizeFactor = 1 - progress; 
    const currentGlowRadiusAddition = DOUBLE_BALL_GLOW_MAX_RADIUS_ADDITION * sizeFactor;
    
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
    currentTime?: number
) => {
    const drawBall = (ball: Ball) => { 
         ctx.save();

         let currentRadius = ball.isBig ? BALL_SIZE + BIG_BALL_SIZE_INCREASE : BALL_SIZE;

         // Apply pop effect if active
         if (ball.isPopEffectActive && typeof ball.popEffectStartTime === 'number' && typeof currentTime === 'number') {
            const effectElapsedTime = currentTime - ball.popEffectStartTime;
            if (effectElapsedTime < BALL_POP_EFFECT_DURATION_MS) {
                const progress = effectElapsedTime / BALL_POP_EFFECT_DURATION_MS;
                const scaleAddition = BALL_POP_EFFECT_SCALE_AMOUNT * Math.sin(progress * Math.PI);
                currentRadius = currentRadius * (1 + scaleAddition);
            } else {
                // Effect finished, reset flags (optional, or manage in update logic)
                // ball.isPopEffectActive = false;
                // delete ball.popEffectStartTime;
            }
        }
         
         // Determine if the glow should be drawn for this ball
         const shouldGlow = ball.isDouble || 
                            (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) || 
                            ball.isSplitting ||
                            ball.isBlue || // For Builder Ball
                            ball.isHoming;   // For Homing Ball

         // 1. Draw the glow effect first if applicable
         if (shouldGlow && ball.isGlowEffectActive && typeof ball.glowEffectStartTime === 'number' && typeof currentTime === 'number') {
             drawRadialGlowEffect(ctx, ball, currentTime);
         }

         // 2. Draw the main ball on top of the glow
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
         } else if (ball.isDouble) {
             fillStyle = "#808080";
         } else {
             fillStyle = "#ffffff";
         }
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.closePath(); 

        // 3. Draw the stroke on top of everything
        let strokeStyle: string | undefined = undefined;
        if (ball.stuckOffset !== undefined || ball.stuckSide) { 
            strokeStyle = '#000000'; 
        } else if (ball.isDouble) {
            strokeStyle = '#A9A9A9';
        } else if (ball.isSplitting || ball.isHoming || (ball.pierceHitsRemaining && ball.pierceHitsRemaining > 0) || ball.isBlue) {
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

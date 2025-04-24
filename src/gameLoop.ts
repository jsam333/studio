// src/gameLoop.ts
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent } from './interfaces'; 
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
import { trySpawnPowerUp } from './gameUpdates/gameLoopUtils'; 
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS // Reverted to BASE_BALL_SPEED_FACTOR
} from './constants';
import { drawPaddle, drawBalls, drawBricks, drawScore, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect } from './drawFunctions';

export const gameUpdate = (
    ctx: CanvasRenderingContext2D,
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
) => {
    // --- Check Game Over State FIRST ---
    // This check ensures that if the game ended on a *previous* frame, 
    // we just draw the end message and stop.
    if (refs.gameOverStateRef.current !== 'playing') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); 
        callbacks.drawEndMessage(ctx, refs.gameOverStateRef.current, refs.scoreRef.current);
        return; // Stop processing this frame
    }
    
    // Game is not over *yet*, proceed with potential updates
    const currentTime = Date.now();
    const gameSpeedFactor = refs.gameSpeedFactorRef.current;
    let spawnRequests: PowerUpSpawnEvent[] = [];
    const previousBallCount = refs.ballsRef.current.length + refs.stuckBallsRef.current.length; // Store ball count *before* updates

    // --- Update Ball Positions (Stuck & Active) ---
    updateBalls(refs, callbacks, spawnRequests, currentTime, gameSpeedFactor);

    // --- Pre-Start State Check ---
    if (!refs.isGameStartedRef.current) {
        // --- Draw Pre-Start State ---
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        drawBricks(ctx, refs.bricksRef.current);
        drawPaddle(
            ctx,
            refs.paddleXRef.current,
            refs.paddleWidthRef.current,
            0, 0
        );
        drawBalls(ctx, refs.stuckBallsRef.current); 
        return; // Stop before main game logic updates
    }

    // --- Game Is Started and Running State ---
    let collectedPowerUpTypes: PowerUpType[] = []; 
    
    // --- Updates ---
    updateLasers(refs, callbacks, spawnRequests, currentTime); 

    // Process spawn requests 
    let newlySpawnedPowerUps: PowerUp[] = [];
    const currentFallingPowerUpCount = refs.powerUpsRef.current.filter(p => p.status === 'falling').length;
    const enabledPowerUps = refs.enabledPowerUpsRef.current;
    spawnRequests.forEach(request => {
        trySpawnPowerUp( request.brickX, request.brickY, request.marker === 'SPAWN_SPECIAL', currentFallingPowerUpCount, newlySpawnedPowerUps, enabledPowerUps, currentTime );
    });

    // Update power-ups
    refs.powerUpsRef.current = updatePowerUps( refs, gameSpeedFactor, newlySpawnedPowerUps, collectedPowerUpTypes );

    // Apply effects
    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypes, currentTime, gameSpeedFactor);

    // --- Drawing --- 
    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current);

    const allBallsToDraw = [...refs.ballsRef.current, ...refs.stuckBallsRef.current]; 
    drawBalls(ctx, allBallsToDraw);

    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }

    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);
    drawScore(ctx, refs.scoreRef.current);
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);

    // Reverted to BASE_BALL_SPEED_FACTOR
    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) { 
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(2)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    // --- Game Status Check (at the end of a running frame) ---
    const finalStatus = checkGameStatus(refs, callbacks, previousBallCount);

    // --- Draw End Message IMMEDIATELY if game ended THIS frame ---
    // This ensures the end message appears even if the loop is stopped by gameIsRunningRef=false
    if (finalStatus !== 'playing') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); // Clear the game screen one last time
        callbacks.drawEndMessage(ctx, finalStatus, refs.scoreRef.current);
    }
};
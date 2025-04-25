// src/gameLoop.ts
import React from 'react';
import { Ball, PowerUp, Laser, PowerUpType, PowerUpSpawnEvent, GameMode, Brick } from './interfaces'; 
import { GameStateRefs, GameLoopCallbacks } from './interfaces';
import { updateLasers } from './gameUpdates/laserUpdates';
import { updateBalls } from './gameUpdates/ballUpdates';
import { updatePowerUps } from './gameUpdates/powerUpUpdates';
import { applyPowerUpEffects } from './gameUpdates/powerUpEffects';
import { checkGameStatus } from './gameUpdates/gameStatus';
import { trySpawnPowerUp } from './gameUpdates/gameLoopUtils'; 
import {
    BOARD_WIDTH, BOARD_HEIGHT, BASE_BALL_SPEED_FACTOR, POWER_UP_COLORS 
} from './constants';
import { drawPaddle, drawBalls, drawBricks, drawGameInfo, drawPowerUps, drawLasers, drawSafetyNet, drawCollectionFieldRect } from './drawFunctions'; 

// Helper function to count active bricks
const countActiveBricks = (bricks: Brick[][], columns: number, rows: number): number => {
    let count = 0;
    for (let c = 0; c < columns; c++) {
        if (bricks[c]) {
            for (let r = 0; r < rows; r++) {
                if (bricks[c][r] && bricks[c][r].status === 1) {
                    count++;
                }
            }
        }
    }
    return count;
};

export const gameUpdate = (
    ctx: CanvasRenderingContext2D,
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    deltaTime: number 
) => {
    const currentGameState = refs.gameOverStateRef.current;
    if (currentGameState !== 'playing') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); 
        callbacks.drawEndMessage(ctx, currentGameState, refs.scoreRef.current);
        return; 
    }
    
    const currentTime = Date.now();
    const gameSpeedFactor = refs.gameSpeedFactorRef.current;
    let spawnRequests: PowerUpSpawnEvent[] = [];
    const previousBallCount = refs.ballsRef.current.length + refs.stuckBallsRef.current.length; 

    const columns = refs.brickColumnsRef.current;
    const rows = refs.brickRowsRef.current;
    const gameMode = refs.gameModeRef.current; 
    const isTestMode = gameMode === 'test';

    updateBalls(refs, callbacks, spawnRequests, currentTime, gameSpeedFactor, deltaTime, columns, rows);

    // If game hasn't started (ball not launched), draw static elements and return
    if (!refs.isGameStartedRef.current) {
        const currentBrickCount = countActiveBricks(refs.bricksRef.current, columns, rows);
        const totalBricks = refs.totalBricksRef.current;
        const currentGold = refs.goldRef.current;
        const currentBonusGold = refs.bonusGoldRef.current; // Get bonus gold

        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
        drawBricks(ctx, refs.bricksRef.current, columns, rows);
        drawPaddle(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, 0, 0);
        drawBalls(ctx, refs.stuckBallsRef.current); 
        // Draw info including bonus gold before start
        drawGameInfo(ctx, currentBrickCount, totalBricks, currentGold, currentBonusGold, isTestMode);
        return; 
    }

    // --- Game Started Logic --- 

    let collectedPowerUpTypes: PowerUpType[] = []; 
    updateLasers(refs, callbacks, spawnRequests, currentTime, deltaTime, columns, rows); 

    // Process spawn requests
    let newlySpawnedPowerUps: PowerUp[] = [];
    const currentFallingPowerUpCount = refs.powerUpsRef.current.filter(p => p.status === 'falling').length;
    const availablePowerUpsForSpawning = gameMode === 'main' 
        ? refs.spawnablePowerUpsRef.current 
        : refs.enabledPowerUpsRef.current;

    spawnRequests.forEach(request => {
        trySpawnPowerUp( 
            request.brickX, 
            request.brickY, 
            request.brickWidth, 
            request.marker === 'SPAWN_SPECIAL', 
            currentFallingPowerUpCount, 
            newlySpawnedPowerUps, 
            availablePowerUpsForSpawning, 
            gameMode, 
            currentTime 
        );
    });

    refs.powerUpsRef.current = updatePowerUps( refs, gameSpeedFactor, newlySpawnedPowerUps, collectedPowerUpTypes, deltaTime );
    applyPowerUpEffects(refs, callbacks, collectedPowerUpTypes, currentTime, gameSpeedFactor);

    // --- Drawing --- 
    const currentBrickCount = countActiveBricks(refs.bricksRef.current, columns, rows);
    const totalBricks = refs.totalBricksRef.current;
    const currentGold = refs.goldRef.current;
    const currentBonusGold = refs.bonusGoldRef.current; // Get current bonus gold for display

    ctx.save();
    ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    drawBricks(ctx, refs.bricksRef.current, columns, rows);
    const allBallsToDraw = [...refs.ballsRef.current, ...refs.stuckBallsRef.current]; 
    drawBalls(ctx, allBallsToDraw);
    if (refs.collectionFieldHeightRef.current > 0 || refs.collectionFieldWidthOffsetRef.current > 0) {
        drawCollectionFieldRect(ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.collectionFieldHeightRef.current, refs.collectionFieldWidthOffsetRef.current);
    }
    drawPaddle( ctx, refs.paddleXRef.current, refs.paddleWidthRef.current, refs.laserShotsRef.current, refs.stickyPaddleChargesRef.current );
    drawPowerUps(ctx, refs.powerUpsRef.current);
    drawLasers(ctx, refs.lasersRef.current);
    // Pass bonusGold to drawGameInfo
    drawGameInfo(ctx, currentBrickCount, totalBricks, currentGold, currentBonusGold, isTestMode);
    drawSafetyNet(ctx, refs.safetyNetCountRef.current);
    if (gameSpeedFactor !== BASE_BALL_SPEED_FACTOR) { 
        ctx.font = "12px Arial"; ctx.fillStyle = POWER_UP_COLORS['SPEED_UP'] || '#e74c3c'; ctx.textAlign = 'right';
        ctx.fillText(`Speed: x${gameSpeedFactor.toFixed(2)}`, BOARD_WIDTH - 10, 20);
    }
    ctx.restore();

    // --- Check Game Status --- 
    const finalStatus = checkGameStatus(refs, callbacks, previousBallCount, columns, rows);

    if (finalStatus !== 'playing') {
        ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); 
        callbacks.drawEndMessage(ctx, finalStatus, refs.scoreRef.current);
    }
};
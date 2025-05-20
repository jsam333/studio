// src/gameCanvas.ts
import React from 'react';
import { GameStateRefs, GameLoopCallbacks, GameState } from './interfaces'; 
import {
    BOARD_WIDTH, BOARD_HEIGHT, INITIAL_PADDLE_WIDTH, LASER_WIDTH, LASER_HEIGHT, LASER_SPEED, PADDLE_Y,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE
} from './constants';
import { Laser } from './interfaces';

interface SetupGameCanvasArgs {
    gameContainerRef: React.RefObject<HTMLDivElement>; 
    canvasRef: React.RefObject<HTMLCanvasElement>;
    gameLoop: (timestamp: number) => void; 
    scaleRef: React.MutableRefObject<number>; 
    animationFrameIdRef: React.MutableRefObject<number | null>;
    handleResetGame: () => void;
    gameStateRefs: GameStateRefs; // Assumes GameStateRefs now includes laserIntervalRef: React.MutableRefObject<number | null>;
    gameLoopCallbacks: GameLoopCallbacks;
    lastTimeRef: React.MutableRefObject<number>; 
    totalSidebarSpace: number; 
    sidebarWidthPx: number; 
    launchStuckBalls: (isInitialLaunch?: boolean) => void; 
    isMobile: boolean;
    showSidebarState: boolean; 
}

export const setupGameCanvas = ({
    gameContainerRef, 
    canvasRef,
    gameLoop, 
    scaleRef, 
    animationFrameIdRef,
    handleResetGame,
    gameStateRefs, 
    gameLoopCallbacks,
    lastTimeRef, 
    sidebarWidthPx,
    launchStuckBalls, 
    isMobile,
    showSidebarState 
}: SetupGameCanvasArgs) => {
    const canvas = canvasRef.current;
    const gameContainer = gameContainerRef.current; 
    if (!canvas || !gameContainer) {
        return () => {};
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return () => {};
    }
    const sidebarElement = gameContainer.querySelector<HTMLDivElement>('[data-role="powerup-sidebar"]');

    const handleResize = () => {
        const isTestModePreview = gameStateRefs.gameModeRef.current === 'test' && gameStateRefs.gameOverStateRef.current === 'menu';

        if (isTestModePreview) {
            scaleRef.current = 1;
            const fixedSidebarWidth = showSidebarState ? sidebarWidthPx : 0;

            gameContainer.style.width = `${BOARD_WIDTH + fixedSidebarWidth}px`;
            gameContainer.style.height = `${BOARD_HEIGHT}px`;

            canvas.width = BOARD_WIDTH;
            canvas.height = BOARD_HEIGHT;
            canvas.style.width = `${BOARD_WIDTH}px`;
            canvas.style.height = `${BOARD_HEIGHT}px`;

            ctx.setTransform(1, 0, 0, 1, 0, 0);

            if (sidebarElement) {
                if (showSidebarState) {
                    sidebarElement.style.width = `${fixedSidebarWidth}px`;
                    sidebarElement.style.height = `${BOARD_HEIGHT}px`;
                } else {
                    sidebarElement.style.width = `0px`;
                    sidebarElement.style.height = `0px`;
                }
            }
        } else {
            const padding = 32; 
            const availableWidth = window.innerWidth - padding;
            const availableHeight = window.innerHeight - padding;
            const currentSidebarWidth = showSidebarState ? sidebarWidthPx : 0;
            const scale = Math.min(
                availableWidth / (BOARD_WIDTH + currentSidebarWidth),
                availableHeight / BOARD_HEIGHT
            );
            scaleRef.current = scale;
            const scaledCanvasWidth = BOARD_WIDTH * scale;
            const scaledCanvasHeight = BOARD_HEIGHT * scale;
            const scaledSidebarWidth = currentSidebarWidth * scale;
            gameContainer.style.width = `${scaledCanvasWidth + scaledSidebarWidth}px`;
            gameContainer.style.height = `${scaledCanvasHeight}px`;
            canvas.width = scaledCanvasWidth;
            canvas.height = scaledCanvasHeight;
            canvas.style.width = `${scaledCanvasWidth}px`;
            canvas.style.height = `${scaledCanvasHeight}px`;
            ctx.setTransform(1, 0, 0, 1, 0, 0); 
            ctx.scale(scale, scale); 
            if (sidebarElement) {
                if (showSidebarState) {
                    sidebarElement.style.width = `${scaledSidebarWidth}px`;
                    sidebarElement.style.height = `${scaledCanvasHeight}px`;
                } else {
                     sidebarElement.style.width = `0px`;
                     sidebarElement.style.height = `0px`;
                }
            }
        }
        
        const currentGameState = gameStateRefs.gameOverStateRef.current;
        if (currentGameState === 'won' || currentGameState === 'lost') {
             ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); 
             if (gameLoopCallbacks?.drawEndMessage) {
                 gameLoopCallbacks.drawEndMessage(ctx, currentGameState, gameStateRefs.scoreRef.current);
             }
        }
    };

    const updatePaddlePosition = (clientX: number) => {
        const isTestModePreview = gameStateRefs.gameModeRef.current === 'test' && gameStateRefs.gameOverStateRef.current === 'menu';
        if (!canvas || (gameStateRefs.gameOverStateRef.current !== 'playing' && !isTestModePreview)) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const currentScale = scaleRef.current; 
        const logicalMouseX = (clientX - rect.left) / currentScale; 
        let newPaddleX = logicalMouseX - gameStateRefs.paddleWidthRef.current / 2;
        newPaddleX = Math.max(0, newPaddleX);
        newPaddleX = Math.min(BOARD_WIDTH - gameStateRefs.paddleWidthRef.current, newPaddleX);
        gameStateRefs.paddleXRef.current = newPaddleX;
    };

    const handleMouseMove = (event: MouseEvent) => {
        updatePaddlePosition(event.clientX);
    };

    const fireLaser = () => {
        if (gameStateRefs.laserShotsRef.current > 0) {
            gameStateRefs.laserShotsRef.current--;
            const newLaser: Laser = { 
                x: gameStateRefs.paddleXRef.current + gameStateRefs.paddleWidthRef.current / 2 - LASER_WIDTH / 2,
                y: PADDLE_Y - LASER_HEIGHT, 
                width: LASER_WIDTH, height: LASER_HEIGHT, speed: LASER_SPEED, id: Date.now()
            }; 
            gameStateRefs.lasersRef.current.push(newLaser);
            return true;
        }
        return false;
    };

    const startContinuousFire = () => {
        if (gameStateRefs.stuckBallsRef.current.length === 0 && (gameStateRefs.gameOverStateRef.current === 'playing' || (gameStateRefs.gameModeRef.current === 'test' && gameStateRefs.gameOverStateRef.current === 'menu'))) {
            if (fireLaser()) { // Fire once immediately
                if (gameStateRefs.laserIntervalRef.current) clearInterval(gameStateRefs.laserIntervalRef.current);
                gameStateRefs.laserIntervalRef.current = window.setInterval(() => {
                    if (!fireLaser()) { // If run out of shots or can't fire
                        if (gameStateRefs.laserIntervalRef.current) clearInterval(gameStateRefs.laserIntervalRef.current);
                        gameStateRefs.laserIntervalRef.current = null;
                    }
                }, 150); // Changed from 200 to 150
            }
        }
    };

    const stopContinuousFire = () => {
        if (gameStateRefs.laserIntervalRef.current) {
            clearInterval(gameStateRefs.laserIntervalRef.current);
            gameStateRefs.laserIntervalRef.current = null;
        }
    };

    const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return; // Only left click
        const currentState = gameStateRefs.gameOverStateRef.current;
        const isTestModePreview = gameStateRefs.gameModeRef.current === 'test' && currentState === 'menu';

        if (currentState === 'won' || currentState === 'lost') {
            handleResetGame();
        } else if (currentState === 'playing' || isTestModePreview) {
            if (!canvas) return;

            if (isTestModePreview) {
                if (gameStateRefs.stuckBallsRef.current.length > 0) {
                    launchStuckBalls(true);
                } else {
                    startContinuousFire();
                }
            } else { // Main game logic (currentState === 'playing' && !isTestModePreview)
                if (!gameStateRefs.isGameStartedRef.current) {
                    launchStuckBalls(true); // Initial launch for main game
                } else {
                    if (gameStateRefs.stuckBallsRef.current.length > 0) {
                        launchStuckBalls(false); // Subsequent stuck ball launches for main game
                    } else {
                        startContinuousFire();
                    }
                }
            }
        }
    };

    const handleMouseUp = (event: MouseEvent) => {
        if (event.button !== 0) return; // Only left click
        stopContinuousFire();
    };

    const handleTouchStart = (event: TouchEvent) => {
        event.preventDefault();
        const currentState = gameStateRefs.gameOverStateRef.current;
        const isTestModePreview = gameStateRefs.gameModeRef.current === 'test' && currentState === 'menu';

        if (currentState === 'won' || currentState === 'lost') {
            handleResetGame();
        } else if ((currentState === 'playing' || isTestModePreview) && event.touches.length > 0) {
            const touchX = event.touches[0].clientX;
            updatePaddlePosition(touchX);

            if (isTestModePreview) {
                if (gameStateRefs.stuckBallsRef.current.length > 0) {
                    launchStuckBalls(true);
                } else {
                    startContinuousFire();
                }
            } else { // Main game logic
                if (!gameStateRefs.isGameStartedRef.current) {
                    launchStuckBalls(true);
                } else {
                    if (isMobile && gameStateRefs.stuckBallsRef.current.length > 0) {
                        launchStuckBalls(false); 
                    } else if (gameStateRefs.stuckBallsRef.current.length > 0) {
                        launchStuckBalls(false);
                    } else {
                        startContinuousFire();
                    }
                }
            }
        }
    };

    const handleTouchEnd = (event: TouchEvent) => {
        event.preventDefault();
        stopContinuousFire();
    };

    const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault(); 
        const isTestModePreview = gameStateRefs.gameModeRef.current === 'test' && gameStateRefs.gameOverStateRef.current === 'menu';
        if ((gameStateRefs.gameOverStateRef.current === 'playing' || isTestModePreview) && event.touches.length > 0) {
            updatePaddlePosition(event.touches[0].clientX);
        }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing') {
            console.log("Debug: 'C' key pressed, clearing bricks..."); 
            const bricks = gameStateRefs.bricksRef.current;
            let bricksCleared = 0;
            for (let c = 0; c < bricks.length; c++) {
                if (bricks[c]) {
                    for (let r = 0; r < bricks[c].length; r++) {
                        if (bricks[c][r] && bricks[c][r].status === 1) {
                            bricks[c][r].status = 0;
                            bricksCleared++;
                        }
                    }
                }
            }
            console.log(`Debug: Cleared ${bricksCleared} bricks.`); 
        }
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove); 
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp); // Listen on window for mouseup
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); 
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });  
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd); // Good practice to also clear on touchcancel
    window.addEventListener('keydown', handleKeyDown); 

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        if (canvas) { 
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('touchend', handleTouchEnd);
            canvas.removeEventListener('touchcancel', handleTouchEnd);
        }
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleKeyDown); 

        if (gameStateRefs.laserIntervalRef.current) { // Clear interval on cleanup
            clearInterval(gameStateRefs.laserIntervalRef.current);
            gameStateRefs.laserIntervalRef.current = null;
        }
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (gameContainer) { 
             gameContainer.style.width = '';
             gameContainer.style.height = '';
        }
        if (canvas) {
            canvas.style.width = '';
            canvas.style.height = '';
        }
         if (sidebarElement) {
            sidebarElement.style.width = '';
            sidebarElement.style.height = '';
        }
    };
};
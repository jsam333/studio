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
    gameStateRefs: GameStateRefs;
    gameLoopCallbacks: GameLoopCallbacks;
    lastTimeRef: React.MutableRefObject<number>; 
    totalSidebarSpace: number; 
    sidebarWidthPx: number; 
    launchStuckBalls: (isInitialLaunch?: boolean) => void; 
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
    totalSidebarSpace, 
    sidebarWidthPx,
    launchStuckBalls 
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

    // --- Resize Handler ---
    const handleResize = () => {
        const padding = 32; 
        const availableWidth = window.innerWidth - padding;
        const availableHeight = window.innerHeight - padding;

        const scale = Math.min(
            availableWidth / (BOARD_WIDTH + sidebarWidthPx),
            availableHeight / BOARD_HEIGHT
        );

        scaleRef.current = scale;

        const scaledCanvasWidth = BOARD_WIDTH * scale;
        const scaledCanvasHeight = BOARD_HEIGHT * scale;
        const scaledSidebarWidth = sidebarWidthPx * scale;

        gameContainer.style.width = `${scaledCanvasWidth + scaledSidebarWidth}px`;
        gameContainer.style.height = `${scaledCanvasHeight}px`;

        // Set the actual canvas drawing buffer size for sharpness
        canvas.width = scaledCanvasWidth;
        canvas.height = scaledCanvasHeight;

        // Set the display size of the canvas element (optional, but good practice)
        canvas.style.width = `${scaledCanvasWidth}px`;
        canvas.style.height = `${scaledCanvasHeight}px`;
        
        // Reset transform and apply scale for drawing operations
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.scale(scale, scale); 

        if (sidebarElement) {
            sidebarElement.style.width = `${scaledSidebarWidth}px`;
            sidebarElement.style.height = `${scaledCanvasHeight}px`;
        }
        
        const currentState = gameStateRefs.gameOverStateRef.current;
        if (currentState === 'won' || currentState === 'lost') {
             // Clear with scaled dimensions, but drawing uses logical coordinates due to ctx.scale
             ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); 
             if (gameLoopCallbacks?.drawEndMessage) {
                 gameLoopCallbacks.drawEndMessage(ctx, currentState, gameStateRefs.scoreRef.current);
             }
        }
    };

    // --- Paddle Position Update Logic ---
    const updatePaddlePosition = (clientX: number) => {
        if (gameStateRefs.gameOverStateRef.current !== 'playing' || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        // clientX is relative to the viewport. rect.left is the canvas's left edge relative to the viewport.
        // (clientX - rect.left) gives the click position relative to the canvas's display area.
        // Dividing by currentScale converts the display coordinate back to the logical coordinate system (0 to BOARD_WIDTH).
        const currentScale = scaleRef.current; 
        const logicalMouseX = (clientX - rect.left) / currentScale; 
        let newPaddleX = logicalMouseX - gameStateRefs.paddleWidthRef.current / 2;
        newPaddleX = Math.max(0, newPaddleX);
        newPaddleX = Math.min(BOARD_WIDTH - gameStateRefs.paddleWidthRef.current, newPaddleX);
        gameStateRefs.paddleXRef.current = newPaddleX;
    };

    // --- Mouse Move Handler ---
    const handleMouseMove = (event: MouseEvent) => {
        updatePaddlePosition(event.clientX);
    };

    // --- Touch Handlers ---
    const handleTouchStart = (event: TouchEvent) => {
        event.preventDefault();
        const currentState = gameStateRefs.gameOverStateRef.current;
        if (currentState === 'won' || currentState === 'lost') {
            handleResetGame();
        } else if (currentState === 'playing') {
            if (event.touches.length > 0) {
                if (!gameStateRefs.isGameStartedRef.current) {
                    launchStuckBalls(true); 
                } else {
                    updatePaddlePosition(event.touches[0].clientX); 
                    if (gameStateRefs.laserShotsRef.current > 0) {
                         gameStateRefs.laserShotsRef.current--;
                         const newLaser: Laser = { 
                            x: gameStateRefs.paddleXRef.current + gameStateRefs.paddleWidthRef.current / 2 - LASER_WIDTH / 2,
                            y: PADDLE_Y - LASER_HEIGHT, 
                            width: LASER_WIDTH, height: LASER_HEIGHT, speed: LASER_SPEED, id: Date.now()
                         }; 
                         gameStateRefs.lasersRef.current.push(newLaser);
                    }
                }
            }
        }
    };

    const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault(); 
        if (gameStateRefs.gameOverStateRef.current === 'playing' && event.touches.length > 0) {
            updatePaddlePosition(event.touches[0].clientX);
        }
    };

     // --- Click Handler ---
    const handleClick = (event: MouseEvent) => {
         if (event.button !== 0) return;
         const currentState = gameStateRefs.gameOverStateRef.current;
         if (currentState === 'won' || currentState === 'lost') {
            handleResetGame();
         } else if (currentState === 'playing') {
             if (!canvas) return; 
             const rect = canvas.getBoundingClientRect(); 
             const clickX = event.clientX;
             const clickY = event.clientY;
             if (clickX >= rect.left && clickX <= rect.right && clickY >= rect.top && clickY <= rect.bottom) {
                if (!gameStateRefs.isGameStartedRef.current) {
                    launchStuckBalls(true); 
                } else {
                    if (gameStateRefs.laserShotsRef.current > 0) {
                        gameStateRefs.laserShotsRef.current--;
                        const newLaser: Laser = { 
                            x: gameStateRefs.paddleXRef.current + gameStateRefs.paddleWidthRef.current / 2 - LASER_WIDTH / 2,
                            y: PADDLE_Y - LASER_HEIGHT, 
                            width: LASER_WIDTH, height: LASER_HEIGHT, speed: LASER_SPEED, id: Date.now()
                         }; 
                        gameStateRefs.lasersRef.current.push(newLaser);
                    }
                 }
             } 
         }
    };

    // --- Keyboard Handler (NEW) ---
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'c' && gameStateRefs.gameOverStateRef.current === 'playing') {
            // Corrected quotes in console.log
            console.log("Debug: 'C' key pressed, clearing bricks..."); // Debug log
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
            console.log(`Debug: Cleared ${bricksCleared} bricks.`); // Debug log
        }
    };

    // --- Setup Event Listeners ---
    handleResize(); 
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove); 
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); 
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });  
    canvas.addEventListener('click', handleClick); 
    window.addEventListener('keydown', handleKeyDown); // Add keyboard listener

    // --- Cleanup Function ---
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        if (canvas) { 
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('click', handleClick);
        }
        window.removeEventListener('keydown', handleKeyDown); // Remove keyboard listener
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (gameContainer) { 
             gameContainer.style.width = '';
             gameContainer.style.height = '';
        }
        if (canvas) {
            // Reset canvas size on cleanup if needed, though often not necessary
            // canvas.width = BOARD_WIDTH; 
            // canvas.height = BOARD_HEIGHT;
            canvas.style.width = '';
            canvas.style.height = '';
        }
         if (sidebarElement) {
            sidebarElement.style.width = '';
            sidebarElement.style.height = '';
        }
    };
};

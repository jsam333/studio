// src/gameCanvas.ts
import React from 'react';
import { GameStateRefs, GameLoopCallbacks, GameState } from './interfaces'; // Import GameState
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

        canvas.style.width = `${scaledCanvasWidth}px`;
        canvas.style.height = `${scaledCanvasHeight}px`;
        canvas.width = BOARD_WIDTH;
        canvas.height = BOARD_HEIGHT;
        ctx.setTransform(1, 0, 0, 1, 0, 0); 

        if (sidebarElement) {
            sidebarElement.style.width = `${scaledSidebarWidth}px`;
            sidebarElement.style.height = `${scaledCanvasHeight}px`;
        }
        
        // Redraw end message if game is over
        const currentState = gameStateRefs.gameOverStateRef.current;
        if (currentState === 'won' || currentState === 'lost') {
             ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT); 
             // Ensure drawEndMessage exists in callbacks before calling
             if (gameLoopCallbacks?.drawEndMessage) {
                 gameLoopCallbacks.drawEndMessage(ctx, currentState, gameStateRefs.scoreRef.current);
             }
        }
        // Initial state drawing is handled by the game loop
    };

    // --- Paddle Position Update Logic (Shared) ---
    const updatePaddlePosition = (clientX: number) => {
        // Only update if playing
        if (gameStateRefs.gameOverStateRef.current !== 'playing' || !canvas) return;
        const rect = canvas.getBoundingClientRect();
        const currentScale = scaleRef.current; 
        
        const logicalMouseX = (clientX - rect.left) / currentScale; 

        let newPaddleX = logicalMouseX - gameStateRefs.paddleWidthRef.current / 2;
        newPaddleX = Math.max(0, newPaddleX);
        newPaddleX = Math.min(BOARD_WIDTH - gameStateRefs.paddleWidthRef.current, newPaddleX);
        gameStateRefs.paddleXRef.current = newPaddleX;
        
        // If game not started, the stuck ball position is updated in gameUpdate
    };

    // --- Mouse Move Handler ---
    const handleMouseMove = (event: MouseEvent) => {
        // Check state inside updatePaddlePosition
        updatePaddlePosition(event.clientX);
    };

    // --- Touch Handlers ---
    const handleTouchStart = (event: TouchEvent) => {
        event.preventDefault();
        const currentState = gameStateRefs.gameOverStateRef.current;

        if (currentState === 'won' || currentState === 'lost') {
            handleResetGame(); // Reset if game over
        } else if (currentState === 'playing') { // Only handle game actions if playing
            if (event.touches.length > 0) {
                if (!gameStateRefs.isGameStartedRef.current) {
                    launchStuckBalls(true); // Initial launch only if playing and not started
                } else {
                    updatePaddlePosition(event.touches[0].clientX); // Move paddle
                    // Fire laser only if playing and started
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
        // Do nothing if state is 'menu'
    };

    const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault(); 
        // Only update if playing
        if (gameStateRefs.gameOverStateRef.current === 'playing' && event.touches.length > 0) {
            updatePaddlePosition(event.touches[0].clientX);
        }
    };

     // --- Click Handler (Initial Launch / Laser Fire / Reset) ---
    const handleClick = (event: MouseEvent) => {
         if (event.button !== 0) return; // Only main click

         const currentState = gameStateRefs.gameOverStateRef.current;

         if (currentState === 'won' || currentState === 'lost') {
            handleResetGame(); // Reset if game over
         } else if (currentState === 'playing') { // Only handle game actions if playing
             if (!canvas) return; 
             const rect = canvas.getBoundingClientRect(); 
             const clickX = event.clientX;
             const clickY = event.clientY;
             
             // Check if click is within the canvas bounds
             if (clickX >= rect.left && clickX <= rect.right && clickY >= rect.top && clickY <= rect.bottom) {
                if (!gameStateRefs.isGameStartedRef.current) {
                    launchStuckBalls(true); // Initial launch only if playing and not started
                } else {
                    // Fire laser only if playing and started
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
         // Do nothing if state is 'menu'
    };

    // --- Setup Event Listeners ---
    handleResize(); // Initial setup
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove); 
    // Attach touch/click listeners to the canvas itself might be slightly better 
    // than window for click, especially to check bounds easily.
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); 
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });  
    canvas.addEventListener('click', handleClick); // Changed from window to canvas

    // Start game loop is now handled by the main component based on state changes

    // --- Cleanup Function ---
    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        if (canvas) { 
            canvas.removeEventListener('touchstart', handleTouchStart);
            canvas.removeEventListener('touchmove', handleTouchMove);
            canvas.removeEventListener('click', handleClick); // Remove listener from canvas
        }
        // window.removeEventListener('click', handleClick); // Remove if it was on window before
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
        if (gameContainer) { /* Reset styles */ 
             gameContainer.style.width = '';
             gameContainer.style.height = '';
        }
        if (canvas) { /* Reset styles */
            canvas.style.width = '';
            canvas.style.height = '';
        }
         if (sidebarElement) { /* Reset styles */
            sidebarElement.style.width = '';
            sidebarElement.style.height = '';
        }
    };
};
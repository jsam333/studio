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

    let isDraggingToPaint = false;
    let lastPaintedBrickKey: string | null = null;

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
        const { 
            isPaintModeActiveRef, 
            isUpgradePaintModeActiveRef,
            isReinforcePaintModeActiveRef,
            isBombPaintModeActiveRef,
            isBallBrickPaintModeActiveRef,
            bricksRef, 
            brickColumnsRef, 
            brickRowsRef,
            gameModeRef
        } = gameStateRefs;

        if (gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || isUpgradePaintModeActiveRef?.current || isReinforcePaintModeActiveRef?.current || isBombPaintModeActiveRef?.current || isBallBrickPaintModeActiveRef?.current) &&
            isDraggingToPaint) {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const moveX = (event.clientX - rect.left) / scale;
            const moveY = (event.clientY - rect.top) / scale;

            const bricks = bricksRef.current;
            for (let c = 0; c < (brickColumnsRef?.current ?? 0); c++) {
                for (let r = 0; r < (brickRowsRef?.current ?? 0); r++) {
                    const brick = bricks[c]?.[r];
                    const currentBrickKey = `${c}-${r}`;
                    if (brick && brick.status === 1 && lastPaintedBrickKey !== currentBrickKey &&
                        moveX > brick.x && moveX < brick.x + brick.width &&
                        moveY > brick.y && moveY < brick.y + brick.height) {
                        
                        console.log(`Paint Action (MouseMove) on brick [${c},${r}]: Initial Strength: ${brick.strength}, IsSpecial: ${brick.isSpecial}, IsBomb: ${brick.isBomb}, HoldsBall: ${brick.holdsBall}`);
                        console.log(`Paint Mode Refs (MouseMove): MakeSpecial: ${isPaintModeActiveRef?.current}, Upgrade: ${isUpgradePaintModeActiveRef?.current}, Reinforce: ${isReinforcePaintModeActiveRef?.current}, Bomb: ${isBombPaintModeActiveRef?.current}, BallBrick: ${isBallBrickPaintModeActiveRef?.current}`);
                        
                        let paintedThisBrick = false;
                        if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                            if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                                brick.isSpecial = true;
                                brick.strength = 1;
                                brick.upgradeLevel = 0;
                                brick.isBomb = false;
                                brick.holdsBall = false;
                                brick.isSpecialFlashActive = true;
                                brick.specialFlashStartTime = Date.now();
                                console.log(`Brick at [${c},${r}] made SPECIAL by paint mode (mousemove).`);
                                paintedThisBrick = true;
                            } else if (isUpgradePaintModeActiveRef?.current) {
                                console.log(`MouseMove: Checking Upgrade. Brick strength: ${brick.strength}`);
                                if (brick.strength < 4 && !brick.isBomb) {
                                    brick.strength = 4;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 3;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] UPGRADED to L4 (UL3 Visual) by paint mode (mousemove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`MouseMove: Brick [${c},${r}] not upgraded, strength already ${brick.strength} (>=4) or is bomb.`);
                                }
                            } else if (isReinforcePaintModeActiveRef?.current) {
                                console.log(`MouseMove: Checking Reinforce. Brick strength: ${brick.strength}`);
                                if (brick.strength < 3 && !brick.isBomb) {
                                    brick.strength = 3;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 2;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] REINFORCED to L3 (UL2 Visual) by paint mode (mousemove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`MouseMove: Brick [${c},${r}] not reinforced, strength already ${brick.strength} (>=3) or is bomb.`);
                                }
                            } else if (isBombPaintModeActiveRef?.current) {
                                if (!brick.isBomb) {
                                    brick.isBomb = true;
                                    brick.isSpecial = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    brick.holdsBall = false;
                                    console.log(`Brick at [${c},${r}] made BOMB by paint mode (mousemove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`MouseMove: Brick [${c},${r}] is already a bomb.`);
                                }
                            } else if (isBallBrickPaintModeActiveRef?.current) {
                                if (!brick.holdsBall && !brick.isBomb) {
                                    brick.holdsBall = true;
                                    brick.isSpecial = false;
                                    brick.isBomb = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    console.log(`Brick at [${c},${r}] made BALL_BRICK by paint mode (mousemove).`);
                                    paintedThisBrick = true;
                                } else {
                                     console.log(`MouseMove: Brick [${c},${r}] already holds ball or is bomb.`);
                                }
                            } else {
                                console.log(`MouseMove: Brick [${c},${r}] - No paint condition met or brick already in target state for active mode.`);
                            }

                            if (paintedThisBrick) {
                                lastPaintedBrickKey = currentBrickKey;
                            }
                        } else {
                            console.log(`MouseMove: Brick [${c},${r}] is a bomb and no bomb-modifying paint mode is active.`);
                        }
                        break; 
                    }
                }
            } 
        }
        updatePaddlePosition(event.clientX);
    };

    const fireLaser = () => {
        if (gameStateRefs.laserShotsRef.current > 0) {
            gameStateRefs.laserShotsRef.current--;
            const newLaser: Laser = {
                x: gameStateRefs.paddleXRef.current + gameStateRefs.paddleWidthRef.current / 2 - LASER_WIDTH / 2,
                y: PADDLE_Y - LASER_HEIGHT,
                width: LASER_WIDTH,
                height: LASER_HEIGHT,
                speed: LASER_SPEED,
                id: Date.now() + Math.random(), // Ensure unique ID
            }; 
            gameStateRefs.lasersRef.current.push(newLaser);
            gameStateRefs.soundSystemRef.current?.playLaserFireSound(); // Play laser fire sound
            return true;
        }
        return false;
    };

    const startContinuousFire = (launchedStuckBallOnInitialPress: boolean) => {
        // Condition to start continuous fire: game must be in a state where firing is allowed.
        if (!(gameStateRefs.gameOverStateRef.current === 'playing' || (gameStateRefs.gameModeRef.current === 'test' && gameStateRefs.gameOverStateRef.current === 'menu'))) {
            return;
        }

        if (gameStateRefs.laserIntervalRef.current) {
            clearInterval(gameStateRefs.laserIntervalRef.current);
            gameStateRefs.laserIntervalRef.current = null;
        }

        // If a stuck ball was NOT launched on the initial press, try to fire one laser immediately.
        if (!launchedStuckBallOnInitialPress) {
            fireLaser(); // Attempt to fire one laser immediately
        }

        // Setup the interval for continuous firing.
        // The interval will attempt to fire a laser every 150ms.
        // If fireLaser() returns false (e.g., out of shots), the interval clears itself.
        gameStateRefs.laserIntervalRef.current = window.setInterval(() => {
            if (!fireLaser()) {
                if (gameStateRefs.laserIntervalRef.current) {
                    clearInterval(gameStateRefs.laserIntervalRef.current);
                    gameStateRefs.laserIntervalRef.current = null;
                }
            }
        }, 150);
    };

    const stopContinuousFire = () => {
        if (gameStateRefs.laserIntervalRef.current) {
            clearInterval(gameStateRefs.laserIntervalRef.current);
            gameStateRefs.laserIntervalRef.current = null;
        }
    };

    const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return; 

        const { 
            isPaintModeActiveRef, 
            isUpgradePaintModeActiveRef,
            isReinforcePaintModeActiveRef,
            isBombPaintModeActiveRef,
            isBallBrickPaintModeActiveRef,
            bricksRef, 
            brickColumnsRef, 
            brickRowsRef,
            gameModeRef,
            gameOverStateRef,
            stuckBallsRef,
            isGameStartedRef,
            paddleXRef,
            paddleWidthRef,
            lasersRef,
            laserShotsRef
        } = gameStateRefs;

        if (gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || isUpgradePaintModeActiveRef?.current || isReinforcePaintModeActiveRef?.current || isBombPaintModeActiveRef?.current || isBallBrickPaintModeActiveRef?.current)) {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const clickX = (event.clientX - rect.left) / scale;
            const clickY = (event.clientY - rect.top) / scale;

            const bricks = bricksRef.current;
            for (let c = 0; c < (brickColumnsRef?.current ?? 0); c++) {
                for (let r = 0; r < (brickRowsRef?.current ?? 0); r++) {
                    const brick = bricks[c]?.[r];
                    if (brick && brick.status === 1 && 
                        clickX > brick.x && clickX < brick.x + brick.width &&
                        clickY > brick.y && clickY < brick.y + brick.height) {
                        
                        console.log(`Paint Action (Mousedown) on brick [${c},${r}]: Initial Strength: ${brick.strength}, IsSpecial: ${brick.isSpecial}, IsBomb: ${brick.isBomb}, HoldsBall: ${brick.holdsBall}`);
                        console.log(`Paint Mode Refs (Mousedown): MakeSpecial: ${isPaintModeActiveRef?.current}, Upgrade: ${isUpgradePaintModeActiveRef?.current}, Reinforce: ${isReinforcePaintModeActiveRef?.current}, Bomb: ${isBombPaintModeActiveRef?.current}, BallBrick: ${isBallBrickPaintModeActiveRef?.current}`);

                        if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                            if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                                brick.isSpecial = true;
                                brick.strength = 1;
                                brick.upgradeLevel = 0;
                                brick.isBomb = false;
                                brick.holdsBall = false;
                                brick.isSpecialFlashActive = true;
                                brick.specialFlashStartTime = Date.now();
                                console.log(`Brick at [${c},${r}] made SPECIAL by paint mode (mousedown).`);
                            } else if (isUpgradePaintModeActiveRef?.current) {
                                console.log(`Mousedown: Checking Upgrade. Brick strength: ${brick.strength}`);
                                if (brick.strength < 4 && !brick.isBomb) {
                                    brick.strength = 4;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 3;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] UPGRADED to L4 (UL3 Visual) by paint mode (mousedown).`);
                                } else {
                                    console.log(`Mousedown: Brick [${c},${r}] not upgraded, strength already ${brick.strength} (>=4) or is bomb.`);
                                }
                            } else if (isReinforcePaintModeActiveRef?.current) {
                                console.log(`Mousedown: Checking Reinforce. Brick strength: ${brick.strength}`);
                                if (brick.strength < 3 && !brick.isBomb) {
                                    brick.strength = 3;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 2;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] REINFORCED to L3 (UL2 Visual) by paint mode (mousedown).`);
                                } else {
                                    console.log(`Mousedown: Brick [${c},${r}] not reinforced, strength already ${brick.strength} (>=3) or is bomb.`);
                                }
                            } else if (isBombPaintModeActiveRef?.current) {
                                 if (!brick.isBomb) {
                                    brick.isBomb = true;
                                    brick.isSpecial = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    brick.holdsBall = false;
                                    console.log(`Brick at [${c},${r}] made BOMB by paint mode (mousedown).`);
                                } else {
                                    console.log(`Mousedown: Brick [${c},${r}] is already a bomb.`);
                                }
                            } else if (isBallBrickPaintModeActiveRef?.current) {
                                if (!brick.holdsBall && !brick.isBomb) {
                                    brick.holdsBall = true;
                                    brick.isSpecial = false;
                                    brick.isBomb = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    console.log(`Brick at [${c},${r}] made BALL_BRICK by paint mode (mousedown).`);
                                } else {
                                     console.log(`Mousedown: Brick [${c},${r}] already holds ball or is bomb.`);
                                }
                            } else {
                                console.log(`Mousedown: Brick [${c},${r}] - No paint condition met.`);
                                isDraggingToPaint = false; 
                                return;
                            }
                            lastPaintedBrickKey = `${c}-${r}`;
                            isDraggingToPaint = true; 
                        } else {
                             console.log(`Mousedown: Brick [${c},${r}] is a bomb and no bomb-modifying paint mode is active. Dragging disabled.`);
                            isDraggingToPaint = false;
                        }
                        return; 
                    }
                }
            }
            isDraggingToPaint = false; // If no brick was hit, ensure dragging is off
            return; 
        }

        const currentState = gameOverStateRef.current;
        const isTestModePreview = gameModeRef.current === 'test' && currentState === 'menu';
        let launchedStuckBallsThisPress = false;

        if (currentState === 'won' || currentState === 'lost') {
            handleResetGame();
        } else if (currentState === 'playing' || isTestModePreview) {
            if (!canvas) return;

            if (isTestModePreview) {
                if (stuckBallsRef.current.length > 0) {
                    launchStuckBalls(true);
                    launchedStuckBallsThisPress = true;
                }
                // Always start continuous fire in test mode preview if not launching initial game balls
                startContinuousFire(launchedStuckBallsThisPress);
            } else { // Main game logic (currentState === 'playing' && !isTestModePreview)
                if (!isGameStartedRef.current) {
                    launchStuckBalls(true); // Initial launch for main game, don't start continuous fire yet
                } else {
                    if (stuckBallsRef.current.length > 0) {
                        launchStuckBalls(false); // Subsequent stuck ball launches
                        launchedStuckBallsThisPress = true;
                    }
                    startContinuousFire(launchedStuckBallsThisPress); // Start continuous fire after handling stuck balls or if none were stuck
                }
            }
        }
    };

    const handleMouseUp = (event: MouseEvent) => {
        if (event.button !== 0) return; // Only left click
        stopContinuousFire();
        isDraggingToPaint = false;
        lastPaintedBrickKey = null;
    };

    const handleTouchStart = (event: TouchEvent) => {
        event.preventDefault();

        const { 
            isPaintModeActiveRef, 
            isUpgradePaintModeActiveRef,
            isReinforcePaintModeActiveRef,
            isBombPaintModeActiveRef,
            isBallBrickPaintModeActiveRef,
            bricksRef, 
            brickColumnsRef, 
            brickRowsRef,
            gameModeRef,
            gameOverStateRef,
            stuckBallsRef,
            isGameStartedRef,
            paddleXRef,
            paddleWidthRef,
            lasersRef,
            laserShotsRef
        } = gameStateRefs;

        if (gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || isUpgradePaintModeActiveRef?.current || isReinforcePaintModeActiveRef?.current || isBombPaintModeActiveRef?.current || isBallBrickPaintModeActiveRef?.current) &&
            event.touches.length > 0) {
            if (!canvas) return;
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const clickX = (touch.clientX - rect.left) / scale;
            const clickY = (touch.clientY - rect.top) / scale;

            const bricks = bricksRef.current;
            for (let c = 0; c < (brickColumnsRef?.current ?? 0); c++) {
                for (let r = 0; r < (brickRowsRef?.current ?? 0); r++) {
                    const brick = bricks[c]?.[r];
                    if (brick && brick.status === 1 && 
                        clickX > brick.x && clickX < brick.x + brick.width &&
                        clickY > brick.y && clickY < brick.y + brick.height) {
                        
                        console.log(`Paint Action (TouchStart) on brick [${c},${r}]: Initial Strength: ${brick.strength}, IsSpecial: ${brick.isSpecial}, IsBomb: ${brick.isBomb}, HoldsBall: ${brick.holdsBall}`);
                        console.log(`Paint Mode Refs (TouchStart): MakeSpecial: ${isPaintModeActiveRef?.current}, Upgrade: ${isUpgradePaintModeActiveRef?.current}, Reinforce: ${isReinforcePaintModeActiveRef?.current}, Bomb: ${isBombPaintModeActiveRef?.current}, BallBrick: ${isBallBrickPaintModeActiveRef?.current}`);

                        if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                            if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                                brick.isSpecial = true;
                                brick.strength = 1;
                                brick.upgradeLevel = 0;
                                brick.isBomb = false;
                                brick.holdsBall = false;
                                brick.isSpecialFlashActive = true;
                                brick.specialFlashStartTime = Date.now();
                                console.log(`Brick at [${c},${r}] made SPECIAL by paint mode (touchstart).`);
                            } else if (isUpgradePaintModeActiveRef?.current) {
                                console.log(`TouchStart: Checking Upgrade. Brick strength: ${brick.strength}`);
                                if (brick.strength < 4 && !brick.isBomb) {
                                    brick.strength = 4;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 3;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] UPGRADED to L4 (UL3 Visual) by paint mode (touchstart).`);
                                } else {
                                    console.log(`TouchStart: Brick [${c},${r}] not upgraded, strength already ${brick.strength} (>=4) or is bomb.`);
                                }
                            } else if (isReinforcePaintModeActiveRef?.current) {
                                console.log(`TouchStart: Checking Reinforce. Brick strength: ${brick.strength}`);
                                if (brick.strength < 3 && !brick.isBomb) {
                                    brick.strength = 3;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 2;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] REINFORCED to L3 (UL2 Visual) by paint mode (touchstart).`);
                                } else {
                                    console.log(`TouchStart: Brick [${c},${r}] not reinforced, strength already ${brick.strength} (>=3) or is bomb.`);
                                }
                            } else if (isBombPaintModeActiveRef?.current) {
                                if (!brick.isBomb) {
                                    brick.isBomb = true;
                                    brick.isSpecial = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    brick.holdsBall = false;
                                    console.log(`Brick at [${c},${r}] made BOMB by paint mode (touchstart).`);
                                } else {
                                     console.log(`TouchStart: Brick [${c},${r}] is already a bomb.`);
                                }
                            } else if (isBallBrickPaintModeActiveRef?.current) {
                                if (!brick.holdsBall && !brick.isBomb) {
                                    brick.holdsBall = true;
                                    brick.isSpecial = false;
                                    brick.isBomb = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    console.log(`Brick at [${c},${r}] made BALL_BRICK by paint mode (touchstart).`);
                                } else {
                                     console.log(`TouchStart: Brick [${c},${r}] already holds ball or is bomb.`);
                                }
                            } else {
                                console.log(`TouchStart: Brick [${c},${r}] - No paint condition met.`);
                                isDraggingToPaint = false;
                                return;
                            }
                            lastPaintedBrickKey = `${c}-${r}`;
                            isDraggingToPaint = true; 
                        } else {
                            console.log(`TouchStart: Brick [${c},${r}] is a bomb and no bomb-modifying paint mode is active. Dragging disabled.`);
                            isDraggingToPaint = false;
                        }
                        return;
                    }
                }
            }
            isDraggingToPaint = false; // If no brick was hit, ensure dragging is off
            return; 
        }

        const currentState = gameOverStateRef.current;
        const isTestModePreview = gameModeRef.current === 'test' && currentState === 'menu';
        let launchedStuckBallsThisPress = false;

        if (currentState === 'won' || currentState === 'lost') {
            handleResetGame();
        } else if ((currentState === 'playing' || isTestModePreview) && event.touches.length > 0) {
            const touchX = event.touches[0].clientX;
            updatePaddlePosition(touchX);

            if (isTestModePreview) {
                if (stuckBallsRef.current.length > 0) {
                    launchStuckBalls(true);
                    launchedStuckBallsThisPress = true;
                }
                startContinuousFire(launchedStuckBallsThisPress);
            } else { // Main game logic
                if (!isGameStartedRef.current) {
                    launchStuckBalls(true); // Initial launch, don't start continuous fire
                } else {
                    if (isMobile && stuckBallsRef.current.length > 0) {
                        launchStuckBalls(false); 
                        launchedStuckBallsThisPress = true;
                    } else if (stuckBallsRef.current.length > 0) {
                        launchStuckBalls(false);
                        launchedStuckBallsThisPress = true;
                    }
                    startContinuousFire(launchedStuckBallsThisPress);
                }
            }
        }
    };

    const handleTouchEnd = (event: TouchEvent) => {
        event.preventDefault();
        stopContinuousFire();
        isDraggingToPaint = false;
        lastPaintedBrickKey = null;
    };

    const handleTouchMove = (event: TouchEvent) => {
        event.preventDefault(); 
        const { 
            isPaintModeActiveRef, 
            isUpgradePaintModeActiveRef,
            isReinforcePaintModeActiveRef,
            isBombPaintModeActiveRef,
            isBallBrickPaintModeActiveRef,
            bricksRef, 
            brickColumnsRef, 
            brickRowsRef,
            gameModeRef,
            gameOverStateRef
        } = gameStateRefs;

        if (gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || isUpgradePaintModeActiveRef?.current || isReinforcePaintModeActiveRef?.current || isBombPaintModeActiveRef?.current || isBallBrickPaintModeActiveRef?.current) &&
            isDraggingToPaint && event.touches.length > 0) {
            if (!canvas) return;
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const moveX = (touch.clientX - rect.left) / scale;
            const moveY = (touch.clientY - rect.top) / scale;

            const bricks = bricksRef.current;
            for (let c = 0; c < (brickColumnsRef?.current ?? 0); c++) {
                for (let r = 0; r < (brickRowsRef?.current ?? 0); r++) {
                    const brick = bricks[c]?.[r];
                    const currentBrickKey = `${c}-${r}`;
                    if (brick && brick.status === 1 && lastPaintedBrickKey !== currentBrickKey &&
                        moveX > brick.x && moveX < brick.x + brick.width &&
                        moveY > brick.y && moveY < brick.y + brick.height) {
                        
                        console.log(`Paint Action (TouchMove) on brick [${c},${r}]: Initial Strength: ${brick.strength}, IsSpecial: ${brick.isSpecial}, IsBomb: ${brick.isBomb}, HoldsBall: ${brick.holdsBall}`);
                        console.log(`Paint Mode Refs (TouchMove): MakeSpecial: ${isPaintModeActiveRef?.current}, Upgrade: ${isUpgradePaintModeActiveRef?.current}, Reinforce: ${isReinforcePaintModeActiveRef?.current}, Bomb: ${isBombPaintModeActiveRef?.current}, BallBrick: ${isBallBrickPaintModeActiveRef?.current}`);
                        
                        let paintedThisBrick = false;
                        if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb )) {
                            if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                                brick.isSpecial = true;
                                brick.strength = 1;
                                brick.upgradeLevel = 0;
                                brick.isBomb = false;
                                brick.holdsBall = false;
                                brick.isSpecialFlashActive = true;
                                brick.specialFlashStartTime = Date.now();
                                console.log(`Brick at [${c},${r}] made SPECIAL by paint mode (touchmove).`);
                                paintedThisBrick = true;
                            } else if (isUpgradePaintModeActiveRef?.current) {
                                console.log(`TouchMove: Checking Upgrade. Brick strength: ${brick.strength}`);
                                if (brick.strength < 4 && !brick.isBomb) {
                                    brick.strength = 4;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 3;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] UPGRADED to L4 (UL3 Visual) by paint mode (touchmove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`TouchMove: Brick [${c},${r}] not upgraded, strength already ${brick.strength} (>=4) or is bomb.`);
                                }
                            } else if (isReinforcePaintModeActiveRef?.current) {
                                console.log(`TouchMove: Checking Reinforce. Brick strength: ${brick.strength}`);
                                if (brick.strength < 3 && !brick.isBomb) {
                                    brick.strength = 3;
                                    brick.isSpecial = false;
                                    brick.upgradeLevel = 2;
                                    brick.holdsBall = false;
                                    brick.isDarkFlashActive = true;
                                    brick.darkFlashStartTime = Date.now();
                                    console.log(`Brick at [${c},${r}] REINFORCED to L3 (UL2 Visual) by paint mode (touchmove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`TouchMove: Brick [${c},${r}] not reinforced, strength already ${brick.strength} (>=3) or is bomb.`);
                                }
                            } else if (isBombPaintModeActiveRef?.current) {
                                if (!brick.isBomb) {
                                    brick.isBomb = true;
                                    brick.isSpecial = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    brick.holdsBall = false;
                                    console.log(`Brick at [${c},${r}] made BOMB by paint mode (touchmove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`TouchMove: Brick [${c},${r}] is already a bomb.`);
                                }
                            } else if (isBallBrickPaintModeActiveRef?.current) {
                                if (!brick.holdsBall && !brick.isBomb) {
                                    brick.holdsBall = true;
                                    brick.isSpecial = false;
                                    brick.isBomb = false;
                                    brick.strength = 1;
                                    brick.upgradeLevel = 0;
                                    console.log(`Brick at [${c},${r}] made BALL_BRICK by paint mode (touchmove).`);
                                    paintedThisBrick = true;
                                } else {
                                    console.log(`TouchMove: Brick [${c},${r}] already holds ball or is bomb.`);
                                }
                            } else {
                                console.log(`TouchMove: Brick [${c},${r}] - No paint condition met or brick already in target state.`);
                            }

                            if (paintedThisBrick) {
                                lastPaintedBrickKey = currentBrickKey;
                            }
                        } else {
                            console.log(`TouchMove: Brick [${c},${r}] is a bomb and no bomb-modifying paint mode is active.`);
                        }
                        break; 
                    }
                }
            }
        }

        if ((gameOverStateRef.current === 'playing' || (gameModeRef.current === 'test' && gameOverStateRef.current === 'menu')) && event.touches.length > 0) {
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
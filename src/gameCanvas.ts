// src/gameCanvas.ts
import React from 'react';
import { GameStateRefs, GameLoopCallbacks, GameState } from './interfaces'; 
import {
    BOARD_WIDTH, BOARD_HEIGHT, INITIAL_PADDLE_WIDTH, LASER_WIDTH, LASER_HEIGHT, LASER_SPEED, PADDLE_Y,
    BALL_SIZE, BIG_BALL_SIZE_INCREASE, BRICK_OFFSET_LEFT, BRICK_OFFSET_TOP, BRICK_PADDING
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
            isRemoveBrickPaintModeActiveRef,
            isAddBrickPaintModeActiveRef,
            bricksRef, 
            brickColumnsRef, 
            brickRowsRef,
            gameModeRef,
            testBrickGridHeightRef
        } = gameStateRefs;

        if (gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || isUpgradePaintModeActiveRef?.current || isReinforcePaintModeActiveRef?.current || isBombPaintModeActiveRef?.current || isBallBrickPaintModeActiveRef?.current || isRemoveBrickPaintModeActiveRef?.current || isAddBrickPaintModeActiveRef?.current) &&
            isDraggingToPaint) {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const moveX = (event.clientX - rect.left) / scale;
            const moveY = (event.clientY - rect.top) / scale;

            const currentBrickColumns = brickColumnsRef.current;
            const currentBrickRows = brickRowsRef.current;
            const currentGridHeight = testBrickGridHeightRef.current;

            const dynamicBrickWidth = (BOARD_WIDTH - 2 * BRICK_OFFSET_LEFT - (currentBrickColumns - 1) * BRICK_PADDING) / currentBrickColumns;
            const dynamicBrickHeight = (currentGridHeight - (currentBrickRows - 1) * BRICK_PADDING) / currentBrickRows;

            const targetC = Math.floor((moveX - BRICK_OFFSET_LEFT) / (dynamicBrickWidth + BRICK_PADDING));
            const targetR = Math.floor((moveY - BRICK_OFFSET_TOP) / (dynamicBrickHeight + BRICK_PADDING));
            const currentBrickKey = `${targetC}-${targetR}`;

            if (targetC >= 0 && targetC < currentBrickColumns && targetR >= 0 && targetR < currentBrickRows && lastPaintedBrickKey !== currentBrickKey) {
                const bricks = bricksRef.current;
                if (!bricks[targetC]) {
                    bricks[targetC] = [];
                }
                let brick = bricks[targetC]?.[targetR];
                let paintedThisBrick = false;

                if (isAddBrickPaintModeActiveRef?.current) {
                    if (!brick || brick.status === 0) {
                        const newBrickX = (targetC * (dynamicBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                        const newBrickY = (targetR * (dynamicBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                        bricks[targetC][targetR] = {
                            x: newBrickX, y: newBrickY,
                            width: dynamicBrickWidth, height: dynamicBrickHeight,
                            status: 1, strength: 1, isSpecial: false, isBomb: false,
                            holdsBall: false, upgradeLevel: 0,
                            isFlashing: false, fadeOutAlpha: 0,
                            isRegenVisualEffectActive: false, darkFlashStartTime: undefined, specialFlashStartTime: undefined,
                            isDarkFlashActive: false, isSpecialFlashActive: false,
                        };
                        console.log(`Brick at [${targetC},${targetR}] ADDED by paint mode (mousemove).`);
                        paintedThisBrick = true;
                    } else {
                        console.log(`[MouseMove DEBUG] Add Mode: Brick [${targetC},${targetR}] not added. Status is ${brick.status}, not 0 or undefined.`);
                    }
                } else if (brick && isRemoveBrickPaintModeActiveRef?.current) {
                    if (brick.status === 1) {
                        brick.status = 0; 
                        console.log(`Brick at [${targetC},${targetR}] REMOVED by paint mode (mousemove).`);
                        paintedThisBrick = true;
                    }
                } else if (brick && brick.status === 1) {
                    if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                        if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                            brick.isSpecial = true; brick.strength = 1; brick.upgradeLevel = 0; brick.isBomb = false; brick.holdsBall = false;
                            brick.isSpecialFlashActive = true; brick.specialFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] made SPECIAL by paint mode (mousemove).`);
                            paintedThisBrick = true;
                        } else if (isUpgradePaintModeActiveRef?.current && brick.strength < 4 && !brick.isBomb) {
                            brick.strength = 4; brick.isSpecial = false; brick.upgradeLevel = 3; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] UPGRADED by paint mode (mousemove).`);
                            paintedThisBrick = true;
                        } else if (isReinforcePaintModeActiveRef?.current && brick.strength < 3 && !brick.isBomb) {
                            brick.strength = 3; brick.isSpecial = false; brick.upgradeLevel = 2; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] REINFORCED by paint mode (mousemove).`);
                            paintedThisBrick = true;
                        } else if (isBombPaintModeActiveRef?.current && !brick.isBomb) {
                            brick.isBomb = true; brick.isSpecial = false; brick.strength = 1; brick.upgradeLevel = 0; brick.holdsBall = false;
                            console.log(`Brick at [${targetC},${targetR}] made BOMB by paint mode (mousemove).`);
                            paintedThisBrick = true;
                        } else if (isBallBrickPaintModeActiveRef?.current && !brick.holdsBall && !brick.isBomb) {
                            brick.holdsBall = true; brick.isSpecial = false; brick.isBomb = false; brick.strength = 1; brick.upgradeLevel = 0;
                            console.log(`Brick at [${targetC},${targetR}] made BALL_BRICK by paint mode (mousemove).`);
                            paintedThisBrick = true;
                        }
                    } else {
                        console.log(`Mousedown: Brick [${targetC},${targetR}] is a bomb and no bomb-modifying paint mode is active.`);
                    }
                }
                if (paintedThisBrick) {
                    lastPaintedBrickKey = currentBrickKey;
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
            isRemoveBrickPaintModeActiveRef, 
            isAddBrickPaintModeActiveRef,    
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
            laserShotsRef,
            testBrickGridHeightRef
        } = gameStateRefs;
        
        // PRIMARY DIAGNOSTIC LOG (MOUSEDOWN)
        if (gameModeRef.current === 'test') {
            console.log(
                `[CANVAS DEBUG - mousedown] Paint Mode Refs: ` +
                `Remove=${isRemoveBrickPaintModeActiveRef?.current}, ` +
                `Add=${isAddBrickPaintModeActiveRef?.current}, ` +
                `MakeSpecial=${isPaintModeActiveRef?.current}, ` +
                `Upgrade=${isUpgradePaintModeActiveRef?.current}, ` +
                `Reinforce=${isReinforcePaintModeActiveRef?.current}, ` +
                `Bomb=${isBombPaintModeActiveRef?.current}, ` +
                `BallBrick=${isBallBrickPaintModeActiveRef?.current}`
            );
        }

        const anyBrickPaintModeActive = gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || 
             isUpgradePaintModeActiveRef?.current || 
             isReinforcePaintModeActiveRef?.current || 
             isBombPaintModeActiveRef?.current || 
             isBallBrickPaintModeActiveRef?.current ||
             isRemoveBrickPaintModeActiveRef?.current ||
             isAddBrickPaintModeActiveRef?.current);

        if (anyBrickPaintModeActive) { 
            isDraggingToPaint = true; 
            if (!canvas) { isDraggingToPaint = false; return; } 

            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const clickX = (event.clientX - rect.left) / scale;
            const clickY = (event.clientY - rect.top) / scale;

            const currentBrickColumns = brickColumnsRef.current;
            const currentBrickRows = brickRowsRef.current;
            const currentGridHeight = testBrickGridHeightRef.current;

            const dynamicBrickWidth = (BOARD_WIDTH - 2 * BRICK_OFFSET_LEFT - (currentBrickColumns - 1) * BRICK_PADDING) / currentBrickColumns;
            const dynamicBrickHeight = (currentGridHeight - (currentBrickRows - 1) * BRICK_PADDING) / currentBrickRows;

            const targetC = Math.floor((clickX - BRICK_OFFSET_LEFT) / (dynamicBrickWidth + BRICK_PADDING));
            const targetR = Math.floor((clickY - BRICK_OFFSET_TOP) / (dynamicBrickHeight + BRICK_PADDING));

            if (targetC >= 0 && targetC < currentBrickColumns && targetR >= 0 && targetR < currentBrickRows) {
                const bricks = bricksRef.current;
                if (!bricks[targetC]) {
                    bricks[targetC] = []; 
                }
                let brick = bricks[targetC]?.[targetR];

                console.log(`[Mousedown Paint Action] Target cell [${targetC},${targetR}]. Found brick: ${!!brick}, Status: ${brick?.status}`);

                if (isAddBrickPaintModeActiveRef?.current) {
                    if (!brick || brick.status === 0) { 
                        const newBrickX = (targetC * (dynamicBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                        const newBrickY = (targetR * (dynamicBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                        bricks[targetC][targetR] = {
                            x: newBrickX, y: newBrickY,
                            width: dynamicBrickWidth, height: dynamicBrickHeight,
                            status: 1, strength: 1, isSpecial: false, isBomb: false,
                            holdsBall: false, upgradeLevel: 0,
                            isFlashing: false, fadeOutAlpha: 0,
                            isRegenVisualEffectActive: false, darkFlashStartTime: undefined, specialFlashStartTime: undefined, // ensure these are reset
                            isDarkFlashActive: false, isSpecialFlashActive: false,
                        };
                        console.log(`Brick at [${targetC},${targetR}] ADDED/ACTIVATED by paint mode (mousedown).`);
                        lastPaintedBrickKey = `${targetC}-${targetR}`;
                    } else {
                         console.log(`[Mousedown DEBUG] Add Mode: Brick [${targetC},${targetR}] not added. Status is ${brick.status}, not 0 or undefined.`);
                    }
                } else if (brick && isRemoveBrickPaintModeActiveRef?.current) {
                    if (brick.status === 1) {
                        brick.status = 0;
                        console.log(`Brick at [${targetC},${targetR}] REMOVED by paint mode (mousedown).`);
                        lastPaintedBrickKey = `${targetC}-${targetR}`;
                    }
                } else if (brick && brick.status === 1) { // Other paint modes only affect existing, active bricks
                    // (Logic for MakeSpecial, Upgrade, Reinforce, Bomb, BallBrick - condensed for brevity, assumed to be here)
                    if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                        if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                            brick.isSpecial = true; brick.strength = 1; brick.upgradeLevel = 0; brick.isBomb = false; brick.holdsBall = false;
                            brick.isSpecialFlashActive = true; brick.specialFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] made SPECIAL by paint mode (mousedown).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isUpgradePaintModeActiveRef?.current && brick.strength < 4 && !brick.isBomb) {
                            brick.strength = 4; brick.isSpecial = false; brick.upgradeLevel = 3; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] UPGRADED by paint mode (mousedown).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isReinforcePaintModeActiveRef?.current && brick.strength < 3 && !brick.isBomb) {
                            brick.strength = 3; brick.isSpecial = false; brick.upgradeLevel = 2; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] REINFORCED by paint mode (mousedown).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isBombPaintModeActiveRef?.current && !brick.isBomb) {
                            brick.isBomb = true; brick.isSpecial = false; brick.strength = 1; brick.upgradeLevel = 0; brick.holdsBall = false;
                            console.log(`Brick at [${targetC},${targetR}] made BOMB by paint mode (mousedown).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isBallBrickPaintModeActiveRef?.current && !brick.holdsBall && !brick.isBomb) {
                            brick.holdsBall = true; brick.isSpecial = false; brick.isBomb = false; brick.strength = 1; brick.upgradeLevel = 0;
                            console.log(`Brick at [${targetC},${targetR}] made BALL_BRICK by paint mode (mousedown).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        }
                    } else {
                        console.log(`Mousedown: Brick [${targetC},${targetR}] is a bomb and no bomb-modifying paint mode is active.`);
                    }
                }
            }
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
            isRemoveBrickPaintModeActiveRef, 
            isAddBrickPaintModeActiveRef,    
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
            laserShotsRef,
            testBrickGridHeightRef
        } = gameStateRefs;

        // PRIMARY DIAGNOSTIC LOG (TOUCHSTART)
        if (gameModeRef.current === 'test' && event.touches.length > 0) {
            console.log(
                `[CANVAS DEBUG - touchstart] Paint Mode Refs: ` +
                `Remove=${isRemoveBrickPaintModeActiveRef?.current}, ` +
                `Add=${isAddBrickPaintModeActiveRef?.current}, ` +
                `MakeSpecial=${isPaintModeActiveRef?.current}, ` +
                `Upgrade=${isUpgradePaintModeActiveRef?.current}, ` +
                `Reinforce=${isReinforcePaintModeActiveRef?.current}, ` +
                `Bomb=${isBombPaintModeActiveRef?.current}, ` +
                `BallBrick=${isBallBrickPaintModeActiveRef?.current}`
            );
        }

        const anyBrickPaintModeActive = gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || 
             isUpgradePaintModeActiveRef?.current || 
             isReinforcePaintModeActiveRef?.current || 
             isBombPaintModeActiveRef?.current || 
             isBallBrickPaintModeActiveRef?.current ||
             isRemoveBrickPaintModeActiveRef?.current ||
             isAddBrickPaintModeActiveRef?.current);

        if (anyBrickPaintModeActive && event.touches.length > 0) {
            isDraggingToPaint = true; 
            if (!canvas) { isDraggingToPaint = false; return; }
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const clickX = (touch.clientX - rect.left) / scale;
            const clickY = (touch.clientY - rect.top) / scale;

            const currentBrickColumns = brickColumnsRef.current;
            const currentBrickRows = brickRowsRef.current;
            const currentGridHeight = testBrickGridHeightRef.current;

            const dynamicBrickWidth = (BOARD_WIDTH - 2 * BRICK_OFFSET_LEFT - (currentBrickColumns - 1) * BRICK_PADDING) / currentBrickColumns;
            const dynamicBrickHeight = (currentGridHeight - (currentBrickRows - 1) * BRICK_PADDING) / currentBrickRows;

            const targetC = Math.floor((clickX - BRICK_OFFSET_LEFT) / (dynamicBrickWidth + BRICK_PADDING));
            const targetR = Math.floor((clickY - BRICK_OFFSET_TOP) / (dynamicBrickHeight + BRICK_PADDING));
            
            if (targetC >= 0 && targetC < currentBrickColumns && targetR >= 0 && targetR < currentBrickRows) {
                const bricks = bricksRef.current;
                if (!bricks[targetC]) {
                    bricks[targetC] = [];
                }
                let brick = bricks[targetC]?.[targetR];
                console.log(`[TouchStart Paint Action] Target cell [${targetC},${targetR}]. Found brick: ${!!brick}, Status: ${brick?.status}`);

                if (isAddBrickPaintModeActiveRef?.current) {
                    if (!brick || brick.status === 0) {
                         const newBrickX = (targetC * (dynamicBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                        const newBrickY = (targetR * (dynamicBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                        bricks[targetC][targetR] = {
                            x: newBrickX, y: newBrickY,
                            width: dynamicBrickWidth, height: dynamicBrickHeight,
                            status: 1, strength: 1, isSpecial: false, isBomb: false,
                            holdsBall: false, upgradeLevel: 0,
                            isFlashing: false, fadeOutAlpha: 0,
                            isRegenVisualEffectActive: false, darkFlashStartTime: undefined, specialFlashStartTime: undefined,
                            isDarkFlashActive: false, isSpecialFlashActive: false,
                        };
                        console.log(`Brick at [${targetC},${targetR}] ADDED/ACTIVATED by paint mode (touchstart).`);
                        lastPaintedBrickKey = `${targetC}-${targetR}`;
                    } else {
                         console.log(`[TouchStart DEBUG] Add Mode: Brick [${targetC},${targetR}] not added. Status is ${brick.status}, not 0 or undefined.`);
                    }
                } else if (brick && isRemoveBrickPaintModeActiveRef?.current) {
                    if (brick.status === 1) {
                        brick.status = 0;
                        console.log(`Brick at [${targetC},${targetR}] REMOVED by paint mode (touchstart).`);
                        lastPaintedBrickKey = `${targetC}-${targetR}`;
                    }
                } else if (brick && brick.status === 1) {
                    // (Logic for MakeSpecial, Upgrade, Reinforce, Bomb, BallBrick for touchstart)
                     if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                        if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                            brick.isSpecial = true; brick.strength = 1; brick.upgradeLevel = 0; brick.isBomb = false; brick.holdsBall = false;
                            brick.isSpecialFlashActive = true; brick.specialFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] made SPECIAL by paint mode (touchstart).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isUpgradePaintModeActiveRef?.current && brick.strength < 4 && !brick.isBomb) {
                            brick.strength = 4; brick.isSpecial = false; brick.upgradeLevel = 3; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] UPGRADED by paint mode (touchstart).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isReinforcePaintModeActiveRef?.current && brick.strength < 3 && !brick.isBomb) {
                            brick.strength = 3; brick.isSpecial = false; brick.upgradeLevel = 2; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] REINFORCED by paint mode (touchstart).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isBombPaintModeActiveRef?.current && !brick.isBomb) {
                            brick.isBomb = true; brick.isSpecial = false; brick.strength = 1; brick.upgradeLevel = 0; brick.holdsBall = false;
                            console.log(`Brick at [${targetC},${targetR}] made BOMB by paint mode (touchstart).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        } else if (isBallBrickPaintModeActiveRef?.current && !brick.holdsBall && !brick.isBomb) {
                            brick.holdsBall = true; brick.isSpecial = false; brick.isBomb = false; brick.strength = 1; brick.upgradeLevel = 0;
                            console.log(`Brick at [${targetC},${targetR}] made BALL_BRICK by paint mode (touchstart).`);
                            lastPaintedBrickKey = `${targetC}-${targetR}`;
                        }
                    } else {
                         console.log(`TouchStart: Brick [${targetC},${targetR}] is a bomb and no bomb-modifying paint mode is active.`);
                    }
                }
            }
            return;
        }
        // ... (rest of handleTouchStart for ball launch etc.)
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
            isRemoveBrickPaintModeActiveRef, 
            isAddBrickPaintModeActiveRef,    
            bricksRef, 
            brickColumnsRef, 
            brickRowsRef,
            gameModeRef,
            gameOverStateRef,
            testBrickGridHeightRef
        } = gameStateRefs;

        if (gameModeRef.current === 'test' && 
            (isPaintModeActiveRef?.current || isUpgradePaintModeActiveRef?.current || isReinforcePaintModeActiveRef?.current || isBombPaintModeActiveRef?.current || isBallBrickPaintModeActiveRef?.current || isRemoveBrickPaintModeActiveRef?.current || isAddBrickPaintModeActiveRef?.current) &&
            isDraggingToPaint && event.touches.length > 0) {
            if (!canvas) return;
            const touch = event.touches[0];
            const rect = canvas.getBoundingClientRect();
            const scale = scaleRef.current;
            const moveX = (touch.clientX - rect.left) / scale;
            const moveY = (touch.clientY - rect.top) / scale;

            const currentBrickColumns = brickColumnsRef.current;
            const currentBrickRows = brickRowsRef.current;
            const currentGridHeight = testBrickGridHeightRef.current;

            const dynamicBrickWidth = (BOARD_WIDTH - 2 * BRICK_OFFSET_LEFT - (currentBrickColumns - 1) * BRICK_PADDING) / currentBrickColumns;
            const dynamicBrickHeight = (currentGridHeight - (currentBrickRows - 1) * BRICK_PADDING) / currentBrickRows;

            const targetC = Math.floor((moveX - BRICK_OFFSET_LEFT) / (dynamicBrickWidth + BRICK_PADDING));
            const targetR = Math.floor((moveY - BRICK_OFFSET_TOP) / (dynamicBrickHeight + BRICK_PADDING));
            const currentBrickKey = `${targetC}-${targetR}`;

            if (targetC >= 0 && targetC < currentBrickColumns && targetR >= 0 && targetR < currentBrickRows && lastPaintedBrickKey !== currentBrickKey) {
                const bricks = bricksRef.current;
                 if (!bricks[targetC]) {
                    bricks[targetC] = [];
                }
                let brick = bricks[targetC]?.[targetR];
                let paintedThisBrick = false;

                if (isAddBrickPaintModeActiveRef?.current) {
                    if (!brick || brick.status === 0) {
                        const newBrickX = (targetC * (dynamicBrickWidth + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
                        const newBrickY = (targetR * (dynamicBrickHeight + BRICK_PADDING)) + BRICK_OFFSET_TOP;
                         bricks[targetC][targetR] = {
                            x: newBrickX, y: newBrickY,
                            width: dynamicBrickWidth, height: dynamicBrickHeight,
                            status: 1, strength: 1, isSpecial: false, isBomb: false,
                            holdsBall: false, upgradeLevel: 0,
                            isFlashing: false, fadeOutAlpha: 0,
                            isRegenVisualEffectActive: false, darkFlashStartTime: undefined, specialFlashStartTime: undefined,
                            isDarkFlashActive: false, isSpecialFlashActive: false,
                        };
                        console.log(`Brick at [${targetC},${targetR}] ADDED by paint mode (touchmove).`);
                        paintedThisBrick = true;
                    } else {
                        console.log(`TouchMove: Brick [${targetC},${targetR}] not added by AddPaintMode. Status is ${brick.status}, not 0.`);
                    }
                } else if (brick && isRemoveBrickPaintModeActiveRef?.current) {
                     if (brick.status === 1) {
                        brick.status = 0; 
                        console.log(`Brick at [${targetC},${targetR}] REMOVED by paint mode (touchmove).`);
                        paintedThisBrick = true;
                    }
                } else if (brick && brick.status === 1) {
                    if (!brick.isBomb || (isBombPaintModeActiveRef?.current && brick.isBomb) || (isBallBrickPaintModeActiveRef?.current && brick.isBomb)) {
                        if (isPaintModeActiveRef?.current && !brick.isSpecial) {
                           brick.isSpecial = true; brick.strength = 1; brick.upgradeLevel = 0; brick.isBomb = false; brick.holdsBall = false;
                           brick.isSpecialFlashActive = true; brick.specialFlashStartTime = Date.now();
                           console.log(`Brick at [${targetC},${targetR}] made SPECIAL by paint mode (touchmove).`);
                           paintedThisBrick = true;
                        } else if (isUpgradePaintModeActiveRef?.current && brick.strength < 4 && !brick.isBomb) {
                             brick.strength = 4; brick.isSpecial = false; brick.upgradeLevel = 3; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] UPGRADED by paint mode (touchmove).`);
                            paintedThisBrick = true;
                        } else if (isReinforcePaintModeActiveRef?.current && brick.strength < 3 && !brick.isBomb) {
                            brick.strength = 3; brick.isSpecial = false; brick.upgradeLevel = 2; brick.holdsBall = false;
                            brick.isDarkFlashActive = true; brick.darkFlashStartTime = Date.now();
                            console.log(`Brick at [${targetC},${targetR}] REINFORCED by paint mode (touchmove).`);
                            paintedThisBrick = true;
                        } else if (isBombPaintModeActiveRef?.current && !brick.isBomb) {
                            brick.isBomb = true; brick.isSpecial = false; brick.strength = 1; brick.upgradeLevel = 0; brick.holdsBall = false;
                            console.log(`Brick at [${targetC},${targetR}] made BOMB by paint mode (touchmove).`);
                            paintedThisBrick = true;
                        } else if (isBallBrickPaintModeActiveRef?.current && !brick.holdsBall && !brick.isBomb) {
                             brick.holdsBall = true; brick.isSpecial = false; brick.isBomb = false; brick.strength = 1; brick.upgradeLevel = 0;
                            console.log(`Brick at [${targetC},${targetR}] made BALL_BRICK by paint mode (touchmove).`);
                            paintedThisBrick = true;
                        }
                    }
                }
                if (paintedThisBrick) {
                    lastPaintedBrickKey = currentBrickKey;
                }
            }
        }
        updatePaddlePosition(event.touches[0].clientX);
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
import React, { useRef, useEffect } from 'react';
import { getBrickConfiguration } from '../hooks/useLevelLogic';
import { initializeBricks, initialBallState } from '../gameLogic';
import { drawBricks, drawPaddle, drawBalls } from '../drawFunctions';
import { BOARD_WIDTH, BOARD_HEIGHT, INITIAL_PADDLE_WIDTH } from '../constants';

interface LevelPreviewProps {
  level: number;
  previewWidth: number;
  previewHeight: number;
}

const LevelPreview: React.FC<LevelPreviewProps> = ({ level, previewWidth, previewHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas physical dimensions
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    // Clear and scale context for logical drawing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, previewWidth, previewHeight);

    const scale = previewWidth / BOARD_WIDTH;
    ctx.scale(scale, scale);

    // --- Draw Game Background ---
    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, BOARD_HEIGHT);
    backgroundGradient.addColorStop(0, '#111927'); // Dark blue at the top
    backgroundGradient.addColorStop(1, '#2c3e50'); // Lighter blue at the bottom
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);

    // --- Get Level Data ---
    const config = getBrickConfiguration(level, 'main');
    const bricks = initializeBricks(config.brickColumns, config.brickRows, config.brickHeight, level, 'main', config.actualGridHeight);

    // --- Draw Game Elements ---
    drawBricks(ctx, bricks, config.brickColumns, config.brickRows, Date.now());

    const paddleX = (BOARD_WIDTH - INITIAL_PADDLE_WIDTH) / 2;
    drawPaddle(ctx, paddleX, INITIAL_PADDLE_WIDTH);

    const ball = { ...initialBallState, x: paddleX + INITIAL_PADDLE_WIDTH / 2 };
    // Draw the ball in its stuck position, so pass it in the `stuckBalls` array.
    drawBalls(ctx, [], [ball], Date.now());

  }, [level, previewWidth, previewHeight]);

  return <canvas ref={canvasRef} className="border border-gray-400" />;
};

export default LevelPreview; 
'use client'

import React, { useState, useRef, useEffect } from 'react';

const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const BALL_SIZE = 15;
const BRICK_WIDTH = 70;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 70;
const BRICK_OFFSET_LEFT = 30;
const BRICK_ROWS = 5;
const BRICK_COLUMNS = 12;

interface Brick {
  x: number;
  y: number;
  status: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paddleX, setPaddleX] = useState((BOARD_WIDTH - PADDLE_WIDTH) / 2);
  const [ballX, setBallX] = useState(BOARD_WIDTH / 2);
  const [ballY, setBallY] = useState(BOARD_HEIGHT - 30);
  const [ballSpeedX, setBallSpeedX] = useState(3);
  const [ballSpeedY, setBallSpeedY] = useState(-3);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [bricks, setBricks] = useState<Brick[][]>([]);

  useEffect(() => {
    const initializeBricks = () => {
      const newBricks: Brick[][] = [];
      for (let c = 0; c < BRICK_COLUMNS; c++) {
        newBricks[c] = [];
        for (let r = 0; r < BRICK_ROWS; r++) {
          newBricks[c][r] = { x: 0, y: 0, status: 1 };
        }
      }
      setBricks(newBricks);
    };

    initializeBricks();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawPaddle = () => {
      ctx.beginPath();
      ctx.rect(paddleX, BOARD_HEIGHT - PADDLE_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.closePath();
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_SIZE, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.closePath();
    };

    const drawBricks = () => {
      if (!bricks) return;

      for (let c = 0; c < BRICK_COLUMNS; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < BRICK_ROWS; r++) {
          if (bricks[c][r].status === 1) {
            const brickX = (c * (BRICK_WIDTH + BRICK_PADDING)) + BRICK_OFFSET_LEFT;
            const brickY = (r * (BRICK_HEIGHT + BRICK_PADDING)) + BRICK_OFFSET_TOP;
            bricks[c][r].x = brickX;
            bricks[c][r].y = brickY;
            ctx.beginPath();
            ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
            ctx.fillStyle = "#e67e22";
            ctx.fill();
            ctx.closePath();
          }
        }
      }
    };

    const collisionDetection = () => {
      if (!bricks) return;

      for (let c = 0; c < BRICK_COLUMNS; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < BRICK_ROWS; r++) {
          const brick = bricks[c][r];
          if (brick.status === 1) {
            if (ballX > brick.x && ballX < brick.x + BRICK_WIDTH && ballY > brick.y && ballY < brick.y + BRICK_HEIGHT) {
              // Determine collision side
              const previousBallY = ballY - ballSpeedY;
              if (previousBallY < brick.y || previousBallY > brick.y + BRICK_HEIGHT) {
                  setBallSpeedY(-ballSpeedY); // Reverse Y direction
              } else {
                  setBallSpeedX(-ballSpeedX); // Reverse X direction
              }
              brick.status = 0;
              setScore(score + 1);

               // Update the bricks state
              setBricks(prevBricks => {
                const updatedBricks = [...prevBricks];
                updatedBricks[c] = [...updatedBricks[c]]; // Copy the column
                updatedBricks[c][r] = { ...updatedBricks[c][r], status: 0 }; // Update the brick status
                return updatedBricks;
              });
              return; // Prevent multiple collisions with the same brick
            }
          }
        }
      }
    };


    const drawScore = () => {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Score: " + score, 8, 20);
    };

    const drawGameOver = () => {
      ctx.font = "30px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("Game Over! Score: " + score, BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
    };

    const update = () => {
      if (gameOver) {
        drawGameOver();
        return;
      }

      ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
      drawBricks();
      drawBall();
      drawPaddle();
      drawScore();
      collisionDetection();

      // Ball collision with walls
      if (ballX + ballSpeedX > BOARD_WIDTH - BALL_SIZE || ballX + ballSpeedX < BALL_SIZE) {
        setBallSpeedX(-ballSpeedX);
      }
      if (ballY + ballSpeedY < BALL_SIZE) {
        setBallSpeedY(-ballSpeedY);
      } else if (ballY + ballSpeedY > BOARD_HEIGHT - BALL_SIZE) {
        if (ballX > paddleX && ballX < paddleX + PADDLE_WIDTH) {
          setBallSpeedY(-ballSpeedY);
        } else {
          setGameOver(true);
        }
      }

      // Paddle movement
      if (rightPressed && paddleX < BOARD_WIDTH - PADDLE_WIDTH) {
        setPaddleX(paddleX + 7);
      } else if (leftPressed && paddleX > 0) {
        setPaddleX(paddleX - 7);
      }

      // Ball movement
      setBallX(ballX + ballSpeedX);
      setBallY(ballY + ballSpeedY);

      if (score === BRICK_ROWS * BRICK_COLUMNS) {
        ctx.font = "30px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("You Win! Score: " + score, BOARD_WIDTH / 2, BOARD_HEIGHT / 2);
        return;
      }

      requestAnimationFrame(update);
    };

    drawBricks(); // Draw initial bricks
    update();

    // Keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        setRightPressed(true);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        setLeftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        setRightPressed(false);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        setLeftPressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [ballX, ballY, ballSpeedX, ballSpeedY, bricks, gameOver, paddleX, score]);

  const [rightPressed, setRightPressed] = useState(false);
  const [leftPressed, setLeftPressed] = useState(false);

  return (
    <div className="flex items-center justify-center h-screen">
      <canvas ref={canvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} />
    </div>
  );
}

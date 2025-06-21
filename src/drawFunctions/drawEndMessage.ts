import { GameState } from '../interfaces';
import { BOARD_WIDTH, BOARD_HEIGHT } from '../constants';

export const drawEndMessage = (
    ctx: CanvasRenderingContext2D,
    state: GameState, 
    finalScore: number
) => {
    ctx.font = "48px Inter, Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let message = "";
    if (state === 'won') {
        message = "You Won!";
    } else if (state === 'lost') {
        message = "Game Over";
    }
    ctx.fillText(message, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 - 40);

    ctx.font = "24px Inter, Arial, sans-serif";
    ctx.fillText(`Final Score: ${finalScore}`, BOARD_WIDTH / 2, BOARD_HEIGHT / 2 + 20);
};

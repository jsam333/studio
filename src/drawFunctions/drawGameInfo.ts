import { GOLD_COLOR, BONUS_GOLD_TIMER_DURATION } from '../constants';

export const drawGameInfo = (
    ctx: CanvasRenderingContext2D,
    currentScore: number,
    targetScore: number,
    gold: number,
    bonusGold: number,
    isTestMode: boolean,
    lives: number,
    bonusGoldTimerCountdown: number | null
) => {
  ctx.font = "16px Inter, Arial, sans-serif";
  ctx.textBaseline = 'top';
  const yPos = 10;
  const xStart = 8;
  const padding = 15;

  const scoreText = `Score: ${currentScore}/${targetScore}`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = 'left';
  ctx.fillText(scoreText, xStart, yPos);
  let currentX = xStart + ctx.measureText(scoreText).width + padding;

  if (!isTestMode) {
    const goldText = `Gold: ${gold}`;
    ctx.fillStyle = GOLD_COLOR || "#FFD700";
    ctx.fillText(goldText, currentX, yPos);
    currentX += ctx.measureText(goldText).width + padding;

    if (bonusGold > 0) {
        const bonusText = `(+${bonusGold})`;
        ctx.fillStyle = '#90EE90'; 
        ctx.fillText(bonusText, currentX, yPos);
        currentX += ctx.measureText(bonusText).width; 

        if (bonusGoldTimerCountdown !== null && bonusGoldTimerCountdown > 0) {
            const secondsLeft = Math.ceil(bonusGoldTimerCountdown / 1000);
            const timerText = ` ${secondsLeft} seconds left!`; 
            const ratio = Math.max(0, Math.min(1, bonusGoldTimerCountdown / BONUS_GOLD_TIMER_DURATION));
            const red = Math.round(255 * (1 - ratio));
            const green = Math.round(255 * ratio);
            ctx.fillStyle = `rgb(${red},${green},0)`; 
            ctx.fillText(timerText, currentX, yPos);
            currentX += ctx.measureText(timerText).width;
        }
        currentX += padding;
    }
  }

  if (!isTestMode) {
    const livesText = `Lives: ${lives}`;
    ctx.fillStyle = "#ff6347"; 
    ctx.fillText(livesText, currentX, yPos);
  }
};

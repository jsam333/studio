import { PowerUp, PowerUpType } from '../interfaces';
import { POWER_UP_SIZE, POWER_UP_COLORS, RAINBOW_FLASH_INTERVAL, RAINBOW_COLORS, BOARD_WIDTH, BOARD_HEIGHT } from '../constants';
import {
    getBasePowerUpType,
    multiBallImage, widenPaddleImage, laserPaddleImage, regenBrickImage, upgradeBrickImage, 
    reinforceBrickImage, safetyNetImage, makeSpecialImage, recoveryPaddleImage, bombBrickImage,
    ballBrickImage, collectionFieldImage, bigBallImage, blackBallImage, builderBallImage,
    homingBallImage, pierceBallImage, splittingBallImage, pointsFieldImage
} from './drawUtils';

export const drawPowerUps = (ctx: CanvasRenderingContext2D, powerUps: PowerUp[]) => {
    const currentTime = Date.now();
    powerUps.forEach(powerUp => {
        if (powerUp.status === 'falling' || powerUp.status === 'animatingToPaddle') { // Modified condition
            let imageToDraw: HTMLImageElement | null = null;
            const baseType = getBasePowerUpType(powerUp.type);

            switch (baseType) {
                case 'MULTI_BALL': imageToDraw = multiBallImage; break;
                case 'WIDEN_PADDLE': imageToDraw = widenPaddleImage; break;
                case 'LASER_PADDLE': imageToDraw = laserPaddleImage; break;
                case 'REGEN_BRICK': imageToDraw = regenBrickImage; break;
                case 'UPGRADE_BRICK': imageToDraw = upgradeBrickImage; break;
                case 'REINFORCE_BRICK': imageToDraw = reinforceBrickImage; break;
                case 'SAFETY_NET': imageToDraw = safetyNetImage; break;
                case 'MAKE_SPECIAL': imageToDraw = makeSpecialImage; break;
                case 'RECOVERY_PADDLE': imageToDraw = recoveryPaddleImage; break;
                case 'BOMB_BRICK': imageToDraw = bombBrickImage; break;
                case 'BALL_BRICK': imageToDraw = ballBrickImage; break;
                case 'COLLECTION_FIELD': imageToDraw = collectionFieldImage; break;
                case 'BIG_BALL': imageToDraw = bigBallImage; break;
                case 'DOUBLE_BALL': imageToDraw = blackBallImage; break;
                case 'BUILDER_BALL': imageToDraw = builderBallImage; break;
                case 'HOMING_BALL': imageToDraw = homingBallImage; break;
                case 'PIERCE_BALL': imageToDraw = pierceBallImage; break;
                case 'SPLITTING_BALL': imageToDraw = splittingBallImage; break;
                case 'POINTS_FIELD': imageToDraw = pointsFieldImage; break;
            }

            if (imageToDraw && imageToDraw.complete) { 
                ctx.drawImage(imageToDraw, powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
            } else if (!imageToDraw || (baseType === 'POINTS_FIELD' && !imageToDraw)) { 
                ctx.beginPath(); ctx.rect(powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE);
                if (powerUp.type === 'ALL_IN_ONE' && powerUp.timeCreated) {
                    const timeElapsed = currentTime - powerUp.timeCreated;
                    const colorIndex = Math.floor(timeElapsed / RAINBOW_FLASH_INTERVAL) % RAINBOW_COLORS.length;
                    ctx.fillStyle = RAINBOW_COLORS[colorIndex];
                } else {
                    ctx.fillStyle = POWER_UP_COLORS[powerUp.type as PowerUpType] || POWER_UP_COLORS['NONE']!;
                }
                ctx.fill();
                if (powerUp.type === 'DOUBLE_BALL' || powerUp.type === 'BOMB_BRICK' || powerUp.type === 'ALL_IN_ONE' || powerUp.type === 'RECOVERY_PADDLE') {
                    ctx.strokeStyle = (powerUp.type === 'ALL_IN_ONE') ? '#000000' : '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.closePath();
            }
        }
    });
};

export const drawPowerUpPreviews = (ctx: CanvasRenderingContext2D, spawnablePowerUpTypes: Set<PowerUpType>) => {
    const typesArray = Array.from(spawnablePowerUpTypes);
    const totalSpawnable = typesArray.length;
    if (totalSpawnable === 0) return;

    const spacing = (BOARD_WIDTH - (totalSpawnable * POWER_UP_SIZE)) / (totalSpawnable + 1);
    const startY = (BOARD_HEIGHT * 3) / 5; 
    let currentX = spacing;
    const previewAlpha = '80'; 

    ctx.save(); 
    typesArray.forEach((type) => {
        ctx.globalAlpha = parseFloat((parseInt(previewAlpha, 16) / 255).toFixed(2));
        let imageToDraw: HTMLImageElement | null = null;
        const baseType = getBasePowerUpType(type);

        switch (baseType) {
            case 'MULTI_BALL': imageToDraw = multiBallImage; break;
            case 'WIDEN_PADDLE': imageToDraw = widenPaddleImage; break;
            case 'LASER_PADDLE': imageToDraw = laserPaddleImage; break;
            case 'REGEN_BRICK': imageToDraw = regenBrickImage; break;
            case 'UPGRADE_BRICK': imageToDraw = upgradeBrickImage; break;
            case 'REINFORCE_BRICK': imageToDraw = reinforceBrickImage; break;
            case 'SAFETY_NET': imageToDraw = safetyNetImage; break;
            case 'MAKE_SPECIAL': imageToDraw = makeSpecialImage; break;
            case 'RECOVERY_PADDLE': imageToDraw = recoveryPaddleImage; break;
            case 'BOMB_BRICK': imageToDraw = bombBrickImage; break;
            case 'BALL_BRICK': imageToDraw = ballBrickImage; break;
            case 'COLLECTION_FIELD': imageToDraw = collectionFieldImage; break;
            case 'BIG_BALL': imageToDraw = bigBallImage; break;
            case 'DOUBLE_BALL': imageToDraw = blackBallImage; break;
            case 'BUILDER_BALL': imageToDraw = builderBallImage; break;
            case 'HOMING_BALL': imageToDraw = homingBallImage; break;
            case 'PIERCE_BALL': imageToDraw = pierceBallImage; break;
            case 'SPLITTING_BALL': imageToDraw = splittingBallImage; break;
            case 'POINTS_FIELD': imageToDraw = pointsFieldImage; break;
        }
        
        if (imageToDraw && imageToDraw.complete) { 
            ctx.drawImage(imageToDraw, currentX, startY, POWER_UP_SIZE, POWER_UP_SIZE);
        } else if (!imageToDraw || (baseType === 'POINTS_FIELD' && !imageToDraw)) { 
            ctx.globalAlpha = 1.0; 
            const color = POWER_UP_COLORS[type] || POWER_UP_COLORS['NONE']!;
            ctx.fillStyle = color + previewAlpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;

            ctx.beginPath();
            ctx.rect(currentX, startY, POWER_UP_SIZE, POWER_UP_SIZE);
            ctx.fill();
            ctx.stroke();
            ctx.closePath();
        }
        ctx.globalAlpha = 1.0; 
        currentX += POWER_UP_SIZE + spacing;
    });
    ctx.restore(); 
};

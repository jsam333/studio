import { PowerUpType } from '../interfaces';

export let multiBallImage: HTMLImageElement;
export let widenPaddleImage: HTMLImageElement;
export let laserPaddleImage: HTMLImageElement;
export let regenBrickImage: HTMLImageElement;
export let upgradeBrickImage: HTMLImageElement;
export let reinforceBrickImage: HTMLImageElement;
export let safetyNetImage: HTMLImageElement;
export let makeSpecialImage: HTMLImageElement;
export let recoveryPaddleImage: HTMLImageElement;
export let bombBrickImage: HTMLImageElement;
export let ballBrickImage: HTMLImageElement;
export let collectionFieldImage: HTMLImageElement;
export let bigBallImage: HTMLImageElement;
export let blackBallImage: HTMLImageElement;
export let builderBallImage: HTMLImageElement;
export let homingBallImage: HTMLImageElement;
export let pierceBallImage: HTMLImageElement;
export let splittingBallImage: HTMLImageElement;
export let pointsFieldImage: HTMLImageElement;

if (typeof window !== 'undefined') {
    multiBallImage = new Image();
    multiBallImage.src = '/images/multiball.png';
    widenPaddleImage = new Image();
    widenPaddleImage.src = '/images/widen paddle.png';
    laserPaddleImage = new Image();
    laserPaddleImage.src = '/images/laser paddle.png';
    regenBrickImage = new Image();
    regenBrickImage.src = '/images/regen brick.png';
    upgradeBrickImage = new Image();
    upgradeBrickImage.src = '/images/upgrade brick.png';
    reinforceBrickImage = new Image();
    reinforceBrickImage.src = '/images/reinforce brick.png';
    safetyNetImage = new Image();
    safetyNetImage.src = '/images/safety net.png';
    makeSpecialImage = new Image();
    makeSpecialImage.src = '/images/make special.png';
    recoveryPaddleImage = new Image();
    recoveryPaddleImage.src = '/images/sticky paddle.png';
    bombBrickImage = new Image();
    bombBrickImage.src = '/images/bomb brick.png';
    ballBrickImage = new Image();
    ballBrickImage.src = '/images/ball brick.png';
    collectionFieldImage = new Image();
    collectionFieldImage.src = '/images/collection field.png';
    bigBallImage = new Image();
    bigBallImage.src = '/images/big ball.png';
    blackBallImage = new Image();
    blackBallImage.src = '/images/black ball.png';
    builderBallImage = new Image();
    builderBallImage.src = '/images/builder ball.png';
    homingBallImage = new Image();
    homingBallImage.src = '/images/homing ball.png';
    pierceBallImage = new Image();
    pierceBallImage.src = '/images/pierce ball.png';
    splittingBallImage = new Image();
    splittingBallImage.src = '/images/splitting ball.png';
    pointsFieldImage = new Image();
    pointsFieldImage.src = '/images/points field.png';
}

export const getBasePowerUpType = (type: PowerUpType): PowerUpType => {
    const baseType = type.split('_L')[0];
    return baseType as PowerUpType;
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

export const lightenRgb = (rgb: { r: number; g: number; b: number }, factor: number): string => {
    const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor));
    return `rgb(${r},${g},${b})`;
};

export const darkenRgb = (rgb: { r: number; g: number; b: number }, factor: number): string => {
    const r = Math.max(0, Math.round(rgb.r * (1 - factor)));
    const g = Math.max(0, Math.round(rgb.g * (1 - factor)));
    const b = Math.max(0, Math.round(rgb.b * (1 - factor)));
    return `rgb(${r},${g},${b})`;
};

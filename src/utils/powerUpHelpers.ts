import { PowerUpType } from '../interfaces';

export const MAX_LEVEL = 3;

export const getBasePowerUpType = (powerUp: PowerUpType): PowerUpType => {
    const L_INDEX = powerUp.indexOf('_L');
    if (L_INDEX !== -1) {
        return powerUp.substring(0, L_INDEX) as PowerUpType;
    }
    return powerUp;
};

export const getPowerUpLevelFromString = (powerUp: PowerUpType): number => {
    const match = powerUp.match(/_L(\d)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return 1;
};

export const getPowerUpTypeForLevel = (baseType: PowerUpType, level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_LEVEL) return null;
    if (level === 1) return baseType;
    return `${baseType}_L${level}` as PowerUpType;
};

export const getCurrentLevel = (ownedPowerUps: Set<PowerUpType>, baseType: PowerUpType): number => {
    for (let level = MAX_LEVEL; level >= 1; level--) {
        const type = getPowerUpTypeForLevel(baseType, level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
}; 
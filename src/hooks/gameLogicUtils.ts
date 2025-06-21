import { PowerUpType } from '../interfaces';
import { MAX_UPGRADE_LEVEL } from './gameLogicConstants';

/**
 * Returns the specific power-up type string for a given base type and level.
 * If the requested level is 1 the base type is returned unchanged.
 * If the level is out of range ( <1 || >MAX_UPGRADE_LEVEL ) null is returned.
 */
export const getPowerUpTypeForLevel = (
  baseType: PowerUpType,
  level: number
): PowerUpType | null => {
  if (level < 1 || level > MAX_UPGRADE_LEVEL) return null;
  if (level === 1) return baseType; // base type itself represents level 1

  const base = baseType.split('_L')[0] as PowerUpType;
  return `${base}_L${level}` as PowerUpType;
}; 
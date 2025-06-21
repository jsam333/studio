import { PowerUpType } from '../interfaces';
import { ALL_TOGGLEABLE_POWER_UPS } from '../constants';

// Maximum upgrade level for power-ups that support multiple levels.
export const MAX_UPGRADE_LEVEL = 3;

// Every power-up that can be toggled/owned by the player.
export const UPGRADABLE_POWER_UPS: PowerUpType[] = ALL_TOGGLEABLE_POWER_UPS;

// Default levels (level 1) for every power-up in test mode.
export const initialTestPowerUpLevels: Record<PowerUpType, number> = ALL_TOGGLEABLE_POWER_UPS.reduce(
  (acc, type) => {
    acc[type] = 1;
    return acc;
  },
  {} as Record<PowerUpType, number>
); 
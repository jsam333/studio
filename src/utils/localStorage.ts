import { SavedLevelData } from '../interfaces';

export interface GameSessionData {
  level: number;
  gold: number;
  spawnablePowerUps: string[];
  shopItems: string[];
  lives: number;
  totalGoldSpentOnPowerUps: number;
}

export const saveData = <T>(key: string, data: T): void => {
  try {
    const jsonData = JSON.stringify(data);
    localStorage.setItem(key, jsonData);
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
  }
};

export const loadData = <T>(key: string): T | null => {
  try {
    const jsonData = localStorage.getItem(key);
    if (jsonData === null) {
      return null;
    }
    return JSON.parse(jsonData) as T;
  } catch (error) {
    console.error("Error loading data from localStorage:", error);
    return null;
  }
};

export const removeData = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing data from localStorage:", error);
  }
};

// Power-up specific local storage functions
const KEY_PURCHASED_POWER_UPS = 'purchasedPowerUps';

export const addPowerUpToLocalStorage = (powerUp: string): void => {
  const powerUps = loadData<string[]>(KEY_PURCHASED_POWER_UPS) || [];
  if (!powerUps.includes(powerUp)) {
    powerUps.push(powerUp);
    saveData(KEY_PURCHASED_POWER_UPS, powerUps);
  }
};

export const getPowerUpsFromLocalStorage = (): string[] => {
  return loadData<string[]>(KEY_PURCHASED_POWER_UPS) || [];
};

// Highest level specific local storage functions
const KEY_HIGHEST_LEVEL = 'highestLevelReached';

export const saveHighestLevel = (level: number): void => {
  const currentHighest = loadData<number>(KEY_HIGHEST_LEVEL) || 0;
  if (level > currentHighest) {
    saveData(KEY_HIGHEST_LEVEL, level);
  }
};

export const getHighestLevel = (): number => {
  return loadData<number>(KEY_HIGHEST_LEVEL) || 0;
};

// Custom Level Designs
const KEY_SAVED_LEVEL_NAMES = 'savedLevelNames';
const LEVEL_DATA_PREFIX = 'levelData_';

export const getSavedLevelNames = (): string[] => {
  return loadData<string[]>(KEY_SAVED_LEVEL_NAMES) || [];
};

export const saveLevelData = (levelName: string, data: any): boolean => {
  if (!levelName.trim()) {
    console.error("Level name cannot be empty.");
    return false;
  }
  const names = getSavedLevelNames();
  if (!names.includes(levelName)) {
    names.push(levelName);
    saveData(KEY_SAVED_LEVEL_NAMES, names);
  }
  saveData(`${LEVEL_DATA_PREFIX}${levelName}`, data);
  return true;
};

export const loadLevelData = (levelName: string): any | null => {
  return loadData<any>(`${LEVEL_DATA_PREFIX}${levelName}`);
};

export const deleteLevelData = (levelName: string): void => {
  const names = getSavedLevelNames();
  const updatedNames = names.filter(name => name !== levelName);
  saveData(KEY_SAVED_LEVEL_NAMES, updatedNames);
  removeData(`${LEVEL_DATA_PREFIX}${levelName}`);
};

const KEY_GAME_SESSION = 'brickBlastGameSession';

export const saveGameSession = (data: GameSessionData): void => {
  saveData(KEY_GAME_SESSION, data);
};

export const loadGameSession = (): GameSessionData | null => {
  return loadData<GameSessionData>(KEY_GAME_SESSION);
};

export const removeGameSession = (): void => {
  removeData(KEY_GAME_SESSION);
};

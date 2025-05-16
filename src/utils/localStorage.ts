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

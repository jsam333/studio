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

export const addPowerUpToLocalStorage = (powerUp: string): void => {
  const powerUps = loadData<string[]>('purchasedPowerUps') || [];
  if (!powerUps.includes(powerUp)) {
    powerUps.push(powerUp);
    saveData('purchasedPowerUps', powerUps);
  }
};

export const getPowerUpsFromLocalStorage = (): string[] => {
  return loadData<string[]>('purchasedPowerUps') || [];
};

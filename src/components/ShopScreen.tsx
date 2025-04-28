import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { PowerUpType, GameStateRefs } from '../interfaces';
import { POWER_UP_COSTS, ALL_TOGGLEABLE_POWER_UPS, GOLD_COLOR } from '../constants';
import { shuffleArray } from '../utils/helpers';
import { calculateBaseSpawnChance } from '../gameUpdates/gameLoopUtils';

const SHOP_ITEMS_COUNT = 5;
const MAX_MULTIBALL_LEVEL = 3;
const MAX_WIDEN_LEVEL = 3;
const MAX_LASER_LEVEL = 3; // Added max level
const MAX_STICKY_LEVEL = 3; // Added max level

// --- Multiball Helpers ---
const getCurrentMultiballLevel = (ownedPowerUps: Set<PowerUpType>): number => {
    for (let level = MAX_MULTIBALL_LEVEL; level >= 1; level--) {
        const type = getMultiballPowerUpType(level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
};
const getMultiballPowerUpType = (level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_MULTIBALL_LEVEL) return null;
    if (level === 1) return 'MULTI_BALL';
    return `MULTI_BALL_L${level}` as PowerUpType; 
};

// --- Widen Paddle Helpers ---
const getCurrentWidenLevel = (ownedPowerUps: Set<PowerUpType>): number => {
    for (let level = MAX_WIDEN_LEVEL; level >= 1; level--) {
        const type = getWidenPowerUpType(level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
};
const getWidenPowerUpType = (level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_WIDEN_LEVEL) return null;
    if (level === 1) return 'WIDEN_PADDLE';
    return `WIDEN_PADDLE_L${level}` as PowerUpType; 
};

// --- Laser Paddle Helpers ---
const getCurrentLaserLevel = (ownedPowerUps: Set<PowerUpType>): number => {
    for (let level = MAX_LASER_LEVEL; level >= 1; level--) {
        const type = getLaserPowerUpType(level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
};
const getLaserPowerUpType = (level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_LASER_LEVEL) return null;
    if (level === 1) return 'LASER_PADDLE';
    return `LASER_PADDLE_L${level}` as PowerUpType; 
};

// --- Sticky Paddle Helpers ---
const getCurrentStickyLevel = (ownedPowerUps: Set<PowerUpType>): number => {
    for (let level = MAX_STICKY_LEVEL; level >= 1; level--) {
        const type = getStickyPowerUpType(level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
};
const getStickyPowerUpType = (level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_STICKY_LEVEL) return null;
    if (level === 1) return 'STICKY_PADDLE';
    return `STICKY_PADDLE_L${level}` as PowerUpType; 
};

interface ShopScreenProps {
  gameStateRefs: GameStateRefs;
  currentLevel: number;
  addSpawnablePowerUp: (powerUp: PowerUpType) => void;
  startNextLevel: () => void;
  handleResetGame: () => void;
}

export const ShopScreen: React.FC<ShopScreenProps> = ({ 
  gameStateRefs,
  currentLevel,
  addSpawnablePowerUp,
  startNextLevel,
  handleResetGame
}) => {
  const [shopItems, setShopItems] = useState<PowerUpType[]>([]);
  const [purchasedMultiballInSession, setPurchasedMultiballInSession] = useState<boolean>(false);
  const [purchasedWidenInSession, setPurchasedWidenInSession] = useState<boolean>(false); 
  const [purchasedLaserInSession, setPurchasedLaserInSession] = useState<boolean>(false); // Added state
  const [purchasedStickyInSession, setPurchasedStickyInSession] = useState<boolean>(false); // Added state
  const [goldDisplay, setGoldDisplay] = useState(gameStateRefs.goldRef.current);
  const [currentSpawnChance, setCurrentSpawnChance] = useState(0);

  useEffect(() => {
    const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;

    let potentialShopPool = ALL_TOGGLEABLE_POWER_UPS.filter(p => p !== 'ALL_IN_ONE');
    potentialShopPool = shuffleArray(potentialShopPool);
    const currentShopSelection = potentialShopPool.slice(0, SHOP_ITEMS_COUNT);

    setShopItems(currentShopSelection);

    // Reset session purchase tracking
    setPurchasedMultiballInSession(false);
    setPurchasedWidenInSession(false); 
    setPurchasedLaserInSession(false); // Reset
    setPurchasedStickyInSession(false); // Reset
    setGoldDisplay(gameStateRefs.goldRef.current);
    const chance = calculateBaseSpawnChance(ownedPowerUps, 'main');
    setCurrentSpawnChance(chance);

  }, [gameStateRefs.goldRef, gameStateRefs.spawnablePowerUpsRef]);

  const handlePurchase = (itemToPurchase: PowerUpType) => {
    const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;
    let actualItemToAdd: PowerUpType | null = itemToPurchase;
    let cost: number | undefined;
    let isMultiballPurchase = false;
    let isWidenPurchase = false;
    let isLaserPurchase = false;
    let isStickyPurchase = false;

    // Determine actual item and cost for upgradeable power-ups
    if (itemToPurchase === 'MULTI_BALL') {
        isMultiballPurchase = true;
        const currentOwnedLevel = getCurrentMultiballLevel(ownedPowerUps);
        if (currentOwnedLevel >= MAX_MULTIBALL_LEVEL) return; 
        const nextLevel = currentOwnedLevel + 1;
        actualItemToAdd = getMultiballPowerUpType(nextLevel);
    } else if (itemToPurchase === 'WIDEN_PADDLE') {
        isWidenPurchase = true;
        const currentOwnedLevel = getCurrentWidenLevel(ownedPowerUps);
        if (currentOwnedLevel >= MAX_WIDEN_LEVEL) return;
        const nextLevel = currentOwnedLevel + 1;
        actualItemToAdd = getWidenPowerUpType(nextLevel);
    } else if (itemToPurchase === 'LASER_PADDLE') {
        isLaserPurchase = true;
        const currentOwnedLevel = getCurrentLaserLevel(ownedPowerUps);
        if (currentOwnedLevel >= MAX_LASER_LEVEL) return;
        const nextLevel = currentOwnedLevel + 1;
        actualItemToAdd = getLaserPowerUpType(nextLevel);
    } else if (itemToPurchase === 'STICKY_PADDLE') {
        isStickyPurchase = true;
        const currentOwnedLevel = getCurrentStickyLevel(ownedPowerUps);
        if (currentOwnedLevel >= MAX_STICKY_LEVEL) return;
        const nextLevel = currentOwnedLevel + 1;
        actualItemToAdd = getStickyPowerUpType(nextLevel);
    }
    
    if (!actualItemToAdd) {
         console.warn("Could not determine next level for upgradeable item:", itemToPurchase);
         return; // Exit if next level couldn't be determined
    }

    cost = POWER_UP_COSTS[actualItemToAdd as keyof typeof POWER_UP_COSTS] ?? 999;

    // Prevent purchasing if already owned OR if this type was bought this session
    if (ownedPowerUps.has(actualItemToAdd) || 
        (isMultiballPurchase && purchasedMultiballInSession) || 
        (isWidenPurchase && purchasedWidenInSession) ||
        (isLaserPurchase && purchasedLaserInSession) ||
        (isStickyPurchase && purchasedStickyInSession)
    ) {
         console.warn("Attempted to purchase already owned or session-purchased item:", actualItemToAdd);
         return;
    }

    if (gameStateRefs.goldRef.current < cost) return; // Can't afford

    gameStateRefs.goldRef.current -= cost;
    setGoldDisplay(gameStateRefs.goldRef.current);
    addSpawnablePowerUp(actualItemToAdd); // Let addSpawnablePowerUp handle removing lower levels

    // Mark as purchased this session
    if (isMultiballPurchase) setPurchasedMultiballInSession(true);
    if (isWidenPurchase) setPurchasedWidenInSession(true);
    if (isLaserPurchase) setPurchasedLaserInSession(true);
    if (isStickyPurchase) setPurchasedStickyInSession(true);

    const newChance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
    setCurrentSpawnChance(newChance);

    console.log(`Purchased ${actualItemToAdd} for ${cost} gold. Remaining: ${gameStateRefs.goldRef.current}. New Spawn Chance: ${newChance * 100}%`);
  };

  // --- Render Function --- 
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-800 text-white">
      <h1 className="text-4xl font-bold mb-6">Level Complete!</h1>
      {/* Gold & Spawn Chance Display */}
      <div className="flex items-center space-x-6 mb-10">
        <p className="text-3xl" style={{ color: GOLD_COLOR || '#FFD700' }}>
          Gold: {goldDisplay}
        </p>
        <p className="text-xl text-blue-300">
          Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
        </p>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Power-up Shop</h2>
      {/* Shop Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10 w-full max-w-4xl px-4">
        {shopItems.length > 0 ? (
          shopItems.map(item => {
            const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;
            let itemKey = item; 
            let displayName = item.replace(/_/g, ' ');
            let displayCost = POWER_UP_COSTS[item as keyof typeof POWER_UP_COSTS] ?? 999;
            let isDisabled = false;
            let buttonText = `Cost: ${displayCost}`;
            let buttonStyle = 'bg-blue-600 hover:bg-blue-700';
            let itemToPurchaseOnClick = item; 

            // --- Handle Upgradable Power-ups --- 
            if (item === 'MULTI_BALL' || item === 'WIDEN_PADDLE' || item === 'LASER_PADDLE' || item === 'STICKY_PADDLE') {
                 let currentOwnedLevel = 0;
                 let maxLevel = 0;
                 let getLevelTypeFunc: (level: number) => PowerUpType | null = () => null;
                 let purchasedInSession = false;
                 let baseName = '';

                 if (item === 'MULTI_BALL') {
                     currentOwnedLevel = getCurrentMultiballLevel(ownedPowerUps);
                     maxLevel = MAX_MULTIBALL_LEVEL;
                     getLevelTypeFunc = getMultiballPowerUpType;
                     purchasedInSession = purchasedMultiballInSession;
                     baseName = 'Multiball';
                     itemKey = 'MULTI_BALL_UPGRADE';
                 } else if (item === 'WIDEN_PADDLE') {
                     currentOwnedLevel = getCurrentWidenLevel(ownedPowerUps);
                     maxLevel = MAX_WIDEN_LEVEL;
                     getLevelTypeFunc = getWidenPowerUpType;
                     purchasedInSession = purchasedWidenInSession;
                     baseName = 'Widen Paddle';
                     itemKey = 'WIDEN_PADDLE_UPGRADE';
                 } else if (item === 'LASER_PADDLE') {
                     currentOwnedLevel = getCurrentLaserLevel(ownedPowerUps);
                     maxLevel = MAX_LASER_LEVEL;
                     getLevelTypeFunc = getLaserPowerUpType;
                     purchasedInSession = purchasedLaserInSession;
                     baseName = 'Laser Paddle';
                     itemKey = 'LASER_PADDLE_UPGRADE';
                 } else { // STICKY_PADDLE
                     currentOwnedLevel = getCurrentStickyLevel(ownedPowerUps);
                     maxLevel = MAX_STICKY_LEVEL;
                     getLevelTypeFunc = getStickyPowerUpType;
                     purchasedInSession = purchasedStickyInSession;
                     baseName = 'Sticky Paddle';
                     itemKey = 'STICKY_PADDLE_UPGRADE';
                 }

                if (currentOwnedLevel >= maxLevel) {
                    displayName = `${baseName} Lvl ${maxLevel}`;
                    buttonText = '(Max Level)';
                    isDisabled = true;
                    buttonStyle = 'bg-gray-500 opacity-70';
                    const maxLevelType = getLevelTypeFunc(maxLevel);
                    itemToPurchaseOnClick = maxLevelType ? maxLevelType : item;
                } else {
                    const nextLevel = currentOwnedLevel + 1;
                    const nextLevelType = getLevelTypeFunc(nextLevel);
                    if (nextLevelType) {
                        displayName = `${baseName} Lvl ${nextLevel}`;
                        displayCost = POWER_UP_COSTS[nextLevelType as keyof typeof POWER_UP_COSTS] ?? 999;
                        buttonText = `Cost: ${displayCost}`;
                        itemToPurchaseOnClick = item; 
                        isDisabled = goldDisplay < displayCost || purchasedInSession;
                        if (isDisabled) {
                             buttonStyle = purchasedInSession ? 'bg-gray-500 opacity-70' : 'bg-red-800 opacity-50';
                             if (purchasedInSession) buttonText = '(Added)';
                        }
                    } else {
                        displayName = `${baseName} Error`; isDisabled = true;
                    }
                }
            } else {
                 // --- Regular Non-Upgradeable Power-up --- 
                const isGloballyOwned = ownedPowerUps.has(item);
                isDisabled = goldDisplay < displayCost || isGloballyOwned;
                if(isGloballyOwned) {
                     buttonText = '(Owned)';
                     buttonStyle = 'bg-gray-500 opacity-70';
                 } else if (goldDisplay < displayCost) {
                     buttonStyle = 'bg-red-800 opacity-50';
                 }
            }

            return (
              <Button
                key={itemKey}
                onClick={() => handlePurchase(itemToPurchaseOnClick)} 
                disabled={isDisabled}
                className={`py-3 px-2 text-sm flex flex-col h-24 justify-center items-center ${buttonStyle}`}
              >
                <span className="mb-1">{displayName}</span> 
                <span className="text-xs mt-1">{buttonText}</span> 
              </Button>
            );
          })
        ) : (
          <p className="text-center col-span-full">Loading Shop...</p>
        )}
      </div>

      {/* Navigation Buttons */}
      <Button 
        onClick={startNextLevel} 
        className="mb-4 px-6 py-3 text-lg bg-purple-600 hover:bg-purple-700"
      >
        Start Level {currentLevel + 1}
      </Button>
      <Button 
        onClick={handleResetGame} 
        className="px-6 py-3 text-lg bg-yellow-600 hover:bg-yellow-700"
      >
        Back to Menu 
      </Button>
    </div>
  );
};

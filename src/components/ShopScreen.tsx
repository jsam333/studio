import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { PowerUpType, GameStateRefs } from '../interfaces';
import { POWER_UP_COSTS, ALL_TOGGLEABLE_POWER_UPS, GOLD_COLOR, POWER_UP_DESCRIPTIONS } from '../constants'; // Import descriptions
import { shuffleArray } from '../utils/helpers';
import { calculateBaseSpawnChance } from '../gameUpdates/gameLoopUtils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip'; // Import Tooltip components
import { Badge } from './ui/badge'; // Import Badge for displaying power-ups

const SHOP_ITEMS_COUNT = 5;
const MAX_LEVEL = 3; // Universal max level for upgradable power-ups

// --- Generic Get Level Function ---
const getCurrentLevel = (ownedPowerUps: Set<PowerUpType>, baseType: PowerUpType): number => {
    for (let level = MAX_LEVEL; level >= 1; level--) {
        const type = getPowerUpTypeForLevel(baseType, level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
};

// --- Generic Get PowerUpType Function ---
const getPowerUpTypeForLevel = (baseType: PowerUpType, level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_LEVEL) return null;
    if (level === 1) return baseType;
    return `${baseType}_L${level}` as PowerUpType; 
};

// Identify which base types are upgradable
const UPGRADABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', 'WIDEN_PADDLE', 'LASER_PADDLE', 'RECOVERY_PADDLE',
    'REGEN_BRICK', 'SAFETY_NET', 'REINFORCE_BRICK', 'MAKE_SPECIAL', 'BLACK_BALL',
    'PIERCE_BALL', 'UPGRADE_BRICK', 'BUILDER_BALL', 'BIG_BALL', 'SPLITTING_BALL',
    'COLLECTION_FIELD', 'HOMING_BALL', 'BOMB_BRICK',
    'BALL_BRICK', 'POINTS_FIELD' // Added POINTS_FIELD as upgradable
];

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
  const [purchasedInSession, setPurchasedInSession] = useState<Map<PowerUpType, boolean>>(new Map());
  const [goldDisplay, setGoldDisplay] = useState(gameStateRefs.goldRef.current);
  const [currentSpawnChance, setCurrentSpawnChance] = useState(0);
  const [displaySpawnablePowerUps, setDisplaySpawnablePowerUps] = useState<PowerUpType[]>([]);

  useEffect(() => {
    const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;

    let potentialShopPool = ALL_TOGGLEABLE_POWER_UPS.filter(p => p !== 'ALL_IN_ONE');
    potentialShopPool = shuffleArray(potentialShopPool);
    const currentShopSelection = potentialShopPool.slice(0, SHOP_ITEMS_COUNT);

    setShopItems(currentShopSelection);

    setPurchasedInSession(new Map()); 
    setGoldDisplay(gameStateRefs.goldRef.current);
    const chance = calculateBaseSpawnChance(ownedPowerUps, 'main');
    setCurrentSpawnChance(chance);
    setDisplaySpawnablePowerUps(Array.from(ownedPowerUps).sort());

  }, [gameStateRefs.goldRef, gameStateRefs.spawnablePowerUpsRef]);

  const handlePurchase = (itemToPurchase: PowerUpType) => {
    const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;
    let actualItemToAdd: PowerUpType | null = itemToPurchase;
    let cost: number | undefined;
    let isUpgradePurchase = false;
    let baseTypeOfUpgrade: PowerUpType | null = null;

    if (UPGRADABLE_POWER_UPS.includes(itemToPurchase)) {
        isUpgradePurchase = true;
        baseTypeOfUpgrade = itemToPurchase;
        const currentOwnedLevel = getCurrentLevel(ownedPowerUps, baseTypeOfUpgrade);
        
        if (currentOwnedLevel >= MAX_LEVEL) {
            console.warn("Attempted to purchase max level item:", baseTypeOfUpgrade);
            return; 
        }
        const nextLevel = currentOwnedLevel + 1;
        actualItemToAdd = getPowerUpTypeForLevel(baseTypeOfUpgrade, nextLevel);
        if (!actualItemToAdd) {
             console.error("Could not determine next level type for:", baseTypeOfUpgrade);
             return; 
        }
    } 
    
    if (!actualItemToAdd) {
         console.error("actualItemToAdd is null, cannot proceed with purchase.");
         return;
    }

    cost = POWER_UP_COSTS[actualItemToAdd as keyof typeof POWER_UP_COSTS] ?? 999;

    if (ownedPowerUps.has(actualItemToAdd) || 
        (isUpgradePurchase && baseTypeOfUpgrade && purchasedInSession.get(baseTypeOfUpgrade))
    ) {
         console.warn("Attempted to purchase already owned or session-purchased item:", actualItemToAdd);
         return;
    }

    if (gameStateRefs.goldRef.current < cost) return;

    gameStateRefs.goldRef.current -= cost;
    setGoldDisplay(gameStateRefs.goldRef.current);
    addSpawnablePowerUp(actualItemToAdd);

    if (isUpgradePurchase && baseTypeOfUpgrade) {
        setPurchasedInSession(prev => new Map(prev).set(baseTypeOfUpgrade!, true));
    }

    const newChance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
    setCurrentSpawnChance(newChance);
    setDisplaySpawnablePowerUps(Array.from(gameStateRefs.spawnablePowerUpsRef.current).sort());

    console.log(`Purchased ${actualItemToAdd} for ${cost} gold. Remaining: ${gameStateRefs.goldRef.current}. New Spawn Chance: ${newChance * 100}%`);
  };

  return (
    <TooltipProvider>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white py-8">
            <h1 className="text-4xl font-bold mb-6">Level Complete!</h1>
            <div className="flex items-center space-x-6 mb-6">
                <p className="text-3xl" style={{ color: GOLD_COLOR || '#FFD700' }}>
                    Gold: {goldDisplay}
                </p>
                <p className="text-xl text-blue-300">
                    Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
                </p>
            </div>

            <div className="mb-4 px-4 w-full max-w-4xl">
                <h3 className="text-xl font-semibold mb-3 text-center">Currently Active Power-ups</h3>
                {displaySpawnablePowerUps.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                        {displaySpawnablePowerUps.map(powerUp => (
                            <Badge key={powerUp} variant="secondary" className="text-sm whitespace-nowrap">
                                {powerUp.replace(/_/g, ' ')}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 italic">No power-ups active yet.</p>
                )}
            </div>

            <h2 className="text-2xl font-semibold mb-4">Power-up Shop</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-y-1 sm:gap-2 md:gap-4 mb-4 md:mb-10 w-full max-w-4xl px-4">
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
                        let descriptionType : PowerUpType | string = item;
                        const isBaseUpgradable = UPGRADABLE_POWER_UPS.includes(item);

                        if (isBaseUpgradable) {
                            const baseName = displayName;
                            itemKey = `${item}_UPGRADE`;
                            const currentOwnedLevel = getCurrentLevel(ownedPowerUps, item);
                            const hasPurchasedThisSession = purchasedInSession.get(item) ?? false;

                            if (currentOwnedLevel >= MAX_LEVEL) {
                                displayName = `${baseName} Lvl ${MAX_LEVEL}`;
                                buttonText = '(Max Level)';
                                isDisabled = true;
                                buttonStyle = 'bg-gray-500 opacity-70';
                                const maxLevelType = getPowerUpTypeForLevel(item, MAX_LEVEL);
                                itemToPurchaseOnClick = maxLevelType ? maxLevelType : item;
                                descriptionType = itemToPurchaseOnClick;
                            } else {
                                const nextLevel = currentOwnedLevel + 1;
                                const nextLevelType = getPowerUpTypeForLevel(item, nextLevel);
                                if (nextLevelType) {
                                    displayName = `${baseName} Lvl ${nextLevel}`;
                                    displayCost = POWER_UP_COSTS[nextLevelType as keyof typeof POWER_UP_COSTS] ?? 999;
                                    buttonText = `Cost: ${displayCost}`;
                                    itemToPurchaseOnClick = item; 
                                    descriptionType = nextLevelType;
                                    isDisabled = goldDisplay < displayCost || hasPurchasedThisSession;
                                    if (isDisabled) {
                                        buttonStyle = hasPurchasedThisSession ? 'bg-gray-500 opacity-70' : 'bg-red-800 opacity-50';
                                        if (hasPurchasedThisSession) buttonText = '(Added)';
                                    }
                                } else {
                                    displayName = `${baseName} Error`; isDisabled = true;
                                    descriptionType = item;
                                }
                            }
                        } else {
                            const isGloballyOwned = ownedPowerUps.has(item);
                            const wasUpgraded = UPGRADABLE_POWER_UPS.some(up => item.startsWith(up) && item !== up);
                            isDisabled = goldDisplay < displayCost || isGloballyOwned || wasUpgraded;
                            descriptionType = item;

                            if (isGloballyOwned || wasUpgraded) {
                                buttonText = '(Owned)';
                                buttonStyle = 'bg-gray-500 opacity-70';
                            } else if (goldDisplay < displayCost) {
                                buttonStyle = 'bg-red-800 opacity-50';
                            }
                        }

                        const description = POWER_UP_DESCRIPTIONS[descriptionType] ?? "No description available.";

                        return (
                            <Tooltip key={itemKey}>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => handlePurchase(itemToPurchaseOnClick)}
                                        disabled={isDisabled}
                                        className={`py-2 px-1 text-xs flex flex-col h-16 md:h-20 justify-center items-center ${buttonStyle}`}
                                    >
                                        <span className="mb-1 text-xs">{displayName}</span>
                                        <span className="text-xs mt-1">{buttonText}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{description}</p>
                                </TooltipContent>
                            </Tooltip>
                        );
                    })
                ) : (
                    <p className="text-center col-span-full">Loading Shop...</p>
                )}
            </div>

            <div className="flex flex-col items-center">
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
        </div>
    </TooltipProvider>
  );
};

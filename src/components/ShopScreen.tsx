import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { PowerUpType, GameStateRefs, Brick } from '../interfaces';
import { 
    POWER_UP_COSTS, 
    ALL_TOGGLEABLE_POWER_UPS, 
    GOLD_COLOR, 
    POWER_UP_DESCRIPTIONS, 
    POWER_UP_IMAGE_PATHS
} from '../constants'; 
import { shuffleArray } from '../utils/helpers';
import { calculateBaseSpawnChance } from '../gameUpdates/gameLoopUtils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip'; 
import { 
    addPowerUpToLocalStorage, 
    getPowerUpsFromLocalStorage, 
    saveHighestLevel, 
    getHighestLevel
} from '../utils/localStorage'; 
import BrickPreview from './BrickPreview';
import { getBrickConfiguration, getLevelStats } from '../hooks/useLevelLogic'; 
import { initializeBricks } from '../gameLogic';

const SHOP_ITEMS_COUNT = 5;
const MAX_LEVEL = 3; 

interface NextLevelInfo {
    totalBricks: number;
    targetScore: number;
}

const getCurrentLevel = (ownedPowerUps: Set<PowerUpType>, baseType: PowerUpType): number => {
    for (let level = MAX_LEVEL; level >= 1; level--) {
        const type = getPowerUpTypeForLevel(baseType, level);
        if (type && ownedPowerUps.has(type)) return level;
    }
    return 0;
};

const getPowerUpTypeForLevel = (baseType: PowerUpType, level: number): PowerUpType | null => {
    if (level < 1 || level > MAX_LEVEL) return null;
    if (level === 1) return baseType;
    return `${baseType}_L${level}` as PowerUpType; 
};

const getBasePowerUpType = (powerUp: PowerUpType): PowerUpType => {
    const L_INDEX = powerUp.indexOf('_L');
    if (L_INDEX !== -1) {
        return powerUp.substring(0, L_INDEX) as PowerUpType;
    }
    return powerUp;
};

const getPowerUpLevelFromString = (powerUp: PowerUpType): number => {
    const match = powerUp.match(/_L(\d)$/);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    return 1; 
};

const UPGRADABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', 'WIDEN_PADDLE', 'LASER_PADDLE', 'RECOVERY_PADDLE',
    'REGEN_BRICK', 'SAFETY_NET', 'REINFORCE_BRICK', 'MAKE_SPECIAL', 'BLACK_BALL',
    'PIERCE_BALL', 'UPGRADE_BRICK', 'BUILDER_BALL', 'BIG_BALL', 'SPLITTING_BALL',
    'COLLECTION_FIELD', 'HOMING_BALL', 'BOMB_BRICK',
    'BALL_BRICK', 'POINTS_FIELD' 
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
  const [knownPowerUps, setKnownPowerUps] = useState<string[]>([]);
  const [nextLevelBricksPreview, setNextLevelBricksPreview] = useState<Brick[][] | null>(null);
  const [nextLevelInfo, setNextLevelInfo] = useState<NextLevelInfo | null>(null); 
  const [highestLevelReachedByPlayer, setHighestLevelReachedByPlayer] = useState<number>(0); 

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
    setKnownPowerUps(getPowerUpsFromLocalStorage());
    setHighestLevelReachedByPlayer(getHighestLevel()); 
  }, [gameStateRefs.goldRef, gameStateRefs.spawnablePowerUpsRef]);

  useEffect(() => {
    const nextLevelVal = currentLevel + 1;
    const gameMode = gameStateRefs.gameModeRef.current;

    if (highestLevelReachedByPlayer >= nextLevelVal) {
      const config = getBrickConfiguration(nextLevelVal, gameMode);
      if (config) {
        const bricks = initializeBricks(config.brickColumns, config.brickRows, config.brickHeight, nextLevelVal, gameMode);
        setNextLevelBricksPreview(bricks);
      } else {
        setNextLevelBricksPreview(null);
      }
      const stats = getLevelStats(nextLevelVal, gameMode);
      setNextLevelInfo(stats);
    } else {
      setNextLevelBricksPreview(null);
      setNextLevelInfo(null);
    }
  }, [currentLevel, gameStateRefs.gameModeRef, highestLevelReachedByPlayer]);

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
        if (currentOwnedLevel >= MAX_LEVEL) return;
        const nextLevelNum = currentOwnedLevel + 1;
        actualItemToAdd = getPowerUpTypeForLevel(baseTypeOfUpgrade, nextLevelNum);
        if (!actualItemToAdd) return;
    } 
    if (!actualItemToAdd) return;

    cost = POWER_UP_COSTS[actualItemToAdd as keyof typeof POWER_UP_COSTS] ?? 999;
    if (ownedPowerUps.has(actualItemToAdd) || 
        (isUpgradePurchase && baseTypeOfUpgrade && purchasedInSession.get(baseTypeOfUpgrade))
    ) return;

    if (gameStateRefs.goldRef.current < cost) return;

    gameStateRefs.goldRef.current -= cost;
    setGoldDisplay(gameStateRefs.goldRef.current);
    addSpawnablePowerUp(actualItemToAdd);

    const baseOfAddedItem = getBasePowerUpType(actualItemToAdd);
    if (getPowerUpLevelFromString(actualItemToAdd) === 1 && !knownPowerUps.includes(baseOfAddedItem)) {
      addPowerUpToLocalStorage(baseOfAddedItem);
      setKnownPowerUps(prev => [...prev, baseOfAddedItem]);
    }

    if (isUpgradePurchase && baseTypeOfUpgrade) {
        setPurchasedInSession(prev => new Map(prev).set(baseTypeOfUpgrade!, true));
    }
    const newChance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
    setCurrentSpawnChance(newChance);
    setDisplaySpawnablePowerUps(Array.from(gameStateRefs.spawnablePowerUpsRef.current).sort());
  };

  const handleStartNextLevel = () => {
    const levelToStart = currentLevel + 1;
    saveHighestLevel(levelToStart); 
    if (levelToStart > highestLevelReachedByPlayer) {
        setHighestLevelReachedByPlayer(levelToStart);
    }
    startNextLevel(); 
  };

  const canPreviewNextLevel = highestLevelReachedByPlayer >= (currentLevel + 1);

  return (
    <TooltipProvider>
        <div className="flex flex-col h-full w-full bg-gray-800 text-white">
            {/* Scrollable Content Area */}
            <div className="flex-grow overflow-y-auto">
                {/* Owned PowerUps Display */}
                <div className="w-full max-w-4xl mb-4 mx-auto">
                    {displaySpawnablePowerUps.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-2 p-2 bg-black bg-opacity-20 rounded">
                            {displaySpawnablePowerUps.map(powerUp => {
                                const baseType = getBasePowerUpType(powerUp);
                                const imagePath = POWER_UP_IMAGE_PATHS[baseType];
                                const displayName = powerUp.replace(/_/g, ' ');
                                const level = getPowerUpLevelFromString(powerUp);
                                return (
                                    <Tooltip key={powerUp}>
                                        <TooltipTrigger asChild>
                                            <div className="p-1 border border-gray-500 rounded bg-gray-700 flex flex-col items-center">
                                                {imagePath ? (
                                                    <img 
                                                        src={imagePath} 
                                                        alt={displayName} 
                                                        className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                                                    />
                                                ) : (
                                                    <div 
                                                        className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-400 flex items-center justify-center text-white font-bold rounded text-xs"
                                                        aria-label={displayName} 
                                                    >{baseType.substring(0,1)}</div> 
                                                )}
                                                {level > 1 && (
                                                    <span className="text-xs font-bold mt-0.5">L{level}</span>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{displayName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 italic p-2 bg-black bg-opacity-20 rounded">No power-ups active.</div>
                    )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold my-4 sm:my-6 text-center">Buy Something!</h1>
                
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 mb-4 sm:mb-6">
                    <p className="text-2xl sm:text-3xl" style={{ color: GOLD_COLOR || '#FFD700' }}>
                        Gold: {goldDisplay}
                    </p>
                    <p className="text-lg sm:text-xl text-blue-300">
                        Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
                    </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-10 w-full max-w-2xl mx-auto">
                    {shopItems.length > 0 ? (
                        shopItems.map(item => {
                            const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;
                            let itemKey = item;
                            let displayName = item.replace(/_/g, ' '); 
                            let displayCost = POWER_UP_COSTS[item as keyof typeof POWER_UP_COSTS] ?? 999;
                            let isDisabled = false;
                            let buttonText = `Cost: ${displayCost}`;
                            let buttonStyle = 'bg-gray-800 hover:bg-gray-700';
                            let itemToPurchaseOnClick = item;
                            let descriptionType : PowerUpType | string = item; 
                            let baseItemForImage = getBasePowerUpType(item);
                            let offeredLevel = 1;

                            if (UPGRADABLE_POWER_UPS.includes(item)) {
                                const baseName = displayName;
                                itemKey = `${item}_UPGRADE`;
                                const currentOwnedLevel = getCurrentLevel(ownedPowerUps, item);
                                const hasPurchasedThisSession = purchasedInSession.get(item) ?? false;
                                
                                if (currentOwnedLevel >= MAX_LEVEL) {
                                    displayName = `${baseName} Lvl ${MAX_LEVEL}`;
                                    buttonText = '(Max Lvl)';
                                    isDisabled = true;
                                    buttonStyle = 'bg-gray-500 opacity-70';
                                    const maxLevelType = getPowerUpTypeForLevel(item, MAX_LEVEL);
                                    itemToPurchaseOnClick = maxLevelType ? maxLevelType : item;
                                    descriptionType = itemToPurchaseOnClick;
                                    offeredLevel = MAX_LEVEL;
                                } else {
                                    const nextLevelNum = currentOwnedLevel + 1;
                                    const nextLevelType = getPowerUpTypeForLevel(item, nextLevelNum);
                                    if (nextLevelType) {
                                        displayName = `${baseName} Lvl ${nextLevelNum}`;
                                        displayCost = POWER_UP_COSTS[nextLevelType as keyof typeof POWER_UP_COSTS] ?? 999;
                                        buttonText = `Cost: ${displayCost}`;
                                        itemToPurchaseOnClick = item; 
                                        descriptionType = nextLevelType;
                                        offeredLevel = nextLevelNum;
                                        isDisabled = goldDisplay < displayCost || hasPurchasedThisSession;
                                        if (isDisabled) {
                                            buttonStyle = hasPurchasedThisSession ? 'bg-gray-500 opacity-70' : 'bg-red-800 opacity-50';
                                            if (hasPurchasedThisSession) buttonText = '(Added)';
                                        }
                                    } else {
                                        displayName = `${baseName} Error`; isDisabled = true;
                                        descriptionType = item;
                                        offeredLevel = 1; 
                                    }
                                }
                            } else {
                                const isGloballyOwned = ownedPowerUps.has(item);
                                const wasUpgraded = UPGRADABLE_POWER_UPS.some(up => item.startsWith(up) && item !== up);
                                isDisabled = goldDisplay < displayCost || isGloballyOwned || wasUpgraded;
                                descriptionType = item;
                                offeredLevel = getPowerUpLevelFromString(item); 

                                if (isGloballyOwned || wasUpgraded) {
                                    buttonText = '(Owned)';
                                    buttonStyle = 'bg-gray-500 opacity-70';
                                } else if (goldDisplay < displayCost) {
                                    buttonStyle = 'bg-red-800 opacity-50';
                                }
                            }

                            let levelToShowOnButton = offeredLevel;
                            if (UPGRADABLE_POWER_UPS.includes(item) && purchasedInSession.get(item)) {
                                levelToShowOnButton = getCurrentLevel(ownedPowerUps, item);
                            }
                            
                            const imagePath = POWER_UP_IMAGE_PATHS[baseItemForImage as PowerUpType];
                            const description = POWER_UP_DESCRIPTIONS[descriptionType] ?? "No description available.";
                            const isKnown = knownPowerUps.includes(baseItemForImage);

                            return (
                                <Tooltip key={itemKey}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => handlePurchase(itemToPurchaseOnClick)}
                                            disabled={isDisabled}
                                            className={`py-2 px-1 text-xs text-white flex flex-col h-20 sm:h-24 md:h-28 justify-around items-center ${buttonStyle} border border-white`}
                                        >
                                            {imagePath ? (
                                                <img 
                                                    src={imagePath} 
                                                    alt={displayName} 
                                                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                                                />
                                            ) : (
                                                <div 
                                                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-gray-400 flex items-center justify-center text-white font-bold"
                                                    aria-label={displayName} 
                                                >?</div>
                                            )}
                                            {UPGRADABLE_POWER_UPS.includes(item) && levelToShowOnButton > 1 && (
                                                <span className="text-xs font-bold mt-0.5">L{levelToShowOnButton}</span>
                                            )}
                                            <span className="text-xs">{buttonText}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {isKnown ? (
                                            <p>{displayName} - {description}</p> 
                                        ) : (
                                            <p>???</p>
                                        )}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    ) : (
                        <p className="text-center col-span-full">Loading Shop...</p>
                    )}
                </div>
            </div>

            {/* Footer Area */}
            <div className={`px-4 py-2 flex items-center border-t border-gray-700 ${canPreviewNextLevel ? 'justify-between' : 'justify-center'}`}>
                {/* Left side: Buttons */}
                <div className="flex flex-col space-y-2">
                    <Button
                        onClick={handleStartNextLevel} 
                        className="px-6 py-3 text-lg text-white bg-gray-800 hover:bg-gray-700 border border-purple-600"
                    >
                        Start Level {currentLevel + 1}
                    </Button>
                    <Button
                        onClick={handleResetGame}
                        className="px-6 py-3 text-lg text-white bg-gray-800 hover:bg-gray-700 border border-yellow-600"
                    >
                        Back to Menu
                    </Button>
                </div>

                {/* Middle: Level Info */}
                {canPreviewNextLevel && (
                    <div className="flex flex-col items-center text-sm mx-4">
                        <p>Level {currentLevel + 1}</p>
                        {nextLevelInfo ? (
                            <>
                                <p>Total Bricks: {nextLevelInfo.totalBricks}</p>
                                <p>Score Target: {nextLevelInfo.targetScore}</p>
                            </>
                        ) : (
                            <p>Loading info...</p>
                        )}
                    </div>
                )}

                {/* Right side: Brick Preview */}
                {canPreviewNextLevel && nextLevelBricksPreview && (
                    <div>
                        <BrickPreview bricks={nextLevelBricksPreview} previewWidth={300} previewHeight={50} />
                    </div>
                )}
            </div>
        </div>
    </TooltipProvider>
  );
};

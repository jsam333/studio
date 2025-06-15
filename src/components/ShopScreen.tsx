import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { PowerUpType, GameStateRefs, Brick } from '../interfaces';
import {
    POWER_UP_COSTS,
    ALL_TOGGLEABLE_POWER_UPS,
    GOLD_COLOR,
    POWER_UP_DESCRIPTIONS,
    POWER_UP_IMAGE_PATHS,
    BASE_SHOP_WIDTH,
    BASE_SHOP_HEIGHT,
    POWER_UP_REROLL_COST,
    BOARD_WIDTH,
    BOARD_HEIGHT
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
import LevelPreview from './LevelPreview';
import { getBrickConfiguration, getLevelStats } from '../hooks/useLevelLogic';
import { initializeBricks } from '../gameLogic';
import {
    MAX_LEVEL,
    getCurrentLevel,
    getPowerUpTypeForLevel,
    getBasePowerUpType,
    getPowerUpLevelFromString
} from '../utils/powerUpHelpers';
import { OwnedPowerUpsDisplay } from './OwnedPowerUpsDisplay';

const SHOP_ITEMS_COUNT = 5;

interface NextLevelInfo {
    totalBricks: number;
    targetScore: number;
}

const UPGRADABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', 'WIDEN_PADDLE', 'LASER_PADDLE', 'RECOVERY_PADDLE',
    'REGEN_BRICK', 'SAFETY_NET', 'REINFORCE_BRICK', 'MAKE_SPECIAL', 'DOUBLE_BALL',
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
  const [nextLevelInfo, setNextLevelInfo] = useState<NextLevelInfo | null>(null);
  const [nextLevelBeatTime, setNextLevelBeatTime] = useState<number | null>(null);
  const [highestLevelReachedByPlayer, setHighestLevelReachedByPlayer] = useState<number>(0);
  const [scaleFactor, setScaleFactor] = useState(1);

  const updateScaleFactor = useCallback(() => {
    const currentWidth = window.innerWidth;
    const currentHeight = window.innerHeight;
    const scaleX = currentWidth / BASE_SHOP_WIDTH;
    const scaleY = currentHeight / BASE_SHOP_HEIGHT;
    setScaleFactor(Math.min(scaleX, scaleY));
  }, []);

  useEffect(() => {
    updateScaleFactor();
    window.addEventListener('resize', updateScaleFactor);
    return () => window.removeEventListener('resize', updateScaleFactor);
  }, [updateScaleFactor]);

  const generateShopItems = useCallback(() => {
    const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;
    let potentialShopPool = ALL_TOGGLEABLE_POWER_UPS.filter(p => p !== 'ALL_IN_ONE');
    potentialShopPool = shuffleArray(potentialShopPool);
    const currentShopSelection = potentialShopPool.slice(0, SHOP_ITEMS_COUNT);
    setShopItems(currentShopSelection);
    setPurchasedInSession(new Map()); // Reset purchases when items reroll
  }, [gameStateRefs.spawnablePowerUpsRef]);

  useEffect(() => {
    generateShopItems();
    setGoldDisplay(gameStateRefs.goldRef.current);
    const chance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
    setCurrentSpawnChance(chance);
    setDisplaySpawnablePowerUps(Array.from(gameStateRefs.spawnablePowerUpsRef.current).sort());
    setKnownPowerUps(getPowerUpsFromLocalStorage());
    setHighestLevelReachedByPlayer(getHighestLevel());
  }, [gameStateRefs.goldRef, gameStateRefs.spawnablePowerUpsRef, generateShopItems]);

  useEffect(() => {
    const nextLevelVal = currentLevel + 1;
    const gameMode = gameStateRefs.gameModeRef.current;

    if (highestLevelReachedByPlayer >= nextLevelVal) {
      const stats = getLevelStats(nextLevelVal, gameMode);
      setNextLevelInfo(stats);

      // Calculate time to beat
      const baseDelay = 5000; 
      const incrementPerLevel = 900;
      let startDelayForNextLevel = baseDelay + (nextLevelVal - 1) * incrementPerLevel;
      const maxDelayForLevel20 = baseDelay + (20 - 1) * incrementPerLevel;
      if (startDelayForNextLevel > maxDelayForLevel20 && nextLevelVal > 20) {
        startDelayForNextLevel = maxDelayForLevel20;
      }
      const totalTimeToBeat = startDelayForNextLevel + 17500; // 17500ms includes bonus gold timer and final countdown
      setNextLevelBeatTime(totalTimeToBeat);

    } else {
      setNextLevelInfo(null);
      setNextLevelBeatTime(null);
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

    gameStateRefs.soundSystemRef.current?.playShopPurchaseSound();
    gameStateRefs.goldRef.current -= cost;
    gameStateRefs.totalGoldSpentOnPowerUpsRef.current += cost;
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

  const handleReroll = () => {
    if (gameStateRefs.goldRef.current >= POWER_UP_REROLL_COST) {
        gameStateRefs.goldRef.current -= POWER_UP_REROLL_COST;
        setGoldDisplay(gameStateRefs.goldRef.current);
        generateShopItems(); // This will generate new items and reset purchasedInSession
    } else {
        // Optionally, provide feedback that the player doesn't have enough gold
        console.log("Not enough gold to reroll.");
    }
  };

  const handleStartNextLevel = () => {
    const levelToStart = currentLevel + 1;
    saveHighestLevel(levelToStart);
    if (levelToStart > highestLevelReachedByPlayer) {
        setHighestLevelReachedByPlayer(levelToStart);
    }
    startNextLevel();
  };

  const canPreviewNextLevel = true;

  // Scaled values helper
  const scaled = {
    fontSize: (base: number) => Math.max(8, base * scaleFactor),
    px: (base: number) => base * scaleFactor,
    py: (base: number) => base * scaleFactor,
    p: (base: number) => base * scaleFactor,
    gap: (base: number) => base * scaleFactor,
    h: (base: number) => base * scaleFactor,
    w: (base: number) => base * scaleFactor,
    my: (base: number) => base * scaleFactor,
    mb: (base: number) => base * scaleFactor,
    mx: (base: number) => base * scaleFactor,
    iconSizeMd: 32 * scaleFactor,
    buttonHeightMd: 125 * scaleFactor, // For shop item buttons
    footerButtonHeight: 48 * scaleFactor, // For Start Level / Back to Menu buttons
    imageSizeMd: 40 * scaleFactor,
  };

  return (
    <TooltipProvider>
        <div
            className="flex flex-col h-full w-full bg-gray-800 text-white"
            style={{ fontSize: scaled.fontSize(16) }} // Base font size for the screen
        >
            {/* Scrollable Content Area */}
            <div className="flex-grow overflow-auto"> 
                <OwnedPowerUpsDisplay spawnablePowerUps={new Set(displaySpawnablePowerUps)} scaled={scaled} />

                <h1
                    className="font-bold text-center"
                    style={{
                        fontSize: scaled.fontSize(30),
                        marginBottom: scaled.my(10)
                    }}
                >
                    Buy Something!</h1>

                <div
                    className="flex flex-row items-center justify-center"
                    style={{
                        gap: scaled.gap(12),
                        marginBottom: scaled.mb(12)
                    }}
                >
                    <p
                        style={{
                            fontSize: scaled.fontSize(24),
                            color: GOLD_COLOR || '#FFD700'
                        }}
                    >
                        Gold: {goldDisplay}
                    </p>
                    <Button
                        onClick={handleReroll}
                        disabled={goldDisplay < POWER_UP_REROLL_COST}
                        className="text-white bg-blue-600 hover:bg-blue-500 border border-white disabled:opacity-50"
                        style={{
                            fontSize: scaled.fontSize(14),
                            padding: `${scaled.py(4)}px ${scaled.px(8)}px`,
                            height: scaled.footerButtonHeight,
                            minHeight: scaled.h(36)
                        }}
                    >
                        Reroll ({POWER_UP_REROLL_COST} Gold)
                    </Button>
                    <p
                        className="text-blue-300"
                        style={{
                            fontSize: scaled.fontSize(18)
                        }}
                    >
                        Powerup Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
                    </p>
                </div>

                <div
                    className="grid grid-cols-5 mx-auto" 
                    style={{
                        gap: scaled.gap(12),
                        width: '100%',
                        maxWidth: scaled.w(750),
                        minWidth: scaled.w(624),
                    }}
                >
                    {shopItems.length > 0 ? (
                        shopItems.map(item => {
                            const ownedPowerUps = gameStateRefs.spawnablePowerUpsRef.current;
                            let itemKey = item;
                            let displayName = item.replace(/_/g, ' ');
                            let displayCost = POWER_UP_COSTS[item as keyof typeof POWER_UP_COSTS] ?? 999;
                            let isDisabled = false;
                            let buttonText = `Cost: ${displayCost}`;
                            let buttonBgColor = 'bg-gray-800 hover:bg-gray-700';
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
                                    buttonBgColor = 'bg-gray-500 opacity-70';
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
                                            buttonBgColor = hasPurchasedThisSession ? 'bg-gray-500 opacity-70' : 'bg-red-800 opacity-50';
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
                                    buttonBgColor = 'bg-gray-500 opacity-70';
                                } else if (goldDisplay < displayCost) {
                                    buttonBgColor = 'bg-red-800 opacity-50';
                                }
                            }

                            let levelToShowOnButton = offeredLevel;
                            if (UPGRADABLE_POWER_UPS.includes(item) && purchasedInSession.get(item)) {
                                levelToShowOnButton = getCurrentLevel(ownedPowerUps, item);
                            }

                            const imagePath = POWER_UP_IMAGE_PATHS[baseItemForImage as PowerUpType];
                            const description = POWER_UP_DESCRIPTIONS[descriptionType] ?? "No description available.";
                            const isKnown = knownPowerUps.includes(baseItemForImage);
                            const showLevelIndicator = UPGRADABLE_POWER_UPS.includes(item) && levelToShowOnButton > 1;

                            return (
                                <div key={itemKey} className="flex flex-col h-full bg-gray-800 rounded-lg border border-gray-600 overflow-hidden">
                                    <Button
                                        onClick={() => handlePurchase(itemToPurchaseOnClick)}
                                        disabled={isDisabled}
                                        className={`text-white flex flex-col justify-center items-center ${buttonBgColor} rounded-none border-b border-gray-600`}
                                        style={{
                                            paddingTop: scaled.py(8),
                                            paddingBottom: scaled.py(8),
                                            paddingLeft: scaled.px(4),
                                            paddingRight: scaled.px(4),
                                            fontSize: scaled.fontSize(12),
                                            height: scaled.buttonHeightMd,
                                        }}
                                    >
                                        {/* Icon */}
                                        {imagePath ? (
                                            <img
                                                src={imagePath}
                                                alt={displayName}
                                                className="object-contain"
                                                style={{
                                                    width: scaled.imageSizeMd,
                                                    height: scaled.imageSizeMd,
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-md bg-gray-400 flex items-center justify-center text-white font-bold"
                                                aria-label={displayName}
                                                style={{
                                                    width: scaled.imageSizeMd,
                                                    height: scaled.imageSizeMd,
                                                }}
                                            >?</div>
                                        )}

                                        {/* Text block wrapper */}
                                        <div style={{ marginTop: 0 }} className="flex flex-col items-center">
                                            {showLevelIndicator && (
                                                <span
                                                    className="font-bold block"
                                                    style={{ fontSize: scaled.fontSize(12) }}
                                                >
                                                    L{levelToShowOnButton}
                                                </span>
                                            )}
                                            <span 
                                                className="block"
                                                style={{ fontSize: scaled.fontSize(12) }}
                                            >
                                                {buttonText}
                                            </span>
                                        </div>
                                    </Button>
                                    <div 
                                        className="px-1 py-1 flex-grow flex items-center justify-center text-center bg-black bg-opacity-25"
                                        style={{fontSize: scaled.fontSize(12), height: scaled.h(78)}}
                                    >
                                        {isKnown ? (
                                            <p><span className="font-bold">{displayName}:</span> {description}</p>
                                        ) : (
                                            <p>???</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center col-span-full" style={{fontSize: scaled.fontSize(14)}}>Loading Shop...</p>
                    )}
                </div>
            </div>

            {/* Footer Area */}
            <div
                className={`flex items-center border-t border-gray-700 ${canPreviewNextLevel ? 'justify-between' : 'justify-center'}`}
                style={{
                    paddingLeft: scaled.px(16),
                    paddingRight: scaled.px(16),
                    paddingTop: scaled.py(8),
                    paddingBottom: scaled.py(8),
                    height: scaled.h(155),
                    minHeight: scaled.h(145)
                }}
            >
                <div className="flex flex-col" style={{gap: scaled.gap(8)}}>
                    <Button
                        onClick={handleStartNextLevel}
                        className="bg-gray-800 hover:bg-gray-700 text-white border border-white transition-all hover:border-purple-400 hover:text-purple-300"
                        style={{
                            paddingLeft: scaled.px(24),
                            paddingRight: scaled.px(24),
                            fontSize: scaled.fontSize(18),
                            height: scaled.footerButtonHeight,
                            minHeight: scaled.h(36)
                        }}
                    >
                        Start Level {currentLevel + 1}
                    </Button>
                    <Button
                        onClick={handleResetGame}
                        className="bg-gray-800 hover:bg-gray-700 text-white border border-white transition-all hover:border-yellow-400 hover:text-yellow-300"
                        style={{
                            paddingLeft: scaled.px(24),
                            paddingRight: scaled.px(24),
                            fontSize: scaled.fontSize(18),
                            height: scaled.footerButtonHeight,
                            minHeight: scaled.h(36)
                        }}
                    >
                        Back to Menu
                    </Button>
                </div>

                {canPreviewNextLevel && (
                    <div className="flex flex-col items-center text-center" style={{ marginInline: scaled.mx(16), fontSize: scaled.fontSize(14)}}>
                        <p>Level {currentLevel + 1}</p>
                        {nextLevelInfo ? (
                            <>
                                <p>Total Bricks: {nextLevelInfo.totalBricks}</p>
                                <p>Score Target: {nextLevelInfo.targetScore}</p>
                            </>
                        ) : (
                            <p>Loading info...</p>
                        )}
                        {nextLevelBeatTime !== null && (
                            <p>Time to Beat: {(nextLevelBeatTime / 1000).toFixed(1)}s</p>
                        )}
                    </div>
                )}

                {canPreviewNextLevel && (
                    <div style={{ flexShrink: 0 }}> 
                        <LevelPreview
                            level={currentLevel + 1}
                            previewWidth={scaled.w(220)}
                            previewHeight={scaled.w(220) * (BOARD_HEIGHT / BOARD_WIDTH)}
                        />
                    </div>
                )}
            </div>
        </div>
    </TooltipProvider>
  );
};

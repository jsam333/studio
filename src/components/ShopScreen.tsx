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
    BASE_SHOP_HEIGHT
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
    buttonHeightMd: 96 * scaleFactor, // For shop item buttons
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
            <div className="flex-grow overflow-y-auto">
                {/* Owned PowerUps Display */}
                <div
                    className="w-full mb-4 mx-auto"
                    style={{ maxWidth: scaled.w(672), marginBottom: scaled.mb(16) }} // max-w-4xl
                >
                    {displaySpawnablePowerUps.length > 0 ? (
                        <div
                            className="flex flex-wrap justify-center bg-black bg-opacity-20 rounded"
                            style={{ gap: scaled.gap(8), padding: scaled.p(8) }}
                        >
                            {displaySpawnablePowerUps.map(powerUp => {
                                const baseType = getBasePowerUpType(powerUp);
                                const imagePath = POWER_UP_IMAGE_PATHS[baseType];
                                const displayName = powerUp.replace(/_/g, ' ');
                                const level = getPowerUpLevelFromString(powerUp);
                                return (
                                    <Tooltip key={powerUp}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className="border border-gray-500 rounded bg-gray-700 flex flex-col items-center"
                                                style={{ padding: scaled.p(4) }}
                                            >
                                                {imagePath ? (
                                                    <img
                                                        src={imagePath}
                                                        alt={displayName}
                                                        className="object-contain"
                                                        style={{ width: scaled.iconSizeMd, height: scaled.iconSizeMd }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="bg-gray-400 flex items-center justify-center text-white font-bold rounded"
                                                        aria-label={displayName}
                                                        style={{
                                                            width: scaled.iconSizeMd,
                                                            height: scaled.iconSizeMd,
                                                            fontSize: scaled.fontSize(12)
                                                        }}
                                                    >{baseType.substring(0,1)}</div>
                                                )}
                                                {level > 1 && (
                                                    <span
                                                        className="font-bold"
                                                        style={{ fontSize: scaled.fontSize(12), marginTop: scaled.px(2) }}
                                                    >L{level}</span>
                                                )}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent style={{fontSize: scaled.fontSize(12)}}>
                                            <p>{displayName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            className="text-center text-gray-400 italic bg-black bg-opacity-20 rounded"
                            style={{ padding: scaled.p(8), fontSize: scaled.fontSize(14) }}
                        >No power-ups active.</div>
                    )}
                </div>

                <h1
                    className="font-bold text-center"
                    style={{
                        fontSize: scaled.fontSize(30),
                        marginBlock: scaled.my(20)
                    }}
                >Buy Something!</h1>

                <div
                    className="flex flex-col sm:flex-row items-center justify-center mb-6"
                    style={{
                        gap: scaled.gap(12),
                        marginBottom: scaled.mb(24)
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
                    <p
                        className="text-blue-300"
                        style={{
                            fontSize: scaled.fontSize(18)
                        }}
                    >
                        Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
                    </p>
                </div>

                <div
                    className="grid grid-cols-3 sm:grid-cols-5 mx-auto"
                    style={{
                        gap: scaled.gap(12),
                        marginBottom: scaled.mb(32),
                        width: '100%',
                        maxWidth: scaled.w(576)
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

                            return (
                                <Tooltip key={itemKey}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={() => handlePurchase(itemToPurchaseOnClick)}
                                            disabled={isDisabled}
                                            className={`text-white flex flex-col justify-around items-center border border-white ${buttonBgColor}`}
                                            style={{
                                                paddingTop: scaled.py(8),
                                                paddingBottom: scaled.py(8),
                                                paddingLeft: scaled.px(4),
                                                paddingRight: scaled.px(4),
                                                fontSize: scaled.fontSize(12),
                                                height: scaled.buttonHeightMd, // This is for shop item buttons
                                            }}
                                        >
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
                                            {UPGRADABLE_POWER_UPS.includes(item) && levelToShowOnButton > 1 && (
                                                <span
                                                    className="font-bold"
                                                    style={{ fontSize: scaled.fontSize(12), marginTop: scaled.px(2) }}
                                                >L{levelToShowOnButton}</span>
                                            )}
                                            <span style={{ fontSize: scaled.fontSize(12) }}>{buttonText}</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent style={{fontSize: scaled.fontSize(12)}}>
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
                    height: scaled.h(120),
                    minHeight: scaled.h(100)
                }}
            >
                <div className="flex flex-col" style={{gap: scaled.gap(8)}}>
                    <Button
                        onClick={handleStartNextLevel}
                        className="text-white bg-gray-800 hover:bg-gray-700 border border-purple-600 flex justify-center items-center"
                        style={{
                            paddingLeft: scaled.px(24),
                            paddingRight: scaled.px(24),
                            // paddingTop and paddingBottom are removed to allow explicit height to control vertical size
                            fontSize: scaled.fontSize(18),
                            height: scaled.footerButtonHeight, // Explicitly scaled height
                            minHeight: scaled.h(36) // Minimum height safeguard
                        }}
                    >
                        Start Level {currentLevel + 1}
                    </Button>
                    <Button
                        onClick={handleResetGame}
                        className="text-white bg-gray-800 hover:bg-gray-700 border border-yellow-600 flex justify-center items-center"
                        style={{
                            paddingLeft: scaled.px(24),
                            paddingRight: scaled.px(24),
                            // paddingTop and paddingBottom are removed
                            fontSize: scaled.fontSize(18),
                            height: scaled.footerButtonHeight, // Explicitly scaled height
                            minHeight: scaled.h(36) // Minimum height safeguard
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
                    </div>
                )}

                {canPreviewNextLevel && nextLevelBricksPreview && (
                    <div style={{ flexShrink: 0 }}> 
                        <BrickPreview
                            bricks={nextLevelBricksPreview}
                            previewWidth={scaled.w(150)}
                            previewHeight={scaled.h(50)}
                        />
                    </div>
                )}
            </div>
        </div>
    </TooltipProvider>
  );
};

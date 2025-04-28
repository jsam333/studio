import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { PowerUpType, GameStateRefs } from '../interfaces';
import { POWER_UP_COSTS, ALL_TOGGLEABLE_POWER_UPS, GOLD_COLOR } from '../constants';
import { shuffleArray } from '../utils/helpers';
import { calculateBaseSpawnChance } from '../gameUpdates/gameLoopUtils';

const SHOP_ITEMS_COUNT = 5;

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
  const [purchasedInSession, setPurchasedInSession] = useState<Set<PowerUpType>>(new Set());
  const [goldDisplay, setGoldDisplay] = useState(gameStateRefs.goldRef.current);
  const [currentSpawnChance, setCurrentSpawnChance] = useState(0);

  useEffect(() => {
    // Generate items
    const eligiblePowerUps = ALL_TOGGLEABLE_POWER_UPS.filter(p => p !== 'ALL_IN_ONE');
    const shuffled = shuffleArray(eligiblePowerUps);
    setShopItems(shuffled.slice(0, SHOP_ITEMS_COUNT));
    // Reset session purchases
    setPurchasedInSession(new Set());
    // Sync gold display
    setGoldDisplay(gameStateRefs.goldRef.current);
    // Calculate and set initial spawn chance for display
    const chance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
    setCurrentSpawnChance(chance);
  }, [gameStateRefs.goldRef, gameStateRefs.spawnablePowerUpsRef]); // Re-run only when gold or spawnable power-ups change externally

  const handlePurchase = (item: PowerUpType) => {
    if (gameStateRefs.spawnablePowerUpsRef.current.has(item) || purchasedInSession.has(item)) return;
    const cost = POWER_UP_COSTS[item] ?? 999; // Get specific cost, fallback if undefined
    if (gameStateRefs.goldRef.current < cost) return;

    gameStateRefs.goldRef.current -= cost;
    setGoldDisplay(gameStateRefs.goldRef.current);
    addSpawnablePowerUp(item);
    setPurchasedInSession(prev => new Set(prev).add(item));

    // Recalculate spawn chance after purchase for display update
    const newChance = calculateBaseSpawnChance(gameStateRefs.spawnablePowerUpsRef.current, 'main');
    setCurrentSpawnChance(newChance);

    console.log(`Purchased ${item} for ${cost} gold. Remaining: ${gameStateRefs.goldRef.current}. New Spawn Chance: ${newChance * 100}%`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-800 text-white">
      <h1 className="text-4xl font-bold mb-6">Level Complete!</h1>
      {/* Display Gold and Spawn Chance */}
      <div className="flex items-center space-x-6 mb-10">
        <p className="text-3xl" style={{ color: GOLD_COLOR || '#FFD700' }}>
          Gold: {goldDisplay}
        </p>
        <p className="text-xl text-blue-300">
          {/* Format chance as percentage */}
          Spawn Chance: {(currentSpawnChance * 100).toFixed(0)}%
        </p>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Power-up Shop</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10 w-full max-w-4xl px-4">
        {shopItems.length > 0 ? (
          shopItems.map(item => {
            const cost = POWER_UP_COSTS[item] ?? 999; // Get cost again for UI
            const isGloballyOwned = gameStateRefs.spawnablePowerUpsRef.current.has(item);
            const isPurchasedThisSession = purchasedInSession.has(item);
            const canAfford = goldDisplay >= cost;
            const isDisabled = isGloballyOwned || isPurchasedThisSession || !canAfford;
            let buttonText = `Cost: ${cost}`; // Display specific cost
            let buttonStyle = 'bg-blue-600 hover:bg-blue-700';
            if (isGloballyOwned) {
              buttonText = '(Owned)';
              buttonStyle = 'bg-gray-500 opacity-70';
            } else if (isPurchasedThisSession) {
              buttonText = '(Added)';
              buttonStyle = 'bg-gray-500 opacity-70';
            } else if (!canAfford) {
              buttonStyle = 'bg-red-800 opacity-50';
            }

            return (
              <Button
                key={item}
                onClick={() => handlePurchase(item)} 
                disabled={isDisabled}
                className={`py-3 px-2 text-sm flex flex-col h-24 justify-center items-center ${buttonStyle}`}
              >
                <span className="mb-1">{item.replace(/_/g, ' ')}</span> 
                <span className="text-xs mt-1">{buttonText}</span> 
              </Button>
            );
          })
        ) : (
          <p className="text-center col-span-full">Loading Shop...</p>
        )}
      </div>

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

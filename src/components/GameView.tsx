import React, { LegacyRef } from 'react';
import { PowerUpSidebar } from './PowerUpSidebar';
import { ShopScreen } from './ShopScreen'; // Import ShopScreen
import { PowerUpType, GameOverState, GameStateRefs } from '../interfaces'; // Added GameStateRefs

interface GameViewProps {
  gameContainerRef: LegacyRef<HTMLDivElement> | undefined;
  canvasRef: LegacyRef<HTMLCanvasElement> | undefined;
  gameOverState: GameOverState;
  showSidebar: boolean;
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (powerUp: PowerUpType) => void;
  handleResetGame: () => void;
  // Props for ShopScreen - ensure these are passed from Home component
  gameStateRefs: GameStateRefs;
  currentLevel: number;
  addSpawnablePowerUp: (type: PowerUpType, x: number, y: number) => void;
  startNextLevel: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  gameContainerRef,
  canvasRef,
  gameOverState,
  showSidebar,
  enabledPowerUps,
  onTogglePowerUp,
  handleResetGame,
  // Destructure ShopScreen props
  gameStateRefs,
  currentLevel,
  addSpawnablePowerUp,
  startNextLevel,
}) => {
  return (
    // Removed background class from outermost container to let body background show
    <div className="flex items-center justify-center h-screen p-4">
      {/* Keep blue background for the container holding the canvas and sidebar (and now shop) */}
      <div 
        ref={gameContainerRef} 
        className="flex flex-row items-start border border-white relative bg-background"
        // Ensure this container can hold the shop screen appropriately
        // style={{ width: 'fit-content', height: 'fit-content' }} // Or specific dimensions
      >
        {gameOverState === 'shop' ? (
          <ShopScreen 
            gameStateRefs={gameStateRefs}
            currentLevel={currentLevel}
            addSpawnablePowerUp={addSpawnablePowerUp}
            startNextLevel={startNextLevel}
            handleResetGame={handleResetGame} // Pass handleResetGame if ShopScreen needs it
          />
        ) : (
          <>
            <canvas 
              ref={canvasRef} 
              className="block flex-shrink-0" 
              onClick={(gameOverState === 'won' || gameOverState === 'lost') ? handleResetGame : undefined}
              style={{ cursor: (gameOverState === 'won' || gameOverState === 'lost') ? 'pointer' : 'default' }} 
            />
            {showSidebar && (
              <PowerUpSidebar 
                enabledPowerUps={enabledPowerUps} 
                onTogglePowerUp={onTogglePowerUp} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

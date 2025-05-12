import React, { LegacyRef } from 'react';
import { PowerUpSidebar } from './PowerUpSidebar';
import { ShopScreen } from './ShopScreen'; // Re-import ShopScreen
import { PowerUpType, GameOverState, GameStateRefs } from '../interfaces'; // Restore GameStateRefs

interface GameViewProps {
  gameContainerRef: LegacyRef<HTMLDivElement> | undefined;
  canvasRef: LegacyRef<HTMLCanvasElement> | undefined;
  gameOverState: GameOverState;
  showSidebar: boolean;
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (powerUp: PowerUpType) => void;
  handleResetGame: () => void;
  // Props for ShopScreen (restored)
  gameStateRefs: GameStateRefs;
  currentLevel: number;
  addSpawnablePowerUp: (type: PowerUpType, x: number, y: number) => void;
  startNextLevel: () => void;
  scaleRef: React.RefObject<number>; 
  gameWidth: number;
  gameHeight: number;
}

export const GameView: React.FC<GameViewProps> = ({
  gameContainerRef,
  canvasRef,
  gameOverState,
  showSidebar,
  enabledPowerUps,
  onTogglePowerUp,
  handleResetGame,
  // Destructure ShopScreen props (restored)
  gameStateRefs,
  currentLevel,
  addSpawnablePowerUp,
  startNextLevel,
  scaleRef,
  gameWidth,
  gameHeight,
}) => {
  const currentScale = scaleRef.current || 1;

  return (
    <div className="flex items-center justify-center h-screen p-4">
      {/* This container (gameContainerRef) is relative for the ShopScreen overlay */}
      {/* It will also be scaled by setupGameCanvas via its own logic when canvas is active */}
      {/* When shop is active, page.tsx will pause canvas updates. */}
      <div 
        ref={gameContainerRef} 
        className="flex flex-row items-start relative bg-background border border-white"
        // The container itself will have its style.width/height set by setupGameCanvas
        // to reflect the scaled game dimensions. This also serves the shop overlay.
      >
        <canvas 
          ref={canvasRef} 
          className="block flex-shrink-0" // Border removed, parent has it now
          onClick={(gameOverState === 'won' || gameOverState === 'lost') ? handleResetGame : undefined}
          style={{ 
            cursor: (gameOverState === 'won' || gameOverState === 'lost') ? 'pointer' : 'default',
            // Canvas is a direct child, its scaled dimensions are handled by setupGameCanvas
          }} 
        />
        {showSidebar && (
          <PowerUpSidebar 
            enabledPowerUps={enabledPowerUps} 
            onTogglePowerUp={onTogglePowerUp} 
          />
        )}

        {/* ShopScreen as an overlay when game is paused (e.g., between levels) */}
        {gameOverState === 'shop' && (
          <div 
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-75"
            // This style ensures the overlay div uses the scaled dimensions of its parent (gameContainerRef)
            // The parent (gameContainerRef) has its width/height set by setupGameCanvas (BOARD_WIDTH * scale, etc.)
            // so w-full and h-full will match the scaled canvas area.
          >
            <div 
                // Inner container for ShopScreen content, now takes full width/height of its parent overlay
                className="bg-gray-800 p-4 rounded-lg shadow-xl overflow-y-auto w-full h-full"
                // Removed style attribute that set maxWidth and maxHeight
            >
                <ShopScreen 
                    gameStateRefs={gameStateRefs}
                    currentLevel={currentLevel}
                    addSpawnablePowerUp={addSpawnablePowerUp}
                    startNextLevel={startNextLevel}
                    handleResetGame={handleResetGame} 
                />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

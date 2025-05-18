import React, { LegacyRef } from 'react';
import { PowerUpSidebar } from './PowerUpSidebar';
import { ShopScreen } from './ShopScreen';
import { PowerUpType, GameOverState, GameStateRefs } from '../interfaces';
import { BOARD_HEIGHT } from '../constants'; // Import BOARD_HEIGHT

interface GameViewProps {
  gameContainerRef: LegacyRef<HTMLDivElement> | undefined;
  canvasRef: LegacyRef<HTMLCanvasElement> | undefined;
  gameOverState: GameOverState;
  showSidebar: boolean;
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (powerUp: PowerUpType) => void;
  handleResetGame: () => void;
  gameStateRefs: GameStateRefs;
  currentLevel: number;
  addSpawnablePowerUp: (type: PowerUpType, x: number, y: number) => void;
  startNextLevel: () => void;
  isTestPreview?: boolean; // Added isTestPreview prop
  // Removed gameWidth, gameHeight as BOARD_WIDTH/BOARD_HEIGHT from constants are used
}

export const GameView: React.FC<GameViewProps> = ({
  gameContainerRef,
  canvasRef,
  gameOverState,
  showSidebar,
  enabledPowerUps,
  onTogglePowerUp,
  handleResetGame,
  gameStateRefs,
  currentLevel,
  addSpawnablePowerUp,
  startNextLevel,
  isTestPreview, // Destructure isTestPreview
}) => {
  const containerClasses = isTestPreview
    ? "flex items-center justify-center p-0" // No h-screen, minimal padding for test preview
    : "flex items-center justify-center h-screen p-4"; // Original classes for main game

  // The gameContainerRef div will naturally size to the canvas + sidebar in test preview
  // because setupGameCanvas sets specific pixel heights for them when gameMode is 'test'.

  return (
    <div className={containerClasses}>
      <div 
        ref={gameContainerRef} 
        className="flex flex-row items-start relative bg-background border border-white"
        // When it's a test preview, the height will be dictated by the canvas and sidebar
        // which are set to BOARD_HEIGHT in setupGameCanvas.
        style={isTestPreview ? { height: `${BOARD_HEIGHT}px`} : {}}
      >
        <canvas 
          ref={canvasRef} 
          className="block flex-shrink-0" 
          onClick={(gameOverState === 'won' || gameOverState === 'lost') && !isTestPreview ? handleResetGame : undefined}
          style={{ 
            cursor: (gameOverState === 'won' || gameOverState === 'lost') && !isTestPreview ? 'pointer' : 'default',
            // Canvas height is set by setupGameCanvas for test preview
          }} 
        />
        {showSidebar && (
          <PowerUpSidebar 
            enabledPowerUps={enabledPowerUps} 
            onTogglePowerUp={onTogglePowerUp} 
            // Ensure sidebar takes appropriate height in test preview
            style={isTestPreview ? { height: `${BOARD_HEIGHT}px` } : {}} 
          />
        )}

        {/* Shop screen should only show for main game, not test preview */}
        {gameOverState === 'shop' && !isTestPreview && (
          <div 
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-75"
          >
            <div className="bg-gray-800 p-0 rounded-lg shadow-xl overflow-y-auto w-full h-full">
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

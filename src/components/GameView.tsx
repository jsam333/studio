import React, { LegacyRef } from 'react';
import { PowerUpSidebar } from './PowerUpSidebar';
import { ShopScreen } from './ShopScreen';
import { PowerUpType, GameOverState, GameStateRefs } from '../interfaces';

interface GameViewProps {
  gameContainerRef: LegacyRef<HTMLDivElement> | undefined;
  canvasRef: LegacyRef<HTMLCanvasElement> | undefined;
  gameOverState: GameOverState;
  showSidebar: boolean;
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (powerUp: PowerUpType) => void;
  handleResetGame: () => void;
  // Props for ShopScreen
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
  gameStateRefs,
  currentLevel,
  addSpawnablePowerUp,
  startNextLevel,
}) => {
  return (
    <div className="flex items-center justify-center h-screen p-4"> {/* Restored p-4 */}
      <div 
        ref={gameContainerRef} 
        className="flex flex-row items-start relative bg-background border border-white"
      >
        <canvas 
          ref={canvasRef} 
          className="block flex-shrink-0" 
          onClick={(gameOverState === 'won' || gameOverState === 'lost') ? handleResetGame : undefined}
          style={{ 
            cursor: (gameOverState === 'won' || gameOverState === 'lost') ? 'pointer' : 'default',
          }} 
        />
        {showSidebar && (
          <PowerUpSidebar 
            enabledPowerUps={enabledPowerUps} 
            onTogglePowerUp={onTogglePowerUp} 
          />
        )}

        {gameOverState === 'shop' && (
          <div 
            className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-75"
          >
            {/* Restored p-4, rounded-lg, shadow-xl */}
            <div className="bg-gray-800 p-4 rounded-lg shadow-xl overflow-y-auto w-full h-full">
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

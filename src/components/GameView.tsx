// src/components/GameView.tsx
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
  isTestPreview?: boolean; 
  testPowerUpLevels?: Record<PowerUpType, number>; 
  setTestPowerUpLevel?: (type: PowerUpType, level: number) => void; 
  setAllTestPowerUpLevels?: (level: number) => void; // Added this line
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
  isTestPreview,
  testPowerUpLevels, 
  setTestPowerUpLevel, 
  setAllTestPowerUpLevels, // Added this line
}) => {
  const containerClasses = isTestPreview
    ? "flex items-center justify-center p-0" 
    : "flex items-center justify-center h-screen p-4"; 

  return (
    <div className={containerClasses}>
      <div 
        ref={gameContainerRef} 
        className="flex flex-row items-start relative bg-background border border-white"
        style={isTestPreview ? { height: `${BOARD_HEIGHT}px`} : {}}
      >
        <canvas 
          ref={canvasRef} 
          className="block flex-shrink-0" 
          onClick={(gameOverState === 'won' || gameOverState === 'lost') && !isTestPreview ? handleResetGame : undefined}
          style={{ 
            cursor: (gameOverState === 'won' || gameOverState === 'lost') && !isTestPreview ? 'pointer' : 'default',
          }} 
        />
        {showSidebar && (
          <PowerUpSidebar 
            enabledPowerUps={enabledPowerUps} 
            onTogglePowerUp={onTogglePowerUp} 
            style={isTestPreview ? { height: `${BOARD_HEIGHT}px` } : {}} 
            isTestMode={isTestPreview} 
            testPowerUpLevels={testPowerUpLevels} 
            setTestPowerUpLevel={setTestPowerUpLevel} 
            setAllTestPowerUpLevels={setAllTestPowerUpLevels} // Added this line
          />
        )}

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

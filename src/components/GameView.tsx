// src/components/GameView.tsx
import React, { LegacyRef } from 'react';
import { PowerUpSidebar } from './PowerUpSidebar';
import { ShopScreen } from './ShopScreen';
import { GameOverScreen } from './GameOverScreen'; // Import GameOverScreen
import { PowerUpType, GameOverState, GameStateRefs } from '../interfaces';
import { BOARD_HEIGHT } from '../constants'; // Import BOARD_HEIGHT
import { useToast } from '../hooks/use-toast';
import { Button } from './ui/button'; // Import Button

interface GameViewProps {
  gameContainerRef: LegacyRef<HTMLDivElement> | undefined;
  canvasRef: LegacyRef<HTMLCanvasElement> | undefined;
  gameOverState: GameOverState;
  showSidebar: boolean;
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (powerUp: PowerUpType) => void;
  toggleAllTestPowerUps?: () => void; 
  addTestLaserCharges?: (count: number) => void; 
  addTestRecoveryCharges?: (count: number) => void; 
  addTestSafetyNetCharge?: () => void; 
  handleResetGame: () => void;
  gameStateRefs: GameStateRefs;
  currentLevel: number;
  addSpawnablePowerUp: (type: PowerUpType, x: number, y: number) => void;
  startNextLevel: () => void;
  isTestPreview?: boolean; 
  testPowerUpLevels?: Record<PowerUpType, number>; 
  setTestPowerUpLevel?: (type: PowerUpType, level: number) => void; 
  setAllTestPowerUpLevels?: (level: number) => void; 
  isPaintModeActive?: boolean;
  togglePaintMode?: () => void;
  isUpgradePaintModeActive?: boolean;
  toggleUpgradePaintMode?: () => void;
  isReinforcePaintModeActive?: boolean;
  toggleReinforcePaintMode?: () => void;
  isBombPaintModeActive?: boolean;
  toggleBombPaintMode?: () => void;
  isBallBrickPaintModeActive?: boolean;
  toggleBallBrickPaintMode?: () => void;
  startGame: (mode: 'main') => void; // Add startGame prop
}

export const GameView: React.FC<GameViewProps> = ({
  gameContainerRef,
  canvasRef,
  gameOverState,
  showSidebar,
  enabledPowerUps,
  onTogglePowerUp,
  toggleAllTestPowerUps, 
  addTestLaserCharges, 
  addTestRecoveryCharges, 
  addTestSafetyNetCharge, 
  handleResetGame,
  gameStateRefs,
  currentLevel,
  addSpawnablePowerUp,
  startNextLevel,
  isTestPreview,
  testPowerUpLevels, 
  setTestPowerUpLevel, 
  setAllTestPowerUpLevels,
  isPaintModeActive,
  togglePaintMode,
  isUpgradePaintModeActive,
  toggleUpgradePaintMode,
  isReinforcePaintModeActive,
  toggleReinforcePaintMode,
  isBombPaintModeActive,
  toggleBombPaintMode,
  isBallBrickPaintModeActive,
  toggleBallBrickPaintMode,
  startGame, // Destructure startGame
}) => {
  const { toast } = useToast();
  const containerClasses = isTestPreview
    ? "flex items-center justify-center p-0" 
    : "flex items-center justify-center h-screen p-4"; 

  const paddleX = gameStateRefs.paddleXRef.current;

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
          onClick={((gameOverState === 'won' || gameOverState === 'lost')) ? handleResetGame : undefined}
          style={{ 
            cursor: (gameOverState === 'won' || gameOverState === 'lost') ? 'pointer' : 'default',
          }} 
        />
        {showSidebar && (
          <PowerUpSidebar 
            enabledPowerUps={enabledPowerUps} 
            onTogglePowerUp={onTogglePowerUp} 
            toggleAllTestPowerUps={toggleAllTestPowerUps} 
            addTestLaserCharges={addTestLaserCharges} 
            addTestRecoveryCharges={addTestRecoveryCharges} 
            addTestSafetyNetCharge={addTestSafetyNetCharge} 
            style={isTestPreview ? { height: `${BOARD_HEIGHT}px` } : {}} 
            isTestMode={isTestPreview} 
            testPowerUpLevels={testPowerUpLevels} 
            setTestPowerUpLevel={setTestPowerUpLevel} 
            setAllTestPowerUpLevels={setAllTestPowerUpLevels} 
            isPaintModeActive={isPaintModeActive}
            togglePaintMode={togglePaintMode}
            isUpgradePaintModeActive={isUpgradePaintModeActive}
            toggleUpgradePaintMode={toggleUpgradePaintMode}
            isReinforcePaintModeActive={isReinforcePaintModeActive}
            toggleReinforcePaintMode={toggleReinforcePaintMode}
            isBombPaintModeActive={isBombPaintModeActive}
            toggleBombPaintMode={toggleBombPaintMode}
            isBallBrickPaintModeActive={isBallBrickPaintModeActive}
            toggleBallBrickPaintMode={toggleBallBrickPaintMode}
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

        {(gameOverState === 'won' || gameOverState === 'lost') && !isTestPreview && (
            <GameOverScreen 
                won={gameOverState === 'won'}
                totalGoldCollected={gameStateRefs.totalGoldSpentOnPowerUpsRef.current + gameStateRefs.goldRef.current}
                spawnablePowerUps={gameStateRefs.spawnablePowerUpsRef.current}
                onRestart={() => startGame('main')}
                onMenu={handleResetGame}
                currentLevel={currentLevel}
            />
        )}
      </div>
    </div>
  );
};

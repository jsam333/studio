import React, { useRef, LegacyRef } from 'react';
import { PowerUpSidebar } from './PowerUpSidebar';
import { PowerUpType, GameOverState } from '../interfaces';

interface GameViewProps {
  gameContainerRef: LegacyRef<HTMLDivElement> | undefined;
  canvasRef: LegacyRef<HTMLCanvasElement> | undefined;
  gameOverState: GameOverState;
  showSidebar: boolean;
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (powerUp: PowerUpType) => void;
  handleResetGame: () => void;
}

export const GameView: React.FC<GameViewProps> = ({
  gameContainerRef,
  canvasRef,
  gameOverState,
  showSidebar,
  enabledPowerUps,
  onTogglePowerUp,
  handleResetGame
}) => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 p-4">
      <div 
        ref={gameContainerRef} 
        className="flex flex-row items-start border border-white relative"
      >
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
      </div>
    </div>
  );
};

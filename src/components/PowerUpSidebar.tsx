// src/components/PowerUpSidebar.tsx

import React from 'react';
import { PowerUpType, ALL_TOGGLEABLE_POWER_UPS, POWER_UP_COLORS } from '../constants'; 

interface PowerUpSidebarProps {
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (type: PowerUpType) => void;
  style?: React.CSSProperties;
  isTestMode?: boolean; 
  testMultiballLevel?: number; 
  setTestMultiballLevel?: (level: number) => void; 
}

export const PowerUpSidebar: React.FC<PowerUpSidebarProps> = ({
  enabledPowerUps,
  onTogglePowerUp,
  style,
  isTestMode,
  testMultiballLevel,
  setTestMultiballLevel
}) => {

  const handleMultiballLevelChange = (increment: boolean) => {
    if (setTestMultiballLevel && testMultiballLevel !== undefined) {
      let currentLevel = testMultiballLevel;
      if (increment) {
        currentLevel = currentLevel >= 3 ? 1 : currentLevel + 1;
      } else {
        currentLevel = currentLevel <= 1 ? 3 : currentLevel - 1;
      }
      setTestMultiballLevel(currentLevel);
    }
  };

  return (
    <div
      data-role="powerup-sidebar"
      className="h-full p-2 border-l border-gray-700 bg-gray-800 text-white overflow-y-auto flex flex-col space-y-px flex-shrink-0"
      style={style}
    >
      <h3 className="text-base font-semibold mb-1 text-center sticky top-0 bg-gray-800 py-1">Enabled Power-ups</h3>
      {ALL_TOGGLEABLE_POWER_UPS.map(type => {
        const isEnabled = enabledPowerUps.has(type);
        const bgColor = isEnabled ? (POWER_UP_COLORS[type] || '#cccccc') : '#4a5568'; 
        const textColor = isEnabled && (type === 'BLACK_BALL' || type === 'ALL_IN_ONE' || type ==='DOUBLE_BALL') ? '#ffffff' : '#000000';

        if (type === 'MULTI_BALL' && isTestMode && setTestMultiballLevel && testMultiballLevel !== undefined) {
          return (
            <button
              key={type}
              onClick={() => onTogglePowerUp(type)}
              className={`px-1 py-0.5 rounded text-sm font-medium transition-colors duration-150 w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white hover:opacity-80 flex items-center justify-between`}
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              <span>{type.replace(/_/g, ' ')}</span>
              <div 
                className="ml-2 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()} 
              >
                <span className="text-sm w-4 text-center select-none mr-1" style={{ color: textColor === '#ffffff' ? '#ffffff' : '#000000' }}>{testMultiballLevel}</span>
                <div className="flex flex-col items-center justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMultiballLevelChange(true); }} 
                    onMouseDown={(e) => e.stopPropagation()} // Prevent main button click through
                    className="px-1 py-0 text-xs rounded-t bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-white w-4 h-3 flex items-center justify-center"
                    style={{ lineHeight: '0.5rem', color: 'white' }} // Ensure arrow is visible
                  >
                    &#x25B2; {/* Up arrow */}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleMultiballLevelChange(false); }}
                    onMouseDown={(e) => e.stopPropagation()} // Prevent main button click through 
                    className="px-1 py-0 text-xs rounded-b bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-white w-4 h-3 flex items-center justify-center"
                    style={{ lineHeight: '0.5rem', color: 'white' }} // Ensure arrow is visible
                  >
                    &#x25BC; {/* Down arrow */}
                  </button>
                </div>
              </div>
            </button>
          );
        }

        return (
          <button
            key={type}
            onClick={() => onTogglePowerUp(type)}
            className={`px-1 py-0.5 rounded text-sm font-medium transition-colors duration-150 w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white hover:opacity-80`}
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {type.replace(/_/g, ' ')} 
          </button>
        );
      })}
    </div>
  );
};

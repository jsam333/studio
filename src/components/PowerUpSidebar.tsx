// src/components/PowerUpSidebar.tsx

import React from 'react';
import { PowerUpType, ALL_TOGGLEABLE_POWER_UPS, POWER_UP_COLORS } from '../constants'; 

interface PowerUpSidebarProps {
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (type: PowerUpType) => void;
  style?: React.CSSProperties;
  isTestMode?: boolean; 
  testPowerUpLevels?: Record<PowerUpType, number>; 
  setTestPowerUpLevel?: (type: PowerUpType, level: number) => void; 
}

export const PowerUpSidebar: React.FC<PowerUpSidebarProps> = ({
  enabledPowerUps,
  onTogglePowerUp,
  style,
  isTestMode,
  testPowerUpLevels,
  setTestPowerUpLevel
}) => {

  const handleLevelChange = (type: PowerUpType, increment: boolean) => {
    if (setTestPowerUpLevel && testPowerUpLevels && testPowerUpLevels[type] !== undefined) {
      let currentLevel = testPowerUpLevels[type];
      if (increment) {
        currentLevel = currentLevel >= 3 ? 1 : currentLevel + 1;
      } else {
        currentLevel = currentLevel <= 1 ? 3 : currentLevel - 1;
      }
      setTestPowerUpLevel(type, currentLevel);
    }
  };

  const buttonBaseClasses = "px-1 py-0.5 rounded text-sm font-medium transition-colors duration-150 w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white hover:opacity-80";

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
        const currentLevelForType = testPowerUpLevels ? testPowerUpLevels[type] : 1;

        if (isTestMode && setTestPowerUpLevel && testPowerUpLevels) {
          return (
            <div 
              key={type} 
              className={`${buttonBaseClasses} flex items-center justify-between cursor-pointer`}
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
              onClick={() => onTogglePowerUp(type)} // Apply toggle to the outer div
            >
              <span>{type.replace(/_/g, ' ')}</span>
              <div 
                className="ml-2 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent outer div click when interacting with arrows
                onMouseDown={(e) => e.stopPropagation()} 
              >
                <span className="text-sm w-4 text-center select-none mr-1" style={{ color: textColor === '#ffffff' ? '#ffffff' : '#000000' }}>
                  {currentLevelForType}
                </span>
                <div className="flex flex-col items-center justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLevelChange(type, true); }} 
                    onMouseDown={(e) => e.stopPropagation()} 
                    className="px-1 py-0 text-xs rounded-t bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-white w-4 h-3 flex items-center justify-center"
                    style={{ lineHeight: '0.5rem', color: 'white' }} 
                  >
                    &#x25B2; {/* Up arrow */}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLevelChange(type, false); }}
                    onMouseDown={(e) => e.stopPropagation()}  
                    className="px-1 py-0 text-xs rounded-b bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-white w-4 h-3 flex items-center justify-center"
                    style={{ lineHeight: '0.5rem', color: 'white' }} 
                  >
                    &#x25BC; {/* Down arrow */}
                  </button>
                </div>
              </div>
            </div>
          );
        } else {
          // Default button if not in test mode or props are missing
          return (
            <button
              key={type}
              onClick={() => onTogglePowerUp(type)}
              className={buttonBaseClasses}
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
            >
              {type.replace(/_/g, ' ')} 
            </button>
          );
        }
      })}
    </div>
  );
};

// src/components/PowerUpSidebar.tsx
import React, { useState } from 'react';
import { PowerUpType, ALL_TOGGLEABLE_POWER_UPS, POWER_UP_COLORS } from '../constants'; 

interface PowerUpSidebarProps {
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (type: PowerUpType) => void;
  toggleAllTestPowerUps?: () => void; // Added this line
  style?: React.CSSProperties;
  isTestMode?: boolean; 
  testPowerUpLevels?: Record<PowerUpType, number>; 
  setTestPowerUpLevel?: (type: PowerUpType, level: number) => void; 
  setAllTestPowerUpLevels?: (level: number) => void; 
}

export const PowerUpSidebar: React.FC<PowerUpSidebarProps> = ({
  enabledPowerUps,
  onTogglePowerUp,
  toggleAllTestPowerUps, // Added this line
  style,
  isTestMode,
  testPowerUpLevels,
  setTestPowerUpLevel,
  setAllTestPowerUpLevels
}) => {
  const [globalTargetLevel, setGlobalTargetLevel] = useState(1);

  const handleIndividualLevelChange = (type: PowerUpType, increment: boolean) => {
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

  const handleGlobalLevelChange = (increment: boolean) => {
    let newGlobalLevel = globalTargetLevel;
    if (increment) {
      newGlobalLevel = newGlobalLevel >= 3 ? 1 : newGlobalLevel + 1;
    } else {
      newGlobalLevel = newGlobalLevel <= 1 ? 3 : newGlobalLevel - 1;
    }
    setGlobalTargetLevel(newGlobalLevel);
    if (setAllTestPowerUpLevels) {
      setAllTestPowerUpLevels(newGlobalLevel);
    }
  };

  const allPowerUpsEnabled = ALL_TOGGLEABLE_POWER_UPS.length > 0 && enabledPowerUps.size === ALL_TOGGLEABLE_POWER_UPS.length;
  const toggleAllButtonText = allPowerUpsEnabled ? "All Off" : "All On";

  const buttonBaseClasses = "px-[2px] py-0.5 rounded text-xs font-medium transition-colors duration-150 w-full text-left focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white hover:opacity-80";

  return (
    <div
      data-role="powerup-sidebar"
      className="h-full py-2 border-l border-gray-700 bg-gray-800 text-white overflow-y-auto flex flex-col space-y-px flex-shrink-0"
      style={style}
    >
      <div className="flex items-center justify-between sticky top-0 bg-gray-800 px-1">
        <h3 className="text-xs font-semibold text-center">Enabled Power-ups</h3>
        <div className="flex items-center">
          {isTestMode && toggleAllTestPowerUps && (
            <button
              onClick={toggleAllTestPowerUps}
              className="px-1 py-0.5 mr-1 text-xs rounded bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-1 focus:ring-white"
              style={{ lineHeight: '0.9rem', color: 'white'}} // Adjusted line height
            >
              {toggleAllButtonText}
            </button>
          )}
          {isTestMode && setAllTestPowerUpLevels && (
            <div 
              className="ml-1 flex items-center justify-center" // Adjusted margin to ml-1 from ml-2
              onClick={(e) => e.stopPropagation()} 
              onMouseDown={(e) => e.stopPropagation()} 
            >
              <span className="text-xs w-4 text-center select-none mr-1">
                {`L${globalTargetLevel}`}
              </span>
              <div className="flex flex-col items-center justify-center">
                <button 
                  onClick={() => handleGlobalLevelChange(true)} 
                  className="px-1 py-0 text-xs rounded-t bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-1 focus:ring-white w-4 h-2.5 flex items-center justify-center"
                  style={{ lineHeight: '0.5rem', color: 'white' }} 
                >
                  &#x25B2; {/* Up arrow */}
                </button>
                <button 
                  onClick={() => handleGlobalLevelChange(false)} 
                  className="px-1 py-0 text-xs rounded-b bg-gray-600 hover:bg-gray-500 focus:outline-none focus:ring-1 focus:ring-white w-4 h-2.5 flex items-center justify-center"
                  style={{ lineHeight: '0.5rem', color: 'white' }} 
                >
                  &#x25BC; {/* Down arrow */}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {ALL_TOGGLEABLE_POWER_UPS.map(type => {
        const isEnabled = enabledPowerUps.has(type);
        const bgColor = isEnabled ? (POWER_UP_COLORS[type] || '#cccccc') : '#4a5568'; 
        const textColor = isEnabled && (type === 'BLACK_BALL' || type === 'ALL_IN_ONE' || type ==='DOUBLE_BALL') ? '#ffffff' : '#000000';
        const currentLevelForType = testPowerUpLevels ? testPowerUpLevels[type] : 1;

        if (isTestMode && setTestPowerUpLevel && testPowerUpLevels) {
          return (
            <div 
              key={type} 
              className={`${buttonBaseClasses} flex items-center justify-between cursor-pointer px-1`}
              style={{
                backgroundColor: bgColor,
                color: textColor,
              }}
              onClick={() => onTogglePowerUp(type)} 
            >
              <span>{type.replace(/_/g, ' ')}</span>
              <div 
                className="ml-2 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} 
                onMouseDown={(e) => e.stopPropagation()} 
              >
                <span className="text-xs w-4 text-center select-none mr-1" style={{ color: textColor === '#ffffff' ? '#ffffff' : '#000000' }}>
                  {`L${currentLevelForType}`}
                </span>
                <div className="flex flex-col items-center justify-center">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleIndividualLevelChange(type, true); }} 
                    onMouseDown={(e) => e.stopPropagation()} 
                    className="px-1 py-0 text-xs rounded-t bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-white w-4 h-2.5 flex items-center justify-center"
                    style={{ lineHeight: '0.5rem', color: 'white' }} 
                  >
                    &#x25B2; {/* Up arrow */}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleIndividualLevelChange(type, false); }}
                    onMouseDown={(e) => e.stopPropagation()}  
                    className="px-1 py-0 text-xs rounded-b bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-white w-4 h-2.5 flex items-center justify-center"
                    style={{ lineHeight: '0.5rem', color: 'white' }} 
                  >
                    &#x25BC; {/* Down arrow */}
                  </button>
                </div>
              </div>
            </div>
          );
        } else {
          return (
            <button
              key={type}
              onClick={() => onTogglePowerUp(type)}
              className={buttonBaseClasses + " px-1"}
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

// src/components/PowerUpSidebar.tsx

import React from 'react';
// Assuming constants are adjusted or imported correctly
// It seems constants.ts is directly in src/, so the path might be ../constants
import { PowerUpType, ALL_TOGGLEABLE_POWER_UPS, POWER_UP_COLORS } from '../constants'; 

interface PowerUpSidebarProps {
  enabledPowerUps: Set<PowerUpType>;
  onTogglePowerUp: (type: PowerUpType) => void;
  style?: React.CSSProperties; // Added style prop
}

export const PowerUpSidebar: React.FC<PowerUpSidebarProps> = ({
  enabledPowerUps,
  onTogglePowerUp,
  style // Destructure style prop
}) => {
  return (
    <div
      data-role="powerup-sidebar"
      className="h-full p-2 border-l border-gray-700 bg-gray-800 text-white overflow-y-auto flex flex-col space-y-px flex-shrink-0"
      // Ensure sidebar has a defined width if needed, e.g., style={{ width: '192px' }} 
      // Or handle width via parent's flex layout as before
      style={style} // Apply passed style
    >
      <h3 className="text-base font-semibold mb-1 text-center sticky top-0 bg-gray-800 py-1">Enabled Power-ups</h3>
      {ALL_TOGGLEABLE_POWER_UPS.map(type => {
        const isEnabled = enabledPowerUps.has(type);
        // Ensure POWER_UP_COLORS is accessible here
        const bgColor = isEnabled ? (POWER_UP_COLORS[type] || '#cccccc') : '#4a5568'; 
        // Define textColor based on type and isEnabled state
        const textColor = isEnabled && (type === 'BLACK_BALL' || type === 'ALL_IN_ONE') ? '#ffffff' : '#000000'; 
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

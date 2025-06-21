import React from 'react';
import { PowerUpType } from '../interfaces';
import { getBasePowerUpType, getPowerUpLevelFromString } from '../utils/powerUpHelpers';
import { POWER_UP_IMAGE_PATHS } from '../constants';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';

interface OwnedPowerUpsDisplayProps {
    spawnablePowerUps: Set<PowerUpType>;
    scaled: {
        gap: (base: number) => number;
        py: (base: number) => number;
        px: (base: number) => number;
        h: (base: number) => number;
        iconSizeMd: number;
        fontSize: (base: number) => number;
    };
}

export const OwnedPowerUpsDisplay: React.FC<OwnedPowerUpsDisplayProps> = ({
    spawnablePowerUps,
    scaled,
}) => {
    const displaySpawnablePowerUps = Array.from(spawnablePowerUps).sort();

    return (
        <TooltipProvider>
            <div className="w-full">
                <div
                    className="flex flex-wrap justify-center items-center bg-black bg-opacity-20 rounded"
                    style={{
                        gap: scaled.gap(4),
                        padding: `${scaled.py(0)}px ${scaled.px(8)}px`,
                        height: scaled.h(70), // Ensure fixed height
                        minHeight: scaled.h(70)
                    }}
                >
                    {displaySpawnablePowerUps.length > 0 ? (
                        displaySpawnablePowerUps.map(powerUp => {
                            const baseType = getBasePowerUpType(powerUp);
                            const imagePath = POWER_UP_IMAGE_PATHS[baseType];
                            const displayName = powerUp.replace(/_/g, ' ');
                            const level = getPowerUpLevelFromString(powerUp);
                            return (
                                <Tooltip key={powerUp}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="border border-gray-500 rounded bg-gray-700 flex flex-col items-center"
                                            style={{ padding: `${scaled.py(4)}px ${scaled.px(2)}px ${scaled.py(1)}px` }}
                                        >
                                            {imagePath ? (
                                                <img
                                                    src={imagePath}
                                                    alt={displayName}
                                                    className="object-contain"
                                                    style={{ width: scaled.iconSizeMd, height: scaled.iconSizeMd }}
                                                />
                                            ) : (
                                                <div
                                                    className="bg-gray-400 flex items-center justify-center text-white font-bold rounded"
                                                    aria-label={displayName}
                                                    style={{
                                                        width: scaled.iconSizeMd,
                                                        height: scaled.iconSizeMd,
                                                        fontSize: scaled.fontSize(12)
                                                    }}
                                                >{baseType.substring(0,1)}</div>
                                            )}
                                            <span
                                                className="font-bold"
                                                style={{
                                                    fontSize: scaled.fontSize(12),
                                                    marginTop: scaled.px(2),
                                                    visibility: level > 1 ? 'visible' : 'hidden'
                                                }}
                                            >
                                                L{level}
                                            </span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent style={{fontSize: scaled.fontSize(12)}}>
                                        <p>{displayName}</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    ) : (
                        <div
                            className="text-center text-gray-400 italic flex items-center justify-center h-full"
                            style={{ fontSize: scaled.fontSize(14) }}
                        >
                            No power-ups active.
                        </div>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}; 
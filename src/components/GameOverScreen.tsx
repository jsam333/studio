import React from 'react';
import { Button } from './ui/button';
import { PowerUpType } from '../interfaces';
import { getBasePowerUpType, getPowerUpLevelFromString } from '../utils/powerUpHelpers';
import { POWER_UP_IMAGE_PATHS, GOLD_COLOR } from '../constants';
import { ScrollArea } from './ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';

interface GameOverScreenProps {
    won: boolean;
    finalScore: number;
    totalGoldSpent: number;
    spawnablePowerUps: Set<PowerUpType>;
    onRestart: () => void;
    onMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
    won,
    finalScore,
    totalGoldSpent,
    spawnablePowerUps,
    onRestart,
    onMenu
}) => {
    const powerUpsArray = Array.from(spawnablePowerUps);

    return (
        <TooltipProvider>
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-80">
                <div className="bg-gray-800 text-white border-2 border-gray-500 rounded-lg shadow-xl w-[450px] max-w-[90%] max-h-[90%] p-6 flex flex-col">
                    <h1 className="text-4xl font-bold text-center mb-4">{won ? 'You Won!' : 'Game Over'}</h1>
                    
                    <div className="text-center text-xl mb-2">Final Score: {finalScore}</div>
                    <div className="text-center text-lg mb-4" style={{ color: GOLD_COLOR }}>
                        Gold Value of Powerups: {totalGoldSpent}
                    </div>

                    <div className="text-lg text-center font-semibold mb-2">Powerups Acquired:</div>
                    <ScrollArea className="flex-grow bg-black bg-opacity-25 rounded-md p-2 mb-4 min-h-[100px]">
                        {powerUpsArray.length > 0 ? (
                            <div className="grid grid-cols-5 gap-2">
                                {powerUpsArray.map(powerUp => {
                                    const baseType = getBasePowerUpType(powerUp);
                                    const level = getPowerUpLevelFromString(powerUp);
                                    const imagePath = POWER_UP_IMAGE_PATHS[baseType];
                                    const displayName = powerUp.replace(/_/g, ' ');

                                    return (
                                        <Tooltip key={powerUp}>
                                            <TooltipTrigger asChild>
                                                <div className="bg-gray-700 p-2 rounded flex flex-col items-center justify-center aspect-square">
                                                    {imagePath ? (
                                                        <img src={imagePath} alt={displayName} className="w-8 h-8 object-contain" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded bg-gray-500 flex items-center justify-center text-xs font-bold">?</div>
                                                    )}
                                                    {level > 1 && (
                                                        <span className="text-xs font-bold mt-1">L{level}</span>
                                                    )}
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{displayName}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 italic flex items-center justify-center h-full">No power-ups acquired.</div>
                        )}
                    </ScrollArea>

                    <div className="flex justify-around mt-auto">
                        <Button onClick={onRestart} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded text-lg">
                            Play Again
                        </Button>
                        <Button onClick={onMenu} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded text-lg">
                            Main Menu
                        </Button>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}; 
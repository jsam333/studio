import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { PowerUpType } from '../interfaces';
import { getBasePowerUpType, getPowerUpLevelFromString } from '../utils/powerUpHelpers';
import { POWER_UP_IMAGE_PATHS, GOLD_COLOR, BASE_SHOP_WIDTH, BASE_SHOP_HEIGHT } from '../constants';
import { ScrollArea } from './ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
import { OwnedPowerUpsDisplay } from './OwnedPowerUpsDisplay';

interface GameOverScreenProps {
    won: boolean;
    totalGoldCollected: number;
    spawnablePowerUps: Set<PowerUpType>;
    onRestart: () => void;
    onMenu: () => void;
    currentLevel: number;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
    won,
    totalGoldCollected,
    spawnablePowerUps,
    onRestart,
    onMenu,
    currentLevel
}) => {
    const powerUpsArray = Array.from(spawnablePowerUps);
    const [scaleFactor, setScaleFactor] = useState(1);

    const updateScaleFactor = useCallback(() => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        const scaleX = currentWidth / BASE_SHOP_WIDTH;
        const scaleY = currentHeight / BASE_SHOP_HEIGHT;
        setScaleFactor(Math.min(scaleX, scaleY));
    }, []);

    useEffect(() => {
        updateScaleFactor();
        window.addEventListener('resize', updateScaleFactor);
        return () => window.removeEventListener('resize', updateScaleFactor);
    }, [updateScaleFactor]);

    const scaled = {
        fontSize: (base: number) => Math.max(8, base * scaleFactor),
        px: (base: number) => base * scaleFactor,
        py: (base: number) => base * scaleFactor,
        p: (base: number) => base * scaleFactor,
        gap: (base: number) => base * scaleFactor,
        h: (base: number) => base * scaleFactor,
        w: (base: number) => base * scaleFactor,
        my: (base: number) => base * scaleFactor,
        mb: (base: number) => base * scaleFactor,
        mx: (base: number) => base * scaleFactor,
        iconSize: (base: number) => base * scaleFactor,
        iconSizeMd: 32 * scaleFactor,
    };

    return (
        <TooltipProvider>
            <div 
                className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-start bg-gray-800 text-white"
                style={{ padding: `0 0 ${scaled.p(12)}px` }}
            >
                <OwnedPowerUpsDisplay spawnablePowerUps={spawnablePowerUps} scaled={scaled} />

                <h1 
                    className="font-bold text-center"
                    style={{
                        fontSize: scaled.fontSize(30),
                        marginTop: scaled.my(20),
                        marginBottom: scaled.mb(10)
                    }}
                >
                    {won ? 'You Won!' : `Lost to Level ${currentLevel}`}
                </h1>
                
                <div 
                    className="text-center" 
                    style={{ 
                        color: GOLD_COLOR,
                        fontSize: scaled.fontSize(20),
                        marginBottom: scaled.mb(24)
                    }}
                >
                    Total Gold Collected: {totalGoldCollected}
                </div>

                <div 
                    className="flex justify-around mt-auto w-full"
                    style={{ maxWidth: scaled.w(448) }}
                >
                    <Button 
                        onClick={onRestart} 
                        className="bg-gray-800 hover:bg-gray-700 text-white border border-white hover:border-purple-400 hover:text-purple-300"
                        style={{
                            padding: `${scaled.py(15)}px ${scaled.px(32)}px`,
                            borderRadius: scaled.px(8),
                            fontSize: scaled.fontSize(20)
                        }}
                    >
                        Play Again
                    </Button>
                    <Button 
                        onClick={onMenu} 
                        className="bg-gray-800 hover:bg-gray-700 text-white border border-white hover:border-yellow-400 hover:text-yellow-300"
                        style={{
                            padding: `${scaled.py(15)}px ${scaled.px(32)}px`,
                            borderRadius: scaled.px(8),
                            fontSize: scaled.fontSize(20)
                        }}
                    >
                        Main Menu
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}; 
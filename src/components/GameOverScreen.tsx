import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { PowerUpType } from '../interfaces';
import { getBasePowerUpType, getPowerUpLevelFromString } from '../utils/powerUpHelpers';
import { POWER_UP_IMAGE_PATHS, GOLD_COLOR, BASE_SHOP_WIDTH, BASE_SHOP_HEIGHT, HINTS, Hint, FINAL_LEVEL } from '../constants';
import { ScrollArea } from './ui/scroll-area';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';
import { OwnedPowerUpsDisplay } from './OwnedPowerUpsDisplay';
import { saveLifetimeGold, getLifetimeGold, getUnlockedHintIds, saveUnlockedHintIds } from '../utils/localStorage';

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
    const [lifetimeGold, setLifetimeGold] = useState(0);
    const goldUpdatedRef = useRef(false);
    const [unlockedHintIds, setUnlockedHintIds] = useState<number[]>([]);

    const updateScaleFactor = useCallback(() => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;
        const scaleX = currentWidth / BASE_SHOP_WIDTH;
        const scaleY = currentHeight / BASE_SHOP_HEIGHT;
        setScaleFactor(Math.min(scaleX, scaleY));
    }, []);

    useEffect(() => {
        setUnlockedHintIds(getUnlockedHintIds());

        if (!goldUpdatedRef.current) {
            const currentLifetimeGold = getLifetimeGold();
            const newLifetimeGold = currentLifetimeGold + totalGoldCollected;
            saveLifetimeGold(newLifetimeGold);
            setLifetimeGold(newLifetimeGold);
            goldUpdatedRef.current = true;
        } else {
            setLifetimeGold(getLifetimeGold());
        }
    }, [totalGoldCollected]);

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
        footerButtonHeight: 48 * scaleFactor,
    };

    const handleUnlockHint = (hint: Hint) => {
        if (lifetimeGold >= hint.cost && !unlockedHintIds.includes(hint.id)) {
            const newUnlockedIds = [...unlockedHintIds, hint.id];
            saveUnlockedHintIds(newUnlockedIds);
            setUnlockedHintIds(newUnlockedIds);
        }
    };

    const victoryMessage = won ? 
        (currentLevel === FINAL_LEVEL ? `You Won! You beat level ${FINAL_LEVEL}!` : 'You Won!') : 
        `Lost to Level ${currentLevel} :(`;

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
                        fontSize: scaled.fontSize(28),
                        marginTop: scaled.my(8),
                        marginBottom: scaled.mb(4)
                    }}
                >
                    {victoryMessage}
                </h1>
                
                <div
                    className="flex justify-center items-center text-center"
                    style={{
                        gap: scaled.gap(16),
                        fontSize: scaled.fontSize(18),
                        marginBottom: scaled.mb(4),
                    }}
                >
                    <span style={{ color: GOLD_COLOR }}>Total Gold Collected This Run: {totalGoldCollected}</span>
                    <span style={{ color: '#E5C100' }}>Lifetime Gold: {lifetimeGold}</span>
                </div>

                <div className="flex-grow w-full px-4 overflow-hidden flex flex-col">
                    <ScrollArea className="flex-grow p-2">
                        <ul className="flex flex-col" style={{ gap: scaled.gap(8) }}>
                            {HINTS.map((hint) => {
                                const isUnlocked = unlockedHintIds.includes(hint.id);
                                const canUnlock = lifetimeGold >= hint.cost;

                                if (isUnlocked) {
                                    return (
                                        <li key={hint.id} className="flex items-center justify-between text-left border border-gray-600 rounded" style={{ padding: scaled.p(8) }}>
                                            <span className="flex-grow" style={{ fontSize: scaled.fontSize(14), paddingRight: scaled.px(8) }}>{hint.text}</span>
                                        </li>
                                    );
                                }
                                
                                if (canUnlock) {
                                    return (
                                        <li 
                                            key={hint.id} 
                                            className="flex items-center justify-start text-left border border-green-500 hover:border-green-400 rounded cursor-pointer" 
                                            style={{ padding: scaled.p(8) }}
                                            onClick={() => handleUnlockHint(hint)}
                                        >
                                            <span className="flex-grow text-green-400" style={{ fontSize: scaled.fontSize(14) }}>
                                                Click to unlock hint #{hint.id}.
                                            </span>
                                        </li>
                                    );
                                }

                                return (
                                    <li key={hint.id} className="flex items-center justify-start text-left border border-white rounded opacity-70" style={{ padding: scaled.p(8) }}>
                                        <span className="flex-grow" style={{ fontSize: scaled.fontSize(14) }}>
                                            Hint #{hint.id}. Gain {hint.cost} lifetime gold to unlock.
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    </ScrollArea>
                </div>

                <div 
                    className="flex justify-around mt-auto w-full"
                    style={{ maxWidth: scaled.w(448), paddingTop: scaled.py(8) }}
                >
                    <Button 
                        onClick={onRestart} 
                        className="bg-gray-800 hover:bg-gray-700 text-white border border-white hover:border-purple-400 hover:text-purple-300"
                        style={{
                            paddingLeft: scaled.px(24),
                            paddingRight: scaled.px(24),
                            height: scaled.footerButtonHeight,
                            minHeight: scaled.h(36),
                            fontSize: scaled.fontSize(18)
                        }}
                    >
                        Play Again
                    </Button>
                    <Button 
                        onClick={onMenu} 
                        className="bg-gray-800 hover:bg-gray-700 text-white border border-white hover:border-yellow-400 hover:text-yellow-300"
                        style={{
                            paddingLeft: scaled.px(24),
                            paddingRight: scaled.px(24),
                            height: scaled.footerButtonHeight,
                            minHeight: scaled.h(36),
                            fontSize: scaled.fontSize(18)
                        }}
                    >
                        Back to Menu
                    </Button>
                </div>
            </div>
        </TooltipProvider>
    );
}; 
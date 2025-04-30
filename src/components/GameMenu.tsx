import React from 'react';
import { Button } from './ui/button';

interface GameMenuProps {
  onStartGame: (mode: 'main' | 'test') => void;
}

export const GameMenu: React.FC<GameMenuProps> = ({ onStartGame }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-4">Brick Blast Ultimate</h1>
      <p className="text-lg mb-8 text-gray-400 text-center px-4">Destroy all the bricks using your paddle and ball. Collect power-ups to help! Gain more gold for beating levels faster, and beware of the level time limit.</p>
      <Button
        onClick={() => onStartGame('main')} 
        className="px-8 py-4 text-xl bg-green-600 hover:bg-green-700 mb-4"
      >
        Main Game
      </Button>
      <Button 
        onClick={() => onStartGame('test')} 
        className="px-8 py-4 text-xl bg-blue-600 hover:bg-blue-700"
      >
        Test Level
      </Button>
    </div>
  );
};

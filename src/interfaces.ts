import React from 'react'; // Required for MutableRefObject

export interface Brick {
  x: number;
  y: number;
  status: number;     // 1 = active, 0 = destroyed
  strength: number;   // Conceptual base strength (usually 1)
  isSpecial: boolean;
  upgradeLevel?: number; // 0 = normal (orange), 1 = grey, 2 = brown, 3 = light blue
  isBomb?: boolean; // Added: To mark bomb bricks
}

export type PowerUpType = 
    'MULTI_BALL' | 'WIDEN_PADDLE' | 'LASER_PADDLE' | 'REGEN_BRICK' | 
    'SAFETY_NET' | 'REINFORCE_BRICK' | 'MAKE_SPECIAL' | 'BLACK_BALL' | 
    'ALL_IN_ONE' | 'PIERCE_BALL' | 'UPGRADE_BRICK' | 'BUILDER_BALL' | 
    'BIG_BALL' | 'SPLITTING_BALL' | 'SPEED_UP' | 'COLLECTION_FIELD' | 
    'HOMING_BALL' | 'BOMB_BRICK' | 'STICKY_PADDLE' | 'NONE'; 

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  status: 'falling' | 'collected';
  id: number;
  timeCreated?: number;
}

export interface Ball {
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  id: number;
  isBlack?: boolean;
  blackEndTime?: number;
  blackPausedDuration?: number; 
  pierceHitsRemaining?: number; 
  isBlue?: boolean;      
  blueEndTime?: number; 
  bluePausedDuration?: number; 
  isBig?: boolean;      
  bigEndTime?: number; 
  bigPausedDuration?: number; 
  isSplitting?: boolean;  
  splittingEndTime?: number; 
  splittingPausedDuration?: number; 
  isHoming?: boolean;     
  stuckOffset?: number; // Used for sticky paddle AND initial game start
}

export type SpawnMarker = 'PENDING' | 'SPAWN_SPECIAL' | 'NONE';

export interface PowerUpSpawnEvent {
    marker: SpawnMarker;
    brickX: number;
    brickY: number;
}

export interface CollisionResult {
  collision: boolean;
  newSpeedX: number;
  newSpeedY: number;
  spawnEvents: PowerUpSpawnEvent[]; 
  pointsAwarded: number;
  pierceOccurred: boolean;       
  builderHitOccurred: boolean; 
  brickHit: boolean; 
}

export interface Laser {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    id: number;
}

export interface GameStateRefs {
    paddleXRef: React.MutableRefObject<number>;
    ballsRef: React.MutableRefObject<Ball[]>;
    bricksRef: React.MutableRefObject<Brick[][]>;
    powerUpsRef: React.MutableRefObject<PowerUp[]>;
    scoreRef: React.MutableRefObject<number>;
    paddleWidthRef: React.MutableRefObject<number>;
    widenLevelRef: React.MutableRefObject<number>;
    laserShotsRef: React.MutableRefObject<number>;
    lasersRef: React.MutableRefObject<Laser[]>;
    safetyNetCountRef: React.MutableRefObject<number>;
    gameIsRunningRef: React.MutableRefObject<boolean>;
    gameOverStateRef: React.MutableRefObject<'playing' | 'won' | 'lost'>;
    gameSpeedFactorRef: React.MutableRefObject<number>;
    collectionFieldHeightRef: React.MutableRefObject<number>;
    collectionFieldWidthOffsetRef: React.MutableRefObject<number>;
    stickyPaddleChargesRef: React.MutableRefObject<number>; 
    stuckBallsRef: React.MutableRefObject<Ball[]>; 
    enabledPowerUpsRef: React.MutableRefObject<Set<PowerUpType>>;
    isGameStartedRef: React.MutableRefObject<boolean>; // Added flag
}

export interface GameLoopCallbacks {
    updateScoreCallback: (points: number) => void;
    setGameOverState: React.Dispatch<React.SetStateAction<'playing' | 'won' | 'lost'>>;
    schedulePaddleShrink: () => void;
    scheduleFieldShrink: () => void;
    drawEndMessage: (context: CanvasRenderingContext2D, state: 'won' | 'lost', finalScore: number) => void;
}

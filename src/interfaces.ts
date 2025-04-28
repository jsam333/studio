import React from 'react'; // Required for MutableRefObject

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  status: number;
  strength: number;
  isSpecial: boolean;
  upgradeLevel?: number;
  isBomb?: boolean;
}

export type PowerUpType =
    'MULTI_BALL' | 'MULTI_BALL_L2' | 'MULTI_BALL_L3' | // Max level 3
    'WIDEN_PADDLE' | 'WIDEN_PADDLE_L2' | 'WIDEN_PADDLE_L3' | // Max level 3
    'LASER_PADDLE' | 'LASER_PADDLE_L2' | 'LASER_PADDLE_L3' | // Added L2, L3
    'REGEN_BRICK' |
    'SAFETY_NET' | 'REINFORCE_BRICK' | 'MAKE_SPECIAL' | 'BLACK_BALL' |
    'ALL_IN_ONE' | 'PIERCE_BALL' | 'UPGRADE_BRICK' | 'BUILDER_BALL' |
    'BIG_BALL' | 'SPLITTING_BALL' | 'COLLECTION_FIELD' |
    'HOMING_BALL' | 'BOMB_BRICK' |
    'STICKY_PADDLE' | 'STICKY_PADDLE_L2' | 'STICKY_PADDLE_L3' | // Added L2, L3
    'NONE';

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  status: 'falling' | 'collected';
  id: number;
  timeCreated?: number;
  speedY?: number; 
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
  stuckOffset?: number;
}

export type SpawnMarker = 'PENDING' | 'SPAWN_SPECIAL' | 'NONE';

export interface PowerUpSpawnEvent {
    marker: SpawnMarker;
    brickX: number;
    brickY: number;
    brickWidth: number;
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

export type GameState = 'menu' | 'playing' | 'won' | 'lost' | 'shop';
export type GameMode = 'main' | 'test';

export interface GameStateRefsBase {
    paddleXRef: React.MutableRefObject<number>;
    ballsRef: React.MutableRefObject<Ball[]>;
    bricksRef: React.MutableRefObject<Brick[][]>;
    powerUpsRef: React.MutableRefObject<PowerUp[]>;
    scoreRef: React.MutableRefObject<number>;
    targetScoreRef: React.MutableRefObject<number>;
    totalBricksRef: React.MutableRefObject<number>;
    goldRef: React.MutableRefObject<number>;
    bonusGoldRef: React.MutableRefObject<number>;
    spawnablePowerUpsRef: React.MutableRefObject<Set<PowerUpType>>;
    paddleWidthRef: React.MutableRefObject<number>;
    widenLevelRef: React.MutableRefObject<number>; 
    laserShotsRef: React.MutableRefObject<number>; // May represent level/shots depending on implementation
    lasersRef: React.MutableRefObject<Laser[]>;
    safetyNetCountRef: React.MutableRefObject<number>;
    gameIsRunningRef: React.MutableRefObject<boolean>;
    gameOverStateRef: React.MutableRefObject<GameState>;
    gameSpeedFactorRef: React.MutableRefObject<number>;
    collectionFieldHeightRef: React.MutableRefObject<number>;
    collectionFieldWidthOffsetRef: React.MutableRefObject<number>;
    stickyPaddleChargesRef: React.MutableRefObject<number>; // May represent level/charges
    stuckBallsRef: React.MutableRefObject<Ball[]>;
    enabledPowerUpsRef: React.MutableRefObject<Set<PowerUpType>>;
    isGameStartedRef: React.MutableRefObject<boolean>;
    bonusCountdownStartedRef: React.MutableRefObject<boolean>;
    brickColumnsRef: React.MutableRefObject<number>;
    brickRowsRef: React.MutableRefObject<number>;
    gameModeRef: React.MutableRefObject<GameMode | null>;
}

export interface GameStateRefs extends GameStateRefsBase {
    paddleShrinkCountdownRef?: React.MutableRefObject<number | null>;
    collectionFieldShrinkTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    bonusGoldTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>; 
    bonusGoldDecrementIntervalRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    animationFrameIdRef?: React.MutableRefObject<number | null>;
    lastTimeRef?: React.MutableRefObject<number>;
    currentLevelRef: React.MutableRefObject<number>;
}

export interface GameLoopCallbacks {
    updateScoreCallback: (points: number) => void;
    setGameOverState: React.Dispatch<React.SetStateAction<GameState>>;
    schedulePaddleShrink: () => void;
    executePaddleShrink: () => void; 
    scheduleFieldShrink: () => void;
    drawEndMessage: (context: CanvasRenderingContext2D, state: GameState, finalScore: number) => void; 
}

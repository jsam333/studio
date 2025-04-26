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
    'MULTI_BALL' | 'WIDEN_PADDLE' | 'LASER_PADDLE' | 'REGEN_BRICK' |
    'SAFETY_NET' | 'REINFORCE_BRICK' | 'MAKE_SPECIAL' | 'BLACK_BALL' |
    'ALL_IN_ONE' | 'PIERCE_BALL' | 'UPGRADE_BRICK' | 'BUILDER_BALL' |
    'BIG_BALL' | 'SPLITTING_BALL' | 'COLLECTION_FIELD' |
    'HOMING_BALL' | 'BOMB_BRICK' | 'STICKY_PADDLE' | 'NONE'; // Removed 'SPEED_UP'

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  status: 'falling' | 'collected';
  id: number;
  timeCreated?: number;
  // Add speedY for power-ups that fall
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
    speed: number; // Laser speed is inherent, updated via scaledDeltaTime
    id: number;
}

export type GameState = 'menu' | 'playing' | 'won' | 'lost' | 'shop';
export type GameMode = 'main' | 'test';

// Base refs shared across hooks and components
export interface GameStateRefsBase {
    paddleXRef: React.MutableRefObject<number>;
    ballsRef: React.MutableRefObject<Ball[]>;
    bricksRef: React.MutableRefObject<Brick[][]>;
    powerUpsRef: React.MutableRefObject<PowerUp[]>;
    scoreRef: React.MutableRefObject<number>;
    totalBricksRef: React.MutableRefObject<number>;
    goldRef: React.MutableRefObject<number>;
    bonusGoldRef: React.MutableRefObject<number>; // Added for level complete bonus
    spawnablePowerUpsRef: React.MutableRefObject<Set<PowerUpType>>;
    paddleWidthRef: React.MutableRefObject<number>;
    widenLevelRef: React.MutableRefObject<number>;
    laserShotsRef: React.MutableRefObject<number>;
    lasersRef: React.MutableRefObject<Laser[]>;
    safetyNetCountRef: React.MutableRefObject<number>;
    gameIsRunningRef: React.MutableRefObject<boolean>;
    gameOverStateRef: React.MutableRefObject<GameState>;
    gameSpeedFactorRef: React.MutableRefObject<number>;
    collectionFieldHeightRef: React.MutableRefObject<number>;
    collectionFieldWidthOffsetRef: React.MutableRefObject<number>;
    stickyPaddleChargesRef: React.MutableRefObject<number>;
    stuckBallsRef: React.MutableRefObject<Ball[]>;
    enabledPowerUpsRef: React.MutableRefObject<Set<PowerUpType>>;
    isGameStartedRef: React.MutableRefObject<boolean>; // Tracks if ball launched
    bonusCountdownStartedRef: React.MutableRefObject<boolean>; // Tracks if bonus countdown started
    brickColumnsRef: React.MutableRefObject<number>;
    brickRowsRef: React.MutableRefObject<number>;
    gameModeRef: React.MutableRefObject<GameMode | null>;
}

// Extended refs including timers and loop-specific refs
export interface GameStateRefs extends GameStateRefsBase {
    // widenTimeoutRef?: React.MutableRefObject<NodeJS.Timeout | null>; // REMOVED
    paddleShrinkCountdownRef?: React.MutableRefObject<number | null>; // ADDED: Number for remaining ms
    collectionFieldShrinkTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>;
    bonusGoldTimerRef?: React.MutableRefObject<NodeJS.Timeout | null>; 
    bonusGoldDecrementIntervalRef?: React.MutableRefObject<NodeJS.Timeout | null>; // Timer for bonus gold decrement
    animationFrameIdRef?: React.MutableRefObject<number | null>;
    lastTimeRef?: React.MutableRefObject<number>;
    currentLevelRef: React.MutableRefObject<number>;
}

// Callbacks passed from the main component/hook to the game loop
export interface GameLoopCallbacks {
    updateScoreCallback: (points: number) => void;
    setGameOverState: React.Dispatch<React.SetStateAction<GameState>>;
    schedulePaddleShrink: () => void;
    executePaddleShrink: () => void; // ADDED: Callback to execute the shrink logic
    scheduleFieldShrink: () => void;
    drawEndMessage: (context: CanvasRenderingContext2D, state: GameState, finalScore: number) => void; // Use GameState type
    // Add speedY to PowerUp interface if not already there
    // Ensure PowerUp interface has speedY?: number;
}
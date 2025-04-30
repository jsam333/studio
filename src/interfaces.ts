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
  holdsBall?: boolean; // Added for the new power-up
}

export type PowerUpType =
    'MULTI_BALL' | 'MULTI_BALL_L2' | 'MULTI_BALL_L3' |
    'WIDEN_PADDLE' | 'WIDEN_PADDLE_L2' | 'WIDEN_PADDLE_L3' |
    'LASER_PADDLE' | 'LASER_PADDLE_L2' | 'LASER_PADDLE_L3' |
    'REGEN_BRICK' | 'REGEN_BRICK_L2' | 'REGEN_BRICK_L3' |
    'SAFETY_NET' | 'SAFETY_NET_L2' | 'SAFETY_NET_L3' |
    'REINFORCE_BRICK' | 'REINFORCE_BRICK_L2' | 'REINFORCE_BRICK_L3' |
    'MAKE_SPECIAL' | 'MAKE_SPECIAL_L2' | 'MAKE_SPECIAL_L3' |
    'BLACK_BALL' | 'BLACK_BALL_L2' | 'BLACK_BALL_L3' |
    'ALL_IN_ONE' | // ALL_IN_ONE remains single level
    'PIERCE_BALL' | 'PIERCE_BALL_L2' | 'PIERCE_BALL_L3' |
    'UPGRADE_BRICK' | 'UPGRADE_BRICK_L2' | 'UPGRADE_BRICK_L3' |
    'BUILDER_BALL' | 'BUILDER_BALL_L2' | 'BUILDER_BALL_L3' |
    'BIG_BALL' | 'BIG_BALL_L2' | 'BIG_BALL_L3' |
    'SPLITTING_BALL' | 'SPLITTING_BALL_L2' | 'SPLITTING_BALL_L3' |
    'COLLECTION_FIELD' | 'COLLECTION_FIELD_L2' | 'COLLECTION_FIELD_L3' |
    'HOMING_BALL' | 'HOMING_BALL_L2' | 'HOMING_BALL_L3' |
    'BOMB_BRICK' | 'BOMB_BRICK_L2' | 'BOMB_BRICK_L3' |
    'STICKY_PADDLE' | 'STICKY_PADDLE_L2' | 'STICKY_PADDLE_L3' |
    'BALL_BRICK' | 'BALL_BRICK_L2' | 'BALL_BRICK_L3' | // Added levels L2 and L3
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
  stuckOffset?: number; // For top sticking
  stuckSide?: 'left' | 'right' | null; // For side sticking
  stuckSideOffset?: number; // Vertical offset for side sticking
}

export type SpawnMarker = 'PENDING' | 'SPAWN_SPECIAL' | 'SPAWN_BALL' | 'NONE';

export interface PowerUpSpawnEvent {
    marker: SpawnMarker;
    brickX: number;
    brickY: number;
    brickWidth: number;
    brickHeight: number;
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

// Add 'level_reset' to GameState
export type GameState = 'menu' | 'playing' | 'won' | 'lost' | 'shop' | 'level_reset';
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
    isGameStartedRef: React.MutableRefObject<boolean>;
    bonusCountdownStartedRef: React.MutableRefObject<boolean>;
    brickColumnsRef: React.MutableRefObject<number>;
    brickRowsRef: React.MutableRefObject<number>;
    gameModeRef: React.MutableRefObject<GameMode | null>;
    // Add livesRef
    livesRef: React.MutableRefObject<number>;
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
    // Add resetLevelCallback
    resetLevelCallback: (mode: GameMode | null, resetScoreAndGold: boolean) => void;
}


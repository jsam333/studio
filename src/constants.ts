import { PowerUpType } from './interfaces';

// Game Board
export const BOARD_WIDTH = 600;
export const BOARD_HEIGHT = 400;

// Paddle
export const INITIAL_PADDLE_WIDTH = 80; // Was 100
export const PADDLE_HEIGHT = 15;
export const PADDLE_Y = BOARD_HEIGHT - PADDLE_HEIGHT;
export const PADDLE_SPEED = 7; // Movement speed
export const PADDLE_FRICTION = 0.9; // Friction factor for smoother stopping

// Ball
export const BALL_SIZE = 4; // Was 10
export const BASE_BALL_SPEED_FACTOR = 1; // Added this back with default value
export const INITIAL_BALL_SPEED_X = 0;
export const INITIAL_BALL_SPEED_Y = 4;
export const MAX_BALL_SPEED_X = 10; // Added back for compatibility, example value
export const MAX_BALL_SPEED_Y = 10; // Max vertical speed
export const MIN_BALL_SPEED_Y = 1;  // Min vertical speed to prevent getting stuck horizontally
export const STICKY_BALL_DURATION_MS = 3000; // How long the ball stays sticky
export const HOMING_BALL_ACCELERATION = 0.05; // Speed increment per frame towards target
export const MAX_HOMING_SPEED = 6; // Maximum speed for homing effect
export const SPLIT_BALL_ANGLE_OFFSET = Math.PI / 6; // Angle offset for split balls (30 degrees)
export const BIG_BALL_SIZE_INCREASE = 4; // Amount radius increases for BIG_BALL power-up
export const PIERCE_BALL_HITS = 3; // Number of bricks a PIERCE_BALL can destroy before reverting

// Bricks
export const BRICK_ROWS = 22;
export const BRICK_COLUMNS = 53;
export const BRICK_PADDING = 1; // Was 2
// Calculated width: (600 - (53-1)*1) / 53 = 548/53 = 10.33 -> Using 10
export const BRICK_WIDTH = 10; // Was 8
// Calculated height: (Target 250px space: 250 - (22-1)*1) / 22 = 229 / 22 = 10.4 -> Using 9
export const BRICK_HEIGHT = 9; // Was 8
export const BRICK_OFFSET_TOP = 20; // Was 30
// Calculated Offset Left: (600 - (53 * 10 + (53 - 1) * 1)) / 2 = (600 - 582) / 2 = 9
export const BRICK_OFFSET_LEFT = (BOARD_WIDTH - (BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_PADDING)) / 2;
export const BRICK_REGEN_DELAY = 5000; // Delay in milliseconds before a brick regenerates
export const NORMAL_BRICK_POINTS = 10;
export const REINFORCED_BRICK_POINTS = 30;
export const UPGRADED_BRICK_POINTS = 50;
export const BUILDER_BRICK_POINTS = 75;
export const SPECIAL_BRICK_POINTS = 100;
// --- Constants for src/gameLogic.ts (Re-added to fix import error without logic change) ---
export const NORMAL_BRICK_STRENGTH = 1; // Example value
export const REINFORCED_BRICK_STRENGTH = 2; // Example value
export const UPGRADED_BRICK_STRENGTH = 3; // Example value
export const BUILDER_BRICK_STRENGTH = 4; // Example value
export const MAX_BRICK_UPGRADE_LEVEL = 3; // Example value (Matches BUILDER_BRICK_MAX_LEVEL?)
export const BOMB_BRICK_POINTS = 1; // Set to 1 as requested
export const BOMB_DAMAGE_POINTS = 10; // Example value for explosion damage points
// --- End Re-added Constants ---


// Power-ups
export const POWER_UP_SIZE = 8;
export const POWER_UP_SPEED = 2;
export const BASE_POWER_UP_SPEED = 2;
export const POWER_UP_SPAWN_THRESHOLD = 1.0;
export const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.05;
export const SAFETY_NET_HEIGHT = 5;
export const BUILDER_BRICK_MAX_LEVEL = 3;
export const BUILDER_BALL_SPAWN_CHANCE = 0.15;
export const MULTI_BALL_COUNT = 3;
export const BLACK_BALL_DURATION_MS = 10000;
export const BOMB_BRICK_SPAWN_CHANCE = 0.1;
export const BOMB_EXPLOSION_RADIUS_FACTOR = 1.5;

// --- Constants for src/gameUtils.ts ---
export const BASE_POWER_UP_CHANCE = 1;
export const POWER_UP_COUNT_THRESHOLD = 20;
export const POWER_UP_SECOND_THRESHOLD = 4;
export const POWER_UP_SECOND_CHANCE_REDUCTION_PER_EXTRA = 0.02;
// --- End Re-added Constants ---

// --- Constants for src/gameUpdates/powerUpEffects.ts ---
export const SPEED_UP_INCREMENT = 0.1;
export const SPLITTING_BALL_DURATION = 10000;
export const BIG_BALL_DURATION = 10000;
export const BUILDER_BALL_DURATION = 10000;
export const BLACK_BALL_DURATION = 10000;
// --- End Re-added Constants ---


// Collection Field
export const FIELD_INITIAL_HEIGHT_OFFSET = 0;
export const FIELD_HEIGHT_INCREMENT = 5;
export const FIELD_MAX_HEIGHT_OFFSET = 75;
export const FIELD_INITIAL_WIDTH_OFFSET = 0;
export const FIELD_WIDTH_INCREMENT = 8;
export const FIELD_MAX_WIDTH_OFFSET = 80;
export const FIELD_SHRINK_RATE_H = 0.1;
export const FIELD_SHRINK_RATE_W = 0.08;
export const FIELD_SHRINK_INTERVAL = 16;

// *** All potentially spawnable power-ups (for UI and logic) ***
export const ALL_TOGGLEABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL',
    'WIDEN_PADDLE',
    'LASER_PADDLE',
    'REGEN_BRICK',
    'SAFETY_NET',
    'REINFORCE_BRICK',
    'MAKE_SPECIAL',
    'BLACK_BALL',
    'PIERCE_BALL',
    'UPGRADE_BRICK',
    'BUILDER_BALL',
    'BIG_BALL',
    'SPLITTING_BALL',
    'SPEED_UP',
    'COLLECTION_FIELD',
    'HOMING_BALL',
    'BOMB_BRICK',
    'STICKY_PADDLE',
];

// Power-up specific constants
// NOTE: The WIDEN_PADDLE increment and max width might need adjustment now that INITIAL_PADDLE_WIDTH changed
export const PADDLE_WIDEN_INCREMENT = INITIAL_PADDLE_WIDTH * 0.1;
export const MAX_PADDLE_WIDEN_DURATION = 5000;
export const MIN_PADDLE_WIDEN_DURATION = 100;
export const MAX_PADDLE_WIDTH = INITIAL_PADDLE_WIDTH * 5;
export const LASER_SPEED = 5;
export const LASER_WIDTH = 5;
export const LASER_HEIGHT = 15;
export const LASER_COOLDOWN = 300;
export const LASER_STRIPE_WIDTH_PER_SHOT = 4;

// Colors
export const NORMAL_BRICK_COLOR = '#e67e22'; // Was #0095DD
export const REINFORCED_BRICK_COLOR = '#0077AA';
export const UPGRADED_BRICK_COLOR = '#005588';
export const BUILDER_BRICK_COLOR = '#44AAFF';
export const SPECIAL_BRICK_COLOR = '#FFD700';
export const BOMB_BRICK_COLOR = '#8B0000';
export const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
export const RAINBOW_FLASH_INTERVAL = 100;

export const POWER_UP_COLORS: { [key in PowerUpType | 'NONE']: string } = {
    MULTI_BALL: '#32CD32',       // LimeGreen
    WIDEN_PADDLE: '#FF69B4',     // HotPink
    LASER_PADDLE: '#FF4500',     // OrangeRed
    REGEN_BRICK: '#ADFF2F',      // GreenYellow
    SAFETY_NET: '#1E90FF',       // DodgerBlue
    REINFORCE_BRICK: '#708090', // SlateGray
    MAKE_SPECIAL: '#FFD700',     // Gold
    BLACK_BALL: '#000000',       // Black
    PIERCE_BALL: '#DC143C',      // Crimson
    UPGRADE_BRICK: '#8A2BE2',    // BlueViolet
    BUILDER_BALL: '#4682B4',    // SteelBlue
    BIG_BALL: '#F08080',        // LightCoral
    SPLITTING_BALL: '#9370DB', // MediumPurple
    SPEED_UP: '#FFA500',        // Orange
    COLLECTION_FIELD: '#20B2AA', // LightSeaGreen
    HOMING_BALL: '#DAA520',      // GoldenRod
    BOMB_BRICK: '#A52A2A',      // Brown
    ALL_IN_ONE: '#FFFFFF',       // White (placeholder, uses rainbow)
    STICKY_PADDLE: '#B8860B',   // DarkGoldenRod
    NONE: '#888888'             // Gray for unknown/default
};

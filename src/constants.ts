import { PowerUpType } from './interfaces';

// Game Board
export const BOARD_WIDTH = 600;
export const BOARD_HEIGHT = 400;
export const TARGET_FPS = 60; // Define target FPS

// Paddle
export const INITIAL_PADDLE_WIDTH = 80;
export const PADDLE_HEIGHT = 15;
export const PADDLE_Y = BOARD_HEIGHT - PADDLE_HEIGHT;
export const PADDLE_SPEED = 7;
export const PADDLE_FRICTION = 0.9;

// Ball
export const BALL_SIZE = 4;
export const BASE_BALL_SPEED_FACTOR = 1;
export const INITIAL_BALL_SPEED_X = 0;
export const INITIAL_BALL_SPEED_Y = 4;
export const MAX_BALL_SPEED_X = 10;
export const MAX_BALL_SPEED_Y = 10;
export const MIN_BALL_SPEED_Y = 1;
export const STICKY_BALL_DURATION_MS = 3000;
export const HOMING_BALL_ACCELERATION = 0.05;
export const MAX_HOMING_SPEED = 6;
export const SPLIT_BALL_ANGLE_OFFSET = Math.PI / 6;
export const BIG_BALL_SIZE_INCREASE = 4;
export const PIERCE_BALL_HITS = 3;

// Bricks
export const BRICK_ROWS = 20; // Default rows for Test mode
export const BRICK_COLUMNS = 53; // Default columns for Test mode
export const BRICK_PADDING = 1;
export const BRICK_WIDTH = 10; // Default width (used for test mode)
export const BRICK_HEIGHT = 9; // Default height
export const TALL_BRICK_HEIGHT = 15; // Taller height for specific main levels
export const TARGET_TOTAL_BRICK_GRID_HEIGHT = 165; // Target height for levels 8+
export const BRICK_OFFSET_TOP = 30; // Adjusted offset for space for info text
export const BRICK_OFFSET_LEFT = (BOARD_WIDTH - (BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_PADDING)) / 2;
export const BRICK_REGEN_DELAY = 5000;
export const NORMAL_BRICK_POINTS = 10;
export const REINFORCED_BRICK_POINTS = 30;
export const UPGRADED_BRICK_POINTS = 50;
export const BUILDER_BRICK_POINTS = 75;
export const SPECIAL_BRICK_POINTS = 100;
export const NORMAL_BRICK_STRENGTH = 1;
export const REINFORCED_BRICK_STRENGTH = 2;
export const UPGRADED_BRICK_STRENGTH = 3;
export const BUILDER_BRICK_STRENGTH = 4;
export const MAX_BRICK_UPGRADE_LEVEL = 3;
export const BOMB_BRICK_POINTS = 1;
export const BOMB_DAMAGE_POINTS = 10;


// Power-ups
export const POWER_UP_SIZE = 8;
export const POWER_UP_SPEED = 2;
export const BASE_POWER_UP_SPEED = 2;
export const POWER_UP_SPAWN_THRESHOLD = 1.0;
export const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.05;
export const SAFETY_NET_HEIGHT = 3;
export const BUILDER_BRICK_MAX_LEVEL = 3;
export const BUILDER_BALL_SPAWN_CHANCE = 0.15;
export const MULTI_BALL_COUNT = 3; // Base count for L1
export const BLACK_BALL_DURATION_MS = 10000;
export const BOMB_BRICK_SPAWN_CHANCE = 0.1;
export const BOMB_EXPLOSION_RADIUS_FACTOR = 1.5;

export const BASE_POWER_UP_CHANCE = 1;
export const POWER_UP_COUNT_THRESHOLD = 20;
export const POWER_UP_SECOND_THRESHOLD = 4;
export const POWER_UP_SECOND_CHANCE_REDUCTION_PER_EXTRA = 0.02;

// export const SPEED_UP_INCREMENT = 0.1; // Removed SPEED_UP power-up
export const SPLITTING_BALL_DURATION = 10000;
export const BIG_BALL_DURATION = 10000;
export const BUILDER_BALL_DURATION = 5000;
export const BLACK_BALL_DURATION = 10000;

// Bonus Gold
export const INITIAL_BONUS_GOLD = 30;
export const MINIMUM_BONUS_GOLD = 5;
export const BONUS_GOLD_START_DELAY_DEFAULT = 10000;
export const BONUS_GOLD_START_DELAY_EXTENDED = 15000;
export const BONUS_GOLD_START_DELAY_HIGH = 20000;
export const BONUS_GOLD_START_DELAY_MAX = 30000;
export const BONUS_GOLD_DECREMENT_INTERVAL = 1000; // Added this export


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
// NOTE: Upgrades (L2/L3) are handled by ShopScreen, not listed here.
export const ALL_TOGGLEABLE_POWER_UPS: PowerUpType[] = [
    'MULTI_BALL', //exponential
    'WIDEN_PADDLE', //safety and powerups
    'LASER_PADDLE', //linear
    'REGEN_BRICK', //points and powerup
    'SAFETY_NET', //safety
    'REINFORCE_BRICK', //points
    'MAKE_SPECIAL', //exponential
    'BLACK_BALL', //linear
    'PIERCE_BALL', //linear
    'UPGRADE_BRICK', //points
    'BUILDER_BALL', //points
    'BIG_BALL', //safety?
    'SPLITTING_BALL', //exponential
    'COLLECTION_FIELD', //powerup
    'HOMING_BALL', //safety
    'BOMB_BRICK', //linear
    'STICKY_PADDLE', //safety
    'BALL_BRICK', // Added new power-up
];

// *** Individual Power-up Costs ***
export const POWER_UP_COSTS: { [key in PowerUpType]?: number } = {
    MULTI_BALL: 17,
    MULTI_BALL_L2: 21,
    MULTI_BALL_L3: 27,
    WIDEN_PADDLE: 10,
    WIDEN_PADDLE_L2: 13,
    WIDEN_PADDLE_L3: 17,
    LASER_PADDLE: 11,
    LASER_PADDLE_L2: 14,
    LASER_PADDLE_L3: 18,
    REGEN_BRICK: 10,
    REGEN_BRICK_L2: 13,
    REGEN_BRICK_L3: 16,
    SAFETY_NET: 9,
    SAFETY_NET_L2: 12,
    SAFETY_NET_L3: 16,
    REINFORCE_BRICK: 9,
    REINFORCE_BRICK_L2: 11,
    REINFORCE_BRICK_L3: 14,
    MAKE_SPECIAL: 16,
    MAKE_SPECIAL_L2: 21,
    MAKE_SPECIAL_L3: 27,
    BLACK_BALL: 16,
    BLACK_BALL_L2: 18,
    BLACK_BALL_L3: 20,
    PIERCE_BALL: 14,
    PIERCE_BALL_L2: 17,
    PIERCE_BALL_L3: 21,
    UPGRADE_BRICK: 14,
    UPGRADE_BRICK_L2: 17,
    UPGRADE_BRICK_L3: 21,
    BUILDER_BALL: 20,
    BUILDER_BALL_L2: 22,
    BUILDER_BALL_L3: 24,
    BIG_BALL: 12,
    BIG_BALL_L2: 14,
    BIG_BALL_L3: 16,
    SPLITTING_BALL: 25,
    SPLITTING_BALL_L2: 30,
    SPLITTING_BALL_L3: 36,
    COLLECTION_FIELD: 9,
    COLLECTION_FIELD_L2: 14,
    COLLECTION_FIELD_L3: 19,
    HOMING_BALL: 12,
    HOMING_BALL_L2: 15,
    HOMING_BALL_L3: 18,
    BOMB_BRICK: 12,
    BOMB_BRICK_L2: 15,
    BOMB_BRICK_L3: 18,
    STICKY_PADDLE: 12,
    STICKY_PADDLE_L2: 15,
    STICKY_PADDLE_L3: 18,
    BALL_BRICK: 15,
    BALL_BRICK_L2: 19, // Added L2 cost
    BALL_BRICK_L3: 24, // Added L3 cost
    ALL_IN_ONE: 100, // Remains single level
    NONE: 0
};


// Power-up specific constants
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
export const GOLD_COLOR = '#FFD700';
export const NORMAL_BRICK_COLOR = '#e67e22';
export const REINFORCED_BRICK_COLOR = '#0077AA';
export const UPGRADED_BRICK_COLOR = '#005588';
export const BUILDER_BRICK_COLOR = '#44AAFF';
export const SPECIAL_BRICK_COLOR = '#FFD700';
export const BOMB_BRICK_COLOR = '#8B0000';
export const BALL_BRICK_COLOR = '#FFFFFF'; // Added color for the ball-holding brick
export const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
export const RAINBOW_FLASH_INTERVAL = 100;

export const POWER_UP_COLORS: { [key in PowerUpType | 'NONE']?: string } = {
    MULTI_BALL: '#32CD32',
    MULTI_BALL_L2: '#228B22',
    MULTI_BALL_L3: '#006400',
    WIDEN_PADDLE: '#FF69B4',
    WIDEN_PADDLE_L2: '#FF1493',
    WIDEN_PADDLE_L3: '#C71585',
    LASER_PADDLE: '#FF4500',
    LASER_PADDLE_L2: '#FF0000',
    LASER_PADDLE_L3: '#DC143C',
    REGEN_BRICK: '#ADFF2F',         // GreenYellow
    REGEN_BRICK_L2: '#9ACD32',     // YellowGreen
    REGEN_BRICK_L3: '#556B2F',     // DarkOliveGreen
    SAFETY_NET: '#1E90FF',         // DodgerBlue
    SAFETY_NET_L2: '#4169E1',     // RoyalBlue
    SAFETY_NET_L3: '#0000CD',     // MediumBlue
    REINFORCE_BRICK: '#708090',   // SlateGray
    REINFORCE_BRICK_L2: '#778899', // LightSlateGray
    REINFORCE_BRICK_L3: '#2F4F4F', // DarkSlateGray
    MAKE_SPECIAL: '#FFD700',      // Gold (Base)
    MAKE_SPECIAL_L2: '#FFA500',  // Orange
    MAKE_SPECIAL_L3: '#FF8C00',  // DarkOrange
    BLACK_BALL: '#000000',         // Black
    BLACK_BALL_L2: '#444444',     // Darker Gray
    BLACK_BALL_L3: '#888888',     // Gray
    PIERCE_BALL: '#DC143C',      // Crimson (Base)
    PIERCE_BALL_L2: '#B22222',  // Firebrick
    PIERCE_BALL_L3: '#8B0000',  // DarkRed
    UPGRADE_BRICK: '#8A2BE2',    // BlueViolet
    UPGRADE_BRICK_L2: '#9932CC', // DarkOrchid
    UPGRADE_BRICK_L3: '#8B008B', // DarkMagenta
    BUILDER_BALL: '#4682B4',     // SteelBlue
    BUILDER_BALL_L2: '#5F9EA0',  // CadetBlue
    BUILDER_BALL_L3: '#008B8B', // DarkCyan
    BIG_BALL: '#F08080',         // LightCoral
    BIG_BALL_L2: '#CD5C5C',     // IndianRed
    BIG_BALL_L3: '#A52A2A',     // Brown (Same as Bomb Brick L1)
    SPLITTING_BALL: '#9370DB',   // MediumPurple
    SPLITTING_BALL_L2: '#8A2BE2', // BlueViolet (Same as Upgrade L1)
    SPLITTING_BALL_L3: '#4B0082', // Indigo
    COLLECTION_FIELD: '#20B2AA', // LightSeaGreen
    COLLECTION_FIELD_L2: '#008B8B',// DarkCyan (Same as Builder L3)
    COLLECTION_FIELD_L3: '#008080',// Teal
    HOMING_BALL: '#DAA520',      // Goldenrod (Same as Sticky L2)
    HOMING_BALL_L2: '#B8860B',  // DarkGoldenrod (Same as Sticky L1)
    HOMING_BALL_L3: '#8B4513',  // SaddleBrown
    BOMB_BRICK: '#A52A2A',       // Brown (Same as Big Ball L3)
    BOMB_BRICK_L2: '#8B0000',   // DarkRed (Same as Pierce L3)
    BOMB_BRICK_L3: '#800000',   // Maroon
    STICKY_PADDLE: '#B8860B',
    STICKY_PADDLE_L2: '#DAA520',
    STICKY_PADDLE_L3: '#FFD700',
    BALL_BRICK: '#40E0D0', // Turquoise
    BALL_BRICK_L2: '#00CED1', // DarkTurquoise
    BALL_BRICK_L3: '#20B2AA', // LightSeaGreen (Same as Collection L1)
    ALL_IN_ONE: '#FFFFFF',
    NONE: '#888888'
};

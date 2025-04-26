import { PowerUpType } from './interfaces';

// Game Board
export const BOARD_WIDTH = 600;
export const BOARD_HEIGHT = 400;

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
export const MULTI_BALL_COUNT = 3;
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
    // 'SPEED_UP', // Removed SPEED_UP power-up
    'COLLECTION_FIELD',
    'HOMING_BALL',
    'BOMB_BRICK',
    'STICKY_PADDLE',
];

// *** Individual Power-up Costs ***
export const POWER_UP_COSTS: { [key in PowerUpType]: number } = {
    MULTI_BALL: 17,
    WIDEN_PADDLE: 10,
    LASER_PADDLE: 11,
    REGEN_BRICK: 10,
    SAFETY_NET: 9,
    REINFORCE_BRICK: 9,
    MAKE_SPECIAL: 16,
    BLACK_BALL: 16,
    PIERCE_BALL: 14,
    UPGRADE_BRICK: 14,
    BUILDER_BALL: 20,
    BIG_BALL: 8,
    SPLITTING_BALL: 25,
    // SPEED_UP: 5, // Removed SPEED_UP power-up
    COLLECTION_FIELD: 9,
    HOMING_BALL: 12,
    BOMB_BRICK: 12,
    STICKY_PADDLE: 12,
    ALL_IN_ONE: 100, // ALL_IN_ONE might not be purchasable, but included for completeness
    NONE: 0 // Should not be purchasable
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
export const GOLD_COLOR = '#FFD700'; // Added gold color
export const NORMAL_BRICK_COLOR = '#e67e22';
export const REINFORCED_BRICK_COLOR = '#0077AA';
export const UPGRADED_BRICK_COLOR = '#005588';
export const BUILDER_BRICK_COLOR = '#44AAFF';
export const SPECIAL_BRICK_COLOR = '#FFD700';
export const BOMB_BRICK_COLOR = '#8B0000';
export const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
export const RAINBOW_FLASH_INTERVAL = 100;

export const POWER_UP_COLORS: { [key in PowerUpType | 'NONE']: string } = {
    MULTI_BALL: '#32CD32',
    WIDEN_PADDLE: '#FF69B4',
    LASER_PADDLE: '#FF4500',
    REGEN_BRICK: '#ADFF2F',
    SAFETY_NET: '#1E90FF',
    REINFORCE_BRICK: '#708090',
    MAKE_SPECIAL: '#FFD700',
    BLACK_BALL: '#000000',
    PIERCE_BALL: '#DC143C',
    UPGRADE_BRICK: '#8A2BE2',
    BUILDER_BALL: '#4682B4',
    BIG_BALL: '#F08080',
    SPLITTING_BALL: '#9370DB',
    // SPEED_UP: '#FFA500', // Removed SPEED_UP power-up
    COLLECTION_FIELD: '#20B2AA',
    HOMING_BALL: '#DAA520',
    BOMB_BRICK: '#A52A2A',
    ALL_IN_ONE: '#FFFFFF',
    STICKY_PADDLE: '#B8860B',
    NONE: '#888888'
};

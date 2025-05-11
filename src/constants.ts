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
export const PADDLE_EDGE_STICK_THRESHOLD = 0.15; // 15% of paddle width from edge for top-sticking
export const PADDLE_SIDE_SAVE_THRESHOLD = 90; // Pixels from paddle side to trigger bottom save

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
export const ZIP_TO_PADDLE_DURATION = 100; // milliseconds for the zip animation

// Bricks
export const BRICK_ROWS = 20; // Default rows for Test mode
export const BRICK_COLUMNS = 53; // Default columns for Test mode
export const BRICK_PADDING = 1;
export const BRICK_WIDTH = 10; // Default width (used for test mode)
export const BRICK_HEIGHT = 9; // Default height
export const TALL_BRICK_HEIGHT = 18; // Taller height for specific main levels
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
export const SPLITTING_BALL_DURATION = 6000;
export const BIG_BALL_DURATION = 6000;
export const BUILDER_BALL_DURATION = 6000;
export const BLACK_BALL_DURATION = 10000;

// Bonus Gold
export const INITIAL_BONUS_GOLD = 30;
export const MINIMUM_BONUS_GOLD = 5;
// export const BONUS_GOLD_START_DELAY_DEFAULT = 10000; // Removed
// export const BONUS_GOLD_START_DELAY_EXTENDED = 15000; // Removed
// export const BONUS_GOLD_START_DELAY_HIGH = 20000; // Removed
// export const BONUS_GOLD_START_DELAY_MAX = 30000; // Removed
export const BONUS_GOLD_DECREMENT_INTERVAL = 500; // Added this export
// *** ADDED: Constants for the new timer ***
export const BONUS_GOLD_TARGET = 5; // Target bonus gold to trigger the timer
export const BONUS_GOLD_TIMER_DURATION = 5000; // 5 seconds in milliseconds


// Collection Field
export const FIELD_INITIAL_HEIGHT_OFFSET = 0;
export const FIELD_HEIGHT_INCREMENT = 6;
export const FIELD_MAX_HEIGHT_OFFSET = 20;
export const FIELD_INITIAL_WIDTH_OFFSET = 0;
export const FIELD_WIDTH_INCREMENT = 8;
export const FIELD_MAX_WIDTH_OFFSET = 35;
export const FIELD_SHRINK_RATE_H = 0.1;
export const FIELD_SHRINK_RATE_W = 0.08;
export const FIELD_SHRINK_INTERVAL = 16;

// Points Field
export const POINTS_FIELD_WIDTH = 50; 
export const POINTS_FIELD_HEIGHT = 50; 
export const POINTS_FIELD_COLOR = 'rgba(0, 255, 0, 0.3)';
export const POINTS_FIELD_DURATION = 5000; // Duration in milliseconds
export const POINTS_FIELD_MAX_BALLS = 5; // Max balls before field is destroyed

// *** All potentially spawnable power-ups (for UI and logic) ***
// NOTE: Upgrades (L2/L3) are handled by ShopScreen, not listed here.
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
    'COLLECTION_FIELD', 
    'HOMING_BALL', 
    'BOMB_BRICK', 
    'STICKY_PADDLE', 
    'BALL_BRICK', 
    'POINTS_FIELD', 
];

// *** Individual Power-up Costs ***
export const POWER_UP_COSTS: { [key in PowerUpType]?: number } = {
    MULTI_BALL: 10,
    MULTI_BALL_L2: 12,
    MULTI_BALL_L3: 14,
    WIDEN_PADDLE: 8,
    WIDEN_PADDLE_L2: 10,
    WIDEN_PADDLE_L3: 12,
    LASER_PADDLE: 6,
    LASER_PADDLE_L2: 7,
    LASER_PADDLE_L3: 9,
    REGEN_BRICK: 9,
    REGEN_BRICK_L2: 11,
    REGEN_BRICK_L3: 13,
    SAFETY_NET: 9,
    SAFETY_NET_L2: 11,
    SAFETY_NET_L3: 14,
    REINFORCE_BRICK: 8,
    REINFORCE_BRICK_L2: 10,
    REINFORCE_BRICK_L3: 12,
    MAKE_SPECIAL: 15,
    MAKE_SPECIAL_L2: 18,
    MAKE_SPECIAL_L3: 21,
    BLACK_BALL: 9,
    BLACK_BALL_L2: 10,
    BLACK_BALL_L3: 11,
    PIERCE_BALL: 8,
    PIERCE_BALL_L2: 9,
    PIERCE_BALL_L3: 10,
    UPGRADE_BRICK: 12,
    UPGRADE_BRICK_L2: 14,
    UPGRADE_BRICK_L3: 16,
    BUILDER_BALL: 11,
    BUILDER_BALL_L2: 13,
    BUILDER_BALL_L3: 15,
    BIG_BALL: 12,
    BIG_BALL_L2: 14,
    BIG_BALL_L3: 17,
    SPLITTING_BALL: 14,
    SPLITTING_BALL_L2: 16,
    SPLITTING_BALL_L3: 18,
    COLLECTION_FIELD: 7,
    COLLECTION_FIELD_L2: 9,
    COLLECTION_FIELD_L3: 11,
    HOMING_BALL: 5,
    HOMING_BALL_L2: 6,
    HOMING_BALL_L3: 7,
    BOMB_BRICK: 7,
    BOMB_BRICK_L2: 9,
    BOMB_BRICK_L3: 11,
    STICKY_PADDLE: 6,
    STICKY_PADDLE_L2: 8,
    STICKY_PADDLE_L3: 10,
    BALL_BRICK: 9,
    BALL_BRICK_L2: 11, 
    BALL_BRICK_L3: 13, 
    POINTS_FIELD: 12,
    POINTS_FIELD_L2: 15, 
    POINTS_FIELD_L3: 18,
    ALL_IN_ONE: 100, 
    NONE: 0
};

// *** Power-up Descriptions ***
export const POWER_UP_DESCRIPTIONS: { [key in PowerUpType | string]?: string } = {
    MULTI_BALL: "Spawns a new ball at the paddle.",
    MULTI_BALL_L2: "Spawns 2 new balls.",
    MULTI_BALL_L3: "Spawns 3 new balls.",
    WIDEN_PADDLE: "Increases paddle width.",
    WIDEN_PADDLE_L2: "Increases paddle width 2x.",
    WIDEN_PADDLE_L3: "Increases paddle width 3x.",
    LASER_PADDLE: "Left click to fire a laser from the paddle. Loads 2 shots",
    LASER_PADDLE_L2: "Loads 4 laser shots.",
    LASER_PADDLE_L3: "Loads 6 laser shots.",
    REGEN_BRICK: "Respawns one broken brick.",
    REGEN_BRICK_L2: "Respawns 2 bricks.",
    REGEN_BRICK_L3: "Respawns 3 bricks.",
    SAFETY_NET: "Adds 1 safety net. Saves 1 ball from falling off screen.",
    SAFETY_NET_L2: "Adds 2 safety nets.",
    SAFETY_NET_L3: "Adds 3 safety nets.",
    REINFORCE_BRICK: "Turns a basic brick into a reinforced brick that takes 3 hits to destroy.",
    REINFORCE_BRICK_L2: "Turns 2 basic bricks into reinforced bricks.",
    REINFORCE_BRICK_L3: "Turns 3 basic bricks into reinforced bricks.",
    MAKE_SPECIAL: "Turns a basic brick into a special brick. Break it for a special powerup!",
    MAKE_SPECIAL_L2: "Turns 2 basic bricks into special bricks.",
    MAKE_SPECIAL_L3: "Turns 3 basic bricks into special bricks.",
    BLACK_BALL: "Temporarily upgrades a ball. It destroys 2 bricks per hit",
    BLACK_BALL_L2: "Temporarily upgrades 2 balls.",
    BLACK_BALL_L3: "Temporarily upgrades 3 balls.",
    PIERCE_BALL: "Makes 1 ball pierce through the next 3 bricks.",
    PIERCE_BALL_L2: "Makes 2 balls piercing.",
    PIERCE_BALL_L3: "Makes 3 balls piercing.",
    UPGRADE_BRICK: "Turns a basic brick into an upgraded brick that takes 4 hits to destroy.",
    UPGRADE_BRICK_L2: "Turns 2 basic bricks into upgraded bricks.",
    UPGRADE_BRICK_L3: "Turns 2 basic bricks into upgraded bricks.",
    BUILDER_BALL: "Temporarily transforms a ball. It transforms bricks to upgraded bricks on hit that take 4 hits to destroy",
    BUILDER_BALL_L2: "Temporarily transforms 2 balls.",
    BUILDER_BALL_L3: "Temporarily transforms 3 balls.",
    BIG_BALL: "Temporarily increases the size of 1 ball. it creates new balls on paddle collision",
    BIG_BALL_L2: "Temporarily increases the size of 2 balls.",
    BIG_BALL_L3: "Temporarily increases the size of 3 balls.",
    SPLITTING_BALL: "Temporarily transforms a ball. It creates more balls on brick impact",
    SPLITTING_BALL_L2: "Temporarily transforms 2 balls.",
    SPLITTING_BALL_L3: "Temporarily transforms 3 balls.",
    COLLECTION_FIELD: "Increases field around paddle that collects powerups.",
    COLLECTION_FIELD_L2: "Increases powerup collection field 2x.",
    COLLECTION_FIELD_L3: "Increases powerup collection field 3x.",
    HOMING_BALL: "Makes 1 ball target the nearest special brick on its next paddle hit.",
    HOMING_BALL_L2: "Makes 2 balls target the nearest special brick on next paddle hit.",
    HOMING_BALL_L3: "Makes 3 balls target the nearest special brick on next paddle hit.",
    BOMB_BRICK: "Turns 1 brick into bombs that explode when hit and break neighbor bricks.",
    BOMB_BRICK_L2: "Turns 2 bricks into bomb bricks.",
    BOMB_BRICK_L3: "Turns 3 bricks into bomb bricks.",
    STICKY_PADDLE: "Makes balls stick to the paddle when nearby. Left click to release. Loads 2 sticky charges to paddle.",
    STICKY_PADDLE_L2: "Loads 4 sticky charges to paddle.",
    STICKY_PADDLE_L3: "Loads 6 sticky charges to paddle.",
    BALL_BRICK: "Turns 1 brick into a brick that releases a ball when broken.",
    BALL_BRICK_L2: "Turns 2 bricks into ball-holding bricks.",
    BALL_BRICK_L3: "Turns 3 bricks into ball-holding bricks.",
    POINTS_FIELD: "Creates 1 field for 5s where balls entering it earn points.",
    POINTS_FIELD_L2: "Creates 2 fields for 5s where balls earn points.", // Added description
    POINTS_FIELD_L3: "Creates 3 fields for 5s where balls earn points.", // Added description
    ALL_IN_ONE: "Grants a random selection of powerful effects.",
    NONE: "No power-up."
};


// Power-up specific constants
export const PADDLE_WIDEN_INCREMENT = INITIAL_PADDLE_WIDTH * 0.1;
export const MAX_PADDLE_WIDEN_DURATION = 5000;
export const MIN_PADDLE_WIDEN_DURATION = 100;
export const MAX_PADDLE_WIDTH = INITIAL_PADDLE_WIDTH * 4; 
export const LASER_SPEED = 10;
export const LASER_WIDTH = 5;
export const LASER_HEIGHT = 15;
export const LASER_COOLDOWN = 300;
export const LASER_STRIPE_WIDTH_PER_SHOT = 4;
export const STICKY_INDICATOR_WIDTH_PER_CHARGE = 2; // Width per sticky charge for side indicators

// Colors
export const GOLD_COLOR = '#FFD700';
export const NORMAL_BRICK_COLOR = '#e67e22';
export const REINFORCED_BRICK_COLOR = '#A0522D'; 
export const UPGRADED_BRICK_COLOR = '#8B4513';   
export const BUILDER_BRICK_COLOR = '#654321';    
export const SPECIAL_BRICK_COLOR = '#FFD700';
export const BOMB_BRICK_COLOR = '#8B0000';
export const BALL_BRICK_COLOR = '#FFFFFF'; 
export const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];
export const RAINBOW_FLASH_INTERVAL = 100;

export const POWER_UP_COLORS: { [key in PowerUpType | 'NONE']?: string } = {
    MULTI_BALL: '#32CD32',
    MULTI_BALL_L2: '#32CD32',
    MULTI_BALL_L3: '#32CD32',
    WIDEN_PADDLE: '#FF69B4',
    WIDEN_PADDLE_L2: '#FF69B4',
    WIDEN_PADDLE_L3: '#FF69B4',
    LASER_PADDLE: '#FF4500',
    LASER_PADDLE_L2: '#FF4500',
    LASER_PADDLE_L3: '#FF4500',
    REGEN_BRICK: '#ADFF2F',
    REGEN_BRICK_L2: '#ADFF2F',
    REGEN_BRICK_L3: '#ADFF2F',
    SAFETY_NET: '#1E90FF',
    SAFETY_NET_L2: '#1E90FF',
    SAFETY_NET_L3: '#1E90FF',
    REINFORCE_BRICK: '#708090',
    REINFORCE_BRICK_L2: '#708090',
    REINFORCE_BRICK_L3: '#708090',
    MAKE_SPECIAL: '#FFD700',
    MAKE_SPECIAL_L2: '#FFD700',
    MAKE_SPECIAL_L3: '#FFD700',
    BLACK_BALL: '#000000',
    BLACK_BALL_L2: '#000000',
    BLACK_BALL_L3: '#000000',
    PIERCE_BALL: '#DC143C',
    PIERCE_BALL_L2: '#DC143C',
    PIERCE_BALL_L3: '#DC143C',
    UPGRADE_BRICK: '#8A2BE2',
    UPGRADE_BRICK_L2: '#8A2BE2',
    UPGRADE_BRICK_L3: '#8A2BE2',
    BUILDER_BALL: '#B85E34', 
    BUILDER_BALL_L2: '#B85E34', 
    BUILDER_BALL_L3: '#B85E34', 
    BIG_BALL: '#F08080',
    BIG_BALL_L2: '#F08080',
    BIG_BALL_L3: '#F08080',
    SPLITTING_BALL: '#9370DB',
    SPLITTING_BALL_L2: '#9370DB',
    SPLITTING_BALL_L3: '#9370DB',
    COLLECTION_FIELD: '#20B2AA',
    COLLECTION_FIELD_L2: '#20B2AA',
    COLLECTION_FIELD_L3: '#20B2AA',
    HOMING_BALL: '#DAA520',
    HOMING_BALL_L2: '#DAA520',
    HOMING_BALL_L3: '#DAA520',
    BOMB_BRICK: '#A52A2A',
    BOMB_BRICK_L2: '#A52A2A',
    BOMB_BRICK_L3: '#A52A2A',
    STICKY_PADDLE: '#B8860B',
    STICKY_PADDLE_L2: '#B8860B',
    STICKY_PADDLE_L3: '#B8860B',
    BALL_BRICK: '#40E0D0',
    BALL_BRICK_L2: '#40E0D0',
    BALL_BRICK_L3: '#40E0D0',
    POINTS_FIELD: POINTS_FIELD_COLOR, 
    POINTS_FIELD_L2: POINTS_FIELD_COLOR, // Same color for L2 icon
    POINTS_FIELD_L3: POINTS_FIELD_COLOR, // Same color for L3 icon
    ALL_IN_ONE: '#FFFFFF',
    NONE: '#888888'
};

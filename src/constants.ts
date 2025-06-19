import { PowerUpType } from './interfaces';

// Game Board
export const BOARD_WIDTH = 600;
export const BOARD_HEIGHT = 400;
export const TARGET_FPS = 60; // Define target FPS

// Shop Screen Base Dimensions
export const BASE_SHOP_WIDTH = 800;
export const BASE_SHOP_HEIGHT = 600;

// Paddle
export const INITIAL_PADDLE_WIDTH = 80;
export const PADDLE_HEIGHT = 15;
export const PADDLE_Y = BOARD_HEIGHT - PADDLE_HEIGHT;
export const PADDLE_SPEED = 7;
export const PADDLE_FRICTION = 0.9;
export const PADDLE_EDGE_STICK_THRESHOLD = 0.15; // 15% of paddle width from edge for top-sticking
export const PADDLE_SIDE_SAVE_THRESHOLD = 180; // Pixels from paddle side to trigger bottom save
export const PADDLE_WIDEN_VISUAL_EFFECT_DURATION_MS = 100; 
export const PADDLE_WIDEN_VISUAL_EFFECT_AMOUNT = 6; // Total visual expansion

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
export const DOUBLE_BALL_VISUAL_EFFECT_DURATION_MS = 500;
export const DOUBLE_BALL_GLOW_MAX_RADIUS_ADDITION = 25; // Max additional radius for the glow
export const BALL_POP_EFFECT_DURATION_MS = 100; // Duration of the pop effect
export const BALL_POP_EFFECT_SCALE_AMOUNT = 0.3; // Scale factor for the pop effect (0.3 = 30% bigger at peak)
export const HOMING_TRAIL_DURATION = 500; // NEW CONSTANT: Duration in milliseconds for homing trail

// Bricks
export const BRICK_ROWS = 20; 
export const BRICK_COLUMNS = 53; 
export const BRICK_PADDING = 1;
export const BRICK_WIDTH = 10; 
export const BRICK_HEIGHT = 9; 
export const TALL_BRICK_HEIGHT = 18; 
export const TARGET_TOTAL_BRICK_GRID_HEIGHT = 165; 
export const BRICK_OFFSET_TOP = 30; 
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
export const BRICK_FLASH_DURATION = 50; 
export const BRICK_FADE_SPEED = 0.15; 
export const BRICK_REGEN_VISUAL_EFFECT_DURATION_MS = 100;
export const BRICK_REGEN_VISUAL_EFFECT_SCALE_AMOUNT = 0.1; 
export const BRICK_DARK_FLASH_DURATION_MS = 100;
export const BRICK_DARK_FLASH_DARKEN_AMOUNT = 0.2; 
export const BRICK_SPECIAL_FLASH_DURATION_MS = 100;
export const BRICK_SPECIAL_FLASH_LIGHTEN_AMOUNT = 0.3;
export const BOMB_GLOW_DURATION = 100; // Duration of the bomb glow in ms
export const BOMB_GLOW_COLOR = '#FFA500'; // This might be deprecated or used as a fallback
export const BOMB_GLOW_LIGHTEN_FACTOR = 0.4; // Factor to lighten the bomb brick color during glow (0.0 to 1.0)


// Power-ups
export const POWER_UP_SIZE = 8;
export const POWER_UP_SPEED = 2;
export const BASE_POWER_UP_SPEED = 2;
export const POWER_UP_SPAWN_THRESHOLD = 1.0; 
export const INITIAL_TEST_POWER_UP_SPAWN_CHANCE = 1.0; 
export const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.05;
export const SAFETY_NET_HEIGHT = 3;
export const BUILDER_BRICK_MAX_LEVEL = 3;
export const BUILDER_BALL_SPAWN_CHANCE = 0.15;
export const BOMB_BRICK_SPAWN_CHANCE = 0.1;
export const BOMB_EXPLOSION_RADIUS_FACTOR = 1.5;

export const BASE_POWER_UP_CHANCE = 1;
export const POWER_UP_COUNT_THRESHOLD = 20;
export const POWER_UP_SECOND_THRESHOLD = 4;
export const POWER_UP_SECOND_CHANCE_REDUCTION_PER_EXTRA = 0.02;

export const SPLITTING_BALL_DURATION = 5000;
export const BIG_BALL_DURATION = 6000;
export const BUILDER_BALL_DURATION = 6000;
export const DOUBLE_BALL_DURATION = 8000;

// Particle Effects
export const PARTICLE_LIFESPAN = 300; // General particle lifespan in ms (changed from 500)
export const PARTICLE_SPEED_FACTOR = 0.8; // General particle speed factor relative to source (changed from 0.5)
export const SPLITTING_BALL_PARTICLE_SIZE = 2; // Size of particles from splitting ball

export const MULTIBALL_PARTICLE_COUNT = 10; 
export const MULTIBALL_PARTICLE_SPEED_MIN = 2; 
export const MULTIBALL_PARTICLE_SPEED_MAX = 6; 
export const MULTIBALL_PARTICLE_SIZE = 1; 
export const MULTIBALL_PARTICLE_LIFESPAN_MS = 250; 
export const MULTIBALL_PARTICLE_COLOR = '#FFFFFF'; 

export const LASER_TRAIL_PARTICLE_COUNT_PER_FRAME = 2;
export const LASER_TRAIL_PARTICLE_SPEED_MIN_Y = 1;
export const LASER_TRAIL_PARTICLE_SPEED_MAX_Y = 2;
export const LASER_TRAIL_PARTICLE_SPREAD_X = 0.5; 
export const LASER_TRAIL_PARTICLE_SIZE = 1;
export const LASER_TRAIL_PARTICLE_LIFESPAN_MS = 200;
export const LASER_TRAIL_PARTICLE_COLOR = '#FF0000'; 

export const SAFETY_NET_PARTICLE_COUNT = 100;
export const SAFETY_NET_PARTICLE_SPEED_Y = -2; 
export const SAFETY_NET_PARTICLE_SIZE = 1;
export const SAFETY_NET_PARTICLE_LIFESPAN_MS = 300;
export const SAFETY_NET_PARTICLE_COLOR = '#1E90FF'; 

// Resource Meter Save
export const RESOURCE_SAVE_COST = 15;
export const RESOURCE_SAVE_PARTICLE_COUNT = 30;
export const RESOURCE_SAVE_PARTICLE_COLOR = 'rgba(0, 255, 255, 0.9)';
export const RESOURCE_SAVE_PARTICLE_LIFESPAN_MS = 400;
export const RESOURCE_SAVE_PARTICLE_SPEED_MIN = 1;
export const RESOURCE_SAVE_PARTICLE_SPEED_MAX = 3;
export const RESOURCE_SAVE_PARTICLE_SIZE = 1.5;

// Bonus Gold
export const INITIAL_BONUS_GOLD = 30;
export const MINIMUM_BONUS_GOLD = 5;
export const BONUS_GOLD_DECREMENT_INTERVAL = 500; 
export const BONUS_GOLD_TARGET = 5; 
export const BONUS_GOLD_TIMER_DURATION = 5000; 


// Collection Field
export const FIELD_INITIAL_HEIGHT_OFFSET = 0;
export const FIELD_HEIGHT_INCREMENT = 7;
export const FIELD_MAX_HEIGHT_OFFSET = 40;
export const FIELD_INITIAL_WIDTH_OFFSET = 0;
export const FIELD_WIDTH_INCREMENT = 9;
export const FIELD_MAX_WIDTH_OFFSET = 70;
export const FIELD_SHRINK_RATE_H = 0.08;
export const FIELD_SHRINK_RATE_W = 0.08;
export const FIELD_SHRINK_INTERVAL = 16;
export const FIELD_SHRINK_ACCELERATION_FACTOR = 2.0;

// Points Field
export const POINTS_FIELD_WIDTH = 50; 
export const POINTS_FIELD_HEIGHT = 50; 
export const POINTS_FIELD_COLOR = 'rgba(0, 255, 0, 0.3)';
export const POINTS_FIELD_DURATION = 5000; 
export const POINTS_FIELD_MAX_BALLS = 4; 

export const ALL_TOGGLEABLE_POWER_UPS: PowerUpType[] = [
    // Ball Modifiers
    'MULTI_BALL', 
    'DOUBLE_BALL', 
    'PIERCE_BALL',                                                                                               
    'BUILDER_BALL', 
    'BIG_BALL', 
    'SPLITTING_BALL', 
    'HOMING_BALL', 
    // Brick Modifiers
    'REGEN_BRICK', 
    'REINFORCE_BRICK', 
    'UPGRADE_BRICK', 
    'BOMB_BRICK', 
    'BALL_BRICK', 
    'MAKE_SPECIAL', 
    // Paddle Modifiers
    'WIDEN_PADDLE', 
    'LASER_PADDLE', 
    'RECOVERY_PADDLE', 
    // Game/Field Modifiers
    'SAFETY_NET', 
    'COLLECTION_FIELD', 
    'POINTS_FIELD', 
];

export const POWER_UP_COSTS: { [key in PowerUpType]?: number } = {
    MULTI_BALL: 10,
    MULTI_BALL_L2: 12,
    MULTI_BALL_L3: 14,
    WIDEN_PADDLE: 10,
    WIDEN_PADDLE_L2: 13,
    WIDEN_PADDLE_L3: 16,
    LASER_PADDLE: 7,
    LASER_PADDLE_L2: 9,
    LASER_PADDLE_L3: 11,
    REGEN_BRICK: 8,
    REGEN_BRICK_L2: 10,
    REGEN_BRICK_L3: 12,
    SAFETY_NET: 9,
    SAFETY_NET_L2: 11,
    SAFETY_NET_L3: 14,
    REINFORCE_BRICK: 7,
    REINFORCE_BRICK_L2: 9,
    REINFORCE_BRICK_L3: 11,
    MAKE_SPECIAL: 15,
    MAKE_SPECIAL_L2: 20,
    MAKE_SPECIAL_L3: 25,
    DOUBLE_BALL: 9,
    DOUBLE_BALL_L2: 11,
    DOUBLE_BALL_L3: 13,
    PIERCE_BALL: 9,
    PIERCE_BALL_L2: 11,
    PIERCE_BALL_L3: 13,
    UPGRADE_BRICK: 10,
    UPGRADE_BRICK_L2: 12,
    UPGRADE_BRICK_L3: 14,
    BUILDER_BALL: 13,
    BUILDER_BALL_L2: 15,
    BUILDER_BALL_L3: 18,
    BIG_BALL: 12,
    BIG_BALL_L2: 14,
    BIG_BALL_L3: 17,
    SPLITTING_BALL: 13,
    SPLITTING_BALL_L2: 15,
    SPLITTING_BALL_L3: 17,
    COLLECTION_FIELD: 7,
    COLLECTION_FIELD_L2: 9,
    COLLECTION_FIELD_L3: 11,
    HOMING_BALL: 5,
    HOMING_BALL_L2: 6,
    HOMING_BALL_L3: 7,
    BOMB_BRICK: 6,
    BOMB_BRICK_L2: 8,
    BOMB_BRICK_L3: 10,
    RECOVERY_PADDLE: 9,
    RECOVERY_PADDLE_L2: 11,
    RECOVERY_PADDLE_L3: 13,
    BALL_BRICK: 7,
    BALL_BRICK_L2: 9, 
    BALL_BRICK_L3: 11, 
    POINTS_FIELD: 13,
    POINTS_FIELD_L2: 16, 
    POINTS_FIELD_L3: 19,
    ALL_IN_ONE: 100, 
    NONE: 0
};

export const POWER_UP_REROLL_COST = 5;

export const POWER_UP_DESCRIPTIONS: { [key in PowerUpType | string]?: string } = {
    MULTI_BALL: "Spawns 1 ball at the paddle.",
    MULTI_BALL_L2: "Spawns 2 new balls.",
    MULTI_BALL_L3: "Spawns 3 new balls.",
    WIDEN_PADDLE: "Temporarily widens paddle.",
    WIDEN_PADDLE_L2: "Temporarily widens paddle 2x.",
    WIDEN_PADDLE_L3: "Temporarily widens paddle 3x.",
    LASER_PADDLE: "Left click to fire lasers from paddle (2 shots)",
    LASER_PADDLE_L2: "Fire lasers from paddle (4 shots).",
    LASER_PADDLE_L3: "Fire lasers from paddle (6 shots).",
    REGEN_BRICK: "Respawn one destroyed brick.",
    REGEN_BRICK_L2: "Respawn 2 bricks.",
    REGEN_BRICK_L3: "Respawn 3 bricks.",
    SAFETY_NET: "Gain 1 safety net to save a ball.",
    SAFETY_NET_L2: "Gain 2 safety nets.",
    SAFETY_NET_L3: "Gain 3 safety nets.",
    REINFORCE_BRICK: "Reinforce 1 brick to take 3 hits to destroy.",
    REINFORCE_BRICK_L2: "Reinforce 2 bricks.",
    REINFORCE_BRICK_L3: "Reinforce 3 bricks.",
    MAKE_SPECIAL: "Makes 1 brick special. Break it for a variety powerup!",
    MAKE_SPECIAL_L2: "Turns 2 basic bricks into special bricks.",
    MAKE_SPECIAL_L3: "Turns 3 basic bricks into special bricks.",
    DOUBLE_BALL: "1 ball temporarily destroys 2 bricks per hit.",
    DOUBLE_BALL_L2: "2 balls temporarily destroys 2 bricks per hit",
    DOUBLE_BALL_L3: "3 balls temporarily destroys 2 bricks per hit.",
    PIERCE_BALL: "Makes 1 ball pierce through the next 3 bricks.",
    PIERCE_BALL_L2: "Makes 2 balls piercing.",
    PIERCE_BALL_L3: "Makes 3 balls piercing.",
    UPGRADE_BRICK: "Upgrade 1 brick to take 4 hits to destroy.",
    UPGRADE_BRICK_L2: "Turns 2 bricks into upgraded bricks.",
    UPGRADE_BRICK_L3: "Turns 3 bricks into upgraded bricks.",
    BUILDER_BALL: "Spawn 1 builder ball. Upgrades bricks on hit for a short time.",
    BUILDER_BALL_L2: "Spawn 2 builder balls.",
    BUILDER_BALL_L3: "Spawn 3 builder balls.",
    BIG_BALL: "1 ball gets bigger and spawns balls on paddle hit.",
    BIG_BALL_L2: "2 balls get bigger and spawn balls on paddle hit.",
    BIG_BALL_L3: "3 balls get bigger and spawn balls on paddle hit.",
    SPLITTING_BALL: "1 ball splits into more on brick impact.",
    SPLITTING_BALL_L2: "2 balls split into more on brick impact.",
    SPLITTING_BALL_L3: "3 balls split into more on brick impact.",
    COLLECTION_FIELD: "Widens field around paddle that collects powerups.",
    COLLECTION_FIELD_L2: "Widens powerup collection field 2x.",
    COLLECTION_FIELD_L3: "Widens powerup collection field 3x.",
    HOMING_BALL: "Makes 2 balls target the nearest special brick on next paddle hit.",
    HOMING_BALL_L2: "Makes 4 balls target the nearest special brick on next paddle hit.",
    HOMING_BALL_L3: "Makes 6 balls target the nearest special brick on next paddle hit.",
    BOMB_BRICK: "Turns 1 brick into a bomb brick.",
    BOMB_BRICK_L2: "Turns 2 bricks into bomb bricks.",
    BOMB_BRICK_L3: "Turns 3 bricks into bomb bricks.",
    RECOVERY_PADDLE: "Recover nearby lost balls. Gain 2 charges",
    RECOVERY_PADDLE_L2: "Recover nearby lost balls. Gain 4 charges",
    RECOVERY_PADDLE_L3: "Recover nearby lost balls. Gain 6 charges",
    BALL_BRICK: "Make 1 brick release a ball when broken.",
    BALL_BRICK_L2: "Turns 2 bricks into ball-holding bricks.",
    BALL_BRICK_L3: "Turns 3 bricks into ball-holding bricks.",
    POINTS_FIELD: "Creates 1 field where balls entering it earn points for 5s.",
    POINTS_FIELD_L2: "Creates 2 fields for 5s where balls entering earn points.", 
    POINTS_FIELD_L3: "Creates 3 fields for 5s where balls entering earn points.", 
    ALL_IN_ONE: "Grants a random selection of powerful effects.",
    NONE: "No power-up."
};

export const POWER_UP_IMAGE_PATHS: { [key in PowerUpType]?: string } = {
    MULTI_BALL: '/images/multiball.png',
    WIDEN_PADDLE: '/images/widen paddle.png',
    LASER_PADDLE: '/images/laser paddle.png',
    REGEN_BRICK: '/images/regen brick.png',
    SAFETY_NET: '/images/safety net.png',
    REINFORCE_BRICK: '/images/reinforce brick.png',
    MAKE_SPECIAL: '/images/make special.png',
    DOUBLE_BALL: '/images/black ball.png',
    PIERCE_BALL: '/images/pierce ball.png',
    UPGRADE_BRICK: '/images/upgrade brick.png',
    BUILDER_BALL: '/images/builder ball.png',
    BIG_BALL: '/images/big ball.png',
    SPLITTING_BALL: '/images/splitting ball.png',
    COLLECTION_FIELD: '/images/collection field.png',
    HOMING_BALL: '/images/homing ball.png',
    BOMB_BRICK: '/images/bomb brick.png',
    RECOVERY_PADDLE: '/images/sticky paddle.png', 
    BALL_BRICK: '/images/ball brick.png',
    POINTS_FIELD: '/images/points field.png',
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
export const STICKY_INDICATOR_WIDTH_PER_CHARGE = 2; 

// Colors
export const GOLD_COLOR = '#FFD700';
export const NORMAL_BRICK_COLOR = '#e67e22';
export const REINFORCED_BRICK_COLOR = '#A0522D'; 
export const UPGRADED_BRICK_COLOR = '#8B4513';   
export const BUILDER_BRICK_COLOR = '#654321';    
export const SPECIAL_BRICK_COLOR = '#FFD700'; // Yellow
export const BOMB_BRICK_COLOR = '#8B0000'; // Dark Red
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
    DOUBLE_BALL: '#000000',
    DOUBLE_BALL_L2: '#000000',
    DOUBLE_BALL_L3: '#000000',
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
    RECOVERY_PADDLE: '#B8860B',
    RECOVERY_PADDLE_L2: '#B8860B',
    RECOVERY_PADDLE_L3: '#B8860B',
    BALL_BRICK: '#40E0D0',
    BALL_BRICK_L2: '#40E0D0',
    BALL_BRICK_L3: '#40E0D0',
    POINTS_FIELD: POINTS_FIELD_COLOR, 
    POINTS_FIELD_L2: POINTS_FIELD_COLOR, 
    POINTS_FIELD_L3: POINTS_FIELD_COLOR, 
    ALL_IN_ONE: '#FFFFFF',
    NONE: '#888888'
};

export const INITIAL_LIVES = 3;

export const MAX_LEVEL_NAME_LENGTH = 15;

export interface Hint {
  id: number;
  text: string;
  cost: number;
}

export const HINTS: Hint[] = [
  { id: 1, text: "Gain more gold for beating levels quickly. Up to 30 gold per level.", cost: 30 },
  { id: 2, text: "Bricks that take more hits to destroy, also give more points.", cost: 60 },
  { id: 3, text: "Levels 6 and above have a higher point requirement than the starting number of bricks, so be prepared.", cost: 200 },
  { id: 4, text: "The rainbow power-up dropped from a special brick grants a random selection of 5 other power-ups you have.", cost: 400 },
  { id: 5, text: "You can collect multiple powerups from their initial spawn in a level. Maybe all if you are quick!", cost: 600 },
  { id: 6, text: "The spawn chance for power-ups decreases if there are already many power-ups on screen.", cost: 1000 },
];
// src/gameUpdates/gameLoopUtils.ts
import { Ball, Brick, PowerUp, PowerUpType, GameMode, SpawnMarker, PowerUpSpawnEvent, Particle, GameStateRefs } from '../interfaces';
import {
    POWER_UP_SIZE,
    ALL_TOGGLEABLE_POWER_UPS, 
    INITIAL_BALL_SPEED_Y, 
    BALL_SIZE, 
    PARTICLE_LIFESPAN, 
    PARTICLE_SPEED_FACTOR, 
    SPLITTING_BALL_PARTICLE_SIZE
} from '../constants';

// Constants for spawn logic
export const TEST_MODE_BASE_SPAWN_CHANCE = 1.0; 
export const MAIN_GAME_BASE_SPAWN_CHANCE = 0.0; 
export const MAIN_GAME_CHANCE_INCREASE_PER_TYPE = 0.1; 
export const POWER_UP_SPAWN_THRESHOLD = 20; 
export const POWER_UP_CHANCE_REDUCTION_PER_EXTRA = 0.02; 

const EMPTY_POWERUPS: PowerUp[] = [];
const EMPTY_BALLS: Ball[] = [];
Object.freeze(EMPTY_POWERUPS);
Object.freeze(EMPTY_BALLS);

export const createPowerUp = (x: number, y: number, brickWidth: number, type: PowerUpType, timeCreated?: number): PowerUp => ({
    x: x + brickWidth / 2 - POWER_UP_SIZE / 2,
    y: y + 5, 
    type,
    status: 'falling',
    id: Date.now() + Math.random() * 10, 
    timeCreated
});

export const calculateBaseSpawnChance = (
    availablePowerUps: Set<PowerUpType>,
    gameMode: GameMode | null,
    // testModeChanceOverride is no longer used here directly for test mode's base chance
    // as the initial spawn decision is already made in damageBrick.
    // It could be repurposed if needed for other nuanced calculations.
): number => {
    const possibleTypesCount = availablePowerUps.size;
    if (possibleTypesCount === 0 && gameMode === 'main') {
        return 0; 
    }

    let baseChance: number;

    if (gameMode === 'main') {
        const chanceIncrease = possibleTypesCount * MAIN_GAME_CHANCE_INCREASE_PER_TYPE;
        baseChance = MAIN_GAME_BASE_SPAWN_CHANCE + chanceIncrease;
        baseChance = Math.min(1.0, baseChance); 
    } else { // For 'test' mode, if we reach here due to a 'PENDING' marker, the initial chance was met.
        baseChance = TEST_MODE_BASE_SPAWN_CHANCE; // Effectively 1.0, allowing other checks to proceed.
    }
    return baseChance;
};

export const handleSpawnEvents = (
    spawnRequests: PowerUpSpawnEvent[],
    currentFallingPowerUpCount: number,
    availablePowerUps: Set<PowerUpType>,
    gameMode: GameMode | null,
    currentTime: number,
    currentSpeedFactor: number,
    particlesRef: React.MutableRefObject<Particle[]>, 
    gameStateRefs?: GameStateRefs 
): { newPowerUps: PowerUp[], newBalls: Ball[] } => {
    let newlySpawnedPowerUps: PowerUp[] | null = null;
    let newlySpawnedBalls: Ball[] | null = null;

    spawnRequests.forEach(event => {
        if (event.marker === 'SPAWN_SPECIAL') {
            if (!newlySpawnedPowerUps) newlySpawnedPowerUps = [];
            newlySpawnedPowerUps.push(createPowerUp(event.brickX, event.brickY, event.brickWidth, 'ALL_IN_ONE', currentTime));
        } else if (event.marker === 'SPAWN_BALL') {
            const brickCenterX = event.brickX + event.brickWidth / 2;
            const brickCenterY = event.brickY + event.brickHeight / 2;
            const newBall = createNewBall(
                brickCenterX,
                brickCenterY - BALL_SIZE, 
                (Math.random() - 0.5) * 4, 
                -INITIAL_BALL_SPEED_Y, 
                currentSpeedFactor
            );
            if (!newlySpawnedBalls) newlySpawnedBalls = [];
            newlySpawnedBalls.push(newBall);

            const numParticles = 5; 
            const particleSpeedBase = Math.sqrt(newBall.speedX**2 + newBall.speedY**2) * (PARTICLE_SPEED_FACTOR || 0.8);
            const finalParticleColor = '#FFFFFF'; 
            for (let k = 0; k < numParticles; k++) {
                const angleOffset = (Math.random() - 0.5) * (Math.PI / 2); 
                const newAngle = Math.atan2(newBall.speedY, newBall.speedX) + angleOffset;
                const particleSpeed = particleSpeedBase * (0.8 + Math.random() * 0.4);
                const particle: Particle = {
                    id: Date.now() + Math.random(),
                    x: brickCenterX, 
                    y: brickCenterY,
                    speedX: Math.cos(newAngle) * particleSpeed,
                    speedY: Math.sin(newAngle) * particleSpeed,
                    lifespan: (PARTICLE_LIFESPAN || 300) * (0.8 + Math.random() * 0.4),
                    color: finalParticleColor,
                    size: SPLITTING_BALL_PARTICLE_SIZE || 2,
                    createdAt: currentTime, alpha: 1
                };
                particlesRef.current.push(particle);
            }

        } else if (event.marker === 'PENDING') {
             let spawnChance = calculateBaseSpawnChance(
                availablePowerUps, 
                gameMode
                // No longer passing gameStateRefs.testPowerUpSpawnChanceRef.current here
            );

            if (spawnChance > 0) { // This will be true in test mode if calculateBaseSpawnChance returns 1.0
                const totalEffectivePowerUpCount = currentFallingPowerUpCount + (newlySpawnedPowerUps?.length ?? 0);
                if (totalEffectivePowerUpCount > POWER_UP_SPAWN_THRESHOLD) {
                    const excessPowerUps = totalEffectivePowerUpCount - POWER_UP_SPAWN_THRESHOLD;
                    spawnChance -= excessPowerUps * POWER_UP_CHANCE_REDUCTION_PER_EXTRA;
                    spawnChance = Math.max(0, spawnChance); 
                }

                // The Math.random() < spawnChance check now correctly uses the 1.0 spawnChance for test mode (if PENDING)
                // or the calculated chance for main mode.
                if (Math.random() < spawnChance) {
                    if (availablePowerUps.size > 0) { 
                        const randomIndex = Math.floor(Math.random() * availablePowerUps.size);
                        let i = 0;
                        let typeToSpawnFromSet: PowerUpType | undefined = undefined; 
                        for (const item of availablePowerUps) { 
                            if (i === randomIndex) {
                                typeToSpawnFromSet = item;
                                break;
                            }
                            i++;
                        }

                        if (typeToSpawnFromSet) { 
                           let finalTypeToSpawn = typeToSpawnFromSet;
                           if (gameMode === 'test' && gameStateRefs && gameStateRefs.testPowerUpLevelsRef) {
                                const level = gameStateRefs.testPowerUpLevelsRef.current[typeToSpawnFromSet]; // typeToSpawnFromSet is base type
                                if (level && level > 1) {
                                    const leveledType = `${typeToSpawnFromSet}_L${level}` as PowerUpType;
                                    finalTypeToSpawn = leveledType;
                                }
                           }
                           if (!newlySpawnedPowerUps) newlySpawnedPowerUps = [];
                           newlySpawnedPowerUps.push(createPowerUp(event.brickX, event.brickY, event.brickWidth, finalTypeToSpawn, currentTime));
                        }
                    }
                }
            }
        }
    });

    return {
        newPowerUps: newlySpawnedPowerUps ?? EMPTY_POWERUPS,
        newBalls: newlySpawnedBalls ?? EMPTY_BALLS
    };
};

export const createNewBall = (x: number, y: number, speedX: number, speedY: number, currentSpeedFactor: number): Ball => ({
    x,
    y,
    speedX: speedX * currentSpeedFactor,
    speedY: speedY * currentSpeedFactor,
    id: Date.now() + Math.random() * 100,
    isDouble: false,
    doubleEndTime: undefined,
    doublePausedDuration: undefined,
    isBlue: false, 
    blueEndTime: undefined,
    bluePausedDuration: undefined,
    isBig: false, 
    bigEndTime: undefined,
    bigPausedDuration: undefined,
    isSplitting: false, 
    splittingEndTime: undefined,
    splittingPausedDuration: undefined,
    isHoming: false,
    stuckOffset: undefined,
    stuckSide: null,
    stuckSideOffset: undefined,
    lastFramePointsFieldIds: new Set()
});

export const findClosestBrick = (ball: Ball, bricks: Brick[][], columns: number, rows: number): Brick | null => {
    let closestBrick: Brick | null = null;
    let minDistSq = Infinity;
    const specialBricks: Brick[] = [];

    const ballCenterX = ball.x;
    const ballCenterY = ball.y;

    for (let c = 0; c < columns; c++) {
        if (!bricks[c]) continue;
        for (let r = 0; r < rows; r++) {
            const brick = bricks[c][r];
            if (brick && brick.status === 1) {
                if (brick.isSpecial || brick.isBomb || brick.holdsBall) {
                    specialBricks.push(brick);
                }
            }
        }
    }

    if (specialBricks.length > 0) {
        for (const brick of specialBricks) {
            const brickCenterX = brick.x + brick.width / 2;
            const brickCenterY = brick.y + brick.height / 2;
            const distSq = Math.pow(ballCenterX - brickCenterX, 2) + Math.pow(ballCenterY - brickCenterY, 2);
            if (distSq < minDistSq) {
                minDistSq = distSq;
                closestBrick = brick;
            }
        }
    } else {
        for (let c = 0; c < columns; c++) {
            if (!bricks[c]) continue;
            for (let r = 0; r < rows; r++) {
                const brick = bricks[c][r];
                if (brick && brick.status === 1) {
                    const brickCenterX = brick.x + brick.width / 2;
                    const brickCenterY = brick.y + brick.height / 2;
                    const distSq = Math.pow(ballCenterX - brickCenterX, 2) + Math.pow(ballCenterY - brickCenterY, 2);
                    if (distSq < minDistSq) {
                        minDistSq = distSq;
                        closestBrick = brick;
                    }
                }
            }
        }
    }
    return closestBrick;
};

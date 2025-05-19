// src/gameUpdates/powerUpEffects/gameEffects.ts
import { PowerUpType, PointsField, Particle, GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    FIELD_MAX_HEIGHT_OFFSET, FIELD_HEIGHT_INCREMENT,
    FIELD_MAX_WIDTH_OFFSET, FIELD_WIDTH_INCREMENT,
    POINTS_FIELD_WIDTH, POINTS_FIELD_HEIGHT, BOARD_WIDTH, BOARD_HEIGHT, SAFETY_NET_HEIGHT,
    SAFETY_NET_PARTICLE_COUNT,
    SAFETY_NET_PARTICLE_SPEED_Y,
    SAFETY_NET_PARTICLE_SIZE,
    SAFETY_NET_PARTICLE_LIFESPAN_MS,
    SAFETY_NET_PARTICLE_COLOR
} from '../../constants';

let nextPointsFieldId = 0;
let nextSafetyNetParticleId = 0; // Separate ID counter for these particles

const createSinglePointsField = (currentTime: number): PointsField => ({
    id: nextPointsFieldId++,
    width: POINTS_FIELD_WIDTH,
    height: POINTS_FIELD_HEIGHT,
    x: Math.random() * (BOARD_WIDTH - POINTS_FIELD_WIDTH),
    y: Math.random() * (BOARD_HEIGHT - POINTS_FIELD_HEIGHT - 50), 
    createdAt: currentTime,
    ballsPassed: 0 
});

const spawnSafetyNetParticles = (refs: GameStateRefs, currentTime: number, netIndex: number) => {
    // Calculate the Y position of the top of the specific net being added
    // Nets are stacked from the bottom, so the newest one is at the highest Y position among the nets.
    // The safetyNetCountRef is incremented *before* this is called for a new net.
    const spawnY = BOARD_HEIGHT - (refs.safetyNetCountRef.current - netIndex) * SAFETY_NET_HEIGHT;

    for (let i = 0; i < SAFETY_NET_PARTICLE_COUNT; i++) {
        const particle: Particle = {
            id: nextSafetyNetParticleId++,
            x: Math.random() * BOARD_WIDTH, // Random X along the width of the board
            y: spawnY,                      // Y position of the top of the new net
            speedX: 0,                      // Straight up
            speedY: SAFETY_NET_PARTICLE_SPEED_Y, 
            size: SAFETY_NET_PARTICLE_SIZE,
            color: SAFETY_NET_PARTICLE_COLOR,
            alpha: 1.0,
            lifespan: SAFETY_NET_PARTICLE_LIFESPAN_MS,
            createdAt: currentTime,
        };
        refs.particlesRef.current.push(particle);
    }
};

export const applyGameEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    type: PowerUpType,
    currentTime: number,
    gameSpeedFactor: number
) => {
    switch (type) {
        case 'COLLECTION_FIELD':
        case 'COLLECTION_FIELD_L2':
        case 'COLLECTION_FIELD_L3': {
            let multiplier = 1;
            if (type === 'COLLECTION_FIELD_L2') {
                multiplier = 2;
            } else if (type === 'COLLECTION_FIELD_L3') {
                multiplier = 3;
            }
            const heightIncrement = FIELD_HEIGHT_INCREMENT * multiplier;
            const widthIncrement = FIELD_WIDTH_INCREMENT * multiplier;
            refs.collectionFieldHeightRef.current = Math.min(
                FIELD_MAX_HEIGHT_OFFSET,
                refs.collectionFieldHeightRef.current + heightIncrement
            );
            refs.collectionFieldWidthOffsetRef.current = Math.min(
                FIELD_MAX_WIDTH_OFFSET,
                refs.collectionFieldWidthOffsetRef.current + widthIncrement
            );
            callbacks.scheduleFieldShrink();
            break;
        }
        case 'SAFETY_NET':
        case 'SAFETY_NET_L2':
        case 'SAFETY_NET_L3': {
            let netsToAdd = 1;
             if (type === 'SAFETY_NET_L2') {
                netsToAdd = 2;
            } else if (type === 'SAFETY_NET_L3') {
                netsToAdd = 3;
            }
            // Spawn particles for each net added
            for (let i = 0; i < netsToAdd; i++) {
                refs.safetyNetCountRef.current += 1; // Increment first to get the correct Y for the new net
                spawnSafetyNetParticles(refs, currentTime, i); // Pass 'i' as netIndex relative to this batch
            }
            break;
        }
        case 'POINTS_FIELD':
        case 'POINTS_FIELD_L2':
        case 'POINTS_FIELD_L3': {
            if (!refs.pointsFieldsRef.current) {
                refs.pointsFieldsRef.current = [];
            }
            let fieldsToSpawn = 1;
            if (type === 'POINTS_FIELD_L2') {
                fieldsToSpawn = 2;
            } else if (type === 'POINTS_FIELD_L3') {
                fieldsToSpawn = 3;
            }
            for (let i = 0; i < fieldsToSpawn; i++) {
                refs.pointsFieldsRef.current.push(createSinglePointsField(currentTime));
            }
            break;
        }
        default:
            break;
    }
};

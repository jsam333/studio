import { PowerUpType, PointsField } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    FIELD_MAX_HEIGHT_OFFSET, FIELD_HEIGHT_INCREMENT,
    FIELD_MAX_WIDTH_OFFSET, FIELD_WIDTH_INCREMENT,
    POINTS_FIELD_WIDTH, POINTS_FIELD_HEIGHT, BOARD_WIDTH, BOARD_HEIGHT
} from '../../constants';

let nextPointsFieldId = 0;

const createSinglePointsField = (currentTime: number): PointsField => ({
    id: nextPointsFieldId++,
    width: POINTS_FIELD_WIDTH,
    height: POINTS_FIELD_HEIGHT,
    x: Math.random() * (BOARD_WIDTH - POINTS_FIELD_WIDTH),
    y: Math.random() * (BOARD_HEIGHT - POINTS_FIELD_HEIGHT - 50), // Avoid spawning too low
    createdAt: currentTime
});

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
            refs.safetyNetCountRef.current += netsToAdd;
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

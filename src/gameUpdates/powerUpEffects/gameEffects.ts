import { PowerUpType } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import {
    FIELD_MAX_HEIGHT_OFFSET, FIELD_HEIGHT_INCREMENT,
    FIELD_MAX_WIDTH_OFFSET, FIELD_WIDTH_INCREMENT
} from '../../constants';

export const applyGameEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    type: PowerUpType,
    currentTime: number,
    gameSpeedFactor: number
) => {
    switch (type) {
        case 'COLLECTION_FIELD': {
            refs.collectionFieldHeightRef.current = Math.min(
                FIELD_MAX_HEIGHT_OFFSET,
                refs.collectionFieldHeightRef.current + FIELD_HEIGHT_INCREMENT
            );
            refs.collectionFieldWidthOffsetRef.current = Math.min(
                FIELD_MAX_WIDTH_OFFSET,
                refs.collectionFieldWidthOffsetRef.current + FIELD_WIDTH_INCREMENT
            );
            callbacks.scheduleFieldShrink();
            break;
        }
        case 'SAFETY_NET': {
            refs.safetyNetCountRef.current++;
            break;
        }
        default:
            break;
    }
};

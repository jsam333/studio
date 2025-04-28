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
            // Schedule shrink regardless of level, the shrink logic itself handles the decay.
            callbacks.scheduleFieldShrink();
            break;
        }
        case 'SAFETY_NET':
        case 'SAFETY_NET_L2': // Assuming L2 adds 2 nets, L3 adds 3
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
        default:
            break;
    }
};

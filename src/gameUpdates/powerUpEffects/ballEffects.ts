import { PowerUpType, Ball, Brick } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import { createNewBall } from '../gameLoopUtils';
import {
    BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, BASE_BALL_SPEED_FACTOR,
    SPLITTING_BALL_DURATION, BIG_BALL_DURATION, BUILDER_BALL_DURATION,
    BLACK_BALL_DURATION, PIERCE_BALL_HITS
} from '../../constants';

export const applyBallEffects = (
    refs: GameStateRefs,
    callbacks: GameLoopCallbacks,
    type: PowerUpType,
    currentTime: number,
    gameSpeedFactor: number // Keep for consistency, might be used later
) => {
    switch (type) {
        case 'HOMING_BALL': {
            const targetBall = refs.ballsRef.current.find(b => !b.isHoming);
            if (targetBall) {
                targetBall.isHoming = true;
            } else if (refs.ballsRef.current.length > 0) {
                refs.ballsRef.current[0].isHoming = true;
            }
            break;
        }
        case 'SPLITTING_BALL': {
            const targetBall = refs.ballsRef.current.find(b => !b.isSplitting);
            if (targetBall) {
                targetBall.isSplitting = true;
                targetBall.splittingEndTime = currentTime + SPLITTING_BALL_DURATION;
            } else if (refs.ballsRef.current.length > 0) {
                refs.ballsRef.current[0].isSplitting = true;
                refs.ballsRef.current[0].splittingEndTime = currentTime + SPLITTING_BALL_DURATION;
            }
            break;
        }
        case 'BIG_BALL': {
            const targetBall = refs.ballsRef.current.find(b => !b.isBig);
            if (targetBall) {
                targetBall.isBig = true;
                targetBall.bigEndTime = currentTime + BIG_BALL_DURATION;
            } else if (refs.ballsRef.current.length > 0) {
                refs.ballsRef.current[0].isBig = true;
                refs.ballsRef.current[0].bigEndTime = currentTime + BIG_BALL_DURATION;
            }
            break;
        }
        case 'MULTI_BALL': {
            let sx = (Math.random() - 0.5) * 6;
            let sy = -3 - Math.random() * 2;
            refs.ballsRef.current.push(createNewBall(
                refs.paddleXRef.current + refs.paddleWidthRef.current / 2 + (Math.random() - 0.5) * 10,
                BOARD_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 5,
                sx, sy, BASE_BALL_SPEED_FACTOR
            ));
            break;
        }
        case 'BUILDER_BALL': {
            const targetBall = refs.ballsRef.current.find(b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
            if (targetBall) {
                targetBall.isBlue = true;
                targetBall.blueEndTime = currentTime + BUILDER_BALL_DURATION;
                targetBall.isBlack = false; targetBall.pierceHitsRemaining = 0; targetBall.blackEndTime = undefined;
            } else {
                const fallbackBall = refs.ballsRef.current.find(b => !b.isBlack && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
                if (fallbackBall) {
                    fallbackBall.isBlue = true;
                    fallbackBall.blueEndTime = currentTime + BUILDER_BALL_DURATION;
                    fallbackBall.isBlack = false; fallbackBall.pierceHitsRemaining = 0; fallbackBall.blackEndTime = undefined;
                }
            }
            break;
        }
        case 'BLACK_BALL': {
            const targetBall = refs.ballsRef.current.find(b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
            if (targetBall) {
                targetBall.isBlack = true; targetBall.blackEndTime = currentTime + BLACK_BALL_DURATION;
                targetBall.pierceHitsRemaining = 0; targetBall.isBlue = false; targetBall.blueEndTime = undefined;
            } else if (refs.ballsRef.current.length > 0) {
                const firstBall = refs.ballsRef.current[0];
                firstBall.isBlack = true; firstBall.blackEndTime = currentTime + BLACK_BALL_DURATION;
                firstBall.pierceHitsRemaining = 0; firstBall.isBlue = false; firstBall.blueEndTime = undefined;
            }
            break;
        }
        case 'PIERCE_BALL': {
            const targetBall = refs.ballsRef.current.find(b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0));
            if (targetBall) {
                targetBall.pierceHitsRemaining = PIERCE_BALL_HITS;
                targetBall.isBlue = false; targetBall.blueEndTime = undefined;
            } else if (refs.ballsRef.current.length > 0 && !refs.ballsRef.current[0].isBlack && !refs.ballsRef.current[0].isBlue) {
                const firstBall = refs.ballsRef.current[0];
                firstBall.pierceHitsRemaining = PIERCE_BALL_HITS;
                firstBall.isBlue = false; firstBall.blueEndTime = undefined;
            }
            break;
        }
        default:
            break;
    }
};

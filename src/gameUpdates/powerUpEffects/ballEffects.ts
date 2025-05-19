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
    let numToAffect = 1;
    if (type.endsWith('_L2')) {
        numToAffect = 2;
    } else if (type.endsWith('_L3')) {
        numToAffect = 3;
    }

    switch (type) {
        case 'HOMING_BALL':
        case 'HOMING_BALL_L2':
        case 'HOMING_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(b => !b.isHoming);
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.isHoming = true;
                 // Note: Homing duration TBD
            });
            break;
        }
        case 'SPLITTING_BALL':
        case 'SPLITTING_BALL_L2':
        case 'SPLITTING_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(b => !b.isSplitting);
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.isSplitting = true;
                ball.splittingEndTime = currentTime + SPLITTING_BALL_DURATION; // Duration might vary by level later
            });
            break;
        }
        case 'BIG_BALL':
        case 'BIG_BALL_L2':
        case 'BIG_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(b => !b.isBig);
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.isBig = true;
                ball.bigEndTime = currentTime + BIG_BALL_DURATION; // Duration might vary by level later
            });
            break;
        }
        case 'MULTI_BALL':
        case 'MULTI_BALL_L2':
        case 'MULTI_BALL_L3': {
            // Spawning logic remains the same (spawns 1, 2, or 3 *new* balls)
            let numberOfBallsToSpawn = 1;
            if (type === 'MULTI_BALL_L2') {
                numberOfBallsToSpawn = 2;
            } else if (type === 'MULTI_BALL_L3') {
                numberOfBallsToSpawn = 3;
            }
            for (let i = 0; i < numberOfBallsToSpawn; i++) {
                let sx = (Math.random() - 0.5) * 6;
                let sy = -3 - Math.random() * 2;
                refs.ballsRef.current.push(createNewBall(
                    refs.paddleXRef.current + refs.paddleWidthRef.current / 2 + (Math.random() - 0.5) * 10,
                    BOARD_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 5,
                    sx, sy, BASE_BALL_SPEED_FACTOR
                ));
            }
            break;
        }
        case 'BUILDER_BALL':
        case 'BUILDER_BALL_L2':
        case 'BUILDER_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(
                b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0)
            );
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.isBlue = true;
                ball.blueEndTime = currentTime + BUILDER_BALL_DURATION; // Duration might vary by level later
                // Remove conflicting effects
                ball.isBlack = false; ball.blackEndTime = undefined;
                ball.pierceHitsRemaining = 0;
            });
            break;
        }
        case 'BLACK_BALL':
        case 'BLACK_BALL_L2':
        case 'BLACK_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(
                b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0)
            );
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.isBlack = true;
                ball.blackEndTime = currentTime + BLACK_BALL_DURATION; // Duration might vary by level later
                 // Remove conflicting effects
                ball.isBlue = false; ball.blueEndTime = undefined;
                ball.pierceHitsRemaining = 0;

                // Trigger visual effect on the specific ball
                ball.isGlowEffectActive = true;
                ball.glowEffectStartTime = currentTime;
            });
            break;
        }
        case 'PIERCE_BALL':
        case 'PIERCE_BALL_L2':
        case 'PIERCE_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(
                b => !b.isBlack && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0)
            );
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                 // Apply pierce effect (hits might vary by level later)
                ball.pierceHitsRemaining = PIERCE_BALL_HITS;
                 // Remove conflicting effects
                ball.isBlue = false; ball.blueEndTime = undefined;
                ball.isBlack = false; ball.blackEndTime = undefined;
            });
            break;
        }
        default:
            // console.log(`Ball effect not handled for type: ${type}`); // Optional: log unhandled types
            break;
    }
};

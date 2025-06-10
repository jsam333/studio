import { PowerUpType, Ball, Brick } from '../../interfaces';
import { GameStateRefs, GameLoopCallbacks } from '../../interfaces';
import { createNewBall } from '../gameLoopUtils';
import {
    BOARD_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, BASE_BALL_SPEED_FACTOR,
    SPLITTING_BALL_DURATION, BIG_BALL_DURATION, BUILDER_BALL_DURATION,
    DOUBLE_BALL_DURATION, PIERCE_BALL_HITS
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
                ball.isGlowEffectActive = true;
                ball.glowEffectStartTime = currentTime;
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
                ball.splitsRemaining = 3;
                ball.splittingEndTime = currentTime + SPLITTING_BALL_DURATION; 
                ball.isGlowEffectActive = true;
                ball.glowEffectStartTime = currentTime;
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
                ball.bigEndTime = currentTime + BIG_BALL_DURATION;
                ball.isPopEffectActive = true; // Activate pop effect
                ball.popEffectStartTime = currentTime; // Set start time for pop effect
            });
            break;
        }
        case 'MULTI_BALL':
        case 'MULTI_BALL_L2':
        case 'MULTI_BALL_L3': {
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
            let numberOfBallsToSpawn = 1;
            if (type === 'BUILDER_BALL_L2') {
                numberOfBallsToSpawn = 2;
            } else if (type === 'BUILDER_BALL_L3') {
                numberOfBallsToSpawn = 3;
            }
            for (let i = 0; i < numberOfBallsToSpawn; i++) {
                let sx = (Math.random() - 0.5) * 6;
                let sy = -3 - Math.random() * 2;
                const newBall = createNewBall(
                    refs.paddleXRef.current + refs.paddleWidthRef.current / 2 + (Math.random() - 0.5) * 10,
                    BOARD_HEIGHT - PADDLE_HEIGHT - BALL_SIZE - 5,
                    sx, sy, BASE_BALL_SPEED_FACTOR
                );
                newBall.isBlue = true;
                newBall.blueEndTime = currentTime + BUILDER_BALL_DURATION;
                newBall.isDouble = false; 
                newBall.doubleEndTime = undefined;
                newBall.pierceHitsRemaining = 0;
                newBall.isGlowEffectActive = true;
                newBall.glowEffectStartTime = currentTime;
                refs.ballsRef.current.push(newBall);
            }
            break;
        }
        case 'DOUBLE_BALL':
        case 'DOUBLE_BALL_L2':
        case 'DOUBLE_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(
                b => !b.isDouble && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0)
            );
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.isDouble = true;
                ball.doubleEndTime = currentTime + DOUBLE_BALL_DURATION; 
                ball.isBlue = false; ball.blueEndTime = undefined;
                ball.pierceHitsRemaining = 0;
                ball.isGlowEffectActive = true;
                ball.glowEffectStartTime = currentTime;
            });
            break;
        }
        case 'PIERCE_BALL':
        case 'PIERCE_BALL_L2':
        case 'PIERCE_BALL_L3': {
            const eligibleBalls = refs.ballsRef.current.filter(
                b => !b.isDouble && !b.isBlue && (!b.pierceHitsRemaining || b.pierceHitsRemaining <= 0)
            );
            const ballsToModify = eligibleBalls.slice(0, numToAffect);
            ballsToModify.forEach(ball => {
                ball.pierceHitsRemaining = PIERCE_BALL_HITS;
                ball.isBlue = false; ball.blueEndTime = undefined;
                ball.isDouble = false; ball.doubleEndTime = undefined;
                ball.isGlowEffectActive = true;
                ball.glowEffectStartTime = currentTime;
            });
            break;
        }
        default:
            break;
    }
};

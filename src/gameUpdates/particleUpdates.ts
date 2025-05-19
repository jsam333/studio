// src/gameUpdates/particleUpdates.ts
import { GameStateRefs } from '../interfaces';
import { TARGET_FPS } from '../constants';

export const updateParticles = (refs: GameStateRefs, currentTime: number, elapsedTime: number): void => {
    if (!refs.particlesRef.current) return;

    const targetFrameTime = 1000 / TARGET_FPS;
    const scaledDeltaTime = elapsedTime / targetFrameTime;

    refs.particlesRef.current = refs.particlesRef.current.filter(particle => {
        // Calculate age and progress
        const age = currentTime - particle.createdAt;
        if (age >= particle.lifespan) {
            return false; // Remove dead particle
        }

        // Update position
        particle.x += particle.speedX * scaledDeltaTime;
        particle.y += particle.speedY * scaledDeltaTime;

        // Update alpha (fade out over lifespan)
        const lifeProgress = age / particle.lifespan;
        particle.alpha = Math.max(0, 1 - lifeProgress); // Ensure alpha doesn't go below 0

        return true; // Keep active particle
    });
};
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

const RAINBOW_COLORS = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#8b00ff'];

export const createRainbowParticleExplosion = (particles: Particle[], x: number, y: number, width: number, height: number): void => {
    const particleCount = 60; 
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 3 + 1; 
        const speedX = Math.cos(angle) * speed;
        const speedY = Math.sin(angle) * speed;
        const size = Math.random() * 2 + 1;
        const color = RAINBOW_COLORS[i % RAINBOW_COLORS.length];
        const lifespan = Math.random() * 500 + 500; // 0.5 to 1 second

        particles.push({
            id: Date.now() + Math.random(),
            x: centerX,
            y: centerY,
            speedX,
            speedY,
            size,
            color,
            alpha: 1.0,
            lifespan,
            createdAt: Date.now(),
        });
    }
};
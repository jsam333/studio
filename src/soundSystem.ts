export class SoundSystem {
    private audioContext: AudioContext | null = null; // Initialize as null
    private masterVolume: number = 0.2; // Default master volume set to 20%

    constructor() {
        // Check if window is defined (i.e., we are in a browser environment)
        if (typeof window !== 'undefined') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } else {
            // Optional: Log a message or handle the server-side case if needed
            console.log("AudioContext not available in this environment (likely server-side).");
        }
    }

    setMasterVolume(volume: number) {
        if (volume >= 0 && volume <= 1) {
            this.masterVolume = volume;
        } else {
            console.warn('Master volume must be between 0 and 1.');
        }
    }

    getMasterVolume(): number {
        return this.masterVolume;
    }

    playSound(type: string, volume: number = 1.0, frequency: number = 440, duration: number = 0.1, waveType: OscillatorType = 'sine') {
        if (!this.audioContext) {
            // console.log("AudioContext not initialized, cannot play sound."); // Optional: more verbose logging
            return; 
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const effectiveVolume = volume * this.masterVolume;
        gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = waveType;

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playBrickHitSound() {
        this.playSound('brickHit', 0.5, 600, 0.03, 'square');
    }

    playPaddleHitSound() {
        this.playSound('paddleHit', 0.6, 200, 0.05, 'triangle');
    }

    playPowerUpSound() {
        this.playSound('powerUpMain', 0.7, 500, 0.1, 'sine');
        this.playSound('powerUpHarmonic', 0.4, 750, 0.1, 'sine');
    }

    playGameOverSound() {
        this.playSound('gameOverBase', 0.8, 100, 0.5, 'sawtooth');
        this.playSound('gameOverDescend', 0.8, 50, 0.5, 'sawtooth'); 
    }

    playLevelStartSound() {
        this.playSound('levelStartRise', 0.7, 400, 0.2, 'triangle');
        setTimeout(() => this.playSound('levelStartPeak', 0.7, 600, 0.2, 'triangle'), 150);
    }

    playBallLostSound() {
        this.playSound('ballLostFall', 0.6, 150, 0.3, 'square');
        setTimeout(() => this.playSound('ballLostQuiet', 0.4, 75, 0.3, 'square'), 250);
    }
    
    playLaserShootSound() {
        this.playSound('laser', 0.4, 600, 0.08, 'sawtooth');
        setTimeout(() => this.playSound('laserDecay', 0.2, 300, 0.08, 'sawtooth'), 50);
    }

    stopAllSounds(): void {
        if (this.audioContext) {
            this.audioContext.close().then(() => {
                // Re-create AudioContext only if in browser environment
                if (typeof window !== 'undefined') {
                    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                } else {
                    this.audioContext = null;
                }
            });
        }
    }
}

export const soundSystem = new SoundSystem();

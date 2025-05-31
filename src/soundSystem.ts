export class SoundSystem {
    private audioContext: AudioContext | null = null; // Initialize as null
    private masterVolume: number = 0.2; // Default master volume set to 20%

    constructor() {
        if (typeof window !== 'undefined') {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        } else {
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

    // Updated playSound to allow for frequency sweep
    playSound(
        type: string, 
        volume: number = 1.0, 
        frequency: number = 440, 
        duration: number = 0.1, 
        waveType: OscillatorType = 'sine',
        endFrequency?: number // Optional: for frequency sweep
    ) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const effectiveVolume = volume * this.masterVolume;
        gainNode.gain.setValueAtTime(effectiveVolume, now);
        
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, now);

        if (endFrequency !== undefined && endFrequency !== frequency) {
            // Ramp to the end frequency over the duration of the sound
            oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration);
        }

        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    playBrickHitSound() {
        this.playSound('brickHit', 0.5, 600, 0.03, 'square');
    }

    playPaddleHitSound() {
        this.playSound('paddleHit', 0.6, 150, 0.04, 'sine');
    }

    playPowerUpSound() {
        // Quick transition from low to high pitch
        const startFreq = 300;
        const endFreq = 1200;
        const duration = 0.07; // A bit longer to perceive the sweep
        this.playSound('powerUpCollected', 0.7, startFreq, duration, 'triangle', endFreq);
    }

    playGameOverSound() {
        this.playSound('gameOverBase', 0.8, 100, 0.5, 'sawtooth');
        this.playSound('gameOverDescend', 0.8, 50, 0.5, 'sawtooth', 50); // Ensure no sweep if not intended
    }

    playLevelStartSound() {
        this.playSound('levelStartRise', 0.7, 400, 0.2, 'triangle', 600);
        // The setTimeout version for the peak is now replaced by a single sweep, 
        // or you could have two separate playSound calls if a pause is desired.
    }

    playBallLostSound() {
        this.playSound('ballLostFall', 0.6, 150, 0.3, 'square', 75);
        // Removed setTimeout for simplicity, can be re-added if a more complex sound is needed
    }
    
    playLaserShootSound() {
        this.playSound('laser', 0.4, 600, 0.08, 'sawtooth', 300);
        // Removed setTimeout for simplicity
    }

    stopAllSounds(): void {
        if (this.audioContext) {
            this.audioContext.close().then(() => {
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

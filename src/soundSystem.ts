export class SoundSystem {
    private audioContext: AudioContext;
    private masterVolume: number = 0.2; // Default master volume set to 20%

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        if (!this.audioContext) return; // AudioContext not initialized

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Apply master volume to the individual sound's volume
        const effectiveVolume = volume * this.masterVolume;
        gainNode.gain.setValueAtTime(effectiveVolume, this.audioContext.currentTime);
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime); // value in hertz
        oscillator.type = waveType;

        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Example modulated sounds
    playBrickHitSound() {
        // Original: this.playSound('brickHit', 0.5, 300, 0.05, 'square');
        // setTimeout(() => this.playSound('brickHitDecay', 0.3, 150, 0.05, 'sawtooth'), 30);
        
        // Shorter duration and higher pitch for the main hit sound
        this.playSound('brickHit', 0.5, 600, 0.03, 'square'); // Frequency 300->600, duration 0.05->0.03
        // Optional: Adjust decay sound or remove if not needed for a sharper sound
        // setTimeout(() => this.playSound('brickHitDecay', 0.3, 300, 0.03, 'sawtooth'), 20); // Decay also higher pitch & shorter
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
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            });
        }
    }
}

// Global sound system instance
export const soundSystem = new SoundSystem();

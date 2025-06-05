export class SoundSystem {
    private audioContext: AudioContext | null = null;
    private masterVolume: number = 0.15; // Changed from 0.2 to 0.15
    private activeSounds: Map<string, { oscillator: OscillatorNode, gainNode: GainNode }[]> = new Map();
    private readonly MAX_INSTANCES_PER_TYPE = 3; 

    constructor() {
        if (typeof window !== 'undefined') {
            try {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.", e);
                this.audioContext = null;
            }
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

    playSound(
        type: string,
        volume: number = 1.0,
        frequency: number = 440,
        duration: number = 0.1,
        waveType: OscillatorType = 'sine',
        endFrequency?: number
    ) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const now = this.audioContext.currentTime;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const soundInstances = this.activeSounds.get(type) || [];
        if (soundInstances.length >= this.MAX_INSTANCES_PER_TYPE) {
            const oldestSound = soundInstances.shift();
            if (oldestSound) {
                try {
                    oldestSound.oscillator.onended = null; // Prevent onended from firing after manual stop
                    oldestSound.oscillator.stop(0); // Stop immediately
                    oldestSound.oscillator.disconnect();
                    oldestSound.gainNode.disconnect();
                } catch (e) {
                    // console.warn("Error stopping oldest sound:", e); // Optional: log if needed
                }
            }
        }

        const newSoundInstance = { oscillator, gainNode };
        soundInstances.push(newSoundInstance);
        this.activeSounds.set(type, soundInstances);

        oscillator.onended = () => {
            try {
                oscillator.disconnect();
                gainNode.disconnect();
            } catch (e) { /* Might already be disconnected */ }

            const currentInstances = this.activeSounds.get(type);
            if (currentInstances) {
                const index = currentInstances.indexOf(newSoundInstance);
                if (index > -1) {
                    currentInstances.splice(index, 1);
                }
                if (currentInstances.length === 0) {
                    this.activeSounds.delete(type);
                }
            }
        };

        let calculatedVolume = volume * this.masterVolume;
        // Apply volume reduction specifically for 'brickHit' sounds
        // The `soundInstances` here includes the current sound we are about to play,
        // so we check `soundInstances.length -1` for the count of *already* playing sounds.
        if (type === 'brickHit') {
            const alreadyPlayingBrickHitSounds = soundInstances.length -1;
            if (alreadyPlayingBrickHitSounds === 1) { // One is already playing, this new one will be the 2nd
                calculatedVolume *= 0.6; 
            } else if (alreadyPlayingBrickHitSounds >= 2) { // Two or more are already playing, this new one will be the 3rd (or more, but capped at 3 total)
                calculatedVolume *= 0.3; 
            }
        } else if (type === 'paddleHit' || type === 'powerUpCollected' || type === 'explosion') {
            const alreadyPlayingSounds = soundInstances.length - 1;
            if (alreadyPlayingSounds === 1) {
                calculatedVolume *= 0.6;
            } else if (alreadyPlayingSounds >= 2) {
                calculatedVolume *= 0.3;
            }
        }

        gainNode.gain.setValueAtTime(calculatedVolume, now);
        oscillator.type = waveType;
        oscillator.frequency.setValueAtTime(frequency, now);

        if (endFrequency !== undefined && endFrequency !== frequency) {
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
        const startFreq = 300;
        const endFreq = 1200;
        const duration = 0.07;
        this.playSound('powerUpCollected', 0.7, startFreq, duration, 'triangle', endFreq);
    }

    playGameOverSound() {
        this.playSound('gameOverBase', 0.8, 100, 0.5, 'sawtooth');
        this.playSound('gameOverDescend', 0.8, 50, 0.5, 'sawtooth', 50);
    }

    playLevelStartSound() {
        this.playSound('levelStartRise', 0.7, 400, 0.2, 'triangle', 600);
    }

    playBallLostSound() {
        this.playSound('ballLostFall', 0.6, 150, 0.3, 'square', 75);
    }

    playLaserImpactSound() {
        this.playSound('laserImpact', 0.4, 600, 0.08, 'sawtooth', 300);
    }

    playLaserFireSound() {
        const startFreq = 800;
        const endFreq = 200;
        const duration = 0.06;
        this.playSound('laserFire', 0.6, startFreq, duration, 'sawtooth', endFreq); // Volume changed from 0.4 to 0.7
    }

    playExplosionSound() {
        const duration = 0.2; 
        const startFreq = 150; 
        const endFreq = 50;    
        this.playSound('explosion', 0.9, startFreq, duration, 'sawtooth', endFreq);
    }

    stopAllSounds(): void {
        if (this.audioContext) {
            this.activeSounds.forEach((instances) => {
                instances.forEach(instance => {
                    try {
                        instance.oscillator.onended = null;
                        instance.oscillator.stop(0);
                        instance.oscillator.disconnect();
                        instance.gainNode.disconnect();
                    } catch (e) { /* Ignore errors if already stopped/disconnected */ }
                });
            });
            this.activeSounds.clear();

            this.audioContext.close().then(() => {
                if (typeof window !== 'undefined') {
                    try {
                        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                    } catch (e) {
                        console.error("Web Audio API is not supported in this browser after close/reopen.", e);
                        this.audioContext = null;
                    }
                } else {
                    this.audioContext = null;
                }
            }).catch(e => console.error("Error closing/reopening AudioContext:", e));
        }
    }
}

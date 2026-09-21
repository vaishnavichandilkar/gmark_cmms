/**
 * Industrial SCADA Alarm & Buzzer Audio Synthesizer
 * Uses both Web Audio API & HTML5 Audio fallback for 100% reliable, continuous buzzer playback.
 */

type SoundType = 'EMERGENCY' | 'CRITICAL' | 'WARNING' | 'INFO' | 'NOTIFY';

// Synthesize a PCM WAV data URI in-memory for rock-solid fallback playback
function generateWavDataUri(
  frequency1: number,
  frequency2: number,
  pulseOnSec: number,
  pulseOffSec: number,
  totalPulses: number,
  isBuzzer: boolean = true,
): string {
  if (typeof window === 'undefined') return '';
  const sampleRate = 22050;
  const cycleDuration = pulseOnSec + pulseOffSec;
  const totalDuration = cycleDuration * totalPulses;
  const numSamples = Math.floor(sampleRate * totalDuration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt subchunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  // data subchunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const cycleTime = t % cycleDuration;
    let sample = 0;

    if (cycleTime < pulseOnSec) {
      if (isBuzzer) {
        // Harsh industrial buzzer: square wave + sawtooth mixture
        const s1 = Math.sin(2 * Math.PI * frequency1 * t) >= 0 ? 0.6 : -0.6;
        const s2 = 2 * ((t * frequency2) % 1) - 1;
        sample = s1 * 0.65 + s2 * 0.35;
      } else {
        // Softer sine wave beep
        sample = Math.sin(2 * Math.PI * frequency1 * t) * 0.7;
      }
    }
    view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

class AudioBuzzerService {
  private audioCtx: AudioContext | null = null;
  private muted: boolean = false;
  private listeners: Set<(muted: boolean) => void> = new Set();
  private activeOscillators: OscillatorNode[] = [];
  private activeAudioElements: HTMLAudioElement[] = [];
  private emergencyWavUri: string = '';
  private warningWavUri: string = '';

  // Continuous looping state
  private isLooping: boolean = false;
  private loopInterval: ReturnType<typeof setInterval> | null = null;
  private loopMaxTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    try {
      const stored = localStorage.getItem('scada_buzzer_muted');
      this.muted = stored === 'true';
    } catch {
      this.muted = false;
    }

    if (typeof window !== 'undefined') {
      try {
        // Pre-generate authentic buzzer WAV URIs (3 pulses, 920Hz + 860Hz)
        this.emergencyWavUri = generateWavDataUri(920, 860, 0.18, 0.08, 3, true);
        this.warningWavUri = generateWavDataUri(720, 720, 0.14, 0.1, 2, false);
      } catch (e) {
        console.warn('Could not pregenerate alarm WAV data:', e);
      }

      // Unlock audio on any first user interaction
      const unlockAudio = () => {
        this.unlock();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
      window.addEventListener('touchstart', unlockAudio);
    }
  }

  public unlock() {
    try {
      const ctx = this.initContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
    } catch (e) {
      console.warn('Error unlocking audio context:', e);
    }
  }

  private initContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    return this.audioCtx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem('scada_buzzer_muted', String(muted));
    } catch {
      // ignore
    }
    if (muted) {
      this.stopAllSounds();
    }
    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public subscribe(listener: (muted: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.muted));
  }

  public stopAllSounds() {
    this.isLooping = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    if (this.loopMaxTimeout) {
      clearTimeout(this.loopMaxTimeout);
      this.loopMaxTimeout = null;
    }

    this.activeAudioElements.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
    });
    this.activeAudioElements = [];

    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeOscillators = [];
  }

  public isBuzzerActive(): boolean {
    return this.isLooping;
  }

  public async playAlertSound(type: string, intensity: number = 1) {
    if (this.muted) return;

    const upperType = (type || '').toUpperCase() as SoundType;

    switch (upperType) {
      case 'EMERGENCY':
      case 'CRITICAL':
        // Rings continuously for up to 45 seconds or until silenced / resolved
        this.startContinuousEmergencyBuzzer(intensity, 45);
        break;
      case 'WARNING':
        await this.playWarningBeep(intensity);
        break;
      case 'INFO':
      case 'NOTIFY':
        await this.playInfoChime();
        break;
      default:
        await this.playWarningBeep(1);
        break;
    }
  }

  /**
   * Continuous Emergency Buzzer:
   * Keeps ringing in repeating pulses until silenced or resolved
   */
  public startContinuousEmergencyBuzzer(intensity: number = 1, maxDurationSec: number = 45) {
    if (this.muted) return;

    this.stopAllSounds();
    this.isLooping = true;

    // Play immediately
    this.playSingleEmergencyBurst(intensity);

    // Repeat every 1.1 seconds (continuous industrial plant alarm cycle)
    this.loopInterval = setInterval(() => {
      if (this.muted || !this.isLooping) {
        this.stopAllSounds();
        return;
      }
      this.playSingleEmergencyBurst(intensity);
    }, 1100);

    // Safety cutoff after maxDurationSec (e.g. 45 seconds)
    this.loopMaxTimeout = setTimeout(() => {
      this.stopAllSounds();
    }, maxDurationSec * 1000);
  }

  /**
   * Single burst of the emergency buzzer (3 sharp aggressive pulses)
   */
  public playSingleEmergencyBurst(intensity: number = 1) {
    if (this.muted) return;

    // 1. Play HTML5 Audio fallback
    if (this.emergencyWavUri) {
      try {
        const audio = new Audio(this.emergencyWavUri);
        audio.volume = Math.min(1, 0.75 + intensity * 0.05);
        this.activeAudioElements.push(audio);
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    // 2. Play synthesized Web Audio oscillator
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const burstCount = Math.min(5, Math.max(3, intensity + 1));
      const burstDuration = 0.18;
      const gapDuration = 0.08;
      const now = ctx.currentTime + 0.03;

      for (let i = 0; i < burstCount; i++) {
        const startTime = now + i * (burstDuration + gapDuration);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(920, startTime);

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(860, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.45, startTime + 0.02);
        gain.gain.setValueAtTime(0.45, startTime + burstDuration - 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + burstDuration);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + burstDuration);
        osc2.stop(startTime + burstDuration);

        this.activeOscillators.push(osc1, osc2);
      }
    } catch (err) {
      console.warn('Web Audio burst error:', err);
    }
  }

  // Alias for manual testing
  public async playEmergencyBuzzer(intensity: number = 1) {
    this.startContinuousEmergencyBuzzer(intensity, 8); // 8 seconds for test button
  }

  public async playWarningBeep(intensity: number = 1) {
    if (this.muted) return;
    this.stopAllSounds();

    if (this.warningWavUri) {
      try {
        const audio = new Audio(this.warningWavUri);
        audio.volume = 0.6;
        this.activeAudioElements.push(audio);
        audio.play().catch(() => {});
      } catch {
        // fallback
      }
    }

    const ctx = this.initContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const beepCount = intensity > 2 ? 3 : 2;
      const duration = 0.12;
      const gap = 0.08;
      const now = ctx.currentTime + 0.03;

      for (let i = 0; i < beepCount; i++) {
        const startTime = now + i * (duration + gap);
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(720, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);

        this.activeOscillators.push(osc);
      }
    } catch (err) {
      console.warn('Warning beep error:', err);
    }
  }

  public async playInfoChime() {
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.15);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);

      this.activeOscillators.push(osc);
    } catch (e) {
      console.warn('Info chime error:', e);
    }
  }

  public async playResolvedChime() {
    this.stopAllSounds(); // Stop continuous emergency buzzer immediately on resolution
    if (this.muted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const tones = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
      tones.forEach((freq, idx) => {
        const startTime = ctx.currentTime + idx * 0.08;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.2);

        this.activeOscillators.push(osc);
      });
    } catch (e) {
      console.warn('Resolved chime error:', e);
    }
  }
}

export const audioBuzzer = new AudioBuzzerService();

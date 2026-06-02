let audioCtx: AudioContext | null = null;
let isInitialized = false;

/**
 * Initializes and unlocks the Web Audio API Context.
 * Must be triggered by a direct user interaction (like a click) to comply with browser autoplay policies.
 */
export const initAudioContext = async (): Promise<boolean> => {
  if (isInitialized && audioCtx && audioCtx.state === 'running') {
    return true;
  }

  try {
    // Create AudioContext if not already created
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume context if suspended
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // Play a very short silent audio burst to verify authorization and warm up the AudioNode graph
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);

    // Warm up the SpeechSynthesis engine
    if ('speechSynthesis' in window) {
      const dummyUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(dummyUtterance);
    }

    isInitialized = true;
    console.log('VoiceAlertService successfully initialized.');
    return true;
  } catch (error) {
    console.error('Failed to initialize AudioContext due to browser autoplay limits:', error);
    return false;
  }
};

/**
 * Synthesizes a dual-tone industrial alarm/beep sequence using pure Web Audio oscillators.
 * Tone sequence: two quick warning chirps.
 */
export const playAlarmSound = async (): Promise<void> => {
  return new Promise((resolve) => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      // Configure frequencies to sound like an industrial annunciator beep
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(950, now);
      osc1.frequency.setValueAtTime(750, now + 0.12);
      osc1.frequency.setValueAtTime(950, now + 0.24);
      osc1.frequency.setValueAtTime(750, now + 0.36);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(955, now);
      osc2.frequency.setValueAtTime(755, now + 0.12);
      osc2.frequency.setValueAtTime(955, now + 0.24);
      osc2.frequency.setValueAtTime(755, now + 0.36);

      // Volume envelope (two distinct pulses)
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.setValueAtTime(0.001, now + 0.20);
      gainNode.gain.setValueAtTime(0.12, now + 0.24);
      gainNode.gain.setValueAtTime(0.001, now + 0.44);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);

      setTimeout(() => {
        resolve();
      }, 450);
    } catch (err) {
      console.warn('Web Audio alarm sound failed:', err);
      resolve(); // Resolve to avoid blocking subsequent speech alert logic
    }
  });
};

/**
 * Speaks a custom fault message using a realistic female English voice.
 * Cancels any active speech before playing.
 */
export const speakFaultAlert = (message: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Browser does not support SpeechSynthesis.');
      resolve();
      return;
    }

    // Cancel any current utterances in queue
    window.speechSynthesis.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(message);

    // Get list of system voices
    const voices = window.speechSynthesis.getVoices();

    // Prioritized female English voices
    const prioritizedFemaleKeywords = [
      'samantha',
      'google uk english female',
      'zira',
      'hazel',
      'susan',
      'female',
      'english'
    ];

    let selectedVoice = voices.find((voice) => {
      const name = voice.name.toLowerCase();
      const lang = voice.lang.toLowerCase();
      return lang.startsWith('en') && prioritizedFemaleKeywords.some((key) => name.includes(key));
    });

    // Fallback to any English voice if a specific female English voice is not found
    if (!selectedVoice) {
      selectedVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('en'));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Slow down speech slightly for a professional, clear voice announcement
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    // Resolve promise when speech is finished
    utterance.onend = () => {
      resolve();
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      resolve();
    };

    window.speechSynthesis.speak(utterance);
  });
};

export const VoiceAlertService = {
  initAudioContext,
  playAlarmSound,
  speakFaultAlert,
};

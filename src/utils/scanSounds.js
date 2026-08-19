// Web Audio API Sound Utility for QR Scan Feedback
// Zero latency, no external assets/downloads required, cross-browser supported.

let audioCtx = null;
const MUTE_STORAGE_KEY = 'ingather_scan_sound_muted';

export const isSoundMuted = () => {
  try {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch (error) {
    return false;
  }
};

export const setSoundMuted = (muted) => {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(Boolean(muted)));
  } catch (error) {
    // Ignore storage restrictions
  }
};

export const toggleSoundMuted = () => {
  const next = !isSoundMuted();
  setSoundMuted(next);
  return next;
};

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
};

// High pleasant double-beep chime for successful check-in
export const playSuccessSound = () => {
  if (isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: A5 (880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    // Tone 2: D6 (1174.66 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.09);
    gain2.gain.setValueAtTime(0.3, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.28);
  } catch (error) {
    // Ignore audio autoplay restrictions or uninitialized contexts
  }
};

// Low double warning buzz for already checked-in or failed scan
export const playErrorSound = () => {
  if (isSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Buzz 1: Sawtooth 280 Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(280, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Buzz 2: Sawtooth 180 Hz
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(180, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.32);
  } catch (error) {
    // Ignore audio autoplay restrictions or uninitialized contexts
  }
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainValue = 0.08,
  delay = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playTradeSound(kind: 'bet' | 'win' | 'loss' | 'bust', enabled: boolean) {
  if (!enabled) return;
  try {
    if (kind === 'bet') {
      playTone(520, 0.09, 'triangle', 0.07, 0);
      playTone(780, 0.09, 'triangle', 0.05, 0.04);
    } else if (kind === 'win') {
      playTone(587.33, 0.12, 'sine', 0.09, 0);
      playTone(783.99, 0.12, 'sine', 0.09, 0.07);
      playTone(1046.5, 0.22, 'sine', 0.1, 0.14);
    } else if (kind === 'loss') {
      playTone(300, 0.15, 'sawtooth', 0.05, 0);
      playTone(220, 0.2, 'sawtooth', 0.04, 0.09);
    } else if (kind === 'bust') {
      playTone(180, 0.18, 'sawtooth', 0.08, 0);
      playTone(120, 0.32, 'sawtooth', 0.07, 0.12);
    }
  } catch {
    // Ignore browser audio autoplay restrictions
  }
}

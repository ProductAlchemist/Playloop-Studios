// Simple synthesizer to avoid external asset dependencies
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

export const playSound = (type: 'move' | 'win' | 'draw' | 'click') => {
  const ctx = getContext();
  if (!ctx) return;

  // Resume context if suspended (browser policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'move') {
    // Soft pop
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'win') {
    // Victory chord
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major
    notes.forEach((freq, i) => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.value = freq;
        gain2.gain.setValueAtTime(0.1, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc2.start(now + i * 0.1);
        osc2.stop(now + 1.5);
    });
  } else if (type === 'draw') {
    // Low hum
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.5);
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'click') {
     // UI Click
     osc.type = 'sine';
     osc.frequency.setValueAtTime(800, now);
     gainNode.gain.setValueAtTime(0.05, now);
     gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
     osc.start(now);
     osc.stop(now + 0.05);
  }
};

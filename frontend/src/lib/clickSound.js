// Web Audio API click sound generator — no external files needed
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getContext() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playClickSound() {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Short crisp click — futuristic UI sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.03);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch {
    // Silently fail if Web Audio not available
  }
}

export function initClickSound() {
  const handler = (e) => {
    const target = e.target.closest('button, a, [role="button"], .clickable, input[type="submit"], input[type="checkbox"], tr[class*="hover"]');
    if (target) playClickSound();
  };

  document.addEventListener('click', handler, { passive: true });
  return () => document.removeEventListener('click', handler);
}

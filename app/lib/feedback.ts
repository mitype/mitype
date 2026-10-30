// Quiet haptics and soft sounds. One preference ("on" by default) covers
// both. Stored on this device only. Every call is silent and harmless when
// the browser or phone does not support it.

const KEY = 'mitype-feedback';

export function feedbackEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try { return window.localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function setFeedbackEnabled(on: boolean): void {
  try { window.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
}

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };
let ctx: AudioContext | null = null;
let lastAt = 0;

function audio(): AudioContext | null {
  try {
    const w = window as AudioWindow;
    const Ctor = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

// Browsers only allow sound after a first tap, so wake the audio engine on
// the first touch anywhere.
if (typeof window !== 'undefined') {
  const unlock = () => { audio(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock, { passive: true });
}

function tone(freq: number, start: number, dur: number, vol: number) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Android and most browsers: vibrate. iPhone: a hidden switch toggle gives a
// light tap on newer iOS versions. Both are skipped quietly if unsupported.
function haptic(ms: number) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
      return;
    }
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    setTimeout(() => label.remove(), 60);
  } catch { /* ignore */ }
}

function gate(minGap = 120): boolean {
  if (!feedbackEnabled()) return false;
  const now = Date.now();
  if (now - lastAt < minGap) return false;
  lastAt = now;
  return true;
}

export const feedback = {
  like() {
    if (!gate()) return;
    haptic(12);
    tone(660, 0, 0.12, 0.05);
    tone(880, 0.06, 0.16, 0.04);
  },
  unlike() {
    if (!gate()) return;
    haptic(8);
    tone(440, 0, 0.14, 0.035);
  },
  message() {
    if (!gate(400)) return;
    haptic(18);
    tone(880, 0, 0.12, 0.05);
    tone(1175, 0.09, 0.16, 0.045);
  },
  connection() {
    if (!gate(400)) return;
    haptic([14, 40, 14] as unknown as number);
    tone(660, 0, 0.14, 0.05);
    tone(990, 0.1, 0.2, 0.045);
  },
};

// =============================================================
//  Audio sintetizado (WebAudio) — sin archivos externos
// =============================================================
const AU = { ctx: null, master: null, muted: false, noise: null, enabled: true };

export function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    const m = A.createGain(); m.gain.value = 0.5; m.connect(A.destination);
    const buf = A.createBuffer(1, A.sampleRate * 1.5, A.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Object.assign(AU, { ctx: A, master: m, noise: buf });
  } catch (e) { /* sin audio */ }
}
export const toggleMute = () => (AU.muted = !AU.muted);
export const isMuted = () => AU.muted;
export const setSfxEnabled = v => { AU.enabled = v; };

function tone(f, dur, type = 'sine', vol = 0.2, f2 = 0, delay = 0) {
  const A = AU.ctx; if (!A || AU.muted) return;
  const t = A.currentTime + delay;
  const o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, { delay = 0, attack = 0.002, q = 0.9, type = 'bandpass' } = {}) {
  const A = AU.ctx; if (!A || AU.muted) return;
  const t = A.currentTime + delay;
  const s = A.createBufferSource(); s.buffer = AU.noise;
  const f = A.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = A.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

const on = () => AU.enabled;
export const SFX = {
  table(v = 1) { if (!on()) return; tone(1150, 0.05, 'sine', 0.28 * v, 720); noise(0.025, 0.12 * v, 5200); },
  paddle(p = 0.5) { if (!on()) return; tone(480 + p * 220, 0.06, 'triangle', 0.3, 280); noise(0.05, 0.3, 2600); },
  smash() { if (!on()) return; tone(170, 0.32, 'sawtooth', 0.22, 50); noise(0.4, 0.5, 1300); tone(1300, 0.15, 'square', 0.05, 2400); },
  perfect() { if (!on()) return; tone(1320, 0.12, 'sine', 0.12); tone(1760, 0.18, 'sine', 0.1, 0, 0.06); },
  net() { if (!on()) return; tone(140, 0.14, 'sine', 0.3, 80); noise(0.1, 0.2, 500); },
  floor(v = 1) { if (!on()) return; tone(820, 0.07, 'sine', 0.16 * v, 520); },
  whoosh() { if (!on()) return; noise(0.16, 0.16, 3200, { attack: 0.05, q: 0.6 }); },
  cheer() { if (!on()) return; noise(1.6, 0.22, 1100, { attack: 0.25, q: 0.4 }); noise(1.2, 0.12, 2400, { attack: 0.2, q: 0.6, delay: 0.1 }); },
  aww() { if (!on()) return; tone(420, 0.6, 'sine', 0.07, 250); noise(0.9, 0.08, 700, { attack: 0.2, q: 0.5 }); },
  whiff() { if (!on()) return; tone(300, 0.15, 'triangle', 0.08, 180); },
  blip() { tone(880, 0.035, 'triangle', 0.07, 1100); },
  select() { tone(520, 0.08, 'triangle', 0.1, 780); tone(1040, 0.12, 'triangle', 0.07, 0, 0.06); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'square', 0.08, 0, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, 0, i * 0.15)); },
};

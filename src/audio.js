// =============================================================
//  Audio sintetizado (WebAudio) — sin archivos externos
// =============================================================
// Buses: efectos → sfx, música → music, ambos → master (el silencio actúa en master)
const AU = { ctx: null, master: null, sfx: null, music: null, muted: false, noise: null, enabled: true, sfxVol: 0.8, musicVol: 0.3 };

export function initAudio() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    const A = new (window.AudioContext || window.webkitAudioContext)();
    const m = A.createGain(); m.gain.value = AU.muted ? 0 : 0.5; m.connect(A.destination);
    const sfx = A.createGain(); sfx.gain.value = AU.sfxVol; sfx.connect(m);
    const music = A.createGain(); music.gain.value = AU.musicVol * 0.5; music.connect(m);
    const buf = A.createBuffer(1, A.sampleRate * 1.5, A.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Object.assign(AU, { ctx: A, master: m, sfx, music, noise: buf });
    startMusic();
  } catch (e) { /* sin audio */ }
}
function applyMaster() { if (AU.master) AU.master.gain.setTargetAtTime(AU.muted ? 0 : 0.5, AU.ctx.currentTime, 0.05); }
export const toggleMute = () => { AU.muted = !AU.muted; applyMaster(); return AU.muted; };
export const isMuted = () => AU.muted;
export const setMuted = v => { AU.muted = !!v; applyMaster(); };
export const setSfxEnabled = v => { AU.enabled = v; };
export function setSfxVolume(v) { AU.sfxVol = v; if (AU.sfx) AU.sfx.gain.setTargetAtTime(v, AU.ctx.currentTime, 0.05); }
export function setMusicVolume(v) { AU.musicVol = v; if (AU.music) AU.music.gain.setTargetAtTime(v * 0.5, AU.ctx.currentTime, 0.3); }

function tone(f, dur, type = 'sine', vol = 0.2, f2 = 0, delay = 0) {
  const A = AU.ctx; if (!A || AU.muted) return;
  const t = A.currentTime + delay;
  const o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.sfx); o.start(t); o.stop(t + dur + 0.02);
}

// ---------- Música generativa muy suave (lo-fi de parque) ----------
// Cmaj7 → Am7 → Fmaj7 → G6, pad lento + bajo + punteos dispersos. Todo con volumen bajo.
const BPM = 84, EIGHTH = 60 / BPM / 2;
const PROG = [[36, [60, 64, 67, 71]], [33, [57, 60, 64, 67]], [29, [57, 60, 65, 69]], [31, [55, 59, 62, 64]]];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const MUS = { on: false, timer: 0, next: 0, step: 0 };
function mNote(midi, t, dur, { type = 'sine', vol = 0.02, attack = 0.02, cutoff = 0, detune = 0 } = {}) {
  const A = AU.ctx;
  const o = A.createOscillator(), g = A.createGain();
  o.type = type; o.frequency.value = mtof(midi); o.detune.value = detune;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (cutoff) { const f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; o.connect(f); node = f; }
  node.connect(g); g.connect(AU.music);
  o.start(t); o.stop(t + dur + 0.05);
}
function scheduleStep(s, t) {
  const bar = Math.floor(s / 8) % PROG.length, pos = s % 8, [root, chord] = PROG[bar];
  if (pos === 0) {
    for (const n of chord) { mNote(n, t, EIGHTH * 8.4, { vol: 0.016, attack: 0.9 }); mNote(n, t, EIGHTH * 8.4, { type: 'triangle', vol: 0.008, attack: 1.1, detune: 7 }); }
    mNote(root, t, EIGHTH * 3.5, { type: 'triangle', vol: 0.05, attack: 0.03, cutoff: 500 });
  }
  if (pos === 4) mNote(root + 7, t, EIGHTH * 3, { type: 'triangle', vol: 0.035, attack: 0.03, cutoff: 500 });
  if ((pos === 2 || pos === 5 || pos === 7) && Math.random() < 0.55) {
    mNote(chord[Math.floor(Math.random() * chord.length)] + 12, t, 0.45, { type: 'triangle', vol: 0.022, attack: 0.01, cutoff: 2400 });
  }
}
function schedule() {
  const A = AU.ctx; if (!A || !MUS.on) return;
  if (MUS.next < A.currentTime) MUS.next = A.currentTime + 0.05;     // tras una pausa del navegador
  while (MUS.next < A.currentTime + 0.3) { scheduleStep(MUS.step++, MUS.next); MUS.next += EIGHTH; }
}
export function startMusic() {
  if (!AU.ctx || MUS.on) return;
  MUS.on = true; MUS.next = AU.ctx.currentTime + 0.2;
  MUS.timer = setInterval(schedule, 100);
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
  s.connect(f); f.connect(g); g.connect(AU.sfx);
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
  // cuenta atrás: tres pitidos cortos y uno largo y agudo al «¡YA!»
  count(n) { if (!on()) return; n > 0 ? tone(660, 0.12, 'square', 0.07) : (tone(1320, 0.32, 'square', 0.08), tone(1980, 0.25, 'triangle', 0.04, 0, 0.03)); },
  emote(id) {
    if (!on()) return;
    const S = { dance: [[784, 0], [988, 0.1], [1175, 0.2], [988, 0.3]], laugh: [[700, 0], [620, 0.09], [700, 0.18], [620, 0.27]], taunt: [[300, 0], [200, 0.12]],
      cry: [[520, 0], [440, 0.18], [370, 0.36]], love: [[880, 0], [1320, 0.14]], angry: [[160, 0], [150, 0.1], [140, 0.2]] }[id] || [[600, 0]];
    for (const [f, d] of S) tone(f, 0.14, id === 'angry' || id === 'taunt' ? 'sawtooth' : 'triangle', 0.06, 0, d);
  },
  // juez: silbato, porrazo al caerse y abucheo del público
  whistle() { if (!on()) return; for (const d of [0, 0.16]) { tone(2650, 0.13, 'square', 0.035, 2500, d); noise(0.13, 0.05, 3000, { delay: d }); } },
  fall() { if (!on()) return; tone(420, 0.35, 'triangle', 0.1, 90); noise(0.18, 0.3, 300, { delay: 0.3 }); tone(80, 0.25, 'sine', 0.25, 40, 0.3); },
  boo() { if (!on()) return; noise(1.1, 0.15, 400, { attack: 0.2, q: 0.6 }); tone(180, 0.9, 'sawtooth', 0.025, 140); },
  blip() { tone(880, 0.035, 'triangle', 0.07, 1100); },
  select() { tone(520, 0.08, 'triangle', 0.1, 780); tone(1040, 0.12, 'triangle', 0.07, 0, 0.06); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, 'square', 0.08, 0, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, 0, i * 0.15)); },
};

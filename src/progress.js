// =============================================================
//  PROGRESO — perfil del jugador, Pongcoins, tienda, árbol de
//  habilidades y las 3 palas personalizables. Se guarda en el navegador.
// =============================================================
import { PADDLES } from './config.js';
import { DEFAULT_LOOK, OUTFITS, PADDLE_COLORS } from './character.js';

const KEY = 'ppp-profile';
export const PRICE = 5;                 // casi todo cuesta lo que da ganar un partido normal
export const MAX_LV = 5;
export const WELCOME_COINS = 200;   // de momento, saldo inicial generoso para la gente nueva

// Lo que viene de serie; el resto se compra
export const FREE = {
  shirt: ['tee', 'tank', 'none'], pants: ['shorts', 'long'], hat: ['none', 'capback', 'cap', 'sprout'],
  glasses: ['none', 'sun'], face: ['none'], neck: ['none'], back: ['none'], outfit: ['newcomer'], paddle: ['balanced'],
};
export const LOCK_CATS = ['shirt', 'pants', 'hat', 'glasses', 'face', 'neck', 'back'];

// Árbol del frijolito: cada nivel = +per (multiplicador)
export const SKILLS = {
  agi:   { name: 'Agilidad', desc: 'Corres más rápido hacia la bola', per: 0.06, icon: '⚡' },
  str:   { name: 'Fuerza', desc: 'Golpes y remates más potentes', per: 0.035, icon: '💪' },
  ref:   { name: 'Reflejos', desc: 'Ventana de golpe más amplia', per: 0.06, icon: '👁' },
  reach: { name: 'Alcance', desc: 'Llegas a bolas más abiertas', per: 0.05, icon: '↔' },
};
// Árbol de cada pala: mejora sobre la base del tipo
export const PAD_SKILLS = {
  speed: { name: 'Velocidad', desc: 'Bolas más rápidas', per: 0.03 },
  spin:  { name: 'Efecto', desc: 'Más liftado, cortado y curva', per: 0.05 },
  ctrl:  { name: 'Control', desc: 'Más precisión y margen', per: 0.04 },
  smash: { name: 'Remate', desc: 'Smashes más demoledores', per: 0.04 },
};
// Hitos del árbol: al llegar a estos niveles el nodo es "especial" (solo visual + nombre)
export const MILESTONES = { 3: 'Experto', 5: 'Maestro' };

const newPaddle = (i) => ({ name: `Pala ${i + 1}`, type: 'balanced', color: PADDLE_COLORS[[0, 2, 3][i]], wood: ['#e3b47a', '#c99a5e', '#f0d6a8'][i], up: { speed: 0, spin: 0, ctrl: 0, smash: 0 } });
function fresh() {
  return {
    v: 1, named: false, coins: WELCOME_COINS, welcome200: true, earned: 0, owned: {},
    skills: { agi: 0, str: 0, ref: 0, reach: 0 },
    paddles: [0, 1, 2].map(newPaddle), active: 0,
    stats: { played: 0, wins: 0, losses: 0, best: 0 },
  };
}

export const P = fresh();
try {
  const s = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (s && s.v === 1) {
    Object.assign(P, s);
    P.skills = { ...fresh().skills, ...(s.skills || {}) };
    P.stats = { ...fresh().stats, ...(s.stats || {}) };
    P.paddles = [0, 1, 2].map(i => ({ ...newPaddle(i), ...((s.paddles || [])[i] || {}), up: { ...newPaddle(i).up, ...(((s.paddles || [])[i] || {}).up || {}) } }));
    // una sola vez: los perfiles que ya existían también arrancan con al menos el saldo de bienvenida (no se quita a quien tiene más)
    if (!s.welcome200) { P.coins = Math.max(P.coins, WELCOME_COINS); P.welcome200 = true; localStorage.setItem(KEY, JSON.stringify(P)); }
  }
} catch (e) { /* sin storage */ }

export function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* sin storage */ } }

// ---------- Tienda ----------
export const isOwned = (cat, id) => id == null || (FREE[cat] || []).includes(id) || !!P.owned[cat + ':' + id];
export const canAfford = n => P.coins >= n;
export function spend(n) { if (P.coins < n) return false; P.coins -= n; save(); return true; }
export function unlock(cat, id) { P.owned[cat + ':' + id] = 1; }

// prendas bloqueadas que lleva puestas un aspecto
export const lockedIn = look => LOCK_CATS.filter(k => !isOwned(k, look[k])).map(k => [k, look[k]]);
// copia del aspecto sin nada bloqueado (para jugar o enviarlo online)
export function sanitizeLook(look) {
  const L = { ...look };
  for (const k of LOCK_CATS) if (!isOwned(k, L[k])) L[k] = isOwned(k, DEFAULT_LOOK[k]) ? DEFAULT_LOOK[k] : FREE[k][0];
  const pad = P.paddles[P.active];
  L.paddleType = isOwned('paddle', pad.type) ? pad.type : 'balanced'; L.paddleColor = pad.color; L.paddleWood = pad.wood; L.paddleDesign = P.active;
  return L;
}
// comprar un outfit desbloquea también todas sus prendas
export function buyOutfit(id) {
  const o = OUTFITS.find(x => x.id === id); if (!o || isOwned('outfit', id)) return true;
  if (!spend(PRICE)) return false;
  unlock('outfit', id);
  for (const k of LOCK_CATS) if (o.look[k] != null) unlock(k, o.look[k]);
  save(); return true;
}
export function buyPieces(list) {
  const todo = list.filter(([k, id]) => !isOwned(k, id));
  if (!spend(todo.length * PRICE)) return false;
  todo.forEach(([k, id]) => unlock(k, id)); save(); return true;
}

// ---------- Habilidades ----------
export const skillCost = () => PRICE;
export function buySkill(id) {
  if (P.skills[id] >= MAX_LV || !spend(PRICE)) return false;
  P.skills[id]++; save(); return true;
}
export function buyPadSkill(slot, id) {
  const p = P.paddles[slot];
  if (p.up[id] >= MAX_LV || !spend(PRICE)) return false;
  p.up[id]++; save(); return true;
}
export function buyPadType(type) {
  if (isOwned('paddle', type)) return true;
  if (!spend(PRICE)) return false;
  unlock('paddle', type); save(); return true;
}
// multiplicadores del frijolito
export function boosts() {
  const b = {}; for (const [k, s] of Object.entries(SKILLS)) b[k] = 1 + P.skills[k] * s.per; return b;
}
// estadísticas efectivas de una pala (tipo base × mejoras)
export function padStats(slot = P.active) {
  const p = P.paddles[slot], base = PADDLES[isOwned('paddle', p.type) ? p.type : 'balanced'] || PADDLES.balanced;
  const r = { ...base, slot, label: p.name };
  for (const [k, s] of Object.entries(PAD_SKILLS)) r[k] = base[k] * (1 + p.up[k] * s.per);
  return r;
}
export const charLevel = () => Object.values(P.skills).reduce((a, b) => a + b, 0);

// ---------- Recompensas ----------
// Pocas monedas: un partido normal ganado = PRICE. Más largo o más difícil = algo más.
export function matchReward({ online, diff, target, bestOf }) {
  const base = online ? 5 : [3, 5, 6, 8][diff] ?? 5;
  const len = Math.max(0.6, target / 11) * (bestOf >= 5 ? 3 : bestOf >= 3 ? 2 : 1);
  return Math.max(1, Math.round(base * len));
}
export function recordMatch(won, reward) {
  P.stats.played++;
  if (won) { P.stats.wins++; P.coins += reward; P.earned += reward; } else P.stats.losses++;
  save();
}
export function setNamed(name) { P.named = true; save(); return name; }

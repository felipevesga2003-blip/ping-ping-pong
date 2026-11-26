// =============================================================
//  Configuración global — medidas reales de mesa (metros)
// =============================================================
export const TABLE_H = 0.76;      // altura de la superficie
export const HALF_L = 1.37;       // mitad del largo (2.74 m)
export const HALF_W = 0.7625;     // mitad del ancho (1.525 m)
export const NET_H = 0.1525;      // altura de la red
export const R = 0.03;            // radio de bola (agrandado para legibilidad)

// Física
export const GRAV = 9.0;
export const KD = 0.012;          // arrastre aerodinámico
export const KM = 0.0092;         // efecto Magnus (exagerado a propósito: más parábola y más comba)
export const SPIN_DECAY = 0.2;
export const REST = 0.9;          // restitución mesa
export const TFRIC = 0.28;        // fricción mesa (acopla efecto ↔ velocidad)
export const STEP = 1 / 240;      // paso fijo de simulación
export const TIME_SCALE = 0.8;    // ritmo arcade (un poco más lento que la realidad)

// Golpeo
export const WIN_T = 0.16;        // ventana de timing (s, tiempo de juego)
export const REACH = 0.8;         // alcance lateral del personaje
export const SWING_DUR = 0.28;
export const SMASH_H = 0.42;      // altura sobre la mesa para smash
export const PLAYER_SPEED = 3.4;
export const ASSIST_SPEED = 2.9;   // movimiento automático un poco más lento
// Mano libre
export const FREE_REACH = 1.15;   // alcance máximo del brazo elástico (m)
export const FREE_HIT_R = 0.27;   // radio útil de la pala (generoso, estilo arcade)
export const FREE_BODY_SPEED = 2.6;
export const ZONE_X = 1.7;
export const ZONE_Z = [HALF_L + 0.15, HALF_L + 1.5];

export const DIFFS = [
  // Fácil: para quien empieza — reacciona tarde, se mueve suave, tira flojo y al centro, y falla a menudo
  { name: 'Fácil',   react: .34, speed: 1.75, timing: .085, pmin: .06, pmax: .30, err: .22, side: 6, back: .12, miss: .22, aim: .45, pace: .82, gain: 3.2 },
  { name: 'Normal',  react: .14, speed: 2.8, timing: .050, pmin: .30, pmax: .70, err: .04, side: 30, back: .28, miss: .07 },
  { name: 'Difícil', react: .09, speed: 3.3, timing: .030, pmin: .45, pmax: .90, err: .02, side: 45, back: .30, miss: .04 },
  { name: 'Pro',     react: .05, speed: 3.8, timing: .018, pmin: .60, pmax: 1.0, err: .0, side: 60, back: .32, miss: .02 },
];

// Paleta cartoon
export const PALETTE = {
  outline: 0x2a1512,
  player: 0x4da8ff,
  cpu: 0xff6b8b,
  ball: 0xffb020,
  ballBand: 0xe0601a,
  table: 0x2f7df6,
  tableEdge: 0x1d5bc4,
  legs: 0x2c3a66,
  ground: 0x9be3c3,
  court: 0xffd6a5,
  courtBorder: 0xffffff,
  paddleRed: 0xf03e3e,
  wood: 0xd9a066,
  skyTop: '#6cc4ff',
  skyMid: '#b9e6ff',
  skyLow: '#fff1dc',
  fog: 0xd7efff,
};

// Raquetas: multiplicadores sobre velocidad, efecto, control (ventana de timing / error) y remate
export const PADDLES = {
  balanced: { name: 'Equilibrada', desc: 'Sin puntos débiles.', speed: 1, spin: 1, ctrl: 1, smash: 1 },
  fast:     { name: 'Rayo', desc: 'Bolas más rápidas, menos efecto.', speed: 1.12, spin: 0.85, ctrl: 0.92, smash: 1.05 },
  spin:     { name: 'Remolino', desc: 'Mucho más efecto y curva.', speed: 0.94, spin: 1.35, ctrl: 0.95, smash: 0.95 },
  control:  { name: 'Muro', desc: 'Ventana de golpe amplia y precisa.', speed: 0.94, spin: 1, ctrl: 1.25, smash: 0.95 },
  power:    { name: 'Martillo', desc: 'Remates demoledores, menos precisa.', speed: 1.05, spin: 0.9, ctrl: 0.88, smash: 1.22 },
};
// Emotes (teclas 1–6 / cruceta del mando)
export const EMOTES = [
  { id: 'dance', name: 'Bailecito', key: '1' },
  { id: 'laugh', name: 'Jajaja', key: '2' },
  { id: 'taunt', name: 'Burla', key: '3' },
  { id: 'cry', name: 'Llorar', key: '4' },
  { id: 'love', name: 'Amor', key: '5' },
  { id: 'angry', name: 'Furia', key: '6' },
];
export const COUNTDOWN = 1.3;   // s de cuenta atrás antes de cada saque

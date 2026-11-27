// =============================================================
//  Física de la bola: gravedad, arrastre, Magnus, rebotes
//  Módulo puro (sin Three.js) — usado por el juego, la IA y las ayudas
// =============================================================
import { TABLE_H, HALF_L, HALF_W, NET_H, R, GRAV, KD, KM, SPIN_DECAY, REST, TFRIC, STEP } from './config.js';

// Juegos de constantes: ARCADE (exagerado, el de siempre) y REALISTA (gravedad real, arrastre del
// aire de una bola de 2,7 g, Magnus moderado y bote con fricción de Coulomb que convierte efecto ↔ velocidad)
const SETS = {
  arcade: { grav: GRAV, kd: KD, km: KM, decay: SPIN_DECAY, rest: REST, tfric: TFRIC, real: false },
  real: { grav: 9.81, kd: 0.085, km: 0.0068, decay: 0.32, rest: 0.88, mu: 0.22, real: true },
};
export const PHYS = { ...SETS.arcade };
export function setPhysics(mode) { Object.assign(PHYS, SETS[mode] || SETS.arcade); }

export const EV_TABLE = 1, EV_NET = 2, EV_FLOOR = 3;
export const sideOf = z => (z > 0 ? 0 : 1);   // 0 = jugador (z+), 1 = rival (z-)

export function makeBall() {
  return { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0 };
}
export function copyBall(b) {
  return { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, wx: b.wx, wy: b.wy, wz: b.wz };
}

// Fuerzas + integración (sin colisiones)
export function integrate(b, dt) {
  const sp = Math.hypot(b.vx, b.vy, b.vz);
  const KD = PHYS.kd, KM = PHYS.km;
  const ax = -KD * sp * b.vx + KM * (b.wy * b.vz - b.wz * b.vy);
  const ay = -PHYS.grav - KD * sp * b.vy + KM * (b.wz * b.vx - b.wx * b.vz);
  const az = -KD * sp * b.vz + KM * (b.wx * b.vy - b.wy * b.vx);
  b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  const d = Math.exp(-PHYS.decay * dt);
  b.wx *= d; b.wy *= d; b.wz *= d;
}

// Un paso con colisiones. Devuelve el evento ocurrido (0 si ninguno)
export function physStep(b, dt) {
  const py = b.y, pz = b.z;
  integrate(b, dt);
  const top = TABLE_H + R;
  // Mesa
  if (b.vy < 0 && py >= top - 1e-4 && b.y < top &&
      Math.abs(b.x) < HALF_W + R * 0.5 && Math.abs(b.z) < HALF_L + R * 0.5) {
    b.y = top;
    const vin = -b.vy;
    b.vy = vin * PHYS.rest;
    // deslizamiento del punto de contacto: v + ω × (0,-R,0)
    const sx = b.vx + R * b.wz, sz = b.vz - R * b.wx;
    if (PHYS.real) {
      // fricción de Coulomb: el impulso tangencial (≤ μ·impulso normal) frena el deslizamiento y
      // a la vez cambia el giro (esfera hueca, I = 2/3·m·R²). Con 0,4 la bola sale rodando.
      const sl = Math.hypot(sx, sz) || 1e-6;
      const f = Math.min(0.4, PHYS.mu * (1 + PHYS.rest) * vin / sl);
      const dvx = -f * sx, dvz = -f * sz;
      b.vx += dvx; b.vz += dvz;
      b.wx += -1.5 * dvz / R; b.wz += 1.5 * dvx / R; b.wy *= 0.85;
    } else {
      b.vx -= PHYS.tfric * sx; b.vz -= PHYS.tfric * sz;
      b.wx *= 0.65; b.wy *= 0.8; b.wz *= 0.65;
    }
    return EV_TABLE;
  }
  // Red
  if ((pz > 0) !== (b.z > 0) && Math.abs(b.x) < HALF_W + 0.15 &&
      b.y < TABLE_H + NET_H + R && b.y > TABLE_H - R) {
    if (b.y < TABLE_H + NET_H - R * 0.3) {
      b.z = (pz > 0 ? 1 : -1) * (R + 0.001);
      b.vz *= -0.12; b.vx *= 0.5; b.vy *= 0.4;
    } else {                       // roza la cinta y pasa
      b.vz *= 0.5; b.vy = Math.abs(b.vy) * 0.4 + 0.6; b.vx *= 0.8;
    }
    return EV_NET;
  }
  // Suelo
  if (b.y < R && b.vy < 0) {
    b.y = R; b.vy = -b.vy * 0.55; b.vx *= 0.8; b.vz *= 0.8;
    b.wx *= 0.5; b.wy *= 0.5; b.wz *= 0.5;
    return EV_FLOOR;
  }
  return 0;
}

// Tiempo y punto en que la bola cruza el plano de pala z = pz (sentido `sign`)
// ok = la bola ya botó (o botará) una vez en el campo `side` antes de cruzar
export function simToPlane(b, pz, sign, side, bounced, maxT = 1.2) {
  const s = copyBall(b);
  if ((s.z - pz) * sign >= 0) return null;
  let ok = bounced;
  for (let t = 0; t < maxT; t += STEP) {
    const ev = physStep(s, STEP);
    if (ev === EV_TABLE) {
      if (sideOf(s.z) !== side || ok) return null;
      ok = true;
    } else if (ev === EV_FLOOR) return null;
    if ((s.z - pz) * sign >= 0) return { t: t + STEP, x: s.x, y: s.y, z: s.z, ok };
  }
  return null;
}

// Mejor punto de impacto para el lado `side` (tras el bote, cerca del ápice)
export function predictContact(b, side, sign, bounced) {
  const s = copyBall(b);
  const dt = 1 / 120;
  let ok = bounced, first = null;
  const zMin = PHYS.real ? HALF_L - 0.22 : HALF_L + 0.05, zMax = HALF_L + 1.4;   // en realista se puede golpear encima de la mesa
  for (let t = 0; t < 2.5; t += dt) {
    const ev = physStep(s, dt);
    if (ev === EV_TABLE) { if (sideOf(s.z) !== side || ok) break; ok = true; }
    if (ev === EV_FLOOR) break;
    if (!ok) continue;
    const az = s.z * sign;
    if (az > zMin && az < zMax && s.y > TABLE_H - 0.05 && s.y < TABLE_H + 1.0) {
      const p = { t, x: s.x, y: s.y, z: s.z };
      if (!first) first = p;
      if (s.vy <= 0) return p;
    } else if (az >= zMax) break;
  }
  return first;
}

// Primer bote previsto (para el marcador de aterrizaje)
export function predictBounce(b, maxT = 1.5) {
  const s = copyBall(b);
  const dt = 1 / 120;
  for (let t = 0; t < maxT; t += dt) {
    const ev = physStep(s, dt);
    if (ev === EV_TABLE) return { x: s.x, z: s.z, t };
    if (ev === EV_FLOOR) return null;
  }
  return null;
}

// Vuelo libre hasta tocar el plano de la mesa al otro lado
function flight(st, vx, vy, vz, w) {
  const s = { x: st.x, y: st.y, z: st.z, vx, vy, vz, wx: w.x, wy: w.y, wz: w.z };
  const ty = TABLE_H + R, dt = 1 / 240;
  let netClear = 9;
  for (let t = 0; t < 3; t += dt) {
    const pz = s.z;
    integrate(s, dt);
    if ((pz > 0) !== (s.z > 0)) netClear = s.y - (TABLE_H + NET_H + R);
    if (s.vy < 0 && s.y <= ty && (s.z > 0) !== (st.z > 0)) return { x: s.x, z: s.z, t, netClear };
    if (s.y < 0) return null;
  }
  return null;
}

// Igual que solveShot pero aterrizando en cualquier lado (saque realista: primer bote en tu campo)
export function solveTo(st, tg, T, w) {
  const ty = TABLE_H + R;
  let vx = (tg.x - st.x) / T, vz = (tg.z - st.z) / T;
  const vy = (ty - st.y + 0.5 * PHYS.grav * T * T) / T;
  for (let i = 0; i < 16; i++) {
    const s = { x: st.x, y: st.y, z: st.z, vx, vy, vz, wx: w.x, wy: w.y, wz: w.z };
    let t = 0;
    for (; t < 2; t += STEP) { integrate(s, STEP); if (s.vy < 0 && s.y <= ty) break; }
    const ex = tg.x - s.x, ez = tg.z - s.z;
    vx += ex / Math.max(0.05, t); vz += ez / Math.max(0.05, t);
    if (ex * ex + ez * ez < 1e-5) break;
  }
  return { vx, vy, vz };
}

// Resuelve la velocidad inicial para aterrizar en `tg` con el efecto `w`
// (método de disparo: simula, mide el error y corrige)
export function solveShot(st, tg, T, w) {
  const ty = TABLE_H + R;
  let vx = (tg.x - st.x) / T, vz = (tg.z - st.z) / T;
  let vy = (ty - st.y + 0.5 * PHYS.grav * T * T) / T;
  for (let k = 0; k < 6; k++) {
    for (let i = 0; i < 14; i++) {
      const r = flight(st, vx, vy, vz, w);
      if (!r) { vz *= 1.15; vx *= 1.15; continue; }
      const ex = tg.x - r.x, ez = tg.z - r.z;
      vx += ex / r.t; vz += ez / r.t;
      if (ex * ex + ez * ez < 1e-5) break;
    }
    const r = flight(st, vx, vy, vz, w);
    if (r && r.netClear > 0.03) break;
    vy += 0.35;   // arco más alto para salvar la red
  }
  return { vx, vy, vz };
}

// Simulación completa (con botes y red) desde un lanzamiento: devuelve los eventos de mesa en orden
export function simEvents(st, v, w, maxT = 2.4) {
  const s = { x: st.x, y: st.y, z: st.z, vx: v.vx, vy: v.vy, vz: v.vz, wx: w.x, wy: w.y, wz: w.z };
  const out = [];
  for (let t = 0; t < maxT; t += STEP) {
    const ev = physStep(s, STEP);
    if (ev === EV_TABLE) { out.push({ x: s.x, z: s.z, t }); if (out.length >= 2) break; }
    else if (ev === EV_NET) out.net = true;
    else if (ev === EV_FLOOR) { out.floor = true; break; }
  }
  return out;
}

// =============================================================
//  Lógica de juego: reglas, golpeo, saque, IA
//  Independiente del render — se comunica por eventos (onEvent)
// =============================================================
import * as C from './config.js';
import * as P from './physics.js';

const { TABLE_H, HALF_L, STEP } = C;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randn = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

export const G = {
  demo: true, phase: 'serve', score: [0, 0], target: 11, diff: 1, assist: true, control: 'classic',
  hand: { x: 0.4, y: 1.0, z: 1.6, vx: 0, vy: 0, tx: 0.4, ty: 1.0, roll: 0, rollTarget: 0, stretch: 0 },
  server: 0, firstServer: 0, timer: 0, rally: 0, time: 0, winner: -1,
  ball: null, chars: [], aim: { x: 0, z: -0.9 }, flick: 0,
  stats: { longest: 0, smash: [0, 0], perfect: [0, 0], aces: [0, 0] },
};

let listener = () => {};
export function onEvent(fn) { listener = fn; }
const emit = (type, data = {}) => listener(type, data);

export const paddleZ = c => c.z - c.sign * 0.25;

function makeChar(idx) {
  return {
    idx, sign: idx === 0 ? 1 : -1, hand: idx === 0 ? 1 : -1,
    x: idx === 0 ? 0.25 : -0.25, z: (idx === 0 ? 1 : -1) * (HALF_L + 0.55), vx: 0, vz: 0,
    ai: false, charging: false, charge: 0, chargeType: 'top',
    swing: 0, swingType: 'top', backhand: false, cd: 0, pending: null,
    celebrate: 0, mood: 0, keys: { x: 0, z: 0 }, pc: null, pcTimer: 0,
    aiS: { timer: 0, pc: null, hitId: -1, lead: 0, type: 'top', power: 0.5, swungId: -1, serveT: 1.2, serveX: 0 },
  };
}

// opts.online: el rival es un jugador remoto (sin IA); opts.firstServer: quién saca primero
export function newMatch(demo, opts = {}) {
  G.demo = demo;
  G.online = !!opts.online;
  G.pendingAward = null;
  G.score = [0, 0]; G.winner = -1;
  G.chars = [makeChar(0), makeChar(1)];
  G.chars[0].ai = demo; G.chars[1].ai = !G.online;
  G.chars[1].remote = G.online;
  G.firstServer = opts.firstServer ?? (Math.random() < 0.5 ? 0 : 1);
  if (opts.target) G.target = opts.target;
  G.stats = { longest: 0, smash: [0, 0], perfect: [0, 0], aces: [0, 0] };
  G.ball = Object.assign(P.makeBall(), { live: false, lastHitter: -1, count: 0, net: false, sinceHit: 0, hitId: 0, kind: 'top' });
  acc = 0;
  emit('match', {});
  startServe();
}

function targetPts() { return G.demo ? 11 : G.target; }
function serverFor() {
  const t = G.score[0] + G.score[1], tg = targetPts();
  const deuce = G.score[0] >= tg - 1 && G.score[1] >= tg - 1;
  return deuce ? (G.firstServer + t) % 2 : (G.firstServer + Math.floor(t / 2)) % 2;
}
function startServe() {
  G.server = serverFor();
  G.phase = 'serve'; G.timer = 0; G.rally = 0;
  Object.assign(G.ball, { vx: 0, vy: 0, vz: 0, wx: 0, wy: 0, wz: 0, live: true, lastHitter: -1, count: 0, net: false, sinceHit: 0, kind: 'top' });
  for (const c of G.chars) { c.pending = null; c.mood = 0; c.charging = false; c.charge = 0; c.pc = null; }
  const s = G.chars[G.server];
  s.aiS.serveT = rand(1.0, 1.7); s.aiS.serveX = rand(-0.4, 0.4);
  emit('serve', { server: G.server });
}

// ---------------- Bucle ----------------
let acc = 0;
export function update(dt) {
  G.time += dt;
  for (const c of G.chars) {
    if (c.remote) { remoteUpdate(c, dt); continue; }
    const free = c.idx === 0 && !c.ai && G.control === 'free';
    c.freeHand = free ? G.hand : null;
    if (free) updateHand(c, dt);
    if (c.ai) aiUpdate(c, dt); else playerUpdate(c, dt);
    if (c.charging) c.charge = Math.min(1, c.charge + dt / 0.6);
    if (c.swing > 0) c.swing = Math.max(0, c.swing - dt);
    if (c.cd > 0) c.cd -= dt;
    if (c.celebrate > 0) c.celebrate -= dt;
  }
  acc += dt;
  let n = 0;
  while (acc >= STEP && n < 200) { ballStep(STEP); acc -= STEP; n++; }

  if (G.phase === 'serve') {
    G.timer += dt;
    // saque automático si el jugador no hace nada en 5 s
    const s = G.chars[G.server];
    if (!s.ai && !s.remote && G.timer > 5 && !s.charging) { s.charging = true; s.charge = 0.4; s.chargeType = 'top'; releaseCharge(s); }
  }
  // Online: si el rival no confirma un punto que yo no arbitro, lo aplico igualmente tras 3 s
  if (G.pendingAward && G.time - G.pendingAward.t > 3) { const p = G.pendingAward; G.pendingAward = null; award(p.w, p.reason, { force: true }); }
  else if (G.phase === 'point') {
    G.timer -= dt;
    if (G.timer <= 0) {
      if (G.winner >= 0) {
        if (G.demo) newMatch(true);
        else { G.phase = 'over'; emit('over', { winner: G.winner }); }
      } else startServe();
    }
  }
}

const isFree = () => G.control === 'free' && G.chars[0] && !G.chars[0].ai;

function ballStep(dt) {
  const b = G.ball, pc = G.chars[0], free = isFree();
  if (G.phase === 'serve') {
    const c = G.chars[G.server];
    if (free && c === pc) {
      // Mano libre: la bola flota delante; se saca golpeándola con la pala
      const h = G.hand;
      b.x = c.x + c.hand * 0.32;
      b.y = TABLE_H + 0.3 + Math.abs(Math.sin(G.time * 3.2)) * 0.1;
      b.z = h.z;
      if (Math.hypot(b.x - h.x, b.y - h.y) < 0.14 && Math.hypot(h.vx, h.vy) > 0.6) freeHit(c, 0, true);
      return;
    }
    b.x = c.x + c.hand * 0.3;
    b.y = TABLE_H + 0.32 + Math.abs(Math.sin(G.time * 3.2)) * 0.14;
    b.z = paddleZ(c);
    return;
  }
  if (!b.live || G.phase === 'over') return;
  const px = b.x, py = b.y, pz = b.z;
  const ev = P.physStep(b, dt);
  // Mano libre: choque real bola ↔ pala al cruzar el plano de la pala
  if (free && G.phase === 'rally' && b.lastHitter === 1 && b.count === 1) {
    const h = G.hand;
    if ((pz - h.z) * pc.sign < 0 && (b.z - h.z) * pc.sign >= 0) {
      const f = (h.z - pz) / ((b.z - pz) || 1e-6);
      const cx = px + (b.x - px) * f, cy = py + (b.y - py) * f;
      const d = Math.hypot(cx - h.x, cy - h.y);
      if (d < C.FREE_HIT_R) { b.x = cx; b.y = cy; b.z = h.z; freeHit(pc, d, false); }
    }
  }
  b.sinceHit += dt;
  if (ev) onBallEvent(ev);
  for (const c of G.chars) {
    if (c.pending && (b.z - paddleZ(c)) * c.sign >= 0) {
      const p = c.pending; c.pending = null;
      if (G.phase === 'rally' && b.lastHitter === 1 - c.idx && b.count === 1) hitBall(c, p.type, p.power, p.q, p.bias, false);
    }
  }
  if (G.phase === 'rally' && (b.sinceHit > 4 || Math.abs(b.z) > 9 || Math.abs(b.x) > 9)) {
    award(b.count === 0 ? 1 - b.lastHitter : b.lastHitter, b.count === 0 ? '¡FUERA!' : '¡PUNTO!');
  }
  if (G.phase !== 'rally' && b.sinceHit > 3) b.live = false;
}

function onBallEvent(ev) {
  const b = G.ball;
  const v = Math.min(1, Math.abs(b.vy) / 4 + 0.15);
  if (ev !== P.EV_FLOOR || Math.abs(b.vy) > 0.4) emit('bounce', { type: ev, x: b.x, y: b.y, z: b.z, v });
  if (G.phase !== 'rally') return;
  if (ev === P.EV_TABLE) {
    const s = P.sideOf(b.z);
    if (s === b.lastHitter) { award(1 - b.lastHitter, b.net ? '¡RED!' : '¡BOTE PROPIO!'); return; }
    b.count++;
    if (b.count >= 2) award(b.lastHitter, '¡DOBLE BOTE!');
  } else if (ev === P.EV_NET) {
    b.net = true;
  } else if (ev === P.EV_FLOOR) {
    if (b.count === 0) award(1 - b.lastHitter, b.net ? '¡RED!' : '¡FUERA!');
    else award(b.lastHitter, '¡PUNTO!');
  }
}

// Online: arbitra el punto quien RECIBE la bola (lastHitter = rival). Si la bola es mía
// (va hacia el rival), espero su veredicto; él decide si la devolvió o falló.
function award(w, reason, opts = {}) {
  if (G.phase !== 'rally') return;
  if (G.online && !opts.force && !opts.remote && G.ball.lastHitter === 0) {
    if (!G.pendingAward) G.pendingAward = { w, reason, t: G.time };
    return;
  }
  G.pendingAward = null;
  G.phase = 'point'; G.timer = 2.2;
  if (opts.score) G.score = opts.score; else G.score[w]++;
  if (G.rally <= 1 && G.ball.lastHitter === w) { reason = '¡ACE!'; G.stats.aces[w]++; }
  G.chars[w].celebrate = 1.6; G.chars[w].mood = 1; G.chars[1 - w].mood = -1;
  for (const c of G.chars) { c.pending = null; c.charging = false; c.charge = 0; }
  const [a, b] = G.score, tg = targetPts();
  if (Math.max(a, b) >= tg && Math.abs(a - b) >= 2) G.winner = a > b ? 0 : 1;
  emit('point', { winner: w, reason, score: [...G.score], auth: !opts.remote });
}

// ---------------- Online ----------------
// Los mensajes viajan en el marco del emisor; el receptor los gira 180° en Y
// (x → -x, z → -z), lo que conserva la física y el sentido de los efectos.
export function ballSnapshot() {
  const b = G.ball;
  return { x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, wx: b.wx, wy: b.wy, wz: b.wz };
}
export function applyRemoteHit(m, lead = 0) {
  const b = G.ball, r = G.chars[1], s = m.b;
  Object.assign(b, {
    x: -s.x, y: s.y, z: -s.z, vx: -s.vx, vy: s.vy, vz: -s.vz, wx: -s.wx, wy: s.wy, wz: -s.wz,
    lastHitter: 1, count: 0, net: false, sinceHit: 0, hitId: b.hitId + 1, kind: m.kind, live: true,
  });
  G.pendingAward = null;
  G.phase = 'rally';
  G.rally = m.rally;
  G.stats.longest = Math.max(G.stats.longest, G.rally);
  if (m.meta.smash) G.stats.smash[1]++;
  if (m.meta.grade === 'perfect') G.stats.perfect[1]++;
  r.swing = C.SWING_DUR; r.swingType = m.meta.type; r.backhand = !!m.meta.bh;
  for (const o of G.chars) { o.pc = null; o.pcTimer = 0; o.pending = null; }
  emit('hit', { ...m.meta, c: 1, remote: true, x: b.x, y: b.y, z: b.z });
  // compensar la latencia: la bola ya lleva ese tiempo volando en la pantalla del rival
  for (let t = Math.min(0.15, lead); t > 0; t -= STEP) {
    const ev = P.physStep(b, STEP); b.sinceHit += STEP;
    if (ev) onBallEvent(ev);
    if (G.phase !== 'rally') break;
  }
}
export function applyRemotePoint(m) {
  const w = 1 - m.w, score = [m.score[1], m.score[0]];
  G.pendingAward = null;
  if (G.phase !== 'rally') {                       // ya lo había marcado: solo sincronizo marcador
    G.score = score;
    const tg = targetPts();
    if (Math.max(...score) >= tg && Math.abs(score[0] - score[1]) >= 2) G.winner = score[0] > score[1] ? 0 : 1;
    return;
  }
  award(w, m.reason, { remote: true, score });
}
export function setRemoteState(st) {
  const r = G.chars[1];
  if (!r || !r.remote) return;
  r.net = { x: -st.x, z: -st.z, vx: -st.vx, vz: -st.vz, t: G.time };
  r.charging = !!st.ch; r.charge = st.cg || 0; r.chargeType = st.ct || 'top';
  if (st.sw !== r.netSwing) { if (r.netSwing !== undefined && !st.hit) { r.swing = C.SWING_DUR; r.swingType = st.swt || 'top'; r.backhand = !!st.bh; } r.netSwing = st.sw; }
  r.freeHand = st.h ? { x: -st.h.x, y: st.h.y, z: -st.h.z, roll: st.h.roll, vy: st.h.vy } : null;
}
export function localState() {
  const c = G.chars[0], h = c.freeHand;
  return {
    t: 'st', x: c.x, z: c.z, vx: c.vx, vz: c.vz, ch: c.charging ? 1 : 0, cg: +c.charge.toFixed(2), ct: c.chargeType,
    sw: c.swingCount || 0, swt: c.swingType, bh: c.backhand ? 1 : 0,
    h: h ? { x: +h.x.toFixed(3), y: +h.y.toFixed(3), z: +h.z.toFixed(3), roll: +h.roll.toFixed(2), vy: +h.vy.toFixed(2) } : null,
  };
}
function remoteUpdate(c, dt) {
  const n = c.net;
  if (n) {
    const age = Math.min(0.2, G.time - n.t);
    const tx = n.x + n.vx * age, tz = n.z + n.vz * age;
    const k = Math.min(1, dt * 14);
    c.x += (tx - c.x) * k; c.z += (tz - c.z) * k;
    c.vx = n.vx; c.vz = n.vz;
  }
  if (c.swing > 0) c.swing = Math.max(0, c.swing - dt);
  if (c.celebrate > 0) c.celebrate -= dt;
}

// ---------------- Movimiento ----------------
function clampZone(c) {
  c.x = clamp(c.x, -C.ZONE_X, C.ZONE_X);
  const az = clamp(c.z * c.sign, C.ZONE_Z[0], C.ZONE_Z[1]);
  c.z = az * c.sign;
}
function steer(c, dvx, dvz, dt, accel = 14) {
  const a = accel * dt;
  c.vx += clamp(dvx - c.vx, -a, a);
  c.vz += clamp(dvz - c.vz, -a, a);
  c.x += c.vx * dt; c.z += c.vz * dt;
  const px = c.x, pz = c.z;
  clampZone(c);
  if (c.x !== px) c.vx = 0;
  if (c.z !== pz) c.vz = 0;
}
function moveTo(c, tx, tz, sp, dt) {
  steer(c, clamp((tx - c.x) * 7, -sp, sp), clamp((tz - c.z) * 7, -sp, sp), dt);
}

// Mano libre: la pala persigue al ratón con un alcance máximo desde el hombro
function updateHand(c, dt) {
  const h = G.hand;
  h.z = c.z - c.sign * 0.3;
  const sx = c.x + c.hand * 0.12, sy = 0.86;
  let dx = h.tx - sx, dy = h.ty - sy;
  const L = Math.hypot(dx, dy);
  if (L > C.FREE_REACH) { dx *= C.FREE_REACH / L; dy *= C.FREE_REACH / L; }
  const tx = sx + dx, ty = Math.max(TABLE_H - 0.3, sy + dy);
  const ox = h.x, oy = h.y;
  const k = 1 - Math.exp(-30 * dt);
  h.x += (tx - h.x) * k; h.y += (ty - h.y) * k;
  const ivx = (h.x - ox) / dt, ivy = (h.y - oy) / dt;
  const s = 1 - Math.exp(-25 * dt);
  h.vx += (ivx - h.vx) * s; h.vy += (ivy - h.vy) * s;
  h.roll += (h.rollTarget - h.roll) * Math.min(1, dt * 14);
  h.stretch = Math.min(1, L / C.FREE_REACH);
}

function playerUpdate(c, dt) {
  const k = c.keys, sp = (k.x || k.z || !G.assist) ? C.PLAYER_SPEED : C.ASSIST_SPEED;
  if (k.x || k.z || !G.assist) { steer(c, k.x * sp, k.z * sp, dt); return; }
  if (G.control === 'free') {
    // el cuerpo sigue a la pala con retraso (el brazo se estira mientras tanto)
    moveTo(c, G.hand.x - c.hand * 0.4, c.sign * (HALF_L + 0.55), C.FREE_BODY_SPEED, dt);
    return;
  }
  let tx = c.x, tz = c.sign * (HALF_L + 0.55);
  const b = G.ball;
  if (G.phase === 'rally' && b.lastHitter === 1 - c.idx) {
    c.pcTimer -= dt;
    if (c.pcTimer <= 0) { c.pcTimer = 0.05; c.pc = P.predictContact(b, c.idx, c.sign, b.count === 1); }
    if (c.pc) { tx = c.pc.x - c.hand * 0.3; tz = c.pc.z + c.sign * 0.25; }
  } else if (G.phase === 'rally') tx = c.x * 0.5;
  moveTo(c, tx, tz, sp, dt);
}

// ---------------- Golpeo ----------------
export function startCharge(c, type) {
  if (c.charging || c.swing > 0 || c.cd > 0) return;
  if (G.phase !== 'rally' && !(G.phase === 'serve' && G.server === c.idx)) return;
  c.charging = true; c.charge = 0; c.chargeType = type;
}
export function releaseCharge(c) {
  if (!c.charging) return;
  c.charging = false;
  const p = Math.max(0.15, c.charge);
  c.charge = 0;
  trySwing(c, c.chargeType, p);
}

function trySwing(c, type, power) {
  const b = G.ball;
  c.swing = C.SWING_DUR; c.swingType = type;
  c.backhand = (b.x - c.x) * c.hand < -0.1;
  c.swingCount = (c.swingCount || 0) + 1;
  emit('swing', { c: c.idx });
  if (G.phase === 'serve') { if (G.server === c.idx) doServe(c, type, power); return; }
  if (G.phase !== 'rally') return;
  if (b.lastHitter !== 1 - c.idx) { c.cd = 0.25; return; }
  const pz = paddleZ(c);
  const past = (b.z - pz) * c.sign;
  let dt, pt;
  if (past >= 0) {
    if (b.count !== 1) return whiff(c, '¡NO BOTÓ!');
    dt = -past / (Math.abs(b.vz) || 1); pt = { x: b.x, y: b.y };
  } else {
    const r = P.simToPlane(b, pz, c.sign, c.idx, b.count === 1, 1.0);
    if (!r || !r.ok) return whiff(c, r ? '¡ESPERA EL BOTE!' : '');
    dt = r.t; pt = r;
  }
  if (dt > C.WIN_T) return whiff(c, '¡MUY PRONTO!');
  if (dt < -C.WIN_T * 0.75) return whiff(c, '¡TARDE!');
  if (Math.abs(pt.x - c.x) > C.REACH || pt.y < TABLE_H - 0.2 || pt.y > TABLE_H + 1.15) return whiff(c, '¡NO LLEGAS!');
  const q = 1 - Math.abs(dt) / C.WIN_T;
  if (dt > 0) c.pending = { type, power, q, bias: 1 };
  else hitBall(c, type, power, q, -1, false);
}
function whiff(c, msg) {
  c.cd = 0.3;
  if (!c.ai && msg) emit('whiff', { c: c.idx, msg });
}

function doServe(c, type, power) {
  const b = G.ball;
  b.x = c.x + c.hand * 0.3; b.y = TABLE_H + 0.3; b.z = paddleZ(c);
  G.phase = 'rally';
  hitBall(c, type, power, 1, 0, true);
}

function hitBall(c, type, power, q, bias, serve) {
  const b = G.ball, D = C.DIFFS[G.demo ? 2 : G.diff];
  c.pending = null;
  const smash = !serve && type === 'top' && b.y > TABLE_H + C.SMASH_H;
  const start = { x: b.x, y: Math.max(b.y, TABLE_H + 0.05), z: b.z };

  let tg;
  if (c.ai) {
    const opp = G.chars[1 - c.idx];
    let x = (opp.x > 0 ? -1 : 1) * rand(0.15, 0.5);
    if (Math.random() < 0.3) x = rand(-0.5, 0.5);
    tg = { x, z: -c.sign * rand(serve ? 0.5 : 0.45, serve ? 1.15 : 1.2) };
  } else tg = { x: G.aim.x, z: G.aim.z };

  let err = serve ? 0.03 : 0.03 + (1 - q) * 0.32 + power * 0.12 + (smash ? 0.06 : 0);
  if (c.ai) err += D.err;
  tg.x += randn() * err; tg.z += randn() * err * 0.7;
  if (!serve) tg.x += (bias > 0 ? -1 : 1) * c.hand * (1 - q) * 0.2;   // pronto = cruzado, tarde = paralelo
  // La CPU solo falla con la probabilidad de su dificultad; si no, el tiro entra
  if (c.ai && !(Math.random() < (serve ? D.miss * 0.3 : D.miss))) {
    tg.x = clamp(tg.x, -C.HALF_W + 0.07, C.HALF_W - 0.07);
    tg.z = -c.sign * clamp(Math.abs(tg.z), 0.3, HALF_L - 0.07);
  }

  const rf = 1 + Math.min(0.3, G.rally * 0.02);
  let vh, top;
  if (serve) { vh = 3.8 + 2.2 * power; top = (type === 'top' ? 1 : -1) * (45 + 45 * power); }
  else if (smash) { vh = (8.5 + 3 * power) * rf; top = 30; }
  else if (type === 'top') { vh = (4.6 + 3.6 * power) * rf; top = 60 + 80 * power; }
  else { vh = (3.6 + 1.6 * power) * rf; top = -(50 + 50 * power); }
  if (!serve) vh *= 0.85 + 0.15 * q;
  const side = c.ai ? randn() * D.side : clamp(G.flick, -110, 110);
  launch(c, start, tg, vh, top, side, q, serve, smash, type, power);
}

// Mano libre: el tiro sale del swing real de la pala
//  swing ↑ = liftado · swing ↓ = cortado · swing ↔ = efecto lateral
//  giro de pala (clic izq./der.) = dirección + curva extra · centro de la pala = calidad
function freeHit(c, d, serve) {
  const b = G.ball, h = G.hand;
  c.pending = null;
  const q = serve ? 1 : clamp(1 - d / C.FREE_HIT_R, 0, 1);
  const speed = Math.hypot(h.vx, h.vy);
  const power = clamp(0.22 + speed / 5.5, 0.22, 1);
  const smash = !serve && b.y > TABLE_H + C.SMASH_H && (h.vy < -1.2 || speed > 3.2);
  // intención del jugador (siempre dentro de la mesa); el error depende de la calidad del contacto
  const tg = {
    x: clamp(b.x * 0.35 + h.roll * 0.4 + h.vx * 0.07, -C.HALF_W + 0.26, C.HALF_W - 0.26),
    z: -c.sign * clamp(0.5 + 0.6 * power, 0.45, HALF_L - 0.2),
  };
  const err = serve ? 0.03 : 0.02 + (1 - q) * 0.14 + power * 0.04 + (smash ? 0.05 : 0);
  tg.x += randn() * err; tg.z += randn() * err * 0.7;
  const rf = 1 + Math.min(0.3, G.rally * 0.02);
  const top = smash ? 30 : clamp(h.vy * 28, -110, 140);
  let vh = smash ? (9 + 3 * power) * rf : serve ? 3.8 + 2.2 * power : (3.8 + 4.4 * power) * rf;
  if (!serve) vh *= 0.85 + 0.15 * q;
  const side = clamp(-(h.vx * 16 + h.roll * 38), -110, 110);
  const type = top < -10 ? 'back' : 'top';
  c.swing = C.SWING_DUR; c.swingType = type;
  if (serve) G.phase = 'rally';
  launch(c, { x: b.x, y: Math.max(b.y, TABLE_H + 0.05), z: b.z }, tg, vh, top, side, q, serve, smash, type, power);
}

function launch(c, start, tg, vh, top, side, q, serve, smash, type, power) {
  const b = G.ball;
  const dx = tg.x - start.x, dz = tg.z - start.z, dist = Math.hypot(dx, dz) || 1;
  let T = dist / vh;
  if (!serve) T *= 1 + (1 - q) * 0.45;     // mala sincronía = bola alta y lenta
  const ux = dx / dist, uz = dz / dist;
  const w = { x: top * uz, y: side, z: -top * ux };   // liftado/cortado alrededor de (up × dir)
  const v = P.solveShot(start, tg, T, w);
  if (!serve && q < 0.25 && Math.random() < 0.5) v.vy -= (0.25 - q) * 4 * Math.random();

  Object.assign(b, {
    x: start.x, y: start.y, z: start.z, vx: v.vx, vy: v.vy, vz: v.vz, wx: w.x, wy: w.y, wz: w.z,
    lastHitter: c.idx, count: 0, net: false, sinceHit: 0, hitId: b.hitId + 1, kind: smash ? 'smash' : type, live: true,
  });
  for (const o of G.chars) { o.pc = null; o.pcTimer = 0; }
  G.rally++;
  G.stats.longest = Math.max(G.stats.longest, G.rally);
  const grade = serve ? 'serve' : q > 0.75 ? 'perfect' : q > 0.4 ? 'good' : 'weak';
  if (smash) G.stats.smash[c.idx]++;
  if (grade === 'perfect') G.stats.perfect[c.idx]++;
  emit('hit', { c: c.idx, type, smash, power, q, grade, serve, side, x: b.x, y: b.y, z: b.z });
}

// ---------------- IA ----------------
function aiUpdate(c, dt) {
  const D = C.DIFFS[G.demo ? 2 : G.diff], a = c.aiS, b = G.ball;
  let tx = 0, tz = c.sign * (HALF_L + 0.6);
  if (G.phase === 'serve') {
    if (G.server === c.idx) {
      tx = a.serveX;
      if (G.timer > a.serveT - 0.5 && !c.charging) startCharge(c, Math.random() < 0.35 ? 'back' : 'top');
      if (G.timer > a.serveT) releaseCharge(c);
    }
  } else if (G.phase === 'rally') {
    if (b.lastHitter === 1 - c.idx) {
      if (b.hitId !== a.hitId) {
        a.hitId = b.hitId; a.lead = randn() * D.timing;
        a.type = Math.random() < D.back ? 'back' : 'top';
        a.power = rand(D.pmin, D.pmax);
        a.timer = D.react * rand(0.8, 1.5); a.pc = null;
      }
      a.timer -= dt;
      if (a.timer <= 0) { a.timer = D.react; a.pc = P.predictContact(b, c.idx, c.sign, b.count === 1); }
      if (a.pc) { tx = a.pc.x - c.hand * 0.3; tz = a.pc.z + c.sign * 0.25; } else tx = c.x;
      if (a.swungId !== b.hitId && c.swing <= 0 && c.cd <= 0 && !c.pending) {
        const pz = paddleZ(c), past = (b.z - pz) * c.sign;
        if (past < 0) {
          const r = P.simToPlane(b, pz, c.sign, c.idx, b.count === 1, 0.8);
          if (r && r.ok) {
            if (r.t < 0.5 && !c.charging) startCharge(c, a.type);
            if (a.lead >= 0 && r.t <= a.lead) aiSwing(c);
          }
        } else if (b.count === 1 && past / (Math.abs(b.vz) || 1) >= -a.lead) aiSwing(c);
      }
    } else tx = c.x * 0.6;
  }
  moveTo(c, tx, tz, D.speed, dt);
}
function aiSwing(c) {
  c.aiS.swungId = G.ball.hitId;
  c.charging = true; c.charge = c.aiS.power; c.chargeType = c.aiS.type;
  releaseCharge(c);
}

// =============================================================
//  ESCENARIOS — 10 sedes elegibles antes de cada partido
//  Cada escenario define cielo, niebla, luces, suelo, pista, gradas
//  y una función build() que monta su decorado (y lo anima).
//  La mesa, la pista, las gradas con afición y las vallas son comunes
//  (arena.js); aquí solo vive lo que cambia de un sitio a otro.
// =============================================================
import * as THREE from 'three';
import { toon, box, sphere, cyl, outlineMat, GRAD } from './models.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const WHITE = () => toon(0xffffff);

// ---------- utilidades ----------
function M(geom, mat, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
const ownToon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...extra });
const glow = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, fog: true, ...extra });
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function skyTexture([top, mid, low]) {
  return canvasTex(4, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, low);
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  });
}
// muchas piezas iguales en una sola llamada de dibujo (con contorno opcional)
const _o = new THREE.Object3D(), _c = new THREE.Color();
function inst(geom, mat, items, parent, { outline = 0, shadow = false } = {}) {
  const m = new THREE.InstancedMesh(geom, mat, items.length);
  const o = outline ? new THREE.InstancedMesh(geom, outlineMat, items.length) : null;
  items.forEach((it, i) => {
    _o.position.set(it.x, it.y, it.z); _o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
    const sx = it.sx ?? it.s ?? 1, sy = it.sy ?? it.s ?? 1, sz = it.sz ?? it.s ?? 1;
    _o.scale.set(sx, sy, sz); _o.updateMatrix(); m.setMatrixAt(i, _o.matrix);
    if (it.c !== undefined) m.setColorAt(i, _c.set(it.c));
    if (o) { _o.scale.set(sx + outline * 2, sy + outline * 2, sz + outline * 2); _o.updateMatrix(); o.setMatrixAt(i, _o.matrix); }
  });
  m.receiveShadow = true; m.castShadow = shadow;
  parent.add(m); if (o) parent.add(o);
  return m;
}
const UNIT_BOX = () => new THREE.BoxGeometry(1, 1, 1);
// posición en anillo alrededor de la pista
const ring = (a, d, y = 0) => new THREE.Vector3(Math.sin(a) * d, y, Math.cos(a) * d);

function cloud(parent, x, y, z, s = 1, col = 0xffffff) {
  const cl = new THREE.Group();
  const n = 4 + Math.floor(Math.random() * 3);
  for (let j = 0; j < n; j++) {
    const b = sphere(0.9 + Math.random() * 0.7, col, 0.06, false);
    b.position.set(j * 1.0 - n * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.8); cl.add(b);
  }
  cl.position.set(x, y, z); cl.scale.setScalar(s); cl.lookAt(0, y, 0); parent.add(cl);
  return cl;
}
function palm(parent, x, z, h = 4, lean = 0.6, ry = 0) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry;
  const n = 6, bend = t => t * t * lean * h * 0.45;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const seg = cyl(0.17 - 0.06 * t, 0.2 - 0.06 * t, h / n + 0.06, i % 2 ? 0xb5814b : 0x9c6b3a, 0.02, false);
    seg.position.set(bend(t), t * h, 0); seg.rotation.z = -lean * 0.5 * t; p.add(seg);
  }
  const top = new THREE.Group(); top.position.set(bend(1), h, 0); p.add(top);
  for (let i = 0; i < 7; i++) {
    const lg = new THREE.Group(); lg.rotation.y = (i / 7) * TAU + 0.3; top.add(lg);
    const leaf = sphere(1, i % 2 ? 0x3fbf5a : 0x2fa84a, 0, false);
    leaf.scale.set(1.35, 0.08, 0.34); leaf.position.set(1.05, -0.28, 0); leaf.rotation.z = -0.42; lg.add(leaf);
  }
  for (let i = 0; i < 3; i++) { const c = sphere(0.13, 0x6b4423, 0.015, false); c.position.set(Math.cos(i * 2.1) * 0.18, -0.15, Math.sin(i * 2.1) * 0.18); top.add(c); }
  parent.add(p);
  return p;
}
function pine(parent, x, z, s = 1, snow = false) {
  const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s);
  const tr = cyl(0.12, 0.16, 0.7, 0x7a4f2e, 0.02, false); tr.position.y = 0.35; t.add(tr);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.0 - i * 0.24, 1.2, 9), toon(0x2f8f5b)); c.position.y = 1.0 + i * 0.62; t.add(c);
    if (snow) { const s2 = new THREE.Mesh(new THREE.ConeGeometry(0.62 - i * 0.16, 0.5, 9), toon(0xffffff)); s2.position.y = 1.38 + i * 0.62; t.add(s2); }
  }
  parent.add(t);
  return t;
}
// frijolito decorativo sencillo (diablillos, astronautas, DJ…)
function miniBean(color, s = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.26, 6, 14), toon(color)); body.position.y = 0.35; body.castShadow = true; g.add(body);
  const out = new THREE.Mesh(new THREE.CapsuleGeometry(0.235, 0.26, 6, 14), outlineMat); out.position.y = 0.35; g.add(out);
  for (const ex of [-0.08, 0.08]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), toon(0xffffff)); e.position.set(ex, 0.5, 0.19); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), toon(0x24120f)); p.position.set(ex, 0.5, 0.235); g.add(p);
  }
  g.scale.setScalar(s);
  return g;
}

// =============================================================
//  1 · PARQUE
// =============================================================
function buildPark(g) {
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU + rnd(-0.07, 0.07), d = rnd(12, 18);
    const tr = new THREE.Group();
    const trunk = cyl(0.14, 0.2, 1.2, 0x9c6b43, 0.03, false); trunk.position.y = 0.6; tr.add(trunk);
    const greens = [0x5fd36e, 0x4cc38a, 0x86e07a];
    const c1 = sphere(0.9, greens[i % 3], 0.05, false); c1.position.y = 1.75; tr.add(c1);
    const c2 = sphere(0.6, greens[(i + 1) % 3], 0.05, false); c2.position.set(0.5, 2.2, 0.1); tr.add(c2);
    tr.scale.setScalar(rnd(0.8, 1.4)); tr.position.copy(ring(a, d)); g.add(tr);
  }
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU;
    clouds.push({ cl: cloud(g, Math.sin(a) * 30, rnd(9, 14), Math.cos(a) * 30), a, speed: rnd(0.1, 0.25) });
  }
  for (const sx of [-1, 1]) {
    const post = cyl(0.07, 0.07, 2.4, 0x24120f, 0.015); post.position.set(sx * 3.3, 1.2, -5.6); g.add(post);
    const lamp = sphere(0.18, 0xfff3b0, 0.02, false); lamp.position.set(sx * 3.3, 2.5, -5.6); g.add(lamp);
  }
  const cols = [0xffc93c, 0xff5a6e, 0x3ee0b0, 0x3b9bff, 0xffffff, 0x8b6cff];
  const pg = new THREE.ConeGeometry(0.09, 0.22, 3);
  for (let i = 0; i < 22; i++) {
    const p = M(pg, toon(cols[i % cols.length]), -3.1 + i * (6.2 / 21), 2.63 - Math.sin((i / 21) * Math.PI) * 0.45, -3.4, g);
    p.rotation.x = Math.PI;
  }
  return (t, dt) => {
    for (const c of clouds) { c.a += c.speed * dt * 0.02; c.cl.position.x = Math.sin(c.a) * 30; c.cl.position.z = Math.cos(c.a) * 30; }
  };
}

// =============================================================
//  2 · FAVELA (Río): morros llenos de casitas de colores, cometas
// =============================================================
function buildFavela(g) {
  const COLS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#f78c6b', '#c77dff', '#f4f1de', '#90be6d', '#ff9f1c', '#e07a5f', '#8ecae6', '#ffafcc'];
  const houses = [], wins = [], roofs = [], tanks = [], doors = [];
  for (let k = 0; k < 8; k++) {
    const d = 13 + k * 2.7, base = k * 1.55 + Math.max(0, k - 4) * 0.6;
    const n = Math.floor((TAU * d) / 2.35);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + k * 0.37 + rnd(-0.02, 0.02);
      const w = rnd(1.7, 2.4), dep = rnd(1.8, 2.4), hh = base + rnd(1.2, 2.6);
      const p = ring(a, d + rnd(-0.3, 0.3));
      houses.push({ x: p.x, y: hh / 2, z: p.z, sx: w, sy: hh, sz: dep, ry: a, c: pick(COLS) });
      // ventanas y puerta en la fachada que mira a la pista
      const fx = -Math.sin(a), fz = -Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
      const fy = hh - 0.75;
      for (const off of w > 2 ? [-0.45, 0.45] : [0]) wins.push({ x: p.x + fx * (dep / 2 + 0.01) + rx * off, y: fy, z: p.z + fz * (dep / 2 + 0.01) + rz * off, sx: 0.42, sy: 0.5, sz: 0.04, ry: a, c: pick(['#2a1512', '#2a1512', '#ffe08a']) });
      if (hh > 3.2) wins.push({ x: p.x + fx * (dep / 2 + 0.01), y: fy - 1.2, z: p.z + fz * (dep / 2 + 0.01), sx: 0.4, sy: 0.48, sz: 0.04, ry: a, c: '#2a1512' });
      if (k === 0) doors.push({ x: p.x + fx * (dep / 2 + 0.01) + rx * 0.5, y: 0.5, z: p.z + fz * (dep / 2 + 0.01) + rz * 0.5, sx: 0.5, sy: 1.0, sz: 0.04, ry: a, c: pick(['#6b4423', '#3b9bff', '#2a9d8f']) });
      roofs.push({ x: p.x, y: hh + 0.06, z: p.z, sx: w + 0.2, sy: 0.12, sz: dep + 0.2, ry: a, c: '#b9b2a8' });
      if (Math.random() < 0.3) tanks.push({ x: p.x + rx * 0.4, y: hh + 0.42, z: p.z + rz * 0.4, s: 1, c: '#3b6fd8' });
    }
  }
  const B = UNIT_BOX();
  inst(B, WHITE(), houses, g, { outline: 0.03 });
  inst(B, WHITE(), wins, g);
  inst(B, WHITE(), doors, g);
  inst(B, WHITE(), roofs, g);
  inst(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 12), WHITE(), tanks, g, { outline: 0.02 });
  // montañas verdes al fondo y el gran peñón
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU, d = 62;
    const m = M(new THREE.SphereGeometry(1, 20, 12, 0, TAU, 0, Math.PI / 2), toon(i % 2 ? 0x3f9b5a : 0x4fb26a), Math.sin(a) * d, 0, Math.cos(a) * d, g);
    m.scale.set(rnd(14, 20), rnd(16, 26), rnd(10, 16));
  }
  const rock = M(new THREE.SphereGeometry(1, 20, 14), toon(0x6f8f6a), -28, 0, -70, g); rock.scale.set(9, 28, 9);
  // cuerdas con banderines entre las primeras casas (fiesta de barrio)
  const flagCols = [0xffc93c, 0x06d6a0, 0x3b9bff, 0xff6b6b];
  const fg = new THREE.ConeGeometry(0.12, 0.28, 3);
  for (let r = 0; r < 3; r++) {
    const z = -8.5 - r * 1.6, y0 = 3.4 + r * 0.6;
    for (let i = 0; i < 26; i++) {
      const x = -9 + i * 0.72;
      const f = M(fg, toon(flagCols[i % 4]), x, y0 - Math.sin((i / 25) * Math.PI) * 0.7, z, g); f.rotation.x = Math.PI;
    }
  }
  // cometas (pipas) volando sobre el barrio
  const kites = [];
  const kg = new THREE.PlaneGeometry(0.9, 0.9);
  for (let i = 0; i < 9; i++) {
    const a = rnd(-2.4, 2.4) + Math.PI, d = rnd(16, 26);
    const anchor = ring(a, d, 2 + (d - 13) * 0.55);
    const kite = M(kg, ownToon(pick([0xff3d6e, 0xffd166, 0x06d6a0, 0x8b6cff, 0xff8a3d]), { side: THREE.DoubleSide }), 0, 0, 0, g);
    kite.rotation.z = Math.PI / 4;
    const tail = M(new THREE.BoxGeometry(0.04, 0.9, 0.01), toon(0xffffff), 0, -0.9, 0); kite.add(tail);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x2a1512, transparent: true, opacity: 0.5 })); g.add(line);
    kites.push({ kite, line, anchor, ph: rnd(0, TAU), h: rnd(9, 15), a, d: d - rnd(2, 5) });
  }
  for (const [x, z] of [[-8.5, -7.5], [8.5, -7.5], [-9.5, 6], [9.5, 6]]) palm(g, x, z, rnd(3.6, 4.6), rnd(0.3, 0.8), rnd(0, TAU));
  const sun = M(new THREE.SphereGeometry(6, 24, 16), glow(0xffd08a, { fog: false }), 40, 16, -110, g);
  sun.renderOrder = -1;
  return (t) => {
    for (const k of kites) {
      const sway = Math.sin(t * 0.7 + k.ph);
      k.kite.position.set(Math.sin(k.a + sway * 0.06) * k.d, k.h + Math.sin(t * 1.3 + k.ph) * 0.8, Math.cos(k.a + sway * 0.06) * k.d);
      k.kite.lookAt(0, k.kite.position.y, 0); k.kite.rotateZ(Math.PI / 4 + sway * 0.25);
      const pos = k.line.geometry.attributes.position;
      pos.setXYZ(0, k.anchor.x, k.anchor.y, k.anchor.z); pos.setXYZ(1, k.kite.position.x, k.kite.position.y - 0.4, k.kite.position.z); pos.needsUpdate = true;
    }
  };
}

// =============================================================
//  3 · PLAYA: mar, palmeras, sombrillas, gaviotas y un cangrejo
// =============================================================
function buildBeach(g) {
  const sea = M(new THREE.PlaneGeometry(400, 200), toon(0x1fa5e0), 0, 0.02, -112, g); sea.rotation.x = -Math.PI / 2; sea.receiveShadow = true;
  const shallow = M(new THREE.PlaneGeometry(400, 6), toon(0x6fd6f0), 0, 0.025, -14.5, g); shallow.rotation.x = -Math.PI / 2;
  const foams = [];
  for (let i = 0; i < 3; i++) {
    const f = M(new THREE.BoxGeometry(400, 0.04, 0.35), toon(0xffffff), 0, 0.04, -12 - i * 1.6, g);
    foams.push({ f, z: -12 - i * 1.6, ph: i * 1.7 });
  }
  // brillos sobre el agua
  const glints = [];
  for (let i = 0; i < 40; i++) glints.push({ x: rnd(-60, 60), y: 0.05, z: rnd(-20, -70), sx: rnd(0.6, 1.6), sy: 0.02, sz: 0.12, c: '#ffffff' });
  inst(UNIT_BOX(), WHITE(), glints, g);
  for (const [x, z, h, l] of [[-9, -8, 4.6, 0.7], [-12, -3, 4, 0.5], [9.5, -8.5, 5, 0.8], [12, -2, 4.2, 0.4], [-10, 8, 4.4, 0.6], [11, 9, 4.8, 0.7], [-16, -9, 5.2, 0.9], [16, -10, 4.5, 0.6]]) palm(g, x, z, h, l, Math.atan2(-x, -z) + Math.PI / 2 + rnd(-0.4, 0.4));
  // sombrillas y toallas
  const stripes = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff5a6e'; c.fillRect(i * w / 8, 0, w / 8, h); } });
  const stripes2 = canvasTex(256, 32, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffd166' : '#3b9bff'; c.fillRect(i * w / 8, 0, w / 8, h); } });
  const umbMats = [ownToon(0xffffff, { map: stripes }), ownToon(0xffffff, { map: stripes2 })];
  [[-9, 2], [-11, -6.5], [9.5, 3], [10.5, -5.5], [-8.5, 10], [8, 11]].forEach(([x, z], i) => {
    const u = new THREE.Group(); u.position.set(x, 0, z); u.rotation.z = rnd(-0.12, 0.12);
    const pole = cyl(0.04, 0.04, 2.2, 0xffffff, 0.015); pole.position.y = 1.1; u.add(pole);
    const top = M(new THREE.ConeGeometry(1.3, 0.55, 8, 1, true), umbMats[i % 2], 0, 2.2, 0, u); top.castShadow = true;
    top.material.side = THREE.DoubleSide;
    g.add(u);
    const towel = box(0.9, 0.03, 1.8, pick([0xff8fab, 0x7bdff2, 0xffd166, 0xb8f2a0]), 0.01, false); towel.position.set(x + 1.2, 0.02, z + 0.3); towel.rotation.y = rnd(-0.4, 0.4); g.add(towel);
  });
  // torre de socorrista
  const tw = new THREE.Group(); tw.position.set(-14, 0, -11); tw.rotation.y = 0.5;
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const l = cyl(0.06, 0.06, 2.2, 0xffffff, 0.015); l.position.set(x, 1.1, z); tw.add(l); }
  const hut = box(1.6, 1.1, 1.6, 0xff5a3d, 0.03); hut.position.y = 2.75; tw.add(hut);
  const hroof = box(1.9, 0.12, 1.9, 0xffffff, 0.02); hroof.position.y = 3.36; tw.add(hroof);
  const fl = M(new THREE.PlaneGeometry(0.7, 0.45), ownToon(0xff3d3d, { side: THREE.DoubleSide }), 0.35, 4.2, 0, tw);
  const fp = cyl(0.03, 0.03, 1.2, 0xffffff, 0.01); fp.position.y = 3.95; tw.add(fp);
  g.add(tw);
  // balones de playa
  const bTex = canvasTex(256, 128, (c, w, h) => { const cs = ['#ff5a6e', '#ffffff', '#3b9bff', '#ffd166', '#ffffff', '#06d6a0']; cs.forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 6, 0, w / 6, h); }); });
  const balls = [];
  for (const [x, z, ph] of [[-8, 6, 0], [9, -1, 2], [-12, 1, 4]]) {
    const b = M(new THREE.SphereGeometry(0.32, 20, 14), ownToon(0xffffff, { map: bTex }), x, 0.32, z, g); b.castShadow = true;
    balls.push({ b, ph, y: 0.32 });
  }
  // barcos de vela en el horizonte
  const boats = [];
  for (let i = 0; i < 3; i++) {
    const bt = new THREE.Group();
    const hull = box(2.2, 0.5, 0.7, 0xffffff, 0.03, false); bt.add(hull);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 2.2); sh.lineTo(1.3, 0); sh.lineTo(0, 0);
    const sail = M(new THREE.ShapeGeometry(sh), ownToon(i === 1 ? 0xff5a6e : 0xffffff, { side: THREE.DoubleSide }), -0.1, 0.3, 0, bt);
    bt.position.set(rnd(-60, 60), 0.2, -45 - i * 18); bt.scale.setScalar(1.4 + i * 0.4); g.add(bt);
    boats.push({ bt, v: rnd(0.6, 1.3) * (i % 2 ? 1 : -1) });
  }
  // gaviotas
  const gulls = [];
  for (let i = 0; i < 7; i++) {
    const gl = new THREE.Group();
    const wl = M(new THREE.BoxGeometry(0.5, 0.03, 0.14), toon(0xffffff), -0.24, 0, 0, gl);
    const wr = M(new THREE.BoxGeometry(0.5, 0.03, 0.14), toon(0xffffff), 0.24, 0, 0, gl);
    M(new THREE.SphereGeometry(0.08, 8, 6), toon(0xffffff), 0, 0, 0, gl);
    g.add(gl); gulls.push({ gl, wl, wr, r: rnd(10, 22), h: rnd(6, 11), a: rnd(0, TAU), v: rnd(0.15, 0.3) * (Math.random() < 0.5 ? 1 : -1) });
  }
  // cangrejo que pasea junto a la pista
  const crab = new THREE.Group();
  const cb = M(new THREE.SphereGeometry(0.22, 16, 10), toon(0xff4d3d), 0, 0.14, 0, crab); cb.scale.set(1.3, 0.6, 1); cb.castShadow = true;
  for (const s of [-1, 1]) {
    const claw = M(new THREE.SphereGeometry(0.09, 10, 8), toon(0xff4d3d), s * 0.36, 0.18, 0.12, crab);
    for (const ex of [-0.07, 0.07]) { const st = M(new THREE.SphereGeometry(0.04, 8, 6), toon(0xffffff), ex, 0.3, 0.12, crab); M(new THREE.SphereGeometry(0.02, 6, 4), toon(0x24120f), 0, 0, 0.03, st); }
    claw.userData.s = s;
  }
  crab.position.set(0, 0, 7.2); g.add(crab);
  const sun = M(new THREE.SphereGeometry(7, 24, 16), glow(0xfff1a8, { fog: false }), 30, 34, -120, g);
  for (let i = 0; i < 6; i++) cloud(g, rnd(-70, 70), rnd(14, 22), rnd(-60, -90), rnd(1.4, 2.2));
  return (t, dt) => {
    for (const f of foams) f.f.position.z = f.z + Math.sin(t * 0.8 + f.ph) * 0.7;
    for (const b of balls) { const k = Math.abs(Math.sin(t * 2.2 + b.ph)); b.b.position.y = b.y + k * 1.2; b.b.rotation.x += dt * 2; }
    for (const b of boats) { b.bt.position.x += b.v * dt; if (Math.abs(b.bt.position.x) > 80) b.bt.position.x *= -0.98; b.bt.rotation.z = Math.sin(t + b.v) * 0.05; }
    for (const s of gulls) {
      s.a += s.v * dt; s.gl.position.set(Math.sin(s.a) * s.r, s.h + Math.sin(t + s.r) * 0.5, Math.cos(s.a) * s.r - 6);
      s.gl.rotation.y = s.a + (s.v > 0 ? 0 : Math.PI); const f = Math.sin(t * 9 + s.r) * 0.5; s.wl.rotation.z = f; s.wr.rotation.z = -f;
    }
    crab.position.x = Math.sin(t * 0.35) * 8; crab.position.y = Math.abs(Math.sin(t * 12)) * 0.03;
  };
}

// =============================================================
//  4 · ESTADIO "PONGLÍMPICO": graderío gigante, la ola, pebetero
// =============================================================
function buildOlympic(g, ctx) {
  const track = M(new THREE.RingGeometry(8.6, 12.4, 72), toon(0xd9533b), 0, 0.004, 0, g); track.rotation.x = -Math.PI / 2; track.receiveShadow = true;
  for (let i = 0; i <= 5; i++) { const r = 8.6 + i * 0.76; const l = M(new THREE.RingGeometry(r - 0.025, r + 0.025, 96), toon(0xffffff), 0, 0.006, 0, g); l.rotation.x = -Math.PI / 2; }
  // graderío (torno escalonado)
  const pts = [new THREE.Vector2(14, 0)];
  for (let k = 0; k < 12; k++) { const r = 14 + k * 1.6, y = 1.2 + k * 1.15; pts.push(new THREE.Vector2(r, y)); pts.push(new THREE.Vector2(r + 1.6, y)); }
  pts.push(new THREE.Vector2(34, 15)); pts.push(new THREE.Vector2(34, 0));
  const bowl = M(new THREE.LatheGeometry(pts.reverse(), 96), ownToon(0xdfe6f2, { side: THREE.DoubleSide }), 0, 0, 0, g); bowl.receiveShadow = true;
  const rim = M(new THREE.TorusGeometry(34, 0.5, 8, 96), toon(0xffffff), 0, 15.2, 0, g); rim.rotation.x = Math.PI / 2;
  // público en el graderío (con "la ola")
  const crowd = [];
  const CC = ['#ff5a6e', '#ffd166', '#06d6a0', '#3b9bff', '#ffffff', '#c77dff', '#ff9f1c', '#f4a3c0', '#8ecae6'];
  for (let k = 0; k < 12; k++) {
    const r = 14.8 + k * 1.6, y = 1.2 + k * 1.15 + 0.35, n = Math.floor((TAU * r) / 0.75);
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd(-0.01, 0.01); crowd.push({ a, r, y, x: Math.sin(a) * r, z: Math.cos(a) * r, c: pick(CC), s: rnd(0.3, 0.38) }); }
  }
  const crowdM = inst(new THREE.SphereGeometry(1, 8, 6), WHITE(), crowd, g);
  // torres de focos
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, p = ring(a, 33);
    const tw = cyl(0.35, 0.5, 26, 0x9aa3b8, 0, false); tw.position.set(p.x, 13, p.z); g.add(tw);
    const panel = M(new THREE.BoxGeometry(5, 3, 0.4), glow(0xfff6d8), p.x * 0.97, 26.5, p.z * 0.97, g); panel.lookAt(0, 4, 0);
  }
  // pebetero con llama
  const torch = new THREE.Group(); torch.position.set(0, 15.2, -34);
  const ped = cyl(0.8, 1.4, 3, 0xe9c46a, 0.04, false); ped.position.y = 1.5; torch.add(ped);
  const cup = M(new THREE.CylinderGeometry(2.2, 0.9, 1.4, 20), toon(0xe9c46a), 0, 3.6, 0, torch);
  const flames = [];
  [[0xff4d1f, 2.0, 4.6], [0xff9f1c, 1.4, 3.6], [0xffe066, 0.8, 2.4]].forEach(([c, r, h], i) => {
    const f = M(new THREE.ConeGeometry(r, h, 12), glow(c), 0, 4.3 + h / 2, 0, torch); flames.push({ f, h, i });
  });
  g.add(torch);
  // banderas en el borde
  const flags = [];
  const fgeo = new THREE.PlaneGeometry(1.6, 1, 6, 1);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + 0.13; if (Math.abs(((a + Math.PI) % TAU) - Math.PI) > 2.9) continue;
    const p = ring(a, 34.3);
    const pole = cyl(0.06, 0.06, 4, 0xffffff, 0, false); pole.position.set(p.x, 17, p.z); g.add(pole);
    const fl = M(fgeo, ownToon(pick([0xff3d6e, 0x3b9bff, 0xffd166, 0x06d6a0, 0xffffff, 0xff8a3d]), { side: THREE.DoubleSide }), p.x, 18.4, p.z, g);
    fl.rotation.y = a; flags.push({ fl, ph: i });
  }
  // videomarcador
  const scrTex = canvasTex(1024, 384, (c, w, h) => {
    c.fillStyle = '#10142e'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = 0; y < h; y += 6) c.fillRect(0, y, w, 2);
    c.font = 'italic 900 120px Archivo, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ffd166'; c.fillText('JUEGOS', w / 2, h * 0.32); c.fillStyle = '#ffffff'; c.fillText('PONGLÍMPICOS', w / 2, h * 0.7);
  });
  const scr = M(new THREE.BoxGeometry(14, 5.2, 0.5), [toon(0x2a1512), toon(0x2a1512), toon(0x2a1512), toon(0x2a1512), glow(0xffffff, { map: scrTex }), toon(0x2a1512)], 22, 19, -26, g);
  scr.lookAt(0, 19, 0);
  // podio
  const pod = new THREE.Group(); pod.position.set(-9.5, 0, 6.8); pod.rotation.y = 0.9;
  [[0, 1.0, 0xffd166], [-1.1, 0.7, 0xdfe6f2], [1.1, 0.5, 0xe0a46b]].forEach(([x, h, c]) => { const b = box(1.1, h, 1.0, c, 0.03); b.position.set(x, h / 2, 0); pod.add(b); });
  g.add(pod);
  let waveBoost = 0;
  ctx.hype = s => { waveBoost = Math.max(waveBoost, 2.5 * s); };
  return (t, dt) => {
    waveBoost = Math.max(0, waveBoost - dt);
    const wa = t * 0.9;
    for (let i = 0; i < crowd.length; i++) {
      const c = crowd[i];
      let d = ((c.a - wa) % TAU + TAU) % TAU; d = Math.min(d, TAU - d);
      const up = Math.max(0, 1 - d * 2.2) * 0.9 + (waveBoost > 0 ? Math.abs(Math.sin(t * 8 + i)) * 0.35 : 0);
      _o.position.set(c.x, c.y + up, c.z); _o.rotation.set(0, 0, 0); _o.scale.set(c.s, c.s * (1 + up * 0.4), c.s); _o.updateMatrix();
      crowdM.setMatrixAt(i, _o.matrix);
    }
    crowdM.instanceMatrix.needsUpdate = true;
    for (const f of flames) { const k = 1 + Math.sin(t * (9 + f.i * 3) + f.i) * 0.12; f.f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k)); f.f.rotation.y = t * (1 + f.i); }
    for (const f of flags) { f.fl.rotation.x = Math.sin(t * 3 + f.ph) * 0.15; }
  };
}

// =============================================================
//  5 · INFIERNO: lava, pinchos de roca, llamaradas, diablillos
// =============================================================
function lavaTexture() {
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#ff4a12'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 8 + Math.random() * 30;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      const col = Math.random() < 0.5 ? '255,214,80' : '180,20,10';
      gr.addColorStop(0, `rgba(${col},0.9)`); gr.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = gr;
      for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { c.save(); c.translate(dx, dy); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore(); }
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function buildHell(g, ctx) {
  const lt = lavaTexture(); lt.repeat.set(8, 1);
  const lavaMat = glow(0xffffff, { map: lt });
  const river = M(new THREE.RingGeometry(12.5, 16.5, 72, 1), lavaMat, 0, 0.01, 0, g); river.rotation.x = -Math.PI / 2;
  const lt2 = lavaTexture(); lt2.repeat.set(3, 3);
  const pools = [];
  for (const [x, z, r] of [[-9, -9, 2.2], [10, -8, 1.6], [-10, 8, 1.5], [9, 9, 2]]) {
    const p = M(new THREE.CircleGeometry(r, 28), glow(0xffffff, { map: lt2 }), x, 0.012, z, g); p.rotation.x = -Math.PI / 2; pools.push(p);
    const lip = M(new THREE.TorusGeometry(r, 0.18, 6, 28), toon(0x2a1818), x, 0.02, z, g); lip.rotation.x = -Math.PI / 2;
  }
  // pinchos de roca y volcanes
  const spikes = [];
  for (let i = 0; i < 70; i++) {
    const a = rnd(0, TAU), d = rnd(18, 42), h = rnd(3, 14) * (d / 30);
    const p = ring(a, d);
    spikes.push({ x: p.x, y: h / 2, z: p.z, sx: rnd(1, 2.4), sy: h, sz: rnd(1, 2.4), rx: rnd(-0.2, 0.2), rz: rnd(-0.2, 0.2), c: pick(['#2b1a1a', '#3d2222', '#4a2a24']) });
  }
  inst(new THREE.ConeGeometry(0.5, 1, 6), WHITE(), spikes, g, { outline: 0.02 });
  for (const [x, z, s] of [[-40, -60, 1], [35, -70, 1.3], [70, -20, 0.9]]) {
    const v = M(new THREE.CylinderGeometry(4 * s, 22 * s, 24 * s, 16, 1, true), toon(0x2b1414), x, 12 * s, z, g);
    const top = M(new THREE.CircleGeometry(4 * s, 16), glow(0xff7a1f), x, 24 * s - 0.2, z, g); top.rotation.x = -Math.PI / 2;
  }
  // monte calavera con ojos que brillan
  const sk = new THREE.Group(); sk.position.set(0, 0, -40);
  const head = M(new THREE.SphereGeometry(10, 24, 18), toon(0x3a2424), 0, 9, 0, sk); head.scale.set(1.2, 1, 0.8);
  const eyes = [];
  for (const ex of [-4, 4]) { const e = M(new THREE.SphereGeometry(2, 16, 12), glow(0xffd23f), ex, 11, 7.4, sk); eyes.push(e); }
  for (let i = -3; i <= 3; i++) M(new THREE.BoxGeometry(1.4, 2.2, 1), toon(0xe8dcc8), i * 1.6, 3.4, 7.6, sk);
  g.add(sk);
  // llamaradas alrededor
  const jets = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8, p = ring(a, 9.6);
    const grp = new THREE.Group(); grp.position.copy(p); g.add(grp);
    const base = cyl(0.45, 0.6, 0.5, 0x2a1818, 0.03, false); base.position.y = 0.25; grp.add(base);
    const f1 = M(new THREE.ConeGeometry(0.45, 1.8, 10), glow(0xff5a1f), 0, 1.3, 0, grp);
    const f2 = M(new THREE.ConeGeometry(0.25, 1.1, 10), glow(0xffd23f), 0, 1.0, 0, grp);
    jets.push({ grp, f1, f2, ph: i * 0.8, burst: 0 });
  }
  // brasas que suben
  const N = 500, pos = new Float32Array(N * 3), sp = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = rnd(-30, 30); pos[i * 3 + 1] = rnd(0, 18); pos[i * 3 + 2] = rnd(-30, 20); sp[i] = rnd(0.6, 2); }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffa040, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
  g.add(embers);
  // diablillos saltando en las rocas
  const imps = [];
  for (const [x, z] of [[-8.5, -6], [8.5, -6.5], [-9, 4], [9.2, 3.5], [0, -8.5]]) {
    const b = miniBean(0xe0302a, 1.1);
    for (const s of [-1, 1]) { const h = M(new THREE.ConeGeometry(0.05, 0.16, 8), toon(0xfff1e0), s * 0.12, 0.64, 0.02, b); h.rotation.z = -s * 0.4; }
    const fork = new THREE.Group(); fork.position.set(0.3, 0.35, 0.05); b.add(fork);
    M(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), toon(0x2a1512), 0, 0, 0, fork);
    for (const fx of [-0.06, 0, 0.06]) M(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), toon(0x2a1512), fx, 0.45, 0, fork);
    M(new THREE.BoxGeometry(0.15, 0.02, 0.02), toon(0x2a1512), 0, 0.38, 0, fork);
    const tail = M(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), toon(0xe0302a), 0, 0.2, -0.24, b); tail.rotation.x = 0.9;
    const rock = M(new THREE.DodecahedronGeometry(0.55), toon(0x3d2222), x, 0.3, z, g);
    b.position.set(x, 0.75, z); b.lookAt(0, 0.75, 0); g.add(b);
    imps.push({ b, ph: rnd(0, TAU), y: 0.75 });
  }
  let burst = 0;
  ctx.hype = s => { burst = Math.max(burst, 1.2 * s + 0.3); };
  return (t, dt) => {
    lt.offset.x = t * 0.02; lt.offset.y = t * 0.03; lt2.offset.x = -t * 0.015; lt2.offset.y = t * 0.02;
    burst = Math.max(0, burst - dt);
    for (const j of jets) {
      const k = 1 + Math.sin(t * 13 + j.ph) * 0.15 + Math.sin(t * 7.3 + j.ph * 2) * 0.1 + burst * 1.6;
      j.f1.scale.set(1, k, 1); j.f1.position.y = 0.5 + 0.9 * k; j.f2.scale.set(1, k, 1); j.f2.position.y = 0.5 + 0.55 * k;
    }
    const p = eg.attributes.position;
    for (let i = 0; i < N; i++) {
      let y = p.getY(i) + sp[i] * dt; if (y > 18) y = 0;
      p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.3);
    }
    p.needsUpdate = true;
    for (const im of imps) { im.b.position.y = im.y + Math.abs(Math.sin(t * 4 + im.ph)) * (0.25 + burst * 0.4); }
    const e = 0.85 + Math.sin(t * 2) * 0.15; eyes.forEach(m => m.scale.setScalar(e));
  };
}

// =============================================================
//  6 · AZOTEA DE UN RASCACIELOS: ciudad a tus pies, helicóptero
// =============================================================
function windowsTexture() {
  const t = canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 20) for (let x = 8; x < w; x += 20) {
      c.fillStyle = Math.random() < 0.25 ? '#ffe9a8' : '#7d8db8'; c.fillRect(x, y, 12, 13);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 6);
  return t;
}
function buildRooftop(g) {
  const W = 15, D = 17;
  const wt = windowsTexture();
  const tower = M(new THREE.BoxGeometry(W, 90, D), [ownToon(0xc9d2e6, { map: wt }), ownToon(0xc9d2e6, { map: wt }), toon(0x8f97a8), toon(0x8f97a8), ownToon(0xc9d2e6, { map: wt }), ownToon(0xc9d2e6, { map: wt })], 0, -45.02, 0, g);
  const slab = M(new THREE.BoxGeometry(W, 0.1, D), toon(0x9aa0ad), 0, -0.05, 0, g); slab.receiveShadow = true;
  // pretil (murete del borde)
  for (const [x, z, w, d] of [[0, -D / 2, W, 0.3], [0, D / 2, W, 0.3], [-W / 2, 0, 0.3, D], [W / 2, 0, 0.3, D]]) { const b = box(w, 0.7, d, 0xb9c0cf, 0.02); b.position.set(x, 0.35, z); g.add(b); }
  // ciudad abajo
  const wt2 = windowsTexture(); wt2.repeat.set(1, 3);
  const bld = [];
  for (let i = 0; i < 420; i++) {
    const a = rnd(0, TAU), d = rnd(14, 135);
    const p = ring(a, d), w = rnd(5, 11), dd = rnd(5, 11);
    const top = -rnd(4, 50) + (d > 70 ? rnd(-10, 25) : 0);
    const h = top + 120;
    bld.push({ x: p.x, y: top - h / 2, z: p.z, sx: w, sy: h, sz: dd, ry: rnd(0, 0.3), c: pick(['#c9d2e6', '#e8d9c4', '#b8c6e0', '#f1e3f3', '#a9b8d6', '#d6e4f0']) });
  }
  inst(UNIT_BOX(), ownToon(0xffffff, { map: wt2 }), bld, g);
  // nubes por debajo y por encima
  const clouds = [];
  for (let i = 0; i < 14; i++) { const a = rnd(0, TAU), d = rnd(25, 70); clouds.push({ cl: cloud(g, Math.sin(a) * d, rnd(-22, -8), Math.cos(a) * d, rnd(2, 3.5)), a, d, v: rnd(0.004, 0.01) }); }
  for (let i = 0; i < 6; i++) { const a = rnd(0, TAU); clouds.push({ cl: cloud(g, Math.sin(a) * 60, rnd(14, 20), Math.cos(a) * 60, 2.4), a, d: 60, v: 0.006 }); }
  // antena con luz roja, depósito de agua y aires acondicionados
  const ant = cyl(0.12, 0.2, 9, 0xd0d6e2, 0.02, false); ant.position.set(-6.4, 4.5, -7.6); g.add(ant);
  for (let i = 1; i < 4; i++) { const r = cyl(0.03, 0.03, 1.4 - i * 0.3, 0xd0d6e2, 0, false); r.rotation.z = Math.PI / 2; r.position.set(-6.4, 2 + i * 2, -7.6); g.add(r); }
  const beacon = M(new THREE.SphereGeometry(0.22, 12, 8), glow(0xff2a2a), -6.4, 9.1, -7.6, g);
  const tank = new THREE.Group(); tank.position.set(6.2, 0, -7.2);
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) { const l = cyl(0.06, 0.06, 1.6, 0x6b4f3a, 0.015); l.position.set(x, 0.8, z); tank.add(l); }
  const tb = cyl(1.0, 1.0, 1.8, 0xa0704a, 0.03); tb.position.y = 2.5; tank.add(tb);
  const tr = M(new THREE.ConeGeometry(1.1, 0.7, 20), toon(0x6b4f3a), 0, 3.75, 0, tank);
  g.add(tank);
  const fans = [];
  for (const [x, z] of [[-6.3, 6.5], [6.2, 6.8], [-6.5, 2.2]]) {
    const ac = box(1.1, 0.8, 1.1, 0xe3e7ef, 0.02); ac.position.set(x, 0.4, z); g.add(ac);
    const fan = M(new THREE.BoxGeometry(0.85, 0.04, 0.12), toon(0x4a5368), x, 0.83, z, g); fans.push(fan);
  }
  // bandera al viento
  const fp = cyl(0.04, 0.04, 3, 0xffffff, 0.01); fp.position.set(6.6, 1.5, 7.6); g.add(fp);
  const flag = M(new THREE.PlaneGeometry(1.2, 0.7, 8, 1), ownToon(0x3ee0b0, { side: THREE.DoubleSide }), 7.2, 2.6, 7.6, g);
  const fbase = flag.geometry.attributes.position.array.slice();
  // helicóptero dando vueltas
  const heli = new THREE.Group();
  const hb = M(new THREE.SphereGeometry(1, 18, 12), toon(0xff5a3d), 0, 0, 0, heli); hb.scale.set(1.5, 0.9, 0.9); hb.castShadow = true;
  M(new THREE.SphereGeometry(0.62, 14, 10), ownToon(0x9fe0ff, { transparent: true, opacity: 0.8 }), 0.75, 0.15, 0, heli);
  const boom = M(new THREE.CylinderGeometry(0.12, 0.22, 2.4, 10), toon(0xff5a3d), -2.1, 0.2, 0, heli); boom.rotation.z = Math.PI / 2;
  const rotor = M(new THREE.BoxGeometry(5, 0.05, 0.25), toon(0x2a1512), 0, 1.0, 0, heli);
  const rotor2 = M(new THREE.BoxGeometry(0.25, 0.05, 5), toon(0x2a1512), 0, 1.0, 0, heli);
  const tailR = M(new THREE.BoxGeometry(0.06, 1.0, 0.15), toon(0x2a1512), -3.3, 0.3, 0.12, heli);
  for (const z of [-0.6, 0.6]) M(new THREE.BoxGeometry(2.2, 0.06, 0.08), toon(0x2a1512), 0, -0.95, z, heli);
  g.add(heli);
  // palomas en el pretil
  const birds = [];
  for (const [x, z] of [[-3, 8.5], [2.5, 8.5], [7.5, 3], [-7.5, -3]]) {
    const b = new THREE.Group(); b.position.set(x, 0.72, z);
    M(new THREE.SphereGeometry(0.13, 10, 8), toon(0x8a8fa8), 0, 0.1, 0, b).scale.set(1.3, 1, 1);
    const hd = M(new THREE.SphereGeometry(0.08, 10, 8), toon(0x6b7090), 0.13, 0.22, 0, b);
    g.add(b); birds.push({ b, hd, ph: rnd(0, TAU) });
  }
  return (t, dt) => {
    for (const c of clouds) { c.a += c.v * dt; c.cl.position.x = Math.sin(c.a) * c.d; c.cl.position.z = Math.cos(c.a) * c.d; }
    beacon.visible = (t % 1.4) < 0.7;
    for (const f of fans) f.rotation.y += dt * 12;
    const fa = flag.geometry.attributes.position;
    for (let i = 0; i < fa.count; i++) { const x = fbase[i * 3]; fa.setZ(i, Math.sin(t * 7 + x * 4) * 0.12 * (x + 0.6)); }
    fa.needsUpdate = true;
    const ha = t * 0.25;
    heli.position.set(Math.sin(ha) * 24, 7 + Math.sin(t * 0.7) * 1.2, Math.cos(ha) * 24 - 4);
    heli.rotation.y = ha + Math.PI; heli.rotation.z = 0.12;
    rotor.rotation.y = rotor2.rotation.y = t * 30; tailR.rotation.z = t * 40;
    for (const b of birds) b.hd.position.x = 0.13 + Math.max(0, Math.sin(t * 5 + b.ph)) * 0.05;
  };
}

// =============================================================
//  7 · BASE LUNAR: estrellas, la Tierra, cráteres, astronautas
// =============================================================
function earthTexture() {
  return canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#2f7df6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#3fbf6a';
    for (let i = 0; i < 26; i++) { c.beginPath(); c.ellipse(Math.random() * w, h * 0.15 + Math.random() * h * 0.7, 20 + Math.random() * 50, 12 + Math.random() * 30, Math.random() * 3, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 30; i++) { c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 15 + Math.random() * 40, 4 + Math.random() * 8, 0, 0, TAU); c.fill(); }
    c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
  });
}
function buildMoon(g) {
  // estrellas
  const N = 1600, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * TAU, v = Math.acos(rnd(-0.15, 1)), r = 130;
    pos[i * 3] = Math.sin(v) * Math.cos(u) * r; pos[i * 3 + 1] = Math.cos(v) * r; pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }));
  g.add(stars);
  const earth = M(new THREE.SphereGeometry(9, 40, 28), ownToon(0xffffff, { map: earthTexture(), fog: false }), -40, 34, -100, g);
  const halo = M(new THREE.SphereGeometry(9.8, 32, 20), glow(0x7bc8ff, { transparent: true, opacity: 0.25, side: THREE.BackSide, fog: false }), -40, 34, -100, g);
  // cráteres
  for (let i = 0; i < 28; i++) {
    const a = rnd(0, TAU), d = rnd(9, 38), r = rnd(0.8, 3.2), p = ring(a, d);
    const floor = M(new THREE.CircleGeometry(r, 24), toon(0x7d7d8c), p.x, 0.01, p.z, g); floor.rotation.x = -Math.PI / 2;
    const rim = M(new THREE.TorusGeometry(r, r * 0.16, 6, 28), toon(0xb1b1bf), p.x, 0.02, p.z, g); rim.rotation.x = -Math.PI / 2; rim.scale.z = 0.6;
  }
  const rocks = [];
  for (let i = 0; i < 60; i++) { const a = rnd(0, TAU), d = rnd(8, 40), p = ring(a, d), s = rnd(0.2, 1.1); rocks.push({ x: p.x, y: s * 0.4, z: p.z, s, rx: rnd(0, 3), ry: rnd(0, 3), c: pick(['#8f8f9e', '#a3a3b3', '#7a7a8a']) }); }
  inst(new THREE.DodecahedronGeometry(1), WHITE(), rocks, g, { outline: 0.02 });
  // módulo lunar
  const lm = new THREE.Group(); lm.position.set(-11, 0, -8); lm.rotation.y = 0.6;
  const lb = M(new THREE.CylinderGeometry(1.1, 1.1, 1.2, 8), toon(0xe0b24a), 0, 1.6, 0, lm); lb.castShadow = true;
  const lt = box(1.3, 0.9, 1.3, 0xdfe3ea, 0.03); lt.position.y = 2.65; lm.add(lt);
  M(new THREE.CircleGeometry(0.25, 16), toon(0x2a1512), 0, 2.75, 0.66, lm);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; const l = cyl(0.05, 0.05, 1.8, 0xc9ccd6, 0.015); l.position.set(Math.sin(a) * 1.3, 0.8, Math.cos(a) * 1.3); l.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4); lm.add(l); const f = cyl(0.25, 0.25, 0.06, 0xc9ccd6, 0.01); f.position.set(Math.sin(a) * 1.65, 0.03, Math.cos(a) * 1.65); lm.add(f); }
  g.add(lm);
  // cúpulas de la base
  for (const [x, z, r] of [[11, -9, 2.4], [14.5, -5, 1.6], [12.5, -13, 1.8]]) {
    M(new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.3, 24), toon(0xdfe3ea), x, 0.15, z, g);
    M(new THREE.SphereGeometry(r, 24, 14, 0, TAU, 0, Math.PI / 2), ownToon(0x9fe0ff, { transparent: true, opacity: 0.55 }), x, 0.3, z, g);
    M(new THREE.SphereGeometry(r * 0.35, 12, 10), toon(0x5fd36e), x, 0.5, z, g);
  }
  const dish = new THREE.Group(); dish.position.set(9.5, 0, 7);
  const dp = cyl(0.1, 0.14, 2, 0xdfe3ea, 0.02); dp.position.y = 1; dish.add(dp);
  const dd = M(new THREE.SphereGeometry(1.2, 20, 10, 0, TAU, 0, Math.PI / 3), ownToon(0xffffff, { side: THREE.DoubleSide }), 0, 2.4, 0, dish); dd.rotation.x = Math.PI * 0.75;
  g.add(dish);
  // rover dando vueltas
  const rover = new THREE.Group();
  const rb = box(1.4, 0.4, 0.8, 0xf2f4f8, 0.025); rb.position.y = 0.55; rover.add(rb);
  const rp = box(0.9, 0.04, 0.9, 0x3b6fd8, 0.01); rp.position.set(0, 0.95, 0); rover.add(rp);
  const wheels = [];
  for (const x of [-0.5, 0, 0.5]) for (const z of [-0.48, 0.48]) { const w = M(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14), toon(0x2a1512), x, 0.22, z, rover); w.rotation.x = Math.PI / 2; wheels.push(w); }
  g.add(rover);
  // astronautas dando saltitos (gravedad lunar)
  const astros = [];
  for (const [x, z, ph] of [[-8.5, 5.5, 0], [8.8, -3, 1.6]]) {
    const b = miniBean(0xf2f4f8, 1.25);
    const visor = M(new THREE.SphereGeometry(0.17, 14, 10), ownToon(0xffc93c, { emissive: 0x442200 }), 0, 0.5, 0.1, b); visor.scale.set(1.1, 0.75, 0.8);
    const pack = box(0.3, 0.32, 0.14, 0xdfe3ea, 0.015); pack.position.set(0, 0.38, -0.24); b.add(pack);
    b.position.set(x, 0, z); b.lookAt(0, 0, 0); g.add(b); astros.push({ b, ph });
  }
  const fl = cyl(0.03, 0.03, 2.2, 0xdfe3ea, 0.01); fl.position.set(-7.6, 1.1, -8.4); g.add(fl);
  M(new THREE.PlaneGeometry(1, 0.6), ownToon(0xff5a6e, { side: THREE.DoubleSide }), -7.1, 1.9, -8.4, g);
  return (t, dt) => {
    earth.rotation.y += dt * 0.03;
    const ra = t * 0.12;
    rover.position.set(Math.sin(ra) * 13, 0, Math.cos(ra) * 13); rover.rotation.y = ra + Math.PI / 2;
    for (const w of wheels) w.rotation.y += dt * 4;
    for (const a of astros) { const k = (t * 0.45 + a.ph) % 1; a.b.position.y = Math.sin(k * Math.PI) * 1.4; a.b.rotation.z = Math.sin(t + a.ph) * 0.1; }
  };
}

// =============================================================
//  8 · POLO NORTE: iglús, pingüinos, auroras y nieve
// =============================================================
function buildPolar(g) {
  for (const [x, z, s] of [[-11, -8, 1.3], [11.5, -7, 1], [-12, 6, 1.1], [13, 7, 1.2], [0, -13, 1.5]]) {
    const ig = new THREE.Group(); ig.position.set(x, 0, z); ig.scale.setScalar(s); ig.lookAt(0, 0, 0);
    M(new THREE.SphereGeometry(1.6, 24, 14, 0, TAU, 0, Math.PI / 2), toon(0xf4f9ff), 0, 0, 0, ig).castShadow = true;
    const tn = M(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 16, 1, false, 0, Math.PI), toon(0xeaf3ff), 0, 0, 1.4, ig); tn.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    M(new THREE.CircleGeometry(0.5, 16, 0, Math.PI), toon(0x2a1512), 0, 0, 2.01, ig);
    for (let k = 1; k < 4; k++) { const l = M(new THREE.TorusGeometry(1.6 * Math.cos(k * 0.38), 0.02, 4, 36), toon(0xc6d8f0), 0, 1.6 * Math.sin(k * 0.38), 0, ig); l.rotation.x = Math.PI / 2; }
    g.add(ig);
  }
  const bergs = [];
  for (let i = 0; i < 26; i++) { const a = rnd(0, TAU), d = rnd(26, 50), p = ring(a, d), s = rnd(2, 7); bergs.push({ x: p.x, y: s * 0.3, z: p.z, sx: s, sy: s * rnd(0.8, 1.8), sz: s, ry: rnd(0, 3), c: pick(['#d8f0ff', '#bfe6ff', '#e8f6ff']) }); }
  inst(new THREE.IcosahedronGeometry(1, 0), WHITE(), bergs, g, { outline: 0.03 });
  for (let i = 0; i < 18; i++) { const a = rnd(0, TAU), d = rnd(15, 24), p = ring(a, d); pine(g, p.x, p.z, rnd(1, 1.8), true); }
  for (const [x, z] of [[-9, 2.5], [9.5, -1.5]]) {
    const sm = new THREE.Group(); sm.position.set(x, 0, z); sm.lookAt(0, 0, 0);
    [[0.55, 0.5], [0.4, 1.25], [0.28, 1.8]].forEach(([r, y]) => { const s = sphere(r, 0xffffff, 0.02); s.position.y = y; sm.add(s); });
    const nose = M(new THREE.ConeGeometry(0.06, 0.3, 8), toon(0xff8a3d), 0, 1.8, 0.4, sm); nose.rotation.x = Math.PI / 2;
    for (const ex of [-0.1, 0.1]) M(new THREE.SphereGeometry(0.035, 8, 6), toon(0x24120f), ex, 1.9, 0.25, sm);
    const scarf = M(new THREE.TorusGeometry(0.32, 0.07, 6, 18), toon(0xff5a6e), 0, 1.55, 0, sm); scarf.rotation.x = Math.PI / 2;
    g.add(sm);
  }
  // pingüinos
  const pens = [];
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Group();
    const body = M(new THREE.CapsuleGeometry(0.2, 0.25, 6, 14), toon(0x1f2340), 0, 0.33, 0, p); body.castShadow = true;
    M(new THREE.CapsuleGeometry(0.21, 0.25, 6, 14), outlineMat, 0, 0.33, 0, p);
    const belly = M(new THREE.SphereGeometry(0.17, 14, 10), toon(0xffffff), 0, 0.3, 0.07, p); belly.scale.set(0.95, 1.4, 0.8);
    for (const ex of [-0.07, 0.07]) { M(new THREE.SphereGeometry(0.045, 8, 6), toon(0xffffff), ex, 0.52, 0.16, p); M(new THREE.SphereGeometry(0.022, 6, 4), toon(0x24120f), ex, 0.52, 0.2, p); }
    const beak = M(new THREE.ConeGeometry(0.05, 0.12, 8), toon(0xffa53d), 0, 0.45, 0.22, p); beak.rotation.x = Math.PI / 2;
    for (const fx of [-0.09, 0.09]) M(new THREE.BoxGeometry(0.1, 0.03, 0.14), toon(0xffa53d), fx, 0.02, 0.06, p);
    const wings = [-1, 1].map(s => { const w = M(new THREE.BoxGeometry(0.04, 0.26, 0.12), toon(0x1f2340), s * 0.21, 0.36, 0, p); return w; });
    p.scale.setScalar(rnd(0.9, 1.3)); g.add(p);
    const side = i % 2 ? 1 : -1;
    pens.push({ p, wings, side, ph: rnd(0, TAU), z0: rnd(-9, 9), x0: side * rnd(7.6, 10.5), v: rnd(0.5, 1) });
  }
  // nieve
  const N = 900, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = rnd(-25, 25); pos[i * 3 + 1] = rnd(0, 16); pos[i * 3 + 2] = rnd(-25, 15); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.9 }));
  g.add(snow);
  // auroras boreales
  const aTex = canvasTex(4, 128, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(0.6, 'rgba(90,255,180,0.9)'); gr.addColorStop(1, 'rgba(160,120,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  const auroras = [];
  for (let i = 0; i < 3; i++) {
    const ag = new THREE.PlaneGeometry(90, 14, 60, 1);
    const am = M(ag, new THREE.MeshBasicMaterial({ map: aTex, transparent: true, opacity: 0.55 - i * 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), 0, 26 + i * 5, -70 - i * 10, g);
    auroras.push({ am, base: ag.attributes.position.array.slice(), ph: i * 1.3 });
  }
  return (t, dt) => {
    for (const q of pens) {
      const z = q.z0 + Math.sin(t * 0.25 * q.v + q.ph) * 4;
      const dz = Math.cos(t * 0.25 * q.v + q.ph);
      q.p.position.set(q.x0, Math.abs(Math.sin(t * 7 + q.ph)) * 0.03, z);
      q.p.rotation.set(0, dz > 0 ? 0 : Math.PI, Math.sin(t * 7 + q.ph) * 0.15);
      q.wings[0].rotation.z = 0.3 + Math.sin(t * 7 + q.ph) * 0.25; q.wings[1].rotation.z = -q.wings[0].rotation.z;
    }
    const p = sg.attributes.position;
    for (let i = 0; i < N; i++) { let y = p.getY(i) - dt * (0.8 + (i % 5) * 0.15); if (y < 0) y = 16; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.25); }
    p.needsUpdate = true;
    for (const a of auroras) {
      const ap = a.am.geometry.attributes.position;
      for (let i = 0; i < ap.count; i++) { const x = a.base[i * 3]; ap.setZ(i, Math.sin(x * 0.08 + t * 0.4 + a.ph) * 6); ap.setY(i, a.base[i * 3 + 1] + Math.sin(x * 0.05 - t * 0.3) * 2); }
      ap.needsUpdate = true;
    }
  };
}

// =============================================================
//  9 · FONDO DEL MAR: algas, corales, peces, medusas, burbujas
// =============================================================
function buildSea(g) {
  // algas
  const weeds = [];
  for (let i = 0; i < 46; i++) {
    const a = rnd(0, TAU), d = rnd(8.5, 22), p = ring(a, d);
    const root = new THREE.Group(); root.position.copy(p); g.add(root);
    const segs = []; let parent = root;
    const n = 5 + Math.floor(Math.random() * 4), col = pick([0x2fa84a, 0x3fbf5a, 0x5fd36e, 0x7ac74f]);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Group(); s.position.y = k === 0 ? 0 : 0.55; parent.add(s);
      const leaf = M(new THREE.CapsuleGeometry(0.09, 0.4, 4, 8), toon(col), 0, 0.27, 0, s); leaf.scale.z = 0.5;
      segs.push(s); parent = s;
    }
    weeds.push({ segs, ph: rnd(0, TAU) });
  }
  // corales
  const CC = [0xff6b9a, 0xff9f5a, 0xc77dff, 0xffd166, 0xff5a6e, 0x5fe0d0];
  for (let i = 0; i < 22; i++) {
    const a = rnd(0, TAU), d = rnd(8.5, 18), p = ring(a, d), col = pick(CC);
    const c = new THREE.Group(); c.position.copy(p); c.scale.setScalar(rnd(0.7, 1.4));
    if (i % 3 === 0) { const b = sphere(0.6, col, 0.03, false); b.position.y = 0.35; b.scale.y = 0.7; c.add(b); }
    else for (let k = 0; k < 5; k++) { const br = cyl(0.07, 0.11, rnd(0.6, 1.3), col, 0.02, false); br.position.set(rnd(-0.3, 0.3), 0.45, rnd(-0.3, 0.3)); br.rotation.set(rnd(-0.5, 0.5), 0, rnd(-0.5, 0.5)); c.add(br); const tip = sphere(0.1, col, 0.02, false); tip.position.copy(br.position).add(new THREE.Vector3(-Math.sin(br.rotation.z) * 0.5, 0.45, Math.sin(br.rotation.x) * 0.5)); c.add(tip); }
    g.add(c);
  }
  const rocks = [];
  for (let i = 0; i < 30; i++) { const a = rnd(0, TAU), d = rnd(10, 38), p = ring(a, d), s = rnd(0.6, 2.4); rocks.push({ x: p.x, y: s * 0.3, z: p.z, s, ry: rnd(0, 3), c: pick(['#6f7f9a', '#5d6b85', '#7d8ca8']) }); }
  inst(new THREE.DodecahedronGeometry(1), WHITE(), rocks, g, { outline: 0.02 });
  // barco hundido y cofre
  const ship = new THREE.Group(); ship.position.set(-15, 0, -16); ship.rotation.set(0.15, 0.7, 0.25);
  const hull = box(8, 2.2, 2.8, 0x7a4f2e, 0.05, false); hull.position.y = 0.8; ship.add(hull);
  const deck = box(7.6, 0.2, 2.6, 0x9c6b43, 0.03, false); deck.position.y = 1.95; ship.add(deck);
  const mast = cyl(0.12, 0.15, 6, 0x6b4423, 0.03, false); mast.position.set(0.5, 4.8, 0); mast.rotation.z = 0.3; ship.add(mast);
  const sail = M(new THREE.PlaneGeometry(2.4, 2), ownToon(0xe8dcc0, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 1.2, 5, 0.2, ship); sail.rotation.z = 0.3;
  g.add(ship);
  const chest = new THREE.Group(); chest.position.set(9, 0, -9); chest.rotation.y = -0.6;
  const cb = box(1.1, 0.6, 0.7, 0x8a5a2b, 0.03); cb.position.y = 0.3; chest.add(cb);
  const lid = box(1.1, 0.12, 0.7, 0x6b4423, 0.03); lid.position.set(0, 0.75, -0.25); lid.rotation.x = -0.8; chest.add(lid);
  for (let i = 0; i < 6; i++) { const c = M(new THREE.SphereGeometry(0.1, 10, 8), glow(0xffd23f), rnd(-0.4, 0.4), 0.62, rnd(-0.2, 0.2), chest); }
  g.add(chest);
  // bancos de peces
  const schools = [];
  for (let s = 0; s < 4; s++) {
    const col = pick([0xffa53d, 0xffd166, 0x5fc8ff, 0xff6b9a, 0x9b8cff]), fish = [];
    for (let i = 0; i < 12; i++) {
      const f = new THREE.Group();
      const body = M(new THREE.SphereGeometry(0.16, 12, 8), toon(col), 0, 0, 0, f); body.scale.set(1.6, 1, 0.6);
      const tail = M(new THREE.ConeGeometry(0.12, 0.2, 4), toon(col), -0.3, 0, 0, f); tail.rotation.z = Math.PI / 2;
      M(new THREE.SphereGeometry(0.035, 6, 4), toon(0x24120f), 0.17, 0.04, 0.07, f);
      g.add(f); fish.push({ f, tail, o: new THREE.Vector3(rnd(-1, 1), rnd(-0.5, 0.5), rnd(-1, 1)) });
    }
    schools.push({ fish, r: rnd(10, 17), h: rnd(2.5, 6), v: rnd(0.12, 0.25) * (s % 2 ? 1 : -1), a: rnd(0, TAU) });
  }
  // medusas
  const jellies = [];
  for (let i = 0; i < 7; i++) {
    const j = new THREE.Group();
    const col = pick([0xff9ad5, 0xc9a7ff, 0x9fe8ff]);
    M(new THREE.SphereGeometry(0.4, 18, 10, 0, TAU, 0, Math.PI / 2), ownToon(col, { transparent: true, opacity: 0.75 }), 0, 0, 0, j);
    for (let k = 0; k < 5; k++) { const tt = M(new THREE.CylinderGeometry(0.02, 0.01, 0.9, 5), ownToon(col, { transparent: true, opacity: 0.6 }), Math.cos(k * 1.26) * 0.22, -0.45, Math.sin(k * 1.26) * 0.22, j); }
    const a = rnd(0, TAU), d = rnd(9, 16);
    j.position.copy(ring(a, d, rnd(3, 7))); g.add(j); jellies.push({ j, y: j.position.y, ph: rnd(0, TAU) });
  }
  // burbujas
  const bubbles = [];
  const bm = ownToon(0xe8fbff, { transparent: true, opacity: 0.55 });
  for (let i = 0; i < 70; i++) { const a = rnd(0, TAU), d = rnd(7.5, 20); const b = M(new THREE.SphereGeometry(rnd(0.05, 0.14), 8, 6), bm, 0, 0, 0, g); bubbles.push({ b, x: Math.sin(a) * d, z: Math.cos(a) * d, y: rnd(0, 14), v: rnd(0.6, 1.4) }); }
  // rayos de luz desde la superficie
  const rays = [];
  for (let i = 0; i < 7; i++) {
    const r = M(new THREE.CylinderGeometry(0.6, 2.6, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xcff6ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), rnd(-20, 20), 15, rnd(-25, 5), g);
    r.rotation.z = rnd(-0.25, 0.25); rays.push({ r, ph: rnd(0, TAU), x: r.position.x });
  }
  // ballena lejana
  const whale = new THREE.Group();
  const wb = M(new THREE.CapsuleGeometry(2.4, 6, 8, 16), toon(0x3a6fb0), 0, 0, 0, whale); wb.rotation.z = Math.PI / 2;
  const belly = M(new THREE.CapsuleGeometry(2.0, 5, 8, 16), toon(0xbfd6ee), 0, -0.9, 0, whale); belly.rotation.z = Math.PI / 2; belly.scale.z = 0.8;
  const tailW = M(new THREE.BoxGeometry(0.4, 0.3, 4.4), toon(0x3a6fb0), -6.4, 0.4, 0, whale);
  M(new THREE.SphereGeometry(0.25, 8, 6), toon(0x24120f), 3.6, 0.5, 1.6, whale);
  g.add(whale);
  return (t, dt) => {
    for (const w of weeds) w.segs.forEach((s, k) => { s.rotation.z = Math.sin(t * 1.2 + w.ph + k * 0.5) * 0.18; s.rotation.x = Math.cos(t * 0.9 + w.ph + k * 0.4) * 0.1; });
    for (const s of schools) {
      s.a += s.v * dt;
      const cx = Math.sin(s.a) * s.r, cz = Math.cos(s.a) * s.r - 2, dir = s.a + (s.v > 0 ? Math.PI / 2 : -Math.PI / 2);
      for (const f of s.fish) {
        f.f.position.set(cx + f.o.x + Math.sin(t * 2 + f.o.z * 3) * 0.2, s.h + f.o.y + Math.sin(t * 1.5 + f.o.x * 4) * 0.15, cz + f.o.z);
        f.f.rotation.y = dir - Math.PI / 2; f.tail.rotation.y = Math.sin(t * 14 + f.o.x * 5) * 0.5;
      }
    }
    for (const j of jellies) { const k = Math.sin(t * 1.6 + j.ph); j.j.position.y = j.y + k * 0.6; j.j.scale.set(1 - k * 0.08, 1 + k * 0.1, 1 - k * 0.08); }
    for (const b of bubbles) { b.y += b.v * dt; if (b.y > 14) b.y = 0; b.b.position.set(b.x + Math.sin(t * 2 + b.y) * 0.15, b.y, b.z); }
    for (const r of rays) { r.r.position.x = r.x + Math.sin(t * 0.3 + r.ph) * 1.5; r.r.material.opacity = 0.05 + Math.sin(t * 0.7 + r.ph) * 0.025; }
    const wa = t * 0.04;
    whale.position.set(Math.sin(wa) * 38, 9 + Math.sin(t * 0.3) * 1.5, Math.cos(wa) * 38);
    whale.rotation.y = wa + Math.PI; tailW.rotation.z = Math.sin(t * 1.4) * 0.3;
  };
}

// =============================================================
//  10 · DISCOTECA NEÓN: pista de baile, bola de espejos, láseres, DJ
// =============================================================
function buildNeon(g, ctx) {
  const tiles = [];
  for (let i = -13; i <= 13; i++) for (let j = -13; j <= 13; j++) { if (Math.hypot(i, j) > 14 || (Math.abs(i) < 3.9 && Math.abs(j) < 5.9)) continue; tiles.push({ x: i, y: 0.001, z: j, sx: 0.94, sy: 0.002, sz: 0.94, i, j, c: '#ffffff' }); }
  const tileM = inst(UNIT_BOX(), new THREE.MeshBasicMaterial({ color: 0xffffff }), tiles, g);
  const NC = [new THREE.Color(0xff3df2), new THREE.Color(0x3df2ff), new THREE.Color(0xffe23d), new THREE.Color(0x7a3dff), new THREE.Color(0x3dff8a)];
  const DIM = new THREE.Color(0x1a0f33);
  // bola de espejos
  const ball = M(new THREE.IcosahedronGeometry(1.1, 2), new THREE.MeshToonMaterial({ color: 0xdfe6ff, gradientMap: GRAD, flatShading: true, emissive: 0x332a55 }), 0, 7.2, -1.5, g);
  const chain = cyl(0.02, 0.02, 4, 0xbfc6dd, 0, false); chain.position.set(0, 9.9, -1.5); g.add(chain);
  // arcos de neón
  const arcs = [];
  [[0xff3df2, 7.5], [0x3df2ff, 8.3], [0xffe23d, 9.1]].forEach(([c, r], i) => {
    const a = M(new THREE.TorusGeometry(r, 0.09, 8, 72, Math.PI), glow(c), 0, 0, -9 - i * 0.6, g); arcs.push(a);
  });
  for (const z of [-3, 3]) for (const sx of [-1, 1]) { const tube = M(new THREE.TorusGeometry(2.2, 0.06, 6, 40), glow(sx > 0 ? 0x3df2ff : 0xff3df2), sx * 9.5, 3.2, z, g); tube.rotation.y = Math.PI / 2; arcs.push(tube); }
  // rótulo
  const sTex = canvasTex(1024, 256, (c, w, h) => {
    c.font = 'italic 900 170px Archivo, "Arial Black", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff3df2'; c.shadowBlur = 30; c.lineWidth = 10; c.strokeStyle = '#ff7af6'; c.strokeText('PONG CLUB', w / 2, h / 2);
    c.shadowBlur = 0; c.fillStyle = '#ffe6fd'; c.fillText('PONG CLUB', w / 2, h / 2);
  });
  const sign = M(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false }), 0, 8.5, -16, g);
  const wall = M(new THREE.BoxGeometry(60, 20, 1), toon(0x1c1036), 0, 10, -17, g);
  // altavoces que bombean
  const speakers = [];
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const sp = new THREE.Group(); sp.position.set(sx * (8.2 + k * 1.6), 0, -8 + k * 0.5); g.add(sp);
    const cab = box(1.5, 2.6, 1.2, 0x1b1530, 0.03); cab.position.y = 1.3; sp.add(cab);
    for (const y of [0.75, 1.85]) { const cone = M(new THREE.CylinderGeometry(0.45 - (y > 1 ? 0.15 : 0), 0.45 - (y > 1 ? 0.15 : 0), 0.08, 20), toon(0x3a2f5c), 0, y, 0.62, sp); cone.rotation.x = Math.PI / 2; speakers.push(cone); }
  }
  // cabina del DJ con su frijolito
  const booth = box(3.2, 1.1, 1.2, 0x2a1f4a, 0.03); booth.position.set(0, 0.55, -8.3); g.add(booth);
  const deckL = M(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 20), toon(0x111111), -0.8, 1.13, -8.3, g);
  const deckR = M(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 20), toon(0x111111), 0.8, 1.13, -8.3, g);
  const strip = M(new THREE.BoxGeometry(3.22, 0.08, 0.02), glow(0x3df2ff), 0, 0.85, -7.69, g);
  const dj = miniBean(0xffc93c, 1.5); dj.position.set(0, 0.6, -8.9); g.add(dj);
  const phones = M(new THREE.TorusGeometry(0.25, 0.04, 6, 20, Math.PI), toon(0x2a1512), 0, 0.68, 0, dj);
  for (const s of [-1, 1]) M(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), toon(0xff3df2), s * 0.25, 0.62, 0, dj).rotation.z = Math.PI / 2;
  // láseres
  const lasers = [];
  for (let i = 0; i < 6; i++) {
    const lg = new THREE.Group(); lg.position.set(i < 3 ? -10 : 10, 6, -12); g.add(lg);
    const beam = M(new THREE.CylinderGeometry(0.02, 0.02, 30, 4), new THREE.MeshBasicMaterial({ color: NC[i % 5], transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 15, 0, lg);
    lasers.push({ lg, ph: i * 1.1, s: i < 3 ? 1 : -1 });
  }
  // puntos de luz que reflejan la bola de espejos
  const N = 260, pos = new Float32Array(N * 3), ang = [];
  for (let i = 0; i < N; i++) { const u = rnd(0, TAU), v = rnd(0.2, 1.4), r = rnd(14, 20); ang.push([u, v, r]); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.8 }));
  g.add(dots);
  let flash = 0, lastBeat = -1;
  ctx.hype = s => { flash = Math.max(flash, 0.6 + s); };
  return (t, dt) => {
    const beat = t * 2.1, bi = Math.floor(beat), bf = beat - bi;
    flash = Math.max(0, flash - dt);
    if (bi !== lastBeat || flash > 0) {
      lastBeat = bi;
      tiles.forEach((tl, n) => {
        const pat = (bi >> 3) % 3;
        const k = pat === 0 ? (tl.i + tl.j + bi) : pat === 1 ? (Math.floor(Math.hypot(tl.i, tl.j)) - bi) : ((tl.i * 7 + tl.j * 13) ^ bi);
        const on = flash > 0 || ((k % 3) + 3) % 3 === 0;
        tileM.setColorAt(n, on ? NC[((k % 5) + 5) % 5] : DIM);
      });
      tileM.instanceColor.needsUpdate = true;
    }
    const pump = 1 + Math.max(0, 1 - bf * 4) * 0.12;
    for (const s of speakers) s.scale.set(pump, 1, pump);
    ball.rotation.y = t * 0.6;
    dj.position.y = 0.6 + Math.abs(Math.sin(beat * Math.PI)) * 0.08; dj.rotation.y = Math.sin(t * 1.3) * 0.3;
    deckL.rotation.y = t * 5; deckR.rotation.y = -t * 5;
    for (const l of lasers) { l.lg.rotation.z = l.s * (0.4 + Math.sin(t * 0.9 + l.ph) * 0.5); l.lg.rotation.x = Math.sin(t * 0.7 + l.ph) * 0.4 + 0.5; }
    arcs.forEach((a, i) => { a.visible = flash > 0 ? Math.floor(t * 12) % 2 === 0 : ((bi + i) % 4) !== 0; });
    const p = dg.attributes.position;
    for (let i = 0; i < N; i++) { const [u, v, r] = ang[i]; const uu = u + t * 0.6; p.setXYZ(i, Math.sin(uu) * Math.cos(v) * r, 7.2 + Math.sin(v) * r * 0.5 - 2, Math.cos(uu) * Math.cos(v) * r - 1.5); }
    p.needsUpdate = true;
  };
}

// =============================================================
//  CATÁLOGO
//  sky [arriba, medio, horizonte] · fog [color, cerca, lejos] · hemi [cielo, suelo, int.]
//  sun [color, int.] · ground (null = sin suelo) · court [borde, pista] · tiers (gradas)
// =============================================================
export const STAGES = [
  { id: 'park', name: 'Parque', desc: 'El torneo de barrio de siempre', banner: ['TORNEO DEL PARQUE', '#ff5a6e', '#ffffff'],
    sky: ['#6cc4ff', '#b9e6ff', '#fff1dc'], fog: [0xd7efff, 24, 60], hemi: [0xffffff, 0xb9a8ff, 1.5], sun: [0xffffff, 2.0],
    ground: 0x9be3c3, court: [0xffffff, 0xffd6a5], tiers: [0xffffff, 0xf1ecff, 0xe4dcff, 0xd6cbff], build: buildPark },
  { id: 'favela', name: 'Favela', desc: 'Partido en el morro, con cometas al atardecer', banner: ['COPA DO MORRO', '#06d6a0', '#ffffff'],
    sky: ['#4f86e8', '#ffb38a', '#ffe0b0'], fog: [0xffd2a8, 30, 80], hemi: [0xfff0e0, 0xc08a6a, 1.4], sun: [0xffe0b8, 2.1],
    ground: 0xc9b39a, court: [0xffd166, 0x2bb673], tiers: [0xf4f1de, 0xffd166, 0x8ecae6, 0xff9f1c], build: buildFavela },
  { id: 'beach', name: 'Playa', desc: 'Arena, olas, palmeras y un cangrejo curioso', banner: ['COPA PLAYA', '#1fa5e0', '#ffffff'],
    sky: ['#3fb6ff', '#a8e4ff', '#fff6d6'], fog: [0xdff4ff, 40, 120], hemi: [0xffffff, 0xf2d79a, 1.6], sun: [0xfff4d8, 2.2],
    ground: 0xf6dfa3, court: [0xffffff, 0xf0c27a], tiers: [0xffffff, 0xffe3a3, 0xffd0a8, 0xb8ecff], build: buildBeach },
  { id: 'olympic', name: 'Estadio Ponglímpico', short: 'Estadio', desc: 'Graderío gigante, la ola y el pebetero encendido', banner: ['JUEGOS PONGLÍMPICOS', '#1b2a6b', '#ffd166'],
    sky: ['#1b2a6b', '#5d5fc9', '#ffb38a'], fog: [0x8a7fc9, 50, 140], hemi: [0xe8ecff, 0x6a5aa8, 1.4], sun: [0xfff6e8, 2.2],
    ground: 0x4cbf6a, court: [0xffffff, 0xd0503f], tiers: [0xffffff, 0xdfe6f2, 0xc9d2e6, 0xb3bfdc], build: buildOlympic },
  { id: 'hell', name: 'El Infierno', desc: 'Ríos de lava, llamaradas y diablillos animando', banner: ['INFIERNO OPEN', '#2a0a0a', '#ff7a2f'],
    sky: ['#0d0203', '#5a0b0b', '#ff6a2a'], fog: [0x5a140a, 22, 75], hemi: [0xff8a5a, 0x330800, 1.2], sun: [0xff9a6a, 1.8],
    ground: 0x3b2424, court: [0xff6a2a, 0x2a1414], courtGlow: true, tiers: [0x4a2a24, 0x3d2222, 0x33201c, 0x2b1a1a], build: buildHell },
  { id: 'rooftop', name: 'Azotea', desc: 'En lo alto de un rascacielos, con la ciudad a tus pies', banner: ['DUELO EN LAS ALTURAS', '#2d4fb8', '#ffffff'],
    sky: ['#2d4fb8', '#ff8fb1', '#ffd29a'], fog: [0xffc2b0, 45, 145], hemi: [0xffe8f0, 0x8a7aa8, 1.4], sun: [0xffe2c8, 2.2],
    ground: null, court: [0xffc93c, 0x3b4a6b], tiers: [0xdfe3ea, 0xc9ced8, 0xb3b9c6, 0x9da4b4], build: buildRooftop },
  { id: 'moon', name: 'Base Lunar', desc: 'Con la Tierra en el cielo y astronautas saltando', banner: ['COPA LUNAR', '#141436', '#7bdff2'],
    sky: ['#000003', '#03031a', '#121236'], fog: [0x08081c, 70, 150], hemi: [0x9aa8ff, 0x1a1a2e, 0.8], sun: [0xffffff, 2.6],
    ground: 0xa3a3b2, court: [0x7bdff2, 0x3a3f5c], tiers: [0xf2f4f8, 0xdfe3ea, 0xc9ced8, 0xb3b9c6], build: buildMoon },
  { id: 'polar', name: 'Polo Norte', desc: 'Iglús, pingüinos, nieve y auroras boreales', banner: ['COPA GLACIAR', '#3a4f9a', '#ffffff'],
    sky: ['#14204a', '#3a4f9a', '#c9b3ec'], fog: [0xb8b8e8, 30, 90], hemi: [0xe3eeff, 0x8aa0d0, 1.5], sun: [0xffeef6, 1.8],
    ground: 0xf2f7ff, court: [0xffffff, 0xbfe6ff], tiers: [0xffffff, 0xeaf3ff, 0xd8e8ff, 0xc6dcfa], build: buildPolar },
  { id: 'sea', name: 'Fondo del Mar', short: 'Bajo el mar', desc: 'Entre corales, medusas, peces y un barco hundido', banner: ['LIGA SUBMARINA', '#0f5f9a', '#9fe8ff'],
    sky: ['#03224a', '#0f5f9a', '#36b3d6'], fog: [0x1a6fa0, 14, 52], hemi: [0x9fe8ff, 0x1a4060, 1.4], sun: [0xc8f4ff, 1.7],
    ground: 0xe9d7a0, court: [0xffffff, 0xff8f7a], tiers: [0xffd0c4, 0xffb3a3, 0xff9a8a, 0xf08070], build: buildSea },
  { id: 'neon', name: 'Discoteca Neón', short: 'Discoteca', desc: 'Pista de baile que se ilumina, láseres y DJ', banner: ['PONG CLUB', '#14052a', '#ff3df2'],
    sky: ['#07010f', '#1c0738', '#3a0d5c'], fog: [0x1a0835, 20, 60], hemi: [0xb09bff, 0x220033, 1.1], sun: [0xe0c8ff, 1.5],
    ground: 0x150c28, court: [0xff3df2, 0x241040], courtGlow: true, tiers: [0x3a2a5c, 0x33244f, 0x2b1f44, 0x241a3a], build: buildNeon },
];
export const stageById = id => STAGES.find(s => s.id === id) || STAGES[0];
// 'random' → uno al azar (distinto del actual si se puede)
export function resolveStage(id, current) {
  if (id !== 'random') return stageById(id).id;
  const pool = STAGES.filter(s => s.id !== current);
  return pick(pool).id;
}
// Libera geometrías/materiales/texturas propios del escenario (los compartidos llevan userData.keep)
export function disposeTree(root) {
  root.traverse(o => {
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) { if (m.userData.keep) continue; if (m.map) m.map.dispose(); m.dispose(); }
  });
}

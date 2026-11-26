// =============================================================
//  MODELOS — materiales toon, piezas con contorno, mesa y bola
//  Todo lo visual de objetos vive aquí. En la fase Blender se
//  reemplazan estas fábricas por cargas .glb manteniendo la misma
//  interfaz (createTable, createCharacter, createBall, createArena).
// =============================================================
import * as THREE from 'three';
import { PALETTE, TABLE_H, HALF_L, HALF_W, NET_H, R, SWING_DUR } from './config.js';

// ---------- Materiales toon ----------
const gradientMap = (() => {
  const d = new Uint8Array([125, 125, 125, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
const matCache = new Map();
export function toon(color) {
  if (!matCache.has(color)) { const m = new THREE.MeshToonMaterial({ color, gradientMap }); m.userData.keep = true; matCache.set(color, m); }
  return matCache.get(color);
}
export const outlineMat = new THREE.MeshBasicMaterial({ color: PALETTE.outline, side: THREE.BackSide });
outlineMat.userData.keep = true;
export const GRAD = gradientMap;
const geoCache = new Map();
// (userData.keep: compartidos, nunca se liberan al cambiar de escenario)
export const geo = (key, fn) => { if (!geoCache.has(key)) { const g = fn(); g.userData.keep = true; geoCache.set(key, g); } return geoCache.get(key); };

// Pieza = malla toon + casco de contorno (técnica "inverted hull")
export function part(g, og, color, shadow = true) {
  const grp = new THREE.Group();
  const m = new THREE.Mesh(g, toon(color));
  m.castShadow = shadow; m.receiveShadow = true;
  grp.add(m);
  if (og) grp.add(new THREE.Mesh(og, outlineMat));
  grp.userData.mesh = m;
  return grp;
}
const k = n => n.toFixed(4);
export const box = (w, h, d, c, t = 0.015, sh = true) => part(
  geo(`b${k(w)},${k(h)},${k(d)}`, () => new THREE.BoxGeometry(w, h, d)),
  t ? geo(`b${k(w + 2 * t)},${k(h + 2 * t)},${k(d + 2 * t)}`, () => new THREE.BoxGeometry(w + 2 * t, h + 2 * t, d + 2 * t)) : null, c, sh);
export const sphere = (r, c, t = 0.015, sh = true) => part(
  geo(`s${k(r)}`, () => new THREE.SphereGeometry(r, 28, 18)),
  t ? geo(`s${k(r + t)}`, () => new THREE.SphereGeometry(r + t, 28, 18)) : null, c, sh);
export const cyl = (r1, r2, h, c, t = 0.015, sh = true) => part(
  geo(`c${k(r1)},${k(r2)},${k(h)}`, () => new THREE.CylinderGeometry(r1, r2, h, 28)),
  t ? geo(`c${k(r1 + t)},${k(r2 + t)},${k(h + 2 * t)}`, () => new THREE.CylinderGeometry(r1 + t, r2 + t, h + 2 * t, 28)) : null, c, sh);
export const capsule = (r, l, c, t = 0.02, sh = true) => part(
  geo(`p${k(r)},${k(l)}`, () => new THREE.CapsuleGeometry(r, l, 10, 24)),
  t ? geo(`p${k(r + t)},${k(l)}`, () => new THREE.CapsuleGeometry(r + t, l, 10, 24)) : null, c, sh);

export const lighten = (hex, a) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), a).getHex();
export const darken = (hex, a) => new THREE.Color(hex).lerp(new THREE.Color(0x000000), a).getHex();

// ---------- Cielo ----------
export function createSky() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, PALETTE.skyTop); gr.addColorStop(0.55, PALETTE.skyMid); gr.addColorStop(1, PALETTE.skyLow);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- Mesa ----------
export function createTable() {
  const g = new THREE.Group();
  // Largo de la mesa sobre el eje Z (jugadores en ±Z), ancho sobre X
  const top = box(HALF_W * 2, 0.05, HALF_L * 2, PALETTE.table, 0.012);
  top.position.y = TABLE_H - 0.025; g.add(top);
  const skirt = box(HALF_W * 2 - 0.16, 0.08, HALF_L * 2 - 0.16, PALETTE.tableEdge, 0);
  skirt.position.y = TABLE_H - 0.09; g.add(skirt);

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.002, d), lineMat); m.position.set(x, TABLE_H + 0.001, z); g.add(m); };
  line(0.022, HALF_L * 2, -HALF_W + 0.011, 0); line(0.022, HALF_L * 2, HALF_W - 0.011, 0);
  line(HALF_W * 2, 0.022, 0, HALF_L - 0.011); line(HALF_W * 2, 0.022, 0, -HALF_L + 0.011);
  line(0.007, HALF_L * 2, 0, 0);

  const legH = TABLE_H - 0.13;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = box(0.07, legH, 0.07, PALETTE.legs, 0.012);
    leg.position.set(sx * 0.62, legH / 2, sz * 1.05); g.add(leg);
    const wheel = sphere(0.045, 0x1a2140, 0.01); wheel.position.set(sx * 0.62, 0.045, sz * 1.05); g.add(wheel);
  }
  for (const sx of [-1, 1]) { const bar = box(0.05, 0.05, 2.1, PALETTE.legs, 0.01); bar.position.set(sx * 0.62, 0.3, 0); g.add(bar); }

  // Red
  for (const sx of [-1, 1]) {
    const post = box(0.03, NET_H + 0.04, 0.04, PALETTE.legs, 0.01);
    post.position.set(sx * (HALF_W + 0.08), TABLE_H + (NET_H + 0.04) / 2, 0); g.add(post);
  }
  const nc = document.createElement('canvas'); nc.width = 256; nc.height = 32;
  const nx = nc.getContext('2d');
  nx.strokeStyle = 'rgba(255,255,255,0.95)'; nx.lineWidth = 1.4;
  for (let x = 0; x <= 256; x += 6) { nx.beginPath(); nx.moveTo(x, 0); nx.lineTo(x, 32); nx.stroke(); }
  for (let y = 0; y <= 32; y += 6) { nx.beginPath(); nx.moveTo(0, y); nx.lineTo(256, y); nx.stroke(); }
  const ntex = new THREE.CanvasTexture(nc); ntex.colorSpace = THREE.SRGBColorSpace;
  ntex.wrapS = THREE.RepeatWrapping; ntex.repeat.x = 3;
  const net = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 0.16, NET_H),
    new THREE.MeshBasicMaterial({ map: ntex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.2, color: 0xe8f2ff }));
  net.position.y = TABLE_H + NET_H / 2; g.add(net);
  const tape = box(HALF_W * 2 + 0.16, 0.022, 0.012, 0xffffff, 0.006, false);
  tape.position.y = TABLE_H + NET_H; g.add(tape);
  // materiales propios (los de toon() están compartidos): así cada escenario puede teñir su mesa
  const topMat = top.userData.mesh.material.clone(), edgeMat = skirt.userData.mesh.material.clone();
  top.userData.mesh.material = topMat; skirt.userData.mesh.material = edgeMat;
  g.userData.setColors = (topHex, edgeHex) => { topMat.color.setHex(topHex); edgeMat.color.setHex(edgeHex); };
  return g;
}

// ---------- Bola ----------
export function createBall() {
  const g = new THREE.Group();
  const s = sphere(R, PALETTE.ball, 0.008, false); g.add(s);
  const band = new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, 0.0045, 8, 24), toon(PALETTE.ballBand));
  band.rotation.x = Math.PI / 2; g.add(band);
  return g;
}


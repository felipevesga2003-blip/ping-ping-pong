// =============================================================
//  ACCESORIOS DEL PÚBLICO por escenario
//  Cada pieza se dibuja instanciada (una llamada por parte) y se
//  coloca respecto al aficionado (cabeza, cuello, ojos, cintura) o
//  respecto a su mano levantada (sigue el vaivén, como las banderas).
//  'team' = se pinta del color del equipo al que anima esa grada.
// =============================================================
import * as THREE from 'three';
import { GRAD } from './models.js';

const TAU = Math.PI * 2, PI = Math.PI;
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// parte: geometría + color ('team' o hex) + transformación local · opt: glow (sin luz), alpha (transparente)
const part = (geom, color, local, opt = {}) => ({ geom, color, local, ...opt });

// medidas del aficionado (escala 1): cápsula de 0 a 0.62, ojos a 0.47, frente hacia +z
const HEAD = 0.5, EYE = 0.47;
const G = {
  dome: () => new THREE.SphereGeometry(0.215, 14, 8, 0, TAU, 0, PI / 2),
  ball: r => new THREE.SphereGeometry(r, 10, 8),
  cyl: (r1, r2, h, s = 10) => new THREE.CylinderGeometry(r1, r2, h, s),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  torus: (r, t, arc = TAU) => new THREE.TorusGeometry(r, t, 6, 20, arc),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
};

const DEFS = {
  // ---- cabeza ----
  beanie: { slot: 'head', parts: () => [part(G.dome(), 'team', M4(0, HEAD, 0, 0, 0, 0, 1.03, 1.1, 1.03)), part(G.ball(0.055), 0xffffff, M4(0, HEAD + 0.24, 0)), part(G.torus(0.21, 0.035), 0xffffff, M4(0, HEAD + 0.01, 0, PI / 2))] },
  earmuffs: { slot: 'head', parts: () => [part(G.ball(0.07), 'team', M4(-0.205, EYE, 0)), part(G.ball(0.07), 'team', M4(0.205, EYE, 0)), part(G.torus(0.2, 0.014, PI), 0x2a2140, M4(0, EYE, 0))] },
  horns: { slot: 'head', parts: () => [part(G.cone(0.045, 0.16), 0xd6281c, M4(-0.1, 0.62, 0.02, 0, 0, 0.45)), part(G.cone(0.045, 0.16), 0xd6281c, M4(0.1, 0.62, 0.02, 0, 0, -0.45))] },
  feathers: { slot: 'head', parts: () => [-0.5, -0.25, 0, 0.25, 0.5].map((a, k) => part(G.cone(0.035, 0.3), k % 2 ? 0xffc629 : 'team', M4(Math.sin(a) * 0.16, 0.66 + Math.cos(a) * 0.08, -0.04, 0, 0, -a, 1, 1, 0.5))) },
  strawhat: { slot: 'head', parts: () => [part(G.cyl(0.32, 0.32, 0.02, 18), 0xe6c27a, M4(0, 0.56, 0)), part(G.cyl(0.14, 0.17, 0.12, 14), 0xe6c27a, M4(0, 0.63, 0)), part(G.cyl(0.172, 0.172, 0.03, 14), 'team', M4(0, 0.585, 0))] },
  headband: { slot: 'head', parts: () => [part(G.torus(0.205, 0.03), 'team', M4(0, 0.55, 0, PI / 2))] },
  laurel: { slot: 'head', parts: () => [part(G.torus(0.2, 0.025), 0x4caf50, M4(0, 0.57, 0, PI / 2 - 0.15)), part(G.ball(0.03), 0xffc629, M4(0, 0.6, -0.19))] },
  hardhat: { slot: 'head', parts: () => [part(G.dome(), 0xffc629, M4(0, HEAD + 0.02, 0, 0, 0, 0, 1.05, 0.95, 1.05)), part(G.cyl(0.25, 0.25, 0.02, 16), 0xffc629, M4(0, HEAD + 0.02, 0.03)), part(G.box(0.03, 0.06, 0.3), 'team', M4(0, HEAD + 0.2, 0))] },
  bubble: { slot: 'head', parts: () => [part(G.ball(0.3), 0xcfefff, M4(0, 0.4, 0), { alpha: 0.28 }), part(G.torus(0.2, 0.03), 'team', M4(0, 0.16, 0, PI / 2))] },
  antenna: { slot: 'head', parts: () => [part(G.cyl(0.008, 0.008, 0.22, 5), 0x2a2140, M4(0.06, 0.72, 0, 0, 0, -0.2)), part(G.ball(0.04), 'team', M4(0.085, 0.84, 0), { glow: true })] },
  jelly: { slot: 'head', parts: () => [part(G.dome(), 0xff9ad5, M4(0, HEAD + 0.04, 0, 0, 0, 0, 1.1, 0.9, 1.1), { alpha: 0.6 }), ...[0, 1, 2, 3].map(k => part(G.cyl(0.01, 0.006, 0.14, 4), 0xff9ad5, M4(Math.cos(k * 1.6) * 0.14, HEAD - 0.02, Math.sin(k * 1.6) * 0.14), { alpha: 0.6 }))] },
  headphones: { slot: 'head', parts: () => [part(G.torus(0.22, 0.02, PI), 0x2a2140, M4(0, EYE + 0.02, 0)), part(G.cyl(0.065, 0.065, 0.05, 12), 'team', M4(-0.22, EYE, 0, 0, 0, PI / 2)), part(G.cyl(0.065, 0.065, 0.05, 12), 'team', M4(0.22, EYE, 0, 0, 0, PI / 2))] },
  neonband: { slot: 'head', parts: () => [part(G.torus(0.21, 0.022), 'team', M4(0, 0.56, 0, PI / 2), { glow: true })] },
  // ---- ojos ----
  shades: { slot: 'eyes', parts: () => [part(G.box(0.26, 0.065, 0.03), 0x1a1238, M4(0, EYE, 0.2))] },
  snorkel: { slot: 'eyes', parts: () => [part(G.box(0.26, 0.09, 0.04), 'team', M4(0, EYE, 0.2)), part(G.cyl(0.015, 0.015, 0.3, 6), 0xffc629, M4(0.17, 0.6, 0.12))] },
  // ---- cuello ----
  scarf: { slot: 'neck', parts: () => [part(G.torus(0.2, 0.045), 'team', M4(0, 0.36, 0, PI / 2)), part(G.box(0.07, 0.16, 0.03), 'team', M4(0.08, 0.27, 0.2, 0, 0, 0.15))] },
  medal: { slot: 'neck', parts: () => [part(G.torus(0.19, 0.012), 'team', M4(0, 0.33, 0.02, PI / 2 + 0.4)), part(G.cyl(0.04, 0.04, 0.012, 12), 0xffc629, M4(0, 0.25, 0.2, PI / 2))] },
  // ---- cintura ----
  swimring: { slot: 'waist', parts: () => [part(G.torus(0.24, 0.065), 'team', M4(0, 0.2, 0, PI / 2))] },
  // ---- mano (sigue el vaivén) ----
  foamhand: { slot: 'hand', parts: () => [part(G.cyl(0.008, 0.008, 0.3, 5), 0x9c6b43, M4(0, 0.05, 0)), part(G.box(0.11, 0.15, 0.04), 'team', M4(0, 0.26, 0)), part(G.box(0.035, 0.1, 0.04), 'team', M4(0.01, 0.38, 0))] },
  balloon: { slot: 'hand', parts: () => [part(G.cyl(0.004, 0.004, 0.45, 4), 0xffffff, M4(0, 0.2, 0)), part(G.ball(0.1), 'team', M4(0, 0.5, 0, 0, 0, 0, 1, 1.2, 1))] },
  tambourine: { slot: 'hand', parts: () => [part(G.torus(0.08, 0.018), 0xc48a3a, M4(0, 0.14, 0)), part(G.cyl(0.075, 0.075, 0.006, 14), 0xfff3dc, M4(0, 0.14, 0, PI / 2))] },
  trident: { slot: 'hand', parts: () => [part(G.cyl(0.01, 0.01, 0.6, 5), 0x2a2140, M4(0, 0.15, 0)), part(G.box(0.16, 0.02, 0.02), 'team', M4(0, 0.45, 0)), ...[-0.07, 0, 0.07].map(x => part(G.cone(0.018, 0.1, 4), 'team', M4(x, 0.5, 0)))] },
  umbrella: { slot: 'hand', parts: () => [part(G.cyl(0.008, 0.008, 0.5, 5), 0x2a2140, M4(0, 0.15, 0)), part(G.cone(0.24, 0.12, 10), 'team', M4(0, 0.42, 0))] },
  icecream: { slot: 'hand', parts: () => [part(G.cone(0.04, 0.12, 8), 0xd9a066, M4(0, 0.08, 0, PI)), part(G.ball(0.05), 'team', M4(0, 0.17, 0))] },
  glowstick: { slot: 'hand', parts: () => [part(G.cyl(0.015, 0.015, 0.24, 6), 'team', M4(0, 0.12, 0), { glow: true })] },
  flaghand: { slot: 'hand', parts: () => [part(G.cyl(0.008, 0.008, 0.5, 5), 0x9c6b43, M4(0, 0.05, 0)), part(new THREE.PlaneGeometry(0.3, 0.2), 'team', M4(0.15, 0.2, 0), { double: true })] },
};

// qué lleva el público en cada escenario: [pieza, probabilidad dentro de su hueco]
export const STAGE_FANS = {
  park: [['foamhand', 0.2], ['balloon', 0.15], ['headband', 0.2]],
  favela: [['feathers', 0.3], ['tambourine', 0.3], ['scarf', 0.2], ['flaghand', 0.2]],
  beach: [['strawhat', 0.35], ['shades', 0.45], ['swimring', 0.3], ['icecream', 0.25]],
  olympic: [['laurel', 0.2], ['headband', 0.25], ['foamhand', 0.3], ['medal', 0.2], ['flaghand', 0.2]],
  hell: [['horns', 0.6], ['trident', 0.45]],
  rooftop: [['hardhat', 0.3], ['shades', 0.3], ['umbrella', 0.3]],
  moon: [['bubble', 0.45], ['antenna', 0.3], ['flaghand', 0.2]],
  polar: [['beanie', 0.45], ['earmuffs', 0.2], ['scarf', 0.5]],
  sea: [['snorkel', 0.45], ['swimring', 0.35], ['jelly', 0.25]],
  neon: [['glowstick', 0.55], ['headphones', 0.3], ['neonband', 0.3], ['shades', 0.25]],
};

// Construye las mallas instanciadas para un escenario.
// fans: lista de aficionados (con f.roll[slot] estable) · devuelve { meshes, perFan, slots(i), recolor(cols) }
export function buildFanProps(group, stageId, fans) {
  const list = STAGE_FANS[stageId] || [];
  const bySlot = {};
  for (const [kind, p] of list) { const d = DEFS[kind]; if (!d) continue; (bySlot[d.slot] = bySlot[d.slot] || []).push([kind, p]); }
  // a cada aficionado, como mucho una pieza por hueco
  const assign = fans.map(f => {
    const a = {};
    for (const [slot, opts] of Object.entries(bySlot)) {
      let acc = 0; const r = f.roll[slot];
      for (const [kind, p] of opts) { acc += p; if (r < acc) { a[slot] = kind; break; } }
    }
    return a;
  });
  const meshes = [];
  for (const [slot, opts] of Object.entries(bySlot)) for (const [kind] of opts) {
    const who = []; assign.forEach((a, i) => { if (a[slot] === kind) who.push(i); });
    if (!who.length) continue;
    for (const pt of DEFS[kind].parts()) {
      const mat = pt.alpha ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: pt.alpha, depthWrite: false })
        : pt.glow ? new THREE.MeshBasicMaterial({ color: 0xffffff })
          : new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: GRAD, side: pt.double ? THREE.DoubleSide : THREE.FrontSide });
      const im = new THREE.InstancedMesh(pt.geom, mat, who.length);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
      const fixed = pt.color === 'team' ? null : new THREE.Color(pt.color);
      who.forEach((fi, j) => im.setColorAt(j, fixed || new THREE.Color(0xffffff)));
      group.add(im);
      meshes.push({ im, who, local: pt.local, hand: slot === 'hand', team: !fixed });
    }
  }
  return {
    meshes,
    head: i => !!assign[i].head, hand: i => !!assign[i].hand,
    recolor(cols) {
      for (const m of meshes) if (m.team) { m.who.forEach((fi, j) => m.im.setColorAt(j, cols[fans[fi].side])); m.im.instanceColor.needsUpdate = true; }
    },
  };
}

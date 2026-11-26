// =============================================================
//  ACCESORIOS DEL PÚBLICO por escenario
//  Objetos con detalle suficiente para reconocerse desde la pista
//  (sombrero con copa, ala y cinta; gafas con cristales, montura y
//  patillas; tridente con mango, travesaño y puntas con lengüeta…).
//  Cada objeto sale al azar por su cuenta: unos llevan uno, otros
//  varios y otros nada. 'team' = color del equipo de esa grada.
//  Todo instanciado: una llamada de dibujo por pieza.
// =============================================================
import * as THREE from 'three';
import { GRAD } from './models.js';

const TAU = Math.PI * 2, PI = Math.PI;
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const part = (geom, color, local, opt = {}) => ({ geom, color, local, ...opt });
const g = {
  ball: (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h),
  dome: (r, cut = PI / 2) => new THREE.SphereGeometry(r, 16, 9, 0, TAU, 0, cut),
  cyl: (r1, r2, h, s = 12, open = false) => new THREE.CylinderGeometry(r1, r2, h, s, 1, open),
  cone: (r, h, s = 8) => new THREE.ConeGeometry(r, h, s),
  torus: (r, t, arc = TAU, s = 24) => new THREE.TorusGeometry(r, t, 7, s, arc),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
};
// medidas del aficionado (escala 1): cápsula de 0 a 0.62, ojos a 0.47 (salen hasta z≈0.23), frente hacia +z
const EYE = 0.47, TOP = 0.62;
const INK = 0x1a1238, METAL = 0x9aa3b4, GOLD = 0xf2b632, WOOD = 0x9c6b43, STRAW = 0xe8c47c, WHITE = 0xffffff;

// ---- piezas reutilizables ----
// gafas: dos cristales, dos monturas, puente y patillas
const glasses = (frame, lens, { r = 0.062, y = EYE, z = 0.245, glow = false, lensAlpha = 0 } = {}) => [
  ...[-1, 1].map(s => part(g.cyl(r, r, 0.012, 16), lens, M4(s * 0.078, y, z, PI / 2), lensAlpha ? { alpha: lensAlpha } : {})),
  ...[-1, 1].map(s => part(g.torus(r, 0.013, TAU, 20), frame, M4(s * 0.078, y, z + 0.004), glow ? { glow: true } : {})),
  part(g.box(0.035, 0.014, 0.014), frame, M4(0, y + 0.012, z + 0.004), glow ? { glow: true } : {}),
  ...[-1, 1].map(s => part(g.box(0.012, 0.012, 0.2), frame, M4(s * 0.142, y + 0.01, z - 0.1), glow ? { glow: true } : {})),
];

const DEFS = {
  // ===================== PLAYA =====================
  strawhat: { slot: 'head', parts: () => [
    part(g.cyl(0.36, 0.38, 0.016, 26), STRAW, M4(0, 0.575, 0, 0.08)),                 // ala (un pelín inclinada)
    part(g.torus(0.37, 0.012, TAU, 30), 0xc9a25a, M4(0, 0.575, 0, PI / 2 + 0.08)),     // ribete del ala
    part(g.cyl(0.15, 0.18, 0.14, 18), STRAW, M4(0, 0.655, 0)),                        // copa
    part(g.cyl(0.152, 0.152, 0.012, 18), 0xd8b26a, M4(0, 0.728, 0)),                  // tapa
    part(g.cyl(0.182, 0.182, 0.038, 18), 'team', M4(0, 0.605, 0)),                    // cinta
    part(g.ball(0.03), 'team', M4(0.17, 0.61, 0.06)), part(g.cone(0.025, 0.07, 6), 'team', M4(0.2, 0.585, 0.08, 0, 0, -0.9)),  // lazo
  ] },
  sunglasses: { slot: 'eyes', parts: () => glasses(INK, 0x22252e) },

  // ===================== INFIERNO =====================
  horns: { slot: 'head', parts: () => [-1, 1].flatMap(s => [
    part(g.torus(0.05, 0.012, TAU, 14), INK, M4(s * 0.11, 0.585, 0.03, PI / 2 - 0.3, 0, s * -0.4)),   // base
    part(g.cyl(0.042, 0.05, 0.07, 10), 0xc8231a, M4(s * 0.115, 0.615, 0.03, 0, 0, s * -0.45)),        // tramo 1
    part(g.cyl(0.03, 0.042, 0.07, 10), 0xd93a26, M4(s * 0.15, 0.67, 0.035, 0, 0, s * -0.75)),         // tramo 2 (se curva)
    part(g.cone(0.03, 0.09, 10), 0x2a0f0b, M4(s * 0.2, 0.715, 0.04, 0, 0, s * -1.1)),                 // punta oscura
  ]) },
  trident: { slot: 'hand', parts: () => [
    part(g.cyl(0.013, 0.013, 0.72, 6), 0x3a3a46, M4(0, 0.12, 0)),                       // asta
    part(g.cyl(0.02, 0.02, 0.12, 8), 'team', M4(0, -0.08, 0)),                          // empuñadura
    ...[-0.1, -0.06, -0.02].map(y => part(g.torus(0.021, 0.006, TAU, 10), INK, M4(0, y, 0, PI / 2))),
    part(g.torus(0.085, 0.014, PI, 16), GOLD, M4(0, 0.47, 0, PI)),                      // travesaño curvo
    part(g.cyl(0.012, 0.012, 0.16, 6), GOLD, M4(0, 0.55, 0)),
    ...[-0.085, 0.085].map(x => part(g.cyl(0.011, 0.011, 0.1, 6), GOLD, M4(x, 0.51, 0))),
    ...[-0.085, 0, 0.085].map(x => part(g.cone(0.024, 0.08, 4), GOLD, M4(x, x ? 0.6 : 0.665, 0))),   // puntas
    ...[-1, 1].map(s => part(g.cone(0.012, 0.04, 4), GOLD, M4(s * 0.105, 0.57, 0, 0, 0, s * 0.9))),  // lengüetas
  ] },

  // ===================== FAVELA =====================
  partyglasses: { slot: 'eyes', parts: () => [...glasses('team', 0xffc629, { r: 0.07, lensAlpha: 0.75 }), part(g.box(0.3, 0.02, 0.02), WHITE, M4(0, EYE + 0.075, 0.25))] },
  bigflag: { slot: 'hand', parts: () => [
    part(g.cyl(0.009, 0.009, 0.62, 6), WOOD, M4(0, 0.1, 0)),
    part(g.ball(0.022), GOLD, M4(0, 0.42, 0)),                                          // remate
    part(g.plane(0.36, 0.24), 'team', M4(0.18, 0.28, 0), { double: true }),             // tela
    part(g.box(0.36, 0.05, 0.004), WHITE, M4(0.18, 0.28, 0.003, 0, 0, 0.25)),          // franja
    part(g.cyl(0.04, 0.04, 0.006, 16), 0xffc629, M4(0.18, 0.28, 0.006, PI / 2)),        // emblema
  ] },

  // ===================== POLO NORTE =====================
  beanie: { slot: 'head', parts: () => [
    part(g.dome(0.218), 'team', M4(0, 0.5, 0, 0, 0, 0, 1, 1.12, 1)),
    ...[0.08, 0.15].map(dy => part(g.torus(0.205 - dy * 0.55, 0.008, TAU, 24), 0x000000, M4(0, 0.5 + dy, 0, PI / 2), { alpha: 0.18 })),   // canalé
    part(g.torus(0.215, 0.042, TAU, 26), WHITE, M4(0, 0.51, 0, PI / 2)),               // vuelta
    part(g.ball(0.07, 12, 10), WHITE, M4(0, 0.77, 0)),                                 // pompón
  ] },
  scarf: { slot: 'neck', parts: () => [
    part(g.torus(0.205, 0.05, TAU, 24), 'team', M4(0, 0.35, 0, PI / 2)),
    part(g.box(0.08, 0.2, 0.035), 'team', M4(0.07, 0.24, 0.205, 0.1, 0, 0.12)),
    part(g.box(0.08, 0.17, 0.035), 'team', M4(-0.03, 0.25, 0.215, 0.12, 0, -0.08)),
    ...[0.2, 0.28].map(y => part(g.box(0.082, 0.018, 0.037), WHITE, M4(0.07 - (0.28 - y) * 0.03, y, 0.206, 0.1, 0, 0.12))),   // rayas
    ...[-0.024, 0, 0.024].map(x => part(g.box(0.008, 0.035, 0.01), WHITE, M4(0.06 + x, 0.125, 0.21, 0.1, 0, 0.12))),           // flecos
  ] },

  // ===================== PARQUE =====================
  cap: { slot: 'head', parts: () => [part(g.dome(0.215), 'team', M4(0, 0.5, 0)), part(g.cyl(0.19, 0.19, 0.014, 16, false), 'team', M4(0, 0.505, 0.15, 0, 0, 0, 1, 1, 0.6)), part(g.ball(0.025), WHITE, M4(0, 0.716, 0))] },
  foamhand: { slot: 'hand', parts: () => [
    part(g.cyl(0.009, 0.009, 0.3, 5), WOOD, M4(0, 0.02, 0)),
    part(g.box(0.13, 0.13, 0.05), 'team', M4(0, 0.22, 0)),                             // palma
    part(new THREE.CapsuleGeometry(0.026, 0.12, 4, 8), 'team', M4(0.02, 0.38, 0)),     // índice levantado
    part(new THREE.CapsuleGeometry(0.022, 0.05, 4, 8), 'team', M4(-0.085, 0.25, 0, 0, 0, 0.9)),   // pulgar
    part(g.box(0.1, 0.02, 0.052), WHITE, M4(0, 0.17, 0)),                              // franja
  ] },
  balloon: { slot: 'hand', parts: () => [part(g.cyl(0.004, 0.004, 0.5, 4), WHITE, M4(0, 0.22, 0)), part(g.ball(0.11, 14, 10), 'team', M4(0, 0.56, 0, 0, 0, 0, 1, 1.22, 1)), part(g.cone(0.02, 0.035, 6), 'team', M4(0, 0.43, 0, PI)), part(g.ball(0.025), WHITE, M4(-0.04, 0.62, 0.07))] },

  // ===================== ESTADIO =====================
  laurel: { slot: 'head', parts: () => [part(g.torus(0.2, 0.012, TAU, 24), 0x3d7a33, M4(0, 0.57, 0, PI / 2 - 0.12)),
    ...Array.from({ length: 14 }, (_, k) => { const a = (k / 14) * TAU; if (Math.abs(Math.cos(a) - 1) < 0.15) return null; return part(g.ball(0.04, 8, 6), k % 2 ? 0x5fb84d : 0x4a9b3c, M4(Math.sin(a) * 0.2, 0.575 - Math.cos(a) * 0.024, Math.cos(a) * 0.2, 0.3, a, 0.5, 1, 0.42, 0.62)); }).filter(Boolean)] },
  torch: { slot: 'hand', parts: () => [
    part(g.cyl(0.035, 0.016, 0.26, 10), 0xc9ccd6, M4(0, 0.1, 0)),                      // mango
    part(g.cyl(0.06, 0.035, 0.06, 12), GOLD, M4(0, 0.26, 0)),                          // copa
    part(g.cone(0.05, 0.16, 10), 0xff7a1f, M4(0, 0.37, 0), { glow: true }),            // llama
    part(g.cone(0.028, 0.1, 8), 0xffe066, M4(0, 0.35, 0.01), { glow: true }),
  ] },
  medal: { slot: 'neck', parts: () => [part(g.torus(0.19, 0.012, TAU, 24), 'team', M4(0, 0.33, 0.02, PI / 2 + 0.4)), part(g.cyl(0.045, 0.045, 0.014, 16), GOLD, M4(0, 0.24, 0.21, PI / 2)), part(g.ball(0.016), 0xffe9a0, M4(0, 0.24, 0.222))] },

  // ===================== AZOTEA =====================
  hardhat: { slot: 'head', parts: () => [
    part(g.dome(0.225), 0xffc629, M4(0, 0.5, 0, 0, 0, 0, 1, 0.95, 1)),
    part(g.cyl(0.26, 0.26, 0.018, 20), 0xffc629, M4(0, 0.505, 0.03, 0, 0, 0, 1, 1, 1.12)),
    part(g.box(0.045, 0.05, 0.42), 0xf0b000, M4(0, 0.69, 0, 0, 0, 0, 1, 1, 1)),      // cresta
    part(g.torus(0.2, 0.02, TAU, 24), 'team', M4(0, 0.56, 0, PI / 2)),                 // franja reflectante
  ] },
  umbrella: { slot: 'hand', parts: () => [
    part(g.cyl(0.008, 0.008, 0.52, 5), 0x3a3a46, M4(0, 0.16, 0)),
    part(g.torus(0.035, 0.008, PI, 10), 0x3a3a46, M4(-0.035, -0.1, 0, 0, 0, PI)),     // mango en J
    part(g.cone(0.27, 0.13, 8), 'team', M4(0, 0.47, 0)),                               // tela
    ...Array.from({ length: 8 }, (_, k) => part(g.ball(0.012, 6, 4), WHITE, M4(Math.cos(k * TAU / 8 + PI / 8) * 0.27, 0.405, Math.sin(k * TAU / 8 + PI / 8) * 0.27))),   // puntas de las varillas
    part(g.cone(0.012, 0.06, 6), 0x3a3a46, M4(0, 0.56, 0)),
  ] },

  // ===================== LUNA =====================
  spacehelmet: { slot: 'head', parts: () => [
    part(g.ball(0.31, 18, 14), 0xcfefff, M4(0, 0.41, 0.01), { alpha: 0.25 }),
    part(g.torus(0.21, 0.04, TAU, 24), 'team', M4(0, 0.15, 0, PI / 2)),               // cuello
    part(g.cyl(0.007, 0.007, 0.16, 5), METAL, M4(0.16, 0.74, 0, 0, 0, -0.35)),        // antena
    part(g.ball(0.026), 'team', M4(0.195, 0.81, 0), { glow: true }),
    part(g.box(0.08, 0.035, 0.01), WHITE, M4(-0.12, 0.6, 0.24, 0, -0.4, 0.4), { alpha: 0.5 }),   // brillo del cristal
  ] },
  moonflag: { slot: 'hand', parts: () => [part(g.cyl(0.008, 0.008, 0.6, 5), METAL, M4(0, 0.1, 0)), part(g.cyl(0.006, 0.006, 0.3, 5), METAL, M4(0.15, 0.4, 0, 0, 0, PI / 2)), part(g.plane(0.3, 0.2), 'team', M4(0.15, 0.3, 0), { double: true }), part(g.ball(0.035), WHITE, M4(0.1, 0.32, 0.004, 0, 0, 0, 1, 1, 0.2))] },

  // ===================== MAR =====================
  divemask: { slot: 'eyes', parts: () => [
    part(g.torus(0.1, 0.022, TAU, 22), 'team', M4(0, EYE + 0.01, 0.24, 0, 0, 0, 1.25, 0.8, 1)),   // marco
    part(g.cyl(0.098, 0.098, 0.01, 22), 0xbfe9ff, M4(0, EYE + 0.01, 0.245, PI / 2, 0, 0, 1.25, 1, 0.8), { alpha: 0.55 }),
    part(g.torus(0.205, 0.016, TAU, 24), INK, M4(0, EYE + 0.02, 0, PI / 2)),           // cinta
    part(g.cyl(0.016, 0.016, 0.28, 6), 0xffc629, M4(0.2, 0.6, 0.08)),                  // tubo
    part(g.torus(0.03, 0.016, PI, 8), 0xffc629, M4(0.17, 0.46, 0.08, 0, 0, PI)),
    part(g.cyl(0.026, 0.026, 0.03, 8), 0xff5a3d, M4(0.2, 0.75, 0.08)),
  ] },
  swimring: { slot: 'waist', parts: () => [0, 1, 2, 3].map(k => part(g.torus(0.25, 0.07, PI / 2, 8), k % 2 ? WHITE : 'team', M4(0, 0.2, 0, PI / 2, 0, k * PI / 2))) },

  // ===================== DISCOTECA =====================
  glowsticks: { slot: 'hand', parts: () => [
    part(g.cyl(0.016, 0.016, 0.26, 8), 'team', M4(0, 0.15, 0, 0, 0, 0.35), { glow: true }),
    part(g.cyl(0.016, 0.016, 0.26, 8), 0xffc629, M4(0.03, 0.15, 0.02, 0, 0, -0.35), { glow: true }),
    part(g.cyl(0.019, 0.019, 0.03, 8), INK, M4(0.045, 0.03, 0, 0, 0, 0.35)),
  ] },
  headphones: { slot: 'head', parts: () => [
    part(g.torus(0.225, 0.022, PI, 18), INK, M4(0, EYE + 0.02, 0)),
    ...[-1, 1].flatMap(s => [part(g.cyl(0.075, 0.075, 0.06, 16), 'team', M4(s * 0.225, EYE, 0, 0, 0, PI / 2)), part(g.cyl(0.06, 0.06, 0.02, 14), INK, M4(s * 0.19, EYE, 0, 0, 0, PI / 2))]),
  ] },
  neonglasses: { slot: 'eyes', parts: () => glasses('team', 0x14082a, { glow: true }) },
};

// qué lleva el público en cada escenario: [objeto, probabilidad] (cada objeto se sortea por su cuenta)
export const STAGE_FANS = {
  park: [['cap', 0.35], ['foamhand', 0.25], ['balloon', 0.2]],
  favela: [['partyglasses', 0.45], ['bigflag', 0.45]],
  beach: [['strawhat', 0.5], ['sunglasses', 0.5]],
  olympic: [['laurel', 0.3], ['torch', 0.2], ['medal', 0.3]],
  hell: [['horns', 0.55], ['trident', 0.45]],
  rooftop: [['hardhat', 0.45], ['umbrella', 0.35]],
  moon: [['spacehelmet', 0.5], ['moonflag', 0.3]],
  polar: [['beanie', 0.55], ['scarf', 0.5]],
  sea: [['divemask', 0.5], ['swimring', 0.4]],
  neon: [['headphones', 0.4], ['neonglasses', 0.45], ['glowsticks', 0.5]],
};

export function buildFanProps(group, stageId, fans) {
  const list = (STAGE_FANS[stageId] || []).filter(([k]) => DEFS[k]);
  // cada objeto se sortea por separado (uno, varios o ninguno); dos objetos del mismo hueco nunca a la vez
  const assign = fans.map(f => {
    const a = {}, used = new Set();
    list.forEach(([kind, p], k) => {
      const slot = DEFS[kind].slot;
      const r = f.roll[slot] * 0.5 + ((f.phase * 7.13 + k * 3.7) % 1) * 0.5;   // tirada estable por aficionado y objeto
      if (!used.has(slot) && r < p) { a[kind] = true; used.add(slot); }
    });
    return a;
  });
  const meshes = [];
  for (const [kind] of list) {
    const who = []; assign.forEach((a, i) => { if (a[kind]) who.push(i); });
    if (!who.length) continue;
    const hand = DEFS[kind].slot === 'hand';
    for (const pt of DEFS[kind].parts()) {
      const mat = pt.alpha ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: pt.alpha, depthWrite: false })
        : pt.glow ? new THREE.MeshBasicMaterial({ color: 0xffffff })
          : new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: GRAD, side: pt.double ? THREE.DoubleSide : THREE.FrontSide });
      const im = new THREE.InstancedMesh(pt.geom, mat, who.length);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false;
      const fixed = pt.color === 'team' ? null : new THREE.Color(pt.color);
      who.forEach((fi, j) => im.setColorAt(j, fixed || new THREE.Color(0xffffff)));
      group.add(im);
      meshes.push({ im, who, local: pt.local, hand, team: !fixed });
    }
  }
  const has = slot => i => list.some(([k]) => assign[i][k] && DEFS[k].slot === slot);
  return {
    meshes, head: has('head'), hand: has('hand'),
    recolor(cols) { for (const m of meshes) if (m.team) { m.who.forEach((fi, j) => m.im.setColorAt(j, cols[fans[fi].side])); m.im.instanceColor.needsUpdate = true; } },
  };
}

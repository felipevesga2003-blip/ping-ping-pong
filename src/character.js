// =============================================================
//  FRIJOLITOS — personaje procedural personalizable
//  Cuerpo por perfil de torno (altura, complexión, barriga), ropa que
//  se adapta a la forma, cara expresiva (párpados, cejas, boca),
//  zapatillas, sombreros, gafas y animaciones de personalidad.
//  Interfaz: { root, sync(charState, dt, ballPos, time), setFirstPerson(on), dispose() }
// =============================================================
import * as THREE from 'three';
import { toon, sphere, cyl, capsule, box, outlineMat, darken, lighten } from './models.js';
import { SWING_DUR } from './config.js';

// ---------- Catálogo de personalización ----------
export const SKINS = ['#4da8ff', '#5fd3a4', '#ffd166', '#b39cff', '#ff9f6b', '#8bd450', '#f2eee6', '#6be0e8'];
export const SHIRT_COLORS = ['#ffc93c', '#ff5a6e', '#3ee0b0', '#ffffff', '#2d2366', '#ff8a3d', '#8b6cff', '#3b9bff'];
export const HEIGHTS = [[0.86, 'Bajito'], [1, 'Normal'], [1.12, 'Alto'], [1.24, 'Altísimo']];
export const WIDTHS = [[0.86, 'Delgado'], [1, 'Normal'], [1.16, 'Gordito'], [1.32, 'Rechoncho']];
export const SHIRTS = [['tee', 'Camiseta'], ['tank', 'Tirantes'], ['hoodie', 'Sudadera'], ['none', 'Sin ropa']];
export const HATS = [['none', 'Ninguno'], ['sprout', 'Brote'], ['band', 'Cinta'], ['cap', 'Gorra'], ['capback', 'Gorra al revés'],
  ['beanie', 'Gorro de lana'], ['propeller', 'Hélice'], ['tophat', 'Chistera'], ['crown', 'Corona']];
export const GLASSES = [['none', 'Ninguna'], ['sun', 'De sol'], ['round', 'Redondas']];
export const DEFAULT_LOOK = { name: 'Tú', skin: '#4da8ff', height: 1, width: 1, shirt: 'tee', shirtColor: '#ffc93c', hat: 'capback', glasses: 'none', number: 7 };
export const CPU_SHIRT = '#ff5a6e';

// Color del rival: complementario (tono opuesto en el círculo cromático),
// con saturación/luminosidad de equipación para que siempre contraste.
export function rivalColor(hex) {
  const hsl = {}; new THREE.Color(hex).getHSL(hsl);
  if (hsl.s < 0.25 || hsl.l > 0.9 || hsl.l < 0.22) return hsl.l > 0.5 ? '#ff5a6e' : '#ffc93c';   // neutros
  const c = new THREE.Color().setHSL((hsl.h + 0.5) % 1, Math.max(hsl.s, 0.78), Math.min(0.55, Math.max(0.5, hsl.l)));
  return '#' + c.getHexString();
}
// Distancia de tono (0..0.5) entre dos colores
export function hueDist(a, b) {
  const ha = {}, hb = {}; new THREE.Color(a).getHSL(ha); new THREE.Color(b).getHSL(hb);
  const d = Math.abs(ha.h - hb.h); return Math.min(d, 1 - d);
}
// Aspecto del rival para un partido: equipación opuesta y piel que no se confunda con ella
export function cpuLookFor(idx, playerShirt) {
  const base = CPU_LOOKS[idx], shirt = rivalColor(playerShirt);
  let skin = base.skin;
  if (hueDist(skin, shirt) < 0.09 || hueDist(skin, playerShirt) < 0.05) {
    skin = SKINS.reduce((best, s) => Math.min(hueDist(s, shirt), hueDist(s, playerShirt)) > Math.min(hueDist(best, shirt), hueDist(best, playerShirt)) ? s : best, SKINS[0]);
  }
  return { ...base, shirtColor: shirt, skin };
}
// Un rival con personalidad propia por dificultad
export const CPU_LOOKS = [
  { name: 'Chícharo', skin: '#8bd450', height: 0.86, width: 1.16, shirt: 'tee', shirtColor: CPU_SHIRT, hat: 'propeller', glasses: 'none', number: 1 },
  { name: 'Lenteja', skin: '#ff9f6b', height: 1, width: 1, shirt: 'tank', shirtColor: CPU_SHIRT, hat: 'cap', glasses: 'none', number: 4 },
  { name: 'Garbanzo', skin: '#b39cff', height: 1.12, width: 0.86, shirt: 'tee', shirtColor: CPU_SHIRT, hat: 'band', glasses: 'sun', number: 9 },
  { name: 'Don Frijol', skin: '#ffd166', height: 1.12, width: 1.32, shirt: 'hoodie', shirtColor: CPU_SHIRT, hat: 'crown', glasses: 'round', number: 10 },
];
export function randomLook(name = 'Tú') {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  return {
    name, skin: pick(SKINS), height: pick(HEIGHTS)[0], width: pick(WIDTHS)[0], shirt: pick(SHIRTS.slice(0, 3))[0],
    shirtColor: pick(SHIRT_COLORS), hat: pick(HATS)[0], glasses: Math.random() < 0.35 ? pick(GLASSES.slice(1))[0] : 'none',
    number: 1 + Math.floor(Math.random() * 99),
  };
}

const INK = 0x1a1238;
const FOOT = 0.1;   // altura del cuerpo sobre el suelo (las zapatillas van debajo)

// Perfil de frijol: r(s), s ∈ [0,1] de abajo arriba
function profileR(s, R, belly) {
  return R * Math.pow(Math.max(0, Math.sin(Math.PI * s)), 0.42) * (1 - 0.12 * s + belly * Math.exp(-(((s - 0.3) / 0.2) ** 2)));
}
function lathe(H, R, belly, { t = 0, s0 = 0, s1 = 1, extra = 0, n = 40 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + (s1 - s0) * (i / n);
    const pole = (s0 === 0 && i === 0) || (s1 === 1 && i === n);
    const r = pole ? 0.0001 : profileR(s, R, belly) + t + extra;
    const full = s0 === 0 && s1 === 1;
    pts.push(new THREE.Vector2(r, full ? -t + s * (H + 2 * t) : s * H));
  }
  return new THREE.LatheGeometry(pts, 44);
}

function numberTexture(num, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.font = 'italic 900 150px Rubik, "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 22; g.strokeStyle = '#1a1238'; g.strokeText(String(num), 128, 140);
  g.fillStyle = color; g.fillText(String(num), 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCharacter(look, { rotationY = 0 } = {}) {
  look = { ...DEFAULT_LOOK, ...look };
  const owned = [];                                   // geometrías/materiales propios (para liberar)
  const own = o => { owned.push(o); return o; };
  const mesh = (g, m, shadow = true) => { const x = new THREE.Mesh(g, m); x.castShadow = shadow; x.receiveShadow = true; return x; };

  const H = 1.08 * look.height, R = 0.31 * look.width, belly = 0.05 + (look.width - 1) * 0.28;
  const surf = s => profileR(s, R, belly);
  const skinHex = new THREE.Color(look.skin).getHex();
  const shirtHex = new THREE.Color(look.shirtColor).getHex();
  const shirtDark = darken(shirtHex, 0.25);
  const lightShirt = new THREE.Color(shirtHex).getHSL({}).l > 0.75;

  const root = new THREE.Group(); root.rotation.y = rotationY;
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Group(); torso.position.y = FOOT; body.add(torso);

  // ---- Cuerpo ----
  torso.add(mesh(own(lathe(H, R, belly)), toon(skinHex)));
  torso.add(new THREE.Mesh(own(lathe(H, R, belly, { t: 0.022 })), outlineMat));
  // barriguita más clara
  const bellyPatch = mesh(own(new THREE.SphereGeometry(R * 0.62, 24, 16)), toon(lighten(skinHex, 0.4)), false);
  bellyPatch.scale.set(1, 1.1, 0.35); bellyPatch.position.set(0, H * 0.32, surf(0.32) - R * 0.62 * 0.35 + 0.012);

  // ---- Ropa ----
  const shorts = mesh(own(lathe(H, R, belly, { s0: 0.06, s1: 0.22, extra: 0.012, n: 10 })), toon(0x2c3a66));
  torso.add(shorts);
  const shortsHem = mesh(own(new THREE.TorusGeometry(surf(0.06) + 0.012, 0.014, 8, 40)), toon(0x22305a), false);
  shortsHem.rotation.x = Math.PI / 2; shortsHem.position.y = H * 0.06; torso.add(shortsHem);

  let neckS = 0;
  if (look.shirt !== 'none') {
    const s0 = look.shirt === 'hoodie' ? 0.15 : 0.19;
    const s1 = look.shirt === 'tank' ? 0.5 : look.shirt === 'hoodie' ? 0.6 : 0.55;
    neckS = s1;
    torso.add(mesh(own(lathe(H, R, belly, { s0, s1, extra: 0.016, n: 18 })), toon(shirtHex)));
    for (const [s, w] of [[s0, 0.016], [s1, look.shirt === 'hoodie' ? 0.03 : 0.018]]) {
      const ring = mesh(own(new THREE.TorusGeometry(surf(s) + 0.016, w, 8, 44)), toon(shirtDark), false);
      ring.rotation.x = Math.PI / 2; ring.position.y = H * s; torso.add(ring);
    }
    // franja en el pecho (camiseta deportiva)
    if (look.shirt === 'tee') {
      const s = 0.4, band = mesh(own(new THREE.TorusGeometry(surf(s) + 0.02, 0.022, 8, 44)), toon(lightShirt ? 0x2d2366 : 0xffffff), false);
      band.rotation.x = Math.PI / 2; band.position.y = H * s; band.scale.z = 0.6; torso.add(band);
    }
    if (look.shirt === 'tank') {
      for (const sx of [-1, 1]) {   // tirantes
        const strap = mesh(own(new THREE.TorusGeometry(R * 0.5, 0.025, 8, 24, Math.PI)), toon(shirtHex), false);
        strap.rotation.y = Math.PI / 2; strap.position.set(sx * R * 0.42, H * 0.5, 0); strap.scale.set(1, 0.55, 1);
        torso.add(strap);
      }
    }
    if (look.shirt === 'hoodie') {
      // capucha caída a la espalda, bolsillo y cordones
      const hood = mesh(own(new THREE.TorusGeometry(surf(0.6) * 0.85, 0.07, 10, 30, Math.PI * 1.2)), toon(shirtHex));
      hood.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI * 0.9); hood.position.set(0, H * 0.6, -0.04); torso.add(hood);
      const pocket = mesh(own(new THREE.SphereGeometry(R * 0.5, 20, 12)), toon(shirtDark), false);
      pocket.scale.set(1, 0.45, 0.25); pocket.position.set(0, H * 0.3, surf(0.3) + 0.012); torso.add(pocket);
      for (const sx of [-1, 1]) {
        const cord = capsule(0.011, 0.08, 0xffffff, 0, false); cord.position.set(sx * 0.05, H * 0.55, surf(0.55) + 0.025); torso.add(cord);
      }
    }
    // número a la espalda (lo ves durante todo el partido)
    const numMat = own(new THREE.MeshBasicMaterial({ map: own(numberTexture(look.number, lightShirt ? '#2d2366' : '#ffffff')), transparent: true, depthWrite: false }));
    const sN = 0.38, rN = surf(sN) + 0.022;
    const num = new THREE.Mesh(own(new THREE.CylinderGeometry(rN, rN, H * 0.22, 20, 1, true, Math.PI - 0.6, 1.2)), numMat);
    num.position.y = H * sN; torso.add(num);
  }
  torso.add(bellyPatch);
  bellyPatch.visible = look.shirt === 'none' || look.shirt === 'tank';

  // ---- Cara (frente = +z) ----
  const sEye = 0.72, yEye = H * sEye, xEye = R * 0.37;
  const zAt = (s, x) => Math.sqrt(Math.max(0.0001, surf(s) ** 2 - x * x));
  const eyes = [];
  for (const sx of [-1, 1]) {
    const eg = new THREE.Group();
    eg.position.set(sx * xEye, yEye, zAt(sEye, xEye) - 0.03);
    torso.add(eg);
    const white = sphere(0.085, 0xffffff, 0.012, false); eg.add(white);
    const lid = mesh(own(new THREE.SphereGeometry(0.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon(skinHex), false);
    eg.add(lid);
    const pupil = sphere(0.038, INK, 0, false);
    const shine = sphere(0.012, 0xffffff, 0, false); shine.position.set(0.013, 0.015, 0.028); pupil.add(shine);
    eg.add(pupil);
    const brow = capsule(0.016, 0.07, INK, 0, false);
    brow.rotation.z = Math.PI / 2; brow.position.set(0, 0.125, 0.035); eg.add(brow);
    eyes.push({ eg, lid, pupil, brow, sx });
    const cheek = sphere(0.05, 0xff8fab, 0, false);
    cheek.scale.set(1, 0.65, 0.35); cheek.position.set(sx * R * 0.62, H * 0.6, zAt(0.6, R * 0.62) - 0.004); torso.add(cheek);
  }
  const yMouth = H * 0.58, zMouth = zAt(0.58, 0) - 0.004;
  const mouthMat = toon(INK);
  const smile = mesh(own(new THREE.TorusGeometry(0.048, 0.012, 8, 18, Math.PI)), mouthMat, false);
  smile.rotation.z = Math.PI; smile.position.set(0, yMouth + 0.02, zMouth);
  const frown = mesh(own(new THREE.TorusGeometry(0.042, 0.012, 8, 18, Math.PI)), mouthMat, false);
  frown.position.set(0, yMouth - 0.025, zMouth);
  const open = new THREE.Group(); open.position.set(0, yMouth, zMouth - 0.006);
  const openIn = mesh(own(new THREE.SphereGeometry(0.055, 18, 12)), mouthMat, false); openIn.scale.set(1.15, 0.85, 0.35); open.add(openIn);
  const tongue = mesh(own(new THREE.SphereGeometry(0.03, 12, 8)), toon(0xff6b8b), false); tongue.scale.set(1.2, 0.6, 0.4); tongue.position.set(0, -0.026, 0.01); open.add(tongue);
  torso.add(smile, frown, open);

  // ---- Gafas ----
  if (look.glasses !== 'none') {
    const gl = new THREE.Group(); torso.add(gl);
    for (const e of eyes) {
      const p = e.eg.position;
      if (look.glasses === 'sun') {
        const lens = box(0.15, 0.09, 0.03, 0x231a4a, 0.008, false); lens.position.set(p.x, p.y + 0.005, p.z + 0.085); gl.add(lens);
        const glare = box(0.04, 0.012, 0.005, 0xffffff, 0, false); glare.position.set(p.x - 0.03, p.y + 0.03, p.z + 0.1); glare.rotation.z = 0.5; gl.add(glare);
      } else {
        const ring = mesh(own(new THREE.TorusGeometry(0.075, 0.013, 8, 24)), toon(0xd9a066), false);
        ring.position.set(p.x, p.y, p.z + 0.08); gl.add(ring);
      }
    }
    const bridge = box(xEye * 2 - 0.15, 0.016, 0.016, look.glasses === 'sun' ? 0x231a4a : 0xd9a066, 0, false);
    bridge.position.set(0, yEye + 0.02, zAt(sEye, 0) + 0.05); gl.add(bridge);
    for (const sx of [-1, 1]) {
      const arm = box(0.012, 0.012, 0.2, look.glasses === 'sun' ? 0x231a4a : 0xd9a066, 0, false);
      arm.position.set(sx * (zAt(sEye, 0) * 0.86), yEye + 0.02, 0.06); gl.add(arm);
    }
  }

  // ---- Sombreros ----
  const sHat = 0.86, hatY = H * sHat, hatR = surf(sHat) + 0.012;
  const hat = new THREE.Group(); hat.position.y = hatY; torso.add(hat);
  let propeller = null;
  const hatCol = shirtHex;
  const dome = (r, col, scaleY = 1) => {
    const g = new THREE.Group();
    const m = mesh(own(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), toon(col)); m.scale.y = scaleY; g.add(m);
    const o = new THREE.Mesh(own(new THREE.SphereGeometry(r + 0.018, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), outlineMat); o.scale.y = scaleY; g.add(o);
    return g;
  };
  switch (look.hat) {
    case 'sprout': {
      const stem = cyl(0.012, 0.012, 0.1, 0x3a8f4e, 0.008, false); stem.position.y = H - hatY + 0.05; hat.add(stem);
      const leaf = sphere(0.05, 0x5fd36e, 0.01, false); leaf.scale.set(1.4, 0.45, 0.8); leaf.position.set(0.04, H - hatY + 0.1, 0); leaf.rotation.z = 0.4; hat.add(leaf);
      break;
    }
    case 'band': {
      const b = mesh(own(new THREE.TorusGeometry(hatR, 0.036, 10, 40)), toon(hatCol)); b.rotation.x = Math.PI / 2; b.position.y = -0.02; hat.add(b);
      const knot = sphere(0.04, hatCol, 0.01, false); knot.position.set(0, -0.02, -hatR); hat.add(knot);
      for (const sx of [-1, 1]) { const tail = box(0.04, 0.12, 0.012, hatCol, 0.006, false); tail.position.set(sx * 0.03, -0.08, -hatR - 0.02); tail.rotation.z = sx * 0.35; hat.add(tail); }
      break;
    }
    case 'cap': case 'capback': {
      const d = dome(hatR + 0.01, hatCol, 0.75); d.position.y = -0.03; hat.add(d);
      const dir = look.hat === 'cap' ? 1 : -1;
      const visor = cyl(0.15, 0.15, 0.02, darken(hatCol, 0.2), 0.01);
      visor.scale.set(1, 1, 0.75); visor.position.set(0, -0.02, dir * (hatR + 0.06)); visor.rotation.x = dir * 0.12; hat.add(visor);
      const btn = sphere(0.025, darken(hatCol, 0.2), 0.008, false); btn.position.y = (hatR + 0.01) * 0.75 - 0.03; hat.add(btn);
      break;
    }
    case 'beanie': {
      const d = dome(hatR + 0.015, hatCol, 1.2); d.position.y = -0.04; hat.add(d);
      const fold = mesh(own(new THREE.TorusGeometry(hatR + 0.015, 0.04, 10, 40)), toon(darken(hatCol, 0.15))); fold.rotation.x = Math.PI / 2; fold.position.y = -0.03; hat.add(fold);
      const pom = sphere(0.07, 0xffffff, 0.012); pom.position.y = (hatR + 0.015) * 1.2 - 0.01; hat.add(pom);
      break;
    }
    case 'propeller': {
      const d = dome(hatR * 0.75, hatCol, 0.8); d.position.y = (H - hatY) * 0.55; hat.add(d);
      const stem = cyl(0.012, 0.012, 0.1, 0xffc93c, 0.006, false); stem.position.y = (H - hatY) * 0.55 + hatR * 0.6 + 0.04; hat.add(stem);
      propeller = new THREE.Group(); propeller.position.y = stem.position.y + 0.05; hat.add(propeller);
      for (const [rot, col] of [[0, 0xff5a6e], [Math.PI / 2, 0x3b9bff]]) {
        const blade = box(0.24, 0.01, 0.045, col, 0.007, false); blade.rotation.y = rot; propeller.add(blade);
      }
      break;
    }
    case 'tophat': {
      const g = new THREE.Group(); g.position.y = H - hatY - 0.02; g.rotation.z = 0.14; hat.add(g);
      const brim = cyl(hatR * 1.1, hatR * 1.1, 0.025, INK, 0.012); g.add(brim);
      const crown = cyl(hatR * 0.72, hatR * 0.78, 0.3, INK, 0.015); crown.position.y = 0.16; g.add(crown);
      const band = cyl(hatR * 0.785, hatR * 0.79, 0.06, hatCol, 0, false); band.position.y = 0.05; g.add(band);
      break;
    }
    case 'crown': {
      const g = new THREE.Group(); g.position.y = H - hatY - 0.03; hat.add(g);
      const ring = cyl(hatR * 0.7, hatR * 0.66, 0.1, 0xffc93c, 0.012); ring.position.y = 0.05; g.add(ring);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = mesh(own(new THREE.ConeGeometry(0.035, 0.09, 8)), toon(0xffc93c));
        spike.position.set(Math.sin(a) * hatR * 0.68, 0.14, Math.cos(a) * hatR * 0.68); g.add(spike);
        const gem = sphere(0.018, i % 2 ? 0xff5a6e : 0x3b9bff, 0, false); gem.position.set(Math.sin(a) * hatR * 0.72, 0.05, Math.cos(a) * hatR * 0.72); g.add(gem);
      }
      break;
    }
    default: break;
  }

  // ---- Zapatillas ----
  const feet = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Group(); f.position.set(sx * Math.max(0.12, R * 0.45), 0.06, 0.03); root.add(f);
    const shoe = sphere(0.1, 0xffffff, 0.016); shoe.scale.set(1, 0.62, 1.45); f.add(shoe);
    const sole = cyl(0.1, 0.1, 0.03, shirtHex === 0xffffff ? 0x2d2366 : shirtHex, 0.012, false); sole.scale.set(1, 1, 1.45); sole.position.y = -0.04; f.add(sole);
    const lace = box(0.08, 0.012, 0.03, INK, 0, false); lace.position.set(0, 0.055, 0.06); f.add(lace);
    feet.push(f);
  }

  // ---- Brazos ----
  const shoulderY = FOOT + H * 0.5, shoulderX = R * 0.42;
  const armCol = look.shirt === 'hoodie' ? shirtHex : skinHex;
  const ghostArm = toon(armCol).clone(), ghostHand = toon(skinHex).clone(), ghostLine = outlineMat.clone();
  owned.push(ghostArm, ghostHand, ghostLine);
  const armPivot = new THREE.Group(); armPivot.position.set(-shoulderX, shoulderY, 0); body.add(armPivot);
  const handPos = new THREE.Vector3(-0.4, 0, 0.1);
  const arm = capsule(0.047, 0.24, armCol, 0.016);
  arm.position.copy(handPos).multiplyScalar(0.5);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), handPos.clone().normalize());
  armPivot.add(arm);
  if (look.shirt === 'tee') {
    const sleeve = cyl(0.064, 0.07, 0.11, shirtHex, 0.014); sleeve.position.y = -0.1; arm.add(sleeve);
  }
  const hand = sphere(0.068, skinHex, 0.016); hand.position.copy(handPos); armPivot.add(hand);
  arm.children[0].material = ghostArm; arm.children[1].material = ghostLine;
  hand.children[0].material = ghostHand; hand.children[1].material = ghostLine;
  const paddle = new THREE.Group(); paddle.position.copy(handPos); armPivot.add(paddle);
  const handle = box(0.032, 0.11, 0.026, 0xd9a066, 0.008); handle.position.y = 0.05; paddle.add(handle);
  const blade = cyl(0.1, 0.1, 0.018, 0xf03e3e, 0.01); blade.rotation.x = Math.PI / 2; blade.position.y = 0.16; paddle.add(blade);
  const bladeBack = cyl(0.096, 0.096, 0.004, 0x222233, 0, false); bladeBack.rotation.x = Math.PI / 2; bladeBack.position.set(0, 0.16, -0.011); paddle.add(bladeBack);
  // brazo libre (el otro)
  const offPivot = new THREE.Group(); offPivot.position.set(shoulderX, shoulderY, 0); body.add(offPivot);
  const offPos = new THREE.Vector3(0.3, -0.18, 0.1);
  const offArm = capsule(0.045, 0.18, armCol, 0.016);
  offArm.position.copy(offPos).multiplyScalar(0.5);
  offArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), offPos.clone().normalize());
  offPivot.add(offArm);
  if (look.shirt === 'tee') { const sl = cyl(0.062, 0.068, 0.1, shirtHex, 0.014); sl.position.y = -0.08; offArm.add(sl); }
  const offHand = sphere(0.066, skinHex, 0.016); offHand.position.copy(offPos); offPivot.add(offHand);

  // ---------- Animación ----------
  const st = { walk: 0, blink: 1 + Math.random() * 3, armY: 0.3, armZ: 0, fp: false, wasFree: false, look: new THREE.Vector3(), lookT: 0, mouthT: 0, spin: 0, lidL: -1.2, browY: 0, browR: 0 };
  const tmp = new THREE.Vector3(), upV = new THREE.Vector3(), handL = new THREE.Vector3(), dirV = new THREE.Vector3();
  const Y_UP = new THREE.Vector3(0, 1, 0);
  const armRest = { pos: arm.position.clone(), quat: arm.quaternion.clone() };
  const ease = (cur, target, k) => cur + (target - cur) * Math.min(1, k);

  function setFirstPerson(on) {
    if (st.fp === on) return;
    st.fp = on;
    for (const ch of body.children) if (ch !== armPivot) ch.visible = !on;
    for (const f of feet) f.visible = !on;
    for (const m of [ghostArm, ghostHand, ghostLine]) {
      m.transparent = on; m.opacity = on ? (m === ghostLine ? 0.15 : 0.28) : 1;
      m.depthWrite = !on; m.needsUpdate = true;
    }
    arm.children[0].castShadow = hand.children[0].castShadow = !on;
  }

  function sync(c, dt, ball, t) {
    root.position.set(c.x, 0, c.z);
    const sp = Math.hypot(c.vx, c.vz);
    st.walk += sp * dt * 11;
    const flip = rotationY !== 0 ? -1 : 1;
    const lvx = c.vx * flip, lvz = c.vz * flip;
    const k10 = dt * 10;

    // Estado emocional
    const focus = c.charging || c.focus;
    const happy = c.mood > 0, sad = c.mood < 0;
    const celebrating = c.celebrate > 0;

    // Cuerpo: inclinación, botes, respiración, saltos, giro de celebración
    body.rotation.z = ease(body.rotation.z, -lvx * 0.07, k10);
    body.rotation.x = ease(body.rotation.x, lvz * 0.05 + (sad ? 0.16 : 0) + (c.charging ? 0.08 : 0), dt * 6);
    const jump = celebrating && happy ? Math.abs(Math.sin(c.celebrate * 7)) * 0.32 : 0;
    const breathe = Math.sin(t * 2.2 + c.idx) * 0.012;
    body.position.y = Math.abs(Math.sin(st.walk)) * 0.05 * Math.min(1, sp) + jump;
    const ch = c.charging ? c.charge : 0;
    const air = jump > 0.05 ? 0.07 : 0;
    const sadSquash = sad ? 0.04 : 0;
    body.scale.set(1 + 0.06 * ch - air * 0.5 + breathe * 0.5, 1 - 0.08 * ch + air + breathe - sadSquash, 1 + 0.06 * ch - air * 0.5 + breathe * 0.5);
    st.spin = celebrating && happy && c.celebrate > 0.9 ? (1.6 - c.celebrate) / 0.7 * Math.PI * 2 : 0;
    root.rotation.y = rotationY + st.spin;
    feet.forEach((f, i) => {
      const ph = st.walk + i * Math.PI;
      f.position.z = 0.03 + Math.sin(ph) * 0.07 * Math.min(1, sp);
      f.position.y = 0.06 + Math.max(0, Math.cos(ph)) * 0.05 * Math.min(1, sp) + jump * 0.6;
    });
    if (propeller) propeller.rotation.y += dt * (6 + sp * 10 + (celebrating ? 20 : 0));

    // Brazo con pala
    if (c.freeHand) {
      const fh = c.freeHand;
      armPivot.rotation.set(0, 0, 0);
      root.updateMatrixWorld(true);
      tmp.set(fh.x, fh.y, fh.z);
      armPivot.worldToLocal(tmp);
      paddle.rotation.set(Math.max(-0.7, Math.min(0.7, -fh.vy * 0.09)), 0, fh.roll * 0.55);
      upV.set(0, 0.16, 0).applyEuler(paddle.rotation);
      handL.copy(tmp).sub(upV);
      const L = Math.max(0.12, handL.length());
      hand.position.copy(handL); paddle.position.copy(handL);
      arm.position.copy(handL).multiplyScalar(0.5);
      arm.quaternion.setFromUnitVectors(Y_UP, dirV.copy(handL).normalize());
      const stretch = L / 0.42;
      const thin = Math.max(0.5, Math.min(1.1, 1 / Math.sqrt(stretch)));
      arm.scale.set(thin, L / 0.33, thin);
      hand.scale.setScalar(1 + Math.max(0, stretch - 1.2) * 0.08);
      st.wasFree = true;
    } else {
      if (st.wasFree) {
        arm.position.copy(armRest.pos); arm.quaternion.copy(armRest.quat); arm.scale.set(1, 1, 1);
        hand.position.copy(handPos); hand.scale.setScalar(1);
        paddle.position.copy(handPos); paddle.rotation.set(0, 0, 0);
        st.wasFree = false;
      }
      const back = c.swing > 0 ? c.backhand : (ball.x - c.x) * c.hand < -0.1;
      const wind = back ? 2.3 : -1.3, follow = back ? 0.2 : 1.6;
      const isBack = (c.swing > 0 ? c.swingType : c.chargeType) === 'back';
      const z0 = isBack ? -0.6 : 0.35, z1 = isBack ? 0.35 : -0.75;
      if (c.swing > 0) {
        const kk = Math.min(1, (1 - c.swing / SWING_DUR) * 1.7);
        const e = 1 - Math.pow(1 - kk, 3);
        st.armY = wind + (follow - wind) * e;
        st.armZ = z0 + (z1 - z0) * e;
      } else if (c.charging) {
        const kk = Math.min(1, 0.35 + c.charge * 1.6);
        st.armY += (wind - st.armY) * Math.min(1, dt * 14) * kk;
        st.armZ += (z0 - st.armZ) * Math.min(1, dt * 10);
      } else if (celebrating && happy) {
        st.armY = ease(st.armY, 0.4, dt * 8); st.armZ = ease(st.armZ, -1.6 + Math.sin(t * 14) * 0.25, dt * 10);   // pala en alto
      } else {
        st.armY = ease(st.armY, 0.3 + Math.sin(t * 1.3) * 0.05, dt * 6);
        st.armZ = ease(st.armZ, sad ? 0.5 : 0, dt * 6);
      }
      armPivot.rotation.y = st.armY; armPivot.rotation.z = st.armZ;
    }
    // brazo libre: balanceo, puño arriba al celebrar, caído si está triste
    const offTarget = celebrating && happy ? 2.3 + Math.sin(t * 16) * 0.3 : sad ? -0.35 : Math.sin(st.walk) * 0.35 * Math.min(1, sp) + Math.sin(t * 1.7) * 0.06;
    offPivot.rotation.z = ease(offPivot.rotation.z, offTarget, dt * 10);

    // Mirada: sigue la bola; si no hay juego, curiosea
    root.updateMatrixWorld();
    st.lookT -= dt;
    if (st.lookT <= 0) { st.lookT = 1.5 + Math.random() * 2.5; st.look.set((Math.random() - 0.5) * 3, 0.6 + Math.random(), c.z - c.sign * 3); }
    const target = Number.isFinite(ball.x) && ball.y > 0.05 ? ball : st.look;
    st.blink -= dt;
    let blink = 0;
    if (st.blink < 0.11) blink = 1;
    if (st.blink < 0) st.blink = 1.8 + Math.random() * 3.2;

    // Expresión: párpados, cejas, boca
    let lid = -1.25, lidTilt = 0, browY = 0, browR = 0;
    if (happy) { lid = -1.5; browY = 0.03; }
    else if (sad) { lid = -0.45; lidTilt = -0.35; browY = -0.01; browR = -0.35; }
    else if (c.charging || focus) { lid = -0.7; lidTilt = 0.32; browY = -0.02; browR = 0.45; }
    if (blink) lid = 1.2;
    st.lidL = ease(st.lidL, lid, blink ? 1 : dt * 18);
    st.browY = ease(st.browY, browY, dt * 12); st.browR = ease(st.browR, browR, dt * 12);
    for (const e of eyes) {
      tmp.copy(target); e.eg.worldToLocal(tmp); tmp.normalize();
      if (tmp.z < 0.45) { tmp.z = 0.45; tmp.normalize(); }
      e.pupil.position.copy(tmp).multiplyScalar(0.05);
      e.lid.rotation.set(st.lidL, 0, -e.sx * lidTilt);
      e.brow.position.y = 0.125 + st.browY;
      e.brow.rotation.set(0, 0, Math.PI / 2 - e.sx * st.browR);
    }
    st.mouthT = c.swing > 0 ? 0.3 : Math.max(0, st.mouthT - dt);
    const mouth = st.fp ? 'none' : happy ? 'open' : sad ? 'frown' : st.mouthT > 0 ? 'o' : 'smile';
    smile.visible = mouth === 'smile';
    frown.visible = mouth === 'frown';
    open.visible = mouth === 'open' || mouth === 'o';
    if (open.visible) open.scale.set(mouth === 'o' ? 0.6 : 1, mouth === 'o' ? 0.9 : 1, 1);
    tongue.visible = mouth === 'open';
  }

  function dispose() {
    root.removeFromParent();
    for (const o of owned) o.dispose && o.dispose();
  }

  return { root, sync, setFirstPerson, dispose, look };
}

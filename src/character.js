// =============================================================
//  FRIJOLITOS — personaje procedural personalizable
//  Cuerpo por perfil de torno (altura, complexión, barriga), ropa que
//  se adapta a la forma (con estampados), cara expresiva (10 tipos de ojos),
//  orejas, sombreros, gafas, complementos, raqueta, outfits y emotes.
//  Interfaz: { root, sync(c, dt, ballPos, time), setFirstPerson(on), setOpacity(o), dispose(), look }
// =============================================================
import * as THREE from 'three';
import { toon, sphere, cyl, capsule, box, outlineMat, darken, lighten } from './models.js';
import { SWING_DUR, TABLE_H, HALF_L, HALF_W } from './config.js';

// ---------- Catálogo de personalización ----------
export const SKINS = ['#4da8ff', '#5fd3a4', '#ffd166', '#b39cff', '#ff9f6b', '#8bd450', '#f2eee6', '#6be0e8', '#f4c6a5', '#8a5a3c', '#2b2b33', '#ff7eb6'];
export const SHIRT_COLORS = ['#ffc93c', '#ff5a6e', '#3ee0b0', '#ffffff', '#2d2366', '#ff8a3d', '#8b6cff', '#3b9bff', '#e0352b', '#2f5bd3', '#8a8f98', '#1c1c24'];
export const PANTS_COLORS = ['#2c3a66', '#1c1c24', '#e0352b', '#2f5bd3', '#6b4a2b', '#8a8f98', '#ffffff', '#3e7b3a'];
export const PADDLE_COLORS = ['#f03e3e', '#1c1c24', '#2f6bff', '#2fbf71', '#8b6cff', '#ff8a3d', '#ff5fb2', '#e8b931'];
export const HEIGHTS = [[0.86, 'Bajito'], [1, 'Normal'], [1.12, 'Alto'], [1.24, 'Altísimo']];
export const WIDTHS = [[0.86, 'Delgado'], [1, 'Normal'], [1.16, 'Gordito'], [1.32, 'Rechoncho']];
export const EYES = [['normal', 'Normales'], ['sleepy', 'Entrecerrados'], ['happy', 'Felices'], ['drunk', 'Borracho'], ['red', 'Rojos'],
  ['stars', 'Estrellas'], ['lashes', 'Pestañas'], ['cyclops', 'Cíclope'], ['dots', 'Puntitos'], ['angry', 'Furiosos']];
export const EARS = [['none', 'Ninguna'], ['cat', 'Gato'], ['bear', 'Oso'], ['bunny', 'Conejo'], ['elf', 'Elfo'], ['mouse', 'Ratón'], ['dog', 'Perro'], ['antenna', 'Antenas']];
export const SHIRTS = [['tee', 'Camiseta'], ['gi', 'Gi marcial'], ['spacesuit', 'Traje espacial'], ['tank', 'Tirantes'], ['hoodie', 'Sudadera'], ['polo', 'Polo'], ['hawaii', 'Hawaiana'], ['stripes', 'Rayas'],
  ['flannel', 'Cuadros'], ['track', 'Chándal'], ['leather', 'Cuero'], ['suit', 'Traje'], ['overalls', 'Peto'],
  ['karategi', 'Karategi'], ['ninjasuit', 'Traje ninja'], ['happi', 'Happi japonés'], ['jersey', 'Camiseta de fútbol'], ['labcoat', 'Bata de laboratorio'],
  ['apron', 'Delantal'], ['sailor', 'Marinero'], ['sweater', 'Jersey de rombos'], ['raincoat', 'Chubasquero'], ['hero', 'Superhéroe'], ['toga', 'Toga romana'], ['none', 'Sin ropa']];
export const PANTS = [['shorts', 'Cortos'], ['long', 'Largos'], ['cargo', 'Cargo'], ['buttons', 'Con botones'], ['skirt', 'Falda'],
  ['mawashi', 'Mawashi de sumo'], ['hakama', 'Hakama'], ['jeans', 'Vaqueros'], ['kilt', 'Falda escocesa'], ['tutu', 'Tutú']];
export const HATS = [['none', 'Ninguno'], ['sprout', 'Brote'], ['band', 'Cinta'], ['cap', 'Gorra'], ['capback', 'Gorra al revés'], ['beanie', 'Gorro de lana'],
  ['propeller', 'Hélice'], ['tophat', 'Chistera'], ['crown', 'Corona'], ['cowboy', 'Vaquero'], ['viking', 'Vikingo'], ['chef', 'Chef'], ['pirate', 'Pirata'],
  ['party', 'Fiesta'], ['halo', 'Aureola'], ['headphones', 'Cascos'], ['afro', 'Afro'], ['mohawk', 'Cresta'], ['buzz', 'Rapado'], ['spiky', 'Pelo de punta'], ['slick', 'Engominado'], ['helmet', 'Casco espacial'],
  ['topknot', 'Moño de sumo'], ['hachimaki', 'Hachimaki'], ['ninjahood', 'Capucha ninja'], ['kasa', 'Sombrero de paja'], ['sombrero', 'Sombrero mexicano'],
  ['wizard', 'Mago'], ['grad', 'Birrete'], ['beret', 'Boina'], ['santa', 'Gorro navideño'], ['unicorn', 'Unicornio'], ['flower', 'Corona de flores'], ['bucket', 'Gorro pescador'], ['laurel', 'Corona de laurel']];
export const GLASSES = [['none', 'Ninguna'], ['sun', 'De sol'], ['round', 'Redondas'], ['heart', 'Corazón'], ['patch', 'Parche'], ['ski', 'De esquí'], ['monocle', 'Monóculo'], ['3d', 'Gafas 3D'], ['star', 'Estrella']];
export const FACES = [['none', 'Nada'], ['mustache', 'Bigote'], ['beard', 'Barba'], ['mask', 'Antifaz'], ['ninja', 'Bandana'], ['ninjamask', 'Máscara ninja'], ['clown', 'Nariz de payaso'], ['surgical', 'Mascarilla'], ['goatee', 'Perilla']];
export const NECKS = [['none', 'Nada'], ['bowtie', 'Pajarita'], ['tie', 'Corbata'], ['chain', 'Cadena'], ['scarf', 'Bufanda'], ['medal', 'Medalla de oro'], ['lei', 'Collar de flores'], ['whistle', 'Silbato'], ['ruff', 'Gola']];
export const BACKS = [['none', 'Nada'], ['cape', 'Capa'], ['backpack', 'Mochila'], ['wings', 'Alas'], ['jetpack', 'Mochila cohete'], ['ninjablades', 'Dagas ninja'], ['katana', 'Katana'], ['guitar', 'Guitarra'], ['shell', 'Caparazón'], ['quiver', 'Carcaj'], ['surfboard', 'Tabla de surf']];

export const DEFAULT_LOOK = {
  name: 'Tú', skin: '#4da8ff', height: 1, width: 1, eyes: 'normal', ears: 'none', shirt: 'tee', shirtColor: '#ffc93c',
  pants: 'shorts', pantsColor: '#2c3a66', shoes: '#ffffff', hat: 'capback', hatColor: null, glasses: 'none', face: 'none', neck: 'none', back: 'none',
  accent: '#e0352b', hairColor: '#5b3a29', gloves: null, paddleType: 'balanced', paddleColor: '#f03e3e', number: 7,
};
export const CPU_SHIRT = '#ff5a6e';

// Outfits: referencias a estilos icónicos (sin logos), aplicables de un clic
export const OUTFITS = [
  { id: 'plumber', name: 'Fontanero', look: { shirt: 'overalls', shirtColor: '#2f5bd3', accent: '#e0352b', hat: 'cap', hatColor: '#e0352b', face: 'mustache', hairColor: '#3a2416', pants: 'long', pantsColor: '#2f5bd3', gloves: '#ffffff', skin: '#f4c6a5', eyes: 'normal', ears: 'none', glasses: 'none', neck: 'none', back: 'none' } },
  { id: 'newcomer', name: 'Recién llegado', look: { shirt: 'track', shirtColor: '#8a8f98', pants: 'cargo', pantsColor: '#3b3f46', hat: 'buzz', hairColor: '#3a2a22', face: 'none', skin: '#f4c6a5', eyes: 'sleepy', ears: 'none', glasses: 'none', neck: 'none', back: 'none', gloves: null } },
  { id: 'mouse', name: 'Ratoncito clásico', look: { skin: '#2b2b33', ears: 'mouse', shirt: 'none', pants: 'buttons', pantsColor: '#e0352b', gloves: '#ffffff', hat: 'none', eyes: 'normal', face: 'none', glasses: 'none', neck: 'none', back: 'none' } },
  { id: 'cowboy', name: 'Vaquero', look: { hat: 'cowboy', hatColor: '#8a5a2b', shirt: 'flannel', shirtColor: '#e0352b', pants: 'long', pantsColor: '#2f5bd3', neck: 'scarf', accent: '#e0352b', face: 'mustache', hairColor: '#6b4a2b', glasses: 'none', back: 'none', ears: 'none', gloves: null } },
  { id: 'pirate', name: 'Pirata', look: { hat: 'pirate', hatColor: '#1c1c24', shirt: 'stripes', shirtColor: '#e0352b', glasses: 'patch', face: 'beard', hairColor: '#3a2416', pants: 'long', pantsColor: '#6b4a2b', neck: 'none', back: 'none', ears: 'none', gloves: null } },
  { id: 'viking', name: 'Vikingo', look: { hat: 'viking', shirt: 'leather', shirtColor: '#6b4a2b', face: 'beard', hairColor: '#e07a2b', pants: 'long', pantsColor: '#3b3f46', back: 'cape', accent: '#8b2b2b', neck: 'none', glasses: 'none', ears: 'none', gloves: null } },
  { id: 'chef', name: 'Chef', look: { hat: 'chef', hatColor: '#ffffff', shirt: 'polo', shirtColor: '#ffffff', neck: 'scarf', accent: '#e0352b', face: 'mustache', hairColor: '#2b2420', pants: 'long', pantsColor: '#1c1c24', glasses: 'none', back: 'none', ears: 'none', gloves: null } },
  { id: 'hero', name: 'Superhéroe', look: { shirt: 'tee', shirtColor: '#2f5bd3', back: 'cape', accent: '#e0352b', face: 'mask', pants: 'shorts', pantsColor: '#e0352b', hat: 'none', glasses: 'none', neck: 'none', ears: 'none', gloves: '#e0352b' } },
  { id: 'punk', name: 'Rockero punk', look: { hat: 'mohawk', hairColor: '#ff5fb2', shirt: 'leather', shirtColor: '#1c1c24', neck: 'chain', glasses: 'sun', pants: 'long', pantsColor: '#1c1c24', eyes: 'angry', face: 'none', back: 'none', ears: 'none', gloves: null } },
  { id: 'tourist', name: 'Turista', look: { shirt: 'hawaii', shirtColor: '#3ee0b0', glasses: 'sun', hat: 'cap', hatColor: '#ffffff', back: 'backpack', accent: '#ff8a3d', pants: 'shorts', pantsColor: '#c9a46a', face: 'none', neck: 'none', ears: 'none', gloves: null } },
  { id: 'agent', name: 'Agente secreto', look: { shirt: 'suit', shirtColor: '#1c1c24', neck: 'tie', accent: '#1c1c24', glasses: 'sun', hat: 'buzz', hairColor: '#2b2420', pants: 'long', pantsColor: '#1c1c24', face: 'none', back: 'none', ears: 'none', gloves: null } },
  { id: 'ninja', name: 'Ninja', look: { shirt: 'tee', shirtColor: '#1c1c24', face: 'ninja', hat: 'band', hatColor: '#e0352b', pants: 'long', pantsColor: '#1c1c24', eyes: 'angry', glasses: 'none', neck: 'none', back: 'none', ears: 'none', gloves: '#1c1c24' } },
  { id: 'king', name: 'Rey', look: { hat: 'crown', shirt: 'suit', shirtColor: '#8b2b2b', back: 'cape', accent: '#8b2b2b', neck: 'chain', face: 'beard', hairColor: '#f2eee6', pants: 'long', pantsColor: '#2d2366', glasses: 'none', ears: 'none', gloves: null } },
  { id: 'angel', name: 'Angelito', look: { hat: 'halo', shirt: 'tee', shirtColor: '#ffffff', back: 'wings', eyes: 'happy', pants: 'shorts', pantsColor: '#ffffff', face: 'none', glasses: 'none', neck: 'none', ears: 'none', gloves: null } },
  { id: 'ranger', name: 'Guardián espacial', look: { shirt: 'spacesuit', shirtColor: '#f2f2f4', accent: '#7b4bd1', hat: 'helmet', back: 'jetpack', pants: 'long', pantsColor: '#ececf0', gloves: '#3fae3f', shoes: '#7b4bd1', face: 'none', eyes: 'normal', skin: '#f4c6a5', glasses: 'none', neck: 'none', ears: 'none' } },
  { id: 'vice', name: 'Gánster tropical', look: { shirt: 'hawaii', shirtColor: '#2f8fd6', pants: 'long', pantsColor: '#4a6fa5', hat: 'slick', hairColor: '#2b2420', skin: '#f4c6a5', glasses: 'none', face: 'none', neck: 'chain', back: 'none', ears: 'none', gloves: null, shoes: '#2b2420', eyes: 'sleepy' } },
  { id: 'grove', name: 'Chico del barrio', look: { shirt: 'tank', shirtColor: '#ffffff', pants: 'long', pantsColor: '#3b5a8f', hat: 'buzz', hairColor: '#1c1c24', skin: '#8a5a3c', glasses: 'none', face: 'none', neck: 'none', back: 'none', ears: 'none', gloves: null, shoes: '#1c1c24', eyes: 'normal' } },
  { id: 'plumber2', name: 'Fontanero verde', look: { shirt: 'overalls', shirtColor: '#2f5bd3', accent: '#2fa84f', hat: 'cap', hatColor: '#2fa84f', face: 'mustache', hairColor: '#3a2416', pants: 'long', pantsColor: '#2f5bd3', gloves: '#ffffff', shoes: '#6b4a2b', skin: '#f4c6a5', eyes: 'normal', ears: 'none', glasses: 'none', neck: 'none', back: 'none' } },
  { id: 'saiyan', name: 'Guerrero marcial', look: { shirt: 'gi', shirtColor: '#ff8a1c', accent: '#2547b8', pants: 'long', pantsColor: '#ff8a1c', hat: 'spiky', hairColor: '#1c1c24', shoes: '#2547b8', skin: '#f4c6a5', eyes: 'angry', face: 'none', glasses: 'none', neck: 'none', back: 'none', ears: 'none', gloves: null } },
  { id: 'sumo', name: 'Luchador de sumo', look: { skin: '#f4c6a5', width: 1.32, height: 1.12, shirt: 'none', pants: 'mawashi', pantsColor: '#2b2b4a', accent: '#e8c35a', hat: 'topknot', hairColor: '#1c1c24', eyes: 'angry', face: 'none', glasses: 'none', neck: 'none', back: 'none', gloves: null, shoes: '#f4c6a5' } },
  { id: 'karateka', name: 'Karateka', look: { skin: '#f4c6a5', shirt: 'karategi', shirtColor: '#ffffff', accent: '#1c1c24', pants: 'long', pantsColor: '#ffffff', hat: 'hachimaki', hatColor: '#ffffff', hairColor: '#1c1c24', eyes: 'angry', face: 'none', glasses: 'none', neck: 'none', back: 'none', gloves: null, shoes: '#f4c6a5' } },
  { id: 'shinobi', name: 'Ninja de las sombras', look: { skin: '#f4c6a5', shirt: 'ninjasuit', shirtColor: '#1c1c24', accent: '#c4281c', pants: 'long', pantsColor: '#1c1c24', hat: 'ninjahood', hatColor: '#1c1c24', face: 'ninjamask', back: 'ninjablades', eyes: 'angry', glasses: 'none', neck: 'none', gloves: '#1c1c24', shoes: '#1c1c24' } },
  { id: 'mariachi', name: 'Mariachi', look: { hat: 'sombrero', hatColor: '#1c1c24', shirt: 'suit', shirtColor: '#1c1c24', neck: 'bowtie', accent: '#c4281c', face: 'mustache', hairColor: '#1c1c24', pants: 'long', pantsColor: '#1c1c24', back: 'guitar', glasses: 'none', eyes: 'happy', gloves: null } },
  { id: 'wizard', name: 'Mago', look: { hat: 'wizard', hatColor: '#4b3aa8', shirt: 'hoodie', shirtColor: '#4b3aa8', face: 'beard', hairColor: '#f2eee6', back: 'cape', accent: '#2a1f66', pants: 'long', pantsColor: '#2a1f66', glasses: 'round', neck: 'none', gloves: null } },
  { id: 'scientist', name: 'Científica', look: { shirt: 'labcoat', shirtColor: '#ffffff', glasses: 'round', hat: 'slick', hairColor: '#e07a2b', neck: 'tie', accent: '#2f5bd3', pants: 'long', pantsColor: '#3b3f46', face: 'none', back: 'none', gloves: null } },
  { id: 'surfer', name: 'Surfero', look: { shirt: 'none', pants: 'shorts', pantsColor: '#3ee0b0', back: 'surfboard', accent: '#ff8a3d', neck: 'lei', glasses: 'sun', hat: 'none', face: 'none', skin: '#c98a5b', gloves: null } },
  { id: 'caesar', name: 'César', look: { skin: '#f4c6a5', shirt: 'toga', shirtColor: '#f4efe3', accent: '#6b2a8c', pants: 'hakama', pantsColor: '#f4efe3', hat: 'laurel', back: 'cape', shoes: '#8a5a2b', eyes: 'sleepy', face: 'none', glasses: 'none', neck: 'none', gloves: null } },
  { id: 'dj', name: 'DJ', look: { hat: 'headphones', hatColor: '#1c1c24', shirt: 'hoodie', shirtColor: '#8b6cff', glasses: 'heart', neck: 'chain', pants: 'cargo', pantsColor: '#1c1c24', face: 'none', back: 'none', ears: 'none', gloves: null } },
];

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
// Un rival con personalidad propia por dificultad
export const CPU_LOOKS = [
  { name: 'Chícharo', skin: '#8bd450', height: 0.86, width: 1.16, shirt: 'tee', shirtColor: CPU_SHIRT, hat: 'propeller', glasses: 'none', eyes: 'happy', ears: 'none', number: 1, paddleType: 'control' },
  { name: 'Lenteja', skin: '#ff9f6b', height: 1, width: 1, shirt: 'tank', shirtColor: CPU_SHIRT, hat: 'cap', glasses: 'none', eyes: 'normal', ears: 'bear', number: 4, paddleType: 'balanced' },
  { name: 'Garbanzo', skin: '#b39cff', height: 1.12, width: 0.86, shirt: 'track', shirtColor: CPU_SHIRT, hat: 'band', glasses: 'sun', eyes: 'sleepy', ears: 'none', number: 9, paddleType: 'fast' },
  { name: 'Don Frijol', skin: '#ffd166', height: 1.12, width: 1.32, shirt: 'suit', shirtColor: CPU_SHIRT, hat: 'crown', glasses: 'round', face: 'mustache', neck: 'bowtie', eyes: 'lashes', ears: 'none', back: 'cape', number: 10, paddleType: 'spin' },
];
// Aspecto del rival para un partido: equipación opuesta y piel que no se confunda con ella
export function cpuLookFor(idx, playerShirt) {
  const base = CPU_LOOKS[idx], shirt = rivalColor(playerShirt);
  let skin = base.skin;
  if (hueDist(skin, shirt) < 0.09 || hueDist(skin, playerShirt) < 0.05) {
    skin = SKINS.slice(0, 8).reduce((best, s) => Math.min(hueDist(s, shirt), hueDist(s, playerShirt)) > Math.min(hueDist(best, shirt), hueDist(best, playerShirt)) ? s : best, SKINS[0]);
  }
  return { ...base, shirtColor: shirt, skin };
}
export function randomLook(name = 'Tú') {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const maybe = (a, p) => (Math.random() < p ? pick(a.slice(1))[0] : 'none');
  return {
    ...DEFAULT_LOOK, name, skin: pick(SKINS), height: pick(HEIGHTS)[0], width: pick(WIDTHS)[0], eyes: pick(EYES)[0], ears: maybe(EARS, 0.4),
    shirt: pick(SHIRTS.slice(0, 11))[0], shirtColor: pick(SHIRT_COLORS), pants: pick(PANTS)[0], pantsColor: pick(PANTS_COLORS),
    hat: pick(HATS)[0], hatColor: Math.random() < 0.5 ? pick(SHIRT_COLORS) : null, glasses: maybe(GLASSES, 0.35), face: maybe(FACES, 0.3),
    neck: maybe(NECKS, 0.3), back: maybe(BACKS, 0.2), accent: pick(SHIRT_COLORS), hairColor: pick(['#3a2416', '#e07a2b', '#f2eee6', '#ff5fb2', '#2b2420', '#e8b931']),
    paddleColor: pick(PADDLE_COLORS), number: 1 + Math.floor(Math.random() * 99),
  };
}

const INK = 0x24120f;
const FOOT = 0.1;   // altura del cuerpo sobre el suelo (las zapatillas van debajo)

// Perfil de frijol: r(s), s ∈ [0,1] de abajo arriba
function profileR(s, R, belly) {
  return R * Math.pow(Math.max(0, Math.sin(Math.PI * s)), 0.42) * (1 - 0.12 * s + belly * Math.exp(-(((s - 0.3) / 0.2) ** 2)));
}
function lathe(H, R, belly, { t = 0, s0 = 0, s1 = 1, extra = 0, n = 40, phi0 = 0, phiLen = Math.PI * 2, seg = 44 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + (s1 - s0) * (i / n);
    const pole = (s0 === 0 && i === 0) || (s1 === 1 && i === n);
    const r = pole ? 0.0001 : profileR(s, R, belly) + t + extra;
    const full = s0 === 0 && s1 === 1;
    pts.push(new THREE.Vector2(r, full ? -t + s * (H + 2 * t) : s * H));
  }
  return new THREE.LatheGeometry(pts, seg, phi0, phiLen);
}
// óvalo para parches: se estira sobre el sector del cuerpo, así sigue su curva a cualquier tamaño
const ovalTex = (() => { let t = null; return () => t || (t = canvasTex(128, 128, (g) => { g.fillStyle = "#fff"; g.beginPath(); g.ellipse(64, 64, 60, 60, 0, 0, Math.PI * 2); g.fill(); })); })();

function canvasTex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
function numberTexture(num, color) {
  return canvasTex(256, 256, (g) => {
    g.font = '400 130px "Dela Gothic One", "Arial Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 22; g.strokeStyle = '#22100F'; g.strokeText(String(num), 128, 140);
    g.fillStyle = color; g.fillText(String(num), 128, 140);
  });
}
// Estampados de la ropa (u = alrededor del cuerpo, v = a lo alto)
function patternTex(kind, base, accent) {
  const B = '#' + new THREE.Color(base).getHexString(), A = accent;
  switch (kind) {
    case 'stripes': return canvasTex(64, 128, (g, w, h) => { g.fillStyle = B; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 14); }, 1, 1);
    case 'flannel': return canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = B; g.fillRect(0, 0, w, h); g.globalAlpha = 0.45; g.fillStyle = '#1c1c24';
      for (let i = 0; i < w; i += 32) { g.fillRect(i, 0, 12, h); g.fillRect(0, i, w, 12); }
      g.globalAlpha = 0.5; g.fillStyle = '#ffffff'; for (let i = 20; i < w; i += 32) { g.fillRect(i, 0, 3, h); g.fillRect(0, i, w, 3); }
    }, 6, 2);
    case 'hawaii': return canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = B; g.fillRect(0, 0, w, h);
      const flower = (x, y, r, col) => { g.fillStyle = col; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.5, a, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x, y, r * 0.45, 0, Math.PI * 2); g.fill(); };
      g.fillStyle = 'rgba(30,90,50,.55)'; for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 16, 6, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
      flower(30, 34, 12, '#ffffff'); flower(96, 80, 13, '#ff5fb2'); flower(70, 18, 9, '#ff8a3d'); flower(20, 100, 10, '#ff5fb2');
    }, 5, 2);
    case 'track': return canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = B; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1c24';
      for (const x of [56, 66, 186, 196]) g.fillRect(x, 0, 5, h);           // dos franjas por costado
      g.fillStyle = '#d8d8d8'; g.fillRect(126, 0, 4, h);                      // cremallera
    }, 1, 1);
    case 'sweater': return canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = B; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(64, 4); g.lineTo(124, 64); g.lineTo(64, 124); g.lineTo(4, 64); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(30,20,20,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
    }, 6, 2);
    default: return null;
  }
}

export function createCharacter(lookIn, { rotationY = 0, referee = false } = {}) {
  const look = { ...DEFAULT_LOOK, ...lookIn };
  const owned = [];                                   // geometrías/materiales propios (para liberar)
  const own = o => { owned.push(o); return o; };
  const mesh = (g, m, shadow = true) => { const x = new THREE.Mesh(g, m); x.castShadow = shadow; x.receiveShadow = true; return x; };
  const tmat = (color, map) => own(new THREE.MeshToonMaterial({ color: map ? 0xffffff : color, map: map || null, gradientMap: toon(0xffffff).gradientMap }));

  const H = 1.08 * look.height, R = 0.31 * look.width, belly = 0.05 + (look.width - 1) * 0.28;
  const surf = s => profileR(s, R, belly);
  const skinHex = new THREE.Color(look.skin).getHex();
  const shirtHex = new THREE.Color(look.shirtColor).getHex();
  const accentHex = new THREE.Color(look.accent || '#e0352b').getHex();
  const hatHex = new THREE.Color(look.hatColor || look.shirtColor).getHex();
  const hairHex = new THREE.Color(look.hairColor || '#5b3a29').getHex();
  const pantsHex = new THREE.Color(look.shirt === 'overalls' ? look.shirtColor : look.pantsColor || '#2c3a66').getHex();
  const shirtDark = darken(shirtHex, 0.25);
  const lightShirt = new THREE.Color(shirtHex).getHSL({}).l > 0.75;

  const root = new THREE.Group(); root.rotation.y = rotationY;
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Group(); torso.position.y = FOOT; body.add(torso);
  const zAt = (s, x) => Math.sqrt(Math.max(0.0001, surf(s) ** 2 - x * x));
  const ring = (s, w, col, extra = 0.016) => { const m = mesh(own(new THREE.TorusGeometry(surf(s) + extra, w, 8, 44)), toon(col), false); m.rotation.x = Math.PI / 2; m.position.y = H * s; torso.add(m); return m; };

  // ---- Cuerpo ----
  torso.add(mesh(own(lathe(H, R, belly)), toon(skinHex)));
  torso.add(new THREE.Mesh(own(lathe(H, R, belly, { t: 0.022 })), outlineMat));
  // parche ovalado calcado sobre la superficie del cuerpo (sector frontal del torno): nunca sobresale ni se hunde
  const skinPatch = (s0, s1, half, col, extra = 0.005) => {
    const m = new THREE.Mesh(own(lathe(H, R, belly, { s0, s1, extra, n: 14, phi0: -half, phiLen: half * 2, seg: 16 })), own(new THREE.MeshToonMaterial({ color: col, map: ovalTex(), alphaTest: 0.5, gradientMap: toon(0xffffff).gradientMap })));
    m.receiveShadow = true; return m;
  };
  // panel recto (sin óvalo) que también se calca sobre el cuerpo: delantales, petos, paneles
  const surfPanel = (s0, s1, half, col, extra = 0.02) => { const m = mesh(own(lathe(H, R, belly, { s0, s1, extra, n: 12, phi0: -half, phiLen: half * 2, seg: 14 })), toon(col), false); return m; };
  const bellyPatch = skinPatch(0.1, 0.5, 0.95, lighten(skinHex, 0.4));

  // ---- Pantalón ----
  const pants = look.pants || 'shorts';
  if (pants === 'mawashi') {
    // cinturón grueso de sumo con el nudo atrás y las cuerdas (sagari) delante
    torso.add(mesh(own(lathe(H, R, belly, { s0: 0.05, s1: 0.2, extra: 0.016, n: 10 })), toon(pantsHex)));
    ring(0.17, 0.05, pantsHex, 0.03);
    const knot = box(0.16, 0.16, 0.08, darken(pantsHex, 0.15), 0.01); knot.position.set(0, H * 0.16, -surf(0.16) - 0.04); torso.add(knot);
    for (let k = -3; k <= 3; k++) { const s = box(0.018, 0.14, 0.012, accentHex, 0, false); s.position.set(k * 0.035, H * 0.08, zAt(0.08, k * 0.035) + 0.03); torso.add(s); }
  } else if (pants === 'hakama' || pants === 'tutu' || pants === 'kilt') {
    const tex = pants === 'kilt' ? own(patternTex('flannel', pantsHex, '#fff')) : null;
    const len = pants === 'hakama' ? 0.3 : pants === 'kilt' ? 0.2 : 0.08;
    const top = pants === 'tutu' ? surf(0.22) + 0.02 : surf(0.24) + 0.02;
    const bottom = pants === 'tutu' ? surf(0.18) + 0.2 : surf(0.04) + (pants === 'hakama' ? 0.14 : 0.08);
    const sk = mesh(own(new THREE.CylinderGeometry(top, bottom, H * len, 28, 1, true)), own(new THREE.MeshToonMaterial({ color: tex ? 0xffffff : pants === 'tutu' ? lighten(pantsHex, 0.3) : pantsHex, map: tex, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide })));
    sk.position.y = pants === 'tutu' ? H * 0.19 : H * (0.24 - len / 2); torso.add(sk);
    if (pants === 'tutu') { const sk2 = sk.clone(); sk2.scale.set(0.9, 0.8, 0.9); sk2.position.y = H * 0.17; torso.add(sk2); }
    if (pants === 'hakama') for (let k = -2; k <= 2; k++) { const pl = box(0.008, H * 0.3, 0.01, darken(pantsHex, 0.3), 0, false); pl.position.set(k * 0.06, H * 0.09, bottom * 0.85 + 0.01); torso.add(pl); }
    ring(0.24, 0.018, darken(pantsHex, 0.2), 0.02);
  } else if (pants === 'skirt') {
    const sk = mesh(own(new THREE.CylinderGeometry(surf(0.24) + 0.02, surf(0.04) + 0.09, H * 0.22, 28, 1, true)), toon(pantsHex));
    sk.position.y = H * 0.13; torso.add(sk);
    ring(0.24, 0.016, darken(pantsHex, 0.2), 0.02);
  } else {
    const s0 = pants === 'shorts' || pants === 'buttons' ? 0.06 : 0.015;
    if (pants === 'jeans') for (const sx of [-1, 1]) { const p = box(0.09, 0.07, 0.02, darken(pantsHex, 0.18), 0.004, false); p.position.set(sx * R * 0.4, H * 0.14, -zAt(0.14, R * 0.4) - 0.01); torso.add(p); }
    torso.add(mesh(own(lathe(H, R, belly, { s0, s1: 0.22, extra: 0.012, n: 12 })), toon(pantsHex)));
    ring(s0 + 0.002, 0.014, darken(pantsHex, 0.2), 0.012);
    if (pants === 'buttons') for (const sx of [-1, 1]) { const b = sphere(0.034, 0xffffff, 0.008, false); b.scale.z = 0.5; b.position.set(sx * R * 0.3, H * 0.15, zAt(0.15, R * 0.3) + 0.012); torso.add(b); }
    if (pants === 'cargo') for (const sx of [-1, 1]) { const p = box(0.1, 0.08, 0.03, darken(pantsHex, 0.15), 0.006, false); p.position.set(sx * R * 0.78, H * 0.1, zAt(0.1, R * 0.78) * 0.55); p.rotation.y = sx * 0.9; torso.add(p); }
  }

  // ---- Torso ----
  const shirt = look.shirt;
  const sleeveShirt = ['tee', 'polo', 'hawaii', 'stripes', 'flannel', 'overalls', 'gi', 'karategi', 'happi', 'jersey', 'sailor', 'hero', 'apron', 'toga'].includes(shirt);
  const longSleeve = ['hoodie', 'track', 'leather', 'suit', 'spacesuit', 'ninjasuit', 'labcoat', 'sweater', 'raincoat'].includes(shirt);
  if (shirt !== 'none') {
    const s0 = shirt === 'labcoat' || shirt === 'raincoat' ? 0.05 : shirt === 'hoodie' || shirt === 'leather' || shirt === 'suit' || shirt === 'track' || shirt === 'sweater' ? 0.15 : 0.19;
    const s1 = shirt === 'tank' ? 0.5 : shirt === 'hoodie' ? 0.6 : 0.56;
    const pat = patternTex(shirt, shirt === 'overalls' ? accentHex : shirtHex, '#fff');
    const baseCol = shirt === 'overalls' ? accentHex : shirtHex;
    torso.add(mesh(own(lathe(H, R, belly, { s0: shirt === 'overalls' ? 0.2 : s0, s1, extra: 0.016, n: 18 })), pat ? tmat(0, own(pat)) : toon(baseCol)));
    ring(shirt === 'overalls' ? 0.2 : s0, 0.016, darken(baseCol, 0.25));
    ring(s1, shirt === 'hoodie' ? 0.03 : 0.018, darken(baseCol, 0.25));
    if (shirt === 'tee') { const b = ring(0.4, 0.022, lightShirt ? 0x2d2366 : 0xffffff, 0.02); b.scale.z = 0.6; }
    if (shirt === 'tank') for (const sx of [-1, 1]) {
      const strap = mesh(own(new THREE.TorusGeometry(R * 0.5, 0.025, 8, 24, Math.PI)), toon(shirtHex), false);
      strap.rotation.y = Math.PI / 2; strap.position.set(sx * R * 0.42, H * 0.5, 0); strap.scale.set(1, 0.55, 1); torso.add(strap);
    }
    if (shirt === 'hoodie') {
      const hood = mesh(own(new THREE.TorusGeometry(surf(0.6) * 0.85, 0.07, 10, 30, Math.PI * 1.2)), toon(shirtHex));
      hood.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI * 0.9); hood.position.set(0, H * 0.6, -0.04); torso.add(hood);
      torso.add(skinPatch(0.22, 0.38, 0.7, shirtDark, 0.03));
      for (const sx of [-1, 1]) { const cord = capsule(0.011, 0.08, 0xffffff, 0, false); cord.position.set(sx * 0.05, H * 0.55, surf(0.55) + 0.025); torso.add(cord); }
    }
    if (shirt === 'polo') {
      for (const sx of [-1, 1]) { const c = box(0.1, 0.03, 0.06, shirtDark, 0.006, false); c.position.set(sx * 0.06, H * 0.565, zAt(0.565, 0.06) + 0.01); c.rotation.set(-0.5, 0, sx * 0.5); torso.add(c); }
      for (let k = 0; k < 2; k++) { const b = sphere(0.014, 0xffffff, 0.004, false); b.position.set(0, H * (0.5 - k * 0.06), zAt(0.5 - k * 0.06, 0) + 0.018); torso.add(b); }
    }
    if (shirt === 'leather' || shirt === 'suit' || shirt === 'track') {
      // solapas / cremallera / camisa blanca en V
      if (shirt !== 'track') {
        const v = mesh(own(new THREE.CircleGeometry(R * 0.42, 3)), toon(shirt === 'suit' ? 0xffffff : 0x3a3a46), false);
        v.rotation.z = -Math.PI / 2; v.scale.set(1.3, 0.75, 1); v.position.set(0, H * 0.46, zAt(0.46, 0) + 0.018); torso.add(v);
        for (const sx of [-1, 1]) { const lap = box(0.06, 0.2, 0.02, darken(shirtHex, shirt === 'suit' ? 0.35 : 0.15), 0.006, false); lap.position.set(sx * R * 0.3, H * 0.47, zAt(0.47, R * 0.3) + 0.015); lap.rotation.set(-0.15, sx * 0.35, sx * -0.35); torso.add(lap); }
      }
      if (shirt === 'leather') { const z = box(0.012, H * 0.3, 0.01, 0xd8d8d8, 0, false); z.position.set(-R * 0.16, H * 0.32, zAt(0.32, R * 0.16) + 0.02); torso.add(z); }
      if (shirt === 'suit') for (let k = 0; k < 2; k++) { const b = sphere(0.016, INK, 0, false); b.position.set(0, H * (0.32 - k * 0.07), zAt(0.32 - k * 0.07, 0) + 0.02); torso.add(b); }
    }
    if (shirt === 'gi' || shirt === 'karategi') {
      // gi cruzado (V con camiseta o con piel), cinturón con nudo y faldones
      const v = mesh(own(new THREE.CircleGeometry(R * 0.45, 3)), toon(shirt === 'karategi' ? skinHex : accentHex), false);
      v.rotation.z = -Math.PI / 2; v.scale.set(1.35, 0.8, 1); v.position.set(0, H * 0.47, zAt(0.47, 0) + 0.018); torso.add(v);
      for (const sx of [-1, 1]) { const lap = box(0.05, 0.22, 0.02, darken(shirtHex, 0.12), 0.006, false); lap.position.set(sx * R * 0.26, H * 0.46, zAt(0.46, R * 0.26) + 0.016); lap.rotation.set(-0.1, sx * 0.3, sx * -0.45); torso.add(lap); }
      ring(0.21, 0.035, accentHex, 0.03);
      const knot = sphere(0.035, accentHex, 0.008, false); knot.position.set(0, H * 0.21, zAt(0.21, 0) + 0.04); torso.add(knot);
      for (const sx of [-1, 1]) { const tail = box(0.035, 0.11, 0.015, accentHex, 0.006, false); tail.position.set(sx * 0.03, H * 0.15, zAt(0.15, 0) + 0.04); tail.rotation.z = sx * 0.2; torso.add(tail); }
    }
    if (shirt === 'spacesuit') {
      // traje espacial blanco: peto verde con botones de colores, cuello morado, franjas verdes
      torso.add(surfPanel(0.32, 0.48, 0.6, 0x3fae3f, 0.026));
      torso.add(surfPanel(0.48, 0.53, 0.45, 0x7b4bd1, 0.028));
      [[0xe0352b, -1], [0x3b9bff, 0], [0x3fae3f, 1]].forEach(([col, k]) => { const b = sphere(0.022, col, 0.006, false); b.scale.z = 0.5; b.position.set(k * 0.06, H * 0.41, zAt(0.41, k * 0.06) + 0.05); torso.add(b); });
      ring(0.58, 0.04, accentHex, 0.022);
      ring(0.24, 0.022, 0x3fae3f, 0.02);
    }
    if (shirt === 'overalls') {
      // peto con tirantes y botones dorados sobre la camiseta
      const bib = mesh(own(lathe(H, R, belly, { s0: 0.18, s1: 0.42, extra: 0.024, n: 10 })), toon(shirtHex)); torso.add(bib);
      torso.add(surfPanel(0.4, 0.56, 0.62, shirtHex, 0.028));
      for (const sx of [-1, 1]) {
        const strap = mesh(own(new THREE.TorusGeometry(R * 0.55, 0.022, 8, 24, Math.PI)), toon(shirtHex), false);
        strap.rotation.y = Math.PI / 2; strap.position.set(sx * R * 0.32, H * 0.5, 0); strap.scale.set(1, 0.6, 1); torso.add(strap);
        const btn = sphere(0.022, 0xffd166, 0.006, false); btn.position.set(sx * R * 0.3, H * 0.53, zAt(0.53, R * 0.3) + 0.03); torso.add(btn);
      }
    }
    if (shirt === 'ninjasuit') {
      // fajín rojo y correas cruzadas del arnés de las dagas
      ring(0.22, 0.04, accentHex, 0.03);
      const knot = sphere(0.03, accentHex, 0.006, false); knot.position.set(R * 0.4, H * 0.22, zAt(0.22, R * 0.4) + 0.03); torso.add(knot);
      for (const sx of [-1, 1]) { const st = box(0.035, H * 0.42, 0.012, 0x3a3a46, 0.004, false); st.position.set(0, H * 0.4, zAt(0.4, 0) + 0.02); st.rotation.z = sx * 0.55; torso.add(st); }
    }
    if (shirt === 'happi') {
      // chaqueta de festival: solapas de color, V de piel y el sol rojo a la espalda
      const v = mesh(own(new THREE.CircleGeometry(R * 0.45, 3)), toon(skinHex), false);
      v.rotation.z = -Math.PI / 2; v.scale.set(1.35, 0.8, 1); v.position.set(0, H * 0.47, zAt(0.47, 0) + 0.018); torso.add(v);
      for (const sx of [-1, 1]) { const lap = box(0.06, H * 0.4, 0.02, accentHex, 0.006, false); lap.position.set(sx * R * 0.24, H * 0.38, zAt(0.38, R * 0.24) + 0.016); lap.rotation.set(-0.05, sx * 0.3, sx * -0.28); torso.add(lap); }
      const sun = mesh(own(new THREE.CircleGeometry(R * 0.32, 28)), toon(0xe8301f), false); sun.position.set(0, H * 0.4, -zAt(0.4, 0) - 0.02); sun.rotation.y = Math.PI; torso.add(sun);
      ring(0.2, 0.03, accentHex, 0.02);
    }
    if (shirt === 'jersey') {
      const band = ring(0.42, 0.05, accentHex, 0.02); band.scale.z = 1;
      const collar = mesh(own(new THREE.CircleGeometry(R * 0.28, 3)), toon(accentHex), false); collar.rotation.z = -Math.PI / 2; collar.scale.set(1.2, 0.7, 1); collar.position.set(0, H * 0.53, zAt(0.53, 0) + 0.018); torso.add(collar);
    }
    if (shirt === 'labcoat' || shirt === 'raincoat') {
      for (const sx of [-1, 1]) { const lap = box(0.06, 0.2, 0.02, darken(shirtHex, 0.12), 0.006, false); lap.position.set(sx * R * 0.28, H * 0.47, zAt(0.47, R * 0.28) + 0.016); lap.rotation.set(-0.12, sx * 0.35, sx * -0.35); torso.add(lap); }
      for (let k = 0; k < 3; k++) { const b = sphere(0.016, shirt === 'raincoat' ? 0x1c1c24 : 0xdddddd, 0.004, false); b.position.set(0, H * (0.38 - k * 0.1), zAt(0.38 - k * 0.1, 0) + 0.02); torso.add(b); }
      if (shirt === 'labcoat') {
        const pocket = box(0.11, 0.09, 0.02, 0xf2f2f2, 0.005, false); pocket.position.set(R * 0.42, H * 0.42, zAt(0.42, R * 0.42) + 0.01); pocket.rotation.y = 0.45; torso.add(pocket);
        [0x2f5bd3, 0xe0352b].forEach((col, k) => { const pen = cyl(0.008, 0.008, 0.09, col, 0, false); pen.position.set(R * 0.38 + k * 0.025, H * 0.47, zAt(0.47, R * 0.4) + 0.01); torso.add(pen); });
      } else {
        const hood = mesh(own(new THREE.TorusGeometry(surf(0.6) * 0.85, 0.07, 10, 30, Math.PI * 1.2)), toon(shirtHex));
        hood.rotation.set(Math.PI / 2 - 0.3, 0, Math.PI * 0.9); hood.position.set(0, H * 0.6, -0.04); torso.add(hood);
      }
    }
    if (shirt === 'apron') {
      torso.add(surfPanel(0.1, 0.46, 0.85, accentHex, 0.026));
      torso.add(surfPanel(0.44, 0.56, 0.5, accentHex, 0.026));
      torso.add(surfPanel(0.2, 0.3, 0.45, darken(accentHex, 0.15), 0.034));
      ring(0.3, 0.014, accentHex, 0.02);
    }
    if (shirt === 'sailor') {
      const col = mesh(own(new THREE.CylinderGeometry(surf(0.56) + 0.03, surf(0.5) + 0.05, H * 0.14, 24, 1, true, Math.PI * 0.6, Math.PI * 0.8)), own(new THREE.MeshToonMaterial({ color: 0x2b3a7a, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide })), false);
      col.position.y = H * 0.5; col.rotation.y = Math.PI; torso.add(col);
      const v = mesh(own(new THREE.CircleGeometry(R * 0.38, 3)), toon(0x2b3a7a), false); v.rotation.z = -Math.PI / 2; v.scale.set(1.3, 0.8, 1); v.position.set(0, H * 0.48, zAt(0.48, 0) + 0.018); torso.add(v);
      const kn = mesh(own(new THREE.ConeGeometry(0.05, 0.12, 4)), toon(0xe0352b), false); kn.rotation.z = Math.PI; kn.position.set(0, H * 0.41, zAt(0.41, 0) + 0.035); torso.add(kn);
    }
    if (shirt === 'toga') {
      const sash = mesh(own(new THREE.TorusGeometry(surf(0.4) + 0.025, 0.06, 8, 40)), toon(accentHex), false);
      sash.rotation.set(Math.PI / 2, 0.62, 0); sash.position.y = H * 0.42; sash.scale.set(1, 1, 1.05); torso.add(sash);
      const fold = mesh(own(new THREE.TorusGeometry(surf(0.4) + 0.012, 0.035, 8, 40)), toon(darken(shirtHex, 0.08)), false);
      fold.rotation.set(Math.PI / 2, -0.5, 0); fold.position.y = H * 0.36; torso.add(fold);
      ring(0.19, 0.03, accentHex, 0.02);
      const pin = sphere(0.035, 0xf2b632, 0.008, false); pin.position.set(-R * 0.55, H * 0.55, zAt(0.55, R * 0.55) + 0.03); torso.add(pin);
    }
    if (shirt === 'hero') {
      const em = mesh(own(new THREE.CircleGeometry(R * 0.32, 28)), toon(0xffc93c), false); em.position.set(0, H * 0.43, zAt(0.43, 0) + 0.02); torso.add(em);
      const bolt = mesh(own(new THREE.CircleGeometry(R * 0.2, 3)), toon(accentHex), false); bolt.position.set(0, H * 0.43, zAt(0.43, 0) + 0.026); bolt.rotation.z = Math.PI / 2; torso.add(bolt);
      ring(0.22, 0.03, 0xffc93c, 0.02);
    }
    // número a la espalda (lo ves durante todo el partido)
    if (!['overalls', 'gi', 'karategi', 'spacesuit', 'ninjasuit', 'happi', 'labcoat', 'apron', 'sailor', 'toga'].includes(shirt)) {
      const numMat = own(new THREE.MeshBasicMaterial({ map: own(numberTexture(look.number, lightShirt ? '#2d2366' : '#ffffff')), transparent: true, depthWrite: false }));
      const sN = 0.38, rN = surf(sN) + 0.022;
      const num = new THREE.Mesh(own(new THREE.CylinderGeometry(rN, rN, H * 0.22, 20, 1, true, Math.PI - 0.6, 1.2)), numMat);
      num.position.y = H * sN; torso.add(num);
    }
  }
  torso.add(bellyPatch);
  bellyPatch.visible = shirt === 'none' || shirt === 'tank';

  // ---- Cara (frente = +z) ----
  const sEye = 0.72, yEye = H * sEye, xEye = R * 0.37;
  const eyeType = look.eyes || 'normal';
  const eyes = [];
  const eyeSpots = eyeType === 'cyclops' ? [[0, 0.12]] : [[-1, 0.085], [1, 0.085]];
  const pupilCol = eyeType === 'red' ? 0x1a0508 : INK;
  for (const [sx, er] of eyeSpots) {
    const ex = sx * xEye;
    const eg = new THREE.Group();
    eg.position.set(ex, yEye + (eyeType === 'cyclops' ? 0.02 : 0), zAt(sEye, ex) - 0.03);
    torso.add(eg);
    const e = { eg, sx: sx || 1, r: er };
    if (eyeType === 'dots') {
      e.pupil = sphere(0.03, INK, 0, false); eg.add(e.pupil); e.pupil.position.z = 0.03;
    } else if (eyeType === 'happy') {
      const arc = mesh(own(new THREE.TorusGeometry(0.05, 0.014, 8, 16, Math.PI)), toon(INK), false);
      arc.position.set(0, -0.01, 0.05); eg.add(arc); e.arc = arc;
    } else {
      const white = sphere(er, eyeType === 'drunk' ? 0xfff0f0 : 0xffffff, 0.012, false); eg.add(white);
      if (eyeType === 'red') { const iris = sphere(er * 0.62, 0xe0202e, 0, false); eg.add(iris); e.iris = iris; }
      const lid = mesh(own(new THREE.SphereGeometry(er * 1.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), toon(skinHex), false);
      eg.add(lid); e.lid = lid;
      const pr = er * (eyeType === 'red' ? 0.32 : 0.45);
      if (eyeType === 'stars') {
        const shape = new THREE.Shape();
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? pr * 0.45 : pr * 1.25; k ? shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        e.pupil = new THREE.Group();
        const star = mesh(own(new THREE.ShapeGeometry(shape)), toon(0xffc93c), false); star.position.z = 0.002; e.pupil.add(star);
        e.star = star;
      } else {
        e.pupil = sphere(pr, pupilCol, 0, false);
        const shine = sphere(pr * 0.32, 0xffffff, 0, false); shine.position.set(pr * 0.34, pr * 0.38, pr * 0.7); e.pupil.add(shine);
      }
      eg.add(e.pupil);
      if (eyeType === 'lashes') for (let k = -1; k <= 1; k++) { const l = capsule(0.008, 0.035, INK, 0, false); l.position.set(e.sx * (0.04 + k * 0.025), er + 0.012, 0.03); l.rotation.z = -e.sx * (0.5 + k * 0.35); eg.add(l); }
    }
    const brow = capsule(0.016, eyeType === 'cyclops' ? 0.12 : 0.07, INK, 0, false);
    brow.rotation.z = Math.PI / 2; brow.position.set(0, er + 0.04, 0.035); eg.add(brow); e.brow = brow;
    eyes.push(e);
  }
  const cheeks = [];
  for (const sx of [-1, 1]) {
    const cheek = sphere(0.05, eyeType === 'drunk' ? 0xff4f6e : 0xff8fab, 0, false);
    cheek.scale.set(eyeType === 'drunk' ? 1.4 : 1, 0.65, 0.35); cheek.position.set(sx * R * 0.62, H * 0.6, zAt(0.6, R * 0.62) - 0.004); torso.add(cheek);
    cheeks.push(cheek);
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
  // lágrimas (emote de llorar)
  const tears = [];
  for (const sx of [-1, 1]) { const tr = sphere(0.022, 0x6bc8ff, 0, false); tr.visible = false; tr.position.set(sx * xEye, yEye - 0.08, zAt(sEye, xEye) + 0.03); torso.add(tr); tears.push(tr); }

  // ---- Vello facial / antifaz ----
  const face = look.face || 'none';
  if (face === 'mustache' || face === 'beard') {
    for (const sx of [-1, 1]) {
      const m = mesh(own(new THREE.SphereGeometry(0.05, 14, 10)), toon(hairHex), false);
      m.scale.set(1.25, 0.5, 0.55); m.position.set(sx * 0.048, yMouth + 0.05, zMouth + 0.012); m.rotation.z = sx * 0.25; torso.add(m);
    }
  }
  if (face === 'beard') {
    const b = mesh(own(new THREE.SphereGeometry(R * 0.62, 20, 14, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55)), toon(hairHex));
    b.scale.set(1.05, 0.9, 0.75); b.position.set(0, H * 0.57, R * 0.28); torso.add(b);
  }
  if (face === 'mask') {
    const m = mesh(own(new THREE.TorusGeometry(surf(sEye) + 0.012, 0.045, 8, 40)), toon(INK), false);
    m.rotation.x = Math.PI / 2; m.position.y = yEye; m.scale.set(1, 1, 0.75); torso.add(m);
  }
  if (face === 'ninja') {
    const m = mesh(own(new THREE.TorusGeometry(surf(0.57) + 0.016, 0.06, 8, 40)), toon(INK), false);
    m.rotation.x = Math.PI / 2; m.position.y = H * 0.57; m.scale.set(1, 1, 0.9); torso.add(m);
  }

  if (face === 'ninjamask') {
    // tela que tapa de la nariz para abajo (deja ver los ojos)
    torso.add(mesh(own(lathe(H, R, belly, { s0: 0.5, s1: 0.665, extra: 0.02, n: 8 })), toon(hatHex)));
  }
  if (face === 'clown') { const n = sphere(0.06, 0xe0352b, 0.01); n.position.set(0, yEye - 0.07, zAt(sEye - 0.06, 0) + 0.04); torso.add(n); }
  if (face === 'surgical') {
    const m = mesh(own(new THREE.SphereGeometry(R * 0.55, 20, 12)), toon(0xbfe6ff), false); m.scale.set(1.15, 0.62, 0.35); m.position.set(0, yMouth + 0.01, zMouth - 0.03); torso.add(m);
    for (const sx of [-1, 1]) { const s = box(0.012, 0.012, R * 0.9, 0xeaf6ff, 0, false); s.position.set(sx * R * 0.82, yMouth + 0.03, 0); torso.add(s); }
  }
  if (face === 'goatee') { const g = mesh(own(new THREE.ConeGeometry(0.045, 0.1, 10)), toon(hairHex), false); g.rotation.x = Math.PI; g.position.set(0, yMouth - 0.07, zMouth + 0.0); torso.add(g); }

  // ---- Gafas ----
  const glasses = look.glasses || 'none';
  if (['ski', 'monocle', '3d', 'star'].includes(glasses) && eyeType !== 'cyclops') {
    const gl = new THREE.Group(); torso.add(gl);
    const zF = zAt(sEye, 0) + 0.06;
    if (glasses === 'ski') {
      const lens = box(xEye * 2 + 0.2, 0.12, 0.04, 0xff8a3d, 0.012, false); lens.position.set(0, yEye + 0.01, zF + 0.02); gl.add(lens);
      const shine = box(0.12, 0.018, 0.005, 0xffffff, 0, false); shine.position.set(-0.06, yEye + 0.04, zF + 0.045); shine.rotation.z = 0.3; gl.add(shine);
      const strap = mesh(own(new THREE.TorusGeometry(surf(sEye) + 0.015, 0.025, 6, 40)), toon(0x1c1c24), false); strap.rotation.x = Math.PI / 2; strap.position.y = yEye + 0.01; gl.add(strap);
    } else if (glasses === 'monocle') {
      const e = eyes.find(q => q.sx > 0) || eyes[0], p = e.eg.position;
      const rg = mesh(own(new THREE.TorusGeometry(0.08, 0.012, 8, 24)), toon(0xe8b931), false); rg.position.set(p.x, p.y, p.z + 0.08); gl.add(rg);
      const ch = box(0.006, 0.22, 0.006, 0xe8b931, 0, false); ch.position.set(p.x + 0.06, p.y - 0.14, p.z + 0.06); ch.rotation.z = 0.3; gl.add(ch);
    } else {
      for (const e of eyes) {
        const p = e.eg.position;
        if (glasses === '3d') { const l = box(0.13, 0.09, 0.02, e.sx < 0 ? 0xe0352b : 0x3fc6e8, 0.006, false); l.position.set(p.x, p.y, p.z + 0.085); gl.add(l); }
        else {
          const st = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 0.04 : 0.09; k ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
          const sm = mesh(own(new THREE.ShapeGeometry(st)), toon(0xffc93c), false); sm.rotation.z = Math.PI; sm.position.set(p.x, p.y, p.z + 0.09); gl.add(sm);
        }
      }
      const bridge = box(xEye * 2 - 0.12, 0.018, 0.016, glasses === '3d' ? 0xffffff : 0xffc93c, 0, false); bridge.position.set(0, yEye + 0.02, zF); gl.add(bridge);
    }
  } else if (glasses !== 'none' && eyeType !== 'cyclops') {
    const gl = new THREE.Group(); torso.add(gl);
    const frameCol = glasses === 'sun' ? 0x231a4a : glasses === 'heart' ? 0xff4d79 : glasses === 'patch' ? INK : 0xd9a066;
    for (const e of eyes) {
      const p = e.eg.position;
      if (glasses === 'patch') {
        if (e.sx > 0) { const pt = sphere(0.09, INK, 0.006, false); pt.scale.z = 0.35; pt.position.set(p.x, p.y, p.z + 0.07); gl.add(pt); }
        continue;
      }
      if (glasses === 'sun') {
        const lens = box(0.15, 0.09, 0.03, frameCol, 0.008, false); lens.position.set(p.x, p.y + 0.005, p.z + 0.085); gl.add(lens);
        const glare = box(0.04, 0.012, 0.005, 0xffffff, 0, false); glare.position.set(p.x - 0.03, p.y + 0.03, p.z + 0.1); glare.rotation.z = 0.5; gl.add(glare);
      } else if (glasses === 'heart') {
        const hs = new THREE.Shape(); hs.moveTo(0, -0.06); hs.bezierCurveTo(0.09, 0, 0.06, 0.07, 0, 0.035); hs.bezierCurveTo(-0.06, 0.07, -0.09, 0, 0, -0.06);
        const hm = mesh(own(new THREE.ShapeGeometry(hs)), toon(frameCol), false); hm.scale.setScalar(1.25); hm.position.set(p.x, p.y, p.z + 0.09); gl.add(hm);
      } else {
        const rg = mesh(own(new THREE.TorusGeometry(0.075, 0.013, 8, 24)), toon(frameCol), false);
        rg.position.set(p.x, p.y, p.z + 0.08); gl.add(rg);
      }
    }
    if (glasses === 'patch') {
      const strap = mesh(own(new THREE.TorusGeometry(surf(sEye) + 0.01, 0.01, 6, 40)), toon(INK), false);
      strap.rotation.set(Math.PI / 2, 0.35, 0); strap.position.y = yEye + 0.02; gl.add(strap);
    } else {
      const bridge = box(xEye * 2 - 0.15, 0.016, 0.016, frameCol, 0, false);
      bridge.position.set(0, yEye + 0.02, zAt(sEye, 0) + 0.05); gl.add(bridge);
      for (const sx of [-1, 1]) { const ag = box(0.012, 0.012, 0.2, frameCol, 0, false); ag.position.set(sx * (zAt(sEye, 0) * 0.86), yEye + 0.02, 0.06); gl.add(ag); }
    }
  }

  // ---- Cuello ----
  const neck = look.neck || 'none', yNeck = H * 0.6;
  if (neck === 'bowtie') {
    for (const sx of [-1, 1]) { const w = mesh(own(new THREE.ConeGeometry(0.05, 0.09, 4)), toon(accentHex), false); w.rotation.z = sx * Math.PI / 2; w.position.set(sx * 0.045, yNeck - 0.01, zAt(0.6, 0) + 0.03); torso.add(w); }
    const k = sphere(0.022, darken(accentHex, 0.2), 0.006, false); k.position.set(0, yNeck - 0.01, zAt(0.6, 0) + 0.04); torso.add(k);
  }
  if (neck === 'tie') {
    const tie = box(0.06, H * 0.26, 0.02, accentHex === shirtHex ? 0xe0352b : accentHex, 0.006, false); tie.position.set(0, H * 0.45, zAt(0.45, 0) + 0.025); tie.rotation.x = -0.12; torso.add(tie);
    const knot = sphere(0.03, accentHex === shirtHex ? 0xb02020 : darken(accentHex, 0.2), 0.006, false); knot.position.set(0, H * 0.58, zAt(0.58, 0) + 0.02); torso.add(knot);
  }
  if (neck === 'chain') {
    const ch = mesh(own(new THREE.TorusGeometry(surf(0.56) + 0.01, 0.012, 6, 40)), toon(0xe8b931), false);
    ch.rotation.x = Math.PI / 2 + 0.35; ch.position.set(0, H * 0.52, 0.02); torso.add(ch);
    const med = cyl(0.04, 0.04, 0.012, 0xe8b931, 0.006, false); med.rotation.x = Math.PI / 2; med.position.set(0, H * 0.44, zAt(0.44, 0) + 0.03); torso.add(med);
  }
  if (neck === 'scarf') {
    ring(0.6, 0.05, accentHex, 0.02);
    const end = box(0.08, 0.18, 0.03, accentHex, 0.008, false); end.position.set(R * 0.3, H * 0.5, zAt(0.5, R * 0.3) + 0.03); end.rotation.z = 0.15; torso.add(end);
  }

  if (neck === 'medal') {
    for (const sx of [-1, 1]) { const r = box(0.035, 0.2, 0.01, sx < 0 ? 0xe0352b : 0x2f5bd3, 0.004, false); r.position.set(sx * 0.05, H * 0.5, zAt(0.5, sx * 0.05) + 0.02); r.rotation.z = sx * 0.3; torso.add(r); }
    const med = cyl(0.05, 0.05, 0.014, 0xe8b931, 0.006, false); med.rotation.x = Math.PI / 2; med.position.set(0, H * 0.39, zAt(0.39, 0) + 0.03); torso.add(med);
  }
  if (neck === 'lei') {
    const cols = [0xff5fb2, 0xffc93c, 0xffffff, 0xff8a3d];
    for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; const r = surf(0.56) + 0.03; const f = sphere(0.032, cols[k % 4], 0.006, false); f.position.set(Math.sin(a) * r, H * 0.56 - Math.max(0, Math.cos(a)) * 0.06, Math.cos(a) * r); torso.add(f); }
  }
  if (neck === 'whistle') {
    const cord = mesh(own(new THREE.TorusGeometry(surf(0.56) + 0.01, 0.008, 6, 40)), toon(0xe0352b), false); cord.rotation.x = Math.PI / 2 + 0.4; cord.position.set(0, H * 0.52, 0.02); torso.add(cord);
    const w = cyl(0.025, 0.025, 0.07, 0xc9ccd6, 0.006, false); w.rotation.z = Math.PI / 2; w.position.set(0, H * 0.42, zAt(0.42, 0) + 0.035); torso.add(w);
  }
  if (neck === 'ruff') for (let k = 0; k < 3; k++) { const t = mesh(own(new THREE.TorusGeometry(surf(0.6) + 0.03 + k * 0.012, 0.035, 8, 22)), toon(k % 2 ? 0xf2f2f2 : 0xffffff), false); t.rotation.x = Math.PI / 2; t.position.y = H * 0.6 - k * 0.025; torso.add(t); }

  // ---- Espalda ----
  const back = look.back || 'none';
  let cape = null; const wings = [];
  if (back === 'cape') {
    cape = new THREE.Group(); cape.position.set(0, H * 0.62, -surf(0.5) * 0.9); torso.add(cape);
    const cm = mesh(own(new THREE.CylinderGeometry(R * 1.05, R * 1.5, H * 0.62, 20, 4, true, Math.PI * 0.62, Math.PI * 0.76)), own(new THREE.MeshToonMaterial({ color: accentHex, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide })));
    cm.position.set(0, -H * 0.31, R * 0.5); cape.add(cm);
  }
  if (back === 'backpack') {
    const bp = box(R * 1.1, H * 0.32, 0.16, accentHex, 0.014); bp.position.set(0, H * 0.4, -surf(0.4) - 0.05); torso.add(bp);
    const pk = box(R * 0.8, H * 0.12, 0.06, darken(accentHex, 0.2), 0.008, false); pk.position.set(0, H * 0.33, -surf(0.4) - 0.14); torso.add(pk);
  }
  if (back === 'jetpack') {
    const pack = box(R * 0.9, H * 0.34, 0.16, 0xf2f2f4, 0.014); pack.position.set(0, H * 0.43, -surf(0.43) - 0.05); torso.add(pack);
    const top = cyl(0.05, 0.05, 0.05, 0x7b4bd1, 0.01, false); top.position.set(0, H * 0.62, -surf(0.43) - 0.05); torso.add(top);
    for (const sx of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sx * R * 0.4, H * 0.48, -surf(0.48) - 0.08); torso.add(w);
      const wing = box(0.34, 0.035, 0.12, 0xf2f2f4, 0.01); wing.position.x = sx * 0.17; wing.rotation.z = sx * -0.15; w.add(wing);
      const stripe = box(0.12, 0.04, 0.125, 0x3fae3f, 0, false); stripe.position.x = sx * 0.2; stripe.rotation.z = sx * -0.15; w.add(stripe);
      const tip = box(0.05, 0.045, 0.13, 0xe0352b, 0.006, false); tip.position.x = sx * 0.33; tip.rotation.z = sx * -0.15; w.add(tip);
      wings.push({ w, sx, jet: true });
    }
  }
  if (back === 'wings') for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * R * 0.3, H * 0.55, -surf(0.55) + 0.02); torso.add(w);
    const wm = sphere(0.16, 0xffffff, 0.014); wm.scale.set(1.6, 0.9, 0.25); wm.position.set(sx * 0.2, 0.05, -0.04); w.add(wm);
    wings.push({ w, sx });
  }

  const bz = s => -surf(s) - 0.04;
  if (back === 'ninjablades') {
    // dos dagas cruzadas en X: mango envuelto asomando sobre los hombros
    for (const sx of [-1, 1]) {
      const d = new THREE.Group(); d.position.set(0, H * 0.42, bz(0.42) - 0.02); d.rotation.z = sx * 0.62; torso.add(d);
      const sheath = box(0.07, 0.42, 0.04, 0x1c1c24, 0.008); sheath.position.y = -0.02; d.add(sheath);
      const guard = box(0.12, 0.025, 0.05, 0xb08a3c, 0.006, false); guard.position.y = 0.2; d.add(guard);
      const grip = box(0.045, 0.16, 0.04, 0x8b2b2b, 0.006); grip.position.y = 0.3; d.add(grip);
      for (let k = 0; k < 3; k++) { const wrap = box(0.05, 0.012, 0.045, 0x1c1c24, 0, false); wrap.position.y = 0.25 + k * 0.045; wrap.rotation.z = 0.35; d.add(wrap); }
      const pom = sphere(0.025, 0xb08a3c, 0.006, false); pom.position.y = 0.39; d.add(pom);
    }
  }
  if (back === 'katana') {
    const k = new THREE.Group(); k.position.set(0, H * 0.45, bz(0.45) - 0.02); k.rotation.z = -0.7; torso.add(k);
    const sh = box(0.06, 0.62, 0.04, 0x1c1c24, 0.008); k.add(sh);
    const tsuba = cyl(0.05, 0.05, 0.015, 0xb08a3c, 0.006, false); tsuba.position.y = 0.32; k.add(tsuba);
    const grip = box(0.045, 0.2, 0.04, 0xf2eee6, 0.006); grip.position.y = 0.43; k.add(grip);
  }
  if (back === 'guitar') {
    const g = new THREE.Group(); g.position.set(0.02, H * 0.36, bz(0.36) - 0.05); g.rotation.z = 0.5; torso.add(g);
    const b1 = sphere(0.15, 0xb5651d, 0.012); b1.scale.set(1, 1, 0.35); g.add(b1);
    const b2 = sphere(0.11, 0xb5651d, 0.012); b2.scale.set(1, 1, 0.35); b2.position.y = 0.17; g.add(b2);
    const hole = cyl(0.04, 0.04, 0.01, 0x2a1810, 0, false); hole.rotation.x = Math.PI / 2; hole.position.set(0, 0.05, -0.055); g.add(hole);
    const neckG = box(0.045, 0.34, 0.03, 0x5a3416, 0.006); neckG.position.y = 0.4; g.add(neckG);
  }
  if (back === 'shell') {
    const sh = mesh(own(new THREE.SphereGeometry(R * 1.05, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)), toon(0x3e8f4a)); sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 0.5, 1.2); sh.position.set(0, H * 0.38, -surf(0.38) * 0.8); torso.add(sh);
    for (const [x, y] of [[0, 0.38], [-0.12, 0.3], [0.12, 0.3], [-0.1, 0.48], [0.1, 0.48]]) { const p = cyl(0.06, 0.06, 0.02, 0x8bc34a, 0.006, false); p.rotation.x = Math.PI / 2; p.position.set(x, H * y, -surf(0.38) * 0.8 - R * 0.5); torso.add(p); }
  }
  if (back === 'quiver') {
    const q = new THREE.Group(); q.position.set(0.04, H * 0.42, bz(0.42) - 0.02); q.rotation.z = -0.4; torso.add(q);
    const tube = cyl(0.07, 0.06, 0.4, 0x8a5a2b, 0.008); q.add(tube);
    for (let k = -1; k <= 1; k++) { const sh = cyl(0.008, 0.008, 0.16, 0xd9a066, 0, false); sh.position.set(k * 0.03, 0.26, 0); q.add(sh); const f = mesh(own(new THREE.ConeGeometry(0.025, 0.06, 4)), toon(k ? 0xffffff : 0xe0352b), false); f.position.set(k * 0.03, 0.34, 0); q.add(f); }
  }
  if (back === 'surfboard') {
    const sb = sphere(0.2, 0xffffff, 0.012); sb.scale.set(0.55, 2.4, 0.12); sb.position.set(0, H * 0.45, bz(0.45) - 0.03); sb.rotation.z = 0.2; torso.add(sb);
    const st = box(0.03, 0.8, 0.05, accentHex, 0, false); st.position.copy(sb.position); st.position.z -= 0.005; st.rotation.z = 0.2; torso.add(st);
  }

  // ---- Orejas ----
  const ears = look.ears || 'none', sEar = 0.86, yEar = H * sEar, xEar = surf(sEar) * 0.78;
  const earParts = [];
  if (ears !== 'none') for (const sx of [-1, 1]) {
    const g = new THREE.Group(); torso.add(g); earParts.push({ g, sx });
    const inner = lighten(skinHex, 0.35);
    if (ears === 'cat') {
      g.position.set(sx * xEar, yEar + 0.05, 0); g.rotation.z = -sx * 0.35;
      const o = mesh(own(new THREE.ConeGeometry(0.085, 0.17, 4)), toon(skinHex)); o.rotation.y = Math.PI / 4; g.add(o);
      const oo = new THREE.Mesh(own(new THREE.ConeGeometry(0.1, 0.2, 4)), outlineMat); oo.rotation.y = Math.PI / 4; oo.position.y = -0.005; g.add(oo);
      const i = mesh(own(new THREE.ConeGeometry(0.045, 0.1, 4)), toon(0xff9fb6), false); i.rotation.y = Math.PI / 4; i.position.set(0, -0.02, 0.035); g.add(i);
    } else if (ears === 'bear') {
      g.position.set(sx * xEar, yEar + 0.04, 0);
      const o = sphere(0.075, skinHex, 0.014); g.add(o);
      const i = sphere(0.042, inner, 0, false); i.scale.z = 0.4; i.position.z = 0.055; g.add(i);
    } else if (ears === 'bunny') {
      g.position.set(sx * xEar * 0.6, H * 0.93, 0); g.rotation.z = -sx * 0.18;
      const o = capsule(0.045, 0.24, skinHex, 0.014); o.position.y = 0.15; o.scale.z = 0.6; g.add(o);
      const i = capsule(0.022, 0.18, 0xff9fb6, 0, false); i.position.set(0, 0.15, 0.022); i.scale.z = 0.4; g.add(i);
    } else if (ears === 'elf') {
      g.position.set(sx * zAt(0.7, 0) * 0.98, H * 0.7, -0.02); g.rotation.z = -sx * Math.PI / 2.4;
      const o = mesh(own(new THREE.ConeGeometry(0.05, 0.2, 10)), toon(skinHex)); o.position.y = 0.08; o.scale.z = 0.5; g.add(o);
    } else if (ears === 'mouse') {
      g.position.set(sx * xEar * 1.15, yEar + 0.1, -0.03);
      const o = cyl(0.14, 0.14, 0.035, ears === 'mouse' && skinHex === 0x2b2b33 ? 0x1c1c24 : skinHex, 0.014); o.rotation.x = Math.PI / 2; g.add(o);
    } else if (ears === 'dog') {
      g.position.set(sx * surf(0.8), H * 0.8, 0); g.rotation.z = sx * 0.25;
      const o = sphere(0.09, darken(skinHex, 0.25), 0.014); o.scale.set(0.55, 1.4, 0.8); o.position.y = -0.1; g.add(o);
    } else if (ears === 'antenna') {
      g.position.set(sx * xEar * 0.5, H * 0.95, 0); g.rotation.z = -sx * 0.3;
      const st = cyl(0.01, 0.01, 0.18, INK, 0.005, false); st.position.y = 0.09; g.add(st);
      const bb = sphere(0.04, 0xffc93c, 0.01); bb.position.y = 0.2; g.add(bb);
    }
  }

  // ---- Sombreros ----
  const sHat = 0.86, hatY = H * sHat, hatR = surf(sHat) + 0.012;
  const hat = new THREE.Group(); hat.position.y = hatY; torso.add(hat);
  let propeller = null, halo = null;
  const dome = (r, col, scaleY = 1) => {
    const g = new THREE.Group();
    const m = mesh(own(new THREE.SphereGeometry(r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), toon(col)); m.scale.y = scaleY; g.add(m);
    const o = new THREE.Mesh(own(new THREE.SphereGeometry(r + 0.018, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), outlineMat); o.scale.y = scaleY; g.add(o);
    return g;
  };
  const top = H - hatY;
  switch (look.hat) {
    case 'sprout': {
      const stem = cyl(0.012, 0.012, 0.1, 0x3a8f4e, 0.008, false); stem.position.y = top + 0.05; hat.add(stem);
      const leaf = sphere(0.05, 0x5fd36e, 0.01, false); leaf.scale.set(1.4, 0.45, 0.8); leaf.position.set(0.04, top + 0.1, 0); leaf.rotation.z = 0.4; hat.add(leaf);
      break;
    }
    case 'band': {
      const b = mesh(own(new THREE.TorusGeometry(hatR, 0.036, 10, 40)), toon(hatHex)); b.rotation.x = Math.PI / 2; b.position.y = -0.02; hat.add(b);
      const knot = sphere(0.04, hatHex, 0.01, false); knot.position.set(0, -0.02, -hatR); hat.add(knot);
      for (const sx of [-1, 1]) { const tail = box(0.04, 0.12, 0.012, hatHex, 0.006, false); tail.position.set(sx * 0.03, -0.08, -hatR - 0.02); tail.rotation.z = sx * 0.35; hat.add(tail); }
      break;
    }
    case 'cap': case 'capback': {
      const d = dome(hatR + 0.01, hatHex, 0.75); d.position.y = -0.03; hat.add(d);
      const dir = look.hat === 'cap' ? 1 : -1;
      const visor = cyl(0.15, 0.15, 0.02, darken(hatHex, 0.2), 0.01);
      visor.scale.set(1, 1, 0.75); visor.position.set(0, -0.02, dir * (hatR + 0.06)); visor.rotation.x = dir * 0.12; hat.add(visor);
      const btn = sphere(0.025, darken(hatHex, 0.2), 0.008, false); btn.position.y = (hatR + 0.01) * 0.75 - 0.03; hat.add(btn);
      break;
    }
    case 'beanie': {
      const d = dome(hatR + 0.015, hatHex, 1.2); d.position.y = -0.04; hat.add(d);
      const fold = mesh(own(new THREE.TorusGeometry(hatR + 0.015, 0.04, 10, 40)), toon(darken(hatHex, 0.15))); fold.rotation.x = Math.PI / 2; fold.position.y = -0.03; hat.add(fold);
      const pom = sphere(0.07, 0xffffff, 0.012); pom.position.y = (hatR + 0.015) * 1.2 - 0.01; hat.add(pom);
      break;
    }
    case 'propeller': {
      const d = dome(hatR * 0.75, hatHex, 0.8); d.position.y = top * 0.55; hat.add(d);
      const stem = cyl(0.012, 0.012, 0.1, 0xffc93c, 0.006, false); stem.position.y = top * 0.55 + hatR * 0.6 + 0.04; hat.add(stem);
      propeller = new THREE.Group(); propeller.position.y = stem.position.y + 0.05; hat.add(propeller);
      for (const [rot, col] of [[0, 0xff5a6e], [Math.PI / 2, 0x3b9bff]]) { const blade = box(0.24, 0.01, 0.045, col, 0.007, false); blade.rotation.y = rot; propeller.add(blade); }
      break;
    }
    case 'tophat': {
      const g = new THREE.Group(); g.position.y = top - 0.02; g.rotation.z = 0.14; hat.add(g);
      g.add(cyl(hatR * 1.1, hatR * 1.1, 0.025, INK, 0.012));
      const crown = cyl(hatR * 0.72, hatR * 0.78, 0.3, INK, 0.015); crown.position.y = 0.16; g.add(crown);
      const band = cyl(hatR * 0.785, hatR * 0.79, 0.06, hatHex, 0, false); band.position.y = 0.05; g.add(band);
      break;
    }
    case 'crown': {
      const g = new THREE.Group(); g.position.y = top - 0.03; hat.add(g);
      const rg = cyl(hatR * 0.7, hatR * 0.66, 0.1, 0xffc93c, 0.012); rg.position.y = 0.05; g.add(rg);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = mesh(own(new THREE.ConeGeometry(0.035, 0.09, 8)), toon(0xffc93c));
        spike.position.set(Math.sin(a) * hatR * 0.68, 0.14, Math.cos(a) * hatR * 0.68); g.add(spike);
        const gem = sphere(0.018, i % 2 ? 0xff5a6e : 0x3b9bff, 0, false); gem.position.set(Math.sin(a) * hatR * 0.72, 0.05, Math.cos(a) * hatR * 0.72); g.add(gem);
      }
      break;
    }
    case 'cowboy': {
      const g = new THREE.Group(); g.position.y = top * 0.45; hat.add(g);
      const brim = cyl(hatR * 1.75, hatR * 1.75, 0.025, hatHex, 0.012); brim.scale.z = 0.85; g.add(brim);
      for (const sx of [-1, 1]) { const up = cyl(hatR * 0.5, hatR * 0.5, 0.025, hatHex, 0.01, false); up.position.set(sx * hatR * 1.45, 0.05, 0); up.rotation.z = sx * 0.9; up.scale.z = 1.6; g.add(up); }
      const crown = cyl(hatR * 0.78, hatR * 0.9, 0.2, hatHex, 0.014); crown.position.y = 0.11; g.add(crown);
      const band = cyl(hatR * 0.905, hatR * 0.91, 0.04, 0x3a2416, 0, false); band.position.y = 0.03; g.add(band);
      break;
    }
    case 'viking': {
      const d = dome(hatR + 0.02, 0x9aa3ad, 0.85); d.position.y = -0.02; hat.add(d);
      const rim = mesh(own(new THREE.TorusGeometry(hatR + 0.02, 0.025, 8, 40)), toon(0x7a6a4a)); rim.rotation.x = Math.PI / 2; rim.position.y = -0.02; hat.add(rim);
      for (const sx of [-1, 1]) {
        const horn = mesh(own(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI * 0.55)), toon(0xf2eee6));
        horn.position.set(sx * (hatR + 0.02), 0.06, 0); horn.rotation.set(0, sx > 0 ? 0 : Math.PI, Math.PI * 0.05); hat.add(horn);
      }
      break;
    }
    case 'chef': {
      const g = new THREE.Group(); g.position.y = top * 0.3; hat.add(g);
      g.add(cyl(hatR * 0.85, hatR * 0.85, 0.16, 0xffffff, 0.014));
      for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; const p = sphere(0.1, 0xffffff, 0.014); p.position.set(Math.sin(a) * hatR * 0.45, 0.17, Math.cos(a) * hatR * 0.45); g.add(p); }
      const p0 = sphere(0.12, 0xffffff, 0.014); p0.position.y = 0.2; g.add(p0);
      break;
    }
    case 'pirate': {
      const g = new THREE.Group(); g.position.y = top * 0.45; hat.add(g);
      const crown = dome(hatR * 0.95, hatHex, 0.7); g.add(crown);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const flap = box(hatR * 1.4, 0.12, 0.03, hatHex, 0.01); flap.position.set(Math.sin(a) * hatR * 0.7, 0.06, Math.cos(a) * hatR * 0.7); flap.rotation.set(-0.5, a, 0); g.add(flap); }
      const sk = sphere(0.035, 0xffffff, 0.006, false); sk.position.set(0, 0.1, hatR * 0.95); g.add(sk);
      break;
    }
    case 'party': {
      const tex = own(canvasTex(64, 64, (g2, w, h) => { g2.fillStyle = '#' + new THREE.Color(hatHex).getHexString(); g2.fillRect(0, 0, w, h); g2.fillStyle = '#ffffff'; for (let y = 0; y < h; y += 16) g2.fillRect(0, y, w, 6); }, 1, 2));
      const cone = mesh(own(new THREE.ConeGeometry(hatR * 0.55, 0.32, 20)), tmat(0, tex)); cone.position.y = top + 0.1; cone.rotation.z = 0.15; hat.add(cone);
      const pom = sphere(0.04, 0xffc93c, 0.01); pom.position.set(-0.02, top + 0.27, 0); hat.add(pom);
      break;
    }
    case 'halo': {
      halo = new THREE.Mesh(own(new THREE.TorusGeometry(hatR * 0.7, 0.022, 10, 40)), own(new THREE.MeshBasicMaterial({ color: 0xffe58a })));
      halo.rotation.x = Math.PI / 2; halo.position.y = top + 0.14; hat.add(halo);
      break;
    }
    case 'headphones': {
      const arc = mesh(own(new THREE.TorusGeometry(hatR + 0.02, 0.025, 8, 30, Math.PI)), toon(hatHex)); arc.position.y = -0.05; hat.add(arc);
      for (const sx of [-1, 1]) { const cup = cyl(0.08, 0.08, 0.06, hatHex, 0.012); cup.rotation.z = Math.PI / 2; cup.position.set(sx * (hatR + 0.03), -0.06, 0); hat.add(cup); }
      break;
    }
    case 'afro': {
      for (let k = 0; k < 9; k++) {
        const a = k / 9 * Math.PI * 2, s = sphere(0.13, hairHex, k === 0 ? 0.02 : 0.02);
        s.position.set(Math.sin(a) * hatR * 0.7, 0.02 + (k % 2) * 0.05, Math.cos(a) * hatR * 0.7 - 0.02); hat.add(s);
      }
      const t0 = sphere(0.17, hairHex, 0.02); t0.position.set(0, top * 0.6 + 0.06, -0.02); hat.add(t0);
      break;
    }
    case 'mohawk': {
      for (let k = 0; k < 6; k++) { const z = -hatR * 0.85 + k * hatR * 0.34; const sp = mesh(own(new THREE.ConeGeometry(0.045, 0.2, 6)), toon(hairHex)); sp.position.set(0, top * 0.75 + 0.07 - Math.abs(z) * 0.25, z); sp.rotation.x = z * 0.6; hat.add(sp); }
      break;
    }
    case 'buzz': { const d = dome(hatR + 0.004, hairHex, 0.55); d.position.y = -0.02; hat.add(d); break; }
    case 'spiky': {
      // melena de puntas hacia arriba y hacia fuera
      const d = dome(hatR + 0.01, hairHex, 0.7); d.position.y = -0.03; hat.add(d);
      const spikes = [[0, 0.32, 0, 0], [0.12, 0.27, -0.05, 0.45], [-0.12, 0.27, -0.05, -0.45], [0.2, 0.18, -0.02, 0.9], [-0.2, 0.18, -0.02, -0.9],
        [0.08, 0.24, -0.15, 0.3], [-0.08, 0.24, -0.15, -0.3], [0.17, 0.08, 0.06, 1.2], [-0.17, 0.08, 0.06, -1.2], [0, 0.2, 0.1, 0.05]];
      for (const [x, y, z, rz] of spikes) {
        const s = mesh(own(new THREE.ConeGeometry(0.07, 0.24, 7)), toon(hairHex));
        s.position.set(x * R / 0.31, y + top * 0.35 - 0.12, z); s.rotation.set(z * -2, 0, -rz); hat.add(s);
        const so = new THREE.Mesh(own(new THREE.ConeGeometry(0.085, 0.27, 7)), outlineMat); so.position.copy(s.position); so.rotation.copy(s.rotation); so.position.y -= 0.01; hat.add(so);
      }
      for (const sx of [-1, 0.4, 1]) { const f = mesh(own(new THREE.ConeGeometry(0.04, 0.12, 6)), toon(hairHex), false); f.position.set(sx * 0.07, -0.02, hatR * 0.9); f.rotation.set(1.9, 0, sx * 0.5); hat.add(f); }
      break;
    }
    case 'slick': {
      const d = dome(hatR + 0.012, hairHex, 0.62); d.position.y = -0.03; hat.add(d);
      const swoop = sphere(0.09, hairHex, 0.014); swoop.scale.set(1.6, 0.55, 1); swoop.position.set(0.03, (hatR + 0.012) * 0.5, hatR * 0.55); swoop.rotation.z = -0.2; hat.add(swoop);
      break;
    }
    case 'helmet': {
      // capucha morada + casco esférico de cristal
      const hood = dome(hatR + 0.012, accentHex, 0.95); hood.position.y = -0.08; hat.add(hood);
      const glassR = Math.max(H - H * 0.5, R * 1.15) * 0.62 + 0.05;
      const glass = new THREE.Mesh(own(new THREE.SphereGeometry(glassR, 28, 20)), own(new THREE.MeshBasicMaterial({ color: 0xd8f3ff, transparent: true, opacity: 0.3, depthWrite: false })));
      glass.position.set(0, H * 0.74 - hatY + 0.02, 0.02); hat.add(glass);
      const edge = new THREE.Mesh(glass.geometry, own(new THREE.MeshBasicMaterial({ color: 0x9fdcff, side: THREE.BackSide, transparent: true, opacity: 0.75, depthWrite: false })));
      edge.scale.setScalar(1.045); glass.add(edge);
      const shine = mesh(own(new THREE.SphereGeometry(glassR * 0.18, 12, 8)), own(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })), false);
      shine.scale.set(1, 0.5, 0.3); shine.position.set(-glassR * 0.45, H * 0.74 - hatY + glassR * 0.5, glassR * 0.62); hat.add(shine);
      const rim = mesh(own(new THREE.TorusGeometry(glassR * 0.98, 0.03, 8, 40)), toon(0x7b4bd1), false); rim.rotation.x = Math.PI / 2; rim.position.y = H * 0.74 - hatY - glassR * 0.55; rim.scale.set(1, 1, 0.9); hat.add(rim);
      break;
    }
    case 'topknot': {
      // pelo tirante y el moño de sumo (chonmage) doblado hacia delante
      const d = dome(hatR + 0.008, hairHex, 0.6); d.position.y = -0.03; hat.add(d);
      const bun = capsule(0.045, 0.12, hairHex, 0.012); bun.rotation.x = Math.PI / 2 - 0.4; bun.position.set(0, top * 0.62, 0.02); hat.add(bun);
      const tie = cyl(0.05, 0.05, 0.03, 0xffffff, 0.006, false); tie.rotation.x = Math.PI / 2 - 0.4; tie.position.set(0, top * 0.6, -0.04); hat.add(tie);
      break;
    }
    case 'hachimaki': {
      const b = mesh(own(new THREE.TorusGeometry(hatR, 0.04, 10, 40)), toon(hatHex)); b.rotation.x = Math.PI / 2; b.position.y = -0.03; hat.add(b);
      const sun = mesh(own(new THREE.CircleGeometry(0.045, 24)), toon(0xe8301f), false); sun.position.set(0, -0.03, hatR + 0.042); hat.add(sun);
      for (const sx of [-1, 1]) { const t = box(0.05, 0.16, 0.015, hatHex, 0.005, false); t.position.set(sx * 0.04, -0.1, -hatR - 0.03); t.rotation.set(0.3, 0, sx * 0.35); hat.add(t); }
      break;
    }
    case 'ninjahood': {
      const d = dome(hatR + 0.03, hatHex, 1.05); d.position.y = -0.1; hat.add(d);
      const tail = box(0.05, 0.18, 0.015, hatHex, 0.005, false); tail.position.set(0.04, -0.06, -hatR - 0.03); tail.rotation.set(0.4, 0, 0.3); hat.add(tail);
      break;
    }
    case 'kasa': {
      const c = mesh(own(new THREE.ConeGeometry(hatR * 2.3, 0.24, 28, 1, true)), own(new THREE.MeshToonMaterial({ color: 0xd9b56a, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide }))); c.position.y = top * 0.5 + 0.06; hat.add(c);
      for (let k = 1; k < 4; k++) { const r = mesh(own(new THREE.TorusGeometry(hatR * 2.3 * (1 - k * 0.22), 0.006, 4, 40)), toon(0x9c7a3c), false); r.rotation.x = Math.PI / 2; r.position.y = top * 0.5 + 0.06 - 0.12 + k * 0.055; hat.add(r); }
      break;
    }
    case 'sombrero': {
      const brim = cyl(hatR * 2.5, hatR * 2.5, 0.025, hatHex, 0.012); brim.position.y = top * 0.4; hat.add(brim);
      const lip = mesh(own(new THREE.TorusGeometry(hatR * 2.5, 0.03, 8, 40)), toon(hatHex), false); lip.rotation.x = Math.PI / 2; lip.position.y = top * 0.4 + 0.02; hat.add(lip);
      const crown = cyl(hatR * 0.55, hatR * 0.85, 0.24, hatHex, 0.012); crown.position.y = top * 0.4 + 0.13; hat.add(crown);
      const band = cyl(hatR * 0.86, hatR * 0.86, 0.04, accentHex, 0, false); band.position.y = top * 0.4 + 0.04; hat.add(band);
      break;
    }
    case 'wizard': {
      const brim = cyl(hatR * 1.6, hatR * 1.6, 0.02, hatHex, 0.01); brim.position.y = top * 0.45; hat.add(brim);
      const cone = mesh(own(new THREE.ConeGeometry(hatR * 0.9, 0.46, 20)), toon(hatHex)); cone.position.set(0, top * 0.45 + 0.23, -0.02); cone.rotation.x = -0.15; hat.add(cone);
      for (const [x, y, z] of [[0.06, 0.12, 0.12], [-0.08, 0.25, 0.08], [0.03, 0.36, 0.04]]) { const s = sphere(0.02, 0xffd166, 0, false); s.position.set(x, top * 0.45 + y, z); hat.add(s); }
      break;
    }
    case 'grad': {
      const cap = dome(hatR + 0.01, 0x1c1c24, 0.5); cap.position.y = -0.01; hat.add(cap);
      const board = box(hatR * 2.1, 0.025, hatR * 2.1, 0x1c1c24, 0.008); board.position.y = top * 0.55; board.rotation.y = Math.PI / 4; hat.add(board);
      const tas = box(0.012, 0.14, 0.012, 0xffc93c, 0, false); tas.position.set(hatR * 0.9, top * 0.55 - 0.07, 0); hat.add(tas);
      break;
    }
    case 'beret': { const b = sphere(hatR * 1.05, hatHex, 0.012); b.scale.set(1.1, 0.35, 1.1); b.position.set(0.04, top * 0.55, 0); b.rotation.z = -0.2; hat.add(b); const st = cyl(0.01, 0.01, 0.04, hatHex, 0, false); st.position.set(0.04, top * 0.55 + hatR * 0.37, 0); hat.add(st); break; }
    case 'santa': {
      const cone = mesh(own(new THREE.ConeGeometry(hatR * 0.95, 0.4, 20)), toon(0xd62828)); cone.position.set(0.05, top * 0.5 + 0.17, 0); cone.rotation.z = -0.5; hat.add(cone);
      const trim = mesh(own(new THREE.TorusGeometry(hatR, 0.045, 10, 36)), toon(0xffffff)); trim.rotation.x = Math.PI / 2; trim.position.y = top * 0.4; hat.add(trim);
      const pom = sphere(0.05, 0xffffff, 0.01); pom.position.set(0.2, top * 0.5 + 0.28, 0); hat.add(pom);
      break;
    }
    case 'unicorn': {
      const horn = mesh(own(new THREE.ConeGeometry(0.05, 0.24, 14)), toon(0xfff3c4)); horn.position.set(0, top * 0.55 + 0.1, hatR * 0.45); horn.rotation.x = 0.35; hat.add(horn);
      for (let k = 0; k < 3; k++) { const r = mesh(own(new THREE.TorusGeometry(0.04 - k * 0.011, 0.007, 4, 16)), toon(0xe8b931), false); r.rotation.x = Math.PI / 2 + 0.35; r.position.set(0, top * 0.55 + 0.04 + k * 0.06, hatR * 0.45 + 0.02 + k * 0.02); hat.add(r); }
      break;
    }
    case 'flower': {
      const v = mesh(own(new THREE.TorusGeometry(hatR * 0.95, 0.018, 6, 36)), toon(0x3e8f4a), false); v.rotation.x = Math.PI / 2; v.position.y = top * 0.35; hat.add(v);
      const cols = [0xff5fb2, 0xffc93c, 0xffffff, 0xff8a3d, 0xb39cff];
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const f = sphere(0.036, cols[k % 5], 0.006, false); f.position.set(Math.sin(a) * hatR * 0.95, top * 0.35 + 0.01, Math.cos(a) * hatR * 0.95); hat.add(f); }
      break;
    }
    case 'laurel': {
      const band = mesh(own(new THREE.TorusGeometry(hatR, 0.012, 6, 36)), toon(0x3d7a33), false); band.rotation.x = Math.PI / 2; band.position.y = -0.02; hat.add(band);
      for (const side of [-1, 1]) for (let k = 0; k < 8; k++) for (const row of [0, 1]) {
        const a = side * (0.25 + k * 0.32) + Math.PI;            // de atrás (lazo) hacia la frente
        const leaf = mesh(own(new THREE.SphereGeometry(0.045, 8, 6)), toon(row ? 0x6fb84a : 0x4f9a38), false);
        leaf.scale.set(0.5, 0.32, 1.25);
        leaf.position.set(Math.sin(a) * (hatR + 0.01), -0.02 + (row ? 0.035 : -0.005), Math.cos(a) * (hatR + 0.01));
        leaf.rotation.set(row ? -0.5 : 0.4, a + side * 0.5, side * 0.3); hat.add(leaf);
      }
      for (const s of [-1, 1]) { const rib = box(0.03, 0.12, 0.01, 0xf2b632, 0.004, false); rib.position.set(s * 0.04, -0.09, hatR); rib.rotation.z = s * 0.25; hat.add(rib); }
      break;
    }
    case 'bucket': {
      const crown = cyl(hatR * 0.85, hatR + 0.02, 0.16, hatHex, 0.012); crown.position.y = top * 0.35; hat.add(crown);
      const brim = mesh(own(new THREE.CylinderGeometry(hatR + 0.02, hatR * 1.55, 0.07, 28, 1, true)), own(new THREE.MeshToonMaterial({ color: hatHex, gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide }))); brim.position.y = top * 0.35 - 0.1; hat.add(brim);
      break;
    }
    default: break;
  }

  // ---- Zapatillas ----
  const feet = [];
  for (const sx of [-1, 1]) {
    const f = new THREE.Group(); f.position.set(sx * Math.max(0.12, R * 0.45), 0.06, 0.03); root.add(f);
    const shoe = sphere(0.1, new THREE.Color(look.shoes || '#ffffff').getHex(), 0.016); shoe.scale.set(1, 0.62, 1.45); f.add(shoe);
    const sole = cyl(0.1, 0.1, 0.03, shirtHex === 0xffffff ? 0x2d2366 : shirtHex, 0.012, false); sole.scale.set(1, 1, 1.45); sole.position.y = -0.04; f.add(sole);
    const lace = box(0.08, 0.012, 0.03, INK, 0, false); lace.position.set(0, 0.055, 0.06); f.add(lace);
    feet.push(f);
  }

  // ---- Brazos y raqueta ----
  const shoulderY = FOOT + H * 0.5, shoulderX = R * 0.42;
  const armCol = longSleeve ? shirtHex : skinHex;
  const handCol = look.gloves ? new THREE.Color(look.gloves).getHex() : skinHex;
  const ghostArm = toon(armCol).clone(), ghostHand = toon(handCol).clone(), ghostLine = outlineMat.clone();
  owned.push(ghostArm, ghostHand, ghostLine);
  const armPivot = new THREE.Group(); armPivot.position.set(-shoulderX, shoulderY, 0); body.add(armPivot);
  const handPos = new THREE.Vector3(-0.4, 0, 0.1);
  const arm = capsule(0.047, 0.24, armCol, 0.016);
  arm.position.copy(handPos).multiplyScalar(0.5);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), handPos.clone().normalize());
  armPivot.add(arm);
  const sleeveCol = shirt === 'overalls' ? accentHex : shirtHex;
  if (sleeveShirt) { const sleeve = cyl(0.064, 0.07, 0.11, sleeveCol, 0.014); sleeve.position.y = -0.1; arm.add(sleeve); }
  if (shirt === 'gi') { const wb = cyl(0.058, 0.058, 0.06, accentHex, 0.012); wb.position.y = 0.1; arm.add(wb); }
  if (shirt === 'spacesuit') { const sb = cyl(0.056, 0.056, 0.05, 0x3fae3f, 0.01, false); sb.position.y = 0.02; arm.add(sb); }
  const hand = sphere(0.068, handCol, 0.016); hand.position.copy(handPos); armPivot.add(hand);
  arm.children[0].material = ghostArm; arm.children[1].material = ghostLine;
  hand.children[0].material = ghostHand; hand.children[1].material = ghostLine;
  // raqueta: forma según el tipo y goma del color elegido
  const paddle = new THREE.Group(); paddle.position.copy(handPos); armPivot.add(paddle);
  paddle.rotation.order = 'XZY';   // el giro Y (sobre el mango) se aplica primero
  const ptype = look.paddleType || 'balanced';
  const rubber = new THREE.Color(look.paddleColor || '#f03e3e').getHex();
  // Pala de verdad: hoja de madera redondeada (algo más alta que ancha) que se estrecha en los hombros
  // hacia el cuello, dos gomas (delante del color elegido, detrás negra) con borde de madera y corte recto
  // sobre el cuello, y mango abocinado más grueso que la hoja con franja de agarre. El mango termina
  // por debajo de la goma, así que nunca la atraviesa.
  const PCY = 0.16;                                                       // centro de la hoja (desde la mano)
  const dims = { control: [0.108, 0.112], fast: [0.088, 0.106], power: [0.1, 0.104] }[ptype] || [0.098, 0.102];
  const [pa, pb] = dims, woodT = ptype === 'power' ? 0.011 : 0.007;
  const bladeR = pa;
  const ccw = pts => { let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; } return A < 0 ? pts.reverse() : pts; };
  const offsetPts = (pts, d) => pts.map((p, i) => {
    const a = pts[(i - 1 + pts.length) % pts.length], c = pts[(i + 1) % pts.length];
    let nx = (p[1] - a[1]) + (c[1] - p[1]), ny = -(p[0] - a[0]) - (c[0] - p[0]);
    const L = Math.hypot(nx, ny) || 1; return [p[0] + nx / L * d, p[1] + ny / L * d];
  });
  const extr = (pts, depth, bevel = 0) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))),
      { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return own(g);
  };
  const piece = (pts, depth, color, bevel = 0, outline = true) => {
    const grp = new THREE.Group();
    grp.add(mesh(extr(pts, depth, bevel), toon(color)));
    if (outline) grp.add(new THREE.Mesh(extr(offsetPts(pts, 0.006), depth + bevel * 2 + 0.012), outlineMat));
    return grp;
  };
  // contorno de la hoja: superelipse + hombros curvos hasta el cuello
  const yT = PCY - pb - 0.008, tw = 0.017, se = 2.25, gap = 0.62;
  const blade2 = [];
  for (let i = 0; i <= 56; i++) {
    const t = -Math.PI / 2 + gap + (2 * Math.PI - 2 * gap) * i / 56, c = Math.cos(t), s = Math.sin(t);
    blade2.push([pa * Math.sign(c) * Math.abs(c) ** (2 / se), PCY + pb * Math.sign(s) * Math.abs(s) ** (2 / se)]);
  }
  const [lx, ly] = blade2[blade2.length - 1];
  const q = (p0, p1, p2, t) => [(1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]];
  for (let i = 1; i <= 8; i++) blade2.push(q([lx, ly], [-tw * 1.25, yT + 0.012], [-tw, yT], i / 8));
  for (let i = 0; i < 8; i++) blade2.push(q([tw, yT], [tw * 1.25, yT + 0.012], [-lx, ly], i / 8));
  ccw(blade2);
  // goma: la hoja recortada sobre el cuello (línea recta) y metida un poco hacia dentro (se ve el canto de madera)
  const yR = PCY - pb * 0.8;
  const clipY = (pts, y0) => { const out = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], n = pts[(i + 1) % pts.length], pi = p[1] >= y0, ni = n[1] >= y0; if (pi) out.push(p); if (pi !== ni) { const f = (y0 - p[1]) / (n[1] - p[1]); out.push([p[0] + (n[0] - p[0]) * f, y0]); } } return out; };
  const rubber2 = offsetPts(clipY(blade2, yR), -0.0035);
  const wood = ptype === 'power' ? 0x8a5a2b : 0xe3b47a;
  paddle.add(piece(blade2, woodT, wood, 0.0012));
  const rubT = 0.0025, zR = woodT / 2 + 0.0012 + rubT / 2;
  const rubFront = piece(rubber2, rubT, rubber, 0, false); rubFront.position.z = zR; paddle.add(rubFront);
  const rubBack = piece(rubber2, rubT, 0x1d1d22, 0, false); rubBack.position.z = -zR; paddle.add(rubBack);
  // mango abocinado (FL): más ancho en el extremo, con franja de agarre del color de la goma
  const yTop = yT + 0.014, yE = -0.055;
  const handle2 = ccw([[-0.021, yTop], [-0.0165, yT - 0.012], [-0.0155, yT - 0.035], [-0.0165, -0.02], [-0.021, yE + 0.016], [-0.017, yE], [0.017, yE], [0.021, yE + 0.016], [0.0165, -0.02], [0.0155, yT - 0.035], [0.0165, yT - 0.012], [0.021, yTop]]);
  paddle.add(piece(handle2, 0.02, ptype === 'power' ? 0x3a2416 : wood, 0.003));
  const grip2 = ccw([[-0.0085, 0.028], [-0.009, -0.02], [-0.0115, yE + 0.012], [0.0115, yE + 0.012], [0.009, -0.02], [0.0085, 0.028]]);
  const grip = piece(grip2, 0.0275, ptype === 'power' ? 0x1d1d22 : darken(rubber, 0.15), 0.0015, false); paddle.add(grip);
  if (ptype === 'spin') {   // espiral decorativa
    const sp = mesh(own(new THREE.TorusGeometry(bladeR * 0.55, 0.008, 6, 24, Math.PI * 1.5)), toon(0xffffff), false);
    sp.position.set(0, PCY + 0.005, zR + rubT / 2 + 0.0008); paddle.add(sp);
  }
  if (ptype === 'fast') { const bolt = box(0.02, 0.1, 0.002, 0xffd166, 0, false); bolt.rotation.z = 0.4; bolt.position.set(0, PCY + 0.005, zR + rubT / 2 + 0.001); paddle.add(bolt); }
  // brazo libre (el otro)
  const offPivot = new THREE.Group(); offPivot.position.set(shoulderX, shoulderY, 0); body.add(offPivot);
  const offPos = new THREE.Vector3(0.3, -0.18, 0.1);
  const offArm = capsule(0.045, 0.18, armCol, 0.016);
  offArm.position.copy(offPos).multiplyScalar(0.5);
  offArm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), offPos.clone().normalize());
  offPivot.add(offArm);
  if (sleeveShirt) { const sl = cyl(0.062, 0.068, 0.1, sleeveCol, 0.014); sl.position.y = -0.08; offArm.add(sl); }
  if (shirt === 'gi') { const wb = cyl(0.056, 0.056, 0.06, accentHex, 0.012); wb.position.y = 0.08; offArm.add(wb); }
  if (shirt === 'spacesuit') { const sb = cyl(0.054, 0.054, 0.05, 0x3fae3f, 0.01, false); sb.position.y = 0.01; offArm.add(sb); }
  const offHand = sphere(0.066, handCol, 0.016); offHand.position.copy(offPos); offPivot.add(offHand);
  // Juez: sin raqueta, con silbato y un mosaico de censura para sus gestos poco deportivos
  let censor = null, whistle = null;
  if (referee) {
    paddle.visible = false;
    whistle = cyl(0.022, 0.022, 0.07, 0xd8d8d8, 0.006, false); whistle.rotation.x = Math.PI / 2; whistle.position.set(0.02, yMouth + 0.005, zMouth + 0.04); whistle.visible = false; torso.add(whistle);
    const mos = canvasTex(32, 32, (g, w, h) => { for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const v = 120 + Math.floor(Math.random() * 120); g.fillStyle = `rgb(${v},${Math.floor(v * 0.8)},${Math.floor(v * 0.75)})`; g.fillRect(x, y, 8, 8); } });
    mos.magFilter = THREE.NearestFilter; mos.minFilter = THREE.NearestFilter; owned.push(mos);
    censor = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: mos, depthTest: false })));
    censor.scale.set(0.2, 0.2, 1); censor.position.set(0.05, 0.07, 0); censor.renderOrder = 20; censor.visible = false; offHand.add(censor);
  }

  // ---- Materiales propios (para poder hacerlo semitransparente sin afectar a otros) ----
  const fadeMats = [];
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    if (o.material === ghostArm || o.material === ghostHand || o.material === ghostLine) { fadeMats.push(o.material); return; }
    o.material = own(o.material.clone());
    fadeMats.push(o.material);
  });
  for (const m of fadeMats) { m.userData.baseOpacity = m.opacity; m.userData.baseT = m.transparent; }

  // ---------- Animación ----------
  const st = { walk: 0, blink: 1 + Math.random() * 3, armY: 0.3, armZ: 0, fp: false, wasFree: false, look: new THREE.Vector3(), lookT: 0, mouthT: 0, spin: 0, lidL: -1.2, browY: 0, browR: 0, opacity: 1 };
  const tmp = new THREE.Vector3(), upV = new THREE.Vector3(), handL = new THREE.Vector3(), dirV = new THREE.Vector3();
  const Y_UP = new THREE.Vector3(0, 1, 0), Z_F = new THREE.Vector3(0, 0, 1);
  const armRest = { pos: arm.position.clone(), quat: arm.quaternion.clone() };
  const ease = (cur, target, k) => cur + (target - cur) * Math.min(1, k);
  const baseLid = { normal: -1.25, sleepy: -0.6, drunk: -0.7, red: -1.1, stars: -1.4, lashes: -1.3, cyclops: -1.2, angry: -0.85 }[eyeType] ?? -1.25;
  const baseBrow = { angry: 0.45, red: 0.3, drunk: -0.2, sleepy: -0.1 }[eyeType] || 0;

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
  // Semitransparencia (para que el jugador no tape la bola)
  function setOpacity(o) {
    if (st.fp || Math.abs(o - st.opacity) < 0.01) return;
    const wasT = st.opacity < 0.99, isT = o < 0.99;
    st.opacity = o;
    for (const m of fadeMats) {
      m.opacity = (m.userData.baseOpacity ?? 1) * (m.side === THREE.BackSide ? o * o : o);
      if (wasT !== isT) { m.transparent = isT || !!m.userData.baseT; m.depthWrite = !isT && !m.userData.baseT; m.needsUpdate = true; }
    }
  }

  // ---- Poderes de racha (se crean la primera vez que hacen falta) ----
  let pv = null;
  function buildPowerFx() {
    pv = { ps: 1, wasDizzy: false };
    const add = (m) => { owned.push(m.geometry, m.material); return m; };
    // estrellitas del mareo girando sobre la cabeza
    pv.stars = new THREE.Group(); pv.stars.position.y = H + 0.16; root.add(pv.stars);
    for (let i = 0; i < 4; i++) {
      const s = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe066 : 0xffffff })));
      s.scale.y = 0.6; pv.stars.add(s);
    }
    // bloque de hielo
    pv.ice = add(new THREE.Mesh(new THREE.BoxGeometry(R * 2 + 0.34, H + 0.28, R * 2 + 0.34),
      new THREE.MeshToonMaterial({ color: 0x9fe6ff, transparent: true, opacity: 0.42, depthWrite: false })));
    pv.ice.position.y = (H + 0.28) / 2; root.add(pv.ice);
    const iceOut = add(new THREE.Mesh(new THREE.BoxGeometry(R * 2 + 0.37, H + 0.31, R * 2 + 0.37), new THREE.MeshBasicMaterial({ color: 0x5ab8e0, side: THREE.BackSide, transparent: true, opacity: 0.7 })));
    pv.ice.add(iceOut);
    // llamas alrededor del cuerpo
    pv.fire = new THREE.Group(); root.add(pv.fire);
    pv.flames = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 7) * Math.PI * 2 + (i >= 7 ? 0.45 : 0), hi = i >= 7;
      const fl = add(new THREE.Mesh(new THREE.ConeGeometry(hi ? 0.06 : 0.1, hi ? 0.32 : 0.55, 8), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xffd23f : 0xff5a1f, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })));
      fl.position.set(Math.sin(a) * (R + (hi ? 0.02 : 0.08)), hi ? H * 0.45 : 0.27, Math.cos(a) * (R + (hi ? 0.02 : 0.08))); pv.fire.add(fl); pv.flames.push({ fl, a, hi, y0: fl.position.y, ph: Math.random() * 6 });
    }
    // aro dorado del imán alrededor de la pala
    pv.mag = add(new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.012, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.9 })));
    pv.mag.position.y = 0.16; paddle.add(pv.mag);
  }
  function powerFx(f, dt, t) {
    const any = f.pad !== 1 || f.dizzy || f.frozen || f.fire || f.magnet;
    if (!pv) { if (!any) return; buildPowerFx(); }
    pv.ps += (f.pad - pv.ps) * Math.min(1, dt * 8);
    paddle.scale.setScalar(pv.ps);
    pv.stars.visible = f.dizzy && !st.fp;
    if (f.dizzy) {
      pv.stars.rotation.y = t * 4;
      pv.stars.children.forEach((s, i) => { const a = (i / 4) * Math.PI * 2; s.position.set(Math.cos(a) * 0.26, Math.sin(t * 6 + i) * 0.04, Math.sin(a) * 0.26); s.rotation.y = t * 8; });
      // le baila el brazo y se tambalea
      armPivot.rotation.z += Math.sin(t * 8.5) * 0.5; armPivot.rotation.x = Math.sin(t * 6.1) * 0.4;
      body.rotation.z += Math.sin(t * 2.4) * 0.14;
      pv.wasDizzy = true;
    } else if (pv.wasDizzy) { armPivot.rotation.x = 0; pv.wasDizzy = false; }
    pv.ice.visible = f.frozen;
    if (f.frozen) { const k = Math.min(1, (pv.iceT = (pv.iceT || 0) + dt * 4)); pv.ice.scale.set(1, k, 1); pv.ice.position.y = (H + 0.28) * k / 2; } else pv.iceT = 0;
    pv.fire.visible = f.fire;
    if (f.fire) for (const q of pv.flames) { const k = 0.7 + Math.abs(Math.sin(t * 11 + q.ph)) * 0.8; q.fl.scale.set(1, k, 1); q.fl.position.y = q.y0 * (q.hi ? 1 : k) + (q.hi ? ((t * 0.9 + q.ph) % 1) * 0.35 : 0); if (q.hi) q.fl.material.opacity = 0.85 * (1 - ((t * 0.9 + q.ph) % 1)); }
    pv.mag.visible = f.magnet;
    if (f.magnet) { pv.mag.rotation.z = t * 3; pv.mag.scale.setScalar(1 + Math.sin(t * 9) * 0.08); }
  }

  function sync(c, dt, ball, t) {
    root.position.set(c.x, 0, c.z);
    const sp = Math.hypot(c.vx, c.vz);
    st.walk += sp * dt * 11;
    const flip = rotationY !== 0 ? -1 : 1;
    const lvx = c.vx * flip, lvz = c.vz * flip;
    const k10 = dt * 10;
    const em = c.emote, ek = em ? em.dur - em.t : 0;          // tiempo dentro del emote

    // Estado emocional
    const focus = c.charging || c.focus;
    const happy = c.mood > 0, sad = c.mood < 0;
    const celebrating = c.celebrate > 0;

    // Cuerpo: inclinación, botes, respiración, saltos, giro de celebración
    let rz = -lvx * 0.07, rx = lvz * 0.05 + (sad ? 0.16 : 0) + (c.charging ? 0.08 : 0);
    if (eyeType === 'drunk') rz += Math.sin(t * 1.7) * 0.07;
    let jump = celebrating && happy ? Math.abs(Math.sin(c.celebrate * 7)) * 0.32 : 0;
    let extraYaw = 0, armOverride = null, offOverride = null;
    if (em) {
      switch (em.id) {
        case 'dance': extraYaw = Math.sin(ek * 9) * 0.6; rz += Math.sin(ek * 9) * 0.18; jump = Math.abs(Math.sin(ek * 9)) * 0.12; armOverride = [0.3, -1.7 + Math.sin(ek * 9) * 0.6]; offOverride = 2.3 + Math.sin(ek * 9 + Math.PI) * 0.6; break;
        case 'laugh': rx = -0.22 + Math.sin(ek * 30) * 0.03; jump = Math.abs(Math.sin(ek * 14)) * 0.05; offOverride = 0.8; break;
        case 'taunt': rz += Math.sin(ek * 12) * 0.12; offOverride = 2.7 + Math.sin(ek * 20) * 0.25; extraYaw = Math.sin(ek * 6) * 0.2; break;
        case 'cry': rx = 0.18; rz += Math.sin(ek * 25) * 0.025; offOverride = 2.2; break;
        case 'love': rz += Math.sin(ek * 3) * 0.15; jump = Math.abs(Math.sin(ek * 5)) * 0.06; offOverride = 1.2; break;
        case 'angry': rz += Math.sin(ek * 40) * 0.05; jump = Math.abs(Math.sin(ek * 10)) * 0.08; armOverride = [0.3, -1.9 + Math.sin(ek * 18) * 0.3]; offOverride = 2.6 + Math.sin(ek * 18) * 0.3; break;
        // gestos del juez
        case 'refA': offOverride = 2.15; extraYaw = 0.35; break;
        case 'refB': armOverride = [0.3, -2.05]; extraYaw = -0.35; break;
        case 'finger': offOverride = 1.85 + Math.sin(ek * 16) * 0.12; extraYaw = (em.dir || 1) * 0.75; rz += Math.sin(ek * 8) * 0.05; break;
        case 'sleep': rx = 0.28 + Math.sin(ek * 2) * 0.03; break;
        case 'whistle': jump = Math.abs(Math.sin(ek * 12)) * 0.03; break;
      }
    }
    body.rotation.z = ease(body.rotation.z, rz, k10);
    body.rotation.x = ease(body.rotation.x, rx, dt * 6);
    const breathe = Math.sin(t * 2.2 + c.idx) * 0.012;
    body.position.y = Math.abs(Math.sin(st.walk)) * 0.05 * Math.min(1, sp) + jump;
    const ch = c.charging ? c.charge : 0;
    const air = jump > 0.05 ? 0.07 : 0;
    const sadSquash = sad ? 0.04 : 0;
    body.scale.set(1 + 0.06 * ch - air * 0.5 + breathe * 0.5, 1 - 0.08 * ch + air + breathe - sadSquash, 1 + 0.06 * ch - air * 0.5 + breathe * 0.5);
    st.spin = celebrating && happy && c.celebrate > 0.9 ? (1.6 - c.celebrate) / 0.7 * Math.PI * 2 : 0;
    root.rotation.y = rotationY + st.spin + extraYaw;
    feet.forEach((f, i) => {
      const ph = st.walk + i * Math.PI + (em && em.id === 'dance' ? ek * 9 : 0);
      const mv = em && em.id === 'dance' ? 0.6 : Math.min(1, sp);
      f.position.z = 0.03 + Math.sin(ph) * 0.07 * mv;
      f.position.y = 0.06 + Math.max(0, Math.cos(ph)) * 0.05 * mv + jump * 0.6;
    });
    if (propeller) propeller.rotation.y += dt * (6 + sp * 10 + (celebrating ? 20 : 0));
    if (halo) halo.position.y = top + 0.14 + Math.sin(t * 2) * 0.015;
    if (cape) cape.rotation.x = ease(cape.rotation.x, -Math.min(0.9, sp * 0.3) - (jump > 0.05 ? 0.25 : 0) + Math.sin(t * 3) * 0.03, dt * 6);
    for (const w of wings) { if (w.jet) w.w.rotation.y = w.sx * (celebrating ? 0.15 : 0.05); else w.w.rotation.y = w.sx * (0.35 + Math.sin(t * (celebrating ? 18 : 4)) * 0.25); }
    for (const e of earParts) if (look.ears === 'bunny' || look.ears === 'dog') e.g.rotation.x = Math.sin(st.walk * 0.5 + t) * 0.12 * (0.3 + Math.min(1, sp));

    // Brazo con pala
    if (c.freeHand) {
      const fh = c.freeHand;
      armPivot.rotation.set(0, 0, 0);
      root.updateMatrixWorld(true);
      tmp.set(fh.x, fh.y, fh.z);
      armPivot.worldToLocal(tmp);
      if (fh.real) paddle.rotation.set(-fh.pitch, fh.twist || 0, fh.rz * 0.9);   // realista: muñeca suelta + giro sobre el mango
      else paddle.rotation.set(Math.max(-0.7, Math.min(0.7, -fh.vy * 0.09)), fh.roll * 0.7, fh.roll * 0.12);
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
      } else if (armOverride) {
        st.armY = ease(st.armY, armOverride[0], dt * 10); st.armZ = ease(st.armZ, armOverride[1], dt * 12);
      } else if (celebrating && happy) {
        st.armY = ease(st.armY, 0.4, dt * 8); st.armZ = ease(st.armZ, -1.6 + Math.sin(t * 14) * 0.25, dt * 10);   // pala en alto
      } else {
        st.armY = ease(st.armY, 0.3 + Math.sin(t * 1.3) * 0.05, dt * 6);
        st.armZ = ease(st.armZ, sad ? 0.5 : 0, dt * 6);
      }
      armPivot.rotation.y = st.armY; armPivot.rotation.z = st.armZ;
      // si la animación mete la pala en la mesa (jugador muy pegado), el brazo sube lo justo
      const padLow = () => { root.updateMatrixWorld(true); paddle.getWorldPosition(tmp); return Math.abs(tmp.z) < HALF_L + 0.08 && Math.abs(tmp.x) < HALF_W + 0.1 ? TABLE_H + 0.12 - tmp.y : -1; };
      let low = padLow();
      if (low > 0) {
        const z0 = armPivot.rotation.z;
        armPivot.rotation.z = z0 - 0.15; const dirUp = padLow() < low ? -1 : 1;
        armPivot.rotation.z = z0;
        for (let i = 0; i < 10 && low > 0; i++) { armPivot.rotation.z += dirUp * 0.12; low = padLow(); }
        st.armZ = armPivot.rotation.z;
      }
    }
    if (c.fx) powerFx(c.fx, dt, t);
    // brazo libre: balanceo, puño arriba al celebrar, caído si está triste, gestos de emote
    const offTarget = offOverride ?? (celebrating && happy ? 2.3 + Math.sin(t * 16) * 0.3 : sad ? -0.35 : Math.sin(st.walk) * 0.35 * Math.min(1, sp) + Math.sin(t * 1.7) * 0.06);
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
    let lid = baseLid, lidTilt = 0, browY = 0, browR = baseBrow;
    if (happy) { lid = Math.min(-1.3, baseLid - 0.2); browY = 0.03; }
    else if (sad) { lid = -0.45; lidTilt = -0.35; browY = -0.01; browR = -0.35; }
    else if (c.charging || focus) { lid = Math.max(baseLid, -0.7); lidTilt = 0.32; browY = -0.02; browR = Math.max(baseBrow, 0.45); }
    if (em) {
      if (em.id === 'laugh' || em.id === 'dance') { lid = 1.2; browY = 0.04; }
      if (em.id === 'cry') { lid = -0.4; lidTilt = -0.4; browR = -0.5; }
      if (em.id === 'angry') { lid = -0.75; lidTilt = 0.45; browR = 0.6; browY = -0.03; }
      if (em.id === 'taunt') { lid = -0.6; browR = 0.25; }
      if (em.id === 'finger') { lid = -0.6; browR = 0.5; }
      if (em.id === 'sleep') { lid = 1.2; browY = -0.02; }
    }
    if (blink && !em) lid = 1.2;
    st.lidL = ease(st.lidL, lid, blink ? 1 : dt * 18);
    st.browY = ease(st.browY, browY, dt * 12); st.browR = ease(st.browR, browR, dt * 12);
    for (const e of eyes) {
      if (e.pupil) {
        tmp.copy(target); e.eg.worldToLocal(tmp); tmp.normalize();
        if (eyeType === 'drunk') { tmp.x += Math.sin(t * 2.3 + e.sx) * 0.35; tmp.y += Math.cos(t * 1.9 + e.sx) * 0.3; tmp.normalize(); }
        if (tmp.z < 0.45) { tmp.z = 0.45; tmp.normalize(); }
        const dist = eyeType === 'dots' ? 0.012 : e.r * 0.6;
        e.pupil.position.copy(tmp).multiplyScalar(dist);
        if (eyeType === 'dots') e.pupil.position.z += 0.03;
        if (e.star) { e.pupil.quaternion.setFromUnitVectors(Z_F, tmp); e.pupil.position.copy(tmp).multiplyScalar(e.r * 1.02); e.star.rotation.z = t * 1.5; }
        if (e.iris) e.iris.position.copy(tmp).multiplyScalar(e.r * 0.45);
        if (em && em.id === 'love') e.pupil.scale.setScalar(1.25 + Math.sin(ek * 10) * 0.2); else e.pupil.scale.setScalar(1);
      }
      if (e.lid) e.lid.rotation.set(st.lidL, 0, -e.sx * lidTilt);
      if (e.arc) e.arc.scale.y = blink ? 0.3 : 1;
      e.brow.position.y = e.r + 0.04 + st.browY;
      e.brow.rotation.set(0, 0, Math.PI / 2 - e.sx * st.browR);
    }
    for (const ck of cheeks) ck.scale.x = (eyeType === 'drunk' ? 1.4 : 1) * (em && (em.id === 'love' || em.id === 'angry') ? 1.5 : 1);
    // lágrimas
    const crying = !!(em && em.id === 'cry');
    tears.forEach((tr, i) => {
      tr.visible = crying && !st.fp;
      if (crying) { const ph = ((ek * 1.6 + i * 0.5) % 1); tr.position.y = yEye - 0.08 - ph * 0.3; tr.scale.setScalar(1 - ph * 0.4); }
    });
    st.mouthT = c.swing > 0 ? 0.3 : Math.max(0, st.mouthT - dt);
    let mouth = st.fp ? 'none' : happy ? 'open' : sad ? 'frown' : st.mouthT > 0 ? 'o' : 'smile';
    if (em && !st.fp) mouth = em.id === 'cry' || em.id === 'angry' ? 'frown' : em.id === 'love' ? 'smile' : (em.id === 'refA' || em.id === 'refB' || em.id === 'whistle' || em.id === 'sleep') ? 'o' : 'open';
    if (censor) censor.visible = !!(em && em.id === 'finger');
    if (whistle) whistle.visible = !!(em && (em.id === 'refA' || em.id === 'refB' || em.id === 'whistle'));
    smile.visible = mouth === 'smile';
    frown.visible = mouth === 'frown';
    open.visible = mouth === 'open' || mouth === 'o';
    if (open.visible) open.scale.set(mouth === 'o' ? 0.6 : 1, mouth === 'o' ? 0.9 : (em && em.id === 'laugh' ? 1 + Math.abs(Math.sin(ek * 14)) * 0.4 : 1), 1);
    tongue.visible = mouth === 'open' && (!em || em.id === 'taunt' || em.id === 'laugh' || em.id === 'finger' || happy);
    if (em && (em.id === 'taunt' || em.id === 'finger')) { tongue.scale.set(1.3, 0.9, 0.9); tongue.position.y = -0.045 - Math.abs(Math.sin(ek * 12)) * 0.01; } else { tongue.scale.set(1.2, 0.6, 0.4); tongue.position.y = -0.026; }
  }

  function dispose() {
    root.removeFromParent();
    for (const o of owned) o.dispose && o.dispose();
  }

  return { root, sync, setFirstPerson, setOpacity, dispose, look };
}

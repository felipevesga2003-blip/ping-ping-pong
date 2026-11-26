// =============================================================
//  JUEZ DE SILLA — señala cada punto, pita, y a veces la lía:
//  le saca el dedo al perdedor (censurado), se cae de la silla
//  al intentar pitar o se queda dormido en los rallies largos.
// =============================================================
import * as THREE from 'three';
import { box, cyl, toon } from './models.js';
import { createCharacter } from './character.js';
import { HALF_W } from './config.js';

const SEAT_Y = 1.12;

export function createReferee(scene, { onBubble, onSound }) {
  // ---- Silla alta junto a la red ----
  const chair = new THREE.Group(); chair.position.set(HALF_W + 1.45, 0, -0.85); chair.scale.setScalar(0.78); scene.add(chair);
  const NAVY = 0x2c3a66, WOOD = 0xd9a066;
  const legs = [], rungs = [];
  for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) {
    const leg = box(0.05, SEAT_Y, 0.05, NAVY, 0.01); leg.position.set(x, SEAT_Y / 2, z); chair.add(leg); legs.push(leg);
  }
  const seat = box(0.56, 0.06, 0.56, WOOD, 0.012); seat.position.y = SEAT_Y; chair.add(seat);
  const backrest = box(0.06, 0.45, 0.56, NAVY, 0.012); backrest.position.set(0.28, SEAT_Y + 0.25, 0); chair.add(backrest);
  for (let k = 1; k <= 3; k++) { const rung = box(0.06, 0.035, 0.5, WOOD, 0.008); rung.position.set(-0.24, (SEAT_Y / 4) * k, 0); chair.add(rung); rungs.push(rung); }
  const step = box(0.3, 0.04, 0.5, WOOD, 0.008); step.position.set(-0.36, SEAT_Y * 0.45, 0); chair.add(step);
  const sign = box(0.02, 0.22, 0.42, 0xffc93c, 0.01); sign.position.set(-0.29, SEAT_Y - 0.2, 0); chair.add(sign);
  const pole = cyl(0.015, 0.015, 1.1, NAVY, 0.006); pole.position.set(0.28, SEAT_Y + 0.98, 0.25); chair.add(pole);
  const umbrella = cyl(0.02, 0.38, 0.14, 0xff5a6e, 0.012); umbrella.position.set(0.28, SEAT_Y + 1.56, 0.25); chair.add(umbrella);

  // ---- El juez (frijolito con camiseta de rayas) ----
  const holder = new THREE.Group(); holder.position.set(0, SEAT_Y + 0.03, 0); holder.rotation.y = -Math.PI / 2; chair.add(holder);
  // el juez normal y, solo en el Coliseo, el César (toga con banda púrpura, laurel, capa y sandalias)
  const LOOKS = {
    base: { name: 'Juez', skin: '#f4c6a5', height: 0.95, width: 1.12, eyes: 'normal', shirt: 'stripes', shirtColor: '#1c1c24',
      pants: 'long', pantsColor: '#1c1c24', hat: 'cap', hatColor: '#1c1c24', face: 'mustache', hairColor: '#7a7a7a', glasses: 'round', number: 0 },
    caesar: { name: 'César', skin: '#f4c6a5', height: 0.95, width: 1.12, eyes: 'sleepy', shirt: 'toga', shirtColor: '#f4efe3', accent: '#6b2a8c',
      pants: 'hakama', pantsColor: '#f4efe3', hat: 'laurel', back: 'cape', shoes: '#8a5a2b', face: 'none', hairColor: '#3a2a22', glasses: 'none', number: 0 },
  };
  const CHAIR = {
    base: { leg: NAVY, wood: WOOD, back: NAVY, sign: 0xffc93c, roof: 0xff5a6e },
    caesar: { leg: 0xd9a92e, wood: 0x6b2a8c, back: 0x6b2a8c, sign: 0xd9a92e, roof: 0x6b2a8c },   // trono dorado con dosel púrpura
  };
  let style = 'base';
  const make = look => { const v = createCharacter(look, { referee: true }); holder.add(v.root); return v; };
  let view = make(LOOKS.base);
  function setStage(id) {
    const want = id === 'colosseum' ? 'caesar' : 'base';
    if (want === style) return;
    style = want;
    holder.remove(view.root); view.dispose(); view = make(LOOKS[want]);
    const C = CHAIR[want], paint = (p, col) => { p.userData.mesh.material = toon(col); };
    legs.forEach(l => paint(l, C.leg)); rungs.forEach(r => paint(r, C.wood)); paint(seat, C.wood); paint(step, C.wood);
    paint(backrest, C.back); paint(sign, C.sign); paint(pole, C.leg); paint(umbrella, C.roof);
  }
  const c = { idx: 9, x: 0, z: 0, vx: 0, vz: 0, sign: 1, hand: 1, swing: 0, charging: false, charge: 0, mood: 0, celebrate: 0, emote: null, focus: false, team: -1 };
  const local = new THREE.Vector3();

  // estado de las travesuras
  const S = { fall: 0, sleepT: 0, nextGag: 6 + Math.random() * 6, lastRally: 0 };
  const emote = (id, dur = 1.6, extra = {}) => { c.emote = { id, t: dur, dur, ...extra }; };

  function onPoint(winnerTeam, rally) {
    S.sleepT = 0;
    const r = Math.random();
    if (r < 0.1 && S.fall <= 0) {
      // intenta pitar con demasiado entusiasmo… y se cae
      emote('whistle', 0.5); S.fall = 2.8; onSound('whistle');
      setTimeout(() => { onSound('fall'); onBubble('¡AY!', worldHead()); }, 450);
      return;
    }
    if (r < 0.24) {
      // le saca el dedo al perdedor (con su debida censura)
      emote('finger', 1.8, { dir: winnerTeam === 0 ? -1 : 1 });
      onBubble('#@%!', worldHead()); onSound('boo');
      return;
    }
    emote(winnerTeam === 0 ? 'refA' : 'refB', 1.4);
    onSound('whistle');
    if (style === 'caesar' && Math.random() < 0.35) onBubble(['¡AVE!', 'VENI, VIDI, VICI', '¡ALEA IACTA EST!', '¡PAN Y CIRCO!'][Math.floor(Math.random() * 4)], worldHead());
  }
  function onRally(rally) {
    S.lastRally = rally;
    if (rally === 14 && Math.random() < 0.6) { emote('sleep', 6); onBubble('Zzz…', worldHead()); }
  }
  function worldHead() { const v = new THREE.Vector3(); view.root.getWorldPosition(v); v.y += 1.25; return v; }

  function update(dt, t, ball) {
    if (c.emote && (c.emote.t -= dt) <= 0) c.emote = null;
    // la caída: se vuelca hacia fuera, rebota en el suelo, se queda un momento KO y vuelve a subir
    if (S.fall > 0) {
      S.fall -= dt;
      const k = 2.8 - S.fall;                                   // tiempo transcurrido
      if (k < 0.45) { holder.rotation.z = 0; holder.position.y = SEAT_Y + 0.03 + Math.sin(k / 0.45 * Math.PI) * 0.12; }
      else if (k < 0.9) { const f = (k - 0.45) / 0.45; holder.rotation.z = -f * 1.5; holder.position.set(f * 0.55, SEAT_Y + 0.03 - f * f * (SEAT_Y - 0.25), 0); }
      else if (k < 2.0) { holder.rotation.z = -1.5 + Math.sin((k - 0.9) * 30) * 0.03 * (2 - k); holder.position.set(0.55, 0.28, 0); }
      else { const f = Math.min(1, (k - 2.0) / 0.8); holder.rotation.z = -1.5 * (1 - f); holder.position.set(0.55 * (1 - f), 0.28 + (SEAT_Y - 0.25) * f, 0); }
      if (S.fall <= 0) { holder.rotation.z = 0; holder.position.set(0, SEAT_Y + 0.03, 0); }
    }
    // mira la bola (en coordenadas locales del asiento)
    local.copy(ball);
    view.sync(c, dt, local, t);
    // el cuerpo del juez está en (0,0,0) del soporte: compensamos la posición que pone sync
    view.root.position.set(0, 0, 0);
  }

  return { update, onPoint, onRally, setStage, get view() { return view; } };
}

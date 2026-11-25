// =============================================================
//  ESTADIO — gradas a ambos lados con afición de cada jugador
//  Público instanciado (una sola llamada de dibujo por pieza),
//  camisetas/banderas/gorras con el color del equipo que apoyan.
// =============================================================
import * as THREE from 'three';
import { toon, box, sphere, cyl, outlineMat } from './models.js';
import { PALETTE } from './config.js';
import { SKINS } from './character.js';

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 8);
}

function bannerTexture(text, bg, fg, w = 1024, h = 128, reps = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = -h; x < w; x += 36) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.lineTo(x + h + 14, 0); g.lineTo(x + 14, h); g.fill(); }
  const seg = w / reps;
  let size = h * 0.56;
  g.font = `italic 900 ${size}px Rubik, "Arial Black", sans-serif`;
  const tw = g.measureText(text).width;
  if (tw > seg * 0.84) { size *= (seg * 0.84) / tw; g.font = `italic 900 ${size}px Rubik, "Arial Black", sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (let i = 0; i < reps; i++) {
    const cx = seg * (i + 0.5);
    g.lineWidth = size * 0.2; g.strokeStyle = '#1a1238'; g.strokeText(text, cx, h * 0.54);
    g.fillStyle = fg; g.fillText(text, cx, h * 0.54);
    g.fillStyle = 'rgba(255,255,255,0.5)';                 // separador entre repeticiones
    g.beginPath(); g.arc(seg * (i + 1) - 2, h / 2, h * 0.06, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createArena(scene) {
  // ---------- Suelo y pista ----------
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), toon(PALETTE.ground));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const border = new THREE.Mesh(roundedRect(6.6, 10.6, 0.8), toon(0xffffff));
  border.rotation.x = -Math.PI / 2; border.position.y = 0.003; border.receiveShadow = true; scene.add(border);
  const court = new THREE.Mesh(roundedRect(6.2, 10.2, 0.65), toon(PALETTE.court));
  court.rotation.x = -Math.PI / 2; court.position.y = 0.006; court.receiveShadow = true; scene.add(court);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 48), toon(0xffffff));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.008; scene.add(ring);

  // ---------- Gradas laterales ----------
  // lado 0 = izquierda (afición del jugador), lado 1 = derecha (afición de la CPU)
  const TIERS = 4, ROWS = 12, Z0 = -4.4, Z1 = 4.4;
  const tierCols = [0xffffff, 0xf1ecff, 0xe4dcff, 0xd6cbff];
  const barriers = [], barrierTex = [];
  for (let side = 0; side < 2; side++) {
    const sx = side === 0 ? -1 : 1;
    for (let t = 0; t < TIERS; t++) {
      const h = 0.38 * (t + 1);
      const tier = box(0.95, h, Z1 - Z0 + 0.6, tierCols[t], 0.025);
      tier.position.set(sx * (3.55 + t * 0.95), h / 2, 0); scene.add(tier);
    }
    // valla publicitaria frente a la grada (color del equipo)
    const tex = bannerTexture('PING PING PONG', '#1a1238', '#ffffff', 1024, 128, 2);
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = 2.4;
    const mat = new THREE.MeshToonMaterial({ map: tex, color: 0xffffff });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, Z1 - Z0 + 0.6), [mat, mat, toon(0x1a1238), toon(0x1a1238), mat, mat]);
    panel.position.set(sx * 3.05, 0.25, 0); panel.castShadow = true; scene.add(panel);
    const cap = box(0.12, 0.06, Z1 - Z0 + 0.62, 0xffffff, 0.015); cap.position.set(sx * 3.05, 0.53, 0); scene.add(cap);
    barriers.push(cap); barrierTex.push(tex);
  }

  // Muro con cartel detrás del rival
  const backTex = bannerTexture('TORNEO DEL PARQUE', '#ff5a6e', '#ffffff', 1536, 256, 1);
  const back = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 0.14), new THREE.MeshToonMaterial({ map: backTex }));
  back.position.set(0, 0.55, -5.6); back.castShadow = true; scene.add(back);
  const backOut = new THREE.Mesh(new THREE.BoxGeometry(6.44, 1.14, 0.18), outlineMat); backOut.position.copy(back.position); scene.add(backOut);
  for (const sx of [-1, 1]) {
    const post = cyl(0.07, 0.07, 2.4, 0x1a1238, 0.015); post.position.set(sx * 3.3, 1.2, -5.6); scene.add(post);
    const lamp = sphere(0.18, 0xfff3b0, 0.02, false); lamp.position.set(sx * 3.3, 2.5, -5.6); scene.add(lamp);
  }
  // Banderines cruzando sobre la pista
  const pennantCols = [0xffc93c, 0xff5a6e, 0x3ee0b0, 0x3b9bff, 0xffffff, 0x8b6cff];
  const pg = new THREE.ConeGeometry(0.09, 0.22, 3);
  for (const z of [-3.4]) {
    for (let i = 0; i < 22; i++) {
      const x = -3.1 + i * (6.2 / 21);
      const sag = 2.75 - Math.sin((i / 21) * Math.PI) * 0.45;
      const p = new THREE.Mesh(pg, toon(pennantCols[i % pennantCols.length]));
      p.position.set(x, sag - 0.12, z); p.rotation.x = Math.PI; scene.add(p);
    }
  }

  // ---------- Público instanciado ----------
  const fans = [];
  for (let side = 0; side < 2; side++) {
    const sx = side === 0 ? -1 : 1;
    for (let t = 0; t < TIERS; t++) {
      for (let r = 0; r < ROWS; r++) {
        if (Math.random() < 0.1) continue;
        const z = Z0 + (r + 0.5) * ((Z1 - Z0) / ROWS) + (Math.random() - 0.5) * 0.18;
        fans.push({
          side, x: sx * (3.55 + t * 0.95 + (Math.random() - 0.5) * 0.1), y: 0.38 * (t + 1), z,
          s: 0.85 + Math.random() * 0.3, skin: new THREE.Color(SKINS[Math.floor(Math.random() * SKINS.length)]),
          phase: Math.random() * 6.28, speed: 1.2 + Math.random() * 1.4, hype: 0, mood: 0,
          cap: Math.random() < 0.4, flag: Math.random() < 0.3, rot: side === 0 ? Math.PI / 2 : -Math.PI / 2,
        });
      }
    }
  }
  const N = fans.length;
  const inst = (geom, mat, count = N) => { const m = new THREE.InstancedMesh(geom, mat, count); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); return m; };
  const bodyG = new THREE.CapsuleGeometry(0.2, 0.22, 8, 16);
  const bodies = inst(bodyG, new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap }));
  const outlines = inst(new THREE.CapsuleGeometry(0.218, 0.22, 8, 16), outlineMat);
  const shirts = inst(new THREE.CylinderGeometry(0.212, 0.212, 0.2, 20, 1, true), new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide }));
  const whites = inst(new THREE.SphereGeometry(0.055, 12, 8), toon(0xffffff), N * 2);
  const pupils = inst(new THREE.SphereGeometry(0.028, 10, 6), toon(0x1a1238), N * 2);
  const capsG = inst(new THREE.SphereGeometry(0.21, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap }));
  const sticks = inst(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), toon(0x9c6b43));
  const flags = inst(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshToonMaterial({ gradientMap: toon(0xffffff).gradientMap, side: THREE.DoubleSide }));
  fans.forEach((f, i) => bodies.setColorAt(i, f.skin));

  function setTeams(c0, c1) {
    const cols = [new THREE.Color(c0), new THREE.Color(c1)];
    fans.forEach((f, i) => { shirts.setColorAt(i, cols[f.side]); capsG.setColorAt(i, cols[f.side]); flags.setColorAt(i, cols[f.side]); });
    for (const m of [shirts, capsG, flags]) m.instanceColor.needsUpdate = true;
    barriers.forEach((b, i) => b.userData.mesh.material = toon(cols[i].getHex()));
  }
  setTeams('#ffc93c', '#ff5a6e');
  bodies.instanceColor.needsUpdate = true;

  const D = new THREE.Object3D(), M = new THREE.Matrix4(), L = new THREE.Matrix4(), T = new THREE.Matrix4(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
  const STICK = new THREE.Matrix4().makeTranslation(0.26, 0.55, 0.05), FLAG = new THREE.Matrix4().makeTranslation(0.15, 0.15, 0);
  const eyeL = [new THREE.Matrix4().makeTranslation(-0.075, 0.47, 0.175), new THREE.Matrix4().makeTranslation(0.075, 0.47, 0.175)];

  function update(t, dt, ball) {
    for (let i = 0; i < N; i++) {
      const f = fans[i];
      f.hype = Math.max(0, f.hype - dt); f.mood = Math.max(0, f.mood - dt);
      const jump = f.hype > 0 ? Math.abs(Math.sin(t * 9 + f.phase)) * 0.32 : Math.abs(Math.sin(t * f.speed + f.phase)) * 0.025;
      const slump = f.mood > 0 ? -0.06 : 0;
      D.position.set(f.x, f.y + jump + slump, f.z);
      D.rotation.set(f.mood > 0 ? 0.25 : 0, f.rot, Math.sin(t * f.speed * 0.7 + f.phase) * 0.06);
      D.scale.setScalar(f.s);
      D.updateMatrix();
      M.copy(D.matrix);
      const put = (im, idx, local) => { T.multiplyMatrices(M, local); im.setMatrixAt(idx, T); };
      // cuerpo (base en y=0 → cápsula centrada en 0.31)
      L.makeTranslation(0, 0.31, 0); put(bodies, i, L); put(outlines, i, L);
      L.makeTranslation(0, 0.22, 0); put(shirts, i, L);
      // ojos que siguen la bola (eje x local ≈ eje z del mundo)
      const look = Math.max(-0.018, Math.min(0.018, (ball.z - f.z) * 0.012)) * (f.side === 0 ? -1 : 1);
      for (let e = 0; e < 2; e++) {
        put(whites, i * 2 + e, eyeL[e]);
        L.copy(eyeL[e]); L.elements[12] += look; L.elements[14] += 0.032;
        put(pupils, i * 2 + e, L);
      }
      if (f.cap) { L.makeTranslation(0, 0.53, 0); put(capsG, i, L); } else capsG.setMatrixAt(i, Z);
      if (f.flag) {
        const wave = Math.sin(t * (f.hype > 0 ? 12 : 3) + f.phase) * (f.hype > 0 ? 0.6 : 0.25);
        L.makeRotationZ(wave).premultiply(STICK);
        put(sticks, i, L);
        L.multiply(FLAG);
        put(flags, i, L);
      } else { sticks.setMatrixAt(i, Z); flags.setMatrixAt(i, Z); }
    }
    for (const m of [bodies, outlines, shirts, whites, pupils, capsG, sticks, flags]) m.instanceMatrix.needsUpdate = true;
    for (const c of clouds) {
      c.a += c.speed * dt * 0.02;
      c.cl.position.x = Math.sin(c.a) * c.r; c.cl.position.z = Math.cos(c.a) * c.r;
    }
  }

  // ---------- Árboles y nubes ----------
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const d = 12 + Math.random() * 6;
    const tr = new THREE.Group();
    const trunk = cyl(0.14, 0.2, 1.2, 0x9c6b43, 0.03, false); trunk.position.y = 0.6; tr.add(trunk);
    const greens = [0x5fd36e, 0x4cc38a, 0x86e07a];
    const c1 = sphere(0.9, greens[i % 3], 0.05, false); c1.position.y = 1.75; tr.add(c1);
    const c2 = sphere(0.6, greens[(i + 1) % 3], 0.05, false); c2.position.set(0.5, 2.2, 0.1); tr.add(c2);
    tr.scale.setScalar(0.8 + Math.random() * 0.6);
    tr.position.set(Math.sin(a) * d, 0, Math.cos(a) * d);
    scene.add(tr);
  }
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const cl = new THREE.Group();
    const n = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const s = sphere(0.9 + Math.random() * 0.7, 0xffffff, 0.06, false);
      s.position.set(j * 1.0 - n * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.8);
      cl.add(s);
    }
    const a = (i / 9) * Math.PI * 2;
    cl.position.set(Math.sin(a) * 30, 9 + Math.random() * 5, Math.cos(a) * 30);
    cl.lookAt(0, cl.position.y, 0);
    scene.add(cl); clouds.push({ cl, speed: 0.1 + Math.random() * 0.15, a, r: 30 });
  }

  return {
    update,
    setTeams,
    // la grada del ganador salta, la del perdedor se lamenta
    cheer(winnerSide, strength = 1) {
      for (const f of fans) {
        if (f.side === winnerSide) { if (Math.random() < strength) f.hype = 1.3 + Math.random() * 0.8; }
        else if (Math.random() < strength) f.mood = 1.4 + Math.random() * 0.6;
      }
    },
    hype(strength = 0.4) { for (const f of fans) if (Math.random() < strength) f.hype = 0.8 + Math.random() * 0.5; },
  };
}

// =============================================================
//  ESTADIO — gradas a ambos lados con afición de cada jugador
//  Público instanciado (una sola llamada de dibujo por pieza),
//  camisetas/banderas/gorras con el color del equipo que apoyan.
// =============================================================
import * as THREE from 'three';
import { toon, box, sphere, cyl, outlineMat } from './models.js';
import { PALETTE } from './config.js';
import { SKINS } from './character.js';
import { STAGES, stageById, skyTexture, disposeTree } from './stages.js';

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
  let size = h * 0.78;
  g.font = `400 ${size}px "League Gothic", "Arial Narrow", sans-serif`;
  const tw = g.measureText(text).width;
  if (tw > seg * 0.84) { size *= (seg * 0.84) / tw; g.font = `400 ${size}px "League Gothic", "Arial Narrow", sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  for (let i = 0; i < reps; i++) {
    const cx = seg * (i + 0.5);
    g.lineWidth = size * 0.2; g.strokeStyle = '#22100F'; g.strokeText(text, cx, h * 0.54);
    g.fillStyle = fg; g.fillText(text, cx, h * 0.54);
    g.fillStyle = 'rgba(255,255,255,0.5)';                 // separador entre repeticiones
    g.beginPath(); g.arc(seg * (i + 1) - 2, h / 2, h * 0.06, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// lights: { hemi, sun } de main.js — cada escenario los tiñe a su gusto
export function createArena(scene, lights) {
  // ---------- Suelo y pista ----------
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshToonMaterial({ color: PALETTE.ground, gradientMap: toon(0xffffff).gradientMap }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const border = new THREE.Mesh(roundedRect(6.6, 10.6, 0.8), new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: toon(0xffffff).gradientMap }));
  border.rotation.x = -Math.PI / 2; border.position.y = 0.003; border.receiveShadow = true; scene.add(border);
  const court = new THREE.Mesh(roundedRect(6.2, 10.2, 0.65), new THREE.MeshToonMaterial({ color: PALETTE.court, gradientMap: toon(0xffffff).gradientMap }));
  const borderGlow = new THREE.MeshBasicMaterial({ color: 0xffffff }), borderToon = border.material;
  court.rotation.x = -Math.PI / 2; court.position.y = 0.006; court.receiveShadow = true; scene.add(court);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.12, 48), border.material);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.008; scene.add(ring);

  // ---------- Gradas laterales ----------
  // lado 0 = izquierda (afición del jugador), lado 1 = derecha (afición de la CPU)
  const TIERS = 4, ROWS = 12, Z0 = -4.4, Z1 = 4.4;
  const barriers = [], barrierTex = [], barrierMats = [];
  for (let side = 0; side < 2; side++) {
    const sx = side === 0 ? -1 : 1;
    // valla publicitaria frente a la grada (color del equipo)
    const tex = bannerTexture('PING PING PONG', '#D92B1C', '#F8E3A6', 1024, 128, 2);
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = 2.4;
    const mat = new THREE.MeshToonMaterial({ map: tex, color: 0xffffff });
    barrierMats.push(mat);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, Z1 - Z0 + 0.6), [mat, mat, toon(0x24120f), toon(0x24120f), mat, mat]);
    panel.position.set(sx * 3.05, 0.25, 0); panel.castShadow = true; scene.add(panel);
    const cap = box(0.12, 0.06, Z1 - Z0 + 0.62, 0xffffff, 0.015); cap.position.set(sx * 3.05, 0.53, 0); scene.add(cap);
    barriers.push(cap); barrierTex.push(tex);
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
  const pupils = inst(new THREE.SphereGeometry(0.028, 10, 6), toon(0x24120f), N * 2);
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
    if (stageUpdate) stageUpdate(t, dt);
  }

  // ---------- Escenario intercambiable ----------
  let stage = null, stageGroup = null, stageUpdate = null, stageCtx = {};
  function buildTiers(g, S) {
    for (let side = 0; side < 2; side++) {
      const sx = side === 0 ? -1 : 1;
      for (let t = 0; t < TIERS; t++) {
        const h = 0.38 * (t + 1);
        const tier = box(0.95, h, Z1 - Z0 + 0.6, S.tiers[t], 0.025);
        tier.position.set(sx * (3.55 + t * 0.95), h / 2, 0); g.add(tier);
      }
    }
    const [text, bg, fg] = S.banner;
    const backTex = bannerTexture(text, bg, fg, 1536, 256, 1);
    const back = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 0.14), new THREE.MeshToonMaterial({ map: backTex, gradientMap: toon(0xffffff).gradientMap }));
    back.position.set(0, 0.55, -5.6); back.castShadow = true; g.add(back);
    const backOut = new THREE.Mesh(new THREE.BoxGeometry(6.44, 1.14, 0.18), outlineMat); backOut.position.copy(back.position); g.add(backOut);
  }
  function setStage(id) {
    const S = stageById(id);
    if (stage === S.id) return;
    stage = S.id;
    if (stageGroup) { scene.remove(stageGroup); disposeTree(stageGroup); }
    stageGroup = new THREE.Group(); stageCtx = {};
    if (scene.background && scene.background.isTexture) scene.background.dispose();
    scene.background = skyTexture(S.sky);
    scene.fog.color.setHex(S.fog[0]); scene.fog.near = S.fog[1]; scene.fog.far = S.fog[2];
    lights.hemi.color.setHex(S.hemi[0]); lights.hemi.groundColor.setHex(S.hemi[1]); lights.hemi.intensity = S.hemi[2];
    lights.sun.color.setHex(S.sun[0]); lights.sun.intensity = S.sun[1];
    ground.visible = S.ground !== null; if (S.ground !== null) ground.material.color.setHex(S.ground);
    border.material = S.courtGlow ? borderGlow : borderToon; border.material.color.setHex(S.court[0]);
    court.material.color.setHex(S.court[1]);
    ring.material = border.material;
    buildTiers(stageGroup, S);
    stageUpdate = S.build(stageGroup, stageCtx) || null;
    scene.add(stageGroup);
  }
  setStage(STAGES[0].id);

  return {
    update,
    setTeams,
    setStage,
    get stage() { return stage; },
    // la tipografía web llega después de crear las texturas: se vuelven a pintar
    redrawText() {
      for (const m of barrierMats) { const t = bannerTexture('PING PING PONG', '#D92B1C', '#F8E3A6', 1024, 128, 2); t.wrapS = THREE.RepeatWrapping; t.repeat.x = 2.4; m.map.dispose(); m.map = t; m.needsUpdate = true; }
      const s = stage; stage = null; setStage(s);
    },
    // la grada del ganador salta, la del perdedor se lamenta
    cheer(winnerSide, strength = 1) {
      for (const f of fans) {
        if (f.side === winnerSide) { if (Math.random() < strength) f.hype = 1.3 + Math.random() * 0.8; }
        else if (Math.random() < strength) f.mood = 1.4 + Math.random() * 0.6;
      }
      if (stageCtx.hype) stageCtx.hype(strength);
    },
    hype(strength = 0.4) { for (const f of fans) if (Math.random() < strength) f.hype = 0.8 + Math.random() * 0.5; if (stageCtx.hype) stageCtx.hype(strength * 0.6); },
  };
}

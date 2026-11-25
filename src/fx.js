// =============================================================
//  Efectos visuales: estela, sombra de la bola, anillos de impacto,
//  estrellas cartoon, confeti, retícula de apuntado
// =============================================================
import * as THREE from 'three';
import { R, TABLE_H, HALF_L, HALF_W } from './config.js';

function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const starTex = canvasTex(128, (g, s) => {
  const cx = s / 2, n = 8;
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? s * 0.2 : s * 0.46;
    g.lineTo(cx + Math.cos(a) * r, cx + Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = '#ffffff'; g.fill();
  g.lineWidth = 7; g.strokeStyle = '#2a2140'; g.stroke();
});
const ringTex = canvasTex(128, (g, s) => {
  g.lineWidth = 12; g.strokeStyle = '#ffffff';
  g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 10, 0, Math.PI * 2); g.stroke();
});

export function createFX(scene) {
  const fx = {};

  // ---- Estela ----
  const trailN = 14;
  const trailMat = [];
  const trail = [];
  const tg = new THREE.SphereGeometry(R, 12, 8);
  for (let i = 0; i < trailN; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Mesh(tg, m); scene.add(s); trail.push(s); trailMat.push(m);
  }
  const hist = [];
  fx.trail = (pos, color, active) => {
    hist.unshift(pos.clone()); if (hist.length > trailN) hist.pop();
    for (let i = 0; i < trailN; i++) {
      const s = trail[i], h = hist[i];
      if (!h || !active) { s.visible = false; continue; }
      s.visible = true; s.position.copy(h);
      const k = 1 - i / trailN;
      s.scale.setScalar(0.3 + 0.7 * k);
      trailMat[i].color.set(color); trailMat[i].opacity = 0.45 * k;
    }
  };
  fx.clearTrail = () => { hist.length = 0; };

  // ---- Sombra de contacto de la bola ----
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24),
    new THREE.MeshBasicMaterial({ color: 0x1d1730, transparent: true, opacity: 0.35, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
  fx.ballShadow = (p) => {
    const onTable = Math.abs(p.x) < HALF_W && Math.abs(p.z) < HALF_L && p.y > TABLE_H - 0.02;
    const sy = onTable ? TABLE_H + 0.003 : 0.012;
    const h = Math.max(0, p.y - sy);
    shadow.position.set(p.x, sy, p.z);
    shadow.scale.setScalar(R * (1.1 + h * 0.6));
    shadow.material.opacity = Math.max(0.08, 0.4 - h * 0.25);
  };

  // ---- Anillos (planos en mesa / de frente a cámara) ----
  const rings = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, opacity: 0 }));
    m.visible = false; scene.add(m);
    rings.push({ m, life: 0, max: 1, size: 1, flat: false });
  }
  fx.ring = (pos, color, size = 0.3, flat = false, life = 0.45) => {
    const r = rings.find(r => r.life <= 0) || rings[0];
    r.m.position.copy(pos); r.m.material.color.set(color);
    r.life = r.max = life; r.size = size; r.flat = flat; r.m.visible = true;
    if (flat) { r.m.rotation.set(-Math.PI / 2, 0, 0); }
  };

  // ---- Estrellas de impacto ----
  const stars = [];
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, depthTest: false }));
    s.visible = false; s.renderOrder = 10; scene.add(s);
    stars.push({ s, life: 0, max: 1, size: 1 });
  }
  fx.star = (pos, color, size = 0.35) => {
    const st = stars.find(s => s.life <= 0) || stars[0];
    st.s.position.copy(pos); st.s.material.color.set(color);
    st.life = st.max = 0.32; st.size = size; st.s.visible = true;
    st.s.material.rotation = Math.random() * Math.PI;
  };

  // ---- Confeti ----
  const conf = [];
  const cg = new THREE.PlaneGeometry(0.05, 0.08);
  const confCols = [0xffd166, 0xff8fab, 0x7bdff2, 0x8ce99a, 0xb5a8ff, 0xffffff];
  for (let i = 0; i < 120; i++) {
    const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: confCols[i % confCols.length], side: THREE.DoubleSide }));
    m.visible = false; scene.add(m);
    conf.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 });
  }
  fx.confetti = (pos, n = 60) => {
    let k = 0;
    for (const c of conf) {
      if (c.life > 0) continue;
      c.m.position.copy(pos);
      c.v.set((Math.random() - 0.5) * 4, 3 + Math.random() * 3.5, (Math.random() - 0.5) * 4);
      c.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
      c.life = 2.2 + Math.random(); c.m.visible = true;
      if (++k >= n) break;
    }
  };

  // ---- Retícula de apuntado y marcador de bote ----
  const reticle = new THREE.Group();
  const rOuter = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.1, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false }));
  const rIn = new THREE.Mesh(new THREE.CircleGeometry(0.075, 40), new THREE.MeshBasicMaterial({ color: 0xff6b8b, transparent: true, opacity: 0.55, depthWrite: false }));
  const rDot = new THREE.Mesh(new THREE.CircleGeometry(0.02, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }));
  for (const m of [rIn, rOuter, rDot]) { m.rotation.x = -Math.PI / 2; reticle.add(m); }
  rIn.position.y = 0.001; rOuter.position.y = 0.002; rDot.position.y = 0.003;
  reticle.visible = false; scene.add(reticle);
  fx.reticle = reticle;

  const land = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.07, 32), new THREE.MeshBasicMaterial({ color: 0x7bdff2, transparent: true, opacity: 0.8, depthWrite: false }));
  land.rotation.x = -Math.PI / 2; land.visible = false; scene.add(land);
  fx.land = land;

  fx.update = (dt, camera, t) => {
    for (const r of rings) {
      if (r.life <= 0) { r.m.visible = false; continue; }
      r.life -= dt;
      const k = 1 - r.life / r.max;
      r.m.scale.setScalar(r.size * (0.3 + k * 1.2));
      r.m.material.opacity = (1 - k) * 0.9;
      if (!r.flat) r.m.quaternion.copy(camera.quaternion);
    }
    for (const s of stars) {
      if (s.life <= 0) { s.s.visible = false; continue; }
      s.life -= dt;
      const k = 1 - s.life / s.max;
      const sc = s.size * (k < 0.3 ? 0.4 + k / 0.3 * 0.8 : 1.2 - (k - 0.3) * 0.6);
      s.s.scale.setScalar(sc);
      s.s.material.opacity = k < 0.6 ? 1 : (1 - k) / 0.4;
    }
    for (const c of conf) {
      if (c.life <= 0) continue;
      c.life -= dt;
      c.v.y -= 6 * dt; c.v.multiplyScalar(Math.exp(-1.6 * dt));
      c.m.position.addScaledVector(c.v, dt);
      if (c.m.position.y < 0.02) { c.m.position.y = 0.02; c.v.set(0, 0, 0); }
      c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
      if (c.life <= 0) c.m.visible = false;
    }
    const pulse = 1 + Math.sin(t * 6) * 0.08;
    reticle.scale.set(pulse, 1, pulse);
    land.scale.set(pulse, 1, pulse);
  };
  return fx;
}

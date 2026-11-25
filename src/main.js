// =============================================================
//  PING PING PONG — punto de entrada: render, cámara, entrada, HUD
// =============================================================
import * as THREE from 'three';
import * as C from './config.js';
import * as P from './physics.js';
import { G, onEvent, newMatch, update, startCharge, releaseCharge, paddleZ } from './game.js';
import { createSky, createTable, createBall } from './models.js';
import { createCharacter, DEFAULT_LOOK, CPU_LOOKS, rivalColor, cpuLookFor, hueDist } from './character.js';
import { applyRemoteHit, applyRemotePoint, setRemoteState, localState, ballSnapshot } from './game.js';
import { createOnline } from './online.js';
import { createArena } from './arena.js';
import { createFX } from './fx.js';
import { initAudio, SFX, toggleMute, isMuted, setSfxEnabled, setMusicVolume, setSfxVolume } from './audio.js';
import { createMenu, renderControls, CONTROLS } from './ui.js';

const $ = id => document.getElementById(id);
const DEBUG = new URLSearchParams(location.search).get('debug');

// ---------- Render ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
catch (e) { throw new Error('WebGL no disponible: activa la aceleración por hardware del navegador'); }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = createSky();
scene.fog = new THREE.Fog(C.PALETTE.fog, 24, 60);
const camera = new THREE.PerspectiveCamera(46, 1, 0.05, 150);

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a8ff, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(3, 9, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7.5, right: 7.5, top: 7, bottom: -7, near: 1, far: 26 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);

const arena = createArena(scene);
scene.add(createTable());
const views = [null, null];   // se crean al cargar los ajustes (aspecto personalizado)
const ballView = createBall(); scene.add(ballView);
const fx = createFX(scene);

const overlay = $('overlay'), octx = overlay.getContext('2d');
let dpr = 1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = w * dpr; overlay.height = h * dpr;
  overlay.style.width = w + 'px'; overlay.style.height = h + 'px';
}
addEventListener('resize', resize); resize();

// ---------- Estado de presentación ----------
let screen = 'menu';
let menuPane = 'play';
const posing = () => screen === 'menu' && menuPane === 'char';   // vestidor: demo en pausa, cámara cercana
let shake = 0, hitstop = 0, slow = 0, time = 0;
const ballPos = new THREE.Vector3();
const tmpV = new THREE.Vector3();

// ---------- Ajustes ----------
const settings = { diff: 1, target: 11, assist: 1, control: 'classic', zoom: 0.55, music: 0.3, sfx: 0.8, quality: 'high', aids: 1, showControls: 1 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ppp-settings') || '{}')); } catch (e) { /* sin storage */ }
if (!CONTROLS[settings.control]) settings.control = 'classic';
settings.look = { ...DEFAULT_LOOK, ...(settings.look || {}) };

// ---------- Personajes ----------
let cpuLookIdx = -1;
function rebuildPlayer() {
  const fp = fpActive;
  if (views[0]) views[0].dispose();
  views[0] = createCharacter(settings.look, { rotationY: Math.PI });
  scene.add(views[0].root);
  if (fp) views[0].setFirstPerson(true);
  applyTeamColors();
}
let cpuShirt = rivalColor(settings.look.shirtColor);
let remoteLook = null;          // aspecto del rival online (null = CPU)
// Color del rival: online respeta su elección salvo que choque con la mía
// En una sala online (aunque aún no haya empezado el partido) el rival mostrado es el remoto
const showRemote = () => !!remoteLook && (G.online || online.playing);
function opponentShirt() {
  const mine = settings.look.shirtColor;
  if (showRemote()) return hueDist(remoteLook.shirtColor, mine) < 0.08 ? rivalColor(mine) : remoteLook.shirtColor;
  return rivalColor(mine);
}
function rebuildCpu(force = false) {
  const idx = showRemote() ? 'online' : G.demo ? 2 : +settings.diff;
  if (idx === cpuLookIdx && !force) return;
  cpuLookIdx = idx;
  if (views[1]) views[1].dispose();
  views[1] = createCharacter(showRemote() ? { ...remoteLook, shirtColor: opponentShirt() } : cpuLookFor(idx, settings.look.shirtColor));
  scene.add(views[1].root);
}
// El rival siempre viste el color opuesto al del jugador
function applyTeamColors() {
  const c1 = settings.look.shirtColor;
  cpuShirt = opponentShirt();
  arena.setTeams(c1, cpuShirt);
  document.documentElement.style.setProperty('--team1', c1);
  document.documentElement.style.setProperty('--team2', cpuShirt);
  COLS[0] = new THREE.Color(c1).getHex();
  COLS[1] = new THREE.Color(cpuShirt).getHex();
  if (views[1]) rebuildCpu(true);
}
function applySettings() {
  G.diff = +settings.diff; G.target = +settings.target; G.assist = !!+settings.assist; G.control = settings.control;
  try { localStorage.setItem('ppp-settings', JSON.stringify(settings)); } catch (e) { /* sin storage */ }
}
applySettings();
const free = () => G.control === 'free';

// ---------- Pantallas ----------
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function startGame() {
  initAudio(); SFX.select();
  screen = 'game'; setSfxEnabled(true);
  show('menu', false); show('over', false); show('pause', false); show('hud', true);
  renderControls(settings.control);
  $('controls').classList.toggle('off', !+settings.showControls);
  newMatch(false);
}
function toMenu(keepRoom = false) {
  const wasOnline = G.online;
  screen = 'menu'; setSfxEnabled(false);
  show('menu', true); show('over', false); show('pause', false); show('hud', false); show('netTag', false);
  if (wasOnline && !keepRoom) { online.send({ t: 'bye' }); online.leave(); }
  remoteLook = keepRoom ? remoteLook : null;
  newMatch(true);
  applyTeamColors(); rebuildCpu(true);
  menu.refresh();
}
function setPause(on) {
  if (screen === 'menu' || (G.phase === 'over' && on)) return;
  screen = on ? 'pause' : 'game';
  show('pause', on);
  show('restartBtn', !G.online); show('pauseOnline', G.online);
  if (on) {
    releaseCharge(G.chars[0]);
    $('pS0').textContent = G.score[0]; $('pS1').textContent = G.score[1];
  }
}

// ---------- Online ----------
let rematch = { me: false, them: false }, stTimer = 0;
const online = createOnline({
  getHello: () => ({ look: settings.look, control: settings.control, v: 1 }),
  getTarget: () => +settings.target,
  blip: () => { initAudio(); SFX.blip(); },
  onReady: hello => { remoteLook = { ...DEFAULT_LOOK, ...hello.look }; applyTeamColors(); rebuildCpu(true); SFX.select(); if (DEBUG === 'bot' && online.S.isHost) setTimeout(() => online.start(), 500); },
  onStart: ({ firstServer, target }) => startOnline(firstServer, target),
  onMessage: m => {
    if (!G.online) return;
    if (m.t === 'st') setRemoteState(m);
    else if (m.t === 'hit') applyRemoteHit(m, (online.S.rtt / 2000) * C.TIME_SCALE);
    else if (m.t === 'pt') applyRemotePoint(m);
    else if (m.t === 'rematch') { rematch.them = true; tryRematch(); }
    else if (m.t === 'bye') onlineClosed(`${remoteLook ? remoteLook.name : 'Tu rival'} abandonó el partido.`);
  },
  onClosed: reason => onlineClosed(reason),
  onLook: look => { remoteLook = { ...DEFAULT_LOOK, ...look }; applyTeamColors(); rebuildCpu(true); refreshHUD(); },
  onLeft: () => { if (!G.online) { remoteLook = null; applyTeamColors(); rebuildCpu(true); } },
});
function startOnline(firstServer, target) {
  initAudio(); SFX.select();
  rematch = { me: false, them: false };
  screen = 'game'; setSfxEnabled(true);
  show('menu', false); show('over', false); show('pause', false); show('hud', true); show('netTag', true);
  $('againBtn').classList.remove('waiting');
  renderControls(settings.control);
  $('controls').classList.toggle('off', !+settings.showControls);
  newMatch(false, { online: true, firstServer, target });
  applyTeamColors(); rebuildCpu(true);
  if (DEBUG === 'bot') G.chars[0].ai = true;
  refreshHUD();
}
function onlineClosed(reason) {
  if (!G.online) return;
  banner('Desconectado', reason, '#ff5a6e');
  hint('');
  setTimeout(() => { if (G.online) { toMenu(); menu.go('online'); } }, 2200);
}
function tryRematch() {
  if (!rematch.me || !rematch.them) return;
  if (online.S.isHost) online.start();
}
// estado del giro en el vestidor (debe existir antes de crear el menú: onPane lo usa al iniciar)
const rot = { auto: true, yaw: 0, vel: 0, drag: false, lastX: 0 };
const menu = createMenu({
  settings,
  onChange: applySettings,
  onPlay: startGame,
  blip: () => { initAudio(); SFX.blip(); },
  onLook: nameOnly => {
    applySettings(); if (!nameOnly) rebuildPlayer();
    // en una sala, el rival ve tus cambios al momento
    if (online.playing) { online.send({ t: 'look', look: settings.look }); online.refreshVs(); }
  },
  onPane: id => { menuPane = id; rot.auto = true; rot.vel = 0; $('menu').classList.toggle('posing', id === 'char'); },
});

// ---------- Vestidor: girar al frijolito arrastrando ----------
$('menu').addEventListener('pointerdown', e => {
  if (!posing() || e.button !== 0 || e.target.closest('.menu-panel, .menu-left, .menu-top, .prompts')) return;
  if (rot.auto) { rot.yaw = views[0].root.rotation.y - Math.PI; rot.auto = false; }
  rot.drag = true; rot.lastX = e.clientX; rot.vel = 0;
  $('menu').classList.add('dragging');
});
addEventListener('pointermove', e => {
  if (!rot.drag) return;
  const d = (e.clientX - rot.lastX) * 0.012;
  rot.yaw += d; rot.vel = d * 25; rot.lastX = e.clientX;
});
addEventListener('pointerup', () => { if (rot.drag) { rot.drag = false; $('menu').classList.remove('dragging'); } });

// ---------- Ajustes ----------
let settingsOpen = false;
function applyQuality() {
  const q = settings.quality;
  renderer.setPixelRatio(q === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : q === 'medium' ? 1 : 0.75);
  const sh = q !== 'low';
  if (renderer.shadowMap.enabled !== sh) {
    renderer.shadowMap.enabled = sh;
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
  }
  const size = q === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  resize();
}
function applyAudioSettings() { setMusicVolume(+settings.music); setSfxVolume(+settings.sfx); }
function refreshSettingsUI() {
  $('setMusic').value = Math.round(settings.music * 100); $('setMusicV').textContent = Math.round(settings.music * 100);
  $('setSfx').value = Math.round(settings.sfx * 100); $('setSfxV').textContent = Math.round(settings.sfx * 100);
  document.querySelectorAll('#settings .seg2[data-k]').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(settings[s.dataset.k]) === b.dataset.v)));
  $('fsBtn').textContent = document.fullscreenElement ? 'Salir' : 'Activar';
}
function openSettings(on) {
  settingsOpen = on; show('settings', on);
  if (on) { refreshSettingsUI(); initAudio(); }
}
$('setMusic').addEventListener('input', e => { settings.music = e.target.value / 100; applyAudioSettings(); applySettings(); refreshSettingsUI(); });
$('setSfx').addEventListener('input', e => { settings.sfx = e.target.value / 100; applyAudioSettings(); applySettings(); refreshSettingsUI(); });
$('setSfx').addEventListener('change', () => SFX.paddle(0.5));
document.querySelectorAll('#settings .seg2[data-k]').forEach(s => s.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  settings[s.dataset.k] = b.dataset.v; applySettings(); SFX.blip();
  if (s.dataset.k === 'quality') applyQuality();
  if (s.dataset.k === 'showControls') $('controls').classList.toggle('off', !+settings.showControls);
  refreshSettingsUI();
}));
$('fsBtn').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
  setTimeout(refreshSettingsUI, 300);
});
$('settingsBtn').onclick = () => { SFX.blip(); openSettings(true); };
$('pauseSettings').onclick = () => openSettings(true);
$('settingsClose').onclick = () => openSettings(false);
applyAudioSettings();
applyQuality();
function again() {
  if (!G.online) return startGame();
  rematch.me = true; online.send({ t: 'rematch' });
  $('againBtn').classList.add('waiting');
  tryRematch();
}
$('againBtn').onclick = again;
$('menuBtn').onclick = () => toMenu();
$('resumeBtn').onclick = () => setPause(false);
$('restartBtn').onclick = startGame;
$('quitBtn').onclick = () => toMenu();
$('pauseBtn').onclick = () => setPause(true);
function refreshMute() { $('muteBtn').classList.toggle('off', isMuted()); $('muteLbl').textContent = isMuted() ? 'Silencio' : 'Sonido'; }
$('muteBtn').onclick = () => { initAudio(); toggleMute(); refreshMute(); };

// ---------- HUD ----------
function refreshHUD() {
  $('s0').textContent = G.score[0]; $('s1').textContent = G.score[1];
  $('name0').textContent = settings.look.name || 'Tú';
  $('name1').textContent = G.online && remoteLook ? remoteLook.name + ' · Online' : CPU_LOOKS[G.diff].name + ' · ' + C.DIFFS[G.diff].name;
  $('target').textContent = 'A ' + G.target;
  $('srv0').classList.toggle('on', G.server === 0 && G.phase !== 'over');
  $('srv1').classList.toggle('on', G.server === 1 && G.phase !== 'over');
}
function bump(id) { const e = $(id); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
function hint(html) { $('hint').innerHTML = html; $('hint').classList.toggle('on', !!html); }
function banner(text, sub = '', acc = '#ffc93c') {
  const b = $('banner');
  b.innerHTML = `<div class="big" style="--acc:${acc}"><span>${text}</span></div>${sub ? `<div class="sub"><span>${sub}</span></div>` : ''}`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function toScreen(v) {
  tmpV.copy(v).project(camera);
  return { x: (tmpV.x + 1) / 2 * innerWidth, y: (1 - tmpV.y) / 2 * innerHeight, front: tmpV.z < 1 };
}
function pop3D(text, pos, cls = '') {
  const s = toScreen(pos); if (!s.front) return;
  const d = document.createElement('div');
  d.className = 'pop ' + cls; d.textContent = text;
  d.style.left = s.x + 'px'; d.style.top = s.y + 'px';
  $('pops').appendChild(d);
  setTimeout(() => d.remove(), 1100);
}

// ---------- Eventos del juego ----------
const COLS = [C.PALETTE.player, C.PALETTE.cpu];
let tutorialHits = 0;
onEvent((type, d) => {
  if (type === 'match') { rebuildCpu(); fx.clearTrail(); refreshHUD(); tutorialHits = 0; return; }
  if (type === 'serve') {
    refreshHUD();
    if (G.demo) { hint(''); return; }
    if (G.server === 0) {
      banner('Tu saque', free() ? 'Golpea la bola con la pala' : 'Haz clic para sacar', '#4da8ff');
      hint(free() ? 'Mueve la pala contra la bola con un <b>swing hacia arriba</b>'
        : 'Apunta en la mesa rival y <b>haz clic</b> para sacar');
    } else {
      banner(G.online && remoteLook ? `Saca ${remoteLook.name}` : 'Saca la CPU', 'Prepárate', '#ff6b8b');
      hint(tutorialHits < 3 ? (free() ? 'Pon la pala en el <b>anillo</b> y haz swing al llegar la bola'
        : '<b>Haz clic</b> cuando el anillo se cierre sobre la bola') : '');
    }
    return;
  }
  if (type === 'swing') { SFX.whoosh(); return; }
  if (type === 'whiff') {
    SFX.whiff();
    const c = G.chars[0];
    pop3D(d.msg, tmpV.set(c.x, 1.5, c.z), 'weak');
    return;
  }
  if (type === 'hit') {
    // Online: mi golpe lo decido yo y se lo envío al rival (estado exacto de la bola)
    if (G.online && d.c === 0 && !d.remote) {
      online.send({ t: 'hit', b: ballSnapshot(), kind: G.ball.kind, rally: G.rally,
        meta: { type: d.type, smash: d.smash, power: d.power, q: d.q, grade: d.grade, serve: d.serve, side: d.side, bh: G.chars[0].backhand } });
    }
    if (!G.demo && d.c === 0) tutorialHits++;
    if (!G.demo && d.c === 1 && tutorialHits < 3) hint(free() ? 'Lleva la pala al <b>anillo</b>: se pone verde cuando estás bien colocado'
      : '<b>Ahora:</b> haz clic cuando el anillo amarillo se cierre sobre la bola');
    else hint('');
    const pos = new THREE.Vector3(d.x, d.y, d.z);
    if (d.smash) {
      SFX.smash();
      fx.star(pos, 0xffd166, 0.7); fx.ring(pos, 0xff6b3d, 0.9);
      shake = 0.13; hitstop = 0.07; slow = 0.35;
      pop3D('¡SMASH!', pos, 'smash');
      arena.hype(0.4);
    } else {
      SFX.paddle(d.power);
      fx.star(pos, 0xffffff, 0.22 + d.power * 0.15);
      fx.ring(pos, COLS[d.c], 0.35);
      shake = Math.max(shake, 0.015 + 0.02 * d.power);
    }
    if (d.grade === 'perfect') {
      SFX.perfect();
      if (d.c === 0 && !G.demo) { pop3D('¡PERFECTO!', pos.clone().add(tmpV.set(0, 0.25, 0)), 'perfect'); hitstop = Math.max(hitstop, 0.05); }
    } else if (d.grade === 'weak' && d.c === 0 && !G.demo) pop3D('flojo…', pos, 'weak');
    if (Math.abs(d.side) > 50 && !G.demo) pop3D('¡CURVA!', pos.clone().add(tmpV.set(0, -0.2, 0)), 'curve');
    if (!G.demo && G.rally >= 10 && G.rally % 10 === 0) { banner(`¡RALLY ${G.rally}!`, '', '#7bdff2'); arena.hype(0.5); SFX.cheer(); }
    return;
  }
  if (type === 'bounce') {
    if (d.type === P.EV_TABLE) { SFX.table(d.v); fx.ring(tmpV.set(d.x, C.TABLE_H + 0.004, d.z), 0xffffff, 0.22, true, 0.4); }
    else if (d.type === P.EV_NET) SFX.net();
    else SFX.floor(d.v);
    return;
  }
  if (type === 'point') {
    if (G.online && d.auth) online.send({ t: 'pt', w: d.winner, reason: d.reason, score: d.score });
    refreshHUD(); bump('s' + d.winner);
    const w = G.chars[d.winner];
    fx.confetti(tmpV.set(w.x, 1.4, w.z), d.winner === 0 ? 70 : 35);
    if (!G.demo) {
      const sub = d.winner === 0 ? 'Punto para ti' : G.online && remoteLook ? `Punto para ${remoteLook.name}` : 'Punto para la CPU';
      banner(d.reason, sub, d.winner === 0 ? '#4da8ff' : '#ff6b8b');
      if (d.winner === 0) SFX.cheer(); else SFX.aww();
      arena.cheer(d.winner, 1);
    } else arena.cheer(d.winner, 0.6);
    return;
  }
  if (type === 'over') {
    refreshHUD();
    const won = d.winner === 0;
    won ? SFX.win() : SFX.lose();
    hint('');
    $('overKicker').textContent = G.online && remoteLook ? `Final · Online contra ${remoteLook.name}` : `Final · CPU ${C.DIFFS[G.diff].name} · ${CONTROLS[settings.control].name}`;
    $('overTitle').textContent = won ? 'Victoria' : 'Derrota';
    $('overTitle').className = 'sheet-title ' + (won ? 'win' : 'lose');
    $('oS0').textContent = G.score[0]; $('oS1').textContent = G.score[1];
    $('overStats').innerHTML =
      `<div><b>${G.stats.longest}</b><span>Rally máx.</span></div>` +
      `<div><b>${G.stats.perfect[0]}</b><span>Perfectos</span></div>` +
      `<div><b>${G.stats.smash[0]}</b><span>Smashes</span></div>` +
      `<div><b>${G.stats.aces[0]}</b><span>Aces</span></div>`;
    show('over', true);
    if (won) fx.confetti(tmpV.set(0, 2, 0), 120);
  }
});

// ---------- Entrada ----------
const keys = new Set();
const mouse = { x: innerWidth / 2, y: innerHeight * 0.45, vx: 0, t: 0, has: false };
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -C.TABLE_H);
const hitP = new THREE.Vector3();

const handPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function updateAim() {
  if (!mouse.has) return;
  ndc.set(mouse.x / innerWidth * 2 - 1, -(mouse.y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (free() && screen === 'game') {
    // Mano libre: el ratón se proyecta sobre el plano vertical de la pala
    handPlane.constant = -G.hand.z;
    if (raycaster.ray.intersectPlane(handPlane, hitP)) { G.hand.tx = hitP.x; G.hand.ty = hitP.y; }
    return;
  }
  if (raycaster.ray.intersectPlane(tablePlane, hitP)) {
    G.aim.x = Math.max(-C.HALF_W + 0.08, Math.min(C.HALF_W - 0.08, hitP.x));
    G.aim.z = Math.max(-C.HALF_L + 0.1, Math.min(-0.22, hitP.z));
  }
}
addEventListener('pointermove', e => {
  const now = performance.now();
  const dtm = Math.max(1, now - mouse.t);
  const vx = (e.clientX - mouse.x) / dtm * 1000;
  mouse.vx = mouse.vx * 0.5 + vx * 0.5;
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now; mouse.has = true;
});
const app = $('app');
app.addEventListener('pointerdown', e => {
  initAudio();
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true;
  if (screen !== 'game' || e.pointerType === 'touch') return;
  if (free()) { G.hand.rollTarget = e.button === 2 ? 1 : -1; return; }
  startCharge(G.chars[0], e.button === 2 ? 'back' : 'top');
});
addEventListener('pointerup', e => {
  if (!free()) return;
  if (e.buttons & 1) G.hand.rollTarget = -1; else if (e.buttons & 2) G.hand.rollTarget = 1; else G.hand.rollTarget = 0;
});
function doRelease() {
  const c = G.chars[0];
  if (screen !== 'game' || !c || c.ai || !c.charging) return;
  G.flick = -(mouse.vx / innerWidth) * 70;
  releaseCharge(c);
}
addEventListener('pointerup', e => { if (e.pointerType !== 'touch') doRelease(); });
addEventListener('contextmenu', e => e.preventDefault());

for (const [id, type] of [['tTop', 'top'], ['tBack', 'back']]) {
  const b = $(id);
  b.addEventListener('pointerdown', e => { e.stopPropagation(); initAudio(); if (screen === 'game') startCharge(G.chars[0], type); });
  b.addEventListener('pointerup', e => { e.stopPropagation(); mouse.vx = 0; doRelease(); });
  b.addEventListener('pointerleave', () => { mouse.vx = 0; doRelease(); });
}
if (matchMedia('(pointer: coarse)').matches) { $('touch').classList.remove('hidden'); $('controls').classList.add('hidden'); }

const ACT_TOP = ['Space', 'KeyJ'], ACT_BACK = ['KeyK', 'ShiftLeft', 'ShiftRight'];
addEventListener('keydown', e => {
  initAudio();
  if (settingsOpen) { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); openSettings(false); } return; }
  if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Enter' || e.code === 'Escape') e.target.blur(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyM') { toggleMute(); refreshMute(); return; }
  if (e.code === 'KeyH') { $('controls').classList.toggle('off'); return; }
  if (screen === 'menu') {
    if (menuPane === 'online' && (e.code === 'Enter' || e.code === 'Space')) { online.start(); return; }
    menu.key(e.code); return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (screen === 'game') setPause(true); else if (screen === 'pause') setPause(false); return; }
  if (screen !== 'game') return;
  if (G.phase === 'over') { if (e.code === 'Enter') startGame(); else if (e.code === 'Escape') toMenu(); return; }
  if (free()) {
    if (e.code === 'KeyQ') G.hand.rollTarget = -1;
    else if (e.code === 'KeyE') G.hand.rollTarget = 1;
    return;
  }
  if (ACT_TOP.includes(e.code)) startCharge(G.chars[0], 'top');
  else if (ACT_BACK.includes(e.code)) startCharge(G.chars[0], 'back');
});
addEventListener('keyup', e => {
  keys.delete(e.code);
  if ((e.code === 'KeyQ' || e.code === 'KeyE') && free()) G.hand.rollTarget = keys.has('KeyQ') ? -1 : keys.has('KeyE') ? 1 : 0;
  if (ACT_TOP.includes(e.code) || ACT_BACK.includes(e.code)) { mouse.vx = 0; doRelease(); }
});
addEventListener('blur', () => { keys.clear(); if (G.chars[0]) releaseCharge(G.chars[0]); });
function keyAxes() {
  const k = c => keys.has(c);
  return {
    x: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
    z: (k('KeyS') || k('ArrowDown') ? 1 : 0) - (k('KeyW') || k('ArrowUp') ? 1 : 0),
  };
}

// ---------- Cámara ----------
// Zoom con la rueda: 0 = primera persona … 1 = lejos
const FP_ZOOM = 0.12;
let camZoom = Math.max(0, Math.min(1, +settings.zoom || 0.55));
let fpActive = false;
let camTagTimer = 0;
function setFP(on) {
  if (fpActive === on) return;
  fpActive = on;
  views[0].setFirstPerson(on);
}
addEventListener('wheel', e => {
  if (screen !== 'game') return;
  e.preventDefault();
  camZoom = Math.max(0, Math.min(1, camZoom + Math.sign(e.deltaY) * 0.07));
  settings.zoom = camZoom.toFixed(2);
  try { localStorage.setItem('ppp-settings', JSON.stringify(settings)); } catch (err) { /* sin storage */ }
  const tag = $('camTag');
  tag.textContent = camZoom < FP_ZOOM ? 'Cámara: 1ª persona' : `Cámara: ${Math.round(camZoom * 100)}%`;
  tag.classList.add('on'); camTagTimer = 1.2;
}, { passive: false });

const camPos = new THREE.Vector3(5, 3, 5), camLook = new THREE.Vector3(0, 0.8, 0);
const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3();
function updateCamera(dt) {
  setFP(screen !== 'menu' && !G.demo && camZoom < FP_ZOOM);
  if (camTagTimer > 0 && (camTagTimer -= dt) <= 0) $('camTag').classList.remove('on');
  const aspect = innerWidth / innerHeight;
  const far = aspect < 1.3 ? 1.3 / aspect : 1;
  if (posing()) {
    // Vestidor: plano cercano del personaje, ligeramente desplazado para dejar sitio al panel
    const p = G.chars[0], hs = settings.look.height;
    camTarget.set(p.x - 0.1, 0.8 + hs * 0.42, p.z - 2.55 * far);
    lookTarget.set(p.x - 0.1, 0.5 + hs * 0.28, p.z);
  } else if (screen === 'menu') {
    // Plano "hero": de frente al jugador mientras juega la demo
    const p = G.chars[0];
    const a = 0.3 + Math.sin(time * 0.17) * 0.12, r = 3.3 * far;
    camTarget.set(p.x + Math.sin(a) * r, 1.45 + Math.sin(time * 0.23) * 0.08, p.z - Math.cos(a) * r);
    lookTarget.set(p.x + 0.42, 0.9, p.z - 0.6);
  } else if (fpActive) {
    // Primera persona: ojos del jugador, un poco detrás y a la derecha para ver la pala
    const p = G.chars[0];
    camTarget.set(p.x + 0.24, 1.32, p.z + 0.95);
    lookTarget.set(p.x * 0.6 + G.ball.x * 0.15 + 0.12, 0.36, -1.4);
  } else {
    // Tercera persona: zoom 0 (cerca) → 1 (lejos)
    const p = G.chars[0];
    const t = Math.max(0, Math.min(1, (camZoom - FP_ZOOM) / (1 - FP_ZOOM)));
    const back = 1.0 + t * 2.4, h = 1.75 + t * 1.95;
    camTarget.set(p.x * (0.6 - t * 0.25) + G.ball.x * 0.1 + 0.35, h + (far - 1) * 1.4, C.HALF_L + 0.55 + back + (far - 1) * 2.6);
    lookTarget.set(p.x * 0.12 + G.ball.x * 0.08 + 0.05, 0.4 + (1 - t) * 0.2, -0.4 - t * 0.45);
  }
  const k = 1 - Math.exp(-(posing() ? 5 : screen === 'menu' ? 1.5 : fpActive ? 10 : 4) * dt);
  camPos.lerp(camTarget, k); camLook.lerp(lookTarget, k);
  const fov = fpActive ? 66 : 46;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 8); camera.updateProjectionMatrix(); }
  camera.position.copy(camPos);
  if (shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
  camera.lookAt(camLook);
  shake *= Math.exp(-8 * dt);
}

// ---------- Capa 2D: anillo de timing y carga ----------
function label(s, text, color) {
  octx.font = 'italic 900 22px Rubik, sans-serif'; octx.textAlign = 'center';
  octx.lineJoin = 'round'; octx.lineWidth = 7; octx.strokeStyle = '#1a1238';
  octx.strokeText(text.toUpperCase(), s.x, s.y - 32);
  octx.fillStyle = color; octx.fillText(text.toUpperCase(), s.x, s.y - 32);
}
function drawOverlay() {
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.clearRect(0, 0, innerWidth, innerHeight);
  if (screen !== 'game' || G.demo) return;
  const c = G.chars[0], b = G.ball;
  const ring = (s, radius, color, w) => {
    octx.beginPath(); octx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    octx.strokeStyle = '#1a1238'; octx.lineWidth = w + 4; octx.stroke();
    octx.strokeStyle = color; octx.lineWidth = w; octx.stroke();
  };
  if (free() && +settings.aids) {
    // Mano libre: dónde cruzará la bola el plano de la pala
    const h = G.hand;
    if (G.phase === 'rally' && b.lastHitter === 1) {
      const r = P.simToPlane(b, h.z, c.sign, 0, b.count === 1, 1.2);
      if (r && r.ok && r.t < 1.1) {
        const s = toScreen(tmpV.set(r.x, r.y, r.z));
        const rpx = Math.abs(toScreen(tmpV.set(r.x + C.FREE_HIT_R, r.y, r.z)).x - s.x);
        const d = Math.hypot(r.x - h.x, r.y - h.y);
        const good = d < C.FREE_HIT_R * 0.55, ok = d < C.FREE_HIT_R;
        octx.setLineDash([6, 6]);
        ring(s, rpx, 'rgba(255,255,255,0.55)', 2);
        octx.setLineDash([]);
        ring(s, 8 + r.t * 60, good ? '#3ee0b0' : ok ? '#ffc93c' : '#ffffff', good ? 5 : 3);
        if (r.y > C.TABLE_H + C.SMASH_H) label(s, '¡Smash!', '#ffc93c');
      }
    }
    return;
  }
  if (+settings.aids && G.phase === 'rally' && b.lastHitter === 1 && c.swing <= 0 && !c.pending) {
    const r = P.simToPlane(b, paddleZ(c), c.sign, 0, b.count === 1, 1.2);
    if (r && r.ok && r.t < 1.1) {
      const s = toScreen(tmpV.set(r.x, r.y, r.z));
      const reach = Math.abs(r.x - c.x) <= C.REACH;
      const now = r.t < C.WIN_T * 0.3;
      const rad = 15 + r.t * 180;
      octx.lineCap = 'round';
      ring(s, 15, 'rgba(255,255,255,0.9)', 3);
      ring(s, rad, !reach ? '#ff6b6b' : now ? '#ffc93c' : '#ffffff', now ? 6 : 4);
      if (r.y > C.TABLE_H + C.SMASH_H) label(s, '¡Smash!', '#ffc93c');
    }
  }
  if (c.charging) {
    const x = mouse.x, y = mouse.y;
    octx.beginPath(); octx.arc(x, y, 26, 0, Math.PI * 2);
    octx.strokeStyle = 'rgba(42,33,64,0.5)'; octx.lineWidth = 9; octx.stroke();
    octx.beginPath(); octx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + c.charge * Math.PI * 2);
    octx.strokeStyle = c.charge >= 1 ? '#ff6b3d' : c.chargeType === 'back' ? '#6bc8ff' : '#ffd166';
    octx.lineWidth = 6; octx.stroke();
  }
}

// ---------- Bucle ----------
const spinQ = new THREE.Quaternion(), spinAxis = new THREE.Vector3();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  time += dt;
  if (G.chars[0] && !G.chars[0].ai) G.chars[0].keys = keyAxes();
  mouse.vx *= Math.exp(-10 * dt);

  let gdt = 0;
  const pose = posing();
  if ((screen !== 'pause' || G.online) && !pose) {
    let ts = C.TIME_SCALE;
    if (hitstop > 0) { hitstop -= dt; ts = 0; }
    else if (slow > 0) { slow -= dt; ts *= 0.35; }
    gdt = dt * ts;
    if (gdt > 0) update(gdt);
  }

  const b = G.ball;
  ballPos.set(b.x, b.y, b.z);
  for (const c of G.chars) c.focus = G.phase === 'rally' && b.live && b.lastHitter === 1 - c.idx;
  if (pose) {
    // vestidor: el frijolito se coloca y gira como en una vitrina
    const p = G.chars[0];
    p.x += (1.95 - p.x) * Math.min(1, dt * 5); p.z += (2.3 - p.z) * Math.min(1, dt * 5);
    p.vx = p.vz = 0; p.swing = 0; p.charging = false; p.celebrate = 0; p.mood = 0;
    views[0].sync(p, dt, tmpV.set(p.x, 1.0, p.z - 2), time);
    if (rot.auto) views[0].root.rotation.y = Math.PI + Math.sin(time * 0.6) * 0.95;
    else {
      if (!rot.drag) { rot.yaw += rot.vel * dt; rot.vel *= Math.exp(-6 * dt); }   // inercia suave al soltar
      views[0].root.rotation.y = Math.PI + rot.yaw;
    }
    views[1].sync(G.chars[1], 0, ballPos, time);
  } else views.forEach((v, i) => v.sync(G.chars[i], gdt, ballPos, time));
  ballView.position.copy(ballPos);
  const om = Math.hypot(b.wx, b.wy, b.wz);
  if (om > 0.5 && gdt > 0) {
    spinAxis.set(b.wx / om, b.wy / om, b.wz / om);
    spinQ.setFromAxisAngle(spinAxis, om * gdt * 0.2);
    ballView.quaternion.premultiply(spinQ);
  }
  const visible = (b.live || G.phase === 'serve') && !pose;
  ballView.visible = visible;
  const flying = visible && G.phase !== 'serve' && Math.hypot(b.vx, b.vy, b.vz) > 1.5;
  fx.trail(ballPos, b.kind === 'smash' ? 0xff5a3d : b.kind === 'back' ? 0x6bc8ff : 0xffb020, flying);
  fx.ballShadow(ballPos);

  updateCamera(dt);
  updateAim();
  const human = screen !== 'menu' && !G.demo;
  fx.reticle.visible = human && !free() && (G.phase === 'rally' || (G.phase === 'serve' && G.server === 0));
  fx.reticle.position.set(G.aim.x, C.TABLE_H + 0.002, G.aim.z);
  let landOn = false;
  if (human && +settings.aids && G.phase === 'rally' && b.lastHitter === 1 && b.count === 0) {
    const lb = P.predictBounce(b);
    if (lb && lb.z > 0) { fx.land.position.set(lb.x, C.TABLE_H + 0.003, lb.z); landOn = true; }
  }
  fx.land.visible = landOn;
  fx.update(dt, camera, time);
  arena.update(time, dt, ballPos);

  // Online: mi estado al rival 20 veces por segundo + indicador de ping
  if (G.online && screen !== 'menu') {
    stTimer -= dt;
    if (stTimer <= 0) {
      stTimer = 0.05; online.send(localState());
      const ms = Math.round(online.S.rtt);
      $('netPing').textContent = ms ? ms + ' ms' : '— ms';
      $('netTag').className = ms > 160 ? 'bad' : ms > 90 ? 'slow' : '';
    }
  }
  // Mano libre: el ratón es la pala, así que el cursor se oculta durante el partido
  const noCursor = screen === 'game' && free() && G.phase !== 'over' && !settingsOpen;
  if (noCursor !== document.body.classList.contains('nocursor')) document.body.classList.toggle('nocursor', noCursor);
  renderer.render(scene, camera);
  drawOverlay();
  if (DEBUG) document.title = `t=${G.time.toFixed(1)} ${G.phase} ${G.score} r=${G.rally}`;
  requestAnimationFrame(frame);
}

// El juego nunca debe desplazarse (el navegador lo intenta al enfocar botones fuera de vista)
document.addEventListener('scroll', e => { const t = e.target; if (t === document) { if (scrollX || scrollY) scrollTo(0, 0); } else if (t.id === 'menu' && t.scrollTop) t.scrollTop = 0; }, true);
window.addEventListener('error', e => { const el = $('err'); el.textContent = 'Error: ' + e.message; el.classList.remove('hidden'); });
setSfxEnabled(false);
rebuildPlayer();
newMatch(true);
rebuildCpu(true);
updateCamera(1);
requestAnimationFrame(frame);
// Hook de depuración/pruebas:  ?debug=play  → partida con la CPU controlando al jugador
window.__ppp = { G, scene, camera, views, THREE, startGame, toMenu, online };
// Enlace de invitación: ?sala=CÓDIGO entra directamente en la sala
const salaParam = new URLSearchParams(location.search).get('sala');
if (salaParam) { menu.go('online'); online.join(salaParam); }
if (DEBUG === 'bot' && new URLSearchParams(location.search).get('host')) { menu.go('online'); online.host(); }
if (DEBUG === 'play') {
  startGame(); G.chars[0].ai = true;
  const zq = new URLSearchParams(location.search).get('zoom');
  if (zq !== null) { camZoom = +zq; for (let i = 0; i < 40; i++) updateCamera(0.1); }
  const ff = +new URLSearchParams(location.search).get('ff') || 0;   // avance rápido (s)
  for (let i = 0; i < ff * 60; i++) update(C.TIME_SCALE / 60);
  // para captura: espera a que la bola esté en vuelo
  for (let i = 0; ff && i < 600 && !(G.phase === 'rally' && G.ball.lastHitter === 1 && G.ball.z > -0.3); i++) update(C.TIME_SCALE / 60);
}

// =============================================================
//  PING PING PONG — punto de entrada: render, cámara, entrada, HUD
// =============================================================
import * as THREE from 'three';
import * as C from './config.js';
import * as P from './physics.js';
import { G, onEvent, newMatch, update, startCharge, releaseCharge, paddleZ, setControl, freeR } from './game.js';
import { createSky, createTable, createBall } from './models.js';
import { createCharacter, DEFAULT_LOOK, CPU_LOOKS, rivalColor, cpuLookFor, hueDist } from './character.js';
import { applyRemoteHit, applyRemotePoint, setRemoteState, localState, ballSnapshot, doEmote } from './game.js';
import { createOnline } from './online.js';
import { createArena } from './arena.js';
import { createReferee } from './referee.js';
import { createFX } from './fx.js';
import { initAudio, SFX, toggleMute, isMuted, setSfxEnabled, setMusicVolume, setSfxVolume } from './audio.js';
import { createMenu, renderControls, CONTROLS } from './ui.js';
import { P as PR, sanitizeLook, boosts, padStats, matchReward, recordMatch, setNamed, isOwned, save as saveProgress, charLevel } from './progress.js';
import { createWorkshop, coinHTML } from './workshop.js';
import { createLobby } from './lobby.js';

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
const referee = createReferee(scene, {
  onBubble: (text, pos) => { if (screen !== 'menu') pop3D(text, pos, 'ref'); },
  onSound: s => { if (screen !== 'menu' && SFX[s]) SFX[s](); },
});
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
const settings = { diff: 1, target: 11, assist: 1, mode: '1v1', bestOf: 1, visibility: 'private', control: 'classic', zoom: 0.55, music: 0.3, sfx: 0.8, quality: 'high', aids: 1, showControls: 1 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('ppp-settings') || '{}')); } catch (e) { /* sin storage */ }
if (!CONTROLS[settings.control]) settings.control = 'classic';
settings.look = { ...DEFAULT_LOOK, ...(settings.look || {}) };
// la pala activa del Taller manda sobre el aspecto de la raqueta
function syncPaddleLook() {
  const p = PR.paddles[PR.active];
  settings.look.paddleType = isOwned('paddle', p.type) ? p.type : 'balanced';
  settings.look.paddleColor = p.color;
}
syncPaddleLook();
const playLook = () => sanitizeLook(settings.look);   // lo que ven los demás y lo que se juega (sin prendas por comprar)

// ---------- Jugadores y personajes ----------
// roster: un jugador por índice local (0 yo · 1 rival · 2 compañero · 3 rival 2)
let roster = [], teamShirts = ['#ffc93c', '#3cb5ff'];
const lookOf = i => (i === 0 ? settings.look : roster[i].look);
function cpuRoster(mode) {
  const d = +settings.diff, me = { look: settings.look, ctrl: 'human' };
  if (mode !== '2v2') return [me, { look: CPU_LOOKS[d], ctrl: 'ai' }];
  return [me, { look: CPU_LOOKS[d], ctrl: 'ai' }, { look: CPU_LOOKS[(d + 1) % 4], ctrl: 'ai' }, { look: CPU_LOOKS[(d + 2) % 4], ctrl: 'ai' }];
}
function demoRoster() {
  // en una sala 1v1, la escena del menú ya muestra a tu rival
  const others = online.S.active ? online.S.players.filter(p => p.slot !== online.S.slot) : [];
  const opp = others.length && online.S.cfg && online.S.cfg.mode !== '2v2' ? { ...DEFAULT_LOOK, ...others[0].look } : null;
  return [{ look: settings.look, ctrl: 'ai' }, { look: opp || CPU_LOOKS[2], ctrl: 'ai', remoteLook: !!opp }];
}
function teamColors() {
  const mine = settings.look.shirtColor, o = roster[1];
  const theirs = o && (o.ctrl === 'remote' || o.remoteLook) && o.look.shirtColor && hueDist(o.look.shirtColor, mine) >= 0.08 ? o.look.shirtColor : rivalColor(mine);
  return [mine, theirs];
}
// Cada equipo viste su color (en dobles, los compañeros van uniformados)
function buildViews() {
  views.forEach(v => v && v.dispose()); views.length = 0;
  teamShirts = teamColors();
  roster.forEach((p, i) => {
    const team = i % 2;
    let look;
    if (i === 0) look = screen === 'menu' ? settings.look : playLook();
    else if (p.ctrl === 'remote' || p.remoteLook) look = { ...DEFAULT_LOOK, ...p.look, shirtColor: teamShirts[team] };
    else {
      const ci = Math.max(0, CPU_LOOKS.indexOf(p.look));
      look = { ...cpuLookFor(ci, settings.look.shirtColor), shirtColor: teamShirts[team] };
    }
    const v = createCharacter(look, { rotationY: team === 0 ? Math.PI : 0 });
    scene.add(v.root); views[i] = v;
  });
  if (fpActive) views[0].setFirstPerson(true);
  arena.setTeams(teamShirts[0], teamShirts[1]);
  document.documentElement.style.setProperty('--team1', teamShirts[0]);
  document.documentElement.style.setProperty('--team2', teamShirts[1]);
  COLS[0] = COLS[2] = new THREE.Color(teamShirts[0]).getHex();
  COLS[1] = COLS[3] = new THREE.Color(teamShirts[1]).getHex();
}
const rebuildPlayer = () => buildViews();
const paddlesOf = () => roster.map((p, i) => (i === 0 ? settings.look.paddleType : p.look.paddleType) || 'balanced');
// mi pala con sus mejoras y mis habilidades; el resto juega con la base de su tipo
const padsOf = () => roster.map((p, i) => (i === 0 ? padStats() : C.PADDLES[p.look.paddleType] || C.PADDLES.balanced));
const boostsOf = () => roster.map((p, i) => (i === 0 ? boosts() : null));
function applySettings() {
  G.diff = +settings.diff; G.target = +settings.target; G.assist = !!+settings.assist; G.control = settings.control;
  try { localStorage.setItem('ppp-settings', JSON.stringify(settings)); } catch (e) { /* sin storage */ }
}
applySettings();
const free = () => G.control === 'free';
const teamName = t => roster.map((p, i) => ({ p, i })).filter(x => x.i % 2 === t)
  .map(x => (x.i === 0 ? (settings.look.name || 'Tú') : x.p.look.name)).join(' & ');

// ---------- Pantallas ----------
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function enterGame() {
  initAudio(); SFX.select();
  screen = 'game'; setSfxEnabled(true);
  show('menu', false); show('over', false); show('pause', false); show('prelobby', false); show('hud', true);
  renderControls(settings.control);
  $('controls').classList.toggle('off', !+settings.showControls);
}
function startGame() {
  enterGame(); show('netTag', false);
  roster = cpuRoster(settings.mode);
  buildViews();
  newMatch(false, { mode: settings.mode, bestOf: +settings.bestOf, target: +settings.target, ctrl: roster.map(p => p.ctrl), paddles: paddlesOf(), pads: padsOf(), boosts: boostsOf() });
}
function toMenu(keepRoom = false) {
  const wasOnline = G.online;
  screen = 'menu'; setSfxEnabled(false);
  show('menu', true); show('over', false); show('pause', false); show('hud', false); show('netTag', false);
  if (wasOnline && !keepRoom) { online.send({ t: 'bye' }); online.leave(); }
  else if (wasOnline) online.endMatch();
  newMatch(true);
  roster = demoRoster(); buildViews();
  menu.refresh();
}
function setPause(on) {
  if (screen === 'menu' || (G.phase === 'over' && on)) return;
  screen = on ? 'pause' : 'game';
  show('pause', on);
  show('restartBtn', !G.online); show('pauseOnline', G.online); refreshPauseStyle();
  if (on) {
    releaseCharge(G.chars[0]);
    $('pS0').textContent = G.score[0]; $('pS1').textContent = G.score[1];
  }
}

// ---------- Prelobby: configurar el partido ----------
let plFor = 'cpu';
function openPrelobby(kind) {
  plFor = kind; initAudio(); SFX.blip();
  $('plTitle').textContent = kind === 'online' ? 'Crear sala' : 'Partido rápido';
  $('plKicker').textContent = kind === 'online' ? 'Configura la sala online' : 'Prepara el partido';
  $('plGoTxt').textContent = kind === 'online' ? 'Crear sala' : '¡A jugar!';
  $('plDiffLbl').textContent = kind === 'online' ? 'CPU de relleno' : 'Rival';
  $('plDiffDesc').textContent = kind === 'online' ? 'Nivel de la CPU si faltan jugadores' : 'Nivel de la CPU';
  show('plVisRow', kind === 'online');
  refreshPrelobby(); show('prelobby', true);
}
function refreshPrelobby() {
  document.querySelectorAll('#prelobby .seg2[data-k]').forEach(s => s.querySelectorAll('button').forEach(b => b.classList.toggle('on', String(settings[s.dataset.k]) === b.dataset.v)));
  $('plModeDesc').textContent = settings.mode === '2v2'
    ? (plFor === 'online' ? 'Hasta 4 jugadores: dos equipos de dos' : 'Tú y un compañero CPU contra dos CPU')
    : (plFor === 'online' ? 'Tú contra otro jugador' : 'Tú contra la CPU');
  const pt = C.PADDLES[settings.look.paddleType] || C.PADDLES.balanced, pad = PR.paddles[PR.active];
  const ups = Object.values(pad.up).reduce((a, b) => a + b, 0);
  $('plPaddleDesc').textContent = `${pad.name} · ${pt.name}${ups ? ' · ' + ups + ' mejoras' : ''}`;
  $('plPads').innerHTML = PR.paddles.map((p, i) => `<button data-i="${i}" class="${i === PR.active ? 'on' : ''}"><i class="pdot" style="background:${p.color}"></i>${p.name.replace(/[<>&"]/g, '')}</button>`).join('');
}
document.querySelectorAll('#prelobby .seg2[data-k]').forEach(s => s.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  settings[s.dataset.k] = b.dataset.v; applySettings(); SFX.blip(); refreshPrelobby(); menu.refresh();
}));
const prelobbyOpen = () => !$('prelobby').classList.contains('hidden');
function prelobbyGo() { show('prelobby', false); if (plFor === 'online') online.host(); else startGame(); }
$('plGo').onclick = prelobbyGo;
$('plBack').onclick = () => { show('prelobby', false); SFX.blip(); };
$('plPads').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  PR.active = +b.dataset.i; saveProgress(); paddleChanged(); SFX.blip(); refreshPrelobby();
});

// ---------- Online ----------
let rematch = { me: false, them: new Set() }, stTimer = 0;
const teamOfSlot = s => s % 2;
function localOf(s) {
  const g = online.S.slot;
  if (s === g) return 0;
  if (teamOfSlot(s) === teamOfSlot(g)) return 2;
  return s < 2 ? 1 : 3;
}
function globalOf(li) { for (let s = 0; s < 4; s++) if (localOf(s) === li) return s; return li; }
const myFrame = () => teamOfSlot(online.S.slot);
const online = createOnline({
  getLook: () => playLook(),
  getConfig: () => ({ mode: settings.mode, bestOf: +settings.bestOf, target: +settings.target, public: settings.visibility === 'public' }),
  onRoomInfo: r => lobby.setRoom(r),
  botLook: s => ({ ...CPU_LOOKS[(+settings.diff + s) % 4] }),
  blip: () => { initAudio(); SFX.blip(); },
  openPrelobby,
  onRoster: players => {
    if (screen === 'menu') { roster = demoRoster(); buildViews(); }
    menu.refresh();
    const need = +(new URLSearchParams(location.search).get('need') || 2);
    if (DEBUG === 'bot' && online.S.isHost && players.length >= need && !online.S.inMatch) setTimeout(() => { if (!online.S.inMatch) online.start(); }, 600);
  },
  onStart: m => startOnline(m),
  onMessage: m => handleNet(m),
  onPlayerLeft: (slot, name) => {
    if (!G.online) return;
    const li = localOf(slot), c = G.chars[li];
    if (G.chars.length === 2) { onlineClosed(`${name} abandonó el partido.`); return; }
    if (c) { c.remote = false; c.ai = true; roster[li].ctrl = 'ai'; }
    banner('Jugador fuera', `${name} se fue: le sustituye la CPU`, '#ff5a6e');
  },
  onClosed: reason => onlineClosed(reason),
  onLeft: () => { if (screen === 'menu') { roster = demoRoster(); buildViews(); } },
});
function startOnline(m) {
  enterGame(); show('netTag', true);
  rematch = { me: false, them: new Set() };
  $('againBtn').classList.remove('waiting');
  const cfg = m.cfg, n = cfg.mode === '2v2' ? 4 : 2, g = online.S.slot;
  roster = [];
  for (let li = 0; li < n; li++) {
    const s = globalOf(li), p = m.players.find(x => x.slot === s) || { look: CPU_LOOKS[0], bot: true };
    roster[li] = { look: { ...DEFAULT_LOOK, ...(s === g ? playLook() : p.look) }, ctrl: s === g ? 'human' : p.bot && online.S.isHost ? 'ai' : 'remote', slot: s };
  }
  buildViews();
  newMatch(false, {
    online: true, mode: cfg.mode, bestOf: cfg.bestOf, target: cfg.target,
    firstServer: m.firstServer === myFrame() ? 0 : 1, ctrl: roster.map(p => p.ctrl), paddles: paddlesOf(), pads: padsOf(), boosts: boostsOf(),
  });
  if (DEBUG === 'bot') G.chars[0].ai = true;
  refreshHUD();
}
// Mensajes de juego: m.from = hueco del emisor · m.ft = equipo cuyo marco usa el mensaje
function handleNet(m) {
  if (!G.online || m.from === undefined) return;
  const li = localOf(m.from), rot = (m.ft ?? teamOfSlot(m.from)) !== myFrame();
  switch (m.t) {
    case 'st': setRemoteState(li, m, rot); break;
    case 'hit': applyRemoteHit(m, li, rot, (online.S.rtt / 2000) * C.TIME_SCALE); break;
    case 'pt': applyRemotePoint(m, rot); break;
    case 'emote': doEmote(li, m.id, true); break;
    case 'rematch': rematch.them.add(m.from); tryRematch(); break;
    case 'botify': banner('Jugador fuera', 'Le sustituye la CPU', '#ff5a6e'); break;
    case 'bye': if (G.chars.length === 2) onlineClosed(`${roster[li] ? roster[li].look.name : 'Tu rival'} abandonó el partido.`); break;
    default: break;
  }
}
function netSend(m, li = 0) { online.send({ ...m, from: globalOf(li), ft: myFrame() }); }
function onlineClosed(reason) {
  if (!G.online) return;
  banner('Desconectado', reason, '#ff5a6e');
  hint('');
  setTimeout(() => { if (G.online) { toMenu(); menu.go('online'); } }, 2200);
}
function tryRematch() {
  if (!rematch.me || !online.S.isHost) return;
  const humans = online.S.players.filter(p => !p.bot && p.slot !== 0).map(p => p.slot);
  if (humans.every(s => rematch.them.has(s))) { online.endMatch(); online.start(); }
}

// estado del giro en el vestidor (debe existir antes de crear el menú: onPane lo usa al iniciar)
const rot = { auto: true, yaw: 0, vel: 0, drag: false, lastX: 0 };
let menuApi = null;
const menu = createMenu({
  settings,
  onChange: applySettings,
  onPlay: () => openPrelobby('cpu'),
  blip: () => { initAudio(); SFX.blip(); },
  onLook: nameOnly => {
    applySettings(); if (!nameOnly) rebuildPlayer();
    // en una sala, el rival ve tus cambios al momento (sin lo que aún no has comprado)
    online.sendLook(playLook());
    refreshCoins();
  },
  onBuy: () => { SFX.coin(); refreshCoins(); toast('¡Comprado! Ya es tuyo', 'ok'); },
  deny: msg => { SFX.deny(); toast(msg, 'bad'); },
  onPane: id => {
    // al salir del vestidor se quita lo que solo te estabas probando
    if (menuPane === 'char' && id !== 'char' && menuApi && menuApi.stripLocked()) { menuApi.renderChar(); applySettings(); rebuildPlayer(); online.sendLook(playLook()); }
    menuPane = id; rot.auto = true; rot.vel = 0; $('menu').classList.toggle('posing', id === 'char');
    if (!menuApi) return;                       // primera llamada: aún se está creando el menú
    if (id === 'shop') workshop.render();
    if (id === 'online') lobby.start(); else lobby.stop();
  },
});
menuApi = menu;

// ---------- Taller, monedas y avisos ----------
function paddleChanged(nameOnly) {
  syncPaddleLook(); applySettings();
  if (!nameOnly) rebuildPlayer();
  online.sendLook(playLook()); refreshCoins();
}
const workshop = createWorkshop({
  blip: () => { initAudio(); SFX.blip(); },
  buySound: () => { initAudio(); SFX.coin(); },
  onPaddle: paddleChanged,
  onCoins: refreshCoins,
  deny: msg => { initAudio(); SFX.deny(); toast(msg, 'bad'); },
});
function refreshCoins() {
  $('coinCount').textContent = PR.coins; $('wsCoins').textContent = PR.coins;
  $('profileName').textContent = settings.look.name || 'Tú';
  const pad = PR.paddles[PR.active];
  $('navShop').textContent = `Frijolito nv. ${charLevel()} · ${pad.name}`;
}
let toastT = 0;
function toast(msg, kind = '') {
  const t = $('toast'); t.innerHTML = msg; t.className = 'show ' + kind;
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = kind; }, 2400);
}
$('coinChip').onclick = () => { SFX.blip(); menu.go('shop'); };

// ---------- Perfil ----------
let profileOpen = false, pendingJoin = null;
function openProfile(first) {
  profileOpen = true; show('profile', true);
  $('pfKicker').textContent = first ? 'Bienvenido al Torneo del Parque' : 'Tu perfil';
  $('pfTitle').textContent = first ? '¿Cómo te llamas?' : 'Tu perfil';
  show('pfText', first); show('pfClose', !first); show('pfStats', !first);
  $('pfName').value = first && settings.look.name === 'Tú' ? '' : settings.look.name;
  const s = PR.stats;
  $('pfStats').innerHTML = `<div><b>${s.played}</b><span>Partidos</span></div><div><b>${s.wins}</b><span>Victorias</span></div>` +
    `<div><b>${PR.earned}</b><span>Pongcoins ganadas</span></div><div><b>${charLevel()}</b><span>Nivel</span></div>`;
  $('pfGo').querySelector('span').textContent = first ? '¡A jugar!' : 'Guardar';
  setTimeout(() => $('pfName').focus(), 80);
}
function saveProfile() {
  const v = $('pfName').value.trim().slice(0, 10);
  if (!v) { $('pfName').classList.remove('shake'); void $('pfName').offsetWidth; $('pfName').classList.add('shake'); $('pfName').focus(); return; }
  const first = !PR.named;
  settings.look.name = v; setNamed(v); applySettings();
  profileOpen = false; show('profile', false);
  menu.refresh(); menu.renderChar(); refreshCoins(); rebuildPlayer(); online.sendLook(playLook());
  initAudio(); SFX.select();
  if (first) toast(`¡Hola, ${v.replace(/[<>&"]/g, '')}! Te regalamos ${coinHTML(PR.coins)} para tu primera compra`, 'ok');
  if (pendingJoin) { const code = pendingJoin; pendingJoin = null; menu.go('online'); online.join(code); }
}
function closeProfile() { if (!PR.named) return; profileOpen = false; show('profile', false); }
$('pfGo').onclick = saveProfile;
$('pfClose').onclick = closeProfile;
$('profileBtn').onclick = () => { SFX.blip(); openProfile(false); };

// ---------- Salas públicas ----------
const lobby = createLobby({
  onList: rooms => { pubRooms = rooms; renderPub(); },
  onState: s => { pubState = s; renderPub(); },
});
let pubRooms = [], pubState = 'search';
function renderPub() {
  const mine = online.S.code;
  const list = pubRooms.filter(r => r.code !== mine);
  const open = list.filter(r => !r.playing && r.n < r.max).length;
  $('pubState').textContent = pubState === 'error' ? 'Sin conexión' : pubState === 'search' ? 'Buscando…' : open ? `${open} disponible${open > 1 ? 's' : ''}` : 'Ninguna abierta';
  $('pubState').className = 'pub-state ' + pubState;
  $('pubList').innerHTML = list.length ? list.map(r => {
    const full = r.n >= r.max, busy = r.playing;
    return `<div class="pub-row${busy || full ? ' off' : ''}"><svg class="bean"><use href="#i-bean"/></svg>
      <div class="pub-info"><b>Sala de ${r.name.replace(/[<>&"]/g, '')}</b><span>${r.mode === '2v2' ? '2 contra 2' : '1 contra 1'} · ${r.bestOf > 1 ? 'mejor de ' + r.bestOf : 'un juego'} · a ${r.target}</span></div>
      <i class="pub-n">${r.n}/${r.max}</i>
      <button class="pub-join" data-code="${r.code}" ${busy || full ? 'disabled' : ''}>${busy ? 'En juego' : full ? 'Llena' : 'Unirse'}</button></div>`;
  }).join('') : `<p class="pub-empty">${pubState === 'ok' ? 'No hay salas públicas ahora mismo. Crea una y márcala como <b>Pública</b>.' : pubState === 'error' ? 'No se pudo contactar con el tablón de salas.' : 'Buscando salas…'}</p>`;
}
$('pubList').addEventListener('click', e => { const b = e.target.closest('.pub-join'); if (b && !b.disabled) online.join(b.dataset.code); });

// ---------- Cambio de estilo durante el partido ----------
function refreshPauseStyle() { $('pauseStyleTxt').textContent = 'Cambiar a ' + CONTROLS[settings.control === 'free' ? 'classic' : 'free'].name; }
function toggleStyle() {
  settings.control = settings.control === 'free' ? 'classic' : 'free';
  applySettings(); setControl(settings.control);
  renderControls(settings.control); $('controls').classList.toggle('off', !+settings.showControls);
  menu.refresh(); refreshPauseStyle(); hint('');
  const tag = $('camTag'); tag.textContent = 'Estilo: ' + CONTROLS[settings.control].name; tag.classList.add('on'); camTagTimer = 1.6;
  initAudio(); SFX.select();
}
$('pauseStyle').onclick = toggleStyle;

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
  rematch.me = true; netSend({ t: 'rematch' });
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
  $('name0').textContent = teamName(0) || 'Tú';
  $('name1').textContent = teamName(1) + (G.online ? '' : roster.length === 2 ? ' · ' + C.DIFFS[G.diff].name : '');
  $('target').textContent = G.bestOf > 1 ? `${G.games[0]}–${G.games[1]} · J${G.gameNo} · A ${G.target}` : 'A ' + G.target;
  const st = G.chars[G.server] ? G.chars[G.server].team : -1;
  $('srv0').classList.toggle('on', st === 0 && G.phase !== 'over');
  $('srv1').classList.toggle('on', st === 1 && G.phase !== 'over');
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

// ---------- Cuenta atrás y emotes ----------
function showCount(n) {
  const el = $('count');
  el.textContent = n > 0 ? n : '¡YA!';
  el.className = 'show' + (n === 0 ? ' go' : '');
  void el.offsetWidth; el.classList.add('anim');
  SFX.count(n);
}
const EMOTE_ICON = { dance: '♪ ♫', laugh: 'JA JA', taunt: '¡BAH!', cry: 'BUAA', love: '♥', angry: '#@%!' };
const bubbles = [];
function showEmote(i, id) {
  const el = document.createElement('div');
  el.className = 'emote-bubble e-' + id;
  el.textContent = EMOTE_ICON[id] || '!';
  $('pops').appendChild(el);
  bubbles.push({ i, el, t: 2.1 });
  SFX.emote(id);
}
function updateBubbles(dt) {
  for (let k = bubbles.length - 1; k >= 0; k--) {
    const b = bubbles[k]; b.t -= dt;
    const c = G.chars[b.i];
    if (b.t <= 0 || !c) { b.el.remove(); bubbles.splice(k, 1); continue; }
    const h = views[b.i] ? 1.55 * (views[b.i].look.height || 1) : 1.55;
    const s = toScreen(tmpV.set(c.x, h, c.z));
    b.el.style.left = s.x + 'px'; b.el.style.top = s.y + 'px';
    b.el.style.opacity = Math.min(1, b.t * 3);
  }
}

// ---------- Eventos del juego ----------
const COLS = [C.PALETTE.player, C.PALETTE.cpu];
let tutorialHits = 0;
onEvent((type, d) => {
  if (type === 'match') { fx.clearTrail(); refreshHUD(); tutorialHits = 0; return; }
  if (type === 'count') {
    if (G.demo) return;
    showCount(d.n);
    return;
  }
  if (type === 'game') {
    refreshHUD();
    if (!G.demo) banner(d.winner === 0 ? '¡Juego para ti!' : '¡Juego para ' + teamName(1) + '!', `Juegos ${d.games[0]}–${d.games[1]}`, d.winner === 0 ? '#4da8ff' : '#ff6b8b');
    return;
  }
  if (type === 'newgame') { refreshHUD(); if (!G.demo) setTimeout(() => banner(`Juego ${d.gameNo}`, `Juegos ${d.games[0]}–${d.games[1]}`, '#ffc93c'), 50); return; }
  if (type === 'emote') {
    showEmote(d.c, d.id);
    if (G.online && !d.net && G.chars[d.c] && !G.chars[d.c].remote) netSend({ t: 'emote', id: d.id }, d.c);
    return;
  }
  if (type === 'serve') {
    refreshHUD();
    if (G.demo) { hint(''); return; }
    const sc = G.chars[G.server];
    if (G.server === 0) {
      banner('Tu saque', free() ? 'Golpea la bola con la pala' : 'Haz clic para sacar', '#4da8ff');
      hint(free() ? 'Mueve la pala contra la bola con un <b>swing hacia arriba</b>'
        : 'Apunta en la mesa rival y <b>haz clic</b> para sacar');
    } else {
      const sn = G.server === 2 ? 'tu compañero' : (roster[G.server] ? roster[G.server].look.name : 'la CPU');
      banner(`Saca ${sn}`, sc.team === 0 ? 'Tu equipo saca' : 'Prepárate', sc.team === 0 ? '#4da8ff' : '#ff6b8b');
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
    if (G.online && !d.remote && G.chars[d.c] && !G.chars[d.c].remote) {
      netSend({ t: 'hit', b: ballSnapshot(), kind: G.ball.kind, rally: G.rally,
        meta: { type: d.type, smash: d.smash, power: d.power, q: d.q, grade: d.grade, serve: d.serve, side: d.side, bh: G.chars[d.c].backhand } }, d.c);
    }
    referee.onRally(G.rally);
    if (!G.demo && d.c === 0) tutorialHits++;
    if (!G.demo && d.team === 1 && tutorialHits < 3) hint(free() ? 'Lleva la pala al <b>anillo</b>: se pone verde cuando estás bien colocado'
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
    referee.onPoint(d.winner, G.rally);
    if (G.online && d.auth) netSend({ t: 'pt', w: d.winner, reason: d.reason, score: d.score, games: d.games });
    refreshHUD(); bump('s' + d.winner);
    const w = G.chars[d.winner === 0 ? 0 : 1];
    fx.confetti(tmpV.set(w.x, 1.4, w.z), d.winner === 0 ? 70 : 35);
    if (!G.demo) {
      const sub = d.winner === 0 ? (G.chars.length === 4 ? 'Punto para tu equipo' : 'Punto para ti') : `Punto para ${teamName(1)}`;
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
    $('overKicker').textContent = `Final · ${G.online ? 'Online' : 'CPU ' + C.DIFFS[G.diff].name} · ${G.chars.length === 4 ? '2 contra 2' : '1 contra 1'}${G.bestOf > 1 ? ' · juegos ' + G.games[0] + '–' + G.games[1] : ''}`;
    $('overTitle').textContent = won ? 'Victoria' : 'Derrota';
    $('overTitle').className = 'sheet-title ' + (won ? 'win' : 'lose');
    const fin = G.bestOf > 1 ? G.games : G.score;
    $('oS0').textContent = fin[0]; $('oS1').textContent = fin[1];
    $('overStats').innerHTML =
      `<div><b>${G.stats.longest}</b><span>Rally máx.</span></div>` +
      `<div><b>${G.stats.perfect[0]}</b><span>Perfectos</span></div>` +
      `<div><b>${G.stats.smash[0]}</b><span>Smashes</span></div>` +
      `<div><b>${G.stats.aces[0]}</b><span>Aces</span></div>`;
    // Pongcoins: solo para el ganador
    const reward = won ? matchReward({ online: G.online, diff: G.diff, target: G.target, bestOf: G.bestOf }) : 0;
    recordMatch(won, reward); refreshCoins();
    const rw = $('overReward'); rw.classList.remove('hidden');
    rw.className = 'reward ' + (won ? 'won' : 'lost');
    rw.innerHTML = won
      ? `<span class="rw-plus">+${reward}</span><svg><use href="#i-coin"/></svg><div><b>Pongcoins</b><span>Total: ${PR.coins} · gástalas en el vestidor y el Taller</span></div>`
      : `<svg><use href="#i-coin"/></svg><div><b>Sin Pongcoins esta vez</b><span>Solo gana monedas quien gana el partido · tienes ${PR.coins}</span></div>`;
    if (won) setTimeout(() => SFX.coin(), 600);
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
  if (profileOpen) { if (e.code === 'Enter') { e.preventDefault(); saveProfile(); } else if (e.code === 'Escape') closeProfile(); return; }
  if (settingsOpen) { if (e.code === 'Escape' || e.code === 'Enter') { e.preventDefault(); openSettings(false); } return; }
  if (e.target && e.target.tagName === 'INPUT') { if (e.code === 'Enter' || e.code === 'Escape') e.target.blur(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'KeyM') { toggleMute(); refreshMute(); return; }
  if (e.code === 'KeyH') { $('controls').classList.toggle('off'); return; }
  if (prelobbyOpen()) {
    if (e.code === 'Enter') prelobbyGo(); else if (e.code === 'Escape') show('prelobby', false);
    return;
  }
  if (screen === 'menu') {
    if (menuPane === 'online' && (e.code === 'Enter' || e.code === 'Space')) { if (online.S.active) online.start(); return; }
    menu.key(e.code); return;
  }
  if (e.code === 'Tab') { e.preventDefault(); if (G.phase !== 'over') toggleStyle(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (screen === 'game') setPause(true); else if (screen === 'pause') setPause(false); return; }
  if (screen !== 'game') return;
  if (G.phase === 'over') { if (e.code === 'Enter') again(); else if (e.code === 'Escape') toMenu(); return; }
  // Emotes: teclas 1–6
  const em = /^Digit([1-6])$/.exec(e.code);
  if (em) { doEmote(0, C.EMOTES[+em[1] - 1].id); return; }
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
        const R = freeR(c);
        const rpx = Math.abs(toScreen(tmpV.set(r.x + R, r.y, r.z)).x - s.x);
        const d = Math.hypot(r.x - h.x, r.y - h.y);
        const good = d < R * 0.55, ok = d < R;
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
      const reach = Math.abs(r.x - c.x) <= C.REACH * c.boost.reach;
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
const fadeO = [1, 1, 1, 1];
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
  for (const c of G.chars) c.focus = G.phase === 'rally' && b.live && b.lastHitter === 1 - c.team;
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
    views.forEach((v, i) => { if (i > 0 && v && G.chars[i]) v.sync(G.chars[i], 0, ballPos, time); });
  } else views.forEach((v, i) => { if (v && G.chars[i]) v.sync(G.chars[i], gdt, ballPos, time); });
  updateBubbles(dt);
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
  // Semitransparencia: tu frijolito (y tu compañero) se vuelven translúcidos si la bola pasa cerca o detrás
  for (const i of [0, 2]) {
    const v = views[i], c = G.chars[i];
    if (!v || !c || screen === 'menu') { if (v) v.setOpacity(1); continue; }
    let o = 1;
    if (b.live && G.phase !== 'serve') {
      const d3 = Math.hypot(b.x - c.x, b.y - 0.8, b.z - c.z);
      const behind = (b.z - c.z) * c.sign < 0.2 && Math.abs(b.x - c.x) < 0.75 && b.z * c.sign > 0;
      if (d3 < 1.25 || behind) o = 0.32;
    }
    fadeO[i] += (o - fadeO[i]) * Math.min(1, dt * 10);
    v.setOpacity(Math.round(fadeO[i] * 20) / 20);
  }
  fx.update(dt, camera, time);
  arena.update(time, dt, ballPos);
  referee.update(gdt || (screen === 'menu' ? dt : 0), time, ballPos);

  // Online: mi estado al rival 20 veces por segundo + indicador de ping
  if (G.online && screen !== 'menu') {
    stTimer -= dt;
    if (stTimer <= 0) {
      stTimer = 0.05;
      // envío el estado de los jugadores que controla esta máquina (yo y, si soy anfitrión, los bots)
      G.chars.forEach((c, i) => { if (!c.remote && (i === 0 || c.ai)) netSend(localState(i), i); });
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
roster = demoRoster(); buildViews();
newMatch(true);
updateCamera(1);
requestAnimationFrame(frame);
// Fin de la pantalla de carga: tras el primer frame, con las fuentes listas y un mínimo para lucir la animación
(async () => {
  try { await document.fonts.ready; } catch (e) { /* sin API de fuentes */ }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  clearInterval(window.__pppProg);
  const fill = document.getElementById('ldFill'); if (fill) fill.style.width = '100%';
  const wait = Math.max(400, 2200 - (Date.now() - (window.__pppT0 || 0)));
  setTimeout(() => {
    const ld = document.getElementById('loader'); if (!ld) return;
    ld.classList.add('done'); clearInterval(window.__pppTips);
    setTimeout(() => ld.remove(), 800);
    if (!PR.named && !DEBUG) openProfile(true);
  }, wait);
})();
// Hook de depuración/pruebas:  ?debug=play  → partida con la CPU controlando al jugador
window.__ppp = { G, scene, camera, views, THREE, startGame, toMenu, online, referee, PR, lobby, toggleStyle, settings, update };
refreshCoins();
// Enlace de invitación: ?sala=CÓDIGO entra directamente en la sala
const salaParam = new URLSearchParams(location.search).get('sala');
if (salaParam) { if (PR.named || DEBUG) { menu.go('online'); online.join(salaParam); } else pendingJoin = salaParam; }
if (DEBUG === 'bot' && new URLSearchParams(location.search).get('host')) { const pm = new URLSearchParams(location.search).get('mode'); if (pm) settings.mode = pm; menu.go('online'); online.host(); }
if (DEBUG === 'play') {
  startGame(); G.chars[0].ai = true;
  const zq = new URLSearchParams(location.search).get('zoom');
  if (zq !== null) { camZoom = +zq; for (let i = 0; i < 40; i++) updateCamera(0.1); }
  const ff = +new URLSearchParams(location.search).get('ff') || 0;   // avance rápido (s)
  for (let i = 0; i < ff * 60; i++) update(C.TIME_SCALE / 60);
  // para captura: espera a que la bola esté en vuelo
  for (let i = 0; ff && i < 600 && !(G.phase === 'rally' && G.ball.lastHitter === 1 && G.ball.z > -0.3); i++) update(C.TIME_SCALE / 60);
}

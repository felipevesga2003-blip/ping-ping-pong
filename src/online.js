// =============================================================
//  ONLINE — sala, huecos (1v1 / 2v2), lista de jugadores, reenvío y ping
//  Huecos globales: 0 = anfitrión (equipo A) · 1 = equipo B · 2 = equipo A · 3 = equipo B
//  El anfitrión rellena los huecos libres con bots de CPU que él mismo controla.
// =============================================================
import { createNet, cleanCode } from './net.js';
import { stageById } from './stages.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// cb: { getLook(), getConfig(), onRoster(players), onStart(start), onMessage(m), onPlayerLeft(slot),
//       onClosed(reason), onLeft(), blip(), botLook(slot) }
export function createOnline(cb) {
  const S = { active: false, isHost: false, connected: false, slot: 0, cfg: null, players: [], rtt: 0, code: '', pingTimer: 0, inMatch: false };
  const rtts = new Map();
  const peerSlot = new Map();         // (anfitrión) id de conexión → hueco

  const net = createNet({
    onStatus: (state, info) => {
      if (state === 'creating') status('Creando sala…', 'wait');
      if (state === 'joining') { setCode(info); status(`Conectando con la sala ${info}…`, 'wait'); }
      if (state === 'waiting') { setCode(info); status(waitingText(), 'wait'); announce(); }
    },
    onPeerOpen: id => {
      if (!S.isHost) { S.connected = true; net.send({ t: 'hello', look: cb.getLook() }); status('¡Conectado! Entrando en la sala…', 'wait'); }
      startPing();
    },
    onData: (id, m) => handle(id, m),
    onPeerClose: id => {
      if (!S.isHost) {                                   // se fue el anfitrión
        const was = S.connected; reset();
        if (was) { status('El anfitrión cerró la sala.', 'err'); cb.onClosed('El anfitrión cerró la sala.'); }
        renderRoom(); cb.onLeft();
        return;
      }
      const slot = peerSlot.get(id); peerSlot.delete(id); rtts.delete(id);
      if (slot === undefined) return;
      const p = S.players.find(x => x.slot === slot);
      if (S.inMatch) {                                   // en partido: un bot toma su lugar
        if (p) { p.bot = true; p.peer = null; p.look = { ...p.look, name: p.look.name + ' (CPU)' }; }
        net.send({ t: 'botify', slot });
        cb.onPlayerLeft(slot, p ? p.look.name : 'Un jugador');
      } else S.players = S.players.filter(x => x.slot !== slot);
      broadcastRoster();
    },
    onError: text => status(text, 'err'),
  });

  // ---------- Mensajes ----------
  function handle(id, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') { net.send({ t: 'pong', ts: m.ts }, id); return; }
    if (m.t === 'pong') { const r = performance.now() - m.ts; const o = rtts.get(id) || r; rtts.set(id, o * 0.7 + r * 0.3); S.rtt = Math.max(...rtts.values()); return; }
    if (S.isHost) {
      if (m.t === 'hello') return admit(id, m.look);
      const slot = peerSlot.get(id); if (slot === undefined) return;
      if (m.t === 'look') { const p = S.players.find(x => x.slot === slot); if (p) p.look = m.look; broadcastRoster(); return; }
      m.from = slot;                                     // el anfitrión sella el remitente
      net.send(m, undefined, id);                        // reenvío al resto
      cb.onMessage(m);
      return;
    }
    switch (m.t) {
      case 'welcome': S.slot = m.slot; S.cfg = m.cfg; S.players = m.players; status(guestText(), 'ok'); renderRoom(); cb.onRoster(S.players); return;
      case 'roster': S.players = m.players; S.cfg = m.cfg; renderRoom(); cb.onRoster(S.players); return;
      case 'full': status('Esa sala ya está llena.', 'err'); return;
      case 'start': S.inMatch = true; S.players = m.players; cb.onStart(m); return;
      default: cb.onMessage(m);
    }
  }

  function freeSlots() {
    const order = S.cfg.mode === '2v2' ? [1, 2, 3] : [1];
    return order.filter(s => !S.players.some(p => p.slot === s && !p.bot));
  }
  function admit(id, look) {
    const free = freeSlots();
    if (!free.length || S.inMatch) { net.send({ t: 'full' }, id); net.kick(id); return; }
    const slot = free[0];
    S.players = S.players.filter(p => p.slot !== slot);
    S.players.push({ slot, look, peer: id });
    peerSlot.set(id, slot);
    net.send({ t: 'welcome', slot, cfg: S.cfg, players: pub() }, id);
    broadcastRoster();
    cb.blip();
  }
  const pub = () => S.players.map(({ slot, look, bot }) => ({ slot, look, bot: !!bot })).sort((a, b) => a.slot - b.slot);
  function broadcastRoster() {
    if (!S.isHost) return;
    net.send({ t: 'roster', players: pub(), cfg: S.cfg });
    renderRoom(); cb.onRoster(pub());
    if (S.active) status(waitingText(), freeSlots().length ? 'wait' : 'ok');
    announce();
  }
  // sala pública: se anuncia en el directorio (nombre, modo, plazas, si está jugando)
  function pubInfo() {
    if (!S.active || !S.isHost || !S.cfg || !S.cfg.public || !S.code) return null;
    const h = S.players.find(p => p.slot === 0);
    return { code: S.code, name: h ? h.look.name : 'Sala', mode: S.cfg.mode, n: S.players.filter(p => !p.bot).length, max: need(), bestOf: S.cfg.bestOf, target: S.cfg.target, playing: S.inMatch };
  }
  function announce() { if (cb.onRoomInfo) cb.onRoomInfo(pubInfo()); }
  function startPing() {
    clearInterval(S.pingTimer);
    S.pingTimer = setInterval(() => net.send({ t: 'ping', ts: performance.now() }), 1500);
  }

  // ---------- UI de la sala ----------
  const need = () => (S.cfg && S.cfg.mode === '2v2' ? 4 : 2);
  function waitingText() {
    const humans = S.players.length, n = need();
    if (humans >= n) return '¡Sala completa! Pulsa Empezar cuando estéis listos.';
    if (humans > 1) return `Faltan ${n - humans} · puedes empezar ya: los huecos libres los ocupa la CPU`;
    return 'Esperando jugadores · comparte el código o el enlace';
  }
  const guestText = () => 'Dentro de la sala. Esperando a que el anfitrión empiece…';
  function status(text, kind) {
    const box = $('roomStatusBox');
    $('roomStatus').textContent = text;
    box.classList.toggle('err', kind === 'err'); box.classList.toggle('ok', kind === 'ok');
    const pill = $('netPill');
    const on = S.isHost ? S.players.length > 1 : S.connected;
    pill.className = 'net-pill ' + (kind === 'err' ? 'err' : on ? 'on' : S.active ? 'wait' : '');
    pill.querySelector('b').textContent = kind === 'err' ? 'Error' : on ? 'Conectado' : S.active ? 'Esperando' : 'Sin conexión';
    $('navOnline').textContent = S.active ? `Sala ${S.code || '…'} · ${S.players.length}/${need()}` : 'Juega contra tus amigos';
  }
  function setCode(code) { S.code = code; $('roomCode').textContent = code; }
  function showRoom(on) {
    $('onChoose').classList.toggle('hidden', on);
    $('onRoom').classList.toggle('hidden', !on);
    $('roomCodeBox').querySelector('.room-actions').classList.toggle('hidden', !S.isHost);
    $('onlineStart').hidden = !S.isHost;
    renderRoom();
  }
  function renderRoom() {
    const box = $('roomVs');
    if (!S.active || !S.cfg) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const slotCard = s => {
      const p = S.players.find(x => x.slot === s);
      const me = s === S.slot;
      if (!p) return `<div class="rslot empty"><i class="bean-ph"></i><b>Libre</b><span>${S.isHost ? 'CPU si empiezas ya' : 'Esperando…'}</span></div>`;
      const tag = me ? 'Tú' : s === 0 ? 'Anfitrión' : p.bot ? 'CPU' : 'Jugador';
      return `<div class="rslot${me ? ' me' : ''}"><svg class="bean" style="color:${esc(p.look.skin)}"><use href="#i-bean"/></svg><b>${esc(p.look.name)}</b><span>${tag}</span></div>`;
    };
    const two = S.cfg.mode === '2v2';
    box.innerHTML = `<div class="rteam a"><h5>Equipo A</h5>${slotCard(0)}${two ? slotCard(2) : ''}</div>
      <div class="vs-badge">VS</div>
      <div class="rteam b"><h5>Equipo B</h5>${slotCard(1)}${two ? slotCard(3) : ''}</div>`;
    $('roomMode').textContent = `${S.cfg.public ? 'Pública' : 'Privada'} · ${two ? '2 contra 2' : '1 contra 1'} · ${S.cfg.bestOf > 1 ? 'al mejor de ' + S.cfg.bestOf : 'un juego'} · a ${S.cfg.target} · ${stageById(S.cfg.stage).name}${S.cfg.realism === 'real' ? ' · Realista' : ''}`;
  }
  function reset() {
    clearInterval(S.pingTimer);
    S.connected = false; S.rtt = 0; S.inMatch = false;
    rtts.clear(); peerSlot.clear();
  }
  function copy(text, btn) {
    const done = () => { const t = btn.textContent; btn.textContent = '¡Copiado!'; btn.classList.add('done'); setTimeout(() => { btn.textContent = t; btn.classList.remove('done'); }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  }
  const shareLink = () => `${location.origin}${location.pathname}?sala=${S.code}`;

  // ---------- Acciones ----------
  function host() {
    S.active = true; S.isHost = true; S.slot = 0; S.cfg = cb.getConfig();
    S.players = [{ slot: 0, look: cb.getLook(), peer: null }];
    showRoom(true); cb.blip();
    net.host().catch(e => status(e.message, 'err'));
  }
  function join(code) {
    code = cleanCode(code);
    if (code.length !== 5) { $('joinCode').focus(); $('joinCode').classList.add('shake'); setTimeout(() => $('joinCode').classList.remove('shake'), 400); return; }
    S.active = true; S.isHost = false; S.cfg = null; S.players = [];
    showRoom(true); cb.blip();
    net.join(code).catch(e => status(e.message, 'err'));
  }
  function leave() {
    net.leave(); reset();
    S.active = false; S.isHost = false; S.code = ''; S.players = []; S.cfg = null;
    showRoom(false); status('', '');
    if (cb.onRoomInfo) cb.onRoomInfo(null);
    cb.onLeft();
  }
  function start() {
    if (!S.isHost || S.players.length < 2) return;
    const slots = S.cfg.mode === '2v2' ? [0, 1, 2, 3] : [0, 1];
    for (const s of slots) if (!S.players.some(p => p.slot === s)) S.players.push({ slot: s, look: cb.botLook(s), bot: true, peer: null });
    S.inMatch = true; announce();
    const msg = { t: 'start', cfg: S.cfg, players: pub(), firstServer: Math.random() < 0.5 ? 0 : 1 };
    net.send(msg);
    cb.onStart(msg);
  }
  function endMatch() {                     // de vuelta a la sala: quitar bots
    S.inMatch = false;
    if (S.isHost) { S.players = S.players.filter(p => !p.bot); broadcastRoster(); }
  }

  $('hostBtn').addEventListener('click', () => cb.openPrelobby('online'));
  $('joinBtn').addEventListener('click', () => join($('joinCode').value));
  $('joinCode').addEventListener('input', e => { e.target.value = cleanCode(e.target.value); });
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') join(e.target.value); });
  $('leaveRoom').addEventListener('click', () => { leave(); cb.blip(); });
  $('onlineStart').addEventListener('click', start);
  $('copyCode').addEventListener('click', e => copy(S.code, e.currentTarget));
  $('copyLink').addEventListener('click', e => copy(shareLink(), e.currentTarget));

  return {
    S, host, join, leave, start, endMatch,
    // mensajes de juego: el anfitrión los difunde; el invitado se los manda al anfitrión
    send: m => { m.from = m.from ?? S.slot; net.send(m); },
    sendLook: look => { if (!S.active) return; if (S.isHost) { const p = S.players.find(x => x.slot === 0); if (p) p.look = look; broadcastRoster(); } else net.send({ t: 'look', look }); },
    get playing() { return S.active && S.players.length > 1; },
  };
}

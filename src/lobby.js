// =============================================================
//  SALAS PÚBLICAS — directorio sin servidor propio
//  El primer navegador que reclama el ID fijo del "tablón" en PeerJS
//  hace de directorio: los anfitriones de salas públicas se registran
//  en él y quien busca partida recibe la lista. Si el directorio se va,
//  cualquier otro reclama el ID y los anfitriones se vuelven a registrar.
// =============================================================
import { loadPeer, PREFIX } from './net.js';

const LOBBY_ID = PREFIX + 'lobby-directorio';

// h: { onList(rooms), onState('search'|'ok'|'error') }
export function createLobby(h) {
  let peer = null, conn = null, isDir = false, want = false, room = null, retryT = 0, openT = 0, gen = 0, lastSeen = 0;
  const seen = new Map();           // (directorio) id → última renovación de su sala
  // Latido: si alguien cierra el navegador de golpe, WebRTC tarda en enterarse.
  //  · el directorio reenvía la lista cada 4 s y caduca salas sin renovar en 12 s
  //  · los clientes renuevan su sala cada 4 s y, si el directorio calla 10 s, lo reclaman
  setInterval(() => {
    if (!peer) return;
    const now = Date.now();
    if (isDir) {
      for (const [id, t] of seen) if (now - t > 12000) { seen.delete(id); rooms.delete(id); }
      dirBroadcast();
    } else if (conn && conn.open) {
      if (room) conn.send({ t: 'reg', room });
      if (now - lastSeen > 10000) restart(0);
    }
  }, 4000);
  const rooms = new Map();          // (directorio) id de conexión → sala
  const subs = new Map();           // (directorio) id → conexión

  const listDir = () => [...rooms.values()];
  function dirBroadcast() {
    const l = listDir(); h.onList(l);
    for (const c of subs.values()) if (c.open) c.send({ t: 'list', rooms: l });
  }

  async function start() {
    want = true;
    if (peer) return;
    let Peer; try { Peer = await loadPeer(); } catch (e) { h.onState('error'); return; }
    if (!want || peer) return;
    claim(Peer);
  }

  // intento ser el directorio
  function claim(Peer) {
    const my = ++gen;
    h.onState('search');
    const p = new Peer(LOBBY_ID, { debug: 0 }); peer = p;
    p.on('open', () => {
      if (my !== gen) return;
      isDir = true; rooms.clear(); if (room) rooms.set('self', room);
      h.onState('ok'); dirBroadcast();
    });
    p.on('connection', c => {
      c.on('open', () => { subs.set(c.peer, c); c.send({ t: 'list', rooms: listDir() }); });
      c.on('data', m => {
        if (!m || typeof m !== 'object') return;
        if (m.t === 'reg' && m.room && typeof m.room.code === 'string') { const fresh = !rooms.has(c.peer); rooms.set(c.peer, sanitize(m.room)); seen.set(c.peer, Date.now()); if (fresh || m.changed) dirBroadcast(); }
        else if (m.t === 'unreg') { seen.delete(c.peer); if (rooms.delete(c.peer)) dirBroadcast(); }
      });
      const gone = () => { subs.delete(c.peer); if (rooms.delete(c.peer)) dirBroadcast(); };
      c.on('close', gone); c.on('error', gone);
    });
    p.on('error', e => {
      if (my !== gen) return;
      if (e.type === 'unavailable-id') { killPeer(); asClient(Peer); return; }   // ya hay directorio: me conecto
      if (e.type === 'peer-unavailable') return;
      h.onState('error'); restart(4000);
    });
    p.on('disconnected', () => { if (my === gen && !p.destroyed) p.reconnect(); });
  }

  // me conecto al directorio existente
  function asClient(Peer) {
    const my = ++gen;
    const p = new Peer(undefined, { debug: 0 }); peer = p;
    p.on('open', () => {
      if (my !== gen) return;
      const c = p.connect(LOBBY_ID, { reliable: true, serialization: 'json' }); conn = c;
      clearTimeout(openT); openT = setTimeout(() => { if (my === gen && !(conn && conn.open)) restart(); }, 9000);
      c.on('open', () => { clearTimeout(openT); lastSeen = Date.now(); h.onState('ok'); if (room) c.send({ t: 'reg', room }); });
      c.on('data', m => { lastSeen = Date.now(); if (m && m.t === 'list' && Array.isArray(m.rooms)) h.onList(m.rooms.map(sanitize)); });
      const gone = () => { if (conn !== c) return; conn = null; restart(); };   // el directorio se fue → alguien lo reclamará
      c.on('close', gone); c.on('error', gone);
    });
    p.on('error', e => {
      if (my !== gen) return;
      if (e.type === 'peer-unavailable') { restart(); return; }     // el directorio ya no existe: lo reclamo
      h.onState('error'); restart(4000);
    });
  }

  function sanitize(r) {
    return { code: String(r.code).slice(0, 5), name: String(r.name || 'Sala').slice(0, 14), mode: r.mode === '2v2' ? '2v2' : '1v1',
      n: Math.max(1, Math.min(4, +r.n || 1)), max: Math.max(2, Math.min(4, +r.max || 2)), bestOf: +r.bestOf || 1, target: +r.target || 11, playing: !!r.playing };
  }
  function killPeer() {
    clearTimeout(openT);
    try { conn && conn.close(); } catch (e) { /* */ }
    try { peer && peer.destroy(); } catch (e) { /* */ }
    peer = null; conn = null; isDir = false; rooms.clear(); subs.clear(); seen.clear();
    h.onList([]);
  }
  function restart(delay) {
    killPeer(); gen++;
    clearTimeout(retryT);
    if (!want) return;
    retryT = setTimeout(() => { if (want && !peer) start(); }, delay ?? 300 + Math.random() * 1400);
  }

  // sala pública propia (null = ninguna)
  function setRoom(r) {
    room = r ? sanitize(r) : null;
    if (room) want = true;
    if (isDir) { if (room) rooms.set('self', room); else rooms.delete('self'); dirBroadcast(); }
    else if (conn && conn.open) conn.send(room ? { t: 'reg', room, changed: true } : { t: 'unreg' });
    if (room && !peer) start();
  }
  function stop() {
    if (room) return;                // si tengo una sala pública, sigo anunciándola
    want = false; clearTimeout(retryT); killPeer(); gen++;
  }
  return { start, stop, setRoom, get isDirectory() { return isDir; } };
}

// =============================================================
//  RED — conexión P2P con WebRTC (PeerJS), topología en estrella
//  El anfitrión acepta varias conexiones (2v2) y reenvía mensajes;
//  cada invitado solo habla con el anfitrión.
// =============================================================
const PREFIX = 'pingpingpong-v1-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O/1/I para dictarlo sin errores

export const makeCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
export const cleanCode = s => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

let peerLib = null;
function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerLib) return peerLib;
  peerLib = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/peerjs.min.js';
    s.onload = () => res(window.Peer);
    s.onerror = () => { peerLib = null; rej(new Error('No se pudo cargar el módulo de red')); };
    document.head.appendChild(s);
  });
  return peerLib;
}

function errorText(e) {
  switch (e && e.type) {
    case 'peer-unavailable': return 'No hay ninguna sala con ese código.';
    case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
      return 'No se pudo contactar con el servidor de salas. Revisa tu conexión a internet.';
    case 'browser-incompatible': return 'Tu navegador no soporta juego online (WebRTC).';
    case 'webrtc': return 'La conexión directa falló (red muy restrictiva).';
    default: return 'Error de conexión' + (e && e.type ? ` (${e.type})` : '') + '.';
  }
}

// h: { onStatus(state, info), onPeerOpen(id), onData(id, msg), onPeerClose(id), onError(text) }
export function createNet(h) {
  let peer = null, joinTimer = 0, closing = false;
  const conns = new Map();          // id → DataConnection

  function attach(c, id) {
    c.on('open', () => { conns.set(id, c); clearTimeout(joinTimer); h.onPeerOpen(id); });
    c.on('data', d => h.onData(id, d));
    const gone = () => { if (!conns.has(id)) return; conns.delete(id); if (!closing) h.onPeerClose(id); };
    c.on('close', gone);
    c.on('error', gone);
  }

  async function host(tries = 0) {
    leave();
    closing = false;
    h.onStatus('creating');
    const Peer = await loadPeer();
    const code = makeCode();
    peer = new Peer(PREFIX + code, { debug: 0 });
    peer.on('open', () => h.onStatus('waiting', code));
    peer.on('connection', c => attach(c, c.peer));
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && tries < 3) { host(tries + 1); return; }
      if (e.type === 'peer-unavailable') return;          // un invitado que se fue
      h.onError(errorText(e));
    });
    peer.on('disconnected', () => { if (!closing && peer && !peer.destroyed) peer.reconnect(); });
  }

  async function join(code) {
    leave();
    closing = false;
    h.onStatus('joining', code);
    const Peer = await loadPeer();
    peer = new Peer(undefined, { debug: 0 });
    peer.on('open', () => {
      attach(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }), 'host');
      joinTimer = setTimeout(() => { if (!conns.size) h.onError('La sala no responde. Comprueba el código.'); }, 15000);
    });
    peer.on('error', e => h.onError(errorText(e)));
  }

  // to: id concreto; except: no enviar a ese id (reenvíos); sin "to" = a todos
  function send(m, to, except) {
    if (to) { const c = conns.get(to); if (c && c.open) c.send(m); return; }
    for (const [id, c] of conns) if (id !== except && c.open) c.send(m);
  }
  function kick(id) { const c = conns.get(id); if (c) { conns.delete(id); setTimeout(() => { try { c.close(); } catch (e) { /* */ } }, 300); } }
  function leave() {
    closing = true;
    clearTimeout(joinTimer);
    for (const c of conns.values()) { try { c.close(); } catch (e) { /* ya cerrada */ } }
    conns.clear();
    try { peer && peer.destroy(); } catch (e) { /* ya destruido */ }
    peer = null;
  }
  return { host, join, send, kick, leave, get count() { return conns.size; } };
}

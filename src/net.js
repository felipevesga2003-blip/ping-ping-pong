// =============================================================
//  RED — conexión P2P con WebRTC (PeerJS)
//  El anfitrión crea una sala con un código; el invitado se une con él.
//  PeerJS aporta la señalización gratuita + STUN/TURN públicos.
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

// handlers: { onStatus(state, info), onOpen(), onMessage(msg), onClose(reason), onError(text) }
export function createNet(h) {
  let peer = null, conn = null, joinTimer = 0, closing = false;

  function attach(c) {
    conn = c;
    c.on('open', () => { clearTimeout(joinTimer); h.onOpen(); });
    c.on('data', d => h.onMessage(d));
    c.on('close', () => { if (!closing) h.onClose('Tu rival se desconectó.'); conn = null; });
    c.on('error', () => { if (!closing) h.onClose('Se perdió la conexión con tu rival.'); });
  }

  async function host(tries = 0) {
    leave();
    closing = false;
    h.onStatus('creating');
    const Peer = await loadPeer();
    const code = makeCode();
    peer = new Peer(PREFIX + code, { debug: 0 });
    peer.on('open', () => h.onStatus('waiting', code));
    peer.on('connection', c => {
      if (conn) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); }); return; }
      attach(c);
    });
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && tries < 3) { host(tries + 1); return; }
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
      attach(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
      joinTimer = setTimeout(() => { if (!conn || !conn.open) h.onError('La sala no responde. Comprueba el código.'); }, 15000);
    });
    peer.on('error', e => h.onError(errorText(e)));
  }

  function send(m) { if (conn && conn.open) conn.send(m); }
  function leave() {
    closing = true;
    clearTimeout(joinTimer);
    try { conn && conn.close(); } catch (e) { /* ya cerrada */ }
    try { peer && peer.destroy(); } catch (e) { /* ya destruido */ }
    conn = null; peer = null;
  }
  return { host, join, send, leave, get open() { return !!(conn && conn.open); } };
}

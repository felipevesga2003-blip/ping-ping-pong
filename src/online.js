// =============================================================
//  ONLINE — sala de espera, código, saludo entre jugadores y ping
// =============================================================
import { createNet, cleanCode } from './net.js';

const $ = id => document.getElementById(id);

// cb: { getHello(), getTarget(), onReady(remoteHello), onStart({firstServer,target}), onMessage(m), onClosed(reason, wasPlaying), blip() }
export function createOnline(cb) {
  const S = { active: false, isHost: false, connected: false, remote: null, rtt: 0, code: '', pingTimer: 0 };

  const net = createNet({
    onStatus: (state, info) => {
      if (state === 'creating') status('Creando sala…', 'wait');
      if (state === 'joining') { setCode(info); status(`Conectando con la sala ${info}…`, 'wait'); }
      if (state === 'waiting') { setCode(info); status('Esperando a tu rival · comparte el código o el enlace', 'wait'); }
    },
    onOpen: () => {
      S.connected = true;
      net.send({ t: 'hello', ...cb.getHello() });
      status('¡Conectado! Saludando…', 'wait');
      clearInterval(S.pingTimer);
      S.pingTimer = setInterval(() => net.send({ t: 'ping', ts: performance.now() }), 1500);
    },
    onMessage: m => handle(m),
    onClose: reason => {
      const was = S.connected;
      reset();
      if (was) { cb.onClosed(reason); status(reason, 'err'); }
    },
    onError: text => { status(text, 'err'); },
  });

  function handle(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'hello':
        S.remote = m;
        showVs();
        status(S.isHost ? '¡Rival conectado! Pulsa Empezar cuando estéis listos.' : '¡Conectado! Esperando a que el anfitrión empiece…', 'ok');
        $('onlineStart').hidden = !S.isHost;
        cb.onReady(m);
        return;
      case 'full': status('Esa sala ya está llena.', 'err'); return;
      case 'ping': net.send({ t: 'pong', ts: m.ts }); return;
      case 'pong': S.rtt = S.rtt ? S.rtt * 0.7 + (performance.now() - m.ts) * 0.3 : performance.now() - m.ts; return;
      case 'start': cb.onStart({ firstServer: 1 - m.firstServer, target: m.target }); return;
      default: cb.onMessage(m);
    }
  }

  // ---------- UI ----------
  function status(text, kind) {
    const box = $('roomStatusBox');
    $('roomStatus').textContent = text;
    box.classList.toggle('err', kind === 'err'); box.classList.toggle('ok', kind === 'ok');
    const pill = $('netPill');
    pill.className = 'net-pill ' + (kind === 'err' ? 'err' : S.connected ? 'on' : S.active ? 'wait' : '');
    pill.querySelector('b').textContent = kind === 'err' ? 'Error' : S.connected ? 'Conectado' : S.active ? 'Esperando' : 'Sin conexión';
    $('navOnline').textContent = S.connected && S.remote ? `Conectado con ${S.remote.look.name}` : S.active ? `Sala ${S.code || '…'}` : 'Juega contra un amigo';
  }
  function setCode(code) { S.code = code; $('roomCode').textContent = code; }
  function showRoom(on) {
    $('onChoose').classList.toggle('hidden', on);
    $('onRoom').classList.toggle('hidden', !on);
    $('roomCodeBox').querySelector('.room-actions').classList.toggle('hidden', !S.isHost);
    $('roomVs').classList.add('hidden');
    $('onlineStart').hidden = true;
  }
  function showVs() {
    const me = cb.getHello().look, them = S.remote.look;
    $('rvName0').textContent = me.name; $('rvBean0').style.color = me.skin;
    $('rvName1').textContent = them.name; $('rvBean1').style.color = them.skin;
    $('roomVs').classList.remove('hidden');
  }
  function reset() {
    clearInterval(S.pingTimer);
    S.connected = false; S.remote = null; S.rtt = 0;
  }
  function copy(text, btn) {
    const done = () => { const t = btn.textContent; btn.textContent = '¡Copiado!'; btn.classList.add('done'); setTimeout(() => { btn.textContent = t; btn.classList.remove('done'); }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  }
  const shareLink = () => `${location.origin}${location.pathname}?sala=${S.code}`;

  function host() {
    S.active = true; S.isHost = true; showRoom(true); cb.blip();
    net.host().catch(e => status(e.message, 'err'));
  }
  function join(code) {
    code = cleanCode(code);
    if (code.length !== 5) { $('joinCode').focus(); $('joinCode').classList.add('shake'); setTimeout(() => $('joinCode').classList.remove('shake'), 400); return; }
    S.active = true; S.isHost = false; showRoom(true); cb.blip();
    net.join(code).catch(e => status(e.message, 'err'));
  }
  function leave() {
    net.leave(); reset();
    S.active = false; S.isHost = false; S.code = '';
    showRoom(false); status('', '');
  }
  function start() {
    if (!S.isHost || !S.connected || !S.remote) return;
    const firstServer = Math.random() < 0.5 ? 0 : 1, target = cb.getTarget();
    net.send({ t: 'start', firstServer, target });
    cb.onStart({ firstServer, target });
  }

  $('hostBtn').addEventListener('click', host);
  $('joinBtn').addEventListener('click', () => join($('joinCode').value));
  $('joinCode').addEventListener('input', e => { e.target.value = cleanCode(e.target.value); });
  $('joinCode').addEventListener('keydown', e => { if (e.key === 'Enter') join(e.target.value); });
  $('leaveRoom').addEventListener('click', () => { leave(); cb.blip(); });
  $('onlineStart').addEventListener('click', start);
  $('copyCode').addEventListener('click', e => copy(S.code, e.currentTarget));
  $('copyLink').addEventListener('click', e => copy(shareLink(), e.currentTarget));

  return {
    S, host, join, leave, start,
    send: m => net.send(m),
    get playing() { return S.connected && !!S.remote; },
  };
}

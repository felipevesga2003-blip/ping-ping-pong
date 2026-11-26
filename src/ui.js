// =============================================================
//  Interfaz: menú principal, selectores, ayuda, panel de controles
// =============================================================
import { DIFFS } from './config.js';
import { P, PRICE, isOwned, lockedIn, sanitizeLook, buyOutfit, buyPieces } from './progress.js';
import { coinHTML } from './workshop.js';
import { SKINS, SHIRT_COLORS, PANTS_COLORS, PADDLE_COLORS, HEIGHTS, WIDTHS, EYES, EARS, SHIRTS, PANTS, HATS, GLASSES, FACES, NECKS, BACKS, OUTFITS, DEFAULT_LOOK, CPU_LOOKS, randomLook, cpuLookFor } from './character.js';
const HAIR_COLORS = ['#3a2416', '#5b3a29', '#2b2420', '#e07a2b', '#e8b931', '#f2eee6', '#ff5fb2', '#3b9bff'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const $ = id => document.getElementById(id);

// Datos de controles (única fuente para el menú y el panel en partida)
export const CONTROLS = {
  classic: {
    name: 'Clásico',
    rows: [
      ['Ratón', 'Apunta en la mesa rival'],
      ['Clic izq.', 'Golpe con <b class="c-top">liftado</b>'],
      ['Clic der.', 'Golpe con <b class="c-back">cortado</b>'],
      ['Mantener', 'Carga potencia · suelta al cerrar el anillo'],
      ['Sacudir ↔', 'Al soltar: <b class="c-curve">efecto lateral</b>'],
      ['Bola alta', '<b class="c-smash">Smash</b> automático'],
      ['Rueda', 'Cámara · al tope, 1ª persona'],
      ['WASD', 'Moverte (modo manual)'],
      ['1 – 6', 'Emotes: baile, risa, burla, llanto…'],
    ],
  },
  free: {
    name: 'Mano libre',
    rows: [
      ['Ratón', 'Mueve la pala (el brazo se estira)'],
      ['Swing ↑', 'Golpe con <b class="c-top">liftado</b> y potencia'],
      ['Swing ↓', 'Golpe con <b class="c-back">cortado</b>'],
      ['Swing ↔', '<b class="c-curve">Efecto lateral</b> (curva)'],
      ['Clic izq.', 'Gira la pala ← · dirige y curva'],
      ['Clic der.', 'Gira la pala → · dirige y curva'],
      ['Bola alta', 'Swing fuerte = <b class="c-smash">smash</b>'],
      ['Rueda', 'Cámara · al tope, 1ª persona'],
      ['1 – 6', 'Emotes: baile, risa, burla, llanto…'],
    ],
  },
};

// Controles con mando (mapeo estándar Xbox · entre paréntesis PlayStation)
export const PAD_CONTROLS = {
  classic: [
    ['Stick der.', 'Apunta en la mesa rival'],
    ['RT / A', 'Golpe con <b class="c-top">liftado</b> (R2 / ✕)'],
    ['LT / X', 'Golpe con <b class="c-back">cortado</b> (L2 / □)'],
    ['Mantener', 'Carga potencia · suelta al cerrar el anillo'],
    ['LB / RB', 'Al soltar: <b class="c-curve">curva</b> ← / →'],
    ['Stick izq.', 'Moverte (manual) · si no, también apunta'],
    ['Y', 'Cambiar cámara (△)'],
    ['Cruceta', 'Emotes · L3 / R3 más emotes'],
  ],
  free: [
    ['Stick der.', 'Mueve la pala · muévelo rápido = swing'],
    ['Swing ↑ / ↓', '<b class="c-top">Liftado</b> / <b class="c-back">cortado</b>'],
    ['Swing ↔', '<b class="c-curve">Efecto lateral</b> (curva)'],
    ['LB / LT', 'Gira la pala ← (L1 / L2)'],
    ['RB / RT', 'Gira la pala → (R1 / R2)'],
    ['Stick izq.', 'Moverte (manual) · si no, también la pala'],
    ['Y', 'Cambiar cámara (△)'],
    ['Cruceta', 'Emotes · L3 / R3 más emotes'],
  ],
};
let padHints = false;
export function setPadHints(on) { padHints = on; }

const OPTIONS = {
  diff: { values: [0, 1, 2, 3], label: v => DIFFS[v].name },
  target: { values: [5, 7, 11], label: v => `${v} puntos` },
  assist: { values: [1, 0], label: v => (+v ? 'Automático' : 'Manual') },
};
const DIFF_DESC = [
  'Paciente y lento. Ideal para aprender.',
  'Equilibrado. Castiga los errores.',
  'Rápido y preciso. Busca los ángulos.',
  'Casi no falla. Solo para maestros.',
];

export function renderControls(mode) {
  const c = CONTROLS[mode], rows = padHints ? PAD_CONTROLS[mode] : c.rows;
  $('controls').innerHTML =
    `<div class="ctl-head"><b>${padHints ? 'Mando' : 'Controles'}</b><span class="ctl-mode">${c.name}</span></div>` +
    rows.map(([k, t]) => `<div class="ctl"><kbd>${k}</kbd><span>${t}</span></div>`).join('') +
    (padHints ? `<div class="ctl-foot"><kbd>B</kbd> racha <kbd>View</kbd> estilo <kbd>Menu</kbd> pausa</div>`
      : `<div class="ctl-foot"><kbd>F</kbd> racha <kbd>Tab</kbd> estilo <kbd>P</kbd> pausa <kbd>M</kbd> sonido <kbd>H</kbd> ocultar</div>`);
}

// Guía "Cómo jugar": pasos numerados + cómo hacer cada efecto, por estilo de control
const HELP = {
  classic: {
    steps: [
      ['Apunta', 'Mueve el <b>ratón</b> sobre la mesa rival: la diana rosa marca dónde caerá tu bola.'],
      ['Carga', 'Mantén pulsado el <b>clic</b>. Cuanto más tiempo, más fuerte sale el golpe.'],
      ['Suelta a tiempo', 'Cuando la bola viene, un <b>anillo</b> se cierra sobre ella. Suelta justo cuando se pone <b>amarillo</b>.'],
      ['Muévete', 'Tu frijolito corre solo a la bola. En modo manual usa <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>.'],
    ],
    fx: [
      ['t1', 'Liftado', 'Clic izquierdo', 'Baja rápido y acelera al botar.'],
      ['t2', 'Cortado', 'Clic derecho', 'Flota, frena y bota bajito.'],
      ['t3', 'Curva', 'Sacude el ratón al soltar', 'Se dobla hacia ese lado.'],
      ['t4', 'Smash', 'Bola alta + clic izq.', 'Aparece el aviso «¡Smash!».'],
    ],
  },
  free: {
    steps: [
      ['Tu ratón es la pala', 'La pala sigue al cursor y el brazo se estira hasta donde haga falta.'],
      ['Colócate', 'Un <b>anillo</b> marca por dónde pasará la bola. Se pone <b>verde</b> si tu pala está centrada.'],
      ['Haz swing', 'Mueve el ratón al golpear. La <b>velocidad</b> del movimiento es la potencia.'],
      ['Saca', 'Golpea la bola que flota junto a ti con un swing hacia arriba.'],
    ],
    fx: [
      ['t1', 'Liftado', 'Swing hacia arriba', 'Golpe rápido y potente.'],
      ['t2', 'Cortado', 'Swing hacia abajo', 'Bola lenta que flota.'],
      ['t3', 'Curva', 'Swing de lado o gira la pala (clic izq./der.)', 'Se dobla hacia ese lado.'],
      ['t4', 'Smash', 'Bola alta + swing fuerte abajo', 'Remate imparable.'],
    ],
  },
};
HELP.pad = {
  steps: [
    ['Conecta y pulsa', 'Enchufa un mando (Xbox, PlayStation o compatible) y <b>pulsa cualquier botón</b> para que el navegador lo detecte.'],
    ['Menús', '<b>Cruceta / stick</b> para moverte, <b>A</b> elegir, <b>B</b> volver, <b>LB/RB</b> cambiar de sección y <b>Menu</b> para jugar.'],
    ['Clásico', '<b>Stick derecho</b> apunta, mantén <b>RT</b> (liftado) o <b>LT</b> (cortado) y suelta a tiempo. <b>LB/RB</b> al soltar = curva.'],
    ['Mano libre', 'El <b>stick derecho</b> es la pala: muévelo rápido hacia arriba o abajo para hacer swing. <b>LB/RB</b> giran la pala.'],
  ],
  fx: [
    ['t1', 'Liftado', 'RT · swing ↑', 'Baja rápido y acelera al botar.'],
    ['t2', 'Cortado', 'LT · swing ↓', 'Flota, frena y bota bajito.'],
    ['t3', 'Curva', 'LB / RB', 'Se dobla hacia ese lado.'],
    ['t4', 'Smash', 'Bola alta', 'Aparece el aviso «¡Smash!».'],
  ],
};
const helpName = k => (CONTROLS[k] ? CONTROLS[k].name : 'Mando');
let helpMode = 'classic';
function renderHelp(mode = helpMode) {
  helpMode = mode;
  const h = HELP[mode];
  $('helpGrid').innerHTML = `<div class="help-wrap">
    <div class="help-tabs">${Object.keys(HELP).map(k => `<button data-m="${k}" class="${k === mode ? 'on' : ''}">${helpName(k)}</button>`).join('')}</div>
    <div class="steps">${h.steps.map(([t, d], i) => `<div class="step"><i class="n">${i + 1}</i><div><b>${t}</b><span>${d}</span></div></div>`).join('')}</div>
    <div class="fx-title">Efectos</div>
    <div class="fx-grid">${h.fx.map(([c, t, how, d]) => `<div class="fx ${c}"><b>${t}</b><kbd class="how">${how}</kbd><span>${d}</span></div>`).join('')}</div>
    <div class="help-common"><span><kbd>Rueda</kbd> cámara · al tope, 1ª persona</span><span><kbd>F</kbd> activar racha (3, 5 o 7 puntos seguidos)</span><span><kbd>Tab</kbd> cambiar de estilo en partido</span><span><kbd>P</kbd> pausa</span><span><kbd>M</kbd> sonido</span><span><kbd>H</kbd> ocultar controles</span></div>
  </div>`;
}

// El orden sale del propio HTML (así añadir una sección nunca desincroniza menú y paneles)
const NAV = [...document.querySelectorAll('.nav-item')].map(el => el.dataset.id);
const LOOK_OPTS = { height: HEIGHTS, width: WIDTHS, eyes: EYES, ears: EARS, shirt: SHIRTS, pants: PANTS, hat: HATS, glasses: GLASSES, face: FACES, neck: NECKS, back: BACKS };

export function createMenu({ settings, onChange, onPlay, blip, onLook, onPane, onBuy, deny }) {
  let sel = 0;
  const items = [...document.querySelectorAll('.nav-item')];

  function select(i, sound = true) {
    const n = (i + NAV.length) % NAV.length;
    if (n === sel && items[n].classList.contains('active')) return;
    sel = n;
    items.forEach((el, j) => el.classList.toggle('active', j === sel));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('active', p.dataset.pane === NAV[sel]));
    if (sound) blip();
    onPane(NAV[sel]);
  }
  function cycle(k, d) {
    const o = OPTIONS[k], idx = o.values.findIndex(v => String(v) === String(settings[k]));
    settings[k] = o.values[(idx + d + o.values.length) % o.values.length];
    onChange(); refresh(k); blip();
  }
  // ---- Personaje (vestidor por pestañas, generado desde el catálogo) ----
  const look = () => settings.look;
  let charTab = 'body';
  function flipVal(el) { if (!el) return; el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
  function lookChanged(k) { onLook(); refresh(); renderChar(); if (k) flipVal(document.querySelector(`.csel[data-k="${k}"] .v`)); }
  function cycleLook(k, d) {
    const opts = LOOK_OPTS[k], i = Math.max(0, opts.findIndex(o => String(o[0]) === String(look()[k])));
    look()[k] = opts[(i + d + opts.length) % opts.length][0];
    lookChanged(k); blip();
  }
  const nameOf = (k, id) => (LOOK_OPTS[k].find(o => String(o[0]) === String(id)) || LOOK_OPTS[k][0])[1];
  const sel3 = (k, label) => {
    const lk = !isOwned(k, look()[k]);
    return `<div class="csel${lk ? ' locked' : ''}" data-k="${k}"><span>${label}${lk ? `<i class="lk-price"><svg><use href="#i-lock"/></svg>${PRICE}</i>` : ''}</span><div><button class="arr" data-d="-1">‹</button><b class="v">${esc(nameOf(k, look()[k]))}</b><button class="arr" data-d="1">›</button></div></div>`;
  };
  // Probador: lo bloqueado se puede ver puesto; para jugar con ello hay que comprarlo
  let tryOutfit = null;
  function buyInfo() {
    const locked = lockedIn(look());
    if (!locked.length) return null;
    const o = tryOutfit && !isOwned('outfit', tryOutfit) ? OUTFITS.find(x => x.id === tryOutfit) : null;
    if (o && locked.some(([k, id]) => o.look[k] === id)) {
      const rest = locked.filter(([k, id]) => o.look[k] !== id);
      return { outfit: o, rest, cost: PRICE * (1 + rest.length), names: ['Outfit ' + o.name, ...rest.map(([k, id]) => nameOf(k, id))] };
    }
    return { rest: locked, cost: PRICE * locked.length, names: locked.map(([k, id]) => nameOf(k, id)) };
  }
  function buyBar() {
    const b = buyInfo(); if (!b) return '';
    return `<div class="buybar"><div class="bb-txt"><b>Probándote</b><span>${esc(b.names.join(' · '))}</span></div>
      <button class="bb-buy${P.coins >= b.cost ? '' : ' poor'}">Comprar ${coinHTML(b.cost)}</button><button class="bb-undo" title="Quitar lo que no tienes">Quitar</button></div>`;
  }
  function stripLocked() {
    if (!lockedIn(look()).length) return false;
    const s = sanitizeLook(look());
    for (const k of Object.keys(s)) if (k !== 'paddleType' && k !== 'paddleColor') look()[k] = s[k];
    tryOutfit = null; return true;
  }
  const swRow = (k, label, list, extra = '') => `<div class="swatch-row"><span>${label}</span><div class="swatches" data-k="${k}">${extra}${list.map(c => `<button class="sw${look()[k] === c ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>`;
  const autoSw = (k, txt) => `<button class="sw auto${look()[k] ? '' : ' on'}" data-c="" title="${txt}">${txt}</button>`;
  const TABS = {
    body: { name: 'Cuerpo', html: () => swRow('skin', 'Piel', SKINS) + `<div class="cgrid">${sel3('height', 'Altura')}${sel3('width', 'Complexión')}${sel3('eyes', 'Ojos')}${sel3('ears', 'Orejas')}</div>` },
    clothes: { name: 'Ropa', html: () => `<div class="cgrid">${sel3('shirt', 'Parte de arriba')}${sel3('pants', 'Pantalón')}</div>` + swRow('shirtColor', 'Equipación', SHIRT_COLORS) + swRow('pantsColor', 'Pantalón', PANTS_COLORS) + swRow('accent', 'Secundario', SHIRT_COLORS) + swRow('shoes', 'Zapatos', ['#ffffff', '#1c1c24', '#e0352b', '#2547b8', '#6b4a2b', '#7b4bd1', '#ffc93c', '#3fae3f']) },
    acc: { name: 'Accesorios', html: () => `<div class="cgrid">${sel3('hat', 'Sombrero')}${sel3('glasses', 'Gafas')}${sel3('face', 'Cara')}${sel3('neck', 'Cuello')}${sel3('back', 'Espalda')}</div>` + swRow('hatColor', 'Sombrero', SHIRT_COLORS, autoSw('hatColor', 'Auto')) + swRow('hairColor', 'Pelo', HAIR_COLORS) + swRow('gloves', 'Guantes', ['#ffffff', '#1c1c24', '#e0352b', '#ffc93c'], autoSw('gloves', 'Sin')) },
    outfits: { name: 'Outfits', html: () => `<div class="outfit-grid">${OUTFITS.map(o => `<button class="outfit" data-o="${o.id}"><svg class="bean" style="color:${o.look.skin || look().skin}"><use href="#i-bean"/></svg><i class="o-shirt" style="background:${o.look.shirt === 'none' ? (o.look.pantsColor || '#2c3a66') : o.look.shirt === 'overalls' ? o.look.shirtColor : o.look.shirtColor || '#fff'}"></i><b>${o.name}</b>${isOwned('outfit', o.id) ? '' : `<i class="lock-badge"><svg><use href="#i-lock"/></svg>${PRICE}</i>`}</button>`).join('')}</div><p class="outfit-note">Un clic te lo prueba. Comprar un outfit (${PRICE} Pongcoins) desbloquea todas sus prendas.</p>` },
  };
  function renderChar() {
    $('charTabs').innerHTML = Object.entries(TABS).map(([id, t]) => `<button data-t="${id}" class="${id === charTab ? 'on' : ''}">${t.name}</button>`).join('');
    const st = $('charContent').scrollTop;
    $('charContent').innerHTML = buyBar() + TABS[charTab].html();
    $('charContent').scrollTop = st;
  }
  $('charTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; charTab = b.dataset.t; renderChar(); blip(); });
  $('charContent').addEventListener('click', e => {
    const arr = e.target.closest('.arr'), csel = e.target.closest('.csel[data-k]');
    if (arr && csel) return cycleLook(csel.dataset.k, +arr.dataset.d);
    const sw = e.target.closest('.sw'), box = e.target.closest('.swatches');
    if (sw && box) { look()[box.dataset.k] = sw.dataset.c || null; lookChanged(); blip(); return; }
    if (e.target.closest('.bb-undo')) { stripLocked(); lookChanged(); blip(); return; }
    if (e.target.closest('.bb-buy')) {
      const b = buyInfo(); if (!b) return;
      if (P.coins < b.cost) { deny(`Te faltan ${b.cost - P.coins} Pongcoins · gana partidos para conseguirlas`); return; }
      if (b.outfit) buyOutfit(b.outfit.id);
      buyPieces(b.rest); tryOutfit = null;
      onBuy(); lookChanged(); return;
    }
    const of = e.target.closest('.outfit');
    if (of) {
      const o = OUTFITS.find(x => x.id === of.dataset.o);
      const keep = { name: look().name, number: look().number, height: look().height, width: look().width, paddleType: look().paddleType, paddleColor: look().paddleColor };
      Object.assign(look(), DEFAULT_LOOK, { skin: look().skin }, o.look, keep); tryOutfit = o.id; lookChanged(); blip();
      of.classList.add('pop'); setTimeout(() => of.classList.remove('pop'), 350);
    }
  });
  const nameIn = $('lookName'), numIn = $('lookNum');
  nameIn.addEventListener('input', () => { look().name = nameIn.value.trim() || 'Tú'; onLook(true); refresh(); });
  numIn.addEventListener('change', () => { look().number = Math.max(0, Math.min(99, Math.round(+numIn.value) || 0)); numIn.value = look().number; lookChanged(); });
  $('randLook').addEventListener('click', () => {
    const keep = { name: look().name, number: look().number };
    Object.assign(look(), randomLook(), keep); stripLocked(); lookChanged(); blip();
  });

  function setStyle(v) { if (settings.control === v) return; settings.control = v; onChange(); refresh(); renderHelp(v); blip(); }

  items.forEach((el, j) => {
    el.addEventListener('mouseenter', () => select(j));
    el.addEventListener('click', () => { if (NAV[j] === 'play') onPlay(); else select(j); });
  });
  document.querySelectorAll('.sel').forEach(s => s.addEventListener('click', e => {
    const b = e.target.closest('.arr'); if (b) cycle(s.dataset.k, +b.dataset.d);
  }));
  document.querySelectorAll('.style-card').forEach(c => c.addEventListener('click', () => setStyle(c.dataset.v)));
  $('playBtn').addEventListener('click', onPlay);

  function refresh(changed) {
    for (const k of Object.keys(OPTIONS)) {
      const el = document.querySelector(`.sel[data-k="${k}"] .v`);
      el.textContent = OPTIONS[k].label(settings[k]);
      if (k === changed) { el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
    }
    const d = +settings.diff;
    document.querySelectorAll('.meter').forEach(m => [...m.children].forEach((b, i) => b.classList.toggle('on', i <= d)));
    $('diffDesc').textContent = DIFF_DESC[d];
    $('moveDesc').textContent = +settings.assist ? 'Tu personaje corre solo hacia la bola.' : 'Te mueves tú con WASD o las flechas.';
    document.querySelectorAll('.style-card').forEach(c => c.classList.toggle('on', c.dataset.v === settings.control));
    const styleName = CONTROLS[settings.control].name;
    $('navStyle').textContent = styleName;
    $('vsStyle').textContent = styleName;
    $('navRules').textContent = `${DIFFS[d].name} · a ${settings.target}`;
    $('vsDiff').textContent = DIFFS[d].name;
    $('factTarget').textContent = `Primero a ${settings.target}`;
    $('factMove').textContent = +settings.assist ? 'Automático' : 'Manual';
    // personaje
    const L = settings.look;
    if (document.activeElement !== $('lookName')) $('lookName').value = L.name;
    $('lookNum').value = L.number;
    $('navChar').textContent = `${L.name} · ${(SHIRTS.find(s => s[0] === L.shirt) || SHIRTS[0])[1]}`;
    $('vsName0').textContent = L.name; $('vsBean0').style.color = L.skin;
    $('vsName1').textContent = CPU_LOOKS[d].name; $('vsBean1').style.color = cpuLookFor(d, L.shirtColor).skin;
  }

  function key(code) {
    if (code === 'ArrowUp' || code === 'KeyW') select(sel - 1);
    else if (code === 'ArrowDown' || code === 'KeyS') select(sel + 1);
    else if (code === 'ArrowLeft' || code === 'ArrowRight' || code === 'KeyA' || code === 'KeyD') {
      const d = code === 'ArrowLeft' || code === 'KeyA' ? -1 : 1;
      if (NAV[sel] === 'char') cycleLook('hat', d);
      else if (NAV[sel] === 'style') setStyle(settings.control === 'classic' ? 'free' : 'classic');
      else if (NAV[sel] === 'rules') cycle('diff', d);
    } else if (code === 'Enter' || code === 'Space') onPlay();
  }

  renderHelp(settings.control);
  renderChar();
  $('helpGrid').addEventListener('click', e => { const b = e.target.closest('.help-tabs button'); if (b) { renderHelp(b.dataset.m); blip(); } });
  refresh();
  select(0, false);
  return { key, refresh, renderChar, stripLocked, pane: () => NAV[sel], go: id => select(NAV.indexOf(id), false), charTab: id => { charTab = id; renderChar(); } };
}

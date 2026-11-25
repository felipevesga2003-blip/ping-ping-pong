// =============================================================
//  Interfaz: menú principal, selectores, ayuda, panel de controles
// =============================================================
import { DIFFS } from './config.js';
import { SKINS, SHIRT_COLORS, HEIGHTS, WIDTHS, SHIRTS, HATS, GLASSES, CPU_LOOKS, randomLook, cpuLookFor } from './character.js';

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
    ],
  },
};

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
  const c = CONTROLS[mode];
  $('controls').innerHTML =
    `<div class="ctl-head"><b>Controles</b><span class="ctl-mode">${c.name}</span></div>` +
    c.rows.map(([k, t]) => `<div class="ctl"><kbd>${k}</kbd><span>${t}</span></div>`).join('') +
    `<div class="ctl-foot"><kbd>P</kbd> pausa <kbd>M</kbd> sonido <kbd>H</kbd> ocultar</div>`;
}

function renderHelp() {
  const col = (mode, cls) => `<div class="help-col ${cls}"><h4><i></i>${CONTROLS[mode].name}</h4>` +
    CONTROLS[mode].rows.slice(0, 7).map(([k, t]) => `<div class="hrow"><kbd>${k}</kbd><span>${t}</span></div>`).join('') + '</div>';
  $('helpGrid').innerHTML = col('classic', 'classic') + col('free', 'free') +
    `<div class="help-tech">
      <div class="tech t1"><b>Liftado</b><span>Cae rápido y acelera al botar.</span></div>
      <div class="tech t2"><b>Cortado</b><span>Flota, frena y bota bajo.</span></div>
      <div class="tech t3"><b>Curva</b><span>Se dobla en el aire hacia un lado.</span></div>
      <div class="tech t4"><b>Smash</b><span>Bola alta: remate imparable.</span></div>
    </div>`;
}

// El orden sale del propio HTML (así añadir una sección nunca desincroniza menú y paneles)
const NAV = [...document.querySelectorAll('.nav-item')].map(el => el.dataset.id);
const LOOK_OPTS = { height: HEIGHTS, width: WIDTHS, shirt: SHIRTS, hat: HATS, glasses: GLASSES };

export function createMenu({ settings, onChange, onPlay, blip, onLook, onPane }) {
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
  // ---- Personaje ----
  const look = () => settings.look;
  function flipVal(el) { if (!el) return; el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); }
  function lookChanged(k) { onLook(); refresh(); if (k) flipVal(document.querySelector(`.csel[data-k="${k}"] .v`)); }
  function cycleLook(k, d) {
    const opts = LOOK_OPTS[k], i = opts.findIndex(o => String(o[0]) === String(look()[k]));
    look()[k] = opts[(i + d + opts.length) % opts.length][0];
    lookChanged(k); blip();
  }
  document.querySelectorAll('.csel[data-k]').forEach(s => s.addEventListener('click', e => {
    const b = e.target.closest('.arr'); if (b) cycleLook(s.dataset.k, +b.dataset.d);
  }));
  for (const [k, list] of [['skin', SKINS], ['shirtColor', SHIRT_COLORS]]) {
    const box = document.querySelector(`.swatches[data-k="${k}"]`);
    box.innerHTML = list.map(c => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    box.addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; look()[k] = b.dataset.c; lookChanged(); blip(); });
  }
  const nameIn = $('lookName'), numIn = $('lookNum');
  nameIn.addEventListener('input', () => { look().name = nameIn.value.trim() || 'Tú'; onLook(true); refresh(); });
  numIn.addEventListener('change', () => { look().number = Math.max(0, Math.min(99, Math.round(+numIn.value) || 0)); numIn.value = look().number; lookChanged(); });
  $('randLook').addEventListener('click', () => {
    const keep = { name: look().name, number: look().number };
    Object.assign(look(), randomLook(), keep); lookChanged(); blip();
  });

  function setStyle(v) { if (settings.control === v) return; settings.control = v; onChange(); refresh(); blip(); }

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
    for (const k of Object.keys(LOOK_OPTS)) {
      const o = LOOK_OPTS[k].find(o => String(o[0]) === String(L[k])) || LOOK_OPTS[k][0];
      document.querySelector(`.csel[data-k="${k}"] .v`).textContent = o[1];
    }
    document.querySelectorAll('.swatches').forEach(b => b.querySelectorAll('.sw').forEach(s => s.classList.toggle('on', s.dataset.c === L[b.dataset.k])));
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

  renderHelp();
  refresh();
  select(0, false);
  return { key, refresh, pane: () => NAV[sel], go: id => select(NAV.indexOf(id), false) };
}

// =============================================================
//  TALLER — árbol de habilidades del frijolito y de cada una de
//  las 3 palas (tipo, color, nombre y mejoras con Pongcoins)
// =============================================================
import { PADDLES } from './config.js';
import { PADDLE_COLORS } from './character.js';
import { P, PRICE, MAX_LV, SKILLS, PAD_SKILLS, MILESTONES, isOwned, buySkill, buyPadSkill, buyPadType, padStats, boosts, charLevel, save } from './progress.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ICON = { agi: 'i-bolt', str: 'i-fist', ref: 'i-eye', reach: 'i-reach', speed: 'i-bolt', spin: 'i-swirl', ctrl: 'i-target', smash: 'i-hammer' };
export const coinHTML = n => `<span class="coin"><svg><use href="#i-coin"/></svg>${n}</span>`;
const pct = v => `+${Math.round((v - 1) * 100)}%`;

// cb: { blip(), onPaddle(), onCoins(), deny(msg), buySound() }
export function createWorkshop(cb) {
  let tab = 'char';

  function tree(defs, levels, kind) {
    return `<div class="tree">${Object.entries(defs).map(([k, s]) => {
      const lv = levels[k];
      const nodes = [];
      for (let n = MAX_LV; n >= 1; n--) {
        const st = n <= lv ? 'owned' : n === lv + 1 ? 'next' : 'locked';
        const ms = MILESTONES[n] ? ' ms' : '';
        nodes.push(`<button class="node ${st}${ms}" data-kind="${kind}" data-k="${k}" ${st === 'next' ? '' : 'tabindex="-1"'} title="${MILESTONES[n] ? MILESTONES[n] + ' · ' : ''}Nivel ${n}: ${pct(1 + n * s.per)}">
          ${st === 'next' ? `<em>${coinHTML(PRICE)}</em>` : `<i>${n}</i>`}</button>`);
      }
      return `<div class="branch${lv >= MAX_LV ? ' maxed' : ''}">
        <div class="br-head"><span class="br-ico"><svg><use href="#${ICON[k]}"/></svg></span><b>${s.name}</b><u>${lv ? pct(1 + lv * s.per) : '—'}</u></div>
        <div class="nodes">${nodes.join('')}</div>
        <p>${s.desc}</p>
      </div>`;
    }).join('')}</div>`;
  }

  function charTab() {
    const b = boosts();
    return `<div class="ws-intro"><div><b>Frijolito · nivel ${charLevel()}</b><span>Cada mejora cuesta ${coinHTML(PRICE)} · lo que da ganar un partido normal. Nivel 3 = Experto, nivel 5 = Maestro.</span></div></div>
      ${tree(SKILLS, P.skills, 'char')}
      <div class="ws-sum">${Object.keys(SKILLS).map(k => `<span>${SKILLS[k].name} <b>${pct(b[k])}</b></span>`).join('')}</div>`;
  }

  function padTab(i) {
    const p = P.paddles[i], eff = padStats(i);
    const types = Object.entries(PADDLES).map(([id, t]) => {
      const own = isOwned('paddle', id), on = p.type === id;
      return `<button class="pt-card${on ? ' on' : ''}${own ? '' : ' locked'}" data-type="${id}"><b>${t.name}</b><span>${t.desc}</span>${own ? (on ? '<i class="pt-tag">Equipada</i>' : '<i class="pt-tag ghost">Equipar</i>') : `<i class="pt-tag buy"><svg><use href="#i-lock"/></svg>${coinHTML(PRICE)}</i>`}</button>`;
    }).join('');
    const bars = Object.keys(PAD_SKILLS).map(k => `<i class="stat"><em>${PAD_SKILLS[k].name}</em><u style="width:${Math.min(100, Math.round(((eff[k] - 0.8) / 0.9) * 100))}%"></u></i>`).join('');
    return `<div class="pad-head">
        <i class="pad-swatch" style="--c:${esc(p.color)}"></i>
        <label class="field grow"><span>Nombre de la pala</span><input id="padName" maxlength="14" spellcheck="false" autocomplete="off" value="${esc(p.name)}"></label>
        <button class="use-btn${P.active === i ? ' on' : ''}" id="padUse">${P.active === i ? 'En uso' : 'Usar esta'}</button>
      </div>
      <div class="ws-label">Tipo de pala</div>
      <div class="pt-grid">${types}</div>
      <div class="swatch-row"><span>Goma</span><div class="swatches" data-k="padColor">${PADDLE_COLORS.map(c => `<button class="sw${p.color === c ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div></div>
      <div class="ws-label">Mejoras de esta pala</div>
      ${tree(PAD_SKILLS, p.up, 'pad')}
      <div class="pad-bars">${bars}</div>`;
  }

  function render() {
    $('wsCoins').textContent = P.coins;
    $('wsTabs').innerHTML = [['char', 'Frijolito'], ...P.paddles.map((p, i) => ['p' + i, p.name])]
      .map(([id, name]) => `<button data-t="${id}" class="${id === tab ? 'on' : ''}">${id !== 'char' && P.active === +id[1] ? '<i class="dot"></i>' : ''}${esc(name)}</button>`).join('');
    $('wsContent').innerHTML = tab === 'char' ? charTab() : padTab(+tab[1]);
  }
  const slot = () => +tab[1];
  function deny() { cb.deny(`Te faltan ${PRICE - P.coins} Pongcoins · gana un partido`); }

  $('wsTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.t; render(); cb.blip(); });
  $('wsContent').addEventListener('click', e => {
    const node = e.target.closest('.node.next');
    if (node) {
      const ok = node.dataset.kind === 'char' ? buySkill(node.dataset.k) : buyPadSkill(slot(), node.dataset.k);
      if (!ok) return deny();
      cb.buySound(); render(); cb.onCoins(); if (node.dataset.kind === 'pad') cb.onPaddle();
      const fresh = $('wsContent').querySelector(`.node.owned[data-k="${node.dataset.k}"]`); if (fresh) fresh.classList.add('pop');
      return;
    }
    const pt = e.target.closest('.pt-card');
    if (pt) {
      const id = pt.dataset.type;
      if (!isOwned('paddle', id)) { if (!buyPadType(id)) return deny(); cb.buySound(); cb.onCoins(); }
      else cb.blip();
      P.paddles[slot()].type = id; save(); render(); cb.onPaddle();
      return;
    }
    const sw = e.target.closest('.sw');
    if (sw) { P.paddles[slot()].color = sw.dataset.c; save(); render(); cb.onPaddle(); cb.blip(); return; }
    if (e.target.closest('#padUse')) { P.active = slot(); save(); render(); cb.onPaddle(); cb.blip(); }
  });
  $('wsContent').addEventListener('input', e => {
    if (e.target.id !== 'padName') return;
    P.paddles[slot()].name = e.target.value.trim() || `Pala ${slot() + 1}`; save();
    const b = $('wsTabs').querySelector(`[data-t="${tab}"]`); if (b) b.lastChild.textContent = P.paddles[slot()].name;
    cb.onPaddle(true);
  });

  return { render, open: t => { tab = t; render(); } };
}

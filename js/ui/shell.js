/* Foul Play FC · js/ui/shell.js
   Window sizing (full window, wider screens see more), overlays, pace and key-binding settings.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- shell ---------------- */
function resize() {   // fill the window at its native resolution; letterbox only beyond 4:3 or 3.6:1
  const st = document.getElementById('stage'), vw = Math.max(1, innerWidth), vh = Math.max(1, innerHeight), ar = clamp(vw / vh, MIN_AR, MAX_AR);
  const w = Math.min(vw, vh * ar), h = Math.min(vh, w / ar);
  st.style.width = w + 'px'; st.style.height = h + 'px';
  LW = Math.round(LH * w / h);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(320, Math.round(w * dpr)); cv.height = Math.max(190, Math.round(h * dpr));
  if (R3) R3.resize(w, h, dpr, LW);
}
addEventListener('resize', resize);
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
const overlays = ['menu', 'setup', 'paused', 'over', 'settings', 'online', 'guide', 'creator', 'roles'];
let settingsFrom = 'menu';
function renderPace() {
  const el = document.getElementById('pace');
  el.innerHTML = PACES.map(([n, v]) => `<button id="pace-${Math.round(v * 100)}" aria-pressed="${v === PACE}" data-v="${v}">${n} · ${Math.round(v * 100)}%</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = () => { PACE = +b.dataset.v; store.set('fpfc-pace', PACE); renderPace(); document.getElementById(b.id).focus(); });
}
const BIND_GROUPS = [['Movement', ['up', 'down', 'left', 'right', 'sprint']], ['Ball', ['shoot', 'pass', 'lpass', 'through', 'view']], ['Fouls and tricks', ['foul', 'item', 'blind', 'taunt']], ['Class skills', ['skill1', 'skill2', 'skill3', 'ult']]];
function renderBinds() {
  const t = document.getElementById('binds'), label = Object.fromEntries(ACTIONS);
  const cell = (pi, a) => {
    const w = rebinding && rebinding.p === pi && rebinding.a === a;
    return `<td><button class="bind${w ? ' wait' : ''}" id="bind-${pi}-${a}" data-p="${pi}" data-a="${a}" aria-label="${esc(label[a])}, player ${pi + 1}: ${esc(keyLabel(BINDS[pi][a]))}">${w ? 'Press a key…' : esc(keyLabel(BINDS[pi][a]))}</button></td>`;
  };
  t.innerHTML = '<thead><tr><th>Action</th><th>Player 1</th><th>Player 2</th></tr></thead><tbody>' +
    BIND_GROUPS.map(([g, acts]) => `<tr class="grp"><td colspan="3">${g}</td></tr>` + acts.map(a => `<tr><td>${esc(label[a])}</td>${cell(0, a)}${cell(1, a)}</tr>`).join('')).join('') + '</tbody>';
  t.querySelectorAll('.bind').forEach(b => b.onclick = () => {
    rebinding = { p: +b.dataset.p, a: b.dataset.a }; renderBinds();
    const nb = document.getElementById(`bind-${b.dataset.p}-${b.dataset.a}`); if (nb) nb.focus();
  });
}
// Accessible tabs: click or arrow keys switch panels; returns a function to select a tab by id.
function setupTabs(list, body) {
  const tabs = () => [...list.querySelectorAll('[role="tab"]')];
  const show = tab => {
    tabs().forEach(x => { const on = x === tab; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const pnl = document.getElementById(x.getAttribute('aria-controls')); if (pnl) pnl.hidden = !on; });
    if (body) body.scrollTop = 0;
  };
  list.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) show(t); });
  list.addEventListener('keydown', e => {
    const all = tabs(), i = all.indexOf(document.activeElement); if (i < 0) return;
    const next = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!next) return;
    e.preventDefault(); e.stopPropagation(); const t = all[(i + next + all.length) % all.length]; show(t); t.focus();
  });
  return id => { const t = document.getElementById(id); if (t) show(t); };
}
const showSettingsTab = setupTabs(document.querySelector('#settings [role="tablist"]'), document.getElementById('settings-body'));

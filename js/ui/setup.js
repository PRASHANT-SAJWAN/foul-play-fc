/* Foul Play FC · js/ui/setup.js
   The pre-match screen shown after picking a mode: team names and colours, which side you play for, and each person's player (class).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const SETUP_MODES = {
  '1p': { title: 'Solo vs bots', humans: 1, side: true },
  '2pv': { title: '2 players · versus', humans: 2, side: true, versus: true },
  '2pc': { title: '2 players · co-op', humans: 2, side: true },
  watch: { title: 'Watch the bots', humans: 0 },
  playground: { title: 'Playground', humans: 1, side: true },
  ref: { title: 'Be the referee', humans: 0 },
};
let setupMode = '1p';
const ROLE_ORDER = ['offense', 'defense', 'support', 'disrupt'];
function openSetup(mode) { setupMode = mode; renderSetup(); showOverlay('setup'); const ov = document.getElementById('setup'); ov.scrollTop = 0; const s = document.getElementById('su-start'); if (s) s.focus({ preventScroll: true }); }
function closeSetup() { showOverlay('menu'); }

function setupClassGrid(who, cur) {
  const classes = CLASSES.slice().sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
  return `<div class="su-classes" role="group" aria-label="${who === 1 ? 'Player 2' : 'Your'} player">${classes.map(C => `<button class="su-cls" data-who="${who}" data-c="${C.id}" aria-pressed="${cur === C.id}" style="--cc:${C.col}" title="${esc(C.title || '')}"><img src="${classPortrait(C)}" alt=""><span class="n">${esc(C.name)}</span><span class="r">${esc((ROLE_INFO[C.role] || {}).name || C.role)}</span></button>`).join('')}</div>`;
}
function renderSetup() {
  const M = SETUP_MODES[setupMode] || SETUP_MODES['1p'], el = document.getElementById('su-body');
  document.getElementById('su-title').textContent = M.title;
  const sideOf = i => !M.side ? '' : M.versus ? (SETUP.side === i ? 'P1' : 'P2') : (SETUP.side === i ? (M.humans === 2 ? 'P1 + P2' : 'YOU') : '');
  const teamCard = i => {
    const t = SETUP.teams[i], other = SETUP.teams[1 - i].col, mine = M.side && (M.versus || SETUP.side === i);
    return `<div class="su-team${mine ? ' mine' : ''}" style="--tc:${t.col}">
      <div class="su-team-top"><span class="su-badge">${i === 0 ? 'HOME' : 'AWAY'}</span>${sideOf(i) ? `<span class="su-you">${sideOf(i)}</span>` : ''}</div>
      <label class="su-label" for="su-n${i}">Team name</label>
      <input id="su-n${i}" class="su-name" maxlength="18" value="${esc(t.name)}" data-t="${i}" autocomplete="off" spellcheck="false">
      <div class="su-label">Kit colour</div>
      <div class="swatches">${TEAM_COLS.map(c => `<button class="sw" style="background:${c}" data-t="${i}" data-col="${c}" aria-label="Kit colour ${c}" aria-pressed="${t.col === c}" ${c === other ? 'disabled title="The other team wears this"' : ''}></button>`).join('')}</div>
      ${M.side && !M.versus && SETUP.side !== i ? `<button class="btn ghost sm su-side" data-t="${i}">Play for this team</button>` : ''}
    </div>`;
  };
  let html = `<div class="su-teams">${teamCard(0)}<div class="su-vs">VS</div>${teamCard(1)}</div>`;
  if (M.versus) html += `<div class="row su-row"><button class="btn ghost sm" id="su-swap">Swap sides</button></div>`;
  if (M.humans >= 1) {
    html += `<h3 class="su-h">${M.humans === 2 ? 'Player 1' : 'Your player'} <span class="hint">${esc(CLS[MY_CLASS].name)}, ${esc(CLS[MY_CLASS].title || '')}</span></h3>${setupClassGrid(0, MY_CLASS)}`;
    html += `<label class="adm-t su-lock"><input type="checkbox" id="su-lock" ${LOCK_PLAYER ? 'checked' : ''}> Play as this one character all match (no switching)</label>`;
  }
  if (M.humans === 2) { const c2 = CLS[SETUP.p2] ? SETUP.p2 : 'striker'; html += `<h3 class="su-h">Player 2 <span class="hint">${esc(CLS[c2].name)}, ${esc(CLS[c2].title || '')}</span></h3>${setupClassGrid(1, c2)}`; }
  if (M.humans === 0) html += `<p class="hint">${setupMode === 'ref' ? 'You run the match as the referee.' : 'Sit back: bots play both sides.'}</p>`;
  el.innerHTML = html;
  el.querySelectorAll('.su-name').forEach(inp => {
    inp.oninput = () => { SETUP.teams[+inp.dataset.t].name = inp.value; saveSetup(); };
    inp.onchange = () => { SETUP.teams[+inp.dataset.t].name = cleanTeamName(inp.value, +inp.dataset.t); saveSetup(); applyTeams(SETUP.teams); inp.value = SETUP.teams[+inp.dataset.t].name; };
  });
  el.querySelectorAll('.sw[data-col]').forEach(b => b.onclick = () => { SETUP.teams[+b.dataset.t].col = b.dataset.col; saveSetup(); applyTeams(SETUP.teams); rerender(b); });
  el.querySelectorAll('.su-side').forEach(b => b.onclick = () => { SETUP.side = +b.dataset.t; saveSetup(); rerender(null, 'su-start'); });
  const sw = document.getElementById('su-swap'); if (sw) sw.onclick = () => { SETUP.side = 1 - SETUP.side; saveSetup(); rerender(null, 'su-swap'); };
  el.querySelectorAll('.su-cls').forEach(b => b.onclick = () => { if (b.dataset.who === '1') { SETUP.p2 = b.dataset.c; saveSetup(); } else setMyClass(b.dataset.c); rerender(b); });
  const lk = document.getElementById('su-lock'); if (lk) lk.onchange = () => { LOCK_PLAYER = lk.checked; store.set('fpfc-lock', LOCK_PLAYER); setMyClass(MY_CLASS); };
}
function rerender(btn, focusId) {   // redraw and keep keyboard focus where it was
  const sel = btn ? (btn.dataset.col ? `.sw[data-t="${btn.dataset.t}"][data-col="${btn.dataset.col}"]` : `.su-cls[data-who="${btn.dataset.who}"][data-c="${btn.dataset.c}"]`) : null;
  renderSetup();
  const f = sel ? document.querySelector('#su-body ' + sel) : focusId ? document.getElementById(focusId) : null; if (f) f.focus();
}
document.getElementById('su-start').onclick = () => {
  for (const i of [0, 1]) SETUP.teams[i].name = cleanTeamName(SETUP.teams[i].name, i);
  saveSetup(); applyTeams(SETUP.teams); start(setupMode);
};
document.getElementById('su-back').onclick = closeSetup;
document.getElementById('su-classes').onclick = () => openRoles('setup');
addEventListener('keydown', e => { if (e.code === 'Escape' && !document.getElementById('setup').hidden && !(e.target && e.target.tagName === 'INPUT')) closeSetup(); });
// Picking a mode now opens the setup screen first.
for (const [id, mode] of [['m-1p', '1p'], ['m-2pv', '2pv'], ['m-2pc', '2pc'], ['m-watch', 'watch'], ['m-play', 'playground'], ['m-ref', 'ref']]) document.getElementById(id).onclick = () => openSetup(mode);

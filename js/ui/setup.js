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
const ROLE_ORDER = ['offense', 'allround', 'defense', 'support', 'disrupt'];
function openSetup(mode) { setupMode = mode; setupWho = 0; renderSetup(); showOverlay('setup'); startSetupPreview(); const ov = document.getElementById('setup'); ov.scrollTop = 0; const s = document.getElementById('su-start'); if (s) s.focus({ preventScroll: true }); }
function closeSetup() { stopSetupPreview(); showOverlay('menu'); }

/* ---------- the selected character, turning on a plinth ---------- */
// One canvas kept across redraws (moving it keeps its 3D context). Shows the class's model from
// js/player/models.js if it has one, otherwise the blocky player in your kit. Without WebGL: the portrait.
let setupWho = 0, SU_PREVIEW = null, suPreviewTried = false;
const SU_CANVAS = document.createElement('canvas'); SU_CANVAS.className = 'su-canvas'; SU_CANVAS.setAttribute('aria-hidden', 'true');
async function startSetupPreview() {
  if (!suPreviewTried) {
    suPreviewTried = true;
    try { const mod = await import('../render/render3d.js'); SU_PREVIEW = mod.createPreview(SU_CANVAS, { modelLimits: MODEL_LIMITS }); } catch (e) { SU_PREVIEW = null; }
    if (!document.getElementById('setup').hidden) renderSetup();
  }
  if (SU_PREVIEW) { updateSetupPreview(); SU_PREVIEW.start(); }
}
function stopSetupPreview() { if (SU_PREVIEW) SU_PREVIEW.stop(); }
function setupPicked(who) { return who === 1 ? (CLS[SETUP.p2] ? SETUP.p2 : 'striker') : MY_CLASS; }
function setupTeamOf(who) { const M = SETUP_MODES[setupMode] || {}; return who === 1 && M.versus ? 1 - SETUP.side : M.side ? SETUP.side : 0; }
function updateSetupPreview() {
  if (!SU_PREVIEW) return;
  const T = TEAM[setupTeamOf(setupWho)], L = Object.assign(lookFromSkin(MY_SKIN), { jersey: T.col, shorts: T.shorts, socks: T.socks });
  if (setupWho === 1) Object.assign(L, { num: 9, hairStyle: 2, accessory: 0 });
  SU_PREVIEW.setLook(L, CLASS_MODELS[setupPicked(setupWho)] || null);
}
function setupPreviewPanel(who) {
  const C = CLS[setupPicked(who)], R = ROLE_INFO[C.role] || {}, keysOf = a => keyLabel(BINDS[who][a]);
  const sk = [['foul', 'Attack', null], ['skill1', 'Spell 1', C.skills[0]], ['skill2', 'Spell 2', C.skills[1]], ['ult', 'Ultimate', C.ult]];
  return `<div class="su-prev" style="--cc:${C.col}">
    <div class="su-stage" id="su-stage">${SU_PREVIEW ? '' : `<img src="${classPortrait(C)}" alt="">`}</div>
    <div class="su-info">
      <div class="su-who">${(SETUP_MODES[setupMode] || {}).humans === 2 ? (who === 1 ? 'Player 2' : 'Player 1') : 'Your player'}</div>
      <h3>${esc(C.name)}</h3><p class="su-title">${esc(C.title || '')} · <span style="color:${R.col || 'inherit'}">${esc(R.name || C.role)}</span>${CLASS_MODELS[C.id] ? ' · 3D model' : ''}</p>
      <p class="su-pass"><b>${esc(C.passive[0])}.</b> ${esc(C.passive[1])}</p>
      <ul class="su-kit">${sk.map(([a, lab, d]) => `<li><kbd>${esc(keysOf(a))}</kbd><span><b>${lab}${d ? ' · ' + esc(d.name) : ''}</b>${d ? ' ' + esc(d.desc) : ' Hold to aim, release to strike.'}</span></li>`).join('')}</ul>
    </div></div>`;
}

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
  const ARENA_DESC = { classic: 'The normal stadium.', volcano: 'Steam vents launch players and the ball; lava pits take you out for 10 s.', plant: 'Electric fences instead of touchlines: run or get knocked into them and you\'re stunned.', swamp: 'Mud patches slow everyone and stop the ball dead.' };
  html += `<h3 class="su-h">Pitch <span class="hint">${esc(ARENA_DESC[ARENA_PREF])}</span></h3><div class="seg su-arena" role="group" aria-label="Pitch">${ARENAS.map(([id, n]) => `<button data-arena="${id}" aria-pressed="${id === ARENA_PREF}">${esc(n)}</button>`).join('')}</div>`;
  if (M.humans >= 1) {
    if (M.humans < 2) setupWho = 0;
    html += setupPreviewPanel(setupWho);
    html += `<h3 class="su-h">${M.humans === 2 ? 'Player 1' : 'Your player'} <span class="hint">${esc(CLS[MY_CLASS].name)}, ${esc(CLS[MY_CLASS].title || '')}</span></h3>${setupClassGrid(0, MY_CLASS)}`;
    html += `<label class="adm-t su-lock"><input type="checkbox" id="su-lock" ${LOCK_PLAYER ? 'checked' : ''}> Play as this one character all match (no switching)</label>`;
  }
  if (M.humans === 2) { const c2 = CLS[SETUP.p2] ? SETUP.p2 : 'striker'; html += `<h3 class="su-h">Player 2 <span class="hint">${esc(CLS[c2].name)}, ${esc(CLS[c2].title || '')}</span></h3>${setupClassGrid(1, c2)}`; }
  if (M.humans === 0) html += `<p class="hint">${setupMode === 'ref' ? 'You run the match as the referee.' : 'Sit back: bots play both sides.'}</p>`;
  el.innerHTML = html;
  const stage = document.getElementById('su-stage'); if (stage && SU_PREVIEW) { stage.appendChild(SU_CANVAS); updateSetupPreview(); }
  el.querySelectorAll('.su-name').forEach(inp => {
    inp.oninput = () => { SETUP.teams[+inp.dataset.t].name = inp.value; saveSetup(); };
    inp.onchange = () => { SETUP.teams[+inp.dataset.t].name = cleanTeamName(inp.value, +inp.dataset.t); saveSetup(); applyTeams(SETUP.teams); inp.value = SETUP.teams[+inp.dataset.t].name; };
  });
  el.querySelectorAll('.sw[data-col]').forEach(b => b.onclick = () => { SETUP.teams[+b.dataset.t].col = b.dataset.col; saveSetup(); applyTeams(SETUP.teams); rerender(b); });
  el.querySelectorAll('[data-arena]').forEach(b => b.onclick = () => { ARENA_PREF = b.dataset.arena; store.set('fpfc-arena', ARENA_PREF); renderSetup(); const f = document.querySelector(`[data-arena="${ARENA_PREF}"]`); if (f) f.focus(); });
  el.querySelectorAll('.su-side').forEach(b => b.onclick = () => { SETUP.side = +b.dataset.t; saveSetup(); rerender(null, 'su-start'); });
  const sw = document.getElementById('su-swap'); if (sw) sw.onclick = () => { SETUP.side = 1 - SETUP.side; saveSetup(); rerender(null, 'su-swap'); };
  el.querySelectorAll('.su-cls').forEach(b => {
    b.onclick = () => { setupWho = +b.dataset.who; if (b.dataset.who === '1') { SETUP.p2 = b.dataset.c; saveSetup(); } else setMyClass(b.dataset.c); rerender(b); };
  });
  const lk = document.getElementById('su-lock'); if (lk) lk.onchange = () => { LOCK_PLAYER = lk.checked; store.set('fpfc-lock', LOCK_PLAYER); setMyClass(MY_CLASS); };
}
function rerender(btn, focusId) {   // redraw and keep keyboard focus where it was
  const sel = btn ? (btn.dataset.col ? `.sw[data-t="${btn.dataset.t}"][data-col="${btn.dataset.col}"]` : `.su-cls[data-who="${btn.dataset.who}"][data-c="${btn.dataset.c}"]`) : null;
  renderSetup();
  const f = sel ? document.querySelector('#su-body ' + sel) : focusId ? document.getElementById(focusId) : null; if (f) f.focus();
}
document.getElementById('su-start').onclick = () => {
  for (const i of [0, 1]) SETUP.teams[i].name = cleanTeamName(SETUP.teams[i].name, i);
  saveSetup(); applyTeams(SETUP.teams); stopSetupPreview(); start(setupMode);
};
document.getElementById('su-back').onclick = closeSetup;
document.getElementById('su-classes').onclick = () => openRoles('setup');
addEventListener('keydown', e => { if (e.code === 'Escape' && !document.getElementById('setup').hidden && !(e.target && e.target.tagName === 'INPUT')) closeSetup(); });
// Picking a mode now opens the setup screen first.
for (const [id, mode] of [['m-1p', '1p'], ['m-2pv', '2pv'], ['m-2pc', '2pc'], ['m-watch', 'watch'], ['m-play', 'playground'], ['m-ref', 'ref']]) document.getElementById(id).onclick = () => openSetup(mode);

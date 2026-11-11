/* Foul Play FC · js/ui/settings.js
   The Game settings tab: referee vision, anomalies, classes, line-ups, looks, mutators, format.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

function renderRefVis(distId, widthId) {
  const put = (id, list, k) => { const el = id && document.getElementById(id); if (!el) return;
    el.innerHTML = list.map(([v, n], i) => `<button id="${id}-${i}" aria-pressed="${REF_VIS[k] === v}" data-i="${i}">${n}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { setRefVis(k, list[+b.dataset.i][0]); renderRefVis(distId, widthId); const nb = document.getElementById(b.id); if (nb) nb.focus(); }); };
  put(distId, REF_DISTS, 'dist'); put(widthId, REF_WIDTHS, 'width');
}
function renderAnomOpts(lvlId, optId) {
  const lv = document.getElementById(lvlId);
  if (lv) {
    lv.innerHTML = ANOM_LEVELS.map(([n], i) => `<button id="${lvlId}-${i}" aria-pressed="${ANOM_PREF.level === i}" data-i="${i}">${n}</button>`).join('');
    lv.querySelectorAll('button').forEach(b => b.onclick = () => { setAnomPref(+b.dataset.i); renderAnomOpts(lvlId, optId); const nb = document.getElementById(b.id); if (nb) nb.focus(); });
  }
  const op = optId && document.getElementById(optId);
  if (op) {
    op.innerHTML = ANOM_LIST.map(([k, n, d]) => `<button id="${optId}-${k}" aria-pressed="${!!ANOM_PREF.on[k]}" data-k="${k}" title="${d}">${n}</button>`).join('');
    op.querySelectorAll('button').forEach(b => {
      b.onclick = () => { const on = Object.assign({}, ANOM_PREF.on); on[b.dataset.k] = !on[b.dataset.k]; setAnomPref(null, on); renderAnomOpts(lvlId, optId); const nb = document.getElementById(b.id); if (nb) nb.focus(); };
      const say = () => { const d = document.getElementById('anomdesc'); if (d) d.textContent = ANOM_LIST.find(a => a[0] === b.dataset.k)[2]; };
      b.onmouseenter = say; b.onfocus = say;
    });
  }
}
function fillClassSelect(sel) {
  sel.innerHTML = Object.entries(ROLE_INFO).map(([r, R]) => `<optgroup label="${R.name}">${CLASSES.filter(c => c.role === r).map(c => `<option value="${c.id}">${c.name} · ${c.title}</option>`).join('')}</optgroup>`).join('');
  sel.value = MY_CLASS;
}
function setMyClass(id) {
  if (!CLS[id]) return; MY_CLASS = id; store.set('fpfc-class', id);
  if (NET && NET.meta && NET.meta.status === 'lobby') {
    if (NET.isHost) { const me = NET.roster[NET.uid]; if (me.cls !== id) me.ready = false; me.cls = id; NET.roster[NET.uid].lock = LOCK_PLAYER; NET.roster[NET.uid].useSkin = USE_MY_LOOK; rosterChanged(); }
    else if (NET.conn) NET.conn.send({ t: 'cls', cls: id, lock: LOCK_PLAYER, useSkin: USE_MY_LOOK });
  }
  for (const id2 of ['opt-class', 'on-class']) { const el = document.getElementById(id2); if (el) el.value = id; }
}
function renderOpts() {
  renderAnomOpts('anomlvl', 'anomopt'); renderRefVis('refdist', 'refwidth');
  const seg = (id, items, cur, set) => { const el = document.getElementById(id); el.innerHTML = items.map(([v, n]) => `<button id="${id}-${v}" aria-pressed="${cur === v}" data-v="${v}">${n}</button>`).join(''); el.querySelectorAll('button').forEach(b => b.onclick = () => { set(b.dataset.v); renderOpts(); const nb = document.getElementById(b.id); if (nb) nb.focus(); }); };
  fillClassSelect(document.getElementById('opt-class'));
  document.getElementById('opt-class').onchange = e => setMyClass(e.target.value);
  document.getElementById('opt-classcat').onclick = () => openRoles('settings');
  seg('lockopt', [['switch', 'Switch team-mates'], ['lock', 'Play as one character']], LOCK_PLAYER ? 'lock' : 'switch', v => { LOCK_PLAYER = v === 'lock'; store.set('fpfc-lock', LOCK_PLAYER); setMyClass(MY_CLASS); });
  seg('lineopt', LINEUP_NAMES, LINEUP_PREF, v => { LINEUP_PREF = v; store.set('fpfc-lineup', v); });
  seg('lookopt', [['class', 'Class look'], ['mine', 'My custom look']], USE_MY_LOOK ? 'mine' : 'class', v => { USE_MY_LOOK = v === 'mine'; store.set('fpfc-mylook', USE_MY_LOOK); setMyClass(MY_CLASS); });
  const mo = document.getElementById('mutopt');
  mo.innerHTML = MUT_LIST.map(([k, n]) => `<button id="mut-${k}" aria-pressed="${!!MUT_PREF[k]}" data-k="${k}">${n}</button>`).join('');
  mo.querySelectorAll('button').forEach(b => b.onclick = () => { MUT_PREF[b.dataset.k] = !MUT_PREF[b.dataset.k]; store.set('fpfc-mut', MUT_PREF); if (S.phase === 'menu') newMatch('watch'); renderOpts(); const nb = document.getElementById(b.id); if (nb) nb.focus(); });
  const fm = document.getElementById('fmtopt');
  fm.innerHTML = Object.entries(FORMATS).map(([k, f]) => `<button id="fmt-${k}" aria-pressed="${k === FORMAT_PREF}" data-v="${k}">${f.label}</button>`).join('');
  fm.querySelectorAll('button').forEach(b => b.onclick = () => { FORMAT_PREF = b.dataset.v; store.set('fpfc-format', FORMAT_PREF); if (S.phase === 'menu') newMatch('watch'); renderOpts(); const nb = document.getElementById(b.id); if (nb) nb.focus(); });
  const len = document.getElementById('len');
  len.innerHTML = LENS.map(([n, v]) => `<button id="len-${v}" aria-pressed="${v === MATCH_LEN}" data-v="${v}">${n}</button>`).join('');
  len.querySelectorAll('button').forEach(b => b.onclick = () => { MATCH_LEN = +b.dataset.v; store.set('fpfc-len', MATCH_LEN); renderOpts(); document.getElementById(b.id).focus(); });
  const pg = document.getElementById('pingopt');
  pg.innerHTML = [['Show ping', true], ['Hide ping', false]].map(([n, v]) => `<button id="ping-${v}" aria-pressed="${v === SHOW_PING}" data-v="${v}">${n}</button>`).join('');
  pg.querySelectorAll('button').forEach(b => b.onclick = () => { SHOW_PING = b.dataset.v === 'true'; store.set('fpfc-ping', SHOW_PING); renderOpts(); renderRoster(); document.getElementById(b.id).focus(); });
}
function openSettings(from) { settingsFrom = from; rebinding = null; renderPace(); renderOpts(); renderFileOpts(); renderBinds(); showSettingsTab('st-game'); showOverlay('settings'); }
function closeSettings() { rebinding = null; showOverlay(settingsFrom); }

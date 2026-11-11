/* Foul Play FC · js/net/roster.js
   The lobby roster, and the host matching humans to players.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ----- roster ----- */
function uniqueNumber(sk, team, uid) {   // shirt numbers stay unique within a team
  const used = new Set(Object.entries(NET ? NET.roster : {}).filter(([u, r]) => u !== uid && r.team === team && r.skin).map(([, r]) => r.skin.number));
  while (used.has(sk.number)) sk.number = sk.number % 99 + 1;
  return sk;
}
const n_ready = r => NET && NET.meta && NET.meta.status === 'lobby' ? (r.ready ? '✓ ' : '… ') : '';
const SKIN_ICON_CACHE = {};
function skinIcon(sk, team) {   // tiny head-and-shirt picture for lobby rows
  const k = JSON.stringify(sk || {}) + team; if (SKIN_ICON_CACHE[k]) return SKIN_ICON_CACHE[k];
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), s2 = sanitizeSkin(sk);
  g.fillStyle = TEAM[team].col; g.fillRect(7, 18, 18, 14); g.fillStyle = SKIN_OPTS.trim[s2.trim]; g.fillRect(7, 18, 18, 3);
  g.fillStyle = SKIN_OPTS.skinTone[s2.skinTone]; g.beginPath(); g.arc(16, 12, 7, 0, Math.PI * 2); g.fill();
  if (s2.hair !== 6) { g.fillStyle = SKIN_OPTS.hairColour[s2.hairColour]; g.beginPath(); g.arc(16, s2.hair === 7 ? 9 : 10, s2.hair === 7 ? 9 : 7, Math.PI, 0); g.fill(); }
  g.fillStyle = team === 0 ? '#0b1a2a' : '#fff'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.fillText(String(s2.number), 16, 30);
  return (SKIN_ICON_CACHE[k] = c.toDataURL());
}
function checkRematch() {
  if (!NET || !NET.isHost || S.phase !== 'over') return;
  const humans = rosterList().length, votes = Object.keys(S.rematch).length;
  updateRematchNote();
  if (S.rematch[NET.uid] && votes >= Math.ceil(humans / 2)) startRematch();
}
function startRematch() {
  for (const r of Object.values(NET.roster)) r.team = r.team === 1 ? 0 : 1;   // swap sides
  S.rematch = {}; NET.meta.status = 'playing';
  start('online'); S.net = 'host'; rosterChanged();
}
function updateRematchNote() {
  const el = document.getElementById('o-rematch'); if (!el) return;
  if (!S.net || !NET) { el.textContent = ''; return; }
  const humans = rosterList().length, votes = S.net === 'host' ? Object.keys(S.rematch || {}).length : ((NET.meta && NET.meta.votes) || 0);
  el.textContent = `Rematch votes: ${votes} of ${humans}. A rematch starts once at least half the players and the host vote, with sides swapped.`;
}
function rosterList() {
  return Object.entries(NET ? NET.roster : {}).map(([uid, v]) => ({ uid, name: String((v && v.name) || 'Player').slice(0, 14), team: v && v.team === 1 ? 1 : 0, joined: (v && v.joined) || 0, cls: v && CLS[v.cls] ? v.cls : 'striker', lock: !!(v && v.lock), useSkin: !!(v && v.useSkin), skin: v && v.skin, ready: !!(v && v.ready) }))
    .sort((a, b) => a.joined - b.joined || (a.uid < b.uid ? -1 : 1));
}
function colorOf(uid) { const i = rosterList().findIndex(r => r.uid === uid); return i < 0 ? 0 : i; }
// Which spots bots fill on a team: the outfield spots no person has taken (in the order people fill them), and the goalkeeper.
function botSpots(t) {
  const people = Math.min(rosterList().filter(r => r.team === t).length, HUMAN_SLOTS.length);
  return [...HUMAN_SLOTS.slice(people), 0];
}
const allReady = () => rosterList().every(r => (NET.roster[r.uid] || {}).ready);
function classChip(id, extra) {   // portrait, name and role of a character
  const C = CLS[id]; if (!C) return '';
  const R2 = ROLE_INFO[C.role] || {};
  return `<img class="lb-por" alt="" src="${classPortrait(C)}"><span class="lb-txt"><b style="color:${C.col}">${esc(C.name)}</b><small>${esc(R2.name || C.role)}${extra || ''}</small></span>`;
}
let rosterDeferred = false;
function renderRoster() {
  if (!NET) return;
  // don't rebuild the rows under an open bot picker; redraw once it closes
  const ae = document.activeElement; if (ae && ae.classList && ae.classList.contains('lb-bot-cls')) { rosterDeferred = true; return; }
  rosterDeferred = false;
  const list = rosterList(), host = NET.meta && NET.meta.host, lobby = NET.meta.status === 'lobby', picks = NET.meta.bots || [{}, {}];
  for (const t of [0, 1]) {
    const mine = list.filter(r => r.team === t);
    const rows = mine.map((r, i) => {
      const tags = [r.uid === NET.uid ? 'you' : '', r.uid === host ? 'host' : '', r.uid.startsWith('relay-') ? 'via link' : '', i >= TEAM_SIZE - 1 ? 'watching' : '', NET.muted && NET.muted.has(r.uid) ? 'muted' : '', SHOW_PING && NET.pings[r.uid] != null ? NET.pings[r.uid] + ' ms' : ''].filter(Boolean).join(' · ');
      return `<li class="lb-row${r.ready ? ' ready' : ''}" data-uid="${esc(r.uid)}" title="${r.uid === NET.uid ? 'You' : 'Click to mute or unmute their taunts'}" style="cursor:${r.uid === NET.uid ? 'default' : 'pointer'}">
        ${lobby ? `<span class="lb-ready" aria-label="${r.ready ? 'Ready' : 'Not ready'}">${r.ready ? '✓' : '…'}</span>` : ''}
        <span class="lb-who"><img class="skinicon" alt="" src="${skinIcon(r.skin, t)}"><span style="color:${HUMAN_COL[colorOf(r.uid) % HUMAN_COL.length]}">${esc(r.name)}</span>${tags ? `<small>${esc(tags)}</small>` : ''}</span>
        <span class="lb-cls">${classChip(r.cls, r.lock ? ' · locked' : '')}</span></li>`;
    });
    const bots = botSpots(t).map(i => {
      const pk = CLS[picks[t] && picks[t][i]] ? picks[t][i] : '', role = ROLE_NAMES[i] || 'Bot';
      const pickUI = NET.isHost && lobby
        ? `<select class="field lb-bot-cls" data-t="${t}" data-i="${i}" aria-label="Class for the ${esc(TEAM[t].name)} bot ${esc(role.toLowerCase())}"><option value="">Auto (line-up)</option>${CLASSES.map(C => `<option value="${C.id}"${C.id === pk ? ' selected' : ''}>${esc(C.name)}</option>`).join('')}</select>`
        : '';
      return `<li class="lb-row bot"><span class="lb-ready">⚙</span><span class="lb-who"><span>Bot</span><small>${esc(role)}</small></span><span class="lb-cls">${pk ? classChip(pk) : `<span class="lb-txt"><b>Auto</b><small>from the line-up</small></span>`}${pickUI}</span></li>`;
    });
    $('on-t' + t).innerHTML = rows.join('') + bots.join('');
  }
  document.querySelectorAll('.lb-bot-cls').forEach(sel => {
    sel.onchange = () => { const t = +sel.dataset.t, i = +sel.dataset.i; NET.meta.bots = NET.meta.bots || [{}, {}]; if (sel.value) NET.meta.bots[t][i] = sel.value; else delete NET.meta.bots[t][i]; sel.blur(); rosterChanged(); };
    sel.onblur = () => { if (rosterDeferred) setTimeout(renderRoster, 0); };
  });
  $('on-swap').disabled = !lobby;
  const me = NET.roster[NET.uid], rb = $('on-ready');
  rb.hidden = !lobby;
  if (me) { rb.textContent = me.ready ? 'Ready ✓ (click to cancel)' : "I'm ready"; rb.setAttribute('aria-pressed', me.ready ? 'true' : 'false'); }
  if (NET.isHost) {
    const waiting = list.filter(r => !(NET.roster[r.uid] || {}).ready).length, st = $('on-start');
    st.disabled = lobby && waiting > 0;
    st.textContent = !lobby ? 'Start match' : waiting ? `Waiting for ${waiting} to get ready` : 'Start match';
  }
}
function swapTeam() {
  if (!NET || NET.meta.status !== 'lobby') return;
  if (NET.isHost) { const r = NET.roster[NET.uid]; r.team = r.team === 1 ? 0 : 1; r.ready = false; rosterChanged(); }
  else if (NET.conn && NET.conn.open) NET.conn.send({ t: 'team' });
}

/* ----- host: humans follow the roster ----- */
function syncHumans() {
  if (!NET) return;
  const list = rosterList(), ids = new Set(list.map(r => r.uid));
  for (const h of S.humans.slice()) {
    if (ids.has(h.id)) continue;
    const p = S.players[h.pid]; if (p && p.human === h) p.human = null;
    S.humans.splice(S.humans.indexOf(h), 1);
    if (S.phase === 'play') feed(`${h.label} left the match`);
  }
  for (const r of list) {
    const ex = S.humans.find(h => h.id === r.uid);
    if (ex) { ex.idx = colorOf(r.uid); continue; }
    const gkSlot = S.players[r.team * TEAM_SIZE];
    const p = r.cls === 'goalkeeper' && gkSlot && !gkSlot.human ? gkSlot : HUMAN_SLOTS.map(i => S.players[r.team * TEAM_SIZE + i]).find(q => q && !q.human);
    if (!p) continue;
    const local = r.uid === NET.uid;
    const h = { id: r.uid, idx: colorOf(r.uid), label: local ? 'YOU' : r.name, team: r.team, map: local ? MAPSOLO : null, remote: !local, touch: local, pid: p.id, prev: {}, charge: 0, charging: false, lc: null };
    if (!local) h.lc = { ...(((NET.inputs[r.uid] || {}).c) || {}) };
    h.lock = !!r.lock;
    p.human = h; S.humans.push(h); setClass(p, CLS[r.cls] ? r.cls : 'striker'); refreshSynergies();
    p.skinOwner = r.uid; const rsk = r.useSkin && NET.roster[r.uid] && NET.roster[r.uid].skin; applySkin(p, rsk ? sanitizeSkin(rsk) : null);
    if (S.phase === 'play' && S.clock < 178) feed(`${r.name} joined the ${TEAM[r.team].name}`);
  }
}

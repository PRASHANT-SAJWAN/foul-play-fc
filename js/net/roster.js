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
function renderRoster() {
  if (!NET) return;
  const list = rosterList(), host = NET.meta && NET.meta.host;
  for (const t of [0, 1]) {
    const mine = list.filter(r => r.team === t);
    const rows = mine.map((r, i) => `<li data-uid="${esc(r.uid)}" title="${r.uid === NET.uid ? 'You' : 'Click to mute or unmute their taunts'}" style="color:${HUMAN_COL[colorOf(r.uid) % HUMAN_COL.length]};cursor:${r.uid === NET.uid ? 'default' : 'pointer'}"><img class="skinicon" alt="" src="${skinIcon(r.skin, t)}">${n_ready(r)}${esc(r.name)}${r.cls && CLS[r.cls] ? ` <span style="color:${CLS[r.cls].col}">· ${CLS[r.cls].name}${r.lock ? ' (locked)' : ''}</span>` : ''}${NET.muted && NET.muted.has(r.uid) ? ' · muted' : ''}${r.uid === host ? ' · host' : ''}${r.uid === NET.uid ? ' (you)' : ''}${r.uid.startsWith('relay-') ? ' · via link' : ''}${i >= TEAM_SIZE - 1 ? ' · watching' : ''}${SHOW_PING && NET.pings[r.uid] != null ? ' · ' + NET.pings[r.uid] + ' ms' : ''}</li>`);
    $('on-t' + t).innerHTML = rows.join('') + '<li class="bot">Bot</li>'.repeat(Math.max(0, TEAM_SIZE - 1 - mine.length)) + '<li class="bot">Bot · goalkeeper</li>';
  }
  $('on-swap').disabled = NET.meta.status !== 'lobby';
  const me = NET.roster[NET.uid], rb = $('on-ready');
  rb.hidden = NET.isHost || NET.meta.status !== 'lobby';
  if (me) rb.textContent = me.ready ? 'Ready ✓' : "I'm ready";
  if (NET.isHost) { const waiting = rosterList().filter(r => r.uid !== NET.uid && !(NET.roster[r.uid] || {}).ready).length; $('on-start').textContent = waiting ? `Start anyway (${waiting} not ready)` : 'Start match'; }
}
function swapTeam() {
  if (!NET || NET.meta.status !== 'lobby') return;
  if (NET.isHost) { const r = NET.roster[NET.uid]; r.team = r.team === 1 ? 0 : 1; rosterChanged(); }
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

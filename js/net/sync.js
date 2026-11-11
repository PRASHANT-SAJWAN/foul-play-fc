/* Foul Play FC · js/net/sync.js
   Snapshots from the host and inputs from players.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ----- host: send the game state ----- */
function sendSnap(force) {
  if (!NET || !NET.isHost) return;
  const now = performance.now(); if (!force && now - NET.lastSnap < 50) return; NET.lastSnap = now;
  if (!Object.keys(NET.conns).length) return;
  const b = S.ball;
  const s = { ph: S.phase, fm: FORMAT, tm: teamsSnap(), pc: PACE, pg: NET.pings, sc: S.score, cl: r1(S.clock), pz: r1(S.pause), pm: S.pauseMsg || '', ps: S.pauseSub || '', ex: r2(S.excite), sh: r1(S.shake),
    spk: S.setPiece ? [S.setPiece.team, S.setPiece.taker.id, r1(S.setPiece.t), S.setPiece.type, r1(S.setPiece.aim.y), r1(S.setPiece.aim.z), S.setPiece.prep, S.setPiece.minT, S.setPiece.offX == null ? -1 : r1(S.setPiece.offX), S.setPiece.view === 'side' ? 1 : 0] : 0,
    ch: S.chants.map(c => [c.id, c.kind, c.text, r1(c.x), r1(c.life)]),
    mu: MUT_LIST.map(([k]) => MUT[k] ? 1 : 0),
    fx: S.fxq.filter(e => S.time - e.t < 2).map(e => [e.id, e.type, e.pid, r1(e.x), r1(e.y), e.team != null ? e.team : -1, e.side != null ? e.side : -1]),
    bu: S.bubbles.map(u => [u.pid, u.text, r1(u.life)]),
    cr: S.crowd ? [r2(S.crowd.support), S.crowd.op.map(o => CROWD_CATS.map(([k]) => Math.round(o[k]))), S.crowd.banners.map(x => [x.id, x.text, x.team, x.cat, r1(x.life), r1(x.x)]), S.crowd.press ? S.crowd.press.team : -1] : 0,
    bo: S.bounty ? [S.bounty.pid, S.bounty.kind, r1(S.bounty.t)] : 0, gg: S.golden ? 1 : 0,
    so: S.shoot ? [S.shoot.goals, S.shoot.taken, S.shoot.done ? S.shoot.winner : -1] : 0,
    sm: S.smokes.map(z => [r1(z.x), r1(z.y), z.r, r1(z.ttl)]), pu: S.puddles.map(g => [r1(g.x), r1(g.y), r1(g.ttl)]),
    an: anomSnap(),
    zn: (S.zones || []).map(z => ({ type: z.type, x: r1(z.x), y: r1(z.y), r: z.r, ttl: r1(z.ttl), team: z.team, t: r1(z.t), mets: z.mets ? z.mets.map(m => ({ x: r1(m.x), y: r1(m.y), t: r2(m.t) })) : undefined })),
    wl: (S.walls || []).map(w => [r1(w.x1), r1(w.y1), r1(w.x2), r1(w.y2), r1(w.ttl), w.team]),
    pj: (S.projs || []).map(q => [q.type, r1(q.x), r1(q.y), r1(q.z), Math.round(q.vx || 0), Math.round(q.vy || 0)]),
    dx: S.decoys.map(d => [d.ball ? 1 : 0, d.solid ? 1 : 0]), sy: S.syn || [[], []],
    tc: S.teamCd ? S.teamCd.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r1(v - S.time)]))) : 0,
    de: S.decoys.map(d => [r1(d.x), r1(d.y), d.team, r1(d.run), d.src]), mb: r1(S.megaBall),
    p: S.players.map(p => [r1(p.x), r1(p.y), r2(p.face), Math.round(p.vx), Math.round(p.vy), Math.round(p.hp), r1(p.stun), r1(p.ko), Math.ceil(p.sentOff), p.yellows, p.pop, p.hype,
      p.items.bat, p.items.flash, p.items.banana, p.blind, r1(p.blindT), r1(p.foulCd), p.target ? p.target.id : -1, p.human ? p.human.id : '', r1(p.hitT), r1(p.charge), Math.round(p.karma), p.sprinting ? 1 : 0, p.stats.caught, p.dive > 0 || p.diveDown > 0 ? (p.diveDir || 1) : 0, r1(p.stamina), Math.round(p.staminaMax), Math.round(p.mood), animIdx(p.anim), r1(p.animT), [p.fx.rocket || 0, r1(p.fx.magnet || 0), r1(p.fx.shield || 0), r1(p.fx.megaphone || 0)], p.items.glue, p.items.smoke, p.items.whistle, p.items.decoy, THROWABLES.indexOf(p.throwSel), r1(p.slowT || 0), r1(p.freezeT || 0), Math.round(p.injury), p.skinOwner || '', p.goneWhy || '', r1(p.iceT || 0), r1(p.heatT || 0), r1(p.z || 0), p.carry == null ? -1 : p.carry, r2(p.slide || 0), r2(p.slideA || 0), CLASS_IDS.indexOf(p.cls), (p.cd || [0, 0, 0]).map(r1), Math.floor(p.ult || 0), Object.fromEntries(Object.entries(p.bf || {}).map(([k, v]) => [k, r1(v)])), p.stk || 0, p.items.sling || 0, p.items.blaster || 0, p.items.sword || 0, FIELD_ITEMS.indexOf(p.benchItem)]),
    r: S.refs.map(r => [r1(r.x), r1(r.y), r2(r.face), r1(r.blind), r.card ? (r.card.red ? 2 : 1) : 0, r1(r.run), r1(r.gone || 0), r1(r.z || 0), r.carriedBy == null ? -1 : r.carriedBy, r.fly ? 1 : 0, Math.round(r.range), r2(r.fov)]),
    b: [r1(b.x), r1(b.y), r1(b.z), b.owner ? b.owner.id : -1, r1(b.spin), Math.round(b.vx || 0), Math.round(b.vy || 0), Math.round(b.vz || 0), b.trail || ''],
    it: S.items.map(i => [i.type, r1(i.x), r1(i.y), r1(i.z), i.landed ? 1 : 0, r1(i.age), i.for ? i.for.id : -1]),
    bn: S.bananas.map(n => [r1(n.x), r1(n.y)]),
    fd: S.feed.slice(0, 4).map(f => [f.text, f.col, r1(f.t)]),
    tx: S.texts.map(t => [r1(t.x), r1(t.y), r1(t.z), t.text, t.col, r1(t.life)]) };
  if (S.phase === 'over') s.st = S.players.map(p => [p.stats.goals, p.stats.assists, p.stats.tackles, p.stats.fouls, p.stats.caught, p.stats.saves]);
  broadcast({ t: 'state', s });
}
/* ----- player: draw snapshots, send inputs ----- */
const tagCache = {};
function humanTag(uid) {
  if (!uid || !NET) return null;
  const r = NET.roster[uid], t = tagCache[uid] || (tagCache[uid] = { id: uid });
  t.idx = colorOf(uid); t.local = uid === NET.uid; t.label = t.local ? 'YOU' : (r ? String(r.name).slice(0, 14) : 'Player');
  t.charging = t.local && NET.charging; t.charge = NET.charge; t.chargeKind = t.local ? NET.chargeKind : null;
  return t;
}
function applySnap(s) {
  if (!s || !NET) return;
  if (s.tm) applyTeamsSnap(s.tm);
  if (s.fm && s.fm !== FORMAT) {   // the host plays a different format: rebuild the pitch and teams to match
    applyFormat(s.fm); newMatch('client'); S.humans = [];
    for (const p of S.players) p.snap = false; for (const r of S.refs) r.snap = false; S.ball.snap = false;
  }
  NET.pc = +s.pc || 1;
  MUT = {}; (s.mu || []).forEach((v, i) => { if (MUT_LIST[i]) MUT[MUT_LIST[i][0]] = !!v; });
  S.bubbles = (s.bu || []).map(u => ({ pid: u[0], text: u[1], life: u[2] }));
  if (s.cr) {
    S.crowd = S.crowd || { op: [newOpinion(), newOpinion()], banners: [] };
    S.crowd.support = s.cr[0]; s.cr[1].forEach((arr, t) => CROWD_CATS.forEach(([k], j) => { S.crowd.op[t][k] = arr[j]; }));
    S.crowd.banners = s.cr[2].map(x => ({ id: x[0], text: x[1], team: x[2], cat: x[3], life: x[4], x: x[5] })); S.crowd.press = s.cr[3] >= 0 ? { team: s.cr[3], t: 1 } : null;
  }
  S.bounty = s.bo ? { pid: s.bo[0], kind: s.bo[1], t: s.bo[2] } : null; S.golden = !!s.gg;
  S.shoot = s.so ? { goals: s.so[0], taken: s.so[1], done: s.so[2] >= 0, winner: s.so[2] } : null;
  S.smokes = (s.sm || []).map(z => ({ x: z[0], y: z[1], r: z[2], ttl: z[3] })); S.puddles = (s.pu || []).map(g => ({ x: g[0], y: g[1], ttl: g[2] }));
  S.decoys = (s.de || []).map(d => ({ x: d[0], y: d[1], team: d[2], run: d[3], src: d[4] })); S.megaBall = +s.mb || 0; S.an = s.an || newAnomState();
  S.zones = s.zn || []; S.walls = (s.wl || []).map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], ttl: a[4], team: a[5] })); S.projs = (s.pj || []).map(a => ({ type: a[0], x: a[1], y: a[2], z: a[3], vx: a[4], vy: a[5] }));
  (s.dx || []).forEach((f, i) => { if (S.decoys[i]) { S.decoys[i].ball = !!f[0]; S.decoys[i].solid = !!f[1]; } }); S.syn = s.sy || [[], []];
  S.teamCd = s.tc ? s.tc.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v + S.time]))) : [{}, {}];
  for (const e of (s.fx || [])) if (NET.lastFx == null || e[0] > NET.lastFx) { if (NET.lastFx != null) playFx({ id: e[0], type: e[1], pid: e[2], x: e[3], y: e[4], team: e[5], side: e[6], t: S.time }, false); NET.lastFx = e[0]; } NET.pings = s.pg || {};
  S.score = s.sc || [0, 0]; S.clock = +s.cl || 0; S.pause = +s.pz || 0; S.pauseSub = s.ps || ''; S.excite = +s.ex || 0;
  const pm = s.pm || '';
  if (pm !== NET.lastPm) { NET.lastPm = pm; if (pm && S.pause > 0) { whistle(1); if (pm === 'GOAL!') S.shake = 6; } }
  S.pauseMsg = pm; S.shake = Math.max(S.shake, +s.sh || 0);
  (s.p || []).forEach((a, i) => {
    const p = S.players[i]; if (!p || !a) return;
    p.tx = a[0]; p.ty = a[1];
    if (!p.snap || Math.hypot(p.tx - p.x, p.ty - p.y) > 120) { p.x = p.tx; p.y = p.ty; p.snap = true; }
    p.face = a[2]; p.vx = a[3]; p.vy = a[4]; p.hp = a[5]; p.stun = a[6]; p.ko = a[7]; p.sentOff = a[8]; p.yellows = a[9]; p.pop = a[10]; p.hype = a[11];
    p.items.bat = a[12]; p.items.flash = a[13]; p.items.banana = a[14]; p.blind = a[15]; p.blindT = a[16]; p.foulCd = a[17];
    p.target = a[18] >= 0 ? S.players[a[18]] : null; p.human = humanTag(a[19]); p.hitT = a[20]; p.charge = +a[21] || 0; p.karma = +a[22] || 0; p.sprinting = !!a[23]; p.stats.caught = +a[24] || 0; p.diveState = +a[25] || 0; p.diveDir = p.diveState;
    p.stamina = +a[26] || 0; p.staminaMax = +a[27] || 100; p.mood = +a[28] || 0; p.anim = ANIMS[a[29]] || ''; p.animT = +a[30] || 0;
    const fxa = a[31] || []; p.fx = { rocket: fxa[0] || 0, magnet: fxa[1] || 0, shield: fxa[2] || 0, megaphone: fxa[3] || 0 };
    p.items.glue = a[32] || 0; p.items.smoke = a[33] || 0; p.items.whistle = a[34] || 0; p.items.decoy = a[35] || 0; p.throwSel = THROWABLES[a[36]] || 'banana';
    p.slowT = +a[37] || 0; p.freezeT = +a[38] || 0; p.injury = +a[39] || 0; p.goneWhy = a[41] || ''; p.iceT = +a[42] || 0; p.heatT = +a[43] || 0; p.z = +a[44] || 0; p.carry = a[45] >= 0 ? a[45] : null; p.slide = +a[46] || 0; p.slideA = +a[47] || 0;
    const ci = a[48]; if (ci >= 0 && CLASS_IDS[ci] && CLASS_IDS[ci] !== p.cls) { p.cls = CLASS_IDS[ci]; applyClassLook(p); p.skinKey = null; }
    p.cd = a[49] || [0, 0, 0]; p.ult = +a[50] || 0; p.bf = a[51] || {}; p.stk = +a[52] || 0; p.items.sling = +a[53] || 0; p.items.blaster = +a[54] || 0; p.items.sword = +a[55] || 0; p.benchItem = FIELD_ITEMS[a[56]] || null;
    const so = a[40], rsk = so && NET.roster[so] && NET.roster[so].useSkin && NET.roster[so].skin;
    if (rsk) { const key = JSON.stringify(rsk); if (p.skinKey !== key) { p.skinKey = key; applySkin(p, sanitizeSkin(rsk)); } }
  });
  (s.r || []).forEach((a, i) => {
    const r = S.refs[i]; if (!r || !a) return;
    r.tx = a[0]; r.ty = a[1];
    if (!r.snap || Math.hypot(r.tx - r.x, r.ty - r.y) > 150) { r.x = r.tx; r.y = r.ty; r.snap = true; }
    r.face = a[2]; r.blind = a[3]; r.card = a[4] ? { red: a[4] === 2, t: 1 } : null; r.run = a[5]; r.gone = +a[6] || 0; r.z = +a[7] || 0; r.carriedBy = a[8] >= 0 ? a[8] : null; r.flying = !!a[9]; if (a[10] > 0) r.range = +a[10]; if (a[11] > 0) r.fov = +a[11];
  });
  const b = S.ball, bb = s.b || [W / 2, H / 2, 0, -1, 0];
  b.tx = bb[0]; b.ty = bb[1]; b.tz = bb[2]; b.owner = bb[3] >= 0 ? S.players[bb[3]] : null; b.spin = bb[4]; b.trail = bb[8] || null; b.vx = +bb[5] || 0; b.vy = +bb[6] || 0; b.vz = +bb[7] || 0;
  if (!b.snap || Math.hypot(b.tx - b.x, b.ty - b.y) > 150) { b.x = b.tx; b.y = b.ty; b.z = b.tz; b.snap = true; }
  S.items = (s.it || []).map(a => ({ type: a[0], x: a[1], y: a[2], z: a[3], landed: !!a[4], age: a[5], for: S.players[a[6]] || null }));
  S.bananas = (s.bn || []).map(a => ({ x: a[0], y: a[1] }));
  S.feed = (s.fd || []).map(a => ({ text: a[0], col: a[1], t: a[2] }));
  S.texts = (s.tx || []).map(a => ({ x: a[0], y: a[1], z: a[2], text: a[3], col: a[4], life: a[5] }));
  S.setPiece = s.spk ? { team: s.spk[0], taker: S.players[s.spk[1]], t: s.spk[2], type: s.spk[3], aim: { y: +s.spk[4] || H / 2, z: +s.spk[5] || 12 }, prep: +s.spk[6] || 15, minT: +s.spk[7] || 3, offX: s.spk[8] >= 0 ? s.spk[8] : null, view: s.spk[9] ? 'side' : 'front', wall: [] } : null;
  const ch = s.ch || [];
  if (NET.lastCh == null) NET.lastCh = Math.max(0, ...ch.map(c => c[0]));
  for (const c of ch) if (c[0] > NET.lastCh) { NET.lastCh = c[0]; crowdSound(c[1]); }
  S.chants = ch.map(c => ({ id: c[0], kind: c[1], text: c[2], x: c[3], life: c[4] }));
  const me = S.players.find(p => p.human && p.human.local);
  const inH = NET.inH || {};
  S.humans = me ? [{ idx: me.human.idx, label: 'YOU', pid: me.id, map: MAPSOLO, team: me.team, charging: NET.charging, charge: NET.charge, prev: {} }] : [];
  if (s.st) s.st.forEach((a, i) => { const p = S.players[i]; if (p && a) Object.assign(p.stats, { goals: a[0], assists: a[1], tackles: a[2], fouls: a[3], caught: a[4], saves: a[5] }); });
  if (s.ph === 'over' && S.phase !== 'over') { S.phase = 'over'; whistle(3, 0.3); showResults(); }
  else if (s.ph === 'play' && S.phase === 'over') { S.phase = 'play'; showOverlay(null); }
  updateTouch();
}
function clientUpdate(dt) {
  S.time += dt; S.shake = Math.max(0, S.shake - dt * 20);
  for (const f of S.feed) f.t += dt;
  for (const t of S.texts) { t.life -= dt; t.z += 30 * dt; }
  for (const c of S.chants) c.life -= dt;
  if (crowdGain && AC) crowdGain.gain.setTargetAtTime(muted ? 0 : 0.02 + Math.min(1.2, S.excite) * 0.1, AC.currentTime, 0.3);
  const k = Math.min(1, dt * 14), sim = dt * (NET ? NET.pc : 1);
  for (const p of S.players) if (p.snap) {
    if (p.stun <= 0 && p.ko <= 0) { p.tx += p.vx * sim; p.ty += p.vy * sim; }
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.run += Math.hypot(p.vx, p.vy) * sim * 0.09;
  }
  for (const r of S.refs) if (r.snap) { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; }
  const b = S.ball; if (b.snap) { b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k; b.z += (b.tz - b.z) * k; }
  if (S.pause > 0) S.pause = Math.max(0, S.pause - dt);
  sendInput(dt);
}
function sendInput(dt) {
  const n = NET; if (!n || !n.conn || !n.conn.open || S.phase !== 'play') return;
  const h = n.inH || (n.inH = { map: MAPSOLO, prev: n.prev, touch: true, charge: 0, charging: false, idx: 0 });
  h.map = MAPSOLO; const meP = S.players.find(p => p.human && p.human.local); h.pid = meP ? meP.id : -1;
  const inp = localInput(h, dt);
  n.charge = h.charge; n.charging = h.charging;
  for (const a of ['pass', 'lpass', 'th', 'passR', 'lpassR', 'thR', 'view', 'foul', 'blind', 'item', 'sp', 'sr', 's1', 's2', 's3', 'ul']) if (inp[a]) n.cnt[a] = (n.cnt[a] || 0) + 1;
  if (inp.taunt >= 0) { n.cnt.taunt = (n.cnt.taunt || 0) + 1; n.tw = inp.taunt; }
  if (inp.sr || inp.passR || inp.lpassR || inp.thR) n.pw = r2(inp.power);
  n.chargeKind = h.chargeKind;
  const msg = { t: 'in', ix: r2(inp.ix), iy: r2(inp.iy), c: { ...n.cnt }, pw: n.pw, run: inp.sprint ? 1 : 0, tw: n.tw || 0 };
  const key = JSON.stringify(msg), now = performance.now();
  if (key !== n.sent && now - n.sentAt > 30) { n.sent = key; n.sentAt = now; try { n.conn.send(msg); } catch (e) {} }
}

$('m-online').onclick = openOnline;
$('on-create').onclick = () => { initAudio(); createRoom(); };
$('on-join').onclick = () => { initAudio(); joinRoom(); };
$('on-code').addEventListener('keydown', e => { if (e.key === 'Enter') { initAudio(); joinRoom(); } });
$('on-swap').onclick = swapTeam;
$('on-start').onclick = startOnline;
$('on-leave').onclick = () => { leaveRoom(); onStatus('You left the room.'); };
$('on-back').onclick = () => { leaveRoom(); onStatus(''); showOverlay('menu'); };
$('on-relay-go').onclick = connectExternalRelay;
$('on-relay-url').addEventListener('keydown', e => { if (e.key === 'Enter') connectExternalRelay(); });
$('on-invite-copy').onclick = () => {
  const url = inviteLink(); if (!url) return;
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => onStatus('Backup link copied. Send it with the room code to anyone who can\'t join directly.'), () => { $('on-invite-url').select(); onStatus('Select the link and copy it.'); });
  else { $('on-invite-url').select(); onStatus('Select the link and copy it.'); }
};
// Opened from an invite link (…/?room=ABCDE): go straight to the online screen with the code filled in.
{
  const qs = new URLSearchParams(location.search), q = qs.get('room'), rh = qs.get('relay');
  if (q && /^[A-Za-z0-9]{5}$/.test(q)) {
    if (rh && RELAY_HOST_RE.test(rh)) PENDING_RELAY = { code: q.toUpperCase(), base: relayBaseFromHost(rh) };
    setTimeout(() => { openOnline(); $('on-code').value = q.toUpperCase(); onStatus(`You're invited to room ${q.toUpperCase()}${PENDING_RELAY ? ', with a backup relay if a direct connection fails' : ''}. Enter your name and choose Join room.`); }, 0);
  }
}
$('on-copy').onclick = () => {
  if (!NET) return; const code = NET.code;
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => onStatus('Code copied.'), () => onStatus('Copy failed. The code is ' + code + '.'));
  else onStatus('The code is ' + code + '.');
};

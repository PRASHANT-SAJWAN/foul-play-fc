/* Foul Play FC · party.js
   Party systems: mutators, big-moment effects, replays, crowd opinion, bounties, power-ups and field items, the bench, taunts, golden goal and shoot-outs, spectators, awards and skins.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ======================================================================
   Match systems: power-ups and throwables, crowd opinion, taunts, big-moment
   effects, replays, grudges, bounties, golden goal and shoot-outs, spectators,
   party mutators, awards, skins and the roles catalog data.
   ====================================================================== */

/* ---------- party mutators ---------- */
const MUT_LIST = [['bigHead', 'Big heads'], ['bananaRain', 'Banana rain'], ['noRef', 'No referee'], ['lowGrav', 'Low gravity'], ['sprint', 'Super sprint'], ['noPowerups', 'Classic gifts only']];
let MUT_PREF = (() => { const v = store.get('fpfc-mut'); return v && typeof v === 'object' ? v : {}; })();
let MUT = {};
const GRAV = () => MUT.lowGrav ? 450 : 900;
function applyMutators() { MUT = {}; for (const [k] of MUT_LIST) MUT[k] = !!MUT_PREF[k]; }

/* ---------- small helpers ---------- */
function a0Anim(p, anim, t) { if (p) { p.anim = anim; p.animT = t; } }
const ANIMS = ['', 'punch', 'kick', 'swing', 'shoot', 'fall', 'plead', 'facepalm', 'cel0', 'cel1', 'cel2', 'cel3', 'cel4', 'cel5', 'shrug', 'point', 'sorry', 'wave', 'chest', 'thumbs'];
const animIdx = a => Math.max(0, ANIMS.indexOf(a || ''));

/* ---------- big-moment effects ---------- */
// Comic-book hit words that pop over whoever takes a hit; sent to every player like the other effects.
const WHACKS = [['SLASH!', '#d9e2ec'], ['WHACK!', '#ffd23f'], ['POW!', '#ff5a5a'], ['BAM!', '#ff9a3d'], ['THWACK!', '#7df0ff'], ['BONK!', '#ffcf5a'], ['SMACK!', '#ff7ad9'], ['CRUNCH!', '#b6ff6b'], ['WHAM!', '#c9a0ff']];
function whack(t, kind) {
  const idx = kind === 'sword' ? 0 : kind === 'bat' ? 5 : kind === 'kick' ? pick([2, 8]) : kind === 'slide' ? 7 : kind === 'tackle' ? pick([3, 6]) : kind === 'skill' ? pick([2, 3, 4, 8]) : pick([1, 3, 4, 6]);
  fxEvent('whack', t, { x: t.x, y: t.y, side: idx, team: kind === 'sword' || kind === 'bat' || kind === 'kick' || kind === 'ko' ? 1 : 0 });
}
let FX_ID = 0;
// Every machine plays the same effect for the same event: the host records it, players get it in snapshots.
function fxEvent(type, p, extra) {
  const ev = Object.assign({ id: ++FX_ID, type, pid: p ? p.id : -1, x: p ? p.x : S.ball.x, y: p ? p.y : S.ball.y, t: S.time }, extra || {});
  S.fxq.push(ev); if (S.fxq.length > 24) S.fxq.shift();
  playFx(ev, true);
}
const CAMFX = { zoom: 0, zoomT: 0, orbit: null, cut: null };
function playFx(ev, host) {
  const p = S.players[ev.pid];
  if (ev.type === 'whack') { const w = WHACKS[ev.side] || WHACKS[0]; (S.whacks || (S.whacks = [])).push({ x: ev.x, y: ev.y, t: 0, word: w[0], col: w[1], rot: rand(-0.35, 0.35), big: ev.team === 1 }); if (S.whacks.length > 14) S.whacks.shift(); return; }
  if (ev.type === 'bat') { sfx('crack'); if (host) S.slowmo = { t: 0.25, k: 0.3 }; if (p) floatText(p, 'BONK!', '#ffcf5a'); }
  if (ev.type === 'kick') { sfx('whoosh'); CAMFX.zoom = 2; CAMFX.zoomT = 0.3; }
  if (ev.type === 'ko') { sfx('bell'); CAMFX.zoom = 4; CAMFX.zoomT = 0.5; }
  if (ev.type === 'power') { sfx('whoosh'); CAMFX.zoom = 3; CAMFX.zoomT = 0.3; }
  if (ev.type === 'save') { sfx('slap'); if (host) S.slowmo = { t: 0.4, k: 0.35 }; }
  if (ev.type === 'card') { CAMFX.cut = { x: ev.x, y: ev.y, t: 0.6 }; }
  if (ev.type === 'goal' || ev.type === 'owngoal') {
    sfx(ev.type === 'goal' ? 'horn' : 'laugh');
    const gx = ev.side === 1 ? W + 10 : -10, cols = ev.type === 'goal' ? [TEAM[ev.team].col, '#ffffff', '#ffd23f'] : ['#bbbbbb', '#ffffff'];
    for (let i = 0; i < 70; i++) S.parts.push({ x: gx + rand(-30, 30), y: H / 2 + rand(-GOAL_HALF, GOAL_HALF), z: rand(10, 50), vx: rand(-160, 160), vy: rand(-160, 160), vz: rand(200, 420), life: rand(1.2, 2.2), col: pick(cols), size: rand(2, 3.5) });
    if (p) CAMFX.orbit = { x: p.x, y: p.y, t: 1.6, a: 0 };
    startReplay(ev.t);
  }
}
function fxTick(dt) {
  const b = S.ball; S.fires = S.fires || []; S.whacks = S.whacks || [];
  // power shots leave a trail of fire on the grass
  if (b && b.trail && !b.owner && Math.hypot(b.vx || 0, b.vy || 0) > 260) {
    const lx = b.fireX, ly = b.fireY;
    if (lx == null) { b.fireX = b.x; b.fireY = b.y; }
    else { const d = Math.hypot(b.x - lx, b.y - ly), n = Math.min(8, Math.floor(d / 9));   // a flame every 9 units of travel
      if (n > 0) { for (let i = 1; i <= n; i++) S.fires.push({ x: lx + (b.x - lx) * i / n + rand(-4, 4), y: ly + (b.y - ly) * i / n + rand(-4, 4), t: 0, life: rand(0.9, 1.4), r: rand(6, 10), ph: rand(0, 6) }); b.fireX = b.x; b.fireY = b.y; } }
  } else if (b) b.fireX = b.fireY = null;
  for (const f of S.fires) f.t += dt;
  S.fires = S.fires.filter(f => f.t < f.life); if (S.fires.length > 260) S.fires.splice(0, S.fires.length - 260);
  for (const w of S.whacks) w.t += dt;
  S.whacks = S.whacks.filter(w => w.t < 0.8);
  for (const h of S.humans || []) { if (h.charging || h.remote) { h.lineT = 0.35; } else if (h.lineT > 0) h.lineT -= dt; }
}
function updateCamFx(dt) {
  CAMFX.zoomT = Math.max(0, CAMFX.zoomT - dt); if (CAMFX.zoomT <= 0) CAMFX.zoom *= Math.exp(-8 * dt);
  if (CAMFX.orbit) { CAMFX.orbit.t -= dt; CAMFX.orbit.a += dt * 0.55; if (CAMFX.orbit.t <= 0) CAMFX.orbit = null; }
  if (CAMFX.cut) { CAMFX.cut.t -= dt; if (CAMFX.cut.t <= 0) CAMFX.cut = null; }
}
function sfx(kind) {
  if (!AC || muted) return;
  const t0 = AC.currentTime, g = AC.createGain(); g.connect(AC.destination);
  const tone = (type, f0, f1, len, vol) => { const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + len); const gg = AC.createGain(); gg.gain.setValueAtTime(vol, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + len); o.connect(gg).connect(AC.destination); o.start(t0); o.stop(t0 + len); };
  const noise = (len, vol, f, q = 1) => { if (!NOISE) return; const s = AC.createBufferSource(); s.buffer = NOISE; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const gg = AC.createGain(); gg.gain.setValueAtTime(vol, t0); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + len); s.connect(bp).connect(gg).connect(AC.destination); s.start(t0, Math.random(), len); };
  if (kind === 'bell') { tone('sine', 1320, 1300, 1.2, 0.18); tone('sine', 2640, 2600, 0.6, 0.06); }
  if (kind === 'crack') { noise(0.12, 0.5, 1800, 0.7); tone('square', 180, 60, 0.12, 0.15); }
  if (kind === 'whoosh') noise(0.35, 0.25, 900, 0.6);
  if (kind === 'slap') { noise(0.08, 0.4, 2500, 1.2); tone('sine', 220, 110, 0.1, 0.12); }
  if (kind === 'horn') { tone('sawtooth', 233, 233, 1.0, 0.09); tone('sawtooth', 294, 294, 1.0, 0.07); }
  if (kind === 'laugh') { for (let i = 0; i < 5; i++) { const o = AC.createOscillator(), gg = AC.createGain(), st = t0 + i * 0.13; o.frequency.setValueAtTime(320 - i * 20, st); gg.gain.setValueAtTime(0.0001, st); gg.gain.exponentialRampToValueAtTime(0.06, st + 0.03); gg.gain.exponentialRampToValueAtTime(0.0001, st + 0.11); o.connect(gg).connect(AC.destination); o.start(st); o.stop(st + 0.12); } }
  if (kind === 'pop') tone('sine', 900, 300, 0.12, 0.12);
}

/* ---------- goal replay: every machine records its own recent frames ---------- */
const REPLAY = { buf: [], active: null };
function recordFrame() {
  if (S.phase !== 'play' || REPLAY.active || S.pause > 0) return;
  REPLAY.buf.push({ t: S.time, p: S.players.map(p => [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff]), b: [S.ball.x, S.ball.y, S.ball.z, S.ball.spin, S.ball.owner ? S.ball.owner.id : -1], r: S.refs.map(r => [r.x, r.y, r.face, r.run, r.blind]) });
  while (REPLAY.buf.length && S.time - REPLAY.buf[0].t > 6.5) REPLAY.buf.shift();
}
function startReplay(goalT) {
  const frames = REPLAY.buf.filter(f => f.t >= goalT - 4.5 && f.t <= goalT + 0.1);
  if (frames.length < 10) return;
  REPLAY.active = { frames, t: -1.3, dur: frames[frames.length - 1].t - frames[0].t, t0: frames[0].t };   // 1.3 s of celebration first
}
let REPLAY_SAVED = null;
function replayFrame(dt) {
  const R = REPLAY.active; if (!R) return null;
  R.t += dt * 0.8;
  if (R.t < 0) return null;
  if (R.t > R.dur || S.pause <= 0) { REPLAY.active = null; REPLAY.buf = []; return null; }
  const target = R.t0 + R.t; let f = R.frames[0];
  for (const fr of R.frames) { if (fr.t <= target) f = fr; else break; }
  return f;
}
function applyReplayFrame(f) {   // swap the replay positions in for drawing, keep the real ones to restore
  REPLAY_SAVED = { p: S.players.map(p => [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff]), b: [S.ball.x, S.ball.y, S.ball.z, S.ball.spin, S.ball.owner], r: S.refs.map(r => [r.x, r.y, r.face, r.run, r.blind]) };
  f.p.forEach((a, i) => { const p = S.players[i]; if (p) [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff] = a; });
  [S.ball.x, S.ball.y, S.ball.z, S.ball.spin] = f.b; S.ball.owner = f.b[4] >= 0 ? S.players[f.b[4]] : null;
  f.r.forEach((a, i) => { const r = S.refs[i]; if (r) [r.x, r.y, r.face, r.run, r.blind] = a; });
}
function restoreReplayFrame() {
  const s = REPLAY_SAVED; if (!s) return; REPLAY_SAVED = null;
  s.p.forEach((a, i) => { const p = S.players[i]; if (p) [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff] = a; });
  [S.ball.x, S.ball.y, S.ball.z, S.ball.spin, S.ball.owner] = s.b;
  s.r.forEach((a, i) => { const r = S.refs[i]; if (r) [r.x, r.y, r.face, r.run, r.blind] = a; });
}

/* ---------- crowd opinion meter ---------- */
const CROWD_CATS = [['fun', 'Fun', '#ffb36b'], ['perf', 'Performance', '#7dff9b'], ['noob', 'Noobie-ness', '#c9a0ff'], ['symp', 'Sympathy', '#9fd8ff'], ['vill', 'Villainy', '#ff6b80'], ['drama', 'Drama', '#ffd23f']];
const newOpinion = () => ({ fun: 10, perf: 10, noob: 0, symp: 0, vill: 0, drama: 0 });
function crowdEvent(team, d) {
  if (!S.crowd || team == null) return;
  const o = S.crowd.op[team];
  for (const k in d) o[k] = clamp(o[k] + d[k], 0, 100);
}
const crowdScore = o => o.fun * 0.25 + o.perf * 0.3 + o.symp * 0.2 + o.vill * 0.1 + o.drama * 0.15 - o.noob * 0.15;
const topCat = o => CROWD_CATS.reduce((best, [k]) => o[k] > o[best] ? k : best, 'fun');
function crowdPressure(team) { return S.crowd && S.crowd.press && S.crowd.press.team === team && S.crowd.press.t > 0 ? 1.1 : 1; }
const CHANTS = {
  fun: ['OLÉ!', 'DO IT AGAIN!', 'CHAOS! CHAOS!'], perf: ['CLASS!', 'WORLD CLASS!', 'WHAT A TEAM!'], noob: ['WHO ARE YA?', 'MY NAN COULD SCORE THAT', 'SUNDAY LEAGUE!'],
  symp: ['KEEP GOING!', 'HEADS UP!', 'WE BELIEVE!'], vill: ['BOOO!', 'CHEAT! CHEAT!', 'OFF! OFF!'], drama: ['HERE WE GO!', 'OH MY DAYS!', 'HOLD ON!']
};
const BANNERS = {
  fun: ['WE CAME FOR THE CHAOS', 'BANANA SEASON', '{N} = ENTERTAINMENT'], perf: ['{T} = FOOTBALL', '{N} FOR CAPTAIN', 'CLINICAL {T}'],
  noob: ['SUNDAY LEAGUE', '{N} FOUND THE BALL', 'IS THIS YOUR FIRST GAME {N}?'], symp: ['WE BELIEVE', 'NEVER GIVE UP {T}', 'HEADS UP {N}'],
  vill: ['REF NEEDS GLASSES', '{N}: WANTED', 'GUILTY {T}'], drama: ['LAST MINUTE MAGIC', 'HEART ATTACK FC', 'WHAT A GAME']
};
let BANNER_ID = 0;
function updateCrowdOpinion(dt) {
  const C = S.crowd; if (!C) return;
  for (const o of C.op) for (const [k] of CROWD_CATS) o[k] *= Math.exp(-dt / 45);
  const diff = S.score[0] - S.score[1];
  if (Math.abs(diff) >= 2) crowdEvent(diff > 0 ? 1 : 0, { symp: 1.5 * dt });
  if (S.clock < 30 && Math.abs(diff) <= 1 && S.mode !== 'playground') { crowdEvent(0, { drama: 2 * dt }); crowdEvent(1, { drama: 2 * dt }); }
  const target = clamp(0.5 + (crowdScore(C.op[0]) - crowdScore(C.op[1])) / 120, 0.1, 0.9);
  C.support += (target - C.support) * Math.min(1, dt * 0.8);
  if (C.press) { C.press.t -= dt; if (C.press.t <= 0) C.press = null; }
  if (!C.press && (C.support >= 0.75 || C.support <= 0.25)) { C.press = { team: C.support >= 0.75 ? 1 : 0, t: 15 }; feed(`The crowd turns on the ${TEAM[C.press.team].name}: their shots get shakier`, '#ff9a6b'); }
  C.chantT -= dt; C.bannerT -= dt;
  if (C.chantT <= 0) {
    C.chantT = rand(8, 12);
    const team = Math.random() < C.support ? 0 : 1, cat = topCat(C.op[team]), lines = CHANTS[cat];
    const kind = cat === 'vill' || cat === 'noob' ? 'boo' : cat === 'perf' || cat === 'symp' ? 'applause' : 'roar';
    cheer(kind, team === 0 ? W * 0.3 : W * 0.7, pick(lines));
  }
  if (C.bannerT <= 0) {
    C.bannerT = 20;
    const team = Math.random() < C.support ? 0 : 1, cat = topCat(C.op[team]);
    const pool = S.players.filter(p => p.team === team && onPitch(p));
    const star = (cat === 'vill' ? pool.sort((a, b) => a.karma - b.karma) : cat === 'noob' ? pool.sort((a, b) => (b.stats.fouls + b.stun) - (a.stats.fouls + a.stun)) : pool.sort((a, b) => b.pop - a.pop))[0];
    const text = pick(BANNERS[cat]).replace('{N}', (star ? star.name : TEAM[team].short).toUpperCase()).replace('{T}', TEAM[team].short);
    C.banners.push({ id: ++BANNER_ID, text, team, cat, life: 12, x: rand(W * 0.15, W * 0.85) });
    if (C.banners.length > 3) C.banners.shift();
  }
  for (let i = C.banners.length - 1; i >= 0; i--) { C.banners[i].life -= dt; if (C.banners[i].life <= 0) C.banners.splice(i, 1); }
}

/* ---------- grudges and bounties ---------- */
function noteGrudge(a, t) {
  if (!S.grudge || !a || !t || a === t) return;
  const back = S.grudge[t.id + '>' + a.id] || 0;
  if (back >= 2 && a.team !== t.team) {   // t has fouled a at least twice: this one is revenge
    addPop(a, 4); crowdEvent(a.team, { fun: 6, drama: 3 }); floatText(a, 'REVENGE!', '#ffb36b');
    if (loud(a, t)) feed(`Revenge! ${a.name} pays ${t.name} back`, '#ffb36b');
  }
  S.grudge[a.id + '>' + t.id] = (S.grudge[a.id + '>' + t.id] || 0) + 1;
}
function topGrudge(p) {   // who has fouled p the most (2+)
  let best = null, n = 1;
  for (const q of S.players) { const c = S.grudge ? S.grudge[q.id + '>' + p.id] || 0 : 0; if (c > n) { n = c; best = q; } }
  return best ? { name: best.name, n } : null;
}
function updateBounty(dt) {
  if (S.mode === 'playground' && !S.bountyOn) return;
  S.bountyT -= dt;
  if (S.bounty) { S.bounty.t -= dt; if (S.bounty.t <= 0 || !onPitch(S.players[S.bounty.pid])) S.bounty = null; }
  if (S.bountyT <= 0 && !S.bounty) {
    S.bountyT = 45;
    const pool = S.players.filter(p => onPitch(p) && !p.gk);
    const villain = S.bountyFlip = !S.bountyFlip;
    const t = villain ? pool.sort((a, b) => a.karma - b.karma)[0] : pool.sort((a, b) => b.pop - a.pop)[0];
    if (t) { S.bounty = { pid: t.id, kind: villain ? 'villain' : 'star', t: 30 }; feed(`The crowd puts a bounty on ${t.name} (${villain ? 'dirtiest player' : 'crowd favourite'}): win the ball off them for a gift`, '#ffd23f'); cheer('roar', t.x, 'BOUNTY!'); }
  }
}
function bountyCollect(p, victim) {
  if (!S.bounty || !victim || S.bounty.pid !== victim.id || p.team === victim.team) return;
  S.bounty = null; addPop(p, 10); M(p, 'bountiesCollected'); EV('bounty', p, { from: victim.name });
  feed(`${p.name} collected the bounty on ${victim.name}!`, '#ffd23f'); floatText(p, 'BOUNTY!', '#ffd23f'); throwItem(p, true);
}

/* ---------- power-ups and throwables ---------- */
// The only items that reach the pitch (from the crowd or the bench). Hurt players are more likely to get health.
const FIELD_ITEMS = ['medkit', 'ultcharge', 'sword', 'rocket', 'whistle'];
function fieldItemFor(p) {
  const pool = MUT.noPowerups ? ['medkit', 'sword', 'whistle'] : FIELD_ITEMS.slice();
  if (p && (p.hp < 55 || p.injury > 0)) pool.push('medkit', 'medkit');
  return pick(pool);
}
const POWERUPS = ['rocket', 'magnet', 'smoke', 'whistle', 'glue', 'megaball', 'shield', 'decoy', 'megaphone', 'replay'];
const THROWABLES = ['banana', 'glue', 'smoke', 'whistle', 'decoy'];
Object.assign(ITEM_LABEL, { rocket: 'pair of rocket boots', magnet: 'pair of magnet boots', smoke: 'smoke bomb', whistle: 'fake whistle', glue: 'pot of glue', megaball: 'mega ball', shield: 'shield', decoy: 'decoy', megaphone: 'megaphone', replay: 'instant replay' });
const ITEM_COL = { sword: '#d9e2ec', ultcharge: '#b98cff', sling: '#c9b48a', blaster: '#ff9f43', medkit: '#f4f4f0', bat: '#b07a3c', flash: '#ffd23f', banana: '#ffe14d', rocket: '#ff7a2f', magnet: '#e2404f', smoke: '#9aa3a8', whistle: '#d8dde0', glue: '#5ccf6a', megaball: '#ffffff', shield: '#6fc4ff', decoy: '#c9b7ff', megaphone: '#ff9fd0', replay: '#ffd23f' };
const throwCount = p => THROWABLES.reduce((s, k) => s + (p.items[k] || 0), 0);
function selectedThrowable(p) { if ((p.items[p.throwSel] || 0) > 0) return p.throwSel; return THROWABLES.find(k => (p.items[k] || 0) > 0) || 'banana'; }
function applyPowerup(p, type) {
  p.fx = p.fx || {}; M(p, 'powerups'); EV('powerup', p, { item: type });
  const say = (t, c = ITEM_COL[type]) => floatText(p, t, c);
  if (type === 'rocket') { p.fx.rocket = 3; say('ROCKET BOOTS ×3'); }
  else if (type === 'magnet') { p.fx.magnet = 8; say('MAGNET BOOTS'); }
  else if (type === 'megaball') { S.megaBall = 10; say('MEGA BALL!'); cheer('roar', p.x, 'MEGA BALL!'); }
  else if (type === 'shield') { p.fx.shield = 20; say('SHIELD'); }
  else if (type === 'megaphone') { p.fx.megaphone = 15; say('MEGAPHONE'); }
  else if (type === 'replay') instantReplay(p);
  else { p.items[type] = (p.items[type] || 0) + (type === 'glue' ? 2 : 1); p.throwSel = type; say(type.toUpperCase()); }
}
function instantReplay(p) {
  const r = S.refs[0], f = (S.recentUnseen || []).filter(u => u.a.team !== p.team && S.time - u.time < 4).pop();
  if (!r || MUT.noRef || !f) { floatText(p, 'NOTHING TO REVIEW', '#c8c8c8'); return; }
  S.recentUnseen = S.recentUnseen.filter(u => u !== f);
  feed(`${p.name} calls for an instant replay of ${f.a.name}'s foul…`, '#9fe8ff');
  if (Math.random() < 0.5) { feed('Replay: foul given!', '#ffd23f'); callFoul(f, r); }
  else { feed('Replay: no clear evidence, play on', '#9fe8ff'); cheer('boo', r.x, 'WHAT?!'); }
}
/* ---------- the bench: red-carded players sit it out, taunt, and throw items in to their team ---------- */
const BENCH_TIME = 25, BENCH_Y = () => H + 30;
const benchX = team => W / 2 + (team === 0 ? -1 : 1) * Math.min(W * 0.16, 300);
function benchSeat(p) {
  const mates = S.players.filter(q => q.team === p.team && onBench(q)), i = Math.max(0, mates.indexOf(p));
  return { x: benchX(p.team) + (i - (mates.length - 1) / 2) * 22, y: BENCH_Y() };
}
function sendToBench(p) {
  p.sentOff = BENCH_TIME; p.goneWhy = ''; p.benchItem = null; p.benchItemT = rand(3, 5); p.benchTauntT = rand(4, 8);
  p.carry = null; p.slide = 0; p.z = 0; p.vz = 0;
  const s = benchSeat(p); p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.face = -Math.PI / 2;
  feed(`${p.name} heads to the bench for ${BENCH_TIME} seconds`, '#ff9a9a');
}
function updateBench(p, dt) {
  const s = benchSeat(p); p.x = s.x; p.y = s.y; p.vx = p.vy = 0; p.dx = p.dy = 0; p.z = 0; p.face = -Math.PI / 2;
  if (!p.benchItem) {   // the kit man hands over a random field item every so often
    p.benchItemT -= dt;
    if (p.benchItemT <= 0) { p.benchItem = pick(FIELD_ITEMS); if (isLocalHuman(p)) floatText(p, `${ITEM_LABEL[p.benchItem].toUpperCase()}: ${keyLabel((BINDS[p.human.idx === 1 && S.mode.startsWith('2p') ? 1 : 0] || BINDS[0]).item)} TO THROW IT IN`, ITEM_COL[p.benchItem] || '#ffd23f'); }
  }
  if (p.human) return;
  if (p.benchItem && Math.random() < dt * 0.6) benchThrow(p);   // bots throw theirs in after a moment
  p.benchTauntT -= dt;
  if (p.benchTauntT <= 0) { p.benchTauntT = rand(6, 12); doTaunt(p, pick([0, 1, 3, 4])); }
}
// Throw the bench item onto the pitch for a team-mate: health to whoever is most hurt, anything else to the one nearest the ball.
function benchThrow(p) {
  const type = p.benchItem;
  if (!type) { if (p.human) floatText(p, 'No item yet', '#c8c8c8'); return; }
  const mates = S.players.filter(q => q.team === p.team && onPitch(q) && q.ko <= 0);
  if (!mates.length) return;
  const q = type === 'medkit' ? mates.slice().sort((a, b) => a.hp - b.hp)[0] : (mates.find(m => m.human && m.human.team === p.team && !m.human.remote) || mates.slice().sort((a, b) => dist(a, S.ball) - dist(b, S.ball))[0]);
  const tx = clamp(q.x + rand(-25, 25), 20, W - 20), ty = clamp(q.y + rand(-25, 25), 20, H - 20);
  S.items.push({ type, sx: p.x, sy: p.y, tx, ty, t: 0, dur: 1.0, x: p.x, y: p.y, z: 30, landed: false, for: q, age: 0 });
  p.benchItem = null; p.benchItemT = rand(7, 11); a0Anim(p, 'swing', 0.35); M(p, 'benchThrows');
  feed(`${p.name} throws a ${ITEM_LABEL[type]} in from the bench for ${q.name}`, TEAM[p.team].col);
}
function leaveBench(p) {
  p.x = clamp(benchX(p.team), 30, W - 30); p.y = H - 12; p.vx = p.vy = 0; p.face = -Math.PI / 2; p.benchItem = null;
  feed(`${p.name} is back on from the bench`); burst(p.x, p.y, TEAM[p.team].col, 10, 18);
}
// Bench drawing (both views): the dugouts, and a countdown plus the item over each benched player.
function drawBenches2D1(t) {
  {
    const cx = benchX(t), y = BENCH_Y(), hw = 70, tm = TEAM[t];
    const q = (x0, y0, x1, y1, z0, z1, col) => { const a = proj(x0, y0, z0), b = proj(x1, y0, z0), c = proj(x1, y1, z1), d = proj(x0, y1, z1); ctx.fillStyle = col; path([a, b, c, d], true); ctx.fill(); };
    q(cx - hw, y + 8, cx + hw, y + 8, 0, 13, 'rgba(20,28,26,.9)');            // low seat back
    q(cx - hw, y - 2, cx + hw, y + 8, 9, 9, '#2c3a35');                       // seat
    q(cx - hw - 4, y - 12, cx + hw + 4, y + 10, 34, 32, 'rgba(160,200,220,.28)');   // perspex roof
    const L = proj(cx, y + 8, 22); ctx.fillStyle = tm.col; ctx.font = `700 ${Math.round(9 * L.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText(tm.short + ' BENCH', L.x, L.y);
  }
}
function drawBenchInfo() {
  for (const p of S.players) {
    if (!onBench(p)) continue;
    const P = proj(p.x, p.y, 52), s = Math.max(0.7, P.s);
    ctx.font = `700 ${Math.round(12 * s)}px ${UI}`; ctx.textAlign = 'center';
    const txt = Math.ceil(p.sentOff) + 's', w = ctx.measureText(txt).width + 10 * s;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(P.x - w / 2, P.y - 11 * s, w, 15 * s, 7 * s);
    ctx.fillStyle = '#ff6b6b'; ctx.fillText(txt, P.x, P.y);
    if (p.benchItem) drawIcon(p.benchItem, P.x, P.y - 20 * s, s * 1.1);
  }
}
function useThrowable(p) {
  const type = selectedThrowable(p);
  if ((p.items[type] || 0) <= 0) { if (p.human) floatText(p, 'Nothing to throw', '#c8c8c8'); return; }
  if (type === 'banana') { dropBanana(p); return; }
  p.items[type]--; a0Anim(p, 'swing', 0.35);
  const bx = clamp(p.x - Math.cos(p.face) * 16, 10, W - 10), by = clamp(p.y - Math.sin(p.face) * 16, 10, H - 10);
  if (type === 'glue') { S.puddles.push({ x: bx, y: by, owner: p, imm: 1, ttl: 20 }); addKarma(p, -4); floatText(p, 'GLUE', ITEM_COL.glue); }
  if (type === 'smoke') { S.smokes.push({ x: clamp(p.x, 20, W - 20), y: clamp(p.y, 20, H - 20), r: 90, ttl: 6 }); sfx('whoosh'); feed(`${p.name} set off a smoke bomb`, '#c8c8c8'); for (const r of S.refs) if (Math.hypot(r.x - p.x, r.y - p.y) < 500) { r.att = { x: p.x, y: p.y }; r.attT = 1.5; } }
  if (type === 'whistle') {
    let n = 0; for (const q of S.players) if (q.team !== p.team && onPitch(q) && dist(q, p) < 200) { q.freezeT = 0.8; floatText(q, '?!', '#ffffff'); n++; }
    whistle(1); addKarma(p, -10); feed(`${p.name} blew a fake whistle: ${n} opponent${n === 1 ? '' : 's'} stopped`, '#e9d8a6');
    if (watched(p)) { cheer('boo', p.x, 'CHEAT!'); addKarma(p, -5); }
  }
  if (type === 'decoy') { S.decoys.push({ x: p.x, y: p.y, vx: Math.cos(p.face) * 210, vy: Math.sin(p.face) * 210, ttl: 5, team: p.team, src: p.id, run: 0 }); feed(`${p.name} sent out a decoy`, '#c9b7ff'); for (const r of S.refs) { r.att = { x: p.x + Math.cos(p.face) * 200, y: p.y + Math.sin(p.face) * 200 }; r.attT = 1.5; } }
  EV('throw', p, { item: type });
}
function inSmoke(x, y) { return (S.smokes || []).some(s => Math.hypot(x - s.x, y - s.y) < s.r); }
function updatePowerups(dt) {
  if (S.megaBall > 0) S.megaBall -= dt;
  for (const p of S.players) {
    if (p.fx) for (const k of ['magnet', 'shield', 'megaphone']) if (p.fx[k] > 0) p.fx[k] = Math.max(0, p.fx[k] - dt);
    if (p.freezeT > 0) p.freezeT -= dt; if (p.slowT > 0) p.slowT -= dt; if (p.firedUpT > 0) p.firedUpT -= dt; if (p.tauntCd > 0) p.tauntCd -= dt;
  }
  for (let i = S.smokes.length - 1; i >= 0; i--) { S.smokes[i].ttl -= dt; if (S.smokes[i].ttl <= 0) S.smokes.splice(i, 1); }
  for (let i = S.puddles.length - 1; i >= 0; i--) {
    const g = S.puddles[i]; g.ttl -= dt; g.imm -= dt; if (g.ttl <= 0) { S.puddles.splice(i, 1); continue; }
    for (const q of S.players) if (onPitch(q) && dist(q, g) < 20 && (g.imm <= 0 || q !== g.owner) && !(q.slowT > 0)) { q.slowT = 2; floatText(q, 'STUCK!', ITEM_COL.glue); crowdEvent(q.team, { noob: 3, fun: 3 }); }
  }
  for (let i = S.decoys.length - 1; i >= 0; i--) {
    const d = S.decoys[i], mo = d.mimic != null ? S.players[d.mimic] : null; d.ttl -= dt;
    if (mo) { d.x = clamp(d.x + mo.vx * dt, 10, W - 10); d.y = clamp(d.y + mo.vy * dt, 10, H - 10); d.vx = mo.vx; d.vy = mo.vy; }
    else { d.x = clamp(d.x + d.vx * dt, 10, W - 10); d.y = clamp(d.y + d.vy * dt, 10, H - 10); } d.run += 210 * dt * 0.09;
    const hit = S.players.find(q => q.team !== d.team && onPitch(q) && dist(q, d) < 16);
    if (d.ttl <= 0 || hit) { if (hit) { floatText(hit, 'POP! A DECOY', '#c9b7ff'); crowdEvent(hit.team, { noob: 5, fun: 4 }); } sfx('pop'); burst(d.x, d.y, '#c9b7ff', 10, 20); S.decoys.splice(i, 1); }
  }
  if (MUT.bananaRain) { S.rainT -= dt; if (S.rainT <= 0) { S.rainT = 6; S.bananas.push({ x: rand(60, W - 60), y: rand(60, H - 60), owner: null, imm: 0, ttl: 25 }); } }
}

/* ---------- taunts ---------- */
const TAUNTS = [
  { dir: 'up', text: 'Too easy!', anim: 'shrug' }, { dir: 'right', text: 'Nice try!', anim: 'point' }, { dir: 'down', text: 'Sorry!', anim: 'sorry' },
  { dir: 'left', text: 'Ref! REF!', anim: 'wave' }, { dir: 'upright', text: 'Come at me', anim: 'chest' }, { dir: 'downleft', text: 'GG', anim: 'thumbs' }
];
const TAUNT_ANG = { up: -90, upright: -45, right: 0, down: 90, downleft: 135, left: 180 };
function tauntFromDir(ix, iy) {
  if (!ix && !iy) return -1;
  const a = Math.atan2(iy, ix) * 180 / Math.PI;
  let best = 0, bd = 999;
  TAUNTS.forEach((t, i) => { const d = Math.abs(((a - TAUNT_ANG[t.dir]) + 540) % 360 - 180); if (d < bd) { bd = d; best = i; } });
  return best;
}
function doTaunt(p, id) {
  const T = TAUNTS[id]; if (!T || !p || !(onPitch(p) || onBench(p))) return;
  p.tauntLog = (p.tauntLog || []).filter(t => S.time - t < 60);
  if (p.tauntCd > 0 || p.tauntLog.length >= 6) return;
  p.tauntCd = 3; p.tauntLog.push(S.time); a0Anim(p, T.anim, 1.1); M(p, 'taunts'); EV('taunt', p, { text: T.text });
  S.bubbles.push({ pid: p.id, text: T.text, life: 2.2 }); if (S.bubbles.length > 8) S.bubbles.shift();
  const opp = S.players.filter(q => q.team !== p.team && onPitch(q) && dist(q, p) < 200).sort((a, b) => dist(a, p) - dist(b, p))[0];
  if (opp && id !== 2 && id !== 5) { opp.firedUpAt = p; opp.firedUpT = 6; addMood(opp, -6); }   // "got them fired up"
  if (id === 2 && p.lastFoulT && S.time - p.lastFoulT < 3) addKarma(p, 2);
  if (id === 3 && S.refs[0]) { S.refs[0].att = { x: p.x, y: p.y }; S.refs[0].attT = 1; }
  if (id === 5 && !p.ggDone) { p.ggDone = true; addKarma(p, 1); }
  if (S.lastGoal && S.lastGoal.team === p.team && S.time - S.lastGoal.t < 6) crowdEvent(p.team, { fun: 8 });
}

/* ---------- golden goal and penalty shoot-out ---------- */
function clockExpired() {
  if (S.mode === 'playground' || S.phase !== 'play') return false;
  const draw = S.score[0] === S.score[1];
  if (draw && !S.golden && !S.shoot) { S.golden = true; S.clock = 60; pauseFor(2.2, 'GOLDEN GOAL', 'Next goal wins · 60 seconds', null); cheer('roar', W / 2, 'GOLDEN GOAL!'); crowdEvent(0, { drama: 20 }); crowdEvent(1, { drama: 20 }); return true; }
  if (draw && S.golden && !S.shoot) { startShootout(); return true; }
  endMatch(); return true;
}
function startShootout() {
  S.shoot = { goals: [0, 0], taken: [0, 0], next: Math.random() < 0.5 ? 0 : 1, live: null, done: false, log: [[], []] };
  S.clock = 0; feed('Penalty shoot-out!', '#ffd23f'); cheer('roar', W / 2, 'PENALTIES!');
  pauseFor(2, 'PENALTIES', 'Best of three, then sudden death', () => nextShootoutKick());
}
function nextShootoutKick() {
  const sh = S.shoot, team = sh.next;
  const cands = S.players.filter(p => p.team === team && onPitch(p) && !p.gk);
  const taker = cands.find(p => p.human) && sh.taken[team] % 2 === 0 ? cands.find(p => p.human) : cands[sh.taken[team] % Math.max(1, cands.length)];
  setPiece(team, 'penalty', 0, 0, 'PENALTY ' + (sh.taken[team] + 1));
  if (taker && S.setPiece && S.setPiece.taker !== taker) {   // rotate takers
    const sp = S.setPiece, old = sp.taker; old.x -= (team === 0 ? 1 : -1) * 60; taker.x = S.ball.x - (team === 0 ? 14 : -14); taker.y = S.ball.y; taker.face = team === 0 ? 0 : Math.PI; S.ball.owner = taker; S.ball.lastTouch = taker; sp.taker = taker;
  }
  sh.live = { team, t: 0, released: false };
}
function updateShootout(dt) {
  const sh = S.shoot; if (!sh || !sh.live || sh.done) return;
  const L = sh.live, b = S.ball;
  if (!L.released) { if (!S.setPiece) L.released = true; return; }
  L.t += dt;
  const gk = S.players.find(p => p.gk && p.team !== L.team);
  if (L.t > 3.5 || (b.owner && b.owner === gk) || (!b.owner && b.z <= 0 && Math.hypot(b.vx, b.vy) < 30) || (b.owner && b.owner.team === L.team && L.t > 0.6)) shootoutKickDone(false);
}
function shootoutKickDone(scored) {
  const sh = S.shoot, L = sh.live; if (!L) return;
  sh.live = null; sh.taken[L.team]++; sh.log[L.team].push(scored); if (scored) sh.goals[L.team]++;
  const [a, b] = sh.goals, [ta, tb] = sh.taken, left = t => Math.max(0, 3 - sh.taken[t]);
  let winner = null;
  if (ta <= 3 || tb <= 3) { if (a > b + left(1)) winner = 0; else if (b > a + left(0)) winner = 1; }
  if (ta >= 3 && tb >= 3 && ta === tb && a !== b) winner = a > b ? 0 : 1;
  feed(`${TEAM[L.team].name} ${scored ? 'score' : 'miss'} · shoot-out ${a}–${b}`, scored ? TEAM[L.team].col : '#c8c8c8');
  if (winner !== null) { sh.done = true; sh.winner = winner; pauseFor(2.4, scored ? 'GOAL!' : 'SAVED!', `${TEAM[winner].name} win the shoot-out ${Math.max(a, b)}–${Math.min(a, b)}`, () => endMatch()); return; }
  sh.next = 1 - L.team;
  pauseFor(1.8, scored ? 'GOAL!' : 'MISS!', `Shoot-out ${a}–${b}`, () => nextShootoutKick());
}

/* ---------- spectators ---------- */
function spectatorCheer(team, name, uid) {
  S.specCd = S.specCd || {};
  const key = uid || 'local';
  if ((S.specCd[key] || 0) > S.time) return false;
  S.specCd[key] = S.time + 15;
  crowdEvent(team, { fun: 6, symp: 4 }); cheer('applause', team === 0 ? W * 0.25 : W * 0.75, `${String(name).toUpperCase().slice(0, 12)}: COME ON ${TEAM[team].short}!`);
  return true;
}
function spectatorGift(team, uid) {
  S.specGift = S.specGift || {};
  const key = (uid || 'local') + ':' + (S.clock > MATCH_LEN / 2 ? 1 : 2);
  if (S.specGift[key]) return false;
  const pool = S.players.filter(p => p.team === team && onPitch(p) && !p.gk); if (!pool.length) return false;
  S.specGift[key] = true; throwItem(pick(pool)); return true;
}

/* ---------- post-match awards ---------- */
const AWARDS = [
  ['Most sneaky', r => r.metrics.unseen, 'unseen fouls'], ["Crowd's darling", r => r.end.popularity, 'popularity'], ['Banana victim', r => r.metrics.slips, 'slips'],
  ['Iron wall', r => r.stats.saves, 'saves'], ['Hatchet', r => r.stats.fouls, 'fouls'], ['Gentleman', r => r.metrics.helpUps, 'help-ups'],
  ['Workhorse', r => Math.round(r.metrics.distance), 'metres run'], ['Sniper', r => r.metrics.shotsOnTarget, 'shots on target'], ['Kung fu', r => r.metrics.jumpKicks, 'jump kicks'],
  ['Glass bones', r => r.metrics.injuries, 'injuries'], ['Trash talker', r => r.metrics.taunts, 'taunts'], ['Bounty hunter', r => r.metrics.bountiesCollected, 'bounties']
];
function computeAwards(R) {
  const out = [];
  for (const [title, f, unit] of AWARDS) {
    const best = R.players.slice().sort((a, b) => (f(b) || 0) - (f(a) || 0))[0];
    if (best && (f(best) || 0) > 0) out.push({ title, name: best.name, team: best.teamShort, value: f(best), unit });
  }
  return out;
}

/* ---------- skins ---------- */
const SKIN_OPTS = {
  skinTone: ['#f6d2b4', '#edc09a', '#d9a477', '#c58c5e', '#a8714a', '#8a5a37', '#6e432a', '#4f2f1d'],
  hair: ['Buzz', 'Crop', 'Curls', 'Bun', 'Mohawk', 'Long', 'Bald', 'Afro', 'Spiky', 'Twin tails'],
  hairColour: ['#1b120c', '#3a2416', '#6b4a2a', '#a36b3a', '#c9a050', '#e6d3a3', '#8e1f1f', '#d65a8a', '#4f7fd9', '#e8e8e8', '#2f9f4f', '#ffcc33', '#d63030', '#ff7ab8'],
  facial: ['None', 'Stubble', 'Beard', 'Moustache'],
  trim: ['#ffffff', '#111111', '#ffd23f', '#ff4d6d', '#5ccf6a', '#6fc4ff', '#c9a0ff', '#ff9f43', '#d8dde0', '#0b6e4f'],
  sleeves: ['Short', 'Long'], socks: ['Plain', 'Hoops', 'Stripes'],
  boots: ['#151515', '#f4f4f0', '#ff4d6d', '#ffd23f', '#5ccf6a', '#6fc4ff', '#ff9f43', '#c9a0ff'],
  accessory: ['None', 'Headband', 'Wristbands', 'Sunglasses', 'Mask', 'Hood', 'Hat', 'Glasses'],
  celebration: ['Knee slide', 'Aeroplane', 'Backflip', 'Robot dance', 'Shush the crowd', 'Cup to ear'],
  trail: ['#4fd6ff', '#ff7a2f', '#ffd23f', '#ff4d6d', '#5ccf6a', '#c9a0ff'],
  build: ['Slim', 'Regular', 'Stocky']
};
function sanitizeSkin(o) {
  o = o && typeof o === 'object' ? o : {};
  const i = (k, n, d) => { const v = Math.round(+o[k]); return Number.isFinite(v) && v >= 0 && v < n ? v : d; };
  const num = Math.round(+o.number);
  return { v: 1, skinTone: i('skinTone', 8, 2), height: clamp(Math.round(+o.height) || 0, -6, 6), build: i('build', 3, 1), hair: i('hair', 8, 1), hairColour: i('hairColour', 10, 1),
    facial: i('facial', 4, 0), trim: i('trim', 10, 0), sleeves: i('sleeves', 2, 0), socks: i('socks', 3, 0), boots: i('boots', 8, 0),
    number: num >= 1 && num <= 99 ? num : 10, accessory: i('accessory', 5, 0), celebration: i('celebration', 6, 0), trail: i('trail', 6, 0) };
}
function randomSkin() { const r = n => Math.floor(Math.random() * n); return sanitizeSkin({ skinTone: r(8), height: r(13) - 6, build: r(3), hair: r(8), hairColour: r(10), facial: r(4), trim: r(10), sleeves: r(2), socks: r(3), boots: r(8), number: 1 + r(99), accessory: r(5), celebration: r(6), trail: r(6) }); }
let MY_SKIN = sanitizeSkin(store.get('fpfc-skin') || randomSkin());
const SKIN_KEYS = ['skinTone', 'height', 'build', 'hair', 'hairColour', 'facial', 'trim', 'sleeves', 'socks', 'boots', 'number', 'accessory', 'celebration', 'trail'];
function skinCode(sk) { return SKIN_KEYS.map(k => (k === 'height' ? sk[k] + 6 : sk[k]).toString(36)).join('.').toUpperCase(); }
function parseSkinCode(code) {
  const parts = String(code || '').trim().toLowerCase().split('.'); if (parts.length !== SKIN_KEYS.length) return null;
  const o = {}; SKIN_KEYS.forEach((k, i) => { const v = parseInt(parts[i], 36); o[k] = k === 'height' ? v - 6 : v; });
  return sanitizeSkin(o);
}
function applySkin(p, sk) {   // a human's look replaces the slot's default look (team colours stay the shirt base)
  if (!p) return;
  if (!sk) { p.skinData = null; return; }
  p.skinData = sk; p.skin = SKIN_OPTS.skinTone[sk.skinTone]; p.hair = SKIN_OPTS.hairColour[sk.hairColour]; p.num = sk.number;
  p.trailCol = SKIN_OPTS.trail[sk.trail]; p.celebration = sk.celebration;
}

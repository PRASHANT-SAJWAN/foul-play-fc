/* Foul Play FC · js/party/effects.js
   Big-moment effects shared by every machine: whack bursts, fire trails, camera effects.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- big-moment effects ---------- */
// Comic-book hit words that pop over whoever takes a hit; sent to every player like the other effects.
const WHACKS = [['SLASH!', '#d9e2ec'], ['WHACK!', '#ffd23f'], ['POW!', '#ff5a5a'], ['BAM!', '#ff9a3d'], ['THWACK!', '#7df0ff'], ['BONK!', '#ffcf5a'], ['SMACK!', '#ff7ad9'], ['CRUNCH!', '#b6ff6b'], ['WHAM!', '#c9a0ff']];
function whack(t, kind) {
  const Wd = WEAPONS[kind];
  const idx = Wd ? Wd.whack : kind === 'sword' ? 0 : kind === 'bat' ? 5 : kind === 'kick' ? pick([2, 8]) : kind === 'slide' ? 7 : kind === 'tackle' ? pick([3, 6]) : kind === 'skill' ? pick([2, 3, 4, 8]) : pick([1, 3, 4, 6]);
  fxEvent('whack', t, { x: t.x, y: t.y, side: idx, team: Wd || kind === 'kick' || kind === 'ko' ? 1 : 0 });
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

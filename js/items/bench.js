/* Foul Play FC · js/items/bench.js
   The team benches: red-carded players sit out, taunt and throw items in.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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
// Over each benched player: a countdown and the item they hold (the 3D view draws the dugouts).
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

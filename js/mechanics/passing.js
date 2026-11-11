/* Foul Play FC · js/mechanics/passing.js
   Losing the ball, switching player, and all passing: power, assist cone, long balls, through balls and the pass preview.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- actions ---------------- */
function loseBall(p, ang) {
  const b = S.ball; if (b.owner !== p || gkFirm(p)) return;   // ball in a firm keeper's hands stays there
  b.owner = null; b.curve = null; b.trail = null; b.vx = Math.cos(ang) * 120 + rand(-50, 50); b.vy = Math.sin(ang) * 120 + rand(-50, 50); b.vz = 90; p.pickCd = 0.8;
}
function switchHuman(h, q) { if (!q || q.human) return; const cur = S.players[h.pid]; if (cur) cur.human = null; h.pid = q.id; q.human = h; }
function switchToBest(h) {
  if (h.lock) return;
  const cur = S.players[h.pid];
  const c = S.players.filter(q => q.team === h.team && !q.gk && !q.human && onPitch(q) && q.ko <= 0 && q !== cur).sort((a, b) => dist(a, S.ball) - dist(b, S.ball));
  if (c[0]) switchHuman(h, c[0]);
}
// power (0.25 to 1, from holding the key) sets the pace: a soft ball arrives later, a hard one zips in.
// rest: a ball into space that should roll to a stop around the target instead of running through it.
function passTo(p, q, mode = 'auto', power = null, rest = false) {
  const b = S.ball; if (b.owner !== p) return;
  const qvx = q.vx || 0, qvy = q.vy || 0, pace = power == null ? 430 : 300 + 330 * power;
  let tx = q.x, ty = q.y, T = 0.5;
  for (let it = 0; it < 3; it++) {   // lead the receiver: aim where they will be when the ball arrives
    T = clamp(Math.hypot(tx - p.x, ty - p.y) / pace, 0.25, 1.3);
    tx = clamp(q.x + qvx * T * 0.85, 10, W - 10); ty = clamp(q.y + qvy * T * 0.85, 10, H - 10);
  }
  if (p.mood <= MOOD_TILT && p.cls !== 'playmaker') { tx += rand(-25, 25); ty += rand(-25, 25); }   // tilted players' passes wander
  const d = Math.hypot(tx - p.x, ty - p.y), a = Math.atan2(ty - p.y, tx - p.x), k = 1.25;
  const air = mode === 'air' || (mode === 'auto' && laneOpen(p, { x: tx, y: ty }) < 20 && d > 90);
  let sp, vz = 0;
  if (air) { T = clamp(d / (power == null ? 380 : 300 + 200 * power), 0.45, 1.9); vz = GRAV() / 2 * T; sp = d / T * 1.04; }   // airtime under gravity g is vz / (g/2)
  else if (rest) sp = Math.min(820, d * 1.1 + 40);                               // rolls out and stops near the spot
  else sp = Math.min(820, d * k / (1 - Math.exp(-k * T)));                      // ground friction e^(-k t): arrive in T seconds
  p.face = a; b.owner = null; b.curve = null; b.trail = null; b.x = p.x + Math.cos(a) * 12; b.y = p.y + Math.sin(a) * 12;
  b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.vz = vz; b.lastTouch = p; b.lastPasser = p; b.passTime = S.time;
  p.pickCd = 0.35; thump(air ? 120 : 160, 0.12, 0.06);
  M(p, 'passes'); if (air) { M(p, 'lobs'); if (mode === 'air') M(p, 'longPasses'); }
  if (q.id === undefined) return;   // a pass into space
  q.expect = T + 0.8;
  if (hasBf(p, 'perfect') || hasBf(q, 'assistMark')) b.pierce = S.time + 1.6;
  if (p.human && !q.human && !p.human.lock) switchHuman(p.human, q);
}
function pickLongTarget(p, ang, want = 600) {
  // Long ball: only team-mates you're facing (within about 30°), preferring ones near the distance your power sets, with space around them.
  let best = null, bs = 1e9;
  for (const q of S.players) {
    if (q === p || q.team !== p.team || !onPitch(q) || q.ko > 0 || q.gk) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d < 140 || d > 950) continue;
    const ad = Math.abs(angDiff(ang, Math.atan2(dy, dx))); if (ad > PASS_CONE) continue;
    const no = nearestOpp(q), space = no ? Math.min(dist(no, q), 160) : 160;
    const sc = ad * 320 + Math.abs(d - want) * 0.3 - space * 0.9 + (q.stun > 0 ? 300 : 0);
    if (sc < bs) { bs = sc; best = q; }
  }
  return best;
}
function spotAhead(p, ang, d) {   // a point d ahead along the aim, cut short at the edge of the pitch so the direction stays exact
  const c = Math.cos(ang), sn = Math.sin(ang);
  if (c > 1e-6) d = Math.min(d, (W - 20 - p.x) / c); else if (c < -1e-6) d = Math.min(d, (20 - p.x) / c);
  if (sn > 1e-6) d = Math.min(d, (H - 20 - p.y) / sn); else if (sn < -1e-6) d = Math.min(d, (20 - p.y) / sn);
  d = Math.max(30, d); return { x: p.x + c * d, y: p.y + sn * d };
}
// Pass distance for a ball into space, by kind and power.
const PASS_LEN = { pass: pw => 120 + 380 * pw, lpass: pw => 260 + 640 * pw, through: pw => 170 + 520 * pw };
function humanLongPass(p, power = 0.5) {
  const ang = passDir(p), q = pickLongTarget(p, ang, PASS_LEN.lpass(power));
  if (q) passTo(p, q, 'air', power);
  else passTo(p, spotAhead(p, ang, PASS_LEN.lpass(power)), 'air', power);   // ball into space
}
// Through ball: no assist. Played along the ground exactly where you aim, rolling out to a distance set by the power.
function throughBall(p, power = 0.5) {
  const ang = passDir(p); p.face = ang;
  passTo(p, spotAhead(p, ang, PASS_LEN.through(power)), 'ground', power, true);
  M(p, 'throughBalls'); floatText(p, 'THROUGH BALL', '#7df0ff');
}
// What a pass would do right now: the assisted team-mate if there is one, else the spot it rolls or drops to.
function passPreview(p, kind, power) {
  const ang = passDir(p);
  if (kind === 'through') return { ...spotAhead(p, ang, PASS_LEN.through(power)), q: null };
  const q = kind === 'lpass' ? pickLongTarget(p, ang, PASS_LEN.lpass(power)) : pickPassTarget(p, ang, PASS_LEN.pass(power));
  return q ? { x: q.x, y: q.y, q } : { ...spotAhead(p, ang, PASS_LEN[kind](power)), q: null };
}
function laneOpen(p, q) {
  let m = 999;
  for (const o of S.players) {
    if (o.team === p.team || !onPitch(o)) continue;
    const vx = q.x - p.x, vy = q.y - p.y, l2 = vx * vx + vy * vy || 1;
    const t = clamp(((o.x - p.x) * vx + (o.y - p.y) * vy) / l2, 0, 1);
    m = Math.min(m, Math.hypot(o.x - (p.x + vx * t), o.y - (p.y + vy * t)));
  }
  return m;
}
function passDir(p) { if (p.human && p.aimA != null) return p.aimA; return (p.dx || p.dy) ? Math.atan2(p.dy, p.dx) : p.face; }   // people aim with their smoothed movement direction
const PASS_CONE = 0.52;   // pass assist only picks team-mates within about 30° of where you're facing
function pickPassTarget(p, ang, want = 260) {
  // Best teammate inside the assist cone, favouring small angle error, the distance your power sets, and open lanes.
  let best = null, bs = 1e9;
  for (const q of S.players) {
    if (q === p || q.team !== p.team || !onPitch(q) || q.ko > 0) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d < 30) continue;
    const ad = Math.abs(angDiff(ang, Math.atan2(dy, dx))); if (ad > (p.human ? PASS_CONE : 1.05)) continue;
    const sc = ad * 320 + (p.human ? Math.abs(d - want) * 0.25 : d * 0.35) - Math.min(laneOpen(p, q), 60) * 1.2 + (q.gk ? 160 : 0) + (q.stun > 0 ? 200 : 0);
    if (sc < bs) { bs = sc; best = q; }
  }
  return best;
}
function humanPass(p, power = 0.5) {   // assisted only towards a team-mate you're facing; otherwise into space where you aim
  const ang = passDir(p), best = pickPassTarget(p, ang, PASS_LEN.pass(power));
  if (best) passTo(p, best, 'ground', power);
  else passTo(p, spotAhead(p, ang, PASS_LEN.pass(power)), 'ground', power, true);
}

/* Foul Play FC · js/mechanics/dribbling.js
   Ball physics: close control while dribbling, and how a loose ball rolls, skids and bounces.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- dribbling ---------- */
// Assisted close control: the ball runs a little ahead of the carrier and follows their direction on a
// soft spring, surging slightly with each touch. You don't lose it by running, sprinting or turning;
// only an opponent can take it: a tackle, or a player standing in its path that it runs into.
const DRIBBLE = {
  feet: 9,          // where a trapped ball sits, in front of the feet
  blockR: 10,       // an opponent this close to the ball, in front of the carrier, knocks it loose
};
function dribble(o, b, dt) {
  const sp = Math.hypot(o.vx, o.vy), fx = Math.cos(o.face), fy = Math.sin(o.face);
  // Moments where the ball stays glued: keepers hold it, players in the air, dashes and blinks.
  if (o.gk || (o.z || 0) > 0 || o.dash || o.dive > 0 || sp > 300 || o.thrown) {
    const hold = o.gk ? 7 : 11;   // a keeper holds it close to the chest
    b.x = clamp(o.x + fx * hold, 2, W - 2); b.y = clamp(o.y + fy * hold, 2, H - 2); b.vx = o.vx; b.vy = o.vy; b.ctrl = o; return true;
  }
  // A new carrier (a tackle, an interception, a skill): bring the ball to their feet.
  if (b.ctrl !== o) {
    b.ctrl = o; b.touchPh = o.run;
    if (dist(o, b) > 18) { b.x = clamp(o.x + fx * DRIBBLE.feet, 2, W - 2); b.y = clamp(o.y + fy * DRIBBLE.feet, 2, H - 2); }
    b.vx = o.vx; b.vy = o.vy;
  }
  const close = (hasBf(o, 'speedDribble') ? 0.75 : 1) * (o.cls === 'speedster' || o.cls === 'playmaker' ? 0.88 : 1);   // tighter control
  const moving = sp >= 25 && (o.dx || o.dy);
  // how far ahead the ball runs: a little ahead jogging, a touch further when sprinting
  const ahead = moving ? (10 + sp * (o.sprinting ? 0.026 : 0.012)) * close : DRIBBLE.feet;
  // touch rhythm: every other stride the ball is nudged ahead, then the carrier closes on it again
  const stride = (o.run - (b.touchPh || 0)) / Math.PI;
  if (moving && stride >= 2) {
    b.touchPh = o.run; b.touches = (b.touches || 0) + 1; b.spin += 0.6;
    if (o.human && !o.human.remote && sp > 60) thump(o.sprinting ? 210 : 260, 0.035, 0.03);
  }
  const surge = moving ? (1 - Math.min(1, Math.max(0, stride) / 2)) * 3.2 * close * Math.min(1, sp / 150) : 0;
  const tx = clamp(o.x + fx * (ahead + surge), 2, W - 2), ty = clamp(o.y + fy * (ahead + surge), 2, H - 2);
  // follow the target on a damped spring: it swings round with the carrier's turns instead of snapping
  const k = moving ? 11 : 9, a = Math.min(1, dt * 12);
  b.vx += (o.vx * (moving ? 1 : 0) + (tx - b.x) * k - b.vx) * a; b.vy += (o.vy * (moving ? 1 : 0) + (ty - b.y) * k - b.vy) * a;
  b.x = clamp(b.x + b.vx * dt, 2, W - 2); b.y = clamp(b.y + b.vy * dt, 2, H - 2);
  // an opponent standing in its path: the ball runs into them and comes loose
  for (const q of S.players) {
    if (q.team === o.team || !canBall(q) || (q.z || 0) > 10 || q.pickCd > 0 || dist(q, b) > DRIBBLE.blockR) continue;
    if ((q.x - o.x) * fx + (q.y - o.y) * fy <= 4) continue;   // only in front of the carrier
    const ux = (b.x - q.x) || fx, uy = (b.y - q.y) || fy, ul = Math.hypot(ux, uy) || 1, v = Math.max(80, Math.hypot(b.vx, b.vy) * 0.6);
    b.owner = null; b.ctrl = null; b.lastTouch = o; b.vx = ux / ul * v + rand(-30, 30); b.vy = uy / ul * v + rand(-30, 30); b.vz = 40;
    o.pickCd = 0.35; floatText(q, 'BLOCKED', '#ffffff'); thump(150, 0.12, 0.06);
    return false;
  }
  return true;
}

/* ---------- a ball on its own ---------- */
// Grass slows a rolling ball (rolling resistance plus a little drag), a skidding ball (just landed, or struck
// along the ground) more until it starts to roll, and air drag a flying one. ground: skip the flight part.
function rollBall(b, dt, ground) {
  const ice = wxKind() === 'ice';
  if (!ground && b.z > 0) { const v = Math.hypot(b.vx, b.vy), k = AIR_K * (1 + v / 1400); b.vx *= Math.exp(-k * dt); b.vy *= Math.exp(-k * dt); return; }
  const v0 = Math.hypot(b.vx, b.vy); if (v0 < 0.01) { b.vx = b.vy = 0; return; }
  if (b.skid > 0) b.skid -= dt;
  const heavy = (inMud(b) ? 2.6 : 1) * (S.ballMod && S.ballMod.k === 'iron' ? 1.8 : 1);   // mud and the iron ball drag it to a stop
  const drag = (ice ? 0.35 : b.skid > 0 ? 1.9 : 0.95) * heavy, roll = (ice ? 4 : b.skid > 0 ? 34 : 18) * heavy * dt;
  let v = v0 * Math.exp(-drag * dt) - roll; if (v < 0) v = 0;
  b.vx *= v / v0; b.vy *= v / v0;
}
// Landing: a hard ball keeps more of its bounce than a soft one, loses pace to the grass, and skids before it rolls.
function bounceBall(b) {
  const vz = -b.vz, e = S.ballMod && S.ballMod.k === 'iron' ? 0 : clamp(0.64 - vz / 3200, 0.42, 0.62);   // the iron ball doesn't bounce
  if (vz > 70) { b.vz = vz * e; const keep = 0.9 - Math.min(0.12, vz / 4000); b.vx *= keep; b.vy *= keep; b.skid = 0.18; return true; }
  b.vz = 0; b.skid = Math.max(b.skid || 0, 0.12); return false;
}

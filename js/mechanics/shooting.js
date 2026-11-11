/* Foul Play FC · js/mechanics/shooting.js
   Shooting: aim snapping, power, stamina, charged and boosted shots, curl.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const POWER_TRAIL = 0.7;   // charged shots hit at least this hard get a trail
function shoot(p, power, aimY) {
  const b = S.ball; if (b.owner !== p) return;
  const gx = p.team === 0 ? W : 0;
  let ang = p.face;
  const toGoal = Math.atan2(H / 2 - p.y, gx - p.x);
  if (aimY !== undefined) ang = Math.atan2(aimY - p.y, gx - p.x);
  else if (Math.abs(angDiff(ang, toGoal)) < 1.0 && Math.cos(ang) * (gx - p.x) > 0) {
    const t = (gx - p.x) / Math.cos(ang);
    const iy = clamp(p.y + Math.sin(ang) * t, H / 2 - GOAL_HALF + 6, H / 2 + GOAL_HALF - 6);
    ang = Math.atan2(iy - p.y, gx - p.x);
  }
  // stamina sets how much of the wind-up actually goes into the shot; every shot costs some
  power = clamp(power * (0.5 + 0.5 * p.stamina / 100), 0.15, 1);
  p.stamina = Math.max(0, p.stamina - (8 + 18 * power)); a0Anim(p, 'shoot', 0.35);
  const boosted = p.charge >= 25;   // charged shot: spends 25 charge for far better accuracy and a little extra pace
  if (boosted) { p.charge -= 25; M(p, 'chargeSpent', 25); M(p, 'powerShots'); floatText(p, 'POWER SHOT', '#4fd6ff'); if (power > 0.6) cheer('roar', p.x, 'WHAT A STRIKE!'); }
  const moodMul = p.mood >= MOOD_ZONE ? 0.85 : p.mood <= MOOD_TILT ? 1.25 : 1;
  ang += rand(-1, 1) * (0.03 + 0.07 * power) * (1.4 - 0.4 * p.hp / 100) * (boosted ? 0.3 : 1) * moodMul * crowdPressure(p.team);
  const striker = p.i === TEAM_SIZE - 1;
  const rocket = p.fx && p.fx.rocket > 0; if (rocket) p.fx.rocket--;
  const sp = (430 + 380 * power) * (boosted ? 1.12 : 1) * (striker ? 1.2 : 1) * (rocket ? 1.35 : 1) * shotMul(p);
  S.ball.trail = rocket || (boosted && power >= POWER_TRAIL) ? (rocket ? '#ff7a2f' : (p.trailCol || '#4fd6ff')) : null;   // trail and ground fire only for powerful strikes
  if (boosted || rocket) fxEvent('power', p);
  b.owner = null; b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.vz = 60 + 180 * power * power + rand(-30, 50) * (boosted ? 0.4 : 1);
  const lat = -Math.sin(ang) * p.vx + Math.cos(ang) * p.vy, cm = clamp(-lat * 0.9, -90, 90);
  b.curve = Math.abs(cm) > 25 ? { ax: -Math.sin(ang) * cm, ay: Math.cos(ang) * cm, t: 1.2 } : null;
  b.knock = 0; b.unstoppable = 0;
  if (hasBf(p, 'powerShot')) { b.vx *= 1.4; b.vy *= 1.4; b.knock = S.time + 1.5; p.bf.powerShot = 0; S.ball.trail = '#ff4d4d'; floatText(p, 'POWER SHOT!', '#ff4d4d'); }
  if (hasBf(p, 'curveDrive')) {   // aim wide and bend it back in: the solver finds the swerve that still ends on target
    const gx = p.team === 0 ? W : 0, ty = clamp(p.y + Math.tan(ang) * (gx - p.x), H / 2 - GOAL_HALF + 8, H / 2 + GOAL_HALF - 8), dx = gx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
    const T = Math.max(0.25, d / Math.hypot(b.vx, b.vy)), A = (ty > H / 2 ? 1 : -1) * (p.team === 0 ? 1 : -1) * 520, nx = -dy / d, ny = dx / d, ax = nx * A, ay = ny * A, k = AIR_K, e = 1 - Math.exp(-k * T);
    b.vx = (dx - ax * T / k) * k / e + ax / k; b.vy = (dy - ay * T / k) * k / e + ay / k; b.vz = Math.max(b.vz, 90); b.curve = { ax, ay, t: T + 0.3 }; p.bf.curveDrive = 0; floatText(p, 'CURVE DRIVE!', '#ff9a6b');
  }
  if (hasBf(p, 'meteorShot')) { b.vx *= 1.3; b.vy *= 1.3; b.unstoppable = S.time + 2; p.bf.meteorShot = 0; S.ball.trail = '#ff7a2f'; }
  b.lastTouch = p; p.pickCd = 0.4; p.face = ang; thump(90, 0.3, 0.1); S.excite += 0.1;
  M(p, 'shots'); b.shotBy = p; b.shotT = S.time; b.shotPowered = boosted; EV('shot', p, { power: rnd(power, 2), powered: boosted });
}
function inReach(p) {
  const r = targetReach(p);
  return S.players.filter(q => q !== p && onPitch(q) && q.ko <= 0 && dist(p, q) < r).sort((a, b) => dist(a, p) - dist(b, p));
}

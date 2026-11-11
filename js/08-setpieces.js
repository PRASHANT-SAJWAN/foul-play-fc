/* Foul Play FC · setpieces.js
   Free kicks and penalties: set-up rules, walls, the curling shot solver, woodwork and set-piece drawing.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- free kicks and penalties ----------------
   15 seconds to set up (penalties 10, shoot-out 6): everyone can move within the rules, bots build a wall,
   and the taker aims at a point on the goal. The shot curls around the wall on its own (aim assist);
   holding shoot sets the power, and releasing inside the green band hits the target. */
const FK_DIST = () => W * 0.0872;   // 9.15 m on a 105 m pitch
const AIR_K = 0.15;                 // air drag on the ball
const fkGoalX = t => t.team === 0 ? W : 0;
function setPiece(team, type, x, y, label) {
  const b = S.ball, dir = team === 0 ? 1 : -1, gx = team === 0 ? W : 0, pen = type === 'penalty';
  if (pen) { x = gx - dir * PEN_X; y = H / 2; }
  x = clamp(x, 30, W - 30); y = clamp(y, 20, H - 20);
  b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null; b.curve = null; b.trail = null;
  const cands = S.players.filter(p => p.team === team && onPitch(p) && p.ko <= 0 && !p.gk);
  const taker = cands.find(p => p.human) || cands.sort((p, q) => dist(p, b) - dist(q, b))[0];
  for (const p of S.players) {   // everyone lands, stops sliding and lets go of the referee
    p.z = 0; p.vz = 0; p.airAct = null; p.slide = 0; p.slideRec = 0; p.lunge = 0;
    if (p.carry != null) { const r = S.refs[p.carry]; if (r) { r.carriedBy = null; r.z = 0; } p.carry = null; }
  }
  for (const r of S.refs) { r.fly = null; r.z = 0; r.downT = 0; if (!r.human && !(r.gone > 0)) { r.x = clamp(x + dir * FK_DIST() * 0.55, 25, W - 25); r.y = clamp(y + (y < H / 2 ? 1 : -1) * 150, 25, H - 25); r.face = Math.atan2(y - r.y, x - r.x); } }
  if (!taker) { S.setPiece = null; return; }
  taker.stun = 0; taker.vx = taker.vy = 0; taker.hold = 0;
  b.owner = taker; b.lastTouch = taker;
  const d = Math.hypot(gx - x, H / 2 - y), shootout = !!S.shoot;
  const sp = S.setPiece = { team, type, taker, t: 0, prep: pen ? (shootout ? 6 : 10) : 15, minT: pen ? 1.2 : 3, wait: pen ? rand(2, 3.5) : rand(5, 8.5),
    aim: { y: H / 2 + rand(-0.4, 0.4) * GOAL_HALF, z: 12 }, wall: [], gkSide: -(Math.sign(y - H / 2) || 1), offX: x, whistled: false };
  // the wall: bots from the defending team, more of them the closer the kick is to goal
  if (!pen && d < W * 0.45) {
    const defs = S.players.filter(p => p.team !== team && onPitch(p) && !p.gk && !p.human && p.ko <= 0).sort((p, q) => dist(p, b) - dist(q, b));
    const outfield = S.players.filter(p => p.team !== team && !p.gk && onPitch(p)).length;
    let n = d < W * 0.22 ? 4 : d < W * 0.33 ? 3 : 2;
    n = Math.min(n, TEAM_SIZE <= 3 ? 2 : 4, Math.max(1, defs.length - (outfield >= 3 ? 1 : 0)), defs.length);
    sp.wall = defs.slice(0, n).map(p => ({ pid: p.id, x: p.x, y: p.y }));
  }
  sp.offX = pen ? null : fkOffside(sp);
  fkWallSpots(sp);
  for (const p of S.players) if (onPitch(p) && p !== taker) fkLegal(p, sp, true);   // start everyone somewhere legal
  fkPlaceTaker(sp);
  S.pend = [];
  M(taker, 'setPiecesTaken'); EV('setPiece', taker, { kick: type }); if (S.metrics) S.metrics.lastSetPiece = { team, t: S.metrics.t };
  pauseFor(1.2, label, (pen ? 'Penalty to ' : 'Free kick to ') + TEAM[team].name, null);
}
function fkWallSpots(sp) {
  const b = S.ball, t = sp.taker, gx = fkGoalX(t), near = H / 2 + (Math.sign(b.y - H / 2) || 1) * GOAL_HALF * 0.45;
  const a = Math.atan2(near - b.y, gx - b.x), r = FK_DIST() + 4, cx = b.x + Math.cos(a) * r, cy = b.y + Math.sin(a) * r, nx = -Math.sin(a), ny = Math.cos(a), n = sp.wall.length;
  sp.wall.forEach((s, i) => { const o = (i - (n - 1) / 2) * 15; s.x = clamp(cx + nx * o, 8, W - 8); s.y = clamp(cy + ny * o, 8, H - 8); });
}
function fkOffside(sp) {   // the attacking team must stay level with or behind the second-last defender (or the ball)
  const t = sp.taker, dir = t.team === 0 ? 1 : -1, b = S.ball;
  const defs = S.players.filter(p => p.team !== t.team && onPitch(p)).map(p => p.x * dir).sort((a, c) => c - a);
  const second = defs.length >= 2 ? defs[1] : (t.team === 0 ? W : 0) * dir;
  return Math.max(second, b.x * dir) * dir;
}
function fkLegal(p, sp, snap) {   // keep a player where the laws allow during the set-up
  const t = sp.taker, b = S.ball, dir = t.team === 0 ? 1 : -1, gx = fkGoalX(t), att = p.team === t.team, R = FK_DIST();
  if (sp.type === 'penalty') {
    if (p.gk && !att) { p.x = gx - dir * 6; p.y = clamp(p.y, H / 2 - GOAL_HALF + 6, H / 2 + GOAL_HALF - 6); return; }
    if (p.gk) return;
    const edge = gx - dir * (BOX_D + 8); if (p.x * dir > edge * dir) p.x = edge;   // outside the box, behind the ball
  } else if (!att) {
    if (p.gk) return;
  } else if (p !== t) {
    const off = sp.offX != null ? sp.offX : b.x; if (p.x * dir > off * dir) p.x = off;
  }
  const d = dist(p, b), min = att && sp.type !== 'penalty' ? 22 : R;   // defenders 9.15 m from the ball; team-mates just not on it
  if (d < min) { const a = d > 0.1 ? Math.atan2(p.y - b.y, p.x - b.x) : (att ? Math.PI : 0) + (dir > 0 ? 0 : Math.PI); p.x = b.x + Math.cos(a) * min; p.y = b.y + Math.sin(a) * min; if (!snap) { p.vx *= 0.3; p.vy *= 0.3; } }
  p.x = clamp(p.x, 8, W - 8); p.y = clamp(p.y, 8, H - 8);
}
function fkPlaceTaker(sp) {
  const t = sp.taker, b = S.ball, gx = fkGoalX(t), a = Math.atan2(sp.aim.y - b.y, gx - b.x);
  t.x = b.x - Math.cos(a) * 14; t.y = b.y - Math.sin(a) * 14; t.face = a; t.vx = t.vy = 0; t.z = 0;
  if (b.owner === t) { b.x = b.x; b.z = 0; b.vx = b.vy = b.vz = 0; }
}
function fkTarget(p, sp) {   // where bots go during the set-up
  const t = sp.taker, b = S.ball, dir = t.team === 0 ? 1 : -1, gx = fkGoalX(t), att = p.team === t.team;
  const w = sp.wall.find(s => s.pid === p.id); if (w) return w;
  if (p.gk) return att ? { x: p.x, y: p.y } : sp.type === 'penalty' ? { x: gx - dir * 6, y: H / 2 } : { x: gx - dir * 16, y: H / 2 + sp.gkSide * GOAL_HALF * 0.3 };
  const lane = ((p.i * 37) % 5) / 4 - 0.5;   // a fixed spread per player, so nobody jitters
  if (sp.type === 'penalty') return { x: gx - dir * (BOX_D + 26 + (att ? 0 : 12)), y: H / 2 + lane * BOX_HALF * 1.5 };
  if (att) { const depth = Math.min(BOX_D * 0.75, Math.abs(gx - b.x) - 40); return { x: gx - dir * Math.max(GA_D + 20, depth - (p.i % 2) * 70), y: H / 2 + lane * BOX_HALF * 0.9 }; }
  const m = S.players.filter(q => q.team === t.team && q !== t && onPitch(q) && !q.gk).sort((q, r) => dist(q, p) - dist(r, p))[0];
  return m ? { x: m.x + dir * 20, y: m.y + (H / 2 - m.y) * 0.1 } : { x: gx - dir * BOX_D * 0.6, y: H / 2 + lane * 200 };
}
function fkIdealPower(sp) {
  const b = S.ball, gx = fkGoalX(sp.taker), d = Math.hypot(gx - b.x, sp.aim.y - b.y);
  return clamp(0.4 + d / 1500, 0.45, 0.92);
}
// Solve a shot that reaches the aim point on the goal, bending around anyone standing in the way.
function fkPlan(sp, power, err) {
  const b = S.ball, t = sp.taker, dir = t.team === 0 ? 1 : -1, gx = fkGoalX(t);
  const ty = sp.aim.y + (err ? err.dy : 0), tz = Math.max(0, sp.aim.z + (err ? err.dz : 0)), tx = gx + dir * 6;
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const speed = (420 + 460 * power) * (t.i === TEAM_SIZE - 1 ? 1.08 : 1), T = clamp(d / speed, 0.25, 2.6);
  let A = 0;
  if (sp.type !== 'penalty') {
    let lo = 1e9, hi = -1e9, sAt = 0;
    for (const q of S.players) {
      if (q.team === t.team || q.gk || !onPitch(q)) continue;
      const qx = q.x - b.x, qy = q.y - b.y, s = qx * ux + qy * uy, o = qx * nx + qy * ny;
      if (s < 60 || s > d - 40 || Math.abs(o) > 45) continue;
      lo = Math.min(lo, o - 9); hi = Math.max(hi, o + 9); sAt = Math.max(sAt, s);
    }
    if (hi > lo && lo < 0 && hi > 0) {   // the straight line is blocked: curl it round the nearer end of the wall
      const tS = sAt / d * T, f = 0.5 * tS * (T - tS), go = Math.abs(hi) < Math.abs(lo) ? hi + 4 : lo - 4;
      A = clamp(-go / Math.max(0.01, f), -1100, 1100);
    }
  }
  const ax = nx * A, ay = ny * A, k = AIR_K, e = 1 - Math.exp(-k * T);
  const vx = (dx - ax * T / k) * k / e + ax / k, vy = (dy - ay * T / k) * k / e + ay / k;
  const vz = (tz - (b.z || 0) + 0.5 * GRAV() * T * T) / T;
  return { vx, vy, vz, ax, ay, T };
}
function fkPathPoints(sp, P, n = 26) {
  const b = S.ball, k = AIR_K, pts = [];
  for (let i = 1; i <= n; i++) {
    const t = P.T * i / n, e = (1 - Math.exp(-k * t)) / k;
    pts.push({ x: b.x + (P.vx - P.ax / k) * e + P.ax * t / k, y: b.y + (P.vy - P.ay / k) * e + P.ay * t / k, z: Math.max(0, P.vz * t - 0.5 * GRAV() * t * t) });
  }
  return pts;
}
function fkShoot(t, sp, power) {
  const b = S.ball; if (b.owner !== t) return;
  const ideal = fkIdealPower(sp), boosted = t.charge >= 25, band = boosted ? 0.14 : 0.08;
  if (boosted) { t.charge -= 25; M(t, 'chargeSpent', 25); M(t, 'powerShots'); }
  power = clamp(power, 0.2, 1);
  const dp = power - ideal, ex = Math.max(0, Math.abs(dp) - band);
  const wob = (3 + (100 - t.stamina) * 0.06) * (t.mood <= MOOD_TILT ? 1.6 : t.mood >= MOOD_ZONE ? 0.7 : 1) * crowdPressure(t.team);
  const P = fkPlan(sp, power, { dy: rand(-1, 1) * (ex * 260 + wob), dz: Math.sign(dp) * ex * 240 + rand(-1, 1) * wob * 0.5 });
  const rocket = t.fx && t.fx.rocket > 0; if (rocket) t.fx.rocket--;
  const m = rocket ? 1.15 : 1;
  b.owner = null; b.z = 0.5; b.vx = P.vx * m; b.vy = P.vy * m; b.vz = P.vz; b.curve = { ax: P.ax, ay: P.ay, t: P.T + 0.4 };
  b.lastTouch = t; b.shotBy = t; b.shotT = S.time; b.shotPowered = boosted; b.trail = boosted || rocket ? (rocket ? '#ff7a2f' : (t.trailCol || '#4fd6ff')) : null;
  t.pickCd = 0.5; t.stamina = Math.max(0, t.stamina - (8 + 14 * power)); a0Anim(t, 'shoot', 0.35); thump(85, 0.3, 0.12); S.excite += 0.3;
  M(t, 'shots'); EV('shot', t, { power: rnd(power, 2), powered: boosted, setPiece: sp.type, curve: Math.round(Math.hypot(P.ax, P.ay)) });
  const curl = Math.hypot(P.ax, P.ay) > 200;
  if (ex === 0) floatText(t, curl ? 'WHAT A CURLER!' : 'PERFECT STRIKE', '#7dff9b'); else floatText(t, dp > 0 ? 'TOO MUCH POWER' : 'NOT ENOUGH POWER', '#ffb36b');
  if (boosted || rocket) fxEvent('power', t);
  for (const s of sp.wall) { const q = S.players[s.pid]; if (q && !q.human && able(q) && Math.random() < 0.8) jump(q); }   // the wall jumps
}
function setPieceUpdate(dt) {
  const sp = S.setPiece, t = sp.taker, b = S.ball;
  sp.t += dt / PACE;   // the set-up clock runs in real seconds whatever the pace
  if (!t || !onPitch(t)) { S.setPiece = null; return; }
  const dir = t.team === 0 ? 1 : -1, gx = fkGoalX(t), pen = sp.type === 'penalty';
  if (!sp.whistled && sp.t >= sp.minT) { sp.whistled = true; whistle(1); }
  sp.offX = pen ? null : fkOffside(sp);
  fkWallSpots(sp);
  let shot = null;
  for (const h of S.humans) {          // read every human so stray presses don't queue up
    const inp = readInput(h, dt), p = S.players[h.pid]; if (!p) continue;
    if (p === t) {
      // aim: in the 3D front view left/right moves across the goal and up/down sets the height
      if ((GFX3D && !!R3) || S.net === 'client' || h.remote) { sp.aim.y += inp.ix * dir * 150 * dt; sp.aim.z -= inp.iy * 55 * dt; }
      else { sp.aim.y += inp.iy * 150 * dt; sp.aim.z += inp.ix * dir * 55 * dt; }
      sp.aim.y = clamp(sp.aim.y, H / 2 - GOAL_HALF + 4, H / 2 + GOAL_HALF - 4); sp.aim.z = clamp(sp.aim.z, 3, GOAL_H - 5);
      if (sp.t < sp.minT) { if (inp.sr || inp.passR || inp.lpassR || inp.thR) floatText(t, 'Wait for the whistle', '#c8c8c8'); continue; }
      if (inp.passR) humanPass(t, inp.power);
      else if (inp.lpassR) humanLongPass(t, inp.power);
      else if (inp.thR) throughBall(t, inp.power);
      else if (inp.sr) shot = inp.power;
    } else {
      p.dx = inp.ix; p.dy = inp.iy; p.sprintWant = !!inp.sprint;
      if (inp.pass) switchToBest(h);
    }
  }
  if (!t.human && b.owner === t && sp.t > sp.wait) {   // bot taker
    const d = Math.hypot(gx - b.x, H / 2 - b.y);
    if (pen || d < W * 0.33 || (d < W * 0.45 && Math.random() < 0.5)) {
      const gk = S.players.find(q => q.gk && q.team !== t.team && onPitch(q)), side = gk && gk.y < H / 2 ? 1 : -1;
      sp.aim.y = H / 2 + side * (GOAL_HALF - rand(8, 16)); sp.aim.z = rand(5, GOAL_H - 10); fkPlaceTaker(sp);
      shot = clamp(fkIdealPower(sp) + rand(-0.09, 0.09), 0.3, 1);
    } else if (!botPass(t, true)) shot = fkIdealPower(sp);
  }
  if (b.owner === t && shot == null && sp.t >= sp.prep) shot = fkIdealPower(sp) - 0.04;   // time's up: taken for you
  // everyone else moves into position
  for (const p of S.players) {
    if (!onPitch(p) || p === t) continue;
    if (!p.human) { const g = fkTarget(p, sp); steer(p, g.x, g.y, 1, 10); p.sprintWant = Math.hypot(g.x - p.x, g.y - p.y) > 140; }
    const spd = 150 * (0.72 + 0.28 * p.hp / 100) * (p.sprintWant && p.stamina > 2 ? 1.35 : 1), k = Math.min(1, dt * 9);
    p.vx += (p.dx * spd - p.vx) * k; p.vy += (p.dy * spd - p.vy) * k;
    if (p.dx || p.dy) p.face += angDiff(p.face, Math.atan2(p.dy, p.dx)) * Math.min(1, dt * 12);
    else if (!p.human) p.face += angDiff(p.face, Math.atan2(b.y - p.y, b.x - p.x)) * Math.min(1, dt * 6);
    p.x += p.vx * dt; p.y += p.vy * dt; p.run += Math.hypot(p.vx, p.vy) * dt * 0.09;
    p.sprinting = false; p.stamina = Math.min(p.staminaMax, p.stamina + 14 * dt);
    fkLegal(p, sp, false);
  }
  const act = S.players.filter(p => onPitch(p) && p !== t);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i], c = act[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 14) { const o = (14 - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * o; a.y -= uy * o; c.x += ux * o; c.y += uy * o; }
  }
  for (const r of S.refs) if (!r.human && !(r.gone > 0)) { r.face += angDiff(r.face, Math.atan2(b.y - r.y, b.x - r.x)) * Math.min(1, dt * 4); r.blind = Math.max(0, r.blind - dt); }
  if (b.owner === t) fkPlaceTaker(sp);
  if (shot != null && b.owner === t) fkShoot(t, sp, shot);
  if (b.owner !== t) { S.setPiece = null; t.dx = t.dy = 0; }
}

/* ---------- ball extras: woodwork and bodies in the way ---------- */
function woodwork(b, side) {   // side 0: left goal line, 1: right. True if the ball hit a post or the bar and bounced back out.
  const gl = side ? W : 0, s = side ? -1 : 1;
  const ring = what => { thump(320, 0.25, 0.12); cheer('roar', b.x, what === 'POST' ? 'OFF THE POST!' : 'OFF THE BAR!'); floatText(b, what === 'POST' ? 'POST!' : 'CROSSBAR!', '#ffffff'); S.excite += 0.4; S.shake = Math.max(S.shake, 3); if (b.lastTouch) crowdEvent(b.lastTouch.team, { drama: 6, fun: 2 }); EV('woodwork', b.lastTouch || null, { what }); };
  for (const py of [H / 2 - GOAL_HALF, H / 2 + GOAL_HALF]) {
    if (Math.abs(b.y - py) < 5 && b.z < GOAL_H + 2) { b.x = gl + s * 3; b.vx = s * Math.abs(b.vx) * 0.55; b.vy += (Math.sign(b.y - py) || 1) * Math.abs(b.vx) * 0.6; b.curve = null; ring('POST'); return true; }
  }
  if (Math.abs(b.y - H / 2) < GOAL_HALF && b.z >= GOAL_H - 3 && b.z < GOAL_H + 5) { b.x = gl + s * 3; b.vx = s * Math.abs(b.vx) * 0.5; b.vz = b.z < GOAL_H ? -80 : Math.abs(b.vz) * 0.4 + 60; b.curve = null; ring('BAR'); return true; }
  return false;
}
function bodyBlock(b) {   // a hard shot or clearance that hits someone's body or head is blocked
  const bsp = Math.hypot(b.vx, b.vy);
  if (b.owner || b.z <= 0 || bsp < 300 || b.pierce) return;
  const shot = b.shotBy && b.shotBy === b.lastTouch && S.time - (b.shotT || 0) < 2;
  if (!shot && bsp < 480) return;
  for (const p of S.players) {
    if (!onPitch(p) || p.ko > 0 || p.pickCd > 0 || p.gk) continue;
    const bz = b.z - (p.z || 0), d = dist(p, b); if (bz < 16 || bz > 48 || d > 13) continue;
    const nx = (b.x - p.x) / (d || 1), ny = (b.y - p.y) / (d || 1), vn = b.vx * nx + b.vy * ny; if (vn >= 0) continue;
    if (b.knock > S.time && b.shotBy && p.team !== b.shotBy.team) { knock(b.shotBy, p, { stun: 1, kb: 200, from: { x: b.x - b.vx, y: b.y - b.vy }, foul: false, col: '#ff4d4d' }); b.vx *= 0.85; b.vy *= 0.85; p.pickCd = 0.4; continue; }   // Power Shot ploughs through
    b.vx = (b.vx - 1.6 * vn * nx) * 0.42 + rand(-60, 60); b.vy = (b.vy - 1.6 * vn * ny) * 0.42 + rand(-60, 60); b.vz = Math.abs(b.vz) * 0.3 + 50;
    b.curve = null; b.trail = null; b.lastTouch = p; b.shotBy = null; p.pickCd = 0.35;
    floatText(p, bz > 34 ? 'HEADED AWAY' : 'BLOCKED!', '#ffffff'); thump(130, 0.15, 0.1); S.excite += 0.15;
    if (bsp > 650) p.stun = Math.max(p.stun, 0.5);
    crowdEvent(p.team, { perf: 2 }); M(p, 'blocks'); EV('block', p);
    return;
  }
}

/* ---------- set-piece drawing ---------- */
function fkLocalTakerHuman() { const sp = S.setPiece; if (!sp || !sp.taker) return null; return S.humans.find(h => !h.remote && S.players[h.pid] === sp.taker) || null; }
function drawSetPieceWorld() {   // on the pitch: the 9.15 m circle, the offside line, the aim point and the predicted flight
  const sp = S.setPiece; if (!sp || !sp.taker) return;
  const b = S.ball, t = sp.taker, gx = fkGoalX(t), R = FK_DIST();
  ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -S.time * 20;
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; const ring = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; ring.push(proj(b.x + Math.cos(a) * R, b.y + Math.sin(a) * R)); } path(ring); ctx.stroke();
  if (sp.offX != null) { ctx.strokeStyle = TEAM[t.team].col; ctx.globalAlpha = 0.7; const L = []; for (let i = 0; i <= 12; i++) L.push(proj(sp.offX, H * i / 12)); path(L); ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.restore();
  const h = fkLocalTakerHuman(); if (!h || b.owner !== t) return;
  const P = fkPlan(sp, fkIdealPower(sp)), pts = fkPathPoints(sp, P);
  pts.forEach((q, i) => { const Q = proj(q.x, q.y, q.z + 4); ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.5 * i / pts.length})`; ell(Q.x, Q.y, 2.2 * Math.max(0.6, Q.s), 2.2 * Math.max(0.6, Q.s)); ctx.fill(); });
  const A = proj(gx, sp.aim.y, sp.aim.z), s = Math.max(0.8, A.s);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.2; ell(A.x, A.y, 9 * s, 9 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(A.x - 14 * s, A.y); ctx.lineTo(A.x - 4 * s, A.y); ctx.moveTo(A.x + 4 * s, A.y); ctx.lineTo(A.x + 14 * s, A.y); ctx.moveTo(A.x, A.y - 14 * s); ctx.lineTo(A.x, A.y - 4 * s); ctx.moveTo(A.x, A.y + 4 * s); ctx.lineTo(A.x, A.y + 14 * s); ctx.stroke();
}
function drawSetPiece() {
  const sp = S.setPiece; if (!sp || !sp.taker || S.pause > 0) return;
  const t = sp.taker, hm = t.human, h = fkLocalTakerHuman(), local = !!h;
  const map = (h && h.map) || MAPSOLO, pen = sp.type === 'penalty', left = Math.max(0, Math.ceil(sp.prep - sp.t));
  const title = `${pen ? 'PENALTY' : 'FREE KICK'} · ${t.name} · ${left}s`;
  const iAmPlaying = S.humans.some(x => !x.remote && S.players[x.pid] && S.players[x.pid] !== t);
  const sub = local ? (sp.t < sp.minT ? `Aim with movement (left/right across the goal, up/down for height) · wait for the whistle`
                                       : `Hold ${keyLabel(map.shoot[0])} and release in the green · ${keyLabel(map.pass[0])} pass · ${keyLabel(map.lpass[0])} long ball · the shot curls round the wall`)
    : iAmPlaying ? (pen ? 'Stay outside the box and behind the ball until it is kicked' : `Get into position: defenders stay outside the circle, attackers stay behind the ${TEAM[t.team].short} line`)
    : `Everyone sets up while ${t.name} lines it up`;
  ctx.font = `600 30px ${DISP}`; const tw = ctx.measureText(title).width;
  ctx.font = `600 15px ${UI}`; const sw = ctx.measureText(sub).width;
  const w = Math.max(tw, sw) + 40, x = LW / 2 - w / 2, y = 124;
  ctx.fillStyle = 'rgba(6,11,10,.9)'; rr(x, y, w, 58, 10);
  ctx.strokeStyle = TEAM[sp.team].col; ctx.lineWidth = 1.5; rrs(x + 0.5, y + 0.5, w - 1, 57, 10);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = TEAM[sp.team].col; ctx.font = `600 30px ${DISP}`; ctx.fillText(title, LW / 2, y + 22);
  ctx.fillStyle = '#eef2e6'; ctx.font = `600 15px ${UI}`; ctx.fillText(sub, LW / 2, y + 44);
  if (local) {   // power bar with the sweet spot
    const bw = 320, bx = LW / 2 - bw / 2, by = y + 66, ideal = fkIdealPower(sp), band = t.charge >= 25 ? 0.14 : 0.08;
    ctx.fillStyle = 'rgba(6,11,10,.9)'; rr(bx - 6, by - 4, bw + 12, 26, 6);
    ctx.fillStyle = '#1b2621'; ctx.fillRect(bx, by, bw, 10);
    ctx.fillStyle = 'rgba(125,255,155,.75)'; ctx.fillRect(bx + bw * clamp(ideal - band, 0, 1), by, bw * (Math.min(1, ideal + band) - Math.max(0, ideal - band)), 10);
    const c = h.charging ? h.charge : 0; ctx.fillStyle = '#ffd23f'; ctx.fillRect(bx + bw * c - 2, by - 3, 4, 16);
    ctx.font = `700 11px ${UI}`; ctx.fillStyle = '#c9d3cb'; ctx.fillText(t.charge >= 25 ? 'POWER · CHARGED: WIDER SWEET SPOT' : 'POWER', LW / 2, by + 17);
  }
  ctx.textBaseline = 'alphabetic';
}

/* Foul Play FC · ai.js
   Bot decision making.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- AI ---------------- */
function steer(p, tx, ty, mul = 1, arrive = 24) {
  const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
  if (d < 3) { p.dx = p.dy = 0; return; }
  const m = Math.min(1, d / arrive) * mul; p.dx = dx / d * m; p.dy = dy / d * m;
}
function nearestOpp(p) { let best = null, bd = 1e9; for (const q of S.players) { if (q.team === p.team || !able(q)) continue; const d = dist(p, q); if (d < bd) { bd = d; best = q; } } return best; }
function homePos(p, attacking) {
  const dir = p.team === 0 ? 1 : -1, own = p.team === 0 ? 0 : W;
  const prog = (p.team === 0 ? S.ball.x : W - S.ball.x) / W;
  const fx = clamp(ROLES[p.i][0] + (prog - 0.5) * 0.45 + (attacking ? 0.1 : -0.03), 0.08, 0.92);
  return { x: own + dir * fx * W, y: clamp(ROLES[p.i][1] * H + (S.ball.y - H / 2) * 0.3, 30, H - 30) };
}
function botPass(p, longOK, forwardOnly) {
  const dir = p.team === 0 ? 1 : -1; let best = null, bs = -1e9;
  for (const q of S.players) {
    if (q === p || q.team !== p.team || !able(q)) continue;
    const d = dist(p, q); if (d < 45 || d > (longOK ? 650 : 430)) continue;
    const fwd = (q.x - p.x) * dir; if (forwardOnly && fwd < 30) continue;
    const no = nearestOpp(q), near = no ? dist(no, q) : 200;
    let sc = fwd * 0.6 + Math.min(laneOpen(p, q), 60) * 1.5 + Math.min(near, 100) * 0.8 - d * 0.2 + (q.human ? 25 : 0);
    if (q.gk) sc -= 220;
    if (sc > bs) { bs = sc; best = q; }
  }
  if (best && bs > 20) { passTo(p, best, dist(p, best) > 380 ? 'air' : 'auto'); return true; }
  return false;
}
function botWithBall(p, dt) {
  const dir = p.team === 0 ? 1 : -1, gx = p.team === 0 ? W : 0;
  p.hold += dt;
  if (p.gk) { if (p.hold > 0.7 && !botPass(p, true)) shoot(p, 0.75, H / 2 + rand(-200, 200)); else p.dx = p.dy = 0; return; }
  const dG = Math.hypot(gx - p.x, H / 2 - p.y), opp = nearestOpp(p), press = opp ? dist(p, opp) : 999;
  if (dG < SHOOT_RANGE && p.hold > 0.2 && (Math.random() < dt * 2.5 || dG < SHOOT_RANGE * 0.57)) {
    const gk = S.players.find(q => q.gk && q.team !== p.team && onPitch(q));
    const aim = H / 2 + (gk && gk.y < H / 2 ? 1 : -1) * GOAL_HALF * 0.7 + rand(-14, 14);
    shoot(p, rand(0.5, 0.95), aim); return;
  }
  if (press < 48 && p.hold > 0.35 && Math.random() < dt * 4 && botPass(p)) return;
  if (p.hold > 1.6 && Math.random() < dt * 0.8 && botPass(p, false, true)) return;
  if (throwCount(p) > 0 && opp && press < 60 && (opp.x - p.x) * dir < 0 && Math.random() < dt * 1.5) useThrowable(p);
  let vx = gx - p.x, vy = H / 2 + (p.y < H / 2 ? -40 : 40) - p.y; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  if (opp && press < 90) { const ax = p.x - opp.x, ay = p.y - opp.y, al = Math.hypot(ax, ay) || 1, w = 1.2 * (90 - press) / 90; vx += ax / al * w; vy += ay / al * w; }
  const m = Math.hypot(vx, vy) || 1; p.dx = vx / m; p.dy = vy / m;
  p.sprintWant = p.stamina > 45 && press < 110;
}
function botAggro(p, dt) {
  if (p.foulCd > 0) return;
  if (p.karma > 5) {   // good-karma bots sometimes help a downed player up
    const down = S.players.find(q => q !== p && onPitch(q) && q.stun > 0.4 && q.ko <= 0 && dist(p, q) < reachOf(p));
    if (down && Math.random() < dt * 0.5 * (p.karma / 40)) { helpUp(p, down); return; }
  }
  if (S.admin && S.admin.bots === 'peaceful') return;
  const near = inReach(p).filter(q => q.stun <= 0);
  if (!near.length) return;
  let target = near.find(q => S.ball.owner === q && q.team !== p.team), rate = 0;
  if (target) rate = p.aggr * 1.6;
  else {
    target = near.filter(q => q.team !== p.team).sort((u, v) => u.karma - v.karma)[0];   // dirtiest player in reach first
    if (target) rate = p.aggr * 0.12;
    else { target = near.find(q => S.ball.owner === q && q.pop > p.pop + 15); if (target) rate = p.aggr * 0.1; }
  }
  if (!target) return;
  if (p.gk) rate *= 0.4;
  if (p.items.bat > 0 || p.items.sword > 0) rate *= 1.5;
  rate *= (1 + Math.max(0, -target.karma) / 40) * (1 + S.heat);   // low karma draws revenge; a dirty match heats everyone up
  const ws = S.refs.filter(r => sees(r, p.x, p.y));
  if (ws.length && p.items.smoke > 0 && Math.random() < dt) { p.throwSel = 'smoke'; useThrowable(p); return; }
  if (ws.length) {
    const flash = p.items.flash > 0, R = flash ? 260 : 160;
    const canBlind = p.blindCd <= 0 && (flash || (p.blind >= 1 && ws.length === 1)) && ws.every(r => Math.hypot(r.x - p.x, r.y - p.y) < R);
    if (canBlind && Math.random() < p.aggr * 1.6 * dt) { doBlind(p, false); return; }
    rate *= 0.04;
  }
  if (Math.random() < rate * dt * (S.admin && S.admin.bots === 'savage' ? 6 : 1)) doFoul(p, target, p.stamina >= 15 && (dist(p, target) > reachOf(p) || Math.random() < 0.3) ? 'kick' : 'punch');
}
function gkLogic(p) {
  const gx = p.team === 0 ? 18 : W - 18, b = S.ball;
  // Dive at a shot that will pass within reach but too wide to step across to.
  if (p.dive <= 0 && p.diveDown <= 0 && !b.owner && b.lastTouch && b.lastTouch.team !== p.team && Math.sign(b.vx) === (p.team === 0 ? -1 : 1) && Math.abs(b.vx) > 260) {
    const t = (p.x - b.x) / b.vx;
    if (t > 0 && t < 0.6) {
      const off = b.y + b.vy * t - p.y;
      if (Math.abs(off) > 14 && Math.abs(off) < DIVE_REACH && b.z + b.vz * t - GRAV() / 2 * t * t < GOAL_H + 12) {
        p.dive = 0.42; p.diveVx = (gx - p.x) * 2; p.diveVy = Math.sign(off) * Math.min(440, Math.abs(off) / 0.28); p.diveDir = Math.sign(off);
        M(p, 'dives'); EV('dive', p, {});
        return;
      }
    }
  }
  if (p.dive > 0 || p.diveDown > 0) { p.dx = p.dy = 0; return; }
  const ty = clamp(H / 2 + (b.y - H / 2) * 0.4, H / 2 - GOAL_HALF + 4, H / 2 + GOAL_HALF - 4);
  const danger = (!b.owner || b.owner.team !== p.team) && inBox(b.x, b.y, p.team) && Math.hypot(b.x - gx, b.y - H / 2) < GK_RUSH;
  if (danger) steer(p, b.x, b.y, 1.15, 6);
  else {
    const incoming = !b.owner && Math.sign(b.vx) === (p.team === 0 ? -1 : 1) && Math.abs(b.vx) > 250;
    if (incoming) { const t = (gx - b.x) / b.vx, iy = b.y + b.vy * Math.max(0, t); steer(p, gx, clamp(iy, H / 2 - GOAL_HALF, H / 2 + GOAL_HALF), 1.3, 6); }
    else steer(p, gx, ty, 0.9, 20);
  }
}
function botControl(p, dt, info) {
  p.dx = p.dy = 0; p.sprintWant = false;
  if (S.admin && S.admin.bots === 'frozen') return;
  const b = S.ball;
  if (p.cls && (p.aiT = (p.aiT || 0) - dt) <= 0) { p.aiT = rand(0.5, 0.9); botSkills(p);
    if ((p.items.sling > 0 || p.items.blaster > 0) && b.owner && b.owner.team !== p.team && dist(p, b.owner) < 380 && Math.random() < 0.5) { p.face = Math.atan2(b.owner.y - p.y, b.owner.x - p.x); p.dx = p.dy = 0; fireWeapon(p); } }
  if (hasBf(p, 'confused')) { p.dx = Math.cos(S.time * 3 + p.id); p.dy = Math.sin(S.time * 2.3 + p.id); return; }
  if (b.owner === p) { botWithBall(p, dt); return; }
  if (p.carry != null) {   // carrying the referee: walk them away from the ball, then throw them further
    const ax = p.x - b.x, ay = p.y - b.y, al = Math.hypot(ax, ay) || 1;
    steer(p, clamp(p.x + ax / al * 120, 20, W - 20), clamp(p.y + ay / al * 120, 20, H - 20)); p.face = Math.atan2(ay, ax);
    if (p.carryT > 1.4) { p.dx = ax / al; p.dy = ay / al; throwRef(p); }
    return;
  }
  if (!p.gk && p.z <= 0 && !b.owner && b.z > 22 && b.z < 80 && b.vz < 0 && dist(p, b) < 46 && p.stamina > 10 && Math.random() < 0.25) {   // rise for a header
    if (jump(p)) { const gx = p.team === 0 ? W : 0, att = Math.abs(gx - p.x) < W * 0.4; p.face = Math.atan2(H / 2 - p.y, gx - p.x); p.dx = p.dy = 0; p.airAct = { k: att ? 'shoot' : 'lpass', t: 0.6 }; }
  }
  if (!p.gk && p.karma < -5 && p.carry == null && Math.random() < dt * 0.08) {   // dirty bots sometimes hide the referee
    const r = S.refs.find(r => !r.human && !(r.gone > 0) && r.carriedBy == null && !r.fly && dist(p, r) < 34);
    if (r && S.players.some(q => q.team === p.team && dist(q, b) < 200 && q.foulCd <= 0)) { liftRef(p); return; }
  }
  const pirate = anomRescueTarget(p); if (pirate) { steer(p, pirate.x, pirate.y, 1, 0); p.sprintWant = p.stamina > 10; return; }
  botAggro(p, dt);
  if (p.gk) { gkLogic(p); return; }
  if (p.expect > 0 && !b.owner) { steer(p, b.x + b.vx * 0.15, b.y + b.vy * 0.15, 1, 8); return; }
  const T = info[p.team];
  if (p === T.chaser) {
    const vx = b.owner ? b.owner.vx : b.vx, vy = b.owner ? b.owner.vy : b.vy;
    const dec = S.decoys.find(d => d.team !== p.team && dist(d, p) < 250);
    if (dec) { if (dec.fooled === undefined) dec.fooled = Math.random() < 0.6; if (dec.fooled) { steer(p, dec.x, dec.y, 1, 6); return; } }
    steer(p, b.x + vx * 0.25, b.y + vy * 0.25, 1, 6);
    p.sprintWant = p.stamina > 35 && dist(p, b) > 70;
    if (b.owner && b.owner.team !== p.team && dist(p, b) < 34 && p.lungeCd <= 0 && Math.random() < dt * 2) { p.lunge = 0.2; p.lungeCd = 1.2; }
    else if (b.owner && b.owner.team !== p.team && dist(p, b) < 70 && dist(p, b) > 34 && p.slideCd <= 0 && p.stamina > 30 && Math.random() < dt * 0.5) { p.face = Math.atan2(b.y - p.y, b.x - p.x); p.dx = Math.cos(p.face); p.dy = Math.sin(p.face); slideTackle(p); }
    return;
  }
  const gift = S.items.find(i => i.landed && i.for === p && dist(i, p) < 240);
  if (gift) { steer(p, gift.x, gift.y); return; }
  if (p === T.second && !T.attacking) { const og = p.team === 0 ? 0 : W; steer(p, og + (b.x - og) * 0.65, H / 2 + (b.y - H / 2) * 0.8, 0.95, 20); return; }
  const h = homePos(p, T.attacking); steer(p, h.x, h.y, 0.85, 40);
}

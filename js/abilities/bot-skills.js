/* Foul Play FC · js/abilities/bot-skills.js
   When bots use their skills.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- bots using skills ---------- */
function botSkills(p) {
  if (!p.cls || !able(p) || hasBf(p, 'marked')) return;
  const C = CLS[p.cls], b = S.ball, own = b.owner === p, carrier = b.owner, enemyBall = carrier && carrier.team !== p.team, g = goalOf(p.team), dg = Math.hypot(g.x - p.x, g.y - p.y);
  const enemyNear = r => enemiesOf(p).some(q => dist(q, p) < r);
  const allyLow = alliesOf(p).some(q => q.hp < 45 && dist(q, p) < 300), allyKO = alliesOf(p).some(q => q.ko > 0 && dist(q, p) < 300);
  const want = {
    powerShot: own && dg < SHOOT_RANGE * 1.2, curveDrive: own && dg < SHOOT_RANGE * 1.2 && enemyNear(120), aerial: !b.owner && b.z > 25 && dist(p, b) < 120 && dg < SHOOT_RANGE * 1.4,
    meteor: dg < W * 0.45 && (own || (carrier && carrier.team === p.team)),
    cloak: enemyBall && dist(p, carrier) < 200, blink: enemyBall && dist(p, carrier) < 220, phantom: own && enemyNear(110), dimension: own && dg > SHOOT_RANGE && dg < W * 0.6,
    dash: own && enemyNear(90), afterimage: own && enemyNear(150), speedDribble: own && enemyNear(160), timeRush: own && dg < W * 0.55,
    bodyBlock: !own && b.lastTouch && b.lastTouch.team !== p.team && Math.hypot(b.vx, b.vy) > 350 && dist(p, b) < 160, bullRush: enemyBall && dist(p, carrier) < 200, quake: enemiesOf(p).filter(q => dist(q, p) < 75).length >= 2, titan: enemyBall && dist(carrier, { x: W - g.x, y: H / 2 }) < W * 0.3,
    intervene: enemyBall && dist(p, carrier) < 240 && dist(p, carrier) > 40, zoneLock: enemyBall && dist(p, carrier) < 300, tackleCharge: enemyBall && dist(p, carrier) < 120, absoluteMark: enemyBall && dist(p, carrier) < 400,
    diveSave: false, wideGuard: !b.owner && b.lastTouch && b.lastTouch.team !== p.team && Math.hypot(b.vx, b.vy) > 400 && Math.abs(b.x - (W - g.x)) < 350, aerialGrab: !b.owner && b.z > 40 && dist(p, b) < 80, infinity: enemyBall && Math.abs(carrier.x - (W - g.x)) < SHOOT_RANGE,
    precision: own && enemyNear(100), tactical: own && dg < W * 0.5, assistMark: own, perfect: own || (carrier && carrier.team === p.team),
    healBurst: allyLow || p.hp < 45, cleanse: alliesOf(p).some(q => (q.stun > 0.6 || q.slowT > 0 || hasBf(q, 'marked')) && dist(q, p) < 300), revive: allyKO, lifeweaver: allyLow,
    morale: S.score[p.team] <= S.score[1 - p.team], statAura: alliesOf(p).filter(q => dist(q, p) < 160).length >= 2, surge: alliesOf(p).some(q => q.stamina < 40 && dist(q, p) < 160), awaken: carrier && carrier.team === p.team,
    heavyPunch: enemyBall && dist(p, carrier) < 55 && p.aggr > 0.5, grabThrow: enemyBall && dist(p, carrier) < 50, groundSlam: enemiesOf(p).filter(q => dist(q, p) < 85).length >= 2, rage: enemyNear(150),
    clone: own && enemyNear(140), trap: enemyBall && dist(p, carrier) < 300, jammer: p.aggr > 0.6 && enemyNear(70), illusion: own || (carrier && carrier.team === p.team && dist(carrier, p) < 300),
    projPass: own && enemyNear(110), gravity: enemyBall && dist(p, carrier) < 400, slowBomb: enemyBall && dist(p, carrier) < 420, orbital: enemyBall && dist(p, carrier) < 600
  };
  const order = [3, 0, 1, 2];
  for (const slot of order) {
    const def = slot === 3 ? C.ult : C.skills[slot];
    if (!want[def.id]) continue;
    if (slot === 3 ? (p.ult || 0) < 100 : p.cd[slot] > 0) continue;
    if (Math.random() < 0.55) continue;   // bots don't fire everything the instant it's ready
    const saved = p.human; p.human = null;
    const aimAt = enemyBall ? carrier : own ? { x: g.x, y: H / 2 + rand(-60, 60) } : b;
    const old = { dx: p.dx, dy: p.dy, face: p.face }; p.face = Math.atan2(aimAt.y - p.y, aimAt.x - p.x); p.dx = Math.cos(p.face); p.dy = Math.sin(p.face);
    const ok = castSkill(p, slot);
    if (!ok) { p.face = old.face; p.dx = old.dx; p.dy = old.dy; }
    p.human = saved;
    if (ok) return;
  }
}

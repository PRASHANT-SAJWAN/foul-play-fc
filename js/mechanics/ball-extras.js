/* Foul Play FC · js/mechanics/ball-extras.js
   Ball extras: woodwork and bodies blocking the ball.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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

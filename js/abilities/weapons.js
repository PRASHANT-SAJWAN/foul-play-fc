/* Foul Play FC · js/abilities/weapons.js
   The base attack (with aim assist and a short lunge) and ranged weapons (slingshot, foam blaster).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- the base attack ---------- */
// Who a base attack would hit, with aim assist: the player nearest your aim inside the cone. Opponents first;
// a team-mate only when they are right in front of you and in reach. A downed player gets helped up instead.
const ATK_CONE = 0.6;
function attackPlan(p) {
  const RW = weaponOf(p, 'ranged');
  if (RW) { const rg = (RW.range || SLASH.range) * (p.cls === 'ranger' ? 1.15 : 1), t = assistPick(p, enemiesOf(p).filter(q => q.ko <= 0), rg, (RW.arc || SLASH.arc) / 2); return { ranged: RW, target: t, ang: t ? Math.atan2(t.y - p.y, t.x - p.x) : passDir(p), range: rg, cone: (RW.arc || SLASH.arc) / 2 }; }
  const reach = reachOf(p), range = reach + LUNGE;
  const cand = S.players.filter(q => q !== p && onPitch(q) && q.ko <= 0 && !onBench(q) && (q.team !== p.team ? q.stun <= 0 || dist(q, p) <= reach + 6 : dist(q, p) <= reach + 6));
  const t = assistPick(p, cand, range, ATK_CONE, q => q.team === p.team ? 120 : 0);
  return { target: t, ang: t ? Math.atan2(t.y - p.y, t.x - p.x) : passDir(p), range, reach, help: !!(t && t.stun > 0) };
}
function baseAttack(p, plan) {
  plan = plan || attackPlan(p);
  if (plan.ranged) { fireWeapon(p, plan.ang); return true; }
  if (p.foulCd > 0 || p.atkLunge) return false;
  const t = plan.target;
  if (!t) { p.foulCd = 0.35; a0Anim(p, 'punch', 0.3); sfx('whoosh'); if (p.human) floatText(p, 'Missed', '#c8c8c8'); return false; }   // a swing at thin air
  p.face = Math.atan2(t.y - p.y, t.x - p.x);
  if (dist(p, t) <= plan.reach + 6) return doFoul(p, t);
  p.atkLunge = { t: t.id, ttl: 0.24 };   // step in, then strike (js/abilities/update.js)
  a0Anim(p, 'punch', 0.3); return true;
}

/* ---------- slashes: ranged weapons and skill shots ---------- */
// A sword-slash wave: everyone on the other team inside a crescent in front of you (range, arc) is hit at once,
// and a loose ball in it is knocked along. Replaces the old bullets and pellets.
const SLASH = { range: 135, arc: 1.9 };   // arc in radians: about 110°
function slashArc(p, ang, W, o = {}) {
  const range = (o.range || W.range || SLASH.range) * (p.cls === 'ranger' ? 1.15 : 1), arc = o.arc || W.arc || SLASH.arc;
  p.face = ang; a0Anim(p, 'swing', 0.3); thump(W.sound || 400, 0.08, 0.06); sfx('whoosh');
  fxEvent('slash', p, { side: Math.round(ang * 1000), team: Math.round(range), col: W.col, arc: Math.round(arc * 100) });
  let hits = 0;
  for (const q of enemiesOf(p)) {
    if (q.ko > 0 || (q.z || 0) > 40) continue;
    const d = dist(p, q); if (d > range + 8) continue;
    if (d > 14 && Math.abs(angDiff(ang, Math.atan2(q.y - p.y, q.x - p.x))) > arc / 2) continue;
    weaponHit(p, q, { x: p.x, y: p.y, vx: 0, vy: 0, w: W.id }); hits++;
  }
  const b = S.ball;
  if (!b.owner && dist(p, b) < range && (b.z || 0) < 30 && Math.abs(angDiff(ang, Math.atan2(b.y - p.y, b.x - p.x))) < arc / 2) {
    const push = 380 + 500 * (W.ballPush || 0.3); b.vx = Math.cos(ang) * push; b.vy = Math.sin(ang) * push; b.vz = Math.max(b.vz || 0, 60); b.lastTouch = p;
  }
  return hits;
}
function fireWeapon(p, ang) {   // swings the best ranged weapon held (js/player/player.js) as a slash along ang, or your aim
  const W = weaponOf(p, 'ranged'); if (!W) return;
  if (p.fireCd > 0) return;
  const a = ang != null ? ang : passDir(p);
  p.items[W.id]--; p.fireCd = W.cd;
  slashArc(p, a, W); M(p, 'shotsFired');
  if (watched(p)) { const r0 = S.refs[0]; if (r0) { r0.att = { x: p.x, y: p.y }; r0.attT = 1; } }
}

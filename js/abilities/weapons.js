/* Foul Play FC · js/abilities/weapons.js
   The base attack (with aim assist and a short lunge) and ranged weapons (slingshot, foam blaster).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- the base attack ---------- */
// Who a base attack would hit, with aim assist: the player nearest your aim inside the cone. Opponents first;
// a team-mate only when they are right in front of you and in reach. A downed player gets helped up instead.
const ATK_CONE = 0.6, RANGED_RANGE = 600;
function attackPlan(p) {
  const RW = weaponOf(p, 'ranged');
  if (RW) { const t = assistPick(p, enemiesOf(p).filter(q => q.ko <= 0), RANGED_RANGE, 0.35); return { ranged: RW, target: t, ang: t ? Math.atan2(t.y - p.y, t.x - p.x) : passDir(p), range: RANGED_RANGE }; }
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

/* ---------- ranged weapons ---------- */
function fireWeapon(p, ang) {   // fires the best ranged weapon held (js/player/player.js) along ang, or your aim
  const W = weaponOf(p, 'ranged'); if (!W) return;
  if (p.fireCd > 0) return;
  const a = ang != null ? ang : passDir(p), r = p.cls === 'ranger' ? 1.15 : 1, sp = W.speed * r;
  p.items[W.id]--; p.fireCd = W.cd; p.face = a;
  S.projs.push({ type: W.proj, w: W.id, x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, z: 22 + (p.z || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: W.ttl * r, team: p.team, owner: p.id });
  a0Anim(p, W.anim, 0.25); thump(W.sound, 0.06, 0.05); M(p, 'shotsFired');
  if (watched(p)) { const r0 = S.refs[0]; if (r0) { r0.att = { x: p.x, y: p.y }; r0.attT = 1; } }
}

/* Foul Play FC · js/abilities/weapons.js
   Ranged weapons (slingshot, foam blaster).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- ranged weapons ---------- */
function fireWeapon(p) {   // fires the best ranged weapon held (js/player/player.js), or punches
  const W = weaponOf(p, 'ranged');
  if (!W) {   // no weapon: punch whoever is nearest the aim
    const pt = aimFor(p, 120), t = unitNear(inReach(p), pt);
    if (t) doFoul(p, t, p.z > 0 ? 'kick' : 'punch'); else if (p.human) floatText(p, 'No one in reach', '#c8c8c8');
    return;
  }
  if (p.fireCd > 0) return;
  const pt = aimFor(p, 600), a = Math.atan2(pt.y - p.y, pt.x - p.x), r = p.cls === 'ranger' ? 1.15 : 1, sp = W.speed * r;
  p.items[W.id]--; p.fireCd = W.cd; p.face = a;
  S.projs.push({ type: W.proj, w: W.id, x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, z: 22 + (p.z || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: W.ttl * r, team: p.team, owner: p.id });
  a0Anim(p, W.anim, 0.25); thump(W.sound, 0.06, 0.05); M(p, 'shotsFired');
  if (watched(p)) { const r0 = S.refs[0]; if (r0) { r0.att = { x: p.x, y: p.y }; r0.attT = 1; } }
}

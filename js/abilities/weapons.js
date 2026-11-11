/* Foul Play FC · js/abilities/weapons.js
   Ranged weapons (slingshot, foam blaster).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- ranged weapons ---------- */
function fireWeapon(p) {
  const w = p.items.sling > 0 ? 'sling' : p.items.blaster > 0 ? 'blaster' : null;
  if (!w) {   // no weapon: punch whoever is nearest the aim
    const pt = aimFor(p, 120), t = unitNear(inReach(p), pt);
    if (t) doFoul(p, t, p.z > 0 ? 'kick' : 'punch'); else if (p.human) floatText(p, 'No one in reach', '#c8c8c8');
    return;
  }
  if (p.fireCd > 0) return;
  const pt = aimFor(p, 600), a = Math.atan2(pt.y - p.y, pt.x - p.x), r = p.cls === 'ranger' ? 1.15 : 1, sp = (w === 'sling' ? 720 : 580) * r;
  p.items[w]--; p.fireCd = w === 'sling' ? 0.6 : 0.2; p.face = a;
  S.projs.push({ type: w === 'sling' ? 'pebble' : 'dart', x: p.x + Math.cos(a) * 12, y: p.y + Math.sin(a) * 12, z: 22 + (p.z || 0), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: (w === 'sling' ? 0.8 : 0.6) * r, team: p.team, owner: p.id });
  a0Anim(p, w === 'sling' ? 'swing' : 'punch', 0.25); thump(w === 'sling' ? 260 : 600, 0.06, 0.05); M(p, 'shotsFired');
  if (watched(p)) { const r0 = S.refs[0]; if (r0) { r0.att = { x: p.x, y: p.y }; r0.attT = 1; } }
}

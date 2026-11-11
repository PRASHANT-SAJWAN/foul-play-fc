/* Foul Play FC · js/player/player.js
   The player's loadout: one place to add weapons and abilities.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order.

   ── Adding a weapon ─────────────────────────────────────────────────────────
   defineWeapon({ id, name, kind: 'melee' | 'ranged', ... }) is all it takes. A player
   holds a count of uses in p.items[id]; giveWeapon(p, id) hands out a batch.
   The best weapon a player holds (highest priority) replaces their punch (melee)
   or fires on the foul key (ranged). Pick-ups, the hotbar slot, the in-hand drawing,
   bots, online sync and the 3D model all read from this registry.

     melee:  reach, dmg, kb (knockback), stun, injury: [chance, amount], heavy (seen = red card),
             verb (for the feed), whack (comic word index in WHACKS), fx ('bat' = slow-mo crack),
             anim, hand ('sword' | 'bat': which 3D mesh to show), draw2d(P, s) for the classic view
     ranged: proj ('pebble' | 'dart': how the shot looks), speed, cd (seconds between shots), ttl,
             anim, sound (pitch), hit: { dmg, stun, kb, slow } or onHit(owner, target, proj),
             ballPush (how hard a hit knocks the ball on)

   ── Adding an ability ───────────────────────────────────────────────────────
   defineAbility({ id, name, cd, aim: 'self' | 'point' | 'enemy' | 'ally', range, desc }, (p, pt, target) => { ... })
   registers the effect (return false to cancel the cast). Then either put it in a class
   with setClassAbility(classId, slot, id) (slot 0–2, or 3 for the ultimate), or give it to
   one player for the match with setPlayerAbility(p, slot, id). Every class skill is also
   registered here, so ABILITIES lists everything that can be cast.
*/
'use strict';

/* ---------------- weapons ---------------- */
const WEAPONS = {};
function defineWeapon(def) {
  const W = Object.assign({ kind: 'melee', uses: 3, priority: 0, col: '#ffffff', anim: def.kind === 'ranged' ? 'punch' : 'swing' }, def);
  if (W.kind === 'melee') Object.assign(W, Object.assign({ reach: 60, dmg: 26, kb: 240, stun: 2, injury: [0.5, 15], heavy: true, verb: `hit (${W.name.toLowerCase()})`, whack: 1 }, def));
  else Object.assign(W, Object.assign({ proj: 'pebble', speed: 650, cd: 0.5, ttl: 0.7, sound: 400, hit: { dmg: 6 }, ballPush: 0.3 }, def));
  WEAPONS[W.id] = W;
  if (!ITEM_LABEL[W.id]) ITEM_LABEL[W.id] = W.name.toLowerCase();
  if (!ITEM_COL[W.id]) ITEM_COL[W.id] = W.col;
  return W;
}
// The best weapon of a kind the player holds, or null.
function weaponOf(p, kind) {
  let best = null;
  for (const id in WEAPONS) { const W = WEAPONS[id]; if (W.kind === kind && (p.items[id] || 0) > 0 && (!best || W.priority > best.priority)) best = W; }
  return best;
}
function giveWeapon(p, id, n) {
  const W = WEAPONS[id]; if (!W || !p) return;
  const k = n == null ? W.uses : n; p.items[id] = (p.items[id] || 0) + k;
  floatText(p, `${W.name.toUpperCase()} ×${k}`, W.col);
}
const weaponCounts = p => { const o = {}; for (const id in WEAPONS) if (p.items[id]) o[id] = p.items[id]; return o; };

defineWeapon({ id: 'sword', name: 'Sword', kind: 'melee', uses: 3, priority: 2, col: '#d9e2ec', reach: 66, dmg: 30, kb: 260, stun: 2.2, injury: [0.7, 22], verb: 'slashed at', whack: 0, fx: 'bat', hand: 'sword',
  draw2d: (P, s) => { ctx.lineCap = 'round'; ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 2.2 * s; ctx.beginPath(); ctx.moveTo(P.x + 7 * s, P.y - 17 * s); ctx.lineTo(P.x + 15 * s, P.y - 35 * s); ctx.stroke(); ctx.strokeStyle = '#c9a050'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(P.x + 4 * s, P.y - 19 * s); ctx.lineTo(P.x + 11 * s, P.y - 16 * s); ctx.stroke(); } });
defineWeapon({ id: 'bat', name: 'Bat', kind: 'melee', uses: 3, priority: 1, col: '#ffcf5a', reach: 60, dmg: 34, kb: 260, stun: 2.2, injury: [0.7, 22], verb: 'swung a bat at', whack: 5, fx: 'bat', hand: 'bat',
  draw2d: (P, s) => { ctx.strokeStyle = '#a0682f'; ctx.lineWidth = 2.6 * s; ctx.beginPath(); ctx.moveTo(P.x + 7 * s, P.y - 18 * s); ctx.lineTo(P.x + 13 * s, P.y - 30 * s); ctx.stroke(); } });
defineWeapon({ id: 'sling', name: 'Slingshot', kind: 'ranged', uses: 5, priority: 2, col: '#c9b48a', proj: 'pebble', speed: 720, cd: 0.6, ttl: 0.8, anim: 'swing', sound: 260, hit: { dmg: 10, stun: 0.9, kb: 120 }, ballPush: 0.45 });
defineWeapon({ id: 'blaster', name: 'Foam blaster', kind: 'ranged', uses: 10, priority: 1, col: '#ff9f43', proj: 'dart', speed: 580, cd: 0.2, ttl: 0.6, anim: 'punch', sound: 600, hit: { dmg: 4, slow: 1 }, ballPush: 0.15 });

// A ranged weapon's shot landing on a player.
function weaponHit(owner, target, pr) {
  const W = WEAPONS[pr.w] || WEAPONS.sling;
  if (W.onHit) { W.onHit(owner, target, pr); return; }
  const h = W.hit || {};
  knock(owner, target, { dmg: h.dmg || 0, stun: h.stun || 0, kb: h.kb || 0, from: { x: pr.x - pr.vx, y: pr.y - pr.vy }, foul: true, kind: 'ranged', col: W.col });
  if (h.slow) target.slowT = Math.max(target.slowT || 0, h.slow);
}

/* ---------------- abilities ---------------- */
const ABILITIES = {};
for (const C of CLASSES) for (const s of [...C.skills, C.ult]) ABILITIES[s.id] = s;   // every class skill is castable by id
function defineAbility(def, effect) {
  const A = Object.assign({ cd: 10, aim: 'self', desc: '' }, def);
  ABILITIES[A.id] = A;
  if (effect) SKILL_FX[A.id] = effect;
  return A;
}
function setClassAbility(classId, slot, id) {   // change a class's skill (slot 0–2) or ultimate (3) for everyone
  const C = CLS[classId], A = ABILITIES[id]; if (!C || !A) return false;
  if (slot === 3) C.ult = A; else C.skills[slot] = A;
  return true;
}
function setPlayerAbility(p, slot, id) {   // one player only, for this match; null puts the class skill back
  p.abil = p.abil || {};
  if (id == null) delete p.abil[slot]; else if (ABILITIES[id]) p.abil[slot] = id;
  if (slot < 3 && p.cd) p.cd[slot] = 0;
}

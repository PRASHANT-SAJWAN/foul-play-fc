/* Foul Play FC · js/abilities/buffs.js
   Buffs and the multipliers they apply (damage, speed, shots, tackles).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- buffs and multipliers ---------- */
const BF = (p, k, t) => { if (!p) return; p.bf = p.bf || {}; p.bf[k] = Math.max(p.bf[k] || 0, t); };
const hasBf = (p, k) => !!(p && p.bf && p.bf[k] > 0);
const enemiesOf = p => S.players.filter(q => q.team !== p.team && onPitch(q));
const alliesOf = p => S.players.filter(q => q.team === p.team && onPitch(q));
const inAttackThird = p => p.team === 0 ? p.x > W * 2 / 3 : p.x < W / 3;
function nearAura(p) { return S.players.some(q => q !== p && q.team === p.team && q.cls === 'aura' && onPitch(q) && dist(q, p) < 160); }
function inZone(p, type, friendly) { return (S.zones || []).some(z => z.type === type && (friendly ? z.team === p.team : z.team !== p.team) && Math.hypot(p.x - z.x, p.y - z.y) < z.r); }
function speedMul(p) {
  const b = p.bf || {}; let m = 1;
  if (p.cls === 'striker' && inAttackThird(p)) m *= 1.1;
  if (p.cls === 'speedster') m *= 1 + 0.07 * (p.stk || 0);
  if (b.shadow > 0) m *= 1.15;
  if (b.speedDribble > 0 && S.ball.owner === p) m *= 1.35;
  if (b.timeRush > 0) m *= 1.4;
  if (b.perfect > 0 || b.awaken > 0) m *= 1.3;
  if (b.boost > 0) m *= 1.15; if (b.assist > 0) m *= 1.2; if (b.morale > 0) m *= 1.08; if (b.auraSpd > 0) m *= 1.12; if (b.rage > 0) m *= 1.1;
  if (b.marked > 0 && S.ball.owner === p) m *= 0.6;
  if (nearAura(p)) m *= 1.06;
  const CM = CLS[p.cls] && CLS[p.cls].mods; if (CM && CM.speed) m *= CM.speed(p);   // passives of classes from js/player/
  m *= traitSpeed(p) * groundSpeed(p) * ballModSpeed(p);   // roles, mud, the iron ball (combat.js, arenas.js, ball-mods.js)
  if (inZone(p, 'tactical', true)) m *= 1.15;
  if (inZone(p, 'zoneLock') || inZone(p, 'gravity') || inZone(p, 'slowBomb')) m *= 0.6;
  if (S.players.some(q => q.team !== p.team && q.bf && q.bf.timeRush > 0 && dist(q, p) < 90)) m *= 0.7;
  return m;
}
function shotMul(p) {
  const b = p.bf || {}; let m = 1;
  if (p.cls === 'striker' && inAttackThird(p)) m *= 1.2;
  if (b.perfect > 0) m *= 1.25; if (b.awaken > 0) m *= 1.3; if (b.assist > 0) m *= 1.3; if (b.auraOff > 0) m *= 1.15; if (b.morale > 0) m *= 1.08;
  if (nearAura(p)) m *= 1.05;
  if (inZone(p, 'tactical', true)) m *= 1.15;
  if (hasSyn(p.team, 'push')) m *= 1.05;
  return m;
}
function dmgOut(a) {
  if (!a) return 1;
  let m = 1;
  if (a.cls === 'brawler') m *= 1 + 0.1 * (a.stk || 0);
  if (hasBf(a, 'rage')) m *= 1.25;
  if (hasBf(a, 'cloakHit')) { m *= 1.4; a.bf.cloakHit = 0; }
  const CM = CLS[a.cls] && CLS[a.cls].mods; if (CM && CM.dmgOut) m *= CM.dmgOut(a);
  return m;
}
function dmgIn(t) {
  let m = 1;
  if (t.cls === 'tank') m *= 0.75;
  if ((S.zones || []).some(z => z.type === 'dome' && z.team === t.team && Math.hypot(t.x - z.x, t.y - z.y) < z.r)) m *= 0.5;
  if (hasBf(t, 'auraDef')) m *= 0.8; if (hasBf(t, 'awaken')) m *= 0.8;
  if (hasSyn(t.team, 'wall')) m *= 0.9;
  return m;
}
// Keepers stand firm: they can't be knocked down, staggered or robbed of the ball until their HP is low or they're knocked out.
const KEEPER_KNOCK_HP = 35;
const gkFirm = p => !!p && !!p.gk && p.ko <= 0 && p.hp > KEEPER_KNOCK_HP;
const firmText = p => gkFirm(p) ? 'KEEPER STANDS FIRM' : 'UNSTOPPABLE';
const knockImmune = p => gkFirm(p) || hasBf(p, 'timeRush') || hasBf(p, 'rage') || hasBf(p, 'immune') || (p.cls === 'tank' && (p.lunge > 0 || p.slide > 0));
const refIgnores = p => !!p && (hasBf(p, 'cloak') || hasBf(p, 'stealth') || hasBf(p, 'awaken'));
function tackleMul(stealer, carrier) {
  let m = 1;
  if (stealer.cls === 'defender') m *= 1.15;
  m *= traitTackle(stealer);   // enforcers and enraged teams win more tackles
  if (carrier.cls === 'speedster' && carrier.stk >= 3) m *= 0.85;
  if (inZone(carrier, 'zoneLock')) m *= 1.3;
  return m;
}
// What a landed foul or dirty skill does for the attacker's class.
function onFoulLanded(a, t) {
  if (!a || !t) return;
  if (a.cls === 'brawler') a.stk = Math.min(3, (a.stk || 0) + 1);
  if (a.cls === 'assassin') { BF(a, 'stealth', 1.5); BF(a, 'shadow', 1.5); }
  if (a.cls === 'trickster' && Math.random() < 0.15) { BF(t, 'confused', 1.5); floatText(t, 'CONFUSED', '#c45cff'); }
  a.ult = Math.min(100, (a.ult || 0) + 6);
}
// A skill hit on another player. foul: counts as a foul the referee can see.
function knock(a, t, o) {
  if (!t || !onPitch(t) || t.ko > 0) return;
  if (o.foul && t.fx && t.fx.shield > 0) { t.fx.shield = 0; floatText(t, 'SHIELD!', '#9fe8ff'); return; }
  const from = o.from || a, ang = Math.atan2(t.y - from.y, t.x - from.x) || 0;
  const dmg = Math.round((o.dmg || 0) * dmgOut(a) * dmgIn(t));
  if (dmg > 0) { t.hp = Math.max(0, t.hp - dmg); floatText(t, '-' + dmg, '#ff6b6b'); t.hitT = 2; addMood(t, -4); }
  if (dmg > 0 || o.stun) whack(t, 'skill');
  const imm = knockImmune(t) || shrugsOff(t, o);   // enforcers shrug off light shoves
  if (shrugsOff(t, o) && !knockImmune(t)) floatText(t, 'SHRUGGED IT OFF', '#c9a070');
  if (o.stun && !imm) { t.stun = Math.max(t.stun, o.stun); a0Anim(t, 'fall', 0.6); }
  const kbIn = (CLS[t.cls] && CLS[t.cls].mods && CLS[t.cls].mods.kbIn) || 1;
  if (o.kb && !imm) { t.vx = Math.cos(ang) * o.kb * kbIn; t.vy = Math.sin(ang) * o.kb * kbIn; }
  if (imm && (o.stun || o.kb)) floatText(t, firmText(t), '#ffd23f');
  if (S.ball.owner === t && (o.stun || o.kb) && !imm) loseBall(t, ang);
  t.lastHitBy = a.id; t.lastHitT = S.time;
  if (!imm) afterHit(a, t, { foul: o.foul, heavy: o.heavy != null ? o.heavy : (o.stun || 0) >= 1.2 || (o.kb || 0) >= 260, rage: o.rage != null ? o.rage : RAGE.shove });
  if (t.hp <= 0) { t.ko = 6; t.stun = 6; injure(t, 20, a); feed(`${a.name} knocked out ${t.name}!`, '#ff6b6b'); fxEvent('ko', t); if (a.cls === 'assassin') { BF(a, 'stealth', 1.5); BF(a, 'shadow', 1.5); } }
  else if (o.injure && Math.random() < o.injure) injure(t, 10, a);
  burst(t.x, t.y, o.col || '#ffffff', 10, 18); thump(100, 0.2, 0.1);
  if (o.foul && a.team !== t.team) {
    a.stats.fouls++; a.lastFoulT = S.time; addKarma(a, -5); M(a, 'fouls'); M(t, 'fouledReceived'); noteGrudge(a, t); onFoulLanded(a, t);
    crowdEvent(a.team, { vill: 3, fun: 3, drama: 2 }); EV('foul', a, { target: t.name, kind: o.kind || 'skill', x: Math.round(a.x), y: Math.round(a.y) });
    S.pend.push({ a, t, x: a.x, y: a.y, kind: o.kind || 'skill', heavy: false, ttl: (S.refHuman ? 2.2 : 0.75) * (hasSyn(a.team, 'chaos') ? 1.2 : 1), inBox: inBox(t.x, t.y, a.team), mate: false });
    alertRefs(a.x, a.y, 330, 0.5);
  } else if (a.cls === 'trickster' && a.team !== t.team && Math.random() < 0.15) { BF(t, 'confused', 1.5); floatText(t, 'CONFUSED', '#c45cff'); }
}

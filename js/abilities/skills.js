/* Foul Play FC · js/abilities/skills.js
   Casting skills and ultimates, and every skill effect.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- casting ---------- */
const SKILL_KEYS = ['skill1', 'skill2', 'skill3', 'ult'];
function skillDef(p, slot) {   // a player's own ability for this slot (setPlayerAbility in js/player/player.js), else their class's
  const own = p.abil && p.abil[slot]; if (own && ABILITIES[own]) return ABILITIES[own];
  const C = CLS[p.cls]; return C ? (slot === 3 ? C.ult : C.skills[slot]) : null;
}
function castSkill(p, slot) {
  const C = CLS[p.cls], def = skillDef(p, slot); if (!C || !def || !able(p)) return false;
  if (hasBf(p, 'marked')) { if (p.human) floatText(p, 'MARKED: NO SKILLS', '#ff9a9a'); return false; }
  S.teamCd = S.teamCd || [{}, {}];
  if (slot === 3) { if ((p.ult || 0) < 100) { if (p.human) floatText(p, `ULTIMATE ${Math.floor(p.ult || 0)}%`, '#c8c8c8'); return false; } }
  else if (p.cd[slot] > 0 || (def.shared && (S.teamCd[p.team][def.id] || 0) > S.time)) { if (p.human) floatText(p, `${def.name} in ${Math.ceil(Math.max(p.cd[slot], ((S.teamCd[p.team][def.id] || 0) - S.time)))}s`, '#c8c8c8'); return false; }
  const range = (def.range || 300) * (p.cls === 'ranger' ? 1.15 : 1);
  const u = def.aim === 'enemy' || def.aim === 'ally' ? skillTarget(p, def, range) : null;
  if ((def.aim === 'enemy' || def.aim === 'ally') && !u) { if (p.human) floatText(p, def.aim === 'enemy' ? 'No enemy in range' : 'No team-mate in range', '#c8c8c8'); return false; }
  const pt = u ? { x: u.x, y: u.y } : aimFor(p, range);
  const fn = SKILL_FX[def.id]; if (!fn) return false;
  if (fn(p, pt, u) === false) return false;
  if (slot === 3) { p.ult = 0; fxEvent('kick', p); cheer('roar', p.x, def.name.toUpperCase() + '!'); feed(`${p.name} unleashed ${def.name}!`, C.col); S.excite += 0.5; }
  else { p.cd[slot] = def.cd; if (def.shared) S.teamCd[p.team][def.id] = S.time + def.cd; }
  floatText(p, def.name.toUpperCase(), C.col); sfx('whoosh');
  M(p, slot === 3 ? 'ultimates' : 'skills'); EV(slot === 3 ? 'ultimate' : 'skill', p, { skill: def.id });
  return true;
}
const dashTo = (p, pt, speed, t, hit) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x); p.face = a; p.dash = { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t, hit: hit || null, done: [] }; };
const goalOf = team => ({ x: team === 0 ? W : 0, y: H / 2 });
const addZone = z => { S.zones.push(Object.assign({ t: 0 }, z)); };
function decoyOf(p, o) { S.decoys.push(Object.assign({ x: p.x, y: p.y, vx: 0, vy: 0, ttl: 3, team: p.team, src: p.id, run: 0, solid: true }, o)); }
const SKILL_FX = {
  // Striker
  powerShot: p => BF(p, 'powerShot', 4),
  curveDrive: p => BF(p, 'curveDrive', 4),
  aerial: (p, pt) => { if (p.z > 0 || !jump(p, 380)) return false; const a = Math.atan2(pt.y - p.y, pt.x - p.x), d = Math.min(150, Math.hypot(pt.x - p.x, pt.y - p.y)); p.vx = Math.cos(a) * d * 1.8; p.vy = Math.sin(a) * d * 1.8; p.airAct = { k: 'shoot', t: 0.9 }; BF(p, 'aerial', 1.2); p.aerialPend = true; },
  meteor: p => { const g = goalOf(p.team); addZone({ type: 'meteor', x: g.x - (p.team === 0 ? 1 : -1) * BOX_D * 0.5, y: H / 2, r: Math.min(BOX_HALF, 220), ttl: 5, team: p.team, owner: p.id, tick: 0, mets: [] }); BF(p, 'meteorShot', 6); },
  // Assassin
  cloak: p => { BF(p, 'cloak', 4); BF(p, 'cloakHit', 6); },
  blink: (p, pt, t) => { const a = t.face + Math.PI; p.x = clamp(t.x + Math.cos(a) * 14, 8, W - 8); p.y = clamp(t.y + Math.sin(a) * 14, 8, H - 8); burst(p.x, p.y, '#8a4dff', 14, 20);
    if (S.ball.owner === t) { S.ball.owner = p; S.ball.lastTouch = p; t.pickCd = 0.8; knock(p, t, { stun: 1, foul: false, col: '#8a4dff' }); bountyCollect(p, t); } else knock(p, t, { stun: 1, dmg: 10, foul: true, col: '#8a4dff' }); },
  phantom: (p, pt) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x); decoyOf(p, { vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, ttl: 3, ball: true }); },
  dimension: (p, pt) => { const b = S.ball; if (b.owner !== p && dist(p, b) > 160) { if (p.human) floatText(p, 'Get to the ball first', '#c8c8c8'); return false; }
    const target = aimFor(p, 520); decoyOf(p, { ttl: 4 }); addZone({ type: 'mine', x: p.x, y: p.y, r: 60, ttl: 4, team: p.team, owner: p.id });
    burst(p.x, p.y, '#8a4dff', 20, 30); p.x = target.x; p.y = target.y; b.owner = p; b.lastTouch = p; b.z = 0; b.vx = b.vy = b.vz = 0; burst(p.x, p.y, '#8a4dff', 20, 30); },
  // Speedster
  dash: (p, pt) => dashTo(p, pt, 560, 0.3, { stun: 0.6, kb: 200, foul: true }),
  afterimage: p => { const a = p.face + Math.PI / 2; decoyOf(p, { x: p.x + Math.cos(a) * 30, y: p.y + Math.sin(a) * 30, mimic: p.id, ttl: 3, ball: S.ball.owner === p }); },
  speedDribble: p => BF(p, 'speedDribble', 4),
  timeRush: p => BF(p, 'timeRush', 6),
  // Tank
  bodyBlock: (p, pt) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x), cx = p.x + Math.cos(a) * 34, cy = p.y + Math.sin(a) * 34, nx = -Math.sin(a), ny = Math.cos(a);
    S.walls.push({ x1: cx - nx * 38, y1: cy - ny * 38, x2: cx + nx * 38, y2: cy + ny * 38, ttl: 2.5, team: p.team }); },
  bullRush: (p, pt) => dashTo(p, pt, 420, 0.5, { stun: 1, kb: 260, foul: true, dmg: 8 }),
  quake: p => { burst(p.x, p.y, '#c9a070', 24, 8); S.shake = Math.max(S.shake, 5); for (const q of enemiesOf(p)) if (dist(q, p) < 75 && q.z <= 10) knock(p, q, { stun: 1.2, dmg: 6, kb: 80, foul: true }); },
  titan: p => addZone({ type: 'dome', x: p.x, y: p.y, r: 110, ttl: 6, team: p.team, owner: p.id }),
  // Defender
  intervene: (p, pt, t) => { const a = Math.atan2(p.y - t.y, p.x - t.x); p.x = clamp(t.x + Math.cos(a) * 14, 8, W - 8); p.y = clamp(t.y + Math.sin(a) * 14, 8, H - 8); p.face = a + Math.PI;
    if (S.ball.owner === t && Math.random() < 0.8) { S.ball.owner = p; S.ball.lastTouch = p; t.pickCd = 0.7; p.stats.tackles++; floatText(p, 'CLEAN TACKLE', '#7dff9b'); bountyCollect(p, t); } },
  zoneLock: (p, pt) => addZone({ type: 'zoneLock', x: pt.x, y: pt.y, r: 85, ttl: 4, team: p.team }),
  tackleCharge: (p, pt, t) => { const had = S.ball.owner === t; p.x = clamp(t.x - Math.cos(p.face = Math.atan2(t.y - p.y, t.x - p.x)) * 14, 8, W - 8); p.y = clamp(t.y - Math.sin(p.face) * 14, 8, H - 8);
    knock(p, t, { stun: 1.5, kb: 160, foul: !had, dmg: had ? 0 : 12 });
    if (had || S.ball.owner == null) { const b = S.ball; b.owner = null; b.vx = Math.cos(p.face) * 520; b.vy = Math.sin(p.face) * 520 + rand(-80, 80); b.vz = 120; b.lastTouch = p; } },
  absoluteMark: (p, pt) => { const t = unitNear(enemiesOf(p).filter(q => dist(q, p) < 500), aimFor(p, 500)); if (!t) return false; BF(t, 'marked', 8); BF(p, 'boost', 8); floatText(t, 'MARKED', '#f2c230'); },
  // Goalkeeper
  diveSave: (p, pt) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x); p.dive = 0.45; p.diveVx = Math.cos(a) * 420; p.diveVy = Math.sin(a) * 420; p.diveDir = Math.sign(Math.sin(a) * (p.team === 0 ? 1 : -1)) || 1; dashTo(p, pt, 420, 0.4, { kb: 220, stun: 0.6, foul: false }); },
  wideGuard: p => BF(p, 'wideGuard', 3),
  aerialGrab: p => { if (!jump(p, 360)) return false; BF(p, 'grab', 1); },
  infinity: p => { const own = p.team === 0 ? 0 : W; addZone({ type: 'infinity', x: own, y: H / 2, r: GOAL_HALF + 40, ttl: 5, team: p.team }); },
  // Playmaker
  precision: (p, pt, t) => { if (S.ball.owner !== p) { if (p.human) floatText(p, 'You need the ball', '#c8c8c8'); return false; } passTo(p, t, 'ground'); S.ball.pierce = S.time + 1.6; },
  tactical: (p, pt) => addZone({ type: 'tactical', x: pt.x, y: pt.y, r: 100, ttl: 5, team: p.team }),
  assistMark: (p, pt, t) => { BF(t, 'assistMark', 8); floatText(t, 'ASSIST MARK', '#3a7bff'); },
  perfect: p => { for (const q of alliesOf(p)) BF(q, 'perfect', 8); },
  // Healer
  healBurst: (p, pt, t) => { t.hp = Math.min(100, t.hp + 35); floatText(t, '+35 HP', '#7dff9b'); burst(t.x, t.y, '#7dff9b', 14, 24); addKarma(p, 2); },
  cleanse: (p, pt, t) => { t.stun = Math.min(t.stun, 0); t.slowT = 0; t.freezeT = 0; t.iceT = 0; t.heatT = 0; for (const k of ['marked', 'confused']) if (t.bf) t.bf[k] = 0; floatText(t, 'CLEANSED', '#bfffcf'); },
  revive: (p, pt, t) => { t.ko = 0; t.stun = 0; t.hp = Math.max(t.hp, 50); floatText(t, 'REVIVED', '#7dff9b'); burst(t.x, t.y, '#7dff9b', 20, 30); addKarma(p, 6); cheer('applause', t.x, 'BACK UP!'); },
  lifeweaver: (p, pt) => addZone({ type: 'heal', x: pt.x, y: pt.y, r: 160, ttl: 6, team: p.team }),
  // Aura
  morale: p => { if (S.crowd) S.crowd.support = clamp(S.crowd.support + (p.team === 0 ? 0.06 : -0.06), 0, 1); for (const q of alliesOf(p)) { addCharge(q, 15); BF(q, 'morale', 4); } },
  statAura: p => { const k = ['auraOff', 'auraDef', 'auraSpd'][p.auraMode || 0]; p.auraMode = ((p.auraMode || 0) + 1) % 3; for (const q of alliesOf(p)) if (dist(q, p) < 160) BF(q, k, 6); floatText(p, ['OFFENSE AURA', 'DEFENSE AURA', 'SPEED AURA'][(p.auraMode + 2) % 3], '#ffb000'); },
  surge: p => { for (const q of alliesOf(p)) if (dist(q, p) < 160) { q.stamina = Math.min(q.staminaMax, q.stamina + 40); floatText(q, '+40 STAMINA', '#7cf2c4'); } },
  awaken: p => { for (const q of alliesOf(p)) BF(q, 'awaken', 8); },
  // Brawler
  heavyPunch: (p, pt, t) => { a0Anim(p, 'punch', 0.45); knock(p, t, { dmg: 26, stun: 1.4, kb: 320, foul: true, injure: 0.3, col: '#ffcf5a' }); S.shake = Math.max(S.shake, 5); },
  grabThrow: (p, pt, t) => { if (knockImmune(t)) { floatText(t, 'TOO STRONG', '#ffd23f'); return; } const to = aimFor(p, 220); if (S.ball.owner === t) loseBall(t, t.face);
    t.thrown = { sx: t.x, sy: t.y, tx: to.x, ty: to.y, t: 0, dur: 0.6, by: p.id }; a0Anim(p, 'swing', 0.4); },
  groundSlam: p => { burst(p.x, p.y, '#e8392e', 24, 8); S.shake = Math.max(S.shake, 6); for (const q of enemiesOf(p)) if (dist(q, p) < 85 && q.z <= 10) knock(p, q, { stun: 1.2, dmg: 10, kb: 160, foul: true }); },
  rage: p => BF(p, 'rage', 7),
  // Trickster
  clone: (p, pt) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x); decoyOf(p, { vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, ttl: 4, ball: true }); },
  trap: (p, pt) => addZone({ type: 'trap', x: pt.x, y: pt.y, r: 18, ttl: 20, team: p.team, owner: p.id }),
  jammer: p => { const r = S.refs[0]; if (!r || r.gone > 0) return false; r.blind = Math.max(r.blind, 4); feed(`${p.name} jammed the referee's vision`, '#c45cff'); },
  illusion: p => { const c = S.ball.owner && S.ball.owner.team === p.team ? S.ball.owner : p; for (let k = 0; k < 3; k++) { const a = c.face + (k - 1) * 0.9 + rand(-0.2, 0.2); decoyOf(c, { team: p.team, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, ttl: 6, ball: true }); } },
  // Ranger
  projPass: (p, pt, t) => { if (S.ball.owner !== p) { if (p.human) floatText(p, 'You need the ball', '#c8c8c8'); return false; } passTo(p, t, 'ground'); const b = S.ball; b.vx *= 1.6; b.vy *= 1.6; b.pierce = S.time + 1.6; b.trail = '#6a5cff'; },
  gravity: (p, pt) => addZone({ type: 'gravity', x: pt.x, y: pt.y, r: 90, ttl: 3, team: p.team }),
  slowBomb: (p, pt) => { const d = Math.hypot(pt.x - p.x, pt.y - p.y), T = 0.35 + d / 900; S.projs.push({ type: 'bomb', x: p.x, y: p.y, z: 20, sx: p.x, sy: p.y, tx: pt.x, ty: pt.y, t: 0, dur: T, team: p.team, owner: p.id }); },
  orbital: (p, pt) => addZone({ type: 'orbital', x: pt.x, y: pt.y, r: 120, ttl: 1.5, team: p.team, owner: p.id })
};

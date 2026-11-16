/* Foul Play FC · js/abilities/sins.js
   What the seven Sins' abilities do, and their passives. The characters themselves (names, roles,
   cooldowns, descriptions, whether each ability stuns, when bots use it) are in js/abilities/classes.js.
   Balance: each Sin has one or two stunning abilities out of three, cooldowns of 8–14 s, and an
   ultimate that charges at the same rate as everyone else's.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const sinFoes = (p, x, y, r) => enemiesOf(p).filter(q => q.ko <= 0 && (q.z || 0) < 14 && Math.hypot(q.x - x, q.y - y) < r);

Object.assign(SKILL_FX, {
  /* ---------- Wrath: raw damage and knock-downs ---------- */
  sWrathCharge: (p, pt) => dashTo(p, pt, 560, 0.34, { stun: 0.7, kb: 230, dmg: 6 }),   // dashes take the ball and are never fouls (js/abilities/update.js)
  sWrathSlam: p => {
    burst(p.x, p.y, '#e8392e', 26, 8); S.shake = Math.max(S.shake, 6); fxEvent('wave', null, { x: p.x, y: p.y, side: 80 });
    for (const q of sinFoes(p, p.x, p.y, 80)) knock(p, q, { stun: 1, dmg: 8, kb: 180, foul: true, heavy: true });
  },
  sWrathUlt: p => { BF(p, 'rage', 7); burst(p.x, p.y, '#ff4d2e', 30, 30); },

  /* ---------- Gluttony: the immovable eater ---------- */
  sGlutDevour: (p, pt, t) => {
    const b = S.ball;
    if (b.owner === t && !gkFirm(t)) { b.owner = p; b.lastTouch = p; b.ctrl = null; t.pickCd = 0.8; t.slowT = Math.max(t.slowT || 0, 1); floatText(p, 'DEVOURED!', '#d98c2b'); p.stats.tackles++; bountyCollect(p, t); }
    else knock(p, t, { dmg: 12, foul: true, col: '#d98c2b' });
    a0Anim(p, 'swing', 0.35); thump(90, 0.2, 0.1);
  },
  sGlutWall: (p, pt) => {
    const a = Math.atan2(pt.y - p.y, pt.x - p.x), cx = p.x + Math.cos(a) * 34, cy = p.y + Math.sin(a) * 34, nx = -Math.sin(a), ny = Math.cos(a);
    S.walls.push({ x1: cx - nx * 40, y1: cy - ny * 40, x2: cx + nx * 40, y2: cy + ny * 40, ttl: 2.5, team: p.team });
  },
  sGlutUlt: p => {
    for (const q of sinFoes(p, p.x, p.y, 150)) {   // pulled in toward the table
      const a = Math.atan2(p.y - q.y, p.x - q.x), d = dist(p, q), step = Math.max(0, d - 22);
      q.x = clamp(q.x + Math.cos(a) * step * 0.7, 8, W - 8); q.y = clamp(q.y + Math.sin(a) * step * 0.7, 8, H - 8);
      knock(p, q, { stun: 1.2, dmg: 6, foul: true, from: { x: q.x - Math.cos(a), y: q.y - Math.sin(a) }, heavy: true });
    }
    p.hp = Math.min(100, p.hp + 30); floatText(p, '+30 HP', '#7dff9b'); burst(p.x, p.y, '#d98c2b', 30, 20); fxEvent('wave', null, { x: p.x, y: p.y, side: 150 });
  },

  /* ---------- Greed: takes the ball, makes the team richer ---------- */
  sGreedSteal: (p, pt, t) => {
    const a = t.face + Math.PI, b = S.ball; burst(p.x, p.y, '#f2c230', 12, 20);
    p.x = clamp(t.x + Math.cos(a) * 14, 8, W - 8); p.y = clamp(t.y + Math.sin(a) * 14, 8, H - 8); p.face = t.face;
    if (b.owner === t && !gkFirm(t)) { b.owner = p; b.lastTouch = p; b.ctrl = null; t.pickCd = 0.8; floatText(p, 'YOINK!', '#f2c230'); p.stats.tackles++; bountyCollect(p, t); }
    else floatText(p, 'EMPTY POCKETS', '#c8c8c8');
    burst(p.x, p.y, '#f2c230', 12, 20);
  },
  sGreedPass: (p, pt, t) => {
    if (S.ball.owner !== p) { if (p.human) floatText(p, 'You need the ball', '#c8c8c8'); return false; }
    passTo(p, t, 'ground'); const b = S.ball; b.vx *= 1.4; b.vy *= 1.4; b.pierce = S.time + 1.6; b.trail = '#f2c230';
  },
  sGreedUlt: p => { for (const q of alliesOf(p)) { q.charge = Math.min(100, (q.charge || 0) + 25); BF(q, 'perfect', 6); burst(q.x, q.y, '#f2c230', 10, 30); } cheer('roar', p.x, 'JACKPOT!'); },

  /* ---------- Envy: fakes, marks and stolen places ---------- */
  sEnvyClone: (p, pt) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x); decoyOf(p, { vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, ttl: 4 }); },
  sEnvyEye: (p, pt, t) => { BF(t, 'marked', 5); floatText(t, 'MARKED', '#3fbf6a'); },
  sEnvyUlt: (p, pt, t) => {
    if (gkFirm(t)) { floatText(t, firmText(t), '#ffd23f'); return false; }
    const b = S.ball, had = b.owner === t, px = p.x, py = p.y;
    burst(p.x, p.y, '#3fbf6a', 16, 20); burst(t.x, t.y, '#3fbf6a', 16, 20);
    p.x = t.x; p.y = t.y; t.x = px; t.y = py;
    if (had) { b.owner = p; b.lastTouch = p; b.ctrl = null; t.pickCd = 0.8; }
    knock(p, t, { stun: 1, foul: false, col: '#3fbf6a' }); floatText(p, 'SWAPPED!', '#3fbf6a');
  },

  /* ---------- Pride: the star striker ---------- */
  sPrideShot: p => BF(p, 'powerShot', 4),
  sPrideGuard: p => { BF(p, 'timeRush', 3); floatText(p, 'UNTOUCHABLE', '#9b5cff'); },
  sPrideUlt: p => { const g = goalOf(p.team); addZone({ type: 'meteor', x: g.x - (p.team === 0 ? 1 : -1) * BOX_D * 0.5, y: H / 2, r: Math.min(BOX_HALF, 220), ttl: 5, team: p.team, owner: p.id, tick: 0, mets: [] }); BF(p, 'meteorShot', 6); },

  /* ---------- Lust: charm and care ---------- */
  sLustCharm: (p, pt, t) => { BF(t, 'confused', 2.5); t.vx += (p.x - t.x) * 0.8; t.vy += (p.y - t.y) * 0.8; floatText(t, 'CHARMED', '#ff5fa2'); burst(t.x, t.y, '#ff5fa2', 10, 30); },
  sLustHeal: (p, pt, t) => {
    t.hp = Math.min(100, t.hp + 30); t.stun = Math.min(t.stun, 0); t.slowT = 0; t.freezeT = 0; if (t.bf) { t.bf.marked = 0; t.bf.confused = 0; }
    floatText(t, '+30 HP', '#7dff9b'); burst(t.x, t.y, '#ff5fa2', 14, 24); addKarma(p, 2);
  },
  sLustUlt: p => {
    for (const q of sinFoes(p, p.x, p.y, 160)) { loseBall(q, Math.atan2(q.y - p.y, q.x - p.x)); knock(p, q, { stun: 1, foul: false, col: '#ff5fa2' }); BF(q, 'confused', 2.5); }
    burst(p.x, p.y, '#ff5fa2', 30, 30); fxEvent('wave', null, { x: p.x, y: p.y, side: 160 });
  },

  /* ---------- Sloth: slows everything down ---------- */
  sSlothZone: (p, pt) => addZone({ type: 'zoneLock', x: pt.x, y: pt.y, r: 90, ttl: 4, team: p.team }),
  sSlothYawn: p => { for (const q of sinFoes(p, p.x, p.y, 100)) { knock(p, q, { stun: 1.5, foul: true, col: '#8fb0d0' }); floatText(q, 'Zzz', '#8fb0d0'); } burst(p.x, p.y, '#8fb0d0', 18, 30); },
  sSlothUlt: p => {
    for (const q of sinFoes(p, p.x, p.y, 320)) { q.slowT = Math.max(q.slowT || 0, 3); floatText(q, 'SLOWED', '#8fb0d0'); }
    const b = S.ball; if (!b.owner && dist(b, p) < 320) { b.vx = b.vy = 0; b.vz = Math.min(b.vz, 0); }
    fxEvent('wave', null, { x: p.x, y: p.y, side: 320 });
  },
});

/* ---------- passives ---------- */
CLS.wrath.mods = { dmgOut: p => 1 + Math.max(0, 100 - p.hp) / 400 };   // up to +25% at low HP
CLS.gluttony.mods = {
  speed: () => 0.94, kbIn: 0.5,
  tick: p => { const has = S.ball.owner === p; if (has && !p.hadBall) { p.hp = Math.min(100, p.hp + 12); floatText(p, '+12 HP', '#7dff9b'); } p.hadBall = has; },
};
CLS.greed.mods = { tick: (p, dt) => { p.charge = Math.min(100, (p.charge || 0) + 1.5 * dt); } };
CLS.envy.mods = { speed: p => { const c = S.ball.owner; return c && c.team !== p.team && dist(c, p) < 220 ? 1.15 : 1; } };
CLS.lust.mods = { tick: p => { for (const q of enemiesOf(p)) if (dist(q, p) < 90) q.hitSlowT = Math.max(q.hitSlowT || 0, 0.15); } };
CLS.sloth.mods = { speed: () => 0.9, tick: (p, dt) => { if (p.stamina < p.staminaMax) p.stamina = Math.min(p.staminaMax, p.stamina + 6 * dt); } };
// Pride's passive (shot power and speed in the opponent's third) lives in speedMul and shotMul (js/abilities/buffs.js).

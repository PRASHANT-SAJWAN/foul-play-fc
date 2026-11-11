/* Foul Play FC · js/player/creatures.js
   Six creature classes for the local MVP: Cinderwyrm, Hollow, Bulwark, Brawn, Shogun and Ronin.
   They use the blocky models for now; js/player/models.js can swap in real models later.
   Every skill is a defineAbility() effect, so a moveset change is one function.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

ROLE_INFO.allround = { name: 'All-rounder', col: '#f2c230', blurb: 'Fight, score and defend: strong in a scrap' };

// Projectiles for the creature skills reuse the weapon system (hidden: never handed out as items).
defineWeapon({ id: 'fireball', name: 'Fireball', kind: 'ranged', hidden: true, col: '#ff7a2f', proj: 'dart', speed: 620, ttl: 0.7, hit: { dmg: 14, stun: 0.6, kb: 220 }, ballPush: 0.5 });
defineWeapon({ id: 'watershot', name: 'Water Cannon', kind: 'ranged', hidden: true, col: '#4fb8ff', proj: 'pebble', speed: 700, ttl: 0.75, hit: { dmg: 6, stun: 0.4, kb: 340 }, ballPush: 0.6 });
defineWeapon({ id: 'aurasphere', name: 'Aura Sphere', kind: 'ranged', hidden: true, col: '#4f8dff', proj: 'pebble', speed: 560, ttl: 0.9, hit: { dmg: 14, stun: 0.8, kb: 200 }, ballPush: 0.4 });
defineWeapon({ id: 'shuriken', name: 'Shuriken', kind: 'ranged', hidden: true, col: '#cfd8e3', proj: 'dart', speed: 760, ttl: 0.55, hit: { dmg: 6, stun: 0.3, slow: 1 }, ballPush: 0.2 });

function skillShot(p, pt, wid, spread = 0, n = 1) {   // an elemental slash toward pt: a long crescent (wider for fan skills) instead of a projectile
  const W = WEAPONS[wid], a0 = Math.atan2(pt.y - p.y, pt.x - p.x);
  slashArc(p, a0, W, { range: 165, arc: SLASH.arc + (n > 1 ? spread * (n - 1) * 2 : 0) });
}
const foesNear = (p, x, y, r) => enemiesOf(p).filter(q => q.ko <= 0 && Math.hypot(q.x - x, q.y - y) < r);
function fireTrail(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 12); for (let i = 0; i <= n; i++) (S.fires || (S.fires = [])).push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, t: 0, life: rand(0.8, 1.3), r: rand(6, 10), ph: rand(0, 6) }); }

/* ---------- Cinderwyrm: fire drake, attacker ---------- */
defineAbility({ id: 'cwFireball', glyph: '🔥', name: 'Fire Slash', cd: 6, aim: 'point', range: 165, desc: 'A burning crescent slash that knocks back and briefly stuns everyone in front of you.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 160 },
  (p, pt) => skillShot(p, pt, 'fireball'));
defineAbility({ id: 'cwGust', glyph: '≋', name: 'Wing Gust', cd: 9, aim: 'self', desc: 'Beat your wings and blow back everyone around you.', bot: (p, c) => c.enemyNear(80) },
  p => { burst(p.x, p.y, '#ffb36b', 18, 20); for (const q of foesNear(p, p.x, p.y, 95)) knock(p, q, { kb: 300, stun: 0.3, foul: true }); });
defineAbility({ id: 'cwFlameDash', glyph: '»', name: 'Flame Dash', cd: 10, aim: 'point', range: 220, desc: 'A burning dash that leaves fire behind and knocks aside anyone in the way.', bot: (p, c) => c.own && c.enemyNear(110) },
  (p, pt) => { const x0 = p.x, y0 = p.y, a = Math.atan2(pt.y - p.y, pt.x - p.x); dashTo(p, pt, 540, 0.35, { stun: 0.5, kb: 180, foul: true }); fireTrail(x0, y0, x0 + Math.cos(a) * 180, y0 + Math.sin(a) * 180); });
defineAbility({ id: 'cwInferno', glyph: '☄', name: 'Inferno Dive', range: 260, aim: 'point', desc: 'Dive onto the aim in a blast of fire, stunning everyone there for 1.6 s.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 240 },
  (p, pt) => { const d = Math.min(260, Math.hypot(pt.x - p.x, pt.y - p.y)), a = Math.atan2(pt.y - p.y, pt.x - p.x), x = clamp(p.x + Math.cos(a) * d, 10, W - 10), y = clamp(p.y + Math.sin(a) * d, 10, H - 10);
    p.x = x; p.y = y; p.face = a; S.shake = Math.max(S.shake, 7); burst(x, y, '#ff7a2f', 30, 30); fireTrail(x - 40, y, x + 40, y); fireTrail(x, y - 40, x, y + 40);
    for (const q of foesNear(p, x, y, 115)) knock(p, q, { stun: 1.6, dmg: 12, kb: 200, foul: true, from: { x, y } }); });
defineClass({ id: 'cinderwyrm', name: 'Cinderwyrm', title: 'The Fire Drake', role: 'offense', col: '#ff7a2f', num: 6,
  look: { hair: 8, hairCol: '#7a1d0c', skin: '#e8742c', acc: 0, build: 2, eyes: '#ffd23f' },
  passive: ['Blazing Strike', 'Your shots leave a trail of fire behind them.'],
  skills: [ABILITIES.cwFireball, ABILITIES.cwGust, ABILITIES.cwFlameDash], ult: ABILITIES.cwInferno,
  mods: { tick: p => { const b = S.ball; if (b.shotBy === p && !b.owner && S.time - b.shotT < 0.15 && !b.trail) b.trail = '#ff7a2f'; } } });

/* ---------- Hollow: shadow wraith, speedster ---------- */
const veil = p => BF(p, 'stealth', 1.5);
defineAbility({ id: 'hwStep', glyph: '◐', name: 'Shadow Step', cd: 7, aim: 'point', range: 150, desc: 'Blink through the shadows to the aim.', bot: (p, c) => c.own && c.enemyNear(90) },
  (p, pt) => { const a = Math.atan2(pt.y - p.y, pt.x - p.x), d = Math.min(150, Math.hypot(pt.x - p.x, pt.y - p.y)); burst(p.x, p.y, '#3a2d4f', 14, 20); p.x = clamp(p.x + Math.cos(a) * d, 8, W - 8); p.y = clamp(p.y + Math.sin(a) * d, 8, H - 8); p.face = a; burst(p.x, p.y, '#6b4d9a', 14, 20); veil(p); });
defineAbility({ id: 'hwNightmare', glyph: '☾', name: 'Nightmare', cd: 12, aim: 'enemy', range: 170, desc: 'Put a nearby enemy to sleep for 1.5 s.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 160 },
  (p, pt, t) => { knock(p, t, { stun: 1.5, foul: true, col: '#6b4d9a' }); floatText(t, 'Zzz', '#c9a0ff'); veil(p); });
defineAbility({ id: 'hwPulse', glyph: '◉', name: 'Dark Pulse', cd: 9, aim: 'self', desc: 'A wave of darkness in front of you slows enemies and drains their stamina.', bot: (p, c) => c.enemyNear(130) },
  p => { burst(p.x + Math.cos(p.face) * 50, p.y + Math.sin(p.face) * 50, '#3a2d4f', 20, 16);
    for (const q of foesNear(p, p.x, p.y, 160)) if (Math.abs(angDiff(p.face, Math.atan2(q.y - p.y, q.x - p.x))) < 0.7) { q.slowT = Math.max(q.slowT || 0, 2); q.stamina = Math.max(0, q.stamina - 25); knock(p, q, { dmg: 4, foul: true }); } veil(p); });
defineAbility({ id: 'hwEclipse', glyph: '●', name: 'Eclipse', desc: 'Darkness for 5 s: the referee sees nothing and every enemy slows down.', bot: (p, c) => c.own || (c.carrier && c.carrier.team === p.team) },
  p => { for (const r of S.refs) r.blind = Math.max(r.blind, 5); for (const q of enemiesOf(p)) q.slowT = Math.max(q.slowT || 0, 3); for (const q of alliesOf(p)) BF(q, 'stealth', 5); S.shake = Math.max(S.shake, 4); feed(`${p.name} plunged the pitch into darkness`, '#c9a0ff'); });
defineClass({ id: 'hollow', name: 'Hollow', title: 'The Shadow Wraith', role: 'disrupt', col: '#6b4d9a', num: 13,
  look: { hair: 1, hairCol: '#0e0a14', skin: '#2a2433', acc: 5, build: 0, eyes: '#ff3b5c' },
  passive: ['Shadow Veil', 'The referee can\'t see you for 1.5 s after each of your skills.'],
  skills: [ABILITIES.hwStep, ABILITIES.hwNightmare, ABILITIES.hwPulse], ult: ABILITIES.hwEclipse });

/* ---------- Bulwark: armoured tortoise, defender ---------- */
defineAbility({ id: 'bwShell', glyph: '⛨', name: 'Shell Block', cd: 10, aim: 'self', desc: 'Retreat into your shell for 3 s: shots bounce off you and nothing knocks you down.', bot: (p, c) => !c.own && S.ball.lastTouch && S.ball.lastTouch.team !== p.team && Math.hypot(S.ball.vx, S.ball.vy) > 350 },
  p => { BF(p, 'wideGuard', 3); BF(p, 'immune', 3); floatText(p, 'SHELL BLOCK', '#4fb8ff'); });
defineAbility({ id: 'bwCannon', glyph: '💧', name: 'Tide Slash', cd: 7, aim: 'point', range: 165, desc: 'A wide slash of water that knocks everyone in front of you far back.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 160 },
  (p, pt) => skillShot(p, pt, 'watershot', 0.08, 3));
defineAbility({ id: 'bwSpin', glyph: '↻', name: 'Rapid Spin', cd: 9, aim: 'self', desc: 'Spin in your shell: steal the ball from anyone next to you and knock them aside.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 55 },
  p => { burst(p.x, p.y, '#4fb8ff', 16, 10); const b = S.ball;
    for (const q of foesNear(p, p.x, p.y, 60)) { const had = b.owner === q; knock(p, q, { kb: 180, stun: 0.4, foul: true }); if (had) { b.owner = p; b.lastTouch = p; q.pickCd = 0.8; floatText(p, 'STOLEN!', '#4fb8ff'); } } });
defineAbility({ id: 'bwTidal', glyph: '🌊', name: 'Tidal Wall', desc: 'A wave rolls out from your goal and sweeps every enemy in your half back up the pitch.', bot: (p, c) => c.enemyBall && c.dg < W * 0.45 },
  p => { const g = goalOf(p.team); S.shake = Math.max(S.shake, 6);
    for (const q of enemiesOf(p)) if (Math.abs(q.x - g.x) < W * 0.5) { knock(p, q, { kb: 360, stun: 0.8, foul: false, from: { x: g.x, y: q.y } }); burst(q.x, q.y, '#4fb8ff', 8, 10); }
    feed(`${p.name} sent a tidal wall up the pitch`, '#4fb8ff'); });
defineClass({ id: 'bulwark', name: 'Bulwark', title: 'The Iron Shell', role: 'defense', col: '#3f7fd0', num: 3,
  look: { hair: 0, hairCol: '#2a4a2a', skin: '#3f7fd0', acc: 1, build: 2, eyes: '#1b120c' },
  passive: ['Heavy Shell', 'You take 40% less knockback.'],
  skills: [ABILITIES.bwShell, ABILITIES.bwCannon, ABILITIES.bwSpin], ult: ABILITIES.bwTidal, mods: { kbIn: 0.6 } });

/* ---------- Brawn: four-fisted wrestler, all-rounder ---------- */
defineAbility({ id: 'brQuad', glyph: '✊', name: 'Quad Punch', cd: 7, aim: 'enemy', range: 60, desc: 'A four-hit flurry on an enemy in reach.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 55 },
  (p, pt, t) => { a0Anim(p, 'punch', 0.5); knock(p, t, { dmg: 24, stun: 1, kb: 180, foul: true, col: '#ffcf5a' }); whack(t, 'punch'); S.shake = Math.max(S.shake, 4); });
defineAbility({ id: 'brGrapple', glyph: '⤴', name: 'Grapple Throw', cd: 11, aim: 'enemy', range: 55, desc: 'Grab an enemy and throw them where you aim.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 50 },
  (p, pt, t) => SKILL_FX.grabThrow(p, pt, t));
defineAbility({ id: 'brSlam', glyph: '≋', name: 'Ground Slam', cd: 10, aim: 'self', desc: 'Pound the ground and stun everyone around you.', bot: p => enemiesOf(p).filter(q => dist(q, p) < 85).length >= 2 },
  (p, pt) => SKILL_FX.groundSlam(p, pt));
defineAbility({ id: 'brTitan', glyph: '➜', name: 'Titan Rush', desc: 'For 5 s nothing can stop you, and anyone you run into is flattened.', bot: (p, c) => c.enemyNear(160) },
  p => { BF(p, 'titanRush', 5); BF(p, 'immune', 5); BF(p, 'rage', 5); floatText(p, 'TITAN RUSH', '#ff8a3d'); });
defineClass({ id: 'brawn', name: 'Brawn', title: 'The Four-Fisted', role: 'allround', col: '#8f9bb0', num: 4,
  look: { hair: 0, hairCol: '#1b1b1b', skin: '#8f9bb0', acc: 0, build: 2, eyes: '#ff3b3b' },
  passive: ['Raw Power', 'All your hits do 20% more damage.'],
  skills: [ABILITIES.brQuad, ABILITIES.brGrapple, ABILITIES.brSlam], ult: ABILITIES.brTitan,
  mods: { dmgOut: () => 1.2, tick: p => { if (!hasBf(p, 'titanRush')) return; p.titanHit = p.titanHit || {};
    for (const q of foesNear(p, p.x, p.y, 20)) if (!(p.titanHit[q.id] > S.time)) { p.titanHit[q.id] = S.time + 1.5; knock(p, q, { stun: 1.2, dmg: 8, kb: 240, foul: true }); whack(q, 'tackle'); } } } });

/* ---------- Shogun: aura warrior, all-rounder ---------- */
defineAbility({ id: 'sgSphere', glyph: '◎', name: 'Aura Slash', cd: 6, aim: 'enemy', range: 165, desc: 'A slash of aura aimed at the nearest enemy you face; it hits everyone around them too.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 160 },
  (p, pt, t) => skillShot(p, t, 'aurasphere'));
defineAbility({ id: 'sgCounter', glyph: '⇄', name: 'Counter Stance', cd: 11, aim: 'self', desc: 'For 2 s, the next foul on you bounces back and stuns the attacker.', bot: (p, c) => c.enemyNear(60) },
  p => { p.fx = p.fx || {}; p.fx.shield = Math.max(p.fx.shield || 0, 2); floatText(p, 'COUNTER', '#4f8dff'); });
defineAbility({ id: 'sgStrike', glyph: '⚡', name: 'Extreme Strike', cd: 9, aim: 'point', range: 230, desc: 'Dash through enemies, knocking them down.', bot: (p, c) => (c.own && c.enemyNear(100)) || (c.enemyBall && dist(p, c.carrier) < 200) },
  (p, pt) => dashTo(p, pt, 640, 0.3, { stun: 0.9, kb: 220, foul: true, dmg: 10 }));
defineAbility({ id: 'sgBurst', glyph: '✷', name: 'Aura Burst', desc: 'A huge wave of aura blasts enemies away, and your next shot is a power shot.', bot: (p, c) => c.enemyNear(120) || (c.own && c.dg < SHOOT_RANGE * 1.3) },
  p => { burst(p.x, p.y, '#4f8dff', 30, 24); S.shake = Math.max(S.shake, 6); for (const q of foesNear(p, p.x, p.y, 130)) knock(p, q, { kb: 300, stun: 1.2, dmg: 10, foul: true }); BF(p, 'powerShot', 5); });
defineClass({ id: 'shogun', name: 'Shogun', title: 'The Aura Warrior', role: 'allround', col: '#4f8dff', num: 8,
  look: { hair: 9, hairCol: '#1d2a4f', skin: '#3557a8', acc: 4, build: 1, eyes: '#ff3b3b' },
  passive: ['Steadfast', 'Below half health you move 15% faster.'],
  skills: [ABILITIES.sgSphere, ABILITIES.sgCounter, ABILITIES.sgStrike], ult: ABILITIES.sgBurst, mods: { speed: p => p.hp < 50 ? 1.15 : 1 } });

/* ---------- Ronin: shadow ninja, speedster ---------- */
defineAbility({ id: 'rnShuriken', glyph: '✦', name: 'Blade Fan', cd: 5, aim: 'point', range: 165, desc: 'A very wide fan of blade slashes that slows everyone it catches.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 160 },
  (p, pt) => skillShot(p, pt, 'shuriken', 0.14, 3));
defineAbility({ id: 'rnSmoke', glyph: '☁', name: 'Smoke Dash', cd: 9, aim: 'point', range: 200, desc: 'Dash away and leave a smoke cloud the referee can\'t see into.', bot: (p, c) => c.own && c.enemyNear(90) },
  (p, pt) => { S.smokes.push({ x: clamp(p.x, 20, W - 20), y: clamp(p.y, 20, H - 20), r: 80, ttl: 5 }); sfx('whoosh'); dashTo(p, pt, 560, 0.3); BF(p, 'stealth', 1); });
defineAbility({ id: 'rnClone', glyph: '👤', name: 'Shadow Clone', cd: 12, aim: 'point', desc: 'Send a clone running ahead to fool bots and the referee.', bot: (p, c) => c.own && c.enemyNear(140) },
  (p, pt) => SKILL_FX.clone(p, pt));
defineAbility({ id: 'rnStorm', glyph: '⚔', name: 'Blade Storm', desc: 'Flash between up to three nearby enemies, stunning each one.', bot: p => enemiesOf(p).filter(q => dist(q, p) < 260).length >= 2 },
  p => { const ts = foesNear(p, p.x, p.y, 280).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, 3); if (!ts.length) { if (p.human) floatText(p, 'No enemy in range', '#c8c8c8'); return false; }
    for (const q of ts) { burst(q.x, q.y, '#cfd8e3', 12, 24); knock(p, q, { stun: 1.4, dmg: 10, kb: 120, foul: true }); whack(q, 'sword'); }
    const last = ts[ts.length - 1], a = last.face + Math.PI; p.x = clamp(last.x + Math.cos(a) * 16, 8, W - 8); p.y = clamp(last.y + Math.sin(a) * 16, 8, H - 8); BF(p, 'stealth', 1.5); });
defineClass({ id: 'ronin', name: 'Ronin', title: 'The Shadow Blade', role: 'disrupt', col: '#2b5fa0', num: 11,
  look: { hair: 8, hairCol: '#0e1a2c', skin: '#2b5fa0', acc: 4, build: 0, eyes: '#ffd23f' },
  passive: ['Unseen', 'You sprint 8% faster, and the referee can\'t see you while you sprint.'],
  skills: [ABILITIES.rnShuriken, ABILITIES.rnSmoke, ABILITIES.rnClone], ult: ABILITIES.rnStorm,
  mods: { speed: p => p.sprinting ? 1.08 : 1, tick: p => { if (p.sprinting) BF(p, 'stealth', 0.25); } } });

// A bot line-up made of the creatures (forward, midfielder, defender, defender).
LINEUPS.creatures = ['cinderwyrm', 'shogun', 'bulwark', 'ronin'];
LINEUP_NAMES.push(['creatures', 'Creatures']);
if (store.get('fpfc-lineup') === 'creatures') LINEUP_PREF = 'creatures';

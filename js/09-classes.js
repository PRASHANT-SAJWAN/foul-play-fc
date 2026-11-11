/* Foul Play FC · classes.js
   The 12 classes: data, passives, skills, ultimates, synergies, line-ups, ranged weapons, bot skill use and the hotbar.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- classes: passives, skills and ultimates ----------------
   Every player has a class. Skills sit on a hotbar (U I O, P for the ultimate) and aim along your direction. The ultimate fills over time and with good play. */
const ROLE_INFO = {
  offense: { name: 'Offense', col: '#ff4d6d', blurb: 'Goal scorers, high damage, break formations' },
  defense: { name: 'Defense', col: '#4fa3ff', blurb: 'Goal protection, area control, disruption' },
  support: { name: 'Support', col: '#5ccf6a', blurb: 'Team sustain, buffs, healing, utility' },
  disrupt: { name: 'Disrupt', col: '#c45cff', blurb: 'Chaos control, mind games, field manipulation' }
};
// look: hair style index, hair colour, skin, accessory, facial hair, build, eye colour (matches the class art)
const CLASSES = [
  { id: 'striker', name: 'Striker', title: 'The Finisher', role: 'offense', col: '#ff4d4d', num: 10, look: { hair: 8, hairCol: '#1b120c', skin: '#f1c9a5', acc: 0, build: 1, eyes: '#3a2416' },
    passive: ['Goal Instinct', '+20% shot power and +10% speed in the opponent\'s third of the pitch.'],
    skills: [{ id: 'powerShot', name: 'Power Shot', cd: 8, aim: 'self', desc: 'Your next shot within 4 s flies 40% faster and knocks down anyone in its path.' },
      { id: 'curveDrive', name: 'Curve Drive', cd: 10, aim: 'self', desc: 'Your next shot within 4 s bends hard in mid-air, making it harder to block or save.' },
      { id: 'aerial', name: 'Aerial Strike', cd: 12, aim: 'point', range: 150, desc: 'Leap toward the aim and volley anything in reach; landing stuns nearby enemies for 2 s.' }],
    ult: { id: 'meteor', name: 'Meteor Volley', desc: 'Meteors rain on the target goal area for 5 s, stunning every enemy there except the keeper, and your next shot can\'t be caught.' } },
  { id: 'assassin', name: 'Assassin', title: 'The Shadow Scorer', role: 'offense', col: '#8a4dff', num: 7, look: { hair: 1, hairCol: '#14101c', skin: '#d9a477', acc: 5, build: 0, eyes: '#b98cff' },
    passive: ['Shadow Step', 'Gain +15% speed and stealth for 1.5 s after a successful foul or knockout. The referee can\'t see you in stealth.'],
    skills: [{ id: 'cloak', name: 'Cloak', cd: 14, aim: 'self', desc: 'Turn invisible to the referee for 4 s. Your next foul or tackle deals 40% more damage.' },
      { id: 'blink', name: 'Blink Strike', cd: 10, aim: 'enemy', range: 220, desc: 'Teleport to an enemy in range, steal the ball if they have it and knock them down.' },
      { id: 'phantom', name: 'Phantom Dribble', cd: 12, aim: 'point', range: 300, desc: 'Send an afterimage dribbling a fake ball toward the aim for 3 s, drawing tackles.' }],
    ult: { id: 'dimension', name: 'Dimension Break', desc: 'With the ball (or near it), teleport it and yourself to the aim point; an illusion left behind explodes on enemies after 4 s.' } },
  { id: 'speedster', name: 'Speedster', title: 'The Velocity Ace', role: 'offense', col: '#ffcc22', num: 11, look: { hair: 8, hairCol: '#ffd23f', skin: '#f1c9a5', acc: 0, build: 0, eyes: '#3a7bff' },
    passive: ['Momentum', 'Build up to 3 speed stacks while moving (+7% speed each). At 3 stacks, tackles on you succeed 15% less.'],
    skills: [{ id: 'dash', name: 'Dash Burst', cd: 6, aim: 'point', range: 200, desc: 'A high-speed dash that knocks enemies aside.' },
      { id: 'afterimage', name: 'Afterimage', cd: 12, aim: 'self', desc: 'Leave a clone that copies your movement for 3 s; enemies can tackle it by mistake.' },
      { id: 'speedDribble', name: 'Speed Dribble', cd: 14, aim: 'self', desc: '4 s of ultra-fast dribbling; anyone who tackles you is stunned for 1 s instead.' }],
    ult: { id: 'timeRush', name: 'Time Rush', desc: '6 s of accelerated time: +40% speed, the ball can\'t be taken off you, immune to knockdowns, and enemies near you slow down.' } },
  { id: 'tank', name: 'Tank', title: 'The Iron Wall', role: 'defense', col: '#2f6fff', num: 4, look: { hair: 0, hairCol: '#1b120c', skin: '#c58c5e', acc: 0, build: 2, eyes: '#2a1a10' },
    passive: ['Unbreakable', 'Take 25% less damage and can\'t be knocked down during a tackle or slide.'],
    skills: [{ id: 'bodyBlock', name: 'Body Block', cd: 10, aim: 'point', range: 60, desc: 'Raise a barrier in front of you that stops the ball and enemies for 2.5 s.' },
      { id: 'bullRush', name: 'Bull Rush', cd: 9, aim: 'point', range: 220, desc: 'Charge forward, pushing enemies and the ball aside and knocking them down.' },
      { id: 'quake', name: 'Quake Tackle', cd: 12, aim: 'self', desc: 'Slam the ground and trip every enemy close to you.' }],
    ult: { id: 'titan', name: 'Titan\'s Guard', desc: 'A dome for 6 s that bounces shots away and halves damage to team-mates inside.' } },
  { id: 'defender', name: 'Defender', title: 'The Interceptor', role: 'defense', col: '#f2c230', num: 3, look: { hair: 1, hairCol: '#0e0e0e', skin: '#d9a477', acc: 1, build: 1, eyes: '#2a1a10' },
    passive: ['Field Control', '+20% interception range and +15% tackle success.'],
    skills: [{ id: 'intervene', name: 'Intervene', cd: 8, aim: 'enemy', range: 240, desc: 'Dash straight to an opponent and make a clean tackle if they have the ball.' },
      { id: 'zoneLock', name: 'Zone Lock', cd: 12, aim: 'point', range: 400, desc: 'A 4 s zone that slows enemies by 40% and makes them easier to tackle.' },
      { id: 'tackleCharge', name: 'Tackle Charge', cd: 10, aim: 'enemy', range: 130, desc: 'A crunching tackle that knocks the ball far away and stuns the target for 1.5 s.' }],
    ult: { id: 'absoluteMark', name: 'Absolute Mark', desc: 'Mark an enemy for 8 s: they slow down with the ball, can\'t use skills, and you get a speed boost.' } },
  { id: 'goalkeeper', name: 'Goalkeeper', title: 'The Last Line', role: 'defense', col: '#3fbf5f', num: 1, look: { hair: 8, hairCol: '#2f9f4f', skin: '#f1c9a5', acc: 2, build: 1, eyes: '#2f9f4f' },
    passive: ['Instinct Save', '+30% save range. Picking this class puts you in goal.'],
    skills: [{ id: 'diveSave', name: 'Dive Save', cd: 4, aim: 'point', range: 170, desc: 'A long dive toward the aim that blocks the ball and knocks enemies away.' },
      { id: 'wideGuard', name: 'Wide Guard', cd: 12, aim: 'self', desc: 'For 3 s your save area grows by 80%.' },
      { id: 'aerialGrab', name: 'Aerial Grab', cd: 6, aim: 'self', desc: 'Leap to catch high balls, volleys and headers.' }],
    ult: { id: 'infinity', name: 'Infinity Save', desc: 'A barrier over your goal for 5 s that blocks every shot and sends the ball back to midfield.' } },
  { id: 'playmaker', name: 'Playmaker', title: 'The Game Maker', role: 'support', col: '#3a7bff', num: 8, look: { hair: 8, hairCol: '#e8e8f0', skin: '#f1c9a5', acc: 0, build: 0, eyes: '#4fd6ff' },
    passive: ['Visionary', 'Your passes never wander and give the receiver a short speed boost.'],
    skills: [{ id: 'precision', name: 'Precision Pass', cd: 6, aim: 'ally', range: 650, desc: 'A pinpoint pass that slips through opponents and can\'t be intercepted.' },
      { id: 'tactical', name: 'Tactical Zone', cd: 14, aim: 'point', range: 400, desc: 'A 5 s zone where team-mates get +15% speed and shot power.' },
      { id: 'assistMark', name: 'Assist Mark', cd: 12, aim: 'ally', range: 650, desc: 'Mark a team-mate: your next pass to them can\'t be intercepted, and they get +30% shot power and +20% speed for 3 s.' }],
    ult: { id: 'perfect', name: 'Perfect Play', desc: 'The whole team gets +30% speed and +25% shot power for 8 s, and their passes can\'t be intercepted.' } },
  { id: 'healer', name: 'Healer', title: 'The Team Mender', role: 'support', col: '#5ccf6a', num: 6, look: { hair: 9, hairCol: '#ff7ab8', skin: '#f6d2b4', acc: 0, build: 0, eyes: '#ff4d8a' },
    passive: ['Regeneration Field', 'Team-mates near you recover 2 HP and 2 stamina per second.'],
    skills: [{ id: 'healBurst', name: 'Heal Burst', cd: 10, aim: 'ally', range: 320, self: true, desc: 'Restore 35 HP to a team-mate (or yourself).' },
      { id: 'cleanse', name: 'Cleanse', cd: 12, aim: 'ally', range: 320, self: true, desc: 'Remove stuns, slows, glue, freezes and marks from a team-mate.' },
      { id: 'revive', name: 'Revive', cd: 25, aim: 'ally', range: 320, shared: true, desc: 'Get a knocked-out team-mate back up with 50% HP. The cooldown is shared by your team.' }],
    ult: { id: 'lifeweaver', name: 'Lifeweaver', desc: 'A big healing field for 6 s: fast HP and stamina recovery, cleansed stuns, and no knockdowns inside.' } },
  { id: 'aura', name: 'Aura', title: 'The Team Engine', role: 'support', col: '#ffb000', num: 5, look: { hair: 8, hairCol: '#ffcc33', skin: '#f1c9a5', acc: 0, build: 1, eyes: '#ff9f43' },
    passive: ['Team Spirit', 'Team-mates near you get +6% speed, +6% stamina recovery and +5% shot power.'],
    skills: [{ id: 'morale', name: 'Morale Boost', cd: 14, aim: 'self', desc: 'Swing the crowd your way, give every team-mate 15 charge and +8% performance for 4 s.' },
      { id: 'statAura', name: 'Stat Aura', cd: 10, aim: 'self', desc: 'Each use cycles the aura: Offense (+15% shot power), Defense (−20% damage), Speed (+12%), for 6 s on nearby team-mates.' },
      { id: 'surge', name: 'Stamina Surge', cd: 12, aim: 'self', desc: 'Restore 40 stamina to every team-mate near you.' }],
    ult: { id: 'awaken', name: 'Team Awakening', desc: 'For 8 s the team gets +30% speed and shot power, takes 20% less damage, and their fouls go unseen.' } },
  { id: 'brawler', name: 'Brawler', title: 'The Field Rioter', role: 'disrupt', col: '#e8392e', num: 2, look: { hair: 8, hairCol: '#d63030', skin: '#f1c9a5', acc: 2, build: 2, eyes: '#8e1f1f' },
    passive: ['Adrenaline', '+10% damage for every successful foul, stacking 3 times.'],
    skills: [{ id: 'heavyPunch', name: 'Heavy Punch', cd: 6, aim: 'enemy', range: 55, desc: 'A huge punch that sends the target flying and makes them drop the ball.' },
      { id: 'grabThrow', name: 'Grab & Throw', cd: 12, aim: 'enemy', range: 50, desc: 'Grab an enemy and throw them toward the aim; they\'re stunned for 2 s on landing.' },
      { id: 'groundSlam', name: 'Ground Slam', cd: 12, aim: 'self', desc: 'A shockwave that knocks down every enemy around you.' }],
    ult: { id: 'rage', name: 'Rage Mode', desc: '7 s berserk: +25% damage, bigger, faster and immune to knockdowns.' } },
  { id: 'trickster', name: 'Trickster', title: 'The Illusionist', role: 'disrupt', col: '#c45cff', num: 13, look: { hair: 5, hairCol: '#2a1f3a', skin: '#f6d2b4', acc: 6, build: 0, eyes: '#c45cff' },
    passive: ['Mind Game', 'Anything you hit has a 15% chance to be confused for 1.5 s (controls reversed).'],
    skills: [{ id: 'clone', name: 'Clone Decoy', cd: 10, aim: 'point', range: 320, desc: 'A clone runs toward the aim with a fake ball for 4 s, pulling defenders away.' },
      { id: 'trap', name: 'Trap', cd: 8, aim: 'point', range: 300, desc: 'Plant a snare that trips the first enemy to step on it.' },
      { id: 'jammer', name: 'Referee Jammer', cd: 20, aim: 'self', shared: true, desc: 'Scramble the referee\'s vision for 4 s. The cooldown is shared by your team.' }],
    ult: { id: 'illusion', name: 'Grand Illusion', desc: 'Three clones with fake balls burst out around the ball for 6 s, hiding the real one.' } },
  { id: 'ranger', name: 'Ranger', title: 'The Field Sniper', role: 'disrupt', col: '#6a5cff', num: 14, look: { hair: 1, hairCol: '#1b120c', skin: '#d9a477', acc: 7, build: 1, eyes: '#2a1a10' },
    passive: ['Tactical Scope', '+15% ability range and +15% projectile speed, including weapons.'],
    skills: [{ id: 'projPass', name: 'Projectile Pass', cd: 6, aim: 'ally', range: 800, desc: 'A rocket of a pass that flies straight through enemies.' },
      { id: 'gravity', name: 'Gravity Mine', cd: 12, aim: 'point', range: 450, desc: 'A 3 s gravity field that slows enemies and drags them (and the ball) toward the middle.' },
      { id: 'slowBomb', name: 'Slow Bomb', cd: 12, aim: 'point', range: 450, desc: 'Lob a bomb that leaves a wide 40% slow field for 4 s.' }],
    ult: { id: 'orbital', name: 'Orbital Strike', desc: 'Call down a blast on the aim after 1.5 s: enemies there are stunned for 3 s and the ball is launched toward goal.' } }
];
const CLS = Object.fromEntries(CLASSES.map(c => [c.id, c]));
const CLASS_IDS = CLASSES.map(c => c.id);
const SYNERGIES = [
  { id: 'push', name: 'Final Push', need: ['striker', 'playmaker', 'aura'], desc: 'Massive offensive pressure: the team shoots 5% harder.' },
  { id: 'wall', name: 'Unbreakable Wall', need: ['tank', 'defender', 'goalkeeper'], desc: 'Extreme defence: the team takes 10% less damage.' },
  { id: 'chaos', name: 'Chaos Engine', need: ['brawler', 'trickster', 'assassin'], desc: 'Confusion everywhere: the team\'s fouls take 20% longer to be spotted.' },
  { id: 'sustain', name: 'Sustain Core', need: ['healer', 'aura'], desc: 'High survivability: the team recovers 1 HP per second.' }
];
// Bot line-ups: forward, midfielder, defender, defender (the goalkeeper slot is always a Goalkeeper)
const LINEUPS = { balanced: ['striker', 'playmaker', 'defender', 'healer'], aggressive: ['assassin', 'speedster', 'brawler', 'aura'], control: ['ranger', 'playmaker', 'tank', 'trickster'] };
const LINEUP_NAMES = [['mixed', 'Mixed'], ['balanced', 'Balanced'], ['aggressive', 'Aggressive'], ['control', 'Control']];
let MY_CLASS = (() => { const v = store.get('fpfc-class'); return CLS[v] ? v : 'striker'; })();
let LOCK_PLAYER = store.get('fpfc-lock') === true;
let LINEUP_PREF = (() => { const v = store.get('fpfc-lineup'); return LINEUP_NAMES.some(l => l[0] === v) ? v : 'mixed'; })();
let USE_MY_LOOK = store.get('fpfc-mylook') === true;

/* ---------- assigning classes and looks ---------- */
function assignClasses() {
  const pickLine = () => LINEUP_PREF === 'mixed' ? pick(Object.keys(LINEUPS)) : LINEUP_PREF;
  for (let t = 0; t < 2; t++) {
    const line = LINEUPS[pickLine()], slots = TEAM_SIZE >= 5 ? { 4: 0, 3: 1, 1: 2, 2: 3 } : { 2: 0, 1: 2 };
    for (const p of S.players.filter(q => q.team === t)) {
      p.cls = p.i === 0 ? 'goalkeeper' : line[slots[p.i]] || line[0];
      p.cd = [0, 0, 0]; p.ult = 0; p.bf = {}; p.stk = 0; p.mvT = 0; p.auraMode = 0;
    }
  }
  S.syn = [0, 1].map(t => SYNERGIES.filter(s => s.need.every(c => S.players.some(p => p.team === t && p.cls === c))).map(s => s.id));
}
function setClass(p, id) {
  if (!p || !CLS[id]) return;
  p.cls = id; p.cd = [0, 0, 0]; p.bf = p.bf || {};
  applyClassLook(p);
}
function applyClassLook(p) {
  const C = CLS[p.cls]; if (!C) return;
  const L = C.look;
  p.skin = L.skin; p.hair = L.hairCol; p.trailCol = C.col;
  p.lookX = { hairStyle: L.hair, facial: L.facial || 0, accessory: L.acc || 0, build: L.build == null ? 1 : L.build, trim: C.col, sleeves: C.col, eyes: L.eyes || '#2a1a10', classCol: C.col };
  if (C.num && !S.players.some(q => q !== p && q.team === p.team && q.num === C.num)) p.num = C.num;
}
function refreshSynergies() { S.syn = [0, 1].map(t => SYNERGIES.filter(s => s.need.every(c => S.players.some(p => p.team === t && p.cls === c))).map(s => s.id)); }
const hasSyn = (team, id) => !!(S.syn && S.syn[team] && S.syn[team].includes(id));

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
const knockImmune = p => hasBf(p, 'timeRush') || hasBf(p, 'rage') || hasBf(p, 'immune') || (p.cls === 'tank' && (p.lunge > 0 || p.slide > 0));
const refIgnores = p => !!p && (hasBf(p, 'cloak') || hasBf(p, 'stealth') || hasBf(p, 'awaken'));
function tackleMul(stealer, carrier) {
  let m = 1;
  if (stealer.cls === 'defender') m *= 1.15;
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
  const imm = knockImmune(t);
  if (o.stun && !imm) { t.stun = Math.max(t.stun, o.stun); a0Anim(t, 'fall', 0.6); }
  if (o.kb && !imm) { t.vx = Math.cos(ang) * o.kb; t.vy = Math.sin(ang) * o.kb; }
  if (imm && (o.stun || o.kb)) floatText(t, 'UNSTOPPABLE', '#ffd23f');
  if (S.ball.owner === t && (o.stun || o.kb) && !imm) loseBall(t, ang);
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

/* ---------- aiming ---------- */
function aimFor(p, range) {   // a point ahead of the player, along their aim
  const f = passDir(p);
  return { x: clamp(p.x + Math.cos(f) * range * 0.7, 8, W - 8), y: clamp(p.y + Math.sin(f) * range * 0.7, 8, H - 8) };
}
function unitNear(list, pt) { let best = null, bd = 1e9; for (const q of list) { const d = Math.hypot(q.x - pt.x, q.y - pt.y); if (d < bd) { bd = d; best = q; } } return best; }
function skillTarget(p, def, range) {
  const pt = aimFor(p, range), mouse = false;
  if (def.aim === 'enemy') {
    const cand = enemiesOf(p).filter(q => dist(q, p) <= range && q.ko <= 0);
    if (!mouse && S.ball.owner && cand.includes(S.ball.owner)) return S.ball.owner;
    return unitNear(cand, pt);
  }
  if (def.aim === 'ally') {
    const cand = alliesOf(p).filter(q => (def.self || q !== p) && dist(q, p) <= range);
    if (def.id === 'revive') return unitNear(cand.filter(q => q.ko > 0), pt);
    if (!mouse && (def.id === 'healBurst' || def.id === 'cleanse')) return cand.sort((u, v) => u.hp - v.hp)[0] || null;
    return unitNear(cand.filter(q => q.ko <= 0), pt);
  }
  return null;
}

/* ---------- casting ---------- */
const SKILL_KEYS = ['skill1', 'skill2', 'skill3', 'ult'];
function skillDef(p, slot) { const C = CLS[p.cls]; return C ? (slot === 3 ? C.ult : C.skills[slot]) : null; }
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

/* ---------- per-frame update ---------- */
function updateClasses(dt) {
  S.zones = S.zones || []; S.walls = S.walls || []; S.projs = S.projs || [];
  const b = S.ball;
  if (b.pierce && b.pierce < S.time) b.pierce = 0;
  for (const p of S.players) {
    if (!p.cls) continue;
    for (let i = 0; i < 3; i++) if (p.cd[i] > 0) p.cd[i] = Math.max(0, p.cd[i] - dt);
    for (const k in p.bf) { p.bf[k] -= dt; if (p.bf[k] <= 0) delete p.bf[k]; }
    if (!onPitch(p)) continue;
    p.ult = Math.min(100, (p.ult || 0) + dt * 1.1);
    const v = Math.hypot(p.vx, p.vy);
    if (p.cls === 'speedster') { if (v > 80) { p.mvT += dt; if (p.mvT > 1.4 && p.stk < 3) { p.stk++; p.mvT = 0; } } else { p.mvT = 0; if (v < 30) p.stk = 0; } }
    if (p.cls === 'healer') for (const q of alliesOf(p)) if (q !== p && dist(q, p) < 120) { q.hp = Math.min(100, q.hp + 2 * dt); q.stamina = Math.min(q.staminaMax, q.stamina + 2 * dt); }
    if (hasSyn(p.team, 'sustain')) p.hp = Math.min(100, p.hp + dt);
    if (nearAura(p)) p.stamina = Math.min(p.staminaMax, p.stamina + 0.6 * dt);
    if (p.aerialPend && p.z <= 0 && p.vz <= 0 && !hasBf(p, 'aerial')) { p.aerialPend = false; burst(p.x, p.y, '#ff4d4d', 16, 6); for (const q of enemiesOf(p)) if (dist(q, p) < 70) knock(p, q, { stun: 2, foul: false }); }
    if (p.dash) {   // dashes: skill movement that bumps people out of the way
      p.dash.t -= dt;
      if (p.dash.hit) for (const q of enemiesOf(p)) if (!p.dash.done.includes(q.id) && dist(q, p) < 18 && q.ko <= 0) { p.dash.done.push(q.id); knock(p, q, Object.assign({ from: p }, p.dash.hit)); }
      if (p.dash.t <= 0) p.dash = null;
    }
    if (p.thrown) {   // flying after a Grab & Throw
      const T = p.thrown; T.t += dt; const u = Math.min(1, T.t / T.dur);
      p.x = T.sx + (T.tx - T.sx) * u; p.y = T.sy + (T.ty - T.sy) * u; p.z = 90 * u * (1 - u) * 2; p.vx = p.vy = 0;
      if (u >= 1) { p.thrown = null; p.z = 0; const by = S.players[T.by]; knock(by || p, p, { stun: 2, dmg: 10, foul: !!by, kind: 'skill' }); S.shake = Math.max(S.shake, 4); for (const q of S.players) if (q !== p && onPitch(q) && dist(q, p) < 20) { q.stun = Math.max(q.stun, 0.8); floatText(q, 'BOWLED OVER', '#ffd23f'); } }
    }
    if (hasBf(p, 'confused') && !p.human) { p.dx = Math.cos(S.time * 3 + p.id) ; p.dy = Math.sin(S.time * 2 + p.id); }
  }
  // zones
  for (let i = S.zones.length - 1; i >= 0; i--) {
    const z = S.zones[i]; z.ttl -= dt; z.t += dt;
    if (z.type === 'heal') for (const q of S.players) if (q.team === z.team && onPitch(q) && Math.hypot(q.x - z.x, q.y - z.y) < z.r) { q.hp = Math.min(100, q.hp + 10 * dt); q.stamina = Math.min(q.staminaMax, q.stamina + 10 * dt); if (q.ko <= 0) q.stun = 0; BF(q, 'immune', 0.3); }
    if (z.type === 'gravity') {
      for (const q of S.players) if (q.team !== z.team && onPitch(q)) { const d = Math.hypot(q.x - z.x, q.y - z.y); if (d < z.r && d > 4) { q.x -= (q.x - z.x) / d * 70 * dt; q.y -= (q.y - z.y) / d * 70 * dt; } }
      const d = Math.hypot(b.x - z.x, b.y - z.y); if (!b.owner && d < z.r && d > 4) { b.vx -= (b.x - z.x) / d * 220 * dt; b.vy -= (b.y - z.y) / d * 220 * dt; }
    }
    if (z.type === 'trap') { const q = S.players.find(q => q.team !== z.team && able(q) && q.z <= 0 && Math.hypot(q.x - z.x, q.y - z.y) < z.r); if (q) { const o = S.players[z.owner]; knock(o || q, q, { stun: 1.5, foul: false }); floatText(q, 'TRAPPED!', '#c45cff'); crowdEvent(q.team, { noob: 5, fun: 4 }); S.zones.splice(i, 1); continue; } }
    if (z.type === 'mine' && (z.ttl <= 0 || S.players.some(q => q.team !== z.team && able(q) && Math.hypot(q.x - z.x, q.y - z.y) < 22))) {
      const o = S.players[z.owner]; burst(z.x, z.y, '#8a4dff', 26, 30); S.shake = Math.max(S.shake, 4); thump(70, 0.3, 0.14);
      for (const q of S.players) if (q.team !== z.team && onPitch(q) && Math.hypot(q.x - z.x, q.y - z.y) < z.r) knock(o || q, q, { stun: 1.5, kb: 200, from: z, foul: false });
      S.decoys = S.decoys.filter(d => !(d.src === z.owner && !d.ball && Math.hypot(d.x - z.x, d.y - z.y) < 10)); S.zones.splice(i, 1); continue;
    }
    if (z.type === 'meteor') {
      z.tick -= dt;
      if (z.tick <= 0 && z.ttl > 0) { z.tick = 0.3; z.mets.push({ x: z.x + rand(-1, 1) * z.r * 0.8, y: z.y + rand(-1, 1) * z.r, t: 0 }); }
      for (let k = z.mets.length - 1; k >= 0; k--) {
        const m = z.mets[k]; m.t += dt;
        if (m.t >= 0.55) { burst(m.x, m.y, '#ff7a2f', 14, 10); thump(60, 0.2, 0.08); S.shake = Math.max(S.shake, 2); const o = S.players[z.owner];
          for (const q of S.players) if (q.team !== z.team && !q.gk && onPitch(q) && Math.hypot(q.x - m.x, q.y - m.y) < 42) knock(o || q, q, { stun: 1.5, foul: false, col: '#ff7a2f' });
          z.mets.splice(k, 1); }
      }
      if (z.ttl <= 0 && z.mets.length) continue;
    }
    if (z.type === 'orbital' && z.ttl <= 0) {
      const o = S.players[z.owner]; burst(z.x, z.y, '#b8a8ff', 40, 40); S.shake = Math.max(S.shake, 9); thump(50, 0.5, 0.2); cheer('roar', z.x, 'ORBITAL STRIKE!');
      for (const q of S.players) if (q.team !== z.team && onPitch(q) && Math.hypot(q.x - z.x, q.y - z.y) < z.r) knock(o || q, q, { stun: 3, dmg: 15, kb: 260, from: z, foul: false, col: '#b8a8ff' });
      if (Math.hypot(b.x - z.x, b.y - z.y) < z.r) { if (b.owner) loseBall(b.owner, 0); const g = goalOf(z.team), a = Math.atan2(g.y - b.y, g.x - b.x); b.owner = null; b.vx = Math.cos(a) * 650; b.vy = Math.sin(a) * 650; b.vz = 260; b.lastTouch = o || b.lastTouch; }
    }
    if (z.type === 'dome' && !b.owner) {   // shots bounce off the dome
      const d = Math.hypot(b.x - z.x, b.y - z.y), nx = (b.x - z.x) / (d || 1), ny = (b.y - z.y) / (d || 1), vn = b.vx * nx + b.vy * ny;
      if (d < z.r && d > z.r - 30 && vn < 0 && b.lastTouch && b.lastTouch.team !== z.team) { b.vx -= 1.7 * vn * nx; b.vy -= 1.7 * vn * ny; b.vx *= 0.6; b.vy *= 0.6; b.curve = null; floatText(b, 'DEFLECTED', '#4fa3ff'); thump(300, 0.15, 0.08); }
    }
    if (z.type === 'infinity' && !b.owner && b.lastTouch && b.lastTouch.team !== z.team) {
      const s = z.team === 0 ? 1 : -1;
      if (Math.abs(b.x - z.x) < 26 && Math.abs(b.y - H / 2) < GOAL_HALF + 10 && b.vx * s < 0) { b.vx = s * 520; b.vy = rand(-150, 150); b.vz = 160; b.curve = null; b.lastTouch = S.players.find(q => q.gk && q.team === z.team) || b.lastTouch; floatText(b, 'INFINITY SAVE', '#3fbf5f'); cheer('roar', b.x, 'NOTHING GETS PAST!'); }
    }
    if (z.ttl <= 0) S.zones.splice(i, 1);
  }
  // barriers
  for (let i = S.walls.length - 1; i >= 0; i--) {
    const w = S.walls[i]; w.ttl -= dt; if (w.ttl <= 0) { S.walls.splice(i, 1); continue; }
    const seg = o => { const vx = w.x2 - w.x1, vy = w.y2 - w.y1, l2 = vx * vx + vy * vy || 1, t = clamp(((o.x - w.x1) * vx + (o.y - w.y1) * vy) / l2, 0, 1), cx = w.x1 + vx * t, cy = w.y1 + vy * t; return { d: Math.hypot(o.x - cx, o.y - cy), nx: (o.x - cx), ny: (o.y - cy) }; };
    if (!b.owner && (b.z || 0) < 50) { const s = seg(b); if (s.d < 8) { const n = Math.hypot(s.nx, s.ny) || 1, nx = s.nx / n, ny = s.ny / n, vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; b.vx *= 0.6; b.vy *= 0.6; b.curve = null; thump(220, 0.1, 0.06); } } }
    for (const q of S.players) if (q.team !== w.team && onPitch(q)) { const s = seg(q); if (s.d < 12) { const n = Math.hypot(s.nx, s.ny) || 1; q.x += s.nx / n * (12 - s.d); q.y += s.ny / n * (12 - s.d); } }
  }
  // projectiles: pebbles, darts and bombs
  for (let i = S.projs.length - 1; i >= 0; i--) {
    const pr = S.projs[i];
    if (pr.type === 'bomb') {
      pr.t += dt; const u = Math.min(1, pr.t / pr.dur); pr.x = pr.sx + (pr.tx - pr.sx) * u; pr.y = pr.sy + (pr.ty - pr.sy) * u; pr.z = 20 * (1 - u) + 120 * u * (1 - u);
      if (u >= 1) { addZone({ type: 'slowBomb', x: pr.x, y: pr.y, r: 110, ttl: 4, team: pr.team }); burst(pr.x, pr.y, '#9fb4ff', 20, 10); thump(90, 0.2, 0.1); S.projs.splice(i, 1); }
      continue;
    }
    pr.ttl -= dt; pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    if (pr.ttl <= 0 || pr.x < -20 || pr.x > W + 20 || pr.y < -20 || pr.y > H + 20) { S.projs.splice(i, 1); continue; }
    const o = S.players[pr.owner];
    const hit = S.players.find(q => q.id !== pr.owner && onPitch(q) && q.ko <= 0 && Math.hypot(q.x - pr.x, q.y - pr.y) < 11 && pr.z > (q.z || 0) && pr.z < (q.z || 0) + 48);
    if (hit) {
      if (pr.type === 'pebble') knock(o || hit, hit, { dmg: 10, stun: 0.9, kb: 120, from: { x: pr.x - pr.vx, y: pr.y - pr.vy }, foul: true, kind: 'ranged', col: '#c9b48a' });
      else { knock(o || hit, hit, { dmg: 4, foul: true, kind: 'ranged', col: '#ff9f43' }); hit.slowT = Math.max(hit.slowT, 1); }
      S.projs.splice(i, 1); continue;
    }
    if (Math.hypot(b.x - pr.x, b.y - pr.y) < 9 && Math.abs((b.z || 0) - pr.z) < 22) {   // shooting the ball knocks it on
      if (b.owner) loseBall(b.owner, Math.atan2(pr.vy, pr.vx));
      b.vx += pr.vx * (pr.type === 'pebble' ? 0.45 : 0.15); b.vy += pr.vy * (pr.type === 'pebble' ? 0.45 : 0.15); b.vz = Math.max(b.vz, 60); b.lastTouch = o || b.lastTouch; S.projs.splice(i, 1);
    }
  }
}

/* ---------- bots using skills ---------- */
function botSkills(p) {
  if (!p.cls || !able(p) || hasBf(p, 'marked')) return;
  const C = CLS[p.cls], b = S.ball, own = b.owner === p, carrier = b.owner, enemyBall = carrier && carrier.team !== p.team, g = goalOf(p.team), dg = Math.hypot(g.x - p.x, g.y - p.y);
  const enemyNear = r => enemiesOf(p).some(q => dist(q, p) < r);
  const allyLow = alliesOf(p).some(q => q.hp < 45 && dist(q, p) < 300), allyKO = alliesOf(p).some(q => q.ko > 0 && dist(q, p) < 300);
  const want = {
    powerShot: own && dg < SHOOT_RANGE * 1.2, curveDrive: own && dg < SHOOT_RANGE * 1.2 && enemyNear(120), aerial: !b.owner && b.z > 25 && dist(p, b) < 120 && dg < SHOOT_RANGE * 1.4,
    meteor: dg < W * 0.45 && (own || (carrier && carrier.team === p.team)),
    cloak: enemyBall && dist(p, carrier) < 200, blink: enemyBall && dist(p, carrier) < 220, phantom: own && enemyNear(110), dimension: own && dg > SHOOT_RANGE && dg < W * 0.6,
    dash: own && enemyNear(90), afterimage: own && enemyNear(150), speedDribble: own && enemyNear(160), timeRush: own && dg < W * 0.55,
    bodyBlock: !own && b.lastTouch && b.lastTouch.team !== p.team && Math.hypot(b.vx, b.vy) > 350 && dist(p, b) < 160, bullRush: enemyBall && dist(p, carrier) < 200, quake: enemiesOf(p).filter(q => dist(q, p) < 75).length >= 2, titan: enemyBall && dist(carrier, { x: W - g.x, y: H / 2 }) < W * 0.3,
    intervene: enemyBall && dist(p, carrier) < 240 && dist(p, carrier) > 40, zoneLock: enemyBall && dist(p, carrier) < 300, tackleCharge: enemyBall && dist(p, carrier) < 120, absoluteMark: enemyBall && dist(p, carrier) < 400,
    diveSave: false, wideGuard: !b.owner && b.lastTouch && b.lastTouch.team !== p.team && Math.hypot(b.vx, b.vy) > 400 && Math.abs(b.x - (W - g.x)) < 350, aerialGrab: !b.owner && b.z > 40 && dist(p, b) < 80, infinity: enemyBall && Math.abs(carrier.x - (W - g.x)) < SHOOT_RANGE,
    precision: own && enemyNear(100), tactical: own && dg < W * 0.5, assistMark: own, perfect: own || (carrier && carrier.team === p.team),
    healBurst: allyLow || p.hp < 45, cleanse: alliesOf(p).some(q => (q.stun > 0.6 || q.slowT > 0 || hasBf(q, 'marked')) && dist(q, p) < 300), revive: allyKO, lifeweaver: allyLow,
    morale: S.score[p.team] <= S.score[1 - p.team], statAura: alliesOf(p).filter(q => dist(q, p) < 160).length >= 2, surge: alliesOf(p).some(q => q.stamina < 40 && dist(q, p) < 160), awaken: carrier && carrier.team === p.team,
    heavyPunch: enemyBall && dist(p, carrier) < 55 && p.aggr > 0.5, grabThrow: enemyBall && dist(p, carrier) < 50, groundSlam: enemiesOf(p).filter(q => dist(q, p) < 85).length >= 2, rage: enemyNear(150),
    clone: own && enemyNear(140), trap: enemyBall && dist(p, carrier) < 300, jammer: p.aggr > 0.6 && enemyNear(70), illusion: own || (carrier && carrier.team === p.team && dist(carrier, p) < 300),
    projPass: own && enemyNear(110), gravity: enemyBall && dist(p, carrier) < 400, slowBomb: enemyBall && dist(p, carrier) < 420, orbital: enemyBall && dist(p, carrier) < 600
  };
  const order = [3, 0, 1, 2];
  for (const slot of order) {
    const def = slot === 3 ? C.ult : C.skills[slot];
    if (!want[def.id]) continue;
    if (slot === 3 ? (p.ult || 0) < 100 : p.cd[slot] > 0) continue;
    if (Math.random() < 0.55) continue;   // bots don't fire everything the instant it's ready
    const saved = p.human; p.human = null;
    const aimAt = enemyBall ? carrier : own ? { x: g.x, y: H / 2 + rand(-60, 60) } : b;
    const old = { dx: p.dx, dy: p.dy, face: p.face }; p.face = Math.atan2(aimAt.y - p.y, aimAt.x - p.x); p.dx = Math.cos(p.face); p.dy = Math.sin(p.face);
    const ok = castSkill(p, slot);
    if (!ok) { p.face = old.face; p.dx = old.dx; p.dy = old.dy; }
    p.human = saved;
    if (ok) return;
  }
}

/* ---------- drawing: zones, barriers, projectiles, the aim cursor and the hotbar ---------- */
const ZONE_STYLE = { tactical: '#3a7bff', zoneLock: '#f2c230', heal: '#7dff9b', gravity: '#8a7bff', slowBomb: '#9fb4ff', trap: '#c45cff', mine: '#8a4dff', meteor: '#ff7a2f', orbital: '#b8a8ff', dome: '#4fa3ff', infinity: '#3fbf5f' };
function drawClassFx() {
  const ring = (x, y, r, col, fill, dash, z = 0) => { const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; pts.push(proj(x + Math.cos(a) * r, y + Math.sin(a) * r, z)); } ctx.save(); if (dash) { ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.time * 25; } path(pts, true); if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); };
  for (const z of S.zones || []) {
    const c = ZONE_STYLE[z.type] || '#fff', a = Math.min(1, z.ttl * 2);
    ctx.globalAlpha = a;
    if (z.type === 'trap') { const own = S.humans.some(h => !h.remote && h.team === z.team); if (own || z.t < 0.6) ring(z.x, z.y, z.r, c, 'rgba(196,92,255,.25)', false); }
    else if (z.type === 'dome') { for (const hh of [0, 20, 40, 60]) ring(z.x, z.y, z.r * Math.cos(hh / 75 * Math.PI / 2), 'rgba(79,163,255,.55)', hh === 0 ? 'rgba(79,163,255,.12)' : null, false, hh); }
    else if (z.type === 'infinity') { const P1 = proj(z.x, H / 2 - GOAL_HALF, 0), P2 = proj(z.x, H / 2 + GOAL_HALF, 0), P3 = proj(z.x, H / 2 + GOAL_HALF, GOAL_H + 10), P4 = proj(z.x, H / 2 - GOAL_HALF, GOAL_H + 10); ctx.fillStyle = `rgba(63,191,95,${0.25 + 0.1 * Math.sin(S.time * 8)})`; path([P1, P2, P3, P4], true); ctx.fill(); ctx.strokeStyle = '#7dff9b'; ctx.lineWidth = 2; ctx.stroke(); }
    else if (z.type === 'orbital') { const k = 1 - Math.max(0, z.ttl) / 1.5; ring(z.x, z.y, z.r, c, `rgba(184,168,255,${0.08 + 0.2 * k})`, true); ring(z.x, z.y, z.r * (1 - k), '#ffffff', null, false); const T = proj(z.x, z.y, 400), G0 = proj(z.x, z.y, 0); ctx.strokeStyle = `rgba(220,210,255,${0.3 + 0.6 * k})`; ctx.lineWidth = 3 + 8 * k; ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(G0.x, G0.y); ctx.stroke(); }
    else if (z.type === 'meteor') { ring(z.x, z.y, z.r, c, 'rgba(255,122,47,.08)', true); for (const m of z.mets) { const zz = 320 * (1 - m.t / 0.55), P = proj(m.x, m.y, zz), s = Math.max(0.7, P.s); ctx.fillStyle = '#ffb36b'; ell(P.x, P.y, 7 * s, 7 * s); ctx.fill(); ctx.fillStyle = 'rgba(255,90,20,.5)'; ell(P.x, P.y - 10 * s, 5 * s, 12 * s); ctx.fill(); const Gm = proj(m.x, m.y); ctx.strokeStyle = 'rgba(255,122,47,.7)'; ell(Gm.x, Gm.y, 18 * Gm.s, 7 * Gm.s); ctx.stroke(); } }
    else ring(z.x, z.y, z.r, c, c + '22', z.type !== 'heal');
    ctx.globalAlpha = 1;
  }
  for (const w of S.walls || []) {
    const A = proj(w.x1, w.y1, 0), B = proj(w.x2, w.y2, 0), C2 = proj(w.x2, w.y2, 44), D = proj(w.x1, w.y1, 44);
    ctx.fillStyle = 'rgba(79,163,255,.35)'; path([A, B, C2, D], true); ctx.fill(); ctx.strokeStyle = '#9fd0ff'; ctx.lineWidth = 2; ctx.stroke();
  }
  for (const pr of S.projs || []) {
    const P = proj(pr.x, pr.y, pr.z), s = Math.max(0.6, P.s);
    if (pr.type === 'bomb') { ctx.fillStyle = '#9fb4ff'; ell(P.x, P.y, 5 * s, 5 * s); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.stroke(); continue; }
    const Tl = proj(pr.x - pr.vx * 0.03, pr.y - pr.vy * 0.03, pr.z);
    ctx.strokeStyle = pr.type === 'pebble' ? 'rgba(201,180,138,.7)' : 'rgba(255,159,67,.8)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(Tl.x, Tl.y); ctx.lineTo(P.x, P.y); ctx.stroke();
    ctx.fillStyle = pr.type === 'pebble' ? '#c9b48a' : '#ff9f43'; ell(P.x, P.y, 2.6 * s, 2.6 * s); ctx.fill();
  }
  for (const d of S.decoys || []) if (d.ball) { const P = proj(d.x + 9, d.y + 4, 4), s = Math.max(0.6, P.s); ctx.fillStyle = '#ffffff'; ell(P.x, P.y, 4.4 * s, 4.4 * s); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.stroke(); }
  // auras and marks on players
  for (const p of S.players) {
    if (!onPitch(p) || !p.bf) continue;
    const G0 = proj(p.x, p.y), b = p.bf;
    if (b.timeRush > 0 || b.perfect > 0 || b.awaken > 0 || b.rage > 0) { ctx.strokeStyle = b.rage > 0 ? '#ff4d4d' : b.timeRush > 0 ? '#ffd23f' : b.awaken > 0 ? '#ffb000' : '#3a7bff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(S.time * 10); ell(G0.x, G0.y, 16 * G0.s, 6 * G0.s); ctx.stroke(); ctx.globalAlpha = 1; }
    if (b.marked > 0) { const P = proj(p.x, p.y, 58); ctx.fillStyle = '#f2c230'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('◎ MARKED', P.x, P.y); }
    if (b.confused > 0) { const P = proj(p.x, p.y, 54); ctx.fillStyle = '#c45cff'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('?!?', P.x, P.y); }
    if (b.assistMark > 0) { const P = proj(p.x, p.y, 54); ctx.fillStyle = '#3a7bff'; ctx.font = `700 ${12 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('★', P.x, P.y); }
  }
}
function cloakAlpha(p) {   // cloaked enemies are barely visible to you; cloaked team-mates are see-through
  if (!hasBf(p, 'cloak')) return 1;
  const mine = S.humans.some(h => !h.remote && h.team === p.team);
  return mine ? 0.45 : 0.12;
}
const SKILL_GLYPH = { powerShot: '💥', curveDrive: '↪', aerial: '⤴', meteor: '☄', cloak: '◐', blink: '⚡', phantom: '👤', dimension: '◈', dash: '»', afterimage: '⧉', speedDribble: '⚽', timeRush: '⏱', bodyBlock: '▮', bullRush: '➜', quake: '≋', titan: '⛨', intervene: '⇥', zoneLock: '⊘', tackleCharge: '✶', absoluteMark: '◎', diveSave: '⤵', wideGuard: '↔', aerialGrab: '✋', infinity: '∞', precision: '➶', tactical: '⬡', assistMark: '★', perfect: '✦', healBurst: '✚', cleanse: '❋', revive: '♥', lifeweaver: '❦', morale: '♪', statAura: '◉', surge: '⚡', awaken: '☀', heavyPunch: '✊', grabThrow: '⇪', groundSlam: '✹', rage: '♨', clone: '⧉', trap: '⌖', jammer: '⊗', illusion: '❖', projPass: '➹', gravity: '◍', slowBomb: '●', orbital: '✺' };
function drawHotbar(h, right) {
  const p = S.players[h.pid]; if (!p || !p.cls) return;
  const C = CLS[p.cls], map = h.map || MAPSOLO, n = 4, sz = 46, gap = 6, w = n * sz + (n - 1) * gap + 20, x = right ? LW - w - 14 : 14, y = LH - sz - 40;
  ctx.fillStyle = 'rgba(6,11,10,.88)'; rr(x, y - 24, w, sz + 34, 10);
  ctx.strokeStyle = C.col; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5; rrs(x + 0.5, y - 23.5, w - 1, sz + 33, 10); ctx.globalAlpha = 1;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `700 13px ${UI}`; ctx.fillStyle = C.col; ctx.fillText(C.name.toUpperCase(), x + 10, y - 11);
  ctx.textAlign = 'right'; ctx.fillStyle = ROLE_INFO[C.role].col; ctx.font = `700 11px ${UI}`; ctx.fillText(ROLE_INFO[C.role].name.toUpperCase() + (p.cls === 'speedster' ? ` · ${p.stk || 0}/3` : p.cls === 'brawler' ? ` · ADRENALINE ${p.stk || 0}` : ''), x + w - 10, y - 11);
  for (let i = 0; i < n; i++) {
    const def = skillDef(p, i), sx = x + 10 + i * (sz + gap), sy = y;
    const cd = i === 3 ? 0 : Math.max(p.cd[i], def.shared && S.teamCd ? ((S.teamCd[p.team] || {})[def.id] || 0) - S.time : 0), ready = i === 3 ? p.ult >= 100 : cd <= 0;
    ctx.fillStyle = ready ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)'; rr(sx, sy, sz, sz, 7);
    ctx.strokeStyle = ready ? (i === 3 ? '#ffd23f' : C.col) : 'rgba(255,255,255,.18)'; ctx.lineWidth = i === 3 && ready ? 2 + Math.sin(S.time * 8) : 1.5; rrs(sx + 0.5, sy + 0.5, sz - 1, sz - 1, 7);
    ctx.globalAlpha = ready ? 1 : 0.45; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.font = `600 20px ${UI}`; ctx.fillText(SKILL_GLYPH[def.id] || def.name[0], sx + sz / 2, sy + sz / 2 - 3); ctx.globalAlpha = 1;
    if (i === 3) { const f = clamp((p.ult || 0) / 100, 0, 1); ctx.fillStyle = 'rgba(255,210,63,.25)'; ctx.fillRect(sx + 2, sy + sz - 2 - (sz - 4) * f, sz - 4, (sz - 4) * f); if (!ready) { ctx.fillStyle = '#ffd23f'; ctx.font = `700 11px ${UI}`; ctx.fillText(Math.floor(p.ult) + '%', sx + sz / 2, sy + sz - 9); } }
    else if (!ready) { const f = clamp(cd / def.cd, 0, 1); ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(sx + 1, sy + 1, sz - 2, (sz - 2) * f); ctx.fillStyle = '#ffffff'; ctx.font = `700 15px ${UI}`; ctx.fillText(Math.ceil(cd), sx + sz / 2, sy + sz / 2); }
    const key = (map[SKILL_KEYS[i]] || [])[0]; ctx.font = `700 10px ${UI}`; ctx.fillStyle = '#c9d3cb'; ctx.textAlign = 'left'; ctx.fillText(keyLabel(key), sx + 4, sy + 8);
  }
  // the skill name under the cursor slot is too much detail here; the catalog and guide explain each one
  ctx.textBaseline = 'alphabetic';
}

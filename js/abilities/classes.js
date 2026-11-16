/* Foul Play FC · js/abilities/classes.js
   The seven Sins (the playable characters), the bots' Goalkeeper, roles, synergies and line-ups, and assigning classes and looks.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- classes: passives, skills and ultimates ----------------
   Every player has a class. Skills sit on a hotbar (U I O, P for the ultimate) and aim along your direction. The ultimate fills over time and with good play. */
const ROLE_INFO = {
  offense: { name: 'Offense', col: '#ff4d6d', blurb: 'Goal scorers, high damage, break formations' },
  defense: { name: 'Defense', col: '#4fa3ff', blurb: 'Goal protection, area control, disruption' },
  support: { name: 'Support', col: '#5ccf6a', blurb: 'Team sustain, buffs, healing, utility' },
  disrupt: { name: 'Disrupt', col: '#c45cff', blurb: 'Chaos control, mind games, field manipulation' }
};
// The seven Sins (the characters you can pick), plus the Goalkeeper that bots use in goal (hidden from selection).
// look: hair style index, hair colour, skin, accessory, build, eye colour. Skill effects: js/abilities/sins.js.
// Every ability says whether it stuns (stuns: true/false) and when bots use it (bot).
const DEFAULT_CLASS = 'pride';
const CLASSES = [
  { id: 'wrath', name: 'Wrath', title: 'The Berserker', role: 'offense', col: '#e8392e', num: 9, look: { hair: 2, hairCol: '#3a0d08', skin: '#c58c5e', acc: 0, build: 2, eyes: '#ff4d2e' },
    passive: ['Seething', 'Hits harder the more hurt you are: up to +25% damage at low HP.'],
    skills: [{ id: 'sWrathCharge', glyph: '»', name: 'Rage Charge', cd: 9, aim: 'point', range: 220, stuns: true, desc: 'Charge toward the aim, bowling over anyone in the way and taking the ball if you run through the carrier.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 210 },
      { id: 'sWrathSlam', glyph: '✹', name: 'Wrathful Slam', cd: 12, aim: 'self', stuns: true, desc: 'Smash the ground: every opponent within reach is knocked down for 1 s.', bot: (p, c) => enemiesOf(p).filter(q => dist(q, p) < 80).length >= 2 || (c.enemyBall && dist(p, c.carrier) < 70) }],
    ult: { id: 'sWrathUlt', glyph: '♨', name: 'Unleashed Fury', stuns: false, desc: '7 s of fury: +25% damage, +10% speed, and nothing knocks you down.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 250 } },
  { id: 'gluttony', name: 'Gluttony', title: 'The Bottomless', role: 'defense', col: '#d98c2b', num: 4, look: { hair: 6, hairCol: '#5a3412', skin: '#e0a878', acc: 0, build: 2, eyes: '#5a3412' },
    passive: ['Second Helping', 'Heavy and hard to move (knockback halved, a little slower). Win the ball and regain 12 HP.'],
    skills: [{ id: 'sGlutDevour', glyph: '◕', name: 'Devour', cd: 11, aim: 'enemy', range: 80, stuns: false, desc: 'Gobble the ball off an opponent next to you and slow them for a moment; without the ball, it bites for 12 damage.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 75 },
      { id: 'sGlutWall', glyph: '▮', name: 'Belly Wall', cd: 10, aim: 'point', range: 120, stuns: false, desc: 'Plant a wall in front of you for 2.5 s that stops the ball and opponents.', bot: (p, c) => !c.own && S.ball.lastTouch && S.ball.lastTouch.team !== p.team && Math.hypot(S.ball.vx, S.ball.vy) > 300 && dist(p, S.ball) < 180 }],
    ult: { id: 'sGlutUlt', glyph: '❂', name: 'Feast', stuns: true, desc: 'Drag every opponent within reach toward you, knock them down for 1.2 s and regain 30 HP.', bot: p => enemiesOf(p).filter(q => dist(q, p) < 150).length >= 2 } },
  { id: 'greed', name: 'Greed', title: 'The Collector', role: 'support', col: '#f2c230', num: 8, look: { hair: 8, hairCol: '#c9a050', skin: '#f1c9a5', acc: 7, build: 1, eyes: '#f2c230' },
    passive: ['Interest', 'Your charge fills on its own, 1.5% a second.'],
    skills: [{ id: 'sGreedSteal', glyph: '✋', name: 'Pickpocket', cd: 10, aim: 'enemy', range: 160, stuns: false, desc: 'Blink behind an opponent and lift the ball off them. No foul, no stun: just gone.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 150 },
      { id: 'sGreedPass', glyph: '➶', name: 'Golden Pass', cd: 9, aim: 'ally', range: 520, stuns: false, desc: 'With the ball: a fast pass to a team-mate that nobody can intercept.', bot: (p, c) => c.own && c.enemyNear(110) }],
    ult: { id: 'sGreedUlt', glyph: '✦', name: 'Jackpot', stuns: false, desc: 'Your whole team gets +25 charge and 6 s of sharper shots and passes and extra speed.', bot: (p, c) => c.own || (c.carrier && c.carrier.team === p.team) } },
  { id: 'envy', name: 'Envy', title: 'The Mimic', role: 'disrupt', col: '#3fbf6a', num: 7, look: { hair: 1, hairCol: '#16331f', skin: '#d9a477', acc: 5, build: 0, eyes: '#3fbf6a' },
    passive: ['Covet', '+15% speed when chasing an opponent who has the ball.'],
    skills: [{ id: 'sEnvyClone', glyph: '⧉', name: 'Doppelgänger', cd: 12, aim: 'point', range: 300, stuns: false, desc: 'An exact copy of you runs toward the aim (with a copy of the ball if you have it) to fool opponents.', bot: (p, c) => c.own && c.enemyNear(140) },
      { id: 'sEnvyEye', glyph: '◎', name: 'Green Eye', cd: 12, aim: 'enemy', range: 400, stuns: false, desc: 'Mark an opponent for 5 s: they can\'t use skills and are slower with the ball.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 380 }],
    ult: { id: 'sEnvyUlt', glyph: '⇄', name: 'Swap', aim: 'enemy', range: 400, stuns: true, desc: 'Trade places with an opponent in range, take the ball if they had it, and leave them dazed for 1 s.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 380 } },
  { id: 'pride', name: 'Pride', title: 'The Champion', role: 'offense', col: '#9b5cff', num: 10, look: { hair: 8, hairCol: '#f2d16b', skin: '#f1c9a5', acc: 1, build: 1, eyes: '#9b5cff' },
    passive: ['Showboat', '+20% shot power and +10% speed in the opponent\'s third of the pitch.'],
    skills: [{ id: 'sPrideShot', glyph: '💥', name: 'Perfect Strike', cd: 8, aim: 'self', stuns: true, desc: 'Your next shot within 4 s flies 40% faster and knocks down anyone in its path.', bot: (p, c) => c.own && c.dg < SHOOT_RANGE * 1.2 },
      { id: 'sPrideGuard', glyph: '⛉', name: 'Untouchable', cd: 14, aim: 'self', stuns: false, desc: 'For 3 s nobody can tackle you, and you run 40% faster.', bot: (p, c) => c.own && c.enemyNear(90) }],
    ult: { id: 'sPrideUlt', glyph: '☄', name: 'Crowning Glory', stuns: true, desc: 'Meteors rain on the opponents\' goal area for 5 s, stunning everyone there except the keeper, and your next shot can\'t be caught.', bot: (p, c) => c.dg < W * 0.45 && (c.own || (c.carrier && c.carrier.team === p.team)) } },
  { id: 'lust', name: 'Lust', title: 'The Charmer', role: 'support', col: '#ff5fa2', num: 11, look: { hair: 5, hairCol: '#8a1d4a', skin: '#f1c9a5', acc: 0, build: 0, eyes: '#ff5fa2' },
    passive: ['Allure', 'Opponents close to you move slightly slower.'],
    skills: [{ id: 'sLustCharm', glyph: '♥', name: 'Charm', cd: 11, aim: 'enemy', range: 260, stuns: false, desc: 'An opponent is charmed for 2.5 s: their controls are muddled and they wander toward you.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 250 },
      { id: 'sLustHeal', glyph: '✚', name: 'Tender Care', cd: 9, aim: 'ally', range: 300, self: true, stuns: false, desc: 'Restore 30 HP to a team-mate (or yourself) and clear stuns, slows and marks.', bot: p => alliesOf(p).some(q => (q.hp < 55 || q.stun > 0.6 || q.slowT > 0) && dist(q, p) < 300) }],
    ult: { id: 'sLustUlt', glyph: '💔', name: 'Heartbreak', stuns: true, desc: 'Every opponent within reach drops the ball, is dazed for 1 s and stays charmed for 2.5 s.', bot: p => enemiesOf(p).filter(q => dist(q, p) < 160).length >= 2 } },
  { id: 'sloth', name: 'Sloth', title: 'The Immovable', role: 'defense', col: '#6f8fb0', num: 5, look: { hair: 4, hairCol: '#3b4a5a', skin: '#d9a477', acc: 0, build: 1, eyes: '#8fb0d0' },
    passive: ['Conserve', 'A little slower, but stamina comes back 60% faster.'],
    skills: [{ id: 'sSlothZone', glyph: '≋', name: 'Snooze Zone', cd: 12, aim: 'point', range: 300, stuns: false, desc: 'A drowsy patch for 4 s: opponents inside move 40% slower.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 300 },
      { id: 'sSlothYawn', glyph: '☾', name: 'Big Yawn', cd: 13, aim: 'self', stuns: true, desc: 'A yawn so big that opponents within reach nod off for 1.5 s.', bot: (p, c) => enemiesOf(p).filter(q => dist(q, p) < 100).length >= 1 && (c.enemyBall || c.enemyNear(70)) }],
    ult: { id: 'sSlothUlt', glyph: '⏸', name: 'Time Freeze', stuns: false, desc: 'Opponents across a wide area slow to a crawl for 3 s, and a loose ball there stops dead.', bot: (p, c) => c.enemyBall && dist(p, c.carrier) < 300 } },
  { id: 'goalkeeper', name: 'Goalkeeper', title: 'The Last Line', role: 'defense', col: '#3fbf5f', num: 1, hidden: true, look: { hair: 8, hairCol: '#2f9f4f', skin: '#f1c9a5', acc: 2, build: 1, eyes: '#2f9f4f' },
    passive: ['Instinct Save', '+30% save range.'],
    skills: [{ id: 'diveSave', name: 'Dive Save', cd: 4, aim: 'point', range: 170, desc: 'A long dive toward the aim that blocks the ball and knocks enemies away.' },
      { id: 'wideGuard', name: 'Wide Guard', cd: 12, aim: 'self', desc: 'For 3 s your save area grows by 80%.' }],
    ult: { id: 'infinity', name: 'Infinity Save', desc: 'A barrier over your goal for 5 s that blocks every shot and sends the ball back to midfield.' } }
];
const CLS = Object.fromEntries(CLASSES.map(c => [c.id, c]));
const CLASS_IDS = CLASSES.map(c => c.id);
const PICKABLE = () => CLASSES.filter(c => !c.hidden);   // the characters people can choose
// A whole team with both of a pair gets the bonus (ids are what the game logic checks).
const SYNERGIES = [
  { id: 'push', name: 'Vanity Fair', need: ['pride', 'greed'], desc: 'The team shoots 5% harder.' },
  { id: 'wall', name: 'Dead Weight', need: ['gluttony', 'sloth'], desc: 'The team takes 10% less damage.' },
  { id: 'chaos', name: 'Bad Blood', need: ['wrath', 'envy'], desc: 'The team\'s fouls take 20% longer to be spotted.' },
  { id: 'sustain', name: 'Sweet Nothings', need: ['lust', 'gluttony'], desc: 'The team recovers 1 HP per second.' }
];
// Bot line-ups: forward, midfielder, defender, defender (the goalkeeper slot is always the Goalkeeper)
const LINEUPS = { balanced: ['pride', 'greed', 'gluttony', 'lust'], aggressive: ['wrath', 'envy', 'pride', 'gluttony'], control: ['envy', 'lust', 'sloth', 'greed'] };
const LINEUP_NAMES = [['mixed', 'Mixed'], ['balanced', 'Balanced'], ['aggressive', 'Aggressive'], ['control', 'Control']];
let MY_CLASS = (() => { const v = store.get('fpfc-class'); return CLS[v] && !CLS[v].hidden ? v : DEFAULT_CLASS; })();
let LOCK_PLAYER = store.get('fpfc-lock') === true;
let LINEUP_PREF = (() => { const v = store.get('fpfc-lineup'); return LINEUP_NAMES.some(l => l[0] === v) ? v : 'mixed'; })();
let USE_MY_LOOK = store.get('fpfc-mylook') === true;

/* ---------- assigning classes and looks ---------- */
function assignClasses(mode) {
  const pickLine = () => LINEUP_PREF === 'mixed' ? pick(Object.keys(LINEUPS)) : LINEUP_PREF;
  const picked = mode === 'online' && typeof NET !== 'undefined' && NET && NET.meta && NET.meta.bots;   // the host's picks for bot spots in the lobby
  for (let t = 0; t < 2; t++) {
    const line = LINEUPS[pickLine()], slots = TEAM_SIZE >= 5 ? { 4: 0, 3: 1, 1: 2, 2: 3 } : { 2: 0, 1: 2 };
    for (const p of S.players.filter(q => q.team === t)) {
      const pk = picked && picked[t] && picked[t][p.i];
      p.cls = CLS[pk] ? pk : p.i === 0 ? 'goalkeeper' : line[slots[p.i]] || line[0];
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

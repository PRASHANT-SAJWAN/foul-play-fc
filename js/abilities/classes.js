/* Foul Play FC · js/abilities/classes.js
   The 12 classes, roles, synergies and line-ups, and assigning classes and looks to players.
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
    skills: [{ id: 'cloak', name: 'Cloak', cd: 14, aim: 'self', desc: 'Turn completely invisible to opponents and the referee for 4 s. Your next foul or tackle deals 40% more damage.' },
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

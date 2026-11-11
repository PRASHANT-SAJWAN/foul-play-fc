/* Foul Play FC · js/match/state.js
   The match state S, player creation, small player predicates, newMatch, kick-offs and pauses.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- state ---------------- */
const S = { phase: 'menu', mode: 'watch', players: [], refs: [], ball: null, items: [], bananas: [], parts: [], texts: [], feed: [], pend: [],
  score: [0, 0], clock: 180, pause: 0, pauseMsg: '', pauseSub: '', pauseCb: null, excite: 0.2, time: 0, humans: [], userPaused: false, shake: 0 };

function makePlayer(team, i, id) {
  return { id, team, i, gk: i === 0, name: NAMES[team][NAME_IDX[i]], num: NUMS[NAME_IDX[i]], x: 0, y: 0, vx: 0, vy: 0, dx: 0, dy: 0, face: team === 0 ? 0 : Math.PI,
    hp: 100, stun: 0, ko: 0, dive: 0, diveDown: 0, diveVx: 0, diveVy: 0, diveDir: 0, diveState: 0, sentOff: 0, yellows: 0, pop: 10, hype: 0, items: { sword: 0, bat: 0, flash: 0, banana: 0, glue: 0, smoke: 0, whistle: 0, decoy: 0, sling: 0, blaster: 0 }, fx: {}, throwSel: 'banana', freezeT: 0, slowT: 0, firedUpT: 0, tauntCd: 0, blind: 1, blindT: 0,
    foulCd: 0, blindCd: 0, pickCd: 0, lunge: 0, lungeCd: 0, hold: 0, expect: 0, aggr: rand(0.3, 0.9), human: null, run: 0, hitT: 0, target: null,
    charge: 20, karma: Math.round(rand(-5, 25)), sprintWant: false, sprinting: false, cleanT: 0,
    stamina: 100, staminaMax: 100, injury: 0, mood: 0, anim: '', animT: 0, goneWhy: '', iceT: 0, heatT: 0, z: 0, vz: 0, airAct: null, slide: 0, slideA: 0, slideCd: 0, slideRec: 0, slideHit: false, carry: null, carryT: 0,
    skin: pick(SKIN), hair: pick(HAIR), stats: { goals: 0, assists: 0, fouls: 0, caught: 0, tackles: 0, saves: 0 } };
}
const onPitch = p => p.sentOff <= 0;
const onBench = p => p.sentOff > 0 && !p.goneWhy;   // red-carded: sitting it out on the team bench
// Is this player controlled by someone at this screen? (Only they get the set-piece camera behind the ball.)
const isLocalHuman = p => !!(p && p.human && (S.net === 'client' ? p.human.local : !p.human.remote));
const able = p => onPitch(p) && p.ko <= 0 && p.stun <= 0;
const canBall = p => able(p) && p.carry == null && !(p.slideRec > 0);   // carrying the referee or getting up from a slide: no ball
const reachOf = p => p.items.sword > 0 ? 66 : p.items.bat > 0 ? 60 : 42;      // punch (or sword / bat swing) reach
const KICK_REACH = 72;                                  // jump kick lunges further
const targetReach = p => Math.max(reachOf(p), KICK_REACH);
const MOOD_ZONE = 40, MOOD_TILT = -40, MOOD_MELT = -70;
const moodName = m => m >= MOOD_ZONE ? 'IN THE ZONE' : m <= MOOD_MELT ? 'MELTDOWN' : m <= MOOD_TILT ? 'TILTED' : 'STEADY';
const inBox = (x, y, team) => Math.abs(y - H / 2) < BOX_HALF && (team === 0 ? x < BOX_D : x > W - BOX_D);

function newMatch(mode) {
  S.mode = mode; S.players = [];
  const want = mode === 'client' ? (FORMAT || FORMAT_PREF) : FORMAT_PREF;
  if (want !== FORMAT) applyFormat(want);
  for (let t = 0; t < 2; t++) for (let i = 0; i < TEAM_SIZE; i++) S.players.push(makePlayer(t, i, S.players.length));
  // One referee on the pitch, watching play from behind and to the far side.
  S.refs = [
    { name: 'Referee', main: true, x: W * 0.4, y: H * 0.3, face: Math.PI / 2, fov: 1.3 * REF_VIS.width, range: REF_RANGE * REF_VIS.dist, blind: 0, att: null, attT: 0, scanT: 3, run: 0, card: null, seed: 1 }
  ];
  S.ball = { x: W / 2, y: H / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, lastPasser: null, passTime: -9, spin: 0 };
  S.items = []; S.bananas = []; S.parts = []; S.texts = []; S.feed = []; S.pend = []; S.score = [0, 0];
  S.chants = []; S.cheerCd = {}; S.heat = 0; S.setPiece = null;
  S.fxq = []; S.fires = []; S.whacks = []; S.bubbles = []; S.smokes = []; S.puddles = []; S.decoys = []; S.megaBall = 0; S.rainT = 6; S.grudge = {}; S.bounty = null; S.bountyT = 30; S.bountyFlip = false;
  S.golden = false; S.shoot = null; S.lastGoal = null; S.recentUnseen = []; S.slowmo = null; S.specCd = {}; S.specGift = {}; S.rematch = {};
  S.crowd = { op: [newOpinion(), newOpinion()], support: 0.5, chantT: 10, bannerT: 15, banners: [], press: null };
  S.an = newAnomState(); S.zones = []; S.walls = []; S.projs = []; S.teamCd = [{}, {}];
  REPLAY.buf = []; REPLAY.active = null;
  if (mode !== 'client') applyMutators();
  S.metrics = newMetrics(mode); S.lastReport = null; S.reportSaved = false;
  S.clock = S.phase === 'menu' || mode === 'playground' ? 99999 : MATCH_LEN; S.excite = 0.2; S.userPaused = false;
  S.humans = [];
  S.admin = mode === 'playground' ? { god: false, inf: false, refs: 'normal', bots: 'normal' } : null;
  S.refHuman = null;
  const P = (t, i) => S.players[t * TEAM_SIZE + i], FWD = TEAM_SIZE - 1, MID = TEAM_SIZE - 2;
  const me = S.phase === 'menu' ? 0 : SETUP.side, you = 1 - me;   // the side picked on the setup screen
  if (mode === '1p') S.humans = [{ idx: 0, team: me, map: MAPSOLO, pid: P(me, FWD).id, prev: {}, charge: 0, charging: false, touch: true }];
  if (mode === '2pv') S.humans = [{ idx: 0, team: me, map: MAP1, pid: P(me, FWD).id, prev: {}, charge: 0, charging: false, touch: true },
                                  { idx: 1, team: you, map: MAP2, pid: P(you, FWD).id, prev: {}, charge: 0, charging: false }];
  if (mode === '2pc') S.humans = [{ idx: 0, team: me, map: MAP1, pid: P(me, FWD).id, prev: {}, charge: 0, charging: false, touch: true },
                                  { idx: 1, team: me, map: MAP2, pid: P(me, MID).id, prev: {}, charge: 0, charging: false }];
  if (mode === 'playground') S.humans = [{ idx: 0, team: me, map: MAPSOLO, pid: P(me, FWD).id, prev: {}, charge: 0, charging: false, touch: true }];
  if (mode === 'ref') { S.refHuman = { map: MAPSOLO, prev: {}, charge: 0, charging: false, touch: true, track: true, correct: 0, missed: 0, wrong: 0 }; S.refs[0].human = true; }
  assignClasses();
  for (const h of S.humans) if ((h.idx || 0) === 0 && mode !== 'online') {   // your class, your player, your controls
    if (MY_CLASS === 'goalkeeper') h.pid = P(h.team, 0).id;
    S.players[h.pid].cls = MY_CLASS; h.lock = LOCK_PLAYER;
  }
  for (const h of S.humans) if (h.idx === 1 && mode !== 'online') {   // player 2's class from the setup screen
    const c2 = CLS[SETUP.p2] ? SETUP.p2 : 'striker', taken = id => S.humans.some(o => o !== h && o.pid === id);
    if (c2 === 'goalkeeper' && !taken(P(h.team, 0).id)) h.pid = P(h.team, 0).id;
    else if (taken(h.pid)) h.pid = P(h.team, MID).id;
    S.players[h.pid].cls = c2; h.lock = LOCK_PLAYER;
  }
  for (const p of S.players) applyClassLook(p);
  refreshSynergies();
  for (const h of S.humans) S.players[h.pid].human = h;
  if (S.humans[0] && mode !== 'online' && mode !== 'client' && USE_MY_LOOK) applySkin(S.players[S.humans[0].pid], MY_SKIN);
  if (mode === 'online') syncHumans();
  kickoff(Math.random() < 0.5 ? 0 : 1, 'KICK OFF');
  followCamera(0, true);

}

function kickoff(team, msg) {
  const b = S.ball;
  for (const p of S.players) {
    if (!onPitch(p)) continue;
    const dir = p.team === 0 ? 1 : -1, own = p.team === 0 ? 0 : W;
    p.stun = 0; if (p.ko > 0) { p.ko = 0; p.hp = Math.max(p.hp, 50); }
    p.vx = p.vy = 0; p.hold = 0; p.face = dir > 0 ? 0 : Math.PI;
    if (p.gk) { p.x = own + dir * 20; p.y = H / 2; }
    else { p.x = own + dir * ROLES[p.i][0] * 0.62 * W; p.y = ROLES[p.i][1] * H; }
  }
  b.x = W / 2; b.y = H / 2; b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null;
  const cands = S.players.filter(p => p.team === team && onPitch(p) && !p.gk);
  const kicker = cands.find(p => p.human) || cands.sort((a, c) => c.i - a.i)[0];
  if (kicker) { kicker.x = W / 2 - (team === 0 ? 12 : -12); kicker.y = H / 2; b.owner = kicker; b.lastTouch = kicker; }
  S.pend = []; S.setPiece = null;
  pauseFor(1.3, msg, TEAM[team].name + ' to start', null);
}
function pauseFor(t, msg, sub, cb) { S.pause = t; S.pauseMsg = msg; S.pauseSub = sub || ''; S.pauseCb = cb; }

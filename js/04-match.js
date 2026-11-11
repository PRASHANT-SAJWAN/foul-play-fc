/* Foul Play FC · match.js
   Match state (S), players, kick-offs, passing, shooting, tackles, fouls, cards, items picked up, goals and the results screen.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
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
  if (mode === '1p') S.humans = [{ idx: 0, team: 0, map: MAPSOLO, pid: P(0, FWD).id, prev: {}, charge: 0, charging: false, touch: true }];
  if (mode === '2pv') S.humans = [{ idx: 0, team: 0, map: MAP1, pid: P(0, FWD).id, prev: {}, charge: 0, charging: false, touch: true },
                                  { idx: 1, team: 1, map: MAP2, pid: P(1, FWD).id, prev: {}, charge: 0, charging: false }];
  if (mode === '2pc') S.humans = [{ idx: 0, team: 0, map: MAP1, pid: P(0, FWD).id, prev: {}, charge: 0, charging: false, touch: true },
                                  { idx: 1, team: 0, map: MAP2, pid: P(0, MID).id, prev: {}, charge: 0, charging: false }];
  if (mode === 'playground') S.humans = [{ idx: 0, team: 0, map: MAPSOLO, pid: P(0, FWD).id, prev: {}, charge: 0, charging: false, touch: true }];
  if (mode === 'ref') { S.refHuman = { map: MAPSOLO, prev: {}, charge: 0, charging: false, touch: true, track: true, correct: 0, missed: 0, wrong: 0 }; S.refs[0].human = true; }
  assignClasses();
  for (const h of S.humans) if ((h.idx || 0) === 0 && mode !== 'online') {   // your class, your player, your controls
    if (MY_CLASS === 'goalkeeper') h.pid = P(h.team, 0).id;
    S.players[h.pid].cls = MY_CLASS; h.lock = LOCK_PLAYER;
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

/* ---------------- feedback helpers ---------------- */
function feed(text, col = '#eef2e6') { S.feed.unshift({ text, col, t: 0 }); if (S.feed.length > 6) S.feed.pop(); }
function floatText(p, text, col) { S.texts.push({ x: p.x, y: p.y, z: 40, text, col, life: 1.3 }); }
function burst(x, y, col, n, z = 14) {
  for (let i = 0; i < n; i++) S.parts.push({ x, y, z, vx: rand(-120, 120), vy: rand(-80, 80), vz: rand(60, 220), life: rand(0.4, 0.9), col, size: rand(1.5, 3.2) });
}
function addPop(p, n) {
  if (n > 0 && p.fx && p.fx.megaphone > 0) n *= 2;
  p.pop = Math.max(0, p.pop + n);
  if (n > 0) { p.hype += n; while (p.hype >= 30) { p.hype -= 30; throwItem(p); } }
}
const loud = (...ps) => ps.some(p => p && p.human);
const addMood = (p, n) => { if (p) p.mood = clamp(p.mood + n, -100, 100); };
const addCharge = (p, n) => { if (!p) return; if (n > 0 && p.mood >= MOOD_ZONE) n *= 1.15; const c0 = p.charge; p.charge = clamp(p.charge + n, 0, 100); const d = p.charge - c0; if (d > 0) M(p, 'chargeEarned', d); else if (d < 0) M(p, 'chargeSpent', -d); };
const addKarma = (p, n) => { if (p) { p.karma = clamp(p.karma + n, -100, 100); if (n < 0) p.cleanT = 0; } };
// Referee opinion: the performance (charge) meter is the main positive source; caught fouls and bad karma pull it down.
const refOpinion = p => clamp(Math.round((p.charge - 40) + p.karma * 0.4 - 18 * p.stats.caught), -100, 100);
let CHANT_ID = 0;
const CHEER_COL = { roar: '#ffb36b', applause: '#7dff9b', boo: '#ff6b80' };
function cheer(kind, x, text) {
  if ((S.cheerCd[kind] || 0) > S.time) return;
  S.cheerCd[kind] = S.time + 0.8;
  S.chants.push({ id: ++CHANT_ID, kind, text, x: clamp(x + rand(-60, 60), 40, W - 40), life: 2.2 });
  if (S.chants.length > 5) S.chants.shift();
  S.excite += kind === 'boo' ? 0.15 : 0.3;
  crowdSound(kind);
}

/* ---------------- actions ---------------- */
function loseBall(p, ang) {
  const b = S.ball; if (b.owner !== p) return;
  b.owner = null; b.curve = null; b.vx = Math.cos(ang) * 120 + rand(-50, 50); b.vy = Math.sin(ang) * 120 + rand(-50, 50); b.vz = 90; p.pickCd = 0.8;
}
function switchHuman(h, q) { if (!q || q.human) return; const cur = S.players[h.pid]; if (cur) cur.human = null; h.pid = q.id; q.human = h; }
function switchToBest(h) {
  if (h.lock) return;
  const cur = S.players[h.pid];
  const c = S.players.filter(q => q.team === h.team && !q.gk && !q.human && onPitch(q) && q.ko <= 0 && q !== cur).sort((a, b) => dist(a, S.ball) - dist(b, S.ball));
  if (c[0]) switchHuman(h, c[0]);
}
// power (0.25 to 1, from holding the key) sets the pace: a soft ball arrives later, a hard one zips in.
// rest: a ball into space that should roll to a stop around the target instead of running through it.
function passTo(p, q, mode = 'auto', power = null, rest = false) {
  const b = S.ball; if (b.owner !== p) return;
  const qvx = q.vx || 0, qvy = q.vy || 0, pace = power == null ? 430 : 300 + 330 * power;
  let tx = q.x, ty = q.y, T = 0.5;
  for (let it = 0; it < 3; it++) {   // lead the receiver: aim where they will be when the ball arrives
    T = clamp(Math.hypot(tx - p.x, ty - p.y) / pace, 0.25, 1.3);
    tx = clamp(q.x + qvx * T * 0.85, 10, W - 10); ty = clamp(q.y + qvy * T * 0.85, 10, H - 10);
  }
  if (p.mood <= MOOD_TILT && p.cls !== 'playmaker') { tx += rand(-25, 25); ty += rand(-25, 25); }   // tilted players' passes wander
  const d = Math.hypot(tx - p.x, ty - p.y), a = Math.atan2(ty - p.y, tx - p.x), k = 1.25;
  const air = mode === 'air' || (mode === 'auto' && laneOpen(p, { x: tx, y: ty }) < 20 && d > 90);
  let sp, vz = 0;
  if (air) { T = clamp(d / (power == null ? 380 : 300 + 200 * power), 0.45, 1.9); vz = GRAV() / 2 * T; sp = d / T * 1.04; }   // airtime under gravity g is vz / (g/2)
  else if (rest) sp = Math.min(820, d * 1.1 + 40);                               // rolls out and stops near the spot
  else sp = Math.min(820, d * k / (1 - Math.exp(-k * T)));                      // ground friction e^(-k t): arrive in T seconds
  p.face = a; b.owner = null; b.curve = null; b.x = p.x + Math.cos(a) * 12; b.y = p.y + Math.sin(a) * 12;
  b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.vz = vz; b.lastTouch = p; b.lastPasser = p; b.passTime = S.time;
  p.pickCd = 0.35; thump(air ? 120 : 160, 0.12, 0.06);
  M(p, 'passes'); if (air) { M(p, 'lobs'); if (mode === 'air') M(p, 'longPasses'); }
  if (q.id === undefined) return;   // a pass into space
  q.expect = T + 0.8;
  if (hasBf(p, 'perfect') || hasBf(q, 'assistMark')) b.pierce = S.time + 1.6;
  if (p.human && !q.human && !p.human.lock) switchHuman(p.human, q);
}
function pickLongTarget(p, ang, want = 600) {
  // Long ball: only team-mates you're facing (within about 30°), preferring ones near the distance your power sets, with space around them.
  let best = null, bs = 1e9;
  for (const q of S.players) {
    if (q === p || q.team !== p.team || !onPitch(q) || q.ko > 0 || q.gk) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d < 140 || d > 950) continue;
    const ad = Math.abs(angDiff(ang, Math.atan2(dy, dx))); if (ad > PASS_CONE) continue;
    const no = nearestOpp(q), space = no ? Math.min(dist(no, q), 160) : 160;
    const sc = ad * 320 + Math.abs(d - want) * 0.3 - space * 0.9 + (q.stun > 0 ? 300 : 0);
    if (sc < bs) { bs = sc; best = q; }
  }
  return best;
}
function spotAhead(p, ang, d) {   // a point d ahead along the aim, cut short at the edge of the pitch so the direction stays exact
  const c = Math.cos(ang), sn = Math.sin(ang);
  if (c > 1e-6) d = Math.min(d, (W - 20 - p.x) / c); else if (c < -1e-6) d = Math.min(d, (20 - p.x) / c);
  if (sn > 1e-6) d = Math.min(d, (H - 20 - p.y) / sn); else if (sn < -1e-6) d = Math.min(d, (20 - p.y) / sn);
  d = Math.max(30, d); return { x: p.x + c * d, y: p.y + sn * d };
}
// Pass distance for a ball into space, by kind and power.
const PASS_LEN = { pass: pw => 120 + 380 * pw, lpass: pw => 260 + 640 * pw, through: pw => 170 + 520 * pw };
function humanLongPass(p, power = 0.5) {
  const ang = passDir(p), q = pickLongTarget(p, ang, PASS_LEN.lpass(power));
  if (q) passTo(p, q, 'air', power);
  else passTo(p, spotAhead(p, ang, PASS_LEN.lpass(power)), 'air', power);   // ball into space
}
// Through ball: no assist. Played along the ground exactly where you aim, rolling out to a distance set by the power.
function throughBall(p, power = 0.5) {
  const ang = passDir(p); p.face = ang;
  passTo(p, spotAhead(p, ang, PASS_LEN.through(power)), 'ground', power, true);
  M(p, 'throughBalls'); floatText(p, 'THROUGH BALL', '#7df0ff');
}
// What a pass would do right now: the assisted team-mate if there is one, else the spot it rolls or drops to.
function passPreview(p, kind, power) {
  const ang = passDir(p);
  if (kind === 'through') return { ...spotAhead(p, ang, PASS_LEN.through(power)), q: null };
  const q = kind === 'lpass' ? pickLongTarget(p, ang, PASS_LEN.lpass(power)) : pickPassTarget(p, ang, PASS_LEN.pass(power));
  return q ? { x: q.x, y: q.y, q } : { ...spotAhead(p, ang, PASS_LEN[kind](power)), q: null };
}
function laneOpen(p, q) {
  let m = 999;
  for (const o of S.players) {
    if (o.team === p.team || !onPitch(o)) continue;
    const vx = q.x - p.x, vy = q.y - p.y, l2 = vx * vx + vy * vy || 1;
    const t = clamp(((o.x - p.x) * vx + (o.y - p.y) * vy) / l2, 0, 1);
    m = Math.min(m, Math.hypot(o.x - (p.x + vx * t), o.y - (p.y + vy * t)));
  }
  return m;
}
function passDir(p) { if (p.human && p.aimA != null) return p.aimA; return (p.dx || p.dy) ? Math.atan2(p.dy, p.dx) : p.face; }   // people aim with their smoothed movement direction
const PASS_CONE = 0.52;   // pass assist only picks team-mates within about 30° of where you're facing
function pickPassTarget(p, ang, want = 260) {
  // Best teammate inside the assist cone, favouring small angle error, the distance your power sets, and open lanes.
  let best = null, bs = 1e9;
  for (const q of S.players) {
    if (q === p || q.team !== p.team || !onPitch(q) || q.ko > 0) continue;
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d < 30) continue;
    const ad = Math.abs(angDiff(ang, Math.atan2(dy, dx))); if (ad > (p.human ? PASS_CONE : 1.05)) continue;
    const sc = ad * 320 + (p.human ? Math.abs(d - want) * 0.25 : d * 0.35) - Math.min(laneOpen(p, q), 60) * 1.2 + (q.gk ? 160 : 0) + (q.stun > 0 ? 200 : 0);
    if (sc < bs) { bs = sc; best = q; }
  }
  return best;
}
function humanPass(p, power = 0.5) {   // assisted only towards a team-mate you're facing; otherwise into space where you aim
  const ang = passDir(p), best = pickPassTarget(p, ang, PASS_LEN.pass(power));
  if (best) passTo(p, best, 'ground', power);
  else passTo(p, spotAhead(p, ang, PASS_LEN.pass(power)), 'ground', power, true);
}
function shoot(p, power, aimY) {
  const b = S.ball; if (b.owner !== p) return;
  const gx = p.team === 0 ? W : 0;
  let ang = p.face;
  const toGoal = Math.atan2(H / 2 - p.y, gx - p.x);
  if (aimY !== undefined) ang = Math.atan2(aimY - p.y, gx - p.x);
  else if (Math.abs(angDiff(ang, toGoal)) < 1.0 && Math.cos(ang) * (gx - p.x) > 0) {
    const t = (gx - p.x) / Math.cos(ang);
    const iy = clamp(p.y + Math.sin(ang) * t, H / 2 - GOAL_HALF + 6, H / 2 + GOAL_HALF - 6);
    ang = Math.atan2(iy - p.y, gx - p.x);
  }
  // stamina sets how much of the wind-up actually goes into the shot; every shot costs some
  power = clamp(power * (0.5 + 0.5 * p.stamina / 100), 0.15, 1);
  p.stamina = Math.max(0, p.stamina - (8 + 18 * power)); a0Anim(p, 'shoot', 0.35);
  const boosted = p.charge >= 25;   // charged shot: spends 25 charge for far better accuracy and a little extra pace
  if (boosted) { p.charge -= 25; M(p, 'chargeSpent', 25); M(p, 'powerShots'); floatText(p, 'POWER SHOT', '#4fd6ff'); if (power > 0.6) cheer('roar', p.x, 'WHAT A STRIKE!'); }
  const moodMul = p.mood >= MOOD_ZONE ? 0.85 : p.mood <= MOOD_TILT ? 1.25 : 1;
  ang += rand(-1, 1) * (0.03 + 0.07 * power) * (1.4 - 0.4 * p.hp / 100) * (boosted ? 0.3 : 1) * moodMul * crowdPressure(p.team);
  const striker = p.i === TEAM_SIZE - 1;
  const rocket = p.fx && p.fx.rocket > 0; if (rocket) p.fx.rocket--;
  const sp = (430 + 380 * power) * (boosted ? 1.12 : 1) * (striker ? 1.2 : 1) * (rocket ? 1.35 : 1) * shotMul(p);
  S.ball.trail = boosted || rocket ? (rocket ? '#ff7a2f' : (p.trailCol || '#4fd6ff')) : null;
  if (boosted || rocket) fxEvent('power', p);
  b.owner = null; b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.vz = 60 + 180 * power * power + rand(-30, 50) * (boosted ? 0.4 : 1);
  const lat = -Math.sin(ang) * p.vx + Math.cos(ang) * p.vy, cm = clamp(-lat * 0.9, -90, 90);
  b.curve = Math.abs(cm) > 25 ? { ax: -Math.sin(ang) * cm, ay: Math.cos(ang) * cm, t: 1.2 } : null;
  b.knock = 0; b.unstoppable = 0;
  if (hasBf(p, 'powerShot')) { b.vx *= 1.4; b.vy *= 1.4; b.knock = S.time + 1.5; p.bf.powerShot = 0; S.ball.trail = '#ff4d4d'; floatText(p, 'POWER SHOT!', '#ff4d4d'); }
  if (hasBf(p, 'curveDrive')) {   // aim wide and bend it back in: the solver finds the swerve that still ends on target
    const gx = p.team === 0 ? W : 0, ty = clamp(p.y + Math.tan(ang) * (gx - p.x), H / 2 - GOAL_HALF + 8, H / 2 + GOAL_HALF - 8), dx = gx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
    const T = Math.max(0.25, d / Math.hypot(b.vx, b.vy)), A = (ty > H / 2 ? 1 : -1) * (p.team === 0 ? 1 : -1) * 520, nx = -dy / d, ny = dx / d, ax = nx * A, ay = ny * A, k = AIR_K, e = 1 - Math.exp(-k * T);
    b.vx = (dx - ax * T / k) * k / e + ax / k; b.vy = (dy - ay * T / k) * k / e + ay / k; b.vz = Math.max(b.vz, 90); b.curve = { ax, ay, t: T + 0.3 }; p.bf.curveDrive = 0; floatText(p, 'CURVE DRIVE!', '#ff9a6b');
  }
  if (hasBf(p, 'meteorShot')) { b.vx *= 1.3; b.vy *= 1.3; b.unstoppable = S.time + 2; p.bf.meteorShot = 0; S.ball.trail = '#ff7a2f'; }
  b.lastTouch = p; p.pickCd = 0.4; p.face = ang; thump(90, 0.3, 0.1); S.excite += 0.1;
  M(p, 'shots'); b.shotBy = p; b.shotT = S.time; b.shotPowered = boosted; EV('shot', p, { power: rnd(power, 2), powered: boosted });
}
function inReach(p) {
  const r = targetReach(p);
  return S.players.filter(q => q !== p && onPitch(q) && q.ko <= 0 && dist(p, q) < r).sort((a, b) => dist(a, p) - dist(b, p));
}

/* ---------- jumping, tackles and carrying the referee ---------- */
const own0 = p => S.ball.owner === p;
function jump(p, vz = 270) {
  if (p.z > 0 || p.slide > 0 || !able(p) || p.carry != null) return false;
  if (p.stamina < 4) { if (p.human) floatText(p, 'Too tired to jump', '#c8c8c8'); return false; }
  p.vz = vz; p.z = 0.01; p.stamina -= 4; M(p, 'jumps'); return true;
}
function shortTackle(p) { if (p.lungeCd > 0 || p.stamina < 6 || p.z > 0 || p.carry != null) return; p.lunge = 0.22; p.lungeCd = 0.8; p.stamina -= 6; }
function slideTackle(p) {
  if (p.slideCd > 0 || p.slide > 0 || p.z > 0 || p.carry != null) return;
  if (p.stamina < 12) { if (p.human) floatText(p, 'Too tired to slide', '#c8c8c8'); return; }
  p.slide = 0.5; p.slideA = passDir(p); p.face = p.slideA; p.slideCd = 1.6; p.stamina -= 12; p.slideHit = false; M(p, 'slides');
}
function slideContacts(p) {   // called every frame while sliding
  if (!(p.slide > 0) || p.slideHit) return;
  const b = S.ball;
  if (!b.owner && dist(p, b) < 20 && (b.z || 0) < 12) {   // knock a loose ball on
    b.vx = Math.cos(p.slideA) * 300; b.vy = Math.sin(p.slideA) * 300; b.vz = 40; b.lastTouch = p; p.slideHit = true; thump(150, 0.1, 0.06); return;
  }
  for (const q of S.players) {
    if (q === p || !onPitch(q) || q.ko > 0 || q.z > 20 || dist(p, q) > 18) continue;
    if (q.team === p.team && b.owner !== q) continue;   // slide past team-mates
    p.slideHit = true;
    const behind = Math.abs(angDiff(q.face, p.slideA)) < 0.9;   // sliding the same way they face: from behind
    if (b.owner === q && q.team !== p.team && !behind && Math.random() < 0.75) {
      b.owner = null; b.vx = Math.cos(p.slideA) * 260; b.vy = Math.sin(p.slideA) * 260; b.vz = 30; b.lastTouch = p; q.pickCd = 0.6;
      p.stats.tackles++; addPop(p, 4); addMood(p, 6); addKarma(p, 2); crowdEvent(p.team, { perf: 4, drama: 2 }); bountyCollect(p, q); EV('tackle', p, { from: q.name, slide: true });
      floatText(p, 'CLEAN SLIDE', '#7dff9b'); whack(q, 'tackle'); cheer('roar', p.x, 'WHAT A TACKLE!'); thump(140, 0.15, 0.08);
    } else slideFoul(p, q, behind);
    return;
  }
}
function slideFoul(a, t, behind) {
  t.stun = Math.max(t.stun, behind ? 1.6 : 1.2); t.hp = Math.max(1, t.hp - (behind ? 12 : 8)); t.hitT = 2; a0Anim(t, 'fall', 0.6); loseBall(t, a.slideA); addMood(t, -6);
  if (Math.random() < (behind ? 0.4 : 0.2)) injure(t, behind ? 12 : 8, a);
  a.stats.fouls++; a.lastFoulT = S.time; addKarma(a, behind ? -8 : -5); M(a, 'fouls'); M(t, 'fouledReceived'); noteGrudge(a, t);
  floatText(t, behind ? 'FROM BEHIND!' : 'TRIPPED', '#ff9a9a'); thump(100, 0.2, 0.1); whack(t, 'slide'); S.shake = 3; S.excite += 0.2;
  crowdEvent(a.team, a.team === t.team ? { noob: 5, fun: 3 } : { vill: behind ? 5 : 3, drama: 2 }); if (a.team !== t.team) crowdEvent(t.team, { symp: 3 });
  if (loud(a, t)) feed(`${a.name} ${behind ? 'slid in from behind on' : 'tripped'} ${t.name}`, '#f2c9c9');
  EV('foul', a, { target: t.name, kind: 'slide', fromBehind: behind, teammate: a.team === t.team, x: Math.round(a.x), y: Math.round(a.y) });
  S.pend.push({ a, t, x: a.x, y: a.y, kind: 'slide', heavy: false, ttl: (S.refHuman ? 2.2 : 0.75) * (behind ? 1.4 : 1), inBox: t.team !== a.team && inBox(t.x, t.y, a.team), mate: a.team === t.team });
  alertRefs(a.x, a.y, 330, behind ? 0.7 : 0.5);
}
// A mid-air strike: once the ball is within reach of a jumping player who pressed shoot or pass.
function airStrike(p) {
  const A = p.airAct, b = S.ball; if (!A || b.owner || p.z <= 0) return;
  const dz = (b.z || 0) - p.z; if (dist(p, b) > 24 || dz < -6 || dz > 56) return;
  const header = dz > 26; p.airAct = null;
  b.owner = p; b.x = p.x; b.y = p.y;   // borrow the normal shot and pass aiming, then fix up the height
  if (A.k === 'shoot') {
    const st = p.stamina; shoot(p, header ? 0.7 : 0.9); p.stamina = Math.max(0, st - (header ? 4 : 8));
    b.z = p.z + (header ? 40 : 10);
    if (header) { b.vx *= 0.82; b.vy *= 0.82; b.vz = rand(-40, 40); }
    else b.vz = rand(40, 140);
    floatText(p, header ? 'HEADER!' : 'VOLLEY!', '#ffd23f'); cheer('roar', p.x, header ? 'WHAT A HEADER!' : 'ON THE VOLLEY!'); S.excite += 0.3;
    M(p, header ? 'headers' : 'volleys'); fxEvent('kick', p);
  } else {
    if (A.k === 'lpass') humanLongPass(p, 0.5); else humanPass(p, 0.5);
    if (b.owner === p) { b.owner = null; b.vx = Math.cos(p.face) * 320; b.vy = Math.sin(p.face) * 320; b.vz = 60; b.lastTouch = p; }   // nobody to pass to: knock it on
    b.z = p.z + (header ? 40 : 10); if (header) { b.vx *= 0.8; b.vy *= 0.8; }
    floatText(p, header ? 'HEADED PASS' : 'FIRST TIME', '#9fe8ff'); M(p, 'headers');
  }
  a0Anim(p, 'shoot', 0.3);
}
// Referee lifting: carry them on your shoulders (they keep watching where you face), put them down, or throw them.
function liftRef(p) {
  if (p.carry != null) {   // put them down gently
    const r = S.refs[p.carry]; p.carry = null; if (r) { r.carriedBy = null; r.z = 0; r.x = clamp(p.x + Math.cos(p.face) * 16, 10, W - 10); r.y = clamp(p.y + Math.sin(p.face) * 16, 10, H - 10); r.downT = 0.4; }
    feed(`${p.name} put the referee down`, '#e9d8a6'); return;
  }
  if (!able(p) || p.z > 0) return;
  const r = S.refs.find(r => !r.human && !(r.gone > 0) && r.carriedBy == null && !r.fly && dist(p, r) < 36);
  if (!r) { if (p.human) floatText(p, 'Get next to the referee to lift them', '#c8c8c8'); return; }
  if (S.ball.owner === p) loseBall(p, p.face);
  p.carry = S.refs.indexOf(r); p.carryT = 0; r.carriedBy = p.id; r.blind = 0;
  addKarma(p, -3); M(p, 'refLifts'); EV('refLift', p); crowdEvent(p.team, { fun: 6, drama: 4, vill: 2 });
  floatText(p, 'GOT THE REF!', '#ffd23f'); cheer('roar', p.x, 'HE’S GOT THE REF!'); S.excite += 0.3;
  if (loud(p)) feed(`${p.name} hoisted the referee onto their shoulders. The ref still sees wherever ${p.name} faces`, '#ffd23f');
}
function throwRef(p) {
  const r = S.refs[p.carry]; p.carry = null; if (!r) return;
  const a = passDir(p), d = 260 + 220 * Math.min(1, p.stamina / 100);
  const tx = clamp(p.x + Math.cos(a) * d, 20, W - 20), ty = clamp(p.y + Math.sin(a) * d, 20, H - 20);
  r.carriedBy = null; r.fly = { sx: r.x, sy: r.y, tx, ty, t: 0, dur: 0.6 + Math.hypot(tx - r.x, ty - r.y) / 900 }; r.face = a;
  p.stamina = Math.max(0, p.stamina - 10); addKarma(p, -4); M(p, 'refThrows'); EV('refThrow', p);
  a0Anim(p, 'swing', 0.4); sfx('whoosh'); crowdEvent(p.team, { fun: 8, drama: 6, vill: 3 }); cheer('roar', p.x, 'REF OVERBOARD!'); S.excite += 0.4;
  if (loud(p)) feed(`${p.name} threw the referee across the pitch!`, '#ffd23f');
}
function updateRefCarry(r, dt) {   // true while the referee is being carried or is in flight
  if (r.carriedBy != null) {
    const c = S.players[r.carriedBy]; r.carryT = (r.carryT || 0) + dt;
    if (!c || !onPitch(c) || c.stun > 0 || c.ko > 0 || c.carry !== S.refs.indexOf(r) || r.carryT > 8) {
      if (c && c.carry === S.refs.indexOf(r)) c.carry = null;
      r.carriedBy = null; r.carryT = 0; r.z = 0; r.downT = 0.6;
      if (c) feed(c.stun > 0 || c.ko > 0 ? `${c.name} dropped the referee` : 'The referee wriggled free', '#e9d8a6');
      return false;
    }
    r.x = c.x; r.y = c.y; r.z = 26; r.face = c.face; r.run = c.run; return true;
  }
  r.carryT = 0;
  if (r.fly) {
    const f = r.fly; f.t += dt; const u = Math.min(1, f.t / f.dur);
    r.x = f.sx + (f.tx - f.sx) * u; r.y = f.sy + (f.ty - f.sy) * u; r.z = 26 * (1 - u) + 170 * u * (1 - u);
    if (u >= 1) {
      r.fly = null; r.z = 0; r.downT = 1.2; burst(r.x, r.y, '#e8e0c8', 14, 10); thump(80, 0.25, 0.14); S.shake = Math.max(S.shake, 4);
      for (const q of S.players) if (onPitch(q) && q.z <= 0 && dist(q, r) < 18) { q.stun = Math.max(q.stun, 1); loseBall(q, q.face); floatText(q, 'SQUASHED!', '#ffd23f'); }
    }
    return true;
  }
  if (r.downT > 0) { r.downT -= dt; return true; }   // getting back up: still watching, not moving
  return false;
}

// kind: 'punch' (fast, short) or 'kick' (jump kick: longer reach, costs stamina, hurts more, draws the referee's eye)
function doFoul(a, t, kind = 'punch') {
  if (a.foulCd > 0 || !t || t.ko > 0 || !onPitch(t)) return false;
  const d = dist(a, t);
  if (t.stun > 0 && d <= targetReach(a) + 6) { helpUp(a, t); return false; }
  if (kind === 'kick' && a.stamina < 15) { if (a.human) floatText(a, 'Too tired to kick', '#c8c8c8'); return false; }
  if (d > (kind === 'kick' ? KICK_REACH : reachOf(a)) + 6) { if (a.human) floatText(a, kind === 'kick' ? 'Too far' : 'Too far to punch: jump and punch for a jump kick', '#c8c8c8'); return false; }
  if (S.admin && S.admin.god && t.human) { a.foulCd = 1.0; floatText(t, 'IMMUNE', '#9fe8ff'); return false; }
  if (t.fx && t.fx.shield > 0) { t.fx.shield = 0; a.stun = Math.max(a.stun, 1); a.foulCd = 1; floatText(t, 'SHIELD!', '#9fe8ff'); burst(t.x, t.y, '#9fe8ff', 14, 20); feed(`${t.name}'s shield bounced ${a.name}'s foul`, '#9fe8ff'); return false; }
  const kick = kind === 'kick', sword = !kick && a.items.sword > 0, heavy = !kick && (sword || a.items.bat > 0); if (sword) a.items.sword--; else if (heavy) a.items.bat--;
  if (kick) { a.stamina = Math.max(0, a.stamina - 15); M(a, 'jumpKicks'); a.vx = (t.x - a.x) * 4; a.vy = (t.y - a.y) * 4; if (a.z <= 0) { a.vz = 200; a.z = 0.01; } }
  a.foulCd = kick ? 1.6 : 1.0; a.stats.fouls++; a.lastFoulT = S.time; a.anim = kick ? 'kick' : heavy ? 'swing' : 'punch'; a.animT = 0.45;
  addKarma(a, heavy ? -14 : kick ? -12 : -8); S.heat = Math.min(1.5, S.heat + 0.08);
  M(a, 'fouls'); if (heavy) M(a, 'foulsBat'); if (a.team === t.team) M(a, 'foulsOnTeammates'); M(t, 'fouledReceived');
  noteGrudge(a, t);
  const ang = Math.atan2(t.y - a.y, t.x - a.x), kb = heavy ? 260 : kick ? 230 : 170;
  t.vx = Math.cos(ang) * kb; t.vy = Math.sin(ang) * kb;
  const dmg = Math.round((sword ? 30 : heavy ? 34 : kick ? 24 : 16) * dmgOut(a) * dmgIn(t)), imm = knockImmune(t);
  t.hp = Math.max(0, t.hp - dmg); t.hitT = 2; if (!imm) { t.stun = Math.max(t.stun, heavy ? 2.2 : kick ? 1.8 : 1.3); t.anim = 'fall'; t.animT = 0.6; } else floatText(t, 'UNSTOPPABLE', '#ffd23f');
  addMood(t, -10);
  if (!imm) loseBall(t, ang);
  onFoulLanded(a, t);
  burst(t.x, t.y, heavy ? '#ffcf5a' : kick ? '#ffb36b' : '#ffffff', heavy ? 18 : kick ? 16 : 10, 18); whack(t, t.hp <= 0 ? 'ko' : sword ? 'sword' : heavy ? 'bat' : kick ? 'kick' : 'punch');
  floatText(t, '-' + dmg, '#ff6b6b'); thump(heavy ? 70 : kick ? 85 : 110, 0.3, 0.14);
  S.shake = heavy ? 7 : kick ? 5 : 3; S.excite += heavy ? 0.35 : kick ? 0.3 : 0.2;
  let pkind = kick ? 'kick' : 'foul';
  if (t.hp <= 0) { t.ko = 6; t.stun = 6; pkind = 'ko'; addKarma(a, -12); M(a, 'knockouts'); M(t, 'knockedOut'); cheer('roar', t.x, 'WHAT A HIT!'); feed(`${a.name} knocked out ${t.name}!`, '#ff6b6b'); floatText(t, 'K.O.', '#ff6b6b'); fxEvent('ko', t); injure(t, 25, a); }
  else {
    if (loud(a, t)) feed(`${a.name} ${sword ? 'slashed at' : heavy ? 'swung a bat at' : kick ? 'jump-kicked' : 'punched'} ${t.name}${a.team === t.team ? ' (own teammate!)' : ''}`, '#f2c9c9');
    const chance = heavy ? 0.7 : kick ? 0.5 : 0.1;
    if (Math.random() < chance) injure(t, heavy ? 22 : kick ? 14 : 8, a);
  }
  if ((heavy || kick) && pkind !== 'ko') { cheer('roar', t.x, kick ? 'KUNG FU!' : 'OOOH!'); fxEvent(heavy ? 'bat' : 'kick', a); }
  crowdEvent(a.team, a.team === t.team ? { noob: 6, fun: 4 } : { vill: kick ? 6 : 4, fun: kick ? 5 : 2, drama: 2 });
  if (a.team !== t.team) crowdEvent(t.team, { symp: 4 });
  EV('foul', a, { target: t.name, kind: pkind, bat: heavy, jumpKick: kick, teammate: a.team === t.team, x: Math.round(a.x), y: Math.round(a.y) });
  S.pend.push({ a, t, x: a.x, y: a.y, kind: pkind, heavy: heavy || pkind === 'ko', ttl: (S.refHuman ? 2.2 : 0.75) * (a.mood <= MOOD_MELT ? 1.5 : 1), inBox: t.team !== a.team && inBox(t.x, t.y, a.team), mate: a.team === t.team });
  alertRefs(a.x, a.y, kick ? 450 : 330, kick ? 0.85 : 0.55);
  return true;
}
// Injuries cut a player's maximum stamina until a med kit heals them, and sour their mood.
function injure(p, amount, by) {
  if (!p || amount <= 0) return;
  p.injury = clamp(p.injury + amount, 0, 70); p.staminaMax = 100 - p.injury; p.stamina = Math.min(p.stamina, p.staminaMax);
  addMood(p, -15); M(p, 'injuries'); if (by && by !== p) M(by, 'injuriesCaused'); EV('injury', p, { by: by ? by.name : null, amount });
  floatText(p, 'INJURED', '#ff8a8a');
  if (loud(p, by)) feed(`${p.name} is injured${by && by !== p ? ' by ' + by.name : ''}: stamina capped at ${Math.round(p.staminaMax)} until a med kit`, '#ff9a9a');
}
function healInjury(p) { if (!p.injury) return; p.injury = 0; p.staminaMax = 100; addMood(p, 10); floatText(p, 'INJURY HEALED', '#7dff9b'); }
function helpUp(a, t) {
  M(a, 'helpUps'); M(t, 'helpedUp'); EV('helpUp', a, { target: t.name });
  t.stun = 0; t.vx = t.vy = 0; a.foulCd = 0.8;
  addKarma(a, 12); addCharge(a, 10); addPop(a, 4); addMood(a, 10); addMood(t, 15); crowdEvent(a.team, { vill: -6, fun: 2 });
  floatText(t, 'HELPED UP', '#7dff9b');
  cheer('applause', a.x, a.team === t.team ? 'GOOD TEAMMATE!' : 'CLASS!');
  if (loud(a, t)) feed(`${a.name} helped ${t.name} up. The crowd applauds.`, '#7dff9b');
}
function leniency(f) {
  const a = f.a, opA = refOpinion(a);
  if (opA >= 30 && a.charge >= 20 && Math.random() < Math.min(0.75, (opA - 20) / 90)) return 'trust';
  if (f.t && f.t !== a) { const opT = refOpinion(f.t); if (opT <= -30 && Math.random() < Math.min(0.75, (-opT - 20) / 90)) return 'nosympathy'; }
  return null;
}
function waveOff(f, why, r) {
  const a = f.a; M(why === 'trust' ? a : f.t, why === 'trust' ? 'wavedOffTrusted' : 'ignoredFoulsOnMe'); EV('wavedOff', a, { reason: why, victim: f.t ? f.t.name : null, by: r.name }); r.att = { x: a.x, y: a.y }; r.attT = 1;
  if (why === 'trust') { addCharge(a, -20); feed(`The ${r.name.toLowerCase()} saw it but waved play on: ${a.name} has earned some trust`, '#9fe8ff'); }
  else feed(`The ${r.name.toLowerCase()} ignored the foul on ${f.t.name}: no sympathy for a repeat offender`, '#9fe8ff');
  floatText(r, 'PLAY ON', '#9fe8ff'); cheer('boo', r.x, 'REF!?');
}
function doBlind(a, isHuman) {
  if (a.blindCd > 0) return false;
  const flash = a.items.flash > 0;
  if (!flash && a.blind < 1) { if (isHuman) floatText(a, 'No sand left', '#c8c8c8'); return false; }
  const R = flash ? 260 : 160;
  const tg = S.refs.filter(r => r.blind <= 0 && Math.hypot(r.x - a.x, r.y - a.y) < R).sort((r1, r2) => Math.hypot(r1.x - a.x, r1.y - a.y) - Math.hypot(r2.x - a.x, r2.y - a.y));
  if (!tg.length) { if (isHuman) floatText(a, 'No ref in range', '#c8c8c8'); return false; }
  const hit = flash ? tg : [tg[0]];
  if (flash) a.items.flash--; else a.blind--;
  addKarma(a, -10);
  M(a, flash ? 'flashUsed' : 'sandThrows'); EV('blind', a, { flash, refs: hit.map(r => r.name) });
  a.blindCd = 1.2;
  for (const r of hit) {
    r.blind = flash ? 7 : 4.5; r.att = null;
    burst(r.x, r.y, flash ? '#fffbe0' : '#d8c08a', 18, 32);
    for (let i = 0; i < 10; i++) { const u = i / 10; S.parts.push({ x: a.x + (r.x - a.x) * u, y: a.y + (r.y - a.y) * u, z: 20 + 20 * Math.sin(u * Math.PI), vx: rand(-20, 20), vy: rand(-20, 20), vz: rand(0, 40), life: 0.5 + u * 0.3, col: flash ? '#fff6c0' : '#cfb47a', size: 2.2 }); }
  }
  if (isHuman || Math.random() < 0.5) feed(`${a.name} ${flash ? 'flash-powdered' : 'threw sand at'} the ${hit.length > 1 ? 'referees' : hit[0].name.toLowerCase()}`, '#e9d8a6');
  S.pend.push({ a, x: a.x, y: a.y, kind: 'blind', heavy: false, ttl: S.refHuman ? 2.2 : 0.5, inBox: false, mate: false });
  S.excite += 0.25; thump(300, 0.08, 0.2);
  return true;
}
function dropBanana(a) {
  if (a.items.banana <= 0) return;
  a.items.banana--; addKarma(a, -6); M(a, 'bananasDropped'); EV('banana', a, {});
  S.bananas.push({ x: clamp(a.x - Math.cos(a.face) * 16, 10, W - 10), y: clamp(a.y - Math.sin(a.face) * 16, 10, H - 10), owner: a, imm: 1, ttl: 30 });
  S.pend.push({ a, x: a.x, y: a.y, kind: 'banana', heavy: false, ttl: S.refHuman ? 2.2 : 0.4, inBox: false, mate: false });
}
function alertRefs(x, y, radius = 330, chance = 0.55) {
  for (const r of S.refs) if (r.blind <= 0 && Math.hypot(r.x - x, r.y - y) < radius && Math.random() < chance) { r.att = { x, y }; r.attT = 1.0; }
}
function sees(r, x, y) {
  if (r.blind > 0 || r.gone > 0) return false;
  if (MUT.noRef) return false;
  if (inSmoke(x, y)) return false;
  if (S.admin && S.admin.refs === 'off') return false;
  if (S.admin && S.admin.refs === 'strict') return true;
  const dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy);
  if (d < 38) return true;
  if (d > r.range) return false;
  return Math.abs(angDiff(r.face, Math.atan2(dy, dx))) < r.fov / 2;
}
const watched = p => !refIgnores(p) && S.refs.some(r => sees(r, p.x, p.y));

function callFoul(f, r) {
  const a = f.a;
  whistle(1); a.stats.caught++; if (a.cls === 'brawler') a.stk = 0; addPop(a, -8); addCharge(a, -30); addKarma(a, -10); cheer('boo', a.x, 'BOOO!');
  let red = f.heavy;
  if (!red) { a.yellows++; if (a.yellows >= 2) red = true; }
  M(a, red ? 'reds' : 'yellows'); M(a, ['foul', 'kick', 'ko'].includes(f.kind) ? 'caughtFouls' : 'sneakyCaught'); EV('card', a, { card: red ? 'red' : 'yellow', kind: f.kind, by: r.name });
  const what = { skill: 'dirty use of a skill', ranged: 'shooting a player', slide: 'reckless sliding tackle', foul: 'foul', kick: 'jump kick', ko: 'knockout', blind: 'blinding the referee', banana: 'banana drop', throw: 'unsporting throw' }[f.kind] || 'foul';
  addMood(a, -10);
  feed(`${red ? 'RED CARD' : 'Yellow card'}: ${a.name} (${what}), seen by the ${r.name.toLowerCase()}`, red ? '#ff4d4d' : '#ffd23f');
  r.att = { x: a.x, y: a.y }; r.attT = 1.5; r.card = { red, t: 1.8 };
  fxEvent('card', null, { x: r.x, y: r.y }); a0Anim(a, 'plead', 1.6); crowdEvent(a.team, { vill: 6 }); crowdEvent(1 - a.team, { symp: 3 });
  if (red) { crowdEvent(0, { drama: 10 }); crowdEvent(1, { drama: 10 }); }
  S.excite += 0.3;
  if (red) {
    if (S.ball.owner === a) S.ball.owner = null;
    a.charge = 0; a.yellows = 0; a.stun = 0; a.ko = 0; a.target = null; sendToBench(a);
    if (a.human) switchToBest(a.human);
  }
  setPiece(1 - a.team, f.inBox ? 'penalty' : 'free', f.x, f.y, red ? 'RED CARD' : 'YELLOW CARD');
}
function throwItem(p, force) {
  // The crowd favours the team it supports: some gifts go to them instead.
  if (!force && S.crowd && Math.random() < 0.35) {
    const fav = S.crowd.support >= 0.5 ? 0 : 1;
    if (Math.max(S.crowd.support, 1 - S.crowd.support) > 0.6 && p.team !== fav) { const pool = S.players.filter(q => q.team === fav && onPitch(q) && !q.gk); if (pool.length) p = pick(pool); }
  }
  const type = fieldItemFor(p);
  const tx = clamp(p.x + rand(-40, 40), 20, W - 20), ty = clamp(p.y + rand(-40, 40), 20, H - 20);
  const near = Math.random() < 0.4;
  const sx = clamp(tx + rand(-120, 120), -40, W + 40), sy = near ? H + 60 : -40;
  S.items.push({ type, sx, sy, tx, ty, t: 0, dur: 1.15, x: sx, y: sy, z: 30, landed: false, for: p, age: 0 });
  M(p, 'giftsReceived'); EV('gift', p, { item: type });
  feed(`The crowd throws a ${ITEM_LABEL[type]} to ${p.name}`, '#ffd23f');
  S.excite += 0.25;
}
function pickup(p, it) {
  M(p, 'itemsPicked');
  if (POWERUPS.includes(it.type)) { applyPowerup(p, it.type); thump(500, 0.08, 0.08); return; }
  if (it.type === 'medkit') { p.hp = Math.min(100, p.hp + 45); floatText(p, '+45 HP', '#7dff9b'); healInjury(p); }
  if (it.type === 'bat') { p.items.bat += 3; floatText(p, 'BAT ×3', '#ffcf5a'); }
  if (it.type === 'sword') { p.items.sword = (p.items.sword || 0) + 3; floatText(p, 'SWORD ×3', ITEM_COL.sword); }
  if (it.type === 'ultcharge') { p.ult = Math.min(100, (p.ult || 0) + 50); floatText(p, 'ULTIMATE +50%', ITEM_COL.ultcharge); burst(p.x, p.y, ITEM_COL.ultcharge, 12, 20); }
  if (it.type === 'sling') { p.items.sling += 5; floatText(p, 'SLINGSHOT ×5', ITEM_COL.sling); }
  if (it.type === 'blaster') { p.items.blaster += 10; floatText(p, 'FOAM BLASTER ×10', ITEM_COL.blaster); }
  if (it.type === 'flash') { p.items.flash += 1; floatText(p, 'FLASH', '#fff6c0'); }
  if (it.type === 'banana') { p.items.banana += 2; p.throwSel = 'banana'; floatText(p, 'BANANA ×2', '#ffe14d'); }
  if (it.for !== p && loud(p, it.for)) feed(`${p.name} grabbed the ${ITEM_LABEL[it.type]} meant for ${it.for.name}`, '#ffd23f');
  thump(500, 0.08, 0.08);
}
function goal(team) {
  const b = S.ball, sc = b.lastTouch;
  if (S.shoot) { b.vx = b.vy = b.vz = 0; b.x = team === 1 ? -14 : W + 14; sfx('horn'); shootoutKickDone(true); return; }
  S.score[team]++;
  b.vx = b.vy = b.vz = 0; b.z = 0; b.x = team === 1 ? -14 : W + 14;
  let sub = '';
  if (sc && sc.team === team) {
    sc.stats.goals++; addPop(sc, 25); addMood(sc, 40); for (const q of S.players) if (q !== sc) addMood(q, q.team === team ? 10 : -15); addCharge(sc, 30); if (sc.karma >= 20) cheer('applause', sc.x, 'FAIR PLAY HERO!'); sub = sc.name;
    const as = b.lastPasser;
    if (as && as.team === team && as !== sc && S.time - b.passTime < 5) { as.stats.assists++; addPop(as, 10); addCharge(as, 15); sub += ' · assist ' + as.name; }
    feed(`GOAL! ${sc.name} scores for the ${TEAM[team].name}`, TEAM[team].col);
  } else if (sc) { sub = 'Own goal by ' + sc.name; addPop(sc, 3); feed(`Own goal by ${sc.name}. The crowd loves it.`, TEAM[team].col); }
  if (S.metrics) {
    if (sc && b.shotBy === sc && S.time - b.shotT < 4) M(sc, 'shotsOnTarget');
    const asP = sc && b.lastPasser && b.lastPasser.team === team && b.lastPasser !== sc && S.time - b.passTime < 5 ? b.lastPasser : null;
    const lsp = S.metrics.lastSetPiece; if (lsp && lsp.team === team && S.metrics.t - lsp.t < 8) S.metrics.teams[team].setPieceGoals++;
    EV(sc && sc.team === team ? 'goal' : 'ownGoal', sc, { forTeam: TEAM[team].short, assist: asP ? asP.name : null, powered: !!(b.shotPowered && b.shotBy === sc), score: S.score.join('-') });
  }
  S.excite = 1.4; whistle(1); S.shake = 6;
  const own = !(sc && sc.team === team);
  S.lastGoal = { team, t: S.time };
  crowdEvent(team, { perf: 20, drama: S.clock < 30 ? 20 : 6 }); if (own) crowdEvent(1 - team, { noob: 25, fun: 10 });
  if (sc) a0Anim(sc, own ? 'facepalm' : 'cel' + (sc.celebration != null ? sc.celebration : Math.floor(Math.random() * 6)), own ? 2.5 : 6);
  fxEvent(own ? 'owngoal' : 'goal', sc, { team, side: team === 1 ? 0 : 1 });
  if (!own && sc && !sc.human && Math.random() < 0.5) setTimeout(() => doTaunt(sc, pick([0, 4])), 600);
  if (S.golden) { pauseFor(3, 'GOLDEN GOAL!', `${TEAM[team].name} win it`, () => endMatch()); return; }
  pauseFor(REPLAY.active ? 7.2 : 2.4, 'GOAL!', sub, () => kickoff(1 - team, 'KICK OFF'));
}
function endMatch() {
  S.phase = 'over'; whistle(3, 0.3);
  S.lastReport = buildReport(); saveHistory(S.lastReport);
  if (S.net === 'host') { broadcast({ t: 'report', r: S.lastReport }); sendSnap(true); }
  showResults();
  saveToProject(S.lastReport);
}
function showResults() {
  const [a, b] = S.score, R = S.lastReport;
  const shootTxt = S.shoot && S.shoot.done ? ` · ${TEAM[S.shoot.winner].name} win ${Math.max(...S.shoot.goals)}–${Math.min(...S.shoot.goals)} on penalties` : '';
  document.getElementById('o-head').textContent = (a === b ? `Draw, ${a}–${b}` : `${TEAM[a > b ? 0 : 1].name} win ${Math.max(a, b)}–${Math.min(a, b)}`) + shootTxt;
  const rating = p => R && R.players[p.id] ? R.players[p.id].ratings.performance : null;
  const ranked = S.players.slice().sort((p, q) => (rating(q) ?? q.pop / 10) - (rating(p) ?? p.pop / 10));
  const fav = S.players.slice().sort((p, q) => q.pop - p.pop)[0], dirty = S.players.slice().sort((p, q) => q.stats.fouls - p.stats.fouls)[0];
  let sub = `${R && R.playerOfTheMatch ? `Player of the match: ${R.playerOfTheMatch.name} (${R.playerOfTheMatch.rating.toFixed(1)}). ` : ''}Crowd favourite: ${fav.name} (${fav.pop} popularity). Dirtiest: ${dirty.name}, ${dirty.stats.fouls} fouls, ${dirty.stats.caught} caught.`;
  if (S.refHuman) { const H = S.refHuman, n = H.correct + H.missed + H.wrong; sub = `Your refereeing: ${H.correct} correct calls, ${H.missed} missed, ${H.wrong} wrong. Accuracy ${n ? Math.round(100 * H.correct / n) : 100}%. ` + sub; }
  document.getElementById('o-sub').textContent = sub;
  const aw = document.getElementById('o-awards');
  aw.innerHTML = R && R.awards ? R.awards.map(x => `<span class="award"><b>${esc(x.title)}</b> ${esc(x.name)} <span>${esc(String(x.value))} ${esc(x.unit)}</span></span>`).join('') : '';
  const t = document.getElementById('o-table');
  t.innerHTML = '<thead><tr><th>Player</th><th>Team</th><th>Rating</th><th>Goals</th><th>Assists</th><th>Tackles</th><th>Fouls</th><th>Caught</th><th>Karma</th><th>Popularity</th></tr></thead><tbody>' +
    ranked.map(p => `<tr><td>${p.human ? '★ ' : ''}#${p.num} ${esc(p.name)}</td><td><span class="dot" style="background:${TEAM[p.team].col}"></span>${TEAM[p.team].short}</td><td>${rating(p) != null ? rating(p).toFixed(1) : '–'}</td><td>${p.stats.goals}</td><td>${p.stats.assists}</td><td>${p.stats.tackles}</td><td>${p.stats.fouls}</td><td>${p.stats.caught}</td><td>${p.karma > 0 ? '+' : ''}${Math.round(p.karma)}</td><td>${p.pop}</td></tr>`).join('') + '</tbody>';
  document.getElementById('o-files').hidden = !R;
  document.getElementById('o-saved').textContent = !R ? '' : LOCAL_SAVE && S.net !== 'client' ? 'Saving all match metrics to data-metric/…'
    : 'This copy is not running on server.py, so it cannot write into the project folder. Download the files here instead.';
  const og = document.getElementById('o-again');
  og.hidden = false; og.textContent = S.net === 'client' ? 'Vote rematch' : S.net === 'host' ? 'Rematch (swap sides)' : 'Play again';
  updateRematchNote();
  document.getElementById('o-menu').textContent = S.net ? 'Leave room' : 'Main menu';
  showOverlay('over');
  maybeAutosave();
}

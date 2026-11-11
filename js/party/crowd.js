/* Foul Play FC · js/party/crowd.js
   The crowd opinion meter, chants and banners.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- crowd opinion meter ---------- */
const CROWD_CATS = [['fun', 'Fun', '#ffb36b'], ['perf', 'Performance', '#7dff9b'], ['noob', 'Noobie-ness', '#c9a0ff'], ['symp', 'Sympathy', '#9fd8ff'], ['vill', 'Villainy', '#ff6b80'], ['drama', 'Drama', '#ffd23f']];
const newOpinion = () => ({ fun: 10, perf: 10, noob: 0, symp: 0, vill: 0, drama: 0 });
function crowdEvent(team, d) {
  if (!S.crowd || team == null) return;
  const o = S.crowd.op[team];
  for (const k in d) o[k] = clamp(o[k] + d[k], 0, 100);
}
const crowdScore = o => o.fun * 0.25 + o.perf * 0.3 + o.symp * 0.2 + o.vill * 0.1 + o.drama * 0.15 - o.noob * 0.15;
const topCat = o => CROWD_CATS.reduce((best, [k]) => o[k] > o[best] ? k : best, 'fun');
function crowdPressure(team) { return S.crowd && S.crowd.press && S.crowd.press.team === team && S.crowd.press.t > 0 ? 1.1 : 1; }
const CHANTS = {
  fun: ['OLÉ!', 'DO IT AGAIN!', 'CHAOS! CHAOS!'], perf: ['CLASS!', 'WORLD CLASS!', 'WHAT A TEAM!'], noob: ['WHO ARE YA?', 'MY NAN COULD SCORE THAT', 'SUNDAY LEAGUE!'],
  symp: ['KEEP GOING!', 'HEADS UP!', 'WE BELIEVE!'], vill: ['BOOO!', 'CHEAT! CHEAT!', 'OFF! OFF!'], drama: ['HERE WE GO!', 'OH MY DAYS!', 'HOLD ON!']
};
const BANNERS = {
  fun: ['WE CAME FOR THE CHAOS', 'BANANA SEASON', '{N} = ENTERTAINMENT'], perf: ['{T} = FOOTBALL', '{N} FOR CAPTAIN', 'CLINICAL {T}'],
  noob: ['SUNDAY LEAGUE', '{N} FOUND THE BALL', 'IS THIS YOUR FIRST GAME {N}?'], symp: ['WE BELIEVE', 'NEVER GIVE UP {T}', 'HEADS UP {N}'],
  vill: ['REF NEEDS GLASSES', '{N}: WANTED', 'GUILTY {T}'], drama: ['LAST MINUTE MAGIC', 'HEART ATTACK FC', 'WHAT A GAME']
};
let BANNER_ID = 0;
function updateCrowdOpinion(dt) {
  const C = S.crowd; if (!C) return;
  for (const o of C.op) for (const [k] of CROWD_CATS) o[k] *= Math.exp(-dt / 45);
  const diff = S.score[0] - S.score[1];
  if (Math.abs(diff) >= 2) crowdEvent(diff > 0 ? 1 : 0, { symp: 1.5 * dt });
  if (S.clock < 30 && Math.abs(diff) <= 1 && S.mode !== 'playground') { crowdEvent(0, { drama: 2 * dt }); crowdEvent(1, { drama: 2 * dt }); }
  const target = clamp(0.5 + (crowdScore(C.op[0]) - crowdScore(C.op[1])) / 120, 0.1, 0.9);
  C.support += (target - C.support) * Math.min(1, dt * 0.8);
  if (C.press) { C.press.t -= dt; if (C.press.t <= 0) C.press = null; }
  if (!C.press && (C.support >= 0.75 || C.support <= 0.25)) { C.press = { team: C.support >= 0.75 ? 1 : 0, t: 15 }; feed(`The crowd turns on the ${TEAM[C.press.team].name}: their shots get shakier`, '#ff9a6b'); }
  C.chantT -= dt; C.bannerT -= dt;
  if (C.chantT <= 0) {
    C.chantT = rand(8, 12);
    const team = Math.random() < C.support ? 0 : 1, cat = topCat(C.op[team]), lines = CHANTS[cat];
    const kind = cat === 'vill' || cat === 'noob' ? 'boo' : cat === 'perf' || cat === 'symp' ? 'applause' : 'roar';
    cheer(kind, team === 0 ? W * 0.3 : W * 0.7, pick(lines));
  }
  if (C.bannerT <= 0) {
    C.bannerT = 20;
    const team = Math.random() < C.support ? 0 : 1, cat = topCat(C.op[team]);
    const pool = S.players.filter(p => p.team === team && onPitch(p));
    const star = (cat === 'vill' ? pool.sort((a, b) => a.karma - b.karma) : cat === 'noob' ? pool.sort((a, b) => (b.stats.fouls + b.stun) - (a.stats.fouls + a.stun)) : pool.sort((a, b) => b.pop - a.pop))[0];
    const text = pick(BANNERS[cat]).replace('{N}', (star ? star.name : TEAM[team].short).toUpperCase()).replace('{T}', TEAM[team].short);
    C.banners.push({ id: ++BANNER_ID, text, team, cat, life: 12, x: rand(W * 0.15, W * 0.85) });
    if (C.banners.length > 3) C.banners.shift();
  }
  for (let i = C.banners.length - 1; i >= 0; i--) { C.banners[i].life -= dt; if (C.banners[i].life <= 0) C.banners.splice(i, 1); }
}

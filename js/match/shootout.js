/* Foul Play FC · js/match/shootout.js
   Golden goal and penalty shoot-outs.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- golden goal and penalty shoot-out ---------- */
function clockExpired() {
  if (S.mode === 'playground' || S.phase !== 'play') return false;
  const draw = S.score[0] === S.score[1];
  if (draw && !S.golden && !S.shoot) { S.golden = true; S.clock = 60; pauseFor(2.2, 'GOLDEN GOAL', 'Next goal wins · 60 seconds', null); cheer('roar', W / 2, 'GOLDEN GOAL!'); crowdEvent(0, { drama: 20 }); crowdEvent(1, { drama: 20 }); return true; }
  if (draw && S.golden && !S.shoot) { startShootout(); return true; }
  endMatch(); return true;
}
function startShootout() {
  S.shoot = { goals: [0, 0], taken: [0, 0], next: Math.random() < 0.5 ? 0 : 1, live: null, done: false, log: [[], []] };
  S.clock = 0; feed('Penalty shoot-out!', '#ffd23f'); cheer('roar', W / 2, 'PENALTIES!');
  pauseFor(2, 'PENALTIES', 'Best of three, then sudden death', () => nextShootoutKick());
}
function nextShootoutKick() {
  const sh = S.shoot, team = sh.next;
  const cands = S.players.filter(p => p.team === team && onPitch(p) && !p.gk);
  const taker = cands.find(p => p.human) && sh.taken[team] % 2 === 0 ? cands.find(p => p.human) : cands[sh.taken[team] % Math.max(1, cands.length)];
  setPiece(team, 'penalty', 0, 0, 'PENALTY ' + (sh.taken[team] + 1));
  if (taker && S.setPiece && S.setPiece.taker !== taker) {   // rotate takers
    const sp = S.setPiece, old = sp.taker; old.x -= (team === 0 ? 1 : -1) * 60; taker.x = S.ball.x - (team === 0 ? 14 : -14); taker.y = S.ball.y; taker.face = team === 0 ? 0 : Math.PI; S.ball.owner = taker; S.ball.lastTouch = taker; sp.taker = taker;
  }
  sh.live = { team, t: 0, released: false };
}
function updateShootout(dt) {
  const sh = S.shoot; if (!sh || !sh.live || sh.done) return;
  const L = sh.live, b = S.ball;
  if (!L.released) { if (!S.setPiece) L.released = true; return; }
  L.t += dt;
  const gk = S.players.find(p => p.gk && p.team !== L.team);
  if (L.t > 3.5 || (b.owner && b.owner === gk) || (!b.owner && b.z <= 0 && Math.hypot(b.vx, b.vy) < 30) || (b.owner && b.owner.team === L.team && L.t > 0.6)) shootoutKickDone(false);
}
function shootoutKickDone(scored) {
  const sh = S.shoot, L = sh.live; if (!L) return;
  sh.live = null; sh.taken[L.team]++; sh.log[L.team].push(scored); if (scored) sh.goals[L.team]++;
  const [a, b] = sh.goals, [ta, tb] = sh.taken, left = t => Math.max(0, 3 - sh.taken[t]);
  let winner = null;
  if (ta <= 3 || tb <= 3) { if (a > b + left(1)) winner = 0; else if (b > a + left(0)) winner = 1; }
  if (ta >= 3 && tb >= 3 && ta === tb && a !== b) winner = a > b ? 0 : 1;
  feed(`${TEAM[L.team].name} ${scored ? 'score' : 'miss'} · shoot-out ${a}–${b}`, scored ? TEAM[L.team].col : '#c8c8c8');
  if (winner !== null) { sh.done = true; sh.winner = winner; pauseFor(2.4, scored ? 'GOAL!' : 'SAVED!', `${TEAM[winner].name} win the shoot-out ${Math.max(a, b)}–${Math.min(a, b)}`, () => endMatch()); return; }
  sh.next = 1 - L.team;
  pauseFor(1.8, scored ? 'GOAL!' : 'MISS!', `Shoot-out ${a}–${b}`, () => nextShootoutKick());
}

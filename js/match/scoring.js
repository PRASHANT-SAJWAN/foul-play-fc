/* Foul Play FC · js/match/scoring.js
   Goals, full time and the results screen.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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

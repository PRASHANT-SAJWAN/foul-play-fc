/* Foul Play FC · js/match/report.js
   Per-player match metrics, events, the end-of-match report (JSON, CSV, HTML) and saved history.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- match metrics & reports ----------------
   Every player gets a counter sheet for the whole match. At full time it becomes a report:
   raw JSON (everything, including the event timeline), a CSV (one row per player) and a
   standalone HTML page that is easy to read. The last 20 reports are kept in this browser. */
const METRIC_KEYS = ['benchThrows', 'throughBalls', 'blocks', 'jumps', 'headers', 'volleys', 'slides', 'refLifts', 'refThrows', 'minutes', 'humanTime', 'distance', 'possession', 'sprintTime', 'passes', 'passesCompleted', 'lobs', 'interceptions', 'shots', 'shotsOnTarget', 'powerShots',
  'fouls', 'foulsBat', 'foulsOnTeammates', 'knockouts', 'sandThrows', 'flashUsed', 'bananasDropped', 'bananaVictims', 'unseen', 'wavedOffTrusted', 'yellows', 'reds',
  'caughtFouls', 'sneakyCaught', 'sneakyUnseen', 'fouledReceived', 'knockedOut', 'slips', 'ignoredFoulsOnMe', 'helpUps', 'helpedUp', 'cleanStreaks', 'giftsReceived', 'itemsPicked', 'setPiecesTaken', 'chargeEarned', 'chargeSpent', 'longPasses', 'dives', 'jumpKicks', 'injuries', 'injuriesCaused', 'staminaUsed', 'taunts', 'powerups', 'bountiesCollected'];
const HISTORY_KEY = 'fpfc-history', HISTORY_MAX = 20;
const rnd = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

function newMetrics(mode) {
  return { startedAt: new Date().toISOString(), mode, t: 0, events: [], lastSetPiece: null,
    teams: [{ possession: 0, setPieceGoals: 0 }, { possession: 0, setPieceGoals: 0 }],
    players: S.players.map(p => { const m = { karmaStart: p.karma, karmaMin: p.karma, controllers: {} }; for (const k of METRIC_KEYS) m[k] = 0; return m; }) };
}
function M(p, k, n = 1) { const m = S.metrics && p && S.metrics.players[p.id]; if (m) m[k] += n; }
function EV(type, p, extra) {
  const MX = S.metrics; if (!MX || MX.events.length >= 4000) return;
  MX.events.push(Object.assign({ t: rnd(MX.t), type, player: p ? p.name : null, team: p ? TEAM[p.team].short : null }, extra || {}));
}
function trackFrame(p, dt) {   // once per active frame per player; dt in match seconds
  const m = S.metrics && S.metrics.players[p.id]; if (!m) return;
  if (onPitch(p)) m.minutes += dt / 60;
  if (S.ball.owner === p) { m.possession += dt; S.metrics.teams[p.team].possession += dt; }
  if (p.sprinting) m.sprintTime += dt;
  if (p.human) {
    m.humanTime += dt;
    const h = p.human, online = S.net && NET && h.id && NET.roster[h.id];
    m.controllers[online ? NET.roster[h.id].name : (h.label && h.label !== 'YOU' ? h.label : 'P' + (h.idx + 1))] = 1;
  }
  m.karmaMin = Math.min(m.karmaMin, p.karma);
}

function ratingsFor(p, m) {
  const st = p.stats, passPct = m.passes >= 3 ? m.passesCompleted / m.passes : null;
  const perf = 6 + st.goals + st.assists * 0.6 + m.shotsOnTarget * 0.15 + st.tackles * 0.12 + m.interceptions * 0.1 + st.saves * 0.4
    + (passPct != null ? (passPct - 0.6) * 1.5 : 0) + Math.min(1, m.possession / 60) * 0.3 + m.helpUps * 0.15
    - st.caught * 0.5 - m.reds * 1.5 - m.knockedOut * 0.1 - m.foulsOnTeammates * 0.2;
  return {
    performance: clamp(rnd(perf), 1, 10),
    discipline: clamp(Math.round(100 - st.fouls * 6 - st.caught * 8 - m.reds * 20 - m.foulsBat * 4 - (m.sandThrows + m.flashUsed) * 5 - m.bananasDropped * 3), 0, 100),
    sportsmanship: clamp(Math.round(50 + p.karma / 2 + m.helpUps * 5 + m.cleanStreaks * 3 - m.foulsOnTeammates * 5), 0, 100),
    passAccuracy: passPct == null ? null : Math.round(passPct * 100)
  };
}
function buildReport() {
  const MX = S.metrics || newMetrics(S.mode);
  const players = S.players.map(p => {
    const m = MX.players[p.id], metrics = {};
    for (const k of METRIC_KEYS) metrics[k] = rnd(m[k]);
    metrics.karmaStart = m.karmaStart; metrics.karmaMin = m.karmaMin;
    return { id: p.id, name: p.name, number: p.num, team: TEAM[p.team].name, teamShort: TEAM[p.team].short, role: ROLE_NAMES[p.i],
      controlledBy: Object.keys(m.controllers).length ? Object.keys(m.controllers) : ['bot'],
      ratings: ratingsFor(p, m), stats: { ...p.stats }, metrics,
      end: { hp: Math.round(p.hp), karma: Math.round(p.karma), popularity: p.pop, charge: Math.round(p.charge), refOpinion: refOpinion(p), sentOff: p.sentOff > 0 } };
  });
  const of = t => players.filter(r => r.teamShort === TEAM[t].short), sum = (arr, f) => arr.reduce((s, r) => s + f(r), 0);
  const possAll = MX.teams[0].possession + MX.teams[1].possession || 1;
  const teams = [0, 1].map(t => {
    const ps = of(t), passes = sum(ps, r => r.metrics.passes), done = sum(ps, r => r.metrics.passesCompleted);
    return { name: TEAM[t].name, short: TEAM[t].short, goals: S.score[t], possessionPct: Math.round(100 * MX.teams[t].possession / possAll),
      shots: sum(ps, r => r.metrics.shots), shotsOnTarget: sum(ps, r => r.metrics.shotsOnTarget), powerShots: sum(ps, r => r.metrics.powerShots),
      passes, passAccuracy: passes ? Math.round(100 * done / passes) : null, tackles: sum(ps, r => r.stats.tackles), interceptions: sum(ps, r => r.metrics.interceptions),
      saves: sum(ps, r => r.stats.saves), fouls: sum(ps, r => r.stats.fouls), caught: sum(ps, r => r.metrics.caughtFouls), unseen: sum(ps, r => r.metrics.unseen),
      yellows: sum(ps, r => r.metrics.yellows), reds: sum(ps, r => r.metrics.reds), helpUps: sum(ps, r => r.metrics.helpUps),
      setPieceGoals: MX.teams[t].setPieceGoals, avgPerformance: rnd(sum(ps, r => r.ratings.performance) / ps.length) };
  });
  const all = f => sum(players, f), avg = (arr, f) => arr.length ? rnd(sum(arr, f) / arr.length) : null;
  const humans = players.filter(r => r.controlledBy[0] !== 'bot'), bots = players.filter(r => r.controlledBy[0] === 'bot');
  const fouls = all(r => r.stats.fouls), caught = all(r => r.metrics.caughtFouls), shots = all(r => r.metrics.shots), goals = S.score[0] + S.score[1];
  const mostFouled = players.slice().sort((a, b) => b.metrics.fouledReceived - a.metrics.fouledReceived)[0];
  const balance = {
    fouls, caught, unseen: all(r => r.metrics.unseen), wavedOffTrusted: all(r => r.metrics.wavedOffTrusted), ignoredOnMarked: all(r => r.metrics.ignoredFoulsOnMe),
    detectionRatePct: fouls ? Math.round(100 * caught / fouls) : null, batFouls: all(r => r.metrics.foulsBat), teammateFouls: all(r => r.metrics.foulsOnTeammates),
    knockouts: all(r => r.metrics.knockouts), blinds: all(r => r.metrics.sandThrows + r.metrics.flashUsed), sneakyActs: all(r => r.metrics.sandThrows + r.metrics.flashUsed + r.metrics.bananasDropped), sneakyCaught: all(r => r.metrics.sneakyCaught), bananaSlips: all(r => r.metrics.slips),
    shots, goals, conversionPct: shots ? Math.round(100 * goals / shots) : null, powerShots: all(r => r.metrics.powerShots),
    helpUps: all(r => r.metrics.helpUps), giftsThrown: all(r => r.metrics.giftsReceived), itemsPicked: all(r => r.metrics.itemsPicked),
    avgPerformanceHumans: avg(humans, r => r.ratings.performance), avgPerformanceBots: avg(bots, r => r.ratings.performance),
    avgDistanceOutfieldM: avg(players.filter(r => r.role !== 'Goalkeeper'), r => r.metrics.distance),
    mostFouled: mostFouled && mostFouled.metrics.fouledReceived ? { name: mostFouled.name, times: mostFouled.metrics.fouledReceived } : null
  };
  const [a, b] = S.score, top = players.slice().sort((x, y) => y.ratings.performance - x.ratings.performance)[0];
  const R = {
    schema: 'foulplayfc.match.v1',
    meta: { game: 'Foul Play FC', startedAt: MX.startedAt, savedAt: new Date().toISOString(), mode: S.mode, online: S.net || 'offline',
      matchLengthSec: S.mode === 'playground' ? null : MATCH_LEN, playedSec: Math.round(MX.t), pace: PACE,
      score: { [TEAM[0].short]: a, [TEAM[1].short]: b }, result: a === b ? 'Draw' : `${TEAM[a > b ? 0 : 1].name} win` },
    playerOfTheMatch: top ? { name: top.name, team: top.team, rating: top.ratings.performance } : null,
    teams, players, balance,
    referee: S.refHuman ? (() => { const H = S.refHuman, n = H.correct + H.missed + H.wrong; return { correct: H.correct, missed: H.missed, wrong: H.wrong, ratingPct: n ? Math.round(100 * H.correct / n) : 100 }; })() : null,
    events: MX.events
  };
  R.insights = insightsFor(R);
  R.awards = computeAwards(R);
  if (S.shoot && S.shoot.done) R.meta.shootout = { [TEAM[0].short]: S.shoot.goals[0], [TEAM[1].short]: S.shoot.goals[1], winner: TEAM[S.shoot.winner].name };
  if (S.golden) R.meta.goldenGoal = true;
  return R;
}
function insightsFor(R) {
  const B = R.balance, T = R.teams, out = [];
  if (B.fouls) {
    let s = `Referees caught ${B.caught} of ${B.fouls} fouls (${B.detectionRatePct}%); ${B.unseen} went unseen.`;
    if (B.fouls >= 5 && B.detectionRatePct < 25) s += ' Fouling may be too safe: consider wider or longer referee vision cones.';
    if (B.fouls >= 5 && B.detectionRatePct > 70) s += ' Referees may be too strict: fouling rarely pays off.';
    out.push(s);
  } else out.push('No fouls this match.');
  if (B.wavedOffTrusted || B.ignoredOnMarked) out.push(`Referee opinion changed ${B.wavedOffTrusted + B.ignoredOnMarked} decisions: ${B.wavedOffTrusted} fouls waved off for trusted players, ${B.ignoredOnMarked} fouls on marked players ignored.`);
  if (B.blinds) out.push(`Referees were blinded ${B.blinds} time${B.blinds === 1 ? '' : 's'}.`);
  if (B.sneakyActs) out.push(`Sand, flash and bananas: ${B.sneakyActs} used, ${B.sneakyCaught} punished.${B.sneakyActs >= 4 && !B.sneakyCaught ? ' Sneaky play is never punished: consider making it easier to spot.' : ''}`);
  if (B.shots) {
    let s = `${B.goals} goal${B.goals === 1 ? '' : 's'} from ${B.shots} shots (${B.conversionPct}% conversion); ${B.powerShots} were power shots.`;
    if (B.shots >= 6 && B.conversionPct > 45) s += ' Scoring may be too easy for keepers to handle.';
    if (B.shots >= 8 && B.conversionPct < 8) s += ' Scoring may be too hard: keepers or shot spread could be eased.';
    out.push(s);
  }
  out.push(`Possession split ${T[0].short} ${T[0].possessionPct}% · ${T[1].short} ${T[1].possessionPct}%.`);
  if (B.avgPerformanceHumans != null && B.avgPerformanceBots != null) {
    const d = rnd(B.avgPerformanceHumans - B.avgPerformanceBots);
    out.push(`Average rating: humans ${B.avgPerformanceHumans}, bots ${B.avgPerformanceBots} (${d >= 0 ? '+' : ''}${d}).${d > 1.5 ? ' Bots may be too easy.' : d < -1.5 ? ' Bots may be too strong.' : ''}`);
  }
  if (B.teammateFouls) out.push(`${B.teammateFouls} foul${B.teammateFouls === 1 ? ' was' : 's were'} on teammates.`);
  if (B.knockouts) out.push(`${B.knockouts} knockout${B.knockouts === 1 ? '' : 's'}${B.batFouls ? `, ${B.batFouls} bat fouls` : ''}.`);
  if (B.mostFouled) out.push(`Most fouled: ${B.mostFouled.name} (${B.mostFouled.times} times).`);
  out.push(`${B.helpUps} help-up${B.helpUps === 1 ? '' : 's'} and ${B.giftsThrown} crowd gift${B.giftsThrown === 1 ? '' : 's'} (${B.itemsPicked} items picked up).`);
  return out;
}

function reportCSV(R) {
  const q = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const p0 = R.players[0], sk = Object.keys(p0.stats), mk = Object.keys(p0.metrics);
  const head = ['name', 'number', 'team', 'role', 'controlledBy', 'performance', 'discipline', 'sportsmanship', 'passAccuracyPct', ...sk.map(k => 'stats.' + k), ...mk.map(k => 'metrics.' + k), 'end.karma', 'end.popularity', 'end.refOpinion', 'end.hp'];
  const rows = R.players.map(r => [r.name, r.number, r.team, r.role, r.controlledBy.join(' / '), r.ratings.performance, r.ratings.discipline, r.ratings.sportsmanship, r.ratings.passAccuracy,
    ...sk.map(k => r.stats[k]), ...mk.map(k => r.metrics[k]), r.end.karma, r.end.popularity, r.end.refOpinion, r.end.hp]);
  return [head, ...rows].map(row => row.map(q).join(',')).join('\n') + '\n';
}

function reportHTML(R) {
  const e = esc, T = R.teams, P = R.players.slice().sort((a, b) => b.ratings.performance - a.ratings.performance);
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const pct = v => v == null ? '–' : v + '%';
  const tcls = r => r.teamShort === T[0].short ? 't0' : 't1';
  const who = r => `<span class="dot ${tcls(r)}"></span>#${r.number} ${e(r.name)}`;
  const ctl = r => r.controlledBy[0] === 'bot' ? '<span class="mut">bot</span>' : e(r.controlledBy.join(', '));
  const badge = v => `<span class="rt ${v >= 7.5 ? 'hi' : v >= 6 ? 'mid' : 'lo'}">${v.toFixed(1)}</span>`;
  const meter = v => `<span class="meter"><i style="width:${v}%"></i></span><span class="mv">${v}</span>`;
  const sign = v => (v > 0 ? '+' : '') + v;
  const cmp = [['Goals', 'goals'], ['Possession', 'possessionPct', '%'], ['Shots', 'shots'], ['On target', 'shotsOnTarget'], ['Power shots', 'powerShots'], ['Passes', 'passes'],
    ['Pass accuracy', 'passAccuracy', '%'], ['Tackles', 'tackles'], ['Interceptions', 'interceptions'], ['Saves', 'saves'], ['Fouls', 'fouls'], ['Caught', 'caught'],
    ['Unseen fouls', 'unseen'], ['Yellow cards', 'yellows'], ['Red cards', 'reds'], ['Help-ups', 'helpUps'], ['Set-piece goals', 'setPieceGoals'], ['Average rating', 'avgPerformance']]
    .map(([lab, k, u]) => {
      const a = T[0][k] ?? 0, b = T[1][k] ?? 0, tot = (+a) + (+b), sa = tot ? 100 * a / tot : 0, sb = tot ? 100 * b / tot : 0, f = (side, v) => T[side][k] == null ? '–' : v + (u || '');
      return `<span class="cv">${f(0, a)}</span><span class="bar l"><i class="t0" style="width:${sa}%"></i></span><span class="lab">${lab}</span><span class="bar"><i class="t1" style="width:${sb}%"></i></span><span class="cv r">${f(1, b)}</span>`;
    }).join('');
  const evText = v => ({
    goal: `Goal${v.assist ? ' · assist ' + e(v.assist) : ''}${v.powered ? ' · power shot' : ''} (${e(v.score)})`, ownGoal: `Own goal (${e(v.score)})`,
    shot: `Shot${v.powered ? ' · power' : ''}`, save: `Save from ${e(v.shooter)}`, tackle: `Won the ball from ${e(v.from)}`, interception: `Intercepted ${e(v.from)}'s pass`,
    foul: `${v.bat ? 'Bat foul' : v.kind === 'ko' ? 'Knockout foul' : 'Foul'} on ${e(v.target)}${v.teammate ? ' (teammate)' : ''}`,
    card: `${v.card === 'red' ? 'Red' : 'Yellow'} card · ${e(FOUL_NAME[v.kind] || v.kind)} · ${e(v.by)}`, unseen: `Got away with a ${e(FOUL_NAME[v.kind] || v.kind)}`,
    wavedOff: v.reason === 'trust' ? `Foul waved off by the ${e(String(v.by).toLowerCase())} (trusted player)` : `Foul on ${e(v.victim)} ignored (marked player)`,
    blind: v.flash ? 'Flash powder at the referees' : `Sand at the ${e(String((v.refs || [])[0] || 'referee').toLowerCase())}`, banana: 'Dropped a banana',
    slip: `Slipped on ${e(v.banana)}'s banana`, helpUp: `Helped ${e(v.target)} up`, gift: `Crowd gift: ${e(ITEM_LABEL[v.item] || v.item)}`,
    dive: 'Dived for a shot', setPiece: v.kick === 'penalty' ? 'Took a penalty' : 'Took a free kick'
  }[v.type] || e(v.type));
  const evCls = { goal: 'g', ownGoal: 'g', card: 'b', foul: 'w', unseen: 'w', wavedOff: 'w', blind: 'w', banana: 'w', helpUp: 'ok', save: 'ok', tackle: 'ok', interception: 'ok' };
  const timeline = R.events.filter(v => v.type !== 'shot' || v.powered).slice(0, 400)
    .map(v => `<tr class="${evCls[v.type] || ''}"><td>${fmtT(v.t)}</td><td class="l">${v.player ? `<span class="dot ${v.team === T[0].short ? 't0' : 't1'}"></span>${e(v.player)}` : ''}</td><td class="l">${evText(v)}</td></tr>`).join('');
  const d = new Date(R.meta.savedAt), date = d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  const modeName = { '1p': 'Solo vs bots', '2pv': '2 players · versus', '2pc': '2 players · co-op', watch: 'Bots only', online: 'Online (host)', client: 'Online', playground: 'Playground', ref: 'Referee mode' }[R.meta.mode] || R.meta.mode;
  const motm = R.playerOfTheMatch;
  const ref = R.referee ? `<section><h2>Your refereeing</h2><div class="kpis"><div><b>${R.referee.correct}</b><span>correct calls</span></div><div><b>${R.referee.missed}</b><span>missed</span></div><div><b>${R.referee.wrong}</b><span>wrong calls</span></div><div><b>${R.referee.ratingPct}%</b><span>accuracy</span></div></div></section>` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Match report · ${e(T[0].short)} ${T[0].goals}–${T[1].goals} ${e(T[1].short)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Teko:wght@500;600&family=Barlow+Condensed:wght@400;500;600;700&display=swap">
<style>
:root{--bg:#f3f5f1;--card:#ffffff;--ink:#14201a;--muted:#5b6c62;--line:#dfe6e0;--t0:#1d7ccc;--t1:#d94e26;--gold:#a87d00;--good:#18884a;--warn:#a87400;--bad:#c62f43;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0a120f;--card:#111c17;--ink:#eef2e6;--muted:#93a799;--line:#25392f;--t0:#3fa9ff;--t1:#ff6a3d;--gold:#ffd23f;--good:#5ef08a;--warn:#ffd23f;--bad:#ff6b80;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 'Barlow Condensed','Arial Narrow',system-ui,sans-serif}
main{max-width:1120px;margin:0 auto;padding:28px max(16px,env(safe-area-inset-left)) 60px;display:flex;flex-direction:column;gap:20px}
h1,h2{font-family:Teko,'Arial Narrow',Impact,sans-serif;font-weight:600;margin:0;line-height:.9;text-wrap:balance}
h2{font-size:30px}
.kicker{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:600}
.score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px 20px}
.score h1{font-size:clamp(30px,5.5vw,58px)} .score .r{text-align:right}
.score .n{font-family:Teko,Impact,sans-serif;font-size:clamp(60px,11vw,110px);line-height:.75;font-variant-numeric:tabular-nums}
.c0{color:var(--t0)}.c1{color:var(--t1)}
.meta{display:flex;flex-wrap:wrap;gap:6px 22px;color:var(--muted)} .meta b{color:var(--ink);font-weight:600}
section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}
.wrap{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:6px 9px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;position:sticky;top:0;background:var(--card)}
th:first-child,td:first-child,.l{text-align:left}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:baseline}
.t0{background:var(--t0)}.t1{background:var(--t1)} .mut{color:var(--muted)}
.rt{display:inline-block;min-width:40px;text-align:center;border-radius:5px;padding:1px 6px;font-weight:700}
.rt.hi{color:var(--good);background:color-mix(in srgb,var(--good) 16%,transparent)}
.rt.mid{color:var(--warn);background:color-mix(in srgb,var(--warn) 16%,transparent)}
.rt.lo{color:var(--bad);background:color-mix(in srgb,var(--bad) 16%,transparent)}
.meter{display:inline-block;width:56px;height:6px;border-radius:3px;background:var(--line);vertical-align:middle;overflow:hidden;margin-right:6px}
.meter i{display:block;height:100%;background:var(--gold)} .mv{display:inline-block;min-width:2ch}
.cmp{display:grid;grid-template-columns:3.6em 1fr minmax(7.5em,auto) 1fr 3.6em;gap:7px 10px;align-items:center;font-variant-numeric:tabular-nums}
.cmp .bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden;display:flex} .cmp .bar.l{justify-content:flex-end}
.cmp .bar i{display:block;height:100%} .cmp .lab{text-align:center;color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.06em}
.cmp .cv{font-weight:700} .cmp .cv.r{text-align:right}
.motm{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.motm .big{font-family:Teko,Impact,sans-serif;font-size:44px;line-height:.8}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.kpis div{display:flex;flex-direction:column} .kpis b{font-family:Teko,Impact,sans-serif;font-size:40px;line-height:.85;font-weight:600} .kpis span{color:var(--muted)}
ul.ins{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px;max-width:78ch}
tr.g td{color:var(--gold);font-weight:600} tr.b td{color:var(--bad)} tr.w td:last-child{color:var(--warn)} tr.ok td:last-child{color:var(--good)}
.tl{max-height:520px;overflow:auto}
.foot{color:var(--muted);font-size:14px;max-width:80ch}
@media (max-width:560px){.score{grid-template-columns:1fr}.score .r{text-align:left}}
</style></head><body><main>
<header style="display:flex;flex-direction:column;gap:10px">
  <div class="kicker">Foul Play FC · Match report</div>
  <div class="score"><h1 class="c0">${e(T[0].name)}</h1><span class="n">${T[0].goals}–${T[1].goals}</span><h1 class="c1 r">${e(T[1].name)}</h1></div>
  <div class="meta"><span><b>${e(R.meta.result)}</b></span><span><b>Mode</b> ${e(modeName)}</span><span><b>Played</b> ${fmtT(R.meta.playedSec)}${R.meta.matchLengthSec ? ' of ' + fmtT(R.meta.matchLengthSec) : ''}</span><span><b>Pace</b> ${Math.round(R.meta.pace * 100)}%</span><span><b>Saved</b> ${e(date)}</span></div>
</header>
${motm ? `<section class="motm"><span class="kicker">Player of the match</span><span class="big">${e(motm.name)}</span><span class="mut">${e(motm.team)}</span>${badge(motm.rating)}</section>` : ''}
<section><h2>Team comparison</h2><div class="cmp"><span class="cv c0">${e(T[0].short)}</span><span></span><span></span><span></span><span class="cv r c1">${e(T[1].short)}</span>${cmp}</div></section>
<section><h2>Player ratings</h2><div class="wrap"><table>
<thead><tr><th>Player</th><th class="l">Role</th><th class="l">Played by</th><th>Rating</th><th>Goals</th><th>Assists</th><th>Shots</th><th>On target</th><th>Pass %</th><th>Tackles</th><th>Int.</th><th>Saves</th><th>Possession s</th><th>Distance m</th><th>Sprint s</th></tr></thead><tbody>
${P.map(r => `<tr><td>${who(r)}</td><td class="l">${e(r.role)}</td><td class="l">${ctl(r)}</td><td>${badge(r.ratings.performance)}</td><td>${r.stats.goals}</td><td>${r.stats.assists}</td><td>${r.metrics.shots}</td><td>${r.metrics.shotsOnTarget}</td><td>${pct(r.ratings.passAccuracy)}</td><td>${r.stats.tackles}</td><td>${r.metrics.interceptions}</td><td>${r.stats.saves}</td><td>${Math.round(r.metrics.possession)}</td><td>${Math.round(r.metrics.distance)}</td><td>${Math.round(r.metrics.sprintTime)}</td></tr>`).join('')}
</tbody></table></div></section>
<section><h2>Discipline</h2><div class="wrap"><table>
<thead><tr><th>Player</th><th>Discipline</th><th>Fouls</th><th>With bat</th><th>On teammates</th><th>Knockouts</th><th>Sand / flash</th><th>Bananas</th><th>Caught</th><th>Unseen</th><th>Waved off</th><th>Yellow</th><th>Red</th><th>Fouled</th><th>Ignored fouls on them</th></tr></thead><tbody>
${P.slice().sort((a, b) => a.ratings.discipline - b.ratings.discipline).map(r => `<tr><td>${who(r)}</td><td>${meter(r.ratings.discipline)}</td><td>${r.stats.fouls}</td><td>${r.metrics.foulsBat}</td><td>${r.metrics.foulsOnTeammates}</td><td>${r.metrics.knockouts}</td><td>${r.metrics.sandThrows + r.metrics.flashUsed}</td><td>${r.metrics.bananasDropped}</td><td>${r.stats.caught}</td><td>${r.metrics.unseen}</td><td>${r.metrics.wavedOffTrusted}</td><td>${r.metrics.yellows}</td><td>${r.metrics.reds}</td><td>${r.metrics.fouledReceived}</td><td>${r.metrics.ignoredFoulsOnMe}</td></tr>`).join('')}
</tbody></table></div></section>
<section><h2>Sportsmanship and the crowd</h2><div class="wrap"><table>
<thead><tr><th>Player</th><th>Sportsmanship</th><th>Help-ups</th><th>Helped up</th><th>Clean 30s streaks</th><th>Karma start → end</th><th>Lowest karma</th><th>Ref opinion</th><th>Popularity</th><th>Crowd gifts</th><th>Items picked</th><th>Charge earned / spent</th></tr></thead><tbody>
${P.slice().sort((a, b) => b.ratings.sportsmanship - a.ratings.sportsmanship).map(r => `<tr><td>${who(r)}</td><td>${meter(r.ratings.sportsmanship)}</td><td>${r.metrics.helpUps}</td><td>${r.metrics.helpedUp}</td><td>${r.metrics.cleanStreaks}</td><td>${sign(Math.round(r.metrics.karmaStart))} → ${sign(r.end.karma)}</td><td>${sign(Math.round(r.metrics.karmaMin))}</td><td>${sign(r.end.refOpinion)}</td><td>${r.end.popularity}</td><td>${r.metrics.giftsReceived}</td><td>${r.metrics.itemsPicked}</td><td>${Math.round(r.metrics.chargeEarned)} / ${Math.round(r.metrics.chargeSpent)}</td></tr>`).join('')}
</tbody></table></div></section>
${ref}
<section><h2>Balance notes</h2><ul class="ins">${R.insights.map(s => `<li>${e(s)}</li>`).join('')}</ul></section>
<section><h2>Timeline</h2><div class="wrap tl"><table><thead><tr><th>Time</th><th class="l">Player</th><th class="l">Event</th></tr></thead><tbody>${timeline || '<tr><td colspan="3" class="l mut">No events recorded.</td></tr>'}</tbody></table></div></section>
<p class="foot">Performance rating runs from 1 to 10: everyone starts at 6.0; goals, assists, shots on target, tackles, interceptions, saves, accurate passing, possession and helping players up raise it; being caught fouling, red cards, knockouts suffered and fouls on teammates lower it. Discipline (0–100) falls with every foul, card, sand throw and banana. Sportsmanship (0–100) follows karma, help-ups and clean streaks. The matching .json file holds every raw number and the full event list; the .csv has one row per player for spreadsheets.</p>
</main></body></html>`;
}

function fileBase(R) {
  const d = new Date(R.meta.savedAt), p2 = n => String(n).padStart(2, '0'), s = R.meta.score, k = Object.keys(s);
  return `foulplayfc-${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}-${k[0].toLowerCase()}-${s[k[0]]}-${s[k[1]]}-${k[1].toLowerCase()}`;
}
function downloadFile(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
}
function saveReport(kind) {
  const R = S.lastReport, note = document.getElementById('o-saved');
  if (!R) { note.textContent = 'No match data to save yet.'; return; }
  const base = fileBase(R);
  if (kind === 'html') downloadFile(base + '.html', reportHTML(R), 'text/html');
  if (kind === 'json') downloadFile(base + '.json', JSON.stringify(R, null, 2), 'application/json');
  if (kind === 'csv') downloadFile(base + '.csv', reportCSV(R), 'text/csv');
  note.textContent = `Saved ${base}.${kind} to your downloads.`;
}
// When the game is served by server.py, finished matches are written into the project's data-metric/ folder.
let LOCAL_SAVE = null, RELAY_HERE = false, TUNNEL_URL = null, PENDING_RELAY = null;
async function detectLocalSave() {
  try { const r = await fetch('api/health', { cache: 'no-store' }); const j = await r.json(); LOCAL_SAVE = !!(j && j.saves); RELAY_HERE = !!(j && j.relay); TUNNEL_URL = (j && j.tunnel) || null; }
  catch (e) { LOCAL_SAVE = false; }
  const link = document.getElementById('o-index'); if (link) link.hidden = !LOCAL_SAVE;
  return LOCAL_SAVE;
}
async function saveToProject(R) {
  if (!R || S.net === 'client') return;
  if (LOCAL_SAVE === null) await detectLocalSave();
  if (!LOCAL_SAVE) return;
  const note = document.getElementById('o-saved'), base = fileBase(R);
  note.textContent = 'Saving all match metrics to data-metric/…';
  try {
    const res = await fetch('api/metrics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      base, files: { json: JSON.stringify(R, null, 2), html: reportHTML(R), csv: reportCSV(R) },
      summary: { savedAt: R.meta.savedAt, mode: R.meta.mode, scoreline: `${R.teams[0].short} ${R.teams[0].goals}–${R.teams[1].goals} ${R.teams[1].short}`,
        playedSec: R.meta.playedSec, playerOfTheMatch: R.playerOfTheMatch, fouls: R.balance.fouls, detectionRatePct: R.balance.detectionRatePct } }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || 'HTTP ' + res.status);
    S.reportSaved = true;
    note.textContent = `Saved to data-metric/${base} (.json, .html, .csv). Every match is listed in data-metric/index.html.`;
  } catch (e) {
    note.textContent = `Could not save to data-metric (${e.message}). Use the buttons above to download the files instead.`;
  }
}
detectLocalSave();
function loadHistory() { const h = store.get(HISTORY_KEY); return Array.isArray(h) ? h : []; }
function saveHistory(R) {
  if (!R) return;
  const list = loadHistory(), { events, ...compact } = R;
  if (list.some(m => m.meta && m.meta.savedAt === R.meta.savedAt)) return;
  list.push(compact); while (list.length > HISTORY_MAX) list.shift();
  store.set(HISTORY_KEY, list);
}
function maybeAutosave() {
  if (!AUTOSAVE || !S.lastReport || S.reportSaved) return;
  if (LOCAL_SAVE && S.net !== 'client') return;   // server.py already writes the files into data-metric/
  S.reportSaved = true;
  setTimeout(() => { saveReport('html'); setTimeout(() => saveReport('json'), 500); }, 400);
}
function renderFileOpts() {
  const el = document.getElementById('saveopt');
  el.innerHTML = [['Save buttons at full time', false], ['Also download automatically', true]].map(([n, v]) => `<button id="save-${v}" aria-pressed="${v === AUTOSAVE}" data-v="${v}">${n}</button>`).join('');
  el.querySelectorAll('button').forEach(b => b.onclick = () => { AUTOSAVE = b.dataset.v === 'true'; store.set('fpfc-autosave', AUTOSAVE); renderFileOpts(); document.getElementById(b.id).focus(); });
  const n = loadHistory().length, clr = document.getElementById('s-clearhist');
  document.getElementById('s-savemode').textContent = LOCAL_SAVE ? 'This copy runs on server.py, so every match is also written to the data-metric folder automatically.' : 'This copy cannot write to your disk. Use the save buttons on the full-time screen, or download automatically.';
  document.getElementById('s-histnote').textContent = (n ? `${n} match${n === 1 ? '' : 'es'} saved in this browser (keeps the last ${HISTORY_MAX}, without timelines).` : 'No matches saved in this browser yet.');
  document.getElementById('s-history').disabled = !n; clr.disabled = !n; clr.textContent = 'Clear history'; clr.dataset.armed = '';
}
document.getElementById('o-html').onclick = () => saveReport('html');
document.getElementById('o-json').onclick = () => saveReport('json');
document.getElementById('o-csv').onclick = () => saveReport('csv');
document.getElementById('s-history').onclick = () => {
  const list = loadHistory(); if (!list.length) return;
  downloadFile(`foulplayfc-history-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ schema: 'foulplayfc.history.v1', exportedAt: new Date().toISOString(), matches: list }, null, 2), 'application/json');
};
document.getElementById('s-clearhist').onclick = e => {
  const b = e.currentTarget;
  if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Click again to clear'; return; }
  store.set(HISTORY_KEY, []); renderFileOpts();
};

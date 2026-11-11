/* Foul Play FC · js/match/awards.js
   Post-match awards.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- post-match awards ---------- */
const AWARDS = [
  ['Most sneaky', r => r.metrics.unseen, 'unseen fouls'], ["Crowd's darling", r => r.end.popularity, 'popularity'], ['Banana victim', r => r.metrics.slips, 'slips'],
  ['Iron wall', r => r.stats.saves, 'saves'], ['Hatchet', r => r.stats.fouls, 'fouls'], ['Gentleman', r => r.metrics.helpUps, 'help-ups'],
  ['Workhorse', r => Math.round(r.metrics.distance), 'metres run'], ['Sniper', r => r.metrics.shotsOnTarget, 'shots on target'], ['Kung fu', r => r.metrics.knockouts, 'knockouts'],
  ['Glass bones', r => r.metrics.injuries, 'injuries'], ['Trash talker', r => r.metrics.taunts, 'taunts'], ['Bounty hunter', r => r.metrics.bountiesCollected, 'bounties']
];
function computeAwards(R) {
  const out = [];
  for (const [title, f, unit] of AWARDS) {
    const best = R.players.slice().sort((a, b) => (f(b) || 0) - (f(a) || 0))[0];
    if (best && (f(best) || 0) > 0) out.push({ title, name: best.name, team: best.teamShort, value: f(best), unit });
  }
  return out;
}

/* Foul Play FC · js/party/bounties.js
   Grudges and bounties.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- grudges and bounties ---------- */
function noteGrudge(a, t) {
  if (!S.grudge || !a || !t || a === t) return;
  const back = S.grudge[t.id + '>' + a.id] || 0;
  if (back >= 2 && a.team !== t.team) {   // t has fouled a at least twice: this one is revenge
    addPop(a, 4); crowdEvent(a.team, { fun: 6, drama: 3 }); floatText(a, 'REVENGE!', '#ffb36b');
    if (loud(a, t)) feed(`Revenge! ${a.name} pays ${t.name} back`, '#ffb36b');
  }
  S.grudge[a.id + '>' + t.id] = (S.grudge[a.id + '>' + t.id] || 0) + 1;
}
function topGrudge(p) {   // who has fouled p the most (2+)
  let best = null, n = 1;
  for (const q of S.players) { const c = S.grudge ? S.grudge[q.id + '>' + p.id] || 0 : 0; if (c > n) { n = c; best = q; } }
  return best ? { name: best.name, n } : null;
}
function updateBounty(dt) {
  if (S.mode === 'playground' && !S.bountyOn) return;
  S.bountyT -= dt;
  if (S.bounty) { S.bounty.t -= dt; if (S.bounty.t <= 0 || !onPitch(S.players[S.bounty.pid])) S.bounty = null; }
  if (S.bountyT <= 0 && !S.bounty) {
    S.bountyT = 45;
    const pool = S.players.filter(p => onPitch(p) && !p.gk);
    const villain = S.bountyFlip = !S.bountyFlip;
    const t = villain ? pool.sort((a, b) => a.karma - b.karma)[0] : pool.sort((a, b) => b.pop - a.pop)[0];
    if (t) { S.bounty = { pid: t.id, kind: villain ? 'villain' : 'star', t: 30 }; feed(`The crowd puts a bounty on ${t.name} (${villain ? 'dirtiest player' : 'crowd favourite'}): win the ball off them for a gift`, '#ffd23f'); cheer('roar', t.x, 'BOUNTY!'); }
  }
}
function bountyCollect(p, victim) {
  if (!S.bounty || !victim || S.bounty.pid !== victim.id || p.team === victim.team) return;
  S.bounty = null; addPop(p, 10); M(p, 'bountiesCollected'); EV('bounty', p, { from: victim.name });
  feed(`${p.name} collected the bounty on ${victim.name}!`, '#ffd23f'); floatText(p, 'BOUNTY!', '#ffd23f'); throwItem(p, true);
}

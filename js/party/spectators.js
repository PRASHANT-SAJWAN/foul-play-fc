/* Foul Play FC · js/party/spectators.js
   Spectator cheers and gifts.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- spectators ---------- */
function spectatorCheer(team, name, uid) {
  S.specCd = S.specCd || {};
  const key = uid || 'local';
  if ((S.specCd[key] || 0) > S.time) return false;
  S.specCd[key] = S.time + 15;
  crowdEvent(team, { fun: 6, symp: 4 }); cheer('applause', team === 0 ? W * 0.25 : W * 0.75, `${String(name).toUpperCase().slice(0, 12)}: COME ON ${TEAM[team].short}!`);
  return true;
}
function spectatorGift(team, uid) {
  S.specGift = S.specGift || {};
  const key = (uid || 'local') + ':' + (S.clock > MATCH_LEN / 2 ? 1 : 2);
  if (S.specGift[key]) return false;
  const pool = S.players.filter(p => p.team === team && onPitch(p) && !p.gk); if (!pool.length) return false;
  S.specGift[key] = true; throwItem(pick(pool)); return true;
}

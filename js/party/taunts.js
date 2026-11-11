/* Foul Play FC · js/party/taunts.js
   The taunt wheel.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- taunts ---------- */
const TAUNTS = [
  { dir: 'up', text: 'Too easy!', anim: 'shrug' }, { dir: 'right', text: 'Nice try!', anim: 'point' }, { dir: 'down', text: 'Sorry!', anim: 'sorry' },
  { dir: 'left', text: 'Ref! REF!', anim: 'wave' }, { dir: 'upright', text: 'Come at me', anim: 'chest' }, { dir: 'downleft', text: 'GG', anim: 'thumbs' }
];
const TAUNT_ANG = { up: -90, upright: -45, right: 0, down: 90, downleft: 135, left: 180 };
function tauntFromDir(ix, iy) {
  if (!ix && !iy) return -1;
  const a = Math.atan2(iy, ix) * 180 / Math.PI;
  let best = 0, bd = 999;
  TAUNTS.forEach((t, i) => { const d = Math.abs(((a - TAUNT_ANG[t.dir]) + 540) % 360 - 180); if (d < bd) { bd = d; best = i; } });
  return best;
}
function doTaunt(p, id) {
  const T = TAUNTS[id]; if (!T || !p || !(onPitch(p) || onBench(p))) return;
  p.tauntLog = (p.tauntLog || []).filter(t => S.time - t < 60);
  if (p.tauntCd > 0 || p.tauntLog.length >= 6) return;
  p.tauntCd = 3; p.tauntLog.push(S.time); a0Anim(p, T.anim, 1.1); M(p, 'taunts'); EV('taunt', p, { text: T.text });
  S.bubbles.push({ pid: p.id, text: T.text, life: 2.2 }); if (S.bubbles.length > 8) S.bubbles.shift();
  const opp = S.players.filter(q => q.team !== p.team && onPitch(q) && dist(q, p) < 200).sort((a, b) => dist(a, p) - dist(b, p))[0];
  if (opp && id !== 2 && id !== 5) { opp.firedUpAt = p; opp.firedUpT = 6; addMood(opp, -6); }   // "got them fired up"
  if (id === 2 && p.lastFoulT && S.time - p.lastFoulT < 3) addKarma(p, 2);
  if (id === 3 && S.refs[0]) { S.refs[0].att = { x: p.x, y: p.y }; S.refs[0].attT = 1; }
  if (id === 5 && !p.ggDone) { p.ggDone = true; addKarma(p, 1); }
  if (S.lastGoal && S.lastGoal.team === p.team && S.time - S.lastGoal.t < 6) crowdEvent(p.team, { fun: 8 });
}

/* Foul Play FC · main.js
   Spectator buttons, the debug hook, the main loop and start-up. Loaded last.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- spectators: cheer and gift buttons ---------------- */
function updateSpecBar() {
  const meOnPitch = S.players.some(p => p.human && (p.human.local || (!p.human.remote && !S.net)));
  const show = S.phase === 'play' && !S.userPaused && (S.mode === 'watch' || (S.net === 'client' && !meOnPitch));
  $('spec').hidden = !show;
}
$('spec').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return; b.blur();
  const team = +(b.dataset.cheer ?? b.dataset.gift), gift = b.dataset.gift != null;
  if (S.net === 'client' && NET && NET.conn) { NET.conn.send({ t: gift ? 'sgift' : 'cheer', team }); return; }
  const ok = gift ? spectatorGift(team) : spectatorCheer(team, 'You');
  if (!ok) feed(gift ? 'You already sent a gift this half' : 'Give your voice a rest: one cheer every 15 seconds', '#c8c8c8');
});
setInterval(updateSpecBar, 400);

// Debug hook for testing: only exposed when the URL contains ?debug
if (/[?&]debug\b/.test(location.search)) window.__fpfc = { S, admin, refOpinion, buildReport, reportHTML, reportCSV, net: () => NET, applyPowerup, useThrowable, doTaunt, goal, clockExpired, REPLAY, CAMFX, MUT: () => MUT, setMut: m => { MUT = m; }, startAnomaly, castSkill, fireWeapon, whack, passPreview, setPiece, isLocalHuman };
if (store.get('fpfc-gfx') !== '2d') setGraphics(true);
let last = performance.now();
function loop(now) {
  const dt = Math.min(1 / 30, (now - last) / 1000); last = now;
  try {
    const sm = S.slowmo && S.slowmo.t > 0 ? S.slowmo.k : 1; if (S.slowmo) S.slowmo.t -= dt;
    if (S.net === 'client') clientUpdate(dt); else { update(dt * PACE * sm); if (S.net === 'host') sendSnap(false); }
    recordFrame(); updateCamFx(dt); fxTick(dt);
    const rf = replayFrame(dt); if (rf) applyReplayFrame(rf);
    followCamera(dt); draw();
    if (rf) restoreReplayFrame();
  } catch (err) { console.error(err); }
  requestAnimationFrame(loop);
}
resize(); applyFormat(FORMAT_PREF); newMatch('watch'); showOverlay('menu');
requestAnimationFrame(loop);

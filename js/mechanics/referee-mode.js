/* Foul Play FC · js/mechanics/referee-mode.js
   Be the referee: controls and calls.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- referee mode ---------------- */
function humanRef(r, dt) {
  const h = S.refHuman, inp = localInput(h, dt), blind = r.blind > 0;
  if (inp.pass) h.track = !h.track;
  if (inp.foul) refCall();
  const sp = (h.prev.shoot ? 200 : 135) * (blind ? 0.4 : 1);
  r.x = clamp(r.x + inp.ix * sp * dt, 10, W - 10); r.y = clamp(r.y + inp.iy * sp * dt, 10, H - 10);
  const moving = inp.ix || inp.iy; if (moving) r.run += sp * dt * 0.09;
  const turn = (h.prev.item ? 1 : 0) - (h.prev.lpass ? 1 : 0);
  if (turn) r.face += turn * 3.2 * dt;
  else if (h.track) r.face += clamp(angDiff(r.face, Math.atan2(S.ball.y - r.y, S.ball.x - r.x)), -3.5 * dt, 3.5 * dt);
  else if (moving) r.face += angDiff(r.face, Math.atan2(inp.iy, inp.ix)) * Math.min(1, dt * 10);
}
function refCall() {
  const R = S.refHuman, r = S.refs[0];
  if (r.blind > 0) { floatText(r, "Can't see!", '#d8c08a'); return; }
  const seen = S.pend.filter(f => f.seenH);
  if (!seen.length) {
    R.wrong++; whistle(1); S.excite += 0.2; floatText(r, 'BOO!', '#ff9a6b');
    feed('No foul there. The crowd boos the referee.', '#ff9a6b');
    return;
  }
  const f = seen.reduce((a, b) => b.ttl > a.ttl ? b : a);
  S.pend.splice(S.pend.indexOf(f), 1); R.correct++;
  callFoul(f, r);
}

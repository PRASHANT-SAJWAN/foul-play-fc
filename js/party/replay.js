/* Foul Play FC · js/party/replay.js
   Goal replays: recording and playing back recent frames.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------- goal replay: every machine records its own recent frames ---------- */
const REPLAY = { buf: [], active: null };
function recordFrame() {
  if (S.phase !== 'play' || REPLAY.active || S.pause > 0) return;
  REPLAY.buf.push({ t: S.time, p: S.players.map(p => [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff]), b: [S.ball.x, S.ball.y, S.ball.z, S.ball.spin, S.ball.owner ? S.ball.owner.id : -1], r: S.refs.map(r => [r.x, r.y, r.face, r.run, r.blind]) });
  while (REPLAY.buf.length && S.time - REPLAY.buf[0].t > 6.5) REPLAY.buf.shift();
}
function startReplay(goalT) {
  const frames = REPLAY.buf.filter(f => f.t >= goalT - 4.5 && f.t <= goalT + 0.1);
  if (frames.length < 10) return;
  REPLAY.active = { frames, t: -1.3, dur: frames[frames.length - 1].t - frames[0].t, t0: frames[0].t };   // 1.3 s of celebration first
}
let REPLAY_SAVED = null;
function replayFrame(dt) {
  const R = REPLAY.active; if (!R) return null;
  R.t += dt * 0.8;
  if (R.t < 0) return null;
  if (R.t > R.dur || S.pause <= 0) { REPLAY.active = null; REPLAY.buf = []; return null; }
  const target = R.t0 + R.t; let f = R.frames[0];
  for (const fr of R.frames) { if (fr.t <= target) f = fr; else break; }
  return f;
}
function applyReplayFrame(f) {   // swap the replay positions in for drawing, keep the real ones to restore
  REPLAY_SAVED = { p: S.players.map(p => [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff]), b: [S.ball.x, S.ball.y, S.ball.z, S.ball.spin, S.ball.owner], r: S.refs.map(r => [r.x, r.y, r.face, r.run, r.blind]) };
  f.p.forEach((a, i) => { const p = S.players[i]; if (p) [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff] = a; });
  [S.ball.x, S.ball.y, S.ball.z, S.ball.spin] = f.b; S.ball.owner = f.b[4] >= 0 ? S.players[f.b[4]] : null;
  f.r.forEach((a, i) => { const r = S.refs[i]; if (r) [r.x, r.y, r.face, r.run, r.blind] = a; });
}
function restoreReplayFrame() {
  const s = REPLAY_SAVED; if (!s) return; REPLAY_SAVED = null;
  s.p.forEach((a, i) => { const p = S.players[i]; if (p) [p.x, p.y, p.face, p.run, p.vx, p.vy, p.stun, p.ko, p.anim, p.animT, p.sentOff] = a; });
  [S.ball.x, S.ball.y, S.ball.z, S.ball.spin, S.ball.owner] = s.b;
  s.r.forEach((a, i) => { const r = S.refs[i]; if (r) [r.x, r.y, r.face, r.run, r.blind] = a; });
}

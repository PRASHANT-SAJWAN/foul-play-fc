/* Foul Play FC · js/match/var.js
   VAR check and bribery: when a red card is about to be shown, the match freezes for 3 seconds.
   Mash the attack key to argue it down to a yellow, or press the item key to bribe the referee with charge.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

const VAR = { time: 3, need: 14, bribe: 40, botChance: 0.3 };
const wouldBeRed = f => !!f.heavy || (f.a && f.a.yellows >= 1);
// Called by callFoul before a red card. Returns true if the card waits for the VAR check.
function varStart(f, r) {
  const a = f.a;
  if (!a || f.varDone || S.shoot || S.refHuman || S.phase !== 'play') return false;
  if (!a.human && Math.random() > VAR.botChance) return false;   // bots contest now and then
  S.varCheck = { f, r, t: VAR.time, mash: 0, need: VAR.need, bot: !a.human, bribed: false, done: null, show: 0, how: '' };
  whistle(2, 0.4, 0.18); fxEvent('var', a);
  feed(`VAR CHECK: ${a.name} contests the red card`, '#9fe8ff');
  return true;
}
function varBribe(V) {
  const a = V.f.a; if (V.bribed || V.done) return;
  if ((a.charge || 0) < VAR.bribe) { floatText(a, `NEED ${VAR.bribe} CHARGE`, '#c8c8c8'); return; }
  a.charge -= VAR.bribe; V.bribed = true; M(a, 'bribes');
  const ok = Math.random() < clamp(0.45 + refOpinion(a) / 200, 0.2, 0.8);   // a referee who likes you takes the money more often
  if (ok) varResolve(V, true, 'bribe');
  else { V.mash = Math.max(0, V.mash - 5); addKarma(a, -10); floatText(a, 'BRIBE REFUSED!', '#ff8a8a'); feed(`The referee refused ${a.name}'s bribe`, '#ff8a8a'); }
}
function varResolve(V, ok, how) {
  V.done = ok ? 'overturned' : 'upheld'; V.how = how; V.show = 1.5;
  const a = V.f.a;
  if (ok) { feed(how === 'bribe' ? `VAR: "clear and obvious"… envelope accepted. ${a.name} gets a yellow instead` : `VAR: ${a.name} argued it down to a yellow`, '#ffd23f'); cheer('roar', a.x, how === 'bribe' ? 'BRIBED!' : 'OVERTURNED!'); }
  else { feed(`VAR: red card stands for ${a.name}`, '#ff4d4d'); cheer('boo', a.x, 'OFF YOU GO!'); }
  fxEvent(ok ? 'varok' : 'varno', a);
}
function updateVar(dt) {
  const V = S.varCheck, a = V.f.a, rt = dt / PACE;   // real seconds, whatever the game pace
  if (V.done) {
    V.show -= rt; if (V.show > 0) return;
    S.varCheck = null; V.f.varDone = true;
    if (V.done === 'overturned') { V.f.heavy = false; a.yellows = 0; }   // a yellow, not a second yellow
    callFoul(V.f, V.r); return;
  }
  V.t -= rt;
  for (const h of S.humans) {   // read everyone so stray presses don't queue up; only the offender counts
    const inp = readInput(h, dt);
    if (h !== a.human) continue;
    if (inp.foul) V.mash++;
    if (inp.item) varBribe(V);
  }
  if (V.bot) { V.mash += rt * rand(2.5, 6.5); if (!V.bribed && (a.charge || 0) >= VAR.bribe && Math.random() < rt * 0.6) varBribe(V); }
  if (!V.done && V.mash >= V.need) varResolve(V, true, 'argue');
  else if (!V.done && V.t <= 0) varResolve(V, false, '');
}
function drawVar() {
  const V = S.varCheck; if (!V) return;
  const a = V.f ? V.f.a : S.players[V.aid]; if (!a) return;
  const w = 460, h = 132, x = LW / 2 - w / 2, y = LH / 2 - 150;
  ctx.fillStyle = 'rgba(6,11,10,.92)'; rr(x, y, w, h, 12);
  ctx.strokeStyle = V.done === 'overturned' ? '#ffd23f' : V.done === 'upheld' ? '#ff4d4d' : '#9fe8ff'; ctx.lineWidth = 2; rrs(x + 1, y + 1, w - 2, h - 2, 12);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 34px ${DISP}`; ctx.fillStyle = '#9fe8ff'; ctx.fillText(V.done ? (V.done === 'overturned' ? 'OVERTURNED · YELLOW' : 'RED CARD STANDS') : 'VAR CHECK', LW / 2, y + 28);
  ctx.font = `600 16px ${UI}`; ctx.fillStyle = '#eef2e6'; ctx.fillText(`${a.name} contests a red card${V.bot ? '' : ''}`, LW / 2, y + 54);
  if (!V.done) {
    const keyOf = act => { const h = a.human; const m = h && h.map ? h.map : MAPSOLO; return keyLabel((m[act] || [])[0]); };
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x + 20, y + 70, w - 40, 12);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 20, y + 70, (w - 40) * clamp(V.mash / V.need, 0, 1), 12);
    ctx.fillStyle = '#ff6b6b'; ctx.fillRect(x + 20, y + 86, (w - 40) * clamp(V.t / VAR.time, 0, 1), 4);
    ctx.font = `600 15px ${UI}`; ctx.fillStyle = '#c9d3cb';
    ctx.fillText(V.bot ? 'The bot is arguing…' : `Mash [${keyOf('foul')}] to argue  ·  [${keyOf('item')}] bribe the ref (${VAR.bribe} charge)${V.bribed ? ' · refused' : ''}`, LW / 2, y + 110);
  }
  ctx.textBaseline = 'alphabetic';
}
const varSnap = () => { const V = S.varCheck; return V ? [V.f.a.id, Math.round(V.t * 10) / 10, Math.round(V.mash * 10) / 10, V.need, V.done === 'overturned' ? 1 : V.done === 'upheld' ? 2 : 0, V.bot ? 1 : 0, V.bribed ? 1 : 0] : 0; };
function varApply(v) {
  if (!v) { S.varCheck = null; return; }
  S.varCheck = { aid: v[0], f: { a: S.players[v[0]] }, t: v[1], mash: v[2], need: v[3], done: v[4] === 1 ? 'overturned' : v[4] === 2 ? 'upheld' : null, bot: !!v[5], bribed: !!v[6] };
}

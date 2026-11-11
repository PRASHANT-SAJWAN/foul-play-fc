/* Foul Play FC · js/mechanics/control.js
   Reading keyboard, touch and network input, steering, and human players.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- human control ---------------- */
function readInput(h, dt) {
  if (h.remote) {
    const r = (NET && NET.inputs[h.id]) || {}, c = r.c || {}, lc = h.lc || (h.lc = { ...c });
    const e = a => (c[a] || 0) > (lc[a] || 0);
    const out = { ix: clamp(+r.ix || 0, -1, 1), iy: clamp(+r.iy || 0, -1, 1), sprint: !!r.run, pass: e('pass'), lpass: e('lpass'), th: e('th'), passR: e('passR'), lpassR: e('lpassR'), thR: e('thR'), foul: e('foul'), atk: e('atk'), view: e('view'), s1: e('s1'), s2: e('s2'), ul: e('ul'), blind: e('blind'), item: e('item'), sp: e('sp'), sr: e('sr'), power: clamp(+r.pw || 0.5, 0.25, 1), taunt: e('taunt') ? clamp(Math.round(+r.tw || 0), 0, TAUNTS.length - 1) : -1 };
    h.lc = { ...c }; const held = CHARGE_KEYS.find(([, pk, rk]) => (c[pk] || 0) > (c[rk] || 0)); h.charging = !!held; h.chargeKind = held ? held[0] : null;
    if (h.charging) h.charge = Math.min(1, (h.charge || 0) + dt * 1.4); else h.charge = 0;
    return out;
  }
  return localInput(h, dt);
}
const AIM_KEYS = [['foul', 'atk', -1], ['skill1', 's1', 0], ['skill2', 's2', 1], ['ult', 'ul', 3]];   // action, input field, slot (-1 = base attack)
const CHARGE_KEYS = [['shoot', 'sp', 'sr'], ['pass', 'pass', 'passR'], ['lpass', 'lpass', 'lpassR'], ['through', 'th', 'thR']];
function localInput(h, dt) {
  const pr = a => (h.map[a] || []).some(c => keys.has(c)) || (h.touch && virt[a]);
  const edge = a => { const v = pr(a), e = v && !h.prev[a]; h.prev[a] = v; return e; };
  let ix = (pr('right') ? 1 : 0) - (pr('left') ? 1 : 0), iy = (pr('down') ? 1 : 0) - (pr('up') ? 1 : 0);
  if (h.touch && (virt.jx || virt.jy)) { ix = virt.jx; iy = virt.jy; }
  const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const out = { ix, iy, sprint: pr('sprint'), pass: false, lpass: false, th: false, passR: false, lpassR: false, thR: false, foul: edge('foul'), blind: edge('blind'), item: edge('item'), sp: false, sr: false, power: 0.25, taunt: -1,
    view: edge('view'), atk: false, s1: false, s2: false, ul: false };
  // attack, spells and ultimate: hold to aim (the guide shows who or where), release to strike or cast
  let aiming = null;
  for (const [a, rk, slot] of AIM_KEYS) {
    const v = pr(a), k = 'aim_' + a;
    if (v && !h.prev[k]) h.aimLast = slot;
    if (v && (aiming == null || h.aimLast === slot)) aiming = slot;
    else if (!v && h.prev[k]) out[rk] = true;
    h.prev[k] = v;
  }
  h.aiming = aiming;
  // taunt wheel: hold the taunt key, pick a direction, release
  if (pr('taunt')) { h.tauntOpen = true; const d = tauntFromDir(ix, iy); if (d >= 0) h.tauntSel = d; out.ix = out.iy = 0; out.sprint = false; }
  else if (h.tauntOpen) { h.tauntOpen = false; out.taunt = h.tauntSel != null ? h.tauntSel : 0; h.tauntSel = null; }
  // shoot and all three passes charge while held and fire on release; the press itself jumps, switches or tackles
  const chg = h.chg || (h.chg = {});
  let any = null;
  for (const [a, pk, rk] of CHARGE_KEYS) {
    const v = pr(a);
    if (v && !h.prev[a]) { out[pk] = true; chg[a] = 0; }
    if (v) { chg[a] = Math.min(1, (chg[a] || 0) + dt * 1.4); if (!any || chg[a] > chg[any]) any = a; }
    else if (h.prev[a]) { out[rk] = true; out.power = Math.max(0.25, chg[a] || 0); chg[a] = 0; }
    h.prev[a] = v;
  }
  h.charging = !!any; h.chargeKind = any; h.charge = any ? chg[any] : 0;
  return out;
}
// Low-sensitivity steering: your direction turns at a capped rate instead of snapping between the 8 key directions,
// so passes, shots, skills and fouls aim steadily, and a quick tap nudges the aim a few degrees.
const AIM_TURN = 5.5;   // radians per second while running; faster when standing still
const TURNAROUND = 2.4;   // asking for more than ~135° from your aim turns you straight round (a 180° turn)
function steerAim(p, ix, iy, dt) {
  if (p.aimA == null) p.aimA = p.face;
  const mag = Math.hypot(ix, iy);
  if (mag < 0.05) return [0, 0];
  const want = Math.atan2(iy, ix), d = angDiff(p.aimA, want);
  if (Math.abs(d) > TURNAROUND) { p.aimA = want; p.face = want; }   // pressing the opposite way: turn straight round
  else { const rate = (Math.hypot(p.vx, p.vy) < 40 ? 12 : AIM_TURN) * dt; p.aimA += clamp(d, -rate, rate); }
  p.aimA = Math.atan2(Math.sin(p.aimA), Math.cos(p.aimA));
  return [Math.cos(p.aimA) * mag, Math.sin(p.aimA) * mag];
}
function refNextTo(p) { return S.refs.some(r => !r.human && !(r.gone > 0) && r.carriedBy == null && !r.fly && dist(p, r) < 36); }
function humanControl(h, dt) {
  let p = S.players[h.pid];
  if (!p || !onPitch(p) || p.ko > 0) { switchToBest(h); p = S.players[h.pid]; }
  const inp = readInput(h, dt);
  if (p && onBench(p)) { if (inp.item) benchThrow(p); if (inp.taunt >= 0) doTaunt(p, inp.taunt); return; }   // locked to a benched player
  if (!p || !onPitch(p)) return;
  if (hasBf(p, 'confused')) { inp.ix = -inp.ix; inp.iy = -inp.iy; }
  const canAct = p.stun <= 0 && p.ko <= 0 && !(p.slide > 0) && !(p.slideRec > 0);
  const [mx, my] = canAct ? steerAim(p, inp.ix, inp.iy, dt) : [0, 0];
  p.dx = mx; p.dy = my; p.sprintWant = canAct && !!inp.sprint;
  if (inp.pass && !own0(p) && p.z <= 0) { h.arm = null; switchToBest(h); return; }
  if (!canAct) return;
  const own = S.ball.owner === p, air = p.z > 0;
  // a pass fires on release, and only if the key went down while you had the ball (so a switch never turns into a pass)
  for (const k of ['pass', 'lpass', 'th', 'sp']) if (inp[k]) h.arm = own ? k : null;
  if (air) {   // in the air: volley or head the ball
    if (inp.sp) p.airAct = { k: 'shoot', t: 0.4 };
    if (inp.pass || inp.th) p.airAct = { k: 'pass', t: 0.4 };
    if (inp.lpass) p.airAct = { k: 'lpass', t: 0.4 };
  } else {
    if (inp.lpass && !own) tackleMove(p);   // each character's own tackle (js/mechanics/combat.js)
    if (inp.th && !own) shortTackle(p);
    if (own && inp.passR && h.arm === 'pass') { humanPass(p, inp.power); h.arm = null; }
    if (own && inp.lpassR && h.arm === 'lpass') { humanLongPass(p, inp.power); h.arm = null; }
    if (own && inp.thR && h.arm === 'th') { throughBall(p, inp.power); h.arm = null; }
    if (inp.sr && own) { if (p.aimA != null) p.face = p.aimA; shoot(p, inp.power); }
    if (inp.sp && !own) jump(p);
  }
  if (inp.atk) baseAttack(p);
  if (inp.blind) doBlind(p, true);
  if (inp.item) { if (p.carry != null) throwRef(p); else if (!air && refNextTo(p)) liftRef(p); else useThrowable(p); }
  if (inp.s1) castSkill(p, 0); if (inp.s2) castSkill(p, 1); if (inp.ul) castSkill(p, 3);
  if (inp.taunt >= 0) doTaunt(p, inp.taunt);
}

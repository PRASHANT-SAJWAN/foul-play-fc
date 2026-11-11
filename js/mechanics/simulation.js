/* Foul Play FC · js/mechanics/simulation.js
   update(dt): the per-frame simulation (movement, ball physics, referees, collisions).
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

/* ---------------- update ---------------- */
function update(dt) {
  S.time += dt;
  S.excite = Math.max(0, Math.min(1.5, S.excite) - dt * 0.22);
  S.shake = Math.max(0, S.shake - dt * 20);
  for (const f of S.feed) f.t += dt;
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const q = S.parts[i]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.vz -= 500 * dt;
    if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.6; q.vy *= 0.6; }
    if (q.life <= 0) S.parts.splice(i, 1);
  }
  for (let i = S.texts.length - 1; i >= 0; i--) { const t = S.texts[i]; t.life -= dt; t.z += 30 * dt; if (t.life <= 0) S.texts.splice(i, 1); }
  for (let i = S.chants.length - 1; i >= 0; i--) { S.chants[i].life -= dt; if (S.chants[i].life <= 0) S.chants.splice(i, 1); }
  for (let i = S.bubbles.length - 1; i >= 0; i--) { S.bubbles[i].life -= dt; if (S.bubbles[i].life <= 0) S.bubbles.splice(i, 1); }
  if (crowdGain && AC) crowdGain.gain.setTargetAtTime(muted ? 0 : 0.02 + Math.min(1.2, S.excite) * 0.1, AC.currentTime, 0.3);
  if ((S.userPaused && !S.net) || S.phase === 'over') return;
  for (const r of S.refs) if (r.card) { r.card.t -= dt; if (r.card.t <= 0) r.card = null; }
  if (S.pause > 0) {
    if (REPLAY.active && REPLAY.active.t > 0 && S.humans.some(h => !h.remote && h.map && ['shoot', 'pass'].some(k => h.map[k].some(c => keys.has(c))))) S.pause = Math.min(S.pause, 0.3);
    S.pause -= dt / PACE;
    if (S.pause <= 0 && S.pauseCb) { const cb = S.pauseCb; S.pauseCb = null; cb(); }
    return;
  }
  if (S.shoot) updateShootout(dt);
  if (S.setPiece) { setPieceUpdate(dt); return; }
  if (!S.shoot) S.clock -= dt / PACE;
  if (S.clock <= 0 && !S.shoot) { S.clock = 0; if (clockExpired()) return; }

  S.heat = Math.max(0, S.heat - dt * 0.01);
  if (S.metrics) S.metrics.t += dt / PACE;
  for (const p of S.players) {
    for (const k of ['stun', 'foulCd', 'blindCd', 'pickCd', 'lunge', 'lungeCd', 'expect', 'hitT', 'diveDown', 'slideCd', 'slideRec', 'fireCd']) p[k] = Math.max(0, (p[k] || 0) - dt);
    if (p.slide > 0) { p.slide -= dt; if (p.slide <= 0) { p.slide = 0; p.slideRec = 0.35; } }
    if (p.airAct) { p.airAct.t -= dt; if (p.airAct.t <= 0 || p.z <= 0) p.airAct = null; }
    if (p.carry != null) { p.carryT += dt; if (S.ball.owner === p) loseBall(p, p.face); }
    if (p.dive > 0) { p.dive -= dt; if (p.dive <= 0) { p.dive = 0; p.diveDown = 0.6; } }
    if (p.ko > 0) { p.ko -= dt; if (p.ko <= 0) { p.hp = 55; p.stun = 0; if (loud(p)) feed(`${p.name} is back on their feet`); } }
    if (p.sentOff > 0) {
      p.sentOff -= dt;
      if (p.sentOff > 0 && !p.goneWhy) updateBench(p, dt);
      else if (p.sentOff <= 0) { if (p.goneWhy) anomReturn(p); else leaveBench(p); }
    }
    if (p.blind < 2) { p.blindT += dt; if (p.blindT >= 22) { p.blind++; p.blindT = 0; } }
    p.mood += clamp(-p.mood, -2 * dt, 2 * dt); p.animT = Math.max(0, p.animT - dt); if (p.animT <= 0) p.anim = '';
    if (S.ball.owner === p) addCharge(p, 5 * dt);
    trackFrame(p, dt / PACE);
    if (onPitch(p)) { p.cleanT += dt; if (p.cleanT >= 30) { p.cleanT = 0; addKarma(p, 5); M(p, 'cleanStreaks'); if (p.human) { cheer('applause', p.x, 'RESPECT!'); feed(`The crowd applauds ${p.name}'s clean play`, '#7dff9b'); } } }
    if (S.admin && S.admin.inf && p.human) { p.items.bat = Math.max(p.items.bat, 3); p.items.banana = Math.max(p.items.banana, 2); p.blind = 2; }
  }

  updatePowerups(dt); updateCrowdOpinion(dt); updateBounty(dt); updateAnomalies(dt); updateClasses(dt);
  const b = S.ball, info = [];
  for (let t = 0; t < 2; t++) {
    const attacking = !!(b.owner && b.owner.team === t);
    const cand = S.players.filter(p => p.team === t && able(p) && !p.gk).sort((p, q) => dist(p, b) - dist(q, b));
    info[t] = { attacking, chaser: attacking ? null : cand[0], second: attacking ? null : cand[1] };
  }
  for (const p of S.players) if (!p.human && onPitch(p)) { if (able(p)) botControl(p, dt, info); else p.dx = p.dy = 0; }
  for (const h of S.humans) humanControl(h, dt);

  // movement
  for (const p of S.players) {
    if (!onPitch(p)) continue;
    const down = p.stun > 0 || p.ko > 0;
    if (p.thrown) continue;
    let spd = 155 * (0.72 + 0.28 * p.hp / 100) * speedMul(p);
    if (b.owner === p) spd *= 0.9;
    if (p.slowT > 0) spd *= 0.4;
    const wk = wxKind();
    if (wk) spd *= 0.92;
    if (inInvasion(p)) spd *= 0.6;
    if (p.heatT > 0 && (p.dx || p.dy)) { const m = Math.hypot(p.dx, p.dy), a = Math.atan2(p.dy, p.dx) + Math.sin(S.time * 5 + p.id) * 0.9; p.dx = Math.cos(a) * m; p.dy = Math.sin(a) * m; spd *= 0.8; }
    if (p.freezeT > 0) { p.dx = p.dy = 0; }
    const superSprint = MUT.sprint;
    p.sprinting = !!(p.sprintWant && p.stamina > 2 && !down && (p.dx || p.dy));
    if (p.sprinting) { spd *= superSprint ? 1.8 : 1.4; const ds = Math.min(p.stamina, (superSprint ? 13 : 26) * (wk === 'heat' ? 2 : 1) * dt); p.stamina -= ds; M(p, 'staminaUsed', ds); }
    else if (!down) p.stamina = Math.min(p.staminaMax, p.stamina + ((p.dx || p.dy) ? 10 : 18) * (wk === 'heat' ? 0.5 : 1) * dt);
    if (p.carry != null) spd *= 0.8;
    if (p.lunge > 0 && !down) { spd = 320; p.dx = Math.cos(p.face); p.dy = Math.sin(p.face); }
    if (p.slide > 0 && !down) { spd = 150 + 380 * Math.min(1, p.slide / 0.5); p.dx = Math.cos(p.slideA); p.dy = Math.sin(p.slideA); }
    else if (p.slideRec > 0) { p.dx = p.dy = 0; }
    if (down) { p.vx *= Math.exp(-5 * dt); p.vy *= Math.exp(-5 * dt); }
    else {
      const want = Math.hypot(p.dx, p.dy) * spd, cur = Math.hypot(p.vx, p.vy);
      const turn = cur > 60 && want > 0 ? (p.vx * p.dx + p.vy * p.dy) / (cur * Math.hypot(p.dx, p.dy)) : 1;   // cosine of the turn
      const grip = (want > cur ? 7.5 : 11) * (turn < 0 ? 0.55 : turn < 0.5 ? 0.8 : 1) * (p.sprinting ? 0.85 : 1);   // slower to speed up than to stop; sharp turns at pace take longer
      const k = Math.min(1, dt * (p.lunge > 0 || p.slide > 0 ? 20 : p.z > 0 ? 1.5 : wk === 'ice' ? 2 : grip));
      p.vx += (p.dx * spd - p.vx) * k; p.vy += (p.dy * spd - p.vy) * k;
      if (p.dx || p.dy) p.face += angDiff(p.face, Math.atan2(p.dy, p.dx)) * Math.min(1, dt * 14);
    }
    if (p.dash && !down) { p.vx = p.dash.vx; p.vy = p.dash.vy; }
    if (p.dive > 0) { p.vx = p.diveVx; p.vy = p.diveVy; } else if (p.diveDown > 0) { p.vx *= Math.exp(-8 * dt); p.vy *= Math.exp(-8 * dt); }
    p.x = clamp(p.x + p.vx * dt, 8, W - 8); p.y = clamp(p.y + p.vy * dt, 8, H - 8);
    if (p.z > 0 || p.vz > 0) { p.z += p.vz * dt; p.vz -= GRAV() * dt; if (p.z <= 0) { p.z = 0; p.vz = 0; p.airAct = null; } }
    slideContacts(p); airStrike(p);
    p.run += Math.hypot(p.vx, p.vy) * dt * 0.09; M(p, 'distance', Math.hypot(p.vx, p.vy) * dt / 10);
  }
  const act = S.players.filter(onPitch);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i], c = act[j], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 16 && Math.abs((a.z || 0) - (c.z || 0)) < 20 && !(a.slide > 0) && !(c.slide > 0)) { const o = (16 - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * o; a.y -= uy * o; c.x += ux * o; c.y += uy * o; }
  }

  // referees
  applyRefVis();
  for (const r of S.refs) {
    if (r.gone > 0) { r.gone -= dt; if (r.gone <= 0) refReturn(r); continue; }
    if (refHeld(r)) continue;
    if (updateRefCarry(r, dt)) { r.blind = Math.max(0, r.blind - dt); continue; }
    r.blind = Math.max(0, r.blind - dt); r.attT -= dt; r.scanT -= dt;
    if (r.human && S.refHuman) { humanRef(r, dt); continue; }
    // the first referee watches from behind and to the far side of play, the second from ahead and to the near side
    const ang = -2.35;   // behind and to the far side of the ball
    let tx = clamp(b.x + Math.cos(ang) * REF_DIST, 25, W - 25), ty = clamp(b.y + Math.sin(ang) * REF_DIST, 25, H - 25);
    let sp = REF_SPEED;
    if (r.blind > 0) { tx = r.x + Math.cos(S.time * 1.7 + r.seed) * 30; ty = r.y + Math.sin(S.time * 1.3 + r.seed) * 30; r.face += dt * 1.6; sp = 30; }
    else {
      if (r.scanT <= 0) { r.scanT = rand(3, 6); const q = pick(S.players.filter(onPitch)); if (q) { r.att = { x: q.x, y: q.y }; r.attT = 0.8; } }
      const look = r.attT > 0 && r.att ? r.att : b;
      r.face += clamp(angDiff(r.face, Math.atan2(look.y - r.y, look.x - r.x)), -3 * dt, 3 * dt);
    }
    const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
    if (d > 4) { const m = Math.min(sp, d * 3) * dt; r.x += dx / d * m; r.y += dy / d * m; r.run += m * 0.09; }
  }

  // ball
  if (b.owner) {
    const o = b.owner;
    if (!onPitch(o) || o.stun > 0 || o.ko > 0 || o.carry != null) loseBall(o, o.face);
    else {
      const tch = 11 + (o.sprinting ? 5 : 0) + Math.max(0, Math.sin(o.run * 1.6)) * 3.5 * Math.min(1, Math.hypot(o.vx, o.vy) / 120);
      b.x = clamp(o.x + Math.cos(o.face) * tch, 2, W - 2); b.y = clamp(o.y + Math.sin(o.face) * tch, 2, H - 2); b.z = 0; b.vx = o.vx; b.vy = o.vy;
      b.spin += Math.hypot(o.vx, o.vy) * dt * 0.2;
      for (const p of S.players) {
        if (p.team === o.team || !canBall(p) || p.slide > 0 || p.z > 10 || p.pickCd > 0 || dist(p, b) > 15) continue;
        if (o.bf && o.bf.timeRush > 0) continue;   // Time Rush: nobody can take it off you
        const rate = tackleMul(p, o) * (p.lunge > 0 ? 6 : 1.4) * (p.gk ? 2 : 1) * (p.mood <= MOOD_TILT ? 0.8 : 1) * (o.fx && o.fx.magnet > 0 ? 0.5 : 1) * (p.firedUpAt === o && p.firedUpT > 0 ? 1.2 : 1);
        if (Math.random() < rate * dt) {
          if (hasBf(o, 'speedDribble')) { p.stun = Math.max(p.stun, 1); floatText(p, 'TOO FAST', '#ffcc22'); continue; }
          b.owner = p; b.lastTouch = p; o.pickCd = 0.7; o.hold = 0; p.hold = 0; p.stats.tackles++; addPop(p, 3); addMood(p, 5); crowdEvent(p.team, { perf: 3 }); bountyCollect(p, o); EV('tackle', p, { from: o.name }); addCharge(p, 8); addKarma(p, 2); if (p.lunge > 0) cheer('roar', p.x, 'WHAT A TACKLE!');
          if (p.lunge > 0) { floatText(p, 'TACKLE', '#ffffff'); whack(o, 'tackle'); } thump(140, 0.15, 0.08);
          break;
        }
      }
    }
  } else {
    if (b.curve && b.z > 0 && b.curve.t > 0) { b.curve.t -= dt; b.vx += b.curve.ax * dt; b.vy += b.curve.ay * dt; }   // spin bends the flight
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.vz -= GRAV() * dt;
    b.spin += Math.hypot(b.vx, b.vy) * dt * 0.2;
    if (b.z <= 0) { b.z = 0; b.curve = null; if (b.vz < -90) { b.vz = -b.vz * 0.52; b.vx *= 0.86; b.vy *= 0.86; } else b.vz = 0; }   // bounce: loses height and pace
    const ice = wxKind() === 'ice', fr = b.z > 0 ? AIR_K : ice ? 0.4 : 1.1; b.vx *= Math.exp(-fr * dt); b.vy *= Math.exp(-fr * dt);
    if (b.z <= 0) { const v0 = Math.hypot(b.vx, b.vy), roll = (ice ? 4 : 16) * dt; if (v0 <= roll) b.vx = b.vy = 0; else { b.vx -= b.vx / v0 * roll; b.vy -= b.vy / v0 * roll; } }   // rolling resistance brings it to a stop
    bodyBlock(b);
    if (b.y < 4) { b.y = 4; b.vy = Math.abs(b.vy) * 0.7; }
    if (b.y > H - 4) { b.y = H - 4; b.vy = -Math.abs(b.vy) * 0.7; }
    if (b.x < 0) woodwork(b, 0); else if (b.x > W) woodwork(b, 1);
    const mouth = Math.abs(b.y - H / 2) < GOAL_HALF;
    if (b.x < 0) { if (mouth && b.z < GOAL_H) { goal(1); return; } b.x = 0; b.vx = Math.abs(b.vx) * 0.6; }
    if (b.x > W) { if (mouth && b.z < GOAL_H) { goal(0); return; } b.x = W; b.vx = -Math.abs(b.vx) * 0.6; }
    let best = null, bd = 1e9;
    for (const p of S.players) {
      if (!canBall(p) || p.pickCd > 0 || p.slide > 0 || p.airAct || p.thrown) continue;
      const rival = b.lastTouch && b.lastTouch.team !== p.team;
      if (b.pierce && rival) continue;                                        // a pass that can't be intercepted
      if (p.gk && b.unstoppable > S.time && rival) continue;                  // Meteor Volley: the keeper can't hold it
      const rm = p.gk ? (p.cls === 'goalkeeper' ? 1.3 : 1) * (hasBf(p, 'wideGuard') ? 1.8 : 1) : (p.cls === 'defender' ? 1.2 : 1);
      const d = dist(p, b), r = ((p.gk ? (p.dive > 0 ? 34 : 20) : 14) + (S.megaBall > 0 ? 8 : 0)) * rm, zr = (p.gk ? GOAL_H + (p.dive > 0 ? 14 : 0) : 20) + (S.megaBall > 0 ? 10 : 0) + (p.z || 0) * 1.4 + (hasBf(p, 'grab') ? 40 : 0);
      if (d < r && b.z < zr && d < bd) { bd = d; best = p; }
    }
    if (best) {
      const p = best, sp = Math.hypot(b.vx, b.vy);
      if (!p.gk && sp > 520) { b.vx *= -0.3; b.vy = rand(-150, 150); b.vz = 80; p.pickCd = 0.3; b.lastTouch = p; }
      else {
        if (p.gk && sp > 300 && b.lastTouch && b.lastTouch.team !== p.team) { p.stats.saves++; addPop(p, 8); addMood(p, 15); crowdEvent(p.team, { perf: 6, drama: 4 }); fxEvent('save', p); addCharge(p, 15); cheer('applause', p.x, 'GREAT SAVE!'); if (b.shotBy && b.shotBy.team !== p.team && S.time - b.shotT < 3) M(b.shotBy, 'shotsOnTarget'); EV('save', p, { shooter: b.lastTouch.name }); floatText(p, 'SAVE!', '#ffffff'); S.excite += 0.35; if (loud(p, b.lastTouch)) feed(`Big save by ${p.name}`); }
        if (b.lastPasser && b.lastPasser.team === p.team && b.lastPasser !== p && S.time - b.passTime < 3) { addPop(b.lastPasser, 1); addCharge(b.lastPasser, 4); M(b.lastPasser, 'passesCompleted'); }
        if (b.lastPasser && b.lastPasser.team !== p.team && S.time - b.passTime < 3) { M(p, 'interceptions'); EV('interception', p, { from: b.lastPasser.name }); }
        if (b.lastPasser && b.lastPasser.team === p.team && b.lastPasser !== p && S.time - b.passTime < 3) { if (b.lastPasser.cls === 'playmaker') BF(p, 'boost', 2); if (hasBf(p, 'assistMark')) { BF(p, 'assist', 3); p.bf.assistMark = 0; floatText(p, 'ASSISTED', '#3a7bff'); } }
        b.owner = p; b.lastTouch = p; p.hold = 0; b.z = 0; b.vz = 0; b.curve = null; b.pierce = 0;
      }
    }
  }

  // items thrown from the crowd
  for (let i = S.items.length - 1; i >= 0; i--) {
    const it = S.items[i];
    if (!it.landed) {
      it.t += dt; const u = Math.min(1, it.t / it.dur);
      it.x = it.sx + (it.tx - it.sx) * u; it.y = it.sy + (it.ty - it.sy) * u; it.z = (1 - u) * 30 + 200 * u * (1 - u);
      if (u >= 1) { it.landed = true; it.z = 0; burst(it.x, it.y, '#d9e8c0', 6, 2); }
    } else {
      it.age += dt;
      if (it.age > 18) { S.items.splice(i, 1); continue; }
      const p = S.players.find(q => able(q) && dist(q, it) < 15 && (it.age > 1.5 || q === it.for));
      if (p) { pickup(p, it); S.items.splice(i, 1); }
    }
  }
  // bananas on the pitch
  for (let i = S.bananas.length - 1; i >= 0; i--) {
    const n = S.bananas[i]; n.ttl -= dt; n.imm -= dt;
    if (n.ttl <= 0) { S.bananas.splice(i, 1); continue; }
    const p = S.players.find(q => able(q) && dist(q, n) < 12 && (n.imm <= 0 || q !== n.owner));
    if (p) {
      p.stun = 1.5; p.vx *= 1.6; p.vy *= 1.6; loseBall(p, p.face); floatText(p, 'SLIP!', '#ffe14d'); p.anim = 'fall'; p.animT = 0.6;
      if (Math.random() < 0.2) injure(p, 8, n.owner); crowdEvent(p.team, { noob: n.owner === p ? 10 : 4, fun: 4 });
      M(p, 'slips'); if (n.owner && n.owner !== p) M(n.owner, 'bananaVictims'); EV('slip', p, { banana: n.owner ? n.owner.name : 'the banana rain' });
      if (n.owner && n.owner.team !== p.team) addPop(n.owner, 4);
      if (loud(p, n.owner)) feed(`${p.name} slipped on ${!n.owner ? 'a falling' : n.owner === p ? 'their own' : n.owner.name + "'s"} banana`, '#ffe14d');
      S.excite += 0.2; S.bananas.splice(i, 1);
    }
  }
  // fouls waiting to be spotted
  for (let i = S.pend.length - 1; i >= 0; i--) {
    const f = S.pend[i]; f.ttl -= dt;
    if (S.refHuman && (sees(S.refs[0], f.a.x, f.a.y) || sees(S.refs[0], f.x, f.y))) f.seenH = true;
    const r = onPitch(f.a) && !refIgnores(f.a) ? S.refs.find(r => !r.human && (sees(r, f.a.x, f.a.y) || sees(r, f.x, f.y))) : null;
    if (r) {
      S.pend.splice(i, 1);
      const why = leniency(f);
      if (why) { waveOff(f, why, r); continue; }
      callFoul(f, r); return;
    }
    if (f.ttl <= 0) {
      S.pend.splice(i, 1);
      if (f.seenH && S.refHuman) { S.refHuman.missed++; feed(`Missed call: ${f.a.name}'s ${FOUL_NAME[f.kind]} happened in your view`, '#ffb36b'); }
      const gain = { foul: f.mate ? 2 : 5, kick: f.mate ? 3 : 7, ko: 8, blind: 6, banana: 2, throw: 3 }[f.kind] || 3;
      M(f.a, ['foul', 'kick', 'ko'].includes(f.kind) ? 'unseen' : 'sneakyUnseen');
      crowdEvent(f.a.team, { vill: 3, fun: 2 }); EV('unseen', f.a, { kind: f.kind });
      addPop(f.a, gain); floatText(f.a, 'UNSEEN +' + gain, '#ffd23f');
      S.recentUnseen.push(Object.assign({}, f, { time: S.time })); if (S.recentUnseen.length > 6) S.recentUnseen.shift();
      if (f.t) bountyCollect(f.a, f.t);
      if (!f.a.human && f.a.karma < 0 && Math.random() < 0.3) doTaunt(f.a, 1);
      if (loud(f.a) && f.kind !== 'banana') feed(`Unseen! ${f.a.name} got away with it`, '#ffd23f');
    }
  }
  // human foul targets
  for (const h of S.humans) {
    const p = S.players[h.pid]; if (!p) continue;
    const a = p.aimA != null ? p.aimA : p.face, score = q => Math.abs(angDiff(a, Math.atan2(q.y - p.y, q.x - p.x))) * 40 + dist(q, p);
    p.target = inReach(p).sort((u, v) => score(u) - score(v))[0] || null;
  }
}

/* Foul Play FC · anomalies.js
   Random anomalies (crowd fights, UFOs, pirates, pitch invasions, heatwaves, ice ages) and their drawing.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------- anomalies: random chaos events during a match ---------- */
const ANOM_LIST = [
  ['brawl', 'Crowd fights', 'Fans in one stand start a shouting match that rattles nearby players, and it can turn into a brawl, with junk flying onto the pitch.'],
  ['ufo', 'Alien abduction', 'A UFO beams up a random player, or the referee, for 15 seconds. No referee means no fouls get seen.'],
  ['pirates', 'Pirates', 'Two pirates storm the pitch to kidnap or clobber players. Sprint or lunge into one to knock them over.'],
  ['invasion', 'Pitch invasion', 'Fans flood one part of the pitch for about 16 seconds. Everyone wades through them, and they kick the ball about.'],
  ['heat', 'Heatwave', 'For 20 seconds stamina drains twice as fast and refills at half speed; two players get heatstroke and stagger about.'],
  ['ice', 'Ice age', 'For 20 seconds the pitch freezes: players slide, the ball skids further, sprinters can slip and two players freeze solid.']];
const ANOM_NAME = Object.fromEntries(ANOM_LIST.map(a => [a[0], a[1]]));
const ANOM_LEVELS = [['Off', 0], ['Rare', 80], ['Normal', 50], ['Frequent', 30], ['Chaos', 16]];   // average seconds between anomalies
let ANOM_PREF = (() => {
  const v = store.get('fpfc-anom'), o = v && typeof v === 'object' ? v : {}, on = {};
  for (const [k] of ANOM_LIST) on[k] = !(o.on && o.on[k] === false);
  return { level: Number.isInteger(o.level) && o.level >= 0 && o.level < ANOM_LEVELS.length ? o.level : 2, on };
})();
function setAnomPref(level, on) { if (level != null) ANOM_PREF.level = level; if (on) ANOM_PREF.on = on; store.set('fpfc-anom', ANOM_PREF); if (S.an) S.an.lvl = -1; }
const newAnomState = () => ({ next: 0, max: 0, lvl: -1, cur: null, ufo: null, pir: [], inv: [], zone: null, wx: null, br: null, junk: [] });
const anomBusy = k => { const A = S.an; return !!A && (k === 'ufo' ? !!A.ufo : k === 'pirates' ? A.pir.length > 0 : k === 'invasion' ? A.inv.length > 0 || !!A.zone : k === 'heat' || k === 'ice' ? !!A.wx && A.wx.k === k : k === 'brawl' ? !!A.br : false); };
const anomAny = () => ANOM_LIST.some(([k]) => anomBusy(k));
const anomAuto = () => S.phase === 'play' && S.mode !== 'playground' && S.mode !== 'client' && !S.shoot && !S.golden;
const wxKind = () => S.an && S.an.wx ? S.an.wx.k : null;
const inInvasion = p => { const z = S.an && S.an.zone; return !!z && p.x > z.x0 && p.x < z.x1 && p.y > z.y0 && p.y < z.y1; };
const ufoTarget = u => u ? (u.tk === 'r' ? S.refs[u.ti] : S.players[u.ti]) : null;
const liftOf = e => { const u = S.an && S.an.ufo; return u && u.ph === 'beam' && ufoTarget(u) === e ? u.lift * 70 : 0; };
const refHeld = r => { const u = S.an && S.an.ufo; return !!u && u.ph === 'beam' && u.tk === 'r' && S.refs[u.ti] === r; };
const FAN_SHIRTS = ['#3fa9ff', '#ff6a3d', '#ffd23f', '#f4f4f0', '#5ccf6a', '#c9a0ff', '#ff4d6d', '#1f5f99'];

function updateAnomalies(dt) {
  const A = S.an; if (!A) return;
  const base = ANOM_LEVELS[ANOM_PREF.level][1];
  if (A.lvl !== ANOM_PREF.level) { A.lvl = ANOM_PREF.level; A.max = A.next = base ? base * rand(0.6, 1.4) : 0; }
  if (base && anomAuto() && !anomAny()) {
    A.next -= dt;
    if (A.next <= 0) {
      const pool = ANOM_LIST.map(a => a[0]).filter(k => ANOM_PREF.on[k]);
      if (pool.length) startAnomaly(pick(pool));
      A.max = A.next = base * rand(0.6, 1.4);
    }
  }
  updateUfo(dt); updatePirates(dt); updateInvasion(dt); updateWeather(dt); updateBrawl(dt); updateJunk(dt);
  if (A.cur && !anomBusy(A.cur.k)) A.cur = null;
  for (const p of S.players) { if (p.iceT > 0) p.iceT -= dt; if (p.heatT > 0) p.heatT -= dt; }
}
function startAnomaly(k) {
  const A = S.an; if (!A || ((k === 'heat' || k === 'ice') ? !!A.wx : anomBusy(k))) return false;
  const ok = { ufo: startUfo, pirates: startPirates, invasion: startInvasion, heat: () => startWeather('heat'), ice: () => startWeather('ice'), brawl: startBrawl }[k];
  if (!ok || ok() === false) return false;
  A.cur = { k, t: 0 }; S.excite += 0.4; sfx('whoosh');
  crowdEvent(0, { drama: 5 }); crowdEvent(1, { drama: 5 });
  if (S.metrics) { S.metrics.anomalies = (S.metrics.anomalies || 0) + 1; EV('anomaly', null, { kind: k }); }
  return true;
}

/* UFO: flies over a target, beams them up, and they come back 15 s later */
function startUfo() {
  const r0 = S.refs[0], refOk = r0 && !r0.human && !(r0.gone > 0) && !MUT.noRef && Math.random() < 0.3;
  let tk = 'r', ti = 0;
  if (!refOk) { const c = S.players.filter(p => onPitch(p) && !p.gk && !(p.heatT > 0)); if (!c.length) return false; tk = 'p'; ti = pick(c).id; }
  const side = Math.random() < 0.5;
  S.an.ufo = { x: side ? -260 : W + 260, y: rand(H * 0.2, H * 0.8), z: 320, ph: 'in', t: 0, tk, ti, beam: 0, lift: 0 };
  feed('A UFO is hovering over the stadium!', '#9dffb8'); cheer('roar', W / 2, 'UFO!');
}
function updateUfo(dt) {
  const u = S.an.ufo; if (!u) return; u.t += dt;
  const T = ufoTarget(u);
  if (u.ph === 'in') {
    if (!T || (u.tk === 'p' ? !onPitch(T) : T.gone > 0) || u.t > 10) { u.ph = 'out'; u.t = 0; return; }
    const dx = T.x - u.x, dy = T.y - u.y, d = Math.hypot(dx, dy), m = Math.min(d, (d > 200 ? 520 : 260) * dt);
    if (d > 1) { u.x += dx / d * m; u.y += dy / d * m; }
    u.z += (140 - u.z) * Math.min(1, dt * 1.5);
    if (d < 10) { u.ph = 'beam'; u.t = 0; feed(`The UFO locks its tractor beam on ${T.name}!`, '#9dffb8'); sfx('whoosh'); }
  } else if (u.ph === 'beam') {
    u.beam = Math.min(1, u.beam + dt * 2.5); u.lift = Math.min(1, u.t / 1.8);
    if (!T) { u.ph = 'out'; u.t = 0; return; }
    if (u.tk === 'p') { T.freezeT = Math.max(T.freezeT, 0.25); if (S.ball.owner === T) loseBall(T, T.face); }
    T.x += (u.x - T.x) * Math.min(1, dt * 5); T.y += (u.y - T.y) * Math.min(1, dt * 5); T.vx = T.vy = 0;
    if (u.t >= 1.8) {
      if (u.tk === 'p') {
        T.sentOff = 15; T.goneWhy = 'ufo'; T.stun = 0; T.ko = 0; T.target = null; addMood(T, -12);
        crowdEvent(T.team, { drama: 10, symp: 6, fun: 6 }); EV('abducted', T);
        feed(`${T.name} has been abducted by aliens! Back in 15 seconds`, '#9dffb8');
      } else {
        T.gone = 15; T.card = null;
        feed('The referee has been abducted! No fouls can be seen for 15 seconds', '#9dffb8');
        crowdEvent(0, { drama: 8, fun: 6 }); crowdEvent(1, { drama: 8, fun: 6 });
      }
      burst(u.x, u.y, '#9dffb8', 22, 40); cheer('roar', u.x, 'ABDUCTED!'); S.excite += 0.5;
      u.ph = 'out'; u.t = 0; u.lift = 0;
    }
  } else {   // flying away
    u.beam = Math.max(0, u.beam - dt * 3); u.z += 260 * dt; u.x += (u.x < W / 2 ? -1 : 1) * 380 * dt;
    if (u.t > 2.6) S.an.ufo = null;
  }
}
function anomReturn(p) {   // an abducted or kidnapped player comes back
  const why = p.goneWhy; p.goneWhy = '';
  if (why === 'ufo') {
    p.x = rand(W * 0.2, W * 0.8); p.y = rand(H * 0.2, H * 0.8); p.vx = p.vy = 0; p.stun = 1.4; a0Anim(p, 'facepalm', 1);
    burst(p.x, p.y, '#9dffb8', 18, 30); floatText(p, 'BACK FROM SPACE', '#9dffb8'); feed(`The aliens dropped ${p.name} back on the pitch, slightly probed`, '#9dffb8');
  } else {
    p.x = p.team === 0 ? W * 0.3 : W * 0.7; p.y = H - 10; p.vx = p.vy = 0; addMood(p, -6);
    floatText(p, 'ESCAPED!', '#ff9f43'); feed(`${p.name} escaped from the pirates`, '#ff9f43');
  }
}
function refReturn(r) {
  r.gone = 0; r.x = rand(W * 0.3, W * 0.7); r.y = rand(H * 0.25, H * 0.75); r.blind = 1.5;
  burst(r.x, r.y, '#9dffb8', 18, 30); feed('The referee is back from space, and a little dizzy', '#9dffb8'); whistle(1);
}

/* pirates: run on, then either drag a player off the pitch or clobber two players */
function startPirates() {
  const victims = S.players.filter(p => onPitch(p) && !p.gk).sort(() => Math.random() - 0.5).slice(0, 2);
  if (!victims.length) return false;
  victims.forEach(v => {
    const top = v.y < H / 2;
    S.an.pir.push({ x: clamp(v.x + rand(-140, 140), 20, W - 20), y: top ? -30 : H + 30, face: top ? Math.PI / 2 : -Math.PI / 2, run: 0, mode: Math.random() < 0.5 ? 'grab' : 'bonk', ti: v.id, st: 'in', t: 0, hits: 0, ex: top ? -50 : H + 50 });
  });
  feed('Pirates have stormed the pitch! Sprint into them to knock them over', '#ff9f43'); cheer('roar', W / 2, 'PIRATES!');
}
function knockPirate(q, hero) {
  const v = q.st === 'drag' ? S.players[q.ti] : null;
  q.st = 'down'; q.t = 0; burst(q.x, q.y, '#ff9f43', 14, 26); thump(120, 0.2, 0.1); floatText(hero, 'PIRATE DOWN!', '#ff9f43');
  addPop(hero, 6); addMood(hero, 10); addKarma(hero, 3); crowdEvent(hero.team, { perf: 3, symp: 3, drama: 5, fun: 4 }); EV('pirate', hero);
  if (v) { v.freezeT = 0; floatText(v, 'RESCUED!', '#7dff9b'); cheer('applause', hero.x, 'HERO!'); feed(`${hero.name} rescued ${v.name} from the pirates!`, '#7dff9b'); addMood(v, 8); }
  else feed(`${hero.name} flattened a pirate`, '#ff9f43');
}
function updatePirates(dt) {
  const L = S.an.pir;
  for (let i = L.length - 1; i >= 0; i--) {
    const q = L[i]; q.t += dt;
    const go = (tx, ty, sp) => { const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy); if (d > 2) { const m = Math.min(d, sp * dt); q.x += dx / d * m; q.y += dy / d * m; q.face = Math.atan2(dy, dx); q.run += m * 0.09; q.mv = 1; } else q.mv = 0; return d; };
    if (q.st === 'down') { q.mv = 0; if (q.t > 1.6) { q.st = 'out'; q.t = 0; } continue; }
    if (q.st === 'out') { if (go(q.x, q.ex, 210) < 6 || q.t > 7) L.splice(i, 1); continue; }
    const hero = S.players.find(p => able(p) && p.id !== q.ti && (p.sprinting || p.lunge > 0) && dist(p, q) < 20);
    if (hero && q.t > 0.6) { knockPirate(q, hero); continue; }
    const v = S.players[q.ti];
    if (!v || !onPitch(v) || q.t > 16) { q.st = 'out'; q.t = 0; continue; }
    if (q.st === 'in') {
      if (go(v.x, v.y, 185) < 16) {
        if (q.mode === 'bonk') {
          v.hp = Math.max(1, v.hp - 14); v.stun = Math.max(v.stun, 1.3); v.hitT = 2; if (S.ball.owner === v) loseBall(v, v.face);
          if (Math.random() < 0.35) injure(v, 10, null); addMood(v, -8); a0Anim(v, 'fall', 0.6);
          floatText(v, 'BONK!', '#ff9f43'); burst(v.x, v.y, '#ffd23f', 10, 22); thump(90, 0.2, 0.12); crowdEvent(v.team, { symp: 5, drama: 4 });
          if (loud(v)) feed(`A pirate clobbered ${v.name}`, '#ff9f43');
          q.hits++;
          const next = S.players.filter(p => onPitch(p) && !p.gk && p !== v).sort((a, b) => dist(a, q) - dist(b, q))[0];
          if (q.hits >= 2 || !next) { q.st = 'out'; q.t = 0; } else { q.ti = next.id; q.t = 0; }
        } else {
          q.st = 'drag'; q.t = 0; if (S.ball.owner === v) loseBall(v, v.face);
          feed(`Pirates are dragging ${v.name} off the pitch! Sprint into them to rescue`, '#ff9f43'); floatText(v, 'HELP!', '#ff9f43');
        }
      }
    } else if (q.st === 'drag') {
      go(q.x, q.ex, 68);
      v.freezeT = Math.max(v.freezeT, 0.25); v.vx = v.vy = 0;
      v.x = clamp(q.x - Math.cos(q.face) * 12, 8, W - 8); v.y = clamp(q.y - Math.sin(q.face) * 12, 8, H - 8);
      if (q.y < -8 || q.y > H + 8) {
        v.sentOff = 12; v.goneWhy = 'pir'; v.target = null; addMood(v, -12); crowdEvent(v.team, { symp: 8, drama: 8 }); EV('kidnapped', v);
        feed(`${v.name} has been kidnapped by pirates! Back in 12 seconds`, '#ff9f43'); cheer('boo', q.x, 'KIDNAPPED!');
        q.st = 'out'; q.t = 0;
      }
    }
  }
}
function anomRescueTarget(p) {   // the nearest team-mate chases a pirate dragging one of their own
  for (const q of (S.an && S.an.pir) || []) {
    if (q.st !== 'drag') continue;
    const v = S.players[q.ti]; if (!v || v.team !== p.team) continue;
    const near = S.players.filter(o => o.team === p.team && !o.gk && !o.human && able(o) && o !== v).sort((a, b) => dist(a, q) - dist(b, q))[0];
    if (near === p) return q;
  }
  return null;
}

/* pitch invasion: fans mill about in one zone, slow everyone down and kick the ball */
function startInvasion() {
  const w = W * 0.3, h = H * 0.55, x0 = rand(W * 0.12, W * 0.88 - w), top = Math.random() < 0.5, y0 = top ? 0 : H - h;
  S.an.zone = { x0, y0, x1: x0 + w, y1: y0 + h, t: 0, d: 16 };
  for (let i = 0; i < 9; i++) S.an.inv.push({ x: rand(x0, x0 + w), y: top ? -20 - rand(0, 50) : H + 20 + rand(0, 50), tx: rand(x0, x0 + w), ty: rand(y0, y0 + h), face: 0, run: rand(0, 6), col: pick(FAN_SHIRTS), hair: pick(HAIR), skin: pick(SKIN), st: 'in', ex: top ? -60 : H + 60, kickCd: rand(0, 2), mv: 1 });
  feed('Pitch invasion! Fans are running all over one end', '#ffd23f'); cheer('roar', x0 + w / 2, 'PITCH INVASION!');
}
function updateInvasion(dt) {
  const A = S.an, z = A.zone;
  if (z) { z.t += dt; if (z.t > z.d) { for (const f of A.inv) f.st = 'out'; A.zone = null; feed('Stewards clear the fans off the pitch', '#ffd23f'); } }
  const b = S.ball;
  for (let i = A.inv.length - 1; i >= 0; i--) {
    const f = A.inv[i]; f.kickCd -= dt;
    const tx = f.st === 'out' ? f.x : f.tx, ty = f.st === 'out' ? f.ex : f.ty, sp = f.st === 'out' ? 200 : 120;
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    if (d > 3) { const m = Math.min(d, sp * dt); f.x += dx / d * m; f.y += dy / d * m; f.face = Math.atan2(dy, dx); f.run += m * 0.09; f.mv = 1; }
    else if (f.st === 'out') { A.inv.splice(i, 1); continue; }
    else if (z) { f.tx = rand(z.x0, z.x1); f.ty = rand(z.y0, z.y1); f.st = 'mill'; }
    if (f.st !== 'out' && f.kickCd <= 0 && dist(f, b) < 16 && (b.z || 0) < 20) {   // a fan has a go at the ball
      f.kickCd = 2.5; const o = b.owner; if (o) { loseBall(o, o.face); o.pickCd = 0.5; floatText(o, 'FAN TACKLE!', '#ffd23f'); }
      const a = rand(0, Math.PI * 2), sp2 = rand(220, 420); b.owner = null; b.vx = Math.cos(a) * sp2; b.vy = Math.sin(a) * sp2; b.vz = rand(60, 200); b.z = Math.max(b.z || 0, 1);
      cheer('roar', f.x, 'OLÉ!'); S.excite += 0.15;
    }
    for (const p of S.players) if (onPitch(p)) { const ddx = p.x - f.x, ddy = p.y - f.y, dd = Math.hypot(ddx, ddy); if (dd > 0 && dd < 14) { p.x += ddx / dd * (14 - dd) * 0.5; p.y += ddy / dd * (14 - dd) * 0.5; } }
  }
}

/* weather: heatwave and ice age */
function startWeather(k) {
  S.an.wx = { k, t: 0, d: 20 };
  const vic = S.players.filter(p => onPitch(p) && !p.gk).sort(() => Math.random() - 0.5).slice(0, 2);
  if (k === 'heat') {
    feed('Heatwave! Stamina drains twice as fast', '#ff9f43'); cheer('boo', W / 2, 'SO HOT!');
    for (const p of vic) { p.heatT = 7; p.stamina = Math.max(0, p.stamina - 30); addMood(p, -10); floatText(p, 'HEATSTROKE!', '#ff9f43'); }
  } else {
    feed('Ice age! The pitch has frozen over', '#bfe9ff'); cheer('roar', W / 2, 'BRRR!');
    for (const p of vic) { p.iceT = 3; p.freezeT = Math.max(p.freezeT, 3); if (S.ball.owner === p) loseBall(p, p.face); floatText(p, 'FROZEN SOLID!', '#bfe9ff'); }
  }
}
function updateWeather(dt) {
  const w = S.an.wx; if (!w) return;
  w.t += dt;
  if (w.k === 'ice') for (const p of S.players) if (p.sprinting && able(p) && Math.random() < dt * 0.35) { p.stun = 0.8; a0Anim(p, 'fall', 0.6); if (S.ball.owner === p) loseBall(p, p.face); floatText(p, 'SLIP!', '#bfe9ff'); }
  if (w.k === 'heat') for (const p of S.players) if (p.heatT > 0) p.stamina = Math.max(0, p.stamina - 4 * dt);
  if (w.t >= w.d) { feed(w.k === 'heat' ? 'The heatwave breaks' : 'The pitch thaws out', w.k === 'heat' ? '#ff9f43' : '#bfe9ff'); S.an.wx = null; }
}

/* crowd fights: a shouting match in a stand that may turn into a brawl */
const INSULTS = ['YOUR KEEPER IS A FRIDGE', 'SAY THAT AGAIN!', 'MY NAN RUNS FASTER', '#@!%&!', 'SIT DOWN!', 'WHO ASKED YOU?', 'REF NEEDS GLASSES', 'BOOOO', 'OUTSIDE, NOW!', 'COME ON THEN!'];
function startBrawl() {
  S.an.br = { x: rand(W * 0.15, W * 0.85), t: 0, d: 16, lethal: false, esc: rand(5, 8), throwT: 0, words: [], wordT: 0, wid: 0 };
  feed('A shouting match breaks out in the stands', '#ff9a9a');
}
function updateBrawl(dt) {
  const br = S.an.br; if (!br) return;
  br.t += dt; br.wordT -= dt;
  if (br.wordT <= 0) { br.wordT = br.lethal ? 0.5 : 0.8; br.words.push({ id: ++br.wid, text: pick(INSULTS), dx: rand(-110, 110), life: 1.8 }); }
  for (let i = br.words.length - 1; i >= 0; i--) { br.words[i].life -= dt; if (br.words[i].life <= 0) br.words.splice(i, 1); }
  for (const p of S.players) if (onPitch(p) && p.y < H * 0.3 && Math.abs(p.x - br.x) < 260) addMood(p, -(br.lethal ? 5 : 3) * dt);   // players near the stand get rattled
  if (!br.lethal && br.t > br.esc) {
    if (Math.random() < 0.65) { br.lethal = true; br.d = Math.max(br.d, br.t + 10); feed('It has turned into a full-blown brawl in the stands!', '#ff4d6d'); cheer('roar', br.x, 'FIGHT! FIGHT!'); S.excite += 0.4; crowdEvent(0, { drama: 6 }); crowdEvent(1, { drama: 6 }); }
    else br.esc = 1e9;
  }
  if (br.lethal) {
    br.throwT -= dt; S.shake = Math.max(S.shake, 1.2);
    if (br.throwT <= 0) { br.throwT = rand(0.5, 0.9); const tx = clamp(br.x + rand(-220, 220), 20, W - 20), ty = rand(12, H * 0.4); S.an.junk.push({ kind: pick(['shoe', 'cup', 'hotdog', 'scarf', 'pie']), sx: br.x + rand(-60, 60), sy: -60, tx, ty, t: 0, dur: rand(0.7, 1.1), x: br.x, y: -60, z: 40, hit: false }); }
  }
  if (br.t > br.d) { feed(br.lethal ? 'Stewards break up the brawl' : 'The stand calms down', '#ff9a9a'); S.an.br = null; }
}
function updateJunk(dt) {
  const J = S.an.junk;
  for (let i = J.length - 1; i >= 0; i--) {
    const j = J[i]; j.t += dt; const u = Math.min(1, j.t / j.dur);
    j.x = j.sx + (j.tx - j.sx) * u; j.y = j.sy + (j.ty - j.sy) * u; j.z = (1 - u) * 40 + 160 * u * (1 - u);
    if (u >= 1 && !j.hit) {
      j.hit = true; burst(j.x, j.y, '#e8e0c8', 6, 10);
      const p = S.players.find(q => able(q) && Math.hypot(q.x - j.x, q.y - j.y) < 20);
      if (p) { p.hp = Math.max(1, p.hp - 6); p.stun = Math.max(p.stun, 0.6); p.hitT = 1.5; if (S.ball.owner === p) loseBall(p, p.face); addMood(p, -5); floatText(p, 'OUCH!', '#ff9a9a'); thump(110, 0.12, 0.06); }
    }
    if (j.t > j.dur + 1.2) J.splice(i, 1);
  }
}
function anomSnap() {   // compact copy for players in an online room
  const A = S.an; if (!A) return 0;
  const R = v => Math.round(v * 10) / 10;
  return { next: R(A.next), max: R(A.max), lvl: A.lvl, cur: A.cur ? { k: A.cur.k } : null,
    ufo: A.ufo ? { x: R(A.ufo.x), y: R(A.ufo.y), z: R(A.ufo.z), ph: A.ufo.ph, tk: A.ufo.tk, ti: A.ufo.ti, beam: R(A.ufo.beam), lift: R(A.ufo.lift) } : null,
    pir: A.pir.map(q => ({ x: R(q.x), y: R(q.y), face: R(q.face), run: R(q.run), st: q.st, mode: q.mode, ti: q.ti, mv: q.mv || 0 })),
    inv: A.inv.map(f => ({ x: R(f.x), y: R(f.y), face: R(f.face), run: R(f.run), col: f.col, hair: f.hair, skin: f.skin, mv: f.mv || 0 })),
    zone: A.zone ? { x0: R(A.zone.x0), y0: R(A.zone.y0), x1: R(A.zone.x1), y1: R(A.zone.y1), t: R(A.zone.t), d: A.zone.d } : null,
    wx: A.wx ? { k: A.wx.k, t: R(A.wx.t), d: A.wx.d } : null,
    br: A.br ? { x: R(A.br.x), t: R(A.br.t), d: A.br.d, lethal: A.br.lethal, words: A.br.words.map(w => ({ id: w.id, text: w.text, dx: R(w.dx), life: R(w.life) })) } : null,
    junk: A.junk.map(j => ({ kind: j.kind, x: R(j.x), y: R(j.y), z: R(j.z), t: R(j.t), dur: j.dur, hit: j.hit })) };
}

/* ---------- anomaly drawing (classic and 3D overlays) ---------- */
const PIRATE_LOOK = { jersey: '#f4f4f0', shorts: '#2b2b2b', socks: '#2b2b2b', skin: '#c58c5e', hair: '#1b120c', num: null, numCol: '#fff', trim: '#d0312d', hairStyle: 5, facial: 2, accessory: 1, build: 2, boots: '#3a2416' };
const fanLook = f => ({ jersey: f.col, shorts: '#3b4a5a', socks: '#e8e8e8', skin: f.skin, hair: f.hair, num: null, numCol: '#fff', armsUp: true, build: 1 });
function anomEnts() {   // classic view: pirates and fans, depth-sorted with the players
  const A = S.an, out = []; if (!A) return out;
  for (const q of A.pir) out.push({ y: q.y, draw: () => drawAnomFigure(q.x, q.y, q.face, q.run, q.mv, q.st === 'down', PIRATE_LOOK, true, q.st === 'drag') });
  for (const f of A.inv) out.push({ y: f.y, draw: () => drawAnomFigure(f.x, f.y, f.face, f.run, f.mv, false, fanLook(f), false, false) });
  return out;
}
function drawAnomFigure(x, y, face, run, mv, down, look, pirate, dragging) {
  const P = proj(x, y), s = P.s;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ell(P.x, P.y, 10 * s, 3.6 * s); ctx.fill();
  ctx.save(); ctx.translate(P.x, P.y);
  if (down) { ctx.translate(0, -3 * s); ctx.rotate(Math.PI / 2 * 0.95); ctx.scale(1, 0.8); drawFigure(s, 0, 0, look); }
  else drawFigure(s, run, mv ? 1 : 0, Object.assign({}, look, { armsUp: look.armsUp || dragging }));
  ctx.restore();
  if (pirate && !down) {
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.moveTo(P.x - 7 * s, P.y - 33 * s); ctx.lineTo(P.x + 7 * s, P.y - 33 * s); ctx.lineTo(P.x, P.y - 41 * s); ctx.fill();   // hat
    ctx.fillRect(P.x - 3 * s, P.y - 32.5 * s, 2.4 * s, 2 * s);   // eye patch
    ctx.strokeStyle = '#d8dde0'; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.moveTo(P.x + 8 * s, P.y - 17 * s); ctx.quadraticCurveTo(P.x + 16 * s, P.y - 24 * s, P.x + 15 * s, P.y - 32 * s); ctx.stroke();   // cutlass
  }
}
function drawUfo2D(u) {
  const G = proj(u.x, u.y, 0), P = proj(u.x, u.y, u.z), s = P.s;
  if (u.beam > 0) {
    const a = 0.35 * u.beam * (0.8 + 0.2 * Math.sin(S.time * 20));
    const g = ctx.createLinearGradient(0, P.y, 0, G.y); g.addColorStop(0, `rgba(157,255,184,${a})`); g.addColorStop(1, `rgba(157,255,184,${a * 0.4})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(P.x - 10 * s, P.y); ctx.lineTo(P.x + 10 * s, P.y); ctx.lineTo(G.x + 30 * G.s, G.y); ctx.lineTo(G.x - 30 * G.s, G.y); ctx.fill();
    ctx.fillStyle = `rgba(157,255,184,${a})`; ell(G.x, G.y, 30 * G.s, 11 * G.s); ctx.fill();
  } else { ctx.fillStyle = 'rgba(0,0,0,.25)'; ell(G.x, G.y, 34 * G.s, 12 * G.s); ctx.fill(); }
  ctx.fillStyle = '#8fa3ad'; ell(P.x, P.y, 40 * s, 11 * s); ctx.fill();
  ctx.fillStyle = '#5d6e77'; ell(P.x, P.y + 3 * s, 30 * s, 6 * s); ctx.fill();
  ctx.fillStyle = 'rgba(157,255,220,.85)'; ctx.beginPath(); ctx.ellipse(P.x, P.y - 4 * s, 16 * s, 13 * s, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7dff9b'; ell(P.x, P.y - 10 * s, 3.5 * s, 4 * s); ctx.fill();   // the pilot
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + S.time * 2; ctx.fillStyle = (k + Math.floor(S.time * 6)) % 2 ? '#ffd23f' : '#ff4d6d'; ell(P.x + Math.cos(a) * 34 * s, P.y + Math.sin(a) * 8 * s, 2.4 * s, 2.4 * s); ctx.fill(); }
}
const JUNK_COL = { shoe: '#6b4a2a', cup: '#f4f4f0', hotdog: '#d9894a', scarf: '#ff4d6d', pie: '#e8c37a' };
function drawAnomalies() {
  const A = S.an; if (!A) return;
  const big = proj === proj2d;
  if (A.zone) {   // the invaded zone, marked on the grass
    const z = A.zone, c = [proj(z.x0, z.y0), proj(z.x1, z.y0), proj(z.x1, z.y1), proj(z.x0, z.y1)];
    ctx.save(); ctx.setLineDash([8, 6]); ctx.lineDashOffset = -S.time * 30; ctx.strokeStyle = 'rgba(255,210,63,.8)'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,210,63,.08)'; path(c, true); ctx.fill(); ctx.stroke(); ctx.restore();
    const L = proj((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2, 0);
    ctx.fillStyle = 'rgba(255,210,63,.9)'; ctx.font = `700 ${Math.max(11, 13 * L.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText(`PITCH INVASION · ${Math.max(0, Math.ceil(z.d - z.t))}s`, L.x, L.y);
  }
  if (A.br) {   // the fight in the far stand
    const br = A.br, P = big ? proj(br.x, -60, 0) : proj(br.x, -110, 40), s = Math.max(0.7, P.s);
    if (br.lethal) {
      for (let k = 0; k < 9; k++) { const a = k * 0.7 + S.time * 3, r = (18 + 8 * Math.sin(S.time * 7 + k)) * s; ctx.fillStyle = `rgba(220,210,190,${0.55 - k * 0.03})`; ell(P.x + Math.cos(a) * r * 1.6, P.y + Math.sin(a) * r * 0.6, 16 * s, 12 * s); ctx.fill(); }
      ctx.font = `700 ${16 * s}px ${DISP}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff4d6d';
      const POW = ['POW!', 'BIFF!', 'WHACK!', 'OOF!']; ctx.fillText(POW[Math.floor(S.time * 3) % 4], P.x + Math.sin(S.time * 5) * 30 * s, P.y - 22 * s);
      drawStars(P.x, P.y - 4 * s, s * 1.5);
    }
    for (const w of br.words) {
      const a = Math.min(1, w.life * 2), y = P.y - (36 + (1.8 - w.life) * 20) * s;
      ctx.globalAlpha = a; ctx.font = `700 ${11 * s}px ${UI}`; ctx.textAlign = 'center';
      const tw = ctx.measureText(w.text).width + 10;
      ctx.fillStyle = '#ffffff'; rr(P.x + w.dx * s - tw / 2, y - 9 * s, tw, 15 * s, 6 * s); ctx.fillStyle = '#c0182a'; ctx.fillText(w.text, P.x + w.dx * s, y + 2 * s); ctx.globalAlpha = 1;
    }
  }
  for (const j of A.junk) {   // junk flying out of the stand
    const P = proj(j.x, j.y, j.z), s = Math.max(0.6, P.s), a = j.hit ? Math.max(0, 1 - (j.t - j.dur) / 1.2) : 1;
    ctx.globalAlpha = a; ctx.fillStyle = JUNK_COL[j.kind] || '#fff'; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(j.hit ? 0 : j.t * 9);
    if (j.kind === 'scarf') ctx.fillRect(-8 * s, -1.5 * s, 16 * s, 3 * s); else if (j.kind === 'cup') ctx.fillRect(-2.5 * s, -4 * s, 5 * s, 8 * s); else { ell(0, 0, 5 * s, 3 * s); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  for (const p of S.players) {   // frozen solid / heatstroke
    if (!onPitch(p)) continue;
    if (p.iceT > 0 && big) { const B = proj(p.x, p.y, 0), T = proj(p.x, p.y, 46), w = 26 * B.s; ctx.fillStyle = 'rgba(191,233,255,.45)'; ctx.strokeStyle = 'rgba(240,250,255,.9)'; ctx.lineWidth = 1.5; ctx.fillRect(B.x - w / 2, T.y, w, B.y - T.y + 3); ctx.strokeRect(B.x - w / 2, T.y, w, B.y - T.y + 3); }
    if (p.heatT > 0) { const P = proj(p.x, p.y, 52); ctx.strokeStyle = 'rgba(255,159,67,.9)'; ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let i = 0; i <= 6; i++) { const xx = P.x + (k - 1) * 6 * P.s + Math.sin(S.time * 8 + i + k) * 2 * P.s, yy = P.y - i * 2.4 * P.s; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); } }
  }
  if (A.ufo && big) drawUfo2D(A.ufo);
  if (A.ufo && !big && A.ufo.ph === 'beam') { const T = ufoTarget(A.ufo); if (T) { const P = proj(T.x, T.y, 70 + liftOf(T)); ctx.fillStyle = '#9dffb8'; ctx.font = `700 ${13 * Math.max(0.8, P.s)}px ${UI}`; ctx.textAlign = 'center'; ctx.fillText('BEAM ME UP', P.x, P.y); } }
}
// Screen-wide weather: heat haze or snow.
function drawWeatherFx() {
  const w = S.an && S.an.wx; if (!w) return;
  const k = Math.min(1, w.t / 1.5, (w.d - w.t) / 1.5); if (k <= 0) return;
  if (w.k === 'heat') {
    const g = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.2, LW / 2, LH / 2, LH * 0.9); g.addColorStop(0, `rgba(255,170,60,${0.08 * k})`); g.addColorStop(1, `rgba(255,90,20,${0.32 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    ctx.strokeStyle = `rgba(255,220,160,${0.12 * k})`; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = (i * 67 + S.time * 40) % LH; ctx.beginPath(); for (let x = 0; x <= LW; x += 40) { const yy = y + Math.sin(x * 0.02 + S.time * 4 + i) * 4; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
  } else {
    const g = ctx.createRadialGradient(LW / 2, LH / 2, LH * 0.25, LW / 2, LH / 2, LH * 0.95); g.addColorStop(0, `rgba(200,235,255,${0.1 * k})`); g.addColorStop(1, `rgba(225,245,255,${0.45 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);
    ctx.fillStyle = `rgba(255,255,255,${0.85 * k})`;
    for (let i = 0; i < 90; i++) { const x = (i * 137.5 + Math.sin(S.time + i) * 20) % LW, y = (i * 71 + S.time * (40 + (i % 5) * 12)) % LH; ell((x + LW) % LW, y, 1.6 + (i % 3) * 0.6, 1.6 + (i % 3) * 0.6); ctx.fill(); }
  }
}
function drawAnomMeter(cx, y) {   // under the crowd bar: time to the next anomaly, or what's happening
  const A = S.an; if (!A || S.phase === 'menu') return;
  const live = ANOM_LIST.filter(([k]) => anomBusy(k)).map(([k]) => ANOM_NAME[k]);
  const idle = S.mode === 'client' ? A.lvl > 0 : ANOM_PREF.level > 0 && S.mode !== 'playground';
  if (!live.length && !idle) return;
  const w = 220, x = cx - w / 2;
  ctx.fillStyle = 'rgba(6,11,10,.82)'; rr(x, y, w, 16, 5);
  ctx.font = `700 10px ${UI}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  if (live.length) { ctx.fillStyle = Math.floor(S.time * 4) % 2 ? '#ff9a6b' : '#ffd23f'; ctx.fillText('ANOMALY: ' + live.join(' + ').toUpperCase(), cx, y + 8.5); }
  else {
    const f = A.max > 0 ? clamp(1 - A.next / A.max, 0, 1) : 0, soon = A.max > 0 && A.next < 3;
    ctx.fillStyle = '#1b2621'; ctx.fillRect(x + 92, y + 5, w - 98, 6);
    ctx.fillStyle = soon ? (Math.floor(S.time * 6) % 2 ? '#ff4d6d' : '#ffd23f') : '#c9a0ff'; ctx.fillRect(x + 92, y + 5, (w - 98) * f, 6);
    ctx.textAlign = 'left'; ctx.fillStyle = soon ? '#ffd23f' : '#c9a0ff'; ctx.fillText(soon ? 'SOMETHING’S COMING' : `ANOMALY · ${ANOM_LEVELS[A.lvl] ? ANOM_LEVELS[A.lvl][0].toUpperCase() : ''}`, x + 7, y + 8.5);
  }
  ctx.textBaseline = 'alphabetic';
}

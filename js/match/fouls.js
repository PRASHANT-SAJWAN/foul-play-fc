/* Foul Play FC · js/match/fouls.js
   Fouls and the referee: base attacks landing, injuries, help-ups, sand, bananas, what referees see, and calling fouls and cards.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

// The base attack landing (js/abilities/weapons.js aims it), with a melee weapon if one is held.
function doFoul(a, t) {
  if (a.foulCd > 0 || !t || t.ko > 0 || !onPitch(t)) return false;
  const d = dist(a, t);
  if (t.stun > 0 && d <= reachOf(a) + 6) { helpUp(a, t); return false; }
  if (d > reachOf(a) + 6) { if (a.human) floatText(a, 'Too far', '#c8c8c8'); return false; }
  if (S.admin && S.admin.god && t.human) { a.foulCd = 1.0; floatText(t, 'IMMUNE', '#9fe8ff'); return false; }
  if (t.fx && t.fx.shield > 0) { t.fx.shield = 0; a.stun = Math.max(a.stun, 1); a.foulCd = 1; floatText(t, 'SHIELD!', '#9fe8ff'); burst(t.x, t.y, '#9fe8ff', 14, 20); feed(`${t.name}'s shield bounced ${a.name}'s attack`, '#9fe8ff'); return false; }
  const W = weaponOf(a, 'melee'), heavy = !!(W && W.heavy) || !!t.gk; if (W) a.items[W.id]--;   // melee weapons: js/player/player.js; fouling a keeper is a straight red if seen
  const wasGlowing = glowing(a), od = overdrive(a, t), odK = od ? 1.8 : 1;   // a full rage meter: this one's an Overdrive
  a.foulCd = 1.0; a.stats.fouls++; a.lastFoulT = S.time; a.anim = W ? W.anim : 'punch'; a.animT = 0.45;
  addKarma(a, heavy ? -14 : -8); S.heat = Math.min(1.5, S.heat + 0.08);
  M(a, 'fouls'); if (W) M(a, 'foulsBat'); if (a.team === t.team) M(a, 'foulsOnTeammates'); M(t, 'fouledReceived');
  noteGrudge(a, t);
  let ang = Math.atan2(t.y - a.y, t.x - a.x); const kb = (W ? W.kb : 170) * odK * (t.gk ? 1.8 : 1);
  if (t.gk) { const gx = t.team === 0 ? 0 : W_(); ang = Math.atan2(H / 2 - t.y, gx - t.x) * 0.6 + ang * 0.4; }   // a keeper gets knocked back toward their own net
  t.vx = Math.cos(ang) * kb; t.vy = Math.sin(ang) * kb;
  const dmg = Math.round((W ? W.dmg : 16) * odK * dmgOut(a) * dmgIn(t)), imm = knockImmune(t);
  t.hp = Math.max(0, t.hp - dmg); t.hitT = 2; if (!imm) { t.stun = Math.max(t.stun, W ? W.stun : 1.3); t.anim = 'fall'; t.animT = 0.6; } else floatText(t, 'UNSTOPPABLE', '#ffd23f');
  addMood(t, -10);
  if (!imm) { loseBall(t, ang); if (t.gk && S.ball.lastTouch === t) { S.ball.vx = Math.cos(ang) * 230; S.ball.vy = Math.sin(ang) * 230; } }   // the keeper's ball spills toward goal
  t.lastHitBy = a.id; t.lastHitT = S.time;
  if (!imm) afterHit(a, t, { foul: true, heavy: !!W || od || dmg >= 20 || t.gk, rage: od ? 0 : RAGE.foul });
  onFoulLanded(a, t);
  burst(t.x, t.y, W ? W.col : '#ffffff', W ? 18 : 10, 18); whack(t, t.hp <= 0 ? 'ko' : W ? W.id : 'punch');
  floatText(t, '-' + dmg, '#ff6b6b'); thump(W ? 70 : 110, 0.3, 0.14);
  S.shake = W ? 7 : 3; S.excite += W ? 0.35 : 0.2;
  let pkind = 'foul';
  if (t.hp <= 0) { t.ko = 6; t.stun = 6; pkind = 'ko'; addKarma(a, -12); M(a, 'knockouts'); M(t, 'knockedOut'); cheer('roar', t.x, 'WHAT A HIT!'); feed(`${a.name} knocked out ${t.name}!`, '#ff6b6b'); floatText(t, 'K.O.', '#ff6b6b'); fxEvent('ko', t); injure(t, 25, a); }
  else {
    if (loud(a, t)) feed(`${a.name} ${W ? W.verb : 'hit'} ${t.name}${a.team === t.team ? ' (own teammate!)' : ''}`, '#f2c9c9');
    const chance = W ? W.injury[0] : 0.1;
    if (Math.random() < chance) injure(t, W ? W.injury[1] : 8, a);
  }
  if (W && pkind !== 'ko') { cheer('roar', t.x, 'OOOH!'); fxEvent(W.fx || 'kick', a); }
  crowdEvent(a.team, a.team === t.team ? { noob: 6, fun: 4 } : { vill: 4, fun: 2, drama: 2 });
  if (a.team !== t.team) crowdEvent(t.team, { symp: 4 });
  EV('foul', a, { target: t.name, kind: pkind, bat: heavy, weapon: W ? W.id : null, teammate: a.team === t.team, x: Math.round(a.x), y: Math.round(a.y) });
  S.pend.push({ a, t, x: a.x, y: a.y, kind: pkind, heavy: heavy || pkind === 'ko', ttl: (S.refHuman ? 2.2 : 0.75) * (a.mood <= MOOD_MELT ? 1.5 : 1), inBox: t.team !== a.team && inBox(t.x, t.y, a.team), mate: a.team === t.team });
  alertRefs(a.x, a.y, wasGlowing ? 650 : 330, wasGlowing ? 1 : 0.55);   // glowing players draw every referee's eye
  return true;
}
// Injuries cut a player's maximum stamina until a med kit heals them, and sour their mood.
function injure(p, amount, by) {
  if (!p || amount <= 0) return;
  p.injury = clamp(p.injury + amount, 0, 70); p.staminaMax = 100 - p.injury; p.stamina = Math.min(p.stamina, p.staminaMax);
  addMood(p, -15); M(p, 'injuries'); if (by && by !== p) M(by, 'injuriesCaused'); EV('injury', p, { by: by ? by.name : null, amount });
  floatText(p, 'INJURED', '#ff8a8a');
  if (loud(p, by)) feed(`${p.name} is injured${by && by !== p ? ' by ' + by.name : ''}: stamina capped at ${Math.round(p.staminaMax)} until a med kit`, '#ff9a9a');
}
function healInjury(p) { if (!p.injury) return; p.injury = 0; p.staminaMax = 100; addMood(p, 10); floatText(p, 'INJURY HEALED', '#7dff9b'); }
function helpUp(a, t) {
  M(a, 'helpUps'); M(t, 'helpedUp'); EV('helpUp', a, { target: t.name });
  t.stun = 0; t.vx = t.vy = 0; a.foulCd = 0.8;
  addKarma(a, 12); addCharge(a, 10); addPop(a, 4); addMood(a, 10); addMood(t, 15); crowdEvent(a.team, { vill: -6, fun: 2 });
  floatText(t, 'HELPED UP', '#7dff9b');
  cheer('applause', a.x, a.team === t.team ? 'GOOD TEAMMATE!' : 'CLASS!');
  if (loud(a, t)) feed(`${a.name} helped ${t.name} up. The crowd applauds.`, '#7dff9b');
}
function leniency(f) {
  const a = f.a, opA = refOpinion(a);
  if (opA >= 30 && a.charge >= 20 && Math.random() < Math.min(0.75, (opA - 20) / 90)) return 'trust';
  if (f.t && f.t !== a) { const opT = refOpinion(f.t); if (opT <= -30 && Math.random() < Math.min(0.75, (-opT - 20) / 90)) return 'nosympathy'; }
  return null;
}
function waveOff(f, why, r) {
  const a = f.a; M(why === 'trust' ? a : f.t, why === 'trust' ? 'wavedOffTrusted' : 'ignoredFoulsOnMe'); EV('wavedOff', a, { reason: why, victim: f.t ? f.t.name : null, by: r.name }); r.att = { x: a.x, y: a.y }; r.attT = 1;
  if (why === 'trust') { addCharge(a, -20); feed(`The ${r.name.toLowerCase()} saw it but waved play on: ${a.name} has earned some trust`, '#9fe8ff'); }
  else feed(`The ${r.name.toLowerCase()} ignored the foul on ${f.t.name}: no sympathy for a repeat offender`, '#9fe8ff');
  floatText(r, 'PLAY ON', '#9fe8ff'); cheer('boo', r.x, 'REF!?');
}
function doBlind(a, isHuman) {
  if (a.blindCd > 0) return false;
  const flash = a.items.flash > 0;
  if (!flash && a.blind < 1) { if (isHuman) floatText(a, 'No sand left', '#c8c8c8'); return false; }
  const R = flash ? 260 : 160;
  const tg = S.refs.filter(r => r.blind <= 0 && Math.hypot(r.x - a.x, r.y - a.y) < R).sort((r1, r2) => Math.hypot(r1.x - a.x, r1.y - a.y) - Math.hypot(r2.x - a.x, r2.y - a.y));
  if (!tg.length) { if (isHuman) floatText(a, 'No ref in range', '#c8c8c8'); return false; }
  const hit = flash ? tg : [tg[0]];
  if (flash) a.items.flash--; else a.blind--;
  addKarma(a, -10);
  M(a, flash ? 'flashUsed' : 'sandThrows'); EV('blind', a, { flash, refs: hit.map(r => r.name) });
  a.blindCd = 1.2;
  for (const r of hit) {
    r.blind = flash ? 7 : 4.5; r.att = null;
    burst(r.x, r.y, flash ? '#fffbe0' : '#d8c08a', 18, 32);
    for (let i = 0; i < 10; i++) { const u = i / 10; S.parts.push({ x: a.x + (r.x - a.x) * u, y: a.y + (r.y - a.y) * u, z: 20 + 20 * Math.sin(u * Math.PI), vx: rand(-20, 20), vy: rand(-20, 20), vz: rand(0, 40), life: 0.5 + u * 0.3, col: flash ? '#fff6c0' : '#cfb47a', size: 2.2 }); }
  }
  if (isHuman || Math.random() < 0.5) feed(`${a.name} ${flash ? 'flash-powdered' : 'threw sand at'} the ${hit.length > 1 ? 'referees' : hit[0].name.toLowerCase()}`, '#e9d8a6');
  S.pend.push({ a, x: a.x, y: a.y, kind: 'blind', heavy: false, ttl: S.refHuman ? 2.2 : 0.5, inBox: false, mate: false });
  S.excite += 0.25; thump(300, 0.08, 0.2);
  return true;
}
function dropBanana(a) {
  if (a.items.banana <= 0) return;
  a.items.banana--; addKarma(a, -6); M(a, 'bananasDropped'); EV('banana', a, {});
  S.bananas.push({ x: clamp(a.x - Math.cos(a.face) * 16, 10, W - 10), y: clamp(a.y - Math.sin(a.face) * 16, 10, H - 10), owner: a, imm: 1, ttl: 30 });
  S.pend.push({ a, x: a.x, y: a.y, kind: 'banana', heavy: false, ttl: S.refHuman ? 2.2 : 0.4, inBox: false, mate: false });
}
function alertRefs(x, y, radius = 330, chance = 0.55) {
  for (const r of S.refs) if (r.blind <= 0 && Math.hypot(r.x - x, r.y - y) < radius && Math.random() < chance) { r.att = { x, y }; r.attT = 1.0; }
}
function sees(r, x, y) {
  if (r.blind > 0 || r.gone > 0) return false;
  if (MUT.noRef) return false;
  if (inSmoke(x, y)) return false;
  if (S.admin && S.admin.refs === 'off') return false;
  if (S.admin && S.admin.refs === 'strict') return true;
  const dx = x - r.x, dy = y - r.y, d = Math.hypot(dx, dy);
  if (d < 38) return true;
  if (d > r.range) return false;
  return Math.abs(angDiff(r.face, Math.atan2(dy, dx))) < r.fov / 2;
}
const watched = p => !refIgnores(p) && S.refs.some(r => sees(r, p.x, p.y));

function callFoul(f, r) {
  const a = f.a;
  if (!f.varDone && wouldBeRed(f) && varStart(f, r)) return;   // the offender can contest a red card (js/match/var.js)
  whistle(wouldBeRed(f) ? 3 : 2, 0.3, wouldBeRed(f) ? 0.2 : 0.15); a.stats.caught++; if (a.cls === 'brawler') a.stk = 0; addPop(a, -8); addCharge(a, -30); addKarma(a, -10); cheer('boo', a.x, 'BOOO!');
  let red = f.heavy;
  if (!red) { a.yellows++; if (a.yellows >= 2) red = true; }
  M(a, red ? 'reds' : 'yellows'); M(a, ['foul', 'kick', 'ko'].includes(f.kind) ? 'caughtFouls' : 'sneakyCaught'); EV('card', a, { card: red ? 'red' : 'yellow', kind: f.kind, by: r.name });
  const what = { skill: 'dirty use of a skill', ranged: 'shooting a player', slide: 'reckless sliding tackle', pound: 'ground pound', lasso: 'tripping', foul: 'foul', kick: 'jump kick', ko: 'knockout', blind: 'blinding the referee', banana: 'banana drop', throw: 'unsporting throw' }[f.kind] || 'foul';
  addMood(a, -10);
  feed(`${red ? 'RED CARD' : 'Yellow card'}: ${a.name} (${what}), seen by the ${r.name.toLowerCase()}`, red ? '#ff4d4d' : '#ffd23f');
  r.att = { x: a.x, y: a.y }; r.attT = 1.5; r.card = { red, t: 1.8 };
  fxEvent('card', null, { x: r.x, y: r.y }); a0Anim(a, 'plead', 1.6); crowdEvent(a.team, { vill: 6 }); crowdEvent(1 - a.team, { symp: 3 });
  if (red) { crowdEvent(0, { drama: 10 }); crowdEvent(1, { drama: 10 }); }
  S.excite += 0.3;
  if (red) {
    if (S.ball.owner === a) S.ball.owner = null;
    a.charge = 0; a.yellows = 0; a.stun = 0; a.ko = 0; a.target = null; sendToBench(a);
    if (a.human) switchToBest(a.human);
  }
  setPiece(1 - a.team, f.inBox ? 'penalty' : 'free', f.x, f.y, red ? 'RED CARD' : 'YELLOW CARD');
}

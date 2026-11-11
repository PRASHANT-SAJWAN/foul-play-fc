/* Foul Play FC · panels.js
   Playground admin panel, character creator, class catalog and lobby extras.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- playground admin panel ---------------- */
function admin(act) {
  const h = S.humans[0], p = h && S.players[h.pid]; if (!p || !S.admin) return;
  if (act.startsWith('pu:')) { applyPowerup(p, act.slice(3)); return; }
  if (act.startsWith('give:')) { pickup(p, { type: act.slice(5), for: p }); return; }
  if (act === 'bench') { if (S.ball.owner === p) S.ball.owner = null; sendToBench(p); return; }
  if (act.startsWith('an:')) { if (!startAnomaly(act.slice(3))) feed('That anomaly is already happening', '#c8c8c8'); return; }
  if (act === 'injure') { injure(p, 20, null); return; }
  if (act === 'ult') { p.ult = 100; return; }
  if (act === 'cds') { p.cd = [0, 0, 0]; S.teamCd = [{}, {}]; return; }
  if (act.startsWith('w:')) { const w = act.slice(2); p.items[w] = (p.items[w] || 0) + (w === 'sling' ? 5 : 10); return; }
  if (act === 'bounty') { S.bountyOn = true; S.bountyT = 0; S.bounty = null; return; }
  const b = S.ball;
  if (act === 'bat') { p.items.bat += 3; floatText(p, 'BAT ×3', '#ffcf5a'); }
  if (act === 'flash') { p.items.flash += 1; floatText(p, 'FLASH', '#fff6c0'); }
  if (act === 'banana') { p.items.banana += 2; floatText(p, 'BANANA ×2', '#ffe14d'); }
  if (act === 'sand') { p.blind = 2; p.blindT = 0; floatText(p, 'SAND ×2', '#d8c08a'); }
  if (act === 'heal') { p.hp = 100; p.stun = 0; p.ko = 0; floatText(p, 'FULL HP', '#7dff9b'); }
  if (act === 'gift') throwItem(p);
  if (act === 'ball') { if (b.owner && b.owner !== p) b.owner.pickCd = 0.8; b.owner = p; b.lastTouch = p; p.hold = 0; }
  if (act === 'ko') { const t = p.target; if (t) { t.hp = 0; t.ko = 6; t.stun = 6; loseBall(t, 0); floatText(t, 'K.O.', '#ff6b6b'); } else floatText(p, 'No one in reach', '#c8c8c8'); }
  if (act === 'blindrefs') for (const r of S.refs) r.blind = 6;
  if (act === 'kickoff') kickoff(0, 'KICK OFF');
  if (act === 'penalty') setPiece(0, 'penalty', 0, 0, 'PENALTY');
  if (act === 'freekick') setPiece(0, 'free', W - BOX_D - 100, H / 2 + 70, 'FREE KICK');
  if (act === 'score') S.score = [0, 0];
  if (act === 'end') endMatch();
  if (act === 'charge') { p.charge = 100; floatText(p, 'CHARGE 100%', '#4fd6ff'); }
  if (act === 'heat') { S.heat = 1.5; floatText(p, 'BOTS ANGRY', '#ff6b80'); }
  if (act === 'karmaup') { addKarma(p, 50); floatText(p, 'KARMA +50', '#7dff9b'); }
  if (act === 'karmadown') { addKarma(p, -50); floatText(p, 'KARMA −50', '#ff6b80'); }
}
function renderAdmSegs() {
  const mk = (id, key, opts) => {
    const el = document.getElementById(id);
    el.innerHTML = opts.map(([n, v]) => `<button aria-pressed="${!!(S.admin && S.admin[key] === v)}" data-v="${v}">${n}</button>`).join('');
    el.querySelectorAll('button').forEach(b => b.onclick = () => { if (S.admin) S.admin[key] = b.dataset.v; renderAdmSegs(); });
  };
  mk('adm-refs', 'refs', [['Normal', 'normal'], ['Off', 'off'], ['See all', 'strict']]);
  mk('adm-bots', 'bots', [['Normal', 'normal'], ['Frozen', 'frozen'], ['Peaceful', 'peaceful'], ['Savage', 'savage']]);
}
function setupAdmin(on) {
  const el = document.getElementById('admin');
  el.hidden = !on; el.classList.remove('min'); document.getElementById('adm-toggle').textContent = 'Hide';
  if (!on) return;
  document.getElementById('adm-god').checked = false; document.getElementById('adm-inf').checked = false;
  renderAdmSegs();
}
function toggleAdmin() {
  const el = document.getElementById('admin'); el.classList.toggle('min');
  document.getElementById('adm-toggle').textContent = el.classList.contains('min') ? 'Show' : 'Hide';
}
document.querySelectorAll('[data-adm]').forEach(b => b.addEventListener('click', () => { admin(b.dataset.adm); b.blur(); }));
document.getElementById('adm-toggle').addEventListener('click', e => { toggleAdmin(); e.currentTarget.blur(); });
document.getElementById('adm-god').addEventListener('change', e => { if (S.admin) S.admin.god = e.target.checked; e.target.blur(); });
document.getElementById('adm-inf').addEventListener('change', e => { if (S.admin) S.admin.inf = e.target.checked; e.target.blur(); });

/* ---------------- character creator ---------------- */
let DRAFT = null, PREVIEW = null, creatorFrom = 'menu', rolesFrom = 'menu';
const lookFromSkin = sk => ({ jersey: TEAM[0].col, shorts: TEAM[0].shorts, socks: TEAM[0].socks, skin: SKIN_OPTS.skinTone[sk.skinTone], hair: SKIN_OPTS.hairColour[sk.hairColour], num: sk.number, numCol: '#0b1a2a',
  trim: SKIN_OPTS.trim[sk.trim], sleeveStyle: sk.sleeves, sockStyle: sk.socks, boots: SKIN_OPTS.boots[sk.boots], hairStyle: sk.hair, facial: sk.facial, accessory: sk.accessory, build: sk.build, height: sk.height });
function creatorRow(title, html) { return `<div class="cr-row"><h3>${title}</h3>${html}</div>`; }
function swatchRow(key, cols) { return `<div class="swatches">${cols.map((c, i) => `<button class="sw" style="background:${c}" aria-label="${key} ${i + 1}" aria-pressed="${DRAFT[key] === i}" data-k="${key}" data-v="${i}"></button>`).join('')}</div>`; }
function segRow(key, names) { return `<div class="seg">${names.map((n, i) => `<button aria-pressed="${DRAFT[key] === i}" data-k="${key}" data-v="${i}">${n}</button>`).join('')}</div>`; }
function renderCreator() {
  const O = SKIN_OPTS;
  $('cp-body').innerHTML = creatorRow('Skin tone', swatchRow('skinTone', O.skinTone)) + creatorRow(`Height <span class="hint">(${DRAFT.height > 0 ? '+' : ''}${DRAFT.height}%, looks only)</span>`, `<input type="range" id="cr-height" min="-6" max="6" step="1" value="${DRAFT.height}">`) + creatorRow('Build <span class="hint">(looks only)</span>', segRow('build', O.build));
  $('cp-head').innerHTML = creatorRow('Hair style', segRow('hair', O.hair)) + creatorRow('Hair colour', swatchRow('hairColour', O.hairColour)) + creatorRow('Facial hair', segRow('facial', O.facial));
  $('cp-kit').innerHTML = creatorRow('Trim colour', swatchRow('trim', O.trim)) + creatorRow('Sleeves', segRow('sleeves', O.sleeves)) + creatorRow('Socks', segRow('socks', O.socks)) + creatorRow('Boots', swatchRow('boots', O.boots)) + creatorRow('Shirt number', `<input class="field" id="cr-number" type="number" min="1" max="99" value="${DRAFT.number}" style="width:6em">`);
  $('cp-extra').innerHTML = creatorRow('Accessory', segRow('accessory', O.accessory)) + creatorRow('Goal celebration', segRow('celebration', O.celebration) + '<button class="btn ghost sm" id="cr-play" style="align-self:flex-start">Preview celebration</button>') + creatorRow('Power-shot trail', swatchRow('trail', O.trail));
  $('cr-body').querySelectorAll('[data-k]').forEach(b => b.onclick = () => { DRAFT[b.dataset.k] = +b.dataset.v; DRAFT = sanitizeSkin(DRAFT); renderCreator(); if (b.dataset.k === 'celebration' && PREVIEW) PREVIEW.play('cel' + DRAFT.celebration); });
  $('cr-height').oninput = e => { DRAFT.height = +e.target.value; DRAFT = sanitizeSkin(DRAFT); updatePreview(); e.target.closest('.cr-row').querySelector('.hint').textContent = `(${DRAFT.height > 0 ? '+' : ''}${DRAFT.height}%, looks only)`; };
  $('cr-number').onchange = e => { DRAFT.number = +e.target.value; DRAFT = sanitizeSkin(DRAFT); e.target.value = DRAFT.number; updatePreview(); };
  $('cr-play').onclick = () => { if (PREVIEW) PREVIEW.play('cel' + DRAFT.celebration); };
  $('cr-code').value = skinCode(DRAFT);
  updatePreview();
}
function updatePreview() {
  $('cr-code').value = skinCode(DRAFT);
  if (PREVIEW) { PREVIEW.setLook(lookFromSkin(DRAFT)); return; }
  const c = $('cr-canvas'), g = c.getContext('2d'); c.width = c.clientWidth || 300; c.height = c.clientHeight || 300;   // classic fallback: a big badge
  const img = new Image(); img.onload = () => { g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; const sz = Math.min(c.width, c.height) * 0.7; g.drawImage(img, (c.width - sz) / 2, (c.height - sz) / 2, sz, sz); }; img.src = skinIcon(DRAFT, 0);
}
let showCreatorTab = null;
async function openCreator(from) {
  creatorFrom = from; DRAFT = sanitizeSkin({ ...MY_SKIN });
  showOverlay('creator');
  if (!showCreatorTab) showCreatorTab = setupTabs(document.querySelector('#creator [role="tablist"]'), $('cr-body'));
  showCreatorTab('ct-body');
  if (!PREVIEW && store.get('fpfc-gfx') !== '2d') {
    try { const mod = await import('./render3d.js'); PREVIEW = mod.createPreview($('cr-canvas')); } catch (e) { PREVIEW = null; $('cr-note').textContent = '3D preview unavailable here; showing a simple badge instead.'; }
  }
  if (PREVIEW) PREVIEW.start();
  renderCreator();
}
function closeCreator(save) {
  if (PREVIEW) PREVIEW.stop();
  if (save) {
    MY_SKIN = sanitizeSkin(DRAFT); store.set('fpfc-skin', MY_SKIN);
    if (S.humans[0] && !S.net && S.players[S.humans[0].pid]) applySkin(S.players[S.humans[0].pid], MY_SKIN);
    if (NET && NET.meta && NET.meta.status === 'lobby') {
      if (NET.isHost) { NET.roster[NET.uid].skin = uniqueNumber(sanitizeSkin(MY_SKIN), NET.roster[NET.uid].team, NET.uid); rosterChanged(); }
      else if (NET.conn) NET.conn.send({ t: 'skin', skin: MY_SKIN });
    }
  }
  showOverlay(creatorFrom);
}
$('m-creator').onclick = () => openCreator('menu');
$('on-look').onclick = () => openCreator('online');
fillClassSelect($('on-class')); $('on-class').onchange = e => setMyClass(e.target.value);
$('cr-save').onclick = () => closeCreator(true);
$('cr-cancel').onclick = () => closeCreator(false);
$('cr-random').onclick = () => { DRAFT = randomSkin(); renderCreator(); };
$('cr-copy').onclick = () => { const v = $('cr-code').value; if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => $('cr-code').select()); else $('cr-code').select(); };
$('cr-apply').onclick = () => { const sk = parseSkinCode($('cr-code').value); if (!sk) { $('cr-note').textContent = "That isn't a valid skin code. It looks like 2.6.1.4.… with 14 parts."; return; } DRAFT = sk; renderCreator(); };

/* ---------------- class catalog ---------------- */
let showRoleTab = null;
const PORTRAITS = {};
function classPortrait(C) {   // a little blocky bust in the class colours
  if (PORTRAITS[C.id]) return PORTRAITS[C.id];
  const c = document.createElement('canvas'); c.width = c.height = 120; const g = c.getContext('2d'), L = C.look;
  const bg = g.createRadialGradient(60, 50, 10, 60, 60, 80); bg.addColorStop(0, C.col); bg.addColorStop(1, '#0b1210'); g.fillStyle = bg; g.fillRect(0, 0, 120, 120);
  g.fillStyle = C.col; g.fillRect(26, 84, 68, 40); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(26, 84, 68, 6);
  g.fillStyle = '#ffffff'; g.font = "700 22px 'Barlow Condensed', sans-serif"; g.textAlign = 'center'; g.fillText(C.num, 60, 112);
  if (L.hair === 9) { g.fillStyle = L.hairCol; g.fillRect(18, 42, 12, 34); g.fillRect(90, 42, 12, 34); }
  g.fillStyle = L.skin; g.fillRect(32, 30, 56, 56);
  g.fillStyle = L.hairCol;
  if (L.hair === 8) { g.fillRect(30, 22, 60, 16); g.beginPath(); for (let k = 0; k < 6; k++) { const x = 30 + k * 10; g.moveTo(x, 24); g.lineTo(x + 5 + (k - 2.5) * 3, 4 + Math.abs(k - 2.5) * 4); g.lineTo(x + 10, 24); } g.fill(); g.fillRect(30, 36, 10, 12); }
  else if (L.hair === 0) g.fillRect(30, 26, 60, 8);
  else if (L.hair === 5) { g.fillRect(30, 22, 60, 16); g.fillRect(28, 30, 10, 40); g.fillRect(82, 30, 10, 40); }
  else if (L.hair !== 6) { g.fillRect(30, 22, 60, 16); g.fillRect(30, 36, 8, 12); g.fillRect(82, 36, 8, 12); }
  g.fillStyle = '#ffffff'; g.fillRect(40, 52, 14, 12); g.fillRect(66, 52, 14, 12); g.fillStyle = L.eyes || '#222'; g.fillRect(45, 55, 7, 9); g.fillRect(70, 55, 7, 9);
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(40, 46, 14, 4); g.fillRect(66, 46, 14, 4); g.fillRect(52, 74, 16, 3);
  if (L.acc === 5) { g.fillStyle = '#2a1f3a'; g.fillRect(26, 16, 68, 12); g.fillRect(26, 16, 8, 70); g.fillRect(86, 16, 8, 70); g.fillRect(32, 68, 56, 18); }
  if (L.acc === 6) { g.fillStyle = '#f4f4f0'; g.fillRect(16, 24, 88, 8); g.fillRect(36, 2, 48, 24); g.fillStyle = '#1b1b1b'; g.fillRect(36, 18, 48, 6); }
  if (L.acc === 7) { g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(38, 50, 18, 16); g.strokeRect(64, 50, 18, 16); g.beginPath(); g.moveTo(56, 56); g.lineTo(64, 56); g.stroke(); }
  if (L.acc === 1) { g.fillStyle = C.col; g.fillRect(30, 38, 60, 6); }
  return (PORTRAITS[C.id] = c.toDataURL());
}
function classKeyLabels() { return SKILL_KEYS.map(k => keyLabel(BINDS[0][k])); }
function openRoles(from) {
  rolesFrom = from;
  const nav = $('rl-tabs'), body = $('rl-body'), keysL = classKeyLabels();
  nav.innerHTML = Object.entries(ROLE_INFO).map(([r, R]) => `<div class="rl-group" style="color:${R.col}">${R.name}</div>` + CLASSES.filter(c => c.role === r).map(c => `<button role="tab" id="rt-${c.id}" aria-controls="rp-${c.id}" aria-selected="false" tabindex="-1"><span style="color:${c.col}">■</span> ${c.name}${c.id === MY_CLASS ? ' ✓' : ''}</button>`).join('')).join('') +
    '<div class="rl-group">Teams</div><button role="tab" id="rt-syn" aria-controls="rp-syn" aria-selected="false" tabindex="-1">Synergies</button><button role="tab" id="rt-line" aria-controls="rp-line" aria-selected="false" tabindex="-1">Line-ups</button>';
  body.innerHTML = CLASSES.map(c => { const R = ROLE_INFO[c.role]; return `<section class="guide-sec role-card" id="rp-${c.id}" role="tabpanel" aria-labelledby="rt-${c.id}" hidden>
    <div class="cls-head"><img class="cls-portrait" alt="" src="${classPortrait(c)}">
      <div><h3 style="color:${c.col};margin:0">${c.name}</h3><p class="lede" style="margin:2px 0 8px">${c.title} · <span class="role-chip" style="color:${R.col}">${R.name}</span></p>
      ${c.id === MY_CLASS ? '<p class="hint">✓ This is your class</p>' : `<button class="btn sm" data-play="${c.id}">Play as ${c.name}</button>`}</div></div>
    <p><b>Passive · ${esc(c.passive[0])}.</b> ${esc(c.passive[1])}</p>
    <ul class="cls-skills">${c.skills.map((k, i) => `<li><kbd>${esc(keysL[i])}</kbd><span><b>${esc(k.name)}.</b> ${esc(k.desc)}</span><span class="cd">${k.cd} s${k.shared ? ' · team' : ''}</span></li>`).join('')}
      <li class="cls-ult"><kbd>${esc(keysL[3])}</kbd><span><b>Ultimate · ${esc(c.ult.name)}.</b> ${esc(c.ult.desc)}</span><span class="cd">100%</span></li></ul></section>`; }).join('') +
    `<section class="guide-sec role-card" id="rp-syn" role="tabpanel" aria-labelledby="rt-syn" hidden><h3>Class synergies</h3><p>A team that fields every class in a synergy gets its bonus for the whole match.</p>
      <ul class="cls-skills">${SYNERGIES.map(y => `<li><span>★</span><span><b>${y.name}</b> (${y.need.map(n => CLS[n].name).join(' + ')}${y.id === 'sustain' ? ' + any' : ''}). ${esc(y.desc)}</span><span></span></li>`).join('')}</ul></section>
    <section class="guide-sec role-card" id="rp-line" role="tabpanel" aria-labelledby="rt-line" hidden><h3>Recommended line-ups (5v5)</h3><p>Bots use these. Pick one in Pace and controls → Game → Bot line-ups. The goalkeeper slot is always a Goalkeeper; 3v3 uses the forward and the first defender.</p>
      ${Object.entries(LINEUPS).map(([k, L]) => `<h4 style="text-transform:capitalize">${k}</h4><div class="lineup">${['Goalkeeper', ...L.map(n => CLS[n].name)].map(n => `<span>${n}</span>`).join('')}</div>`).join('')}</section>`;
  body.querySelectorAll('[data-play]').forEach(b => b.onclick = () => { const id = b.dataset.play; setMyClass(id); openRoles(rolesFrom); showRoleTab('rt-' + id); });
  if (!showRoleTab) showRoleTab = setupTabs(nav, body);
  showOverlay('roles'); showRoleTab('rt-' + MY_CLASS);
}
$('m-roles').onclick = () => openRoles('menu');
$('rl-close').onclick = () => showOverlay(rolesFrom);

/* ---------------- lobby: ready-up and mute ---------------- */
$('on-ready').onclick = () => { if (!NET || !NET.conn) return; const me = NET.roster[NET.uid]; NET.conn.send({ t: 'ready', ready: !(me && me.ready) }); };
for (const id of ['on-t0', 'on-t1']) $(id).addEventListener('click', e => {
  const li = e.target.closest('li[data-uid]'); if (!li || !NET || li.dataset.uid === NET.uid) return;
  const u = li.dataset.uid; if (NET.muted.has(u)) NET.muted.delete(u); else NET.muted.add(u); renderRoster();
});

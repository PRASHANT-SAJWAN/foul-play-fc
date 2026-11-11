/* Foul Play FC · js/ui/creator.js
   The character creator.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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
  const c = $('cr-canvas'), g = c.getContext('2d'); c.width = c.clientWidth || 300; c.height = c.clientHeight || 300;   // no WebGL: a big badge
  const img = new Image(); img.onload = () => { g.clearRect(0, 0, c.width, c.height); g.imageSmoothingEnabled = false; const sz = Math.min(c.width, c.height) * 0.7; g.drawImage(img, (c.width - sz) / 2, (c.height - sz) / 2, sz, sz); }; img.src = skinIcon(DRAFT, 0);
}
let showCreatorTab = null;
async function openCreator(from) {
  creatorFrom = from; DRAFT = sanitizeSkin({ ...MY_SKIN });
  showOverlay('creator');
  if (!showCreatorTab) showCreatorTab = setupTabs(document.querySelector('#creator [role="tablist"]'), $('cr-body'));
  showCreatorTab('ct-body');
  if (!PREVIEW) {
    try { const mod = await import('../render/render3d.js'); PREVIEW = mod.createPreview($('cr-canvas'), { modelLimits: MODEL_LIMITS }); } catch (e) { PREVIEW = null; $('cr-note').textContent = '3D preview unavailable here; showing a simple badge instead.'; }
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

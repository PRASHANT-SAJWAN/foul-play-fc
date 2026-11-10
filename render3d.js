// Foul Play FC · 3D view (three.js)
// Draws the same game state as the classic 2.5D canvas, in 3D. Game logic is untouched:
// world x (0..W) maps to three.js X, world y (0..H) to Z, and height z to Y.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const stdM = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
function makeCanvasTex(maxAniso) {
  return (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };
}
// A jointed low-poly footballer. `look` carries team colours plus the optional skin (hair style, trim, accessories…).
function buildRig(look, canvasTex) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const trim = look.trim || null;
  const m = { jersey: stdM(look.jersey), shorts: stdM(look.shorts), skin: stdM(look.skin, { roughness: 0.6 }), hair: stdM(look.hair, { roughness: 0.9 }),
    sleeves: stdM(look.sleeves || look.jersey), boots: stdM(look.boots || '#151515', { roughness: 0.5 }), trim: stdM(trim || '#ffffff') };
  const shirt = canvasTex(64, 64, (c, w, h) => { c.fillStyle = look.jersey; c.fillRect(0, 0, w, h); if (trim) { c.fillStyle = trim; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6); } if (look.num != null) { c.fillStyle = look.numCol; c.font = "700 40px 'Barlow Condensed','Arial Narrow',sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(look.num), w / 2, h / 2 + 3); } });
  const back = new THREE.MeshStandardMaterial({ map: shirt, roughness: 0.8 });
  const side = trim ? new THREE.MeshStandardMaterial({ map: canvasTex(16, 64, (c, w, h) => { c.fillStyle = look.jersey; c.fillRect(0, 0, w, h); c.fillStyle = trim; c.fillRect(0, 0, w, 6); c.fillRect(0, h - 6, w, 6); }), roughness: 0.8 }) : m.jersey;
  const socks = new THREE.MeshStandardMaterial({ map: canvasTex(16, 64, (c, w, h) => { c.fillStyle = look.socks; c.fillRect(0, 0, w, h); c.fillStyle = trim || '#ffffff'; if (look.sockStyle === 1) for (let y = 6; y < h; y += 14) c.fillRect(0, y, w, 5); if (look.sockStyle === 2) c.fillRect(6, 0, 4, h); }), roughness: 0.8 });
  const bw = look.build === 0 ? 0.88 : look.build === 2 ? 1.14 : 1;
  const legGeo = new THREE.BoxGeometry(3.8, 14, 3.8).translate(0, -7, 0), bootGeo = new THREE.BoxGeometry(4, 2.4, 6.2).translate(0, -13.6, 1);
  const mkLeg = x => { const leg = new THREE.Mesh(legGeo, socks); leg.position.set(x, 15, 0); leg.add(new THREE.Mesh(bootGeo, m.boots)); body.add(leg); return leg; };
  const legL = mkLeg(-2.5 * bw), legR = mkLeg(2.5 * bw);
  const shorts = new THREE.Mesh(new THREE.BoxGeometry(11.4 * bw, 6.5, 6.6), m.shorts); shorts.position.y = 16.6; body.add(shorts);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(12.4 * bw, 12.5, 7), [side, side, m.jersey, m.jersey, back, back]); torso.position.y = 25.6; body.add(torso);
  const longSleeve = look.sleeveStyle === 1;
  const upper = new THREE.BoxGeometry(3.3, longSleeve ? 12 : 5.5, 3.3).translate(0, longSleeve ? -6 : -2.75, 0);
  const fore = longSleeve ? null : new THREE.BoxGeometry(2.9, 6.6, 2.9).translate(0, -8.8, 0);
  const handGeo = new THREE.SphereGeometry(1.9, 8, 6).translate(0, -12.6, 0), bandGeo = new THREE.CylinderGeometry(1.95, 1.95, 1.6, 10).translate(0, -10.6, 0);
  const mkArm = x => { const arm = new THREE.Mesh(upper, m.sleeves); arm.position.set(x, 31, 0); if (fore) arm.add(new THREE.Mesh(fore, m.skin)); arm.add(new THREE.Mesh(handGeo, m.skin)); if (look.accessory === 2) arm.add(new THREE.Mesh(bandGeo, m.trim)); body.add(arm); return arm; };
  const armL = mkArm(-8.1 * bw), armR = mkArm(8.1 * bw);
  const headG = new THREE.Group(); headG.position.y = 36.8; body.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(4.7, 16, 12), m.skin));
  const hs = look.hairStyle == null ? 1 : look.hairStyle;
  const cap = (r, th) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, th), m.hair); h.position.y = 0.3; h.rotation.x = -0.25; headG.add(h); };
  if (hs === 0) cap(4.8, Math.PI / 2.6);
  if (hs === 1) cap(4.95, Math.PI / 2.1);
  if (hs === 2) { cap(4.9, Math.PI / 2.3); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, c = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), m.hair); c.position.set(Math.cos(a) * 3.4, 3.4, Math.sin(a) * 3.4 - 0.6); headG.add(c); } }
  if (hs === 3) { cap(4.95, Math.PI / 2.1); const bun = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), m.hair); bun.position.set(0, 4.6, -2.6); headG.add(bun); }
  if (hs === 4) { const mo = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.6, 9), m.hair); mo.position.set(0, 4.4, -0.6); headG.add(mo); }
  if (hs === 5) { cap(5, Math.PI / 2); const lb = new THREE.Mesh(new THREE.BoxGeometry(8.6, 8, 2.4), m.hair); lb.position.set(0, -1.5, -3.8); headG.add(lb); }
  if (hs === 7) { const af = new THREE.Mesh(new THREE.SphereGeometry(6.8, 16, 12), m.hair); af.position.set(0, 2.6, -1.4); headG.add(af); }
  if (look.facial === 1) headG.add(new THREE.Mesh(new THREE.SphereGeometry(4.78, 12, 8, 0, Math.PI * 2, Math.PI / 1.8, Math.PI / 3), stdM('#3a2a1f', { transparent: true, opacity: 0.35 })));
  if (look.facial === 2) { const bd = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 3), m.hair); bd.position.set(0, -3.2, 2.8); headG.add(bd); }
  if (look.facial === 3) { const mu = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 1), m.hair); mu.position.set(0, -1.6, 4.5); headG.add(mu); }
  if (look.accessory === 1) { const hb = new THREE.Mesh(new THREE.TorusGeometry(4.75, 0.6, 6, 20), m.trim); hb.rotation.x = Math.PI / 2; hb.position.y = 1.6; headG.add(hb); }
  if (look.accessory === 3) { const gl = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.4, 0.8), stdM('#111111', { roughness: 0.2, metalness: 0.4 })); gl.position.set(0, 0.6, 4.4); headG.add(gl); }
  if (look.accessory === 4) { const mk = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.8, 1.2), stdM('#e8e8e8')); mk.position.set(0, -2, 4.2); headG.add(mk); }
  const bat = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.9, 18, 8), stdM('#a06a33'));
  bat.position.set(0, -13, 4); bat.rotation.x = Math.PI / 2.6; bat.visible = false; armR.add(bat);
  const card = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 0.5), stdM('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.4 }));
  card.position.set(0, -15.5, 0); card.visible = false; armR.add(card);
  const birds = new THREE.Group();
  for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), stdM('#ffe66d', { emissive: '#ffcc33', emissiveIntensity: 0.6 })); b.position.set(Math.cos(k * 2.1) * 7, 0, Math.sin(k * 2.1) * 7); birds.add(b); }
  birds.position.y = 14; birds.visible = false; g.add(birds);
  g.scale.setScalar(1 + (look.height || 0) * 0.01);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { g, body, headG, legL, legR, armL, armR, bat, card, birds, m };
}
// Short animations layered over the running pose: fouls, shots, celebrations and taunts.
function applyAnim(R, anim, time) {
  if (!anim) return;
  const S2 = (o, x, y, z) => o.rotation.set(x, y, z);
  switch (anim) {
    case 'punch': S2(R.armR, -1.6, 0, -0.1); R.body.rotation.x += 0.15; break;
    case 'kick': R.body.position.y += 6; R.legR.rotation.x = -1.5; R.legL.rotation.x = 0.4; R.body.rotation.x = -0.35; S2(R.armL, -1.2, 0, 0.6); break;
    case 'swing': { const ph = Math.sin(time * 18); S2(R.armR, -1.4 + ph, 0, -0.3); S2(R.armL, -1.4 + ph, 0, 0.3); break; }
    case 'shoot': R.legR.rotation.x = -1.1; R.armL.rotation.z = 0.8; break;
    case 'plead': R.body.position.y = -6; R.legL.rotation.x = -1.5; R.legR.rotation.x = -1.5; S2(R.armL, -1.4, 0, 0.2); S2(R.armR, -1.4, 0, -0.2); break;
    case 'facepalm': S2(R.armR, -2.7, 0, -0.5); R.headG.rotation.x = 0.3; break;
    case 'cel0': R.body.position.y = -5; R.body.rotation.x = -0.35; R.legL.rotation.x = -1.5; R.legR.rotation.x = -1.5; S2(R.armL, -0.4, 0, 1.6); S2(R.armR, -0.4, 0, -1.6); break;
    case 'cel1': S2(R.armL, 0, 0, 1.55); S2(R.armR, 0, 0, -1.55); R.body.rotation.z = Math.sin(time * 4) * 0.3; break;
    case 'cel2': { const ph = (time * 1.6) % 1; R.body.rotation.x = -ph * Math.PI * 2; R.body.position.y = Math.sin(ph * Math.PI) * 18; break; }
    case 'cel3': { const st = Math.floor(time * 4) % 2; S2(R.armL, -1.57 * st, 0, 0.2); S2(R.armR, -1.57 * (1 - st), 0, -0.2); R.headG.rotation.y = st ? 0.5 : -0.5; break; }
    case 'cel4': S2(R.armR, -2.5, 0, -0.35); break;
    case 'cel5': S2(R.armR, -2.3, 0, -1.3); R.headG.rotation.z = 0.25; break;
    case 'shrug': S2(R.armL, -0.3, 0, 0.9); S2(R.armR, -0.3, 0, -0.9); break;
    case 'point': S2(R.armR, -1.55, 0, 0); R.headG.rotation.x = -0.15 * Math.sin(time * 10); break;
    case 'sorry': S2(R.armL, -2.9, 0, 0.3); S2(R.armR, -2.9, 0, -0.3); break;
    case 'wave': S2(R.armR, -2.8, 0, -0.4 + Math.sin(time * 12) * 0.4); break;
    case 'chest': { const st = Math.sin(time * 14) > 0; S2(R.armL, -1.3, 0, st ? -0.7 : -0.3); S2(R.armR, -1.3, 0, st ? 0.3 : 0.7); break; }
    case 'thumbs': S2(R.armR, -1.5, 0, -0.2); break;
  }
}
// Turntable preview for the character creator.
export function createPreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#c2d8ff', '#2a3a30', 1.3));
  const key = new THREE.DirectionalLight('#fff3da', 2.2); key.position.set(60, 120, 100); scene.add(key);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 3, 40), stdM('#1d2a24')); plinth.position.y = -1.5; scene.add(plinth);
  const cam = new THREE.PerspectiveCamera(30, 1, 1, 1000); cam.position.set(0, 30, 112); cam.lookAt(0, 22, 0);
  const tex = makeCanvasTex(renderer.capabilities.getMaxAnisotropy());
  let R = null, lastKey = '', raf = 0, anim = '', animUntil = 0;
  const t0 = performance.now();
  function frame() {
    const now = performance.now(), time = (now - t0) / 1000;
    if (R) {
      R.g.rotation.y = time * 0.6;
      R.body.rotation.set(0, 0, 0); R.body.position.y = 0; R.headG.rotation.set(0, 0, 0);
      R.legL.rotation.set(0, 0, 0); R.legR.rotation.set(0, 0, 0);
      R.armL.rotation.set(Math.sin(time * 2) * 0.05, 0, 0.12); R.armR.rotation.set(-Math.sin(time * 2) * 0.05, 0, -0.12);
      if (anim && now < animUntil) applyAnim(R, anim, time);
    }
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    renderer.render(scene, cam);
    raf = requestAnimationFrame(frame);
  }
  return {
    setLook(look) { const k = JSON.stringify(look); if (k === lastKey) return; lastKey = k; if (R) scene.remove(R.g); R = buildRig(look, tex); scene.add(R.g); },
    play(a, seconds = 2.5) { anim = a; animUntil = performance.now() + seconds * 1000; },
    start() { if (!raf) frame(); }, stop() { cancelAnimationFrame(raf); raf = 0; }
  };
}

export function createRenderer3D(canvas, G) {
  const { W, H, LW, LH, GOAL_HALF, GOAL_H, BOX_D, BOX_HALF, PEN_X, ARC_R, ARC_A, CIRCLE_R, GA_D, GA_HALF, TEAM, HUMAN_COL } = G;
  const SPACING = W > 1500 ? 15 : 10;   // crowd density: fewer, wider-spaced fans on the big stadium
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#04080b');
  scene.fog = new THREE.Fog('#04080b', 1700, 3400);
  const camera = new THREE.PerspectiveCamera(42, LW / LH, 10, 6000);
  const cam = { x: 0 };

  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const canvasTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t;
  };
  const shadowAll = (o, cast = true, receive = false) => o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = receive; } });

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight('#c2d8ff', '#14301c', 0.95));
  const sun = new THREE.DirectionalLight('#fff3da', 2.3);
  const SUN_BASE = new THREE.Color('#fff3da');
  sun.position.set(-380, 820, 430);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -700, right: 700, top: 480, bottom: -480, near: 100, far: 2200 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#9fc4ff', 0.55); fill.position.set(520, 420, -320); scene.add(fill);

  /* ---------- pitch ---------- */
  const M = 70, PX = W > 1500 ? 1.6 : 2;   // keeps the pitch texture within common GPU size limits
  const pitchTex = canvasTex((W + 2 * M) * PX, (H + 2 * M) * PX, c => {
    c.scale(PX, PX);
    c.fillStyle = '#165029'; c.fillRect(0, 0, W + 2 * M, H + 2 * M);
    c.translate(M, M);
    for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#1f7a40' : '#1b6d38'; c.fillRect(i * W / 12, 0, W / 12, H); }
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; c.fillRect(rand(-M, W + M), rand(-M, H + M), 1.5, 1.5); }
    c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 2.4; c.lineJoin = 'round'; c.fillStyle = '#fff';
    const seg = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    const arc = (x, y, r, a0 = 0, a1 = Math.PI * 2) => { c.beginPath(); c.arc(x, y, r, a0, a1); c.stroke(); };
    const spot = (x, y) => { c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill(); };
    c.strokeRect(0, 0, W, H); seg(W / 2, 0, W / 2, H); arc(W / 2, H / 2, CIRCLE_R); spot(W / 2, H / 2);
    for (const side of [0, 1]) {
      const x0 = side ? W : 0, d = side ? -1 : 1;
      c.strokeRect(Math.min(x0, x0 + d * BOX_D), H / 2 - BOX_HALF, BOX_D, BOX_HALF * 2);
      c.strokeRect(Math.min(x0, x0 + d * GA_D), H / 2 - GA_HALF, GA_D, GA_HALF * 2);
      const cx = x0 + d * PEN_X; spot(cx, H / 2);
      if (side) arc(cx, H / 2, ARC_R, Math.PI - ARC_A, Math.PI + ARC_A); else arc(cx, H / 2, ARC_R, -ARC_A, ARC_A);
    }
    arc(0, 0, 12, 0, Math.PI / 2); arc(W, 0, 12, Math.PI / 2, Math.PI); arc(0, H, 12, -Math.PI / 2, 0); arc(W, H, 12, Math.PI, Math.PI * 1.5);
  });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(W + 2 * M, H + 2 * M).rotateX(-Math.PI / 2), std('#ffffff', { map: pitchTex, roughness: 1 }));
  pitch.receiveShadow = true; scene.add(pitch);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(4200, 3200).rotateX(-Math.PI / 2), std('#0f2b19', { roughness: 1 }));
  ground.position.y = -0.4; ground.receiveShadow = true; scene.add(ground);

  /* ---------- stands and crowd ---------- */
  const standMat = std('#1b2622', { roughness: 0.95 });
  const crowdSpots = [];
  const DEPTH = 26, RISE = 11;
  for (let i = 0; i < 9; i++) {
    const z = -(H / 2 + M + 24 + i * DEPTH + DEPTH / 2), y = RISE * (i + 1);
    const box = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * M + 280, y, DEPTH), standMat);
    box.position.set(0, y / 2, z); box.receiveShadow = true; scene.add(box);
    for (let x = -(W / 2 + M + 130); x <= W / 2 + M + 130; x += SPACING) crowdSpots.push([x + rand(-2, 2), y, z + rand(-4, 4)]);
  }
  for (const sgn of [-1, 1]) for (let i = 0; i < 7; i++) {
    const x = sgn * (W / 2 + M + 34 + i * DEPTH + DEPTH / 2), y = RISE * (i + 1);
    const box = new THREE.Mesh(new THREE.BoxGeometry(DEPTH, y, H + 2 * M + 40), standMat);
    box.position.set(x, y / 2, 0); box.receiveShadow = true; scene.add(box);
    for (let z = -(H / 2 + M); z <= H / 2 + M; z += SPACING) crowdSpots.push([x + rand(-4, 4), y, z + rand(-2, 2)]);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * M + 600, 190, 20), std('#0e1513'));
  back.position.set(0, 95, -(H / 2 + M + 24 + 9 * DEPTH + 10)); scene.add(back);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 2 * M + 600, 6, 170), std('#121a17'));
  roof.position.set(0, 190, -(H / 2 + M + 24 + 9 * DEPTH - 70)); scene.add(roof);

  const N = crowdSpots.length;
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 9, 4.5), new THREE.MeshLambertMaterial(), N);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 6, 5), new THREE.MeshLambertMaterial({ color: '#d7b08c' }), N);
  const palette = [TEAM[0].col, '#2b78b8', TEAM[1].col, '#c4502c', '#e8e2d0', '#4a5b52', '#c9b46a', '#2a3a33'].map(c => new THREE.Color(c));
  const phase = new Float32Array(N), fan = new Float32Array(N);
  for (let i = 0; i < N; i++) { bodies.setColorAt(i, palette[(Math.random() * palette.length) | 0]); phase[i] = Math.random() * 6.28; fan[i] = Math.random(); }
  bodies.instanceColor.needsUpdate = true;
  scene.add(bodies, heads);
  const dummy = new THREE.Object3D();
  function updateCrowd(t, excite) {
    const ex = Math.min(1.3, excite || 0);
    for (let i = 0; i < N; i++) {
      const [x, y, z] = crowdSpots[i];
      const bob = Math.max(0, Math.sin(t * (6 + fan[i] * 4) + phase[i])) * (0.5 + ex * 5);
      dummy.position.set(x, y + 4.5 + bob, z); dummy.updateMatrix(); bodies.setMatrixAt(i, dummy.matrix);
      dummy.position.y += 7 + (ex > 0.55 && fan[i] > 0.6 ? 1 : 0); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
    }
    bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  }

  /* ---------- ad boards ---------- */
  const words = ['FOUL PLAY FC', 'SAND SOLD SEPARATELY', 'REFS: MIND YOUR EYES', 'BANANAS OF THE MONTH', 'CROWD-FUNDED CHAOS'];
  const boardTex = words.map((w, k) => canvasTex(512, 64, (c, cw, ch) => {
    c.fillStyle = k % 2 ? '#0d2a3d' : '#3a1409'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = k % 2 ? '#7fc8ff' : '#ffb08f'; c.font = "700 34px 'Barlow Condensed','Arial Narrow',sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(w, cw / 2, ch / 2 + 2);
  }));
  const boardGeo = new THREE.BoxGeometry(110, 14, 3);
  const boardBack = std('#111');
  let bi = 0;
  for (let x = -W / 2 - 40; x < W / 2 + 40; x += 114, bi++) {
    const m = new THREE.Mesh(boardGeo, [boardBack, boardBack, boardBack, boardBack, new THREE.MeshBasicMaterial({ map: boardTex[bi % words.length] }), boardBack]);
    m.position.set(x + 55, 7, -(H / 2 + 26)); scene.add(m);
  }
  for (const sgn of [-1, 1]) for (let z = -H / 2 + 20, k = 0; z < H / 2 - 20; z += 114, k++) {
    if (Math.abs(z + 55) < GOAL_HALF + 40) continue;
    const m = new THREE.Mesh(boardGeo, [boardBack, boardBack, boardBack, boardBack, new THREE.MeshBasicMaterial({ map: boardTex[(k + 2) % words.length] }), boardBack]);
    m.position.set(sgn * (W / 2 + 40), 7, z + 55); m.rotation.y = -sgn * Math.PI / 2; scene.add(m);
  }

  /* ---------- floodlights ---------- */
  const glowTex = canvasTex(128, 128, (c, w) => {
    const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255,250,225,1)'); g.addColorStop(0.25, 'rgba(255,245,210,.5)'); g.addColorStop(1, 'rgba(255,245,210,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, w);
  });
  for (const [x, z] of [[-(W / 2 + 190), -(H / 2 + 330)], [W / 2 + 190, -(H / 2 + 330)], [-(W / 2 + 330), H / 2 + 230], [W / 2 + 330, H / 2 + 230]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 420, 8), std('#3b4642', { metalness: 0.4 }));
    pole.position.set(x, 210, z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(70, 34, 8), std('#fffbe6', { emissive: '#fff6d0', emissiveIntensity: 1.6 }));
    head.position.set(x, 430, z); head.lookAt(0, 0, 0); scene.add(head);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
    glow.position.copy(head.position); glow.scale.set(300, 300, 1); scene.add(glow);
  }

  /* ---------- goals ---------- */
  const postMat = std('#f4f6f2', { roughness: 0.35 });
  const netMat = new THREE.LineBasicMaterial({ color: '#e8f0ea', transparent: true, opacity: 0.32 });
  for (const side of [0, 1]) {
    const x0 = side ? W / 2 : -W / 2, d = side ? 1 : -1, depth = 26, xb = x0 + d * depth;
    const post = h => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, h, 12), postMat); m.castShadow = true; return m; };
    for (const z of [-GOAL_HALF, GOAL_HALF]) { const p = post(GOAL_H); p.position.set(x0, GOAL_H / 2, z); scene.add(p); }
    const bar = post(GOAL_HALF * 2); bar.rotation.x = Math.PI / 2; bar.position.set(x0, GOAL_H, 0); scene.add(bar);
    const pts = [], L = (a, b, c2, e, f, g) => pts.push(a, b, c2, e, f, g);
    for (let z = -GOAL_HALF; z <= GOAL_HALF + 0.1; z += 8) { L(xb, 0, z, xb, GOAL_H, z); L(xb, GOAL_H, z, x0, GOAL_H, z); }
    for (let y = 0; y <= GOAL_H + 0.1; y += 8) { L(xb, y, -GOAL_HALF, xb, y, GOAL_HALF); L(x0, y, -GOAL_HALF, xb, y, -GOAL_HALF); L(x0, y, GOAL_HALF, xb, y, GOAL_HALF); }
    for (let k = 0; k <= depth; k += 8) { const x = x0 + d * k; L(x, 0, -GOAL_HALF, x, GOAL_H, -GOAL_HALF); L(x, 0, GOAL_HALF, x, GOAL_H, GOAL_HALF); L(x, GOAL_H, -GOAL_HALF, x, GOAL_H, GOAL_HALF); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(geo, netMat));
  }

  /* ---------- people: a jointed low-poly rig ---------- */
  function makeRig(look) { const R = buildRig(look, canvasTex); scene.add(R.g); return R; }
  function pose(R, x, y, face, run, moving, down, lean) {
    R.g.position.set(x - W / 2, 0, y - H / 2);
    R.g.rotation.y = Math.PI / 2 - face;
    R.headG.rotation.set(0, 0, 0);
    const sw = Math.sin(run) * 0.85 * moving;
    R.legL.rotation.set(sw, 0, 0); R.legR.rotation.set(-sw, 0, 0);
    R.armL.rotation.set(-sw * 0.9, 0, 0.1); R.armR.rotation.set(sw * 0.9, 0, -0.1);
    if (down) { R.body.rotation.set(Math.PI / 2 * 0.97, 0, 0); R.body.position.y = 3.6; R.legL.rotation.x = 0.25; R.legR.rotation.x = -0.15; R.armL.rotation.z = 1.1; R.armR.rotation.z = -1.1; }
    else { R.body.rotation.set(lean || 0, 0, 0); R.body.position.y = 0; }
  }

  const playerRigs = [];
  const playerLook = p => {
    const L = { jersey: p.gk ? (p.team === 0 ? '#c6f04a' : '#b57cff') : TEAM[p.team].col, shorts: TEAM[p.team].shorts, socks: TEAM[p.team].socks,
      skin: p.skin, hair: p.hair, num: p.num, numCol: p.team === 0 || p.gk ? '#0b1a2a' : '#fff4ee' };
    const sk = p.skinData, O = G.SKIN_OPTS;
    if (sk && O) Object.assign(L, { trim: O.trim[sk.trim], sleeveStyle: sk.sleeves, sockStyle: sk.socks, boots: O.boots[sk.boots], hairStyle: sk.hair, facial: sk.facial, accessory: sk.accessory, build: sk.build, height: sk.height });
    return L;
  };
  const refRigs = [0, 1].map(() => makeRig({ jersey: '#161616', shorts: '#161616', socks: '#161616', sleeves: '#ffd23f', skin: '#d9a477', hair: '#2a2a2a', num: null, numCol: '#fff' }));

  /* ---------- ball ---------- */
  const ballTex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#f6f6f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1b1b1b';
    for (let i = 0; i < 12; i++) {
      const x = (i % 6) * w / 6 + (i < 6 ? w / 12 : 0), y = i < 6 ? h * 0.28 : h * 0.72;
      c.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13); } c.fill();
    }
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(4.4, 22, 16), std('#ffffff', { map: ballTex, roughness: 0.45 }));
  ball.castShadow = true; scene.add(ball);

  /* ---------- items and bananas (pooled meshes) ---------- */
  function makeItem(type) {
    const g = new THREE.Group();
    if (type === 'medkit') {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(10, 7, 10), std('#f4f4f0')));
      const a = new THREE.Mesh(new THREE.BoxGeometry(7, 7.4, 2.2), std('#e23b3b')), b = a.clone(); b.rotation.y = Math.PI / 2; g.add(a, b);
    } else if (type === 'bat') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.1, 20, 8), std('#b07a3c')); m.rotation.z = Math.PI / 2.3; g.add(m);
    } else if (type === 'flash') {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(4, 14, 10), std('#ffd23f', { emissive: '#ffcc33', emissiveIntensity: 1.4 })));
    } else if (type === 'banana' || type === 'peel') {
      const m = new THREE.Mesh(new THREE.TorusGeometry(5, 1.5, 6, 14, Math.PI * 0.85), std('#ffe14d', { roughness: 0.55 }));
      if (type === 'peel') m.rotation.x = -Math.PI / 2; g.add(m);
    } else {
      const col = (G.ITEM_COL && G.ITEM_COL[type]) || '#ffffff';
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(4.6, 0), std(col, { emissive: col, emissiveIntensity: 0.55, roughness: 0.4 })));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.5, 6, 24), std(col, { emissive: col, emissiveIntensity: 0.8 })); ring.rotation.x = Math.PI / 2; g.add(ring);
    }
    shadowAll(g); scene.add(g); return g;
  }
  const pools = {};
  function pooled(type, idx) { const p = pools[type] || (pools[type] = []); if (!p[idx]) p[idx] = makeItem(type); return p[idx]; }
  function hideFrom(type, n) { (pools[type] || []).forEach((m, i) => { m.visible = i < n; }); }

  /* ---------- referee vision cones ---------- */
  const cones = [];
  function cone(r) {
    const geo = new THREE.CircleGeometry(r.range, 36, -r.fov / 2, r.fov).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffec8c', transparent: true, opacity: 0.17, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    const pts = [new THREE.Vector3(0, 0, 0)];
    for (let i = 0; i <= 36; i++) { const a = -r.fov / 2 + r.fov * i / 36; pts.push(new THREE.Vector3(Math.cos(a) * r.range, 0, -Math.sin(a) * r.range)); }
    pts.push(new THREE.Vector3(0, 0, 0));
    const edge = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#ffec8c', transparent: true, opacity: 0.5 }));
    mesh.add(edge); mesh.renderOrder = 2; scene.add(mesh);
    return { mesh, mat, edge, fov: r.fov, range: r.range };
  }

  /* ---------- ground markers ---------- */
  const ringGeo = new THREE.RingGeometry(12.5, 15.5, 44).rotateX(-Math.PI / 2);
  const targetGeo = new THREE.RingGeometry(14, 17.5, 44).rotateX(-Math.PI / 2);
  const arrowShape = new THREE.Shape(); arrowShape.moveTo(27, 0); arrowShape.lineTo(18, 6.5); arrowShape.lineTo(18, -6.5); arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape).rotateX(-Math.PI / 2);
  const flatMat = col => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false });
  const markers = [], targets = [], passes = [];
  function marker(i) {
    if (!markers[i]) { const g = new THREE.Group(), mat = flatMat('#ffd23f'); g.add(new THREE.Mesh(ringGeo, mat), new THREE.Mesh(arrowGeo, mat)); g.renderOrder = 3; scene.add(g); markers[i] = { g, mat }; }
    return markers[i];
  }
  function target(i) {
    if (!targets[i]) { const mat = flatMat('#ff4d6d'), m = new THREE.Mesh(targetGeo, mat); m.renderOrder = 3; scene.add(m); targets[i] = { m, mat }; }
    return targets[i];
  }
  function pass(i) {
    if (!passes[i]) {
      const mat = new THREE.LineDashedMaterial({ color: '#ffd23f', dashSize: 8, gapSize: 6, transparent: true, opacity: 0.8, depthWrite: false });
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), mat);
      const ringMat = flatMat('#ffd23f'), ring = new THREE.Mesh(new THREE.RingGeometry(10, 12.5, 36).rotateX(-Math.PI / 2), ringMat);
      scene.add(line, ring); passes[i] = { line, mat, ring, ringMat };
    }
    return passes[i];
  }

  /* ---------- air-ball indicator (like Rocket League's) ---------- */
  const airMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
  const airRing = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2), airMat);
  const landMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.95, depthWrite: false });
  const landMark = new THREE.Group();
  landMark.add(new THREE.Mesh(new THREE.RingGeometry(9, 11.5, 40).rotateX(-Math.PI / 2), landMat));
  landMark.add(new THREE.Mesh(new THREE.PlaneGeometry(14, 1.6).rotateX(-Math.PI / 2), landMat), new THREE.Mesh(new THREE.PlaneGeometry(1.6, 14).rotateX(-Math.PI / 2), landMat));
  const airLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 4, gapSize: 4, transparent: true, opacity: 0.5, depthWrite: false }));
  airRing.renderOrder = landMark.renderOrder = airLine.renderOrder = 4;
  scene.add(airRing, landMark, airLine);

  const trailMat = new THREE.LineBasicMaterial({ color: '#4fd6ff', transparent: true, opacity: 0.85 });
  const trailLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 18 }, () => new THREE.Vector3())), trailMat); trailLine.visible = false; scene.add(trailLine);
  const puddles = [], decoyRigs = [];
  function puddle(i) { if (!puddles[i]) { const m = new THREE.Mesh(new THREE.CircleGeometry(20, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4fbf5f', transparent: true, opacity: 0.7, roughness: 0.2 })); m.renderOrder = 2; scene.add(m); puddles[i] = m; } return puddles[i]; }
  const ghost = mat => { const c = mat.clone(); c.transparent = true; c.opacity = 0.45; c.depthWrite = false; return c; };

  /* ---------- anomalies: UFO, pirates, pitch invaders, ice blocks ---------- */
  const ufo = new THREE.Group();
  {
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(22, 46, 9, 36), std('#9fb2bb', { metalness: 0.7, roughness: 0.3 }));
    const under = new THREE.Mesh(new THREE.CylinderGeometry(46, 30, 5, 36), std('#5d6e77', { metalness: 0.6, roughness: 0.4 })); under.position.y = -7;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(18, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#9dffdc', emissive: '#2a8f6a', emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.1 })); dome.position.y = 4;
    const pilot = new THREE.Mesh(new THREE.SphereGeometry(6, 12, 10), std('#7dff9b', { emissive: '#3fbf5f', emissiveIntensity: 0.5 })); pilot.position.y = 10;
    ufo.add(hull, under, dome, pilot);
    ufo.lights = [];
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, l = new THREE.Mesh(new THREE.SphereGeometry(2.4, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffd23f', emissiveIntensity: 1.5 })); l.position.set(Math.cos(a) * 42, -4, Math.sin(a) * 42); ufo.add(l); ufo.lights.push(l); }
    shadowAll(ufo); ufo.visible = false; scene.add(ufo);
  }
  const beamMat = new THREE.MeshBasicMaterial({ color: '#9dffb8', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(10, 32, 1, 28, 1, true).translate(0, 0.5, 0), beamMat); beam.visible = false; beam.renderOrder = 5; scene.add(beam);
  const zoneMat = new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.1, depthWrite: false });
  const zone = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), zoneMat); zone.visible = false; zone.renderOrder = 2; scene.add(zone);
  const PIRATE = { jersey: '#f4f4f0', shorts: '#2b2b2b', socks: '#2b2b2b', skin: '#c58c5e', hair: '#1b120c', num: null, numCol: '#fff', trim: '#d0312d', hairStyle: 5, facial: 2, accessory: 1, build: 2, boots: '#3a2416', sleeves: '#d0312d' };
  const pirateRigs = [], fanRigs = [], iceBlocks = [];
  function pirateRig(i) {
    if (pirateRigs[i]) return pirateRigs[i];
    const R = makeRig(PIRATE);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(9, 9, 3), std('#1b1b1b')); hat.position.y = 44; hat.rotation.y = Math.PI / 6; hat.scale.z = 0.6; R.body.add(hat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1, 16, 2.4), std('#d8dde0', { metalness: 0.8, roughness: 0.25 })); blade.position.set(0, -20, 3); blade.rotation.x = 0.5; R.armR.add(blade);
    return (pirateRigs[i] = R);
  }
  function fanRig(i, f) {
    const key = f.col + f.hair + f.skin; let R = fanRigs[i];
    if (!R || R.key !== key) { if (R) scene.remove(R.g); R = fanRigs[i] = makeRig({ jersey: f.col, shorts: '#3b4a5a', socks: '#e8e8e8', skin: f.skin, hair: f.hair, num: null, numCol: '#fff' }); R.key = key; }
    return R;
  }
  function iceBlock(i) { if (!iceBlocks[i]) { const m = new THREE.Mesh(new THREE.BoxGeometry(24, 48, 24).translate(0, 24, 0), new THREE.MeshStandardMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.1, depthWrite: false })); m.renderOrder = 3; scene.add(m); iceBlocks[i] = m; } return iceBlocks[i]; }
  const liftOf = (A, kind, i) => { const u = A && A.ufo; return u && u.ph === 'beam' && u.tk === kind && u.ti === i ? u.lift * 70 : 0; };

  /* ---------- per-frame ---------- */
  let last = null, lastWx = null, fkB = 0, lastFk = null;
  const fkPos = new THREE.Vector3(), fkLook = new THREE.Vector3(), camLook = new THREE.Vector3();
  function render(time) {
    const S = G.S, dt = last == null ? 0.016 : clamp(time - last, 0, 0.1); last = time;
    const b = S.ball;

    // camera: broadcast angle from the near side, with the focused player in the middle of the screen
    const V0 = G.view(), cf = V0.camfx || {};
    const f = G.cam(), fx = f.x - W / 2, fz = f.y - H / 2, sh = S.shake || 0;
    if (cf.orbit) { const a = cf.orbit.a; camera.position.set(fx + Math.sin(a) * 600, 420, fz + Math.cos(a) * 600); camLook.set(fx, 20, fz); }
    else { camera.position.set(fx + (Math.random() - 0.5) * sh, 540 + (Math.random() - 0.5) * sh, fz + 660); camLook.set(fx, 12, fz); }
    // set pieces: swing round behind the ball, facing the goal
    const fk = cf.orbit ? null : V0.fkcam; if (fk) lastFk = fk;
    fkB += ((fk ? 1 : 0) - fkB) * Math.min(1, dt * 2.4);
    const fkE = fkB * fkB * (3 - 2 * fkB);
    if (fkE > 0.001 && lastFk) {
      const L = lastFk, ax = L.tx - L.x, ay = L.ty - L.y, al = Math.hypot(ax, ay) || 1, ux = ax / al, uy = ay / al;
      fkPos.set(L.x - ux * 200 - uy * 46 - W / 2, 105, L.y - uy * 200 + ux * 46 - H / 2); fkLook.set(L.x + ux * Math.min(320, al) - W / 2, 22, L.y + uy * Math.min(320, al) - H / 2);
      camera.position.lerp(fkPos, fkE); camLook.lerp(fkLook, fkE);
    }
    camera.lookAt(camLook);
    const fov = 42 - (cf.zoom || 0) + 12 * fkE; if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    sun.position.set(fx - 380, 820, fz + 430); sun.target.position.set(fx, 0, fz); sun.target.updateMatrixWorld();   // shadows follow the camera

    // players
    S.players.forEach((p, i) => {
      const L = playerLook(p), key = JSON.stringify(L);
      let R = playerRigs[i];
      if (!R || R.key !== key) { if (R) scene.remove(R.g); R = playerRigs[i] = makeRig(L); R.key = key; }   // rebuilt when the look or skin changes
      R.g.visible = p.sentOff <= 0;
      if (!R.g.visible) return;
      const down = p.stun > 0 || p.ko > 0 || p.slide > 0;
      pose(R, p.x, p.y, p.face, p.run, Math.min(1, Math.hypot(p.vx, p.vy) / 120), down, p.sprinting ? 0.32 : 0);
      if (p.dive > 0 || p.diveDown > 0 || p.diveState) {   // goalkeeper dive: roll sideways, arms stretched
        const s = p.diveDir || p.diveState || 1;
        R.body.rotation.set(0, 0, Math.sign(s * Math.cos(p.face) || 1) * Math.PI / 2 * 0.92); R.body.position.y = 6;
        R.armL.rotation.set(-2.9, 0, 0.2); R.armR.rotation.set(-2.9, 0, -0.2); R.legL.rotation.x = 0.3; R.legR.rotation.x = -0.2;
      }
      applyAnim(R, p.anim, time);
      R.g.position.y += liftOf(S.an, 'p', i) + (p.z || 0);
      if (p.slide > 0) { R.body.rotation.set(-1.25, 0, 0); R.body.position.y = 4; R.legL.rotation.x = -1.4; R.legR.rotation.x = -0.6; }
      else if (p.z > 0 && !down) { R.legL.rotation.x = -0.9; R.legR.rotation.x = 0.4; R.armL.rotation.set(-2.4, 0, 0.4); R.armR.rotation.set(-2.4, 0, -0.4); }
      if (p.carry != null && !down) { R.armL.rotation.set(-3.0, 0, 0.35); R.armR.rotation.set(-3.0, 0, -0.35); }
      R.headG.scale.setScalar(V0.bigHead ? 1.9 : 1); R.headG.position.y = V0.bigHead ? 40.5 : 36.8;
      R.birds.visible = p.ko > 0; R.birds.rotation.y = time * 4;
      R.bat.visible = p.items && p.items.bat > 0 && !down;
      R.m.jersey.emissive.setRGB(p.hitT > 1.6 ? 0.5 : 0, 0, 0);
    });
    for (let i = S.players.length; i < playerRigs.length; i++) playerRigs[i].g.visible = false;

    // referees
    refRigs.forEach((R, i) => { R.g.visible = i < S.refs.length && !(S.refs[i].gone > 0); });
    cones.forEach((c, i) => { if (i >= S.refs.length) c.mesh.visible = false; });
    S.refs.forEach((r, i) => {
      const R = refRigs[i];
      pose(R, r.x, r.y, r.face, r.run, r.blind > 0 ? 0.3 : 0.8, false, 0);
      R.g.position.y += liftOf(S.an, 'r', i) + (r.z || 0);
      if (r.carriedBy != null) { R.body.rotation.set(0, 0, Math.PI / 2); R.body.position.y = 12; R.armL.rotation.set(-1.2 + Math.sin(time * 9) * 0.5, 0, 0.3); R.armR.rotation.set(-1.2 - Math.sin(time * 9) * 0.5, 0, -0.3); R.legL.rotation.x = Math.sin(time * 11) * 0.6; R.legR.rotation.x = -Math.sin(time * 11) * 0.6; }
      else if (r.z > 0) { R.body.rotation.set(time * 9, 0, 0); R.body.position.y = 22; }
      R.card.visible = !!r.card;
      if (r.card) { R.card.material.color.set(r.card.red ? '#ff3b3b' : '#ffd23f'); R.card.material.emissive.set(r.card.red ? '#ff3b3b' : '#ffd23f'); R.armR.rotation.set(-2.9, 0, -0.15); }
      if (r.blind > 0) { R.armL.rotation.set(-2.5, 0, 0.55); R.armR.rotation.set(-2.5, 0, -0.55); }
      const c = cones[i] || (cones[i] = cone(r));
      c.mesh.visible = r.blind <= 0 && !(r.gone > 0);
      c.mesh.position.set(r.x - W / 2, 0.7 + i * 0.05, r.y - H / 2);
      c.mesh.rotation.y = -r.face;
      const hot = G.coneHot(r), col = hot ? '#ff5a6e' : '#ffec8c';
      c.mat.color.set(col); c.mat.opacity = hot ? 0.13 : r.human ? 0.16 : 0.08; c.edge.material.color.set(col); c.edge.material.opacity = hot ? 0.55 : 0.35;
    });

    // ball
    ball.position.set(b.x - W / 2, (b.z || 0) + 4.4, b.y - H / 2);
    ball.rotation.set((b.spin || 0) * 0.9, 0, (b.spin || 0) * 0.35);
    ball.scale.setScalar(V0.mega ? 2 : 1);
    const land = V0.land, inAir = !!land;
    airRing.visible = landMark.visible = airLine.visible = inAir;
    if (inAir) {
      const bz = b.z || 0, r = 7 + Math.min(40, bz * 0.18);   // ring under the ball tightens as it comes down
      airRing.position.set(b.x - W / 2, 0.9, b.y - H / 2); airRing.scale.setScalar(r);
      landMark.position.set(land.x - W / 2, 1, land.y - H / 2); landMark.scale.setScalar(1 + Math.sin(time * 12) * 0.1);
      const lp = airLine.geometry.attributes.position;
      lp.setXYZ(0, b.x - W / 2, 1, b.y - H / 2); lp.setXYZ(1, b.x - W / 2, bz, b.y - H / 2); lp.needsUpdate = true; airLine.computeLineDistances();
    }

    // crowd gifts in flight or on the ground, and dropped bananas
    const used = {};
    for (const it of S.items) {
      const k = it.type, n = used[k] || 0, m = pooled(k, n); used[k] = n + 1;
      const blink = it.landed && it.age > 14 && Math.floor(time * 8) % 2;
      m.visible = !blink;
      m.position.set(it.x - W / 2, (it.z || 0) + 5 + (it.landed ? Math.sin(time * 4 + it.x) * 1.5 : 0), it.y - H / 2);
      m.rotation.y = time * 2 + it.x;
    }
    for (const k of Object.keys(pools)) if (k !== 'peel') hideFrom(k, used[k] || 0);
    S.bananas.forEach((n, i) => { const m = pooled('peel', i); m.visible = true; m.position.set(n.x - W / 2, 1.6, n.y - H / 2); });
    hideFrom('peel', S.bananas.length);

    // ground markers from the game: who you control, who you'd foul, who you'd pass to
    const v = V0;
    v.humans.forEach((h, i) => { const mk = marker(i); mk.g.visible = true; mk.mat.color.set(h.col); mk.g.position.set(h.x - W / 2, 0.9, h.y - H / 2); mk.g.rotation.y = -h.face; });
    let mi = v.humans.length;
    if (v.refHuman) { const mk = marker(mi++); mk.g.visible = true; mk.mat.color.set('#ffd23f'); mk.g.position.set(v.refHuman.x - W / 2, 0.9, v.refHuman.y - H / 2); mk.g.rotation.y = -v.refHuman.face; }
    markers.forEach((mk, i) => { if (i >= mi) mk.g.visible = false; });
    const pulse = 1 + Math.sin(time * 10) * 0.08;
    v.targets.forEach((t, i) => { const tg = target(i); tg.m.visible = true; tg.mat.color.set(t.col); tg.m.position.set(t.x - W / 2, 1, t.y - H / 2); tg.m.scale.setScalar(pulse); });
    targets.forEach((tg, i) => { if (i >= v.targets.length) tg.m.visible = false; });
    v.passes.forEach((p, i) => {
      const ps = pass(i), pos = ps.line.geometry.attributes.position;
      pos.setXYZ(0, p.x1 - W / 2, 1.2, p.y1 - H / 2); pos.setXYZ(1, p.x2 - W / 2, 1.2, p.y2 - H / 2); pos.needsUpdate = true;
      ps.line.computeLineDistances(); ps.mat.color.set(p.col); ps.ringMat.color.set(p.col);
      ps.ring.position.set(p.x2 - W / 2, 1.1, p.y2 - H / 2); ps.line.visible = ps.ring.visible = true;
    });
    passes.forEach((ps, i) => { if (i >= v.passes.length) ps.line.visible = ps.ring.visible = false; });

    // power-shot trail
    const tr = V0.trail || [];
    trailLine.visible = tr.length > 2 && !!V0.trailCol;
    if (trailLine.visible) { const tp = trailLine.geometry.attributes.position; for (let i = 0; i < 18; i++) { const q = tr[Math.min(i, tr.length - 1)]; tp.setXYZ(i, q.x - W / 2, q.z + 4.4, q.y - H / 2); } tp.needsUpdate = true; trailLine.geometry.setDrawRange(0, tr.length); trailMat.color.set(V0.trailCol); }
    // glue puddles
    (V0.puddles || []).forEach((g2, i) => { const m = puddle(i); m.visible = true; m.position.set(g2.x - W / 2, 0.8, g2.y - H / 2); m.material.opacity = Math.min(0.75, g2.ttl / 2); });
    puddles.forEach((m, i) => { if (i >= (V0.puddles || []).length) m.visible = false; });
    // decoys: see-through copies of the player who threw them
    (V0.decoys || []).forEach((d, i) => {
      const src = S.players[d.src], L = src ? playerLook(src) : { jersey: TEAM[d.team].col, shorts: TEAM[d.team].shorts, socks: TEAM[d.team].socks, skin: '#d9a477', hair: '#222', num: null, numCol: '#fff' }, key = JSON.stringify(L);
      let R = decoyRigs[i];
      if (!R || R.key !== key) { if (R) scene.remove(R.g); R = decoyRigs[i] = makeRig(L); R.key = key; R.g.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(x => ghost(x)) : ghost(o.material); o.castShadow = false; } }); }
      R.g.visible = true; pose(R, d.x, d.y, src ? src.face : 0, d.run, 1, false, 0.2);
    });
    decoyRigs.forEach((R, i) => { if (i >= (V0.decoys || []).length) R.g.visible = false; });

    // anomalies
    const A = S.an || {};
    const u = A.ufo;
    ufo.visible = !!u; beam.visible = !!u && u.beam > 0.02;
    if (u) {
      ufo.position.set(u.x - W / 2, u.z + Math.sin(time * 2) * 4, u.y - H / 2); ufo.rotation.y = time * 1.5; ufo.rotation.z = Math.sin(time * 1.3) * 0.06;
      ufo.lights.forEach((l, k) => l.material.emissive.set((k + Math.floor(time * 6)) % 2 ? '#ffd23f' : '#ff4d6d'));
      if (beam.visible) { beam.position.set(u.x - W / 2, 0, u.y - H / 2); beam.scale.set(1, Math.max(1, u.z - 8), 1); beamMat.opacity = 0.32 * u.beam * (0.8 + 0.2 * Math.sin(time * 20)); }
    }
    (A.pir || []).forEach((q, i) => {
      const R = pirateRig(i); R.g.visible = true;
      pose(R, q.x, q.y, q.face, q.run, q.mv ? 1 : 0, q.st === 'down', 0.1);
      if (q.st === 'drag') { R.armL.rotation.set(-1.4, 0, 0.2); R.armR.rotation.set(-1.4, 0, -0.2); }
      else if (q.st === 'in' && !q.mv) R.armR.rotation.set(-2.6 + Math.sin(time * 14) * 0.8, 0, -0.1);
    });
    pirateRigs.forEach((R, i) => { if (i >= (A.pir || []).length) R.g.visible = false; });
    (A.inv || []).forEach((f, i) => {
      const R = fanRig(i, f); R.g.visible = true;
      pose(R, f.x, f.y, f.face, f.run, f.mv ? 1 : 0, false, 0);
      R.armL.rotation.set(-2.8 + Math.sin(time * 9 + i) * 0.3, 0, 0.3); R.armR.rotation.set(-2.8 + Math.cos(time * 9 + i) * 0.3, 0, -0.3);
      R.g.position.y += Math.abs(Math.sin(time * 8 + i)) * 3;
    });
    fanRigs.forEach((R, i) => { if (i >= (A.inv || []).length) R.g.visible = false; });
    zone.visible = !!A.zone;
    if (A.zone) { const z = A.zone; zone.position.set((z.x0 + z.x1) / 2 - W / 2, 0.85, (z.y0 + z.y1) / 2 - H / 2); zone.scale.set(z.x1 - z.x0, 1, z.y1 - z.y0); zoneMat.opacity = 0.08 + 0.05 * Math.sin(time * 4); }
    let ib = 0;
    for (const p of S.players) if (p.iceT > 0 && p.sentOff <= 0) { const m = iceBlock(ib++); m.visible = true; m.position.set(p.x - W / 2, 0, p.y - H / 2); }
    iceBlocks.forEach((m, i) => { if (i >= ib) m.visible = false; });
    // weather tints the floodlights
    const wk = A.wx ? A.wx.k : null, wkk = A.wx ? Math.min(1, A.wx.t / 1.5, (A.wx.d - A.wx.t) / 1.5) : 0;
    if (wk !== lastWx || wkk > 0) { lastWx = wk; sun.color.set(wk === 'heat' ? '#ffb070' : wk === 'ice' ? '#d8f0ff' : '#fff3da').lerp(SUN_BASE, 1 - Math.max(0, wkk)); }

    updateCrowd(time, S.excite);
    renderer.render(scene, camera);
  }

  // World point to the 2D overlay canvas (logical LW×LH); s = overlay pixels per world unit there.
  const pv = new THREE.Vector3(), pw = new THREE.Vector3();
  const focal = () => (LH / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function project(x, y, z = 0) {
    pw.set(x - W / 2, z, y - H / 2); pv.copy(pw).project(camera);
    return { x: (pv.x + 1) / 2 * LW, y: (1 - pv.y) / 2 * LH, s: focal() / (camera.position.distanceTo(pw) || 1) };
  }
  function resize(w, h, dpr) {
    renderer.setPixelRatio(Math.min(2, dpr || 1)); renderer.setSize(Math.max(1, w), Math.max(1, h), false);
    camera.aspect = Math.max(1, w) / Math.max(1, h); camera.updateProjectionMatrix();
  }
  camera.position.set(0, 540, 660); camera.lookAt(0, 12, 0);
  return { render, project, resize, dispose: () => renderer.dispose() };
}

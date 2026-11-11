/* Foul Play FC · net.js
   Online play: PeerJS rooms, the relay fallback, lobby roster, host snapshots and player inputs.
   Classic script: shares one global scope with the other files in js/, loaded in the order listed in index.html. */
'use strict';

/* ---------------- online play (PeerJS / WebRTC) ----------------
   The host's browser IS the server: it keeps the roster and the true game state in memory,
   runs the simulation, and sends snapshots ~20 times a second straight to each player over WebRTC.
   The public PeerJS server (0.peerjs.com) is only used to introduce players to the host by room code. */
let NET = null, PEER_READY = null;
const $ = id => document.getElementById(id);
const onStatus = t => { $('on-status').textContent = t || ''; };
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const CODE_CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PEER_PREFIX = 'foulplayfc-v1-';
const MAX_PLAYERS = 10;

function loadPeerJs() {
  if (window.Peer) return Promise.resolve();
  if (PEER_READY) return PEER_READY;
  PEER_READY = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    s.onload = () => res();
    s.onerror = () => { PEER_READY = null; s.remove(); rej(new Error('Could not load PeerJS. Check your internet connection.')); };
    document.head.appendChild(s);
  });
  return PEER_READY;
}
function openPeer(id) {
  return new Promise((res, rej) => {
    const p = id ? new Peer(id, { debug: 1 }) : new Peer({ debug: 1 });
    const fail = e => { p.off('open', ok); p.destroy(); rej(e); };
    const ok = () => { p.off('error', fail); res(p); };
    p.once('open', ok); p.once('error', fail);
  });
}
function randomCode() { return Array.from({ length: 5 }, () => CODE_CH[Math.floor(Math.random() * CODE_CH.length)]).join(''); }
function myName() { const n = ($('on-name').value || '').trim().slice(0, 14) || 'Player'; store.set('fpfc-name', n); return n; }
function newNet(code, isHost, peer) {
  return { code, isHost, peer, uid: peer.id, conn: null, conns: {}, roster: {}, inputs: {}, meta: { host: isHost ? peer.id : '', status: 'lobby' },
    lastSnap: 0, pc: 1, pings: {}, pingTimer: 0, muted: new Set(), cnt: { s1: 0, s2: 0, s3: 0, ul: 0, pass: 0, lpass: 0, foul: 0, switch: 0, blind: 0, item: 0, sp: 0, sr: 0 }, pw: 0.5, sent: '', sentAt: 0, prev: {}, charge: 0, charging: false, lastPm: '' };
}
function netError(e) {
  console.error(e);
  const t = e && e.type, m = String((e && e.message) || e);
  if (t === 'peer-unavailable') onStatus('No room with that code. Check it with the host. The host must keep the game tab open.');
  else if (m === 'TIMEOUT') onStatus('Found the room but could not connect to the host. A strict firewall or mobile network may block direct connections; try another network, such as a phone hotspot.');
  else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(t)) onStatus('Could not reach the matchmaking server (0.peerjs.com). Check your internet connection and try again.');
  else if (t === 'browser-incompatible') onStatus('This browser does not support WebRTC. Use a current Chrome, Firefox, Edge or Safari.');
  else onStatus('Could not connect: ' + m);
}
function openOnline() {
  showOverlay('online');
  const n = store.get('fpfc-name'); if (n && !$('on-name').value) $('on-name').value = n;
  $('on-setup').hidden = !!NET; $('on-lobby').hidden = !NET;
  if (!NET && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) onStatus('You are on localhost, which friends cannot open. Send them the GitHub Pages link, or restart with start-mac.command / start-windows.bat and choose the Cloudflare link.');
}
function showLobby() {
  $('on-roomcode').textContent = NET.code; $('on-setup').hidden = true; $('on-lobby').hidden = false;
  $('on-start').hidden = !NET.isHost; $('on-swap').hidden = false;
  renderRoster();
}

/* ----- link relay: server.py forwards messages for players who can't connect directly ----- */
function makeEmitter(o) {
  const h = {};
  o.on = (e, f) => { (h[e] = h[e] || []).push(f); return o; };
  o.off = (e, f) => { h[e] = (h[e] || []).filter(x => x !== f); return o; };
  o.once = (e, f) => { const g = (...a) => { o.off(e, g); f(...a); }; return o.on(e, g); };
  o.emit = (e, ...a) => (h[e] || []).slice().forEach(f => { try { f(...a); } catch (err) { console.error(err); } });
  return o;
}
function relayUrl(base, role, code) {
  const u = new URL('/ws', base); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.searchParams.set('role', role); u.searchParams.set('room', code); return u.href;
}
// Host side: one WebSocket to the local server.py; each relayed player appears as a connection
// with the same shape as a PeerJS DataConnection, so the rest of the host code treats both alike.
function openRelayHub(code, base = location.href) {
  return new Promise(res => {
    let ws; try { ws = new WebSocket(relayUrl(base, 'host', code)); } catch (e) { res(null); return; }
    const hub = { ws, conns: {}, closed: false };
    const t = setTimeout(() => { try { ws.close(); } catch (e) {} res(null); }, 4000);
    ws.onopen = () => { clearTimeout(t); res(hub); };
    ws.onerror = () => { clearTimeout(t); res(null); };
    ws.onmessage = ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.t === '_open') {
        const id = m.id, c = makeEmitter({ peer: 'relay-' + id, open: true, relay: true,
          send: d => { if (c.open && ws.readyState === 1) ws.send(JSON.stringify({ t: '_to', id, d })); },
          close: () => { if (!c.open) return; c.open = false; delete hub.conns[id]; if (ws.readyState === 1) ws.send(JSON.stringify({ t: '_kick', id })); c.emit('close'); } });
        hub.conns[id] = c; hostAccept(c);
      } else if (m.t === '_msg') { const c = hub.conns[m.id]; if (c) c.emit('data', m.d); }
      else if (m.t === '_close') { const c = hub.conns[m.id]; if (c) { c.open = false; delete hub.conns[m.id]; c.emit('close'); } }
    };
    ws.onclose = () => { hub.closed = true; for (const c of Object.values(hub.conns)) { c.open = false; c.emit('close'); } hub.conns = {}; if (NET && NET.hub === hub) updateInvite(); };
  });
}
// Guest side: a WebSocket to the host's server.py (usually through its Cloudflare link).
function relayConnect(base, code) {
  return new Promise((res, rej) => {
    let ws; try { ws = new WebSocket(relayUrl(base, 'guest', code)); } catch (e) { rej(new Error('RELAY')); return; }
    const conn = makeEmitter({ open: false, relay: true, send: d => { if (ws.readyState === 1) ws.send(JSON.stringify(d)); }, close: () => { try { ws.close(); } catch (e) {} } });
    const t = setTimeout(() => { try { ws.close(); } catch (e) {} rej(new Error('RELAY')); }, 10000);
    ws.onopen = () => { clearTimeout(t); conn.open = true; res(conn); };
    ws.onmessage = ev => { let d; try { d = JSON.parse(ev.data); } catch (e) { return; } conn.emit('data', d); };
    ws.onerror = () => { clearTimeout(t); if (!conn.open) rej(new Error('RELAY')); };
    ws.onclose = () => { clearTimeout(t); const was = conn.open; conn.open = false; if (was) conn.emit('close'); else rej(new Error('RELAY')); };
  });
}
// "ABCDE" or an invite link such as https://xyz.trycloudflare.com/?room=ABCDE
// Accepts "ABCDE", a tunnel invite (https://xyz.trycloudflare.com/?room=ABCDE) or a GitHub Pages invite
// with a relay (…/?room=ABCDE&relay=xyz.trycloudflare.com).
const RELAY_HOST_RE = /^[a-z0-9.-]+(:\d+)?$/i;
const relayBaseFromHost = h => (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(h) ? 'http://' : 'https://') + h + '/';
function parseInvite(raw) {
  const s = String(raw || '').trim();
  if (/^[A-Za-z0-9]{5}$/.test(s)) return { code: s.toUpperCase(), base: null, relay: null };
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s), code = (u.searchParams.get('room') || '').toUpperCase();
    if (!/^[A-Z0-9]{5}$/.test(code)) return null;
    const rh = u.searchParams.get('relay');
    if (rh && RELAY_HOST_RE.test(rh)) return { code, base: null, relay: relayBaseFromHost(rh) };
    if (u.origin === location.origin) return { code, base: null, relay: null };   // this game's own link: just the code
    return { code, base: u.origin + '/', relay: null };
  } catch (e) {}
  return null;
}
function inviteLink() {
  if (!NET) return '';
  if (NET.relayBase) {   // hosting from a static site (e.g. GitHub Pages) with a relay on someone's computer
    const u = new URL(location.href); u.search = ''; u.hash = '';
    u.searchParams.set('room', NET.code); u.searchParams.set('relay', new URL(NET.relayBase).host);
    return u.href;
  }
  return TUNNEL_URL ? `${TUNNEL_URL.replace(/\/$/, '')}/?room=${NET.code}` : '';
}
function updateInvite() {
  const box = $('on-invite'), note = $('on-invite-note'), relayBox = $('on-relay');
  if (!NET || !NET.isHost) { box.hidden = note.hidden = relayBox.hidden = true; return; }
  const hubOk = NET.hub && !NET.hub.closed, link = hubOk ? inviteLink() : '';
  if (link) { $('on-invite-url').value = link; box.hidden = false; note.hidden = true; relayBox.hidden = true; return; }
  box.hidden = true;
  if (RELAY_HERE) {   // served by server.py: waiting for its Cloudflare link
    relayBox.hidden = true; note.hidden = false;
    note.textContent = 'Friends whose network blocks direct connections can still join through a Cloudflare link. To get one, restart with start-mac.command or start-windows.bat and answer Y, or run: python3 server.py --tunnel';
  } else {            // static site: the host can attach a relay running elsewhere
    note.hidden = true; relayBox.hidden = false;
    if (!$('on-relay-url').value) $('on-relay-url').value = store.get('fpfc-relay') || '';
  }
}
async function connectExternalRelay() {
  if (!NET || !NET.isHost) return;
  const raw = $('on-relay-url').value.trim();
  let base;
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
    if (u.protocol !== 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(u.hostname)) throw new Error('not https');
    base = u.origin + '/';
  } catch (e) { onStatus('Paste the https://….trycloudflare.com link that the server window printed.'); return; }
  onStatus('Connecting the relay…');
  try { const r = await fetch(base + 'api/health', { cache: 'no-store' }); const j = await r.json(); if (!j || !j.relay) throw new Error('no relay'); }
  catch (e) { onStatus('That link isn\'t answering as a Foul Play FC relay. Check that the server window is still open and that you pasted its newest link.'); return; }
  const hub = await openRelayHub(NET.code, base);
  if (!hub) { onStatus('The relay is up but couldn\'t open this room. Try again in a moment.'); return; }
  NET.hub = hub; NET.relayBase = base; store.set('fpfc-relay', base);
  updateInvite();
  onStatus('Relay connected. Send the backup link above to friends who can\'t connect directly; everyone else can keep using the room code.');
}

/* ----- host ----- */
async function createRoom() {
  try {
    onStatus('Opening a room…');
    if (LOCAL_SAVE === null) await detectLocalSave();
    const name = myName();
    let peer = null, code = '', peerErr = null;
    try {
      await loadPeerJs();
      for (let i = 0; i < 5 && !peer; i++) {
        code = randomCode();
        try { peer = await openPeer(PEER_PREFIX + code); } catch (e) { if (e.type !== 'unavailable-id') throw e; }
      }
      if (!peer) throw new Error('Could not reserve a room code. Try again.');
    } catch (e) { peerErr = e; }
    if (!peer && !RELAY_HERE) throw peerErr;
    if (!peer) { code = randomCode(); peer = { id: 'host-' + code, destroy() {}, on() {}, destroyed: false }; }   // link-only room
    NET = newNet(code, true, peer);
    NET.roster[peer.id] = { name, team: 0, joined: Date.now(), ready: true, skin: MY_SKIN, cls: MY_CLASS, lock: LOCK_PLAYER, useSkin: USE_MY_LOOK };
    if (!peerErr) {
      peer.on('connection', hostAccept);
      peer.on('error', e => console.warn('peer', e.type, e));
      peer.on('disconnected', () => { if (NET && NET.peer === peer && !peer.destroyed) peer.reconnect(); });
    }
    NET.pingTimer = setInterval(hostPing, 1000);
    if (RELAY_HERE) {
      NET.hub = await openRelayHub(code);
      NET.tunnelPoll = setInterval(async () => { if (!NET || !NET.isHost) return; if (!TUNNEL_URL) await detectLocalSave(); updateInvite(); }, 3000);
    }
    showLobby(); updateInvite();
    onStatus(peerErr
      ? 'Direct connections are unavailable right now, so this room is link-only: friends join with the backup link below.'
      : 'You are the host: the match runs in this tab, so keep it open and visible. Friends join on the same game link with the code above.');
  } catch (e) { netError(e); }
}
function hostAccept(conn) {
  if (!NET || !NET.isHost) { conn.close(); return; }
  conn.on('data', d => hostData(conn, d));
  conn.on('close', () => hostDrop(conn));
  conn.on('error', () => hostDrop(conn));
}
function hostData(conn, d) {
  const n = NET; if (!n || !d || typeof d !== 'object') return;
  const id = conn.peer;
  if (d.t === 'hello') {
    if (Object.keys(n.roster).length >= MAX_PLAYERS) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
    const list = rosterList(), c0 = list.filter(r => r.team === 0).length, c1 = list.length - c0;
    n.conns[id] = conn;
    const team = c0 <= c1 ? 0 : 1;
    n.roster[id] = { name: String(d.name || 'Player').slice(0, 14), team, joined: Date.now(), ready: false, skin: uniqueNumber(sanitizeSkin(d.skin), team, id), cls: CLS[d.cls] ? d.cls : 'striker', lock: !!d.lock, useSkin: !!d.useSkin };
    conn.send({ t: 'welcome', uid: id });
    rosterChanged();
  } else if (d.t === 'in') {
    if (n.roster[id]) n.inputs[id] = { ix: +d.ix || 0, iy: +d.iy || 0, c: d.c || {}, pw: +d.pw || 0.5, run: d.run ? 1 : 0, tw: +d.tw || 0 };
  } else if (d.t === 'pong') {
    if (n.roster[id]) n.pings[id] = Math.round(performance.now() - (+d.ts || 0));
  } else if (d.t === 'skin') {
    const r = n.roster[id]; if (r && n.meta.status === 'lobby') { r.skin = uniqueNumber(sanitizeSkin(d.skin), r.team, id); rosterChanged(); }
  } else if (d.t === 'cls') {
    const r = n.roster[id]; if (r && n.meta.status === 'lobby') { r.cls = CLS[d.cls] ? d.cls : 'striker'; r.lock = !!d.lock; r.useSkin = !!d.useSkin; rosterChanged(); }
  } else if (d.t === 'ready') {
    const r = n.roster[id]; if (r) { r.ready = !!d.ready; rosterChanged(); }
  } else if (d.t === 'rematch') {
    if (n.roster[id] && S.phase === 'over') { S.rematch[id] = true; n.meta.votes = Object.keys(S.rematch).length; rosterChanged(); checkRematch(); }
  } else if (d.t === 'cheer') {
    const r = n.roster[id]; if (r && S.phase === 'play') spectatorCheer(d.team === 1 ? 1 : 0, r.name, id);
  } else if (d.t === 'sgift') {
    if (n.roster[id] && S.phase === 'play') spectatorGift(d.team === 1 ? 1 : 0, id);
  } else if (d.t === 'team') {
    const r = n.roster[id]; if (r && n.meta.status === 'lobby') { r.team = r.team === 1 ? 0 : 1; rosterChanged(); }
  }
}
function hostDrop(conn) {
  const n = NET; if (!n || !n.conns[conn.peer]) return;
  delete n.conns[conn.peer]; delete n.roster[conn.peer]; delete n.inputs[conn.peer]; delete n.pings[conn.peer];
  rosterChanged();
}
function broadcast(m) { if (!NET) return; for (const c of Object.values(NET.conns)) if (c.open) { try { c.send(m); } catch (e) {} } }
function rosterChanged() { if (!NET) return; renderRoster(); if (S.net === 'host') syncHumans(); broadcast({ t: 'roster', roster: NET.roster, meta: NET.meta, pg: NET.pings }); }
function hostPing() {
  if (!NET || !NET.isHost) return;
  broadcast({ t: 'ping', ts: performance.now() });
  if (NET.meta.status === 'lobby') { renderRoster(); broadcast({ t: 'roster', roster: NET.roster, meta: NET.meta, pg: NET.pings }); }
}
function startOnline() {
  if (!NET || !NET.isHost) return;
  NET.meta.status = 'playing';
  initAudio(); if (AC && AC.state === 'suspended') AC.resume();
  S.net = 'host'; S.phase = 'play'; newMatch('online'); whistle(1); showOverlay(null);
  rosterChanged();
}

/* ----- player joining someone else's room ----- */
async function joinRoom() {
  const inv = parseInvite($('on-code').value);
  if (!inv) { onStatus('Enter the 5-letter room code, or paste the invite link the host sent you.'); return; }
  const { code } = inv, name = myName();
  if (LOCAL_SAVE === null) await detectLocalSave();
  // A pasted invite link means the host shared their backup link: connect through it.
  if (inv.base) { await joinViaRelay(inv.base, code, name, null); return; }
  const fallback = inv.relay || (PENDING_RELAY && PENDING_RELAY.code === code ? PENDING_RELAY.base : null) || (RELAY_HERE ? location.href : null);
  let peer = null;
  try {
    onStatus('Looking for room ' + code + '…'); await loadPeerJs();
    peer = await openPeer();
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
    await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('TIMEOUT')), fallback ? 8000 : 15000);
      conn.once('open', () => { clearTimeout(t); res(); });
      peer.once('error', e => { clearTimeout(t); rej(e); });
    });
    finishJoin(code, name, conn, peer, 'direct');
  } catch (e) {
    if (peer) peer.destroy();
    if (fallback) { await joinViaRelay(fallback, code, name, e); return; }   // the invite named a relay, or this page came from the host's link
    netError(e);
    if (e && (e.message === 'TIMEOUT' || e.type === 'network')) onStatus($('on-status').textContent + ' If the host shares their backup link, paste it above and join again.');
  }
}
async function joinViaRelay(base, code, name, directErr) {
  try {
    onStatus(directErr ? 'A direct connection didn\'t work. Connecting through the host\'s link…' : 'Connecting through the host\'s link…');
    const conn = await relayConnect(base, code);
    finishJoin(code, name, conn, { id: 'pending-relay', destroy() {} }, 'link');
  } catch (e) {
    onStatus(directErr ? 'Could not connect directly or through the link. Check the room code and that the host still has the game open.' : 'Could not connect through that link. It may have expired: ask the host for a fresh one, or check the room code.');
  }
}
function finishJoin(code, name, conn, peer, via) {
  NET = newNet(code, false, peer); NET.conn = conn; NET.via = via;
  conn.on('data', clientData);
  conn.on('close', hostGone);
  if (peer.on) peer.on('error', e => console.warn('peer', e.type, e));
  conn.send({ t: 'hello', name, skin: MY_SKIN, cls: MY_CLASS, lock: LOCK_PLAYER, useSkin: USE_MY_LOOK });
  showLobby(); onStatus(via === 'link' ? 'Joined through the host\'s link. Waiting for the host to start…' : 'Joined. Waiting for the host to start…');
}
function clientData(d) {
  const n = NET; if (!n || !d) return;
  if (d.t === 'welcome') { if (d.uid) n.uid = d.uid; renderRoster(); return; }
  if (d.t === 'roster') {
    n.roster = d.roster || {}; n.meta = d.meta || n.meta; n.pings = d.pg || n.pings; renderRoster(); updateRematchNote();
    if (n.meta.status === 'playing' && S.net !== 'client') startClient();
  } else if (d.t === 'state') applySnap(d.s);
  else if (d.t === 'report') { S.lastReport = d.r; saveHistory(d.r); }
  else if (d.t === 'ping') { try { n.conn.send({ t: 'pong', ts: d.ts }); } catch (e) {} }
  else if (d.t === 'full') { leaveRoom(true); onStatus(`That room is full (${MAX_PLAYERS} players).`); }
  else if (d.t === 'closed') hostGone();
}
function hostGone() {
  if (!NET || NET.isHost) return;
  leaveRoom(true);
  S.net = null; S.phase = 'menu'; newMatch('watch'); openOnline();
  onStatus('The host closed the room or the connection dropped.');
}
function startClient() {
  if (AC && AC.state === 'suspended') AC.resume();
  S.net = 'client'; S.phase = 'play'; newMatch('client');
  S.humans = []; S.pause = 0; S.pauseMsg = '';
  for (const p of S.players) p.snap = false;
  for (const r of S.refs) r.snap = false;
  S.ball.snap = false;
  showOverlay(null);
}
function leaveRoom(silent) {
  if (!NET) return;
  const n = NET; NET = null;
  clearInterval(n.pingTimer); clearInterval(n.tunnelPoll);
  if (n.hub) setTimeout(() => { try { n.hub.ws.close(); } catch (e) {} }, 250);
  try {
    if (n.isHost) {
      for (const c of Object.values(n.conns)) { try { c.send({ t: 'closed' }); } catch (e) {} }
      setTimeout(() => n.peer.destroy(), 200);
    } else { try { n.conn.close(); } catch (e) {} n.peer.destroy(); }
  } catch (e) {}
  $('on-setup').hidden = false; $('on-lobby').hidden = true; $('on-invite').hidden = true; $('on-invite-note').hidden = true; $('on-relay').hidden = true;
  if (!silent) onStatus('');
}
addEventListener('pagehide', () => leaveRoom(true));

/* ----- roster ----- */
function uniqueNumber(sk, team, uid) {   // shirt numbers stay unique within a team
  const used = new Set(Object.entries(NET ? NET.roster : {}).filter(([u, r]) => u !== uid && r.team === team && r.skin).map(([, r]) => r.skin.number));
  while (used.has(sk.number)) sk.number = sk.number % 99 + 1;
  return sk;
}
const n_ready = r => NET && NET.meta && NET.meta.status === 'lobby' ? (r.ready ? '✓ ' : '… ') : '';
const SKIN_ICON_CACHE = {};
function skinIcon(sk, team) {   // tiny head-and-shirt picture for lobby rows
  const k = JSON.stringify(sk || {}) + team; if (SKIN_ICON_CACHE[k]) return SKIN_ICON_CACHE[k];
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), s2 = sanitizeSkin(sk);
  g.fillStyle = TEAM[team].col; g.fillRect(7, 18, 18, 14); g.fillStyle = SKIN_OPTS.trim[s2.trim]; g.fillRect(7, 18, 18, 3);
  g.fillStyle = SKIN_OPTS.skinTone[s2.skinTone]; g.beginPath(); g.arc(16, 12, 7, 0, Math.PI * 2); g.fill();
  if (s2.hair !== 6) { g.fillStyle = SKIN_OPTS.hairColour[s2.hairColour]; g.beginPath(); g.arc(16, s2.hair === 7 ? 9 : 10, s2.hair === 7 ? 9 : 7, Math.PI, 0); g.fill(); }
  g.fillStyle = team === 0 ? '#0b1a2a' : '#fff'; g.font = '700 10px sans-serif'; g.textAlign = 'center'; g.fillText(String(s2.number), 16, 30);
  return (SKIN_ICON_CACHE[k] = c.toDataURL());
}
function checkRematch() {
  if (!NET || !NET.isHost || S.phase !== 'over') return;
  const humans = rosterList().length, votes = Object.keys(S.rematch).length;
  updateRematchNote();
  if (S.rematch[NET.uid] && votes >= Math.ceil(humans / 2)) startRematch();
}
function startRematch() {
  for (const r of Object.values(NET.roster)) r.team = r.team === 1 ? 0 : 1;   // swap sides
  S.rematch = {}; NET.meta.status = 'playing';
  start('online'); S.net = 'host'; rosterChanged();
}
function updateRematchNote() {
  const el = document.getElementById('o-rematch'); if (!el) return;
  if (!S.net || !NET) { el.textContent = ''; return; }
  const humans = rosterList().length, votes = S.net === 'host' ? Object.keys(S.rematch || {}).length : ((NET.meta && NET.meta.votes) || 0);
  el.textContent = `Rematch votes: ${votes} of ${humans}. A rematch starts once at least half the players and the host vote, with sides swapped.`;
}
function rosterList() {
  return Object.entries(NET ? NET.roster : {}).map(([uid, v]) => ({ uid, name: String((v && v.name) || 'Player').slice(0, 14), team: v && v.team === 1 ? 1 : 0, joined: (v && v.joined) || 0, cls: v && CLS[v.cls] ? v.cls : 'striker', lock: !!(v && v.lock), useSkin: !!(v && v.useSkin), skin: v && v.skin, ready: !!(v && v.ready) }))
    .sort((a, b) => a.joined - b.joined || (a.uid < b.uid ? -1 : 1));
}
function colorOf(uid) { const i = rosterList().findIndex(r => r.uid === uid); return i < 0 ? 0 : i; }
function renderRoster() {
  if (!NET) return;
  const list = rosterList(), host = NET.meta && NET.meta.host;
  for (const t of [0, 1]) {
    const mine = list.filter(r => r.team === t);
    const rows = mine.map((r, i) => `<li data-uid="${esc(r.uid)}" title="${r.uid === NET.uid ? 'You' : 'Click to mute or unmute their taunts'}" style="color:${HUMAN_COL[colorOf(r.uid) % HUMAN_COL.length]};cursor:${r.uid === NET.uid ? 'default' : 'pointer'}"><img class="skinicon" alt="" src="${skinIcon(r.skin, t)}">${n_ready(r)}${esc(r.name)}${r.cls && CLS[r.cls] ? ` <span style="color:${CLS[r.cls].col}">· ${CLS[r.cls].name}${r.lock ? ' (locked)' : ''}</span>` : ''}${NET.muted && NET.muted.has(r.uid) ? ' · muted' : ''}${r.uid === host ? ' · host' : ''}${r.uid === NET.uid ? ' (you)' : ''}${r.uid.startsWith('relay-') ? ' · via link' : ''}${i >= TEAM_SIZE - 1 ? ' · watching' : ''}${SHOW_PING && NET.pings[r.uid] != null ? ' · ' + NET.pings[r.uid] + ' ms' : ''}</li>`);
    $('on-t' + t).innerHTML = rows.join('') + '<li class="bot">Bot</li>'.repeat(Math.max(0, TEAM_SIZE - 1 - mine.length)) + '<li class="bot">Bot · goalkeeper</li>';
  }
  $('on-swap').disabled = NET.meta.status !== 'lobby';
  const me = NET.roster[NET.uid], rb = $('on-ready');
  rb.hidden = NET.isHost || NET.meta.status !== 'lobby';
  if (me) rb.textContent = me.ready ? 'Ready ✓' : "I'm ready";
  if (NET.isHost) { const waiting = rosterList().filter(r => r.uid !== NET.uid && !(NET.roster[r.uid] || {}).ready).length; $('on-start').textContent = waiting ? `Start anyway (${waiting} not ready)` : 'Start match'; }
}
function swapTeam() {
  if (!NET || NET.meta.status !== 'lobby') return;
  if (NET.isHost) { const r = NET.roster[NET.uid]; r.team = r.team === 1 ? 0 : 1; rosterChanged(); }
  else if (NET.conn && NET.conn.open) NET.conn.send({ t: 'team' });
}

/* ----- host: humans follow the roster ----- */
function syncHumans() {
  if (!NET) return;
  const list = rosterList(), ids = new Set(list.map(r => r.uid));
  for (const h of S.humans.slice()) {
    if (ids.has(h.id)) continue;
    const p = S.players[h.pid]; if (p && p.human === h) p.human = null;
    S.humans.splice(S.humans.indexOf(h), 1);
    if (S.phase === 'play') feed(`${h.label} left the match`);
  }
  for (const r of list) {
    const ex = S.humans.find(h => h.id === r.uid);
    if (ex) { ex.idx = colorOf(r.uid); continue; }
    const gkSlot = S.players[r.team * TEAM_SIZE];
    const p = r.cls === 'goalkeeper' && gkSlot && !gkSlot.human ? gkSlot : HUMAN_SLOTS.map(i => S.players[r.team * TEAM_SIZE + i]).find(q => q && !q.human);
    if (!p) continue;
    const local = r.uid === NET.uid;
    const h = { id: r.uid, idx: colorOf(r.uid), label: local ? 'YOU' : r.name, team: r.team, map: local ? MAPSOLO : null, remote: !local, touch: local, pid: p.id, prev: {}, charge: 0, charging: false, lc: null };
    if (!local) h.lc = { ...(((NET.inputs[r.uid] || {}).c) || {}) };
    h.lock = !!r.lock;
    p.human = h; S.humans.push(h); setClass(p, CLS[r.cls] ? r.cls : 'striker'); refreshSynergies();
    p.skinOwner = r.uid; const rsk = r.useSkin && NET.roster[r.uid] && NET.roster[r.uid].skin; applySkin(p, rsk ? sanitizeSkin(rsk) : null);
    if (S.phase === 'play' && S.clock < 178) feed(`${r.name} joined the ${TEAM[r.team].name}`);
  }
}
/* ----- host: send the game state ----- */
function sendSnap(force) {
  if (!NET || !NET.isHost) return;
  const now = performance.now(); if (!force && now - NET.lastSnap < 50) return; NET.lastSnap = now;
  if (!Object.keys(NET.conns).length) return;
  const b = S.ball;
  const s = { ph: S.phase, fm: FORMAT, pc: PACE, pg: NET.pings, sc: S.score, cl: r1(S.clock), pz: r1(S.pause), pm: S.pauseMsg || '', ps: S.pauseSub || '', ex: r2(S.excite), sh: r1(S.shake),
    spk: S.setPiece ? [S.setPiece.team, S.setPiece.taker.id, r1(S.setPiece.t), S.setPiece.type, r1(S.setPiece.aim.y), r1(S.setPiece.aim.z), S.setPiece.prep, S.setPiece.minT, S.setPiece.offX == null ? -1 : r1(S.setPiece.offX)] : 0,
    ch: S.chants.map(c => [c.id, c.kind, c.text, r1(c.x), r1(c.life)]),
    mu: MUT_LIST.map(([k]) => MUT[k] ? 1 : 0),
    fx: S.fxq.filter(e => S.time - e.t < 2).map(e => [e.id, e.type, e.pid, r1(e.x), r1(e.y), e.team != null ? e.team : -1, e.side != null ? e.side : -1]),
    bu: S.bubbles.map(u => [u.pid, u.text, r1(u.life)]),
    cr: S.crowd ? [r2(S.crowd.support), S.crowd.op.map(o => CROWD_CATS.map(([k]) => Math.round(o[k]))), S.crowd.banners.map(x => [x.id, x.text, x.team, x.cat, r1(x.life), r1(x.x)]), S.crowd.press ? S.crowd.press.team : -1] : 0,
    bo: S.bounty ? [S.bounty.pid, S.bounty.kind, r1(S.bounty.t)] : 0, gg: S.golden ? 1 : 0,
    so: S.shoot ? [S.shoot.goals, S.shoot.taken, S.shoot.done ? S.shoot.winner : -1] : 0,
    sm: S.smokes.map(z => [r1(z.x), r1(z.y), z.r, r1(z.ttl)]), pu: S.puddles.map(g => [r1(g.x), r1(g.y), r1(g.ttl)]),
    an: anomSnap(),
    zn: (S.zones || []).map(z => ({ type: z.type, x: r1(z.x), y: r1(z.y), r: z.r, ttl: r1(z.ttl), team: z.team, t: r1(z.t), mets: z.mets ? z.mets.map(m => ({ x: r1(m.x), y: r1(m.y), t: r2(m.t) })) : undefined })),
    wl: (S.walls || []).map(w => [r1(w.x1), r1(w.y1), r1(w.x2), r1(w.y2), r1(w.ttl), w.team]),
    pj: (S.projs || []).map(q => [q.type, r1(q.x), r1(q.y), r1(q.z), Math.round(q.vx || 0), Math.round(q.vy || 0)]),
    dx: S.decoys.map(d => [d.ball ? 1 : 0, d.solid ? 1 : 0]), sy: S.syn || [[], []],
    tc: S.teamCd ? S.teamCd.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, r1(v - S.time)]))) : 0,
    de: S.decoys.map(d => [r1(d.x), r1(d.y), d.team, r1(d.run), d.src]), mb: r1(S.megaBall),
    p: S.players.map(p => [r1(p.x), r1(p.y), r2(p.face), Math.round(p.vx), Math.round(p.vy), Math.round(p.hp), r1(p.stun), r1(p.ko), Math.ceil(p.sentOff), p.yellows, p.pop, p.hype,
      p.items.bat, p.items.flash, p.items.banana, p.blind, r1(p.blindT), r1(p.foulCd), p.target ? p.target.id : -1, p.human ? p.human.id : '', r1(p.hitT), r1(p.charge), Math.round(p.karma), p.sprinting ? 1 : 0, p.stats.caught, p.dive > 0 || p.diveDown > 0 ? (p.diveDir || 1) : 0, r1(p.stamina), Math.round(p.staminaMax), Math.round(p.mood), animIdx(p.anim), r1(p.animT), [p.fx.rocket || 0, r1(p.fx.magnet || 0), r1(p.fx.shield || 0), r1(p.fx.megaphone || 0)], p.items.glue, p.items.smoke, p.items.whistle, p.items.decoy, THROWABLES.indexOf(p.throwSel), r1(p.slowT || 0), r1(p.freezeT || 0), Math.round(p.injury), p.skinOwner || '', p.goneWhy || '', r1(p.iceT || 0), r1(p.heatT || 0), r1(p.z || 0), p.carry == null ? -1 : p.carry, r2(p.slide || 0), r2(p.slideA || 0), CLASS_IDS.indexOf(p.cls), (p.cd || [0, 0, 0]).map(r1), Math.floor(p.ult || 0), Object.fromEntries(Object.entries(p.bf || {}).map(([k, v]) => [k, r1(v)])), p.stk || 0, p.items.sling || 0, p.items.blaster || 0, p.items.sword || 0, FIELD_ITEMS.indexOf(p.benchItem)]),
    r: S.refs.map(r => [r1(r.x), r1(r.y), r2(r.face), r1(r.blind), r.card ? (r.card.red ? 2 : 1) : 0, r1(r.run), r1(r.gone || 0), r1(r.z || 0), r.carriedBy == null ? -1 : r.carriedBy, r.fly ? 1 : 0, Math.round(r.range), r2(r.fov)]),
    b: [r1(b.x), r1(b.y), r1(b.z), b.owner ? b.owner.id : -1, r1(b.spin), Math.round(b.vx || 0), Math.round(b.vy || 0), Math.round(b.vz || 0), b.trail || ''],
    it: S.items.map(i => [i.type, r1(i.x), r1(i.y), r1(i.z), i.landed ? 1 : 0, r1(i.age), i.for ? i.for.id : -1]),
    bn: S.bananas.map(n => [r1(n.x), r1(n.y)]),
    fd: S.feed.slice(0, 4).map(f => [f.text, f.col, r1(f.t)]),
    tx: S.texts.map(t => [r1(t.x), r1(t.y), r1(t.z), t.text, t.col, r1(t.life)]) };
  if (S.phase === 'over') s.st = S.players.map(p => [p.stats.goals, p.stats.assists, p.stats.tackles, p.stats.fouls, p.stats.caught, p.stats.saves]);
  broadcast({ t: 'state', s });
}
/* ----- player: draw snapshots, send inputs ----- */
const tagCache = {};
function humanTag(uid) {
  if (!uid || !NET) return null;
  const r = NET.roster[uid], t = tagCache[uid] || (tagCache[uid] = { id: uid });
  t.idx = colorOf(uid); t.local = uid === NET.uid; t.label = t.local ? 'YOU' : (r ? String(r.name).slice(0, 14) : 'Player');
  t.charging = t.local && NET.charging; t.charge = NET.charge; t.chargeKind = t.local ? NET.chargeKind : null;
  return t;
}
function applySnap(s) {
  if (!s || !NET) return;
  if (s.fm && s.fm !== FORMAT) {   // the host plays a different format: rebuild the pitch and teams to match
    applyFormat(s.fm); newMatch('client'); S.humans = [];
    for (const p of S.players) p.snap = false; for (const r of S.refs) r.snap = false; S.ball.snap = false;
  }
  NET.pc = +s.pc || 1;
  MUT = {}; (s.mu || []).forEach((v, i) => { if (MUT_LIST[i]) MUT[MUT_LIST[i][0]] = !!v; });
  S.bubbles = (s.bu || []).map(u => ({ pid: u[0], text: u[1], life: u[2] }));
  if (s.cr) {
    S.crowd = S.crowd || { op: [newOpinion(), newOpinion()], banners: [] };
    S.crowd.support = s.cr[0]; s.cr[1].forEach((arr, t) => CROWD_CATS.forEach(([k], j) => { S.crowd.op[t][k] = arr[j]; }));
    S.crowd.banners = s.cr[2].map(x => ({ id: x[0], text: x[1], team: x[2], cat: x[3], life: x[4], x: x[5] })); S.crowd.press = s.cr[3] >= 0 ? { team: s.cr[3], t: 1 } : null;
  }
  S.bounty = s.bo ? { pid: s.bo[0], kind: s.bo[1], t: s.bo[2] } : null; S.golden = !!s.gg;
  S.shoot = s.so ? { goals: s.so[0], taken: s.so[1], done: s.so[2] >= 0, winner: s.so[2] } : null;
  S.smokes = (s.sm || []).map(z => ({ x: z[0], y: z[1], r: z[2], ttl: z[3] })); S.puddles = (s.pu || []).map(g => ({ x: g[0], y: g[1], ttl: g[2] }));
  S.decoys = (s.de || []).map(d => ({ x: d[0], y: d[1], team: d[2], run: d[3], src: d[4] })); S.megaBall = +s.mb || 0; S.an = s.an || newAnomState();
  S.zones = s.zn || []; S.walls = (s.wl || []).map(a => ({ x1: a[0], y1: a[1], x2: a[2], y2: a[3], ttl: a[4], team: a[5] })); S.projs = (s.pj || []).map(a => ({ type: a[0], x: a[1], y: a[2], z: a[3], vx: a[4], vy: a[5] }));
  (s.dx || []).forEach((f, i) => { if (S.decoys[i]) { S.decoys[i].ball = !!f[0]; S.decoys[i].solid = !!f[1]; } }); S.syn = s.sy || [[], []];
  S.teamCd = s.tc ? s.tc.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v + S.time]))) : [{}, {}];
  for (const e of (s.fx || [])) if (NET.lastFx == null || e[0] > NET.lastFx) { if (NET.lastFx != null) playFx({ id: e[0], type: e[1], pid: e[2], x: e[3], y: e[4], team: e[5], side: e[6], t: S.time }, false); NET.lastFx = e[0]; } NET.pings = s.pg || {};
  S.score = s.sc || [0, 0]; S.clock = +s.cl || 0; S.pause = +s.pz || 0; S.pauseSub = s.ps || ''; S.excite = +s.ex || 0;
  const pm = s.pm || '';
  if (pm !== NET.lastPm) { NET.lastPm = pm; if (pm && S.pause > 0) { whistle(1); if (pm === 'GOAL!') S.shake = 6; } }
  S.pauseMsg = pm; S.shake = Math.max(S.shake, +s.sh || 0);
  (s.p || []).forEach((a, i) => {
    const p = S.players[i]; if (!p || !a) return;
    p.tx = a[0]; p.ty = a[1];
    if (!p.snap || Math.hypot(p.tx - p.x, p.ty - p.y) > 120) { p.x = p.tx; p.y = p.ty; p.snap = true; }
    p.face = a[2]; p.vx = a[3]; p.vy = a[4]; p.hp = a[5]; p.stun = a[6]; p.ko = a[7]; p.sentOff = a[8]; p.yellows = a[9]; p.pop = a[10]; p.hype = a[11];
    p.items.bat = a[12]; p.items.flash = a[13]; p.items.banana = a[14]; p.blind = a[15]; p.blindT = a[16]; p.foulCd = a[17];
    p.target = a[18] >= 0 ? S.players[a[18]] : null; p.human = humanTag(a[19]); p.hitT = a[20]; p.charge = +a[21] || 0; p.karma = +a[22] || 0; p.sprinting = !!a[23]; p.stats.caught = +a[24] || 0; p.diveState = +a[25] || 0; p.diveDir = p.diveState;
    p.stamina = +a[26] || 0; p.staminaMax = +a[27] || 100; p.mood = +a[28] || 0; p.anim = ANIMS[a[29]] || ''; p.animT = +a[30] || 0;
    const fxa = a[31] || []; p.fx = { rocket: fxa[0] || 0, magnet: fxa[1] || 0, shield: fxa[2] || 0, megaphone: fxa[3] || 0 };
    p.items.glue = a[32] || 0; p.items.smoke = a[33] || 0; p.items.whistle = a[34] || 0; p.items.decoy = a[35] || 0; p.throwSel = THROWABLES[a[36]] || 'banana';
    p.slowT = +a[37] || 0; p.freezeT = +a[38] || 0; p.injury = +a[39] || 0; p.goneWhy = a[41] || ''; p.iceT = +a[42] || 0; p.heatT = +a[43] || 0; p.z = +a[44] || 0; p.carry = a[45] >= 0 ? a[45] : null; p.slide = +a[46] || 0; p.slideA = +a[47] || 0;
    const ci = a[48]; if (ci >= 0 && CLASS_IDS[ci] && CLASS_IDS[ci] !== p.cls) { p.cls = CLASS_IDS[ci]; applyClassLook(p); p.skinKey = null; }
    p.cd = a[49] || [0, 0, 0]; p.ult = +a[50] || 0; p.bf = a[51] || {}; p.stk = +a[52] || 0; p.items.sling = +a[53] || 0; p.items.blaster = +a[54] || 0; p.items.sword = +a[55] || 0; p.benchItem = FIELD_ITEMS[a[56]] || null;
    const so = a[40], rsk = so && NET.roster[so] && NET.roster[so].useSkin && NET.roster[so].skin;
    if (rsk) { const key = JSON.stringify(rsk); if (p.skinKey !== key) { p.skinKey = key; applySkin(p, sanitizeSkin(rsk)); } }
  });
  (s.r || []).forEach((a, i) => {
    const r = S.refs[i]; if (!r || !a) return;
    r.tx = a[0]; r.ty = a[1];
    if (!r.snap || Math.hypot(r.tx - r.x, r.ty - r.y) > 150) { r.x = r.tx; r.y = r.ty; r.snap = true; }
    r.face = a[2]; r.blind = a[3]; r.card = a[4] ? { red: a[4] === 2, t: 1 } : null; r.run = a[5]; r.gone = +a[6] || 0; r.z = +a[7] || 0; r.carriedBy = a[8] >= 0 ? a[8] : null; r.flying = !!a[9]; if (a[10] > 0) r.range = +a[10]; if (a[11] > 0) r.fov = +a[11];
  });
  const b = S.ball, bb = s.b || [W / 2, H / 2, 0, -1, 0];
  b.tx = bb[0]; b.ty = bb[1]; b.tz = bb[2]; b.owner = bb[3] >= 0 ? S.players[bb[3]] : null; b.spin = bb[4]; b.trail = bb[8] || null; b.vx = +bb[5] || 0; b.vy = +bb[6] || 0; b.vz = +bb[7] || 0;
  if (!b.snap || Math.hypot(b.tx - b.x, b.ty - b.y) > 150) { b.x = b.tx; b.y = b.ty; b.z = b.tz; b.snap = true; }
  S.items = (s.it || []).map(a => ({ type: a[0], x: a[1], y: a[2], z: a[3], landed: !!a[4], age: a[5], for: S.players[a[6]] || null }));
  S.bananas = (s.bn || []).map(a => ({ x: a[0], y: a[1] }));
  S.feed = (s.fd || []).map(a => ({ text: a[0], col: a[1], t: a[2] }));
  S.texts = (s.tx || []).map(a => ({ x: a[0], y: a[1], z: a[2], text: a[3], col: a[4], life: a[5] }));
  S.setPiece = s.spk ? { team: s.spk[0], taker: S.players[s.spk[1]], t: s.spk[2], type: s.spk[3], aim: { y: +s.spk[4] || H / 2, z: +s.spk[5] || 12 }, prep: +s.spk[6] || 15, minT: +s.spk[7] || 3, offX: s.spk[8] >= 0 ? s.spk[8] : null, wall: [] } : null;
  const ch = s.ch || [];
  if (NET.lastCh == null) NET.lastCh = Math.max(0, ...ch.map(c => c[0]));
  for (const c of ch) if (c[0] > NET.lastCh) { NET.lastCh = c[0]; crowdSound(c[1]); }
  S.chants = ch.map(c => ({ id: c[0], kind: c[1], text: c[2], x: c[3], life: c[4] }));
  const me = S.players.find(p => p.human && p.human.local);
  const inH = NET.inH || {};
  S.humans = me ? [{ idx: me.human.idx, label: 'YOU', pid: me.id, map: MAPSOLO, team: me.team, charging: NET.charging, charge: NET.charge, prev: {} }] : [];
  if (s.st) s.st.forEach((a, i) => { const p = S.players[i]; if (p && a) Object.assign(p.stats, { goals: a[0], assists: a[1], tackles: a[2], fouls: a[3], caught: a[4], saves: a[5] }); });
  if (s.ph === 'over' && S.phase !== 'over') { S.phase = 'over'; whistle(3, 0.3); showResults(); }
  else if (s.ph === 'play' && S.phase === 'over') { S.phase = 'play'; showOverlay(null); }
  updateTouch();
}
function clientUpdate(dt) {
  S.time += dt; S.shake = Math.max(0, S.shake - dt * 20);
  for (const f of S.feed) f.t += dt;
  for (const t of S.texts) { t.life -= dt; t.z += 30 * dt; }
  for (const c of S.chants) c.life -= dt;
  if (crowdGain && AC) crowdGain.gain.setTargetAtTime(muted ? 0 : 0.02 + Math.min(1.2, S.excite) * 0.1, AC.currentTime, 0.3);
  const k = Math.min(1, dt * 14), sim = dt * (NET ? NET.pc : 1);
  for (const p of S.players) if (p.snap) {
    if (p.stun <= 0 && p.ko <= 0) { p.tx += p.vx * sim; p.ty += p.vy * sim; }
    p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.run += Math.hypot(p.vx, p.vy) * sim * 0.09;
  }
  for (const r of S.refs) if (r.snap) { r.x += (r.tx - r.x) * k; r.y += (r.ty - r.y) * k; }
  const b = S.ball; if (b.snap) { b.x += (b.tx - b.x) * k; b.y += (b.ty - b.y) * k; b.z += (b.tz - b.z) * k; }
  if (S.pause > 0) S.pause = Math.max(0, S.pause - dt);
  sendInput(dt);
}
function sendInput(dt) {
  const n = NET; if (!n || !n.conn || !n.conn.open || S.phase !== 'play') return;
  const h = n.inH || (n.inH = { map: MAPSOLO, prev: n.prev, touch: true, charge: 0, charging: false, idx: 0 });
  h.map = MAPSOLO; const meP = S.players.find(p => p.human && p.human.local); h.pid = meP ? meP.id : -1;
  const inp = localInput(h, dt);
  n.charge = h.charge; n.charging = h.charging;
  for (const a of ['pass', 'lpass', 'th', 'passR', 'lpassR', 'thR', 'foul', 'blind', 'item', 'sp', 'sr', 's1', 's2', 's3', 'ul']) if (inp[a]) n.cnt[a] = (n.cnt[a] || 0) + 1;
  if (inp.taunt >= 0) { n.cnt.taunt = (n.cnt.taunt || 0) + 1; n.tw = inp.taunt; }
  if (inp.sr || inp.passR || inp.lpassR || inp.thR) n.pw = r2(inp.power);
  n.chargeKind = h.chargeKind;
  const msg = { t: 'in', ix: r2(inp.ix), iy: r2(inp.iy), c: { ...n.cnt }, pw: n.pw, run: inp.sprint ? 1 : 0, tw: n.tw || 0 };
  const key = JSON.stringify(msg), now = performance.now();
  if (key !== n.sent && now - n.sentAt > 30) { n.sent = key; n.sentAt = now; try { n.conn.send(msg); } catch (e) {} }
}

$('m-online').onclick = openOnline;
$('on-create').onclick = () => { initAudio(); createRoom(); };
$('on-join').onclick = () => { initAudio(); joinRoom(); };
$('on-code').addEventListener('keydown', e => { if (e.key === 'Enter') { initAudio(); joinRoom(); } });
$('on-swap').onclick = swapTeam;
$('on-start').onclick = startOnline;
$('on-leave').onclick = () => { leaveRoom(); onStatus('You left the room.'); };
$('on-back').onclick = () => { leaveRoom(); onStatus(''); showOverlay('menu'); };
$('on-relay-go').onclick = connectExternalRelay;
$('on-relay-url').addEventListener('keydown', e => { if (e.key === 'Enter') connectExternalRelay(); });
$('on-invite-copy').onclick = () => {
  const url = inviteLink(); if (!url) return;
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => onStatus('Backup link copied. Send it with the room code to anyone who can\'t join directly.'), () => { $('on-invite-url').select(); onStatus('Select the link and copy it.'); });
  else { $('on-invite-url').select(); onStatus('Select the link and copy it.'); }
};
// Opened from an invite link (…/?room=ABCDE): go straight to the online screen with the code filled in.
{
  const qs = new URLSearchParams(location.search), q = qs.get('room'), rh = qs.get('relay');
  if (q && /^[A-Za-z0-9]{5}$/.test(q)) {
    if (rh && RELAY_HOST_RE.test(rh)) PENDING_RELAY = { code: q.toUpperCase(), base: relayBaseFromHost(rh) };
    setTimeout(() => { openOnline(); $('on-code').value = q.toUpperCase(); onStatus(`You're invited to room ${q.toUpperCase()}${PENDING_RELAY ? ', with a backup relay if a direct connection fails' : ''}. Enter your name and choose Join room.`); }, 0);
  }
}
$('on-copy').onclick = () => {
  if (!NET) return; const code = NET.code;
  if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => onStatus('Code copied.'), () => onStatus('Copy failed. The code is ' + code + '.'));
  else onStatus('The code is ' + code + '.');
};

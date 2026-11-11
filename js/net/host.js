/* Foul Play FC · js/net/host.js
   Hosting a room.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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

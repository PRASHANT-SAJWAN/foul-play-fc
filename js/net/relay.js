/* Foul Play FC · js/net/relay.js
   The relay fallback through server.py.
   Classic script sharing one global scope with the rest of js/; index.html loads them in order. */
'use strict';

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

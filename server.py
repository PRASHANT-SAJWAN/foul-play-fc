#!/usr/bin/env python3
"""Serve Foul Play FC locally and save every finished match into ./data-metric.

Works the same on macOS, Windows and Linux (Python 3.7+, standard library only).
Easiest start: double-click start-mac.command (macOS) or start-windows.bat (Windows).

    python3 server.py                  # macOS / Linux: http://localhost:8080
    py server.py                       # Windows
    python3 server.py --open           # also open the game in your browser
    python3 server.py --tunnel         # also create a temporary public link with Cloudflare
    python3 server.py --port 9000

The game detects this server (GET api/health) and, at full time, POSTs the match
report to api/metrics. For each match this writes:

    data-metric/<match>.json   raw data: every metric, rating and the event timeline
    data-metric/<match>.html   readable match report
    data-metric/<match>.csv    one row per player

and keeps three running files for all matches:

    data-metric/index.html       list of every match, newest first, linking the reports
    data-metric/index.json       one summary per match
    data-metric/all-players.csv  every player row from every match (for spreadsheets)

Binds to 127.0.0.1 so only this computer can reach it, unless you add --tunnel,
which gives friends a temporary https://...trycloudflare.com link to it.
"""
import argparse
import csv
import html
import io
import json
import os
import re
import sys
import shutil
import subprocess
import threading
import time
import webbrowser
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data-metric')
MAX_BODY = 8 * 1024 * 1024
SAFE_BASE = re.compile(r'^[a-z0-9-]{1,120}$')
EXTS = ('json', 'html', 'csv')
LOCK = threading.Lock()
IS_WIN, IS_MAC = os.name == 'nt', sys.platform == 'darwin'
URL_RE = re.compile(r'https://[a-z0-9-]+\.trycloudflare\.com')

# Some Windows consoles can't print every character; never crash on output, and show messages immediately.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors='replace', line_buffering=True)
    except (AttributeError, ValueError):
        pass


def read_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_text(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='') as f:
        f.write(text)
    os.replace(tmp, path)


def append_players(base, csv_text):
    """Append this match's player rows to all-players.csv, with a 'match' column first."""
    rows = list(csv.reader(io.StringIO(csv_text)))
    if len(rows) < 2:
        return
    header, body = ['match'] + rows[0], [[base] + r for r in rows[1:]]
    path = os.path.join(DATA, 'all-players.csv')
    if os.path.exists(path):
        with open(path, encoding='utf-8', newline='') as f:
            existing = next(csv.reader(f), None)
        if existing != header:  # the set of metrics changed: start a fresh file, keep the old one
            os.replace(path, os.path.join(DATA, f'all-players-until-{datetime.now():%Y%m%d-%H%M%S}.csv'))
    new = not os.path.exists(path)
    with open(path, 'a', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        if new:
            w.writerow(header)
        w.writerows(body)


def local_time(iso):
    """'2026-11-09T23:50:04.123Z' -> '2026-11-10 05:20' in this computer's time zone."""
    try:
        return datetime.fromisoformat(str(iso).replace('Z', '+00:00')).astimezone().strftime('%Y-%m-%d %H:%M')
    except ValueError:
        return str(iso or '')[:16].replace('T', ' ')


def cell(v):
    return '–' if v is None or v == '' else html.escape(str(v))


def write_index(entries):
    write_text(os.path.join(DATA, 'index.json'), json.dumps(entries, indent=2))
    rows = []
    for e in sorted(entries, key=lambda x: x.get('savedAt', ''), reverse=True):
        b = html.escape(e['base'])
        motm = e.get('playerOfTheMatch') or {}
        rows.append(
            f"<tr><td>{html.escape(local_time(e.get('savedAt')))}</td>"
            f"<td class='l'><a href='{b}.html'>{html.escape(str(e.get('scoreline', '')))}</a></td>"
            f"<td class='l'>{html.escape(str(e.get('mode', '')))}</td>"
            f"<td>{cell(e.get('playedSec'))}</td>"
            f"<td class='l'>{html.escape(str(motm.get('name', '–')))} {html.escape(str(motm.get('rating', '')))}</td>"
            f"<td>{cell(e.get('fouls'))}</td><td>{cell(e.get('detectionRatePct'))}</td>"
            f"<td class='l'><a href='{b}.json'>json</a> · <a href='{b}.csv'>csv</a></td></tr>")
    page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Foul Play FC metrics</title>
<style>
:root{{--bg:#f3f5f1;--card:#fff;--ink:#14201a;--muted:#5b6c62;--line:#dfe6e0;--a:#1d7ccc;color-scheme:light}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0a120f;--card:#111c17;--ink:#eef2e6;--muted:#93a799;--line:#25392f;--a:#3fa9ff;color-scheme:dark}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:16px/1.45 'Barlow Condensed','Arial Narrow',system-ui,sans-serif}}
main{{max-width:1100px;margin:0 auto;padding:28px 16px 60px;display:flex;flex-direction:column;gap:16px}}
h1{{margin:0;font-size:44px;line-height:1}} p{{margin:0;color:var(--muted)}} a{{color:var(--a)}}
.wrap{{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:10px}}
table{{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}}
th,td{{padding:7px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}}
th{{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}} th:first-child,td:first-child,.l{{text-align:left}}
</style></head><body><main>
<h1>Foul Play FC · match metrics</h1>
<p>{len(entries)} match{'es' if len(entries) != 1 else ''} saved. Every player row from every match is in <a href="all-players.csv">all-players.csv</a>; summaries are in <a href="index.json">index.json</a>.</p>
<div class="wrap"><table><thead><tr><th>Saved</th><th class="l">Match</th><th class="l">Mode</th><th>Played s</th><th class="l">Player of the match</th><th>Fouls</th><th>Caught %</th><th class="l">Raw</th></tr></thead>
<tbody>{''.join(rows) or "<tr><td colspan='8' class='l'>No matches yet.</td></tr>"}</tbody></table></div>
</main></body></html>"""
    write_text(os.path.join(DATA, 'index.html'), page)


class Handler(SimpleHTTPRequestHandler):
    # Fixed content types. On some Windows machines the registry maps .js to text/plain,
    # which makes browsers refuse to load the 3D view (render3d.js) as a module.
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
                      '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml',
                      '.csv': 'text/csv; charset=utf-8', '.md': 'text/markdown; charset=utf-8'}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if self.command == 'POST' or (args and str(args[1]) >= '400'):
            super().log_message(fmt, *args)

    def send_json(self, code, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split('?')[0] == '/api/health':
            return self.send_json(200, {'ok': True, 'saves': True, 'dir': 'data-metric'})
        return super().do_GET()

    def do_POST(self):
        if self.path.split('?')[0] != '/api/metrics':
            return self.send_json(404, {'error': 'Unknown endpoint.'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            n = 0
        if n <= 0 or n > MAX_BODY:
            return self.send_json(413, {'error': 'Report is empty or larger than 8 MB.'})
        try:
            payload = json.loads(self.rfile.read(n).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {'error': 'Body is not valid JSON.'})
        base, files, summary = payload.get('base'), payload.get('files'), payload.get('summary') or {}
        if not isinstance(base, str) or not SAFE_BASE.match(base):
            return self.send_json(400, {'error': 'Bad match name.'})
        if not isinstance(files, dict) or not files or any(k not in EXTS or not isinstance(v, str) for k, v in files.items()):
            return self.send_json(400, {'error': 'Files must be json, html or csv text.'})
        with LOCK:
            os.makedirs(DATA, exist_ok=True)
            saved = []
            for ext, text in files.items():
                write_text(os.path.join(DATA, f'{base}.{ext}'), text)
                saved.append(f'data-metric/{base}.{ext}')
            entries = [e for e in read_json(os.path.join(DATA, 'index.json'), []) if isinstance(e, dict) and e.get('base') != base]
            entries.append({'base': base, **{k: summary.get(k) for k in ('savedAt', 'mode', 'scoreline', 'playedSec', 'playerOfTheMatch', 'fouls', 'detectionRatePct')}})
            write_index(entries)
            if 'csv' in files:
                append_players(base, files['csv'])
        print(f'  saved {base} ({", ".join(files)}) -> data-metric/', flush=True)
        return self.send_json(200, {'saved': saved})


def find_cloudflared():
    found = shutil.which('cloudflared')
    if found:
        return found
    if IS_WIN:
        bases = [os.environ.get('ProgramFiles(x86)'), os.environ.get('ProgramFiles'), os.environ.get('LOCALAPPDATA')]
        cands = [os.path.join(b, 'cloudflared', 'cloudflared.exe') for b in bases if b]
        if os.environ.get('LOCALAPPDATA'):
            cands.append(os.path.join(os.environ['LOCALAPPDATA'], 'Microsoft', 'WinGet', 'Links', 'cloudflared.exe'))
    else:
        cands = ['/opt/homebrew/bin/cloudflared', '/usr/local/bin/cloudflared', '/usr/bin/cloudflared']
    return next((c for c in cands if os.path.isfile(c)), None)


def offer_install():
    print('cloudflared is not installed, so there is no public link yet. The game still runs at the address above.')
    if IS_MAC and shutil.which('brew'):
        cmd = ['brew', 'install', 'cloudflared']
    elif IS_WIN and shutil.which('winget'):
        cmd = ['winget', 'install', '--id', 'Cloudflare.cloudflared', '-e']
    else:
        print('Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ and run again.')
        return None
    try:
        answer = input(f'Install it now with "{" ".join(cmd)}"? [y/N] ').strip().lower()
    except EOFError:
        answer = ''
    if answer != 'y':
        print('Skipped. You can still play locally, or share the GitHub Pages link instead.')
        return None
    subprocess.run(cmd)
    return find_cloudflared()


def copy_to_clipboard(text):
    tools = [['pbcopy']] if IS_MAC else [['clip']] if IS_WIN else [['wl-copy'], ['xclip', '-selection', 'clipboard']]
    for tool in tools:
        if shutil.which(tool[0]):
            try:
                subprocess.run(tool, input=text, text=True, check=True)
                return True
            except (OSError, subprocess.CalledProcessError):
                pass
    return False


def start_tunnel(port):
    """Start a Cloudflare quick tunnel to this server and print the public link once it appears."""
    cf = find_cloudflared() or offer_install()
    if not cf:
        return None
    print('Opening a Cloudflare quick tunnel (no account needed)...', flush=True)
    proc = subprocess.Popen([cf, 'tunnel', '--no-autoupdate', '--url', f'http://localhost:{port}'],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace', bufsize=1)

    def pump():
        shown = False
        for line in proc.stdout:
            m = URL_RE.search(line)
            if m and not shown:
                shown, url = True, m.group(0)
                copied = copy_to_clipboard(url)
                print(f"""
  Public game link: {url}{'   (copied to the clipboard)' if copied else ''}
  1. Open it, choose Play online, then Create room.
  2. Send friends the link and the 5-letter room code.
  The link stops working when you close this window.
""", flush=True)
                webbrowser.open(url)
            elif ' ERR ' in line:
                print('  cloudflared: ' + line.strip(), flush=True)
    threading.Thread(target=pump, daemon=True).start()
    return proc


def main():
    ap = argparse.ArgumentParser(description='Serve Foul Play FC locally and save every finished match into ./data-metric.')
    ap.add_argument('--port', type=int, default=int(os.environ.get('PORT', 8080)))
    ap.add_argument('--bind', default='127.0.0.1')
    ap.add_argument('--open', action='store_true', help='open the game in your browser')
    ap.add_argument('--tunnel', action='store_true', help='also create a temporary public link with Cloudflare')
    args = ap.parse_args()
    try:
        srv = ThreadingHTTPServer((args.bind, args.port), Handler)
    except OSError as e:
        sys.exit(f'Could not start on port {args.port}: {e}. Another copy may already be running; try --port 9000.')
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    local = f'http://localhost:{args.port}'
    print(f'Foul Play FC is running at {local}', flush=True)
    print(f'Finished matches are saved to {DATA}', flush=True)
    print('Press Ctrl+C (or close this window) to stop.', flush=True)
    if args.open:
        webbrowser.open(local)
    proc = start_tunnel(args.port) if args.tunnel else None
    try:
        while True:
            time.sleep(0.5)
            if proc and proc.poll() is not None:
                print('The Cloudflare tunnel stopped. The game is still running locally.', flush=True)
                proc = None
    except KeyboardInterrupt:
        print('\nStopping...', flush=True)
    finally:
        if proc:
            proc.terminate()
        srv.shutdown()


if __name__ == '__main__':
    main()

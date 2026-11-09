#!/usr/bin/env python3
"""Serve Foul Play FC locally and save every finished match into ./data-metric.

    python3 server.py              # http://localhost:8080
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

Standard library only. Binds to 127.0.0.1 so only this computer (or a tunnel you
start yourself, see host.sh) can reach it.
"""
import argparse
import csv
import html
import io
import json
import os
import re
import sys
import threading
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data-metric')
MAX_BODY = 8 * 1024 * 1024
SAFE_BASE = re.compile(r'^[a-z0-9-]{1,120}$')
EXTS = ('json', 'html', 'csv')
LOCK = threading.Lock()


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
        print(f'  saved {base} ({", ".join(files)}) → data-metric/', flush=True)
        return self.send_json(200, {'saved': saved})


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--port', type=int, default=int(os.environ.get('PORT', 8080)))
    ap.add_argument('--bind', default='127.0.0.1')
    args = ap.parse_args()
    try:
        srv = ThreadingHTTPServer((args.bind, args.port), Handler)
    except OSError as e:
        sys.exit(f'Could not start on port {args.port}: {e}. Try --port 9000.')
    print(f'Foul Play FC on http://localhost:{args.port}  ·  match metrics are saved to {DATA}', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()

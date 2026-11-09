#!/usr/bin/env bash
# Serve Foul Play FC from this computer and share it through a temporary Cloudflare link.
#
# You do NOT need this when the game is on GitHub Pages: rooms work there directly.
# Use it to test local changes with friends before pushing, or if you don't want to use GitHub Pages.
#
# Usage: ./host.sh            (port 8080)
#        PORT=9000 ./host.sh
set -euo pipefail

PORT="${PORT:-8080}"
DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v cloudflared >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    read -r -p "cloudflared is not installed. Install it with Homebrew now? [Y/n] " ans
    if [[ "${ans:-Y}" =~ ^[Yy]$ ]]; then brew install cloudflared; else exit 1; fi
  else
    echo "Install cloudflared first: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
    exit 1
  fi
fi

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIR" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM
sleep 0.5
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Port $PORT is busy. Try: PORT=9000 ./host.sh"
  exit 1
fi

echo "Serving the game at http://localhost:$PORT"
echo "Opening a Cloudflare quick tunnel (no account needed)…"

URL_RE='https://[a-z0-9-]+\.trycloudflare\.com'
cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" 2>&1 | while IFS= read -r line; do
  if [[ $line =~ $URL_RE ]]; then
    url="${BASH_REMATCH[0]}"
    echo
    echo "  Game link: $url"
    echo "  1. Open it, choose Play online → Create room."
    echo "  2. Send friends the link and the 5-letter room code."
    echo "  Keep this terminal open. Press Ctrl+C to stop."
    echo
    if command -v pbcopy >/dev/null 2>&1; then printf %s "$url" | pbcopy && echo "  (link copied to clipboard)"; fi
    if command -v open >/dev/null 2>&1; then open "$url" || true; fi
  elif [[ $line == *ERR* ]]; then
    echo "$line"
  fi
done

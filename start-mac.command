#!/usr/bin/env bash
# Foul Play FC for macOS (also works on Linux).
# Double-click this file in Finder, or run ./start-mac.command in Terminal.
# It serves the game at http://localhost:8080, saves every match to data-metric/,
# and can also give friends a temporary public link through Cloudflare.
cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is needed. Install it from https://www.python.org/downloads/macos/"
  echo "or run:  xcode-select --install"
  read -r -p "Press Enter to close." _
  exit 1
fi

ARGS=(--open)
if [ -t 0 ]; then
  read -r -p "Share online with a temporary Cloudflare link? [y/N] " answer
  case "$answer" in [Yy]*) ARGS+=(--tunnel) ;; esac
fi

python3 server.py "${ARGS[@]}" "$@"

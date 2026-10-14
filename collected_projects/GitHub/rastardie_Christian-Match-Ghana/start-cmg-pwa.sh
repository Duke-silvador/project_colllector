#!/usr/bin/env bash
set -euo pipefail

# Start the CMG local PWA in Google Chrome only.
# Firebase emulators must already be running manually.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$WORKSPACE_DIR/frontend"
TMP_ROOT="${TMPDIR:-/tmp}"
BROWSER_PORT="${BROWSER_PORT:-$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)}"
VITE_LOG="$TMP_ROOT/cmg-pwa-vite.log"
VITE_PID_FILE="$TMP_ROOT/cmg-pwa-vite.pid"
VITE_PORT_FILE="$TMP_ROOT/cmg-pwa-vite.port"

command -v npm >/dev/null 2>&1 || { printf 'npm is required.\n' >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { printf 'curl is required.\n' >&2; exit 1; }
command -v lsof >/dev/null 2>&1 || { printf 'lsof is required.\n' >&2; exit 1; }
command -v open >/dev/null 2>&1 || { printf 'macOS open command is required.\n' >&2; exit 1; }

for port in 9099 8080 5001 9199 4000; do
  if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    cat >&2 <<EOF
Local Firebase emulators are not all running.
Start them manually first in another Terminal:

  cd "$WORKSPACE_DIR"
  backend/functions/node_modules/.bin/firebase emulators:start \\
    --project staging \\
    --only auth,firestore,storage,functions \\
    --import=.firebase-emulator-data \\
    --export-on-exit=.firebase-emulator-data
EOF
    exit 1
  fi
done

cd "$FRONTEND_DIR"
printf '%s\n' 'Installing frontend dependencies…'
npm ci

export VITE_USE_FIREBASE_EMULATORS=true
export VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
export VITE_LOCAL_TEST_FRESH_START=true
export VITE_PUBLIC_APP_URL="http://127.0.0.1:${BROWSER_PORT}"

printf 'Starting CMG PWA in Google Chrome at http://127.0.0.1:%s …\n' "$BROWSER_PORT"
npm run dev -- --host 127.0.0.1 --port "$BROWSER_PORT" 2>&1 | tee "$VITE_LOG" &
VITE_PID=$!
printf '%s\n' "$VITE_PID" > "$VITE_PID_FILE"
printf '%s\n' "$BROWSER_PORT" > "$VITE_PORT_FILE"

cleanup() {
  pids="$(lsof -tiTCP:"$BROWSER_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  [[ -z "$pids" ]] || kill $pids 2>/dev/null || true
  rm -f "$VITE_PID_FILE" "$VITE_PORT_FILE"
}
trap cleanup EXIT INT TERM

for _ in {1..30}; do
  curl -fsS "http://127.0.0.1:${BROWSER_PORT}" >/dev/null 2>&1 && break
  kill -0 "$VITE_PID" 2>/dev/null || { printf 'Vite exited. Log: %s\n' "$VITE_LOG" >&2; exit 1; }
  sleep 1
done

open -a 'Google Chrome' "http://127.0.0.1:${BROWSER_PORT}"
printf 'CMG local PWA: http://127.0.0.1:%s\n' "$BROWSER_PORT"
printf 'Vite log: %s\n' "$VITE_LOG"
printf '%s\n' 'This Terminal remains active. Press Control+C to stop the PWA.'
wait "$VITE_PID"

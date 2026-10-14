#!/usr/bin/env bash
set -euo pipefail

# Stop the local CMG test stack without touching staging or production.
# This closes the CMG browser tabs, stops the Android app and Android Emulator,
# stops the launcher Vite server, and stops the Firebase Emulator Suite.

TMP_ROOT="${TMPDIR:-/tmp}"
APP_ID="com.cmg.christianmatch"
VITE_PID_FILE="$TMP_ROOT/cmg-local-vite.pid"
VITE_PORT_FILE="$TMP_ROOT/cmg-local-vite.port"

printf '%s\n' 'Stopping CMG local Android app and emulator window…'
if command -v adb >/dev/null 2>&1; then
  adb_devices="$(adb devices | awk '$2 == "device" { print $1 }')"
  while IFS= read -r device; do
    [[ -n "$device" ]] || continue
    adb -s "$device" shell am force-stop "$APP_ID" 2>/dev/null || true
    # Only close Android Emulator instances. Do not disconnect a physical phone.
    if [[ "$device" == emulator-* ]]; then
      adb -s "$device" emu kill >/dev/null 2>&1 || true
    fi
  done <<< "$adb_devices"
else
  printf '%s\n' 'adb not found; Android app/emulator was not stopped.' >&2
fi

if [[ -f "$VITE_PORT_FILE" ]]; then
  vite_port="$(cat "$VITE_PORT_FILE")"
  if [[ "$vite_port" =~ ^[0-9]+$ ]]; then
    vite_pids="$(lsof -tiTCP:"$vite_port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$vite_pids" ]]; then
      printf 'Stopping local CMG frontend on port %s…\n' "$vite_port"
      kill $vite_pids 2>/dev/null || true
    fi
  fi
fi

if [[ -f "$VITE_PID_FILE" ]]; then
  vite_pid="$(cat "$VITE_PID_FILE")"
  if [[ "$vite_pid" =~ ^[0-9]+$ ]] && kill -0 "$vite_pid" 2>/dev/null; then
    kill "$vite_pid" 2>/dev/null || true
  fi
fi

# Close local CMG tabs, including stale tabs from previous launcher runs. Match
# the CMG title as well as a loopback URL so unrelated local projects remain open.
if command -v osascript >/dev/null 2>&1; then
  osascript <<'EOF' >/dev/null 2>&1 || true
tell application "Google Chrome"
  repeat with w in windows
    repeat with t in (tabs of w)
      set tabURL to URL of t
      set tabTitle to title of t
      if (tabURL starts with "http://127.0.0.1:") and (tabTitle contains "CMG") then close t
      if (tabURL starts with "http://localhost:") and (tabTitle contains "CMG") then close t
    end repeat
  end repeat
end tell
EOF
fi

printf '%s\n' 'Stopping local Firebase emulators…'
for port in 9099 8080 5001 9199 4000; do
  emulator_pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$emulator_pids" ]]; then
    kill $emulator_pids 2>/dev/null || true
  fi
done

# Stop the manually started Firebase CLI if it remains, limited to this local
# emulator command pattern.
pkill -TERM -f 'firebase emulators:start.*--project staging.*--only auth,firestore,storage,functions' 2>/dev/null || true

rm -f "$VITE_PID_FILE" "$VITE_PORT_FILE"
sleep 3

printf '%s\n' '--- local CMG status ---'
if command -v adb >/dev/null 2>&1; then
  if adb devices | awk '$2 == "device" { found=1 } END { exit !found }'; then
    printf 'Android emulator/device still connected.\n'
  else
    printf 'Android emulator: stopped\n'
  fi
fi

remaining=0
for port in 9099 8080 5001 9199 4000; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    printf 'Port %s is still in use:\n' "$port" >&2
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >&2
    remaining=1
  fi
done
if [[ "$remaining" -eq 0 ]]; then
  printf '%s\n' 'Firebase emulators: stopped'
fi
printf '%s\n' 'CMG local app windows and local test stack stopped.'

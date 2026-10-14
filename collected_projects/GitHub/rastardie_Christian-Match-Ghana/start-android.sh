#!/usr/bin/env bash
set -euo pipefail

# CMG launcher.
#
# Targets:
#   staging - remote staging Firebase project and staging Hosting config
#   local   - local Firebase Emulator Suite; no remote Firebase writes
#
# The script resolves its own directory and can be run from any directory.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$WORKSPACE_DIR/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"
STAGING_URL="https://christian-match-ghana.web.app"
TARGET="${1:-staging}"

case "$TARGET" in
  staging|local) ;;
  *)
    printf 'Usage: %s [staging|local]\n' "$0" >&2
    exit 2
    ;;
esac

if [[ -n "${VITE_PAYSTACK_PUBLIC_KEY:-}" && "${VITE_PAYSTACK_PUBLIC_KEY}" == pk_live_* ]]; then
  printf 'Refusing to launch with a live Paystack public key. Use a pk_test_* key for testing.\n' >&2
  exit 1
fi

command -v npm >/dev/null 2>&1 || { printf 'npm is required.\n' >&2; exit 1; }
command -v npx >/dev/null 2>&1 || { printf 'npx is required.\n' >&2; exit 1; }
command -v open >/dev/null 2>&1 || { printf 'macOS open command is required.\n' >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { printf 'curl is required.\n' >&2; exit 1; }

if [[ "$TARGET" == "local" ]]; then
  command -v lsof >/dev/null 2>&1 || { printf 'lsof is required for local emulator checks.\n' >&2; exit 1; }

  emulator_ports=(9099 8080 5001 9199 4000)
  emulators_ready=true
  for port in "${emulator_ports[@]}"; do
    if ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      emulators_ready=false
      break
    fi
  done

  if [[ "$emulators_ready" != true ]]; then
    cat >&2 <<EOF
Local Firebase emulators are not all running.
Start them manually in another Terminal with:

  cd "$WORKSPACE_DIR"
  backend/functions/node_modules/.bin/firebase emulators:start \
    --project staging \
    --only auth,firestore,storage,functions \
    --import=.firebase-emulator-data \
    --export-on-exit=.firebase-emulator-data

Leave that Terminal running, then retry: $0 local
EOF
    exit 1
  fi
fi

cd "$FRONTEND_DIR"

printf '%s\n' 'Installing frontend dependencies…'
npm ci

# Select a free local browser port without killing an unrelated process.
BROWSER_PORT="${BROWSER_PORT:-$(python3 - <<'PY'
import socket
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    print(sock.getsockname()[1])
PY
)}"
VITE_LOG="${TMPDIR:-/tmp}/cmg-${TARGET}-vite.log"
VITE_PID_FILE="${TMPDIR:-/tmp}/cmg-${TARGET}-vite.pid"
VITE_PORT_FILE="${TMPDIR:-/tmp}/cmg-${TARGET}-vite.port"

if [[ "$TARGET" == "local" ]]; then
  # Chrome runs on the Mac and reaches the emulators through loopback.
  export VITE_USE_FIREBASE_EMULATORS=true
  export VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
  export VITE_LOCAL_TEST_FRESH_START=true
  export VITE_PUBLIC_APP_URL="http://127.0.0.1:${BROWSER_PORT}"
else
  # .env.local contains the staging Firebase configuration. Use the staging
  # Hosting URL in Auth action links so emails do not return to production.
  export VITE_PUBLIC_APP_URL="${VITE_PUBLIC_APP_URL:-$STAGING_URL}"
fi

printf 'Starting %s browser server on http://127.0.0.1:%s …\n' "$TARGET" "$BROWSER_PORT"
# Keep Vite attached to this Terminal so its live output remains visible while
# Chrome and Android are being tested. The log is also retained in a temp file.
npm run dev -- --host 127.0.0.1 --port "$BROWSER_PORT" 2>&1 | tee "$VITE_LOG" &
VITE_PID=$!
printf '%s\n' "$VITE_PID" > "$VITE_PID_FILE"
printf '%s\n' "$BROWSER_PORT" > "$VITE_PORT_FILE"

cleanup_vite() {
  local vite_pids=""
  if [[ -n "${BROWSER_PORT:-}" ]]; then
    vite_pids="$(lsof -tiTCP:"$BROWSER_PORT" -sTCP:LISTEN 2>/dev/null || true)"
  fi
  if [[ -n "$vite_pids" ]]; then
    kill $vite_pids 2>/dev/null || true
  fi
  rm -f "$VITE_PID_FILE" "$VITE_PORT_FILE"
}
trap cleanup_vite EXIT INT TERM

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${BROWSER_PORT}" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$VITE_PID" 2>/dev/null; then
    printf 'Vite exited unexpectedly. Log: %s\n' "$VITE_LOG" >&2
    cat "$VITE_LOG" >&2 || true
    exit 1
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${BROWSER_PORT}" >/dev/null 2>&1; then
  printf 'Vite did not become ready. Log: %s\n' "$VITE_LOG" >&2
  cat "$VITE_LOG" >&2 || true
  exit 1
fi

if [[ "$TARGET" == "local" ]]; then
  printf '%s\n' 'Building Android bundle for the local Firebase emulators…'
  # The Android emulator reaches services on the Mac through 10.0.2.2.
  VITE_USE_FIREBASE_EMULATORS=true \
  VITE_FIREBASE_EMULATOR_HOST=10.0.2.2 \
  VITE_PUBLIC_APP_URL="http://10.0.2.2:${BROWSER_PORT}" \
  npm run build
else
  printf '%s\n' 'Building the staging web bundle…'
  npm run build
fi

printf '%s\n' 'Synchronizing the Capacitor Android project…'
npx cap sync android

# If an Android emulator/device is connected, build, install, and launch CMG
# automatically. Android Studio is still opened below for logs and debugging.
if command -v adb >/dev/null 2>&1; then
  ANDROID_DEVICE="$(adb devices | awk '$2 == "device" { print $1; exit }')"
  if [[ -n "$ANDROID_DEVICE" ]]; then
    ANDROID_BUILD_LOG="${TMPDIR:-/tmp}/cmg-${TARGET}-android-build.log"
    ANDROID_INSTALL_LOG="${TMPDIR:-/tmp}/cmg-${TARGET}-android-install.log"
    printf 'Building the Android debug app…\n'
    bash "$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleDebug >"$ANDROID_BUILD_LOG" 2>&1
    printf 'Installing and launching Android app on %s…\n' "$ANDROID_DEVICE"
    adb -s "$ANDROID_DEVICE" install -r "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" >"$ANDROID_INSTALL_LOG" 2>&1
    adb -s "$ANDROID_DEVICE" shell am force-stop com.cmg.christianmatch
    adb -s "$ANDROID_DEVICE" shell monkey -p com.cmg.christianmatch 1 >/dev/null
    printf 'Android app launched. Build log: %s\n' "$ANDROID_BUILD_LOG"
  else
    printf '%s\n' 'No Android emulator/device is connected; Android Studio will open without auto-launching the app.' >&2
  fi
else
  printf '%s\n' 'adb is not available; Android Studio will open without auto-launching the app.' >&2
fi

if ! open -a 'Google Chrome' "http://127.0.0.1:${BROWSER_PORT}"; then
  printf 'Google Chrome is required to launch the CMG PWA.\n' >&2
  exit 1
fi

printf '%s\n' 'Opening Android Studio…'
if ! open -a 'Android Studio' "$ANDROID_DIR" 2>/dev/null; then
  npx cap open android
fi

printf '%s\n' "CMG $TARGET test environment is running."
printf 'Browser:       http://127.0.0.1:%s\n' "$BROWSER_PORT"
if [[ "$TARGET" == "local" ]]; then
  printf 'Firebase:      Local Emulator Suite\n'
  printf 'Emulator UI:   http://127.0.0.1:4000\n'
else
  printf 'Firebase:      christian-match-ghana\n'
fi
printf 'Android:       %s\n' "$ANDROID_DIR"
printf 'Vite log:      %s\n' "$VITE_LOG"
printf '%s\n' 'The browser server remains running in the background.'
if [[ "$TARGET" == "local" ]]; then
  printf '%s\n' 'The launcher command has finished normally; keep the separate Firebase emulator Terminal open.'
fi

printf '%s\n' 'Frontend terminal remains active with live Vite output.'
printf '%s\n' 'Press Control+C here to stop the frontend; use stop-cmg-local.sh to stop the complete local stack.'
wait "$VITE_PID"

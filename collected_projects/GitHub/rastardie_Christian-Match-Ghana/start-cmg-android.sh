#!/usr/bin/env bash
set -euo pipefail

# Start the CMG local Android app only.
# Firebase emulators must already be running manually.
# This script does not start Chrome or a Vite server.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$SCRIPT_DIR"
FRONTEND_DIR="$WORKSPACE_DIR/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"
APP_ID="com.cmg.christianmatch"
AVD_NAME="${CMG_ANDROID_AVD:-Medium_Phone}"
TMP_ROOT="${TMPDIR:-/tmp}"

command -v npm >/dev/null 2>&1 || { printf 'npm is required.\n' >&2; exit 1; }
command -v adb >/dev/null 2>&1 || { printf 'adb is required.\n' >&2; exit 1; }
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

ANDROID_DEVICE="$(adb devices | awk '$2 == "device" { print $1; exit }')"
if [[ -z "$ANDROID_DEVICE" ]]; then
  command -v emulator >/dev/null 2>&1 || { printf 'Android emulator command is required.\n' >&2; exit 1; }
  printf 'Starting Android Emulator AVD %s…\n' "$AVD_NAME"
  nohup emulator -avd "$AVD_NAME" -no-snapshot-save >/tmp/cmg-android-emulator.log 2>&1 &
  for _ in {1..120}; do
    ANDROID_DEVICE="$(adb devices | awk '$2 == "device" { print $1; exit }')"
    [[ -n "$ANDROID_DEVICE" ]] && break
    sleep 1
  done
fi

if [[ -z "$ANDROID_DEVICE" ]]; then
  printf 'Android emulator did not become ready. Log: /tmp/cmg-android-emulator.log\n' >&2
  exit 1
fi

cd "$FRONTEND_DIR"
printf '%s\n' 'Installing frontend dependencies…'
npm ci

printf '%s\n' 'Building the Android bundle for local Firebase emulators…'
VITE_USE_FIREBASE_EMULATORS=true \
VITE_LOCAL_TEST_FRESH_START=true \
VITE_FIREBASE_EMULATOR_HOST=10.0.2.2 \
VITE_PUBLIC_APP_URL=http://10.0.2.2:3000 \
npm run build

printf '%s\n' 'Synchronizing Capacitor Android…'
VITE_USE_FIREBASE_EMULATORS=true npx cap sync android

ANDROID_BUILD_LOG="$TMP_ROOT/cmg-local-android-build.log"
ANDROID_INSTALL_LOG="$TMP_ROOT/cmg-local-android-install.log"
printf '%s\n' 'Building Android debug APK…'
bash "$ANDROID_DIR/gradlew" -p "$ANDROID_DIR" assembleDebug >"$ANDROID_BUILD_LOG" 2>&1
printf 'Installing and launching CMG on %s…\n' "$ANDROID_DEVICE"
if [[ "${CMG_PRESERVE_ANDROID_DATA:-false}" != "true" ]]; then
  printf '%s\n' 'Clearing previous local Android session data…'
  adb -s "$ANDROID_DEVICE" shell pm clear "$APP_ID" >/dev/null
fi
adb -s "$ANDROID_DEVICE" install -r "$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk" >"$ANDROID_INSTALL_LOG" 2>&1
adb -s "$ANDROID_DEVICE" shell am force-stop "$APP_ID"
adb -s "$ANDROID_DEVICE" shell monkey -p "$APP_ID" 1 >/dev/null

open -a 'Android Studio' "$ANDROID_DIR" 2>/dev/null || true
printf '%s\n' 'CMG Android app is running.'
printf 'Device:      %s\n' "$ANDROID_DEVICE"
printf 'App:         %s\n' "$APP_ID"
printf 'Build log:   %s\n' "$ANDROID_BUILD_LOG"
printf 'Install log: %s\n' "$ANDROID_INSTALL_LOG"
printf '%s\n' 'Android logs: Android Studio Logcat or adb logcat.'

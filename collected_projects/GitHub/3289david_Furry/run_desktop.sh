#!/usr/bin/env bash
# ==============================================================================
# Mochi-Puff AI 3D Virtual Pet — Linux Standalone Desktop App Launcher
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required. Run ./setup_ubuntu.sh first."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ ! -d "dist" ]; then
  echo "Building assets..."
  npm run build
fi

# Start server in background if not already running on port 3000
if ! curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
  echo "Starting background server on port 3000..."
  node server.js &
  SERVER_PID=$!
  sleep 2
fi

# Launch in standalone application window mode (borderless, no URL bar)
APP_URL="http://localhost:3000"

if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app="$APP_URL" --window-size=1150,820 &
elif command -v chromium-browser >/dev/null 2>&1; then
  chromium-browser --app="$APP_URL" --window-size=1150,820 &
elif command -v chromium >/dev/null 2>&1; then
  chromium --app="$APP_URL" --window-size=1150,820 &
elif command -v microsoft-edge >/dev/null 2>&1; then
  microsoft-edge --app="$APP_URL" --window-size=1150,820 &
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$APP_URL" &
else
  echo "Mochi-Puff server running at $APP_URL"
fi

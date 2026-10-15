#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_NAME="${SUVHLATEX_ENV_NAME:-suvhlatex}"
LOG_DIR="$APP_DIR/data"
mkdir -p "$LOG_DIR"

if [[ -x "$APP_DIR/.venv/bin/python" ]]; then
  PYTHON=("$APP_DIR/.venv/bin/python")
elif command -v conda >/dev/null 2>&1 && conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
  PYTHON=(conda run --no-capture-output --name "$ENV_NAME" python)
else
  PYTHON=(python3)
fi

HOST="${SUVHLATEX_HOST:-127.0.0.1}"
PORT="${SUVHLATEX_PORT:-8765}"
URL="http://${HOST}:${PORT}"

if command -v xdg-open >/dev/null 2>&1; then
  (sleep 1; xdg-open "$URL" >/dev/null 2>&1 || true) &
fi

echo "Starting suvhlatex at $URL"
exec "${PYTHON[@]}" "$APP_DIR/server.py" >> "$LOG_DIR/suvhlatex.log" 2>&1

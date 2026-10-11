#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/linux/install.sh" ]; then
    exec bash "$SCRIPT_DIR/linux/install.sh" "$@"
else
    echo "Linux installer script not found." >&2
    exit 1
fi

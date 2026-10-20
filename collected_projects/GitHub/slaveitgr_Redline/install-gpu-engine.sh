#!/bin/sh
# Stage only Redline's own GPU engine; no driver, boot, repository or authorization changes.
set -eu
[ "$(id -u)" = 0 ] || { echo 'Administrator authentication required.'; exit 1; }
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
binary="$project/runtime/libexec/redline/redline-gpu-backend"
[ -f "$binary" ] && [ ! -L "$binary" ] && [ -x "$binary" ] || exit 1
if readelf -d "$binary" | grep -Eq 'RPATH|RUNPATH'; then echo 'Unsafe library search path'; exit 1; fi
if ldd "$binary" | grep -q 'not found'; then echo 'Missing system dependency'; exit 1; fi
[ ! -e /usr/local/libexec/redline/redline-gpu-backend ] || { echo 'Engine already installed; update requires a separate verified update.'; exit 1; }
install -d -o root -g root -m 755 /usr/local/libexec/redline
install -o root -g root -m 755 "$binary" /usr/local/libexec/redline/redline-gpu-backend
echo 'Redline GPU engine installed. No GPU settings have been applied.'

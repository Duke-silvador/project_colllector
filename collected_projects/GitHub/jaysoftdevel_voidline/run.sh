#!/usr/bin/env bash
set -euo pipefail
root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
binary="$root/build/voidline/voidline"
if [[ ! -x "$binary" ]]; then
  binary="$root/voidline"
fi
if [[ ! -x "$binary" ]]; then
  echo 'Run ./build.sh to build VOIDLINE.' >&2
  exit 1
fi
exec "$binary" "$@"

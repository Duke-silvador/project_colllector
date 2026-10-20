#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ -x "$project/runtime/bin/redline-native" ] || { echo 'Build Redline first with ./build-redline.sh'; exit 1; }
export REDLINE_READ_ONLY=1
export REDLINE_GPU_ENGINE=1
export LD_LIBRARY_PATH="$project/runtime/lib:$project/runtime/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$project/runtime/bin/redline-native" "$@"

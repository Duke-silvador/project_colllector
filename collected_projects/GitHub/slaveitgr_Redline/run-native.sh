#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ -f /usr/share/dbus-1/system-services/io.github.redline.native.helper.service ] || { echo 'Install the independent Redline helper first; see README-REDLINE.md.'; exit 1; }
unset REDLINE_READ_ONLY
export REDLINE_GPU_ENGINE=1
export LD_LIBRARY_PATH="$project/runtime/lib:$project/runtime/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
exec "$project/runtime/bin/redline-native" "$@"

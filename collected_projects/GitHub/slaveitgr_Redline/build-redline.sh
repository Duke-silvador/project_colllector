#!/bin/sh
set -eu
project=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
build=${REDLINE_BUILD_DIR:-"$project/build"}
set -- -S "$project" -B "$build" -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF -DCMAKE_INSTALL_PREFIX="$project/runtime" -DINSTALL_DBUS_FILES_IN_PREFIX=ON -DPOLKIT_POLICY_INSTALL_DIR="$project/runtime/share/polkit-1/actions"
if [ -n "${REDLINE_BUILD_SYSROOT:-}" ]; then
 set -- "$@" -DCMAKE_PREFIX_PATH="$REDLINE_BUILD_SYSROOT/usr" -DQt6_DIR="$REDLINE_BUILD_SYSROOT/usr/lib/x86_64-linux-gnu/cmake/Qt6" -DQT_ADDITIONAL_PACKAGES_PREFIX_PATH="$REDLINE_BUILD_SYSROOT/usr" -DREDLINE_BUILD_SYSROOT="$REDLINE_BUILD_SYSROOT"
fi
cmake "$@"
cmake --build "$build" -j "${REDLINE_BUILD_JOBS:-4}"
cmake --install "$build"

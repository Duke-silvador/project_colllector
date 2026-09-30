#!/usr/bin/env bash
# One shot: install deps + build tools (install.sh), then build and run the probe and the test enclave (check.sh).
# Usage: ./run.sh [--no-run]   Exit code = number of FAILs.
[ "$(id -u)" = 0 ] || exec sudo "$0" "$@"
cd "$(dirname "$0")" || exit
./install.sh || echo "WARN  install.sh failed: checking with what is installed"
exec ./check.sh "$@"

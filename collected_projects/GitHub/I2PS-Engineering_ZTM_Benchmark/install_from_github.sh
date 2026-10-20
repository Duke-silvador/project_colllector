#!/usr/bin/env bash
# I2PS public GitHub bootstrap: downloads the release checker, not arbitrary app source.
# Stable releases only; archive SHA-256 verified before extraction; no mining.
set -Eeuo pipefail
REPO='I2PS-Engineering/Dual-ISA-RandomX-Lab'
CHECKER="https://raw.githubusercontent.com/$REPO/main/github_updates.py"
# Pinned to reviewed github_updates.py content currently published on GitHub.
CHECKER_SHA256="1bdc094959232aa40105ddd178e0476edc753eb4b1ea94abd3e4508f96cd16d2"
MODE='--install'
ASSUME_YES=0
NO_LAUNCH=0
for arg in "$@"; do
  case "$arg" in
    --check) MODE='--check' ;;
    --plan) MODE='--plan' ;;
    --yes) ASSUME_YES=1 ;;
    --no-launch) NO_LAUNCH=1 ;;
    --help|-h)
      printf '%s\n' 'I2PS GitHub setup: bash install_from_github.sh [--plan | --check | --yes | --no-launch]' \
      'Supports Ubuntu/Debian Linux x86-64 (other platforms only with a compatible release).' \
      'Downloads the latest approved stable GitHub Release and verifies SHA-256.' \
      'No OS reinstall; no mining; no automatic personal-wallet configuration.'
      exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
[[ "$(uname -s)" == 'Linux' ]] || { echo 'Install Ubuntu first, then run this on Linux.' >&2; exit 2; }
[[ "$(id -u)" -ne 0 ]] || { echo 'Run as your regular user, not root.' >&2; exit 2; }
printf '\nI2PS GitHub Release Setup\nAccount: https://github.com/%s\n' "$REPO"
printf 'OS: %s | CPU: %s\n' "$(uname -s)" "$(uname -m)"
if [[ "$MODE" == '--plan' ]]; then
  cat <<'PLAN'
PLAN ONLY - no changes and no downloads:
1. On Ubuntu/Debian, install Python 3.9+ and HTTPS certificates if missing.
2. Retrieve the official release checker from the I2PS GitHub repository.
3. Check the latest approved stable release for this CPU architecture.
4. Download the ZIP and SHA256SUMS.txt, verify integrity, reject unsafe ZIP entries.
5. Preserve prior local data and installation for rollback.
6. Start application separately; setup does not start mining or accept its terms.
Note: A v0.4 release does not exist yet. The checker will say so.
PLAN
  exit 0
fi
python_ok() { command -v python3 >/dev/null && python3 -c 'import sys;assert sys.version_info>=(3,9)' 2>/dev/null; }
if ! python_ok; then
  echo 'Python 3.9+ is required; on supported Ubuntu/Debian we can install missing Python.'
  command -v apt-get >/dev/null || { echo 'Install Python 3.9+ first using your distro package manager.' >&2; exit 2; }
  command -v sudo >/dev/null || { echo 'Missing sudo. Ask an administrator to install Python 3.9+.' >&2; exit 2; }
  if [[ "$ASSUME_YES" -ne 1 ]]; then
    read -r -p 'Install missing Python/HTTPS certificates via apt? [y/N] ' choice
    [[ "$choice" =~ ^[yY]$ ]] || exit 1
  fi
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends python3 ca-certificates
  python_ok || { echo 'Python still below 3.9; upgrade your distribution Python.' >&2; exit 2; }
fi
command -v curl >/dev/null || { echo 'curl is required to obtain the official GitHub release checker; install curl first.' >&2; exit 2; }
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
curl -fL --proto '=https' --tlsv1.2 --retry 2 -o "$tmp/github_updates.py" "$CHECKER"
[[ -s "$tmp/github_updates.py" ]] || { echo 'GitHub release checker download failed.' >&2; exit 2; }
python3 - "$tmp/github_updates.py" "$CHECKER_SHA256" <<'PYVERIFY'
import hashlib, sys
with open(sys.argv[1], 'rb') as f:
    actual = hashlib.file_digest(f, 'sha256').hexdigest() if hasattr(hashlib, 'file_digest') else hashlib.sha256(f.read()).hexdigest()
if actual != sys.argv[2]:
    raise SystemExit('Release-checker source hash does not match the reviewed I2PS pinned SHA-256; nothing was executed.')
PYVERIFY
if [[ "$MODE" == '--check' ]]; then python3 "$tmp/github_updates.py" --check; exit $?; fi
args=(--install)
if [[ "$ASSUME_YES" -eq 1 ]]; then args+=(--yes); fi
python3 "$tmp/github_updates.py" "${args[@]}"
if [[ "$NO_LAUNCH" -eq 0 && -t 0 ]]; then
  read -r -p 'Open I2PS Setup Assistant now? [y/N] ' launch
  if [[ "$launch" =~ ^[yY]$ ]]; then
    installed="${XDG_DATA_HOME:-$HOME/.local/share}/i2ps-randomx-lab/current"
    if [[ -f "$installed/install_i2ps_linux.sh" ]]; then
      bash "$installed/install_i2ps_linux.sh"
    else
      echo 'The release has no Linux first-run assistant; check package contents.' >&2
    fi
  fi
fi
#!/usr/bin/env bash
# ZTM — Zero to Monero alpha4 surgical installer for Ubuntu Desktop x86-64.
set -Eeuo pipefail
export LC_ALL=C
umask 077
REPO='I2PS-Engineering/Dual-ISA-RandomX-Lab'
ASSET='downloads/ZTM-Zero-to-Monero_0.1.3-alpha4-surgical_amd64.deb'
SHA='27f241dae46c4077abf6a92d1bc46a2084b6e4de730bf6924f2d4ea03e6dc535'
SIZE='23440'
VERSION='0.1.3-alpha4-surgical'
PACKAGE_COMMIT='166f14e9d2c80cbf6f7664f1be4e55baba8e067e'
RAW="https://raw.githubusercontent.com/$REPO/$PACKAGE_COMMIT/$ASSET"
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || { echo 'ZTM requires Ubuntu Linux x86-64.' >&2; exit 1; }
[[ "${EUID:-0}" -ne 0 ]] || { echo 'Run this as your normal desktop user, not root.' >&2; exit 1; }
[ -r /etc/os-release ] || { echo 'Cannot identify Linux distribution.' >&2; exit 1; }
. /etc/os-release
[[ "${ID:-}" == ubuntu ]] || { echo 'This engineering release targets Ubuntu Desktop.' >&2; exit 1; }
for cmd in python3 sha256sum dpkg-deb sudo apt-get; do command -v "$cmd" >/dev/null || { echo "Missing required command: $cmd" >&2; exit 1; }; done
work=$(mktemp -d "${TMPDIR:-/tmp}/ztm-install.XXXXXXXX")
trap 'rm -rf "$work"' EXIT
pkg="$work/ztm.deb"
printf '%s\n' "ZTM $VERSION — downloading verified package from I2PS Engineering GitHub..."
python3 - "$RAW" "$pkg" <<'PY'
import pathlib, sys, urllib.request
url, target = sys.argv[1:]
req = urllib.request.Request(url, headers={'User-Agent':'ZTM-GitHub-Installer/0.1.3'})
with urllib.request.urlopen(req, timeout=90) as r:
    final = r.geturl()
    if not final.startswith('https://raw.githubusercontent.com/'):
        raise SystemExit('SECURITY STOP: unexpected download host')
    data = r.read(150_000_001)
if len(data) > 150_000_000:
    raise SystemExit('SECURITY STOP: package unexpectedly large')
pathlib.Path(target).write_bytes(data)
PY
[[ "$(stat -c %s "$pkg")" == "$SIZE" ]] || { echo 'SECURITY STOP: package size mismatch.' >&2; exit 1; }
printf '%s  %s\n' "$SHA" "$pkg" | sha256sum --status -c - || { echo 'SECURITY STOP: package SHA-256 mismatch.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$pkg" Package)" == ztm-zero-to-monero ]] || { echo 'SECURITY STOP: unexpected package name.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$pkg" Architecture)" == amd64 ]] || { echo 'SECURITY STOP: wrong package architecture.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$pkg" Version)" == '0.1.3~alpha4surgical1' ]] || { echo 'SECURITY STOP: wrong package version.' >&2; exit 1; }
echo 'Verified. Ubuntu may request your administrator password for package installation.'
sudo apt-get update
sudo apt-get install -y "$pkg"
command -v ztm >/dev/null || { echo 'ZTM launcher not found after installation.' >&2; exit 1; }
echo 'Launching ZTM. Mining does not start until you authorize it in the GUI.'
exec ztm

#!/usr/bin/env bash
# ZTM — Zero to Monero: authenticated GitHub alpha3 surgical bootstrap for Ubuntu Desktop x86-64.
# Only installs reviewed signed packages; never starts mining without separate GUI authorization.
set -Eeuo pipefail
export LC_ALL=C
umask 077
REPO='I2PS-Engineering/Dual-ISA-RandomX-Lab'
RAW="https://raw.githubusercontent.com/$REPO/main"

if [[ "${1:-}" == '--help' ]]; then
  printf '%s\n' 'ZTM GitHub Installer (Ubuntu Desktop x86-64)' 'Options: --plan (inspect signed update; no install), --help'
  exit 0
fi
if [[ $# -gt 1 || ( $# -eq 1 && "${1:-}" != '--plan' ) ]]; then
  echo 'Invalid option; use --help' >&2; exit 2
fi
[[ "$(uname -s)" == 'Linux' && "$(uname -m)" == 'x86_64' ]] || { echo 'Ubuntu Desktop x86-64 is required for this alpha.' >&2; exit 1; }
[[ -r /etc/os-release ]] || { echo 'Missing /etc/os-release.' >&2; exit 1; }
. /etc/os-release
[[ "${ID:-}" == 'ubuntu' ]] || { echo 'This ZTM build requires Ubuntu Desktop.' >&2; exit 1; }
[[ "${EUID:-0}" -ne 0 ]] || { echo 'Start this command as your normal Ubuntu user (without sudo).' >&2; exit 1; }
for cmd in python3 sha256sum dpkg-deb sudo apt-get; do
  command -v "$cmd" >/dev/null || { echo "Missing prerequisite: $cmd" >&2; exit 1; }
done
if [[ "${1:-}" != '--plan' ]]; then
  echo 'ZTM: updating Ubuntu APT package lists and preparing secure download tools.'
  sudo apt-get update
  sudo apt-get install -y curl openssl ca-certificates
else
  for cmd in curl openssl; do command -v "$cmd" >/dev/null || { echo "Missing $cmd. Normal installation sets it up." >&2; exit 1; }; done
fi
work=$(mktemp -d "${TMPDIR:-/tmp}/ztm-installer.XXXXXXXX")
trap 'rm -rf "$work"' EXIT
cat > "$work/key.pem" <<'PUBKEY'
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAQQklfyYBIsFriksnwahwqHbE2RrpQz+Dbz3gCIGt6jQ=
-----END PUBLIC KEY-----
PUBKEY
get() {
  curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 \
    --connect-timeout 15 --retry 2 --max-time 180 --max-filesize "$3" --output "$2" "$1"
}
echo 'ZTM: checking the latest cryptographically signed alpha release manifest...'
get "$RAW/downloads/latest-ztm-v3.json" "$work/manifest.json" 20000
get "$RAW/downloads/latest-ztm-v3.sig" "$work/sig.txt" 2000
python3 - "$work/sig.txt" "$work/sig.bin" <<'PYSIG'
import base64, pathlib, sys
try:
    raw=pathlib.Path(sys.argv[1]).read_text().strip()
    data=base64.b64decode(raw,validate=True)
    if len(data)!=64: raise ValueError('invalid signature length')
    pathlib.Path(sys.argv[2]).write_bytes(data)
except Exception as e: raise SystemExit('Invalid signed-manifest signature: '+str(e))
PYSIG
openssl pkeyutl -verify -pubin -inkey "$work/key.pem" -rawin -in "$work/manifest.json" -sigfile "$work/sig.bin" >/dev/null || {
  echo 'SECURITY STOP: GitHub release manifest signature is invalid.' >&2; exit 1;
}
python3 - "$work/manifest.json" "$work/release.env" <<'PYMAN'
import json, pathlib, re, shlex, sys
m=json.loads(pathlib.Path(sys.argv[1]).read_text())
if (m.get('schema'),m.get('project'),m.get('channel'),m.get('architecture')) != (2,'ZTM - Zero to Monero','alpha','amd64'):
    raise SystemExit('Unsupported signed release manifest')
version=m.get('version','')
asset=m.get('asset','')
size=m.get('bytes')
sha=m.get('sha256','')
dpkg_version=m.get('dpkg_version','')
if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+-alpha[0-9]+-surgical', version):
    raise SystemExit('Unsupported version')
if asset != f'downloads/ZTM-Zero-to-Monero_{version}_amd64.deb':
    raise SystemExit('Invalid signed package path')
if dpkg_version != version.replace('-alpha','~alpha').replace('-surgical','surgical1'):
    raise SystemExit('Inconsistent Debian version')
if type(size)!=int or not (1000<size<150000000) or not re.fullmatch(r'[0-9a-f]{64}',sha):
    raise SystemExit('Invalid signed integrity fields')
out=pathlib.Path(sys.argv[2]);out.write_text('VERSION='+shlex.quote(version)+'\nASSET='+shlex.quote(asset)+'\nSIZE='+str(size)+'\nSHA='+sha+'\nDPKG_VERSION='+shlex.quote(dpkg_version)+'\n')
PYMAN
# shellcheck source=/dev/null
. "$work/release.env"
echo "Verified signed manifest for ZTM $VERSION ($SIZE bytes)."
if [[ "${1:-}" == '--plan' ]]; then echo 'Plan only: no package downloaded or installed.'; exit 0; fi
get "$RAW/$ASSET" "$work/ztm.deb" 150000000
[[ "$(stat -c %s "$work/ztm.deb")" == "$SIZE" ]] || { echo 'SECURITY STOP: incorrect download size.' >&2; exit 1; }
printf '%s  %s\n' "$SHA" "$work/ztm.deb" | sha256sum --status -c - || { echo 'SECURITY STOP: downloaded package SHA-256 mismatch.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$work/ztm.deb" Package)" == 'ztm-zero-to-monero' ]] || { echo 'SECURITY STOP: unexpected package name.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$work/ztm.deb" Architecture)" == 'amd64' ]] || { echo 'SECURITY STOP: wrong package architecture.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$work/ztm.deb" Version)" == "$DPKG_VERSION" ]] || { echo 'SECURITY STOP: incorrect Debian package version.' >&2; exit 1; }
echo 'ZTM verified: installing graphical application...'
sudo apt-get install -y "$work/ztm.deb"
command -v ztm >/dev/null || { echo 'ZTM launcher not installed.' >&2; exit 1; }
echo 'Launching ZTM. Choose Prepare Linux + Install XMRig, then authorize the preconfigured Dev Wallet benchmark.'
exec ztm

#!/usr/bin/env bash
# ZTM Zero to Monero — pinned bootstrap, signed manifest and SHA256-checked package.
set -Eeuo pipefail
export LC_ALL=C
REPO='I2PS-Engineering/Dual-ISA-RandomX-Lab'
BRANCH='main'
RAW="https://raw.githubusercontent.com/$REPO/$BRANCH"
HOST="https://github.com/$REPO/raw/$BRANCH"
if [[ "${1:-}" == '--help' ]]; then
  printf '%s\n' 'ZTM installer: bash install-ztm.sh [--plan | --verify-only]' 'Verifies newest signed alpha package, Ubuntu x86-64 only; no mining during install.'
  exit 0
fi
if [[ $# -gt 1 || ( $# -eq 1 && "$1" != '--plan' && "$1" != '--verify-only' ) ]]; then
  echo 'Usage: bash install-ztm.sh [--plan | --verify-only]' >&2; exit 2
fi
for cmd in curl openssl sha256sum python3 dpkg-deb; do
 command -v "$cmd" >/dev/null || { echo "Missing $cmd (required for secure installer)." >&2; exit 1; }
done
[[ "$(uname -s)" == 'Linux' && "$(uname -m)" == 'x86_64' ]] || { echo 'ZTM alpha requires Ubuntu Linux x86-64.' >&2; exit 1; }
if [[ -f /etc/os-release ]]; then
 . /etc/os-release
 if [[ "${ID:-}" != 'ubuntu' ]]; then echo 'This alpha targets Ubuntu Desktop; detected a different Linux distribution.' >&2; exit 1; fi
else echo 'Linux release information missing.' >&2; exit 1; fi
[[ "${EUID:-0}" -ne 0 ]] || { echo 'Run as your ordinary desktop user, not root.' >&2; exit 1; }
workspace=$(mktemp -d "${TMPDIR:-/tmp}/ztm-install.XXXXXXXX")
trap 'rm -rf "$workspace"' EXIT
umask 077
printf '%s\n' 'ZTM • Getting latest signed alpha manifest from official GitHub...'
# Restrict protocols; do not continue on HTTP, TLS errors, redirects to unsupported hosts.
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --retry 2 --connect-timeout 15 --max-time 90 --max-filesize 20000 -o "$workspace/manifest.json" "$RAW/downloads/latest-ztm.json"
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --retry 2 --connect-timeout 15 --max-time 90 --max-filesize 2000 -o "$workspace/manifest.sig.b64" "$RAW/downloads/latest-ztm.sig"
cat > "$workspace/pubkey.pem" <<'ED25519_ZTM_PUBLIC_KEY'
-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA9JH4RDV0NQGuhCDv7ngWBVWa25DNVH4VhFzfMs/JF6Y=
-----END PUBLIC KEY-----
ED25519_ZTM_PUBLIC_KEY
python3 - "$workspace/manifest.sig.b64" "$workspace/manifest.sig" <<'PYB64'
import base64, pathlib, sys
raw=pathlib.Path(sys.argv[1]).read_text().strip()
try: b=base64.b64decode(raw,validate=True)
except Exception as e: raise SystemExit('Refusing: invalid signature encoding') from e
if len(b)!=64: raise SystemExit('Refusing: invalid signature length')
pathlib.Path(sys.argv[2]).write_bytes(b)
PYB64
openssl pkeyutl -verify -pubin -inkey "$workspace/pubkey.pem" -rawin -in "$workspace/manifest.json" -sigfile "$workspace/manifest.sig" >/dev/null || { echo 'SECURITY FAILURE: signed release manifest verification failed.' >&2; exit 1; }
python3 - "$workspace/manifest.json" "$workspace/release.env" <<'PYJSON'
import json, pathlib, re, sys, shlex
obj=json.loads(pathlib.Path(sys.argv[1]).read_text())
if (obj.get('schema'),obj.get('project'),obj.get('channel'),obj.get('architecture')) != (1,'ZTM — Zero to Monero','alpha','amd64'):
    raise SystemExit('Unsupported release manifest')
version=obj.get('version','')
asset=obj.get('asset','')
sha=obj.get('sha256','')
size=obj.get('bytes')
if not re.fullmatch(r'[0-9A-Za-z.-]{3,64}',version) or not re.fullmatch(r'downloads/ZTM-Zero-to-Monero_[0-9A-Za-z.~-]+_amd64\.deb',asset):
    raise SystemExit('Unsafe release version or path')
if not re.fullmatch(r'[0-9a-f]{64}',sha) or type(size)!=int or not (1000<size<150000000):
    raise SystemExit('Unsupported checksum or archive size')
p=pathlib.Path(sys.argv[2]);p.write_text('VERSION='+shlex.quote(version)+'\nASSET='+shlex.quote(asset)+'\nSHA='+shlex.quote(sha)+'\nSIZE='+str(size)+'\n')
PYJSON
# shellcheck disable=SC1090
. "$workspace/release.env"
printf '\n%s\n' "Latest signed ZTM alpha: $VERSION" "SHA256: $SHA" 'Will download the verified Ubuntu x86-64 .deb, then ask before changing system packages.'
if [[ "${1:-}" == '--plan' ]]; then echo 'Dry run: no .deb downloaded and nothing installed.'; exit 0; fi
if [[ "${1:-}" != '--verify-only' ]]; then
  read -r -p 'Download and install the verified ZTM application? [y/N] ' choice
  [[ "$choice" == y || "$choice" == Y ]] || { echo 'Cancelled; no packages installed.'; exit 0; }
fi
package="$workspace/ZTM.deb"
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --tlsv1.2 --retry 2 --connect-timeout 15 --max-time 180 --max-filesize 150000000 -o "$package" "$RAW/$ASSET"
[[ "$(stat -c %s "$package")" == "$SIZE" ]] || { echo 'SECURITY FAILURE: downloaded package size differs from signed manifest.' >&2; exit 1; }
printf '%s  %s\n' "$SHA" "$package" | sha256sum --status -c - || { echo 'SECURITY FAILURE: SHA256 mismatch. Nothing installed.' >&2; exit 1; }
[[ "$(dpkg-deb -f "$package" Package)" == 'ztm-zero-to-monero' && "$(dpkg-deb -f "$package" Architecture)" == 'amd64' ]] || { echo 'SECURITY FAILURE: unexpected Debian package metadata.' >&2; exit 1; }
if [[ "${1:-}" == '--verify-only' ]]; then
 echo 'SIGNED MANIFEST AND PACKAGE VERIFIED. No system changes made.'
 exit 0
fi
echo 'Package verified. Ubuntu may ask for your administrator password to install dependencies.'
sudo apt-get install -y "$package"
command -v ztm >/dev/null || { echo 'ZTM installation did not produce the expected application command.' >&2; exit 1; }
echo 'Starting ZTM. In its GUI click PREPARE LINUX + INSTALL XMRIG, then authorize the online benchmark.'
exec ztm

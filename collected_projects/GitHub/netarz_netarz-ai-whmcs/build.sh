#!/usr/bin/env bash
# Builds the release zip WHMCS owners upload: only modules/addons/netarz_ai, plus README and LICENSE.
set -euo pipefail

cd "$(dirname "$0")"
VERSION=$(grep -oE "VERSION = '[^']+'" modules/addons/netarz_ai/lib/Schema.php | cut -d"'" -f2)
OUT="build/netarz-ai-whmcs-${VERSION}.zip"

rm -rf build/stage && mkdir -p build/stage
cp -R modules build/stage/
cp README.md LICENSE CHANGELOG.md build/stage/
find build/stage -name '.DS_Store' -delete
(cd build/stage && zip -qr "../$(basename "$OUT")" .)
rm -rf build/stage
echo "$OUT"

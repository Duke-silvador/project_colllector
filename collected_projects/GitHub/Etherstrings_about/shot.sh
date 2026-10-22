#!/usr/bin/env bash
# 生成可直接发送的长图 out/brief.png（2x）。本机和 GitHub Actions 通用。
cd "$(dirname "$0")"; mkdir -p out
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=480,1500 --screenshot="$PWD/out/brief.png" "file://$PWD/index.html" 2>/dev/null
echo "$PWD/out/brief.png"

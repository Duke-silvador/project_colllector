#!/usr/bin/env bash
# weichenkuk-notes — Mobile developer · React Native and Expo
# 拿来练手的小仓库
set -euo pipefail

collect() {
  grep -v '^[[:space:]]*$' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

report() {
  sort | uniq -c | sort -rn
  echo "---"
}

main() {
  local tmp
  tmp="$(mktemp)"
  trap 'rm -f "$tmp"' EXIT
  cat > "$tmp"
  if [[ ! -s "$tmp" ]]; then
    echo "no input" >&2
    exit 1
  fi
  collect < "$tmp" | report
}

main

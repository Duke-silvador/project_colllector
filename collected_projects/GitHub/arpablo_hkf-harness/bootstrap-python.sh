#!/usr/bin/env bash
# Baut die venv des Harness, wenn sie fehlt oder veraltet ist.
#
# Der Harness bringt sein eigenes Python mit, statt zu nehmen, was gerade im
# PATH steht: Auf einer Maschine liegen leicht zwei Interpreter mit zwei
# PyYAML-Fassungen, und dann haengt das Ergebnis einer Pruefung daran, welcher
# zuerst gefunden wurde.
#
#     ./bootstrap-python.sh          baut, wenn noetig
#     ./bootstrap-python.sh --force  baut in jedem Fall neu
#
# Ort der venv: $HKF_VENV, sonst ~/.cache/hkf-harness/venv
set -euo pipefail

WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="${HKF_VENV:-$HOME/.cache/hkf-harness/venv}"
FASSUNG="$(tr -d '[:space:]' < "$WURZEL/.python-version")"
MARKE="$VENV/.hkf-stamp"
SOLL="$FASSUNG $(shasum -a 256 "$WURZEL/requirements.txt" | cut -d' ' -f1)"

if [ "${1:-}" != "--force" ] && [ -x "$VENV/bin/python" ] &&
   [ -f "$MARKE" ] && [ "$(cat "$MARKE")" = "$SOLL" ]; then
  exit 0
fi

command -v uv >/dev/null || {
  echo "uv fehlt. Installieren: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
}

# Zwei gleichzeitige Aufrufe duerfen nicht dieselbe venv bauen.
SPERRE="$VENV.lock"
mkdir -p "$(dirname "$VENV")"
if ! mkdir "$SPERRE" 2>/dev/null; then
  for _ in $(seq 1 60); do
    sleep 1
    [ -d "$SPERRE" ] || break
  done
  [ -x "$VENV/bin/python" ] && exit 0
  echo "Die Sperre $SPERRE liegt noch. Wenn kein Bau laeuft, entferne sie." >&2
  exit 1
fi
trap 'rmdir "$SPERRE" 2>/dev/null || true' EXIT

echo "hkf-harness: baue Python $FASSUNG unter $VENV" >&2
rm -rf "$VENV"
uv venv --python "$FASSUNG" "$VENV" >&2
VIRTUAL_ENV="$VENV" uv pip install --quiet --requirement "$WURZEL/requirements.txt" >&2
printf '%s' "$SOLL" > "$MARKE"

#!/bin/bash
# Run as admin, from the Raspberry checkout. Never prints or uploads private keys.
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
project_dir=$(pwd -P)
if [ "$project_dir" != /opt/pi_control ]; then
  echo 'Ejecuta este script desde el proyecto en /opt/pi_control.' >&2
  exit 1
fi
test -s ssh/id_ed25519 || { echo 'Falta /opt/pi_control/ssh/id_ed25519'; exit 1; }
test -s "$HOME/.ssh/known_hosts" || { echo 'Falta known_hosts del usuario actual'; exit 1; }
if [ -f .env ] && grep -q '^COMPOSE_FILE=' .env && ! grep -qxF 'COMPOSE_FILE=compose.yaml:compose.real.yaml' .env; then
  echo 'Ya existe otra configuración COMPOSE_FILE en .env. Revísala antes de continuar.' >&2
  exit 1
fi
known_tmp=$(mktemp)
trap 'rm -f -- "$known_tmp"' EXIT
hosts=$(python3 -c 'import json; from pathlib import Path; p=Path("config.real.json"); p=p if p.exists() else Path("config.example.json"); print(" ".join(s["lan_ip"] for s in json.loads(p.read_text(encoding="utf-8-sig"))["servers"]))')
for host in $hosts; do
  ssh-keygen -F "$host" -f "$HOME/.ssh/known_hosts" >> "$known_tmp" || {
    echo "Falta la identidad ya verificada de $host en known_hosts"; exit 1;
  }
done
sudo install -d -o 10001 -g 10001 -m 700 runtime-ssh data-real
sudo install -o 10001 -g 10001 -m 400 ssh/id_ed25519 runtime-ssh/id_ed25519
sudo install -o 10001 -g 10001 -m 400 "$known_tmp" runtime-ssh/known_hosts
python3 - <<'PY'
import json
from pathlib import Path
path = Path('config.real.json')
if not path.exists():
    config = json.loads(Path('config.example.json').read_text(encoding='utf-8-sig'))
    config['mode'] = 'real'
    config['ssh'] = {'identity_file':'/run/picontrol-ssh/id_ed25519', 'known_hosts_file':'/run/picontrol-ssh/known_hosts'}
    for server in config['servers']:
        server['actions_enabled'] = True
    path.write_text(json.dumps(config, indent=2) + '\n')
    path.chmod(0o644)
else:
    print('Se conserva config.real.json existente.')
PY
sudo docker compose -f compose.yaml -f compose.real.yaml config --quiet
sudo docker compose -f compose.yaml -f compose.real.yaml build
sudo docker compose -f compose.yaml -f compose.real.yaml run --rm --no-deps picontrol python control.py
if ! [ -f .env ] || ! grep -qxF 'COMPOSE_FILE=compose.yaml:compose.real.yaml' .env; then
  printf '\nCOMPOSE_FILE=compose.yaml:compose.real.yaml\n' >> .env
fi
sudo docker compose -f compose.yaml -f compose.real.yaml up -d --no-build
sudo docker compose -f compose.yaml -f compose.real.yaml ps
echo 'Control real iniciado. Recarga el panel. No se ha ordenado apagar ni reiniciar ningún equipo.'

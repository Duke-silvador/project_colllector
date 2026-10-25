#!/bin/bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
test "$(pwd -P)" = /opt/pi_control || { echo 'Usa /opt/pi_control en la Raspberry.'; exit 1; }
test -s config.real.json || { echo 'Falta config.real.json; no se modifica nada.'; exit 1; }
sudo test -s runtime-ssh/id_ed25519 || { echo 'Falta la clave del contenedor.'; exit 1; }
sudo test -s runtime-ssh/known_hosts || { echo 'Falta known_hosts del contenedor.'; exit 1; }
work_dir=$(mktemp -d "$PWD/.picontrol-add.XXXXXX")
trap 'rm -f -- "$work_dir/candidate.json" "$work_dir/known_hosts"; rmdir -- "$work_dir"' EXIT
chmod 755 "$work_dir"
python3 register_nas.py --prepare "$work_dir/candidate.json"
host=$(python3 -c 'import json; print(json.load(open("servers/nas-server.json"))["lan_ip"])')
ssh-keygen -F "$host" -f "$HOME/.ssh/known_hosts" > "$work_dir/known_hosts" || {
  echo "Primero verifica la conexión SSH a $host desde admin en la Raspberry."; exit 1;
}
# Preserve the already trusted identities of the other two servers.
sudo tee -a runtime-ssh/known_hosts < "$work_dir/known_hosts" >/dev/null
echo 'Comprobando solo el NAS desde Docker, sin apagar ni reiniciar...'
sudo docker compose -f compose.yaml -f compose.real.yaml run --rm --no-deps \
  -v "$work_dir/candidate.json:/app/config.example.json:ro" picontrol python control.py
python3 register_nas.py --apply
sudo docker compose -f compose.yaml -f compose.real.yaml up -d --no-build --force-recreate picontrol
sudo docker compose -f compose.yaml -f compose.real.yaml ps
echo 'NAS añadido. Recarga el panel. No se ejecutaron acciones de encendido, apagado ni reinicio.'

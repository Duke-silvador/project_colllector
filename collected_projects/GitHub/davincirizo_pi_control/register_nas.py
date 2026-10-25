"""Merge the NAS profile into local configuration without replacing other servers."""
import argparse
import copy
import json
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def merge(config, server):
    result = copy.deepcopy(config)
    if result.get('mode') != 'real':
        raise ValueError('Se requiere una configuración real existente.')
    for existing in result['servers']:
        if existing['id'] == server['id']:
            if existing != server:
                raise ValueError('El NAS ya existe con otra configuración; se conserva sin modificar.')
            return result
        if existing.get('lan_ip') == server['lan_ip'] or existing.get('mac_address', '').lower() == server['mac_address'].lower():
            raise ValueError('La IP o MAC ya pertenece a otro servidor; no se modifica nada.')
    result['servers'].append(copy.deepcopy(server))
    return result


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--prepare', type=Path)
    group.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    path = ROOT / 'config.real.json'
    config = json.loads(path.read_text(encoding='utf-8-sig'))
    server = json.loads((ROOT / 'servers' / 'nas-server.json').read_text())
    merged = merge(config, server)
    if args.prepare:
        candidate = dict(config, servers=[server])
        args.prepare.write_text(json.dumps(candidate, indent=2) + '\n')
        args.prepare.chmod(0o644)
        return
    if merged == config:
        print('El NAS ya está registrado; no se duplica ni se cambia la configuración.')
        return
    backup = path.with_name(path.name + '.bak-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    shutil.copy2(path, backup)
    # Write in place to preserve the configuration file's permissions and owner.
    path.write_text(json.dumps(merged, indent=2) + '\n')
    print(f'NAS añadido. Copia de seguridad: {backup.name}')


if __name__ == '__main__':
    main()

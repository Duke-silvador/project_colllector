

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import stat
import tempfile
import tomllib

ROOT = Path(__file__).resolve().parent
WORK_AGENT = ROOT.parent / 'agent' / 'work_agent'
SERVERS = {
    'client_a-jump': {'command': str(ROOT / '.venv/bin/python'), 'args': [str(ROOT / 'dbjump_mcp.py')],
                   'startup_timeout_sec': 30, 'tool_timeout_sec': 1830},
    'client_c-sql': {'command': '/opt/homebrew/bin/python3', 'args': [str(WORK_AGENT / 'client_c_sql_launch.py')],
                'startup_timeout_sec': 30, 'tool_timeout_sec': 660},
    'influx': {'command': '/opt/homebrew/bin/python3', 'args': [str(WORK_AGENT / 'influx_mcp_launch.py')],
               'startup_timeout_sec': 30, 'tool_timeout_sec': 180},
    'redmine': {'command': '/opt/homebrew/bin/python3', 'args': [str(WORK_AGENT / 'redmine_ro_launch.py')],
                'startup_timeout_sec': 30, 'tool_timeout_sec': 600},
}


def render(original):
    existing = tomllib.loads(original).get('mcp_servers', {})
    blocks, added = [], []
    for name, settings in SERVERS.items():
        if name in existing:
            actual = existing[name]
            if (any(actual.get(k) != v for k, v in settings.items()) or
                    actual.get('enabled') is False or actual.get('disabled_tools')):
                raise ValueError(f'{name}: уже есть другая настройка; автоматическая замена отменена')
            continue
        blocks.append('[mcp_servers.' + json.dumps(name) + ']\n' + '\n'.join(
            key + ' = ' + json.dumps(value, ensure_ascii=False) for key, value in settings.items()) + '\n')
        added.append(name)
    if not added:
        return original, added

    updated = original + '\n\n' + '\n'.join(blocks)
    parsed = tomllib.loads(updated)
    assert all(parsed['mcp_servers'][name] == SERVERS[name] for name in added)
    return updated, added


def install(path, apply=False):
    path = Path(path)
    if path.is_symlink():
        raise ValueError('config.toml является ссылкой; автоматическая запись отменена')
    for settings in SERVERS.values():
        for source in [settings['command'], *settings['args']]:
            if not Path(source).is_file():
                raise ValueError('Не найден файл запуска: ' + source)
    original = path.read_text() if path.exists() else ''
    updated, added = render(original)
    print('Конфиг:', path)
    print('Добавить:', ', '.join(added) if added else 'все четыре MCP уже зарегистрированы')
    if not apply or not added:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o600
    if path.exists():
        backup = path.with_name(path.name + '.backup-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
        fd = os.open(backup, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        with os.fdopen(fd, 'w') as output:
            output.write(original)
        print('Резервная копия:', backup)

    if (path.read_text() if path.exists() else '') != original:
        raise ValueError('Конфиг изменился во время проверки; запись отменена')
    with tempfile.NamedTemporaryFile(mode='w', dir=path.parent, prefix='.mcp-config-', delete=False) as output:
        output.write(updated)
        staged = Path(output.name)
    staged.chmod(mode)
    os.replace(staged, path)
    print('Готово. В настройках MCP Codex перезапусти подключение серверов.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='сохранить регистрацию с резервной копией')
    parser.add_argument('--config', type=Path,
                        default=Path(os.environ.get('CODEX_HOME') or str(Path.home() / '.codex')) / 'config.toml')
    args = parser.parse_args()
    install(args.config, args.apply)


if __name__ == '__main__':
    main()

"""Catálogo editable de tipos de transacción, sin caché."""
import json
import re
from pathlib import Path

PATH = Path(__file__).resolve().parent / 'config' / 'transaction_types.json'


def cargar_tipos_transaccion():
    items = [(item['code'], item['name']) for item in json.loads(PATH.read_text(encoding='utf-8'))]
    return [('ALL', 'Todas las transacciones')] + [item for item in items if item[0] != 'ALL']


def agregar_tipo_transaccion(name):
    name = str(name).strip()
    code = re.sub(r'\s+', '_', name.upper())
    if not re.fullmatch(r'[A-Z][A-Z0-9_]{0,49}', code):
        raise ValueError('Escribe un nombre de hasta 50 caracteres con letras, números y espacios.')
    items = cargar_tipos_transaccion()
    if any(existing == code for existing, _ in items):
        raise ValueError('Ese tipo de transacción ya existe.')
    items.append((code, name))
    temporary = PATH.with_suffix('.tmp')
    temporary.write_text(json.dumps([{'code': c, 'name': n} for c, n in items], ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(PATH)
    return code

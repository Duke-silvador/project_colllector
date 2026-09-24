"""Conserva libros conciliados localmente, identificados por su contenido importado."""
import hashlib
import json
import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent / 'resultados' / 'statements'


def carpeta_resultados():
    proyecto = Path(__file__).resolve().parent
    load_dotenv(proyecto / '.env')
    configurada = os.getenv('STATEMENT_RESULTS_DIR', '').strip()
    if not configurada:
        return ROOT
    carpeta = Path(configurada).expanduser()
    return carpeta if carpeta.is_absolute() else proyecto / carpeta


def ruta_resultado(snapshot, carrier):
    carrier_folder = re.sub(r'[^\w -]', '_', str(carrier)).strip(' .')
    if not carrier_folder:
        raise ValueError('Indica un carrier válido para guardar el resultado.')
    meses = {str(row.get('accounting_month') or '')[:7] for row in snapshot['rows']}
    if len(meses) != 1:
        raise ValueError('El resultado debe pertenecer a un único mes contable.')
    month = meses.pop()
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('El resultado requiere un mes contable válido: YYYY-MM.')
    rows = [{k: str(v) if v is not None else None for k, v in row.items()
             if k not in ('id', 'created_at')} for row in snapshot['rows']]
    payload = json.dumps({'export_version': 17, 'carrier': carrier, 'rows': rows,
                          'total': str(snapshot['grand_total'])}, sort_keys=True)
    return carpeta_resultados() / carrier_folder / month / (
        f'{carrier_folder}_{month}_' + hashlib.sha256(payload.encode()).hexdigest() + '.xlsx')


def guardar_resultado(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=path.parent, suffix='.tmp', delete=False) as target:
        temp = Path(target.name)
        target.write(data)
    try:
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)

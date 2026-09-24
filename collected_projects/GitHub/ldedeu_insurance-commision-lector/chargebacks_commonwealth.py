"""Asigna chargebacks por el código de productor indicado en su descripción."""
import re
from franquicias import _formatear_codigo_oficina


def _normalizar_codigo(valor):
    return re.sub(r'\s+', '', str(valor or '')).casefold()


def completar_chargebacks(connection, rows):
    pendientes = [r for r in rows if not r.get('policy_number') and r.get('transaction_type')]
    if not pendientes:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT code, franchise, is_master_code FROM staging_hub.franchises_carrier_codes WHERE UPPER(REPLACE(TRIM(carrier), ' ', ''))=%s",
                       ('COMMONWEALTH',))
        mapa = {}
        for entry in cursor.fetchall():
            codigo = _normalizar_codigo(entry.get('code'))
            numero = str(entry.get('franchise') or '').strip().upper()
            if entry.get('is_master_code'):
                numero = 'DT120'
            elif numero and not numero.upper().startswith('DT'):
                numero = _formatear_codigo_oficina(numero) or numero
            mapa.setdefault(codigo, set()).add(numero)
    finally:
        cursor.close()
    for row in pendientes:
        encontrado = re.search(r'\bfor\s+([a-z0-9_-]+)\b', str(row['transaction_type']), re.I)
        codigo = encontrado.group(1) if encontrado else ''
        normalizado = _normalizar_codigo(codigo)
        # En la descripción TX precede al código de productor real (tx12ia1 -> 12ia1); esas
        # iniciales no forman parte del código y no se usan para buscar en la tabla. Solo se
        # acepta una coincidencia EXACTA del resto; no se adivina la franquicia por un código
        # base con un sufijo numérico distinto, porque ese sufijo puede corresponder a una
        # sub-agencia con una franquicia distinta y necesitamos el código exacto para no
        # asignar mal.
        if re.match(r'^tx\d', normalizado):
            normalizado = normalizado[2:]
        franquicias = mapa.get(normalizado, set())
        row['producer_code'] = codigo
        row['franchise_number'] = next(iter(franquicias)) if len(franquicias) == 1 and '' not in franquicias else None
        row['commission_alert'] = None if row['franchise_number'] else (
            f'Chargeback: código {codigo or "no identificado"} sin franquicia única registrada para Commonwealth')

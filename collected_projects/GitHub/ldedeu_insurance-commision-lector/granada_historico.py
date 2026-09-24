"""Búsquedas alternativas por edición anterior y póliza contenida con asegurado."""
from collections import Counter
import re
import unicodedata
from franquicias import _formatear_codigo_oficina


def palabras_nombre(nombre):
    texto = unicodedata.normalize('NFKD', str(nombre or '').casefold())
    texto = ''.join(c for c in texto if not unicodedata.combining(c))
    return Counter(re.findall(r'[^\W_]+', texto, re.UNICODE))


def _franquicia_unica(registros, asegurado):
    nombre = palabras_nombre(asegurado)
    if not nombre:
        return None
    franquicias = set()
    for registro in registros:
        if palabras_nombre(registro.get('insured_name')) != nombre:
            continue
        numero = str(registro.get('franchise') or '').strip().upper()
        if numero and not numero.startswith('DT'):
            numero = _formatear_codigo_oficina(numero) or ''
        if numero and numero != 'DT120':
            franquicias.add(numero)
    return next(iter(franquicias)) if len(franquicias) == 1 else None


def buscar_alternativas(connection, numero, edition, asegurado):
    from granada import variantes_poliza_compass
    cursor = connection.cursor(dictionary=True)
    try:
        anterior = str(edition if edition is not None else '').strip()
        if anterior.isdigit() and int(anterior) > 0:
            variantes = variantes_poliza_compass(numero, str(int(anterior) - 1))
            cursor.execute(
                'SELECT policy_number, insured_name, franchise FROM staging_hub.historic_data_commissions'
                ' WHERE policy_number IN (' + ','.join(['%s'] * len(variantes)) + ')'
                ' ORDER BY report_month DESC, `date` DESC', tuple(variantes))
            registros = cursor.fetchall()
            coincidentes = [r for r in registros if palabras_nombre(asegurado)
                           and palabras_nombre(r.get('insured_name')) == palabras_nombre(asegurado)]
            if coincidentes:
                return _franquicia_unica(coincidentes, asegurado)
        limpia = ''.join(c for c in str(numero or '') if c.isalnum()).upper()
        if not limpia or not palabras_nombre(asegurado):
            return None
        cursor.execute(
            'SELECT policy_number, insured_name, franchise FROM staging_hub.historic_data_commissions'
            " WHERE LOCATE(%s, UPPER(REGEXP_REPLACE(policy_number, '[^[:alnum:]]', ''))) > 0"
            ' ORDER BY report_month DESC, `date` DESC', (limpia,))
        return _franquicia_unica(cursor.fetchall(), asegurado)
    finally:
        cursor.close()

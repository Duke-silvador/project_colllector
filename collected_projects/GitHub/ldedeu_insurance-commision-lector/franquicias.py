"""Codigo de franquicia por carrier y location, desde staging_hub.franchises_carrier_codes."""
import re

CODIGO_POR_DEFECTO = "DT120"


def cargar_codigos_master(connection):
    """Codigos master por carrier, company (franchise_name) y Agency Code."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT carrier, franchise_name, code FROM staging_hub.franchises_carrier_codes"
            " WHERE is_master_code = 1"
        )
        claves = {tuple(_normalizar(row[field]) for field in ('carrier', 'franchise_name', 'code'))
                  for row in cursor.fetchall()}
        return {clave for clave in claves if all(clave)}
    finally:
        cursor.close()


def _normalizar(texto):
    return re.sub(r"\s+", "", str(texto or "")).upper()


def cargar_mapa_franquicias(connection):
    """Devuelve {(carrier_normalizado, location_normalizado): codigo_franquicia}.

    Si una combinacion de carrier y franchise_name tiene mas de un codigo
    distinto en la tabla, se omite del mapa: es ambigua y buscar_franquicia()
    la trata igual que si no hubiera ninguna coincidencia (usa el codigo por
    defecto).
    """
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT carrier, franchise_name, franchise FROM staging_hub.franchises_carrier_codes"
            " WHERE franchise IS NOT NULL AND franchise_name IS NOT NULL"
        )
        codigos_por_clave = {}
        for row in cursor.fetchall():
            clave = (_normalizar(row["carrier"]), _normalizar(row["franchise_name"]))
            codigos_por_clave.setdefault(clave, set()).add(row["franchise"])
        return {clave: codigos.pop() for clave, codigos in codigos_por_clave.items() if len(codigos) == 1}
    finally:
        cursor.close()


def buscar_franquicia(mapa, carrier, location_name):
    """Codigo de franquicia para ese carrier y location, o CODIGO_POR_DEFECTO
    si falta el location, no hay coincidencia, o la combinacion es ambigua."""
    if not location_name:
        return CODIGO_POR_DEFECTO
    clave = (_normalizar(carrier), _normalizar(location_name))
    return mapa.get(clave, CODIGO_POR_DEFECTO)


def _formatear_codigo_oficina(office_number):
    """'82' -> 'DTF0082'; None o un valor no numerico devuelve None."""
    try:
        numero = int(str(office_number).strip())
    except (TypeError, ValueError):
        return None
    if numero < 0:
        return None
    return f"DTF{numero:04d}"


def buscar_franquicia_historica(connection, policy_number):
    """Franquicia mas reciente de la poliza, incluso bajo otro carrier."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            'SELECT franchise FROM staging_hub.historic_data_commissions'
            " WHERE policy_number=%s AND NULLIF(TRIM(franchise), '') IS NOT NULL"
            ' ORDER BY report_month DESC, date DESC LIMIT 1',
            (policy_number.strip(),))
        row = cursor.fetchone()
        return str(row['franchise']).strip() if row else None
    finally:
        cursor.close()


def resolver_franquicia(mapa, carrier, location_name, policy_number, buscar_office_id=None,
                        mapa_oficinas=None, producer_code=None, codigos_master=None, *, buscar_historico=None):
    """Compass, historico y luego DT120 para un codigo master confirmado.

    codigos_master contiene tuplas normalizadas (carrier, company, code).
    Un fallo de consulta o una oficina sin traduccion no prueba ausencia.
    """
    if buscar_office_id is None or not policy_number:
        return None
    office_id = buscar_office_id(policy_number)
    if office_id:
        return _formatear_codigo_oficina((mapa_oficinas or {}).get(office_id))
    if buscar_historico is not None:
        franchise = buscar_historico(policy_number)
        if franchise:
            return franchise
    clave = (_normalizar(carrier), _normalizar(location_name), _normalizar(producer_code))
    if clave[0] in ('FLORIDAPENINSULA', 'EDISON', 'EDISION', 'OVATION', 'OVATIONHOME'):
        code = re.sub(r'_(FPI|EDI|OVH)$', '', clave[2]).lstrip('0') or '0'
        if any(c == 'FLORIDAPENINSULA' and str(k).lstrip('0') == code for c, _, k in (codigos_master or set())):
            return CODIGO_POR_DEFECTO
        return None
    if all(clave) and clave in (codigos_master or set()):
        return CODIGO_POR_DEFECTO
    return None

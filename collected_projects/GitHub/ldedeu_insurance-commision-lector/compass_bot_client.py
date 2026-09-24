"""Cliente HTTP del proyecto independiente compass-policy-bot."""
import os
import re
import requests


def obtener_tipos_lote(policies):
    """Una llamada HTTP = un login y un Chrome abierto hasta terminar el reporte."""
    if not policies:
        return []
    base = os.getenv('COMPASS_BOT_URL', '').strip().rstrip('/')
    key = os.getenv('COMPASS_BOT_API_KEY', '').strip()
    if not base or not key:
        raise ValueError('Configura COMPASS_BOT_URL y COMPASS_BOT_API_KEY para generar el Excel.')
    try:
        response = requests.post(base + '/v1/policies/transaction-types', json={'policies': policies},
                                 headers={'Authorization': f'Bearer {key}'}, timeout=(5, 180 + 90 * len(policies)))
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError):
        raise ValueError('No se pudo consultar el lote en Compass Bot; no se genero el Excel.') from None
    results = payload.get('policies') if isinstance(payload, dict) else None
    if not isinstance(results, list) or len(results) != len(policies):
        raise ValueError('Compass Bot devolvio un lote incompleto.')
    expected = {p['request_id']: p for p in policies}
    seen = set()
    for row in results:
        if not isinstance(row, dict) or row.get('request_id') not in expected or row['request_id'] in seen:
            raise ValueError('Compass Bot devolvio identidades duplicadas o inesperadas.')
        source = expected[row['request_id']]
        if any(row.get(k) != source.get(k) for k in ('policy_number', 'office_number', 'office_id')):
            raise ValueError('Compass Bot devolvio otra poliza u oficina.')
        if not row.get('error') or row.get('error') == 'carrier_mismatch':
            # carrier_mismatch trae el tipo igual: la poliza existe con ese numero
            # pero con otro carrier en Compass, se marca para revisar en vez de descartarla.
            if row.get('transaction_type') not in ('NEW_BUSINESS', 'RENEWAL') or not row.get('policy_id'):
                raise ValueError('Compass Bot devolvio un tipo o ID invalido.')
            if source.get('policy_id') and row['policy_id'] != source['policy_id']:
                raise ValueError('Compass Bot devolvio otro ID de poliza.')
        elif row.get('transaction_type') is not None:
            raise ValueError('Compass Bot devolvio un tipo junto con un error.')
        seen.add(row['request_id'])
    return results


def buscar_franquicias_por_nombre(clientes):
    """Busqueda visual en Company Search por nombre de cliente (sin numero de poliza), para
    cuando la poliza no aparece por numero ni en Compass ni en el historico. Una llamada
    HTTP = un login y un Chrome abierto hasta terminar el lote."""
    if not clientes:
        return []
    base = os.getenv('COMPASS_BOT_URL', '').strip().rstrip('/')
    key = os.getenv('COMPASS_BOT_API_KEY', '').strip()
    if not base or not key:
        raise ValueError('Configura COMPASS_BOT_URL y COMPASS_BOT_API_KEY para buscar por nombre en Compass.')
    try:
        response = requests.post(base + '/v1/clients/company-search', json={'clients': clientes},
                                 headers={'Authorization': f'Bearer {key}'}, timeout=(5, 180 + 90 * len(clientes)))
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError):
        raise ValueError('No se pudo consultar Company Search en Compass Bot.') from None
    results = payload.get('clients') if isinstance(payload, dict) else None
    if not isinstance(results, list) or len(results) != len(clientes):
        raise ValueError('Compass Bot devolvio un lote incompleto de Company Search.')
    expected = {c['request_id']: c for c in clientes}
    seen = set()
    for row in results:
        if not isinstance(row, dict) or row.get('request_id') not in expected or row['request_id'] in seen:
            raise ValueError('Compass Bot devolvio identidades duplicadas o inesperadas en Company Search.')
        if not row.get('error') and not isinstance(row.get('offices'), list):
            raise ValueError('Compass Bot devolvio una respuesta invalida de Company Search.')
        seen.add(row['request_id'])
    return results


def obtener_transaction_type(policy_number, office_number, effective_date):
    base = os.getenv('COMPASS_BOT_URL', '').strip().rstrip('/')
    key = os.getenv('COMPASS_BOT_API_KEY', '').strip()
    policy_number = str(policy_number)
    if not base or not key:
        raise ValueError('Configura COMPASS_BOT_URL y COMPASS_BOT_API_KEY.')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', policy_number):
        raise ValueError('El numero de poliza para Compass Bot no es valido.')
    try:
        response = requests.get(f'{base}/v1/policies/{policy_number}/transaction-type',
                                params={'office_number': str(office_number), 'effective_date': str(effective_date)},
                                headers={'Authorization': f'Bearer {key}'}, timeout=(5, 75))
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError):
        raise ValueError('No se pudo obtener el tipo desde Compass Bot. Revisa su sesion y configuracion.') from None
    if not isinstance(result, dict) or result.get('policy_number') != policy_number or result.get('transaction_type') not in ('NEW_BUSINESS', 'RENEWAL'):
        raise ValueError('Compass Bot devolvio un numero de poliza o tipo de transaccion inesperado.')
    return result['transaction_type']

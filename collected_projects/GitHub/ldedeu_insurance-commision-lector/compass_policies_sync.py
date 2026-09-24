"""Sincroniza staging_hub.compass_policies desde Compass Policy Bot, oficina por oficina.

No llama a Compass en vivo durante la importacion: este script se corre aparte
(cuando quieras refrescar el cache), y completar_estados_compass despues solo
lee esta tabla. El bot nunca toca MySQL; este script es quien lo hace.
"""
import os
import sys

import requests

from database import conectar

CAMPOS = ('insured_name', 'status', 'transaction_type', 'line_of_business')


def obtener_polizas_oficina(office_number):
    base = os.getenv('COMPASS_BOT_URL', '').strip().rstrip('/')
    key = os.getenv('COMPASS_BOT_API_KEY', '').strip()
    if not base or not key:
        raise ValueError('Configura COMPASS_BOT_URL y COMPASS_BOT_API_KEY.')
    response = requests.get(f'{base}/v1/offices/{office_number}/policies',
                            headers={'Authorization': f'Bearer {key}'}, timeout=(5, 600))
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, dict) or not isinstance(payload.get('policies'), list):
        raise ValueError('Compass Bot devolvio una respuesta inesperada al listar polizas.')
    return payload['policies']


def sincronizar_oficina(connection, office_number):
    polizas = obtener_polizas_oficina(office_number)
    cursor = connection.cursor()
    try:
        nuevas = actualizadas = sin_cambios = 0
        for poliza in polizas:
            numero = str(poliza.get('policy_number') or '').strip()
            if not numero:
                continue
            fecha = poliza.get('effective_date')
            valores = tuple(poliza.get(campo) for campo in CAMPOS)
            cursor.execute(
                'SELECT ' + ', '.join(CAMPOS) + ' FROM staging_hub.compass_policies'
                ' WHERE office_number=%s AND policy_number=%s AND effective_date <=> %s FOR UPDATE',
                (office_number, numero, fecha))
            existente = cursor.fetchone()
            if existente is None:
                cursor.execute(
                    'INSERT INTO staging_hub.compass_policies'
                    ' (office_number, policy_number, effective_date, ' + ', '.join(CAMPOS) + ')'
                    ' VALUES (%s, %s, %s, %s, %s, %s, %s)',
                    (office_number, numero, fecha, *valores))
                nuevas += 1
            elif tuple(existente) == valores:
                sin_cambios += 1
            else:
                cursor.execute(
                    'UPDATE staging_hub.compass_policies SET ' + ', '.join(f'{campo}=%s' for campo in CAMPOS) +
                    ' WHERE office_number=%s AND policy_number=%s AND effective_date <=> %s',
                    (*valores, office_number, numero, fecha))
                actualizadas += 1
        connection.commit()
        return {'oficina': office_number, 'total': len(polizas), 'nuevas': nuevas,
                'actualizadas': actualizadas, 'sin_cambios': sin_cambios}
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def sincronizar_oficinas(office_numbers):
    connection = conectar()
    try:
        return [sincronizar_oficina(connection, str(numero).strip()) for numero in office_numbers]
    finally:
        connection.close()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Uso: python compass_policies_sync.py <office_number> [office_number ...]')
    for resultado in sincronizar_oficinas(sys.argv[1:]):
        print(resultado)

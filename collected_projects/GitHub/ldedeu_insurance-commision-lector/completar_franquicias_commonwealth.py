"""Completa franquicias vacias existentes, consultando Compass antes de escribir."""
from collections import Counter
import compass
from database import conectar
from franquicias import cargar_codigos_master, resolver_franquicia, buscar_franquicia_historica
from oficinas import cargar_mapa_office_numbers


def completar():
    connection = conectar()
    try:
        oficinas = cargar_mapa_office_numbers(connection)
        masters = cargar_codigos_master(connection)
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT id, policy_number, producer_name, producer_code FROM staging_hub.st_commonwealth_raw"
                       " WHERE COALESCE(franchise_number, '') = '' AND COALESCE(policy_number, '') <> ''")
        rows = cursor.fetchall()
        cursor.close()
    finally:
        connection.close()
    token = compass.obtener_token() if rows else None
    history_connection = conectar() if rows else None
    history_cache = {}
    def consultar_historico(numero):
        if numero not in history_cache:
            history_cache[numero] = buscar_franquicia_historica(history_connection, numero)
        return history_cache[numero]
    try:
        updates = resolver_pendientes(rows, token, oficinas, masters, consultar_historico)
    finally:
        if history_connection is not None:
            history_connection.close()
    # No se escriben resultados parciales si falla alguna consulta de Compass.
    connection = conectar()
    try:
        cursor = connection.cursor()
        changed = 0
        for values in updates:
            cursor.execute("UPDATE staging_hub.st_commonwealth_raw SET franchise_number=%s"
                           " WHERE id=%s AND policy_number=%s AND producer_name <=> %s AND producer_code <=> %s"
                           " AND COALESCE(franchise_number, '') = ''", values)
            changed += cursor.rowcount
        connection.commit()
        cursor.close()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
    return {'revisados': len(rows), 'actualizados': changed, 'sin_resolver': len(rows) - len(updates),
            'franquicias_resueltas': dict(Counter(value[0] for value in updates))}


def resolver_pendientes(rows, token, oficinas, masters, consultar_historico):
    cache = {}
    updates = []
    for row in rows:
        numero = row['policy_number'].strip()
        if not numero:
            continue
        if numero not in cache:
            cache[numero] = compass.buscar_poliza(token, numero)
        poliza = cache[numero]
        franchise = resolver_franquicia({}, 'COMMONWEALTH', row['producer_name'], numero,
            lambda _: poliza.get('office_id') if poliza else None, oficinas, row['producer_code'], masters,
            buscar_historico=consultar_historico if poliza is None else None)
        if franchise:
            updates.append((franchise, row['id'], row['policy_number'], row['producer_name'], row['producer_code']))
    return updates


if __name__ == '__main__':
    print(completar())

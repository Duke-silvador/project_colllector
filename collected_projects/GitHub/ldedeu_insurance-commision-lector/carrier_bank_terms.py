"""Texto a buscar en Description del statement del banco, por carrier.

Editable desde la pantalla de configuracion en vez de quedar fijo en el codigo.
Se busca SIEMPRE por el propio nombre del carrier; los terminos guardados aqui se
agregan como variantes adicionales (no lo reemplazan), para cuando una parte de
sus transacciones aparece con otro texto en el banco (comportamiento de
buscar_transacciones en conciliacion.py).
"""


def cargar_terminos_busqueda(connection):
    """{carrier: [search_term, ...]} para todos los carriers con terminos guardados."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT carrier, search_term FROM staging_hub.carrier_bank_search_terms ORDER BY carrier, search_term')
        terminos = {}
        for row in cursor.fetchall():
            terminos.setdefault(row['carrier'], []).append(row['search_term'])
        return terminos
    finally:
        cursor.close()


def listar_terminos(connection, carrier=None):
    cursor = connection.cursor(dictionary=True)
    try:
        if carrier:
            cursor.execute('SELECT id, carrier, search_term, updated_by, created_at FROM staging_hub.carrier_bank_search_terms'
                           ' WHERE carrier=%s ORDER BY search_term', (carrier,))
        else:
            cursor.execute('SELECT id, carrier, search_term, updated_by, created_at FROM staging_hub.carrier_bank_search_terms'
                           ' ORDER BY carrier, search_term')
        return cursor.fetchall()
    finally:
        cursor.close()


def agregar_termino(connection, carrier, search_term, changed_by):
    carrier = str(carrier or '').strip()
    search_term = str(search_term or '').strip()
    changed_by = str(changed_by or '').strip()
    if not carrier:
        raise ValueError('Selecciona el carrier.')
    if not search_term:
        raise ValueError('Escribe el texto a buscar en Description.')
    if not changed_by:
        raise ValueError('Indica quién agrega el término.')
    cursor = connection.cursor()
    try:
        cursor.execute('SELECT id FROM staging_hub.carrier_bank_search_terms WHERE carrier=%s AND search_term=%s',
                       (carrier, search_term))
        if cursor.fetchone():
            raise ValueError('Ese término ya existe para este carrier.')
        cursor.execute('INSERT INTO staging_hub.carrier_bank_search_terms (carrier, search_term, updated_by) VALUES (%s,%s,%s)',
                       (carrier, search_term, changed_by))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def eliminar_termino(connection, term_id):
    cursor = connection.cursor()
    try:
        cursor.execute('DELETE FROM staging_hub.carrier_bank_search_terms WHERE id=%s', (term_id,))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()

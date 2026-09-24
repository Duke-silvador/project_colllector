"""Extraccion local y validacion explicita de statements CRC GROUP.

A diferencia de BASS, el statement y su cheque llegan juntos en la misma pagina del PDF
(la tabla de facturas arriba, el cheque abajo) - no hay que emparejar paginas de statement
con paginas de pago por separado. La franquicia se busca por VENDOR NAME (no hay codigo de
agencia en este carrier), con el mismo respaldo Compass/historico/codigo-observado que ya
se uso en ASSURANCE.
"""
import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from threading import Lock

import compass
from requests import RequestException
from mysql.connector import Error as MySQLError

from database import conectar
from importacion import nombres_archivo, calcular_file_id
from franquicias import _formatear_codigo_oficina, buscar_franquicia_historica
from reparto_comisiones import calcular_comisiones_raw
from bass import ocr_paginas, importe, fecha

OCR_LOCK = Lock()
FIELDS = ('invoice_number', 'invoice_type', 'invoice_date', 'policy_number', 'effective_date',
          'insured_name', 'gross_premium', 'comm_percent', 'gross_commission', 'commission_amount')
COLUMN_LABELS = (
    ('invoice_number', ('invoice', 'number')),
    ('invoice_type', ('invoice', 'type')),
    ('invoice_date', ('invoice', 'date')),
    ('policy_number', ('policy', 'number')),
    ('effective_date', ('effective', 'date')),
    ('insured_name', ('insured', 'name')),
    ('gross_premium', ('premium',)),
    ('comm_percent', ('agent', 'comm')),
    ('gross_commission', ('gross', 'comm')),
    ('commission_amount', ('amount', 'paid')),
)


def _normalizar_palabra(texto):
    return re.sub(r'[^a-z]', '', str(texto or '').casefold())


def _agrupar_por_x(bloques, tolerancia=0.03):
    grupos = []
    for b in sorted(bloques, key=lambda b: b['x']):
        if grupos and b['x'] - grupos[-1][-1]['x'] < tolerancia:
            grupos[-1].append(b)
        else:
            grupos.append([b])
    return grupos


def extraer_cabecera_pagina(blocks):
    """DATE/VENDOR NAME/CRC ID vienen como un solo bloque 'Etiqueta: valor'."""
    texto_completo = '\n'.join(b['text'] for b in blocks)
    resultado = {'statement_date': '', 'vendor_name': '', 'crc_id': ''}
    m = re.search(r'DATE:\s*([\d/]+)', texto_completo, re.I)
    if m:
        resultado['statement_date'] = m.group(1).strip()
    m = re.search(r'VENDOR NAME:\s*(.+)', texto_completo, re.I)
    if m:
        resultado['vendor_name'] = m.group(1).strip()
    m = re.search(r'CRC ID:\s*([^\s]+)', texto_completo, re.I)
    if m:
        resultado['crc_id'] = m.group(1).strip()
    # El cheque: etiqueta y valor son bloques separados, mas abajo que la tabla de facturas
    # (donde "Date"/"Amount" tambien aparecen como parte de los encabezados de columna).
    zona_cheque = [b for b in blocks if b['y'] > .5]
    for key, label in (('check_number', 'checkno'), ('check_date', 'date'), ('check_amount', 'amount')):
        candidatos = [b for b in zona_cheque if _normalizar_palabra(b['text']) == label]
        if not candidatos:
            continue
        etiqueta = candidatos[0]
        valores = [b for b in zona_cheque if b is not etiqueta and -.03 <= b['y'] - etiqueta['y'] < .1
                   and abs(b['x'] - etiqueta['x']) < .15]
        if valores:
            resultado[key] = min(valores, key=lambda b: abs(b['y'] - etiqueta['y']))['text'].strip().lstrip('*').strip()
    return resultado


def extraer_tabla_pagina(blocks, *, detalles=False):
    """Tabla de facturas de la pagina: headers y filas identificadas por posicion X,
    igual idea que BASS pero sin correccion de inclinacion (la tabla no viene sesgada)."""
    candidatos_header = [b for b in blocks if _normalizar_palabra(b['text']) in
                         {'invoice', 'number', 'type', 'date', 'policy', 'effective', 'insured',
                          'name', 'premium', 'agent', 'comm', 'gross', 'amount', 'paid'}
                         and b['y'] < .25 and len(b['text'].strip()) <= 12]
    if not candidatos_header:
        return []
    grupos = _agrupar_por_x(candidatos_header)
    headers = {}
    for grupo in grupos:
        texto = ' '.join(_normalizar_palabra(b['text']) for b in sorted(grupo, key=lambda b: b['y']))
        centro_x = sum(b['x'] for b in grupo) / len(grupo)
        centro_y = max(b['y'] + b['height'] / 2 for b in grupo)
        for campo, palabras in COLUMN_LABELS:
            if texto == ' '.join(palabras):
                headers[campo] = {'x': centro_x, 'y': centro_y}
                break
    if len(headers) != len(FIELDS):
        return []
    ordered = sorted(headers.items(), key=lambda pair: pair[1]['x'])
    boundaries = [(ordered[i][1]['x'] + ordered[i + 1][1]['x']) / 2 for i in range(len(ordered) - 1)]
    # Pequeno margen: la altura estimada de un encabezado individual puede solaparse
    # con el inicio real de la primera fila de datos.
    top = max(h['y'] for h in headers.values()) - .004
    # La tabla termina en la fila TOTAL; despues viene el cheque, que no es parte de la tabla.
    totales = [b for b in blocks if _normalizar_palabra(b['text']) == 'total' and b['y'] > top]
    limite_inferior = min((b['y'] for b in totales), default=top + .45)
    grupos_fila = []
    for b in sorted((b for b in blocks if top < b['y'] < limite_inferior), key=lambda b: b['y']):
        if grupos_fila and abs(grupos_fila[-1][-1]['y'] - b['y']) < .02:
            grupos_fila[-1].append(b)
        else:
            grupos_fila.append([b])
    filas = []
    for grupo in grupos_fila:
        columnas = {campo: [] for campo in FIELDS}
        for b in grupo:
            columna = sum(b['x'] > limite for limite in boundaries)
            columnas[ordered[columna][0]].append(b)
        # Una celda con texto envuelto en varias lineas (ej. un asegurado largo) debe leerse
        # de arriba a abajo, no por posicion horizontal dentro de la fila.
        fila = {campo: ' '.join(b['text'] for b in sorted(bloques, key=lambda b: b['y'])).strip()
                for campo, bloques in columnas.items()}
        confianza = {campo: min((b.get('confidence', 0) for b in bloques), default=1)
                     for campo, bloques in columnas.items() if bloques}
        # Filas que no corresponden a una factura real (linea de TOTAL, o vacias).
        if fila['invoice_number'] and not _normalizar_palabra(fila['invoice_number']).startswith('total'):
            filas.append({'values': fila, 'confidence': confianza} if detalles else fila)
        elif not any(fila.values()):
            continue
    return filas


def alertas_lectura(row, original=None, threshold=.95):
    """Igual patron que BASS: campos invalidos y lecturas de baja confianza sin corregir."""
    alerts = {}
    for field in FIELDS:
        value = str(row.get(field) or '').strip()
        if not value:
            alerts[field] = 'missing'
            continue
        try:
            if field in ('invoice_date', 'effective_date'):
                fecha(value)
            elif field in ('gross_premium', 'gross_commission', 'commission_amount'):
                importe(value)
            elif field == 'comm_percent':
                rate = Decimal(value)
                if not rate.is_finite() or not 0 <= rate <= 100:
                    raise ValueError
        except (ValueError, InvalidOperation):
            alerts[field] = 'invalid'
            continue
        if original and value == str(original['values'].get(field) or '').strip():
            score = original['confidence'].get(field)
            if score is not None and score < threshold:
                alerts[field] = f'{score:.0%}'
    return alerts


def validar(rows, cabecera, month):
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Mes contable invalido; usa YYYY-MM.')
    if not str(cabecera.get('vendor_name') or '').strip():
        raise ValueError('Falta el Vendor Name de la pagina.')
    if not str(cabecera.get('check_number') or '').strip():
        raise ValueError('Revisa el numero de cheque.')
    fecha(cabecera['check_date'])
    total = importe(cabecera['check_amount'])
    if not rows:
        raise ValueError('Anade las filas de la tabla antes de importar.')
    for i, row in enumerate(rows, 1):
        for field in ('policy_number', 'insured_name', 'invoice_number'):
            if not str(row.get(field) or '').strip():
                raise ValueError(f'Fila {i}: falta {field}.')
        fecha(row['effective_date'])
        importe(row['gross_premium'])
        importe(row['commission_amount'])
        try:
            rate = Decimal(str(row['comm_percent']))
            if not rate.is_finite() or rate < 0 or rate > 100:
                raise InvalidOperation
        except InvalidOperation:
            raise ValueError(f'Fila {i}: porcentaje invalido; escribe 10 para 10%.') from None
    if sum((importe(r['commission_amount']) for r in rows), Decimal(0)) != total:
        raise ValueError('La suma de Amount Paid no coincide con el cheque de esta pagina; revisa las filas.')
    return total


def guardar(rows, cabecera, month, file_name, contenido, source_page, original_ocr):
    """Igual patron que BASS/ASSURANCE: reintento identico no duplica, una fila corregida
    se actualiza en vez de bloquear toda la pagina. file_id se calcula del CONTENIDO del
    archivo (no del nombre): el mismo statement subido con otro nombre se reconoce igual
    como ya importado, en vez de duplicarse."""
    validar(rows, cabecera, month)
    nombres_archivo(file_name)  # valida que el nombre sea utilizable
    file_id = calcular_file_id(contenido)
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        cursor.execute("SELECT GET_LOCK('staging_hub.st_crc_group_raw.import',10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importacion de CRC GROUP en curso.')
        accounting = datetime.strptime(month, '%Y-%m').date()
        payloads = [json.dumps({'reviewed': row, 'cabecera': cabecera, 'original_ocr': original_ocr},
                               ensure_ascii=False, sort_keys=True) for row in rows]
        cursor.execute('SELECT id, source_row, source_data FROM staging_hub.st_crc_group_raw'
                       ' WHERE file_id=%s AND accounting_month=%s AND source_page=%s FOR UPDATE',
                       (file_id, accounting, source_page))
        existentes = {r['source_row']: r for r in cursor.fetchall()}
        for numero in existentes:
            if not 1 <= numero <= len(rows):
                raise ValueError('Esta pagina tiene menos filas que la version ya guardada; no se elimino nada.')

        def sin_cambios(numero):
            previo = existentes.get(numero)
            if previo is None:
                return False
            guardado = json.loads(previo['source_data']) if isinstance(previo['source_data'], str) else previo['source_data']
            return guardado == json.loads(payloads[numero - 1])

        pendientes = []
        for numero, row in enumerate(rows, 1):
            row['vendor_name'] = cabecera['vendor_name']
            if not sin_cambios(numero):
                pendientes.append(row)
        completar_franquicias(connection, pendientes)

        inserted = updated = 0
        for numero, row in enumerate(rows, 1):
            if sin_cambios(numero):
                continue
            previo = existentes.get(numero)
            valores = (
                cabecera['vendor_name'], cabecera.get('crc_id') or None, row['invoice_number'],
                row['invoice_type'] or None, fecha(row['invoice_date']), row['policy_number'],
                fecha(row['effective_date']), row['insured_name'], importe(row['gross_premium']),
                (Decimal(str(row['comm_percent'])) / 100).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP),
                importe(row['gross_commission']), importe(row['commission_amount']),
                cabecera['check_number'], fecha(cabecera['check_date']), importe(cabecera['check_amount']),
                row.get('franchise_number'), row.get('franchise_number_source'), row.get('office_id'),
                row.get('state'), row.get('compass_policy_id'), row.get('policy_status'),
                payloads[numero - 1],
            )
            if previo is not None:
                cursor.execute(
                    'UPDATE staging_hub.st_crc_group_raw SET vendor_name=%s, crc_id=%s, invoice_number=%s,'
                    ' invoice_type=%s, invoice_date=%s, policy_number=%s, effective_date=%s, insured_name=%s,'
                    ' gross_premium=%s, comm_percent=%s, gross_commission=%s, commission_amount=%s,'
                    ' check_number=%s, check_date=%s, check_amount=%s, franchise_number=%s,'
                    ' franchise_number_source=%s, office_id=%s, state=%s, compass_policy_id=%s, policy_status=%s,'
                    ' source_data=%s WHERE id=%s',
                    valores + (previo['id'],))
                updated += 1
            else:
                cursor.execute(
                    'INSERT INTO staging_hub.st_crc_group_raw (vendor_name, crc_id, invoice_number, invoice_type,'
                    ' invoice_date, policy_number, effective_date, insured_name, gross_premium, comm_percent,'
                    ' gross_commission, commission_amount, check_number, check_date, check_amount,'
                    ' franchise_number, franchise_number_source, office_id, state, compass_policy_id, policy_status,'
                    ' source_data, file_id, file_name, accounting_month, source_page, source_row) VALUES ('
                    + ','.join(['%s'] * 27) + ')',
                    valores + (file_id, file_name, accounting, source_page, numero))
                inserted += 1
        connection.commit()
        return inserted, updated
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_crc_group_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()


def _normalizar_vendor(nombre):
    return re.sub(r'\s+', ' ', str(nombre or '').strip()).upper()


def _normalizar_nombre_oficina(nombre):
    """Solo letras y numeros para comparar 'SAMY INSURANCE, INC' con 'Samy Insurance Inc.'
    sin que la puntuacion o mayusculas impidan el match."""
    return re.sub(r'[^A-Z0-9]', '', str(nombre or '').upper())


def _codigo_alias(office):
    alias = str(office.get('franchise_alias') or '').strip()
    return 'DTF' + alias.zfill(4) if alias else None


def _coincide_oficina(office, franquicia):
    if not franquicia:
        return False
    return (_formatear_codigo_oficina(office.get('office_number')) == franquicia
            or _codigo_alias(office) == franquicia)


def _franquicias_vistas(connection, rows, vendor_name):
    vistas = {str(r.get('franchise_number') or '').strip().upper()
              for r in rows
              if _normalizar_vendor(r.get('vendor_name')) == _normalizar_vendor(vendor_name) and r.get('franchise_number')}
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT DISTINCT franchise_number FROM staging_hub.st_crc_group_raw'
                       ' WHERE UPPER(vendor_name)=UPPER(%s) AND franchise_number IS NOT NULL', (vendor_name,))
        vistas |= {str(r['franchise_number']).strip().upper() for r in cursor.fetchall()}
    finally:
        cursor.close()
    vistas.discard('')
    return vistas


def completar_franquicias(connection, rows):
    """Vendor Name -> office_name en la tabla de oficinas (coincidencia exacta, normalizada).
    Si no coincide con ninguna oficina, se intenta por la poliza en Compass, luego historico,
    y por ultimo si ese mismo Vendor Name ya dio una franquicia unica en otras filas, se usa esa."""
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT office_id, office_number, state, franchise_alias, office_name FROM staging_hub.offices')
        offices = cursor.fetchall()
    finally:
        cursor.close()
    oficinas_por_nombre = {}
    for office in offices:
        clave = _normalizar_nombre_oficina(office.get('office_name'))
        if clave:
            oficinas_por_nombre.setdefault(clave, []).append(office)

    def intentar_observado(row, mensaje_no_encontrado):
        vistas = _franquicias_vistas(connection, rows, row['vendor_name'])
        if len(vistas) == 1:
            franquicia_previa = next(iter(vistas))
            office = next((o for o in offices if _coincide_oficina(o, franquicia_previa)), None)
            row.update(franchise_number=franquicia_previa, franchise_number_source='codigo_observado',
                       office_id=str(office['office_id']) if office else None,
                       state=office.get('state') if office else None, code_lookup_alert=None)
        elif len(vistas) > 1:
            row['code_lookup_alert'] = (f'{row["vendor_name"]}: aparece con franquicias distintas en otras filas '
                                        f'({", ".join(sorted(vistas))}); revisa el vendor')
        else:
            row['code_lookup_alert'] = mensaje_no_encontrado

    token = {'valor': None}
    polizas = {}

    def consultar_poliza(numero):
        """Consulta Compass y cachea el resultado; nunca lanza (una falla de red/credenciales
        no debe romper la resolucion por oficina, solo deja compass_policy_id/policy_status
        sin completar para esa fila)."""
        if not numero:
            return None
        if numero not in polizas:
            try:
                if token['valor'] is None:
                    token['valor'] = compass.obtener_token()
                polizas[numero] = compass.buscar_poliza(token['valor'], numero)
            except (RequestException, MySQLError, ValueError, TypeError, KeyError):
                polizas[numero] = None
        return polizas[numero]

    for row in rows:
        coincidencias = oficinas_por_nombre.get(_normalizar_nombre_oficina(row.get('vendor_name')), [])
        if len(coincidencias) == 1:
            office = coincidencias[0]
            row.update(franchise_number=_formatear_codigo_oficina(office.get('office_number')),
                       franchise_number_source='offices', office_id=str(office['office_id']),
                       state=office.get('state'), code_lookup_alert=None)
            # La franquicia ya se resolvio por nombre de oficina, pero igual se consulta la
            # poliza en Compass (mejor esfuerzo) para completar el estado de la poliza, que de
            # otro modo quedaria siempre vacio en el Excel.
            poliza = consultar_poliza(row.get('policy_number'))
            if poliza:
                row.update(compass_policy_id=poliza.get('policy_id') or poliza.get('id'),
                           policy_status=poliza.get('status_id'))
            continue
        row.update(franchise_number=None, franchise_number_source=None, office_id=None, state=None,
                   compass_policy_id=None, policy_status=None)
        if len(coincidencias) > 1:
            intentar_observado(row, f'{row["vendor_name"]}: coincide con varias oficinas por nombre; revisa el vendor')
            continue
        numero = row.get('policy_number')
        if not numero:
            intentar_observado(row, f'{row["vendor_name"]}: no coincide con ninguna oficina y sin poliza para consultar Compass')
            continue
        poliza = consultar_poliza(numero)
        if poliza is None:
            franquicia = str(buscar_franquicia_historica(connection, numero) or '').strip().upper()
            if franquicia and not franquicia.startswith('DT'):
                franquicia = _formatear_codigo_oficina(franquicia) or ''
            if franquicia:
                office = next((o for o in offices if _coincide_oficina(o, franquicia)), None)
                row.update(franchise_number=franquicia, franchise_number_source='historico',
                           office_id=str(office['office_id']) if office else None,
                           state=office.get('state') if office else None, code_lookup_alert=None)
            else:
                intentar_observado(row, f'{row["vendor_name"]}: poliza {numero} sin franquicia en oficinas, Compass ni historico')
            continue
        office_id = str(poliza.get('office_id') or '').strip()
        office = next((o for o in offices if str(o['office_id']).strip() == office_id), None)
        franquicia = _formatear_codigo_oficina(office.get('office_number')) if office else None
        row.update(office_id=office_id or None, compass_policy_id=poliza.get('policy_id') or poliza.get('id'),
                   policy_status=poliza.get('status_id'))
        if franquicia:
            row.update(franchise_number=franquicia, franchise_number_source='compass',
                       state=office.get('state'), code_lookup_alert=None)
        else:
            intentar_observado(row, f'{row["vendor_name"]}: no se pudo determinar la franquicia de la poliza {numero} en Compass')


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """Sin file_id en el snapshot, combina todos los archivos guardados de ese mes contable."""
    cursor = connection.cursor(dictionary=True)
    try:
        # El Vendor Name no es un codigo de agente (no hay uno en CRC GROUP); va en producer_name
        # (columna "Location"/"producer_name" del Excel), no en producer_code.
        base = ('SELECT r.*, r.gross_premium AS premium_amount,'
                ' r.comm_percent AS del_toro_percent, r.vendor_name AS producer_name, r.invoice_type AS transaction_type'
                ' FROM staging_hub.st_crc_group_raw r WHERE r.accounting_month=%s')
        if snapshot.get('file_id'):
            cursor.execute(base + ' AND r.file_id=%s ORDER BY r.id',
                           (snapshot['rows'][0]['accounting_month'], snapshot['file_id']))
        else:
            cursor.execute(base + ' ORDER BY r.id', (snapshot['rows'][0]['accounting_month'],))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de CRC GROUP para este mes.')
        for row in rows:
            row['carrier'] = 'CRC GROUP'
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'statement'
            row['business_line'] = ''
            row['code_lookup_alert'] = None if row.get('franchise_number') else (
                f"Vendor {row.get('vendor_name') or 'sin determinar'}: sin resolver para esta fila")
        cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                       " FROM staging_hub.commission_rates WHERE carrier='CRC GROUP'")
        tarifas = cursor.fetchall()
        calculated = calcular_comisiones_raw(rows, tarifas, 'CRC GROUP', state, business_line)
        for row in calculated:
            row['commission_alert'] = '; '.join(filter(None, (row.get('commission_alert'), row.get('code_lookup_alert')))) or None
        return calculated
    finally:
        cursor.close()

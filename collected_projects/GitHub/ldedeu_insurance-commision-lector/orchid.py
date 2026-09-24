"""Extraccion local y validacion explicita de statements ORCHID (Direct Bill Commission
Statement). Llega en PDF (via documentos.paginas_documento, que lee el texto real del PDF sin
necesitar OCR salvo que la pagina venga escaneada). La franquicia se busca por Agency # en la
tabla de codigos, con el mismo respaldo Compass/historico/codigo-observado que ya se usa en
ASSURANCE/GRANADA/BASS."""
import json
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import compass
from requests import RequestException
from mysql.connector import Error as MySQLError

from database import conectar
from importacion import nombres_archivo, calcular_file_id
from franquicias import _formatear_codigo_oficina, buscar_franquicia_historica
from reparto_comisiones import completar_del_toro_statement
from calculos import calcular_term_length
from bass import importe, fecha

FIELDS = ('status', 'agency_number', 'ext_agency_number', 'transaction_type', 'effective_date',
          'customer_name', 'policy_number', 'invoice_number', 'premium', 'comm_percent', 'comm_amount')
COLUMN_LABELS = (
    ('status', ('status',)),
    ('agency_number', ('agency',)),
    ('ext_agency_number', ('ext', 'agy')),
    ('transaction_type', ('transaction', 'type')),
    ('effective_date', ('effective', 'date')),
    ('customer_name', ('customer', 'name')),
    ('policy_number', ('policy',)),
    ('invoice_number', ('invoice',)),
    ('premium', ('premium',)),
    ('comm_percent', ('comm',)),
    ('comm_amount', ('comm', 'amt')),
)
_PALABRAS_ENCABEZADO = {palabra for _, palabras in COLUMN_LABELS for palabra in palabras}


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


def _palabras_bloque(texto):
    return [_normalizar_palabra(p) for p in re.split(r'\s+', str(texto or '')) if _normalizar_palabra(p)]


def extraer_tabla_pagina(blocks, *, detalles=False):
    """Encabezados detectados por texto (no por posicion fija: el statement trae un titulo y
    margen variable antes de la tabla), filas agrupadas por Y hasta la nota al pie.

    El pie de pagina ('Underwriters Agency, LLC...') tiene una palabra ('Agency,') que
    normalizada coincide con un encabezado real ('Agency #'); por eso el limite de la nota al
    pie se calcula ANTES de buscar encabezados, y los candidatos se restringen a lo que esta
    arriba de esa nota. Los valores de agencia ('AGY9416') tambien podrian colisionar por
    texto ('agy'), asi que ademas se excluyen bloques con digitos (ningun encabezado real
    lleva numeros)."""
    notas_pie = [b for b in blocks if set(_palabras_bloque(b['text'])) >= {'please', 'note'}
                or _normalizar_palabra(b['text']) in ('please', 'note')]
    limite_inferior = min((b['y'] for b in notas_pie), default=1.0)
    candidatos_header = [b for b in blocks if b['y'] < limite_inferior
                         and not any(c.isdigit() for c in b['text'])
                         and set(_palabras_bloque(b['text'])) & _PALABRAS_ENCABEZADO
                         and len(b['text'].strip()) <= 14]
    if not candidatos_header:
        return []
    grupos = _agrupar_por_x(candidatos_header)
    headers = {}
    for grupo in grupos:
        palabras = {p for b in grupo for p in _palabras_bloque(b['text'])}
        centro_x = sum(b['x'] for b in grupo) / len(grupo)
        centro_y = max(b['y'] + b['height'] / 2 for b in grupo)
        for campo, palabras_esperadas in COLUMN_LABELS:
            if palabras == set(palabras_esperadas):
                headers[campo] = {'x': centro_x, 'y': centro_y}
                break
    if len(headers) != len(FIELDS):
        return []
    ordered = sorted(headers.items(), key=lambda pair: pair[1]['x'])
    boundaries = [(ordered[i][1]['x'] + ordered[i + 1][1]['x']) / 2 for i in range(len(ordered) - 1)]
    top = max(h['y'] for h in headers.values()) - .004
    grupos_fila = []
    for b in sorted((b for b in blocks if top < b['y'] < limite_inferior), key=lambda b: b['y']):
        if grupos_fila and abs(grupos_fila[-1][-1]['y'] - b['y']) < .015:
            grupos_fila[-1].append(b)
        else:
            grupos_fila.append([b])
    filas = []
    for grupo in grupos_fila:
        columnas = {campo: [] for campo in FIELDS}
        for b in grupo:
            columna = sum(b['x'] > limite for limite in boundaries)
            columnas[ordered[columna][0]].append(b)
        fila = {campo: ' '.join(b['text'] for b in sorted(bloques, key=lambda b: b['y'])).strip()
                for campo, bloques in columnas.items()}
        confianza = {campo: min((b.get('confidence', 1) for b in bloques), default=1)
                     for campo, bloques in columnas.items() if bloques}
        if fila['policy_number'] and fila['invoice_number']:
            filas.append({'values': fila, 'confidence': confianza} if detalles else fila)
    return filas


def porcentaje(value):
    """'10%' -> Decimal('10'). Cualquier texto sin digitos (o fuera de 0-100) es invalido."""
    limpio = re.sub(r'[^0-9.\-]', '', str(value or ''))
    try:
        rate = Decimal(limpio) if limpio else None
    except InvalidOperation:
        rate = None
    if rate is None or not rate.is_finite() or not 0 <= rate <= 100:
        raise ValueError(f'Porcentaje inválido: {value!r}')
    return rate


def alertas_lectura(row, original=None, threshold=.95):
    alerts = {}
    for field in FIELDS:
        value = str(row.get(field) or '').strip()
        if not value:
            if field in ('ext_agency_number',):
                continue  # Casi siempre viene vacio; no es obligatorio.
            alerts[field] = 'missing'
            continue
        try:
            if field == 'effective_date':
                fecha(value)
            elif field in ('premium', 'comm_amount'):
                importe(value)
            elif field == 'comm_percent':
                porcentaje(value)
        except (ValueError, InvalidOperation):
            alerts[field] = 'invalid'
            continue
        if original and value == str(original['values'].get(field) or '').strip():
            score = original['confidence'].get(field)
            if score is not None and score < threshold:
                alerts[field] = f'{score:.0%}'
    return alerts


def validar(rows, month):
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Mes contable invalido; usa YYYY-MM.')
    if not rows:
        raise ValueError('Anade las filas de la tabla antes de importar.')
    for i, row in enumerate(rows, 1):
        for field in ('policy_number', 'invoice_number', 'agency_number', 'customer_name'):
            if not str(row.get(field) or '').strip():
                raise ValueError(f'Fila {i}: falta {field}.')
        fecha(row['effective_date'])
        importe(row['premium'])
        importe(row['comm_amount'])
        try:
            porcentaje(row['comm_percent'])
        except ValueError:
            raise ValueError(f'Fila {i}: porcentaje invalido; escribe 10 para 10%.') from None


def guardar(rows, month, file_name, contenido, source_page, original_ocr):
    """Igual patron que BASS/CRC GROUP: reintento identico no duplica, una fila corregida se
    actualiza en vez de bloquear toda la pagina. La franquicia se resuelve aqui mismo (no al
    generar el Excel) para que quede persistida desde la primera importacion.

    file_id se calcula del CONTENIDO del archivo (no del nombre): el mismo statement subido
    con otro nombre se reconoce igual como ya importado, en vez de duplicarse."""
    validar(rows, month)
    nombres_archivo(file_name)  # valida que el nombre sea utilizable
    file_id = calcular_file_id(contenido)
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        cursor.execute("SELECT GET_LOCK('staging_hub.st_orchid_raw.import',10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importacion de ORCHID en curso.')
        accounting = datetime.strptime(month, '%Y-%m').date()
        payloads = [json.dumps({'reviewed': row, 'original_ocr': original_ocr},
                               ensure_ascii=False, sort_keys=True) for row in rows]
        cursor.execute('SELECT id, source_row, source_data FROM staging_hub.st_orchid_raw'
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
            row.setdefault('producer_code', row.get('agency_number'))
            if not sin_cambios(numero):
                pendientes.append(row)
        completar_franquicias(connection, pendientes)

        inserted = updated = 0
        for numero, row in enumerate(rows, 1):
            if sin_cambios(numero):
                continue
            previo = existentes.get(numero)
            valores = (
                row['status'] or None, row['agency_number'], row.get('ext_agency_number') or None,
                row['transaction_type'] or None, fecha(row['effective_date']), row['customer_name'],
                row['policy_number'], row['invoice_number'], importe(row['premium']),
                (porcentaje(row['comm_percent']) / 100).quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP),
                importe(row['comm_amount']), row.get('franchise_number'), row.get('franchise_number_source'),
                row.get('producer_name') or None, row.get('office_id'), row.get('state'),
                row.get('compass_policy_id'), row.get('policy_status'), row.get('term_length'),
                payloads[numero - 1],
            )
            if previo is not None:
                cursor.execute(
                    'UPDATE staging_hub.st_orchid_raw SET status=%s, agency_number=%s, ext_agency_number=%s,'
                    ' transaction_type=%s, effective_date=%s, customer_name=%s, policy_number=%s, invoice_number=%s,'
                    ' premium=%s, comm_percent=%s, comm_amount=%s, franchise_number=%s, franchise_number_source=%s,'
                    ' producer_name=%s, office_id=%s, state=%s, compass_policy_id=%s, policy_status=%s,'
                    ' term_length=%s, source_data=%s WHERE id=%s',
                    valores + (previo['id'],))
                updated += 1
            else:
                cursor.execute(
                    'INSERT INTO staging_hub.st_orchid_raw (status, agency_number, ext_agency_number,'
                    ' transaction_type, effective_date, customer_name, policy_number, invoice_number, premium,'
                    ' comm_percent, comm_amount, franchise_number, franchise_number_source, producer_name,'
                    ' office_id, state, compass_policy_id, policy_status, term_length, source_data, file_id,'
                    ' file_name, accounting_month, source_page, source_row) VALUES (' + ','.join(['%s'] * 25) + ')',
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
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_orchid_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()


def _normalizar_codigo(value):
    return str(value or '').strip().upper()


def variantes_poliza_orchid(numero):
    """Compass puede llevar la edicion con un offset distinto al del statement (ej. la '-01'
    del statement es '-00' en Compass) o directamente sin sufijo. Se normaliza (solo letras,
    numeros y guion) y se prueba: el numero tal cual, sin sufijo, un numero menos, y luego
    incrementos alrededor del original, hasta encontrar coincidencia."""
    numero = re.sub(r'[^A-Z0-9-]', '', str(numero or '').strip().upper())
    if not numero:
        return []
    coincide = re.fullmatch(r'(.+)-(\d+)', numero)
    if not coincide:
        return [numero]
    base, sufijo_texto = coincide.group(1), coincide.group(2)
    sufijo, ancho = int(sufijo_texto), len(sufijo_texto)
    variantes = [numero, base]
    for edicion in [sufijo - 1] + [sufijo + n for n in range(1, 6)]:
        if edicion < 0:
            continue
        variantes.append(f'{base}-{edicion}')
        variantes.append(f'{base}-{str(edicion).zfill(ancho)}')
    return list(dict.fromkeys(v for v in variantes if v))


def _franquicias_vistas(connection, rows, agency_number):
    vistas = {str(r.get('franchise_number') or '').strip().upper()
              for r in rows
              if _normalizar_codigo(r.get('agency_number')) == _normalizar_codigo(agency_number) and r.get('franchise_number')}
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT DISTINCT franchise_number FROM staging_hub.st_orchid_raw'
                       ' WHERE UPPER(agency_number)=UPPER(%s) AND franchise_number IS NOT NULL', (agency_number,))
        vistas |= {str(r['franchise_number']).strip().upper() for r in cursor.fetchall()}
    finally:
        cursor.close()
    vistas.discard('')
    return vistas


def completar_franquicias(connection, rows):
    """Agency # -> tabla de codigos (carrier ORCHID) directo. Si no esta registrado o es
    master, se intenta por la poliza en Compass, luego historico, y por ultimo si ese mismo
    Agency # ya dio una franquicia unica en otras filas, se usa esa. Aunque el codigo ya
    resuelva directo, igual se consulta Compass (mejor esfuerzo) para completar policy_status,
    que de otro modo quedaria siempre vacio en el Excel."""
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT code, franchise, is_master_code FROM staging_hub.franchises_carrier_codes'
                       " WHERE UPPER(TRIM(carrier))='ORCHID'")
        codes = {}
        masters = set()
        for entry in cursor.fetchall():
            code = _normalizar_codigo(entry['code'])
            franchise = str(entry.get('franchise') or '').strip().upper()
            if entry.get('is_master_code'):
                masters.add(code)
                continue
            if franchise and not franchise.startswith('DT'):
                franchise = _formatear_codigo_oficina(franchise) or franchise
            codes.setdefault(code, set()).add(franchise)
        cursor.execute('SELECT office_id, office_number, office_name, state FROM staging_hub.offices')
        offices = cursor.fetchall()
    finally:
        cursor.close()
    oficinas_por_id = {str(o['office_id']).strip(): o for o in offices}

    def intentar_observado(row, mensaje_no_encontrado):
        vistas = _franquicias_vistas(connection, rows, row['agency_number'])
        if len(vistas) == 1:
            franquicia_previa = next(iter(vistas))
            office = next((o for o in offices if _formatear_codigo_oficina(o.get('office_number')) == franquicia_previa), None)
            row.update(franchise_number=franquicia_previa, franchise_number_source='codigo_observado',
                       office_id=str(office['office_id']) if office else None,
                       state=office.get('state') if office else None,
                       producer_name=office.get('office_name') if office else '', code_lookup_alert=None)
        elif len(vistas) > 1:
            row['code_lookup_alert'] = (f'{row["agency_number"]}: aparece con franquicias distintas en otras filas '
                                        f'({", ".join(sorted(vistas))}); revisa el codigo')
        else:
            row['code_lookup_alert'] = mensaje_no_encontrado

    token = None
    polizas = {}

    def consultar_poliza(numero):
        """Best-effort: solo para completar compass_policy_id/policy_status; nunca bloquea la
        resolucion de franquicia si Compass falla o no tiene la poliza. Prueba variantes de
        edicion (variantes_poliza_orchid) antes de darse por vencido."""
        nonlocal token
        if not numero:
            return None
        if numero not in polizas:
            try:
                if token is None:
                    token = compass.obtener_token()
                encontrada = None
                for variante in variantes_poliza_orchid(numero):
                    encontrada = compass.buscar_poliza(token, variante)
                    if encontrada is not None:
                        break
                polizas[numero] = encontrada
            except (RequestException, MySQLError, ValueError, TypeError, KeyError):
                polizas[numero] = None
        return polizas[numero]

    for row in rows:
        code = _normalizar_codigo(row.get('agency_number'))
        franquicia_directa = None
        if code not in masters:
            matches = codes.get(code, set())
            franquicia_directa = next(iter(matches)) if len(matches) == 1 and '' not in matches else None
        if franquicia_directa:
            office = next((o for o in offices if _formatear_codigo_oficina(o.get('office_number')) == franquicia_directa), None)
            row.update(franchise_number=franquicia_directa, franchise_number_source='codigos',
                       office_id=str(office['office_id']) if office else None,
                       state=office.get('state') if office else None,
                       producer_name=office.get('office_name') if office else '', code_lookup_alert=None)
            poliza = consultar_poliza(row.get('policy_number'))
            if poliza:
                row.update(compass_policy_id=poliza.get('policy_id') or poliza.get('id'),
                           policy_status=poliza.get('status_id'),
                           term_length=calcular_term_length(poliza.get('effective_date'), poliza.get('expiration_date')))
            continue
        row.update(franchise_number=None, franchise_number_source=None, office_id=None, state=None,
                   compass_policy_id=None, policy_status=None)
        numero = row.get('policy_number')
        if not numero:
            intentar_observado(row, f'{row["agency_number"]}: sin franquicia unica por codigo y sin poliza para consultar Compass')
            continue
        poliza = consultar_poliza(numero)
        if poliza is None:
            franquicia = ''
            for variante in variantes_poliza_orchid(numero):
                franquicia = str(buscar_franquicia_historica(connection, variante) or '').strip().upper()
                if franquicia:
                    break
            if franquicia and not franquicia.startswith('DT'):
                franquicia = _formatear_codigo_oficina(franquicia) or ''
            if franquicia:
                office = next((o for o in offices if _formatear_codigo_oficina(o.get('office_number')) == franquicia), None)
                row.update(franchise_number=franquicia, franchise_number_source='historico',
                           office_id=str(office['office_id']) if office else None,
                           state=office.get('state') if office else None,
                           producer_name=office.get('office_name') if office else '', code_lookup_alert=None)
            else:
                intentar_observado(row, f'{row["agency_number"]}: poliza {numero} sin franquicia en la tabla de codigos, Compass ni historico')
            continue
        office_id = str(poliza.get('office_id') or '').strip()
        office = oficinas_por_id.get(office_id)
        franquicia = _formatear_codigo_oficina(office.get('office_number')) if office else None
        row.update(office_id=office_id or None, compass_policy_id=poliza.get('policy_id') or poliza.get('id'),
                   policy_status=poliza.get('status_id'),
                   term_length=calcular_term_length(poliza.get('effective_date'), poliza.get('expiration_date')))
        if franquicia:
            row.update(franchise_number=franquicia, franchise_number_source='compass',
                       state=office.get('state'), producer_name=office.get('office_name') or '',
                       code_lookup_alert=None)
        else:
            intentar_observado(row, f'{row["agency_number"]}: no se pudo determinar la franquicia de la poliza {numero} en Compass')


def codigos_pendientes_de_registrar(connection):
    """Agency # resueltos por Compass/historico/codigo_observado (no por la tabla), agrupados.
    Con una sola franquicia consistente se pueden registrar directo; con varias, es ambiguo
    (probablemente un codigo master real) y se marca para revision."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT agency_number AS code, GROUP_CONCAT(DISTINCT franchise_number ORDER BY franchise_number SEPARATOR ', ') AS franquicias,"
            ' COUNT(DISTINCT franchise_number) AS distintas, COUNT(*) AS filas,'
            " GROUP_CONCAT(DISTINCT state ORDER BY state SEPARATOR ', ') AS estados"
            " FROM staging_hub.st_orchid_raw WHERE franchise_number IS NOT NULL"
            " AND franchise_number_source IN ('compass','historico','codigo_observado')"
            ' GROUP BY agency_number ORDER BY distintas DESC, agency_number')
        agrupado = cursor.fetchall()
        cursor.execute("SELECT DISTINCT UPPER(TRIM(code)) AS code FROM staging_hub.franchises_carrier_codes"
                       " WHERE UPPER(TRIM(carrier))='ORCHID'")
        registrados = {r['code'] for r in cursor.fetchall()}
    finally:
        cursor.close()
    resultado = []
    for r in agrupado:
        franquicias = r['franquicias'].split(', ') if r['franquicias'] else []
        estados = r['estados'].split(', ') if r['estados'] else []
        resultado.append({
            'code': r['code'], 'franquicias': franquicias, 'ambiguo': r['distintas'] > 1,
            'filas': r['filas'], 'estado': estados[0] if len(estados) == 1 else None,
            'ya_registrado': str(r['code']).strip().upper() in registrados,
        })
    return resultado


def registrar_codigo(connection, code, franchise, state, changed_by):
    code = str(code or '').strip()
    franchise = str(franchise or '').strip().upper()
    changed_by = str(changed_by or '').strip()
    if not code or not franchise:
        raise ValueError('Falta el código o la franquicia.')
    if not changed_by:
        raise ValueError('Indica quién registra el código.')
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute("SELECT codeID FROM staging_hub.franchises_carrier_codes"
                       " WHERE UPPER(TRIM(carrier))='ORCHID' AND UPPER(TRIM(code))=UPPER(%s)", (code,))
        if cursor.fetchone():
            raise ValueError(f'El código {code} ya está registrado para ORCHID.')
        cursor.execute(
            'INSERT INTO staging_hub.franchises_carrier_codes'
            ' (file_name, franchise_name, franchise_soffront_name, carrier, code, agent_name, franchise, state_code)'
            ' VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
            (f'Registrado desde ORCHID por {changed_by} (resuelto por Compass/histórico)',
             '', '', 'ORCHID', code, '', franchise, state))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """La franquicia recibe integro lo que ORCHID reporto (lo que entra es lo que sale), sin
    tabla de tarifas: no hace falta configurar un commission_rates por cada porcentaje que
    aparezca en los statements. Sin file_id en el snapshot, combina todos los archivos
    guardados de ese mes contable."""
    cursor = connection.cursor(dictionary=True)
    try:
        base = ('SELECT r.*, r.premium AS premium_amount, r.comm_amount AS commission_amount,'
                ' r.comm_percent AS del_toro_percent, r.agency_number AS producer_code,'
                ' r.customer_name AS insured_name'
                ' FROM staging_hub.st_orchid_raw r WHERE r.accounting_month=%s')
        if snapshot.get('file_id'):
            cursor.execute(base + ' AND r.file_id=%s ORDER BY r.id',
                           (snapshot['rows'][0]['accounting_month'], snapshot['file_id']))
        else:
            cursor.execute(base + ' ORDER BY r.id', (snapshot['rows'][0]['accounting_month'],))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de ORCHID para este mes.')
        for row in rows:
            row['carrier'] = 'ORCHID'
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'statement'
            completar_del_toro_statement(row)
            row['franchise_percent'] = row['del_toro_percent']
            row['franchise_commission'] = row['del_toro_commission']
            row['commission_alert'] = None if row.get('franchise_number') else (
                f"Agency {row.get('agency_number') or 'sin determinar'}: sin resolver para esta fila")
        return rows
    finally:
        cursor.close()

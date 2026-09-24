"""Statement TOWER HILL: llega normalmente en Excel, pero se prepara para PDF/imagen tambien
(paginas_documento + extraccion geometrica, igual que ORCHID/SLIDE), unificando ambos formatos
en la misma fila canonica antes de resolver franquicia y guardar.

El statement real (a diferencia de lo que asumia un script viejo) NO trae codigo de agencia
ni oficina: solo Producing Agent y Submitted Agent (nombres de agentes individuales, que no
estan en ninguna tabla nuestra). La franquicia se busca en este orden: (1) Compass por numero
de poliza, (2) historico por numero de poliza, (3) Company Search por NOMBRE del cliente
(busqueda visual via el bot de Selenium), cuando ni Compass ni el historico encontraron la
poliza por numero. En el paso 3 se usa la franquicia encontrada aunque no se sepa el estado
de la poliza (no esta en Compass, solo el cliente). Si ninguno de los tres encuentra nada,
queda sin franquicia y se marca en rojo para revision manual.

Rate viene ya calculado por Tower Hill como Commission Amount / Commission Premium (no contra
Written Premium, que es una cifra distinta y mayor); por eso Commission Premium es la prima que
se usa para los calculos de comision, y Written Premium se conserva solo de forma informativa.
"""
import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO

from openpyxl import load_workbook

import compass
from requests import RequestException
from mysql.connector import Error as MySQLError

from database import conectar
from importacion import nombres_archivo, calcular_file_id
from franquicias import _formatear_codigo_oficina
from reparto_comisiones import calcular_comisiones_raw
from calculos import calcular_term_length
from compass_bot_client import buscar_franquicias_por_nombre
from bass import importe, fecha

HEADERS = ('Policy Number', 'Effective Date', 'Named Insured', 'Term', 'Written Premium',
           'Commission Premium', 'Rate', 'Commission Amount')
OPTIONAL_HEADERS = ('Form', 'Producing Agent', 'Submitted Agent')

FIELDS = ('policy_number', 'effective_date', 'insured_name', 'transaction_type', 'written_premium',
          'premium_amount', 'del_toro_percent', 'commission_amount', 'form', 'producing_agent',
          'submitted_agent')
COLUMN_LABELS = (
    ('policy_number', ('policy', 'number')),
    ('effective_date', ('effective', 'date')),
    ('insured_name', ('named', 'insured')),
    ('transaction_type', ('term',)),
    ('written_premium', ('written', 'premium')),
    ('premium_amount', ('commission', 'premium')),
    ('del_toro_percent', ('rate',)),
    ('commission_amount', ('commission', 'amount')),
    ('form', ('form',)),
    ('producing_agent', ('producing', 'agent')),
    ('submitted_agent', ('submitted', 'agent')),
)
_CAMPOS_OBLIGATORIOS = ('policy_number', 'effective_date', 'insured_name', 'transaction_type',
                        'written_premium', 'premium_amount', 'del_toro_percent', 'commission_amount')
_PALABRAS_ENCABEZADO = {palabra for _, palabras in COLUMN_LABELS for palabra in palabras}


def porcentaje_fraccion(valor):
    """'10' o '10%' -> 0.10 (porcentaje); '0.10' se conserva tal cual (ya es fraccion).
    El statement real ya trae Rate como fraccion (0.08, 0.1...), pero un numero con magnitud
    mayor a 1 se trata como porcentaje entero y se divide entre 100 por seguridad."""
    limpio = re.sub(r'[^0-9.\-]', '', str(valor or ''))
    if not limpio:
        raise ValueError(f'Porcentaje inválido: {valor!r}')
    try:
        numero = Decimal(limpio)
    except InvalidOperation:
        raise ValueError(f'Porcentaje inválido: {valor!r}') from None
    if not numero.is_finite():
        raise ValueError(f'Porcentaje inválido: {valor!r}')
    return numero / 100 if abs(numero) > 1 else numero


# ---------------------------------------------------------------------------
# Lectura de Excel (formato esperado)
# ---------------------------------------------------------------------------

def _normalizar_encabezado(value):
    return re.sub(r'\s+', '', str(value or '')).casefold()


def _fecha_celda(value):
    if value is None or value == '':
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    raise ValueError(f'fecha inválida: {value!r}')


def detectar_encabezado(sheet):
    required = {_normalizar_encabezado(h) for h in HEADERS}
    for index, row in enumerate(sheet.iter_rows(values_only=True), 1):
        if required <= {_normalizar_encabezado(v) for v in row}:
            return index
    raise ValueError('No se encontró el encabezado completo de TOWER HILL en la primera hoja.')


def preparar_statement(data, month, *, header=None):
    """Fila canonica ya parseada (fechas y decimales), igual forma que construir_filas()
    produce desde una pagina de PDF/imagen revisada manualmente."""
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Indica el mes contable en formato YYYY-MM.')
    book = load_workbook(BytesIO(data), read_only=True, data_only=True)
    result = []
    try:
        sheet = book.worksheets[0]
        header = header or detectar_encabezado(sheet)
        labels = next(sheet.iter_rows(min_row=header, max_row=header, values_only=True))
        positions = {}
        for i, label in enumerate(labels):
            key = _normalizar_encabezado(label)
            if key and key in positions:
                raise ValueError(f'Encabezado duplicado: {label}')
            if key:
                positions[key] = i
        if not {_normalizar_encabezado(h) for h in HEADERS} <= positions.keys():
            raise ValueError('Faltan columnas de TOWER HILL.')
        headers = HEADERS + tuple(h for h in OPTIONAL_HEADERS if _normalizar_encabezado(h) in positions)
        for number, cells in enumerate(sheet.iter_rows(min_row=header + 1), header + 1):
            if all(cell.value is None for cell in cells):
                continue
            source = {}
            for h in headers:
                value = cells[positions[_normalizar_encabezado(h)]].value
                source[h] = value.isoformat() if isinstance(value, (date, datetime)) else ('' if value is None else str(value))
            try:
                written_premium = Decimal(str(source['Written Premium']))
                premium = Decimal(str(source['Commission Premium']))
                commission = Decimal(str(source['Commission Amount']))
                if not all(v.is_finite() for v in (written_premium, premium, commission)):
                    raise InvalidOperation
            except InvalidOperation:
                raise ValueError(f'Fila {number}: Written Premium, Commission Premium o Commission Amount inválido.') from None
            try:
                rate = porcentaje_fraccion(source['Rate'])
            except ValueError:
                raise ValueError(f'Fila {number}: Rate inválido.') from None
            try:
                effective = _fecha_celda(cells[positions[_normalizar_encabezado('Effective Date')]].value)
            except ValueError as exc:
                raise ValueError(f'Fila {number}: Effective Date {exc}') from None
            policy_raw = source['Policy Number'].strip()
            policy = '' if policy_raw.upper() in ('', 'N/A') else policy_raw
            result.append(dict(
                source_row=number, source_data=source, accounting_month=month,
                policy_number=policy, insured_name=source['Named Insured'].strip(),
                effective_date=effective, transaction_type=source['Term'].strip(),
                transaction_type_source='statement',
                written_premium=str(written_premium), premium_amount=str(premium),
                commission_amount=str(commission),
                del_toro_percent=str(rate.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)),
                del_toro_percent_source='statement',
                form=source.get('Form', '').strip(),
                producing_agent=source.get('Producing Agent', '').strip() or None,
                submitted_agent=source.get('Submitted Agent', '').strip() or None,
            ))
        if not result:
            raise ValueError('No hay filas para importar.')
        return result
    finally:
        book.close()


# ---------------------------------------------------------------------------
# Extraccion geometrica (PDF con texto real o imagen escaneada via documentos.paginas_documento)
# ---------------------------------------------------------------------------

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
    """Encabezados detectados por texto (no por posicion fija). Se exigen al menos las
    columnas obligatorias del statement; Form/Producing Agent/Submitted Agent son
    informativas y pueden faltar sin invalidar la pagina."""
    candidatos_header = [b for b in blocks if not any(c.isdigit() for c in b['text'])
                         and set(_palabras_bloque(b['text'])) & _PALABRAS_ENCABEZADO
                         and len(b['text'].strip()) <= 20]
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
    if not set(_CAMPOS_OBLIGATORIOS) <= headers.keys():
        return []
    ordered = sorted(headers.items(), key=lambda pair: pair[1]['x'])
    boundaries = [(ordered[i][1]['x'] + ordered[i + 1][1]['x']) / 2 for i in range(len(ordered) - 1)]
    top = max(h['y'] for h in headers.values()) - .004
    grupos_fila = []
    for b in sorted((b for b in blocks if b['y'] > top), key=lambda b: b['y']):
        if grupos_fila and abs(grupos_fila[-1][-1]['y'] - b['y']) < .015:
            grupos_fila[-1].append(b)
        else:
            grupos_fila.append([b])
    filas = []
    for grupo in grupos_fila:
        columnas = {campo: [] for campo in headers}
        for b in grupo:
            columna = sum(b['x'] > limite for limite in boundaries)
            columnas[ordered[columna][0]].append(b)
        fila = {campo: ' '.join(b['text'] for b in sorted(bloques, key=lambda b: b['y'])).strip()
                for campo, bloques in columnas.items()}
        for campo in FIELDS:
            fila.setdefault(campo, '')
        confianza = {campo: min((b.get('confidence', 1) for b in bloques), default=1)
                     for campo, bloques in columnas.items() if bloques}
        if fila.get('policy_number') and fila.get('insured_name'):
            filas.append({'values': fila, 'confidence': confianza} if detalles else fila)
    return filas


def alertas_lectura(row, original=None, threshold=.95):
    alerts = {}
    for field in FIELDS:
        value = str(row.get(field) or '').strip()
        if not value:
            if field in ('form', 'producing_agent', 'submitted_agent'):
                continue  # Informativas; no siempre vienen en la pagina.
            alerts[field] = 'missing'
            continue
        try:
            if field == 'effective_date':
                fecha(value)
            elif field in ('written_premium', 'premium_amount', 'commission_amount'):
                importe(value)
            elif field == 'del_toro_percent':
                porcentaje_fraccion(value)
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
        raise ValueError('Añade las filas de la tabla antes de importar.')
    for i, row in enumerate(rows, 1):
        for field in ('policy_number', 'insured_name'):
            if not str(row.get(field) or '').strip():
                raise ValueError(f'Fila {i}: falta {field}.')
        fecha(row['effective_date'])
        importe(row['written_premium'])
        importe(row['premium_amount'])
        importe(row['commission_amount'])
        try:
            porcentaje_fraccion(row['del_toro_percent'])
        except ValueError:
            raise ValueError(f'Fila {i}: Rate inválido.') from None


def construir_filas(rows, month):
    """Convierte filas de texto revisadas manualmente (extraer_tabla_pagina) en la misma
    forma canonica que preparar_statement() produce desde Excel."""
    validar(rows, month)
    result = []
    for number, row in enumerate(rows, 1):
        policy_raw = str(row['policy_number']).strip()
        policy = '' if policy_raw.upper() in ('', 'N/A') else policy_raw
        result.append(dict(
            source_row=number, source_data=dict(row), accounting_month=month,
            policy_number=policy, insured_name=str(row['insured_name']).strip(),
            effective_date=fecha(row['effective_date']), transaction_type=str(row['transaction_type']).strip(),
            transaction_type_source='statement',
            written_premium=str(importe(row['written_premium'])), premium_amount=str(importe(row['premium_amount'])),
            commission_amount=str(importe(row['commission_amount'])),
            del_toro_percent=str(porcentaje_fraccion(row['del_toro_percent']).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)),
            del_toro_percent_source='statement',
            form=str(row.get('form') or '').strip(),
            producing_agent=str(row.get('producing_agent') or '').strip() or None,
            submitted_agent=str(row.get('submitted_agent') or '').strip() or None,
        ))
    return result


# ---------------------------------------------------------------------------
# Franquicia: Compass por numero de poliza primero, historico como respaldo.
# ---------------------------------------------------------------------------

def _franquicia_historica(connection, numero, offices):
    """A diferencia de franquicias.buscar_franquicia_historica (que solo devuelve el codigo),
    aqui se trae tambien term_length: el historico ya lo tiene calculado de una importacion
    anterior y evita dejarlo siempre vacio cuando la franquicia viene de esta via."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT franchise, term_length FROM staging_hub.historic_data_commissions"
            " WHERE policy_number=%s AND NULLIF(TRIM(franchise), '') IS NOT NULL"
            ' ORDER BY report_month DESC, date DESC LIMIT 1', (str(numero).strip(),))
        registro = cursor.fetchone()
    finally:
        cursor.close()
    if not registro:
        return None, None, None, None
    franquicia = str(registro.get('franchise') or '').strip().upper()
    if franquicia and not franquicia.startswith('DT'):
        franquicia = _formatear_codigo_oficina(franquicia) or ''
    if not franquicia:
        return None, None, None, None
    office = next((o for o in offices if _formatear_codigo_oficina(o['office_number']) == franquicia), None)
    return (franquicia, (str(office['office_id']) if office else None), (office.get('state') if office else None),
            registro.get('term_length'))


def completar_franquicias(connection, rows):
    """TOWER HILL no trae codigo de agencia ni oficina en el statement (solo Producing/
    Submitted Agent, nombres de agentes individuales que no estan en ninguna tabla nuestra).
    La franquicia se busca primero en Compass por numero de poliza; si no aparece ahi (o
    Compass no resuelve una oficina traducible), se usa el historico. Si tampoco esta en el
    historico, se prueba por ultimo Company Search por nombre del cliente (_completar_por_
    nombre_cliente). Si nada de eso encuentra nada, queda sin franquicia y se marca en rojo.
    producer_name siempre se toma del nombre real de la oficina resuelta (office_name)."""
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT office_id, office_number, office_name, state FROM staging_hub.offices')
        offices = cursor.fetchall()
    finally:
        cursor.close()
    token = None
    polizas = {}

    def usar_historico(row, numero, mensaje_no_encontrado):
        franquicia, office_id, state, term_length = _franquicia_historica(connection, numero, offices)
        if franquicia:
            office = next((o for o in offices if str(o['office_id']) == office_id), None)
            row.update(franchise_number=franquicia, franchise_number_source='historico',
                       office_id=office_id, state=state, term_length=term_length,
                       producer_name=office.get('office_name') if office else None, code_lookup_alert=None)
        else:
            row['code_lookup_alert'] = mensaje_no_encontrado

    for row in rows:
        row.update(franchise_number=None, franchise_number_source=None, office_id=None, state=None,
                   compass_policy_id=None, policy_status=None, term_length=None, producer_name=None)
        numero = row.get('policy_number')
        if not numero:
            row['code_lookup_alert'] = 'Sin número de póliza para buscar en Compass ni en el histórico'
            continue
        try:
            if token is None:
                token = compass.obtener_token()
            if numero not in polizas:
                polizas[numero] = compass.buscar_poliza(token, numero)
            poliza = polizas[numero]
            if poliza is None:
                usar_historico(row, numero, f'Póliza {numero}: no se encontró en Compass ni en el histórico')
                continue
            office_id = str(poliza.get('office_id') or '').strip()
            office = next((o for o in offices if str(o['office_id']).strip() == office_id), None)
            franquicia = _formatear_codigo_oficina(office.get('office_number')) if office else None
            row.update(office_id=office_id or None, compass_policy_id=poliza.get('policy_id') or poliza.get('id'),
                       policy_status=poliza.get('status_id'),
                       term_length=calcular_term_length(poliza.get('effective_date'), poliza.get('expiration_date')))
            if franquicia:
                row.update(franchise_number=franquicia, franchise_number_source='compass',
                           state=office.get('state'), producer_name=office.get('office_name'), code_lookup_alert=None)
            else:
                usar_historico(row, numero, f'Póliza {numero}: Compass no tiene una oficina traducible y no está en el histórico')
        except (RequestException, MySQLError, ValueError, TypeError, KeyError):
            usar_historico(row, numero, f'Póliza {numero}: error al consultar Compass y sin franquicia en el histórico')

    _completar_por_nombre_cliente(rows, offices)


def _completar_por_nombre_cliente(rows, offices):
    """Ultimo respaldo: si la poliza no aparecio por numero ni en Compass ni en el historico,
    se busca al cliente por NOMBRE en Company Search (busqueda visual, via el bot de
    Selenium). Se usa la franquicia encontrada aunque no se sepa el estado de la poliza,
    porque la poliza en si no esta en Compass."""
    pendientes = [row for row in rows if not row.get('franchise_number') and str(row.get('insured_name') or '').strip()]
    if not pendientes:
        return
    nombres = list(dict.fromkeys(str(row['insured_name']).strip() for row in pendientes))
    clientes = [{'request_id': str(i), 'client_name': nombre} for i, nombre in enumerate(nombres)]
    try:
        resultados = buscar_franquicias_por_nombre(clientes)
    except ValueError:
        return  # Mejor esfuerzo: si el bot no esta disponible, se deja la alerta previa.
    por_nombre = {nombres[int(r['request_id'])]: r for r in resultados}
    for row in pendientes:
        resultado = por_nombre.get(str(row['insured_name']).strip())
        if not resultado or resultado.get('error'):
            continue
        numeros_oficina = {str(o['office_number']).strip() for o in resultado.get('offices', [])}
        if len(numeros_oficina) != 1:
            if len(numeros_oficina) > 1:
                row['code_lookup_alert'] = (f'{row["code_lookup_alert"]} · el cliente aparece en varias franquicias '
                                            f'en Company Search ({", ".join(sorted(numeros_oficina))}); revisa manualmente')
            continue
        franquicia = _formatear_codigo_oficina(next(iter(numeros_oficina)))
        office = next((o for o in offices if _formatear_codigo_oficina(o['office_number']) == franquicia), None)
        if not franquicia or office is None:
            continue
        row.update(franchise_number=franquicia, franchise_number_source='compass_visual',
                   office_id=str(office['office_id']), state=office.get('state'),
                   producer_name=office.get('office_name'), code_lookup_alert=None)


# ---------------------------------------------------------------------------
# Guardado (Excel completo o pagina de PDF/imagen revisada)
# ---------------------------------------------------------------------------

def guardar(rows, month, file_name, contenido, source_page, original_ocr):
    """Sirve tanto para filas de Excel (preparar_statement, source_page=1, source_row=fila
    real del Excel) como para paginas de PDF/imagen revisadas (construir_filas, source_row=
    posicion en la pagina). Reintento identico no duplica; una fila corregida se actualiza.
    file_id se calcula del CONTENIDO del archivo (no del nombre)."""
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Mes contable invalido; usa YYYY-MM.')
    if not rows:
        raise ValueError('No hay registros para importar.')
    nombres_archivo(file_name)  # valida que el nombre sea utilizable
    file_id = calcular_file_id(contenido)
    source_rows = [row['source_row'] for row in rows]
    if len(set(source_rows)) != len(source_rows):
        raise ValueError('Hay filas con la misma posición de origen.')
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        cursor.execute("SELECT GET_LOCK('staging_hub.st_tower_hill_raw.import',10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importación de TOWER HILL en curso.')
        accounting = datetime.strptime(month, '%Y-%m').date()
        payloads = {row['source_row']: json.dumps({'reviewed': row['source_data'], 'original_ocr': original_ocr},
                                                   ensure_ascii=False, sort_keys=True, default=str)
                   for row in rows}
        cursor.execute('SELECT id, source_row, source_data FROM staging_hub.st_tower_hill_raw'
                       ' WHERE file_id=%s AND accounting_month=%s AND source_page=%s FOR UPDATE',
                       (file_id, accounting, source_page))
        existentes = {r['source_row']: r for r in cursor.fetchall()}
        for numero in existentes:
            if numero not in source_rows:
                raise ValueError('Este archivo tiene menos filas que la versión ya guardada; no se eliminó nada.')

        def sin_cambios(row):
            previo = existentes.get(row['source_row'])
            if previo is None:
                return False
            guardado = json.loads(previo['source_data']) if isinstance(previo['source_data'], str) else previo['source_data']
            return guardado == json.loads(payloads[row['source_row']])

        completar_franquicias(connection, [r for r in rows if not sin_cambios(r)])

        inserted = updated = 0
        for row in rows:
            if sin_cambios(row):
                continue
            previo = existentes.get(row['source_row'])
            valores = (
                row['policy_number'] or 'N/A', row['insured_name'], row['effective_date'],
                row['transaction_type'] or None, row['written_premium'], row['premium_amount'],
                row['del_toro_percent'], row['commission_amount'],
                row.get('form') or None, row.get('producing_agent') or None, row.get('submitted_agent') or None,
                row.get('compass_policy_id'), row.get('policy_status'), row.get('term_length'),
                row.get('producer_name'),
                row.get('franchise_number'), row.get('franchise_number_source'), row.get('office_id'),
                row.get('state'), payloads[row['source_row']],
            )
            if previo is not None:
                cursor.execute(
                    'UPDATE staging_hub.st_tower_hill_raw SET policy_number=%s, insured_name=%s, effective_date=%s,'
                    ' transaction_type=%s, written_premium=%s, premium_amount=%s, del_toro_percent=%s,'
                    ' commission_amount=%s, form=%s, producing_agent=%s, submitted_agent=%s,'
                    ' compass_policy_id=%s, policy_status=%s, term_length=%s, producer_name=%s,'
                    ' franchise_number=%s, franchise_number_source=%s, office_id=%s, state=%s,'
                    ' source_data=%s WHERE id=%s', valores + (previo['id'],))
                updated += 1
            else:
                cursor.execute(
                    'INSERT INTO staging_hub.st_tower_hill_raw (policy_number, insured_name, effective_date,'
                    ' transaction_type, written_premium, premium_amount, del_toro_percent, commission_amount,'
                    ' form, producing_agent, submitted_agent, compass_policy_id, policy_status, term_length,'
                    ' producer_name, franchise_number, franchise_number_source,'
                    ' office_id, state, source_data, file_id, file_name, accounting_month, source_page, source_row)'
                    ' VALUES (' + ','.join(['%s'] * 25) + ')',
                    valores + (file_id, file_name, accounting, source_page, row['source_row']))
                inserted += 1
        connection.commit()
        return inserted, updated
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_tower_hill_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """Sin file_id en el snapshot, combina TODOS los archivos guardados de ese mes contable
    en un solo reparto (varios statements de TOWER HILL para un mismo mes se concilian juntos)."""
    cursor = connection.cursor(dictionary=True)
    try:
        base = 'SELECT r.* FROM staging_hub.st_tower_hill_raw r WHERE r.accounting_month=%s'
        if snapshot.get('file_id'):
            cursor.execute(base + ' AND r.file_id=%s ORDER BY r.id',
                           (snapshot['rows'][0]['accounting_month'], snapshot['file_id']))
        else:
            cursor.execute(base + ' ORDER BY r.id', (snapshot['rows'][0]['accounting_month'],))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de TOWER HILL para este mes.')
        for row in rows:
            row['carrier'] = 'TOWER HILL'
            row['policy_number'] = None if str(row.get('policy_number') or '').strip().upper() in ('', 'N/A') else row['policy_number']
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'statement'
            row['business_line'] = ''
            row['line_business_id'] = row.get('form')
            row['agent_name'] = row.get('producing_agent')
            row['code_lookup_alert'] = None if row.get('franchise_number') else (
                f"Póliza {row.get('policy_number') or 'sin número'}: sin franquicia en el histórico")
        cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                       ' FROM staging_hub.commission_rates WHERE carrier=%s', ('TOWER HILL',))
        tarifas = cursor.fetchall()
        calculated = calcular_comisiones_raw(rows, tarifas, 'TOWER HILL', state, business_line)
        for row in calculated:
            row['commission_alert'] = '; '.join(filter(None, (row.get('commission_alert'), row.get('code_lookup_alert')))) or None
        return calculated
    finally:
        cursor.close()

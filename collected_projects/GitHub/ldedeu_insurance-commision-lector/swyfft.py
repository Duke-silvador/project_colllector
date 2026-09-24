"""Lectura, importación y comisiones del statement SWYFFT."""
from datetime import date, datetime
from io import BytesIO
import re

from openpyxl import load_workbook
from excel_codigos import texto_celda


HEADERS = (
    'Producer Name', 'Producer Location ID', 'Sub Location', 'Producer Contact',
    'Invoice Number', 'InvoiceDate', 'Insured', 'Policy Number', 'Line Description',
    'Policy Effective Date', 'Transaction Type', 'Transaction Effective Date',
    'Premium Collected Date', 'Premium Collected', 'Commissions Paid',
)


def _normalizar(valor):
    return re.sub(r'\s+', '', str(valor or '')).casefold()


def detectar_encabezado(sheet):
    requeridos = {_normalizar(h) for h in HEADERS}
    for numero, fila in enumerate(sheet.iter_rows(values_only=True), 1):
        if requeridos <= {_normalizar(v) for v in fila if v is not None}:
            return numero
    raise ValueError('No se encontró el encabezado completo de SWYFFT en la primera hoja.')


def leer_statement(data, *, header=None):
    """Lee la primera hoja y conserva todos los campos, sin inferir reglas."""
    if header is not None and header < 1:
        raise ValueError('La fila de encabezados debe ser mayor que cero.')
    book = load_workbook(BytesIO(data), read_only=True, data_only=True)
    try:
        sheet = book.worksheets[0]
        if header is None:
            header = detectar_encabezado(sheet)
        labels = next(sheet.iter_rows(min_row=header, max_row=header, values_only=True), ())
        posiciones = {}
        for i, label in enumerate(labels):
            key = _normalizar(label)
            if not key:
                continue
            if key in posiciones:
                raise ValueError(f'Encabezado duplicado: {label}.')
            posiciones[key] = i
        missing = [h for h in HEADERS if _normalizar(h) not in posiciones]
        if missing:
            raise ValueError('Faltan columnas de SWYFFT: ' + ', '.join(missing))
        rows = []
        for number, cells in enumerate(sheet.iter_rows(min_row=header + 1), header + 1):
            if all(c.value is None for c in cells):
                continue
            row = {'Fila Excel': number}
            for label in HEADERS:
                cell = cells[posiciones[_normalizar(label)]]
                value = cell.value
                row[label] = (value.date().isoformat() if isinstance(value, datetime) else
                              value.isoformat() if isinstance(value, date) else texto_celda(cell))
            rows.append(row)
        if not rows:
            raise ValueError('La hoja no contiene registros debajo del encabezado.')
        return rows
    finally:
        book.close()


from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import json
from database import conectar
from importacion import nombres_archivo, calcular_file_id
import compass
from franquicias import resolver_franquicia, buscar_franquicia_historica, _formatear_codigo_oficina
from oficinas import cargar_mapa_office_numbers
from reparto_comisiones import calcular_comisiones_raw

SHEET_CARRIERS = {'SWYFFT': 'SWYFFT', 'SWYFFT_CHEQUE': 'SWYFFT'}
TRANSACTION_TYPES = {'new': 'NEW_BUSINESS', 'cancellation': 'CANCEL',
                     'reinstatement': 'REINSTATE', 'endorsement': 'ENDORSE'}


def normalizar_agency_id(value):
    code = str(value or '').strip()
    if not code:
        raise ValueError('Producer Location ID no puede estar vac?o.')
    return (code.lstrip('0') or '0') if code.isdigit() else code


def _es_total(source, registros):
    """Reconoce resúmenes sin descartar transacciones que carezcan de póliza."""
    importes = {'Premium Collected': 'premium_amount', 'Commissions Paid': 'commission_amount'}
    textos = [str(source.get(h) or '').strip() for h in HEADERS if h not in importes]
    etiquetas = {'total', 'totals', 'grand total', 'subtotal', 'sub total', 'total commissions', 'total premium'}
    presentes = [t for t in textos if t]
    if presentes:
        return all(t.casefold().rstrip(':').strip() in etiquetas for t in presentes)
    # Un total sin etiqueta solo se acepta si coincide con los registros leídos.
    if not registros:
        return False
    comprobados = 0
    for columna, campo in importes.items():
        valor = str(source.get(columna) or '').strip()
        if not valor:
            continue
        try:
            numero = Decimal(valor)
        except InvalidOperation:
            return False
        if numero != sum((Decimal(r[campo]) for r in registros), Decimal(0)):
            return False
        comprobados += 1
    return comprobados > 0


def preparar_statement(data, month, *, header=None):
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Indica el mes contable en formato YYYY-MM.')
    result = []
    for source in leer_statement(data, header=header):
        number = source['Fila Excel']
        original = {k: v for k, v in source.items() if k != 'Fila Excel'}
        policy = source['Policy Number'].strip()
        if not policy:
            if _es_total(source, result):
                continue
            detalle = ', '.join(f'{k}={v!r}' for k, v in original.items() if v)
            raise ValueError(f'Fila {number}: falta Policy Number. No se reconoció como total. Datos: {detalle}')
        tipo = TRANSACTION_TYPES.get(source['Transaction Type'].strip().casefold())
        if tipo is None:
            raise ValueError(f"Fila {number}: Transaction Type no reconocido: {source['Transaction Type']!r}.")
        effective = None
        for fmt in ('%Y-%m-%d', '%m/%d/%Y'):
            try:
                effective = datetime.strptime(source['Policy Effective Date'][:10], fmt).date().isoformat()
                break
            except ValueError:
                pass
        if effective is None:
            raise ValueError(f'Fila {number}: Policy Effective Date no es una fecha v?lida.')
        try:
            premium = Decimal(source['Premium Collected'])
            commission = Decimal(source['Commissions Paid'])
            if not premium.is_finite() or not commission.is_finite():
                raise InvalidOperation
            if not premium and commission:
                raise ValueError(f'Fila {number}: no se puede calcular porcentaje con prima cero y comisi?n distinta de cero.')
            rate = commission / premium if premium else Decimal(0)
        except InvalidOperation:
            raise ValueError(f'Fila {number}: prima o comisi?n inv?lida.') from None
        result.append(dict(carrier='SWYFFT', source_sheet='SWYFFT', source_row=number, source_data=original,
            accounting_month=month, policy_number=policy, insured_name=source['Insured'],
            effective_date=effective, producer_name=source['Producer Name'],
            producer_code=normalizar_agency_id(source['Producer Location ID']),
            transaction_type=tipo, transaction_type_source='statement',
            premium_amount=str(premium), commission_amount=str(commission),
            del_toro_percent=str(rate.quantize(Decimal('0.000000000000000001'), rounding=ROUND_HALF_UP)),
            del_toro_percent_source='calculated'))
    if not result:
        raise ValueError('La hoja no contiene pólizas para importar.')
    return result


# --- Statement de cheques (PDF con texto real o PDF/imagen con foto del cheque) -----------------
# SWYFFT puede pagar una parte por transferencia (el Excel de 15 columnas de arriba) y otra parte
# por cheque físico, cada cheque en su propio documento (PDF o foto). El talón del cheque trae
# una mini tabla propia, mucho mas pobre que el Excel: Producer Location Name | Loc. # |
# Insured Name | Policy Number | Account Number | Description | Gross Premium | Net Due | Paid
# Now. Se completan los campos de HEADERS que se pueden derivar de esa mini tabla y el resto
# queda vacío (no se inventa Sub Location, fechas de transaccion, etc.).
_PALABRAS_ENCABEZADO_CHEQUE = ('producer', 'insured', 'policy', 'gross', 'premium', 'paid', 'now')
_PALABRAS_BLOQUE_ENCABEZADO_CHEQUE = _PALABRAS_ENCABEZADO_CHEQUE + ('account', 'description', 'due', 'loc')
_PATRON_FILA_CHEQUE = re.compile(
    r'^(?P<producer>.+?)\s+(?P<loc>\d{2,8})\s+(?P<insured>.+?)\s+(?P<policy>[A-Za-z0-9][A-Za-z0-9-]{3,})$')
_PATRON_FECHA_CHEQUE = re.compile(r'(\d{1,2})/(\d{1,2})/(\d{4})')


def _es_formato_cheque(paginas):
    """El statement de cheque no trae ninguna de las columnas fijas del Excel (HEADERS); se
    reconoce por la mini tabla propia del talón."""
    for pagina in paginas:
        palabras = set(re.findall(r'[a-z]+', pagina['text'].casefold()))
        if all(p in palabras for p in _PALABRAS_ENCABEZADO_CHEQUE):
            return True
    return False


def _bloques_encabezado_cheque(bloques):
    return [b for b in bloques if any(p in b['text'].casefold() for p in _PALABRAS_BLOQUE_ENCABEZADO_CHEQUE)]


def _anclas_columnas_cheque(bloques_encabezado):
    anclas = {}
    for bloque in bloques_encabezado:
        normal = bloque['text'].casefold()
        for clave, palabra in (('description', 'description'), ('premium', 'premium'), ('paid', 'paid')):
            if palabra in normal and clave not in anclas:
                anclas[clave] = bloque['x']
    return anclas


def _columna_mas_cercana(x, anclas):
    if not anclas:
        return None
    return min(anclas, key=lambda clave: abs(x - anclas[clave]))


def _fecha_cheque_pagina(pagina):
    """La única fecha visible en el talón es la del cheque (emisión), no la de la póliza; se usa
    como último recurso para Policy Effective Date cuando la fila no trae otra."""
    for bloque in sorted(pagina['blocks'], key=lambda b: b['y']):
        match = _PATRON_FECHA_CHEQUE.search(bloque['text'])
        if match:
            mes, dia, anio = match.groups()
            try:
                return date(int(anio), int(mes), int(dia)).isoformat()
            except ValueError:
                continue
    return None


def _agrupar_filas_cheque(bloques):
    filas = []
    actual = []
    y_previo = None
    for bloque in sorted(bloques, key=lambda b: b['y']):
        if y_previo is not None and bloque['y'] - y_previo > 0.02:
            filas.append(actual)
            actual = []
        actual.append(bloque)
        y_previo = bloque['y']
    if actual:
        filas.append(actual)
    return filas


def _fila_cheque_a_valores(fila, anclas, numero):
    identidad = None
    resto = []
    for bloque in fila:
        texto = ' '.join(bloque['text'].split())
        match = _PATRON_FILA_CHEQUE.match(texto)
        if match and identidad is None:
            identidad = match
        else:
            resto.append(bloque)
    if identidad is None:
        texto_unido = ' '.join(' '.join(b['text'].split()) for b in sorted(fila, key=lambda b: b['x']))
        identidad = _PATRON_FILA_CHEQUE.match(texto_unido)
        if identidad is not None:
            resto = []
    if identidad is None:
        raise ValueError(f'Fila {numero}: no se pudo identificar Producer/Loc.#/Insured/Policy Number en el cheque.')
    valores = {h: '' for h in HEADERS}
    valores['Producer Name'] = identidad['producer'].strip()
    valores['Producer Location ID'] = identidad['loc'].strip()
    valores['Insured'] = identidad['insured'].strip()
    valores['Policy Number'] = identidad['policy'].strip()
    for bloque in resto:
        columna = _columna_mas_cercana(bloque['x'], anclas)
        texto = bloque['text'].strip()
        if columna == 'description':
            valores['Transaction Type'] = texto
        elif columna == 'premium':
            valores['Premium Collected'] = texto.lstrip('$').replace(',', '')
        elif columna == 'paid':
            valores['Commissions Paid'] = texto.lstrip('$').replace(',', '')
    valores['Fila Excel'] = numero
    return valores


def extraer_filas_pagina_cheque(pagina, numero_base):
    """Devuelve las filas (formato HEADERS) de la mini tabla del talón en esta página, con los
    campos que no se pueden derivar del cheque en blanco.

    El talón trae, debajo de la tabla, una copia completa del cheque (para el archivo del
    banco), repitiendo el nombre de la compañía, el banco y el monto -sin la tabla, pero en la
    misma página-. En vez de reconocer esa copia por su texto (varía de un banco/memo a otro),
    se corta apenas aparece un salto vertical grande respecto a la fila anterior: las filas
    reales de la tabla estan siempre pegadas al encabezado y entre ellas."""
    bloques = pagina['blocks']
    encabezado = _bloques_encabezado_cheque(bloques)
    if not encabezado:
        return []
    anclas = _anclas_columnas_cheque(encabezado)
    y_encabezado = max(b['y'] for b in encabezado)
    posteriores = [b for b in bloques if b['y'] > y_encabezado]
    filas = []
    y_previo = y_encabezado
    for fila in _agrupar_filas_cheque(posteriores):
        y_inicio = min(b['y'] for b in fila)
        if y_inicio - y_previo > 0.05:
            break
        filas.append(fila)
        y_previo = max(b['y'] for b in fila)
    resultado = []
    for numero, fila in enumerate(filas, numero_base):
        resultado.append(_fila_cheque_a_valores(fila, anclas, numero))
    return resultado


def _convertir_fila_cheque(fila, month, fecha_cheque):
    """Version tolerante de la conversion de preparar_statement: solo exige lo indispensable
    para calcular la comision (póliza, tipo, prima, comisión); el resto de HEADERS puede llegar
    vacío porque el talón del cheque no lo trae."""
    numero = fila['Fila Excel']
    original = {k: v for k, v in fila.items() if k != 'Fila Excel'}
    policy = fila['Policy Number'].strip()
    if not policy:
        raise ValueError(f'Fila {numero}: falta Policy Number en el statement de cheques.')
    producer_id = fila['Producer Location ID'].strip()
    if not producer_id:
        raise ValueError(f'Fila {numero}: falta Producer Location ID (Loc. #) en el statement de cheques.')
    tipo_texto = fila['Transaction Type'].strip()
    tipo = TRANSACTION_TYPES.get(tipo_texto.casefold())
    if tipo is None:
        raise ValueError(f'Fila {numero}: Transaction Type no reconocido en el cheque: {tipo_texto!r}.')
    effective = fecha_cheque
    if effective is None:
        raise ValueError(f'Fila {numero}: no se encontró ninguna fecha en el cheque para esta fila.')
    try:
        premium = Decimal(fila['Premium Collected'])
        commission = Decimal(fila['Commissions Paid'])
        if not premium.is_finite() or not commission.is_finite():
            raise InvalidOperation
        if not premium and commission:
            raise ValueError(f'Fila {numero}: no se puede calcular porcentaje con prima cero y comisión distinta de cero.')
        rate = commission / premium if premium else Decimal(0)
    except InvalidOperation:
        raise ValueError(f'Fila {numero}: prima o comisión inválida en el cheque.') from None
    return dict(carrier='SWYFFT', source_sheet='SWYFFT_CHEQUE', source_row=numero, source_data=original,
        accounting_month=month, policy_number=policy, insured_name=fila['Insured'],
        effective_date=effective, producer_name=fila['Producer Name'],
        producer_code=normalizar_agency_id(producer_id),
        transaction_type=tipo, transaction_type_source='cheque',
        premium_amount=str(premium), commission_amount=str(commission),
        del_toro_percent=str(rate.quantize(Decimal('0.000000000000000001'), rounding=ROUND_HALF_UP)),
        del_toro_percent_source='calculated')


def preparar_statement_cheque(paginas, month):
    """Como preparar_statement, pero a partir de páginas ya leídas (documentos.paginas_documento)
    de un talón de cheque de SWYFFT en vez de un Excel."""
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Indica el mes contable en formato YYYY-MM.')
    resultado = []
    numero = 1
    for pagina in paginas:
        fecha_cheque = _fecha_cheque_pagina(pagina)
        filas = extraer_filas_pagina_cheque(pagina, numero)
        for fila in filas:
            resultado.append(_convertir_fila_cheque(fila, month, fecha_cheque))
        numero += len(filas)
    if not resultado:
        raise ValueError('No se detectaron filas del statement de cheques en el documento.')
    return resultado


def _db_fecha(value):
    """Convierte fechas de Compass a DATE conservando el día recibido."""
    if value is None or value == '':
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value).strip().replace('Z', '+00:00')).date()
    except ValueError:
        raise ValueError(f'Fecha inválida recibida para guardar en SQL: {value!r}.') from None


def guardar_statement(rows, uploaded_name, contenido):
    """Guarda las columnas originales de todas las hojas en una transacción.

    La identidad incluye la hoja y fila para conservar pólizas repetidas.
    Un reintento idéntico no duplica; un fichero modificado no se mezcla.
    file_id se calcula del CONTENIDO del archivo (no del nombre): el mismo statement subido
    con otro nombre se reconoce igual como ya importado, en vez de duplicarse.
    """
    if not rows:
        raise ValueError('No hay registros para importar.')
    file_name, _ = nombres_archivo(uploaded_name)
    file_id = calcular_file_id(contenido)
    month = rows[0]['accounting_month']
    if any(r['accounting_month'] != month or r['source_sheet'] not in SHEET_CARRIERS
           or r['carrier'] != SHEET_CARRIERS[r['source_sheet']] for r in rows):
        raise ValueError('El mes o carrier no coincide con las hojas del statement.')
    date_month = datetime.strptime(month, '%Y-%m').date()
    def payload(r):
        return json.dumps(r['source_data'], ensure_ascii=False, sort_keys=True)
    expected = {(r['source_sheet'], r['source_row']): r for r in rows}
    if len(expected) != len(rows):
        raise ValueError('Hay identidades de hoja y fila duplicadas.')
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        cursor.execute("SELECT GET_LOCK('staging_hub.st_swyfft_raw.import', 10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importación de SWYFFT en curso.')
        cursor.execute('SELECT source_sheet, source_row, source_data FROM staging_hub.st_swyfft_raw'
                       ' WHERE file_id=%s AND accounting_month=%s FOR UPDATE', (file_id, date_month))
        existing = cursor.fetchall()
        found = set()
        for r in existing:
            key = (r['source_sheet'], r['source_row'])
            source = json.loads(r['source_data']) if isinstance(r['source_data'], str) else r['source_data']
            if key not in expected or source != expected[key]['source_data']:
                raise ValueError('El fichero difiere de registros ya guardados; no se mezclaron versiones.')
            found.add(key)
        pendientes = [r for key, r in expected.items() if key not in found]
        completar_franquicias(connection, pendientes)
        for key, r in expected.items():
            if key in found:
                continue
            cursor.execute('INSERT INTO staging_hub.st_swyfft_raw'
                           ' (file_id, file_name, accounting_month, carrier, source_sheet, source_row,'
                           ' source_data, policy_number, insured_name, eff_date, transaction_type, statement_rate,'
                           ' premium, commission_amount, producer_name, producer_code, franchise_number, office_id,'
                           ' compass_policy_id, policy_status, policy_effective_date, line_business_id, term_length, franchise_number_source, comm_percent)'
                           ' VALUES (' + ','.join(['%s'] * 25) + ')',
                           (file_id, file_name, date_month, r['carrier'], r['source_sheet'], r['source_row'],
                            payload(r), r['policy_number'], r['insured_name'], _db_fecha(r['effective_date']),
                            r['transaction_type'], r['del_toro_percent'],
                            _db_decimal(r['premium_amount']), _db_decimal(r['commission_amount']),
                            r['producer_name'], r['producer_code'], r.get('franchise_number'), r.get('office_id'),
                            r.get('compass_policy_id'), r.get('policy_status'), _db_fecha(r.get('policy_effective_date')),
                            r.get('line_business_id'), r.get('term_length'), r.get('franchise_number_source'),
                            _db_decimal(r['del_toro_percent'])))
        connection.commit()
        return len(expected) - len(found)
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_swyfft_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()


def _db_decimal(value):
    number = Decimal(str(value))
    fraction = format(number, 'f').partition('.')[2].rstrip('0')
    if not number.is_finite() or abs(number) >= Decimal(10) ** 20 or len(fraction) > 18:
        raise ValueError('El importe no cabe exactamente en DECIMAL(38,18); no se redondeó.')
    return number


def completar_franquicias(connection, rows):
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT office_id, office_number, office_name, state FROM staging_hub.offices')
        directorio = cursor.fetchall()
    finally:
        cursor.close()
    oficinas = {str(o['office_id']).strip(): o['office_number'] for o in directorio}
    token = None
    cache = {}
    history_cache = {}
    for row in rows:
        source = row.get('source_data') or {}
        if isinstance(source, str):
            source = json.loads(source)
        location = str(source.get('Sub Location') or '').strip()
        normalizada = ' '.join(location.casefold().split())
        matches = {}
        for office in directorio:
            nombre = ' '.join(str(office.get('office_name') or '').casefold().split())
            numero_oficina = _formatear_codigo_oficina(office.get('office_number'))
            if nombre and numero_oficina and nombre in normalizada:
                matches.setdefault(numero_oficina, []).append(office)
        if len(matches) == 1:
            row['franchise_number'], candidatas = next(iter(matches.items()))
            row['franchise_number_source'] = 'sub_location'
            row['code_lookup_alert'] = None
            office = candidatas[0] if len(candidatas) == 1 else None
            row['office_id'] = str(office['office_id']).strip() if office else None
            row['office_number'] = office.get('office_number') if office else None
            row['state'] = (office.get('state') or row.get('state')) if office else row.get('state')
            continue
        if matches:
            row['code_lookup_alert'] = f'Sub Location ambiguo para SWYFFT: {location!r} coincide con varias franquicias'
        else:
            row['code_lookup_alert'] = f'Sub Location sin coincidencia de franquicia para SWYFFT: {location!r}'
        if token is None:
            token = compass.obtener_token()
        numero = row['policy_number']
        if numero not in cache:
            cache[numero] = compass.buscar_poliza(token, numero)
        poliza = cache[numero]
        row['office_id'] = str(poliza.get('office_id') or '').strip() or None if poliza else None
        row['office_number'] = oficinas.get(row['office_id'])
        row['compass_office_number'] = row['office_number'] if poliza else None
        row['compass_policy_id'] = poliza.get('policy_id') if poliza else None
        row['policy_status'] = poliza.get('status_id') if poliza else None
        row['policy_effective_date'] = poliza.get('effective_date') if poliza else None
        row['line_business_id'] = poliza.get('line_business_id') if poliza else None
        if poliza:
            from calculos import calcular_term_length
            row['term_length'] = calcular_term_length(poliza.get('effective_date'), poliza.get('expiration_date'))
        def historic(policy):
            if policy not in history_cache:
                history_cache[policy] = buscar_franquicia_historica(connection, policy)
            return history_cache[policy]
        row['franchise_number'] = resolver_franquicia({}, row['carrier'], row['producer_name'], numero,
            lambda _: row['office_id'], oficinas, row['producer_code'], set(),
            buscar_historico=historic if poliza is None else None)
        if poliza is None and history_cache.get(numero) and row['franchise_number'] == history_cache[numero]:
            row['franchise_number_source'] = 'historico'
        else:
            row['franchise_number_source'] = 'compass'
        row['compass_franchise_number'] = row['franchise_number'] if poliza else None
        if row.get('franchise_number'):
            row['code_lookup_alert'] = None


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """Sin file_id en el snapshot, combina TODOS los archivos guardados de ese mes contable en
    un solo reparto: SWYFFT puede llegar en varios ficheros (el Excel de transferencia y uno o
    más talones de cheque), pero se concilia y exporta como un único statement, no uno por
    archivo."""
    cursor = connection.cursor(dictionary=True)
    try:
        base = ('SELECT r.*, r.premium AS premium_amount, r.eff_date AS effective_date,'
                ' r.statement_rate AS del_toro_percent, o.state, o.office_number'
                ' FROM staging_hub.st_swyfft_raw r LEFT JOIN staging_hub.offices o ON o.office_id=r.office_id'
                ' WHERE r.accounting_month=%s')
        if snapshot.get('file_id'):
            cursor.execute(base + ' AND r.file_id=%s ORDER BY r.id',
                           (snapshot['rows'][0]['accounting_month'], snapshot['file_id']))
        else:
            cursor.execute(base + ' ORDER BY r.id', (snapshot['rows'][0]['accounting_month'],))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados para este mes contable.')
        completar_franquicias(connection, rows)
        for row in rows:
            row['del_toro_percent_source'] = 'calculated'
            row['transaction_type_source'] = 'statement' if row.get('transaction_type') else None
        cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                       ' FROM staging_hub.commission_rates WHERE carrier=%s', ('SWYFFT',))
        rates = cursor.fetchall()
        calculated = [calcular_comisiones_raw([r], rates, 'SWYFFT', state, business_line)[0] for r in rows]
        for row in calculated:
            if row.get('franchise_number'):
                row['code_lookup_alert'] = None
            row['commission_alert'] = '; '.join(filter(None, (row.get('commission_alert'), row.get('code_lookup_alert')))) or None
        return calculated
    finally:
        cursor.close()

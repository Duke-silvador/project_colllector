"""Statement Excel ASSURANCE: franquicia por codigo de productor, Compass e historico.

Comm.% no viene en el statement crudo (a diferencia de BASS): se calcula aqui como
Amount / Premiums, salvo en ajustes sin poliza (Premiums=0) donde se deja en 1.0,
igual a como quedaron las filas historicas ya existentes en st_assurance_raw.
"""
import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO

import compass
from requests import RequestException
from openpyxl import load_workbook
from mysql.connector import Error as MySQLError

from database import conectar
from importacion import nombres_archivo, calcular_file_id
from swyfft import normalizar_agency_id
from franquicias import _formatear_codigo_oficina, buscar_franquicia_historica
from reparto_comisiones import calcular_comisiones_raw

HEADERS = ('StatementDate', 'StatementPeriod', 'Producer', 'InsuredName', 'PolicyNumber',
           'Premiums', 'Type', 'TransEffDate', 'PolicyExpDate', 'Amount')
OPTIONAL_HEADERS = ('AddDate',)


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
    raise ValueError('No se encontró el encabezado completo de ASSURANCE en la primera hoja.')


def preparar_statement(data, month, *, header=None):
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
            raise ValueError('Faltan columnas de ASSURANCE.')
        headers = HEADERS + tuple(h for h in OPTIONAL_HEADERS if _normalizar_encabezado(h) in positions)
        for number, cells in enumerate(sheet.iter_rows(min_row=header + 1), header + 1):
            if all(cell.value is None for cell in cells):
                continue
            source = {}
            for h in headers:
                value = cells[positions[_normalizar_encabezado(h)]].value
                source[h] = value.isoformat() if isinstance(value, (date, datetime)) else ('' if value is None else str(value))
            try:
                premium = Decimal(str(source['Premiums']))
                commission = Decimal(str(source['Amount']))
                if not premium.is_finite() or not commission.is_finite():
                    raise InvalidOperation
            except InvalidOperation:
                raise ValueError(f'Fila {number}: Premiums o Amount inválido.') from None
            if premium:
                rate = commission / premium
            elif commission:
                rate = Decimal('1')
            else:
                rate = Decimal('0')
            try:
                effective = _fecha_celda(cells[positions[_normalizar_encabezado('TransEffDate')]].value)
            except ValueError as exc:
                raise ValueError(f'Fila {number}: TransEffDate {exc}') from None
            policy_raw = source['PolicyNumber'].strip()
            policy = '' if policy_raw.upper() in ('', 'N/A') else policy_raw
            result.append(dict(
                source_row=number, source_data=source, accounting_month=month,
                policy_number=policy, insured_name=source['InsuredName'].strip(),
                effective_date=effective, producer_code=normalizar_agency_id(source['Producer']),
                transaction_type=source['Type'].strip(), transaction_type_source='statement',
                premium_amount=str(premium), commission_amount=str(commission),
                del_toro_percent=str(rate.quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)),
                del_toro_percent_source='statement',
                statement_date=_fecha_celda(cells[positions[_normalizar_encabezado('StatementDate')]].value),
                statement_period=_fecha_celda(cells[positions[_normalizar_encabezado('StatementPeriod')]].value),
                policy_exp_date=_fecha_celda(cells[positions[_normalizar_encabezado('PolicyExpDate')]].value),
            ))
        if not result:
            raise ValueError('No hay filas para importar.')
        return result
    finally:
        book.close()


def guardar_statement(rows, uploaded_name, contenido):
    """Igual a los demas: reintento identico no duplica. A diferencia de swyfft/granada,
    si una fila cambio (se corrigio algo) se actualiza en vez de bloquear toda la pagina.
    file_id se calcula del CONTENIDO del archivo (no del nombre): el mismo statement subido
    con otro nombre se reconoce igual como ya importado, en vez de duplicarse."""
    if not rows:
        raise ValueError('No hay registros para importar.')
    nombres_archivo(uploaded_name)  # valida que el nombre sea utilizable
    file_id = calcular_file_id(contenido)
    month = rows[0]['accounting_month']
    if any(r['accounting_month'] != month for r in rows):
        raise ValueError('El mes no coincide entre las filas del statement.')
    date_month = datetime.strptime(month, '%Y-%m').date()
    payloads = {r['source_row']: json.dumps(r['source_data'], ensure_ascii=False, sort_keys=True) for r in rows}
    if len(payloads) != len(rows):
        raise ValueError('Hay filas con la misma posición de origen.')
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        cursor.execute("SELECT GET_LOCK('staging_hub.st_assurance_raw.import', 10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importación de ASSURANCE en curso.')
        cursor.execute('SELECT id, source_row, source_data FROM staging_hub.st_assurance_raw'
                       ' WHERE file_id=%s AND accounting_month=%s AND source_row IS NOT NULL FOR UPDATE',
                       (file_id, date_month))
        existentes = {r['source_row']: r for r in cursor.fetchall()}
        for number in existentes:
            if number not in payloads:
                raise ValueError('Este archivo tiene menos filas que la versión ya guardada; no se eliminó nada.')
        def sin_cambios(row):
            previo = existentes.get(row['source_row'])
            if previo is None:
                return False
            guardado = json.loads(previo['source_data']) if isinstance(previo['source_data'], str) else previo['source_data']
            return guardado == row['source_data']
        completar_franquicias(connection, [r for r in rows if not sin_cambios(r)])
        inserted = updated = 0
        for row in rows:
            number = row['source_row']
            previo = existentes.get(number)
            if sin_cambios(row):
                continue
            valores = (
                row['statement_date'], row['statement_period'], row['producer_code'],
                row['insured_name'], row['policy_number'] or 'N/A', row['premium_amount'],
                row['transaction_type'], row['effective_date'], row['policy_exp_date'],
                row['commission_amount'], row['del_toro_percent'], payloads[number],
                row.get('franchise_number'), row.get('franchise_number_source'), row.get('office_id'),
                row.get('state'), row.get('agent_name'), row.get('term_length'),
                row.get('compass_policy_id'), row.get('policy_status'),
            )
            if previo is not None:
                cursor.execute(
                    'UPDATE staging_hub.st_assurance_raw SET StatementDate=%s, StatementPeriod=%s, Producer=%s,'
                    ' InsuredName=%s, PolicyNumber=%s, Premiums=%s, Type=%s, TransEffDate=%s, PolicyExpDate=%s,'
                    ' Amount=%s, `Comm.%`=%s, source_data=%s, franchise_number=%s, franchise_number_source=%s,'
                    ' office_id=%s, state=%s, agent_name=%s, term_length=%s, compass_policy_id=%s, policy_status=%s'
                    ' WHERE id=%s', valores + (previo['id'],))
                updated += 1
            else:
                cursor.execute(
                    'INSERT INTO staging_hub.st_assurance_raw (SourceName, FileName, file_id, source_row,'
                    ' accounting_month, StatementDate, StatementPeriod, Producer, InsuredName, PolicyNumber,'
                    ' Premiums, Type, TransEffDate, PolicyExpDate, Amount, `Comm.%`, source_data, franchise_number,'
                    ' franchise_number_source, office_id, state, agent_name, term_length, compass_policy_id,'
                    ' policy_status) VALUES (' + ','.join(['%s'] * 25) + ')',
                    (uploaded_name, uploaded_name, file_id, number, date_month) + valores)
                inserted += 1
        connection.commit()
        return inserted, updated
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_assurance_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()


def variantes_poliza_assurance(numero):
    """El sufijo de edicion en el statement (PFL2502455-02) no siempre coincide con el que
    tiene Compass. Se prueba, en este orden: el numero tal cual llega; decrementando la misma
    edicion (mismo formato de dos digitos) hasta 0 (ej. -02 -> -01 -> -00); sin ningun sufijo;
    decrementando otra vez pero sin ceros a la izquierda (ej. -2 -> -1 -> -0); y por ultimo
    incrementando (con y sin ceros), por si la edicion real es mayor a la que trae el statement."""
    numero = str(numero or '').strip().upper()
    coincide = re.fullmatch(r'(.+)-(\d+)', numero)
    if not coincide:
        variantes = [numero]
        for edicion in range(0, 6):
            variantes.append(f'{numero}-{edicion:02d}')
            variantes.append(f'{numero}-{edicion}')
        return list(dict.fromkeys(v for v in variantes if v))
    base, sufijo_texto = coincide.group(1), coincide.group(2)
    sufijo = int(sufijo_texto)
    variantes = [numero]
    for edicion in range(sufijo - 1, -1, -1):
        variantes.append(f'{base}-{edicion:02d}')
    variantes.append(base)
    for edicion in range(sufijo, -1, -1):
        variantes.append(f'{base}-{edicion:02d}')
        variantes.append(f'{base}-{edicion}')
    for edicion in range(sufijo + 1, sufijo + 6):
        variantes.append(f'{base}-{edicion:02d}')
        variantes.append(f'{base}-{edicion}')
    return list(dict.fromkeys(v for v in variantes if v))


def _codigo_alias(office):
    alias = str(office.get('franchise_alias') or '').strip()
    return 'DTF' + alias.zfill(4) if alias else None


def _coincide_oficina(office, franquicia):
    """Una franquicia puede referirse al numero de oficina o a su alias
    (sub-locations: ej. DTF0188-0112 para la oficina 188)."""
    if not franquicia:
        return False
    return (_formatear_codigo_oficina(office.get('office_number')) == franquicia
            or _codigo_alias(office) == franquicia)


def _franquicias_vistas(connection, rows, producer_code):
    """Franquicias que este mismo codigo ya mostro, en esta tanda o en importaciones
    guardadas antes."""
    vistas = {str(r.get('franchise_number') or '').strip().upper()
              for r in rows
              if normalizar_agency_id(r.get('producer_code') or '').casefold()
                 == normalizar_agency_id(producer_code).casefold() and r.get('franchise_number')}
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT DISTINCT franchise_number FROM staging_hub.st_assurance_raw'
                       ' WHERE UPPER(Producer)=UPPER(%s) AND franchise_number IS NOT NULL', (producer_code,))
        vistas |= {str(r['franchise_number']).strip().upper() for r in cursor.fetchall()}
    finally:
        cursor.close()
    vistas.discard('')
    return vistas


def _franquicia_observada(connection, rows, producer_code):
    """Ultimo respaldo: si el codigo ya mostro una unica franquicia, se usa esa en vez de
    dejar la fila sin franquicia. Si aparece con franquicias distintas, no se adivina: se
    devuelve la lista para que el llamador deje una alerta de ambiguedad en vez de la
    generica de 'no encontrada'."""
    vistas = _franquicias_vistas(connection, rows, producer_code)
    if len(vistas) == 1:
        return next(iter(vistas)), None
    if len(vistas) > 1:
        return None, sorted(vistas)
    return None, None


def completar_franquicias(connection, rows):
    """Codigo master -> Compass -> historico. Codigo normal -> tabla de codigos directo."""
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT code, franchise, is_master_code FROM staging_hub.franchises_carrier_codes'
                       ' WHERE UPPER(TRIM(carrier))=%s', ('ASSURANCE',))
        codes = {}
        masters = set()
        for entry in cursor.fetchall():
            code = normalizar_agency_id(entry['code']).casefold()
            franchise = str(entry.get('franchise') or '').strip().upper()
            if entry.get('is_master_code'):
                masters.add(code)
                continue
            if franchise and not franchise.startswith('DT'):
                franchise = _formatear_codigo_oficina(franchise) or franchise
            codes.setdefault(code, set()).add(franchise)
        cursor.execute('SELECT office_id, office_number, state, franchise_alias FROM staging_hub.offices')
        offices = cursor.fetchall()
    finally:
        cursor.close()
    token = None
    polizas = {}

    def intentar_observado(row, mensaje_no_encontrado):
        franquicia_previa, ambiguas = _franquicia_observada(connection, rows, row['producer_code'])
        if franquicia_previa:
            office = next((o for o in offices if _coincide_oficina(o, franquicia_previa)), None)
            row.update(franchise_number=franquicia_previa, franchise_number_source='codigo_observado',
                       office_id=str(office['office_id']) if office else None,
                       state=office.get('state') if office else None, code_lookup_alert=None)
        elif ambiguas:
            row['code_lookup_alert'] = (f'{row["producer_code"]}: aparece con franquicias distintas en otras filas '
                                        f'({", ".join(ambiguas)}); revisa el código')
        else:
            row['code_lookup_alert'] = mensaje_no_encontrado

    for row in rows:
        code = normalizar_agency_id(row['producer_code']).casefold()
        _completar_historico_reporte(connection, row)
        franquicia_directa = None
        if code not in masters:
            matches = codes.get(code, set())
            franquicia_directa = next(iter(matches)) if len(matches) == 1 and '' not in matches else None
        if franquicia_directa:
            office = next((o for o in offices if _coincide_oficina(o, franquicia_directa)), None)
            row.update(franchise_number=franquicia_directa, franchise_number_source='codigos',
                       office_id=str(office['office_id']) if office else None,
                       state=office.get('state') if office else None, code_lookup_alert=None)
            continue
        # Codigo master, o codigo sin franquicia unica en la tabla: se intenta por la
        # poliza en Compass y, si tampoco esta ahi, en el historico.
        row.update(franchise_number=None, franchise_number_source=None, office_id=None, state=None,
                   compass_policy_id=None, policy_status=None)
        numero = row['policy_number']
        if not numero:
            intentar_observado(row, f'{row["producer_code"]}: sin franquicia única por código y sin póliza para consultar Compass')
            continue
        try:
            if token is None:
                token = compass.obtener_token()
            if numero not in polizas:
                encontrada = None
                for variante in variantes_poliza_assurance(numero):
                    encontrada = compass.buscar_poliza(token, variante)
                    if encontrada is not None:
                        break
                polizas[numero] = encontrada
            poliza = polizas[numero]
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
                    intentar_observado(row, f'{row["producer_code"]}: póliza {numero} sin franquicia en la tabla de códigos, Compass ni histórico')
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
                intentar_observado(row, f'{row["producer_code"]}: no se pudo determinar la franquicia de la póliza {numero} en Compass')
        except (RequestException, MySQLError, ValueError, TypeError, KeyError):
            intentar_observado(row, f'{row["producer_code"]}: error al consultar Compass/histórico para la póliza {numero}')


def codigos_pendientes_de_registrar(connection):
    """Codigos de productor resueltos por Compass/historico/codigo_observado (no por la
    tabla), agrupados por codigo. Con una sola franquicia consistente se pueden registrar
    directo; con varias, es ambiguo (probablemente un codigo master real) y se marca para
    revision en vez de sugerir un registro automatico."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT Producer AS code, GROUP_CONCAT(DISTINCT franchise_number ORDER BY franchise_number SEPARATOR ', ') AS franquicias,"
            ' COUNT(DISTINCT franchise_number) AS distintas, COUNT(*) AS filas,'
            " GROUP_CONCAT(DISTINCT state ORDER BY state SEPARATOR ', ') AS estados"
            " FROM staging_hub.st_assurance_raw WHERE franchise_number IS NOT NULL"
            " AND franchise_number_source IN ('compass','historico','codigo_observado')"
            ' GROUP BY Producer ORDER BY distintas DESC, Producer')
        agrupado = cursor.fetchall()
        cursor.execute("SELECT DISTINCT UPPER(TRIM(code)) AS code FROM staging_hub.franchises_carrier_codes"
                       " WHERE UPPER(TRIM(carrier))='ASSURANCE'")
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
                       " WHERE UPPER(TRIM(carrier))='ASSURANCE' AND UPPER(TRIM(code))=UPPER(%s)", (code,))
        if cursor.fetchone():
            raise ValueError(f'El código {code} ya está registrado para ASSURANCE.')
        cursor.execute(
            'INSERT INTO staging_hub.franchises_carrier_codes'
            ' (file_name, franchise_name, franchise_soffront_name, carrier, code, agent_name, franchise, state_code)'
            ' VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
            (f'Registrado desde ASSURANCE por {changed_by} (resuelto por Compass/histórico)',
             '', '', 'ASSURANCE', code, '', franchise, state))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def _completar_historico_reporte(connection, row):
    """agent_name/term_length son solo informativos: se toman del histórico si existe."""
    numero = str(row.get('policy_number') or '').strip()
    if not numero:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT agent_name, term_length FROM staging_hub.historic_data_commissions'
                       " WHERE carrier='ASSURANCE' AND policy_number=%s AND NULLIF(TRIM(agent_name), '') IS NOT NULL"
                       ' ORDER BY report_month DESC, date DESC LIMIT 1', (numero,))
        registro = cursor.fetchone()
    finally:
        cursor.close()
    if registro:
        row['agent_name'] = registro.get('agent_name') or None
        row['term_length'] = registro.get('term_length') or None


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """Sin file_id en el snapshot, combina TODOS los archivos guardados de ese mes contable
    en un solo reparto (varios statements de ASSURANCE para un mismo mes se concilian juntos)."""
    cursor = connection.cursor(dictionary=True)
    try:
        # Premiums/Amount/Comm.% son DOUBLE en la tabla; se leen forzadas a DECIMAL para
        # que el driver devuelva Decimal en vez de float y no arrastrar imprecision binaria.
        base = ('SELECT r.*, CAST(r.Premiums AS DECIMAL(14,2)) AS premium_amount,'
                ' CAST(r.Amount AS DECIMAL(14,2)) AS commission_amount,'
                ' CAST(r.`Comm.%` AS DECIMAL(9,6)) AS del_toro_percent, r.PolicyNumber AS policy_number,'
                ' r.InsuredName AS insured_name, r.Producer AS producer_code, r.Type AS transaction_type,'
                ' r.TransEffDate AS effective_date FROM staging_hub.st_assurance_raw r WHERE r.accounting_month=%s')
        if snapshot.get('file_id'):
            cursor.execute(base + ' AND r.file_id=%s ORDER BY r.id',
                           (snapshot['rows'][0]['accounting_month'], snapshot['file_id']))
        else:
            cursor.execute(base + ' ORDER BY r.id', (snapshot['rows'][0]['accounting_month'],))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de ASSURANCE para este mes.')
        for row in rows:
            row['carrier'] = 'ASSURANCE'
            row['policy_number'] = None if str(row.get('policy_number') or '').strip().upper() in ('', 'N/A') else row['policy_number']
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'statement'
            row['business_line'] = ''
            row['code_lookup_alert'] = None if row.get('franchise_number') else (
                f"Franquicia {row.get('franchise_number') or 'sin determinar'}: sin resolver para esta fila")
        cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                       ' FROM staging_hub.commission_rates WHERE carrier=%s', ('ASSURANCE',))
        tarifas = cursor.fetchall()
        calculated = calcular_comisiones_raw(rows, tarifas, 'ASSURANCE', state, business_line)
        for row in calculated:
            row['commission_alert'] = '; '.join(filter(None, (row.get('commission_alert'), row.get('code_lookup_alert')))) or None
        return calculated
    finally:
        cursor.close()

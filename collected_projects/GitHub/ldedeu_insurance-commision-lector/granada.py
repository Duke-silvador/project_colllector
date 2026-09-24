"""Statement Excel GRANADA: conserva Edition y el agente del archivo."""
from datetime import datetime, date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
import json
import re
import compass
from requests import RequestException
from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel
from excel_codigos import texto_celda
from database import conectar
from importacion import nombres_archivo, calcular_file_id
from swyfft import _db_fecha, _db_decimal, normalizar_agency_id
from franquicias import _formatear_codigo_oficina, buscar_franquicia_historica
from mysql.connector import Error as MySQLError
from reparto_comisiones import completar_del_toro_statement

HEADERS = ('PolicyNo', 'Edition', 'NamedInsured', 'AgencyCode', 'AgentName',
           'TransactionType', 'ChangeEffdate', 'WrittenPremium', 'Commission')
SHEET_CARRIERS = {'GRANADA': 'GRANADA'}
TRANSACTION_TYPES = {'renewal': 'RENEWAL', 'cancellation': 'CANCEL',
                     'reinstatement': 'REINSTATE', 'endorsement': 'ENDORSE',
                     'new business': 'NEW_BUSINESS'}


def _normalizar(value):
    return re.sub(r'\s+', '', str(value or '')).casefold()


def numero_poliza_compass(policy_number, edition):
    """PolicyNo-Edition, limpiando cada componente antes de unirlos."""
    partes = [''.join(character for character in str(value if value is not None else '')
                      if character.isalnum()).upper() for value in (policy_number, edition)]
    return '-'.join(partes) if partes[1] else partes[0]


def variantes_poliza_compass(policy_number, edition):
    numero = numero_poliza_compass(policy_number, edition)
    if '-' not in numero:
        return [numero]
    poliza, edicion = numero.split('-', 1)
    return [f'{poliza}{separador}{edicion}' for separador in ('-', ' - ', '- ', ' -')]


def interpretar_fecha(value, epoch):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            converted = from_excel(value, epoch)
            if isinstance(converted, datetime):
                return converted.date().isoformat()
        except (ValueError, OverflowError):
            pass
    text = str(value or '').strip()
    try:
        return datetime.fromisoformat(text.replace('Z', '+00:00')).date().isoformat()
    except ValueError:
        pass
    # No cortar a diez caracteres: 8/1/2026 puede estar seguido de una hora.
    day = text.split()[0] if text else ''
    # Meses del statement en inglés, independientes del idioma de Windows.
    months = {name: str(i) for i, name in enumerate(
        ('jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'), 1)}
    named = re.fullmatch(r'(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})', day)
    if named and named.group(2).casefold() in months:
        converted = f'{named.group(1)}-{months[named.group(2).casefold()]}-{named.group(3)}'
        try:
            return datetime.strptime(converted, '%d-%m-%y' if len(named.group(3)) == 2 else '%d-%m-%Y').date().isoformat()
        except ValueError:
            pass
    for fmt in ('%m/%d/%Y', '%m/%d/%y', '%Y/%m/%d', '%m-%d-%Y'):
        try:
            return datetime.strptime(day, fmt).date().isoformat()
        except ValueError:
            pass
    raise ValueError(f'ChangeEffdate inválida: {value!r}.')


def detectar_encabezado(sheet):
    required = {_normalizar(h) for h in HEADERS}
    for index, row in enumerate(sheet.iter_rows(values_only=True), 1):
        if required <= {_normalizar(v) for v in row}:
            return index
    raise ValueError('No se encontr? el encabezado completo de GRANADA en la primera hoja.')


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
            key = _normalizar(label)
            if key and key in positions:
                raise ValueError(f'Encabezado duplicado: {label}')
            if key:
                positions[key] = i
        if not {_normalizar(h) for h in HEADERS} <= positions.keys():
            raise ValueError('Faltan columnas de GRANADA.')
        for number, cells in enumerate(sheet.iter_rows(min_row=header + 1), header + 1):
            if all(cell.value is None for cell in cells):
                continue
            source = {}
            for h in HEADERS:
                cell = cells[positions[_normalizar(h)]]
                source[h] = cell.value.isoformat() if isinstance(cell.value, (date, datetime)) else texto_celda(cell)
            policy = source['PolicyNo'].strip()
            if not policy:
                raise ValueError(f'Fila {number}: falta PolicyNo; revisa si corresponde a un total.')
            raw_type = ' '.join(source['TransactionType'].split()).casefold()
            tipo = TRANSACTION_TYPES.get(raw_type)
            if raw_type and tipo is None:
                raise ValueError(f'Fila {number}: TransactionType no reconocido: {source["TransactionType"]}')
            try:
                effective = interpretar_fecha(cells[positions[_normalizar('ChangeEffdate')]].value, book.epoch)
            except ValueError as exc:
                raise ValueError(f'Fila {number}: {exc}') from None
            try:
                premium = Decimal(source['WrittenPremium'])
                commission = Decimal(source['Commission'])
                if not premium.is_finite() or not commission.is_finite():
                    raise InvalidOperation
                if not premium and commission:
                    raise ValueError(f'Fila {number}: prima cero y comisi?n distinta de cero.')
                rate = commission / premium if premium else Decimal(0)
            except InvalidOperation:
                raise ValueError(f'Fila {number}: prima o comisi?n inv?lida.') from None
            result.append(dict(carrier='GRANADA', source_sheet='GRANADA', source_row=number,
                source_data=source, accounting_month=month, policy_number=policy,
                insured_name=source['NamedInsured'], effective_date=effective,
                producer_name='', producer_code=normalizar_agency_id(source['AgencyCode']),
                edition=source['Edition'], agent_name=source['AgentName'], transaction_type=tipo,
                transaction_type_source='statement', premium_amount=str(premium), commission_amount=str(commission),
                del_toro_percent=str(rate.quantize(Decimal('0.000000000000000001'), rounding=ROUND_HALF_UP)),
                del_toro_percent_source='calculated'))
        if not result:
            raise ValueError('No hay p?lizas para importar.')
        return result
    finally:
        book.close()


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
        cursor.execute("SELECT GET_LOCK('staging_hub.st_granda_raw.import', 10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importación de GRANADA en curso.')
        cursor.execute('SELECT source_sheet, source_row, source_data FROM staging_hub.st_granda_raw'
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
            cursor.execute('INSERT INTO staging_hub.st_granda_raw'
                           ' (file_id, file_name, accounting_month, carrier, source_sheet, source_row,'
                           ' source_data, policy_number, insured_name, eff_date, transaction_type, statement_rate,'
                           ' premium, commission_amount, producer_name, producer_code, franchise_number, office_id,'
                           ' compass_policy_id, policy_status, policy_effective_date, line_business_id, term_length, franchise_number_source, comm_percent, edition, agent_name)'
                           ' VALUES (' + ','.join(['%s'] * 27) + ')',
                           (file_id, file_name, date_month, r['carrier'], r['source_sheet'], r['source_row'],
                            payload(r), r['policy_number'], r['insured_name'], _db_fecha(r['effective_date']),
                            r['transaction_type'], r['del_toro_percent'],
                            _db_decimal(r['premium_amount']), _db_decimal(r['commission_amount']),
                            r['producer_name'], r['producer_code'], r.get('franchise_number'), r.get('office_id'),
                            r.get('compass_policy_id'), r.get('policy_status'), _db_fecha(r.get('policy_effective_date')),
                            r.get('line_business_id'), r.get('term_length'), r.get('franchise_number_source'),
                            _db_decimal(r['del_toro_percent']), r.get('edition'), r.get('agent_name')))
        connection.commit()
        return len(expected) - len(found)
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_granda_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()



def completar_franquicias(connection, rows):
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT code, franchise, is_master_code FROM staging_hub.franchises_carrier_codes WHERE UPPER(TRIM(carrier))=%s', ('GRANADA',))
        codes = {}
        masters = set()
        for entry in cursor.fetchall():
            code = normalizar_agency_id(entry['code']).casefold()
            franchise = str(entry.get('franchise') or '').strip().upper()
            if entry.get('is_master_code'):
                masters.add(code)
                franchise = ''
            elif franchise and not franchise.startswith('DT'):
                franchise = _formatear_codigo_oficina(franchise) or franchise
            codes.setdefault(code, set()).add(franchise)
        cursor.execute('SELECT office_id, office_number, office_name, state FROM staging_hub.offices')
        offices = cursor.fetchall()
    finally:
        cursor.close()
    token = None
    polizas = {}
    historico = {}
    oficinas_por_id = {str(o['office_id']).strip(): o for o in offices}
    for row in rows:
        code = normalizar_agency_id(row['producer_code']).casefold()
        if code in masters:
            row.update(franchise_number=None, franchise_number_source=None, office_id=None,
                       office_number=None, state=None, producer_name='', compass_policy_id=None,
                       policy_status=None, policy_effective_date=None)
            numero = row['policy_number']
            consulta = numero_poliza_compass(numero, row.get('edition'))
            try:
                if token is None:
                    token = compass.obtener_token()
                if consulta not in polizas:
                    polizas[consulta] = None
                    for variante in variantes_poliza_compass(numero, row.get('edition')):
                        encontrada = compass.buscar_poliza(token, variante)
                        if encontrada is not None:
                            polizas[consulta] = encontrada
                            break
                poliza = polizas[consulta]
                if poliza is None:
                    clave_historico = (consulta, str(row.get('insured_name') or '').casefold())
                    if clave_historico not in historico:
                        historico[clave_historico] = None
                        variantes = list(dict.fromkeys([numero] + variantes_poliza_compass(numero, row.get('edition'))))
                        for variante in variantes:
                            encontrada = buscar_franquicia_historica(connection, variante)
                            if encontrada:
                                historico[clave_historico] = encontrada
                                break
                        if not historico[clave_historico]:
                            from granada_historico import buscar_alternativas
                            historico[clave_historico] = buscar_alternativas(
                                connection, numero, row.get('edition'), row.get('insured_name'))
                    franquicia = str(historico[clave_historico] or '').strip().upper()
                    if franquicia and not franquicia.startswith('DT'):
                        franquicia = _formatear_codigo_oficina(franquicia) or ''
                    if franquicia and franquicia != 'DT120':
                        candidatas = [o for o in offices
                                      if _formatear_codigo_oficina(o.get('office_number')) == franquicia]
                        office = candidatas[0] if len(candidatas) == 1 else None
                        row.update(franchise_number=franquicia, franchise_number_source='historico',
                                   office_id=str(office['office_id']) if office else None,
                                   office_number=office.get('office_number') if office else None,
                                   state=office.get('state') if office else None,
                                   producer_name=office.get('office_name') or '' if office else '',
                                   code_lookup_alert=None)
                    else:
                        row['code_lookup_alert'] = f'Código master {row["producer_code"]}: póliza {numero} sin franquicia en Compass ni histórico'
                    continue
                office_id = str(poliza.get('office_id') or '').strip() if poliza else ''
                office = oficinas_por_id.get(office_id)
                franquicia = _formatear_codigo_oficina(office.get('office_number')) if office else None
                row.update(office_id=office_id or None,
                           compass_policy_id=(poliza.get('policy_id') or poliza.get('id')) if poliza else None,
                           policy_status=poliza.get('status_id') if poliza else None,
                           policy_effective_date=poliza.get('effective_date') if poliza else None)
                if franquicia:
                    row.update(franchise_number=franquicia, franchise_number_source='compass',
                               office_number=office['office_number'], state=office.get('state'),
                               producer_name=office.get('office_name') or '', code_lookup_alert=None)
                else:
                    row['code_lookup_alert'] = f'Código master {row["producer_code"]}: no se pudo determinar la franquicia de la póliza {numero} en Compass/oficinas'
            except (RequestException, MySQLError, ValueError, TypeError, KeyError):
                row['code_lookup_alert'] = f'Código master {row["producer_code"]}: error al consultar Compass/histórico para la póliza {numero}'
            continue
        matches = codes.get(code, set())
        franchise = next(iter(matches)) if len(matches) == 1 and '' not in matches else None
        row['franchise_number'] = franchise
        row['franchise_number_source'] = 'codigos' if franchise else None
        row['code_lookup_alert'] = None if franchise else f'AgencyCode {row["producer_code"]}: sin franquicia ?nica registrada para GRANADA'
        candidates = [o for o in offices if _formatear_codigo_oficina(o.get('office_number')) == franchise
                      or (franchise == 'DT120' and str(o.get('office_number')) == '120')]
        office = candidates[0] if franchise and len(candidates) == 1 else None
        row['office_id'] = str(office['office_id']) if office else None
        row['office_number'] = office.get('office_number') if office else None
        row['state'] = office.get('state') if office else None
        row['producer_name'] = office.get('office_name') if office else ''


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT r.*, r.premium AS premium_amount, r.eff_date AS effective_date FROM staging_hub.st_granda_raw r WHERE file_id=%s AND accounting_month=%s ORDER BY id',
                       (snapshot['file_id'], snapshot['rows'][0]['accounting_month']))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de GRANADA para este archivo y mes.')
        completar_franquicias(connection, rows)
        for row in rows:
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'calculated'
            completar_del_toro_statement(row)
            row['franchise_percent'] = row['del_toro_percent']
            # La comisión recibida se entrega íntegramente a la franquicia.
            row['franchise_commission'] = row['del_toro_commission']
            row['commission_alert'] = row.get('code_lookup_alert') or None
        return rows
    finally:
        cursor.close()

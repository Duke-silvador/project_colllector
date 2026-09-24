"""Lectura del statement conjunto FPI/EDI/OVH, sin escrituras ni redondeos."""
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
import re
import json

from openpyxl import load_workbook
from database import conectar
from importacion import nombres_archivo, calcular_file_id
import compass
from franquicias import cargar_codigos_master, resolver_franquicia, buscar_franquicia_historica, _formatear_codigo_oficina
from oficinas import cargar_mapa_office_numbers
from reparto_comisiones import calcular_comisiones_raw, completar_datos_historicos
from compass_bot_client import obtener_tipos_lote
from excel_codigos import normalizar_agency_id, texto_celda as _text


SHEET_CARRIERS = {'FPI': 'FLORIDA PENINSULA', 'EDI': 'EDISON', 'OVH': 'OVATION HOME'}
HEADERS = ('agencyname', 'Policy', 'Insuredname', 'Poleff', 'commissionpercent',
           'sumtier', 'sumauth', 'Policyagency', 'Agencyid', 'transtype', 'company')


def _decimal(value, field, location):
    try:
        number = Decimal(value)
        if not number.is_finite():
            raise InvalidOperation
        return number
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f'{location}: {field} requiere un decimal válido; recibido {value!r}.') from None


def leer_statement(data, month, *, header=1, premium_column='sumtier', commission_column='sumauth'):
    """Conserva todos los valores; los importes solo se mapean explícitamente.

    commissionpercent se conserva tal cual; no se divide entre 100 ni se
    deduce a partir de importes. El carrier lo determina la hoja.
    """
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Indica el mes contable en formato YYYY-MM.')
    if header < 1:
        raise ValueError('La fila de encabezados debe ser mayor que cero.')
    workbook = load_workbook(BytesIO(data), read_only=True, data_only=True)
    rows = []
    try:
        sheets = {name: name.strip().upper() for name in workbook.sheetnames
                  if name.strip().upper() in SHEET_CARRIERS}
        if not sheets:
            raise ValueError('No se encontraron las hojas FPI, EDI u OVH.')
        if len(set(sheets.values())) != len(sheets):
            raise ValueError('Hay hojas duplicadas para un mismo carrier.')
        for name, code in sheets.items():
            sheet = workbook[name]
            labels = [_text(c) for c in next(sheet.iter_rows(min_row=header, max_row=header))]
            positions = {}
            for index, label in enumerate(labels):
                key = re.sub(r'[\s_]+', '', label.casefold())
                if key == 'comissionpercent':
                    key = 'commissionpercent'
                if not key:
                    continue
                if key in positions:
                    raise ValueError(f'{name}: encabezado duplicado {label!r}.')
                positions[key] = index
            required = ['Policy', 'Insuredname', 'Poleff', 'agencyname', 'commissionpercent']
            required += [c for c in (premium_column, commission_column) if c]
            missing = [c for c in required if re.sub(r'[\s_]+', '', c.casefold()) not in positions]
            if missing:
                raise ValueError(f'{name}: faltan columnas: {", ".join(missing)}.')
            for number, cells in enumerate(sheet.iter_rows(min_row=header + 1), header + 1):
                values = [_text(c) for c in cells]
                if not any(values):
                    continue
                source = {label: values[i] for i, label in enumerate(labels) if label}
                def get(column):
                    index = positions.get(re.sub(r'[\s_]+', '', column.casefold()))
                    return values[index] if index is not None else ''
                location = f'{name}, fila {number}'
                policy = get('Policy')
                if not policy:
                    raise ValueError(f'{location}: falta Policy; revisa si es un total o un cargo.')
                raw_date = get('Poleff')
                effective = None
                for fmt in ('%Y-%m-%d', '%m/%d/%Y'):
                    try:
                        effective = datetime.strptime(raw_date[:10], fmt).date().isoformat()
                        break
                    except ValueError:
                        pass
                if effective is None:
                    raise ValueError(f'{location}: Poleff no contiene una fecha válida.')
                tipo = get('transtype') or get('transaction')
                rows.append(dict(carrier=SHEET_CARRIERS[code], source_sheet=code, source_row=number,
                    source_data=source, accounting_month=month, policy_number=policy,
                    insured_name=get('Insuredname'), effective_date=effective,
                    producer_name=get('agencyname'), producer_code=normalizar_agency_id(get('Agencyid')),
                    transaction_type=tipo or None, transaction_type_source='statement' if tipo else None,
                    del_toro_percent=str(_decimal(get('commissionpercent'), 'commissionpercent', location)),
                    del_toro_percent_source='statement',
                    premium_amount=str(_decimal(get(premium_column), premium_column, location)) if premium_column else None,
                    commission_amount=str(_decimal(get(commission_column), commission_column, location)) if commission_column else None))
        if not rows:
            raise ValueError('Las hojas FPI, EDI y OVH no contienen registros.')
        return rows
    finally:
        workbook.close()


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
        cursor.execute("SELECT GET_LOCK('staging_hub.st_florida_peninsula_raw.import', 10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importación de Florida Peninsula en curso.')
        cursor.execute('SELECT source_sheet, source_row, source_data FROM staging_hub.st_florida_peninsula_raw'
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
            cursor.execute('INSERT INTO staging_hub.st_florida_peninsula_raw'
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
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_florida_peninsula_raw.import')")
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
    oficinas = cargar_mapa_office_numbers(connection)
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT code, franchise, state_code, is_master_code FROM staging_hub.franchises_carrier_codes WHERE carrier=%s', ('FLORIDA PENINSULA',))
        codes = {}
        for entry in cursor.fetchall():
            codes.setdefault(normalizar_agency_id(entry['code']), []).append(entry)
    finally:
        cursor.close()
    token = None
    cache = {}
    history_cache = {}
    for row in rows:
        code = normalizar_agency_id(row.get('producer_code'))
        entries = codes.get(code, [])
        franchises = {'DT120' if e.get('is_master_code') else e.get('franchise') for e in entries}
        if len(franchises) == 1 and None not in franchises and '' not in franchises:
            row['franchise_number'] = franchises.pop()
            row['franchise_number_source'] = 'codigos'
            row['code_lookup_alert'] = None
            row['state'] = entries[0].get('state_code') or row.get('state')
            office_ids = [uid for uid, number in oficinas.items() if _formatear_codigo_oficina(number) == row['franchise_number'] or (str(number) == '120' and row['franchise_number'] == 'DT120')]
            row['office_id'] = office_ids[0] if len(office_ids) == 1 else None
            row['office_number'] = oficinas.get(row['office_id'])
            continue
        if not entries:
            row['code_lookup_alert'] = f'Código {code or "vacío"} no existe en la tabla de códigos para FLORIDA PENINSULA'
        elif None in franchises or '' in franchises:
            row['code_lookup_alert'] = f'Código {code} existe para FLORIDA PENINSULA, pero tiene registros sin franquicia asignada'
        else:
            assigned = ', '.join(sorted(str(franchise) for franchise in franchises))
            row['code_lookup_alert'] = f'Código {code} ambiguo para FLORIDA PENINSULA: asociado a distintas franquicias ({assigned})'
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


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT r.*, r.premium AS premium_amount, r.eff_date AS effective_date,'
                       ' r.statement_rate AS del_toro_percent, o.state, o.office_number'
                       ' FROM staging_hub.st_florida_peninsula_raw r LEFT JOIN staging_hub.offices o ON o.office_id=r.office_id'
                       ' WHERE r.file_id=%s AND r.accounting_month=%s ORDER BY r.id',
                       (snapshot['file_id'], snapshot['rows'][0]['accounting_month']))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados para este fichero y mes.')
        completar_franquicias(connection, rows)
        for row in rows:
            row['del_toro_percent_source'] = 'statement'
            row['transaction_type_source'] = 'statement' if row.get('transaction_type') else None
        if consultar_tipos:
            missing = [r for r in rows if not r.get('transaction_type') and r.get('office_number')]
            queries = [dict(request_id=str(r['id']), policy_number=r['policy_number'],
                            office_number=str(r['office_number']), office_id=r.get('office_id'),
                            carrier=r['carrier']) for r in missing]
            results = {r['request_id']: r for r in obtener_tipos_lote(queries)} if queries else {}
            for row in missing:
                result = results.get(str(row['id']), {})
                row['transaction_type'] = result.get('transaction_type')
                row['type_lookup_error'] = result.get('error')
        cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                       ' FROM staging_hub.commission_rates WHERE carrier=%s', ('FLORIDA PENINSULA',))
        rates = cursor.fetchall()
        calculated = [calcular_comisiones_raw([r], rates, 'FLORIDA PENINSULA', state, business_line)[0] for r in rows]
        for row in calculated:
            row['commission_alert'] = '; '.join(filter(None, (row.get('commission_alert'), row.get('code_lookup_alert')))) or None
        return calculated
    finally:
        cursor.close()

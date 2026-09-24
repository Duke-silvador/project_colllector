"""Conciliacion exacta y libro de resultados, sin escrituras a MySQL."""
import re
from collections import defaultdict
from copy import copy
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from xml.etree import ElementTree as ET

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.workbook.properties import CalcProperties

from franquicias import resolver_franquicia
from reparto_comisiones import completar_del_toro_statement


def grand_total_pdf(text):
    matches = re.findall(r"Grand Total\s+DEL TORO FRANCHISING CORP\s+(-?\$?[\d,]+\.\d{2})", text, re.I)
    if len(matches) != 1:
        raise ValueError("Debe encontrarse un único Grand Total DEL TORO FRANCHISING CORP en el PDF.")
    return Decimal(matches[0].replace('$', '').replace(',', ''))


def monto_banco(value):
    try:
        number = Decimal(str(value).strip())
        if not number.is_finite():
            raise InvalidOperation
        return number
    except InvalidOperation:
        raise ValueError("Amount debe ser una celda numérica o un decimal sin símbolos ni separadores de miles.") from None


def _columnas_banco(ws, header):
    labels = [str(cell.value or '').strip().casefold() for cell in ws[header]]
    if labels.count('description') != 1 or labels.count('amount') != 1:
        raise ValueError("La fila de encabezados debe tener una columna Description y una Amount, sin duplicados.")
    return labels.index('description') + 1, labels.index('amount') + 1


def buscar_transacciones(data, sheet, header, carrier, terminos=None):
    """terminos: textos a buscar en Description (staging_hub.carrier_bank_search_terms), ADEMAS
    del nombre del carrier (no en su lugar): algunos carriers depositan en mas de una forma (ej.
    THE GENERAL: las franquicias con 'The General' en Description, pero el codigo master con
    otro texto completamente distinto), asi que la configuracion agrega variantes en vez de
    reemplazar la busqueda por nombre."""
    book = load_workbook(BytesIO(data), data_only=True)
    try:
        ws = book[sheet]
        description, amount = _columnas_banco(ws, header)
        names = (carrier.casefold(),) + tuple(str(t).casefold() for t in terminos or ())
        result = []
        for row in range(header + 1, ws.max_row + 1):
            value = str(ws.cell(row, description).value or '')
            if any(name in value.casefold() for name in names):
                result.append({'row': row, 'description': value,
                               'amount': monto_banco(ws.cell(row, amount).value)})
        return result
    finally:
        book.close()


def buscar_transacciones_por_monto(data, sheet, header, monto):
    """Ultimo recurso cuando el carrier no aparece en Description ni por los terminos
    configurados: recorre todo el banco y compara el importe exacto del reporte."""
    return buscar_transacciones_por_montos(data, sheet, header, [monto])


def buscar_transacciones_por_montos(data, sheet, header, montos):
    """Como buscar_transacciones_por_monto, pero para cuando el total del reporte es la suma
    de varios pedazos que no llegan como una sola transaccion bancaria (p.ej. BASS o CRC GROUP,
    donde cada pagina/archivo trae su propio cheque y cada cheque se deposita por separado):
    busca cada importe esperado por su cuenta en vez de una sola fila igual al total combinado."""
    book = load_workbook(BytesIO(data), data_only=True)
    try:
        ws = book[sheet]
        description, amount = _columnas_banco(ws, header)
        conjunto = set(montos)
        result = []
        for row in range(header + 1, ws.max_row + 1):
            try:
                value = monto_banco(ws.cell(row, amount).value)
            except ValueError:
                continue
            if value in conjunto:
                result.append({'row': row, 'description': str(ws.cell(row, description).value or ''), 'amount': value})
        return result
    finally:
        book.close()


def _es_100_por_ciento_entero(value):
    """El formato '0.###' deja un punto colgando ('1.') cuando el valor es exactamente un
    entero (ej. Del Toro %/Franchise % = 1 = 100%, en los MVR/chargebacks de THE GENERAL, que
    no se reparten). Para esos casos se usa formato entero puro ('0') en su lugar."""
    if isinstance(value, bool) or not isinstance(value, (int, float, Decimal)):
        return False
    try:
        numero = Decimal(str(value))
    except InvalidOperation:
        return False
    return numero == numero.to_integral_value()


FORMATOS_DATA = {
    'effective_date': 'mm/dd/yyyy',
    'premium_amount': '0.00',
    'commission_amount': '0.00',
    'del_toro_percent': '0.###',
    'franchise_percent': '0.###',
    'del_toro_commission': '"$"#,##0.00;[Red]-"$"#,##0.00',
    'franchise_commission': '"$"#,##0.00;[Red]-"$"#,##0.00',
    'commission_difference': '"$"#,##0.00;[Red]-"$"#,##0.00',
}


LDA_COLUMNS_DEFAULT = [
    ('franchise', 'franchise_number'), ('state_code', 'state'),
    ('producer_code', 'producer_code'), ('producer_name', 'producer_name'),
    ('policy', 'policy_number'), ('insured_name', 'insured_name'),
    ('transaction_date', 'effective_date'), ('transaction_type', 'transaction_type'),
    ('premium', 'premium_amount'), ('del_toro_rate', 'del_toro_percent'),
    ('del_toro_commission', 'del_toro_commission'),
    ('Franchise %', 'franchise_percent'), ('Franchise $', 'franchise_commission'),
    ('Difference', 'commission_difference'), ('agent_name', 'agent_name'),
    ('lob', 'line_business_id'), ('term_length', 'term_length'),
]
# Formato de reporte pedido por un tercero externo (ej. Amwins): mismas columnas/contenido que
# LDA_COLUMNS_DEFAULT, pero con otros nombres y otro orden, y sin la columna de estado. 'Company'
# reemplaza a la columna 'carrier' (antes opcional, aqui siempre presente). De momento solo se usa
# para COMMONWEALTH (piloto); cuando se confirme el formato se ira habilitando para los demas.
LDA_COLUMNS_AMWINS = [
    ('Date', 'effective_date'), ('Insured Name', 'insured_name'), ('Agency Code', 'producer_code'),
    ('Transaction', 'transaction_type'), ('Franchise', 'franchise_number'), ('Premium', 'premium_amount'),
    ('Del Toro %', 'del_toro_percent'), ('Del Toro $', 'del_toro_commission'), ('Policy', 'policy_number'),
    ('Company', 'carrier'), ('Franchise %', 'franchise_percent'), ('Franchise $', 'franchise_commission'),
    ('Difference', 'commission_difference'), ('Month', 'accounting_month'), ('LOB', 'line_business_id'),
    ('Agent Name', 'agent_name'), ('Term Length', 'term_length'),
]
CARRIERS_FORMATO_AMWINS = ('COMMONWEALTH', 'THE GENERAL', 'SLIDE', 'BASS', 'CRC GROUP', 'SWYFFT',
                           'GRANADA', 'ASSURANCE', 'ORCHID', 'FLORIDA PENINSULA', 'GIC Underwriters',
                           'TOWER HILL')


def _mes_produccion_mm_aaaa(value):
    """'Month' del formato Amwins: el mes de PRODUCCION real, no el accounting_month guardado.
    Siempre es un mes antes (ej. accounting_month=2026-09 -> Month='08-2026'), porque el
    statement de un mes de produccion se procesa/contabiliza al mes siguiente."""
    if isinstance(value, (date, datetime)):
        anio, mes = value.year, value.month
    else:
        texto = str(value or '').strip()
        coincide = re.match(r'^(\d{4})-(\d{2})', texto)
        if not coincide:
            return texto
        anio, mes = int(coincide.group(1)), int(coincide.group(2))
    mes -= 1
    if mes == 0:
        mes, anio = 12, anio - 1
    return f'{mes:02d}-{anio}'


def _guardar_con_cache(output, formulas):
    """Conserva resultados iniciales para lectores que no calculan formulas."""
    raw = BytesIO()
    output.save(raw)
    ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    result = BytesIO()
    with ZipFile(raw) as source, ZipFile(result, 'w', ZIP_DEFLATED) as target:
        for item in source.infolist():
            content = source.read(item.filename)
            if item.filename in formulas:
                # Conservar el XML y sus namespaces tal como los genera openpyxl.
                # Solo modificar los resultados de celdas que contienen fórmulas.
                def cache_cell(match):
                    cell = match.group(0)
                    address = re.search(r'\br="([^"]+)"', cell).group(1)
                    value = formulas[item.filename].get(address)
                    if value is None or '<f' not in cell:
                        return cell
                    cached = f'<v>{float(value)}</v>'
                    if re.search(r'<v(?:\s[^>]*)?>.*?</v>|<v\s*/>', cell, re.S):
                        return re.sub(r'<v(?:\s[^>]*)?>.*?</v>|<v\s*/>', cached, cell, count=1, flags=re.S)
                    return cell.replace('</c>', cached + '</c>')
                content = re.sub(r'<c\b[^>]*\br="[^"]+"[^>]*(?<!/)>.*?</c>', cache_cell, content.decode('utf-8'), flags=re.S).encode('utf-8')
            target.writestr(item, content)
    return result.getvalue()


def generar_excel_solo_reporte(data):
    """Exporta Report_LDA con valores calculados y sin dependencias de otras hojas."""
    book = load_workbook(BytesIO(data), data_only=True, keep_links=False)
    try:
        report = book.worksheets[-1]
        if report.title != 'Report_LDA':
            raise ValueError('La ultima hoja del Excel debe ser Report_LDA.')
        for ws in list(book.worksheets):
            if ws is not report:
                book.remove(ws)
        book.defined_names.clear()
        book.active = 0
        result = BytesIO()
        book.save(result)
        return result.getvalue()
    finally:
        book.close()


def buscar_montos_banco_por_codigo(bank_data, sheets, header):
    """THE GENERAL puede depositar una transacción bancaria separada por franquicia en vez de
    un solo total: cada Description trae 'PGA<código>' (el mismo Agent # del statement, con o
    sin ceros a la izquierda). Busca en TODAS las hojas indicadas (las que el usuario elige en
    la interfaz, incluida la de Commons donde cae el código master) y agrupa por código,
    sumando si el mismo código aparece en más de una fila.
    Devuelve {código: {'amount': Decimal, 'entries': [{'sheet','row','description','amount'}]}}."""
    resultado = {}
    book = load_workbook(BytesIO(bank_data), data_only=True)
    try:
        for hoja in sheets:
            if hoja not in book.sheetnames:
                continue
            ws = book[hoja]
            description_col, amount_col = _columnas_banco(ws, header)
            for fila in range(header + 1, ws.max_row + 1):
                texto = str(ws.cell(fila, description_col).value or '')
                match = re.search(r'PGA\s*0*(\d+)', texto, re.I)
                if not match:
                    continue
                try:
                    monto = monto_banco(ws.cell(fila, amount_col).value)
                except ValueError:
                    continue
                entrada = resultado.setdefault(match.group(1), {'amount': Decimal(0), 'entries': []})
                entrada['amount'] += monto
                entrada['entries'].append({'sheet': hoja, 'row': fila, 'description': texto, 'amount': monto,
                                           'codigo': match.group(1)})
    finally:
        book.close()
    return resultado


def generar_excel(rows, grand_total, bank_data, sheet, header, bank_row, carrier, mapa_franquicias,
                   buscar_office_id=None, mapa_oficinas=None, codigos_master=None, alias_franquicias=(),
                   terminos_banco=None, bank_sheets=None):
    omitir_banco = bank_data is None
    rows = [dict(row) for row in rows]
    for row in rows:
        if carrier == 'FLORIDA PENINSULA' and not row.get('carrier'):
            row['carrier'] = carrier
        for field in ('premium_amount', 'commission_amount', 'franchise_percent'):
            if row.get(field) is not None and row.get(field) != '':
                row[field] = Decimal(str(row[field]))
        if row.get('policy_number'):
            completar_del_toro_statement(row)
    total = sum((Decimal(str(row['commission_amount'])) for row in rows), Decimal(0))
    montos_por_codigo_the_general = {}
    if omitir_banco:
        selected = None
        if total != grand_total:
            raise ValueError("El total importado no coincide con el Grand Total.")
    elif carrier == 'THE GENERAL' and bank_sheets:
        # THE GENERAL no se empareja a mano: se buscan TODAS las transacciones con 'PGA<codigo>'
        # en las hojas elegidas en la interfaz (incluida Commons) y se comparan directo contra
        # nuestros codigos (Agent #), sin depender de la seleccion manual de bank_row.
        montos_por_codigo_the_general = buscar_montos_banco_por_codigo(bank_data, bank_sheets, header)
        codigos_nuestros = {str(row.get('producer_code') or '').strip() for row in rows}
        # El codigo master no deposita con 'PGA<codigo>' (aparece con otro texto, ej. 'General Des
        # Commission'); se encuentra por nombre del carrier/terminos configurados en su lugar, y
        # si hay EXACTAMENTE un codigo master en el statement, se le atribuye (si hay mas de uno o
        # ninguno, no se adivina). Sin esto, esa transaccion ni se ve en Pivot ni llega a Bank.
        ya_encontradas = {(entry['sheet'], entry['row']) for entrada in montos_por_codigo_the_general.values()
                          for entry in entrada['entries']}
        codigos_master = {str(row.get('producer_code') or '').strip() for row in rows if row.get('dt_or_dtf') == 'DT'}
        if len(codigos_master) == 1:
            codigo_master = next(iter(codigos_master))
            for hoja in bank_sheets:
                for extra in buscar_transacciones(bank_data, hoja, header, carrier, terminos_banco):
                    if (hoja, extra['row']) in ya_encontradas:
                        continue
                    entrada = montos_por_codigo_the_general.setdefault(codigo_master, {'amount': Decimal(0), 'entries': []})
                    entrada['amount'] += extra['amount']
                    entrada['entries'].append({'sheet': hoja, 'row': extra['row'], 'description': extra['description'],
                                               'amount': extra['amount'], 'codigo': codigo_master})
                    ya_encontradas.add((hoja, extra['row']))
        detalle_banco = sorted(
            (entry for entrada in montos_por_codigo_the_general.values() for entry in entrada['entries']),
            key=lambda e: (e['sheet'], e['row']))
        bank_rows = [(e['sheet'], e['row']) for e in detalle_banco]
        # 'Bank' solo cuenta lo que corresponde a nuestros codigos; lo que no corresponde a
        # ninguno se lista aparte en Pivot, sin sumarlo (no es parte de lo que esperamos).
        selected = {'amount': sum((entrada['amount'] for codigo, entrada in montos_por_codigo_the_general.items()
                                   if codigo in codigos_nuestros), Decimal(0))}
        if total != grand_total:
            raise ValueError("El total importado no coincide con el Grand Total.")
    else:
        # El importe se lee directo de las celdas ya elegidas en la UI, sin volver a buscar
        # por nombre/terminos: la transaccion puede haberse encontrado por el respaldo de monto
        # (buscar_transacciones_por_monto/_montos), que no necesariamente menciona el carrier.
        # Cada elemento puede ser un numero de fila (se asume la hoja `sheet`, uso previo) o un
        # dict {'sheet':, 'row':} cuando la transaccion viene de otra hoja del mismo banco.
        bank_row_items = list(bank_row) if isinstance(bank_row, (list, tuple)) else [bank_row]
        bank_rows = [(item['sheet'], item['row']) if isinstance(item, dict) else (sheet, item)
                    for item in bank_row_items]
        if len(set(bank_rows)) != len(bank_rows) or (carrier.upper() not in ('FLORIDA PENINSULA', 'ASSURANCE', 'CRC GROUP', 'ORCHID', 'SLIDE', 'THE GENERAL', 'SWYFFT', 'BASS') and len(bank_rows) != 1):
            raise ValueError('Selección bancaria inválida.')
        book = load_workbook(BytesIO(bank_data), data_only=True)
        try:
            detalle_banco = []
            for hoja, fila in bank_rows:
                ws = book[hoja]
                description_col, amount_col = _columnas_banco(ws, header)
                detalle_banco.append({
                    'sheet': hoja, 'row': fila,
                    'description': str(ws.cell(fila, description_col).value or ''),
                    'amount': monto_banco(ws.cell(fila, amount_col).value),
                })
            selected = {'amount': sum((d['amount'] for d in detalle_banco), Decimal(0))}
        finally:
            book.close()
        if total != grand_total:
            raise ValueError("El total importado no coincide con el Grand Total.")
        # Si el banco no coincide exactamente, no se bloquea: se sigue el flujo normal y la
        # diferencia queda registrada en la hoja Pivot (fila 'Difference').
    output = Workbook()
    data = output.active
    data.title = 'Data'
    columns = [('Franchise', None), ('Name Insured', 'insured_name'), ('Policy #', 'policy_number'),
        ('Last Transaction Date', 'effective_date'), ('Roadside', 'roadside_flag'),
        ('Premium', 'premium_amount'), ('Commission', 'commission_amount'),
        ('Agency Code', 'producer_code'),
        ('Location', 'producer_name'), ('Accounting Month', 'accounting_month'),
        ('File Name', 'file_name'), ('Transaction Type', 'transaction_type'), ('Policy Status', 'policy_status'),
        ('Del Toro %', 'del_toro_percent'), ('Del Toro $', 'del_toro_commission'),
        ('Commission Alert', 'commission_alert')]
    if any(row.get('carrier') for row in rows):
        columns.append(('Carrier', 'carrier'))
    data.append([label for label, _ in columns])
    for row in rows:
        chargeback = row.get('_chargeback') or (not row.get('policy_number') and row.get('transaction_type'))
        franquicia = row.get('franchise_number') if chargeback else row.get('franchise_number') or resolver_franquicia(
            mapa_franquicias, carrier, row.get('producer_name'), row.get('policy_number'),
            buscar_office_id, mapa_oficinas, row.get('producer_code'), codigos_master)
        # El alias se aplica siempre (tambien en chargebacks): si una oficina tiene alias
        # configurado, ese es el valor que debe mostrarse en el Excel, sin importar si la fila
        # es un chargeback (ej. MVR de THE GENERAL) o no.
        from franquicias import _formatear_codigo_oficina
        matches = ['DTF' + str(entry['franchise_alias']).strip().zfill(4) for entry in alias_franquicias
                   if (row.get('office_id') and entry['office_id'] == row['office_id'])
                   or (not row.get('office_id') and franquicia and
                       (franquicia == _formatear_codigo_oficina(entry['office_number'])
                        or (franquicia == 'DT120' and str(entry['office_number']) == '120')))]
        if len(set(matches)) == 1 and matches[0] is not None:
            franquicia = matches[0]
            row['franchise_number'] = franquicia
        if not chargeback and row.get('franchise_commission') in (None, '') and row.get('franchise_percent') not in (None, '') and row.get('premium_amount') not in (None, ''):
            row['franchise_commission'] = Decimal(str(row['premium_amount'])) * Decimal(str(row['franchise_percent']))
        incompleta = any(row.get(campo) in (None, '') for campo in (
            'del_toro_percent', 'del_toro_commission', 'franchise_percent', 'franchise_commission'))
        data.append([franquicia if field is None else row.get(field) for _, field in columns])
        pendiente = row.get('commission_amount') in (None, '') if chargeback else incompleta
        if not franquicia or pendiente:
            for cell in data[data.max_row]:
                cell.fill = PatternFill('solid', fgColor='FFC7CE')
    # Forzar texto literal para nombres, polizas, franquicia y descripciones del archivo.
    for cells in data.iter_rows(min_row=2):
        for cell in cells:
            if isinstance(cell.value, str):
                cell.data_type = 's'
        for cell, (_, field) in zip(cells, columns):
            if field in FORMATOS_DATA:
                cell.number_format = FORMATOS_DATA[field]
                if field in ('del_toro_percent', 'franchise_percent') and _es_100_por_ciento_entero(cell.value):
                    cell.number_format = '0'
    data.auto_filter.ref = data.dimensions
    data.freeze_panes = 'A2'
    pivot = output.create_sheet('Pivot')
    pivot.append([])
    pivot.append([])
    pivot_details = []
    pivot_subtotals = []
    if carrier == 'THE GENERAL':
        pivot.append(['Row Labels', 'Sum of Commission'])
        pivot.append(['', 'Name Insured', 'Policy #', 'Commission'])
        por_codigo = {}
        orden_codigos = []
        for row in rows:
            codigo = str(row.get('producer_code') or '').strip()
            if codigo not in por_codigo:
                por_codigo[codigo] = []
                orden_codigos.append(codigo)
            por_codigo[codigo].append(row)
        for codigo in orden_codigos:
            registros = por_codigo[codigo]
            es_master = any(r.get('dt_or_dtf') == 'DT' for r in registros)
            # El codigo master no equivale a una sola franquicia real: cada poliza se resuelve
            # por su cuenta en Compass y puede tocar oficinas distintas (ej. 90903 -> DTF0106,
            # DTF0120, DTF0179 en el mismo mes). Se separa un bloque por franquicia real dentro
            # del mismo codigo en vez de etiquetar todo con "la primera que aparezca".
            subgrupos = {}
            orden_subgrupos = []
            for r in registros:
                clave = r.get('franchise_number')
                if clave not in subgrupos:
                    subgrupos[clave] = []
                    orden_subgrupos.append(clave)
                subgrupos[clave].append(r)
            varias_franquicias = len(subgrupos) > 1
            for franquicia_valor in orden_subgrupos:
                sub_registros = subgrupos[franquicia_valor]
                etiqueta = (franquicia_valor or f'Sin franquicia (código {codigo or "no identificado"})'
                           ) + f' (Código {codigo or "no identificado"}, {"Master" if es_master else "No master"})'
                pivot.append([etiqueta])
                pivot.cell(pivot.max_row, 1).font = Font(bold=True)
                pivot.cell(pivot.max_row, 1).data_type = 's'
                for registro in sub_registros:
                    pivot.append(['', registro.get('insured_name'), registro.get('policy_number'),
                                  registro['commission_amount']])
                    pivot.cell(pivot.max_row, 3).data_type = 's'
                    pivot.cell(pivot.max_row, 4).number_format = '0.00'
                subtotal = sum((Decimal(str(r['commission_amount'])) for r in sub_registros), Decimal(0))
                pivot.append([f'Total {etiqueta}', subtotal])
                for cell in pivot[pivot.max_row][:2]:
                    cell.font = Font(bold=True)
                    cell.fill = PatternFill('solid', fgColor='DCE6F1')
                pivot.cell(pivot.max_row, 2).number_format = '0.00'
                if not varias_franquicias:
                    # Bloque unico para este codigo: su 'Bank' va justo debajo, como con un
                    # codigo normal (una franquicia real = una transaccion PGA<codigo>).
                    encontrado = None if omitir_banco else montos_por_codigo_the_general.get(re.sub(r'\D', '', codigo))
                    pivot.append(['Bank', encontrado['amount'] if encontrado else None])
                    if encontrado:
                        pivot.cell(pivot.max_row, 2).number_format = '0.00'
                pivot.append([])
            if varias_franquicias:
                # Una sola linea de 'Bank' para TODO el codigo (cubre a la vez a todas sus
                # franquicias reales), porque asi llega el deposito: un monto combinado, sin
                # desglose por oficina.
                encontrado = None if omitir_banco else montos_por_codigo_the_general.get(re.sub(r'\D', '', codigo))
                pivot.append([f'Bank (Código {codigo})', encontrado['amount'] if encontrado else None])
                pivot.cell(pivot.max_row, 1).data_type = 's'
                if encontrado:
                    pivot.cell(pivot.max_row, 2).number_format = '0.00'
                pivot.append([])
        pivot.append(['Grand Total', total])
        total_row = pivot.max_row
        if not omitir_banco:
            codigos_nuestros = set(orden_codigos)
            for codigo, entrada in montos_por_codigo_the_general.items():
                if codigo not in codigos_nuestros:
                    pivot.append([f'PGA{codigo} en el banco, no corresponde a ningún registro', entrada['amount']])
                    pivot.cell(pivot.max_row, 1).data_type = 's'
                    pivot.cell(pivot.max_row, 2).number_format = '0.00'
        pivot.append(['Bank', None if omitir_banco else selected['amount']])
        bank_row_pivot = pivot.max_row
        pivot.append(['Difference', None if omitir_banco else total - selected['amount']])
        for row in pivot.iter_rows(min_row=4, min_col=2, max_col=2):
            if isinstance(row[0].value, Decimal):
                row[0].number_format = '0.00'
    else:
        carriers = ('FLORIDA PENINSULA', 'OVATION HOME', 'EDISON') if carrier == 'FLORIDA PENINSULA' else (None,)
        for group_carrier in carriers:
            if group_carrier:
                pivot.append([group_carrier])
                pivot.cell(pivot.max_row, 1).font = Font(bold=True)
            pivot.append(['Agency Code', 'Sum of Commission'] if group_carrier else ['Row Labels', 'Sum of Commission'])
            groups = defaultdict(Decimal)
            for row in rows:
                if group_carrier is None or row.get('carrier') == group_carrier:
                    # CRC GROUP no tiene codigo de agente; agrupa por el Vendor Name (producer_name)
                    # en su lugar, en vez de fallar cuando producer_code no existe.
                    groups[row.get('producer_code') or row.get('producer_name')] += Decimal(str(row['commission_amount']))
            for code, value in groups.items():
                pivot.append([code, value])
                pivot.cell(pivot.max_row, 1).data_type = 's'
                pivot_details.append((pivot.max_row, group_carrier))
            if group_carrier:
                pivot.append([f'Total {group_carrier}', sum(groups.values(), Decimal(0))])
                pivot_subtotals.append((pivot.max_row, group_carrier))
                for cell in pivot[pivot.max_row]:
                    cell.font = Font(bold=True)
                    cell.fill = PatternFill('solid', fgColor='DCE6F1')
                pivot.append([])
        pivot.append(['Grand Total', total])
        total_row = pivot.max_row
        if not omitir_banco and len(detalle_banco) > 1:
            # Varias transacciones suman el total bancario: se listan todas (no solo la suma) para
            # poder ubicar a que fila del banco corresponde una diferencia, si la hay.
            for entrada in detalle_banco:
                pivot.append([f"{entrada['sheet']} · Fila {entrada['row']} · {entrada['description']}", entrada['amount']])
                pivot.cell(pivot.max_row, 1).data_type = 's'
        pivot.append(['Bank', None if omitir_banco else selected['amount']])
        bank_row_pivot = pivot.max_row
        pivot.append(['Difference', None if omitir_banco else total - selected['amount']])
        for row in pivot.iter_rows(min_row=4, min_col=2, max_col=2):
            row[0].number_format = '0.00'
    bank = output.create_sheet('Bank')
    if not omitir_banco and bank_rows:
        original = load_workbook(BytesIO(bank_data), data_only=True)
        try:
            # El encabezado se copia de la hoja de la primera transaccion; las filas elegidas
            # pueden venir de hojas distintas del mismo banco (cada una lleva su propia hoja).
            filas_a_copiar = [(bank_rows[0][0], header)] + bank_rows
            ancho_original = len(original[bank_rows[0][0]][header])
            for destination_row, (hoja, source_row) in enumerate(filas_a_copiar, start=1):
                source = original[hoja]
                for cell in source[source_row]:
                    target = bank.cell(destination_row, cell.column, cell.value)
                    # Registrar cada formato en el libro destino. Los indices internos
                    # de _style solo tienen sentido dentro del libro de origen.
                    target.font = copy(cell.font)
                    target.fill = copy(cell.fill)
                    target.border = copy(cell.border)
                    target.alignment = copy(cell.alignment)
                    target.protection = copy(cell.protection)
                    target.number_format = cell.number_format
                    if isinstance(cell.value, str):
                        target.data_type = 's'
                if carrier == 'THE GENERAL':
                    if destination_row == 1:
                        bank.cell(1, ancho_original + 1, 'Franchise')
                        bank.cell(1, ancho_original + 2, 'Difference')
                    else:
                        # 'no corresponde a nada' (codigo nuestro no encontrado) deja Franchise y
                        # Difference vacios; la diferencia es del codigo completo (todas sus filas
                        # del statement contra el monto TOTAL de ese codigo en el banco), no de
                        # esta fila sola, para no repetir/inventar un reparto entre varias filas
                        # bancarias del mismo codigo.
                        entrada_actual = detalle_banco[destination_row - 2]
                        codigo = entrada_actual.get('codigo')
                        registros_codigo = por_codigo.get(codigo, [])
                        franquicias_codigo = list(dict.fromkeys(r.get('franchise_number') for r in registros_codigo if r.get('franchise_number')))
                        # Un codigo (ej. el master) puede cubrir varias franquicias reales
                        # distintas; no se elige "la primera" como si fuera la unica, porque no
                        # representa a las demas filas de ese mismo codigo.
                        if len(franquicias_codigo) == 1:
                            franquicia = franquicias_codigo[0]
                        elif len(franquicias_codigo) > 1:
                            franquicia = f'Varias ({", ".join(franquicias_codigo)})'
                        else:
                            franquicia = None
                        if franquicia:
                            bank.cell(destination_row, ancho_original + 1, franquicia).data_type = 's'
                        if registros_codigo:
                            suma_codigo = sum((Decimal(str(r['commission_amount'])) for r in registros_codigo), Decimal(0))
                            monto_codigo = montos_por_codigo_the_general.get(codigo, {}).get('amount', Decimal(0))
                            diferencia = bank.cell(destination_row, ancho_original + 2, suma_codigo - monto_codigo)
                            diferencia.number_format = '0.00'
            for letter, dimension in original[bank_rows[0][0]].column_dimensions.items():
                bank.column_dimensions[letter].width = dimension.width
        finally:
            original.close()
    lda = output.create_sheet('Report_LDA')
    if carrier in CARRIERS_FORMATO_AMWINS:
        lda_columns = list(LDA_COLUMNS_AMWINS)
    else:
        lda_columns = list(LDA_COLUMNS_DEFAULT)
        if any(row.get('carrier') for row in rows):
            lda_columns.append(('carrier', 'carrier'))
    lda.append([label for label, _ in lda_columns])
    for index, row in enumerate(rows, 2):
        chargeback = not row.get('policy_number')
        if chargeback:
            # Solo estos campos aplican a un chargeback (sin poliza/premium real que reportar);
            # el resto queda en blanco salvo lo que el carrier ya calculo el mismo (THE GENERAL
            # con sus MVR, COMMONWEALTH con sus chargebacks: ambos son 100% a cargo de la
            # franquicia, sin reparto). agent_name/producer_name no se filtran por carrier aqui
            # (a diferencia de una fila normal, mas abajo): THE GENERAL guarda el nombre del
            # agente de sus MVR ahi y debe verse igual en cualquier formato de columnas.
            permitidos = {'state', 'producer_code', 'producer_name', 'insured_name', 'transaction_type',
                         'franchise_percent', 'franchise_commission', 'commission_difference',
                         'agent_name'}
            campo_valores = {campo: valor for campo, valor in row.items() if campo in permitidos}
            campo_valores['del_toro_percent'] = row.get('comm_percent')
            campo_valores['del_toro_commission'] = row.get('commission_amount')
            for campo in ('del_toro_percent', 'del_toro_commission', 'franchise_percent',
                         'franchise_commission', 'commission_difference'):
                if campo_valores.get(campo) is not None:
                    campo_valores[campo] = Decimal(str(campo_valores[campo]))
        else:
            campo_valores = dict(row)
            campo_valores['agent_name'] = (row.get('agent_name')
                if (row.get('carrier') or carrier) in ('GRANADA', 'ASSURANCE', 'TOWER HILL') else None)
        campo_valores['franchise_number'] = data.cell(index, 1).value
        campo_valores['carrier'] = row.get('carrier') or carrier
        campo_valores['accounting_month'] = _mes_produccion_mm_aaaa(row.get('accounting_month'))
        values = [campo_valores.get(field) for _, field in lda_columns]
        lda.append(values)
        for cell, (_, field) in zip(lda[index], lda_columns):
            if isinstance(cell.value, str):
                cell.data_type = 's'
            if field in FORMATOS_DATA:
                cell.number_format = FORMATOS_DATA[field]
                if field in ('del_toro_percent', 'franchise_percent') and _es_100_por_ciento_entero(cell.value):
                    cell.number_format = '0'
            cell.fill = copy(data.cell(index, 1).fill)
    lda.freeze_panes = 'A2'
    lda.auto_filter.ref = lda.dimensions
    for ws, header_row in ((data, 1), (pivot, 3), (lda, 1)):
        for cell in ws[header_row]:
            cell.fill = PatternFill('solid', fgColor='D9E7F5')
            cell.font = Font(bold=True)
        for column in ws.columns:
            ws.column_dimensions[column[0].column_letter].width = min(55, max(18, max(len(str(cell.value or '')) for cell in column) + 2))
    for cell in pivot[pivot.max_row - 2]:
        cell.fill = PatternFill('solid', fgColor='D9E7F5')
        cell.font = Font(bold=True)
    caches = {f'xl/worksheets/sheet{i}.xml': {} for i in (1, 2, 4)}
    def formula(ws, address, expression, value):
        index = output.worksheets.index(ws) + 1
        caches[f'xl/worksheets/sheet{index}.xml'][address] = value
        ws[address] = expression

    positions = {field: get_column_letter(i) for i, (_, field) in enumerate(columns, 1) if field}
    lda_positions = {field: get_column_letter(i) for i, (_, field) in enumerate(lda_columns, 1) if field}
    calculated = {}
    for index, row in enumerate(rows, 2):
        p = positions['premium_amount'] + str(index)
        c = positions['commission_amount'] + str(index)
        policy = positions['policy_number'] + str(index)
        expressions = {
            'del_toro_percent': f'=IF({policy}="","",IF({p}=0,IF({c}=0,0,NA()),{c}/{p}))',
            'del_toro_commission': f'=IF({policy}="","",{c})',
        }
        if row.get('del_toro_percent_source') == 'statement':
            expressions.pop('del_toro_percent')
        if not row.get('policy_number') and row.get('del_toro_commission') not in (None, ''):
            # Chargeback con su propio Del Toro $ ya calculado (ej. THE GENERAL: los MVR son
            # exactamente lo que entra). Sin esto, la formula de abajo lo pone en blanco por no
            # tener poliza, pisando el valor real que ya se escribio en la hoja.
            expressions.pop('del_toro_commission')
        for field, expression in expressions.items():
            address = positions[field] + str(index)
            value = row.get(field) if row.get('policy_number') else None
            formula(data, address, expression, value)
            if index == 2:
                calculated[data[address].column] = expression
        lp = lda_positions
        pol_lda, prem_lda = lp['policy_number'] + str(index), lp['premium_amount'] + str(index)
        toro_pct_lda, toro_com_lda = lp['del_toro_percent'] + str(index), lp['del_toro_commission'] + str(index)
        fran_pct_lda, fran_com_lda = lp['franchise_percent'] + str(index), lp['franchise_commission'] + str(index)
        rate_address = toro_pct_lda
        rate_expression = f'=IF({pol_lda}="",1,IF({prem_lda}=0,IF({toro_com_lda}=0,0,NA()),{toro_com_lda}/{prem_lda}))'
        if row.get('del_toro_percent_source') == 'statement':
            rate_expression = f'=Data!{positions["del_toro_percent"]}{index}'
        formula(lda, rate_address, rate_expression, lda[rate_address].value)
        formula(lda, toro_com_lda, f'=Data!{c}', lda[toro_com_lda].value)
        franchise_amount = None
        difference = None
        # {pol_lda} (no {policy}, que es la columna de poliza de la hoja Data, no de Report_LDA)
        # es la columna de poliza dentro de la propia Report_LDA -misma referencia que ya usa
        # rate_expression arriba-. Usar {policy} aqui es un bug: en carriers sin producer_code
        # (ej. TOWER HILL, siempre vacio) la condicion "columna C vacia" es siempre verdadera,
        # dejando Franchise $/Difference en blanco pase lo que pase con la poliza real.
        formula_franquicia = f'=IF(OR({pol_lda}="",{fran_pct_lda}=""),"",{prem_lda}*{fran_pct_lda})'
        if row.get('policy_number') and row.get('franchise_percent') not in (None, ''):
            pass_through = (row.get('del_toro_percent_source') == 'statement'
                           and Decimal(str(row['franchise_percent'])) == Decimal(str(row['del_toro_percent'])))
            if pass_through:
                # Franquicia recibe integro lo que dice el statement (100% pass-through, ej.
                # GRANADA/ORCHID/SLIDE): usa el mismo importe exacto del statement en vez de
                # recalcular premium*porcentaje, que puede diferir un centavo por el redondeo
                # del porcentaje mostrado (ej. 8.00% en vez de la tasa exacta aplicada).
                franchise_amount = Decimal(str(row['commission_amount']))
                formula_franquicia = f'=IF(OR({pol_lda}="",{toro_com_lda}=""),"",{toro_com_lda})'
            else:
                franchise_amount = Decimal(str(row['premium_amount'])) * Decimal(str(row['franchise_percent']))
            difference = Decimal(str(row['commission_amount'])) - franchise_amount
        elif not row.get('policy_number') and row.get('franchise_commission') not in (None, ''):
            # Chargeback con su propio reparto ya calculado (ej. THE GENERAL: los MVR son 100%
            # a cargo de la franquicia). No hay poliza/premium en la hoja Data para un SUMIF, asi
            # que se referencia {toro_com_lda} (Del Toro $, ya vinculado a Data!Commission) en
            # vez de recalcular con formula_franquicia (que depende de columnas vacias para
            # chargebacks).
            franchise_amount = Decimal(str(row['franchise_commission']))
            difference = (Decimal(str(row['commission_difference'])) if row.get('commission_difference') not in (None, '')
                         else Decimal(str(row['commission_amount'])) - franchise_amount)
            formula_franquicia = f'=IF({toro_com_lda}="","",{toro_com_lda})'
        formula(lda, fran_com_lda, formula_franquicia, franchise_amount)
        formula(lda, lp['commission_difference'] + str(index),
                f'=IF(OR({fran_com_lda}="",{toro_com_lda}=""),"",{toro_com_lda}-{fran_com_lda})', difference)
    data.auto_filter.ref = data.dimensions
    lda.auto_filter.ref = lda.dimensions
    carrier_column = next((get_column_letter(i) for i, (label, _) in enumerate(columns, 1) if label == 'Carrier'), None)
    for index, group_carrier in pivot_details:
        criteria = f'SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(A{index},"~","~~"),"*","~*"),"?","~?")'
        expression = f'=SUMIFS(Data!G:G,Data!H:H,{criteria},Data!{carrier_column}:{carrier_column},"{group_carrier}")' if group_carrier else f'=SUMIF(Data!H:H,{criteria},Data!G:G)'
        formula(pivot, f'B{index}', expression, pivot[f'B{index}'].value)
    for index, group_carrier in pivot_subtotals:
        formula(pivot, f'B{index}', f'=SUMIF(Data!{carrier_column}:{carrier_column},"{group_carrier}",Data!G:G)', pivot[f'B{index}'].value)
    formula(pivot, f'B{total_row}', '=SUM(Data!G:G)', total)
    if not omitir_banco and bank_rows:
        amount_column = next(cell.column_letter for cell in bank[1] if str(cell.value or '').strip().casefold() == 'amount')
        if carrier == 'THE GENERAL':
            # 'Bank' aqui es solo lo que corresponde a nuestros codigos: suma donde Franchise no
            # esta vacia, para no contar lo que no corresponde a ningun registro nuestro.
            franchise_column = get_column_letter(ancho_original + 1)
            bank_formula = (f'=SUMIF(Bank!{franchise_column}2:{franchise_column}{len(bank_rows) + 1},"<>",'
                            f'Bank!{amount_column}2:{amount_column}{len(bank_rows) + 1})')
        else:
            bank_formula = f'=Bank!{amount_column}2' if len(bank_rows) == 1 else f'=SUM(Bank!{amount_column}2:{amount_column}{len(bank_rows) + 1})'
        formula(pivot, f'B{bank_row_pivot}', bank_formula, selected['amount'])
        formula(pivot, f'B{bank_row_pivot + 1}', f'=B{total_row}-B{bank_row_pivot}', total - selected['amount'])
    output.calculation = CalcProperties(calcMode='auto', fullCalcOnLoad=True, forceFullCalc=True)
    result = _guardar_con_cache(output, caches)
    output.close()
    return result

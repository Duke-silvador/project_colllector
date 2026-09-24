"""Extracción local y validación explícita de statements y pagos BASS."""
from datetime import datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from io import BytesIO
import json
import re
from threading import Lock
from database import conectar
from importacion import nombres_archivo, calcular_file_id
from franquicias import _formatear_codigo_oficina
from reparto_comisiones import calcular_comisiones_raw

FIELDS = ('policy_number', 'effective_date', 'insured_name', 'transaction_type',
          'invoice_number', 'gross_premium', 'comm_percent', 'commission_amount')
OCR_LOCK = Lock()
INSURED_FIELDS = ('insured_person_name', 'insured_company_name')


def separar_asegurado(value):
    raw = str(value or '')
    person, separator, company = raw.partition(';')
    return dict(insured_person_name=person.strip() if separator else '',
                insured_company_name=company.strip() if separator else raw.strip())


def completar_asegurado(row):
    parts = separar_asegurado(row.get('insured_name'))
    return {**row, **{field: row.get(field, parts[field]) for field in INSURED_FIELDS}}


def importe(value):
    text = str(value or '').strip().replace('$', '').replace(',', '')
    if text.startswith('(') and text.endswith(')'):
        text = '-' + text[1:-1].strip()
    try:
        number = Decimal(text)
        if not number.is_finite():
            raise InvalidOperation
        return number
    except InvalidOperation:
        raise ValueError(f'Importe inválido: {value!r}') from None


def fecha(value):
    for fmt in ('%m/%d/%Y', '%m/%d/%y', '%Y-%m-%d'):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            pass
    raise ValueError(f'Fecha inválida: {value!r}')


def ocr_paginas(data, name, engine):
    from PIL import Image
    import pypdfium2 as pdfium
    images = []
    if name.lower().endswith('.pdf'):
        pdf = pdfium.PdfDocument(data)
        try:
            for index in range(len(pdf)):
                page = pdf[index]
                bitmap = page.render(scale=2)
                try:
                    images.append(bitmap.to_pil().copy())
                finally:
                    bitmap.close()
                    page.close()
        finally:
            pdf.close()
    else:
        with Image.open(BytesIO(data)) as image:
            images.append(image.convert('RGB').copy())
    pages = []
    for image in images:
        with OCR_LOCK:
            result = engine(image)
        blocks = []
        if result.boxes is not None:
            for box, text, confidence in zip(result.boxes, result.txts, result.scores):
                xs, ys = list(zip(*box))
                blocks.append(dict(text=text, confidence=float(confidence),
                                   x=float(sum(xs) / len(xs) / image.width),
                                   y=float(sum(ys) / len(ys) / image.height),
                                   height=float((max(ys) - min(ys)) / image.height)))
        pages.append({'blocks': blocks, 'text': '\n'.join(b['text'] for b in blocks), 'image': image})
    return pages


def extraer_pago(text):
    code = re.findall(r'\bAGT\s*\d+\b', text, re.I)
    numbers = re.findall(r'\b\d{6}\b', text)
    dates = re.findall(r'\b\d{1,2}/\d{1,2}/\d{4}\b', text)
    amounts = re.findall(r'\b\d[\d,]*\.\d{2}\b', text)
    def frecuente(values):
        return max(dict.fromkeys(values), key=values.count) if values else ''
    return dict(producer_code=frecuente(code), check_number=frecuente(numbers),
                check_date=frecuente(dates), check_amount=frecuente(amounts))


def extraer_statement(blocks, *, detalles=False):
    headers = {}
    for b in blocks:
        text = re.sub(r'[^a-z]', '', b['text'].casefold())
        if text == 'policy': headers['policy_number'] = b
        elif text in ('eff', 'effective'): headers['effective_date'] = b
        elif text == 'insured': headers['insured_name'] = b
        elif text == 'type': headers['transaction_type'] = b
        elif text == 'invoice': headers['invoice_number'] = b
        elif text.startswith('grossprem'): headers['gross_premium'] = b
        elif text == 'comm': headers['comm_percent'] = b
        elif text.startswith('invcamtpaid'): headers['commission_amount'] = b
    # Las cabeceras a menudo se unen o Eff desaparece en un escaneo.
    if not {'policy_number', 'insured_name', 'transaction_type', 'invoice_number'} <= headers.keys():
        return []
    policy_header, invoice_header = headers['policy_number'], headers['invoice_number']
    slope = (invoice_header['y'] - policy_header['y']) / (invoice_header['x'] - policy_header['x'])
    base = policy_header['y'] - slope * policy_header['x']
    for key, x in (('effective_date', .195), ('gross_premium', .755), ('comm_percent', .855), ('commission_amount', .965)):
        if key not in headers:
            headers[key] = {'x': x, 'y': base + slope * x, 'height': policy_header['height']}
    if len(headers) != len(FIELDS):
        return []
    ordered = sorted(headers.items(), key=lambda pair: pair[1]['x'])
    boundaries = [(ordered[i][1]['x'] + ordered[i+1][1]['x']) / 2 for i in range(len(ordered)-1)]
    top = max(b['y'] - slope * b['x'] + b['height'] / 2 for b in headers.values())
    groups = []
    aligned = [{**b, 'aligned': b['y'] - slope * b['x']} for b in blocks]
    for b in sorted((b for b in aligned if b['aligned'] > top), key=lambda b:b['aligned']):
        if groups and abs(groups[-1][0]['aligned'] - b['aligned']) < max(b['height'] * .65, .007):
            groups[-1].append(b)
        else:
            groups.append([b])
    rows = []
    for group in groups:
        row = dict.fromkeys(FIELDS, '')
        confidence = {}
        for b in sorted(group, key=lambda b:b['x']):
            column = sum(b['x'] > limit for limit in boundaries)
            key = ordered[column][0]
            row[key] = (row[key] + ' ' + b['text']).strip()
            confidence[key] = min(confidence.get(key, 1), b.get('confidence', 0))
        if row['policy_number']:
            combined = re.fullmatch(r'(.*?)((?:1[0-2]|0?[1-9])/\d{1,2}/\d{4})', row['policy_number'])
            if combined and not row['effective_date']:
                row['policy_number'], row['effective_date'] = combined.groups()
                confidence['effective_date'] = confidence.get('policy_number', 0)
            rows.append({'values': row, 'confidence': confidence} if detalles else row)
    return rows


def alertas_lectura(row, original=None, threshold=.95):
    """Señala campos inválidos y lecturas de baja confianza aún sin corregir."""
    alerts = {}
    for field in FIELDS:
        value = str(row.get(field) or '').strip()
        if not value and field != 'transaction_type':
            alerts[field] = 'missing'
            continue
        try:
            if field == 'effective_date':
                fecha(value)
            elif field in ('gross_premium', 'commission_amount'):
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


def extraer_cabecera(blocks):
    metadata = extraer_pago('\n'.join(b['text'] for b in blocks))
    for key, label in (('check_amount', 'amount'), ('check_date', 'date'), ('check_number', 'checknbr')):
        headers = [b for b in blocks if re.sub(r'[^a-z]', '', b['text'].casefold()) == label]
        if headers:
            header = headers[0]
            values = [b for b in blocks if 0 < b['y'] - header['y'] < .13 and abs(b['x'] - header['x']) < .06]
            if values:
                metadata[key] = min(values, key=lambda b:b['y'])['text']
    return metadata


def validar(rows, pago, month):
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Mes contable inválido; usa YYYY-MM.')
    if not re.fullmatch(r'AGT\d+', str(pago.get('producer_code') or '').strip(), re.I):
        raise ValueError('Revisa el código completo AGT del pago.')
    if not str(pago.get('check_number') or '').isdigit():
        raise ValueError('Revisa el número de cheque.')
    fecha(pago['check_date'])
    total = importe(pago['check_amount'])
    if not rows:
        raise ValueError('Añade las filas del statement antes de importar.')
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
            raise ValueError(f'Fila {i}: porcentaje inválido; escribe 12 para 12%.') from None
    if sum((importe(r['commission_amount']) for r in rows), Decimal(0)) != total:
        raise ValueError('La suma de comisiones del statement no coincide con el cheque; revisa las filas.')
    return total


def guardar(rows, pago, month, file_name, contenido, source_page, payment_file, original_ocr):
    """file_id se calcula del CONTENIDO del archivo (no del nombre): el mismo statement subido
    con otro nombre se reconoce igual como ya importado, en vez de duplicarse."""
    validar(rows, pago, month)
    _, file_name = nombres_archivo(file_name)
    file_id = calcular_file_id(contenido)
    c = conectar()
    k = c.cursor(dictionary=True)
    locked = False
    try:
        k.execute("SELECT GET_LOCK('staging_hub.st_bass_raw.import',10) AS acquired")
        locked = k.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importación BASS en curso.')
        k.execute('SELECT code, franchise, is_master_code FROM staging_hub.franchises_carrier_codes WHERE UPPER(TRIM(carrier))=%s', ('BASS',))
        codes = [r for r in k.fetchall() if str(r.get('code') or '').strip().casefold() == pago['producer_code'].strip().casefold()]
        franchises = {str(r.get('franchise') or '').strip().upper() for r in codes if not r.get('is_master_code')}
        franchise = next(iter(franchises)) if len(franchises) == 1 and '' not in franchises and not any(r.get('is_master_code') for r in codes) else None
        accounting = datetime.strptime(month, '%Y-%m').date()
        payloads = [json.dumps({'reviewed': row, 'payment': pago, 'original_ocr': original_ocr}, ensure_ascii=False, sort_keys=True) for row in rows]
        k.execute('SELECT id, source_row, source_data FROM staging_hub.st_bass_raw WHERE file_id=%s AND accounting_month=%s AND source_page=%s FOR UPDATE', (file_id, accounting, source_page))
        existing = {r['source_row']: r for r in k.fetchall()}
        for number in existing:
            if not 1 <= number <= len(rows):
                raise ValueError('Esta página tiene menos filas que la versión ya guardada; no se eliminó nada. Vuelve a añadir la fila antes de reimportar.')
        inserted = updated = 0
        for number, row in enumerate(rows, 1):
            insured = completar_asegurado(row)
            previo = existing.get(number)
            if previo is not None:
                guardado = json.loads(previo['source_data']) if isinstance(previo['source_data'], str) else previo['source_data']
                if guardado == json.loads(payloads[number-1]):
                    continue
                k.execute('UPDATE staging_hub.st_bass_raw SET producer_code=%s,effective_date=%s,policy_number=%s,transaction_type=%s,'
                          'insured_name=%s,gross_premium=%s,comm_percent=%s,commission_amount=%s,source_data=%s,invoice_number=%s,'
                          'check_number=%s,check_date=%s,check_amount=%s,payment_file=%s,payment_data=%s,franchise_number=%s,'
                          'insured_person_name=%s,insured_company_name=%s WHERE id=%s',
                          (pago['producer_code'],fecha(row['effective_date']),row['policy_number'],row['transaction_type'] or None,
                           row['insured_name'],importe(row['gross_premium']),
                           (Decimal(str(row['comm_percent']))/100).quantize(Decimal('0.0001'),rounding=ROUND_HALF_UP),importe(row['commission_amount']),
                           payloads[number-1],row['invoice_number'],pago['check_number'],fecha(pago['check_date']),importe(pago['check_amount']),
                           payment_file,json.dumps(pago,ensure_ascii=False),franchise,
                           insured['insured_person_name'] or None,insured['insured_company_name'] or None,previo['id']))
                updated += 1
            else:
                k.execute('INSERT INTO staging_hub.st_bass_raw (file_id,file_name,accounting_month,producer_code,effective_date,policy_number,transaction_type,insured_name,gross_premium,comm_percent,commission_amount,source_page,source_row,source_data,invoice_number,check_number,check_date,check_amount,payment_file,payment_data,franchise_number,insured_person_name,insured_company_name) VALUES (' + ','.join(['%s']*23) + ')',
                          (file_id,file_name,accounting,pago['producer_code'],fecha(row['effective_date']),row['policy_number'],row['transaction_type'] or None,row['insured_name'],importe(row['gross_premium']),
                           (Decimal(str(row['comm_percent']))/100).quantize(Decimal('0.0001'),rounding=ROUND_HALF_UP),importe(row['commission_amount']),source_page,number,payloads[number-1],row['invoice_number'],pago['check_number'],fecha(pago['check_date']),importe(pago['check_amount']),payment_file,json.dumps(pago,ensure_ascii=False),franchise,insured['insured_person_name'] or None,insured['insured_company_name'] or None))
                inserted += 1
        c.commit()
        return inserted, updated, franchise
    except Exception:
        c.rollback()
        raise
    finally:
        if locked:
            k.execute("SELECT RELEASE_LOCK('staging_hub.st_bass_raw.import')")
            k.fetchone()
        k.close()
        c.close()


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """Reparto de comisiones BASS: mismo motor que los demas carriers (calcular_comisiones_raw),
    con la franquicia y el estado ya resueltos al importar en lugar de Comm.xlsx."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT r.*, r.comm_percent AS del_toro_percent'
                       ' FROM staging_hub.st_bass_raw r WHERE r.file_id=%s AND r.accounting_month=%s ORDER BY r.id',
                       (snapshot['file_id'], snapshot['rows'][0]['accounting_month']))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de BASS para este archivo y mes.')
        cursor.execute('SELECT office_number, state FROM staging_hub.offices')
        estados_por_franquicia = {_formatear_codigo_oficina(o['office_number']): o['state'] for o in cursor.fetchall()}
        for row in rows:
            row['carrier'] = 'BASS'
            row['state'] = estados_por_franquicia.get(row.get('franchise_number'))
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'statement'
            row['franchise_number_source'] = 'codigos' if row.get('franchise_number') else None
            row['business_line'] = ''
            # Gross Premium del statement es la prima del AÑO ENTERO de la póliza, no la que
            # corresponde a esta transacción/comisión; no sirve para calcular Franchise $. La
            # prima que sí corresponde se deriva de lo que de verdad tenemos: el % y el importe
            # que BASS realmente nos pagó (premium = commission_amount / rate).
            rate = Decimal(str(row['del_toro_percent'])) if row.get('del_toro_percent') is not None else Decimal(0)
            commission = Decimal(str(row['commission_amount']))
            row['premium_amount'] = (commission / rate) if rate else Decimal(0)
            row['code_lookup_alert'] = None if row['state'] else (
                f"Franquicia {row.get('franchise_number') or 'sin determinar'}: sin oficina para determinar el estado")
            if not rate and commission:
                row['code_lookup_alert'] = '; '.join(filter(None, (row['code_lookup_alert'],
                    'Comm % en cero: no se puede calcular la prima real a partir de la comisión')))
        cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                       ' FROM staging_hub.commission_rates WHERE carrier=%s', ('BASS',))
        tarifas = cursor.fetchall()
        calculated = calcular_comisiones_raw(rows, tarifas, 'BASS', state, business_line)
        for row in calculated:
            row['commission_alert'] = '; '.join(filter(None, (row.get('commission_alert'), row.get('code_lookup_alert')))) or None
        return calculated
    finally:
        cursor.close()

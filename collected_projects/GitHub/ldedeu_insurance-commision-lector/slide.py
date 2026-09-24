"""Extraccion local y validacion explicita de statements SLIDE (Commission Statement). Llega
en PDF (via documentos.paginas_documento: texto real sin OCR salvo pagina escaneada). El total
a validar ('Amount Due Agent') y las filas de la tabla pueden estar en paginas distintas del
mismo archivo, asi que se valida por archivo completo, no por pagina.

La franquicia se busca por Agency Code en la tabla de codigos, con el mismo respaldo
Compass/historico/codigo-observado que ya se usa en ORCHID/ASSURANCE/BASS. Como ORCHID: la
franquicia recibe integro lo que SLIDE reporto (lo que entra es lo que sale, sin tabla de
tarifas)."""
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
from compass_bot_client import buscar_franquicias_por_nombre
from bass import importe, fecha

FIELDS = ('product_code', 'state', 'agency_code', 'agency_name', 'policy_number', 'insured_name',
          'eff_exp_date', 'cancel_effective_date', 'tran_date', 'tran_code', 'collected_premium',
          'comm_rate', 'comm_amt')
COLUMN_LABELS = (
    ('product_code', ('product', 'code')),
    ('state', ('state',)),
    ('agency_code', ('agency', 'code')),
    ('agency_name', ('agency', 'name')),
    ('policy_number', ('policy', 'number')),
    ('insured_name', ('insureds', 'name')),
    ('eff_exp_date', ('effexp', 'date')),
    ('cancel_effective_date', ('cancel', 'effective', 'date')),
    ('tran_date', ('tran', 'date')),
    ('tran_code', ('tran', 'code')),
    ('collected_premium', ('collected', 'premium')),
    ('comm_rate', ('comm', 'rate')),
    ('comm_amt', ('comm', 'amt')),
)
_PALABRAS_ENCABEZADO = {palabra for _, palabras in COLUMN_LABELS for palabra in palabras}


def _normalizar_palabra(texto):
    return re.sub(r'[^a-z]', '', str(texto or '').casefold())


def _palabras_bloque(texto):
    return [_normalizar_palabra(p) for p in re.split(r'\s+', str(texto or '')) if _normalizar_palabra(p)]


def _agrupar_por_x(bloques, tolerancia=0.03):
    grupos = []
    for b in sorted(bloques, key=lambda b: b['x']):
        if grupos and b['x'] - grupos[-1][-1]['x'] < tolerancia:
            grupos[-1].append(b)
        else:
            grupos.append([b])
    return grupos


def extraer_tabla_pagina(blocks, *, detalles=False):
    """Encabezados detectados por texto. El pie de la tabla principal ('Total ... Statement
    Period') se usa como limite: mas abajo hay una segunda mini-tabla (Agency Code/Agency
    Name/Commission Total, resumen por agencia) que repite palabras de encabezado y
    confundiria la deteccion si no se excluye."""
    notas_pie = [b for b in blocks if 'total' in _palabras_bloque(b['text'])]
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
        # Filas reales tienen poliza y codigo de agencia; descarta lineas sueltas (subtotales).
        if fila['policy_number'] and fila['agency_code']:
            filas.append({'values': fila, 'confidence': confianza} if detalles else fila)
    return filas


def _es_formato_displaydoc(paginas):
    """Un segundo formato de statement SLIDE ('DisplayDoc'): en vez de una sola tabla con
    'Amount Due Agent', trae un resumen jerarquico por sub-agencia ('Agent <master>-<sub>' +
    nombre, cada una con su propia tabla de polizas y su 'Total for Sub'), y un
    'Grand Total for Agency' en vez de 'Amount Due Agent'. Se detecta por esa frase, unica de
    este formato."""
    return any('Grand Total for Agency' in pagina.get('text', '') for pagina in paginas)


COLUMN_LABELS_DISPLAYDOC = (
    ('policy_number', ('policy', 'number')),
    ('insured_name', ('insured',)),
    ('policy_effective_date', ('policy', 'effective', 'date')),
    ('change_effective_date', ('change', 'effective', 'date')),
    ('tran_code', ('new', 'renewal', 'term')),
    ('territory', ('territory',)),
    ('comm_rate', ('commission', 'rate')),
    ('collected_premium', ('commission', 'premium', 'collected')),
    ('comm_amt', ('commission', 'payable')),
)
_CAMPOS_DISPLAYDOC = tuple(campo for campo, _ in COLUMN_LABELS_DISPLAYDOC)
_PALABRAS_ENCABEZADO_DISPLAYDOC = {palabra for _, palabras in COLUMN_LABELS_DISPLAYDOC for palabra in palabras}
# El pie de cada pagina repite estas mismas lineas literales (direccion de Receivable
# Accounting, no de la sub-agencia); si no se excluyen, la ultima fila de la tabla de cada
# pagina (cuyo rango vertical llega hasta el final de la pagina) las arrastra como texto
# de alguna columna.
_PIE_PAGINA_DISPLAYDOC = (
    frozenset({'receivable', 'accounting'}),
    frozenset({'w', 'boy', 'scout', 'blvd', 'suite'}),
    frozenset({'tampa', 'fl'}),
)


def _es_pie_pagina_displaydoc(bloque_texto):
    palabras = frozenset(_palabras_bloque(bloque_texto))
    if not palabras:
        return False
    return palabras in _PIE_PAGINA_DISPLAYDOC or {'commission', 'statement'} <= palabras


def _agencia_pagina(texto):
    """'Agent <master>-<sub>' identifica una sub-agencia: su codigo real (el que va despues
    del guion, sin el prefijo del agente principal, igual que en el formato de tabla
    existente) deberia estar en la tabla de codigos; si no esta, completar_franquicias ya cae
    a Compass por su cuenta, sin necesitar nada especial aqui.

    'Agent <master>' solo (sin guion) puede aparecer con su PROPIA tabla de polizas (no solo
    como resumen general del archivo): esas polizas pertenecen directo al codigo master, que
    no equivale a una sola franquicia real (igual que en THE GENERAL), asi que tampoco se
    registra aqui con un valor fijo -se deja tal cual, sin registrar, para que
    completar_franquicias tambien caiga a Compass por poliza en vez de usar una franquicia
    unica adivinada."""
    m = re.search(r'Agent\s+\d+-(\d+)\s*\n(.+)', texto)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    m = re.search(r'Agent\s+(\d+)\s*\n(.+)', texto)
    if not m:
        return None, None
    return m.group(1).strip(), m.group(2).strip()


def extraer_tabla_pagina_displaydoc(blocks, *, detalles=False):
    candidatos_header = [b for b in blocks if not any(c.isdigit() for c in b['text'])
                         and set(_palabras_bloque(b['text'])) & _PALABRAS_ENCABEZADO_DISPLAYDOC
                         and len(b['text'].strip()) <= 14]
    if not candidatos_header:
        return []
    grupos = _agrupar_por_x(candidatos_header)
    headers = {}
    for grupo in grupos:
        palabras = {p for b in grupo for p in _palabras_bloque(b['text'])}
        centro_x = sum(b['x'] for b in grupo) / len(grupo)
        centro_y = max(b['y'] + b['height'] / 2 for b in grupo)
        for campo, palabras_esperadas in COLUMN_LABELS_DISPLAYDOC:
            if palabras == set(palabras_esperadas):
                headers[campo] = {'x': centro_x, 'y': centro_y}
                break
    if len(headers) != len(_CAMPOS_DISPLAYDOC):
        return []
    ordered = sorted(headers.items(), key=lambda pair: pair[1]['x'])
    boundaries = [(ordered[i][1]['x'] + ordered[i + 1][1]['x']) / 2 for i in range(len(ordered) - 1)]
    top = max(h['y'] for h in headers.values()) - .004
    cuerpo = [b for b in blocks if b['y'] > top and not _es_pie_pagina_displaydoc(b['text'])]
    # Filas reales tienen poliza en la primera columna (siempre una sola linea); se usan como
    # ancla para delimitar cada fila en vez de encadenar por cercania en Y, porque celdas como
    # Insured (nombres largos) o las fechas ('12:00:00 AM' en su propia linea) pueden quedar mas
    # lejos verticalmente de su propia fila que la fila siguiente.
    limite_columna_poliza = boundaries[0] if boundaries else 1.0
    anclas = sorted((b for b in cuerpo if b['x'] < limite_columna_poliza), key=lambda b: b['y'])
    if not anclas:
        return []
    filas = []
    for indice, ancla in enumerate(anclas):
        y_inicio = ancla['y'] - .006
        y_fin = anclas[indice + 1]['y'] - .006 if indice + 1 < len(anclas) else 1.0
        bloques_fila = [b for b in cuerpo if y_inicio <= b['y'] < y_fin]
        columnas = {campo: [] for campo in _CAMPOS_DISPLAYDOC}
        for b in bloques_fila:
            columna = sum(b['x'] > limite for limite in boundaries)
            columnas[ordered[columna][0]].append(b)
        fila = {campo: ' '.join(b['text'] for b in sorted(bloques, key=lambda b: b['y'])).strip()
                for campo, bloques in columnas.items()}
        # '12:00:00 AM' queda en su propia linea debajo de la fecha; no aporta nada (la hora no
        # importa) y solo ensuciaria eff_exp_date si se concatena con la fecha real.
        fila['policy_effective_date'] = re.sub(r'\s*12:00:00\s*AM\s*', '', fila['policy_effective_date']).strip()
        if fila['policy_number'] and fila['insured_name']:
            confianza = {campo: min((b.get('confidence', 1) for b in bloques), default=1)
                        for campo, bloques in columnas.items() if bloques}
            filas.append({'values': fila, 'confidence': confianza} if detalles else fila)
    return filas


def extraer_filas_archivo_displaydoc(paginas, *, detalles=False):
    """A diferencia del formato de tabla unica, aqui el Agency Code/Name no vienen por fila
    sino en un encabezado de sub-agencia antes de cada tabla ('Agent <master>-<sub>' + nombre);
    se recuerda el ultimo visto y se aplica a las filas de tabla que le siguen, hasta el
    proximo encabezado (pueda estar en la misma pagina o en una posterior)."""
    filas = []
    codigo_actual = nombre_actual = None
    for pagina in paginas:
        codigo, nombre = _agencia_pagina(pagina['text'])
        if codigo:
            codigo_actual, nombre_actual = codigo, nombre
        for fila in extraer_tabla_pagina_displaydoc(pagina['blocks'], detalles=detalles):
            valores = fila['values'] if detalles else fila
            valores.update(product_code='', state='FL', agency_code=codigo_actual or '',
                           agency_name=nombre_actual or '', cancel_effective_date='',
                           tran_date=valores.pop('change_effective_date', ''),
                           eff_exp_date=valores.pop('policy_effective_date', ''))
            valores.pop('territory', None)
            filas.append(fila)
    return filas


def extraer_filas_archivo(paginas, *, detalles=False):
    """Junta las filas de todas las paginas del archivo (la tabla puede seguir en una pagina
    distinta a la del total, o el statement puede traer varias paginas de transacciones).
    Dos formatos posibles (ver _es_formato_displaydoc): se detecta uno u otro por archivo
    completo, nunca se mezclan entre si dentro del mismo archivo."""
    if _es_formato_displaydoc(paginas):
        return extraer_filas_archivo_displaydoc(paginas, detalles=detalles)
    filas = []
    for pagina in paginas:
        filas.extend(extraer_tabla_pagina(pagina['blocks'], detalles=detalles))
    return filas


def extraer_total_archivo(paginas):
    """'Amount Due Agent / DEL TORO INSURANCE ...: $X' puede estar en cualquier pagina del
    archivo (normalmente la primera, de resumen). El formato 'DisplayDoc' no trae esa frase;
    trae 'Grand Total for Agency:' seguido del numero de agente y despues el monto."""
    for pagina in paginas:
        m = re.search(r'Amount Due Agent.*?\$(-?[\d,]+\.\d{2})', pagina['text'], re.DOTALL)
        if m:
            return Decimal(m.group(1).replace(',', ''))
    for pagina in paginas:
        m = re.search(r'Grand Total for Agency:\s*\d+\s*(-?[\d,]+\.\d{2})', pagina['text'], re.DOTALL)
        if m:
            return Decimal(m.group(1).replace(',', ''))
    return None


def _fechas_vigencia(eff_exp_date):
    """'7/30/2026- 7/30/2027' (formato de tabla, Eff/Exp Date) -> (date, date), tomando la
    primera como efectiva. '7/8/2026' (formato DisplayDoc, Policy Effective Date, ya sin el
    '12:00:00 AM') -> (date, None): es una sola fecha, se toma como efectiva, sin expiracion.
    None si no se puede leer ninguna fecha."""
    texto = str(eff_exp_date or '')
    m = re.search(r'(\d{1,2}/\d{1,2}/\d{4})\s*-\s*(\d{1,2}/\d{1,2}/\d{4})', texto)
    if m:
        try:
            return fecha(m.group(1)), fecha(m.group(2))
        except ValueError:
            return None, None
    m = re.search(r'(\d{1,2}/\d{1,2}/\d{4})', texto)
    if m:
        try:
            return fecha(m.group(1)), None
        except ValueError:
            return None, None
    return None, None


def alertas_lectura(row, original=None, threshold=.95):
    alerts = {}
    for field in FIELDS:
        value = str(row.get(field) or '').strip()
        if not value:
            if field in ('product_code', 'cancel_effective_date'):
                continue  # No siempre vienen; no son obligatorios.
            alerts[field] = 'missing'
            continue
        try:
            if field == 'tran_date':
                fecha(value)
            elif field == 'eff_exp_date':
                if _fechas_vigencia(value) == (None, None):
                    raise ValueError
            elif field in ('collected_premium', 'comm_amt'):
                importe(value)
            elif field == 'comm_rate':
                rate = Decimal(re.sub(r'[^0-9.\-]', '', value) or '')
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


def validar(rows, total, month):
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        raise ValueError('Mes contable invalido; usa YYYY-MM.')
    if not rows:
        raise ValueError('Anade las filas de la tabla antes de importar.')
    if total is None:
        raise ValueError("No se encontro 'Amount Due Agent' en el statement.")
    for i, row in enumerate(rows, 1):
        for field in ('policy_number', 'agency_code', 'state', 'insured_name'):
            if not str(row.get(field) or '').strip():
                raise ValueError(f'Fila {i}: falta {field}.')
        fecha(row['tran_date'])
        importe(row['collected_premium'])
        importe(row['comm_amt'])
        try:
            rate = Decimal(re.sub(r'[^0-9.\-]', '', str(row['comm_rate'])) or '')
            if not rate.is_finite() or rate < 0 or rate > 100:
                raise InvalidOperation
        except InvalidOperation:
            raise ValueError(f'Fila {i}: Comm Rate invalido; escribe 8 para 8%.') from None
    if sum((importe(r['comm_amt']) for r in rows), Decimal(0)) != total:
        raise ValueError('La suma de Comm Amt no coincide con Amount Due Agent del statement; revisa las filas.')
    return total


def guardar(rows, month, file_name, contenido, original_ocr):
    """Igual patron que ASSURANCE: reintento identico no duplica, una fila corregida se
    actualiza en vez de bloquear todo el archivo. Las filas se identifican por su posicion
    dentro del archivo completo (no por pagina: la tabla puede repartirse en varias paginas).

    file_id se calcula del CONTENIDO del archivo (no del nombre): el mismo statement subido
    con otro nombre se reconoce igual como ya importado, en vez de duplicarse."""
    nombres_archivo(file_name)  # valida que el nombre sea utilizable
    file_id = calcular_file_id(contenido)
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        cursor.execute("SELECT GET_LOCK('staging_hub.st_slide_raw.import',10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError('Hay otra importacion de SLIDE en curso.')
        accounting = datetime.strptime(month, '%Y-%m').date()
        payloads = [json.dumps({'reviewed': row, 'original_ocr': original_ocr},
                               ensure_ascii=False, sort_keys=True) for row in rows]
        cursor.execute('SELECT id, source_row, source_data FROM staging_hub.st_slide_raw'
                       ' WHERE file_id=%s AND accounting_month=%s FOR UPDATE',
                       (file_id, accounting))
        existentes = {r['source_row']: r for r in cursor.fetchall()}
        for numero in existentes:
            if not 1 <= numero <= len(rows):
                raise ValueError('Este archivo tiene menos filas que la version ya guardada; no se elimino nada.')

        def sin_cambios(numero):
            previo = existentes.get(numero)
            if previo is None:
                return False
            guardado = json.loads(previo['source_data']) if isinstance(previo['source_data'], str) else previo['source_data']
            return guardado == json.loads(payloads[numero - 1])

        pendientes = []
        for numero, row in enumerate(rows, 1):
            row.setdefault('producer_code', row.get('agency_code'))
            # 'state' del statement (donde esta la poliza) es distinto del estado de la
            # franquicia resuelta; completar_franquicias sobreescribe row['state'] con este
            # ultimo, asi que el original se guarda aparte antes de llamarla.
            row['policy_state'] = row.get('state')
            if not sin_cambios(numero):
                pendientes.append(row)
        completar_franquicias(connection, pendientes)

        inserted = updated = 0
        for numero, row in enumerate(rows, 1):
            if sin_cambios(numero):
                continue
            previo = existentes.get(numero)
            efectiva, expiracion = _fechas_vigencia(row.get('eff_exp_date'))
            valores = (
                row.get('product_code') or None, row['policy_state'], row['agency_code'],
                row.get('agency_name') or None, row['policy_number'], row['insured_name'],
                efectiva, expiracion, fecha(row['tran_date']), row.get('tran_code') or None,
                importe(row['collected_premium']),
                (Decimal(re.sub(r'[^0-9.\-]', '', str(row['comm_rate'])) or '0') / 100)
                    .quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP),
                importe(row['comm_amt']), row.get('franchise_number'), row.get('franchise_number_source'),
                row.get('producer_name') or None, row.get('office_id'), row.get('state'),
                row.get('compass_policy_id'), row.get('policy_status'), row.get('term_length'),
                payloads[numero - 1],
            )
            if previo is not None:
                cursor.execute(
                    'UPDATE staging_hub.st_slide_raw SET product_code=%s, state=%s, agency_code=%s,'
                    ' agency_name=%s, policy_number=%s, insured_name=%s, policy_effective_date=%s,'
                    ' policy_expiration_date=%s, tran_date=%s, tran_code=%s, collected_premium=%s,'
                    ' comm_rate=%s, comm_amt=%s, franchise_number=%s, franchise_number_source=%s,'
                    ' producer_name=%s, office_id=%s, state_resolved=%s, compass_policy_id=%s,'
                    ' policy_status=%s, term_length=%s, source_data=%s WHERE id=%s',
                    valores + (previo['id'],))
                updated += 1
            else:
                cursor.execute(
                    'INSERT INTO staging_hub.st_slide_raw (product_code, state, agency_code, agency_name,'
                    ' policy_number, insured_name, policy_effective_date, policy_expiration_date, tran_date,'
                    ' tran_code, collected_premium, comm_rate, comm_amt, franchise_number,'
                    ' franchise_number_source, producer_name, office_id, state_resolved, compass_policy_id,'
                    ' policy_status, term_length, source_data, file_id, file_name, accounting_month,'
                    ' source_row) VALUES (' + ','.join(['%s'] * 26) + ')',
                    valores + (file_id, file_name, accounting, numero))
                inserted += 1
        connection.commit()
        return inserted, updated
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_slide_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()


def _normalizar_codigo(value):
    return str(value or '').strip().upper()


def variantes_poliza_slide(numero):
    """Compass puede llevar la edicion con un offset distinto al del statement (ej. '-01' del
    statement es '-00' en Compass) o directamente sin sufijo. Igual que en ORCHID. Tambien
    puede ser al reves: el statement no trae ningun sufijo pero Compass si (ej. 'SIC3442158'
    en el statement esta como 'SIC3442158-00' en Compass); se prueba agregando un sufijo antes
    de rendirse."""
    numero = re.sub(r'[^A-Z0-9-]', '', str(numero or '').strip().upper())
    if not numero:
        return []
    coincide = re.fullmatch(r'(.+)-(\d+)', numero)
    if not coincide:
        variantes = [numero]
        for edicion in range(0, 6):
            variantes.append(f'{numero}-{edicion}')
            variantes.append(f'{numero}-{edicion:02d}')
        return list(dict.fromkeys(variantes))
    base, sufijo_texto = coincide.group(1), coincide.group(2)
    sufijo, ancho = int(sufijo_texto), len(sufijo_texto)
    variantes = [numero, base]
    for edicion in [sufijo - 1] + [sufijo + n for n in range(1, 6)]:
        if edicion < 0:
            continue
        variantes.append(f'{base}-{edicion}')
        variantes.append(f'{base}-{str(edicion).zfill(ancho)}')
    return list(dict.fromkeys(v for v in variantes if v))


def _franquicias_vistas(connection, rows, agency_code):
    vistas = {str(r.get('franchise_number') or '').strip().upper()
              for r in rows
              if _normalizar_codigo(r.get('agency_code')) == _normalizar_codigo(agency_code) and r.get('franchise_number')}
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT DISTINCT franchise_number FROM staging_hub.st_slide_raw'
                       ' WHERE UPPER(agency_code)=UPPER(%s) AND franchise_number IS NOT NULL', (agency_code,))
        vistas |= {str(r['franchise_number']).strip().upper() for r in cursor.fetchall()}
    finally:
        cursor.close()
    vistas.discard('')
    return vistas


def _completar_por_nombre_cliente(rows, offices):
    """Ultimo respaldo antes de codigo-observado: busqueda visual por nombre del cliente en
    Company Search, para filas cuya poliza no se encontro ni en Compass ni en el historico.
    En lote (una sola llamada al bot) en vez de una por fila."""
    pendientes = [row for row in rows if not row.get('franchise_number') and str(row.get('insured_name') or '').strip()]
    if not pendientes:
        return
    nombres = list(dict.fromkeys(str(row['insured_name']).strip() for row in pendientes))
    clientes = [{'request_id': str(i), 'client_name': nombre} for i, nombre in enumerate(nombres)]
    try:
        resultados = buscar_franquicias_por_nombre(clientes)
    except ValueError:
        return
    por_nombre = {nombres[int(r['request_id'])]: r for r in resultados}
    for row in pendientes:
        resultado = por_nombre.get(str(row['insured_name']).strip())
        if not resultado or resultado.get('error'):
            continue
        numeros_oficina = {str(o['office_number']).strip() for o in resultado.get('offices', [])}
        if len(numeros_oficina) != 1:
            continue
        franquicia = _formatear_codigo_oficina(next(iter(numeros_oficina)))
        office = next((o for o in offices if _formatear_codigo_oficina(o['office_number']) == franquicia), None)
        if not franquicia or office is None:
            continue
        row.update(franchise_number=franquicia, franchise_number_source='compass_visual',
                   office_id=str(office['office_id']), state=row.get('state') or office.get('state'),
                   producer_name=office.get('office_name'), code_lookup_alert=None)


def completar_franquicias(connection, rows):
    """Agency Code -> tabla de codigos (carrier SLIDE) directo. Si no esta registrado o es
    master, se intenta por la poliza en Compass, luego historico, luego por nombre del cliente
    en Compass (busqueda visual, Company Search), y por ultimo si ese mismo Agency Code ya dio
    una franquicia unica en otras filas, se usa esa. Aunque el codigo ya resuelva directo,
    igual se consulta Compass (mejor esfuerzo) para completar
    compass_policy_id/policy_status/term_length."""
    if not rows:
        return
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT code, franchise, is_master_code FROM staging_hub.franchises_carrier_codes'
                       " WHERE UPPER(TRIM(carrier))='SLIDE'")
        codes = {}
        masters = set()
        franquicia_master = {}
        for entry in cursor.fetchall():
            code = _normalizar_codigo(entry['code'])
            franchise = str(entry.get('franchise') or '').strip().upper()
            if franchise and not franchise.startswith('DT'):
                franchise = _formatear_codigo_oficina(franchise) or franchise
            if entry.get('is_master_code'):
                masters.add(code)
                if franchise:
                    franquicia_master[code] = franchise
                continue
            codes.setdefault(code, set()).add(franchise)
        cursor.execute('SELECT office_id, office_number, office_name, state FROM staging_hub.offices')
        offices = cursor.fetchall()
    finally:
        cursor.close()
    oficinas_por_id = {str(o['office_id']).strip(): o for o in offices}
    # La franquicia master es el "ultimo recurso" cuando de verdad no se encuentra nada (ver
    # intentar_observado). Mientras SLIDE no tenga codigos registrados en
    # franchises_carrier_codes, no hay de donde sacarla y se usa DTF0120 como arranque; en
    # cuanto el usuario inserte el/los codigos master de SLIDE con su franquicia real, el
    # default sigue automaticamente a ese valor en vez de quedar pegado al literal.
    franquicia_default = next(iter(franquicia_master.values())) if len(franquicia_master) == 1 else 'DTF0120'

    def intentar_observado(row, mensaje_no_encontrado):
        vistas = _franquicias_vistas(connection, rows, row['agency_code'])
        if len(vistas) == 1:
            franquicia_previa = next(iter(vistas))
            office = next((o for o in offices if _formatear_codigo_oficina(o.get('office_number')) == franquicia_previa), None)
            row.update(franchise_number=franquicia_previa, franchise_number_source='codigo_observado',
                       office_id=str(office['office_id']) if office else None,
                       state=office.get('state') if office else None,
                       producer_name=office.get('office_name') if office else '', code_lookup_alert=None)
        else:
            # Ultimo recurso: si de verdad no se encontro nada (ni tabla de codigos, ni
            # Compass, ni historico, ni busqueda visual por nombre), o si el mismo codigo de
            # agencia aparece con franquicias distintas en otras filas del lote (un codigo de
            # sub-agencia de SLIDE puede cubrir varias franquicias reales, cada poliza resuelta
            # por su cuenta), se asigna la franquicia del codigo master como defecto en vez de
            # dejarla sin franquicia. La alerta se conserva para poder auditar que fue un valor
            # por defecto y no una resolucion real.
            if len(vistas) > 1:
                mensaje_no_encontrado = (f'{row["agency_code"]}: aparece con franquicias distintas en otras filas '
                                         f'({", ".join(sorted(vistas))}); revisa el codigo')
            office = next((o for o in offices if _formatear_codigo_oficina(o.get('office_number')) == franquicia_default), None)
            row.update(franchise_number=franquicia_default, franchise_number_source='default_master',
                       office_id=str(office['office_id']) if office else row.get('office_id'),
                       state=office.get('state') if office else row.get('state'),
                       producer_name=office.get('office_name') if office else row.get('producer_name'),
                       code_lookup_alert=mensaje_no_encontrado)

    token = None
    polizas = {}

    def consultar_poliza(numero):
        """Best-effort: solo para completar compass_policy_id/policy_status/term_length;
        nunca bloquea la resolucion de franquicia si Compass falla o no tiene la poliza."""
        nonlocal token
        if not numero:
            return None
        if numero not in polizas:
            try:
                if token is None:
                    token = compass.obtener_token()
                encontrada = None
                for variante in variantes_poliza_slide(numero):
                    encontrada = compass.buscar_poliza(token, variante)
                    if encontrada is not None:
                        break
                polizas[numero] = encontrada
            except (RequestException, MySQLError, ValueError, TypeError, KeyError):
                polizas[numero] = None
        return polizas[numero]

    def completar_desde_poliza(row, poliza):
        row.update(compass_policy_id=poliza.get('policy_id') or poliza.get('id'),
                   policy_status=poliza.get('status_id'))
        if not row.get('term_length'):
            row['term_length'] = calcular_term_length(poliza.get('effective_date'), poliza.get('expiration_date'))

    for row in rows:
        efectiva, expiracion = _fechas_vigencia(row.get('eff_exp_date'))
        row['term_length'] = calcular_term_length(efectiva, expiracion)
        code = _normalizar_codigo(row.get('agency_code'))
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
                completar_desde_poliza(row, poliza)
            continue
        row.update(franchise_number=None, franchise_number_source=None, office_id=None, state=None,
                   compass_policy_id=None, policy_status=None)
        numero = row.get('policy_number')
        if not numero:
            intentar_observado(row, f'{row["agency_code"]}: sin franquicia unica por codigo y sin poliza para consultar Compass')
            continue
        poliza = consultar_poliza(numero)
        if poliza is None:
            franquicia = ''
            for variante in variantes_poliza_slide(numero):
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
                # No se resolvio ni por Compass ni por historico: se deja pendiente para la
                # busqueda visual por nombre de cliente (en lote, despues de este for, en vez
                # de abrir el bot una vez por fila); si esa tampoco encuentra nada, cae a
                # codigo-observado con este mismo mensaje.
                row['_pendiente_nombre_cliente'] = (f'{row["agency_code"]}: poliza {numero} sin franquicia en la '
                                                    'tabla de codigos, Compass ni historico')
            continue
        office_id = str(poliza.get('office_id') or '').strip()
        office = oficinas_por_id.get(office_id)
        franquicia = _formatear_codigo_oficina(office.get('office_number')) if office else None
        row.update(office_id=office_id or None)
        completar_desde_poliza(row, poliza)
        if franquicia:
            row.update(franchise_number=franquicia, franchise_number_source='compass',
                       state=office.get('state'), producer_name=office.get('office_name') or '',
                       code_lookup_alert=None)
        else:
            # Compass encontro el registro de la poliza pero sin oficina resoluble (ej. el
            # office_id no corresponde a ninguna oficina nuestra); antes esto caia directo a
            # codigo-observado sin pasar por la busqueda visual por nombre, aunque esa SI
            # encuentra el cliente correctamente en casos reales. Se deja pendiente igual que
            # cuando Compass no encuentra nada.
            row['_pendiente_nombre_cliente'] = (f'{row["agency_code"]}: no se pudo determinar la franquicia de la '
                                                f'poliza {numero} en Compass')

    pendientes_nombre = [row for row in rows if '_pendiente_nombre_cliente' in row]
    _completar_por_nombre_cliente(pendientes_nombre, offices)
    for row in pendientes_nombre:
        mensaje = row.pop('_pendiente_nombre_cliente')
        if not row.get('franchise_number'):
            intentar_observado(row, mensaje)


def codigos_pendientes_de_registrar(connection):
    """Agency Code resueltos por Compass/historico/codigo_observado (no por la tabla),
    agrupados. Con una sola franquicia consistente se pueden registrar directo; con varias, es
    ambiguo (probablemente un codigo master real) y se marca para revision."""
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT agency_code AS code, GROUP_CONCAT(DISTINCT franchise_number ORDER BY franchise_number SEPARATOR ', ') AS franquicias,"
            ' COUNT(DISTINCT franchise_number) AS distintas, COUNT(*) AS filas,'
            " GROUP_CONCAT(DISTINCT state_resolved ORDER BY state_resolved SEPARATOR ', ') AS estados"
            " FROM staging_hub.st_slide_raw WHERE franchise_number IS NOT NULL"
            " AND franchise_number_source IN ('compass','historico','codigo_observado')"
            ' GROUP BY agency_code ORDER BY distintas DESC, agency_code')
        agrupado = cursor.fetchall()
        cursor.execute("SELECT DISTINCT UPPER(TRIM(code)) AS code FROM staging_hub.franchises_carrier_codes"
                       " WHERE UPPER(TRIM(carrier))='SLIDE'")
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
                       " WHERE UPPER(TRIM(carrier))='SLIDE' AND UPPER(TRIM(code))=UPPER(%s)", (code,))
        if cursor.fetchone():
            raise ValueError(f'El código {code} ya está registrado para SLIDE.')
        cursor.execute(
            'INSERT INTO staging_hub.franchises_carrier_codes'
            ' (file_name, franchise_name, franchise_soffront_name, carrier, code, agent_name, franchise, state_code)'
            ' VALUES (%s, %s, %s, %s, %s, %s, %s, %s)',
            (f'Registrado desde SLIDE por {changed_by} (resuelto por Compass/histórico)',
             '', '', 'SLIDE', code, '', franchise, state))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def cargar_comisiones_excel(connection, snapshot, carrier=None, state=None, business_line=None, *, consultar_tipos=False):
    """La franquicia recibe integro lo que SLIDE reporto (lo que entra es lo que sale), sin
    tabla de tarifas. Sin file_id en el snapshot, combina todos los archivos guardados de ese
    mes contable."""
    cursor = connection.cursor(dictionary=True)
    try:
        base = ('SELECT r.*, r.collected_premium AS premium_amount, r.comm_amt AS commission_amount,'
                ' r.comm_rate AS del_toro_percent, r.agency_code AS producer_code,'
                ' r.tran_code AS transaction_type, r.state_resolved AS state,'
                ' r.policy_effective_date AS effective_date'
                ' FROM staging_hub.st_slide_raw r WHERE r.accounting_month=%s')
        if snapshot.get('file_id'):
            cursor.execute(base + ' AND r.file_id=%s ORDER BY r.id',
                           (snapshot['rows'][0]['accounting_month'], snapshot['file_id']))
        else:
            cursor.execute(base + ' ORDER BY r.id', (snapshot['rows'][0]['accounting_month'],))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados de SLIDE para este mes.')
        for row in rows:
            row['carrier'] = 'SLIDE'
            row['transaction_type_source'] = 'statement'
            row['del_toro_percent_source'] = 'statement'
            completar_del_toro_statement(row)
            row['franchise_percent'] = row['del_toro_percent']
            row['franchise_commission'] = row['del_toro_commission']
            row['commission_alert'] = None if row.get('franchise_number') else (
                f"Agency {row.get('agency_code') or 'sin determinar'}: sin resolver para esta fila")
        return rows
    finally:
        cursor.close()

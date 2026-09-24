"""Importacion explicita, atomica y sin modificaciones al esquema."""
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import PurePosixPath
import hashlib
import re
from collections import Counter
from dataclasses import asdict

from database import conectar
from models import StCommonwealthRaw
from procesamiento import validar_preview
from repositories import StCommonwealthRawRepository
from calculos import calcular_porcentajes, calcular_term_length
import compass
from franquicias import cargar_codigos_master, resolver_franquicia, buscar_franquicia_historica
from oficinas import cargar_mapa_office_numbers


def completar_estados_compass(records, mapa_oficinas=None, codigos_master=None, *, buscar_historico=None):
    """Guarda status_id de Compass; una consulta por numero de poliza."""
    cache = {}
    cache_historico = {}
    def consultar_historico(numero):
        if numero not in cache_historico:
            cache_historico[numero] = buscar_historico(numero)
        return cache_historico[numero]
    token = None
    for record in records:
        numero = record.policy_number.strip()
        if not numero:
            record.compass_policy_id = None
            record.policy_effective_date = None
            record.term_length = None
            record.line_business_id = None
            record.office_id = None
            record.franchise_number = None
            continue
        record.policy_status = None
        if numero not in cache:
            if token is None:
                token = compass.obtener_token()
            cache[numero] = compass.buscar_poliza(token, numero)
        poliza = cache[numero]
        record.compass_policy_id = poliza.get('policy_id') if poliza else None
        raw_date = poliza.get('effective_date') if poliza else None
        record.policy_effective_date = date.fromisoformat(str(raw_date)[:10]) if raw_date else None
        record.term_length = calcular_term_length(poliza.get('effective_date'), poliza.get('expiration_date')) if poliza else None
        record.line_business_id = (poliza.get('line_business_id') or None) if poliza else None
        record.office_id = (str(poliza.get('office_id') or '').strip() or None) if poliza else None
        record.policy_status = (poliza.get('status_id') or None) if poliza else None
        if mapa_oficinas is not None:
            record.franchise_number = resolver_franquicia(
                {}, 'COMMONWEALTH', record.producer_name, numero,
                lambda _: poliza.get('office_id') if poliza else None,
                mapa_oficinas, record.producer_code, codigos_master,
                buscar_historico=consultar_historico if poliza is None and buscar_historico is not None else None)


def construir_registros(rows, uploaded_name, contenido):
    """file_id se calcula del CONTENIDO del archivo (no del nombre): el mismo statement subido
    con otro nombre se reconoce igual como ya importado, en vez de duplicarse."""
    rows = calcular_porcentajes(rows)
    errors = validar_preview(rows)
    if errors:
        raise ValueError(" ".join(errors))
    _, file_name = nombres_archivo(uploaded_name)
    file_id = calcular_file_id(contenido)
    records = []
    for index, row in enumerate(rows, 1):
        values = dict(row)
        chargeback = values.pop('_chargeback', False)
        required = ("transaction_type",) if chargeback else ("insured_name", "policy_number", "producer_code", "producer_name")
        for field in required:
            if not str(values.get(field) or "").strip():
                raise ValueError(f"Registro {index}: falta {field}.")
        try:
            values['accounting_month'] = datetime.strptime(values['accounting_month'], "%Y-%m").date()
            values['effective_date'] = (None if chargeback and not values['effective_date']
                                        else date.fromisoformat(values['effective_date']))
        except (ValueError, TypeError):
            raise ValueError(f"Registro {index}: usa mes YYYY-MM y fecha YYYY-MM-DD.") from None
        if values.get('roadside_flag') not in (('Y', 'N', '') if chargeback else ('Y', 'N')):
            raise ValueError(f"Registro {index}: Roadside debe ser Y o N.")
        for field in ('premium_amount', 'comm_percent', 'commission_amount'):
            values[field] = None if chargeback and field == 'premium_amount' else Decimal(values[field])
        # st_commonwealth_raw.comm_percent es DECIMAL(9,4).
        # Normalizar antes de comparar e insertar evita truncamiento y duplicados.
        values['comm_percent'] = values['comm_percent'].quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
        if chargeback:
            for field in ('insured_name', 'policy_number', 'roadside_flag', 'producer_code', 'producer_name'):
                values[field] = ''
            values['effective_date'] = None
            for field in ('compass_policy_id', 'policy_effective_date', 'term_length', 'line_business_id', 'office_id', 'policy_status', 'franchise_number', 'del_toro_percent', 'del_toro_commission', 'franchise_percent', 'franchise_commission'):
                values[field] = None
        records.append(StCommonwealthRaw(id=None, file_id=file_id, file_name=file_name, **values))
    return records


def nombres_archivo(uploaded_name):
    if not isinstance(uploaded_name, str) or not uploaded_name.strip():
        raise ValueError("El archivo debe tener un nombre.")
    name = PurePosixPath(uploaded_name.replace('\\', '/')).name
    if not name or name in ('.', '..'):
        raise ValueError("El nombre del archivo no es válido.")
    return name, PurePosixPath(name).stem


def calcular_file_id(contenido):
    """Identidad real de un archivo para deduplicar (reintento identico no duplica): hash del
    CONTENIDO, no del nombre. El mismo PDF descargado varias veces de un correo (o reenviado)
    puede llegar con nombres distintos cada vez, pero el contenido es igual; con el nombre
    solo, ese mismo statement se importaria de nuevo sin que el sistema lo reconociera."""
    if not contenido:
        raise ValueError('El archivo esta vacio.')
    return hashlib.sha256(contenido).hexdigest()


def buscar_posibles_duplicados(connection, tabla, columna_policy, columna_monto, accounting_month, file_id_actual, pares):
    """file_id se calcula solo a partir del nombre del archivo (nombres_archivo), asi que el
    mismo statement subido con otro nombre (ej. un adjunto de correo descargado varias veces)
    no se reconoce como el mismo archivo y se importa de nuevo sin avisar. Esto compara por
    contenido (policy_number + monto) contra lo ya guardado ese mes en otros archivos, para
    poder avisar (sin bloquear) antes de guardar. 'pares' es una lista de (policy_number, monto)
    a revisar; devuelve solo los que ya existen en algun otro archivo."""
    if not pares:
        return []
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute(
            f'SELECT {columna_policy} AS policy_number, {columna_monto} AS monto, file_name'
            f' FROM staging_hub.{tabla} WHERE accounting_month=%s AND file_id<>%s',
            (accounting_month, file_id_actual))
        existentes = cursor.fetchall()
    finally:
        cursor.close()
    archivos_por_clave = {}
    for r in existentes:
        clave = (str(r['policy_number'] or '').strip(), str(r['monto']))
        archivos_por_clave.setdefault(clave, set()).add(r['file_name'])
    resultado = []
    vistos = set()
    for policy_number, monto in pares:
        clave = (str(policy_number or '').strip(), str(monto))
        if not clave[0] or clave in vistos:
            continue
        vistos.add(clave)
        archivos = archivos_por_clave.get(clave)
        if archivos:
            resultado.append({'policy_number': policy_number, 'monto': monto, 'archivos': sorted(archivos)})
    return resultado


MATCH_FIELDS = ('accounting_month', 'insured_name', 'policy_number', 'effective_date',
                'roadside_flag', 'premium_amount', 'comm_percent', 'commission_amount',
                'producer_code', 'producer_name')


def registros_faltantes(records, existing):
    def signature(row):
        return tuple(row[field] for field in MATCH_FIELDS) + ((row.get('transaction_type') if not row.get('policy_number') else None),)
    available = Counter(signature(row) for row in existing)
    expected = Counter(signature(asdict(record)) for record in records)
    if available - expected:
        raise ValueError('Hay registros guardados para este archivo y mes que difieren del archivo cargado o aparecen más veces. Revisa esas diferencias antes de continuar; no se modificaron datos.')
    missing = []
    for record in records:
        key = signature(asdict(record))
        if available[key]:
            available[key] -= 1
        else:
            missing.append(record)
    return missing


def importar(rows, uploaded_name, contenido):
    records = construir_registros(rows, uploaded_name, contenido)
    _, file_name = nombres_archivo(uploaded_name)
    file_id = calcular_file_id(contenido)
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    locked = False
    try:
        connection.raise_on_warnings = True
        cursor.execute("SELECT GET_LOCK('staging_hub.st_commonwealth_raw.import', 10) AS acquired")
        locked = cursor.fetchone()['acquired'] == 1
        if not locked:
            raise ValueError("Hay otra importación en curso. Intenta de nuevo.")
        cursor.execute("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA='staging_hub' AND TABLE_NAME='st_commonwealth_raw'")
        table = cursor.fetchone()
        if not table or table['ENGINE'].upper() != 'INNODB':
            raise ValueError("La importación necesita una tabla InnoDB para poder revertir errores.")
        cursor.execute("SHOW COLUMNS FROM staging_hub.st_commonwealth_raw")
        columns = {row['Field']: row for row in cursor.fetchall()}
        file_type = columns.get('file_id', {}).get('Type', '').lower()
        if not any(kind in file_type for kind in ('char', 'text')):
            raise ValueError("La columna file_id es numérica en MySQL, pero debe guardar el nombre con extensión. Se necesita adaptar el esquema antes de importar; consulta sql/ajustar_commonwealth.sql.")
        if 'auto_increment' not in columns.get('id', {}).get('Extra', ''):
            raise ValueError("id no es autoincremental. Debemos definir su asignación antes de importar.")
        if 'producer_name' not in columns:
            raise ValueError("La tabla no contiene producer_name.")
        if 'transaction_type' not in columns:
            raise ValueError("Falta transaction_type; ejecuta sql/agregar_commonwealth_transaction_type.sql antes de importar.")
        if 'policy_status' not in columns:
            raise ValueError("Falta policy_status; ejecuta sql/agregar_commonwealth_policy_status.sql.")
        completar_estados_compass(records, cargar_mapa_office_numbers(connection),
                                 cargar_codigos_master(connection),
                                 buscar_historico=lambda numero: buscar_franquicia_historica(connection, numero))
        cargos = [r for r in records if not r.policy_number and r.transaction_type]
        if cargos:
            from chargebacks_commonwealth import completar_chargebacks
            datos = [{'policy_number': '', 'transaction_type': r.transaction_type} for r in cargos]
            completar_chargebacks(connection, datos)
            for registro, dato in zip(cargos, datos):
                registro.franchise_number = dato['franchise_number']
        for field, column in columns.items():
            size = re.match(r"(?:var)?char\((\d+)\)", column.get('Type', ''), re.I)
            if size:
                limit = int(size[1])
                for index, record in enumerate(records, 1):
                    value = getattr(record, field, None)
                    if isinstance(value, str) and len(value) > limit:
                        raise ValueError(f"Registro {index}: {field} contiene {len(value)} caracteres, pero MySQL admite solo {limit}. Amplía la columna para conservar el valor completo. No se insertaron registros.")
        if any(record.effective_date is None for record in records) and columns.get('effective_date', {}).get('Null') != 'YES':
            raise ValueError("Los chargebacks no tienen fecha en el PDF y effective_date no admite NULL. Debemos definir qué fecha corresponde a esos cargos antes de importar.")
        cursor.execute(
            "SELECT " + ', '.join((*MATCH_FIELDS, 'transaction_type')) +
            " FROM staging_hub.st_commonwealth_raw WHERE (file_id=%s OR file_name=%s) AND accounting_month=%s FOR UPDATE",
            (file_id, file_name, records[0].accounting_month),
        )
        missing = registros_faltantes(records, cursor.fetchall())
        repo = StCommonwealthRawRepository(connection)
        for record in missing:
            repo.insertar(record)
        connection.commit()
        return len(missing)
    except Exception:
        connection.rollback()
        raise
    finally:
        try:
            if locked:
                cursor.execute("SELECT RELEASE_LOCK('staging_hub.st_commonwealth_raw.import')")
                cursor.fetchone()
        finally:
            cursor.close()
            connection.close()

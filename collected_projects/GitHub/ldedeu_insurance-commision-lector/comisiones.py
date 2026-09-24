"""Alta, edicion, historico e importacion masiva de comisiones por estado,
carrier, tipo de transaccion y linea de negocio."""
import re
from decimal import Decimal, InvalidOperation
from io import BytesIO

from openpyxl import load_workbook

from carriers import cargar_carriers
from database import conectar
from lineas_negocio import cargar_lineas_negocio
from models import CommissionRate, CommissionRateHistory
from repositories import CommissionRateRepository

TRANSACTION_TYPES = (("NEW_BUSINESS", "New Business"), ("RENEWAL", "Renewal"))

STATES = (
    ("AL", "Alabama"), ("AK", "Alaska"), ("AZ", "Arizona"), ("AR", "Arkansas"),
    ("CA", "California"), ("CO", "Colorado"), ("CT", "Connecticut"), ("DE", "Delaware"),
    ("DC", "District of Columbia"), ("FL", "Florida"), ("GA", "Georgia"), ("HI", "Hawaii"),
    ("ID", "Idaho"), ("IL", "Illinois"), ("IN", "Indiana"), ("IA", "Iowa"),
    ("KS", "Kansas"), ("KY", "Kentucky"), ("LA", "Louisiana"), ("ME", "Maine"),
    ("MD", "Maryland"), ("MA", "Massachusetts"), ("MI", "Michigan"), ("MN", "Minnesota"),
    ("MS", "Mississippi"), ("MO", "Missouri"), ("MT", "Montana"), ("NE", "Nebraska"),
    ("NV", "Nevada"), ("NH", "New Hampshire"), ("NJ", "New Jersey"), ("NM", "New Mexico"),
    ("NY", "New York"), ("NC", "North Carolina"), ("ND", "North Dakota"), ("OH", "Ohio"),
    ("OK", "Oklahoma"), ("OR", "Oregon"), ("PA", "Pennsylvania"), ("RI", "Rhode Island"),
    ("SC", "South Carolina"), ("SD", "South Dakota"), ("TN", "Tennessee"), ("TX", "Texas"),
    ("UT", "Utah"), ("VT", "Vermont"), ("VA", "Virginia"), ("WA", "Washington"),
    ("WV", "West Virginia"), ("WI", "Wisconsin"), ("WY", "Wyoming"),
)

TABLES = ("commission_rates", "commission_rate_history")

_STATE_LOOKUP = {code: code for code, _ in STATES}
_STATE_LOOKUP.update({name.upper(): code for code, name in STATES})

_SHEET_TOKEN_PATTERN = re.compile(r"[_\-]+")


def validar_percent(valor):
    try:
        percent = Decimal(str(valor))
        if not percent.is_finite() or percent < 0:
            raise InvalidOperation
    except (InvalidOperation, TypeError):
        raise ValueError("La comisión debe ser un número finito no negativo.") from None
    if len(format(percent, 'f').partition('.')[2].rstrip('0')) > 6:
        raise ValueError('La tabla admite hasta 6 decimales. El valor no se guardó porque requeriría redondearlo.')
    return percent


def _verificar_esquema(connection):
    cursor = connection.cursor(dictionary=True)
    try:
        for table in TABLES:
            cursor.execute(
                "SELECT ENGINE FROM information_schema.TABLES"
                " WHERE TABLE_SCHEMA='staging_hub' AND TABLE_NAME=%s",
                (table,),
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(
                    f"Falta la tabla staging_hub.{table}. Ejecuta sql/crear_comisiones.sql y"
                    " sql/agregar_linea_negocio.sql antes de continuar."
                )
            if row["ENGINE"].upper() != "INNODB":
                raise ValueError(f"staging_hub.{table} debe ser InnoDB para poder revertir errores.")
    finally:
        cursor.close()


def crear_comision(state, carrier, transaction_type, business_line, franchise_percent, del_toro_percent, changed_by):
    changed_by = str(changed_by).strip()
    if not changed_by:
        raise ValueError("Indica quién crea la comisión.")
    franchise_percent = validar_percent(franchise_percent)
    del_toro_percent = validar_percent(del_toro_percent)
    connection = conectar()
    try:
        _verificar_esquema(connection)
        repo = CommissionRateRepository(connection)
        if repo.bloquear_por_clave(state, carrier, transaction_type, business_line, del_toro_percent):
            raise ValueError(
                "Ya existe una comisión para ese estado, carrier, tipo de transacción y línea de negocio."
                " Edítala en vez de crear otra."
            )
        registro = CommissionRate(id=None, state=state, carrier=carrier, transaction_type=transaction_type,
                                   business_line=business_line, franchise_percent=franchise_percent,
                                   del_toro_percent=del_toro_percent, updated_by=changed_by)
        rate_id = repo.crear(registro)
        repo.registrar_historial(CommissionRateHistory(
            id=None, rate_id=rate_id, state=state, carrier=carrier, transaction_type=transaction_type,
            business_line=business_line, previous_franchise_percent=None, new_franchise_percent=franchise_percent,
            previous_del_toro_percent=None, new_del_toro_percent=del_toro_percent, changed_by=changed_by,
        ))
        connection.commit()
        return rate_id
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def actualizar_comision(rate_id, nuevo_franchise_percent, nuevo_del_toro_percent, nuevo_business_line, changed_by):
    changed_by = str(changed_by).strip()
    if not changed_by:
        raise ValueError("Indica quién edita la comisión.")
    nuevo_franchise_percent = validar_percent(nuevo_franchise_percent)
    nuevo_del_toro_percent = validar_percent(nuevo_del_toro_percent)
    nuevo_business_line = str(nuevo_business_line or "").strip()
    connection = conectar()
    try:
        _verificar_esquema(connection)
        repo = CommissionRateRepository(connection)
        actual = repo.bloquear_por_id(rate_id)
        if not actual:
            raise ValueError("La comisión ya no existe. Actualiza la lista.")
        if actual["transaction_type"] == "RENEWAL" and nuevo_business_line != "":
            raise ValueError(
                "Renewal y una línea de negocio específica no se combinan. Deja la línea de "
                "negocio vacía para esta comisión."
            )
        sin_cambios = (actual["franchise_percent"] == nuevo_franchise_percent
                       and actual["del_toro_percent"] == nuevo_del_toro_percent
                       and actual["business_line"] == nuevo_business_line)
        if sin_cambios:
            raise ValueError("Los datos son iguales a los actuales; no se registró ningún cambio.")
        if nuevo_business_line != actual["business_line"]:
            existente = repo.bloquear_por_clave(actual["state"], actual["carrier"], actual["transaction_type"],
                                                nuevo_business_line, nuevo_del_toro_percent)
            if existente and existente["id"] != rate_id:
                raise ValueError(
                    "Ya existe una comisión para ese estado, carrier, tipo de transacción, línea de negocio y "
                    "porcentaje Del Toro. Edítala en vez de duplicarla."
                )
        repo.actualizar_percent(rate_id, nuevo_franchise_percent, nuevo_del_toro_percent, nuevo_business_line, changed_by)
        repo.registrar_historial(CommissionRateHistory(
            id=None, rate_id=rate_id, state=actual["state"], carrier=actual["carrier"],
            transaction_type=actual["transaction_type"], business_line=nuevo_business_line,
            previous_franchise_percent=actual["franchise_percent"], new_franchise_percent=nuevo_franchise_percent,
            previous_del_toro_percent=actual["del_toro_percent"], new_del_toro_percent=nuevo_del_toro_percent,
            changed_by=changed_by,
        ))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def listar_comisiones():
    connection = conectar()
    try:
        _verificar_esquema(connection)
        return CommissionRateRepository(connection).listar()
    finally:
        connection.close()


def obtener_historial(rate_id):
    connection = conectar()
    try:
        return CommissionRateRepository(connection).historial(rate_id)
    finally:
        connection.close()


def _analizar_nombre_hoja(sheet_name, lineas_por_upper):
    """Separa estado, tipo de transaccion y lineas de negocio del nombre de hoja.

    El primer token (separado por '_' o '-') es el estado ('TX' o 'TEXAS');
    el resto son modificadores, pero solo de un tipo a la vez: o 'RN' (marca
    Renewal) o una o mas lineas de negocio conocidas
    (config/business_lines.json), por ejemplo 'TEXAS_R-MC-CV' aplica a las
    lineas R, MC y CV. RN y una linea de negocio no se combinan en la misma
    hoja. Sin ningun modificador, o con RN solo, la linea de negocio es
    general (business_line=''); sin RN, el tipo de transaccion es siempre
    New Business.

    Devuelve (state_part, transaction_type, business_lines) o (None, None, None)
    mas un mensaje de error como ultimo elemento de la tupla.
    """
    tokens = [token for token in _SHEET_TOKEN_PATTERN.split(str(sheet_name).strip()) if token]
    if not tokens:
        return None, None, None, "el nombre de la hoja está vacío."
    state_part = tokens[0].upper()
    transaction_type = "NEW_BUSINESS"
    business_lines = []
    desconocidos = []
    for token in tokens[1:]:
        upper = token.upper()
        if upper == "RN":
            transaction_type = "RENEWAL"
        elif upper in lineas_por_upper:
            business_lines.append(lineas_por_upper[upper])
        else:
            desconocidos.append(token)
    if desconocidos:
        return None, None, None, (
            f"el modificador '{', '.join(desconocidos)}' no es RN ni una línea de negocio conocida"
            " (config/business_lines.json)."
        )
    if transaction_type == "RENEWAL" and business_lines:
        return None, None, None, (
            "el nombre de la hoja combina RN con una línea de negocio; usa RN o una línea de"
            " negocio, no ambos en la misma hoja."
        )
    if not business_lines:
        business_lines = [""]
    return state_part, transaction_type, business_lines, None


def _normalizar_encabezado(valor):
    return re.sub(r"[^a-z0-9]", "", str(valor or "").strip().lower())


def _localizar_columnas(headers, sheet_name, errores):
    normalizados = [_normalizar_encabezado(h) for h in headers]
    indices = {}
    if "carrier" in normalizados:
        indices["carrier"] = normalizados.index("carrier")
    for clave, prefijo in (("franchise_percent", "franchise"), ("del_toro_percent", "deltoro")):
        match = next((i for i, h in enumerate(normalizados) if h.startswith(prefijo)), None)
        if match is not None:
            indices[clave] = match
    faltantes = [nombre for nombre in ("carrier", "franchise_percent", "del_toro_percent") if nombre not in indices]
    if faltantes:
        errores.append(f"Hoja '{sheet_name}': faltan columnas para {', '.join(faltantes)}.")
        return None
    return indices


def parsear_excel_comisiones(data):
    """Valida y normaliza un libro de comisiones; no toca MySQL.

    Cada hoja representa un estado ('TX' o 'TEXAS') seguido opcionalmente de
    modificadores separados por '_' o '-', pero de un solo tipo: 'RN' para
    Renewal, o una o mas lineas de negocio conocidas (ej. 'TEXAS_R-MC-CV');
    RN y una linea de negocio no se combinan en la misma hoja. Sin ninguna
    linea de negocio en el nombre, la hoja es una comision general
    (business_line vacio). Cada fila trae Carrier, Franchise% y DelToro%
    (los porcentajes ya son fracciones, ej. 0.08 para 8%, igual que en el
    resto de la app). Una hoja con varias lineas de negocio genera una fila
    por linea, con los
    mismos porcentajes.
    """
    try:
        carrier_names = cargar_carriers()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ValueError(f"No se pudo cargar el catálogo de carriers: {exc}") from None
    carrier_by_upper = {name.upper(): name for name in carrier_names}

    try:
        lineas_negocio = cargar_lineas_negocio()
    except (OSError, ValueError, KeyError, TypeError) as exc:
        raise ValueError(f"No se pudo cargar el catálogo de líneas de negocio: {exc}") from None
    lineas_por_upper = {linea.upper(): linea for linea in lineas_negocio}

    book = load_workbook(BytesIO(data), read_only=True, data_only=True)
    try:
        errores = []
        filas = []
        vistos = set()
        for sheet_name in book.sheetnames:
            state_part, transaction_type, business_lines, error = _analizar_nombre_hoja(sheet_name, lineas_por_upper)
            if error:
                errores.append(f"Hoja '{sheet_name}': {error}")
                continue
            state_code = _STATE_LOOKUP.get(state_part)
            if state_code is None:
                errores.append(f"Hoja '{sheet_name}': '{state_part}' no es un estado reconocido (código de 2 letras o nombre completo en inglés).")
                continue
            rows = list(book[sheet_name].iter_rows(values_only=True))
            if not rows:
                continue
            indices = _localizar_columnas(rows[0], sheet_name, errores)
            if indices is None:
                continue
            for row_number, row in enumerate(rows[1:], start=2):
                if all(value is None for value in row):
                    continue
                carrier_raw = row[indices["carrier"]] if indices["carrier"] < len(row) else None
                carrier = str(carrier_raw or "").strip()
                if not carrier:
                    continue
                nombre_catalogo = carrier_by_upper.get(carrier.upper())
                if nombre_catalogo is None:
                    errores.append(f"Hoja '{sheet_name}' fila {row_number}: el carrier '{carrier}' no está en config/carriers.json.")
                    continue
                try:
                    franchise_percent = validar_percent(row[indices["franchise_percent"]])
                except ValueError:
                    errores.append(f"Hoja '{sheet_name}' fila {row_number}: Franchise% inválido.")
                    continue
                try:
                    del_toro_percent = validar_percent(row[indices["del_toro_percent"]])
                except ValueError:
                    errores.append(f"Hoja '{sheet_name}' fila {row_number}: DelToro% inválido.")
                    continue
                for business_line in business_lines:
                    clave = (state_code, nombre_catalogo, transaction_type, business_line, del_toro_percent)
                    if clave in vistos:
                        errores.append(
                            f"Hoja '{sheet_name}' fila {row_number}: '{nombre_catalogo}' ya aparece antes para"
                            f" {state_code}/{transaction_type}/{business_line}."
                        )
                        continue
                    vistos.add(clave)
                    filas.append({
                        "state": state_code, "carrier": nombre_catalogo, "transaction_type": transaction_type,
                        "business_line": business_line, "franchise_percent": franchise_percent,
                        "del_toro_percent": del_toro_percent, "sheet": sheet_name, "row": row_number,
                    })
        if errores:
            raise ValueError(" ".join(dict.fromkeys(errores)))
        if not filas:
            raise ValueError("El archivo no contiene registros para importar.")
        return filas
    finally:
        book.close()


def importar_excel_comisiones(data, changed_by):
    changed_by = str(changed_by).strip()
    if not changed_by:
        raise ValueError("Indica quién importa las comisiones.")
    filas = parsear_excel_comisiones(data)
    connection = conectar()
    try:
        _verificar_esquema(connection)
        repo = CommissionRateRepository(connection)
        creadas = actualizadas = sin_cambios = 0
        for fila in filas:
            existente = repo.bloquear_por_clave(fila["state"], fila["carrier"], fila["transaction_type"], fila["business_line"], fila["del_toro_percent"])
            if not existente:
                registro = CommissionRate(
                    id=None, state=fila["state"], carrier=fila["carrier"], transaction_type=fila["transaction_type"],
                    business_line=fila["business_line"], franchise_percent=fila["franchise_percent"],
                    del_toro_percent=fila["del_toro_percent"], updated_by=changed_by,
                )
                rate_id = repo.crear(registro)
                repo.registrar_historial(CommissionRateHistory(
                    id=None, rate_id=rate_id, state=fila["state"], carrier=fila["carrier"],
                    transaction_type=fila["transaction_type"], business_line=fila["business_line"],
                    previous_franchise_percent=None, new_franchise_percent=fila["franchise_percent"],
                    previous_del_toro_percent=None, new_del_toro_percent=fila["del_toro_percent"], changed_by=changed_by,
                ))
                creadas += 1
            elif (existente["franchise_percent"] == fila["franchise_percent"]
                  and existente["del_toro_percent"] == fila["del_toro_percent"]):
                sin_cambios += 1
            else:
                repo.actualizar_percent(existente["id"], fila["franchise_percent"], fila["del_toro_percent"], fila["business_line"], changed_by)
                repo.registrar_historial(CommissionRateHistory(
                    id=None, rate_id=existente["id"], state=fila["state"], carrier=fila["carrier"],
                    transaction_type=fila["transaction_type"], business_line=fila["business_line"],
                    previous_franchise_percent=existente["franchise_percent"], new_franchise_percent=fila["franchise_percent"],
                    previous_del_toro_percent=existente["del_toro_percent"], new_del_toro_percent=fila["del_toro_percent"],
                    changed_by=changed_by,
                ))
                actualizadas += 1
        connection.commit()
        return {"creadas": creadas, "actualizadas": actualizadas, "sin_cambios": sin_cambios, "total": len(filas)}
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

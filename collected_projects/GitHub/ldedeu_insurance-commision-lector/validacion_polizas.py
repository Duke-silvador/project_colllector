"""Cruce local de pólizas Compass con todas las hojas de producción."""
from io import BytesIO
from datetime import datetime, timezone
import re
from itertools import islice
from xml.etree import ElementTree
from zipfile import ZipFile

from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font


def _agregar_reporte_excel(libro, detalle, nombre_archivo, encabezados):
    hojas_origen = libro.sheetnames[:]
    hoja = libro.create_sheet("Reporte de validación")
    encontradas = sum(f["Estado"] == "Encontrada" for f in detalle)
    sin_numero = sum(f["Estado"] == "Sin Policy Number" for f in detalle)
    resumen = [
        ["Reporte de validación de pólizas"],
        ["Archivo", nombre_archivo],
        ["Fecha UTC", datetime.now(timezone.utc).isoformat()],
        ["Cantidad de hojas de origen", len(hojas_origen)],
        *[[f"Hoja {i}", nombre, "Fila de encabezados", encabezado]
          for i, (nombre, encabezado) in enumerate(zip(hojas_origen, encabezados), 1)],
        ["Filas de Compass", len(detalle)], ["Encontradas", encontradas],
        ["No encontradas", len(detalle) - encontradas - sin_numero],
        ["Sin Policy Number", sin_numero], ["Filas en rojo", len(detalle) - encontradas],
        ["Criterio", "Policy Number en Policy/Police; ambos valores se comparan normalizados "
                     "(sin mayúsculas/minúsculas, espacios, guiones ni otros caracteres que no sean letras o números); sin comparar fechas"],
        ["United", "Prefijo en LOB y número sin ceros iniciales en Policy de la misma fila; ambos valores normalizados antes de separar letras y dígitos. "
                   "Si no aparece, se quita el prefijo de letras y se busca el resto del número en cualquier hoja, sin exigir que coincida con LOB"],
        ["National General / National Florida excepto Flood", "Mismo valor normalizado que el resto de reglas, conservando el orden de todos los dígitos y ceros; sin longitud fija"],
        ["Progressive", "Primero el valor normalizado (letras y números); si no aparece, quitar el prefijo de letras y buscar el resto del número en cualquier hoja; "
                        "si tampoco aparece y el prefijo es UAO/UAM, buscar como United por LOB y número sin ceros iniciales"],
        ["Otro mes", 'Las dos primeras hojas de producción son los meses esperados. Si la póliza no aparece en ninguna de esas dos pero sí en una hoja posterior, '
                     'se indica en Observación: "Match con otro mes: <hoja>"'],
        [],
    ]
    columnas = ["Fila Excel", "Policy Number", "Estado", "Hojas encontradas", "Regla",
                "LOB buscado", "Policy buscado", "Observación", "Carrier"]
    for fila in resumen:
        hoja.append(fila)
    # append([]) avanza la fila de escritura, pero no max_row.
    fila_encabezado = len(resumen) + 1
    hoja.append(columnas)
    for numero_fila, fila in enumerate(detalle, fila_encabezado + 1):
        hoja.append([fila.get(columna, "") for columna in columnas])
        if fila["Estado"] != "Encontrada":
            for columna in range(1, len(columnas) + 1):
                hoja.cell(numero_fila, columna).fill = PatternFill(fill_type="solid", fgColor="FFFFC7CE")
    # Los valores de origen se exportan como texto, nunca como fórmulas.
    for fila in hoja.iter_rows():
        for celda in fila:
            if isinstance(celda.value, str):
                celda.data_type = "s"
    for celda in hoja[fila_encabezado]:
        celda.font = Font(bold=True)
    hoja.freeze_panes = f"C{fila_encabezado + 1}"
    hoja.auto_filter.ref = f"A{fila_encabezado}:I{hoja.max_row}"
    for columna, ancho in zip("ABCDEFGHI", (38, 35, 25, 35, 55, 20, 30, 65, 35)):
        hoja.column_dimensions[columna].width = ancho


def nombres_hojas_excel(data):
    """Lee los nombres en orden sin cargar las celdas del archivo."""
    with ZipFile(BytesIO(data)) as archivo:
        raiz = ElementTree.fromstring(archivo.read("xl/workbook.xml"))
    return [hoja.attrib["name"] for hoja in raiz.findall("{*}sheets/{*}sheet")]


def _numero(valor):
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    return str(valor).strip().casefold()


def _normalizar(valor):
    """Valor listo para comparar: sin mayúsculas/minúsculas, espacios, guiones ni
    ningún otro carácter que no sea letra o número. Se aplica a ambos lados de
    cualquier comparación, en todas las reglas (Policy Number, United, National
    General/Florida y Progressive)."""
    return re.sub(r"[^0-9a-z]+", "", _numero(valor))


def _columna(hoja, nombre, encabezado, *, opcional=False, alias=()):
    columnas = [celda.column for celda in hoja[encabezado]
                if _numero(celda.value) in {nombre.casefold(), *alias}]
    if not columnas and opcional:
        return None
    if len(columnas) != 1:
        raise ValueError(
            f'La hoja "{hoja.title}" debe tener una única columna "{nombre}" '
            f'en la fila {encabezado}.'
        )
    return columnas[0]


def _digitos_united(valor):
    numero = _normalizar(valor)
    return (numero.lstrip("0") or "0") if re.fullmatch(r"[0-9]+", numero) else None


def _clave_united(valor):
    partes = re.fullmatch(r"([a-z]+)([0-9]+)", _normalizar(valor))
    return (partes[1], _digitos_united(partes[2])) if partes else None


def _sin_prefijo_letras(valor):
    """Valor normalizado quitando el prefijo de letras inicial, si lo tiene
    (p. ej. "MC984008227" -> "984008227"). Regla específica de United: cuando el
    prefijo no es realmente un LOB que aparezca en producción, se busca el resto
    del número tal cual, sin exigir que las letras coincidan con la columna LOB."""
    return re.sub(r"^[a-z]+", "", _normalizar(valor))


def _filas_por_lotes(hoja, encabezado, tamano_lote, progreso):
    filas = iter(hoja.iter_rows(min_row=encabezado + 1))
    procesadas = 0
    total = max(0, (hoja.max_row or 0) - encabezado)
    while lote := list(islice(filas, tamano_lote)):
        for fila in lote:
            procesadas += 1
            yield encabezado + procesadas, fila
        if progreso:
            progreso(f'Hoja {hoja.title}: {procesadas:,} / {total:,} filas',
                     min(procesadas / max(total, 1), 1.0))


def validar_polizas(data: bytes, encabezados=None, *, tamano_lote=5000, progreso=None, nombre_archivo=""):
    """Devuelve una copia XLSX con faltantes en rojo y detalle por fila principal.

    El Excel de salida conserva el valor original tal cual llegó (puntuación y
    ceros iniciales incluidos); la comparación en sí ignora mayúsculas/minúsculas,
    espacios, guiones y cualquier otro carácter que no sea letra o número en
    ambos lados. Una coincidencia en cualquiera de las otras hojas basta, sin
    usar fechas.
    """
    if type(tamano_lote) is not int or tamano_lote < 1:
        raise ValueError("El tamaño de lote debe ser un entero positivo.")
    if progreso:
        progreso("Abriendo Excel para conservar sus hojas y formatos…", 0.0)
    libro = load_workbook(BytesIO(data))
    valores = None
    try:
        cantidad_hojas = len(libro.worksheets)
        if cantidad_hojas < 2:
            raise ValueError("El Excel debe contener al menos dos hojas: Compass y una hoja de producción.")
        if encabezados is None:
            encabezados = (1,) * cantidad_hojas
        if len(encabezados) != cantidad_hojas or any(type(n) is not int or n < 1 for n in encabezados):
            raise ValueError(f"Indica una fila de encabezados válida para cada una de las {cantidad_hojas} hojas.")
        # Lectura secuencial: evita una segunda copia completa de celdas en memoria.
        valores = load_workbook(BytesIO(data), data_only=True, read_only=True)
        columnas = [_columna(hoja, nombre, fila, alias=("police",) if nombre == "Policy" else ()) for hoja, nombre, fila in zip(
            valores.worksheets, ("Policy Number",) + ("Policy",) * (cantidad_hojas - 1), encabezados
        )]
        carrier_col = _columna(valores.worksheets[0], "Carrier", encabezados[0], opcional=True)
        linea_col = _columna(valores.worksheets[0], "Line of Bussinees", encabezados[0],
                             opcional=True, alias=("line of business", "line of bussiness", "line of bussines"))
        lob_cols = [_columna(hoja, "LOB", encabezado, opcional=True)
                    for hoja, encabezado in zip(valores.worksheets[1:], encabezados[1:])]
        indices = []
        indices_united = []
        for hoja, columna, encabezado, lob_col in zip(valores.worksheets[1:], columnas[1:], encabezados[1:], lob_cols):
            numeros = set()
            pares_united = set()
            if progreso:
                progreso(f"Leyendo pólizas de {hoja.title}…", 0.0)
            for _, fila in _filas_por_lotes(hoja, encabezado, tamano_lote, progreso):
                celda = fila[columna - 1]
                # Un valor que solo trae espacios/guiones/símbolos normaliza a "" y no
                # identifica ninguna póliza: se excluye para que no "empate" con otro
                # valor igual de vacío del lado de Compass.
                valor = _normalizar(celda.value)
                if valor and celda.data_type != "e":
                    numeros.add(valor)
                    if lob_col:
                        lob = fila[lob_col - 1]
                        digitos = _digitos_united(celda.value)
                        if digitos is not None and _normalizar(lob.value) and lob.data_type != "e":
                            pares_united.add((_normalizar(lob.value), digitos))
            indices.append(numeros)
            indices_united.append(pares_united)
        # Las dos primeras hojas de producción (justo después de Compass) son los
        # meses esperados; cualquier otra hoja posterior cuenta como "otro mes".
        hojas_esperadas = {hoja.title for hoja in valores.worksheets[1:3]}
        detalle = []
        rojo = PatternFill(fill_type="solid", fgColor="FFFFC7CE")
        principal = libro.worksheets[0]
        ancho = principal.max_column
        if progreso:
            progreso(f"Validando {principal.title}…", 0.0)
        for numero_fila, fila in _filas_por_lotes(valores.worksheets[0], encabezados[0], tamano_lote, progreso):
            originales = tuple(principal.cell(numero_fila, col) for col in range(1, ancho + 1))
            # No contar filas vacías, aunque tengan formato aplicado.
            if all(c.value is None for c in originales):
                continue
            celda = fila[columnas[0] - 1]
            numero = _numero(celda.value)
            carrier = _numero(fila[carrier_col - 1].value) if carrier_col else ""
            es_united = "united" in carrier
            es_progressive = "progressive" in carrier
            es_national = any(nombre in carrier for nombre in ("national general", "national florida"))
            if es_national and linea_col is None:
                raise ValueError('La hoja principal necesita la columna "Line of Bussinees" (o "Line of Business") para distinguir Flood en National General / National Florida.')
            aplicar_national = es_national and _numero(fila[linea_col - 1].value) != "flood"
            buscado = _normalizar(celda.value)
            clave = _clave_united(celda.value) if es_united else None
            if es_united:
                for hoja, lob_col in zip(valores.worksheets[1:], lob_cols):
                    if lob_col is None:
                        raise ValueError(f'La hoja "{hoja.title}" necesita la columna "LOB" para validar pólizas United.')
            hojas = [hoja.title for hoja, numeros, pares in zip(valores.worksheets[1:], indices, indices_united)
                     if celda.data_type != "e" and
                     (clave in pares if es_united else bool(buscado) and buscado in numeros)]
            # Respaldo compartido por United y Progressive: si el prefijo de letras no
            # es un LOB que aparezca en producción (p. ej. "MC"/"MT" en vez de
            # "UAO"/"UAM"), se busca el resto del número en cualquier hoja, sin exigir
            # que las letras coincidan con la columna LOB.
            respaldo_sin_prefijo = False
            buscado_sin_prefijo = ""
            if (es_united or es_progressive) and not hojas:
                buscado_sin_prefijo = _sin_prefijo_letras(celda.value)
                if buscado_sin_prefijo and celda.data_type != "e":
                    hojas = [hoja.title for hoja, numeros in zip(valores.worksheets[1:], indices)
                             if buscado_sin_prefijo in numeros]
                    respaldo_sin_prefijo = bool(hojas)
            respaldo_united = False
            observacion_progressive = ""
            if es_progressive and respaldo_sin_prefijo:
                observacion_progressive = (
                    "No encontrada con la búsqueda Progressive por el valor normalizado. "
                    f'Encontrada quitando el prefijo de letras y buscando "{buscado_sin_prefijo}" en cualquier hoja.'
                )
            elif es_progressive and not hojas:
                posible_clave = _clave_united(celda.value)
                if posible_clave and posible_clave[0] in {"uao", "uam"} and celda.data_type != "e":
                    respaldo_united = True
                    clave = posible_clave
                    hojas = [hoja.title for hoja, pares in zip(valores.worksheets[1:], indices_united)
                             if clave in pares]
                    observacion_progressive = (
                        "No encontrada con la búsqueda Progressive por el valor normalizado ni quitando el prefijo de letras. "
                        "Buscada como carrier United por el formato del número de póliza recibido de Compass."
                    )
                    sin_lob = [hoja.title for hoja, col in zip(valores.worksheets[1:], lob_cols) if col is None]
                    if sin_lob:
                        observacion_progressive += " No se pudo comprobar United en hojas sin LOB: " + ", ".join(sin_lob)
            estado = "Encontrada" if hojas else "No encontrada" if numero else "Sin Policy Number"
            if not hojas:
                for original in originales:
                    original.fill = rojo
            observacion_united = ""
            if es_united:
                if respaldo_sin_prefijo:
                    prefijo = f' "{clave[0].upper()}"' if clave else ""
                    observacion_united = (
                        f"No encontrada por LOB + número de United (prefijo{prefijo}). "
                        f'Encontrada quitando el prefijo de letras y buscando "{buscado_sin_prefijo}" en cualquier hoja.'
                    )
                elif not hojas and clave is None and numero:
                    observacion_united = "Formato United inválido: se esperan letras seguidas de números"
            if respaldo_sin_prefijo:
                lob_buscado, policy_buscado = "", buscado_sin_prefijo
            elif clave:
                lob_buscado, policy_buscado = clave[0].upper(), clave[1]
            else:
                lob_buscado, policy_buscado = "", buscado
            # Si no aparece en ninguna de las dos primeras hojas de producción (los
            # meses esperados) pero sí en una hoja posterior, se avisa junto con el mes.
            observacion_otro_mes = ""
            if hojas and not (set(hojas) & hojas_esperadas):
                observacion_otro_mes = "Match con otro mes: " + ", ".join(hojas)
            observacion = " ".join(filter(None, [observacion_progressive or observacion_united, observacion_otro_mes]))
            detalle.append({"Fila Excel": numero_fila, "Policy Number": str(celda.value or "") if celda.value != 0 else "0",
                            "Carrier": str(fila[carrier_col - 1].value or "") if carrier_col else "",
                            "Estado": estado, "Hojas encontradas": ", ".join(hojas),
                            "Regla": "Progressive → United: LOB + Policy" if respaldo_united
                                     else "Progressive: sin prefijo de letras" if es_progressive and respaldo_sin_prefijo
                                     else "Progressive: valor normalizado" if es_progressive
                                     else "United: sin prefijo de letras" if respaldo_sin_prefijo
                                     else "United: LOB + Policy" if es_united
                                     else "National: valor normalizado (excepto Flood)" if aplicar_national
                                     else "Policy Number",
                            "LOB buscado": lob_buscado,
                            "Policy buscado": policy_buscado,
                            "Observación": observacion})
        salida = BytesIO()
        if progreso:
            progreso("Generando el Excel validado…", 0.0)
        _agregar_reporte_excel(libro, detalle, nombre_archivo, encabezados)
        libro.save(salida)
        if progreso:
            progreso("Validación completada", 1.0)
        return salida.getvalue(), detalle
    finally:
        libro.close()
        if valores is not None:
            valores.close()

"""Reporte persistente por ejecución de la validación de pólizas."""
import json
import re
import time
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from xml.etree import ElementTree
from zipfile import ZipFile


DIRECTORIO_REPORTES = Path(__file__).resolve().parent / "archivos" / "reportes_validacion"


class ReporteValidacion:
    def __init__(self, nombre, tamano, encabezados, directorio=DIRECTORIO_REPORTES):
        ahora = datetime.now(timezone.utc)
        base = re.sub(r"[^\w.-]+", "_", Path(nombre).stem)[:100] or "archivo"
        self.ruta = Path(directorio) / f"{base}_{ahora:%Y%m%d_%H%M%S}_{uuid4().hex[:8]}.json"
        self.datos = {
            "archivo": nombre, "tamano_bytes": tamano,
            "inicio_utc": ahora.isoformat(), "estado": "En proceso",
            "cantidad_hojas": None, "hojas": [],
            "filas_encabezados": list(encabezados), "tamano_lote": 5000,
            "criterio": "Policy Number de la primera hoja en Policy (o Police) de todas las demás hojas; sin comparar fechas. En todas las reglas, ambos valores comparados se normalizan primero: sin mayúsculas/minúsculas, espacios, guiones ni ningún otro carácter que no sea letra o número. Para Carrier que contenga United: prefijo en LOB y número sin ceros iniciales en Policy de la misma fila.",
            "eventos": [],
            "regla_united": "Carrier contiene United: buscar LOB + número sin ceros iniciales en la misma fila de producción. Si no aparece (p. ej. el prefijo no es un LOB conocido como UAO/UAM), quitar el prefijo de letras y buscar el resto del número en cualquier hoja, sin exigir que coincida con LOB; indicar la búsqueda alternativa.",
            "regla_progressive": "Carrier contiene Progressive: comparar el valor normalizado (letras y números). Si no aparece en ninguna hoja, quitar el prefijo de letras y buscar el resto del número en cualquier hoja. Si tampoco aparece y tiene prefijo UAO/UAM, intentar United por LOB y número sin ceros iniciales; indicar la búsqueda alternativa usada.",
            "regla_national_general": "Carrier contiene National General o National Florida y Line of Bussinees/Business no es Flood: mismo valor normalizado que el resto de reglas; conservar el orden de todos los dígitos y ceros, sin longitud fija.",
            "regla_otro_mes": 'Las dos primeras hojas de producción (justo después de Compass) son los meses esperados. Si la póliza no aparece en ninguna de esas dos pero sí en una hoja posterior, se indica en Observación: "Match con otro mes: <hoja>".',
        }

    def guardar(self, intentos=3, espera=0.05):
        # En Windows un antivirus/EDR puede escanear el .tmp justo al renombrarlo y
        # negar el acceso un instante (WinError 5); un reintento corto basta.
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        temporal = self.ruta.with_suffix(".tmp")
        texto = self.texto()
        for intento in range(intentos):
            try:
                temporal.write_text(texto, encoding="utf-8")
                temporal.replace(self.ruta)
                return
            except OSError:
                if intento == intentos - 1:
                    raise
                time.sleep(espera)

    def texto(self):
        return json.dumps(self.datos, ensure_ascii=False, indent=2)

    def leer_hojas(self, data):
        # Solo leer el índice del XLSX; no cargar las celdas de nuevo.
        with ZipFile(BytesIO(data)) as archivo:
            raiz = ElementTree.fromstring(archivo.read("xl/workbook.xml"))
        nombres = [hoja.attrib["name"] for hoja in raiz.findall("{*}sheets/{*}sheet")]
        self.datos["cantidad_hojas"] = len(nombres)
        self.datos["hojas"] = [{"posicion": i, "nombre": nombre} for i, nombre in enumerate(nombres, 1)]
        self.guardar()

    def progreso(self, mensaje, avance):
        self.datos["eventos"].append({"fecha_utc": datetime.now(timezone.utc).isoformat(),
                                     "etapa": mensaje, "avance_etapa": avance})
        # Es un guardado de seguimiento intermedio, no el resultado: si falla (p. ej.
        # un bloqueo transitorio del disco) no debe abortar la validación completa.
        try:
            self.guardar()
        except OSError:
            pass

    def completar(self, detalle):
        encontradas = sum(fila["Estado"] == "Encontrada" for fila in detalle)
        sin_numero = sum(fila["Estado"] == "Sin Policy Number" for fila in detalle)
        self.datos.update({
            "estado": "Completado", "fin_utc": datetime.now(timezone.utc).isoformat(),
            "resumen": {"filas_principal": len(detalle), "encontradas": encontradas,
                        "no_encontradas": len(detalle) - encontradas - sin_numero,
                        "sin_policy_number": sin_numero, "filas_rojas": len(detalle) - encontradas},
            "detalle": detalle,
        })

    def fallar(self, error):
        self.datos.update({"estado": "Error", "fin_utc": datetime.now(timezone.utc).isoformat(),
                           "error": {"tipo": type(error).__name__, "mensaje": str(error)}})

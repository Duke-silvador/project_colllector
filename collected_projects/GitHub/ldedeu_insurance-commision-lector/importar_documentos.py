"""Interfaz de carga, revision e importacion explicita a MySQL."""

import csv
import hashlib
import re
from dataclasses import asdict
from io import BytesIO, StringIO

from idiomas import interfaz as st
import importlib
import calculos as calculos_module
import commonwealth as commonwealth_module
import comisiones as comisiones_module
import models as models_module
import repositories as repositories_module
import franquicias as franquicias_module
import compass as compass_module
import oficinas as oficinas_module
import reparto_comisiones as reparto_comisiones_module
import importacion as importacion_module
import conciliacion_ui as conciliacion_ui_module
import conciliacion as conciliacion_module
import historial as historial_module
import carriers as carriers_module

# Actualizar estos modulos antes de obtener sus funciones en cada rerun.
# Evita combinar la interfaz nueva con la antigua validacion por archivo.
# El orden importa: calculos no depende de nada local y commonwealth depende de
# calculos; comisiones depende de models y repositories; importacion depende de
# repositories, que depende de models, y tambien de calculos, franquicias y
# oficinas; conciliacion depende de franquicias; reparto_comisiones depende de
# comisiones; conciliacion_ui depende de compass, oficinas y reparto_comisiones.
importlib.reload(calculos_module)
importlib.reload(carriers_module)
importlib.reload(commonwealth_module)
importlib.reload(models_module)
importlib.reload(repositories_module)
importlib.reload(comisiones_module)
importlib.reload(franquicias_module)
importlib.reload(compass_module)
importlib.reload(oficinas_module)
importlib.reload(reparto_comisiones_module)
importlib.reload(importacion_module)
importlib.reload(conciliacion_module)
importlib.reload(historial_module)
importlib.reload(conciliacion_ui_module)

from carriers import CARRIERS, cargar_carriers
from lectores import leer_excel, leer_pdf
from procesamiento import hojas_excel, mapear_filas, preparar_filas, validar_preview
from commonwealth import procesar_commonwealth
from importacion import importar, construir_registros, nombres_archivo, calcular_file_id
from mysql.connector import Error as MySQLError
from calculos import calcular_porcentajes
from conciliacion import grand_total_pdf
from conciliacion_ui import mostrar_conciliacion
from tablas_statements import editar_tabla


st.set_page_config(page_title="Carga de carriers", page_icon="📄", layout="wide")
st.markdown("""
<style>
.stApp {background-color: #faf9f6;}
.block-container {max-width: none; padding-top: 1.5rem;}
h1, h2, h3 {color: #171717;}
[data-testid="stSidebar"] {background-color: #111214;}
[data-testid="stMetric"] {background: white; padding: 18px; border-radius: 12px;}
</style>
""", unsafe_allow_html=True)

try:
    carrier_names = cargar_carriers()
except (OSError, ValueError, KeyError, TypeError):
    st.error("No se pudo cargar el catálogo. Revisa config/carriers.json: debe contener una lista bank_carriers con nombres únicos.")
    st.stop()

st.title("Procesar statements")
with st.container(border=True):
    selector, period = st.columns([3, 1])
    carrier = selector.selectbox("Carrier", carrier_names, index=None, placeholder="Selecciona un carrier", key='statement_carrier')
    month = period.text_input("Mes contable", placeholder="2026-09", key='statement_month')
    month = month.strip()
    st.caption("Cargar archivos → Preparar registros → Revisar información → Importar")

if carrier is None:
    st.title("Carga de archivos por carrier")
    st.info("Selecciona un carrier arriba para comenzar.")
    st.stop()

if carrier == 'FLORIDA PENINSULA':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import florida_peninsula as florida_module
    importlib.reload(florida_module)
    importlib.reload(conciliacion_ui_module)
    import florida_peninsula_ui as florida_ui_module
    importlib.reload(florida_ui_module)
    florida_ui_module.mostrar(month)
    st.stop()

if carrier == 'BASS':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import bass_ui
    bass_ui.mostrar(month)
    st.stop()

if carrier == 'GRANADA':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import granada as granada_module
    import granada_ui as granada_ui_module
    importlib.reload(granada_module)
    importlib.reload(granada_ui_module)
    granada_ui_module.mostrar(month)
    st.stop()

if carrier == 'SWYFFT':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import swyfft as swyfft_module
    import swyfft_ui as swyfft_ui_module
    importlib.reload(swyfft_module)
    importlib.reload(swyfft_ui_module)
    swyfft_ui_module.mostrar(month)
    st.stop()

if carrier == 'ASSURANCE':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import assurance as assurance_module
    import assurance_ui as assurance_ui_module
    importlib.reload(assurance_module)
    importlib.reload(assurance_ui_module)
    assurance_ui_module.mostrar(month)
    st.stop()

if carrier == 'CRC GROUP':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import crc_group as crc_group_module
    import crc_group_ui as crc_group_ui_module
    importlib.reload(crc_group_module)
    importlib.reload(crc_group_ui_module)
    crc_group_ui_module.mostrar(month)
    st.stop()

if carrier == 'ORCHID':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import orchid as orchid_module
    import orchid_ui as orchid_ui_module
    importlib.reload(orchid_module)
    importlib.reload(orchid_ui_module)
    orchid_ui_module.mostrar(month)
    st.stop()

if carrier == 'SLIDE':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import slide as slide_module
    import slide_ui as slide_ui_module
    importlib.reload(slide_module)
    importlib.reload(slide_ui_module)
    slide_ui_module.mostrar(month)
    st.stop()

if carrier == 'TOWER HILL':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import tower_hill as tower_hill_module
    import tower_hill_ui as tower_hill_ui_module
    importlib.reload(tower_hill_module)
    importlib.reload(tower_hill_ui_module)
    tower_hill_ui_module.mostrar(month)
    st.stop()

if carrier == 'GIC Underwriters':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import gic_underwriters as gic_underwriters_module
    import gic_underwriters_ui as gic_underwriters_ui_module
    importlib.reload(gic_underwriters_module)
    importlib.reload(gic_underwriters_ui_module)
    gic_underwriters_ui_module.mostrar(month)
    st.stop()

if carrier == 'THE GENERAL':
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', month):
        st.info('Indica el mes contable en formato YYYY-MM.')
        st.stop()
    import the_general as the_general_module
    import the_general_ui as the_general_ui_module
    importlib.reload(the_general_module)
    importlib.reload(the_general_ui_module)
    the_general_ui_module.mostrar(month)
    st.stop()

config = CARRIERS.get(carrier)
if config is None:
    st.title("Carga de archivos por carrier")
    st.write(f"Carrier seleccionado: {carrier}")
    st.info("Este carrier está disponible en el catálogo. Sus reglas de procesamiento están pendientes de configurar.")
    st.stop()

fields = config["fields"]
if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month):
    st.info("Indica el mes contable en formato YYYY-MM para preparar la importación.")
    st.stop()
st.title("Carga de archivos por carrier")
st.write("Prepara y revisa la información de tus reportes antes de importarla.")
st.caption(f"Carrier: {carrier} · Destino: {config['table']}")
uploads = st.file_uploader(
    "Arrastra tus archivos o selecciónalos", type=["xlsx", "xlsm", "pdf"],
    accept_multiple_files=True,
    key=f"uploads_{carrier}",
    help="Excel moderno o PDF con texto. Máximo 20 MB por archivo.",
)

left, middle, right = st.columns(3)
left.metric("Carrier seleccionado", carrier)
middle.metric("Archivos cargados", len(uploads))
right.metric("Estado", "En preparación" if uploads else "Sin archivos")
if not uploads:
    st.info("Selecciona un carrier y carga un Excel o PDF para comenzar.")
    st.stop()

for position, upload in enumerate(uploads):
    with st.expander(f"{position + 1}. {upload.name}", expanded=True):
        if upload.size > 20 * 1024 * 1024:
            st.error("Este archivo supera el límite de 20 MB.")
            continue
        data = upload.getvalue()
        key = hashlib.sha256(carrier.encode() + upload.name.encode() + data).hexdigest() + str(position)
        draft_key = "draft_" + key
        st.session_state.setdefault("revision_" + key, 0)

        try:
            if upload.name.lower().endswith(".pdf"):
                if st.button("Procesar PDF Commonwealth", key="extract_" + key):
                    st.session_state.pop(draft_key, None)
                    st.session_state["text_" + key] = "\n\n".join(leer_pdf(BytesIO(data)))
                    st.session_state[draft_key] = procesar_commonwealth(st.session_state["text_" + key], month)
                    st.session_state["revision_" + key] += 1
                if "text_" + key in st.session_state:
                    extracted = st.session_state["text_" + key]
                    st.text_area("Texto extraído", extracted, height=240, disabled=True, key="text_view_" + key)
                    if not extracted.strip():
                        st.warning("No se encontró texto. Si el PDF está escaneado, requiere OCR, aún no disponible.")
                st.info("Se importan asegurados y cada concepto de Chargebacks, conservando su signo. Los totales solo se usan para comprobar la lectura. El mes contable se toma del input de la barra lateral.")
            else:
                sheet = st.selectbox("Hoja", hojas_excel(data), key="sheet_" + key)
                header = st.number_input("Fila de encabezados", min_value=1, value=1, step=1, key="header_" + key)
                source = leer_excel(BytesIO(data), hoja=sheet)
                labels, rows = preparar_filas(source, int(header))
                st.caption(f"{len(rows)} filas de origen. Si cambias la hoja o las asociaciones, vuelve a preparar la vista previa.")
                mapping = {}
                with st.expander("Asociar columnas del archivo", expanded=draft_key not in st.session_state):
                    st.caption("Los campos sin columna quedan vacíos; mes contable toma el valor de la barra lateral. Conserva los códigos como texto en Excel para mantener ceros iniciales.")
                    columns = st.columns(2)
                    for index, field in enumerate(fields):
                        if field == "accounting_month":
                            mapping[field] = None
                            continue
                        match = next((i + 1 for i, value in enumerate(source[int(header) - 1]) if str(value).strip().lower().replace(" ", "_") == field), 0)
                        with columns[index % 2]:
                            selected = st.selectbox(field, ["Sin columna"] + labels, index=match, key=f"map_{key}_{sheet}_{header}_{field}")
                        mapping[field] = None if selected == "Sin columna" else labels.index(selected)
                if st.button("Preparar vista previa", key="prepare_" + key, type="primary"):
                    st.session_state[draft_key] = mapear_filas(rows, mapping, month)
                    st.session_state["revision_" + key] += 1
        except ValueError as exc:
            st.error(str(exc))
            continue
        except Exception as exc:
            st.error("El procesamiento falló. Este mensaje no significa que el archivo esté dañado.")
            with st.expander("Ver causa del error", expanded=True):
                st.code(f"{type(exc).__name__}: {exc}", language="text")
            if isinstance(exc, TypeError) and "procesar_commonwealth" in str(exc):
                st.info("La aplicación puede conservar una versión anterior del procesador. Detén Streamlit con Ctrl+C, vuelve a iniciarlo y procesa el PDF otra vez.")
            continue

        if draft_key in st.session_state:
            st.subheader("Revisar registros")
            st.caption("Puedes corregir celdas, agregar o eliminar filas. El porcentaje se calcula como Commission / Premium (0.12 equivale a 12%); para Chargebacks siempre es 1.")
            draft = st.session_state[draft_key]
            if not draft:
                st.warning("La hoja no contiene registros debajo del encabezado.")
                continue
            numbered_draft = [{"Registro": index, **row, "accounting_month": month} for index, row in enumerate(draft, 1)]
            edited_table = editar_tabla(
                numbered_draft,
                disabled=["Registro", "accounting_month", "comm_percent", "_chargeback"],
                key=f"editor_numbered_{key}_{month}_{st.session_state['revision_' + key]}", st=st,
                column_config={
                    "Registro": st.column_config.NumberColumn("Registro", format="%d", pinned=True),
                    **{field: st.column_config.TextColumn(field) for field in fields},
                    "_chargeback": st.column_config.CheckboxColumn("Chargeback"),
                },
            )
            edited = [{**{field: row.get(field) for field in fields}, "_chargeback": bool(row.get('_chargeback'))} for row in edited_table]
            for row in edited:
                row["accounting_month"] = month
            # Tras agregar o eliminar filas, renovar el editor con numeros consecutivos.
            if any(row.get("Registro") != index for index, row in enumerate(edited_table, 1)):
                st.session_state[draft_key] = edited
                st.session_state["revision_" + key] += 1
                st.rerun()
            st.caption("La columna Registro corresponde al número indicado en las observaciones; se renumera al agregar o eliminar filas.")
            calculation_errors = []
            try:
                calculated = calcular_porcentajes(edited)
                if calculated != edited:
                    st.session_state[draft_key] = calculated
                    st.session_state["revision_" + key] += 1
                    st.rerun()
            except ValueError as exc:
                calculation_errors.append(str(exc))
            errors = validar_preview(edited) + calculation_errors
            st.caption(f"{len(edited)} registros · Archivo: {upload.name}")
            if errors:
                st.warning(f"{len(errors)} observaciones de formato numérico.")
                with st.expander("Ver observaciones"):
                    for error in errors:
                        st.write(error)
            else:
                st.success("Formato numérico válido. Revisa también pólizas, fechas y códigos antes de importar.")
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=["file_name", *fields])
            writer.writeheader()
            writer.writerows({**{field: row.get(field) for field in fields}, "file_name": upload.name} for row in edited)
            st.download_button("Descargar vista previa CSV", output.getvalue().encode("utf-8-sig"), file_name="vista_previa.csv", mime="text/csv", key="download_" + key)
            _, file_name = nombres_archivo(upload.name)
            file_id = calcular_file_id(data)
            st.caption(f"Archivo con extensión: {file_id} · Nombre sin extensión: {file_name}")
            ready = False
            blocked_reason = ""
            try:
                construir_registros(edited, upload.name, data)
                ready = True
            except (ValueError, TypeError) as exc:
                blocked_reason = str(exc)
            confirmed = st.checkbox("Revisé los registros, incluidos los chargebacks, y confirmo la importación.", key="confirm_with_charges_" + key)
            imported_key = "imported_" + hashlib.sha256(data).hexdigest()
            already_imported = st.session_state.get(imported_key, False)
            if already_imported:
                st.success("Archivo importado correctamente en esta sesión.")
            elif blocked_reason:
                st.warning(blocked_reason)
            elif not confirmed:
                st.info("Marca la confirmación de revisión para habilitar la importación.")
            if st.button("Importar faltantes y continuar", disabled=not ready or not confirmed, key="save_" + key, type="primary"):
                try:
                    snapshot_records = construir_registros(edited, upload.name, data)
                    report_total = None
                    if upload.name.lower().endswith('.pdf'):
                        report_total = grand_total_pdf(st.session_state.get('text_' + key, ''))
                    with st.spinner("Importando registros…"):
                        count = importar(edited, upload.name, data)
                    st.session_state[imported_key] = True
                    st.session_state['snapshot_' + imported_key] = {
                        'rows': [asdict(record) for record in snapshot_records],
                        'grand_total': report_total, 'file_id': file_id,
                    }
                    st.success(f"Verificación completada: {count} registros nuevos y {len(snapshot_records) - count} ya existentes. Puedes continuar con la conciliación bancaria.")
                except ValueError as exc:
                    st.error(str(exc))
                except MySQLError as exc:
                    st.error(f"MySQL rechazó la operación (código {exc.errno}). Revisa conexión, credenciales, file_id y restricciones de la tabla. Si se perdió la conexión al confirmar, verifica la tabla antes de reintentar.")
                    with st.expander("Detalle de MySQL", expanded=True):
                        st.code(exc.msg or str(exc), language="text")
            st.caption("Se comparan los registros del archivo y mes contable. Solo se insertan los faltantes; si todos existen, se continúa con la conciliación.")
            snapshot = st.session_state.get('snapshot_' + imported_key)
            if snapshot:
                mostrar_conciliacion(snapshot, imported_key, carrier)
            elif st.session_state.get(imported_key):
                st.info('Esta importación se realizó antes de habilitar la conciliación y no tiene una copia de los registros en esta sesión.')

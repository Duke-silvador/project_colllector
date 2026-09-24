"""Carga SLIDE (Commission Statement). Llega en PDF (o imagen); se lee con
documentos.paginas_documento, que usa el texto real del PDF cuando existe y solo recurre a OCR
si la pagina viene escaneada. La tabla y el total ('Amount Due Agent') pueden estar en paginas
distintas del mismo archivo, asi que se revisa e importa por archivo completo (no por pagina).
Puedes subir uno o varios documentos a la vez; se importan por separado pero se concilian y
exportan juntos, mas abajo."""
import hashlib
from datetime import datetime
from uuid import uuid4
import pandas as pd
import streamlit as st
from idiomas import texto
from bass import importe
from documentos import paginas_documento
from slide import FIELDS, extraer_filas_archivo, extraer_total_archivo, alertas_lectura, guardar
from database import conectar
from importacion import calcular_file_id, buscar_posibles_duplicados
from conciliacion_ui import mostrar_conciliacion

ETIQUETAS_CAMPO = {
    'product_code': ('Product Code', 'Product Code'), 'state': ('Estado', 'State'),
    'agency_code': ('Agency Code', 'Agency Code'), 'agency_name': ('Agency Name', 'Agency Name'),
    'policy_number': ('Póliza', 'Policy #'), 'insured_name': ('Asegurado', 'Insured Name'),
    'eff_exp_date': ('Vigencia (Eff/Exp)', 'Eff/Exp Date'),
    'cancel_effective_date': ('Cancel Effective Date', 'Cancel Effective Date'),
    'tran_date': ('Tran Date', 'Tran Date'), 'tran_code': ('Tran Code', 'Tran Code'),
    'collected_premium': ('Collected Premium', 'Collected Premium'),
    'comm_rate': ('Comm Rate', 'Comm Rate'), 'comm_amt': ('Comm Amt', 'Comm Amt'),
}


@st.cache_resource
def motor_ocr():
    from rapidocr import RapidOCR
    return RapidOCR()


def _describir(alerts):
    reasons = {'missing': texto('vacío', 'missing'), 'invalid': texto('inválido', 'invalid')}
    return '; '.join(f'{field}: {reasons.get(reason, reason)}' for field, reason in alerts.items())


def _tabla_editable(extracted, suffix):
    state_key = 'slide_rows_' + suffix
    version_key = 'slide_rows_version_' + suffix
    st.session_state.setdefault(state_key, [
        {'id': uuid4().hex, 'values': dict(row['values']), 'original': row} for row in extracted])
    st.session_state.setdefault(version_key, 0)
    entries = st.session_state[state_key]
    alerts = {entry['id']: alertas_lectura(entry['values'], entry['original']) for entry in entries}
    frame = pd.DataFrame([{'Row': number, 'OCR review': _describir(alerts[entry['id']]), **entry['values']}
                          for number, entry in enumerate(entries, 1)], columns=['Row', 'OCR review', *FIELDS])
    editor_key = f'slide_rows_editor_{suffix}_{st.session_state[version_key]}'

    def save_edits():
        changes = st.session_state[editor_key]
        for position, fields in changes.get('edited_rows', {}).items():
            entry = entries[int(position)]
            for field, value in fields.items():
                if field in FIELDS:
                    entry['values'][field] = '' if value is None or pd.isna(value) else str(value)
        removed = {int(position) for position in changes.get('deleted_rows', [])}
        entries[:] = [entry for i, entry in enumerate(entries) if i not in removed]
        for row in changes.get('added_rows', []):
            values = {field: '' if row.get(field) is None or pd.isna(row.get(field)) else str(row[field])
                      for field in FIELDS}
            entries.append({'id': uuid4().hex, 'values': values, 'original': None})
        st.session_state[version_key] += 1
        st.session_state['slide_confirm_' + suffix] = False

    st.data_editor(frame, num_rows='dynamic', disabled=['Row', 'OCR review'], hide_index=True,
                   column_config={field: st.column_config.TextColumn(texto(*ETIQUETAS_CAMPO[field]))
                                  for field in FIELDS},
                   width='stretch', key=editor_key, on_change=save_edits)
    pending = sum(bool(value) for value in alerts.values())
    if pending:
        st.warning(texto(f'{pending} filas con campos pendientes. Revísalas antes de importar.',
                         f'{pending} rows have fields to review. Review them before importing.'))
    else:
        st.success(texto('No quedan campos inválidos ni lecturas de baja confianza sin corregir.',
                         'No invalid fields or unchanged low-confidence readings remain.'))
    return [dict(entry['values']) for entry in entries]


def mostrar(month):
    st.title('SLIDE')
    st.caption(texto(
        'Sube uno o varios documentos de SLIDE (Commission Statement). Puede llegar como PDF con texto, PDF '
        'escaneado, o imagen suelta. La tabla y el total pueden estar en páginas distintas del mismo archivo; '
        'se revisa e importa por archivo completo. Revisa los datos antes de importar.',
        'Upload one or more SLIDE documents (Commission Statement). It may arrive as a PDF with real text, a '
        'scanned PDF, or a standalone image. The table and the total may be on different pages of the same file; '
        'it is reviewed and imported as a whole file. Review the data before importing.'))
    archivos = st.file_uploader(texto('Statements SLIDE (PDF o imagen)', 'SLIDE statements (PDF or image)'),
                                type=['pdf', 'png', 'jpg', 'jpeg'], accept_multiple_files=True, key='slide_files')
    if not archivos:
        return
    if any(f.size > 25 * 1024 * 1024 for f in archivos):
        st.error(texto('Máximo 25 MB por documento.', 'Maximum 25 MB per document.'))
        return

    for archivo in archivos:
        identity = hashlib.sha256(archivo.name.encode() + archivo.getvalue() + month.encode()).hexdigest()
        draft_key = 'slide_draft_' + identity
        with st.expander(archivo.name, expanded=True):
            if st.button(texto('Extraer campos para revisión', 'Extract fields for review'), key='slide_extract_' + identity):
                try:
                    with st.spinner(texto('Leyendo documento…', 'Reading document…')):
                        engine = motor_ocr()
                        paginas = paginas_documento(archivo.getvalue(), archivo.name, engine)
                        filas_ocr = extraer_filas_archivo(paginas, detalles=True)
                        total = extraer_total_archivo(paginas)
                        st.session_state[draft_key] = {'paginas': paginas, 'filas': filas_ocr, 'total': total,
                                                       'revision': uuid4().hex}
                except Exception as exc:
                    st.error(str(exc))
            draft = st.session_state.get(draft_key)
            if not draft:
                continue
            for pagina in draft['paginas']:
                st.image(pagina['image'], width='stretch')
            if draft['total'] is None:
                st.warning(texto("No se encontró 'Amount Due Agent' en el statement; revisa el documento.",
                                 "'Amount Due Agent' was not found in the statement; check the document."))
            if not draft['filas']:
                st.warning(texto('No se detectó la tabla de facturas en este documento; agrega las filas a mano.',
                                 'The invoice table was not detected in this document; add the rows by hand.'))
            st.info(texto(
                'La lectura puede confundir números y unir columnas. Puedes editar, añadir o quitar filas.',
                'Extraction can misread numbers and merge columns. Edit, add or remove rows.'))
            suffix = identity + '_' + draft.get('revision', 'initial')
            records = _tabla_editable(draft['filas'], suffix)
            try:
                total_filas = sum((importe(r['comm_amt']) for r in records), start=importe('0'))
                if draft['total'] is not None:
                    st.write(texto(f'Comm Amt: {total_filas:.2f} · Amount Due Agent: {draft["total"]:.2f}',
                                   f'Comm Amt: {total_filas:.2f} · Amount Due Agent: {draft["total"]:.2f}'))
                    if total_filas != draft['total']:
                        st.warning(texto('La suma de Comm Amt no coincide con Amount Due Agent; revisa las filas.',
                                         'The sum of Comm Amt does not match Amount Due Agent; review the rows.'))
            except (ValueError, KeyError):
                pass  # Los importes inválidos se señalan por campo arriba.
            try:
                accounting_month = datetime.strptime(month, '%Y-%m').date()
                file_id = calcular_file_id(archivo.getvalue())
                pares = [(r['policy_number'], importe(r['comm_amt'])) for r in records if r.get('policy_number')]
                connection = conectar()
                try:
                    duplicados = buscar_posibles_duplicados(connection, 'st_slide_raw', 'policy_number', 'comm_amt',
                                                            accounting_month, file_id, pares)
                finally:
                    connection.close()
                for d in duplicados:
                    st.warning(texto(
                        f'Póliza {d["policy_number"]} con importe {d["monto"]} ya está guardada este mes en '
                        f'{", ".join(d["archivos"])}. Si es el mismo statement con otro nombre de archivo, no lo '
                        'importes de nuevo; si es información distinta que coincide por casualidad, puedes continuar.',
                        f'Policy {d["policy_number"]} with amount {d["monto"]} is already saved this month under '
                        f'{", ".join(d["archivos"])}. If this is the same statement under a different file name, do '
                        'not import it again; if it is genuinely different data that happens to match, you can proceed.'))
            except (ValueError, KeyError):
                pass  # Los importes invalidos ya se senalan por campo arriba; no bloquea el aviso.
            confirmed = st.checkbox(texto('Revisé todas las filas de este documento.', 'I reviewed every row in this document.'),
                                    key='slide_confirm_' + suffix)
            if st.button(texto('Importar statement validado', 'Import validated statement'), disabled=not confirmed,
                         key='slide_save_' + suffix, type='primary'):
                try:
                    with st.spinner(texto('Guardando SLIDE…', 'Saving SLIDE…')):
                        inserted, updated = guardar(records, month, archivo.name, archivo.getvalue(),
                                                    '\n\n'.join(p['text'] for p in draft['paginas']))
                    st.success(texto(f'{inserted} filas nuevas, {updated} corregidas.',
                                     f'{inserted} new rows, {updated} corrected.'))
                except Exception as exc:
                    st.error(str(exc))

    st.divider()
    st.subheader(texto('Conciliación y Excel final del mes', "Month's reconciliation and final Excel"))
    st.caption(texto(
        'Combina todos los statements de SLIDE ya guardados para este mes contable, sin importar de qué archivo vinieron.',
        "Combines every SLIDE statement already saved for this accounting month, regardless of which file it came from."))
    accounting_month = datetime.strptime(month, '%Y-%m').date()
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(comm_amt) FROM staging_hub.st_slide_raw WHERE accounting_month=%s',
                       (accounting_month,))
        total = cursor.fetchone()[0]
        cursor.close()
    finally:
        connection.close()
    if total is None:
        st.info(texto('Importa al menos un statement para calcular las comisiones y conciliar con el banco.',
                      'Import at least one statement to calculate commissions and reconcile with the bank.'))
        return
    snapshot = {'file_id': None, 'rows': [{'accounting_month': accounting_month}], 'grand_total': total}
    mostrar_conciliacion(snapshot, 'slide_month_' + month, 'SLIDE')

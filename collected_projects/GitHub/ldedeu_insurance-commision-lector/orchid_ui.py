"""Carga ORCHID (Direct Bill Commission Statement). Llega en PDF (o imagen); se lee con
documentos.paginas_documento, que usa el texto real del PDF cuando existe y solo recurre a OCR
si la pagina viene escaneada - asi da igual si el documento es un PDF con texto, un PDF
escaneado o una imagen suelta. Puedes subir uno o varios documentos a la vez."""
import hashlib
from datetime import datetime
from uuid import uuid4
import pandas as pd
import streamlit as st
from idiomas import texto
from bass import importe
from documentos import paginas_documento
from orchid import FIELDS, extraer_tabla_pagina, alertas_lectura, guardar
from database import conectar
from importacion import calcular_file_id, buscar_posibles_duplicados
from conciliacion_ui import mostrar_conciliacion

ETIQUETAS_CAMPO = {
    'status': ('Status', 'Status'), 'agency_number': ('Agency #', 'Agency #'),
    'ext_agency_number': ('Ext. Agy #', 'Ext. Agy #'), 'transaction_type': ('Tipo', 'Type'),
    'effective_date': ('Fecha efectiva', 'Effective date'), 'customer_name': ('Cliente', 'Customer'),
    'policy_number': ('Póliza', 'Policy #'), 'invoice_number': ('Invoice #', 'Invoice #'),
    'premium': ('Premium', 'Premium'), 'comm_percent': ('Comm %', 'Comm %'),
    'comm_amount': ('Comm Amt', 'Comm Amt'),
}


@st.cache_resource
def motor_ocr():
    from rapidocr import RapidOCR
    return RapidOCR()


def _describir(alerts):
    reasons = {'missing': texto('vacío', 'missing'), 'invalid': texto('inválido', 'invalid')}
    return '; '.join(f'{field}: {reasons.get(reason, reason)}' for field, reason in alerts.items())


def _tabla_editable(extracted, suffix):
    state_key = 'orchid_rows_' + suffix
    version_key = 'orchid_rows_version_' + suffix
    st.session_state.setdefault(state_key, [
        {'id': uuid4().hex, 'values': dict(row['values']), 'original': row} for row in extracted])
    st.session_state.setdefault(version_key, 0)
    entries = st.session_state[state_key]
    alerts = {entry['id']: alertas_lectura(entry['values'], entry['original']) for entry in entries}
    frame = pd.DataFrame([{'Row': number, 'OCR review': _describir(alerts[entry['id']]), **entry['values']}
                          for number, entry in enumerate(entries, 1)], columns=['Row', 'OCR review', *FIELDS])
    editor_key = f'orchid_rows_editor_{suffix}_{st.session_state[version_key]}'

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
        st.session_state['orchid_confirm_' + suffix] = False

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
    st.title('ORCHID')
    st.caption(texto(
        'Sube uno o varios documentos de ORCHID (Direct Bill Commission Statement). Puede llegar como PDF con '
        'texto, PDF escaneado, o imagen suelta. Revisa los datos antes de importar.',
        'Upload one or more ORCHID documents (Direct Bill Commission Statement). It may arrive as a PDF with '
        'real text, a scanned PDF, or a standalone image. Review the data before importing.'))
    archivos = st.file_uploader(texto('Statements ORCHID (PDF o imagen)', 'ORCHID statements (PDF or image)'),
                                type=['pdf', 'png', 'jpg', 'jpeg'], accept_multiple_files=True, key='orchid_files')
    if not archivos:
        return
    if any(f.size > 25 * 1024 * 1024 for f in archivos):
        st.error(texto('Máximo 25 MB por documento.', 'Maximum 25 MB per document.'))
        return
    identity = hashlib.sha256(month.encode() + b''.join(f.name.encode() + f.getvalue() for f in archivos)).hexdigest()
    draft_key = 'orchid_draft_' + identity
    if st.button(texto('Extraer campos para revisión', 'Extract fields for review'), key='orchid_extract_' + identity):
        try:
            with st.spinner(texto('Leyendo documentos…', 'Reading documents…')):
                engine = motor_ocr()
                paginas = []
                for archivo in archivos:
                    contenido_archivo = archivo.getvalue()
                    for indice, pagina in enumerate(paginas_documento(contenido_archivo, archivo.name, engine), 1):
                        paginas.append({**pagina, 'file_name': archivo.name, 'page_index': indice,
                                        'file_content': contenido_archivo})
                st.session_state[draft_key] = {'paginas': paginas, 'revision': uuid4().hex}
        except Exception as exc:
            st.error(str(exc))
    draft = st.session_state.get(draft_key)
    if not draft:
        return
    st.info(texto(
        'La lectura puede confundir números y unir columnas. Puedes editar, añadir o quitar filas.',
        'Extraction can misread numbers and merge columns. Edit, add or remove rows.'))
    revision = draft.get('revision', 'initial')
    vacias = 0
    for pagina in draft['paginas']:
        filas_ocr = extraer_tabla_pagina(pagina['blocks'], detalles=True)
        if not filas_ocr:
            vacias += 1
            continue
        suffix = identity + '_' + revision + '_' + pagina['file_name'] + '_' + str(pagina['page_index'])
        etiqueta = f"{pagina['file_name']} · " + texto(f"página {pagina['page_index']}", f"page {pagina['page_index']}")
        with st.expander(etiqueta, expanded=True):
            st.image(pagina['image'], width='stretch')
            records = _tabla_editable(filas_ocr, suffix)
            try:
                total = sum((importe(r['comm_amount']) for r in records), start=importe('0'))
                st.write(texto(f'Comisión total de esta página: {total:.2f}', f'Total commission on this page: {total:.2f}'))
            except (ValueError, KeyError):
                pass  # Los importes inválidos se señalan por campo arriba.
            try:
                accounting_month = datetime.strptime(month, '%Y-%m').date()
                file_id = calcular_file_id(pagina['file_content'])
                pares = [(r['policy_number'], importe(r['comm_amount'])) for r in records if r.get('policy_number')]
                connection = conectar()
                try:
                    duplicados = buscar_posibles_duplicados(connection, 'st_orchid_raw', 'policy_number', 'comm_amount',
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
            confirmed = st.checkbox(texto('Revisé todas las filas de esta página.', 'I reviewed every row on this page.'),
                                    key='orchid_confirm_' + suffix)
            if st.button(texto('Importar página validada', 'Import validated page'), disabled=not confirmed,
                         key='orchid_save_' + suffix, type='primary'):
                try:
                    with st.spinner(texto('Guardando ORCHID…', 'Saving ORCHID…')):
                        inserted, updated = guardar(records, month, pagina['file_name'], pagina['file_content'],
                                                    pagina['page_index'], pagina['text'])
                    st.success(texto(f'{inserted} filas nuevas, {updated} corregidas.',
                                     f'{inserted} new rows, {updated} corrected.'))
                except Exception as exc:
                    st.error(str(exc))
    if vacias:
        st.caption(texto(f'{vacias} página(s) sin tabla de facturas detectada; se omiten.',
                         f'{vacias} page(s) with no invoice table detected; skipped.'))

    st.divider()
    st.subheader(texto('Conciliación y Excel final del mes', "Month's reconciliation and final Excel"))
    st.caption(texto(
        'Combina todas las páginas de ORCHID ya guardadas para este mes contable, sin importar de qué archivo vinieron.',
        "Combines every ORCHID page already saved for this accounting month, regardless of which file it came from."))
    accounting_month = datetime.strptime(month, '%Y-%m').date()
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(comm_amount) FROM staging_hub.st_orchid_raw WHERE accounting_month=%s',
                       (accounting_month,))
        total = cursor.fetchone()[0]
        cursor.close()
    finally:
        connection.close()
    if total is None:
        st.info(texto('Importa al menos una página para calcular las comisiones y conciliar con el banco.',
                      'Import at least one page to calculate commissions and reconcile with the bank.'))
        return
    snapshot = {'file_id': None, 'rows': [{'accounting_month': accounting_month}], 'grand_total': total}
    mostrar_conciliacion(snapshot, 'orchid_month_' + month, 'ORCHID')

"""Carga GIC UNDERWRITERS. Se espera Excel, pero se prepara para que llegue en PDF o imagen
tambien (igual que TOWER HILL: se lee con documentos.paginas_documento y se extrae la tabla
por geometria) - incluyendo paginas que combinen tabla y cheque, o cheque en otro archivo;
por ahora solo se extrae la tabla de polizas (el cheque no se valida por pagina, la
conciliacion es mensual). Ambos formatos producen la misma fila antes de resolver franquicia
y guardar. Puedes subir uno o varios documentos a la vez; se importan por separado pero se
concilian y exportan juntos, mas abajo."""
import hashlib
from datetime import datetime
from io import BytesIO
from uuid import uuid4

import pandas as pd
from openpyxl import load_workbook

from idiomas import interfaz as st, texto
from bass import importe
from documentos import paginas_documento
from gic_underwriters import (FIELDS, detectar_encabezado, preparar_statement, extraer_tabla_pagina,
                              alertas_lectura, construir_filas, guardar)
from database import conectar
from importacion import calcular_file_id, buscar_posibles_duplicados
from conciliacion_ui import mostrar_conciliacion
from tablas_statements import mostrar_tabla

ETIQUETAS_CAMPO = {
    'policy_number': ('Póliza', 'Policy Number'), 'insured_name': ('Asegurado', 'Insured Name'),
    'effective_date': ('Fecha efectiva', 'Eff Date'), 'expiration_date': ('Fecha de vencimiento', 'Exp Date'),
    'premium_amount': ('Premium', 'Premium'), 'commission_amount': ('Comm', 'Comm'),
    'del_toro_percent': ('Comm %', 'Comm %'),
}


@st.cache_resource
def motor_ocr():
    from rapidocr import RapidOCR
    return RapidOCR()


def _describir(alerts):
    reasons = {'missing': texto('vacío', 'missing'), 'invalid': texto('inválido', 'invalid')}
    return '; '.join(f'{field}: {reasons.get(reason, reason)}' for field, reason in alerts.items())


def _tabla_editable(extracted, suffix):
    state_key = 'gic_rows_' + suffix
    version_key = 'gic_rows_version_' + suffix
    st.session_state.setdefault(state_key, [
        {'id': uuid4().hex, 'values': dict(row['values']), 'original': row} for row in extracted])
    st.session_state.setdefault(version_key, 0)
    entries = st.session_state[state_key]
    alerts = {entry['id']: alertas_lectura(entry['values'], entry['original']) for entry in entries}
    frame = pd.DataFrame([{'Row': number, 'OCR review': _describir(alerts[entry['id']]), **entry['values']}
                          for number, entry in enumerate(entries, 1)], columns=['Row', 'OCR review', *FIELDS])
    editor_key = f'gic_rows_editor_{suffix}_{st.session_state[version_key]}'

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
        st.session_state['gic_confirm_' + suffix] = False

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


def _revisar_duplicados(tabla, records, month, file_id, campo_policy, campo_monto):
    try:
        accounting_month = datetime.strptime(month, '%Y-%m').date()
        pares = [(r[campo_policy], importe(r[campo_monto])) for r in records if r.get(campo_policy)]
        connection = conectar()
        try:
            duplicados = buscar_posibles_duplicados(connection, tabla, campo_policy, campo_monto,
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


def _bloque_excel(archivo, month):
    contenido = archivo.getvalue()
    try:
        book = load_workbook(BytesIO(contenido), read_only=True, data_only=True)
        try:
            header = detectar_encabezado(book.worksheets[0])
        finally:
            book.close()
        rows = preparar_statement(contenido, month, header=header)
    except Exception as exc:
        st.error(texto(f'No se pudo procesar el statement: {type(exc).__name__}: {exc}',
                       f'Could not process the statement: {type(exc).__name__}: {exc}'))
        return
    st.caption(texto(f'Encabezado detectado en la fila {header}. {len(rows)} registros.',
                     f'Header detected on row {header}. {len(rows)} records.'))
    key = hashlib.sha256(archivo.name.encode() + contenido + month.encode()).hexdigest()
    mostrar_tabla([{k: v for k, v in r.items() if k != 'source_data'} for r in rows], 'gic_preview_' + key, st=st)
    total = sum((importe(r['commission_amount']) for r in rows), start=importe('0'))
    st.write(texto(f'Comisión total del statement: {total:.2f}', f'Total statement commission: {total:.2f}'))
    file_id = calcular_file_id(contenido)
    _revisar_duplicados('st_gic_underwriters_raw', rows, month, file_id, 'policy_number', 'commission_amount')
    confirmed = st.checkbox(texto('Revisé los registros y confirmo la importación.',
                                  'I reviewed the records and confirm the import.'), key='gic_confirm_' + key)
    if st.button(texto('Importar faltantes y continuar', 'Import missing and continue'), disabled=not confirmed,
                 key='gic_save_' + key, type='primary'):
        try:
            with st.spinner(texto('Guardando GIC UNDERWRITERS…', 'Saving GIC UNDERWRITERS…')):
                inserted, updated = guardar(rows, month, archivo.name, contenido, 1, None)
            st.success(texto(f'{inserted} filas nuevas, {updated} corregidas.',
                             f'{inserted} new rows, {updated} corrected.'))
        except Exception as exc:
            st.error(str(exc))


def _bloque_pdf(archivo, month):
    contenido = archivo.getvalue()
    identity = hashlib.sha256(month.encode() + archivo.name.encode() + contenido).hexdigest()
    draft_key = 'gic_draft_' + identity
    if st.button(texto('Extraer campos para revisión', 'Extract fields for review'), key='gic_extract_' + identity):
        try:
            with st.spinner(texto('Leyendo documento…', 'Reading document…')):
                engine = motor_ocr()
                paginas = paginas_documento(contenido, archivo.name, engine)
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
    for indice, pagina in enumerate(draft['paginas'], 1):
        filas_ocr = extraer_tabla_pagina(pagina['blocks'], detalles=True)
        if not filas_ocr:
            vacias += 1
            continue
        suffix = identity + '_' + revision + '_' + str(indice)
        etiqueta = f"{archivo.name} · " + texto(f'página {indice}', f'page {indice}')
        with st.expander(etiqueta, expanded=True):
            st.image(pagina['image'], width='stretch')
            records = _tabla_editable(filas_ocr, suffix)
            try:
                total = sum((importe(r['commission_amount']) for r in records), start=importe('0'))
                st.write(texto(f'Comisión total de esta página: {total:.2f}', f'Total commission on this page: {total:.2f}'))
            except (ValueError, KeyError):
                pass  # Los importes inválidos se señalan por campo arriba.
            file_id = calcular_file_id(contenido)
            _revisar_duplicados('st_gic_underwriters_raw', records, month, file_id, 'policy_number', 'commission_amount')
            confirmed = st.checkbox(texto('Revisé todas las filas de esta página.', 'I reviewed every row on this page.'),
                                    key='gic_confirm_' + suffix)
            if st.button(texto('Importar página validada', 'Import validated page'), disabled=not confirmed,
                         key='gic_save_' + suffix, type='primary'):
                try:
                    with st.spinner(texto('Guardando GIC UNDERWRITERS…', 'Saving GIC UNDERWRITERS…')):
                        filas = construir_filas(records, month)
                        inserted, updated = guardar(filas, month, archivo.name, contenido, indice, pagina['text'])
                    st.success(texto(f'{inserted} filas nuevas, {updated} corregidas.',
                                     f'{inserted} new rows, {updated} corrected.'))
                except Exception as exc:
                    st.error(str(exc))
    if vacias:
        st.caption(texto(f'{vacias} página(s) sin tabla de pólizas detectada; se omiten.',
                         f'{vacias} page(s) with no policy table detected; skipped.'))


def mostrar(month):
    st.title('GIC UNDERWRITERS')
    st.caption(texto(
        'Se espera el statement en Excel, pero también puede llegar como PDF con texto, PDF escaneado, o imagen '
        'suelta (incluido el formato de cheque, combinado o en archivo aparte). Puedes subir uno o varios '
        'documentos a la vez; se importan por separado pero se concilian y exportan juntos, más abajo.',
        'The statement is normally Excel, but it can also arrive as a PDF with real text, a scanned PDF, or a '
        'standalone image (including check format, combined or in a separate file). You can upload one or more '
        'documents at once; they are imported separately but reconciled and exported together, further down.'))
    st.caption(texto(
        'El statement no trae código de agencia ni oficina. La franquicia se busca en Compass por número de '
        'póliza; si no aparece, en el histórico; si tampoco, por nombre del cliente en Compass (búsqueda visual). '
        'Si nada de eso encuentra nada, la fila queda sin franquicia y se marca para revisión manual. La '
        'franquicia recibe el mismo porcentaje que Del Toro (pass-through).',
        "The statement does not include an agency code or office. The franchise is looked up in Compass by "
        'policy number; if not found, in history; if not found there either, by client name in Compass (visual '
        'search). If none of that finds anything, the row is left without a franchise and flagged for manual '
        'review. The franchise receives the same percentage as Del Toro (pass-through).'))
    archivos = st.file_uploader(texto('Statements GIC UNDERWRITERS (Excel, PDF o imagen)', 'GIC UNDERWRITERS statements (Excel, PDF or image)'),
                                type=['xlsx', 'xlsm', 'pdf', 'png', 'jpg', 'jpeg'], accept_multiple_files=True,
                                key='gic_files')
    if not archivos:
        return
    if any(f.size > 25 * 1024 * 1024 for f in archivos):
        st.error(texto('Máximo 25 MB por documento.', 'Maximum 25 MB per document.'))
        return
    for archivo in archivos:
        with st.expander(archivo.name, expanded=True):
            if archivo.name.lower().endswith(('.xlsx', '.xlsm')):
                _bloque_excel(archivo, month)
            else:
                _bloque_pdf(archivo, month)

    st.divider()
    st.subheader(texto('Conciliación y Excel final del mes', "Month's reconciliation and final Excel"))
    st.caption(texto(
        'Combina todos los statements de GIC UNDERWRITERS ya guardados para este mes contable, sin importar de '
        'qué archivo vinieron.', "Combines every GIC UNDERWRITERS statement already saved for this accounting "
        'month, regardless of which file it came from.'))
    accounting_month = datetime.strptime(month, '%Y-%m').date()
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(commission_amount) FROM staging_hub.st_gic_underwriters_raw WHERE accounting_month=%s',
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
    mostrar_conciliacion(snapshot, 'gic_month_' + month, 'GIC Underwriters')

"""Carga CRC GROUP.

Puedes subir uno o varios documentos a la vez. En cada pagina puede venir: statement y
cheque juntos (caso mas comun), solo el cheque (sin tabla de facturas), o solo el statement
sin cheque en esa misma pagina -en ese caso el cheque puede venir en otra pagina o incluso
en otro archivo subido junto con este, y se empareja eligiendolo de una lista."""
import hashlib
from datetime import datetime
from decimal import Decimal
from uuid import uuid4
import pandas as pd
import streamlit as st
from idiomas import texto
from bass import importe
from crc_group import FIELDS, ocr_paginas, extraer_cabecera_pagina, extraer_tabla_pagina, alertas_lectura, guardar
from database import conectar
from importacion import calcular_file_id, buscar_posibles_duplicados
from conciliacion_ui import mostrar_conciliacion

CAMPOS_CHEQUE = ('vendor_name', 'crc_id', 'check_number', 'check_date', 'check_amount')
ETIQUETAS_CHEQUE = {
    'vendor_name': ('Vendor Name', 'Vendor Name'), 'crc_id': ('CRC ID', 'CRC ID'),
    'check_number': ('Número de cheque', 'Check number'), 'check_date': ('Fecha de cheque', 'Check date'),
    'check_amount': ('Importe de cheque', 'Check amount'),
}


@st.cache_resource
def motor_ocr():
    from rapidocr import RapidOCR
    return RapidOCR()


def _importe_seguro(valor):
    try:
        return importe(valor)
    except ValueError:
        return None


def _total_aproximado(filas_ocr):
    total = Decimal('0')
    for fila in filas_ocr:
        valor = _importe_seguro(fila['values'].get('commission_amount'))
        if valor is not None:
            total += valor
    return total


def _describir(alerts):
    reasons = {'missing': texto('vacío', 'missing'), 'invalid': texto('inválido', 'invalid')}
    return '; '.join(f'{field}: {reasons.get(reason, reason)}' for field, reason in alerts.items())


def _tabla_editable(extracted, suffix):
    state_key = 'crc_rows_' + suffix
    version_key = 'crc_rows_version_' + suffix
    st.session_state.setdefault(state_key, [
        {'id': uuid4().hex, 'values': dict(row['values']), 'original': row} for row in extracted])
    st.session_state.setdefault(version_key, 0)
    entries = st.session_state[state_key]
    alerts = {entry['id']: alertas_lectura(entry['values'], entry['original']) for entry in entries}
    frame = pd.DataFrame([{'Row': number, 'OCR review': _describir(alerts[entry['id']]), **entry['values']}
                          for number, entry in enumerate(entries, 1)], columns=['Row', 'OCR review', *FIELDS])
    editor_key = f'crc_rows_editor_{suffix}_{st.session_state[version_key]}'

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
        st.session_state['crc_confirm_' + suffix] = False

    st.data_editor(frame, num_rows='dynamic', disabled=['Row', 'OCR review'], hide_index=True,
                   width='stretch', key=editor_key, on_change=save_edits)
    pending = sum(bool(value) for value in alerts.values())
    if pending:
        st.warning(texto(f'{pending} filas con campos pendientes. Revísalas antes de importar.',
                         f'{pending} rows have fields to review. Review them before importing.'))
    else:
        st.success(texto('No quedan campos inválidos ni lecturas de baja confianza sin corregir.',
                         'No invalid fields or unchanged low-confidence readings remain.'))
    return [dict(entry['values']) for entry in entries]


def _bloque_pagina(pagina, cabecera_default, filas_ocr, month, suffix, etiqueta, original_ocr):
    with st.expander(etiqueta, expanded=True):
        st.image(pagina['image'], width='stretch')
        cabecera = {}
        columns = st.columns(len(CAMPOS_CHEQUE))
        for area, key in zip(columns, CAMPOS_CHEQUE):
            label = texto(*ETIQUETAS_CHEQUE[key])
            cabecera[key] = area.text_input(label, value=cabecera_default.get(key, ''), key='crc_' + key + '_' + suffix)
        if not filas_ocr:
            st.warning(texto('No se detectó la tabla de facturas en esta página; revisa la imagen.',
                             'The invoice table was not detected on this page; check the image.'))
        records = _tabla_editable(filas_ocr, suffix)
        try:
            total = sum((importe(r['commission_amount']) for r in records), start=importe('0'))
            difference = total - importe(cabecera['check_amount'])
            if difference:
                st.warning(texto(f'Comisiones: {total:.2f}; cheque: {cabecera["check_amount"]}; diferencia: {difference:.2f}. Revisa commission_amount y las filas extraídas.',
                                 f'Commissions: {total:.2f}; check: {cabecera["check_amount"]}; difference: {difference:.2f}. Review commission_amount and extracted rows.'))
        except (ValueError, KeyError):
            pass  # Los importes inválidos se señalan por campo arriba.
        try:
            accounting_month = datetime.strptime(month, '%Y-%m').date()
            file_id = calcular_file_id(pagina['file_content'])
            pares = [(r['policy_number'], importe(r['commission_amount'])) for r in records if r.get('policy_number')]
            connection = conectar()
            try:
                duplicados = buscar_posibles_duplicados(connection, 'st_crc_group_raw', 'policy_number', 'commission_amount',
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
        confirmed = st.checkbox(texto('Revisé todas las filas y confirmé que el cheque, la fecha, el importe y el Vendor Name corresponden a esta página.',
                                     'I reviewed every row and confirmed the check, date, amount and Vendor Name belong to this page.'), key='crc_confirm_' + suffix)
        if st.button(texto('Importar página validada', 'Import validated page'), disabled=not confirmed,
                     key='crc_save_' + suffix, type='primary'):
            try:
                with st.spinner(texto('Guardando CRC GROUP…', 'Saving CRC GROUP…')):
                    inserted, updated = guardar(records, cabecera, month, pagina['file_name'], pagina['file_content'],
                                                pagina['page_index'], original_ocr)
                st.success(texto(f'{inserted} filas nuevas, {updated} corregidas.',
                                 f'{inserted} new rows, {updated} corrected.'))
            except Exception as exc:
                st.error(str(exc))


def mostrar(month):
    st.title('CRC GROUP')
    st.caption(texto(
        'Sube uno o varios documentos de CRC GROUP: statements con el cheque en la misma página, cheques sueltos, '
        'o statements sin cheque en esa página (el cheque puede venir en otro archivo o página; se empareja abajo). '
        'Revisa los datos del OCR antes de importar.',
        'Upload one or more CRC GROUP documents: statements with the check on the same page, standalone checks, or '
        'statements without a check on that page (the check may come from another file or page; pair it below). '
        'Review OCR data before importing.'))
    archivos = st.file_uploader(texto('Statements y/o cheques (PDF o imagen)', 'Statements and/or checks (PDF or image)'),
                                type=['pdf', 'png', 'jpg', 'jpeg'], accept_multiple_files=True, key='crc_files')
    if not archivos:
        return
    if any(f.size > 25 * 1024 * 1024 for f in archivos):
        st.error(texto('Máximo 25 MB por documento.', 'Maximum 25 MB per document.'))
        return
    identity = hashlib.sha256(month.encode() + b''.join(f.name.encode() + f.getvalue() for f in archivos)).hexdigest()
    draft_key = 'crc_draft_' + identity
    if st.button(texto('Extraer campos para revisión', 'Extract fields for review'), key='crc_extract_' + identity):
        try:
            with st.spinner(texto('Leyendo documentos con OCR local…', 'Reading documents with local OCR…')):
                engine = motor_ocr()
                paginas = []
                for archivo in archivos:
                    contenido_archivo = archivo.getvalue()
                    for indice, pagina in enumerate(ocr_paginas(contenido_archivo, archivo.name, engine), 1):
                        paginas.append({**pagina, 'file_name': archivo.name, 'page_index': indice,
                                       'file_content': contenido_archivo})
                st.session_state[draft_key] = {'paginas': paginas, 'revision': uuid4().hex}
        except Exception as exc:
            st.error(str(exc))
    draft = st.session_state.get(draft_key)
    if not draft:
        return
    st.info(texto(
        'El OCR puede confundir números y unir columnas. Puedes editar, añadir o quitar filas. Se validará la suma contra el cheque de cada página.',
        'OCR can misread numbers and merge columns. Edit, add or remove rows. The total will be checked against each page’s check.'))

    clasificadas = []
    for pagina in draft['paginas']:
        cabecera_ocr = extraer_cabecera_pagina(pagina['blocks'])
        filas_ocr = extraer_tabla_pagina(pagina['blocks'], detalles=True)
        clasificadas.append({**pagina, 'cabecera_ocr': cabecera_ocr, 'filas_ocr': filas_ocr})

    cheques = [p for p in clasificadas if p['cabecera_ocr'].get('check_number') and not p['filas_ocr']]
    combinadas = [p for p in clasificadas if p['cabecera_ocr'].get('check_number') and p['filas_ocr']]
    statements = [p for p in clasificadas if not p['cabecera_ocr'].get('check_number') and p['filas_ocr']]
    vacias = [p for p in clasificadas if not p['cabecera_ocr'].get('check_number') and not p['filas_ocr']]

    if vacias:
        st.caption(texto(f'{len(vacias)} página(s) sin tabla de facturas ni cheque; se omiten.',
                         f'{len(vacias)} page(s) without an invoice table or check; skipped.'))

    revision = draft.get('revision', 'initial')

    for pagina in combinadas:
        suffix = identity + '_' + revision + '_' + pagina['file_name'] + '_' + str(pagina['page_index'])
        etiqueta = f"{pagina['file_name']} · " + texto(f"página {pagina['page_index']}", f"page {pagina['page_index']}")
        _bloque_pagina(pagina, pagina['cabecera_ocr'], pagina['filas_ocr'], month, suffix, etiqueta, pagina['text'])

    for pagina in statements:
        suffix = identity + '_' + revision + '_' + pagina['file_name'] + '_' + str(pagina['page_index'])
        etiqueta = f"{pagina['file_name']} · " + texto(
            f"página {pagina['page_index']} (statement sin cheque en la página)",
            f"page {pagina['page_index']} (statement without a check on the page)")
        if not cheques:
            st.warning(f'{etiqueta}: ' + texto(
                'no hay páginas de cheque disponibles todavía para emparejar; sube el documento del cheque.',
                'no check pages available yet to pair; upload the check document.'))
            continue
        total_aprox = _total_aproximado(pagina['filas_ocr'])
        etiquetas_cheque = [f"{c['file_name']} · p.{c['page_index']} · {c['cabecera_ocr'].get('check_number', '')} · "
                            f"{c['cabecera_ocr'].get('check_amount', '')}" for c in cheques]
        candidatos = [i for i, c in enumerate(cheques)
                     if _importe_seguro(c['cabecera_ocr'].get('check_amount')) == total_aprox]
        eleccion = st.selectbox(f'{etiqueta} — ' + texto('Cheque correspondiente', 'Matching check'),
                                range(len(cheques)), index=candidatos[0] if len(candidatos) == 1 else None,
                                format_func=lambda i: etiquetas_cheque[i], key='crc_check_pick_' + suffix)
        if eleccion is None:
            st.info(f'{etiqueta}: ' + texto('selecciona el cheque correspondiente para continuar.',
                                            'select the matching check to continue.'))
            continue
        cheque = cheques[eleccion]
        original_ocr = {'statement_page': pagina['text'],
                        'check_page': f"{cheque['file_name']} p.{cheque['page_index']}",
                        'check_page_text': cheque['text']}
        _bloque_pagina(pagina, cheque['cabecera_ocr'], pagina['filas_ocr'], month, suffix, etiqueta, original_ocr)

    st.divider()
    st.subheader(texto('Conciliación y Excel final del mes', "Month's reconciliation and final Excel"))
    st.caption(texto(
        'Combina todas las páginas de CRC GROUP ya guardadas para este mes contable, sin importar de qué archivo vinieron.',
        "Combines every CRC GROUP page already saved for this accounting month, regardless of which file it came from."))
    accounting_month = datetime.strptime(month, '%Y-%m').date()
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(commission_amount) FROM staging_hub.st_crc_group_raw WHERE accounting_month=%s',
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
    mostrar_conciliacion(snapshot, 'crc_group_month_' + month, 'CRC GROUP')

"""Carga BASS con revisión obligatoria del OCR y de la relación con los pagos."""
import hashlib
from datetime import datetime
from uuid import uuid4
import streamlit as st
from idiomas import texto
from bass import ocr_paginas, extraer_pago, extraer_statement, extraer_cabecera, guardar, importe
from bass_tabla import tabla_editable
from database import conectar
from importacion import calcular_file_id
from conciliacion_ui import mostrar_conciliacion


@st.cache_resource
def motor_ocr():
    from rapidocr import RapidOCR
    return RapidOCR()


def mostrar(month):
    st.title('BASS')
    st.caption(texto('Carga el statement y los cheques con su hoja de información. Revisa los datos del OCR antes de importar.', 'Upload the statement and checks with their payment slips. Review OCR data before importing.'))
    statement = st.file_uploader(texto('Statement PDF o imagen', 'Statement PDF or image'),
                                 type=['pdf', 'png', 'jpg', 'jpeg'], key='bass_statement')
    payments = st.file_uploader(texto('Pagos y cheques', 'Payments and checks'),
                                type=['pdf', 'png', 'jpg', 'jpeg'], accept_multiple_files=True, key='bass_payments')
    if not statement or not payments:
        return
    if any(f.size > 25 * 1024 * 1024 for f in [statement] + payments):
        st.error(texto('Máximo 25 MB por documento.', 'Maximum 25 MB per document.'))
        return
    identity = hashlib.sha256(statement.name.encode() + statement.getvalue() + month.encode() +
                              b''.join(f.name.encode() + f.getvalue() for f in payments)).hexdigest()
    draft_key = 'bass_draft_' + identity
    if st.button(texto('Extraer campos para revisión', 'Extract fields for review'), key='bass_extract_' + identity):
        try:
            with st.spinner(texto('Leyendo documentos con OCR local…', 'Reading documents with local OCR…')):
                engine = motor_ocr()
                pages = ocr_paginas(statement.getvalue(), statement.name, engine)
                pay_rows = []
                for payment in payments:
                    parts = ocr_paginas(payment.getvalue(), payment.name, engine)
                    raw = '\n'.join(p['text'] for p in parts)
                    pay_rows.append({'file': payment.name, 'data': extraer_pago(raw), 'raw': raw,
                                     'image': parts[0]['image']})
                st.session_state[draft_key] = {'pages': pages, 'payments': pay_rows, 'revision': uuid4().hex}
        except Exception as exc:
            st.error(str(exc))
    draft = st.session_state.get(draft_key)
    if not draft:
        return
    st.info(texto('El OCR puede confundir números y unir columnas. Puedes editar, añadir o quitar filas. Se validará la suma contra el cheque.', 'OCR can misread numbers and merge columns. Edit, add or remove rows. The total will be checked against the payment.'))
    for index, page in enumerate(draft['pages'], 1):
        suffix = identity + '_' + draft.get('revision', 'initial') + '_' + str(index)
        with st.expander(texto(f'Página {index} del statement', f'Statement page {index}'), expanded=True):
            st.image(page['image'], width='stretch')
            metadata = extraer_cabecera(page['blocks'])
            candidates = [i for i, p in enumerate(draft['payments'])
                          if p['data']['check_number'] == metadata['check_number'] and metadata['check_number']]
            labels = [f'{p["file"]} · {p["data"]["check_number"]} · {p["data"]["check_amount"]}' for p in draft['payments']]
            choice = st.selectbox(texto('Pago correspondiente', 'Matching payment'), range(len(labels)),
                                  index=candidates[0] if len(candidates) == 1 else None,
                                  format_func=lambda i: labels[i], key='bass_payment_' + suffix)
            if choice is None:
                st.warning(texto('Selecciona y verifica el pago de esta página.', 'Select and verify the payment for this page.'))
                continue
            payment = draft['payments'][choice]
            with st.expander(texto('Ver cheque y hoja de pago', 'View check and payment slip')):
                st.image(payment['image'], width='stretch')
            st.caption(texto(f'Lectura del statement: cheque {metadata["check_number"]}, fecha {metadata["check_date"]}, total {metadata["check_amount"]}.',
                            f'Statement reading: check {metadata["check_number"]}, date {metadata["check_date"]}, total {metadata["check_amount"]}.'))
            pago = {}
            columns = st.columns(4)
            for area, (key, label) in zip(columns, [('producer_code', 'Code AGT'), ('check_number', 'Check number'),
                                                   ('check_date', 'Check date'), ('check_amount', 'Check amount')]):
                pago[key] = area.text_input(label, value=payment['data'][key], key='bass_' + key + '_' + suffix + '_' + str(choice))
            extracted = extraer_statement(page['blocks'], detalles=True)
            st.caption(texto('OCR review indica los campos pendientes. Los porcentajes son confianza del OCR inferior al 95%, no porcentajes de comisión.',
                             'OCR review lists fields to review. Percentages indicate OCR confidence below 95%, not commission rates.'))
            records = tabla_editable(extracted, suffix)
            try:
                total = sum((importe(r['commission_amount']) for r in records), start=importe('0'))
                difference = total - importe(pago['check_amount'])
                if difference:
                    st.warning(texto(f'Comisiones: {total:.2f}; cheque: {pago["check_amount"]}; diferencia: {difference:.2f}. Revisa commission_amount y las filas extraídas.',
                                     f'Commissions: {total:.2f}; check: {pago["check_amount"]}; difference: {difference:.2f}. Review commission_amount and extracted rows.'))
            except ValueError:
                pass  # Los importes inválidos se señalan por campo arriba.
            confirmed = st.checkbox(texto('Revisé todas las filas y confirmé que el cheque, fecha, importe y código corresponden a esta página.',
                                         'I reviewed every row and confirmed the check, date, amount and code belong to this page.'), key='bass_confirm_' + suffix)
            if st.button(texto('Importar página validada', 'Import validated page'), disabled=not confirmed,
                         key='bass_save_' + suffix, type='primary'):
                try:
                    with st.spinner(texto('Guardando BASS…', 'Saving BASS…')):
                        inserted, updated, franchise = guardar(records, pago, month, statement.name, statement.getvalue(),
                            index, payment['file'], {'statement': page['text'], 'payment': payment['raw']})
                    st.success(texto(f'{inserted} filas nuevas, {updated} corregidas. Franquicia: {franchise or "sin determinar"}.',
                                     f'{inserted} new rows, {updated} corrected. Franchise: {franchise or "undetermined"}.'))
                    if not franchise:
                        st.warning(texto('Revisa el código AGT en la tabla de códigos; no se determinó una franquicia única.',
                                         'Check the AGT code in the code directory; no unique franchise was determined.'))
                except Exception as exc:
                    st.error(str(exc))
    st.divider()
    file_id = calcular_file_id(statement.getvalue())
    accounting_month = datetime.strptime(month, '%Y-%m').date()
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(commission_amount) FROM staging_hub.st_bass_raw WHERE file_id=%s AND accounting_month=%s',
                       (file_id, accounting_month))
        total = cursor.fetchone()[0]
        cursor.close()
    finally:
        connection.close()
    if total is None:
        st.info(texto('Importa al menos una página para calcular las comisiones y conciliar con el banco.',
                      'Import at least one page to calculate commissions and reconcile with the bank.'))
        return
    snapshot = {'file_id': file_id, 'rows': [{'accounting_month': accounting_month}], 'grand_total': total}
    mostrar_conciliacion(snapshot, 'bass_' + identity, 'BASS')

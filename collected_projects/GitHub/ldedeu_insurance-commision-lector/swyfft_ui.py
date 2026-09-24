"""Revisión, importación y conciliación del statement SWYFFT."""
import hashlib
from datetime import datetime
from decimal import Decimal
from io import BytesIO
from openpyxl import load_workbook
from idiomas import interfaz as st, texto
from documentos import paginas_documento
from swyfft import (preparar_statement, preparar_statement_cheque, guardar_statement, detectar_encabezado,
                    _es_formato_cheque)
from database import conectar
from conciliacion_ui import mostrar_conciliacion
from tablas_statements import mostrar_tabla


@st.cache_resource
def motor_ocr():
    from rapidocr import RapidOCR
    return RapidOCR()


def _preparar_excel(uploaded, month):
    contenido = uploaded.getvalue()
    book = load_workbook(BytesIO(contenido), read_only=True, data_only=True)
    try:
        header = detectar_encabezado(book.worksheets[0])
    finally:
        book.close()
    rows = preparar_statement(contenido, month, header=header)
    st.caption(texto(f'Encabezado detectado en la fila {header}.', f'Header detected in row {header}.'))
    return rows, str(header)


def _preparar_cheque(uploaded, month):
    """SWYFFT puede pagar una parte por cheque físico en vez de transferencia; cada cheque llega
    en su propio PDF (con texto real o con foto del talón). Solo se completan los campos que
    trae la mini tabla del talón; el resto queda vacío, como en un chargeback."""
    paginas = paginas_documento(uploaded.getvalue(), uploaded.name, motor_ocr())
    if not _es_formato_cheque(paginas):
        raise ValueError("El documento no parece un talón de cheque de SWYFFT (no se encontró la mini tabla "
                         "Producer Location Name/Insured Name/Policy Number/Gross Premium/Paid Now).")
    rows = preparar_statement_cheque(paginas, month)
    st.caption(texto(
        'Statement de cheque (talón): solo se completaron los campos que trae el cheque (Producer, Loc. #, '
        'Insured, Policy Number, Transaction Type, Premium y Paid Now); el resto queda vacío.',
        'Check stub statement: only the fields present on the check were filled in (Producer, Loc. #, Insured, '
        'Policy Number, Transaction Type, Premium and Paid Now); the rest is left blank.'))
    return rows, 'cheque'


def mostrar(month):
    st.title('SWYFFT')
    st.caption(texto(
        'La franquicia se identifica buscando el nombre de oficina registrado dentro de Sub Location. Prima y '
        'comisión: Premium Collected y Commissions Paid. Fecha: Policy Effective Date. Puede llegar como Excel '
        '(statement completo) o como PDF/foto del talón de un cheque individual (una parte de SWYFFT se paga '
        'así); en ese caso solo se completan los campos que trae el cheque.',
        'The franchise is matched by finding the registered office name within Sub Location. Premium and '
        'commission: Premium Collected and Commissions Paid. Date: Policy Effective Date. It may arrive as an '
        'Excel (full statement) or as a PDF/photo of an individual check stub (part of SWYFFT is paid this way); '
        'in that case only the fields present on the check are filled in.'))
    st.caption('Se lee la primera hoja del Excel, independientemente de su nombre.')
    files = st.file_uploader(
        texto('Statement de comisiones (Excel) o talón de cheque (PDF/imagen)',
             'Commission statement (Excel) or check stub (PDF/image)'),
        type=['xlsx', 'xlsm', 'pdf', 'png', 'jpg', 'jpeg'], accept_multiple_files=True, key='swyfft_statements')
    for uploaded in files:
        with st.expander(uploaded.name, expanded=True):
            if uploaded.size > 20 * 1024 * 1024:
                st.error('El fichero supera el límite de 20 MB.')
                continue
            key = hashlib.sha256(uploaded.name.encode() + uploaded.getvalue() + month.encode()).hexdigest()
            es_excel = uploaded.name.lower().endswith(('.xlsx', '.xlsm'))
            try:
                if es_excel:
                    rows, sufijo = _preparar_excel(uploaded, month)
                else:
                    with st.spinner(texto('Leyendo documento…', 'Reading document…')):
                        rows, sufijo = _preparar_cheque(uploaded, month)
                key += '_' + sufijo
                mostrar_tabla([{k: v for k, v in r.items() if k != 'source_data'} for r in rows], 'swyfft_preview_' + key, st=st)
                total = sum((Decimal(r['commission_amount']) for r in rows), Decimal(0))
                st.write(f'{len(rows)} registros. Comisión total del statement: {total}')
                confirmed = st.checkbox('Revisé los registros y confirmo la importación.', key='swyfft_confirm_' + key)
                if st.button('Importar faltantes y continuar', disabled=not confirmed,
                             key='swyfft_save_' + key, type='primary'):
                    with st.spinner('Consultando franquicias y guardando el statement…'):
                        count = guardar_statement(rows, uploaded.name, uploaded.getvalue())
                    st.success(f'{count} registros nuevos; {len(rows) - count} ya existentes.')
            except Exception as exc:
                st.error(f'No se pudo procesar el statement: {type(exc).__name__}: {exc}')

    st.divider()
    st.subheader(texto('Conciliación y Excel final del mes', "Month's reconciliation and final Excel"))
    st.caption(texto(
        'Combina todos los statements de SWYFFT ya guardados para este mes contable (Excel de transferencia y '
        'talones de cheque), sin importar de qué archivo vinieron: se concilia y exporta un único statement.',
        'Combines every SWYFFT statement already saved for this accounting month (transfer Excel and check '
        'stubs), regardless of which file it came from: a single statement is reconciled and exported.'))
    accounting_month = datetime.strptime(month, '%Y-%m').date()
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(commission_amount) FROM staging_hub.st_swyfft_raw WHERE accounting_month=%s',
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
    mostrar_conciliacion(snapshot, 'swyfft_month_' + month, 'SWYFFT')

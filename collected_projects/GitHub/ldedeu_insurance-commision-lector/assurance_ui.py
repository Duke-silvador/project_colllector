"""Revisión, importación y conciliación del statement ASSURANCE.

Puedes subir varios statements para el mismo mes contable (por ejemplo, de distintas
fuentes); cada uno se revisa e importa por separado, pero la conciliación con el banco
y el Excel final se hacen UNA sola vez combinando todas las filas de ese mes."""
import hashlib
from decimal import Decimal
from io import BytesIO
from openpyxl import load_workbook
from idiomas import interfaz as st, texto
from assurance import preparar_statement, guardar_statement, detectar_encabezado
from conciliacion_ui import mostrar_conciliacion
from database import conectar
from tablas_statements import mostrar_tabla


def mostrar(month):
    st.title('ASSURANCE')
    st.caption(texto(
        'La franquicia se identifica por el código de productor: primero en la tabla de códigos, luego Compass '
        'y luego el histórico. Prima y comisión: Premiums y Amount. Fecha: TransEffDate.',
        'The franchise is identified by the producer code: first the code table, then Compass, then history. '
        'Premium and commission: Premiums and Amount. Date: TransEffDate.'))
    st.caption(texto(
        'Se lee la primera hoja del Excel, independientemente de su nombre. Puedes subir varios statements del '
        'mismo mes contable; se importan por separado pero se concilian y exportan juntos, más abajo.',
        'The first sheet of the Excel is read, regardless of its name. You can upload several statements for the '
        'same accounting month; they are imported separately but reconciled and exported together, further down.'))
    files = st.file_uploader('Statements de comisiones', type=['xlsx', 'xlsm'],
                             accept_multiple_files=True, key='assurance_statements')
    for uploaded in files:
        with st.expander(uploaded.name, expanded=True):
            if uploaded.size > 20 * 1024 * 1024:
                st.error(texto('El fichero supera el límite de 20 MB.', 'The file exceeds the 20 MB limit.'))
                continue
            key = hashlib.sha256(uploaded.name.encode() + uploaded.getvalue() + month.encode()).hexdigest()
            try:
                book = load_workbook(BytesIO(uploaded.getvalue()), read_only=True, data_only=True)
                try:
                    header = detectar_encabezado(book.worksheets[0])
                finally:
                    book.close()
                rows = preparar_statement(uploaded.getvalue(), month, header=header)
                st.caption(texto(f'Encabezado detectado en la fila {header}.', f'Header detected in row {header}.'))
                key += '_' + str(header)
                mostrar_tabla([{k: v for k, v in r.items() if k != 'source_data'} for r in rows], 'assurance_preview_' + key, st=st)
                total = sum((Decimal(r['commission_amount']) for r in rows), Decimal(0))
                st.write(texto(f'{len(rows)} registros. Comisión total del statement: {total}',
                               f'{len(rows)} records. Total statement commission: {total}'))
                confirmed = st.checkbox(texto('Revisé los registros y confirmo la importación.', 'I reviewed the records and confirm the import.'),
                                        key='assurance_confirm_' + key)
                if st.button(texto('Importar faltantes y continuar', 'Import missing and continue'), disabled=not confirmed,
                             key='assurance_save_' + key, type='primary'):
                    with st.spinner(texto('Resolviendo franquicias y guardando el statement…', 'Resolving franchises and saving the statement…')):
                        inserted, updated = guardar_statement(rows, uploaded.name, uploaded.getvalue())
                    st.success(texto(f'{inserted} filas nuevas, {updated} corregidas.',
                                     f'{inserted} new rows, {updated} corrected.'))
            except Exception as exc:
                st.error(texto(f'No se pudo procesar el statement: {type(exc).__name__}: {exc}',
                               f'Could not process the statement: {type(exc).__name__}: {exc}'))
    st.divider()
    st.subheader(texto('Conciliación y Excel final del mes', "Month's reconciliation and final Excel"))
    st.caption(texto(
        'Combina todos los statements de ASSURANCE ya guardados para este mes contable, sin importar de qué '
        'archivo vinieron.', "Combines every ASSURANCE statement already saved for this accounting month, "
        'regardless of which file it came from.'))
    date_month = month + '-01'
    connection = conectar()
    try:
        cursor = connection.cursor()
        cursor.execute('SELECT SUM(CAST(Amount AS DECIMAL(14,2))) FROM staging_hub.st_assurance_raw WHERE accounting_month=%s', (date_month,))
        total = cursor.fetchone()[0]
        cursor.close()
    finally:
        connection.close()
    if total is None:
        st.info(texto('Importa al menos un statement de este mes para conciliar y generar el Excel.',
                      'Import at least one statement for this month to reconcile and generate the Excel.'))
        return
    snapshot = {'file_id': None, 'rows': [{'accounting_month': date_month}], 'grand_total': total}
    mostrar_conciliacion(snapshot, 'assurance_month_' + month, 'ASSURANCE')

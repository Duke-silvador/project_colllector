"""Revisión, importación y conciliación del statement GRANADA."""
import hashlib
from decimal import Decimal
from io import BytesIO
from openpyxl import load_workbook
from idiomas import interfaz as st, texto
from granada import preparar_statement, guardar_statement, detectar_encabezado
from importacion import calcular_file_id
from conciliacion_ui import mostrar_conciliacion
from tablas_statements import mostrar_tabla


def mostrar(month):
    st.title('GRANADA')
    st.caption(texto('Franquicia por AgencyCode. Agente desde AgentName. Fecha: ChangeEffdate. Edition se conserva sin inferir transacciones.', 'Franchise by AgencyCode. Agent from AgentName. Date: ChangeEffdate. Edition is kept without inferring transactions.'))
    st.caption('Se lee la primera hoja del Excel, independientemente de su nombre.')
    files = st.file_uploader('Statement de comisiones', type=['xlsx', 'xlsm'],
                            accept_multiple_files=True, key='granada_statements')
    for uploaded in files:
        with st.expander(uploaded.name, expanded=True):
            if uploaded.size > 20 * 1024 * 1024:
                st.error('El fichero supera el límite de 20 MB.')
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
                mostrar_tabla([{k: v for k, v in r.items() if k != 'source_data'} for r in rows], 'granada_preview_' + key, st=st)
                total = sum((Decimal(r['commission_amount']) for r in rows), Decimal(0))
                st.write(f'{len(rows)} registros. Comisión total del statement: {total}')
                confirmed = st.checkbox('Revisé los registros y confirmo la importación.', key='granada_confirm_' + key)
                if st.button('Importar faltantes y continuar', disabled=not confirmed,
                             key='granada_save_' + key, type='primary'):
                    with st.spinner('Consultando franquicias y guardando el statement…'):
                        count = guardar_statement(rows, uploaded.name, uploaded.getvalue())
                    st.session_state['granada_snapshot_' + key] = dict(
                        rows=[{**r, 'accounting_month': month + '-01'} for r in rows],
                        grand_total=total, file_id=calcular_file_id(uploaded.getvalue()))
                    st.success(f'{count} registros nuevos; {len(rows) - count} ya existentes.')
                snapshot = st.session_state.get('granada_snapshot_' + key)
                if snapshot:
                    mostrar_conciliacion(snapshot, 'granada_' + key, 'GRANADA')
            except Exception as exc:
                st.error(f'No se pudo procesar el statement: {type(exc).__name__}: {exc}')

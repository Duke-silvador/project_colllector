"""Carga y revisión del statement conjunto de Florida Peninsula."""
import hashlib
from decimal import Decimal
from idiomas import interfaz as st
from florida_peninsula import leer_statement, guardar_statement
from importacion import calcular_file_id
from conciliacion_ui import mostrar_conciliacion
from tablas_statements import mostrar_tabla


def mostrar(month):
    st.title('Florida Peninsula · Edison · Ovation Home')
    st.info('Florida Peninsula, Edison y Ovation Home comparten códigos y tarifas bajo FLORIDA PENINSULA. Franquicia: tabla de códigos; si falta el código, Compass y luego histórico si no aparece la póliza. Comisión de franquicia: commission_rates de FLORIDA PENINSULA, sin porcentajes del histórico. Tipo y porcentaje Del Toro: del statement cuando vienen informados.')
    st.caption('FPI → Florida Peninsula; EDI → Edison; OVH → Ovation Home. Las demás hojas se omiten.')
    files = st.file_uploader('Statement de comisiones', type=['xlsx', 'xlsm'], accept_multiple_files=True,
                            key='florida_statements')
    for uploaded in files:
        with st.expander(uploaded.name, expanded=True):
            if uploaded.size > 20 * 1024 * 1024:
                st.error('El fichero supera el límite de 20 MB.')
                continue
            key = hashlib.sha256(uploaded.name.encode() + uploaded.getvalue() + month.encode()).hexdigest()
            header = st.number_input('Fila de encabezados', min_value=1, value=1, step=1, key='fpi_header_' + key)
            key += '_' + str(header)
            try:
                rows = leer_statement(uploaded.getvalue(), month, header=int(header))
                st.caption('Prima: sumtier · Comisión Del Toro: sumauth · Tipo: transtype · Rate Del Toro: commissionpercent')
                mostrar_tabla([{k: v for k, v in r.items() if k != 'source_data'} for r in rows], 'fpi_preview_' + key, st=st)
                total = sum((Decimal(r['commission_amount']) for r in rows), Decimal(0))
                st.write(f'{len(rows)} registros. Comisión total del statement: {total}')
                confirmed = st.checkbox('Revisé los registros y confirmo la importación.', key='fpi_confirm_' + key)
                if st.button('Importar faltantes y continuar', disabled=not confirmed, key='fpi_save_' + key,
                             type='primary'):
                    with st.spinner('Consultando franquicias y guardando el statement…'):
                        count = guardar_statement(rows, uploaded.name, uploaded.getvalue())
                    snapshot_rows = [{**r, 'accounting_month': month + '-01'} for r in rows]
                    st.session_state['fpi_snapshot_' + key] = dict(rows=snapshot_rows, grand_total=total,
                                                                   file_id=calcular_file_id(uploaded.getvalue()))
                    st.success(f'{count} registros nuevos; {len(rows) - count} ya existentes.')
                snapshot = st.session_state.get('fpi_snapshot_' + key)
                if snapshot:
                    mostrar_conciliacion(snapshot, 'fpi_' + key, 'FLORIDA PENINSULA')
            except Exception as exc:
                st.error(f'No se pudo procesar el statement: {type(exc).__name__}: {exc}')

"""Segundo paso, disponible solo con una importacion confirmada."""
import functools
import hashlib
from decimal import Decimal
from idiomas import interfaz as st
from conciliacion import (buscar_transacciones, buscar_transacciones_por_monto, buscar_transacciones_por_montos,
                          generar_excel, generar_excel_solo_reporte)
from compass import buscar_office_id, obtener_token
from database import conectar
from franquicias import cargar_mapa_franquicias, cargar_codigos_master
from oficinas import cargar_mapa_office_numbers, cargar_alias_franquicias
from procesamiento import hojas_excel
from historial import ruta_resultado, guardar_resultado
from reparto_comisiones import cargar_comisiones_excel
from carriers import CARRIERS
from florida_peninsula import cargar_comisiones_excel as cargar_florida_excel
from swyfft import cargar_comisiones_excel as cargar_swyfft_excel
from granada import cargar_comisiones_excel as cargar_granada_excel
from bass import cargar_comisiones_excel as cargar_bass_excel
from assurance import cargar_comisiones_excel as cargar_assurance_excel
from crc_group import cargar_comisiones_excel as cargar_crc_group_excel
from orchid import cargar_comisiones_excel as cargar_orchid_excel
from slide import cargar_comisiones_excel as cargar_slide_excel
from tower_hill import cargar_comisiones_excel as cargar_tower_hill_excel
from gic_underwriters import cargar_comisiones_excel as cargar_gic_underwriters_excel
from the_general import cargar_comisiones_excel as cargar_the_general_excel
from carrier_bank_terms import cargar_terminos_busqueda
from tablas_statements import mostrar_tabla


def _importes_esperados(rows, total):
    """Si el total del reporte es la suma de varios cheques (BASS, CRC GROUP: cada pagina o
    archivo trae el suyo), cada cheque suele depositarse como su propia transaccion bancaria.
    En ese caso hay que buscar cada importe por separado; una sola fila no va a coincidir con
    el total combinado. Sin ese desglose (la mayoria de los carriers), se busca el total tal cual."""
    piezas = {}
    for row in rows:
        monto = row.get('check_amount')
        clave = (row.get('file_id'), row.get('source_page'))
        if monto is None or clave[0] is None:
            return [total]
        piezas.setdefault(clave, monto)
    valores = list(piezas.values())
    return valores if len(valores) > 1 else [total]


def boton_descarga(label, data, file_name, mime, key):
    downloaded_key = 'downloaded_' + key
    if st.download_button(label, data, file_name=file_name, mime=mime, key=key):
        st.session_state[downloaded_key] = True
    if st.session_state.get(downloaded_key):
        st.success(f'Archivo descargado: {file_name}')


def descargar_resultados(workbook, suggested_name, key, carrier):
    mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    boton_descarga('Descargar Excel conciliado', workbook, suggested_name, mime, key)
    boton_descarga('Descargar solo Report_LDA (valores)', generar_excel_solo_reporte(workbook),
        carrier.lower() + '.xlsx', mime, key + '_report')


def mostrar_resultados_compass(rows, key='compass_statement'):
    consulted = any(
        row.get('franchise_number_source') in ('compass', 'historico')
        or row.get('transaction_type_source') == 'historico'
        or (row.get('policy_number') and row.get('transaction_type_source') != 'statement' and (row.get('transaction_type') or row.get('type_lookup_error')))
        for row in rows
    )
    con_poliza = [row for row in rows if row.get('policy_number')]
    if not consulted and con_poliza and all(row.get('franchise_number_source') == 'codigos' for row in con_poliza):
        st.subheader('Resultados del statement y tabla de códigos')
        mostrar_tabla([{
            'Póliza': row.get('policy_number'),
            'Carrier': row.get('carrier'),
            'Franquicia': row.get('franchise_number'),
            'Fuente franquicia': 'Tabla de códigos',
            'Tipo': row.get('transaction_type') or '',
            'Fuente tipo': 'Statement' if row.get('transaction_type_source') == 'statement' else 'Pendiente',
        } for row in con_poliza], key + '_codes', st=st)
        return
    detalles = []
    for row in rows:
        if not row.get('policy_number'):
            # Chargebacks: no tienen número de póliza ni se consultan en Compass; se identifican
            # por el código de productor dentro de la descripción (chargebacks_commonwealth).
            if row.get('transaction_type'):
                detalles.append({
                    'Póliza': '', 'Carrier': str(row.get('carrier') or ''), 'Oficina': '',
                    'Franquicia': str(row.get('franchise_number') or ''), 'Origen franquicia': '',
                    'Fuente franquicia': 'Código en descripción (chargeback)' if row.get('franchise_number') else '',
                    'Alerta código': row.get('commission_alert') or '',
                    'Resultado': 'Chargeback con franquicia asignada' if row.get('franchise_number') else 'Chargeback sin franquicia',
                    'Tipo en Compass': '', 'Tipo en statement': str(row['transaction_type']), 'Tipo en histórico': '',
                    'ID en Compass': '',
                    'Detalle': row.get('commission_alert') or 'Chargeback con franquicia asignada',
                })
            continue
        error = row.get('type_lookup_error')
        tipo = row.get('transaction_type')
        carrier_mismatch = error == 'carrier_mismatch'
        del_historico = row.get('transaction_type_source') == 'historico'
        del_statement = row.get('transaction_type_source') == 'statement' and bool(tipo)
        encontrado = tipo in ('NEW_BUSINESS', 'RENEWAL') and (not error or carrier_mismatch)
        if del_statement:
            resultado = 'Se obtuvo del statement'
        elif del_historico:
            resultado = 'Se obtuvo del histórico'
        elif encontrado and carrier_mismatch:
            resultado = 'Tipo obtenido (revisar carrier)'
        elif encontrado:
            resultado = 'Tipo obtenido'
        else:
            resultado = 'No se obtuvo el tipo'
        detalles.append({
            'Póliza': str(row['policy_number']),
            'Carrier': str(row.get('carrier') or ''),
            'Oficina': str(row.get('office_number') or ''),
            'Franquicia': str(row.get('franchise_number') or ''),
            'Origen franquicia': {'historico': 'Se obtuvo del histórico',
                                  'compass_visual': 'Se obtuvo por búsqueda visual en Compass (nombre del cliente)',
                                  }.get(row.get('franchise_number_source'), ''),
            'Fuente franquicia': row.get('franchise_number_source') or '',
            'Alerta código': row.get('code_lookup_alert') or '',
            'Resultado': resultado,
            'Tipo en Compass': tipo if encontrado and not del_historico and not del_statement else '',
            'Tipo en statement': tipo if del_statement else '',
            'Tipo en histórico': tipo if del_historico else '',
            'ID en Compass': str(row.get('compass_policy_id') or '') if encontrado and not carrier_mismatch and not del_historico and not del_statement else '',
            'Detalle': ('Se obtuvo del statement' if del_statement else 'Se obtuvo del histórico' if del_historico else error or ('' if encontrado else 'Compass no devolvió un tipo válido')),
        })
    st.subheader('Resultado de Compass e histórico')
    if not detalles:
        st.info('No hay pólizas ni cargos para revisar en este statement.')
        return
    encontrados = sum(
        row['Resultado'].startswith('Tipo obtenido') or row['Resultado'] in (
            'Se obtuvo del histórico', 'Se obtuvo del statement', 'Chargeback con franquicia asignada')
        for row in detalles)
    mensaje = f'Se resolvieron {encontrados} de {len(detalles)} registros (pólizas y cargos).'
    if encontrados == len(detalles):
        st.success(mensaje)
    else:
        st.warning(mensaje + ' Revisa los pendientes antes de generar el Excel.')
    st.caption('NEW_BUSINESS = negocio nuevo; RENEWAL = renovación. Los cargos (sin póliza) se identifican por el '
              'código de productor en su descripción, no se consultan en Compass.')
    mostrar_tabla(detalles, key + '_results', st=st)


def mostrar_conciliacion(snapshot, key, carrier):
    if st.button('🔄 Actualizar comisiones', key='refrescar_comisiones_' + key,
                 help='Vuelve a calcular con las tarifas guardadas en Comisiones ahora mismo, por si agregaste o '
                      'corregiste una después de importar este statement.'):
        for state_key in list(st.session_state):
            if state_key.startswith(('compass_preview_', 'generated_', 'compass_result_', 'downloaded_', 'last_generated_')):
                del st.session_state[state_key]
        st.success('Comisiones actualizadas con las tarifas vigentes.')
    cargar = {'FLORIDA PENINSULA': cargar_florida_excel, 'SWYFFT': cargar_swyfft_excel,
              'GRANADA': cargar_granada_excel, 'BASS': cargar_bass_excel,
              'ASSURANCE': cargar_assurance_excel, 'CRC GROUP': cargar_crc_group_excel,
              'ORCHID': cargar_orchid_excel, 'SLIDE': cargar_slide_excel,
              'TOWER HILL': cargar_tower_hill_excel, 'GIC Underwriters': cargar_gic_underwriters_excel,
              'THE GENERAL': cargar_the_general_excel}.get(carrier, cargar_comisiones_excel)
    if carrier in ('COMMONWEALTH', 'FLORIDA PENINSULA', 'SWYFFT', 'GRANADA', 'BASS', 'ASSURANCE', 'CRC GROUP', 'ORCHID', 'SLIDE', 'TOWER HILL', 'GIC Underwriters', 'THE GENERAL'):
        connection = None
        try:
            connection = conectar()
            config = CARRIERS[carrier]
            rows = cargar(connection, snapshot, carrier,
                config.get('commission_state'), config.get('commission_business_line'))
            snapshot = {**snapshot, 'rows': rows}
            code_alerts = [{
                'Código': r.get('producer_code') or r.get('vendor_name'),
                'Póliza': r.get('policy_number'),
                'Franquicia en Compass': r.get('compass_franchise_number') or 'No encontrada',
                'Oficina en Compass': r.get('compass_office_number') or 'No encontrada',
                'Alerta': r['code_lookup_alert'],
            } for r in rows if r.get('code_lookup_alert')]
            if code_alerts:
                st.warning('No se pudo resolver la franquicia por código en estos registros. La tabla indica el motivo de cada caso; se consultó Compass como alternativa.')
                mostrar_tabla(code_alerts, key + '_code_alerts', st=st)
        except Exception as exc:
            st.error(f'No se pudieron cargar las comisiones del raw: {type(exc).__name__}: {exc}')
            return
        finally:
            if connection is not None:
                connection.close()
        pendientes = sum(bool(row.get('commission_alert')) for row in rows)
        if pendientes:
            st.warning(f'{pendientes} registros sin comisiones calculadas; revisa Commission Alert en el Excel.')
    st.subheader('Conciliar con el banco')
    if snapshot['grand_total'] is None:
        st.info('Esta importación no tiene un Grand Total PDF disponible para conciliar.')
        return
    total = snapshot['grand_total']
    connection = conectar()
    try:
        terminos = cargar_terminos_busqueda(connection).get(carrier)
    finally:
        connection.close()
    accounting_month = str(snapshot['rows'][0]['accounting_month'])
    year, month = accounting_month[:7].split('-')
    month_names = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
    suggested_name = f'{carrier} {month_names[int(month) - 1]} {year}.xlsx'
    saved = ruta_resultado(snapshot, carrier)
    st.write(f'Total del reporte: {total}')
    def nuevo_analisis_bancario():
        for state_key in list(st.session_state):
            if state_key.startswith(('compass_preview_', 'generated_', 'compass_result_', 'downloaded_')):
                del st.session_state[state_key]
    omitir_banco = False
    if carrier in ('BASS', 'CRC GROUP', 'GIC Underwriters'):
        if carrier == 'GIC Underwriters':
            # A diferencia de BASS/CRC GROUP, aqui no se valida cada cheque contra su comision
            # al importar (todavia no conocemos el formato real del talon); la opcion existe
            # para cuando el statement bancario simplemente no esta disponible (ej. se llevaron
            # los cheques antes de poder escanearlos), no porque ya se haya validado el monto.
            mensaje = 'Omitir la conciliación bancaria y generar el Excel directamente (usa esto si no tienes el statement del banco disponible). La hoja Bank queda vacía.'
        else:
            mensaje = f'Omitir la conciliación bancaria y generar el Excel directamente ({carrier} ya valida cada cheque contra su comisión al importar). La hoja Bank queda vacía.'
        omitir_banco = st.checkbox(mensaje, key='bass_omitir_banco_' + key, on_change=nuevo_analisis_bancario)
    if not omitir_banco:
        bank = st.file_uploader('Statement del banco', type=['xlsx', 'xlsm'], key='bank_' + key,
                                on_change=nuevo_analisis_bancario)
        if bank is None:
            return
        if bank.size > 20 * 1024 * 1024:
            st.error('El statement supera el límite de 20 MB.')
            return
    try:
        if omitir_banco:
            data = header = None
            sheets = []
            file_key = key + '_sin_banco'
            selected = {'bank_rows': None}
        else:
            data = bank.getvalue()
            file_key = key + hashlib.sha256(data).hexdigest()
            # Selección múltiple: la misma transacción puede aparecer en una hoja distinta del
            # banco (varias cuentas en un mismo archivo); se buscan todas las hojas elegidas
            # juntas y los resultados se combinan en una sola tabla, marcando de qué hoja viene
            # cada fila, en vez de perder lo ya encontrado al cambiar de hoja.
            hojas_disponibles = hojas_excel(data)
            sheets = st.multiselect('Hoja(s) del banco', hojas_disponibles, default=hojas_disponibles[:1],
                                    key='bank_sheet_' + file_key)
            if not sheets:
                st.info('Selecciona al menos una hoja del banco.')
                return
            header = st.number_input('Fila de encabezados del banco', min_value=1, value=1, step=1, key='bank_header_' + file_key)
            transactions = [dict(t, sheet=hoja) for hoja in sheets for t in buscar_transacciones(data, hoja, int(header), carrier, terminos)]
            if not transactions:
                piezas = _importes_esperados(rows, total)
                for hoja in sheets:
                    if len(piezas) > 1:
                        encontradas = buscar_transacciones_por_montos(data, hoja, int(header), piezas)
                    else:
                        encontradas = buscar_transacciones_por_monto(data, hoja, int(header), total)
                    transactions.extend(dict(t, sheet=hoja) for t in encontradas)
                if not transactions:
                    st.warning(f'No se encontraron transacciones con {carrier} en Description ni por el importe {total}.')
                    return
                st.info(f'No se encontró {carrier} en Description; se buscó por el importe exacto ({total}) y '
                        + ('se encontró 1 coincidencia.' if len(transactions) == 1 else f'se encontraron {len(transactions)} coincidencias.'))
            mostrar_tabla([{'Hoja': row['sheet'], 'Fila Excel': row['row'], 'Description': row['description'], 'Amount': str(row['amount'])} for row in transactions], file_key + '_bank', st=st)
            claves = [(t['sheet'], t['row']) for t in transactions]
            if carrier in ('FLORIDA PENINSULA', 'ASSURANCE', 'CRC GROUP', 'ORCHID', 'SLIDE', 'THE GENERAL', 'SWYFFT', 'BASS'):
                # La clave incluye las hojas elegidas: si el usuario agrega/quita una hoja del
                # banco, las transacciones encontradas cambian y este multiselect debe volver a
                # partir de 'default=claves' con todas seleccionadas. Sin esto, Streamlit
                # reutiliza la seleccion vieja guardada bajo la misma key (menos transacciones
                # de las que ahora hay), y el Excel sale con una transaccion real de menos sin
                # ningun aviso, solo una diferencia rara en el Pivot.
                seleccionadas = st.multiselect('Transacciones bancarias a sumar', claves, default=claves,
                    format_func=lambda clave: next(f"{t['sheet']} · Fila {t['row']} · {t['amount']} · {t['description']}"
                                                   for t in transactions if (t['sheet'], t['row']) == clave),
                    key=f'bank_sum_{file_key}_{header}_{"_".join(sorted(sheets))}')
                bank_total = sum((t['amount'] for t in transactions if (t['sheet'], t['row']) in seleccionadas), Decimal(0))
                diferencia = total - bank_total
                st.write(f'Total bancario seleccionado: {bank_total} · Diferencia: {diferencia}')
                if carrier == 'SWYFFT' and diferencia:
                    # SWYFFT paga una parte por cheque fisico en vez de transferencia; el banco a
                    # veces no trae una descripcion legible para ese pago (o simplemente no lo
                    # deposito todavia), asi que esa parte del statement no aparece entre las
                    # transacciones encontradas. En vez de dejar la diferencia sin explicar, se
                    # compara contra lo importado desde talones de cheque (source_sheet
                    # SWYFFT_CHEQUE) para decir de donde puede venir.
                    total_cheques = sum((Decimal(str(row['commission_amount'])) for row in rows
                                        if row.get('source_sheet') == 'SWYFFT_CHEQUE'), Decimal(0))
                    if total_cheques:
                        st.info(f'De la diferencia de {diferencia}, {total_cheques} corresponde a filas '
                               'importadas de talones de cheque; el banco puede no traer una descripción '
                               'legible para esos pagos, o todavía no haberlos depositado.')
                matches = [{'bank_rows': [{'sheet': s, 'row': r} for s, r in seleccionadas], 'amount': bank_total,
                            'label': 'Suma de las transacciones seleccionadas'}] if seleccionadas else []
            else:
                matches = [{'bank_rows': [{'sheet': t['sheet'], 'row': t['row']}], 'amount': t['amount'],
                            'label': f"{t['sheet']} · Fila {t['row']} · {t['amount']} · {t['description']}"} for t in transactions]
            if not matches:
                st.warning('Selecciona al menos una transacción bancaria para generar el Excel.')
                return
            selected = st.selectbox('Transacción bancaria a conciliar', matches,
                format_func=lambda match: match['label'],
                index=0 if len(matches) == 1 else None,
                key=f'bank_match_{file_key}_{header}')
            if selected is None:
                st.info('Hay varias transacciones candidatas. Selecciona la que corresponde.')
                return
            if selected['amount'] != total and carrier != 'THE GENERAL':
                # Para THE GENERAL esta suma es solo una vista previa (busqueda por nombre/
                # terminos, sin el codigo master ni el desglose por codigo); no es el chequeo
                # real. El Pivot del Excel generado hace la comparacion correcta, codigo por
                # codigo, con la franquicia master atribuida aparte - avisar aqui con esta suma
                # incompleta solo confunde.
                st.warning(f'La transacción bancaria seleccionada ({selected["amount"]}) no coincide exactamente con el '
                          f'total del reporte ({total}); diferencia: {total - selected["amount"]}. Se generará el Excel '
                          'igual, con la diferencia registrada en la hoja Pivot.')
        bank_rows_key = 'sin_banco' if selected['bank_rows'] is None else '_'.join(f"{r['sheet']}:{r['row']}" for r in selected['bank_rows'])
        generated_key = f'generated_{file_key}_{header}_{bank_rows_key}'
        preview_key = 'compass_preview_' + generated_key
        peninsula = carrier in ('FLORIDA PENINSULA', 'SWYFFT', 'GRANADA', 'BASS', 'ASSURANCE', 'CRC GROUP', 'ORCHID', 'SLIDE', 'TOWER HILL', 'GIC Underwriters', 'THE GENERAL')
        prepare = True if peninsula else st.button('Consultar Compass', key=f'generate_{file_key}_{header}', type='primary')
        if prepare:
            st.session_state.pop(preview_key, None)
            if not peninsula:
                st.session_state.pop(generated_key, None)
            st.session_state.pop('compass_result_' + key, None)
            connection = conectar()
            try:
                with st.spinner('Preparando resultados y comisiones…' if peninsula else 'Consultando tipos en Chrome y calculando comisiones…'):
                    config = CARRIERS[carrier]
                    rows = cargar(connection, snapshot, carrier,
                        config.get('commission_state'), config.get('commission_business_line'), consultar_tipos=True)
                    st.session_state[preview_key] = rows
            finally:
                connection.close()
        if preview_key not in st.session_state:
            st.info('Consulta Compass para revisar el resultado por póliza antes de generar el Excel.')
            return
        rows = st.session_state[preview_key]
        mostrar_resultados_compass(rows, key=generated_key)
        snapshot = {**snapshot, 'rows': rows}
        saved = ruta_resultado(snapshot, carrier)
        # El Excel generado se cachea en session_state; si los datos subyacentes cambiaron
        # desde la ultima vez (se importo o corrigio algo), la huella cambia y no se reusa
        # el Excel viejo aunque no se haya apretado "Actualizar comisiones".
        huella = hashlib.sha256(str(sorted(
            (r.get('id'), str(r.get('commission_amount')), r.get('franchise_number'), r.get('franchise_percent'))
            for r in rows)).encode()).hexdigest()[:12]
        excel_cache_key = generated_key + '_' + huella
        hay_version_anterior = any(k.startswith(generated_key + '_') and k != excel_cache_key for k in st.session_state)
        if not st.button('Generar Excel con estos resultados', key='export_' + excel_cache_key, type='primary'):
            if excel_cache_key in st.session_state:
                descargar_resultados(st.session_state[excel_cache_key], suggested_name, 'last_' + excel_cache_key, carrier)
            elif hay_version_anterior:
                st.info('Los datos cambiaron desde el último Excel generado; genera uno nuevo para reflejarlos.')
            return
        connection = conectar()
        try:
            mapa_franquicias = cargar_mapa_franquicias(connection)
            mapa_oficinas = cargar_mapa_office_numbers(connection)
            codigos_master = cargar_codigos_master(connection)
            alias_franquicias = cargar_alias_franquicias(connection)
        finally:
            connection.close()
        try:
            buscar_office_id_fn = None if peninsula else functools.partial(buscar_office_id, obtener_token())
        except Exception:
            buscar_office_id_fn = None
            st.warning('No se pudo conectar con Compass; las franquicias sin resolver quedarán vacías y marcadas en rojo.')
        workbook = generar_excel(snapshot['rows'], total, data, None, None if header is None else int(header), selected['bank_rows'], carrier,
                                  mapa_franquicias, buscar_office_id_fn, mapa_oficinas, codigos_master, alias_franquicias, terminos,
                                  bank_sheets=None if omitir_banco else sheets)
        report_workbook = generar_excel_solo_reporte(workbook)
        report_saved = saved.with_name(carrier.lower() + '.xlsx')
        guardar_resultado(saved, workbook)
        guardar_resultado(report_saved, report_workbook)
        st.caption(f'Excel guardado en: {saved}')
        st.caption(f'Reporte guardado en: {report_saved}')
        st.session_state[excel_cache_key] = workbook
        st.session_state['compass_result_' + key] = rows
        if omitir_banco:
            st.success('Excel generado sin conciliación bancaria. La hoja Bank quedó vacía.')
        elif selected['amount'] == total:
            st.success('Conciliación exacta. Difference: 0.00')
        else:
            st.warning(f'Excel generado con diferencia bancaria: {total - selected["amount"]}.')
        accounting_month = str(snapshot['rows'][0]['accounting_month'])
        year, month = accounting_month[:7].split('-')
        month_names = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
        suggested_name = f'{carrier} {month_names[int(month) - 1]} {year}.xlsx'
        descargar_resultados(workbook, suggested_name, 'reconciled_' + file_key, carrier)
    except ValueError as exc:
        st.error(str(exc))
    except Exception as exc:
        st.error(f'No se pudo procesar el statement: {type(exc).__name__}: {exc}')

"""Consulta opcional, de solo lectura, del histórico para pólizas ausentes."""
from database import conectar
from franquicias import _formatear_codigo_oficina


CAMPOS = {
    'franchise': 'Número oficina', 'agent_name': 'Nombre agente',
    'insured_name': 'Asegurado', 'carrier': 'Carrier', 'agency_code': 'Código agencia',
    'transaction_type': 'Tipo transacción', 'lob': 'Línea de negocio',
    'state': 'Estado (EE. UU.)', 'term_length': 'Duración póliza',
    'date': 'Fecha transacción histórico', 'report_month': 'Mes reporte histórico',
    'statement_month': 'Mes statement histórico', 'premium': 'Prima',
    'del_toro_percentage': 'Porcentaje Del Toro', 'del_toro_commission': 'Comisión Del Toro',
    'franchise_percentage': 'Porcentaje franquicia', 'franchise_commission': 'Comisión franquicia',
}


def completar_desde_historico(resultados):
    filas = [dict(r) for r in resultados]
    pendientes = [r for r in filas if r.get('Resultado') == 'Póliza no encontrada' and r.get('Póliza')]
    if not pendientes:
        return filas
    connection = conectar()
    try:
        cursor = connection.cursor(dictionary=True)
        try:
            cache = {}
            for row in pendientes:
                numero = row['Póliza']
                if numero not in cache:
                    cursor.execute(
                        'SELECT ' + ', '.join('`' + c + '`' for c in CAMPOS) +
                        ' FROM staging_hub.historic_data_commissions WHERE policy_number=%s'
                        ' ORDER BY report_month DESC, `date` DESC LIMIT 1', (numero,))
                    cache[numero] = cursor.fetchone()
                encontrado = cache[numero]
                if encontrado is None:
                    row['Resultado'] = 'Póliza no encontrada en Compass ni histórico'
                    continue
                for campo, etiqueta in CAMPOS.items():
                    valor = encontrado.get(campo)
                    texto = '' if valor is None else str(valor)
                    if campo == 'franchise' and texto and not texto.upper().startswith('DT'):
                        texto = _formatear_codigo_oficina(texto) or texto
                    row[etiqueta] = texto
                row['Resultado'] = 'Encontrada en histórico'
                row['Resultado agente'] = 'Nombre obtenido del histórico' if row.get('Nombre agente') else ''
        finally:
            cursor.close()
    finally:
        connection.close()
    for row in filas:
        row['Origen datos'] = 'Histórico' if row.get('Resultado') == 'Encontrada en histórico' else (
            'Compass' if row.get('Office ID') else '')
    columnas = list(dict.fromkeys(k for row in filas for k in row))
    return [{k: row.get(k, '') for k in columnas} for row in filas]


def completar_desde_historico_lote(resultados):
    """Consulta las pólizas ausentes juntas y conserva el registro más reciente."""
    filas = [dict(r) for r in resultados]
    numeros = list(dict.fromkeys(r['Póliza'] for r in filas
                               if r.get('Resultado') == 'Póliza no encontrada' and r.get('Póliza')))
    if not numeros:
        return filas
    connection = conectar()
    encontrados = {}
    try:
        cursor = connection.cursor(dictionary=True)
        try:
            for inicio in range(0, len(numeros), 100):
                lote = numeros[inicio:inicio + 100]
                cursor.execute(
                    'SELECT /*+ MAX_EXECUTION_TIME(30000) */ policy_number, ' +
                    ', '.join('`' + c + '`' for c in CAMPOS) +
                    ' FROM staging_hub.historic_data_commissions WHERE policy_number IN (' +
                    ','.join(['%s'] * len(lote)) + ')'
                    ' ORDER BY report_month DESC, `date` DESC, trans_ID DESC', tuple(lote))
                for registro in cursor.fetchall():
                    encontrados.setdefault(str(registro['policy_number']), registro)
        finally:
            cursor.close()
    finally:
        connection.close()
    for row in filas:
        if row.get('Resultado') == 'Póliza no encontrada' and row.get('Póliza'):
            encontrado = encontrados.get(row['Póliza'])
            row['Resultado agente'] = ''
            if encontrado is None:
                row['Resultado'] = 'Póliza no encontrada en Compass ni histórico'
            else:
                for campo, etiqueta in CAMPOS.items():
                    valor = encontrado.get(campo)
                    valor = '' if valor is None else str(valor)
                    if campo == 'franchise' and valor and not valor.upper().startswith('DT'):
                        valor = _formatear_codigo_oficina(valor) or valor
                    row[etiqueta] = valor
                row['Resultado'] = 'Encontrada en histórico'
                row['Resultado agente'] = 'Nombre obtenido del histórico' if row.get('Nombre agente') else ''
        row['Origen datos'] = 'Histórico' if row.get('Resultado') == 'Encontrada en histórico' else (
            'Compass' if row.get('Office ID') else '')
    return filas


def ofrecer_historico(resultados, clave):
    from idiomas import interfaz as st, texto
    pendientes = sum(r.get('Resultado') == 'Póliza no encontrada' for r in resultados)
    if pendientes:
        st.info(texto(
            f'{pendientes} pólizas no encontradas en Compass. Puedes buscarlas en el histórico o exportar sin completar.',
            f'{pendientes} policies not found in Compass. Search the history or export without filling missing policies.'))
        st.caption('Si hay varios registros históricos se utiliza el del mes de reporte y fecha de transacción más recientes. Las fechas de vigencia y expiración quedan vacías si no existen en el histórico.')
        if st.button('Buscar pólizas faltantes en histórico', key=f'{clave}_historico'):
            try:
                with st.spinner('Consultando histórico…'):
                    resultados = completar_desde_historico(resultados)
                st.session_state[clave.replace('_tabla', '_resultados')] = resultados
            except Exception:
                st.error('No se pudo consultar el histórico. Puedes exportar los resultados actuales o volver a intentar.')
    return resultados

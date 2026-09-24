"""Calculo para el Excel desde el raw y las tarifas vigentes, sin escrituras."""
from decimal import Decimal, InvalidOperation
from comisiones import STATES
from compass_bot_client import obtener_tipos_lote

ESTADOS = {value.upper(): code for code, name in STATES for value in (code, name)}


CAMPOS = ('del_toro_percent', 'del_toro_commission', 'franchise_percent', 'franchise_commission')


def completar_del_toro_statement(row):
    """Del Toro siempre procede del statement, independientemente de la tarifa."""
    try:
        premium = Decimal(str(row['premium_amount']))
        commission = Decimal(str(row['commission_amount']))
    except (KeyError, InvalidOperation, ValueError, TypeError):
        raise ValueError('Falta prima o comisión válida del statement para calcular Del Toro') from None
    if not all(v.is_finite() for v in (premium, commission)):
        raise ValueError('Prima o comisión del statement inválida para calcular Del Toro')
    if row.get('del_toro_percent_source') == 'statement':
        rate = Decimal(str(row['del_toro_percent']))
        if not rate.is_finite():
            raise ValueError('Porcentaje Del Toro inválido en el statement')
        row['del_toro_percent'] = rate
    else:
        if not premium and commission:
            raise ValueError('Prima o comisión del statement inválida para calcular Del Toro')
        row['del_toro_percent'] = commission / premium if premium else Decimal(0)
    row['del_toro_commission'] = commission


def completar_datos_historicos(rows, historico):
    por_poliza = {}
    for h in historico:
        por_poliza.setdefault(str(h.get('policy_number') or '').strip(), []).append(h)
    for row in rows:
        if not row.get('policy_number'):
            continue
        registros = por_poliza.get(str(row['policy_number']).strip(), [])
        if not row.get('office_id') and row.get('franchise_number') and any(
                str(h.get('franchise') or '').strip() == str(row['franchise_number']).strip() for h in registros):
            row['franchise_number_source'] = 'historico'
        for campo, destino in (('transaction_type', 'transaction_type'), ('franchise', 'franchise_number')):
            if destino == 'transaction_type' and row.get('transaction_type_source') == 'statement' and row.get(destino):
                continue
            falta_tipo = destino == 'transaction_type' and (
                row.get('transaction_type') not in ('NEW_BUSINESS', 'RENEWAL') or row.get('type_lookup_error'))
            if row.get(destino) and not falta_tipo:
                continue
            registro = next((h for h in registros if str(h.get(campo) or '').strip()), None)
            if registro is None:
                continue
            valor = str(registro[campo]).strip()
            if destino == 'transaction_type':
                aliases = {'NEW BUSINESS': 'NEW_BUSINESS', 'NB': 'NEW_BUSINESS',
                           'RENEWAL': 'RENEWAL', 'RN': 'RENEWAL', 'RWL': 'RENEWAL'}
                valor = aliases.get(valor.upper(), valor)
                row['compass_lookup_error'] = row.get('type_lookup_error')
                row['type_lookup_error'] = None
            row[destino] = valor
            row[destino + '_source'] = 'historico'
            row['history_carrier'] = registro.get('carrier')
        if not row.get('office_number') and row.get('franchise_number_source') == 'historico':
            # Office en el historico es el codigo de franquicia, no un office_id de Compass.
            row['office_number'] = row['franchise_number']
            row['office_number_source'] = 'historico'
        if not row.get('state'):
            registro = next((h for h in registros if h.get('state')), None)
            if registro:
                row['state'] = registro['state']


def calcular_comisiones_raw(rows, tarifas, carrier, state=None, business_line=None, *, historico=()):
    # El cargador entrega primero los registros historicos mas recientes.
    porcentajes_historicos = {}
    for registro in historico:
        if registro.get('carrier') != carrier:
            continue
        if registro.get('franchise_percent') is None:
            continue
        porcentajes_historicos.setdefault(str(registro.get('policy_number') or '').strip(), registro)
    result = []
    for original in rows:
        row = dict(original)
        row.setdefault('type_lookup_error', None)
        row.update(dict.fromkeys(field for field in CAMPOS
                                if field != 'del_toro_percent' or row.get('del_toro_percent_source') != 'statement'))
        row['commission_alert'] = None
        if not row.get('policy_number'):
            result.append(row)
            continue
        completar_del_toro_statement(row)
        tipo = row.get('transaction_type')
        if row.get('transaction_type_source') == 'statement':
            statement_type = ' '.join(str(tipo).strip().upper().replace('_', ' ').split())
            tipo = {'N': 'NEW_BUSINESS', 'NB': 'NEW_BUSINESS', 'NEW': 'NEW_BUSINESS',
                    'NEW BUSINESS': 'NEW_BUSINESS', 'NEW BUSSINES': 'NEW_BUSINESS',
                    'R': 'RENEWAL', 'RN': 'RENEWAL', 'RWL': 'RENEWAL',
                    'RENEW': 'RENEWAL', 'RENEWAL': 'RENEWAL'}.get(statement_type, statement_type)
            if tipo == statement_type:
                tipo = statement_type.replace(' ', '_')
        estado = ESTADOS.get(str(row.get('state') or state or '').strip().upper())
        row['state'] = estado
        linea = row.get('business_line', business_line)
        if linea is None:
            linea = ''  # Tarifa general; nunca elegir una linea especifica sin datos.
        rate = porcentajes_historicos.get(str(row['policy_number']).strip())
        if rate is not None:
            pass  # El historico no depende del tipo obtenido en Compass.
        elif row.get('type_lookup_error'):
            row['commission_alert'] = row['type_lookup_error']
        elif (not tipo or tipo not in {t['transaction_type'] for t in tarifas} | {'NEW_BUSINESS', 'RENEWAL'}) and not any(t['transaction_type'] == 'ALL' and t['carrier'] == carrier for t in tarifas):
            row['commission_alert'] = 'Falta tipo de transaccion valido'
        elif not estado or linea is None:
            row['commission_alert'] = 'Falta estado o linea de negocio para elegir tarifa'
        else:
            matches = [t for t in tarifas if t['carrier'] == carrier and t['state'] == estado
                       and t['transaction_type'] in (tipo, 'ALL') and t['business_line'] == linea]
            especificas = [t for t in matches if t['transaction_type'] == tipo]
            matches = especificas or matches
            precision = Decimal('0.001') if carrier == 'SWYFFT' else Decimal('0.000001')
            recibida = row['del_toro_percent'].quantize(precision)
            coincidentes = [t for t in matches if t.get('del_toro_percent') is not None
                           and Decimal(str(t['del_toro_percent'])).quantize(precision) == recibida]
            candidates = coincidentes or matches
            porcentajes = {Decimal(str(t['franchise_percent'])) for t in candidates}
            claves = [(t.get('del_toro_percent'), t['transaction_type']) for t in candidates]
            if len(porcentajes) != 1 or len(claves) != len(set(claves)):
                row['commission_alert'] = 'Tarifa inexistente o ambigua'
            else:
                # Una salida uniforme vale aunque el porcentaje recibido sea nuevo.
                rate = candidates[0]
        if rate is not None:
            try:
                premium = Decimal(str(row['premium_amount']))
                franchise = Decimal(str(rate['franchise_percent']))
                if not all(v.is_finite() for v in (premium, franchise)) or franchise < 0:
                    raise InvalidOperation
                row.update(franchise_percent=franchise,
                           franchise_commission=premium * franchise)
            except (InvalidOperation, ValueError, TypeError, KeyError):
                row['commission_alert'] = 'Prima o porcentajes invalidos'
        result.append(row)
    return result


def consultar_tipos_para_excel(connection, rows, carrier):
    queries = []
    for row in rows:
        if not row.get('policy_number'):
            continue  # Conservar las descripciones de chargebacks.
        row['transaction_type'] = None
        row.pop('transaction_type_source', None)
        if not row.get('office_number'):
            row['type_lookup_error'] = 'Sin oficina para consultar el tipo en Compass'
            continue
        queries.append(dict(request_id=str(row['id']), policy_number=row['policy_number'],
            office_number=str(row['office_number']), office_id=row.get('office_id'), policy_id=row.get('compass_policy_id'),
            effective_date=str(row['policy_effective_date']) if row.get('policy_effective_date') else None,
            carrier=carrier))
    results = {r['request_id']: r for r in obtener_tipos_lote(queries)}
    cursor = connection.cursor()
    try:
        for row in rows:
            if not row.get('policy_number'):
                continue
            result = results.get(str(row['id']))
            if result:
                row['transaction_type'] = result.get('transaction_type')
                row['type_lookup_error'] = result.get('error')
                if not result.get('error'):
                    row['compass_policy_id'] = result['policy_id']
            cursor.execute('UPDATE staging_hub.st_commonwealth_raw SET transaction_type=%s, compass_policy_id=%s'
                           ' WHERE id=%s AND policy_number=%s AND office_id <=> %s',
                           (row['transaction_type'], row.get('compass_policy_id'), row['id'], row['policy_number'], row.get('office_id')))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()


def cargar_comisiones_excel(connection, snapshot, carrier, state=None, business_line=None, *, consultar_tipos=False):
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT r.*, o.state AS state, o.office_number FROM staging_hub.st_commonwealth_raw r'
                       ' LEFT JOIN staging_hub.offices o ON o.office_id = r.office_id'
                       ' WHERE r.file_id=%s AND r.accounting_month=%s ORDER BY r.id',
                       (snapshot['file_id'], snapshot['rows'][0]['accounting_month']))
        rows = cursor.fetchall()
        if not rows:
            raise ValueError('No hay registros guardados para este archivo y mes en Commonwealth raw.')
        cursor.execute('SELECT h.policy_number, h.carrier, h.del_toro_percentage AS del_toro_percent,'
                       ' h.franchise_percentage AS franchise_percent, h.transaction_type, h.franchise, h.state'
                       ' FROM staging_hub.historic_data_commissions h'
                       ' WHERE h.report_month < DATE_ADD(%s, INTERVAL 1 MONTH)'
                       ' AND EXISTS (SELECT 1 FROM staging_hub.st_commonwealth_raw r'
                       ' WHERE r.file_id=%s AND r.accounting_month=%s AND r.policy_number=h.policy_number)'
                       ' ORDER BY h.report_month DESC, h.date DESC',
                       (snapshot['rows'][0]['accounting_month'], snapshot['file_id'],
                        snapshot['rows'][0]['accounting_month']))
        historico = cursor.fetchall()
        polizas_historicas = {str(h['policy_number']).strip() for h in historico
                             if h.get('carrier') == carrier and h.get('franchise_percent') is not None}
        tarifas = []
        if any(r.get('policy_number') and str(r['policy_number']).strip() not in polizas_historicas for r in rows):
            cursor.execute('SELECT state, carrier, transaction_type, business_line, del_toro_percent, franchise_percent'
                           ' FROM staging_hub.commission_rates WHERE carrier=%s', (carrier,))
            tarifas = cursor.fetchall()
        if consultar_tipos:
            consultar_tipos_para_excel(connection, rows, carrier)
        completar_datos_historicos(rows, historico)
        calculadas = calcular_comisiones_raw(rows, tarifas, carrier, state, business_line, historico=historico)
        if carrier == 'COMMONWEALTH':
            from chargebacks_commonwealth import completar_chargebacks
            completar_chargebacks(connection, calculadas)
            for row in calculadas:
                if not row.get('policy_number') and row.get('transaction_type'):
                    # Los chargebacks de COMMONWEALTH son 100% a cargo de la franquicia (no se
                    # reparten), igual que los MVR de THE GENERAL: Del Toro y Franquicia reciben
                    # exactamente lo que entra, sin diferencia. Esto no depende de si la
                    # franquicia se pudo resolver por código (completar_chargebacks arriba); la
                    # fila puede seguir marcada en rojo por falta de franquicia, pero el importe
                    # ya no debe quedar vacío.
                    commission = Decimal(str(row['commission_amount']))
                    row['comm_percent'] = Decimal('1')
                    row['del_toro_commission'] = commission
                    row['franchise_percent'] = Decimal('1')
                    row['franchise_commission'] = commission
                    row['commission_difference'] = Decimal('0')
        return calculadas
    finally:
        cursor.close()

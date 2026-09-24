import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch
from requests import RequestException
from carriers import CARRIERS
from slide import (extraer_tabla_pagina, extraer_filas_archivo, extraer_total_archivo, alertas_lectura,
                   validar, guardar, completar_franquicias, cargar_comisiones_excel, variantes_poliza_slide,
                   _es_formato_displaydoc, extraer_tabla_pagina_displaydoc, _agencia_pagina, _fechas_vigencia)


def fila(**over):
    base = dict(product_code='HM3', state='FL', agency_code='9991859', agency_name='MIAMI LAKES 92 INSURANCE, LLC 9991859',
                policy_number='H3FL000580390', insured_name='HETIAN TOLEDO', eff_exp_date='7/30/2026- 7/30/2027',
                cancel_effective_date='', tran_date='8/7/2026', tran_code='NBUS', collected_premium='3,289.00',
                comm_rate='8.00%', comm_amt='263.12')
    base.update(over)
    return base


def _bloque(texto, x, y, height=0.009):
    return {'text': texto, 'x': x, 'y': y, 'height': height}


def _bloques_pagina_resumen():
    return [
        _bloque('Amount Due Agent / DEL TORO INSURANCE 9990919', 0.512, 0.436, 0.012),
        _bloque(':', 0.641, 0.436, 0.006),
        _bloque('$263.12', 0.851, 0.437, 0.013),
    ]


def _bloques_pagina_tabla():
    """Bloques reales (posiciones) de la pagina de tabla de Slide-Statemnt-1.pdf, para probar
    extraer_tabla_pagina sin depender del archivo en disco."""
    return [
        _bloque('Product', 0.058, 0.173), _bloque('Code', 0.051, 0.187),
        _bloque('State', 0.113, 0.173), _bloque('Agency', 0.155, 0.174, 0.011),
        _bloque('Code', 0.149, 0.187), _bloque('Agency Name', 0.221, 0.174, 0.011),
        _bloque('Policy Number', 0.315, 0.174, 0.011), _bloque("Insured's", 0.379, 0.173),
        _bloque('Name', 0.371, 0.187), _bloque('Eff/Exp', 0.441, 0.174, 0.011),
        _bloque('Date', 0.434, 0.187), _bloque('Cancel', 0.497, 0.173),
        _bloque('Effective Date', 0.514, 0.187), _bloque('Tran Date', 0.594, 0.173),
        _bloque('Tran Code', 0.667, 0.173), _bloque('Collected', 0.738, 0.173),
        _bloque('Premium', 0.74, 0.187), _bloque('Comm', 0.815, 0.173),
        _bloque('Rate', 0.816, 0.187), _bloque('Comm', 0.877, 0.173), _bloque('Amt', 0.877, 0.187),
        _bloque('HM3', 0.048, 0.206, 0.008), _bloque('FL', 0.106, 0.206, 0.008),
        _bloque('9991859', 0.154, 0.206, 0.008), _bloque('MIAMI LAKES 92', 0.224, 0.206, 0.008),
        _bloque('INSURANCE, LLC', 0.225, 0.219, 0.01), _bloque('9991859', 0.205, 0.23, 0.008),
        _bloque('H3FL000580390', 0.312, 0.206, 0.008), _bloque('HETIAN', 0.374, 0.206, 0.008),
        _bloque('TOLEDO', 0.375, 0.218, 0.008), _bloque('7/30/2026-', 0.445, 0.206, 0.008),
        _bloque('7/30/2027', 0.443, 0.218, 0.008), _bloque('8/7/2026', 0.588, 0.206, 0.008),
        _bloque('NBUS', 0.667, 0.206, 0.008), _bloque('3,289.00', 0.74, 0.219, 0.009),
        _bloque('8.00%', 0.815, 0.218, 0.008), _bloque('263.12', 0.877, 0.218, 0.008),
        _bloque('Total for Agency 9990919', 0.724, 0.277, 0.01), _bloque(':', 0.778, 0.277, 0.006),
        _bloque('$3,289.00', 0.827, 0.277, 0.01), _bloque('$263.12', 0.877, 0.276, 0.009),
        _bloque('Total Collected Premium for Statement Period', 0.68, 0.304, 0.008),
        # Mini-tabla resumen al final de la pagina: NO debe confundirse con la tabla principal.
        _bloque('Agency Code', 0.209, 0.414, 0.012), _bloque('Agency Name', 0.287, 0.414, 0.011),
        _bloque('Commission Total', 0.467, 0.413, 0.009),
        _bloque('9991859', 0.192, 0.44, 0.008), _bloque('MIAMI LAKES 92 INSURANCE, LLC', 0.328, 0.441, 0.01),
        _bloque('9991859', 0.271, 0.452, 0.008), _bloque('$263.12', 0.439, 0.44, 0.009),
    ]


def _bloques_pagina_displaydoc():
    """Bloques reales (posiciones) de DisplayDoc.ashx.pdf: encabezado real y 2 filas, la
    segunda con el asegurado partido en dos lineas ('Maribel' / 'Rivera') y la fecha con
    '12:00:00 AM' en su propia linea debajo, como llega el statement de verdad."""
    return [
        _bloque('New/', 0.3973, 0.5134, 0.0121), _bloque('Commission', 0.7116, 0.5134, 0.0121),
        _bloque('Commission', 0.8085, 0.5134, 0.0121), _bloque('Commission', 0.8927, 0.5134, 0.0121),
        _bloque('Insured', 0.1676, 0.5135, 0.0119), _bloque('Change', 0.3288, 0.5150, 0.0153),
        _bloque('Policy Number', 0.0654, 0.5151, 0.0151), _bloque('Policy', 0.2427, 0.5151, 0.0151),
        _bloque('Territory', 0.4795, 0.5151, 0.0151), _bloque('Effective', 0.2517, 0.5317, 0.0121),
        _bloque('Effective', 0.3310, 0.5317, 0.0121), _bloque('Renewal', 0.4068, 0.5318, 0.0119),
        _bloque('Rate', 0.7329, 0.5318, 0.0119), _bloque('Premium', 0.8179, 0.5318, 0.0119),
        _bloque('Payable', 0.9047, 0.5334, 0.0151), _bloque('Collected', 0.8167, 0.5499, 0.0121),
        _bloque('Date', 0.2391, 0.5500, 0.0119), _bloque('Date', 0.3184, 0.5500, 0.0119),
        _bloque('Term', 0.3969, 0.5500, 0.0119),
        _bloque('8/5/2026', 0.2727, 0.5833, 0.0121), _bloque('8/5/2026', 0.3291, 0.5833, 0.0121),
        _bloque('715 - Sarasota - Remainder', 0.5330, 0.5833, 0.0121),
        _bloque('SIC3185569', 0.0590, 0.5833, 0.0121), _bloque('REN', 0.3958, 0.5833, 0.0117),
        _bloque('166.56', 0.9082, 0.5834, 0.0119), _bloque('Juan Vilchez', 0.1820, 0.5834, 0.0119),
        _bloque('8%', 0.7366, 0.5834, 0.0123), _bloque('2,082.00', 0.8184, 0.5844, 0.0141),
        _bloque('12:00:00 AM', 0.2653, 0.6016, 0.0119),
        _bloque('8/10/2026', 0.2693, 0.6264, 0.0121), _bloque('8/10/2026', 0.3326, 0.6264, 0.0121),
        _bloque('REN', 0.3958, 0.6264, 0.0117), _bloque('SIC3438331', 0.0582, 0.6264, 0.0121),
        _bloque('034 - Dade - Remainder', 0.5230, 0.6264, 0.0119), _bloque('396.64', 0.9078, 0.6264, 0.0119),
        _bloque('Maribel', 0.1672, 0.6265, 0.0119), _bloque('8%', 0.7366, 0.6265, 0.0123),
        _bloque('4,958.00', 0.8183, 0.6275, 0.0141), _bloque('12:00:00 AM', 0.2653, 0.6447, 0.0119),
        _bloque('Rivera', 0.1650, 0.6447, 0.0119),
        # Pie de pagina repetido debajo de la ultima fila: no debe colarse en ninguna columna.
        _bloque('Receivable Accounting', 0.8617, 0.98, 0.0151),
        _bloque('4221 W Boy Scout Blvd, Suite 200', 0.8302, 0.985, 0.0153),
        _bloque('Tampa, FL 33607', 0.8778, 0.99, 0.0149),
        _bloque('AUGUST 2026 COMMISSION STATEMENT', 0.4627, 0.995, 0.0121),
    ]


class SlideTests(unittest.TestCase):
    def test_carrier_registered_for_raw_commission_loading(self):
        self.assertEqual(CARRIERS['SLIDE']['table'], 'staging_hub.st_slide_raw')

    def test_extraer_tabla_pagina_ignores_summary_mini_table_at_bottom(self):
        """Regresion: la mini-tabla de resumen al final de la pagina repite 'Agency Code' /
        'Agency Name', que colisionaria con el encabezado real si no se excluye por la
        palabra 'total' que aparece antes de ella."""
        filas = extraer_tabla_pagina(_bloques_pagina_tabla())
        self.assertEqual(len(filas), 1)
        fila_extraida = filas[0]
        self.assertEqual(fila_extraida['agency_code'], '9991859')
        self.assertEqual(fila_extraida['agency_name'], 'MIAMI LAKES 92 INSURANCE, LLC 9991859')
        self.assertEqual(fila_extraida['policy_number'], 'H3FL000580390')
        self.assertEqual(fila_extraida['insured_name'], 'HETIAN TOLEDO')
        self.assertEqual(fila_extraida['eff_exp_date'], '7/30/2026- 7/30/2027')
        self.assertEqual(fila_extraida['tran_date'], '8/7/2026')
        self.assertEqual(fila_extraida['comm_amt'], '263.12')

    def test_extraer_total_archivo_finds_amount_due_agent_on_any_page(self):
        paginas = [{'text': '\n'.join(b['text'] for b in _bloques_pagina_tabla())},
                   {'text': '\n'.join(b['text'] for b in _bloques_pagina_resumen())}]
        self.assertEqual(extraer_total_archivo(paginas), Decimal('263.12'))

    def test_extraer_filas_archivo_merges_rows_across_pages(self):
        paginas = [{'blocks': _bloques_pagina_resumen()}, {'blocks': _bloques_pagina_tabla()}]
        filas = extraer_filas_archivo(paginas)
        self.assertEqual(len(filas), 1)

    def test_es_formato_displaydoc_detects_by_grand_total_phrase(self):
        self.assertFalse(_es_formato_displaydoc([{'text': 'Amount Due Agent: $263.12'}]))
        self.assertTrue(_es_formato_displaydoc([{'text': 'x'}, {'text': 'Grand Total for Agency:\n9990919\n1,916.37'}]))

    def test_agencia_pagina_extracts_sub_number_and_name(self):
        """El Agency Code para franquicia es solo el numero de Sub (igual que el formato de
        tabla existente: numero bare, sin el prefijo del agente principal)."""
        codigo, nombre = _agencia_pagina('Agent 9990919-9990936\nDel Toro Insurance Agency\n42 NW 27 Ave')
        self.assertEqual(codigo, '9990936')
        self.assertEqual(nombre, 'Del Toro Insurance Agency')
        self.assertEqual(_agencia_pagina('nada de esto aplica'), (None, None))

    def test_agencia_pagina_bare_master_without_dash_is_its_own_code(self):
        """Regresion: 'Agent <master>' SIN guion tambien puede traer su propia tabla de
        polizas (no solo el resumen general del archivo); antes se perdia por completo (el
        regex exigia guion) y esas filas quedaban con el codigo de la sub-agencia anterior.
        El codigo master no se adivina con una franquicia fija: se deja tal cual (sin
        registrar), para que completar_franquicias caiga a Compass por poliza, igual que en
        THE GENERAL."""
        codigo, nombre = _agencia_pagina('Agent 9990919\nDel Toro Insurance Agency\n42 NW 27 Ave')
        self.assertEqual(codigo, '9990919')
        self.assertEqual(nombre, 'Del Toro Insurance Agency')

    def test_agencia_pagina_prefers_the_dash_match_over_the_bare_master(self):
        """El resumen general del archivo tambien dice solo 'Agent 9990919' (sin tabla propia);
        si la misma pagina ademas trae un 'Agent <master>-<sub>' real, ese es el que manda."""
        codigo, nombre = _agencia_pagina(
            'Agent 9990919\nDEL TORO INSURANCE\nGrand Total for Agency:\n9990919\n1,916.37\n'
            'Agent 9990919-9990936\nDel Toro Insurance Agency\n42 NW 27 Ave')
        self.assertEqual(codigo, '9990936')
        self.assertEqual(nombre, 'Del Toro Insurance Agency')

    def test_extraer_tabla_pagina_displaydoc_joins_multiline_cells_and_ignores_footer(self):
        """Regresion: el asegurado puede venir partido en dos lineas ('Maribel'/'Rivera') y la
        fecha trae '12:00:00 AM' en su propia linea debajo; ninguna de las dos debe romper el
        agrupado por fila, y el pie de pagina repetido no debe colarse en la ultima columna."""
        filas = extraer_tabla_pagina_displaydoc(_bloques_pagina_displaydoc())
        self.assertEqual(len(filas), 2)
        self.assertEqual(filas[0]['policy_number'], 'SIC3185569')
        self.assertEqual(filas[0]['insured_name'], 'Juan Vilchez')
        self.assertEqual(filas[0]['policy_effective_date'], '8/5/2026')
        self.assertEqual(filas[0]['comm_amt'], '166.56')
        self.assertEqual(filas[1]['policy_number'], 'SIC3438331')
        self.assertEqual(filas[1]['insured_name'], 'Maribel Rivera')
        self.assertEqual(filas[1]['policy_effective_date'], '8/10/2026')
        self.assertEqual(filas[1]['comm_amt'], '396.64')

    def test_extraer_filas_archivo_displaydoc_fills_agency_from_sub_header(self):
        """extraer_filas_archivo detecta el formato DisplayDoc automaticamente y completa
        Agency Code/Name (que no vienen por fila) desde el encabezado de sub-agencia mas
        reciente, ademas de mapear los campos que este formato no trae igual (state fijo en
        FL, sin Cancel Effective Date/Product Code)."""
        texto_pagina = 'Agent 9990919-9990936\nDel Toro Insurance Agency\n' + 'Grand Total for Agency:\n9990919\n1,916.37'
        paginas = [{'text': texto_pagina, 'blocks': _bloques_pagina_displaydoc()}]
        filas = extraer_filas_archivo(paginas)
        self.assertEqual(len(filas), 2)
        for f in filas:
            self.assertEqual(f['agency_code'], '9990936')
            self.assertEqual(f['agency_name'], 'Del Toro Insurance Agency')
            self.assertEqual(f['state'], 'FL')
            self.assertEqual(f['product_code'], '')
            self.assertEqual(f['cancel_effective_date'], '')
            self.assertNotIn('territory', f)
            self.assertNotIn('policy_effective_date', f)
        self.assertEqual(filas[0]['tran_date'], '8/5/2026')
        self.assertEqual(filas[0]['eff_exp_date'], '8/5/2026')
        self.assertEqual(filas[0]['tran_code'], 'REN')

    def test_extraer_total_archivo_finds_grand_total_for_agency(self):
        paginas = [{'text': 'Agent 9990919\nGrand Total for Agency:\n9990919\n1,916.37'}]
        self.assertEqual(extraer_total_archivo(paginas), Decimal('1916.37'))

    def test_validar_matches_total_and_rejects_mismatch(self):
        total = validar([fila()], Decimal('263.12'), '2026-08')
        self.assertEqual(total, Decimal('263.12'))
        with self.assertRaises(ValueError):
            validar([fila()], Decimal('100.00'), '2026-08')
        with self.assertRaises(ValueError):
            validar([fila()], None, '2026-08')

    def test_validar_requires_key_fields(self):
        with self.assertRaises(ValueError):
            validar([fila(policy_number='')], Decimal('263.12'), '2026-08')
        with self.assertRaises(ValueError):
            validar([fila()], Decimal('263.12'), '2026-13')

    def test_alertas_lectura_flags_missing_and_invalid_fields(self):
        alerts = alertas_lectura(fila(insured_name='', comm_rate='abc'))
        self.assertEqual(alerts['insured_name'], 'missing')
        self.assertEqual(alerts['comm_rate'], 'invalid')

    def test_save_inserts_skips_identical_and_updates_changed_row(self):
        """Regresion: guardar() debe resolver la franquicia y persistirla, y no debe
        confundir el estado del statement con el de la franquicia resuelta."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        codigo = [{'code': '9991859', 'franchise': 'DTF0092', 'is_master_code': 0}]
        oficina = [{'office_id': 'abc', 'office_number': '92', 'office_name': 'Miami Lakes 92 Insurance LLC', 'state': 'FL'}]
        with patch('slide.conectar', return_value=connection), \
             patch('slide.compass.obtener_token', side_effect=RequestException('sin red')):
            cursor.fetchall.side_effect = [[], codigo, oficina]
            self.assertEqual(guardar([fila()], '2026-08', 'SLIDE.pdf', b'contenido-slide', 'raw'), (1, 0))
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            self.assertIn('accounting_month', insert.args[0])
            self.assertEqual(insert.args[1][1], 'FL')  # 'state' guardado = el del statement, no sobreescrito
            self.assertEqual(insert.args[1][13], 'DTF0092')  # franchise_number
            saved_payload = insert.args[1][21]

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}]]
            self.assertEqual(guardar([fila()], '2026-08', 'SLIDE.pdf', b'contenido-slide', 'raw'), (0, 0))

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}], codigo, oficina]
            self.assertEqual(guardar([fila(insured_name='OTHER NAME')], '2026-08', 'SLIDE.pdf', b'contenido-slide', 'raw'), (0, 1))
            update = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('UPDATE'))
            self.assertEqual(update.args[1][5], 'OTHER NAME')
            self.assertEqual(update.args[1][-1], 1)

    def test_save_uses_content_hash_as_file_id_not_the_file_name(self):
        """Regresion: el mismo statement subido con otro nombre de archivo debe reconocerse
        como el mismo import (mismo file_id, calculado del contenido), no como uno nuevo."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        codigo = [{'code': '9991859', 'franchise': 'DTF0092', 'is_master_code': 0}]
        oficina = [{'office_id': 'abc', 'office_number': '92', 'office_name': 'Miami Lakes 92 Insurance LLC', 'state': 'FL'}]
        with patch('slide.conectar', return_value=connection), \
             patch('slide.compass.obtener_token', side_effect=RequestException('sin red')):
            cursor.fetchall.side_effect = [[], codigo, oficina]
            guardar([fila()], '2026-08', 'nombre-original.pdf', b'mismo-contenido', 'raw')
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            file_id_guardado = insert.args[1][22]

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': insert.args[1][21]}]]
            # Mismo contenido, nombre de archivo distinto: debe verse como el mismo import.
            self.assertEqual(guardar([fila()], '2026-08', 'nombre-reenviado (1).pdf', b'mismo-contenido', 'raw'), (0, 0))
            select = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('SELECT id'))
            self.assertEqual(select.args[1][0], file_id_guardado)

    def test_save_blocks_when_file_has_fewer_rows_than_saved(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 5, 'source_data': '{}'}]]
        with patch('slide.conectar', return_value=connection), self.assertRaises(ValueError):
            guardar([fila()], '2026-08', 'SLIDE.pdf', b'contenido-slide', 'raw')

    def test_non_master_code_resolves_directly_and_computes_term_length_from_statement(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': 'DTF0092', 'is_master_code': 0}],
            [{'office_id': 'abc', 'office_number': '92', 'office_name': 'Miami Lakes 92 Insurance LLC', 'state': 'FL'}],
        ]
        rows = [dict(agency_code='9991859', policy_number='H3FL000580390', insured_name='X',
                     eff_exp_date='7/30/2026- 7/30/2027')]
        with patch('slide.compass.obtener_token', side_effect=RequestException('sin red')):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0092')
        self.assertEqual(rows[0]['franchise_number_source'], 'codigos')
        self.assertEqual(rows[0]['producer_name'], 'Miami Lakes 92 Insurance LLC')
        self.assertEqual(rows[0]['term_length'], 12)
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_master_code_falls_back_to_compass_by_policy(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'c64e0e16', 'office_number': '149', 'state': 'FL'}],
        ]
        rows = [dict(agency_code='9991859', policy_number='H3FL000580390', insured_name='X', eff_exp_date='')]
        poliza = {'office_id': 'c64e0e16', 'policy_id': 'pid', 'status_id': 'active',
                  'effective_date': '2026-01-01', 'expiration_date': '2027-01-01'}
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=poliza):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0149')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass')
        self.assertEqual(rows[0]['term_length'], 12)  # de Compass, ya que el statement no trajo eff_exp_date
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_policy_found_but_office_unresolvable_falls_back_to_client_name_search(self):
        """Regresion: Compass puede encontrar el registro de la poliza pero con un office_id
        que no corresponde a ninguna oficina nuestra; antes eso caia directo a
        codigo-observado sin pasar por la busqueda visual por nombre, aunque esa SI encuentra
        al cliente correctamente en casos reales (ej. Karina Fraga en Del Toro (120))."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9990936', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'c64e0e16', 'office_number': '120', 'office_name': 'Del Toro Insurance Agency Inc', 'state': 'FL'}],
        ]
        rows = [dict(agency_code='9990936', policy_number='SIC3439529', insured_name='Karina Fraga', eff_exp_date='')]
        poliza = {'office_id': 'oficina-no-reconocida', 'policy_id': 'pid', 'status_id': 'active'}
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=poliza), \
             patch('slide.buscar_franquicias_por_nombre', return_value=[
                 {'request_id': '0', 'offices': [{'office_number': '120'}], 'error': None}]) as buscar:
            completar_franquicias(connection, rows)
        buscar.assert_called_once_with([{'request_id': '0', 'client_name': 'Karina Fraga'}])
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass_visual')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_master_code_falls_back_to_historic_when_compass_has_no_policy(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'xyz', 'office_number': '120', 'state': 'FL'}],
        ]
        rows = [dict(agency_code='9991859', policy_number='H3FL000580390', insured_name='X', eff_exp_date='')]
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=None), \
             patch('slide.buscar_franquicia_historica', return_value='DTF0120'):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'historico')

    def test_policy_not_found_in_compass_nor_historic_falls_back_to_client_name_search(self):
        """Nuevo respaldo: si la poliza no se encuentra ni en Compass ni en el historico, se
        busca por nombre del cliente en Company Search (en lote, no una llamada por fila)
        antes de caer a codigo-observado."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'xyz', 'office_number': '120', 'office_name': 'Del Toro Insurance Agency Inc', 'state': 'FL'}],
        ]
        rows = [dict(agency_code='9991859', policy_number='SIC3442158', insured_name='Amalfi Gonzalez', eff_exp_date='')]
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=None), \
             patch('slide.buscar_franquicia_historica', return_value=None), \
             patch('slide.buscar_franquicias_por_nombre', return_value=[
                 {'request_id': '0', 'offices': [{'office_number': '120'}], 'error': None}]) as buscar:
            completar_franquicias(connection, rows)
        buscar.assert_called_once_with([{'request_id': '0', 'client_name': 'Amalfi Gonzalez'}])
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass_visual')
        self.assertEqual(rows[0]['producer_name'], 'Del Toro Insurance Agency Inc')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_policy_not_found_anywhere_defaults_to_dtf0120_but_keeps_the_alert(self):
        """Si de verdad no se encuentra en ningun lado (ni tabla, ni Compass, ni historico, ni
        busqueda visual, ni codigo observado), se asigna DTF0120 por defecto en vez de dejarla
        sin franquicia -pero la alerta se conserva, para poder auditar que fue un valor por
        defecto y no una resolucion real."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'xyz', 'office_number': '120', 'office_name': 'Del Toro Insurance Agency Inc', 'state': 'FL'}],
            [],
        ]
        rows = [dict(agency_code='9991859', policy_number='SIC0000000', insured_name='Nadie', eff_exp_date='')]
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=None), \
             patch('slide.buscar_franquicia_historica', return_value=None), \
             patch('slide.buscar_franquicias_por_nombre', return_value=[
                 {'request_id': '0', 'offices': [], 'error': 'client_not_found'}]):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'default_master')
        self.assertEqual(rows[0]['producer_name'], 'Del Toro Insurance Agency Inc')
        self.assertTrue(rows[0]['code_lookup_alert'])

    def test_policy_not_found_anywhere_defaults_to_the_registered_master_franchise(self):
        """Una vez que el usuario registre el codigo master de SLIDE en la tabla de codigos con
        su franquicia real (que puede no ser DTF0120), el default debe seguir a ese valor en vez
        de quedar pegado al literal DTF0120 usado mientras SLIDE no tenia codigos registrados."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9990919', 'franchise': '106', 'is_master_code': 1}],
            [{'office_id': 'oficina-106', 'office_number': '106', 'office_name': 'Martiny Martine', 'state': 'FL'}],
            [],
        ]
        rows = [dict(agency_code='9990936', policy_number='SIC0000000', insured_name='Nadie', eff_exp_date='')]
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=None), \
             patch('slide.buscar_franquicia_historica', return_value=None), \
             patch('slide.buscar_franquicias_por_nombre', return_value=[
                 {'request_id': '0', 'offices': [], 'error': 'client_not_found'}]):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0106')
        self.assertEqual(rows[0]['franchise_number_source'], 'default_master')

    def test_unresolved_policy_borrows_franchise_from_same_code_resolved_earlier_in_batch(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'oficina-155', 'office_number': '155', 'state': 'TX'}],
            [],
        ]
        rows = [
            dict(agency_code='9991859', policy_number='P1', insured_name='A', eff_exp_date=''),
            dict(agency_code='9991859', policy_number='P2', insured_name='B', eff_exp_date=''),
        ]
        poliza_resuelta = {'office_id': 'oficina-155', 'policy_id': 'p1', 'status_id': 'active'}
        def buscar_poliza(token, numero):
            return poliza_resuelta if numero == 'P1' else None
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', side_effect=buscar_poliza), \
             patch('slide.buscar_franquicia_historica', return_value=None):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0155')
        self.assertEqual(rows[1]['franchise_number'], 'DTF0155')
        self.assertEqual(rows[1]['franchise_number_source'], 'codigo_observado')
        self.assertIsNone(rows[1]['code_lookup_alert'])

    def test_code_seen_with_conflicting_franchises_defaults_to_dtf0120_but_keeps_the_alert(self):
        """Un codigo de sub-agencia de SLIDE puede cubrir varias franquicias reales (cada
        poliza resuelta por su cuenta contra Compass); si otras filas del lote con el mismo
        codigo ya resolvieron a franquicias distintas, esto ya no es una senal util para
        adivinar, asi que se cae al mismo default DTF0120 que el caso "no se encontro en ningun
        lado" -pero conservando la alerta de conflicto para poder auditarlo."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': '9991859', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'oficina-155', 'office_number': '155', 'state': 'TX'},
             {'office_id': 'oficina-120', 'office_number': '120', 'office_name': 'Del Toro Insurance Agency Inc', 'state': 'FL'}],
            [{'franchise_number': 'DTF0155'}, {'franchise_number': 'DTF0133'}],
        ]
        rows = [dict(agency_code='9991859', policy_number='P9', insured_name='X', eff_exp_date='')]
        with patch('slide.compass.obtener_token', return_value='tok'), \
             patch('slide.compass.buscar_poliza', return_value=None), \
             patch('slide.buscar_franquicia_historica', return_value=None), \
             patch('slide.buscar_franquicias_por_nombre', return_value=[
                 {'request_id': '0', 'offices': [], 'error': 'client_not_found'}]):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'default_master')
        self.assertIn('franquicias distintas', rows[0]['code_lookup_alert'])

    def test_fechas_vigencia_takes_the_effective_date_from_either_format(self):
        """El formato de tabla (Eff/Exp Date) trae un rango 'efectiva- expiracion'; el formato
        DisplayDoc (Policy Effective Date) trae una sola fecha (ya sin '12:00:00 AM', se quita
        al extraer). Ambos deben producir una fecha efectiva utilizable, no None."""
        self.assertEqual(_fechas_vigencia('7/30/2026- 7/30/2027'), (date(2026, 7, 30), date(2027, 7, 30)))
        self.assertEqual(_fechas_vigencia('7/8/2026'), (date(2026, 7, 8), None))
        self.assertEqual(_fechas_vigencia(''), (None, None))
        self.assertEqual(_fechas_vigencia(None), (None, None))

    def test_commission_split_includes_effective_date_for_the_report(self):
        """Regresion: la hoja de Reporte (y Data) mostraba la columna Date/Last Transaction Date
        siempre vacia para SLIDE porque cargar_comisiones_excel nunca traia policy_effective_date
        como effective_date en el SELECT."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = dict(id=1, policy_number='P1', producer_code='9991859', insured_name='A',
                  transaction_type='NBUS', franchise_number='DTF0092', state='FL',
                  premium_amount=Decimal('100'), commission_amount=Decimal('8'),
                  del_toro_percent=Decimal('0.08'), accounting_month=date(2026, 8, 1),
                  effective_date=date(2026, 7, 8))
        cursor.fetchall.side_effect = [[row]]
        snapshot = {'file_id': 'a.pdf', 'rows': [{'accounting_month': date(2026, 8, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        select_sql = cursor.execute.call_args_list[0].args[0]
        self.assertIn('policy_effective_date AS effective_date', select_sql)
        self.assertEqual(result[0]['effective_date'], date(2026, 7, 8))

    def test_policy_number_variants_try_no_suffix_decrement_then_increment(self):
        variantes = variantes_poliza_slide('POL123-01')
        self.assertEqual(variantes[0], 'POL123-01')
        self.assertIn('POL123', variantes)
        self.assertIn('POL123-00', variantes)
        self.assertIn('POL123-02', variantes)

    def test_policy_number_without_suffix_also_tries_adding_one(self):
        """Regresion: el statement puede no traer ningun sufijo de edicion pero Compass si
        (ej. 'SIC3442158' en el statement esta como 'SIC3442158-00' en Compass); antes se
        devolvia solo el numero tal cual y nunca se probaba con sufijo agregado."""
        variantes = variantes_poliza_slide('SIC3442158')
        self.assertEqual(variantes[0], 'SIC3442158')
        self.assertIn('SIC3442158-00', variantes)
        self.assertIn('SIC3442158-0', variantes)

    def test_commission_split_gives_franchise_the_same_percent_slide_reported(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = dict(id=1, policy_number='H3FL000580390', producer_code='9991859', insured_name='X',
                   transaction_type='NBUS', franchise_number='DTF0092', state='FL',
                   premium_amount=Decimal('3289.00'), commission_amount=Decimal('263.12'),
                   del_toro_percent=Decimal('0.0800'), accounting_month=date(2026, 8, 1))
        cursor.fetchall.side_effect = [[row]]
        snapshot = {'file_id': 'SLIDE.pdf', 'rows': [{'accounting_month': date(2026, 8, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertIsNone(result[0]['commission_alert'])
        self.assertEqual(result[0]['franchise_percent'], Decimal('0.0800'))
        self.assertEqual(result[0]['franchise_commission'], Decimal('263.12'))

    def test_commission_split_without_file_id_combines_every_file_for_the_month(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row_a = dict(id=1, policy_number='P1', producer_code='9991859', insured_name='A',
                     transaction_type='NBUS', franchise_number='DTF0092', state='FL',
                     premium_amount=Decimal('3289.00'), commission_amount=Decimal('263.12'),
                     del_toro_percent=Decimal('0.08'), accounting_month=date(2026, 8, 1))
        row_b = dict(id=2, policy_number='P2', producer_code='9991584', insured_name='B',
                     transaction_type='NBUS', franchise_number='DTF0095', state='FL',
                     premium_amount=Decimal('654.00'), commission_amount=Decimal('52.32'),
                     del_toro_percent=Decimal('0.08'), accounting_month=date(2026, 8, 1))
        cursor.fetchall.side_effect = [[row_a, row_b]]
        snapshot = {'file_id': None, 'rows': [{'accounting_month': date(2026, 8, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        select_sql = cursor.execute.call_args_list[0].args[0]
        self.assertNotIn('file_id', select_sql)
        self.assertEqual(len(result), 2)
        self.assertEqual({r['policy_number'] for r in result}, {'P1', 'P2'})


if __name__ == '__main__':
    unittest.main()

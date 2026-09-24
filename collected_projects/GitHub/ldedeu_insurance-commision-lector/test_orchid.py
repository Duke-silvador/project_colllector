import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch
from requests import RequestException
from carriers import CARRIERS
from orchid import (extraer_tabla_pagina, alertas_lectura, validar, guardar, completar_franquicias,
                    cargar_comisiones_excel, variantes_poliza_orchid)


def fila(**over):
    base = dict(status='Paid', agency_number='AGY9416', ext_agency_number='', transaction_type='Renew',
                effective_date='08/28/2026', customer_name='Dianelys Lopez',
                policy_number='2OUAFL042S0351967-01', invoice_number='85141021',
                premium='$3,769.00', comm_percent='10%', comm_amount='$376.90')
    base.update(over)
    return base


def _bloque(texto, x, y, height=0.012):
    return {'text': texto, 'x': x, 'y': y, 'height': height}


def _pagina_real():
    """Bloques reales (posiciones) extraidos del PDF de muestra de ORCHID, para probar
    extraer_tabla_pagina sin depender del archivo en disco."""
    return [
        _bloque('Direct', 0.335, 0.068), _bloque('Bill', 0.396, 0.068),
        _bloque('Commission', 0.497, 0.068), _bloque('Statement', 0.639, 0.068),
        _bloque('Status', 0.032, 0.455), _bloque('Agency #', 0.086, 0.463),
        _bloque('Ext. Agy #', 0.180, 0.464), _bloque('Transaction', 0.247, 0.455),
        _bloque('Type', 0.247, 0.475), _bloque('Effective', 0.319, 0.455),
        _bloque('Date', 0.320, 0.473), _bloque('Customer', 0.420, 0.455),
        _bloque('Name', 0.421, 0.473), _bloque('Policy #', 0.563, 0.456),
        _bloque('Invoice #', 0.684, 0.455), _bloque('Premium', 0.772, 0.455),
        _bloque('Comm %', 0.848, 0.464), _bloque('Comm Amt', 0.922, 0.464),
        _bloque('Owed', 0.034, 0.499), _bloque('AGY9416', 0.086, 0.499),
        _bloque('Cancel', 0.247, 0.499), _bloque('08/28/2026', 0.312, 0.499),
        _bloque('Dianelys Lopez', 0.400, 0.497), _bloque('2OUAFL042S0351967-01', 0.543, 0.499),
        _bloque('85156691', 0.686, 0.499), _bloque('($3,769.00)', 0.766, 0.497),
        _bloque('10%', 0.851, 0.499), _bloque('($376.90)', 0.919, 0.497),
        _bloque('Paid', 0.035, 0.529), _bloque('AGY9416', 0.086, 0.529),
        _bloque('Renew', 0.248, 0.529), _bloque('08/28/2026', 0.312, 0.529),
        _bloque('Dianelys Lopez', 0.400, 0.527), _bloque('2OUAFL042S0351967-01', 0.543, 0.529),
        _bloque('85141021', 0.686, 0.529), _bloque('$3,769.00', 0.767, 0.532),
        _bloque('10%', 0.851, 0.530), _bloque('$376.90', 0.921, 0.532),
        _bloque('Paid', 0.035, 0.558), _bloque('AGY9416', 0.086, 0.558),
        _bloque('New', 0.246, 0.558), _bloque('08/26/2026', 0.312, 0.558),
        _bloque('JASIEL CASTILLO', 0.400, 0.558), _bloque('TSOH-FL-0011380-00', 0.543, 0.558),
        _bloque('85155065', 0.686, 0.558), _bloque('$4,475.00', 0.767, 0.561),
        _bloque('10%', 0.851, 0.559), _bloque('$447.50', 0.921, 0.561),
        _bloque('PLEASE', 0.463, 0.792), _bloque('NOTE', 0.523, 0.792),
        _bloque('Direct', 0.058, 0.837), _bloque('Bill', 0.083, 0.837),
        _bloque('Underwriters', 0.222, 0.856), _bloque('Agency,', 0.286, 0.859),
        _bloque('LLC', 0.325, 0.856),
    ]


class OrchidTests(unittest.TestCase):
    def test_carrier_registered_for_raw_commission_loading(self):
        self.assertEqual(CARRIERS['ORCHID']['table'], 'staging_hub.st_orchid_raw')

    def test_extraer_tabla_pagina_reads_real_layout_without_confusing_agency_values_with_headers(self):
        """Regresion: 'AGY9416' normaliza a 'agy', que colisiona con la palabra clave del
        encabezado 'Ext. Agy #'; y 'Agency,' en el pie de pagina colisiona con 'Agency #'.
        Ninguna de las dos debe romper la deteccion de encabezados."""
        filas = extraer_tabla_pagina(_pagina_real())
        self.assertEqual(len(filas), 3)
        self.assertEqual(filas[0]['status'], 'Owed')
        self.assertEqual(filas[0]['agency_number'], 'AGY9416')
        self.assertEqual(filas[0]['ext_agency_number'], '')
        self.assertEqual(filas[0]['transaction_type'], 'Cancel')
        self.assertEqual(filas[0]['policy_number'], '2OUAFL042S0351967-01')
        self.assertEqual(filas[0]['invoice_number'], '85156691')
        self.assertEqual(filas[0]['comm_amount'], '($376.90)')
        self.assertEqual(filas[2]['customer_name'], 'JASIEL CASTILLO')
        self.assertEqual(filas[2]['policy_number'], 'TSOH-FL-0011380-00')
        self.assertEqual(filas[2]['comm_amount'], '$447.50')

    def test_validar_accepts_real_rows_and_rejects_missing_fields(self):
        filas = extraer_tabla_pagina(_pagina_real())
        validar(filas, '2026-09')  # no debe lanzar
        with self.assertRaises(ValueError):
            validar([fila(policy_number='')], '2026-09')
        with self.assertRaises(ValueError):
            validar([fila()], '2026-13')

    def test_alertas_lectura_flags_missing_and_invalid_fields(self):
        alerts = alertas_lectura(fila(customer_name='', comm_percent='abc'))
        self.assertEqual(alerts['customer_name'], 'missing')
        self.assertEqual(alerts['comm_percent'], 'invalid')

    def test_save_inserts_skips_identical_and_updates_changed_row(self):
        """Regresion: guardar() debe resolver la franquicia (via completar_franquicias) y
        persistirla, no solo guardar la fila del statement en blanco."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        codigo = [{'code': 'AGY9416', 'franchise': 'DTF0117', 'is_master_code': 0}]
        oficina = [{'office_id': 'abc', 'office_number': '117', 'state': 'FL'}]
        with patch('orchid.conectar', return_value=connection), \
             patch('orchid.compass.obtener_token', side_effect=RequestException('sin red')):
            cursor.fetchall.side_effect = [[], codigo, oficina]
            self.assertEqual(guardar([fila()], '2026-09', 'ORCHID.pdf', b'contenido-orchid', 1, 'raw'), (1, 0))
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            self.assertIn('accounting_month', insert.args[0])
            self.assertEqual(insert.args[1][11], 'DTF0117')  # franchise_number resuelto por codigo
            saved_payload = insert.args[1][19]

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}]]
            self.assertEqual(guardar([fila()], '2026-09', 'ORCHID.pdf', b'contenido-orchid', 1, 'raw'), (0, 0))

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}], codigo, oficina]
            self.assertEqual(guardar([fila(customer_name='OTHER NAME')], '2026-09', 'ORCHID.pdf', b'contenido-orchid', 1, 'raw'), (0, 1))
            update = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('UPDATE'))
            self.assertEqual(update.args[1][5], 'OTHER NAME')
            self.assertEqual(update.args[1][-1], 1)

    def test_save_uses_content_hash_as_file_id_not_the_file_name(self):
        """Regresion: el mismo statement subido con otro nombre de archivo debe reconocerse
        como el mismo import (mismo file_id, calculado del contenido), no como uno nuevo."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        codigo = [{'code': 'AGY9416', 'franchise': 'DTF0117', 'is_master_code': 0}]
        oficina = [{'office_id': 'abc', 'office_number': '117', 'state': 'FL'}]
        with patch('orchid.conectar', return_value=connection), \
             patch('orchid.compass.obtener_token', side_effect=RequestException('sin red')):
            cursor.fetchall.side_effect = [[], codigo, oficina]
            guardar([fila()], '2026-09', 'nombre-original.pdf', b'mismo-contenido', 1, 'raw')
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            file_id_guardado = insert.args[1][20]

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': insert.args[1][19]}]]
            self.assertEqual(guardar([fila()], '2026-09', 'nombre-reenviado (1).pdf', b'mismo-contenido', 1, 'raw'), (0, 0))
            select = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('SELECT id'))
            self.assertEqual(select.args[1][0], file_id_guardado)

    def test_save_blocks_when_file_has_fewer_rows_than_saved(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 5, 'source_data': '{}'}]]
        with patch('orchid.conectar', return_value=connection), self.assertRaises(ValueError):
            guardar([fila()], '2026-09', 'ORCHID.pdf', b'contenido-orchid', 1, 'raw')

    def test_non_master_code_resolves_directly_from_codes_table(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': 'DTF0117', 'is_master_code': 0}],
            [{'office_id': 'abc', 'office_number': '117', 'office_name': 'Del Toro Insurance Agency Inc', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='2OUAFL042S0351967-01', customer_name='X')]
        with patch('orchid.compass.obtener_token', side_effect=RequestException('sin red')):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0117')
        self.assertEqual(rows[0]['franchise_number_source'], 'codigos')
        self.assertEqual(rows[0]['state'], 'FL')
        self.assertEqual(rows[0]['producer_name'], 'Del Toro Insurance Agency Inc')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_code_resolved_directly_still_consults_compass_for_policy_status(self):
        """Aunque la franquicia se resuelve por codigo (sin necesitar Compass), igual se
        consulta la poliza para completar compass_policy_id/policy_status."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': 'DTF0117', 'is_master_code': 0}],
            [{'office_id': 'abc', 'office_number': '117', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='TSOH-FL-0011380-00', customer_name='X')]
        poliza = {'office_id': 'abc', 'policy_id': 'pid-1', 'status_id': 'active'}
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=poliza) as buscar_poliza:
            completar_franquicias(connection, rows)
        buscar_poliza.assert_called_once_with('tok', 'TSOH-FL-0011380-00')
        self.assertEqual(rows[0]['franchise_number'], 'DTF0117')
        self.assertEqual(rows[0]['franchise_number_source'], 'codigos')
        self.assertEqual(rows[0]['compass_policy_id'], 'pid-1')
        self.assertEqual(rows[0]['policy_status'], 'active')

    def test_master_code_falls_back_to_compass_by_policy(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'c64e0e16', 'office_number': '149', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='TSOH-FL-0011380-00', customer_name='X')]
        poliza = {'office_id': 'c64e0e16', 'policy_id': 'pid', 'status_id': 'active',
                  'effective_date': '2026-01-15', 'expiration_date': '2027-01-15'}
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=poliza):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0149')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass')
        self.assertIsNone(rows[0]['code_lookup_alert'])
        self.assertEqual(rows[0]['term_length'], 12)

    def test_code_resolved_directly_still_computes_term_length_from_compass_dates(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': 'DTF0117', 'is_master_code': 0}],
            [{'office_id': 'abc', 'office_number': '117', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='TSOH-FL-0011380-00', customer_name='X')]
        poliza = {'office_id': 'abc', 'policy_id': 'pid-1', 'status_id': 'active',
                  'effective_date': '2026-03-01', 'expiration_date': '2026-09-01'}
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=poliza):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number_source'], 'codigos')
        self.assertEqual(rows[0]['term_length'], 6)

    def test_code_missing_from_table_falls_back_to_compass(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [[], [{'office_id': 'c64e0e16', 'office_number': '149', 'state': 'FL'}]]
        rows = [dict(agency_number='AGY0000', policy_number='TSOH-FL-0011380-00', customer_name='X')]
        poliza = {'office_id': 'c64e0e16', 'policy_id': 'pid', 'status_id': 'active'}
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=poliza):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0149')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass')

    def test_unresolved_policy_borrows_franchise_from_same_code_resolved_earlier_in_batch(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'oficina-155', 'office_number': '155', 'state': 'TX'}],
            [],  # _franquicias_vistas: nada guardado antes en la base
        ]
        rows = [
            dict(agency_number='AGY9416', policy_number='P1', customer_name='A'),
            dict(agency_number='AGY9416', policy_number='P2', customer_name='B'),
        ]
        poliza_resuelta = {'office_id': 'oficina-155', 'policy_id': 'p1', 'status_id': 'active'}
        def buscar_poliza(token, numero):
            return poliza_resuelta if numero == 'P1' else None
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', side_effect=buscar_poliza), \
             patch('orchid.buscar_franquicia_historica', return_value=None):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0155')
        self.assertEqual(rows[1]['franchise_number'], 'DTF0155')
        self.assertEqual(rows[1]['franchise_number_source'], 'codigo_observado')
        self.assertIsNone(rows[1]['code_lookup_alert'])

    def test_code_seen_with_conflicting_franchises_is_flagged_not_guessed(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'oficina-155', 'office_number': '155', 'state': 'TX'}],
            [{'franchise_number': 'DTF0155'}, {'franchise_number': 'DTF0133'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='P9', customer_name='X')]
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=None), \
             patch('orchid.buscar_franquicia_historica', return_value=None):
            completar_franquicias(connection, rows)
        self.assertIsNone(rows[0]['franchise_number'])
        self.assertIn('franquicias distintas', rows[0]['code_lookup_alert'])

    def test_master_code_falls_back_to_historic_when_compass_has_no_policy(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'xyz', 'office_number': '120', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='TSOH-FL-0011380-00', customer_name='X')]
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=None), \
             patch('orchid.buscar_franquicia_historica', return_value='DTF0120'):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'historico')

    def test_policy_number_variants_try_no_suffix_decrement_then_increment(self):
        variantes = variantes_poliza_orchid('2OUAFL042S0351967-01')
        self.assertEqual(variantes[0], '2OUAFL042S0351967-01')
        self.assertIn('2OUAFL042S0351967', variantes)
        self.assertIn('2OUAFL042S0351967-00', variantes)
        self.assertIn('2OUAFL042S0351967-02', variantes)
        self.assertLess(variantes.index('2OUAFL042S0351967-00'), variantes.index('2OUAFL042S0351967-02'))
        self.assertEqual(len(variantes), len(set(variantes)))

    def test_master_code_tries_variants_in_order_and_stops_at_first_compass_match(self):
        """Ejemplo real: el statement trae 2OUAFL042S0351967-01, pero en Compass esta como
        2OUAFL042S0351967-00 (offset de edicion distinto). Debe encontrarla sin historico."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': '54d735b4', 'office_number': '106', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='2OUAFL042S0351967-01', customer_name='X')]
        poliza = {'office_id': '54d735b4', 'policy_id': 'p1', 'status_id': 'active'}
        intentos = []
        def buscar_poliza(token, numero):
            intentos.append(numero)
            return poliza if numero == '2OUAFL042S0351967-00' else None
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', side_effect=buscar_poliza):
            completar_franquicias(connection, rows)
        self.assertEqual(intentos, variantes_poliza_orchid('2OUAFL042S0351967-01')[:len(intentos)])
        self.assertEqual(rows[0]['franchise_number'], 'DTF0106')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_historic_fallback_also_tries_variants(self):
        """Si Compass no la encuentra con ninguna variante, el historico tambien prueba
        variantes (no solo el numero tal cual del statement)."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'code': 'AGY9416', 'franchise': '', 'is_master_code': 1}],
            [{'office_id': 'xyz', 'office_number': '120', 'state': 'FL'}],
        ]
        rows = [dict(agency_number='AGY9416', policy_number='2OUAFL042S0351967-01', customer_name='X')]
        def buscar_franquicia_historica(connection, numero):
            return 'DTF0120' if numero == '2OUAFL042S0351967-00' else None
        with patch('orchid.compass.obtener_token', return_value='tok'), \
             patch('orchid.compass.buscar_poliza', return_value=None), \
             patch('orchid.buscar_franquicia_historica', side_effect=buscar_franquicia_historica):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'historico')

    def test_commission_split_gives_franchise_the_same_percent_orchid_reported(self):
        """ORCHID no usa tabla de tarifas: lo que entra es lo que sale, sin importar el %
        (no hace falta configurar un commission_rates por cada porcentaje que aparezca)."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = dict(id=1, policy_number='2OUAFL042S0351967-01', producer_code='AGY9416', customer_name='X',
                   transaction_type='Renew', franchise_number='DTF0117', state='FL',
                   premium_amount=Decimal('3769.00'), commission_amount=Decimal('376.90'),
                   del_toro_percent=Decimal('0.1000'), accounting_month=date(2026, 9, 1))
        cursor.fetchall.side_effect = [[row]]
        snapshot = {'file_id': 'ORCHID.pdf', 'rows': [{'accounting_month': date(2026, 9, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertIsNone(result[0]['commission_alert'])
        self.assertEqual(result[0]['franchise_percent'], Decimal('0.1000'))
        self.assertEqual(result[0]['franchise_commission'], Decimal('376.90'))
        select_sql = cursor.execute.call_args_list[0].args[0]
        self.assertIn('customer_name AS insured_name', select_sql)

    def test_commission_split_flags_unresolved_franchise_but_still_computes_del_toro(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = dict(id=1, policy_number='P1', producer_code='AGY0000', agency_number='AGY0000', customer_name='X',
                   transaction_type='New', franchise_number=None, state=None,
                   premium_amount=Decimal('1000.00'), commission_amount=Decimal('100.00'),
                   del_toro_percent=Decimal('0.10'), accounting_month=date(2026, 9, 1))
        cursor.fetchall.side_effect = [[row]]
        snapshot = {'file_id': 'ORCHID.pdf', 'rows': [{'accounting_month': date(2026, 9, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertIn('AGY0000', result[0]['commission_alert'])
        self.assertEqual(result[0]['franchise_percent'], Decimal('0.10'))

    def test_commission_split_without_file_id_combines_every_file_for_the_month(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row_a = dict(id=1, policy_number='P1', producer_code='AGY9416', customer_name='A',
                     transaction_type='Renew', franchise_number='DTF0117', state='FL',
                     premium_amount=Decimal('3769.00'), commission_amount=Decimal('376.90'),
                     del_toro_percent=Decimal('0.10'), accounting_month=date(2026, 9, 1))
        row_b = dict(id=2, policy_number='P2', producer_code='AGY9416', customer_name='B',
                     transaction_type='New', franchise_number='DTF0117', state='FL',
                     premium_amount=Decimal('4475.00'), commission_amount=Decimal('447.50'),
                     del_toro_percent=Decimal('0.10'), accounting_month=date(2026, 9, 1))
        cursor.fetchall.side_effect = [[row_a, row_b]]
        snapshot = {'file_id': None, 'rows': [{'accounting_month': date(2026, 9, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        select_sql = cursor.execute.call_args_list[0].args[0]
        self.assertNotIn('file_id', select_sql)
        self.assertEqual(len(result), 2)
        self.assertEqual({r['policy_number'] for r in result}, {'P1', 'P2'})
        self.assertEqual({r['franchise_percent'] for r in result}, {Decimal('0.10')})


if __name__ == '__main__':
    unittest.main()

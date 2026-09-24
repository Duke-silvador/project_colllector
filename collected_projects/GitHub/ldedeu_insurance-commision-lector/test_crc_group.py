import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch
from requests import RequestException
from carriers import CARRIERS
from crc_group import (extraer_cabecera_pagina, extraer_tabla_pagina, alertas_lectura, validar,
                       guardar, completar_franquicias, cargar_comisiones_excel)


def fila(**over):
    base = dict(invoice_number='8069837', invoice_type='REN', invoice_date='8/19/2026',
                policy_number='NPP6332040', effective_date='8/19/2026', insured_name='LX Liquors Corp',
                gross_premium='$2,439.00', comm_percent='10.00', gross_commission='$243.90',
                commission_amount='$243.90')
    base.update(over)
    return base


def cabecera(**over):
    base = dict(vendor_name='SAMY INSURANCE, INC', crc_id='00CRP01171', check_number='0002273582',
                check_date='8/28/2026', check_amount='$243.90')
    base.update(over)
    return base


class CrcGroupTests(unittest.TestCase):
    def test_carrier_registered_for_raw_commission_loading(self):
        self.assertEqual(CARRIERS['CRC GROUP']['table'], 'staging_hub.st_crc_group_raw')

    def test_check_amount_strips_leading_asterisks(self):
        """Regresion: el importe impreso del cheque llega como '***$243.90' (asteriscos de
        seguridad del formulario); importe() no tolera '*' y antes esto rompia validar/guardar."""
        blocks = [
            {'text': 'CheckNo', 'x': 0.10, 'y': 0.55, 'height': 0.02},
            {'text': '0002273582', 'x': 0.10, 'y': 0.58, 'height': 0.02},
            {'text': 'Date', 'x': 0.40, 'y': 0.55, 'height': 0.02},
            {'text': '8/28/2026', 'x': 0.40, 'y': 0.58, 'height': 0.02},
            {'text': 'Amount', 'x': 0.70, 'y': 0.55, 'height': 0.02},
            {'text': '***$243.90', 'x': 0.70, 'y': 0.58, 'height': 0.02},
            {'text': 'DATE: 08/28/2026', 'x': 0.10, 'y': 0.02, 'height': 0.02},
            {'text': 'VENDOR NAME: SAMY INSURANCE, INC', 'x': 0.10, 'y': 0.04, 'height': 0.02},
            {'text': 'CRC ID: 00CRP01171', 'x': 0.10, 'y': 0.06, 'height': 0.02},
        ]
        resultado = extraer_cabecera_pagina(blocks)
        self.assertEqual(resultado['check_amount'], '$243.90')
        self.assertEqual(resultado['check_number'], '0002273582')
        self.assertEqual(resultado['vendor_name'], 'SAMY INSURANCE, INC')
        self.assertEqual(resultado['crc_id'], '00CRP01171')

    def test_validar_matches_check_total_and_rejects_mismatch(self):
        total = validar([fila()], cabecera(), '2026-08')
        self.assertEqual(total, Decimal('243.90'))
        with self.assertRaises(ValueError):
            validar([fila(commission_amount='$100.00')], cabecera(), '2026-08')

    def test_validar_requires_vendor_name_and_check_number(self):
        with self.assertRaises(ValueError):
            validar([fila()], cabecera(vendor_name=''), '2026-08')
        with self.assertRaises(ValueError):
            validar([fila()], cabecera(check_number=''), '2026-08')

    def test_validar_rejects_invalid_month(self):
        with self.assertRaises(ValueError):
            validar([fila()], cabecera(), '2026-13')

    def test_save_inserts_skips_identical_and_updates_changed_row(self):
        """Regresion: guardar() debe resolver la franquicia (via completar_franquicias) y
        persistirla, no solo guardar la fila del statement en blanco."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        oficina = [{'office_id': 'abc', 'office_number': '3', 'state': 'FL', 'franchise_alias': None,
                    'office_name': 'Samy Insurance Inc.'}]
        with patch('crc_group.conectar', return_value=connection), \
             patch('crc_group.compass.obtener_token', side_effect=RequestException('sin red')):
            cab = cabecera()
            cursor.fetchall.side_effect = [[], oficina]
            self.assertEqual(guardar([fila()], cab, '2026-08', 'CRC-Statement.pdf', b'contenido-crc', 1, 'raw'), (1, 0))
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            self.assertIn('accounting_month', insert.args[0])
            self.assertEqual(insert.args[1][15], 'DTF0003')  # franchise_number resuelto por offices
            saved_payload = insert.args[1][21]

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}]]
            self.assertEqual(guardar([fila()], cab, '2026-08', 'CRC-Statement.pdf', b'contenido-crc', 1, 'raw'), (0, 0))

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}], oficina]
            changed_rows = [fila(insured_name='OTHER NAME')]
            self.assertEqual(guardar(changed_rows, cab, '2026-08', 'CRC-Statement.pdf', b'contenido-crc', 1, 'raw'), (0, 1))
            update = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('UPDATE'))
            self.assertEqual(update.args[1][7], 'OTHER NAME')
            self.assertEqual(update.args[1][-1], 1)

    def test_save_blocks_when_file_has_fewer_rows_than_saved(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 5, 'source_data': '{}'}]]
        with patch('crc_group.conectar', return_value=connection), self.assertRaises(ValueError):
            guardar([fila()], cabecera(), '2026-08', 'CRC-Statement.pdf', b'contenido-crc', 1, 'raw')

    def test_save_uses_content_hash_as_file_id_not_the_file_name(self):
        """Regresion: el mismo statement subido con otro nombre de archivo debe reconocerse
        como el mismo import (mismo file_id, calculado del contenido), no como uno nuevo."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        oficina = [{'office_id': 'abc', 'office_number': '3', 'state': 'FL', 'franchise_alias': None,
                    'office_name': 'Samy Insurance Inc.'}]
        with patch('crc_group.conectar', return_value=connection), \
             patch('crc_group.compass.obtener_token', side_effect=RequestException('sin red')):
            cab = cabecera()
            cursor.fetchall.side_effect = [[], oficina]
            guardar([fila()], cab, '2026-08', 'nombre-original.pdf', b'mismo-contenido', 1, 'raw')
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            file_id_guardado = insert.args[1][22]
            saved_payload = insert.args[1][21]

            cursor.execute.reset_mock()
            cursor.fetchall.side_effect = [[{'id': 1, 'source_row': 1, 'source_data': saved_payload}]]
            self.assertEqual(
                guardar([fila()], cab, '2026-08', 'nombre-reenviado (1).pdf', b'mismo-contenido', 1, 'raw'),
                (0, 0))
            select = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('SELECT id'))
            self.assertEqual(select.args[1][0], file_id_guardado)

    def test_vendor_name_resolves_directly_from_offices_by_name(self):
        """Vendor Name -> office_name en offices, comparacion normalizada (sin puntuacion ni
        mayusculas): 'SAMY INSURANCE, INC' debe encontrar 'Samy Insurance Inc.'"""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'office_id': 'abc', 'office_number': '3', 'state': 'FL', 'franchise_alias': None,
             'office_name': 'Samy Insurance Inc.'},
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='NPP6332040', insured_name='X')]
        with patch('crc_group.compass.obtener_token', side_effect=RequestException('sin red')):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0003')
        self.assertEqual(rows[0]['franchise_number_source'], 'offices')
        self.assertEqual(rows[0]['office_id'], 'abc')
        self.assertEqual(rows[0]['state'], 'FL')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_vendor_name_resolved_by_offices_still_consults_compass_for_policy_status(self):
        """Regresion: aunque la franquicia ya se resuelve por offices (sin necesitar Compass),
        igual se consulta la poliza en Compass para completar compass_policy_id/policy_status;
        de lo contrario esas columnas quedan siempre vacias en el Excel."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'office_id': 'abc', 'office_number': '3', 'state': 'FL', 'franchise_alias': None,
             'office_name': 'Samy Insurance Inc.'},
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='NPP6332040', insured_name='X')]
        poliza = {'office_id': 'abc', 'policy_id': 'pid-1', 'status_id': 'active'}
        with patch('crc_group.compass.obtener_token', return_value='tok'), \
             patch('crc_group.compass.buscar_poliza', return_value=poliza) as buscar_poliza:
            completar_franquicias(connection, rows)
        buscar_poliza.assert_called_once_with('tok', 'NPP6332040')
        self.assertEqual(rows[0]['franchise_number'], 'DTF0003')
        self.assertEqual(rows[0]['franchise_number_source'], 'offices')
        self.assertEqual(rows[0]['compass_policy_id'], 'pid-1')
        self.assertEqual(rows[0]['policy_status'], 'active')

    def test_vendor_name_not_in_offices_falls_back_to_compass_by_policy(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'office_id': 'c64e0e16', 'office_number': '149', 'state': 'FL', 'franchise_alias': None,
             'office_name': 'Some Other Agency LLC'},
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='NPP6332040', insured_name='X')]
        poliza = {'office_id': 'c64e0e16', 'policy_id': 'pid', 'status_id': 'active'}
        with patch('crc_group.compass.obtener_token', return_value='tok'), \
             patch('crc_group.compass.buscar_poliza', return_value=poliza):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0149')
        self.assertEqual(rows[0]['franchise_number_source'], 'compass')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_unresolved_vendor_borrows_franchise_from_same_vendor_resolved_earlier_in_batch(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'office_id': 'oficina-155', 'office_number': '155', 'state': 'TX', 'franchise_alias': None,
              'office_name': 'Unrelated Agency'}],
            [],  # _franquicias_vistas: nada guardado antes en la base
        ]
        rows = [
            dict(vendor_name='SAMY INSURANCE, INC', policy_number='P1', insured_name='A'),
            dict(vendor_name='SAMY INSURANCE, INC', policy_number='P2', insured_name='B'),
        ]
        poliza_resuelta = {'office_id': 'oficina-155', 'policy_id': 'p1', 'status_id': 'active'}
        def buscar_poliza(token, numero):
            return poliza_resuelta if numero == 'P1' else None
        with patch('crc_group.compass.obtener_token', return_value='tok'), \
             patch('crc_group.compass.buscar_poliza', side_effect=buscar_poliza), \
             patch('crc_group.buscar_franquicia_historica', return_value=None):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0155')
        self.assertEqual(rows[1]['franchise_number'], 'DTF0155')
        self.assertEqual(rows[1]['franchise_number_source'], 'codigo_observado')
        self.assertIsNone(rows[1]['code_lookup_alert'])

    def test_vendor_seen_with_conflicting_franchises_is_flagged_not_guessed(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'office_id': 'oficina-155', 'office_number': '155', 'state': 'TX', 'franchise_alias': None,
              'office_name': 'Unrelated Agency'}],
            [{'franchise_number': 'DTF0155'}, {'franchise_number': 'DTF0133'}],
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='P9', insured_name='X')]
        with patch('crc_group.compass.obtener_token', return_value='tok'), \
             patch('crc_group.compass.buscar_poliza', return_value=None), \
             patch('crc_group.buscar_franquicia_historica', return_value=None):
            completar_franquicias(connection, rows)
        self.assertIsNone(rows[0]['franchise_number'])
        self.assertIn('franquicias distintas', rows[0]['code_lookup_alert'])
        self.assertIn('DTF0133', rows[0]['code_lookup_alert'])
        self.assertIn('DTF0155', rows[0]['code_lookup_alert'])

    def test_vendor_not_in_offices_without_policy_is_alerted_without_calling_compass(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [[], []]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='', insured_name='X')]
        with patch('crc_group.compass.obtener_token') as token:
            completar_franquicias(connection, rows)
            token.assert_not_called()
        self.assertIn('sin poliza para consultar Compass', rows[0]['code_lookup_alert'])

    def test_vendor_name_matching_multiple_offices_is_flagged_not_guessed(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [{'office_id': 'a', 'office_number': '3', 'state': 'FL', 'franchise_alias': None, 'office_name': 'Samy Insurance Inc.'},
             {'office_id': 'b', 'office_number': '172', 'state': 'FL', 'franchise_alias': None, 'office_name': 'Samy Insurance Inc'}],
            [],  # _franquicias_vistas
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='', insured_name='X')]
        completar_franquicias(connection, rows)
        self.assertIsNone(rows[0]['franchise_number'])
        self.assertIn('varias oficinas', rows[0]['code_lookup_alert'])

    def test_falls_back_to_historic_when_compass_has_no_policy(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'office_id': 'xyz', 'office_number': '120', 'state': 'FL', 'franchise_alias': None,
             'office_name': 'Unrelated Agency'},
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='NPP6332040', insured_name='X')]
        with patch('crc_group.compass.obtener_token', return_value='tok'), \
             patch('crc_group.compass.buscar_poliza', return_value=None), \
             patch('crc_group.buscar_franquicia_historica', return_value='DTF0120'):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0120')
        self.assertEqual(rows[0]['franchise_number_source'], 'historico')

    def test_historic_fallback_matches_office_by_franchise_alias_sub_location(self):
        """DTF0188-0112 no es un office_number real, es el alias de la oficina 188 (sub-location).
        Si el historico devuelve ese alias como franquicia, debe encontrar la oficina por alias."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'office_id': 'oficina-188', 'office_number': '188', 'state': 'FL', 'franchise_alias': '0188-0112',
             'office_name': 'Unrelated Agency'},
        ]
        rows = [dict(vendor_name='SAMY INSURANCE, INC', policy_number='P1', insured_name='X')]
        with patch('crc_group.compass.obtener_token', return_value='tok'), \
             patch('crc_group.compass.buscar_poliza', return_value=None), \
             patch('crc_group.buscar_franquicia_historica', return_value='DTF0188-0112'):
            completar_franquicias(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0188-0112')
        self.assertEqual(rows[0]['franchise_number_source'], 'historico')
        self.assertEqual(rows[0]['office_id'], 'oficina-188')
        self.assertEqual(rows[0]['state'], 'FL')
        self.assertIsNone(rows[0]['code_lookup_alert'])

    def test_commission_split_computes_franchise_percent_from_matching_rate(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = dict(id=1, policy_number='NPP6332040', producer_code='SAMY INSURANCE, INC', insured_name='X',
                   transaction_type='REN', franchise_number='DTF0106', state='FL',
                   premium_amount=Decimal('2439.00'), commission_amount=Decimal('243.90'),
                   del_toro_percent=Decimal('0.1000'), accounting_month=date(2026, 8, 1))
        cursor.fetchall.side_effect = [
            [row],
            [{'state': 'FL', 'carrier': 'CRC GROUP', 'transaction_type': 'ALL', 'business_line': '',
              'del_toro_percent': Decimal('0.10'), 'franchise_percent': Decimal('0.10')}],
        ]
        snapshot = {'file_id': 'CRC-Statement.pdf', 'rows': [{'accounting_month': date(2026, 8, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertIsNone(result[0]['commission_alert'])
        self.assertEqual(result[0]['franchise_percent'], Decimal('0.10'))
        self.assertEqual(result[0]['franchise_commission'], Decimal('2439.00') * Decimal('0.10'))

    def test_commission_split_without_file_id_combines_every_file_for_the_month(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row_a = dict(id=1, policy_number='NPP6332040', producer_code='SAMY INSURANCE, INC', insured_name='A',
                     transaction_type='REN', franchise_number='DTF0106', state='FL',
                     premium_amount=Decimal('2439.00'), commission_amount=Decimal('243.90'),
                     del_toro_percent=Decimal('0.10'), accounting_month=date(2026, 8, 1))
        row_b = dict(id=2, policy_number='3AB029762', producer_code='SAMY INSURANCE, INC', insured_name='B',
                     transaction_type='REN', franchise_number='DTF0106', state='FL',
                     premium_amount=Decimal('976.00'), commission_amount=Decimal('97.60'),
                     del_toro_percent=Decimal('0.10'), accounting_month=date(2026, 8, 1))
        cursor.fetchall.side_effect = [[row_a, row_b], []]
        snapshot = {'file_id': None, 'rows': [{'accounting_month': date(2026, 8, 1)}]}
        result = cargar_comisiones_excel(connection, snapshot)
        select_sql = cursor.execute.call_args_list[0].args[0]
        self.assertNotIn('file_id', select_sql)
        self.assertEqual(len(result), 2)
        self.assertEqual({r['policy_number'] for r in result}, {'NPP6332040', '3AB029762'})


if __name__ == '__main__':
    unittest.main()

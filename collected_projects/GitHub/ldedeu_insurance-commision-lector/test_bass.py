import unittest
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch
from bass import (importe, extraer_pago, validar, guardar, alertas_lectura, extraer_statement, FIELDS,
                   separar_asegurado, cargar_comisiones_excel)
from carriers import CARRIERS


class BassTests(unittest.TestCase):
    def test_insured_split_and_saved_original_remain_independent(self):
        raw = '  Juan Pérez ; ACME LLC; Trading Name  '
        self.assertEqual(separar_asegurado(raw), {'insured_person_name': 'Juan Pérez',
                                                'insured_company_name': 'ACME LLC; Trading Name'})
        self.assertEqual(separar_asegurado('ACME LLC'), {'insured_person_name': '', 'insured_company_name': 'ACME LLC'})
        row = dict(self.rows()[0], insured_name=raw, insured_person_name='Juan Perez corregido',
                   insured_company_name='ACME LLC')
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[], []]
        with patch('bass.conectar', return_value=connection):
            guardar([row], self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago.pdf', {})
        insert = next(call for call in cursor.execute.call_args_list if call.args[0].startswith('INSERT'))
        self.assertEqual(insert.args[1][7], raw)
        self.assertEqual(insert.args[1][-2:], ('Juan Perez corregido', 'ACME LLC'))

    def test_review_flags_only_doubtful_fields_and_clears_corrected_values(self):
        row = self.rows()[0]
        original = {'values': dict(row), 'confidence': dict.fromkeys(FIELDS, .99)}
        original['confidence']['policy_number'] = .81
        self.assertEqual(alertas_lectura(row, original), {'policy_number': '81%'})
        corrected = dict(row, policy_number='P103.654.902.4')
        self.assertEqual(alertas_lectura(corrected, original), {})
        invalid = dict(corrected, effective_date='2/30/2026', commission_amount='NaN', comm_percent='NaN', insured_name='')
        self.assertEqual(alertas_lectura(invalid, original), {'effective_date': 'invalid', 'insured_name': 'missing',
                         'comm_percent': 'invalid', 'commission_amount': 'invalid'})

    def test_extraction_preserves_confidence_including_merged_policy_and_date(self):
        headers = [('Policy', .08), ('Eff', .195), ('Insured', .35), ('Type', .55), ('Invoice', .65),
                   ('Gross Prem', .755), ('Comm', .855), ('Invc Amt Paid', .965)]
        blocks = [dict(text=text, x=x, y=.2, height=.01, confidence=.99) for text, x in headers]
        values = [('ABC1237/18/2026', .08, .83), ('Person Name', .35, .99), ('R', .55, .99),
                  ('3110882', .65, .99), ('792.00', .755, .99), ('12', .855, .99), ('95.04', .965, .99)]
        blocks.extend(dict(text=text, x=x, y=.3, height=.01, confidence=score) for text, x, score in values)
        details = extraer_statement(blocks, detalles=True)
        self.assertEqual(details[0]['values']['effective_date'], '7/18/2026')
        self.assertEqual(details[0]['confidence']['effective_date'], .83)
        self.assertEqual(set(alertas_lectura(details[0]['values'], details[0])), {'policy_number', 'effective_date'})
        self.assertEqual(extraer_statement(blocks), [details[0]['values']])

    def rows(self):
        return [{'policy_number': 'P103.654.902.3', 'effective_date': '7/18/2026',
                 'insured_name': 'L & P INSURANCE, CORP', 'transaction_type': 'R',
                 'invoice_number': '3110882', 'gross_premium': '792.00',
                 'comm_percent': '12', 'commission_amount': '95.04'}]

    def pago(self):
        return dict(producer_code='AGT19627', check_number='205327', check_date='8/31/2026', check_amount='95.04')

    def test_payment_full_code_and_parenthesized_negative_amount(self):
        self.assertEqual(importe('(9.39)'), Decimal('-9.39'))
        self.assertEqual(importe(' ( 9.39 ) '), Decimal('-9.39'))
        self.assertEqual(importe('9.339'), Decimal('9.339'))
        self.assertEqual(extraer_pago('AGT20483\n205328\n8/31/2026\n55.40')['producer_code'], 'AGT20483')
        with self.assertRaises(ValueError):
            importe('NaN')

    def test_reconciliation_blocks_mismatch_and_keeps_distinct_invoice_rows(self):
        self.assertEqual(validar(self.rows(), self.pago(), '2026-08'), Decimal('95.04'))
        rows = self.rows() + [dict(self.rows()[0], invoice_number='3110882-R', commission_amount='(95.04)')]
        pago = dict(self.pago(), check_amount='0.00')
        self.assertEqual(validar(rows, pago, '2026-08'), Decimal('0'))
        with self.assertRaises(ValueError):
            validar(rows, self.pago(), '2026-08')

    def test_import_keeps_original_values_and_retry_does_not_duplicate(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'code': 'agt19627', 'franchise': 'DTF0073', 'is_master_code': 0}], []]
        with patch('bass.conectar', return_value=connection):
            self.assertEqual(guardar(self.rows(), self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago-2.pdf', {'text': 'original'}), (1, 0, 'DTF0073'))
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            self.assertEqual(insert.args[1][9], Decimal('.1200'))
            self.assertEqual(insert.args[1][8], Decimal('792.00'))
            self.assertEqual(insert.args[1][10], Decimal('95.04'))
            cursor.fetchall.side_effect = [[{'code': 'AGT19627', 'franchise': 'DTF0073', 'is_master_code': 0}],
                [{'id': 1, 'source_row': 1, 'source_data': insert.args[1][13]}]]
            self.assertEqual(guardar(self.rows(), self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago-2.pdf', {'text': 'original'}), (0, 0, 'DTF0073'))
        self.assertEqual(connection.commit.call_count, 2)

    def test_reimport_with_corrected_row_updates_instead_of_blocking(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'code': 'AGT19627', 'franchise': 'DTF0073', 'is_master_code': 0}], []]
        with patch('bass.conectar', return_value=connection):
            guardar(self.rows(), self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago-2.pdf', {'text': 'original'})
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            cursor.fetchall.side_effect = [[{'code': 'AGT19627', 'franchise': 'DTF0073', 'is_master_code': 0}],
                [{'id': 7, 'source_row': 1, 'source_data': insert.args[1][13]}]]
            corregida = dict(self.rows()[0], policy_number='P103.654.902.4')
            result = guardar([corregida], self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago-2.pdf', {'text': 'original'})
        self.assertEqual(result, (0, 1, 'DTF0073'))
        update = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('UPDATE staging_hub.st_bass_raw'))
        self.assertEqual(update.args[1][2], 'P103.654.902.4')
        self.assertEqual(update.args[1][-1], 7)
        self.assertEqual(connection.commit.call_count, 2)

    def test_reimport_with_fewer_rows_still_blocks(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'code': 'AGT19627', 'franchise': 'DTF0073', 'is_master_code': 0}],
            [{'id': 1, 'source_row': 1, 'source_data': '{}'}, {'id': 2, 'source_row': 2, 'source_data': '{}'}]]
        with patch('bass.conectar', return_value=connection), self.assertRaises(ValueError):
            guardar(self.rows(), self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago-2.pdf', {'text': 'original'})

    def test_carrier_registered_for_raw_commission_loading(self):
        self.assertEqual(CARRIERS['BASS']['table'], 'staging_hub.st_bass_raw')

    def test_save_uses_content_hash_as_file_id_not_the_file_name(self):
        """Regresion: el mismo statement subido con otro nombre de archivo debe reconocerse
        como el mismo import (mismo file_id, calculado del contenido), no como uno nuevo."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[{'code': 'AGT19627', 'franchise': 'DTF0073', 'is_master_code': 0}], []]
        with patch('bass.conectar', return_value=connection):
            guardar(self.rows(), self.pago(), '2026-08', 'nombre-original.pdf', b'mismo-contenido', 1,
                   'Pago-2.pdf', {'text': 'original'})
            insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
            file_id_guardado = insert.args[1][0]

            cursor.fetchall.side_effect = [[{'code': 'AGT19627', 'franchise': 'DTF0073', 'is_master_code': 0}],
                [{'id': 1, 'source_row': 1, 'source_data': insert.args[1][13]}]]
            self.assertEqual(
                guardar(self.rows(), self.pago(), '2026-08', 'nombre-reenviado (1).pdf', b'mismo-contenido', 1,
                       'Pago-2.pdf', {'text': 'original'}),
                (0, 0, 'DTF0073'))
            select = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('SELECT id'))
            self.assertEqual(select.args[1][0], file_id_guardado)

    def commission_row(self, **overrides):
        return dict({'id': 1, 'policy_number': 'P1', 'effective_date': '2026-07-18', 'insured_name': 'X',
                     'transaction_type': 'R', 'franchise_number': 'DTF0028', 'producer_code': 'AGT1',
                     'accounting_month': date(2026, 9, 1), 'premium_amount': Decimal('100.00'),
                     'del_toro_percent': Decimal('0.1000'), 'commission_amount': Decimal('10.00')}, **overrides)

    def test_commission_split_resolves_state_from_franchise_and_applies_matching_rate(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [self.commission_row()],
            [{'office_number': '28', 'state': 'FL'}],
            [{'state': 'FL', 'carrier': 'BASS', 'transaction_type': 'RENEWAL', 'business_line': '',
              'del_toro_percent': Decimal('0.1000'), 'franchise_percent': Decimal('0.08')}],
        ]
        snapshot = {'file_id': 'Statement.pdf', 'rows': [{'accounting_month': '2026-09-01'}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertEqual(result[0]['state'], 'FL')
        self.assertIsNone(result[0]['commission_alert'])
        self.assertEqual(result[0]['franchise_percent'], Decimal('0.08'))
        self.assertEqual(result[0]['franchise_commission'], Decimal('100.00') * Decimal('0.08'))

    def test_premium_is_derived_from_commission_and_rate_not_the_annual_gross_premium(self):
        """Regresion: Gross Premium del statement es la prima del año entero de la póliza, no
        la que corresponde a esta comisión/transacción; usarla directo para Franchise $ da un
        resultado incorrecto. La prima real se deriva de lo que BASS de verdad reporta que nos
        pagó: comm_percent y commission_amount (premium = commission_amount / rate)."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = self.commission_row(gross_premium=Decimal('1200.00'), premium_amount=Decimal('1200.00'),
                                  commission_amount=Decimal('10.00'), del_toro_percent=Decimal('0.1000'))
        cursor.fetchall.side_effect = [
            [row],
            [{'office_number': '28', 'state': 'FL'}],
            [{'state': 'FL', 'carrier': 'BASS', 'transaction_type': 'RENEWAL', 'business_line': '',
              'del_toro_percent': Decimal('0.1000'), 'franchise_percent': Decimal('0.08')}],
        ]
        snapshot = {'file_id': 'Statement.pdf', 'rows': [{'accounting_month': '2026-09-01'}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertEqual(result[0]['premium_amount'], Decimal('100.00'))
        self.assertEqual(result[0]['franchise_commission'], Decimal('100.00') * Decimal('0.08'))

    def test_premium_derivation_alerts_instead_of_crashing_when_rate_is_zero(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        row = self.commission_row(del_toro_percent=Decimal('0'), commission_amount=Decimal('10.00'))
        cursor.fetchall.side_effect = [[row], [{'office_number': '28', 'state': 'FL'}], []]
        snapshot = {'file_id': 'Statement.pdf', 'rows': [{'accounting_month': '2026-09-01'}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertEqual(result[0]['premium_amount'], Decimal('0'))
        self.assertIn('Comm % en cero', result[0]['commission_alert'])

    def test_commission_split_alerts_when_franchise_has_no_office_or_rate_is_missing(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [
            [self.commission_row(franchise_number='DTF9999')],
            [{'office_number': '28', 'state': 'FL'}],
            [],
        ]
        snapshot = {'file_id': 'Statement.pdf', 'rows': [{'accounting_month': '2026-09-01'}]}
        result = cargar_comisiones_excel(connection, snapshot)
        self.assertIsNone(result[0]['state'])
        self.assertIn('sin oficina', result[0]['commission_alert'])
        self.assertIsNone(result[0]['franchise_percent'])

    def test_insert_failure_rolls_back(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = {'acquired': 1}
        connection.cursor.return_value.fetchall.side_effect = [[], []]
        def execute(sql, *args):
            if sql.startswith('INSERT'):
                raise ValueError('insert failed')
        connection.cursor.return_value.execute.side_effect = execute
        with patch('bass.conectar', return_value=connection), self.assertRaises(ValueError):
            guardar(self.rows(), self.pago(), '2026-08', 'Statement.pdf', b'contenido-bass', 1, 'Pago-2.pdf', {})
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()

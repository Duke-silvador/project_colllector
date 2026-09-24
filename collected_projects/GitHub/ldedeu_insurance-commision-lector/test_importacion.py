import unittest
from decimal import Decimal
from unittest.mock import MagicMock, patch

from commonwealth import procesar_commonwealth
from importacion import construir_registros, importar, completar_estados_compass, calcular_file_id
from importacion import registros_faltantes, buscar_posibles_duplicados
from dataclasses import asdict

REPORT = """AGENCY COMMISSION REPORT
07/01/2026 - 08/01/2026
Agency Code 12IA
Location DEL TORO INSURANCE
Name Insured Policy # Trans Type Last Transaction Date Roadside Premium Commission
TEST INSURED TXA2612IA00158 03/19/2026 N 124.78 14.97
TOTAL DEL TORO INSURANCE 14.97
Location GODOY INSURANCE LLC
SECOND INSURED TXA2612IA00451 07/27/2026 N 89.23 10.71
TOTAL GODOY INSURANCE LLC 10.71
Chargebacks
Motor Vehicle Report x 1 -5.50
Chargeback Total -5.50
Grand Total DEL TORO FRANCHISING CORP 20.18
"""


class ImportTests(unittest.TestCase):
    def test_history_franchise_is_saved_and_duplicate_misses_are_cached(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        records[1].policy_number = records[0].policy_number
        history = MagicMock(return_value='DTF0134')
        with patch('importacion.compass.obtener_token', return_value='tok'), \
             patch('importacion.compass.buscar_poliza', return_value=None):
            completar_estados_compass(records, {}, set(), buscar_historico=history)
        self.assertEqual([r.franchise_number for r in records], ['DTF0134', 'DTF0134', None])
        history.assert_called_once_with(records[0].policy_number)
        self.assertIsNone(records[0].office_id)

    def test_found_compass_policy_without_office_does_not_use_history(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        history = MagicMock(return_value='DTF0134')
        with patch('importacion.compass.obtener_token', return_value='tok'), \
             patch('importacion.compass.buscar_poliza', return_value={'policy_id': 'found'}):
            completar_estados_compass(records, {}, set(), buscar_historico=history)
        history.assert_not_called()
        self.assertIsNone(records[0].franchise_number)

    def test_compass_status_is_saved_and_duplicate_policies_are_cached(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        records[1].policy_number = records[0].policy_number
        with patch('importacion.compass.obtener_token', return_value='tok'), \
             patch('importacion.compass.buscar_poliza', return_value={'office_id': 'office-1', 'status_id': 'cancelled'}) as buscar:
            completar_estados_compass(records)
        buscar.assert_called_once_with('tok', records[0].policy_number)
        self.assertEqual([r.policy_status for r in records], ['cancelled', 'cancelled', None])
        self.assertEqual([r.transaction_type for r in records], [None, None, 'Motor Vehicle Report x 1'])
        saved = [asdict(r) for r in records]
        records[0].policy_status = 'active'
        self.assertEqual(registros_faltantes(records, saved), [])

    def test_status_lookup_preserves_transaction_type(self):
        record = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')[0]
        record.transaction_type = 'RENEWAL'
        with patch('importacion.compass.obtener_token', return_value='tok'), \
             patch('importacion.compass.buscar_poliza', return_value={'status_id': 'active'}):
            completar_estados_compass([record])
        self.assertEqual(record.policy_status, 'active')
        self.assertEqual(record.transaction_type, 'RENEWAL')

    def test_repository_keeps_status_and_type_in_separate_columns(self):
        from repositories import StCommonwealthRawRepository
        record = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')[0]
        record.policy_status = 'active'
        record.transaction_type = 'RENEWAL'
        connection = MagicMock()
        StCommonwealthRawRepository(connection).insertar(record)
        sql, values = connection.cursor.return_value.execute.call_args.args
        self.assertEqual(sql.count('%s'), len(values))
        columns = sql.split('(', 1)[1].split(')', 1)[0].replace(' ', '').replace('\n', '').split(',')
        self.assertEqual(values[columns.index('policy_status')], 'active')
        self.assertEqual(values[columns.index('transaction_type')], 'RENEWAL')

    def test_franchise_saved_from_same_compass_lookup(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        with patch('importacion.compass.obtener_token', return_value='tok'), \
             patch('importacion.compass.buscar_poliza', return_value={'office_id': 'office1', 'status_id': 'active', 'line_business_id': 'renters'}) as search:
            completar_estados_compass(records, {'office1': '82'}, set())
        self.assertEqual(search.call_count, 2)
        self.assertEqual(records[0].line_business_id, 'renters')
        self.assertIsNone(records[-1].line_business_id)
        self.assertEqual(records[0].office_id, 'office1')
        self.assertIsNone(records[-1].office_id)
        self.assertEqual(records[0].franchise_number, 'DTF0082')
        self.assertEqual(records[1].franchise_number, 'DTF0082')
        self.assertIsNone(records[-1].franchise_number)

    def test_policy_not_found_leaves_null(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        with patch('importacion.compass.obtener_token', return_value='tok'), \
             patch('importacion.compass.buscar_poliza', return_value=None):
            completar_estados_compass(records)
        self.assertTrue(all(r.transaction_type is None for r in records[:2]))

    def test_existing_file_has_no_missing_records(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        self.assertEqual(registros_faltantes(records, [asdict(record) for record in records]), [])

    def test_partial_file_only_inserts_missing(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        self.assertEqual(registros_faltantes(records, [asdict(records[0])]), records[1:])

    def test_identical_rows_preserve_multiplicity(self):
        record = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')[0]
        self.assertEqual(registros_faltantes([record, record], [asdict(record)]), [record])

    def test_changed_existing_row_requires_review(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        existing = asdict(records[0])
        existing['commission_amount'] = Decimal('999')
        with self.assertRaises(ValueError):
            registros_faltantes(records, [existing])

    def test_mapping_and_exclusion_of_totals(self):
        rows = procesar_commonwealth(REPORT, '2026-09')
        self.assertEqual(len(rows), 3)
        self.assertEqual(rows[1]['producer_name'], 'GODOY INSURANCE LLC')
        self.assertEqual(rows[0]['accounting_month'], '2026-09')
        self.assertEqual(Decimal(rows[0]['comm_percent']), Decimal('14.97') / Decimal('124.78'))
        record = construir_registros(rows, 'report.pdf', b'contenido-commonwealth')[0]
        self.assertEqual(record.comm_percent, Decimal('0.1200'))
        self.assertEqual(record.commission_amount, Decimal('14.97'))
        self.assertEqual(registros_faltantes([record], [asdict(record)]), [])
        self.assertEqual(record.premium_amount, Decimal('124.78'))
        self.assertEqual(record.effective_date.isoformat(), '2026-03-19')
        self.assertEqual(record.file_id, calcular_file_id(b'contenido-commonwealth'))
        self.assertEqual(record.file_name, 'report')
        self.assertEqual(record.accounting_month.isoformat(), '2026-09-01')

    def test_file_names_preserve_inner_dots_and_remove_path(self):
        from importacion import nombres_archivo
        self.assertEqual(nombres_archivo(r'C:\reports\July.2026.pdf'), ('July.2026.pdf', 'July.2026'))

    def test_chargeback_keeps_sign_and_fixed_ratio(self):
        rows = procesar_commonwealth(REPORT, '2026-09')
        record = construir_registros(rows, 'report.pdf', b'contenido-commonwealth')[-1]
        self.assertEqual(record.commission_amount, Decimal('-5.50'))
        self.assertEqual(record.comm_percent, Decimal('1'))
        self.assertIsNone(record.effective_date)
        self.assertIsNone(record.premium_amount)
        self.assertEqual(record.transaction_type, 'Motor Vehicle Report x 1')
        for field in ('insured_name', 'policy_number', 'roadside_flag', 'producer_code', 'producer_name'):
            self.assertEqual(getattr(record, field), '')
        with patch('importacion.compass.obtener_token') as token:
            completar_estados_compass([record])
        token.assert_not_called()
        self.assertEqual(record.transaction_type, 'Motor Vehicle Report x 1')

    def test_chargebacks_with_same_amount_keep_distinct_descriptions(self):
        record = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')[-1]
        existing = asdict(record)
        existing['transaction_type'] = 'Another charge'
        with self.assertRaises(ValueError):
            registros_faltantes([record], [existing])

    def test_positive_chargeback(self):
        report = REPORT.replace('-5.50', '5.50').replace('20.18', '31.18')
        record = construir_registros(procesar_commonwealth(report, '2026-09'), 'report.pdf', b'contenido-commonwealth')[-1]
        self.assertEqual(record.commission_amount, Decimal('5.50'))
        self.assertEqual(record.comm_percent, Decimal('1'))

    def test_percentage_recomputed_before_insert(self):
        rows = procesar_commonwealth(REPORT, '2026-09')
        rows[0].update(premium_amount='100', commission_amount='15', comm_percent='99')
        self.assertEqual(construir_registros(rows, 'report.pdf', b'contenido-commonwealth')[0].comm_percent, Decimal('0.15'))

    def test_chargeback_total_must_match(self):
        with self.assertRaises(ValueError):
            procesar_commonwealth(REPORT.replace('Chargeback Total -5.50', 'Chargeback Total -6.00'), '2026-09')

    def test_missing_row_fails_subtotal(self):
        with self.assertRaises(ValueError):
            procesar_commonwealth(REPORT.replace('124.78 14.97', '124.78 10.00'), '2026-09')

    def test_missing_final_total_fails(self):
        with self.assertRaises(ValueError):
            procesar_commonwealth(REPORT.replace('TOTAL GODOY INSURANCE LLC 10.71', ''), '2026-09')

    def test_empty_pdf_fails(self):
        with self.assertRaises(ValueError):
            procesar_commonwealth('', '2026-09')

    def test_transaction_rolls_back_if_second_row_fails(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.side_effect = [{'acquired': 1}, {'ENGINE': 'InnoDB'}, None, {}]
        cursor.fetchall.side_effect = [[{'Field': 'id', 'Extra': 'auto_increment'}, {'Field': 'file_id', 'Type': 'varchar(255)'}, {'Field': 'producer_name', 'Extra': ''}, {'Field': 'transaction_type', 'Type': 'varchar(255)'}, {'Field': 'policy_status', 'Type': 'varchar(255)'}, {'Field': 'effective_date', 'Null': 'YES'}], [], []]
        with patch('importacion.conectar', return_value=connection), patch('importacion.StCommonwealthRawRepository') as repo, patch('importacion.completar_estados_compass'), patch('importacion.cargar_mapa_office_numbers', return_value={}), patch('importacion.cargar_codigos_master', return_value=set()):
            repo.return_value.insertar.side_effect = [None, ValueError('invalid row')]
            with self.assertRaises(ValueError):
                importar(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()
        connection.close.assert_called_once()

    def test_save_uses_content_hash_as_file_id_not_the_file_name(self):
        """Regresion: el mismo statement subido con otro nombre de archivo debe reconocerse
        como el mismo import (mismo file_id, calculado del contenido), no como uno nuevo."""
        connection = MagicMock()
        cursor = connection.cursor.return_value
        columns = [{'Field': 'id', 'Extra': 'auto_increment'}, {'Field': 'file_id', 'Type': 'varchar(255)'},
                   {'Field': 'producer_name', 'Extra': ''}, {'Field': 'transaction_type', 'Type': 'varchar(255)'},
                   {'Field': 'policy_status', 'Type': 'varchar(255)'}, {'Field': 'effective_date', 'Null': 'YES'}]
        cursor.fetchone.side_effect = [{'acquired': 1}, {'ENGINE': 'InnoDB'}, None, {}]
        cursor.fetchall.side_effect = [columns, [], []]
        with patch('importacion.conectar', return_value=connection), patch('importacion.StCommonwealthRawRepository'), \
             patch('importacion.completar_estados_compass'), patch('importacion.cargar_mapa_office_numbers', return_value={}), \
             patch('importacion.cargar_codigos_master', return_value=set()):
            importar(procesar_commonwealth(REPORT, '2026-09'), 'nombre-original.pdf', b'mismo-contenido')
            select = next(c for c in cursor.execute.call_args_list if 'file_id=%s OR file_name=%s' in c.args[0])
            file_id_usado = select.args[1][0]
            self.assertEqual(file_id_usado, calcular_file_id(b'mismo-contenido'))

            cursor.execute.reset_mock()
            cursor.fetchone.side_effect = [{'acquired': 1}, {'ENGINE': 'InnoDB'}, None, {}]
            cursor.fetchall.side_effect = [columns, [], []]
            importar(procesar_commonwealth(REPORT, '2026-09'), 'nombre-reenviado (1).pdf', b'mismo-contenido')
            select_2 = next(c for c in cursor.execute.call_args_list if 'file_id=%s OR file_name=%s' in c.args[0])
            self.assertEqual(select_2.args[1][0], file_id_usado)


class BuscarPosiblesDuplicadosTests(unittest.TestCase):
    """Aviso adicional, independiente del file_id: compara por contenido (policy_number + monto)
    lo que se va a guardar contra lo ya guardado bajo OTRO file_id ese mismo mes, para avisar
    de statements distintos que coinciden por casualidad (el file_id ya es del contenido del
    archivo; esto cubre el caso de archivos genuinamente distintos con datos superpuestos)."""

    def test_flags_same_policy_and_amount_already_saved_under_a_different_file(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'policy_number': 'H3FL000580390', 'monto': Decimal('263.12'), 'file_name': 'Slide-Statemnt-1.pdf'},
        ]
        resultado = buscar_posibles_duplicados(
            connection, 'st_slide_raw', 'policy_number', 'comm_amt', '2026-09-01',
            'Policy_Direct Bill Commission Statement.pdf',
            [('H3FL000580390', Decimal('263.12'))])
        self.assertEqual(len(resultado), 1)
        self.assertEqual(resultado[0]['policy_number'], 'H3FL000580390')
        self.assertEqual(resultado[0]['archivos'], ['Slide-Statemnt-1.pdf'])

    def test_does_not_flag_when_amount_differs_or_policy_is_new(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'policy_number': 'H3FL000580390', 'monto': Decimal('263.12'), 'file_name': 'Slide-Statemnt-1.pdf'},
        ]
        resultado = buscar_posibles_duplicados(
            connection, 'st_slide_raw', 'policy_number', 'comm_amt', '2026-09-01', 'otro.pdf',
            [('H3FL000580390', Decimal('999.99')), ('OTRA-POLIZA', Decimal('50.00'))])
        self.assertEqual(resultado, [])

    def test_returns_empty_without_querying_when_no_pairs_given(self):
        connection = MagicMock()
        resultado = buscar_posibles_duplicados(connection, 'st_slide_raw', 'policy_number', 'comm_amt',
                                                '2026-09-01', 'archivo.pdf', [])
        self.assertEqual(resultado, [])
        connection.cursor.assert_not_called()


if __name__ == '__main__':
    unittest.main()

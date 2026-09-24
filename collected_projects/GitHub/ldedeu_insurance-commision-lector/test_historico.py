import unittest
from decimal import Decimal
from datetime import date
from historico import convertir, FIELDS
from historico import importar_historico
from unittest.mock import MagicMock, patch
from tempfile import TemporaryDirectory
from pathlib import Path
from openpyxl import Workbook


class HistoricTests(unittest.TestCase):
    def test_invalid_dates_are_null_for_all_date_columns(self):
        for label in ('Date', 'Month', 'Report Month'):
            _, kind, limit = FIELDS[label]
            for value in ('not a date', '02/30/2026', '0000-00-00', '0001-01-01', 123, date(999, 1, 1)):
                with self.subTest(column=label, value=value):
                    self.assertIsNone(convertir(value, kind, limit))
            self.assertEqual(convertir('08/17/2026', kind, limit), date(2026, 8, 17))

    def test_currency_text(self):
        for value in ('$184,801.89', '184,801.89', '$ 184,801.89'):
            self.assertEqual(convertir(value, 'decimal', None), Decimal('184801.89'))
        for value in ('($184,801.89)', '-$184,801.89', '$-184,801.89', '(184,801.89)'):
            self.assertEqual(convertir(value, 'decimal', None), Decimal('-184801.89'))
        for value in ('1,23', '$--5', '#VALUE!', 'text', '-'):
            with self.assertRaisesRegex(ValueError, 'valor numérico no reconocido'):
                convertir(value, 'decimal', None)

    def test_skips_database_and_excel_duplicates(self):
        values = [date(2026, 8, 1) if kind in ('date', 'required_date') else
                  1 if kind in ('decimal', 'optional_decimal') else 'text' for _, kind, _ in FIELDS.values()]
        existing = tuple(convertir(value, kind, limit) for value, (_, kind, limit) in zip(values, FIELDS.values()))
        new_values = list(values)
        new_values[1] = 'new insured'
        with TemporaryDirectory() as folder:
            path = Path(folder) / 'history.xlsx'
            book = Workbook()
            book.active.append(list(FIELDS))
            for row in (values, new_values, new_values):
                book.active.append(row)
            book.save(path)
            conn = MagicMock()
            cur = conn.cursor.return_value
            cur.fetchone.side_effect = [(1,), ('InnoDB',), (1,)]
            cur.fetchmany.side_effect = [[existing], []]
            with patch('historico.conectar', return_value=conn):
                self.assertEqual(importar_historico(path, 'Sheet', batch_size=1), 1)
            cur.executemany.assert_called_once()
            conn.commit.assert_called_once()

    def test_decimal_limits(self):
        self.assertEqual(convertir('99999.99999', 'decimal', None), Decimal('99999.99999'))
        for value in ('10000000000000', 'NaN', '9999999999999.999999'):
            with self.assertRaises(ValueError):
                convertir(value, 'decimal', None)

    def test_large_amount(self):
        self.assertEqual(convertir('184801.89', 'decimal', None), Decimal('184801.89000'))
        self.assertEqual(convertir('(184801.89)', 'decimal', None), Decimal('-184801.89000'))
        with self.assertRaises(ValueError):
            convertir('100000', 'decimal', 10)

    def test_accounting_negatives(self):
        for value in ('(123.45)', '(-123.45)', '-123.45', -123.45):
            self.assertEqual(convertir(value, 'decimal', None), Decimal('-123.45'))
        self.assertEqual(convertir('123.45', 'decimal', None), Decimal('123.45'))

    def test_rounding_to_database_scale(self):
        self.assertEqual(convertir('0.123456', 'decimal', None), Decimal('0.12346'))
        self.assertEqual(convertir('(0.123456)', 'decimal', None), Decimal('-0.12346'))

    def test_dates(self):
        self.assertEqual(convertir('2026-08', 'date', None), date(2026, 8, 1))
        self.assertIsNone(convertir(None, 'date', None))
        self.assertIsNone(convertir(None, 'required_date', None))

    def test_all_imported_fields_allow_empty(self):
        for label, (_, kind, limit) in FIELDS.items():
            for value in (None, '', '   '):
                with self.subTest(column=label, value=value):
                    self.assertIsNone(convertir(value, kind, limit))

    def test_generated_columns_omitted(self):
        columns = {spec[0] for spec in FIELDS.values()}
        self.assertFalse(columns & {'trans_ID', 'difference', 'uploaded_date'})
        self.assertEqual(FIELDS['Office'][0], 'franchise')

    def test_percent_preserved(self):
        self.assertEqual(convertir(0.12, 'decimal', None), Decimal('.12'))

    def test_empty_del_toro_percentage(self):
        _, kind, precision = FIELDS['Del Toro %']
        for value in (None, '', '   '):
            self.assertIsNone(convertir(value, kind, precision))
        self.assertEqual(convertir('0', kind, precision), Decimal(0))
        self.assertEqual(convertir('(0.12)', kind, precision), Decimal('-.12'))

    def test_empty_franchise_percentage(self):
        _, kind, precision = FIELDS['Franchise %']
        for value in (None, '', '   '):
            self.assertIsNone(convertir(value, kind, precision))
        self.assertEqual(convertir('0', kind, precision), Decimal(0))
        self.assertEqual(convertir('(0.12)', kind, precision), Decimal('-.12'))

if __name__ == '__main__':
    unittest.main()

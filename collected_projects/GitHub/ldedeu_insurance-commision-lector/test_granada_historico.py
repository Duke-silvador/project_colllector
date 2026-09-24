import unittest
from unittest.mock import MagicMock
from granada_historico import buscar_alternativas


class HistoricalAlternativesTests(unittest.TestCase):
    def test_previous_edition_and_reordered_name(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [dict(insured_name='Pérez, Ana María', franchise='73')]
        self.assertEqual(buscar_alternativas(connection, 'P001', '1', 'ANA MARIA PEREZ'), 'DTF0073')
        self.assertEqual(cursor.execute.call_args.args[1], ('P001-0', 'P001 - 0', 'P001- 0', 'P001 -0'))
        cursor.execute.assert_called_once()

    def test_contains_fallback_requires_full_name_and_unique_franchise(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.side_effect = [[], [
            dict(insured_name='Smith John', franchise='DTF0073'),
            dict(insured_name='John Smith', franchise='DTF0073'),
            dict(insured_name='Jane Smith', franchise='DTF0082')]]
        self.assertEqual(buscar_alternativas(connection, 'P-001', '2', 'JOHN SMITH'), 'DTF0073')
        self.assertEqual(cursor.execute.call_args.args[1], ('P001',))

    def test_ambiguous_or_different_insured_does_not_assign(self):
        for registros in ([dict(insured_name='Jane Smith', franchise='DTF0073')], [
                dict(insured_name='John Smith', franchise='DTF0073'),
                dict(insured_name='Smith John', franchise='DTF0082')]):
            connection = MagicMock()
            connection.cursor.return_value.fetchall.return_value = registros
            self.assertIsNone(buscar_alternativas(connection, 'P001', '0', 'John Smith'))

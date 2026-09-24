import unittest
from unittest.mock import MagicMock
from chargebacks_commonwealth import completar_chargebacks


class ChargebackTests(unittest.TestCase):
    def test_code_with_numeric_suffix_not_registered_is_not_guessed_and_gets_flagged(self):
        """Regresion: '12IA' esta registrado, pero 'tx12ia1' (o tx12ia4, tx12ia5...) no es un
        codigo EXACTO registrado - podria ser una sub-agencia con otra franquicia. No se debe
        adivinar por prefijo; se deja sin franquicia y se marca para revision."""
        connection = MagicMock()
        connection.cursor.return_value.fetchall.return_value = [
            {'code': '12IA', 'franchise': 'DTF0073', 'is_master_code': 0},
            {'code': '12QT', 'franchise': 'DTF0155', 'is_master_code': 0}]
        rows = [{'policy_number': '', 'transaction_type': description} for description in (
            'Motor Vehicle Report x 1 for tx12ia1', 'Accident Report x 2 for tx12ia1')]
        completar_chargebacks(connection, rows)
        self.assertTrue(all(row['franchise_number'] is None for row in rows))
        self.assertTrue(all(row['commission_alert'] for row in rows))

    def test_lowercase_statement_code_with_tx_matches_uppercase_database_code(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchall.return_value = [
            {'code': ' 12IA1 ', 'franchise': 'dtf0073', 'is_master_code': 0}]
        rows = [{'policy_number': '', 'transaction_type': f'Accident Report x 2 FOR {code}'}
                for code in ('tx12ia1', '12ia1', 'TX12IA1')]
        completar_chargebacks(connection, rows)
        self.assertTrue(all(row['franchise_number'] == 'DTF0073' for row in rows))
        self.assertTrue(all(row['commission_alert'] is None for row in rows))

    def test_embedded_code_resolves_and_unknown_or_ambiguous_code_alerts(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchall.return_value = [
            {'code': '12IA1', 'franchise': 'DTF0073', 'is_master_code': 0},
            {'code': 'duplicate', 'franchise': 'DTF0073', 'is_master_code': 0},
            {'code': 'duplicate', 'franchise': 'DTF0082', 'is_master_code': 0}]
        rows = [{'policy_number': '', 'transaction_type': f'Motor Vehicle Report x 1 for {code}',
                 'commission_amount': '-5.50'} for code in ('tx12ia1', 'unknown', 'duplicate')]
        completar_chargebacks(connection, rows)
        self.assertEqual(rows[0]['franchise_number'], 'DTF0073')
        self.assertIsNone(rows[0]['commission_alert'])
        self.assertEqual(rows[0]['commission_amount'], '-5.50')
        for row in rows[1:]:
            self.assertIsNone(row['franchise_number'])
            self.assertTrue(row['commission_alert'])

    def test_tx_prefix_is_never_part_of_the_search_even_if_registered_that_way(self):
        """Las iniciales TX del codigo leido en la descripcion (tx12ia1) nunca se usan para
        buscar en la tabla; siempre se busca a partir de lo que sigue (12ia1). Si alguien
        registrara un codigo CON el prefijo TX por error, no deberia encontrar coincidencia."""
        connection = MagicMock()
        connection.cursor.return_value.fetchall.return_value = [
            {'code': 'TX12IA1', 'franchise': 'DTF0073', 'is_master_code': 0}]
        rows = [{'policy_number': '', 'transaction_type': 'Motor Vehicle Report x 1 for tx12ia1'}]
        completar_chargebacks(connection, rows)
        self.assertIsNone(rows[0]['franchise_number'])
        self.assertTrue(rows[0]['commission_alert'])

    def test_without_chargebacks_does_not_query(self):
        connection = MagicMock()
        completar_chargebacks(connection, [{'policy_number': '001', 'transaction_type': 'NEW_BUSINESS'}])
        connection.cursor.assert_not_called()

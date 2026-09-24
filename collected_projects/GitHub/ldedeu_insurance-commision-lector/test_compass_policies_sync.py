import unittest
from unittest.mock import MagicMock, patch

import requests

from compass_policies_sync import obtener_polizas_oficina, sincronizar_oficina, sincronizar_oficinas

ENV = {'COMPASS_BOT_URL': 'http://127.0.0.1:8010', 'COMPASS_BOT_API_KEY': 'test-key'}


class ObtenerPolizasOficinaTests(unittest.TestCase):
    def test_missing_config_raises(self):
        with patch.dict('os.environ', {'COMPASS_BOT_URL': '', 'COMPASS_BOT_API_KEY': ''}):
            with self.assertRaises(ValueError):
                obtener_polizas_oficina('5')

    def test_calls_bot_and_returns_policies(self):
        response = MagicMock()
        response.json.return_value = {'office_number': '5', 'policies': [{'policy_number': '123'}]}
        with patch.dict('os.environ', ENV), patch('compass_policies_sync.requests.get', return_value=response) as get:
            self.assertEqual(obtener_polizas_oficina('5'), [{'policy_number': '123'}])
        get.assert_called_once_with('http://127.0.0.1:8010/v1/offices/5/policies',
                                    headers={'Authorization': 'Bearer test-key'}, timeout=(5, 600))

    def test_unexpected_payload_raises(self):
        response = MagicMock()
        response.json.return_value = {'policies': 'not-a-list'}
        with patch.dict('os.environ', ENV), patch('compass_policies_sync.requests.get', return_value=response):
            with self.assertRaises(ValueError):
                obtener_polizas_oficina('5')

    def test_http_error_propagates(self):
        with patch.dict('os.environ', ENV), patch('compass_policies_sync.requests.get', side_effect=requests.Timeout):
            with self.assertRaises(requests.Timeout):
                obtener_polizas_oficina('5')


POLIZA = {'policy_number': 'TXA2612IA01001', 'insured_name': 'DOUGLAS E BRITO TORRELLAS',
          'status': 'Active', 'transaction_type': 'NEW_BUSINESS', 'line_of_business': 'Auto',
          'effective_date': '2026-08-22'}


class SincronizarOficinaTests(unittest.TestCase):
    def test_creates_new_policy(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = None
        with patch('compass_policies_sync.obtener_polizas_oficina', return_value=[POLIZA]):
            resumen = sincronizar_oficina(connection, '5')
        self.assertEqual(resumen, {'oficina': '5', 'total': 1, 'nuevas': 1, 'actualizadas': 0, 'sin_cambios': 0})
        connection.commit.assert_called_once()
        cursor = connection.cursor.return_value
        insert_call = [call for call in cursor.execute.call_args_list if 'INSERT' in call.args[0]][0]
        self.assertEqual(insert_call.args[1], ('5', 'TXA2612IA01001', '2026-08-22', 'DOUGLAS E BRITO TORRELLAS',
                                               'Active', 'NEW_BUSINESS', 'Auto'))

    def test_updates_changed_policy(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = ('OLD NAME', 'Active', 'NEW_BUSINESS', 'Auto')
        with patch('compass_policies_sync.obtener_polizas_oficina', return_value=[POLIZA]):
            resumen = sincronizar_oficina(connection, '5')
        self.assertEqual(resumen, {'oficina': '5', 'total': 1, 'nuevas': 0, 'actualizadas': 1, 'sin_cambios': 0})

    def test_skips_unchanged_policy(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = ('DOUGLAS E BRITO TORRELLAS', 'Active',
                                                                 'NEW_BUSINESS', 'Auto')
        with patch('compass_policies_sync.obtener_polizas_oficina', return_value=[POLIZA]):
            resumen = sincronizar_oficina(connection, '5')
        self.assertEqual(resumen, {'oficina': '5', 'total': 1, 'nuevas': 0, 'actualizadas': 0, 'sin_cambios': 1})

    def test_skips_rows_without_policy_number(self):
        connection = MagicMock()
        with patch('compass_policies_sync.obtener_polizas_oficina', return_value=[{**POLIZA, 'policy_number': ''}]):
            resumen = sincronizar_oficina(connection, '5')
        self.assertEqual(resumen, {'oficina': '5', 'total': 1, 'nuevas': 0, 'actualizadas': 0, 'sin_cambios': 0})
        connection.cursor.return_value.execute.assert_not_called()

    def test_rolls_back_on_error(self):
        connection = MagicMock()
        connection.cursor.return_value.execute.side_effect = RuntimeError('boom')
        with patch('compass_policies_sync.obtener_polizas_oficina', return_value=[POLIZA]):
            with self.assertRaises(RuntimeError):
                sincronizar_oficina(connection, '5')
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()


class SincronizarOficinasTests(unittest.TestCase):
    def test_syncs_each_office_with_one_connection(self):
        connection = MagicMock()
        with patch('compass_policies_sync.conectar', return_value=connection), \
             patch('compass_policies_sync.sincronizar_oficina', side_effect=lambda c, n: {'oficina': n}) as sync:
            resultado = sincronizar_oficinas(['134', '73'])
        self.assertEqual(resultado, [{'oficina': '134'}, {'oficina': '73'}])
        self.assertEqual(sync.call_count, 2)
        connection.close.assert_called_once()


if __name__ == '__main__':
    unittest.main()

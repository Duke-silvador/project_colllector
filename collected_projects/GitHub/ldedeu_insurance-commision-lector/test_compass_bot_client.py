import unittest
from unittest.mock import MagicMock, patch
import requests
from compass_bot_client import obtener_transaction_type, buscar_franquicias_por_nombre
from importacion import completar_estados_compass, construir_registros
from commonwealth import procesar_commonwealth
from test_importacion import REPORT


ENV = {'COMPASS_BOT_URL': 'http://127.0.0.1:8010', 'COMPASS_BOT_API_KEY': 'test-key'}


class BotClientTests(unittest.TestCase):
    def test_http_contract(self):
        response = MagicMock()
        response.json.return_value = {'policy_number': '123', 'transaction_type': 'RENEWAL'}
        with patch.dict('os.environ', ENV), patch('compass_bot_client.requests.get', return_value=response) as get:
            self.assertEqual(obtener_transaction_type('123', '5', '2026-08-22'), 'RENEWAL')
        get.assert_called_once_with('http://127.0.0.1:8010/v1/policies/123/transaction-type',
                                    params={'office_number': '5', 'effective_date': '2026-08-22'},
                                    headers={'Authorization': 'Bearer test-key'}, timeout=(5, 75))

    def test_rejects_mismatched_policy_or_status(self):
        for payload in [{'policy_number': 'other', 'transaction_type': 'RENEWAL'},
                        {'policy_number': '123', 'transaction_type': 'active'}]:
            response = MagicMock()
            response.json.return_value = payload
            with patch.dict('os.environ', ENV), patch('compass_bot_client.requests.get', return_value=response):
                with self.assertRaises(ValueError):
                    obtener_transaction_type('123', '5', '2026-08-22')

    def test_timeout_is_reported(self):
        with patch.dict('os.environ', ENV), patch('compass_bot_client.requests.get', side_effect=requests.Timeout):
            with self.assertRaises(ValueError):
                obtener_transaction_type('123', '5', '2026-08-22')

    def test_import_does_not_open_browser_even_when_bot_is_configured(self):
        records = construir_registros(procesar_commonwealth(REPORT, '2026-09'), 'report.pdf', b'contenido-commonwealth')
        with patch.dict('os.environ', ENV), patch('importacion.compass.obtener_token', return_value='token'), \
             patch('importacion.compass.buscar_poliza', return_value={'office_id': 'office-1', 'status_id': 'active'}), \
             patch('compass_bot_client.requests.post') as bot:
            completar_estados_compass(records, mapa_oficinas={'office-1': '5'})
        bot.assert_not_called()
        self.assertIsNone(records[0].transaction_type)
        self.assertEqual(records[-1].transaction_type, 'Motor Vehicle Report x 1')


class CompanySearchClientTests(unittest.TestCase):
    def test_http_contract_and_empty_input_skips_the_request(self):
        self.assertEqual(buscar_franquicias_por_nombre([]), [])
        query = {'request_id': '1', 'client_name': 'Gabriela Olaves'}
        response = MagicMock()
        response.json.return_value = {'clients': [{**query, 'offices': [{'label': 'Samy (3)', 'office_number': '3'}],
                                                   'matched_name': 'Gabriela Olaves', 'error': None}]}
        with patch.dict('os.environ', ENV), patch('compass_bot_client.requests.post', return_value=response) as post:
            result = buscar_franquicias_por_nombre([query])
        post.assert_called_once_with('http://127.0.0.1:8010/v1/clients/company-search', json={'clients': [query]},
                                     headers={'Authorization': 'Bearer test-key'}, timeout=(5, 270))
        self.assertEqual(result[0]['offices'], [{'label': 'Samy (3)', 'office_number': '3'}])

    def test_rejects_incomplete_or_mismatched_batch(self):
        query = {'request_id': '1', 'client_name': 'Gabriela Olaves'}
        for payload in [{'clients': []}, {'clients': [{'request_id': 'other', 'offices': []}]},
                        {'clients': [{'request_id': '1', 'offices': 'not-a-list', 'error': None}]}]:
            response = MagicMock()
            response.json.return_value = payload
            with patch.dict('os.environ', ENV), patch('compass_bot_client.requests.post', return_value=response):
                with self.assertRaises(ValueError):
                    buscar_franquicias_por_nombre([query])

    def test_missing_configuration_is_reported(self):
        with patch.dict('os.environ', {'COMPASS_BOT_URL': '', 'COMPASS_BOT_API_KEY': ''}):
            with self.assertRaises(ValueError):
                buscar_franquicias_por_nombre([{'request_id': '1', 'client_name': 'X'}])

    def test_timeout_is_reported(self):
        with patch.dict('os.environ', ENV), patch('compass_bot_client.requests.post', side_effect=requests.Timeout):
            with self.assertRaises(ValueError):
                buscar_franquicias_por_nombre([{'request_id': '1', 'client_name': 'X'}])


if __name__ == '__main__':
    unittest.main()

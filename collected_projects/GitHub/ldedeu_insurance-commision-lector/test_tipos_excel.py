import unittest
from unittest.mock import MagicMock, patch
from reparto_comisiones import consultar_tipos_para_excel, calcular_comisiones_raw
from compass_bot_client import obtener_tipos_lote
from test_reparto_comisiones import TARIFAS


class TypesAtExportTests(unittest.TestCase):
    def test_single_batch_before_calculation_and_persisted_types(self):
        rows = [dict(id=1, policy_number='P1', office_id='oid', office_number='73', state='TX',
                     premium_amount='1000', commission_amount='64.85', transaction_type='RENEWAL', policy_effective_date=None),
                dict(id=2, policy_number='', transaction_type='Report fee', commission_amount='-5', comm_percent='1')]
        c = MagicMock()
        with patch('reparto_comisiones.obtener_tipos_lote', return_value=[dict(request_id='1', transaction_type='NEW_BUSINESS', policy_id='pid', error=None)]) as bot:
            consultar_tipos_para_excel(c, rows, 'COMMONWEALTH')
        bot.assert_called_once()
        self.assertEqual(len(bot.call_args.args[0]), 1)
        self.assertIsNone(bot.call_args.args[0][0]['effective_date'])
        calculated = calcular_comisiones_raw(rows, TARIFAS, 'COMMONWEALTH')
        self.assertEqual(str(calculated[0]['del_toro_commission']), '64.85')
        self.assertEqual(calculated[1]['transaction_type'], 'Report fee')
        c.commit.assert_called_once()
        self.assertEqual(c.cursor.return_value.execute.call_args.args[1][:2], ('NEW_BUSINESS', 'pid'))

    def test_failed_lookup_does_not_reuse_stored_type(self):
        rows = [dict(id=1, policy_number='P1', office_id='oid', office_number='73', state='TX',
                     premium_amount='1000', commission_amount='64.85', transaction_type='RENEWAL')]
        with patch('reparto_comisiones.obtener_tipos_lote', return_value=[dict(request_id='1', transaction_type=None, error='policy_not_found')]):
            consultar_tipos_para_excel(MagicMock(), rows, 'COMMONWEALTH')
        result = calcular_comisiones_raw(rows, TARIFAS, 'COMMONWEALTH')[0]
        self.assertEqual(str(result['del_toro_commission']), '64.85')
        self.assertEqual(result['commission_alert'], 'policy_not_found')

    def test_client_accepts_carrier_mismatch_with_type_and_id(self):
        query = dict(request_id='1', policy_number='P1', office_number='73', office_id='oid')
        response = {'policies': [{**query, 'transaction_type': 'NEW_BUSINESS', 'policy_id': 'pid', 'error': 'carrier_mismatch'}]}
        http = MagicMock()
        http.json.return_value = response
        with patch.dict('os.environ', {'COMPASS_BOT_URL': 'http://localhost:8010', 'COMPASS_BOT_API_KEY': 'test'}), \
             patch('compass_bot_client.requests.post', return_value=http):
            result = obtener_tipos_lote([query])
        self.assertEqual(result[0]['transaction_type'], 'NEW_BUSINESS')
        self.assertEqual(result[0]['error'], 'carrier_mismatch')

    def test_client_rejects_wrong_office_or_incomplete_batch(self):
        query = dict(request_id='1', policy_number='P1', office_number='73', office_id='oid')
        for response in [{'policies': []}, {'policies': [{**query, 'office_id':'other', 'transaction_type':'NEW_BUSINESS', 'policy_id':'pid'}]}]:
            http = MagicMock()
            http.json.return_value = response
            with patch.dict('os.environ', {'COMPASS_BOT_URL':'http://localhost:8010', 'COMPASS_BOT_API_KEY':'test'}), \
                 patch('compass_bot_client.requests.post', return_value=http):
                with self.assertRaises(ValueError):
                    obtener_tipos_lote([query])

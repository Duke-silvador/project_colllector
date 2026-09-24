import unittest
from unittest.mock import MagicMock, patch
from io import BytesIO
from openpyxl import load_workbook
from busqueda_polizas import exportar_excel
from busqueda_polizas_historico import completar_desde_historico, completar_desde_historico_lote


class HistoricalSearchTests(unittest.TestCase):
    def test_batch_uses_one_query_and_latest_record_for_duplicate_policies(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            dict(policy_number='001', franchise='82', agent_name='Latest'),
            dict(policy_number='001', franchise='90', agent_name='Older')]
        rows = [{'Póliza': numero, 'Resultado': 'Póliza no encontrada', 'Fecha expiración': ''}
                for numero in ('001', '001', '002')]
        with patch('busqueda_polizas_historico.conectar', return_value=connection):
            result = completar_desde_historico_lote(rows)
        cursor.execute.assert_called_once()
        self.assertEqual(cursor.execute.call_args.args[1], ('001', '002'))
        self.assertEqual(result[0]['Nombre agente'], 'Latest')
        self.assertEqual(result[1]['Número oficina'], 'DTF0082')
        self.assertEqual(result[0]['Fecha expiración'], '')
        self.assertEqual(result[2]['Resultado'], 'Póliza no encontrada en Compass ni histórico')
        self.assertEqual(rows[0]['Resultado'], 'Póliza no encontrada')
        connection.close.assert_called_once()

    def test_optional_lookup_only_missing_and_keeps_unknown_fields_blank(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.side_effect = [dict(franchise='82', agent_name='Ana', insured_name='Client', premium=0), None]
        rows = [dict(Póliza='found', Resultado='Encontrada', **{'Office ID': 'office', 'Nombre agente': 'Compass Agent'}),
                dict(Póliza='missing', Resultado='Póliza no encontrada', **{'Fecha expiración': '', 'Vigencia desde': '', 'ID agente': ''}),
                dict(Póliza='missing', Resultado='Póliza no encontrada'),
                dict(Póliza='absent', Resultado='Póliza no encontrada'),
                dict(Póliza='error', Resultado='Error al consultar Compass')]
        with patch('busqueda_polizas_historico.conectar', return_value=connection):
            result = completar_desde_historico(rows)
        self.assertEqual(cursor.execute.call_count, 2)
        self.assertEqual(result[0]['Nombre agente'], 'Compass Agent')
        self.assertEqual(result[1]['Número oficina'], 'DTF0082')
        self.assertEqual(result[1]['Nombre agente'], 'Ana')
        self.assertEqual(result[1]['Prima'], '0')
        self.assertEqual(result[1]['Fecha expiración'], '')
        self.assertEqual(result[1]['ID agente'], '')
        self.assertEqual(result[1]['Origen datos'], 'Histórico')
        self.assertEqual(result[2]['Nombre agente'], 'Ana')
        self.assertIn('ni histórico', result[3]['Resultado'])
        self.assertEqual(rows[1]['Resultado'], 'Póliza no encontrada')
        book = load_workbook(BytesIO(exportar_excel(result, ['Póliza', 'Nombre agente', 'Origen datos'])))
        self.assertEqual(book.active['B3'].value, 'Ana')
        book.close()
        cursor.close.assert_called_once()
        connection.close.assert_called_once()

    def test_no_missing_does_not_connect(self):
        with patch('busqueda_polizas_historico.conectar') as connection:
            completar_desde_historico([{'Resultado': 'Encontrada'}])
        connection.assert_not_called()

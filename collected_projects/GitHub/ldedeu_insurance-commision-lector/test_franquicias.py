import unittest
from unittest.mock import MagicMock

from franquicias import (
    CODIGO_POR_DEFECTO, _formatear_codigo_oficina, _normalizar, buscar_franquicia,
    cargar_mapa_franquicias, cargar_codigos_master, resolver_franquicia,
    buscar_franquicia_historica,
)


def connection_con_filas(filas):
    connection = MagicMock()
    connection.cursor.return_value.fetchall.return_value = filas
    return connection


class NormalizarTests(unittest.TestCase):
    def test_removes_spaces_and_uppercases(self):
        self.assertEqual(_normalizar('Del Toro  Insurance'), 'DELTOROINSURANCE')

    def test_none_becomes_empty_string(self):
        self.assertEqual(_normalizar(None), '')


class CargarMapaFranquiciasTests(unittest.TestCase):
    def test_unambiguous_combination_is_mapped(self):
        connection = connection_con_filas([
            {'carrier': 'COMMON WEALTH', 'franchise_name': 'Godoy Insurance Llc', 'franchise': 'DTF0134'},
        ])
        mapa = cargar_mapa_franquicias(connection)
        self.assertEqual(mapa[(_normalizar('COMMONWEALTH'), _normalizar('GODOY INSURANCE LLC'))], 'DTF0134')

    def test_ambiguous_combination_is_omitted(self):
        connection = connection_con_filas([
            {'carrier': 'AMWINS', 'franchise_name': 'Del Toro Insurance Agency Inc', 'franchise': 'DT120'},
            {'carrier': 'AMWINS', 'franchise_name': 'Del Toro Insurance Agency Inc', 'franchise': 'DTF0106'},
        ])
        mapa = cargar_mapa_franquicias(connection)
        self.assertNotIn((_normalizar('AMWINS'), _normalizar('Del Toro Insurance Agency Inc')), mapa)

    def test_repeated_identical_code_is_not_ambiguous(self):
        connection = connection_con_filas([
            {'carrier': 'CITIZENS', 'franchise_name': 'Samy Insurance', 'franchise': 'DTF0003'},
            {'carrier': 'CITIZENS', 'franchise_name': 'Samy Insurance', 'franchise': 'DTF0003'},
        ])
        mapa = cargar_mapa_franquicias(connection)
        self.assertEqual(mapa[(_normalizar('CITIZENS'), _normalizar('Samy Insurance'))], 'DTF0003')


class MasterCodesTests(unittest.TestCase):
    def test_loads_normalized_complete_master_keys(self):
        connection = connection_con_filas([
            {'carrier': 'Common Wealth', 'franchise_name': 'Company A', 'code': '12IA'},
            {'carrier': 'Common Wealth', 'franchise_name': 'Company B', 'code': None},
        ])
        self.assertEqual(cargar_codigos_master(connection), {('COMMONWEALTH', 'COMPANYA', '12IA')})
        self.assertIn('is_master_code = 1', connection.cursor.return_value.execute.call_args.args[0])


class BuscarFranquiciaTests(unittest.TestCase):
    def setUp(self):
        self.mapa = {(_normalizar('COMMONWEALTH'), _normalizar('Godoy Insurance Llc')): 'DTF0134'}

    def test_finds_match_ignoring_case_and_carrier_spacing(self):
        self.assertEqual(buscar_franquicia(self.mapa, 'COMMON WEALTH', 'godoy insurance llc'), 'DTF0134')

    def test_missing_location_uses_default(self):
        self.assertEqual(buscar_franquicia(self.mapa, 'COMMONWEALTH', ''), CODIGO_POR_DEFECTO)
        self.assertEqual(buscar_franquicia(self.mapa, 'COMMONWEALTH', None), CODIGO_POR_DEFECTO)

    def test_no_match_uses_default(self):
        self.assertEqual(buscar_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency'), CODIGO_POR_DEFECTO)

    def test_wrong_carrier_uses_default(self):
        self.assertEqual(buscar_franquicia(self.mapa, 'GEICO', 'Godoy Insurance Llc'), CODIGO_POR_DEFECTO)


class ResolverFranquiciaTests(unittest.TestCase):
    def setUp(self):
        self.mapa = {(_normalizar('COMMONWEALTH'), _normalizar('Godoy Insurance Llc')): 'DTF0134'}
        self.mapa_oficinas = {'office-999': '82'}

    def test_compass_takes_priority_over_mysql_match(self):
        compass = MagicMock(return_value='office-999')
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Godoy Insurance Llc', 'POL-1', compass, self.mapa_oficinas)
        self.assertEqual(result, 'DTF0082')
        compass.assert_called_once_with('POL-1')

    def test_history_precedes_master_after_compass_miss(self):
        history = MagicMock(return_value='DTF0134')
        result = resolver_franquicia({}, 'COMMONWEALTH', 'Company', 'POL-1',
                                    MagicMock(return_value=None), {}, '12IA',
                                    {('COMMONWEALTH', 'COMPANY', '12IA')}, buscar_historico=history)
        self.assertEqual(result, 'DTF0134')
        history.assert_called_once_with('POL-1')

    def test_compass_hit_does_not_query_history(self):
        history = MagicMock(return_value='DTF0134')
        result = resolver_franquicia({}, 'COMMONWEALTH', '', 'POL-1',
                                    MagicMock(return_value='office-999'), self.mapa_oficinas,
                                    buscar_historico=history)
        self.assertEqual(result, 'DTF0082')
        history.assert_not_called()

    def test_history_miss_preserves_master_fallback(self):
        result = resolver_franquicia({}, 'COMMONWEALTH', 'Company', 'POL-1',
                                    MagicMock(return_value=None), {}, '12IA',
                                    {('COMMONWEALTH', 'COMPANY', '12IA')},
                                    buscar_historico=MagicMock(return_value=None))
        self.assertEqual(result, 'DT120')

    def test_history_query_uses_latest_nonempty_franchise_across_carriers(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = {'franchise': ' DTF0134 '}
        self.assertEqual(buscar_franquicia_historica(connection, ' POL-1 '), 'DTF0134')
        sql, args = connection.cursor.return_value.execute.call_args.args
        self.assertIn('historic_data_commissions', sql)
        self.assertIn('ORDER BY report_month DESC, date DESC LIMIT 1', sql)
        self.assertNotIn('carrier=', sql)
        self.assertEqual(args, ('POL-1',))
        connection.cursor.return_value.close.assert_called_once()

    def test_falls_back_to_compass_office_number_when_no_mysql_match(self):
        compass = MagicMock(return_value='office-999')
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency', 'POL-1', compass, self.mapa_oficinas)
        self.assertEqual(result, 'DTF0082')
        compass.assert_called_once_with('POL-1')

    def test_falls_back_to_default_when_compass_also_misses(self):
        compass = MagicMock(return_value=None)
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency', 'POL-1', compass, self.mapa_oficinas)
        self.assertIsNone(result)

    def test_falls_back_to_default_when_office_id_not_in_offices_table(self):
        compass = MagicMock(return_value='office-not-synced')
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency', 'POL-1', compass, self.mapa_oficinas)
        self.assertIsNone(result)

    def test_falls_back_to_default_when_office_number_is_not_numeric(self):
        compass = MagicMock(return_value='office-999')
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency', 'POL-1', compass, {'office-999': 'N/A'})
        self.assertIsNone(result)

    def test_no_compass_function_uses_default(self):
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency', 'POL-1', None)
        self.assertIsNone(result)

    def test_confirmed_master_uses_dt120_only_after_compass_miss(self):
        compass = MagicMock(return_value=None)
        masters = {('COMMONWEALTH', 'COMPANY', '12IA')}
        result = resolver_franquicia({}, 'Common Wealth', 'Company', 'POL-1',
                                    compass, {}, '12IA', masters)
        self.assertEqual(result, 'DT120')
        compass.assert_called_once_with('POL-1')
        self.assertIsNone(resolver_franquicia({}, 'OTHER', 'Company', 'POL-1',
                                            compass, {}, '12IA', masters))

    def test_missing_policy_number_skips_compass(self):
        compass = MagicMock(return_value='office-999')
        result = resolver_franquicia(self.mapa, 'COMMONWEALTH', 'Unknown Agency', '', compass, self.mapa_oficinas)
        self.assertIsNone(result)
        compass.assert_not_called()


class FormatearCodigoOficinaTests(unittest.TestCase):
    def test_pads_to_four_digits(self):
        self.assertEqual(_formatear_codigo_oficina('82'), 'DTF0082')
        self.assertEqual(_formatear_codigo_oficina(1), 'DTF0001')

    def test_none_or_non_numeric_returns_none(self):
        self.assertIsNone(_formatear_codigo_oficina(None))
        self.assertIsNone(_formatear_codigo_oficina('N/A'))

    def test_negative_returns_none(self):
        self.assertIsNone(_formatear_codigo_oficina('-1'))


if __name__ == '__main__':
    unittest.main()

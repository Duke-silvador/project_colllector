import unittest
from io import BytesIO
from unittest.mock import patch, MagicMock
from openpyxl import Workbook
from codigos_franquicias import leer_codigos, completar_oficinas, completar_agentes, importar_codigos, actualizar_agentes
from franquicias import resolver_franquicia
import compass
from requests import HTTPError


class CodeImportTests(unittest.TestCase):
    def test_bass_text_code_is_preserved_and_saved_under_bass(self):
        book = Workbook()
        book.active.append(['DTFranchise', 'Franchise Name', 'Code'])
        book.active.append(['DTF0082', 'Excel Name', 'AGT19385'])
        data = BytesIO()
        book.save(data)
        rows = leer_codigos(data.getvalue(), book.active.title, carrier='BASS')
        self.assertEqual(rows[0]['code'], 'AGT19385')
        self.assertEqual(rows[0]['carrier'], 'BASS')
        rows[0].update(office_id='office', agent_office_id='office', agent_status='Sin agentes activos')
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'acquired': 1}
        cursor.fetchall.side_effect = [[dict(office_id='office', office_number='82', office_name='Office', state='FL')], []]
        with patch('codigos_franquicias.conectar', return_value=connection):
            self.assertEqual(importar_codigos(rows, 'Codes-Bass.xlsx'), 1)
        lookup = next(call for call in cursor.execute.call_args_list if 'FOR UPDATE' in call.args[0])
        self.assertEqual(lookup.args[1], ('BASS', 'AGT19385', 'DTF0082'))
        insert = next(call for call in cursor.execute.call_args_list if call.args[0].startswith('INSERT'))
        self.assertEqual(insert.args[1][5:7], ('BASS', 'AGT19385'))
        connection.commit.assert_called_once()

    def test_conflicting_code_is_reported_and_other_codes_are_imported(self):
        base = dict(office_id='office', agent_office_id='office', franchise='DTF0082',
                   franchise_name='Excel Name', is_master_code=False, agent_status='Sin agentes activos',
                   user_ID='', agent_name='', agent_licence_220_number='', agent_220_npn='')
        c = MagicMock()
        c.cursor.return_value.fetchone.return_value = {'acquired': 1}
        c.cursor.return_value.fetchall.side_effect = [
            [dict(office_id='office', office_number='82', office_name='Office', state='FL')],
            [dict(is_master_code=False, franchise_name='Old Name', franchise_soffront_name='Office')], []]
        conflicts = []
        with patch('codigos_franquicias.conectar', return_value=c):
            count = importar_codigos([{**base, 'code': '45595'}, {**base, 'code': '45596'}],
                                    'codes.xlsx', conflictos=conflicts)
        self.assertEqual(count, 1)
        self.assertEqual(conflicts[0]['Código'], '45595')
        self.assertIn('franchise_name', conflicts[0]['Diferencias'])
        c.commit.assert_called_once()
        c.rollback.assert_not_called()

    def test_multiple_agents_are_saved_in_one_row_with_comma_separated_fields(self):
        row = dict(office_id='office', agent_office_id='office', franchise='DTF0082', code='45595',
                   franchise_name='Excel Name', is_master_code=False, agent_status='Agente obtenido de Compass',
                   _agents=[dict(user_ID='b', agent_name='Second', agent_office_id='office'),
                            dict(user_ID='a', agent_name='First', agent_office_id='office')])
        c = MagicMock()
        c.cursor.return_value.fetchone.return_value = {'acquired': 1}
        c.cursor.return_value.fetchall.side_effect = [[dict(office_id='office', office_number='82', office_name='Office', state='FL')], []]
        with patch('codigos_franquicias.conectar', return_value=c):
            self.assertEqual(importar_codigos([row], 'codes.xlsx'), 1)
        inserts = [call for call in c.cursor.return_value.execute.call_args_list if call.args[0].startswith('INSERT')]
        self.assertEqual(len(inserts), 1)
        self.assertEqual(inserts[0].args[1][7:11], ('a, b', 'First, Second', None, None))
        self.assertNotIn('user_ID', row)

    def test_multiple_agents_keep_one_preview_row_per_excel_record(self):
        rows = [dict(source_row=2, franchise='DTF0082', franchise_name='One', code='1', office_id='uid'),
                dict(source_row=3, franchise='DTF0083', franchise_name='Two', code='2', office_id='other')]
        agents = [dict(id='a', firstname='First', lastname='Agent'), dict(id='b', firstname='Second', lastname='Agent')]
        with patch('codigos_franquicias.compass.obtener_token', return_value='token'), \
             patch('codigos_franquicias.compass.obtener_agentes_oficina', return_value=agents):
            result = actualizar_agentes(rows)
            again = actualizar_agentes(result)
        self.assertEqual(len(result), 2)
        self.assertEqual(len(again), 2)
        self.assertEqual([r['code'] for r in result], ['1', '2'])
        self.assertEqual([r['source_row'] for r in result], [2, 3])
        self.assertEqual(result[0]['agent_name'], 'First Agent, Second Agent')
        self.assertEqual(len(result[0]['_agents']), 2)
        self.assertEqual(again, result)

    def test_agent_refresh_preserves_source_values_and_selections(self):
        original = dict(source_row=2, franchise='DTF0082', franchise_name='Excel Name',
                        carrier='FLORIDA PENINSULA', code='45595', office_id='uid',
                        franchise_soffront_name='Office Name', state_code='FL', is_master_code=True,
                        user_ID='a', importar=False)
        with patch('codigos_franquicias.compass.obtener_token', return_value='token'), \
             patch('codigos_franquicias.compass.obtener_agentes_oficina', return_value=[
                 dict(id='a', firstname='First', lastname='Agent')]), \
             patch('codigos_franquicias.cargar_oficinas') as offices:
            result = actualizar_agentes([original])
        offices.assert_not_called()
        for field in ('source_row', 'franchise', 'franchise_name', 'carrier', 'code', 'office_id',
                      'franchise_soffront_name', 'state_code', 'is_master_code', 'importar'):
            self.assertEqual(result[0][field], original[field])
        self.assertEqual(result[0]['agent_name'], 'First Agent')
        self.assertNotIn('agent_name', original)

    def test_missing_office_is_skipped_and_other_offices_continue(self):
        rows = [dict(office_id='', franchise='DTF0001', franchise_name='Missing office', code='1'),
                dict(office_id='valid', franchise='DTF0002', code='2')]
        with patch('codigos_franquicias.compass.obtener_token', return_value='token'), \
             patch('codigos_franquicias.compass.obtener_agentes_oficina', return_value=[]) as query:
            result = completar_agentes(rows)
        query.assert_called_once_with('token', 'valid')
        self.assertEqual(result[0]['agent_status'], 'Sin Office ID: no se consultó Compass')
        self.assertFalse(result[0]['importar'])
        self.assertEqual(result[0]['franchise_name'], 'Missing office')
        self.assertEqual(result[1]['agent_status'], 'Sin agentes activos')

    def test_all_missing_offices_do_not_even_request_login(self):
        with patch('codigos_franquicias.compass.obtener_token') as login, \
             patch('codigos_franquicias.compass.obtener_agentes_oficina') as query:
            result = completar_agentes([dict(office_id='', franchise='DTF0001', code='1')])
        login.assert_not_called()
        query.assert_not_called()
        self.assertEqual(len(result), 1)

    def test_code_without_agents_can_be_saved_without_inventing_agent_data(self):
        row = dict(office_id='office', agent_office_id='office', franchise='DTF0082', code='45595',
                   franchise_name='Excel Name', is_master_code=False, agent_status='Sin agentes activos',
                   user_ID='', agent_name='', agent_licence_220_number='', agent_220_npn='')
        c = MagicMock()
        c.cursor.return_value.fetchone.return_value = {'acquired': 1}
        c.cursor.return_value.fetchall.side_effect = [[dict(office_id='office', office_number='82', office_name='Office', state='FL')], []]
        with patch('codigos_franquicias.conectar', return_value=c):
            self.assertEqual(importar_codigos([row], 'codes.xlsx'), 1)
        insert = next(call for call in c.cursor.return_value.execute.call_args_list if call.args[0].startswith('INSERT'))
        self.assertEqual(insert.args[1][7:11], ('', '', None, None))
        c.commit.assert_called_once()

    def test_known_no_agents_response_returns_empty_list(self):
        with patch('compass._config', return_value=('https://example.test', '', '')), \
             patch('compass.requests.get') as get:
            get.return_value.status_code = 404
            get.return_value.json.return_value = {'message': 'No active agents found for office: office'}
            self.assertEqual(compass.obtener_agentes_oficina('token', 'office'), [])
            get.return_value.raise_for_status.assert_not_called()

    def test_office_without_agents_keeps_code_and_continues_other_offices(self):
        rows = [dict(office_id='empty', franchise='DTF0001', code='1', agent_name='Old', user_ID='old'),
                dict(office_id='full', franchise='DTF0002', code='2')]
        with patch('codigos_franquicias.compass.obtener_token', return_value='token'), \
             patch('codigos_franquicias.compass.obtener_agentes_oficina', side_effect=[[], [dict(id='agent', firstname='First', lastname='Agent')]]):
            result = completar_agentes(rows)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['agent_status'], 'Sin agentes activos')
        self.assertEqual(result[0]['user_ID'], '')
        self.assertEqual(result[0]['agent_name'], '')
        self.assertTrue(result[0]['importar'])
        self.assertEqual(result[1]['user_ID'], 'agent')

    def test_agents_api_filters_by_office_query_parameter(self):
        agents = [dict(id='agent-id', firstname='First', lastname='Agent')]
        with patch('compass._config', return_value=('https://example.test', '', '')), \
             patch('compass.requests.get') as get:
            get.return_value.json.return_value = {'agents': agents}
            self.assertEqual(compass.obtener_agentes_oficina('token', 'office-uid'), agents)
        get.assert_called_once_with('https://example.test/agents', params={'office_id': 'office-uid'},
                                    headers={'Authorization': 'Bearer token'}, timeout=15)

    def test_agent_authorization_error_is_not_treated_as_empty_list(self):
        with patch('compass._config', return_value=('https://example.test', '', '')), \
             patch('compass.requests.get') as get:
            get.return_value.raise_for_status.side_effect = HTTPError('403 Forbidden')
            with self.assertRaises(HTTPError):
                compass.obtener_agentes_oficina('token', 'office')
        get.assert_called_once()

    def test_multiple_agents_are_expanded_without_reusing_office_results(self):
        rows = [dict(office_id='uid', franchise='DTF0082', code='45595'),
                dict(office_id='uid', franchise='DTF0082', code='45596')]
        agents = [dict(user_id='one', first_name='First', last_name='Agent'),
                  dict(user_id='two', agent_name='Second Agent', agent_220_npn='123')]
        with patch('codigos_franquicias.compass.obtener_token', return_value='token'), \
             patch('codigos_franquicias.compass.obtener_agentes_oficina', return_value=agents) as query:
            result = completar_agentes(rows)
        self.assertEqual(query.call_count, 2)
        self.assertTrue(all(call.args == ('token', 'uid') for call in query.call_args_list))
        self.assertEqual([r['user_ID'] for r in result], ['one', 'two', 'one', 'two'])
        self.assertEqual(result[0]['agent_name'], 'First Agent')
        self.assertEqual(result[1]['agent_220_npn'], '123')

    def test_shared_master_matches_carrier_and_transformed_code_without_name(self):
        masters = {('FLORIDAPENINSULA', 'ANOTHERNAME', '45595')}
        for carrier in ('FLORIDA PENINSULA', 'EDISON', 'OVATION HOME'):
            self.assertEqual(resolver_franquicia({}, carrier, 'Agency', 'P1', lambda _: None,
                {}, '0045595_EDI', masters), 'DT120')
        self.assertIsNone(resolver_franquicia({}, 'COMMONWEALTH', 'Agency', 'P1', lambda _: None,
                {}, '45595', masters))

    def test_preview_preserves_excel_name_and_resolves_office_name(self):
        book = Workbook()
        book.active.append(['DTFanchise', 'Franchise Name', 'Code', 'Name Soffront'])
        book.active.append(['DTF0082', 'Excel Name', '0045595_FPI', 'Untrusted Name'])
        data = BytesIO()
        book.save(data)
        rows = completar_oficinas(leer_codigos(data.getvalue(), 'Sheet'),
                                 [dict(office_id='uid82', office_number='82', office_name='Office Name', state='FL')])
        self.assertEqual(rows[0]['code'], '45595')
        self.assertEqual(rows[0]['franchise_name'], 'Excel Name')
        self.assertEqual(rows[0]['franchise_soffront_name'], 'Office Name')
        self.assertEqual(rows[0]['office_id'], 'uid82')
        self.assertFalse(rows[0]['is_master_code'])

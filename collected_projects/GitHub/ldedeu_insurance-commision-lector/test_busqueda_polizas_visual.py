import unittest
from unittest.mock import patch
from unittest.mock import MagicMock
import requests
from threading import Event
from busqueda_polizas_visual import consultar_polizas_visual, obtener_created_by_lote, _consulta_api


class VisualPolicyTests(unittest.TestCase):
    def test_history_runs_while_visual_resolves_and_is_published_in_same_batch(self):
        started, visual_done = Event(), Event()
        def history(rows):
            started.set()
            if not visual_done.wait(3):
                raise AssertionError('Visual lookup did not overlap history')
            return [{**rows[0], 'Nombre agente': 'Historical Agent', 'Resultado': 'Encontrada en histórico',
                     'Origen datos': 'Histórico'}]
        def visual(queries):
            self.assertTrue(started.wait(3))
            visual_done.set()
            return [{'request_id': '0', 'created_by': 'Visual Agent', 'error': None}]
        updates = []
        office = dict(office_id='office', office_number='7', office_name='Office')
        with patch('busqueda_polizas_visual.compass.buscar_poliza', side_effect=[
                {'office_id': 'office'}, None]), \
             patch('busqueda_polizas_visual.completar_desde_historico_lote', side_effect=history), \
             patch('busqueda_polizas_visual.obtener_created_by_lote', side_effect=visual), \
             patch('busqueda_polizas_visual.compass.obtener_agentes_oficina', return_value=[]):
            rows = consultar_polizas_visual([(2, '001'), (3, '002')], [office], 'token', actualizar=updates.append)
        self.assertEqual(rows[0]['Nombre agente'], 'Visual Agent')
        self.assertEqual(rows[1]['Nombre agente'], 'Historical Agent')
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0][1]['Origen datos'], 'Histórico')
        self.assertFalse(any(k.startswith('_') for row in rows for k in row))

    def test_history_failure_keeps_processing_next_batch(self):
        with patch('busqueda_polizas_visual.compass.buscar_poliza', return_value=None), \
             patch('busqueda_polizas_visual.completar_desde_historico_lote', side_effect=RuntimeError('offline')):
            rows = consultar_polizas_visual([(2, '001'), (3, '002')], [], 'token', tamano_lote=1)
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(row['Resultado histórico'] for row in rows))

    def test_large_file_processes_all_batches_even_with_failed_policies(self):
        filas = [(i + 2, str(i)) for i in range(1803)]
        updates = []
        def resolve(lote, *args, **kwargs):
            return [{'Póliza': numero, 'Resultado agente': 'timeout' if numero == '125' else 'Encontrado'}
                    for _, numero in lote]
        with patch('busqueda_polizas_visual._consultar_lote', side_effect=resolve) as batches:
            rows = consultar_polizas_visual(filas, [], 'token', actualizar=lambda s: updates.append(len(s)))
        self.assertEqual(len(rows), 1803)
        self.assertEqual(batches.call_count, 181)
        self.assertEqual(updates[-1], 1803)
        self.assertEqual(rows[125]['Resultado agente'], 'timeout')
        self.assertEqual(rows[-1]['Póliza'], '1802')

    def test_http_timeout_polls_same_job_until_complete(self):
        consulta = dict(request_id='0', policy_number='001', office_number='7', office_id='office')
        submitted = MagicMock()
        submitted.json.return_value = dict(job_id='job', status='running', completed=0)
        done = MagicMock()
        done.json.return_value = dict(job_id='job', status='completed', policies=[{
            **consulta, 'created_by': 'Ana', 'error': None}])
        with patch.dict('os.environ', COMPASS_BOT_URL='http://bot', COMPASS_BOT_API_KEY='key'), \
             patch('busqueda_polizas_visual.uuid4', return_value=MagicMock(hex='job')), \
             patch('busqueda_polizas_visual.requests.post', side_effect=[requests.Timeout(), submitted]) as post, \
             patch('busqueda_polizas_visual.requests.get', side_effect=[requests.Timeout(), done]) as get, \
             patch('busqueda_polizas_visual.time.sleep'):
            results = obtener_created_by_lote([consulta])
        self.assertEqual(results[0]['created_by'], 'Ana')
        self.assertEqual(post.call_count, 2)
        self.assertTrue(all(c.kwargs['json']['job_id'] == 'job' for c in post.call_args_list))
        self.assertEqual(get.call_count, 2)
        self.assertTrue(all(c.args[0].endswith('/jobs/job') for c in get.call_args_list))

    def test_refreshes_expired_compass_token(self):
        funcion = MagicMock()
        response = MagicMock(status_code=401)
        funcion.side_effect = [requests.HTTPError(response=response), {'office_id': 'office'}]
        token = ['old']
        with patch('busqueda_polizas_visual.compass.obtener_token', return_value='new'):
            _consulta_api(funcion, token, '001')
        self.assertEqual(token, ['new'])
        self.assertEqual(funcion.call_args.args, ('new', '001'))

    def test_resumes_after_completed_prefix_without_querying_it_again(self):
        previos = [{'Fila Excel': 2, 'Póliza': '001', 'Nombre agente': 'Ana'}]
        with patch('busqueda_polizas_visual._consultar_lote', return_value=[{'Póliza': '002', 'Nombre agente': 'Other'}]) as lote:
            rows = consultar_polizas_visual([(2, '001'), (3, '002')], [], 'token', anteriores=previos)
        self.assertEqual(lote.call_args.args[0], [(None, '002')])
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0]['Nombre agente'], 'Ana')

    def test_batches_publish_complete_rows_and_reuse_duplicates_and_agents(self):
        events, updates = [], []
        def api(token, number):
            events.append(('api', number))
            return {'office_id': 'office'}
        def visual(queries):
            events.append(('visual', [q['policy_number'] for q in queries]))
            return [{**q, 'created_by': 'Ana Perez', 'error': None} for q in queries]
        with patch('busqueda_polizas_visual.compass.buscar_poliza', side_effect=api) as api_query, \
             patch('busqueda_polizas_visual.obtener_created_by_lote', side_effect=visual), \
             patch('busqueda_polizas_visual.compass.obtener_agentes_oficina', return_value=[{'id': '42', 'name': 'Ana Perez'}]) as agents:
            rows = consultar_polizas_visual([(2, '001'), (3, '002'), (4, '001')],
                [{'office_id': 'office', 'office_number': '7', 'office_name': 'Miami'}], 'token',
                actualizar=lambda snapshot: updates.append(snapshot), tamano_lote=1)
        self.assertEqual(events, [('api', '001'), ('visual', ['001']), ('api', '002'), ('visual', ['002'])])
        self.assertEqual([len(s) for s in updates], [1, 2, 3])
        self.assertTrue(all(s[-1]['ID agente'] == '42' for s in updates))
        self.assertEqual([r['Fila Excel'] for r in rows], [2, 3, 4])
        self.assertEqual(api_query.call_count, 2)
        agents.assert_called_once()

    def consultar(self, agents, nombre='Ana Perez', error=None):
        with patch('busqueda_polizas_visual.compass.buscar_poliza', return_value={
            'id': 'policy', 'office_id': 'office', 'agent_id': 'wrong',
            'effective_date': '2026-09-17', 'expiration_date': '2027-09-17'
        }), patch('busqueda_polizas_visual.obtener_created_by_lote', return_value=[{
            'request_id': '0', 'created_by': nombre, 'error': error
        }]) as visual, patch('busqueda_polizas_visual.compass.obtener_agentes_oficina', return_value=agents) as query:
            rows = consultar_polizas_visual([(2, '001'), (3, '001')], [{
                'office_id': 'office', 'office_number': '7', 'office_name': 'Miami'
            }], 'token')
        self.assertEqual(len(visual.call_args.args[0]), 1)
        self.assertLessEqual(query.call_count, 1)
        self.assertEqual(rows[0], {**rows[1], 'Fila Excel': 2})
        return rows[0]

    def test_unique_name_uses_visual_instead_of_policy_agent_id(self):
        row = self.consultar([{'id': 'right', 'firstname': 'Ana', 'lastname': 'Perez', 'email': 'ana@example.com'}])
        self.assertEqual(row['ID agente'], 'right')
        self.assertEqual(row['Nombre agente'], 'Ana Perez')
        self.assertEqual(row['Correo agente'], 'ana@example.com')
        self.assertEqual(row['Número oficina'], 'DTF0007')

    def test_two_identical_records_keep_only_visual_name(self):
        agent = {'id': 'right', 'name': 'Ana Perez', 'email': 'ana@example.com'}
        row = self.consultar([agent, dict(agent)])
        self.assertEqual(row['Nombre agente'], 'Ana Perez')
        self.assertEqual(row['ID agente'], '')
        self.assertEqual(row['Correo agente'], '')
        self.assertIn('duplicado', row['Resultado agente'])

    def test_no_exact_match_keeps_visual_name(self):
        row = self.consultar([{'id': 'other', 'name': 'ANA PEREZ'}])
        self.assertEqual(row['Nombre agente'], 'Ana Perez')
        self.assertEqual(row['ID agente'], '')

    def test_visual_error_does_not_use_api_agent(self):
        row = self.consultar([], error='policy_identity_mismatch')
        self.assertEqual(row['Nombre agente'], '')
        self.assertEqual(row['ID agente'], '')
        self.assertEqual(row['Resultado agente'], 'policy_identity_mismatch')

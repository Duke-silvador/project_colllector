import unittest
from unittest.mock import MagicMock
from carrier_bank_terms import cargar_terminos_busqueda, listar_terminos, agregar_termino, eliminar_termino


class CarrierBankTermsTests(unittest.TestCase):
    def test_load_groups_terms_by_carrier(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = [
            {'carrier': 'ASSURANCE', 'search_term': 'AAMGA OPERATING'},
            {'carrier': 'FLORIDA PENINSULA', 'search_term': 'florida peninsul'},
            {'carrier': 'FLORIDA PENINSULA', 'search_term': 'edison'},
        ]
        self.assertEqual(cargar_terminos_busqueda(connection), {
            'ASSURANCE': ['AAMGA OPERATING'],
            'FLORIDA PENINSULA': ['florida peninsul', 'edison'],
        })

    def test_add_rejects_blank_fields_and_duplicates(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        with self.assertRaises(ValueError):
            agregar_termino(connection, '', 'AAMGA OPERATING', 'Lauren')
        with self.assertRaises(ValueError):
            agregar_termino(connection, 'ASSURANCE', '', 'Lauren')
        with self.assertRaises(ValueError):
            agregar_termino(connection, 'ASSURANCE', 'AAMGA OPERATING', '')
        cursor.fetchone.return_value = {'id': 1}
        with self.assertRaises(ValueError):
            agregar_termino(connection, 'ASSURANCE', 'AAMGA OPERATING', 'Lauren')
        connection.commit.assert_not_called()

    def test_add_inserts_and_commits_new_term(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = None
        agregar_termino(connection, 'ASSURANCE', 'AAMGA OPERATING', 'Lauren')
        insert = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('INSERT'))
        self.assertEqual(insert.args[1], ('ASSURANCE', 'AAMGA OPERATING', 'Lauren'))
        connection.commit.assert_called_once()

    def test_delete_commits(self):
        connection = MagicMock()
        eliminar_termino(connection, 7)
        cursor = connection.cursor.return_value
        delete = next(c for c in cursor.execute.call_args_list if c.args[0].startswith('DELETE'))
        self.assertEqual(delete.args[1], (7,))
        connection.commit.assert_called_once()

    def test_list_filters_by_carrier_when_given(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchall.return_value = []
        listar_terminos(connection, 'ASSURANCE')
        select = cursor.execute.call_args.args
        self.assertIn('WHERE carrier=%s', select[0])
        self.assertEqual(select[1], ('ASSURANCE',))


if __name__ == '__main__':
    unittest.main()

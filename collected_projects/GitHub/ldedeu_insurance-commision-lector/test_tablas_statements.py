import unittest
from streamlit.testing.v1 import AppTest


class StatementTableTests(unittest.TestCase):
    def test_shared_preview_filters_and_paginates_all_records(self):
        app = AppTest.from_string('''
from tablas_statements import mostrar_tabla
mostrar_tabla([{'policy': f'POL{i}', 'carrier': 'SWYFFT'} for i in range(61)], 'preview')
''').run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.dataframe[0].value), 25)
        app.number_input[0].set_value(3).run()
        self.assertEqual(len(app.dataframe[0].value), 11)
        app.text_input[0].set_value('POL60').run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(app.dataframe[0].value.iloc[0]['policy'], 'POL60')
        self.assertEqual(app.number_input[0].value, 1)

    def test_editable_filtered_page_retains_full_dataset(self):
        app = AppTest.from_string('''
import streamlit as st
from tablas_statements import editar_tabla
rows = [{'Registro': i+1, 'policy': f'POL{i}'} for i in range(61)]
st.session_state['result'] = editar_tabla(rows, 'editable', ['Registro'], {})
''').run()
        self.assertEqual(len(app.exception), 0)
        app.number_input[0].set_value(3).run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.dataframe[0].value), 11)
        app.text_input[0].set_value('POL60').run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.dataframe[0].value), 1)
        self.assertEqual(len(app.session_state['result']), 61)
        self.assertEqual(app.session_state['result'][0]['policy'], 'POL0')


if __name__ == '__main__':
    unittest.main()

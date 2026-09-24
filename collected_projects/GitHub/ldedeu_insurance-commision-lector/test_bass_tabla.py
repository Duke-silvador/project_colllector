import unittest
from copy import deepcopy
from streamlit.testing.v1 import AppTest
from bass import FIELDS, alertas_lectura
from bass_tabla import aplicar_edicion


class BassTableTests(unittest.TestCase):
    def test_page_edits_deletions_and_additions_preserve_hidden_rows_and_ocr_origin(self):
        entries = [{'id': str(i), 'values': dict.fromkeys(FIELDS, str(i)),
                    'original': {'values': dict.fromkeys(FIELDS, str(i)), 'confidence': dict.fromkeys(FIELDS, .8)}}
                   for i in range(4)]
        hidden = deepcopy(entries[0])
        aplicar_edicion(entries, ['1', '3'], {'edited_rows': {0: {'policy_number': 'corrected'}},
                                             'deleted_rows': [1], 'added_rows': [{'policy_number': 'new'}]})
        self.assertEqual(entries[0], hidden)
        self.assertEqual([e['values']['policy_number'] for e in entries], ['0', 'corrected', '2', 'new'])
        self.assertEqual(entries[1]['original']['values']['policy_number'], '1')
        self.assertNotIn('policy_number', alertas_lectura(entries[1]['values'], entries[1]['original']))
        self.assertIsNone(entries[-1]['original'])

    def test_pagination_and_filters_keep_all_import_records(self):
        app = AppTest.from_string('''
import streamlit as st
from bass import FIELDS
from bass_tabla import tabla_editable
rows = []
for i in range(31):
    values = dict(policy_number=f'POL{i}', effective_date='7/18/2026', insured_name='Person',
                  transaction_type='R', invoice_number=str(i), gross_premium='100',
                  comm_percent='12', commission_amount='12')
    confidence = dict.fromkeys(FIELDS, .99)
    if i == 30: confidence['policy_number'] = .8
    rows.append({'values': values, 'confidence': confidence})
st.session_state['result'] = tabla_editable(rows, 'test')
''').run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.session_state['result']), 31)
        app.number_input[0].set_value(2).run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.dataframe[0].value), 6)
        app.selectbox[1].select_index(1).run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.dataframe[0].value), 1)
        self.assertEqual(app.dataframe[0].value.iloc[0]['policy_number'], 'POL30')
        self.assertEqual(len(app.session_state['result']), 31)
        app.text_input[0].set_value('missing').run()
        self.assertEqual(len(app.exception), 0)
        self.assertEqual(len(app.dataframe[0].value), 0)
        self.assertEqual(len(app.session_state['result']), 31)


if __name__ == '__main__':
    unittest.main()

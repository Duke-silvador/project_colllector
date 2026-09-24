import unittest
from unittest.mock import MagicMock, patch
from idiomas import Interfaz, traducir


class LanguagesTests(unittest.TestCase):
    def test_display_changes_but_selector_values_and_keys_stay_original(self):
        target = MagicMock()
        target.selectbox.return_value = 'Número de póliza'
        with patch('idiomas.st.session_state', {'language': 'English'}):
            result = Interfaz(target).selectbox('Tipo de búsqueda', ['Número de póliza', 'Archivo Excel'], key='mode')
        args, kwargs = target.selectbox.call_args
        self.assertEqual(args[0], 'Search type')
        self.assertEqual(args[1], ['Número de póliza', 'Archivo Excel'])
        self.assertEqual(kwargs['key'], 'mode')
        with patch('idiomas.st.session_state', {'language': 'English'}):
            self.assertEqual(kwargs['format_func']('Número de póliza'), 'Policy number')
        self.assertEqual(result, 'Número de póliza')

    def test_dataframe_translation_keeps_original_records(self):
        target = MagicMock()
        records = [{'Código': '0045595', 'Franquicia': 'DTF144-0024'}]
        with patch('idiomas.st.session_state', {'language': 'English'}):
            Interfaz(target).dataframe(records)
        self.assertEqual(target.dataframe.call_args.args[0], [{'Code': '0045595', 'Franchise': 'DTF144-0024'}])
        self.assertEqual(records[0]['Código'], '0045595')

    def test_spanish_text_remains_unchanged(self):
        with patch('idiomas.st.session_state', {'language': 'Español'}):
            self.assertEqual(traducir('Consultar Compass'), 'Consultar Compass')

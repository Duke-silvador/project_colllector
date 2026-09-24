import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from tipos_transaccion import agregar_tipo_transaccion, cargar_tipos_transaccion


class TransactionTypesTests(unittest.TestCase):
    def test_new_type_is_persistent_and_duplicate_is_rejected(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'types.json'
            path.write_text(json.dumps([{'code': 'RENEWAL', 'name': 'Renewal'}]), encoding='utf-8')
            with patch('tipos_transaccion.PATH', path):
                self.assertEqual(agregar_tipo_transaccion('Endorse'), 'ENDORSE')
                self.assertIn(('ENDORSE', 'Endorse'), cargar_tipos_transaccion())
                with self.assertRaises(ValueError):
                    agregar_tipo_transaccion(' endorse ')
                self.assertEqual(len(cargar_tipos_transaccion()), 3)

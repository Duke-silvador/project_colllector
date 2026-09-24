import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from lineas_negocio import agregar_linea_negocio, cargar_lineas_negocio


class BusinessLinesTests(unittest.TestCase):
    def test_new_business_line_is_persistent_and_duplicate_is_rejected(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'business_lines.json'
            path.write_text(json.dumps({'business_lines': ['CV', 'MC', 'R']}), encoding='utf-8')
            with patch('lineas_negocio.PATH', path):
                self.assertEqual(agregar_linea_negocio('Auto'), 'Auto')
                self.assertIn('Auto', cargar_lineas_negocio())
                with self.assertRaises(ValueError):
                    agregar_linea_negocio(' auto ')
                self.assertEqual(len(cargar_lineas_negocio()), 4)

    def test_blank_name_is_rejected(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / 'business_lines.json'
            path.write_text(json.dumps({'business_lines': ['CV']}), encoding='utf-8')
            with patch('lineas_negocio.PATH', path):
                with self.assertRaises(ValueError):
                    agregar_linea_negocio('   ')


if __name__ == '__main__':
    unittest.main()

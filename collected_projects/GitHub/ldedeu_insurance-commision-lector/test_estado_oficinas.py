import unittest
from unittest.mock import MagicMock, patch
from oficinas import actualizar_estado_oficina


class OfficeStatusTests(unittest.TestCase):
    def test_only_selected_office_status_is_updated(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value
        cursor.fetchone.return_value = {'office_id': 'uid'}
        with patch('oficinas.conectar', return_value=connection):
            actualizar_estado_oficina('uid', 'Inactive')
        self.assertEqual(cursor.execute.call_args.args, ('UPDATE staging_hub.offices SET status=%s WHERE office_id=%s', ('Inactive', 'uid')))
        connection.commit.assert_called_once()
        connection.rollback.assert_not_called()

    def test_missing_office_rolls_back(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = None
        with patch('oficinas.conectar', return_value=connection):
            with self.assertRaises(ValueError):
                actualizar_estado_oficina('missing', 'Active')
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()

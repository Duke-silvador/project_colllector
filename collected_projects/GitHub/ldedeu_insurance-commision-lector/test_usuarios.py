import unittest
from unittest.mock import MagicMock, patch
from streamlit.testing.v1 import AppTest
from autenticacion import cambiar_password, verificar_password


class UserManagementTests(unittest.TestCase):
    def page(self):
        app = AppTest.from_file('pages/usuarios.py')
        app.session_state['language'] = 'English'
        return app.run()

    def test_password_update_targets_selected_user_and_hashes_password(self):
        connection = MagicMock()
        with patch('autenticacion.conectar', return_value=connection):
            cambiar_password(12, 'new-password-123')
        sql, params = connection.cursor.return_value.execute.call_args.args
        self.assertIn('WHERE id=%s', sql)
        self.assertEqual(params[1], 12)
        self.assertTrue(verificar_password('new-password-123', params[0]))
        connection.commit.assert_called_once()

    def test_missing_user_rolls_back_without_update(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = None
        with patch('autenticacion.conectar', return_value=connection), self.assertRaises(ValueError):
            cambiar_password(999, 'new-password-123')
        connection.rollback.assert_called_once()
        connection.commit.assert_not_called()
        self.assertEqual(connection.cursor.return_value.execute.call_count, 1)

    @patch('autenticacion.listar_usuarios', return_value=[{'id': 12, 'username': 'tester'}])
    @patch('autenticacion.crear_usuario')
    def test_create_user_and_clear_inputs(self, create, users):
        app = self.page()
        app.text_input(key='new_user_name').input('new-user')
        app.text_input(key='new_user_password').input('new-password-123')
        app.text_input(key='new_user_confirmation').input('new-password-123')
        next(b for b in app.button if b.label == 'Create user').click().run()
        self.assertFalse(app.exception)
        create.assert_called_once_with('new-user', 'new-password-123')
        self.assertEqual(app.text_input(key='new_user_password').value, '')
        self.assertTrue(app.success)

    @patch('autenticacion.listar_usuarios', return_value=[{'id': 12, 'username': 'tester'}])
    @patch('autenticacion.cambiar_password')
    def test_password_mismatch_prevents_write_then_valid_submission_saves(self, change, users):
        app = self.page()
        app.text_input(key='change_user_password').input('new-password-123')
        app.text_input(key='change_user_confirmation').input('different-password')
        next(b for b in app.button if b.label == 'Save password').click().run()
        change.assert_not_called()
        self.assertTrue(app.error)
        app.text_input(key='change_user_password').input('new-password-123')
        app.text_input(key='change_user_confirmation').input('new-password-123')
        next(b for b in app.button if b.label == 'Save password').click().run()
        self.assertFalse(app.exception)
        change.assert_called_once_with(12, 'new-password-123')
        self.assertEqual(app.text_input(key='change_user_password').value, '')


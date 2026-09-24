import unittest
from unittest.mock import MagicMock, patch
from autenticacion import hash_password, verificar_password, autenticar
from streamlit.testing.v1 import AppTest


class AuthenticationTests(unittest.TestCase):
    def test_password_hashes_are_salted_and_reject_wrong_password(self):
        password = 'test-password-123'
        first = hash_password(password)
        self.assertNotEqual(first, hash_password(password))
        self.assertNotIn(password, first)
        self.assertTrue(verificar_password(password, first))
        self.assertFalse(verificar_password('wrong', first))
        self.assertFalse(verificar_password(password, 'invalid'))

    def test_valid_login_excludes_password_hash_from_session_identity(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = dict(id=1,username='tester',active=True,locked_until=None,password_hash=hash_password('test-password-123'))
        with patch('autenticacion.conectar', return_value=connection):
            self.assertEqual(autenticar('tester', 'test-password-123'), {'id': 1, 'username': 'tester'})

    def test_inactive_user_cannot_login(self):
        connection = MagicMock()
        connection.cursor.return_value.fetchone.return_value = dict(id=1,active=False)
        with patch('autenticacion.conectar', return_value=connection):
            self.assertIsNone(autenticar('tester', 'test-password-123'))

    def test_login_screen_hides_application_content(self):
        app = AppTest.from_file('app.py',default_timeout=20).run()
        self.assertFalse(app.exception)
        self.assertEqual([title.value for title in app.subheader], ['Welcome Back'])
        self.assertFalse(any(widget.key == 'statement_carrier' for widget in app.selectbox))

    def test_wrong_credentials_keep_application_locked(self):
        with patch('autenticacion.autenticar', return_value=None):
            app = AppTest.from_file('app.py',default_timeout=20).run()
            app.text_input(key='login_username').input('tester')
            app.text_input(key='login_password').input('wrong')
            next(button for button in app.button if button.label == 'Sign in').click().run()
        self.assertFalse(app.exception)
        self.assertTrue(app.error)
        self.assertFalse(app.session_state.filtered_state.get('system_user'))

    def test_login_and_logout_protect_content_and_clear_working_state(self):
        identity = {'id': 1, 'username': 'tester'}
        with patch('autenticacion.autenticar', return_value=identity), patch('autenticacion.usuario_activo', return_value=identity), patch('autenticacion.crear_sesion', return_value='a' * 43), patch('autenticacion.recuperar_sesion', return_value=identity), patch('autenticacion.revocar_sesion') as revoke:
            app = AppTest.from_file('app.py',default_timeout=20).run()
            app.text_input(key='login_username').input('tester')
            app.text_input(key='login_password').input('test-password-123')
            next(button for button in app.button if button.label == 'Sign in').click().run()
            self.assertFalse(app.exception)
            self.assertEqual(app.session_state['system_user'], identity)
            self.assertTrue(app.selectbox(key='statement_carrier'))
            app.session_state['private_preview'] = 'private'
            app.button(key='sign_out').click().run()
            self.assertFalse(app.exception)
            self.assertNotIn('private_preview', app.session_state.filtered_state)
            self.assertNotIn('system_user', app.session_state.filtered_state)
            self.assertEqual([title.value for title in app.subheader], ['Welcome Back'])
            revoke.assert_called_once_with('a' * 43)

    def test_browser_refresh_restores_identity_from_cookie(self):
        identity = {'id': 1, 'username': 'tester'}
        with patch('sesion_navegador.recuperar_sesion', return_value=identity), patch('autenticacion.usuario_activo', return_value=identity), patch('autenticacion.recuperar_sesion', return_value=identity), patch('streamlit.context') as context:
            context.cookies = {'carrier_statements_session': 'a' * 43}
            app = AppTest.from_file('app.py', default_timeout=20).run()
        self.assertFalse(app.exception)
        self.assertEqual(app.session_state['system_user'], identity)
        self.assertTrue(app.selectbox(key='statement_carrier'))

    def test_expired_browser_session_keeps_login_locked(self):
        with patch('sesion_navegador.recuperar_sesion', return_value=None), patch('streamlit.context') as context:
            context.cookies = {'carrier_statements_session': 'a' * 43}
            app = AppTest.from_file('app.py', default_timeout=20).run()
        self.assertFalse(app.exception)
        self.assertNotIn('system_user', app.session_state.filtered_state)

    def test_persistent_token_is_hashed_and_has_expiration(self):
        from autenticacion import crear_sesion, recuperar_sesion
        connection = MagicMock()
        with patch('autenticacion.conectar', return_value=connection):
            token = crear_sesion(1)
            sql, params = connection.cursor.return_value.execute.call_args.args
            self.assertNotEqual(params[0], token)
            self.assertEqual(len(params[0]), 64)
            self.assertEqual(params[1], 1)
            recuperar_sesion(token)
            sql, params = connection.cursor.return_value.execute.call_args.args
            self.assertIn('expires_at>UTC_TIMESTAMP()', sql)
            self.assertIn('u.active=TRUE', sql)

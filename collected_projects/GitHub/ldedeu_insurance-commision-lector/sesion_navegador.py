"""Conserva solo el token opaco de acceso; nunca las credenciales."""
import streamlit as st
from mysql.connector import Error
from autenticacion import recuperar_sesion, SESSION_HOURS
from idiomas import texto as t

COOKIE = 'carrier_statements_session'
COOKIE_JS = '''
export default function({data, setStateValue}) {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = 'carrier_statements_session=' + encodeURIComponent(data.token || '')
        + '; Path=/; SameSite=Strict; Max-Age=' + (data.token ? data.seconds : 0) + secure;
    setStateValue('saved', data.token || '');
}
'''


def sincronizar_sesion():
    if 'cookie_action' in st.session_state:
        _cookie = st.components.v2.component('session_cookie', js=COOKIE_JS)
        _cookie(data={'token': st.session_state['cookie_action'], 'seconds': SESSION_HOURS * 3600},
                key='session_cookie', height=0, on_saved_change=lambda: None)
    if not st.session_state.get('system_user') and 'cookie_action' not in st.session_state:
        token = st.context.cookies.get(COOKIE)
        if token:
            try:
                user = recuperar_sesion(token)
            except (Error, ValueError):
                st.error(t('No se pudo verificar la sesión. Revisa la conexión a la base de datos.', 'Could not verify your session. Check database connectivity.'))
                st.stop()
            if user:
                st.session_state['system_user'] = user
                st.session_state['system_token'] = token

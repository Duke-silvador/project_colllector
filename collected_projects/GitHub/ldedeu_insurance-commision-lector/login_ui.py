import streamlit as st
from mysql.connector import Error
from autenticacion import autenticar, usuario_activo, crear_sesion, recuperar_sesion, revocar_sesion
from idiomas import texto as t
from login_design import CSS, hero, brand, render_vectors


def cerrar_sesion():
    revocar_sesion(st.session_state.get('system_token'))
    language = st.session_state.get('language', 'English')
    st.session_state.clear()
    st.session_state['language'] = language
    st.session_state['cookie_action'] = ''


def exigir_login():
    user = st.session_state.get('system_user')
    if user:
        try:
            current = usuario_activo(user['id'])
            if st.session_state.get('system_token'):
                current = recuperar_sesion(st.session_state['system_token'])
        except (Error, ValueError):
            st.error(t('No se pudo verificar la sesión. Revisa la conexión a la base de datos.', 'Could not verify your session. Check database connectivity.'))
            st.stop()
        if current:
            return
        cerrar_sesion()
    st.html(CSS)
    with st.container(key='login_layout'):
        illustration, center = st.columns([1.55, 1], gap='large')
    with illustration:
        st.html(render_vectors(hero()))
    with center, st.container(key='login_card'):
        st.html(render_vectors(brand()))
        st.subheader(t('Bienvenido', 'Welcome Back'))
        st.caption(t('Inicia sesión para acceder a tu cuenta', 'Sign in to access your account'))
        st.space('small')
        with st.form('system_login', clear_on_submit=True):
            username = st.text_input(t('Usuario', 'Username'), key='login_username',
                placeholder=t('Usuario', 'Username'), icon=':material/person:', label_visibility='collapsed')
            password = st.text_input(t('Contraseña', 'Password'), type='password', key='login_password',
                placeholder=t('Contraseña', 'Password'), icon=':material/lock:', label_visibility='collapsed')
            st.space('small')
            submitted = st.form_submit_button(t('Entrar', 'Sign in'), type='primary', width='stretch')
        if submitted:
            try:
                user = autenticar(username, password)
                if user:
                    token = crear_sesion(user['id'])
            except (Error, ValueError):
                st.error(t('No se pudo iniciar sesión. Revisa la conexión a la base de datos.', 'Could not sign in. Check database connectivity.'))
            else:
                if user:
                    st.session_state['system_user'] = user
                    st.session_state['system_token'] = token
                    st.session_state['cookie_action'] = token
                    st.rerun()
                st.error(t('Credenciales inválidas o cuenta temporalmente bloqueada.', 'Invalid credentials or temporarily locked account.'))
        st.html('<div class="login-footer">' + t('Acceso seguro. Datos fiables. Un futuro más fuerte.', 'Secure Access. Reliable Data. A Stronger Tomorrow.') + '</div>')
    st.stop()

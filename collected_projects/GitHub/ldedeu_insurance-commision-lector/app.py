import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import streamlit as st
from idiomas import texto as t

st.set_page_config(page_title='Gestión de comisiones', layout='wide')
st.markdown('''
<style>
[data-testid="stToolbar"] {pointer-events: none;}
[data-testid="stToolbarActions"] {display: none !important;}
[data-testid="stAppDeployButton"], [data-testid="stMainMenu"] {display: none !important;}
[data-testid="stDecoration"] {display: none !important;}
.stMainBlockContainer {max-width: none; padding: 1.5rem 2rem 2rem !important;}
header[data-testid="stHeader"] {background: transparent; pointer-events: none;}
header[data-testid="stHeader"] button {pointer-events: auto !important;}
[data-testid="stExpandSidebarButton"] {visibility:visible !important; pointer-events:auto !important;}
[data-testid="stSidebar"] {padding-bottom: 110px;}
.st-key-account_footer {position: fixed; bottom: 20px; left: 20px;
    width: 215px; padding-top: 14px; border-top: 1px solid #38393c;}
.st-key-account_footer button[kind="secondary"] {border-color:#e20712; color:#fff; background:#c60711;}
[data-testid="stSidebarNav"] a[aria-current="page"] {border-left:3px solid #ffcf28;}
[data-testid="stTabs"] [aria-selected="true"] {color:#bd0711;}
[data-testid="stTabs"] [data-baseweb="tab-highlight"] {background:#e8bd22;}
</style>
''', unsafe_allow_html=True)
st.session_state.setdefault('language', 'English')
_, language_area = st.columns([8, 2])
with language_area:
    with st.container(horizontal=True, horizontal_alignment='right', vertical_alignment='center'):
        st.segmented_control('Language / Idioma', ['English', 'Español'],
            format_func=lambda value: 'EN' if value == 'English' else 'ES',
            selection_mode='single', default='English', key='language_control',
            on_change=lambda: st.session_state.update(language=st.session_state['language_control']), label_visibility='collapsed',
            required=True, width=160)
import importlib
import login_design
import login_ui
importlib.reload(login_design)
importlib.reload(login_ui)
from login_ui import exigir_login
from sesion_navegador import sincronizar_sesion
sincronizar_sesion()
if not st.session_state.get('system_user'):
    st.navigation([st.Page(exigir_login, title=t('Iniciar sesión', 'Sign in'), default=True)], position='hidden').run()
    st.stop()
exigir_login()
page = st.navigation({
    t('Documentos', 'Documents'): [
        st.Page('importar_documentos.py', title=t('Procesar statements', 'Process statements'), icon=':material/upload_file:', default=True),
        st.Page('pages/5_Historico.py', title=t('Histórico', 'History'), icon=':material/history:')],
    t('Configuración', 'Settings'): [
        st.Page('pages/cambiar_fecha_statement.py', title=t('Cambiar fecha de statements', 'Change statement dates'), icon=':material/calendar_month:'),
        st.Page('pages/usuarios.py', title=t('Usuarios', 'Users'), icon=':material/manage_accounts:'),
        st.Page('pages/oficinas.py', title=t('Oficinas', 'Offices'), icon=':material/apartment:'),
        st.Page('pages/comisiones.py', title=t('Comisiones y tipos', 'Commissions and types'), icon=':material/payments:'),
        st.Page('pages/importar_codigos_franquicias.py', title=t('Códigos de franquicia', 'Franchise codes'), icon=':material/key:'),
        st.Page('pages/codigos_pendientes_assurance.py', title=t('Códigos ASSURANCE pendientes', 'ASSURANCE pending codes'), icon=':material/pending_actions:'),
        st.Page('pages/codigos_pendientes_orchid.py', title=t('Códigos ORCHID pendientes', 'ORCHID pending codes'), icon=':material/pending_actions:'),
        st.Page('pages/codigos_pendientes_slide.py', title=t('Códigos SLIDE pendientes', 'SLIDE pending codes'), icon=':material/pending_actions:'),
        st.Page('pages/terminos_busqueda_banco.py', title=t('Búsqueda bancaria', 'Bank search'), icon=':material/account_balance:')],
    t('Consultas', 'Queries'): [
        st.Page('pages/buscar_polizas.py', title=t('Buscar pólizas', 'Find policies'), icon=':material/search:'),
        st.Page('pages/buscar_polizas_visual.py', title=t('Buscar pólizas · Created By', 'Find policies · Created By'), icon=':material/person_search:'),
        st.Page('pages/buscar_polizas_historico.py', title=t('Buscar en histórico', 'Search history'), icon=':material/history:'),
        st.Page('pages/buscar_codigos_franquicia.py', title=t('Buscar códigos', 'Search codes'), icon=':material/key:'),
        st.Page('pages/validar_polizas.py', title=t('Validar pólizas', 'Validate policies'), icon=':material/fact_check:')],
}, position='sidebar')
with st.sidebar, st.container(key='account_footer'):
    st.caption(st.session_state['system_user']['username'])
    st.button(t('Cerrar sesión', 'Sign out'), on_click=login_ui.cerrar_sesion, key='sign_out', width='stretch')
page.run()

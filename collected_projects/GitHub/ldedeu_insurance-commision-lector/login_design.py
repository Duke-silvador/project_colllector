"""Login construido con HTML, CSS y SVG; no contiene una captura de fondo."""
from idiomas import texto as t
import base64
import re


def render_vectors(markup):
    """Presenta SVG propios sin que el sanitizador HTML elimine sus trazos."""
    def vector(match):
        svg = match.group(0)
        svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1)
        classes = re.search(r'class="([^"]+)"', svg.split('>')[0])
        label = re.search(r'aria-label="([^"]+)"', svg.split('>')[0])
        encoded = base64.b64encode(svg.encode('utf-8')).decode('ascii')
        return '<img class="' + (classes.group(1) if classes else '') + '" alt="' + (label.group(1) if label else '') + '" src="data:image/svg+xml;base64,' + encoded + '" />'
    return re.sub(r'<svg\b.*?</svg>', vector, markup, flags=re.S)

CSS = '''
<style>
.stApp {background: #0c0d0f;}
.stMainBlockContainer {max-width: 1600px; padding: 20px 36px 32px !important;}
[data-testid="stSidebar"] {display: none;}
.st-key-login_layout {margin-top: 16px;}
.st-key-login_layout > [data-testid="stHorizontalBlock"] {gap: 54px; align-items: center;}
.st-key-login_card {background: linear-gradient(135deg,#fff,#f9fafc); border: 1px solid #e6e6e6;
    border-radius: 18px; padding: 38px 40px 30px; min-height: 760px;
    box-shadow: 0 28px 80px #0009; color:#111;}
.st-key-login_card h2,.st-key-login_card h3 {color:#111; text-align:center; font-size:32px; font-weight:700;
    letter-spacing:-1px; margin:20px 0 0; padding-bottom:0;}
.st-key-login_card [data-testid="stCaptionContainer"] {text-align:center; color:#6b7080; font-size:17px;}
.st-key-login_card [data-testid="stForm"] {border:0; padding:0; margin-top:26px;}
.st-key-login_card [data-testid="stTextInputRootElement"] {background:transparent; border:1px solid #cdd0d7;
    border-radius:10px; min-height:56px; box-shadow:none;}
.st-key-login_card input {color:#303642 !important; font-size:17px; background:transparent;}
.st-key-login_card input::placeholder {color:#767b87;}
.st-key-login_card [data-baseweb="input"] svg {color:#737885;}
.st-key-login_card [data-testid="stTextInputIcon"] {color:#737885;}
.st-key-login_card [data-testid="stTextInput"] {margin-bottom:8px;}
.st-key-login_card [data-testid="stFormSubmitButton"] button {background:#dc0710; color:white;
    border:0; border-radius:10px; height:58px; font-weight:650; font-size:19px;
    box-shadow:0 3px 6px #dc071020;}
.st-key-login_card [data-testid="stFormSubmitButton"] button:hover {background:#bf050d;}
.st-key-login_card [data-testid="stFormSubmitButton"] button p {font-size:19px; font-weight:650;}
.login-brand {text-align:center; margin:12px 0 24px;}
.login-brand img {width:210px; height:84px;}
.login-brand-name {font-size:clamp(27px,3vw,42px); font-weight:750; letter-spacing:-1.7px; color:#111; white-space:nowrap;}
.login-brand-name span {color:#db0710;}
.login-brand-tag {font-size:12px; color:#545966; letter-spacing:5px; margin-top:4px;}
.login-brand-tag b {color:#dc0710;}
.login-footer {border-top:1px solid #dbdde3; margin-top:76px; padding-top:30px;
    text-align:center; font-size:14px; color:#656b78;}
.login-hero {position:relative; overflow:visible; min-height:780px; color:white; font-family:Arial,sans-serif;}
.login-scene {position:absolute; top:0; left:-40px; width:calc(100% + 80px); height:100%; opacity:.83; overflow:hidden;}
.login-scene img {height:100%; width:100%; object-fit:cover;}
.login-hero::after {content:''; position:absolute; right:-36px; top:-90px; bottom:-60px; width:92px;
    background:linear-gradient(95deg,#ffe059 0%,#ffc819 15%,#df7014 30%,#aa0608 50%,#410000 73%,#070808 74%);
    clip-path:polygon(83% 0,100% 0,18% 100%,0 100%); pointer-events:none;}
.login-headline {position:relative; padding:30px 0 0 18px; font-size:clamp(42px,4.5vw,69px);
    line-height:1.04; font-weight:500; letter-spacing:-1px; z-index:1;}
.login-headline strong {color:#ffcc29; font-weight:750;}
.login-eyebrow {position:relative; padding:24px 0 0 22px; font-size:18px; letter-spacing:6px; color:#c5c5c7; z-index:1;}
.login-eyebrow b {color:#e10912; margin:0 12px;}
.login-flow {position:relative; margin-top:50px; height:380px; z-index:1;}
.login-wires {position:absolute; inset:0; width:100%; height:100%;}
.login-carriers {position:absolute; left:20px; top:0; width:30%; display:flex; flex-direction:column; gap:20px;}
.login-carrier {height:72px; background:linear-gradient(135deg,#242426db,#101113e8); border:1px solid #ffffff30;
    border-radius:12px; display:flex; align-items:center; gap:14px; padding:12px 16px;
    color:#f9f9fa; letter-spacing:1px; font-size:13px; box-shadow:0 6px 22px #0006;}
.login-carrier img {width:44px; height:42px; flex-shrink:0;}
.login-statement {position:absolute; left:51%; top:77px; width:23%; height:230px;
    background:linear-gradient(135deg,#222426ed,#0b0c0ef5); border:1px solid #ffffff36;
    border-radius:15px; padding:24px 18px; text-align:center; box-shadow:0 10px 28px #0008;}
.login-statement img {width:100%; height:142px;}
.login-statement p {font-size:14px; font-weight:650; letter-spacing:1.8px; margin-top:14px;}
.login-steps {position:absolute; left:78%; top:136px; color:#e4e4e6; font-size:11px; letter-spacing:1px;}
.login-steps div {display:flex; align-items:center; gap:9px; margin-bottom:18px;}
.login-check {border:1.5px solid #ffd027; color:#ffd027; width:24px; height:24px; border-radius:50%;
    display:inline-flex; align-items:center; justify-content:center; font-size:17px;}
.login-bottom {position:relative; padding:100px 0 24px 22px; font-size:18px; line-height:1.55; letter-spacing:6px; color:#ccc;}
.login-bottom strong {color:#ffcc28;}
.login-headline {font-size:clamp(38px,4.4vw,66px); font-weight:700; padding-top:28px; white-space:nowrap;}
.login-eyebrow {font-size:14px; letter-spacing:4px; padding-top:18px;}
.login-eyebrow b {margin:0 9px;}
.login-subtitle {position:relative; padding:24px 0 0 22px; color:#e6e6e8; font-size:19px;}
.login-flow {margin-top:60px; height:360px;}
.login-carriers {left:20px; top:0; width:27%; gap:28px;}
.login-carrier {height:80px; font-size:17px; letter-spacing:0; border-left:9px solid #e20712; padding:12px;}
.login-carrier:nth-child(2) {border-left-color:#ffcf28;}
.login-carrier img {width:48px; height:48px;}
.login-statement {left:49%; top:40px; width:28%; height:280px; padding:0; background:none; border:none; box-shadow:none;}
.login-paper {position:absolute; top:14px; left:0; width:85%; height:244px; background:linear-gradient(115deg,#fff,#cececf);
    border-radius:5px; padding:22px 17px; transform:rotate(3deg); box-shadow:0 8px 18px #0009; color:#151618; text-align:left;}
.login-paper:nth-child(1) {top:-15px; left:48px; opacity:.62;}
.login-paper:nth-child(2) {top:-4px; left:30px; opacity:.8;}
.login-paper:nth-child(3) {top:5px; left:14px; opacity:.92;}
.login-paper h4 {font-size:17px; margin:0 0 18px; font-weight:750; letter-spacing:.5px;}
.login-paper-lines {height:83px; background:repeating-linear-gradient(to bottom,#999a9b70 0px,#999a9b70 5px,transparent 5px,transparent 11px);}
.login-paper-chart {margin-top:20px; display:flex; align-items:flex-end; justify-content:flex-end; gap:6px; height:48px;}
.login-paper-chart span {display:block; width:12px; background:#e20a14; height:20px;}
.login-paper-chart span:nth-child(2) {height:30px;}
.login-paper-chart span:nth-child(3) {height:45px; background:#151618;}
.login-paper-chart span:nth-child(4) {height:37px; background:#ffb814;}
.login-paper-chart span:nth-child(5) {height:54px; background:#ffd128;}
.login-glow-frame {position:absolute; left:-8px; top:-24px; width:calc(100% + 12px); height:296px;
    border:1px solid #ffd021; border-bottom-color:#e50b12; box-shadow:0 -3px 14px #ffd02135,0 8px 18px #e50b1240; border-radius:10px; transform:rotate(4deg);}
.login-steps {left:83%; top:63px; font-size:13px; letter-spacing:0;}
.login-steps div {margin-bottom:28px; gap:10px; line-height:1.5;}
.login-check {width:40px; height:40px; font-size:27px; flex-shrink:0;}
.login-bottom {padding-top:20px; font-size:13px; text-align:center; letter-spacing:4px; line-height:1.9;}
.login-bottom-bars {display:flex; justify-content:center; gap:8px; margin-top:16px;}
.login-bottom-bars i {height:3px; width:56px; background:#e20712; border-radius:3px;}
.login-bottom-bars i:nth-child(2) {width:34px; background:#ffcf28;}
.login-bottom-bars i:nth-child(3) {background:#63666c;}
.login-hero::after {width:160px; background:linear-gradient(95deg,#ffdc36,#fbb71d 23%,#e20b0f 25%,#930006 65%,#26080b); clip-path:polygon(0 0,30% 0,100% 45%,100% 57%,15% 100%,0 100%,75% 50%);}
@media (max-width:1100px) {
 .st-key-login_card {padding:28px 24px; min-height:700px;}
 .login-carrier {padding:10px; gap:8px; font-size:10px;}
 .login-eyebrow {font-size:12px; letter-spacing:3px;}
 .login-steps {font-size:9px;}
 .login-brand-tag {letter-spacing:3px; font-size:10px;}
}
@media (max-width:750px) {
 .stMainBlockContainer {padding:16px !important;}
 .st-key-login_layout > [data-testid="stHorizontalBlock"] {flex-direction:column; gap:24px;}
 .st-key-login_layout > [data-testid="stHorizontalBlock"] > [data-testid="stColumn"] {width:100% !important; flex:1 1 auto !important;}
 .login-hero {min-height:220px;}
 .login-headline {font-size:40px; padding-top:0;}
 .login-headline {white-space:normal;}
 .login-subtitle {font-size:15px; padding-top:16px;}
 .login-eyebrow {font-size:10px; letter-spacing:2px;}
 .login-flow,.login-bottom {display:none;}
 .login-hero::after {display:none;}
 .st-key-login_card {min-height:600px; padding:28px;}
 .login-footer {margin-top:48px;}
}
</style>
'''

LOGO = '''<svg viewBox="0 0 240 90" role="img" aria-label="CarrierStatements logo">
<path fill="#e20712" d="M7 80 69 5h43L54 80z"/><path fill="#111" d="m69 5 62 75h43L112 5z"/>
<path fill="#ffad16" d="m128 5 62 75h34L162 5z"/><path fill="#ffd029" d="m181 15 48 65h20l-48-65z"/>
</svg>'''

ICONS = {
    'Auto': '<svg viewBox="0 0 64 48"><g fill="none" stroke="#eee" stroke-width="3"><path d="m6 34 0-14 9-4 8-10h24l8 11 6 4v13H6zm12-17h36M29 6v11"/><circle cx="17" cy="34" r="6" fill="#17181a"/><circle cx="50" cy="34" r="6" fill="#17181a"/></g></svg>',
    'Home': '<svg viewBox="0 0 64 64"><g fill="none" stroke="#eee" stroke-width="4"><path d="m5 28 27-24 27 24M13 22v35h38V22M26 57V36h13v21"/></g></svg>',
    'Commercial': '<svg viewBox="0 0 64 64"><g fill="none" stroke="#eee" stroke-width="3"><path d="M15 59V4h36v55H6V32h9M28 59V45h12v14M23 14h5v5h-5zm15 0h5v5h-5zM23 29h5v5h-5zm15 0h5v5h-5z"/></g></svg>',
}

SCENE = '''<svg viewBox="0 0 900 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="wall" x2="1" y2="1"><stop stop-color="#080a0c"/><stop offset=".65" stop-color="#16181b"/><stop offset="1" stop-color="#08090b"/></linearGradient>
<linearGradient id="desk" x2="0" y2="1"><stop stop-color="#2b2826"/><stop offset="1" stop-color="#08090b"/></linearGradient>
<linearGradient id="laptop" x2="0" y2="1"><stop stop-color="#74767a"/><stop offset=".35" stop-color="#25282c"/><stop offset="1" stop-color="#080a0d"/></linearGradient>
<radialGradient id="warm"><stop stop-color="#b66e1a" stop-opacity=".35"/><stop offset="1" stop-color="#141516" stop-opacity="0"/></radialGradient>
<filter id="soft"><feGaussianBlur stdDeviation="8"/></filter></defs>
<rect width="900" height="900" fill="url(#wall)"/>
<path d="M-90 265Q140 130 240-80M475 378Q1040 268 918-44" fill="none" stroke="#ffffff" stroke-opacity=".04" stroke-width="20"/>
<path d="M-90 257Q140 122 232-80" fill="none" stroke="#686a70" stroke-opacity=".22"/>
<path d="m0 730 380-62 520 56v176H0z" fill="url(#desk)"/>
<ellipse cx="170" cy="801" rx="220" ry="130" fill="url(#warm)"/>
<g filter="url(#soft)" opacity=".32" fill="#557425"><ellipse cx="14" cy="410" rx="21" ry="99" transform="rotate(-20 14 410)"/><ellipse cx="46" cy="396" rx="16" ry="70" transform="rotate(34 46 396)"/><ellipse cx="12" cy="462" rx="28" ry="68"/></g>
<path d="m-5 506 75 12 117 310 462 18 22 26-475 29L71 862z" fill="url(#laptop)" stroke="#65666a" stroke-opacity=".38" stroke-width="3"/>
<path d="m-5 506 67 18 115 306-83 11z" fill="#07090b"/>
<path d="m108 844 113-1 340 17-22 9-410-4z" fill="#292c30"/>
<g stroke="#aaa" stroke-opacity=".18"><path d="m148 844 245 12m-254-7 236 12m-230-8 213 12m-218-10 186 11m-142-25 11 22m24-20 8 21m28-19 6 21m26-19 5 20m26-18 4 20"/></g>
<path d="m690 814 124-25 86 20v35l-80 16z" fill="#101215" stroke="#ffffff" stroke-opacity=".12"/>
<path d="m760 792 88-10 13 8-86 10z" fill="#777a80"/>
<rect width="900" height="900" fill="#050607" opacity=".28"/>
</svg>'''


def hero():
    categories = ''.join(f'<div class="login-carrier">{ICONS[name]}<span>{t("Hogar", "Home") if name == "Home" else t("Comercial", "Commercial") if name == "Commercial" else "Auto"}</span></div>' for name in ICONS)
    papers = ''.join('<div class="login-paper"><h4>STATEMENT</h4><div class="login-paper-lines"></div><div class="login-paper-chart"><span></span><span></span><span></span><span></span><span></span></div></div>' for _ in range(4))
    return f'''<section class="login-hero">
    <div class="login-scene">{SCENE}</div>
    <div class="login-headline">{t('Estados de', 'Carrier')} <strong>{t('comisiones', 'Statements')}</strong></div>
    <div class="login-eyebrow">{t('DATOS', 'DATA')} <b>•</b> {t('AUTOMATIZACIÓN', 'AUTOMATION')} <b>•</b> {t('PRECISIÓN', 'ACCURACY')} <b>•</b> {t('RESULTADOS', 'RESULTS')}</div>
    <div class="login-subtitle">{t('Múltiples carriers. Todos tus statements en un solo lugar.', 'Multiple carriers. All your statements in one place.')}</div>
    <div class="login-flow">
    <svg class="login-wires" viewBox="0 0 700 360" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" stroke-width="3"><path d="M187 40C270 40 249 140 324 140H360" stroke="#e20712"/>
    <path d="M187 148C268 148 264 178 324 178H360" stroke="#ffd027"/>
    <path d="M187 256C272 256 253 215 324 215H360" stroke="#e20712"/></g>
    <g fill="#e20712"><circle cx="345" cy="140" r="4"/><circle cx="345" cy="215" r="4"/></g><circle cx="345" cy="178" r="4" fill="#ffd027"/></svg>
    <div class="login-carriers">{categories}</div>
    <div class="login-statement"><div class="login-glow-frame"></div>{papers}</div>
    <div class="login-steps"><div><span class="login-check">ϟ</span>{t('Procesa<br>más rápido', 'Process<br>Faster')}</div>
    <div><span class="login-check">✓</span>{t('Reduce<br>errores', 'Reduce<br>Errors')}</div>
    <div><span class="login-check">▥</span>{t('Obtén<br>resultados', 'Get<br>Results')}</div></div>
    </div><div class="login-bottom">{t('SIMPLIFICA TUS STATEMENTS', 'STREAMLINE YOUR STATEMENTS')}<br>{t('IMPULSA TU NEGOCIO', 'EMPOWER YOUR BUSINESS')}
    <div class="login-bottom-bars"><i></i><i></i><i></i></div></div></section>'''


def brand():
    return f'''<div class="login-brand">{LOGO}<div class="login-brand-name">{t('Estados de ', 'Carrier')}<span>{t('comisiones', 'Statements')}</span></div>
    <div class="login-brand-tag">{t('ESTADOS', 'STATEMENTS')} <b>•</b> {t('INFORMACIÓN', 'INSIGHTS')} <b>•</b> {t('OPORTUNIDADES', 'OPPORTUNITIES')}</div></div>'''


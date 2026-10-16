"""Ayudas de presentación (sin IA): etiquetas automáticas de noticias y glosario en tarjetas."""
import html
import re
import unicodedata

# ---------------------------------------------------------------- noticias: etiquetas por palabras clave
# Cada etiqueta busca estas palabras en el titular y el resumen (sin tildes y en minúsculas). Se amplían editando esta lista.
ETIQUETAS = {
    "🇪🇺 Europa": r"\b(europa|europe|europea?s?|ue|eu|bce|ecb|mica|esma|eurozona|euro ?zone|bruselas|brussels|espana|spain|cnmv|banco de espana|bundesbank|lagarde)\b",
    "🇺🇸 EE. UU.": r"\b(sec|cftc|fed|reserva federal|eeuu|ee\. ?uu\.?|estados unidos|u\.s\.|us|senado|senate|congreso|congress|washington|tesoro|treasury|trump|powell|clarity|genius)\b",
    "🇨🇳 Asia y BRICS": r"\b(china|chino|hong kong|japon|japan|corea|korea|india|brics|asia|singapur|singapore|yuan|pboc)\b",
    "⚖️ Regulación": r"\b(regulacion|regulatori[oa]s?|regulat\w*|ley|leyes|law|bill|normativa|licencia|license|supervis\w*|demanda|lawsuit|tribunal|court|juez|judge|cumplimiento|compliance|marco legal)\b",
    "🏦 Bancos centrales y tipos": r"\b(fed|bce|ecb|banco central|tipos de interes|rate cut|rate hike|interest rates?|inflacion|inflation|ipc|cpi|pce|fomc|powell|lagarde)\b",
    "🛢️ Energía y geopolítica": r"\b(petroleo|brent|crudo|opep|opec|ormuz|hormuz|iran|guerra|war|sanciones?|sanctions?|ucrania|ukraine|oriente medio|middle east|gas natural)\b",
    "🥇 Materias primas": r"\b(oro|gold|plata|silver|cobre|copper|materias primas|commodit\w*)\b",
    "₿ Bitcoin y ETFs": r"\b(bitcoin|btc|etf|etfs|ether|ethereum|eth|solana)\b",
    "🪙 XRP, Ripple y Stellar": r"\b(xrp|ripple|xrpl|stellar|xlm|swell|garlinghouse|rlusd)\b",
}


def _norm(t):
    t = unicodedata.normalize("NFKD", str(t).lower())
    return "".join(c for c in t if not unicodedata.combining(c))


_PATRONES = {k: re.compile(v) for k, v in ETIQUETAS.items()}


def etiquetar(titulo, resumen="", tema=""):
    """Lista de etiquetas que encajan con la noticia (puede ser más de una)."""
    texto = _norm(f"{titulo} {resumen} {tema}")
    return [k for k, p in _PATRONES.items() if p.search(texto)]


# ---------------------------------------------------------------- glosario en tarjetas
ESTILO_GLOSARIO = """
<style>
.gl-letra {color:#60a5fa; font-weight:700; font-size:1.1rem; margin:18px 0 6px; padding-bottom:4px; border-bottom:1px solid #262c3a;}
.gl-grid {display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:10px;}
.gl-card {background:#151921; border:1px solid #262c3a; border-radius:12px; padding:10px 14px;}
.gl-term {color:#e5e7eb; font-weight:700; font-size:1rem; margin-bottom:3px;}
.gl-def {color:#94a3b8; font-size:0.88rem; line-height:1.45;}
.gl-def b {color:#cbd5e1;}
.gl-idx {display:flex; flex-wrap:wrap; gap:6px; margin:6px 0 4px;}
.gl-idx a {background:#151921; border:1px solid #262c3a; border-radius:8px; padding:3px 9px; color:#93c5fd; text-decoration:none; font-weight:600; font-size:0.85rem;}
</style>
"""


def _mayus(t):
    t = t.strip()
    return t[:1].upper() + t[1:] if t else t


def _inline(t):
    """Texto de un apunte a HTML seguro: escapa todo y convierte **negrita** y `código`."""
    t = html.escape(t)
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    return t


def html_glosario(lista):
    """lista: [{'concepto','definicion'}...] ya ordenada. Devuelve HTML con índice de letras y una tarjeta por concepto."""
    por_letra = {}
    for c in lista:
        termino = _mayus(c["concepto"])
        letra = _norm(termino[:1]).upper() or "#"
        letra = letra if letra.isalpha() else "#"
        por_letra.setdefault(letra, []).append((termino, _mayus(c["definicion"])))
    indice = "".join(f"<a href='#gl-{l}'>{l}</a>" for l in por_letra)
    cuerpo = []
    for letra, items in por_letra.items():
        tarjetas = "".join(f"<div class='gl-card'><div class='gl-term'>{html.escape(t)}</div>"
                           f"<div class='gl-def'>{_inline(d) if d else '<i>Sin definición</i>'}</div></div>" for t, d in items)
        cuerpo.append(f"<div class='gl-letra' id='gl-{letra}'>{letra}</div><div class='gl-grid'>{tarjetas}</div>")
    return f"<div class='gl-idx'>{indice}</div>" + "".join(cuerpo)

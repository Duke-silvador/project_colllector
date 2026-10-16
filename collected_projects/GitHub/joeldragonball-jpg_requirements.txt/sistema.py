"""Pestaña «Sistema»: comprueba de un vistazo que los bots corren, cuánto llevas gastado y que las fuentes de datos responden.
Todo con datos públicos y comprobables (API pública de GitHub, rama «datos» y las APIs de precios); no usa IA."""
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import pandas as pd
import requests
import streamlit as st

REPO = "joeldragonball-jpg/requirements.txt"
# archivo del workflow, nombre, horas máximas razonables sin ejecutarse (GitHub retrasa o salta algunas ejecuciones)
WORKFLOWS = [
    ("alertas.yml", "Alertas de precio", 2.5),
    ("noticias.yml", "Noticias con IA", 3.0),
    ("votos.yml", "Votos de noticias", 2.0),
    ("onchain.yml", "Vigilancia on-chain", 2.5),
    ("escrow.yml", "Escrow de Ripple", 30),
    ("eventos.yml", "Aviso de eventos", 30),
    ("despertador.yml", "Despertador de la app", 8),
    ("revision.yml", "Revisión semanal del cerebro", 24 * 8),
    ("verificar.yml", "Verificación mensual", 24 * 35),
]


def _cabeceras():
    cab = {"Accept": "application/vnd.github+json", "User-Agent": "cartera-app"}
    try:
        token = st.secrets.get("GITHUB_TOKEN")
        if token:
            cab["Authorization"] = f"Bearer {token}"
    except Exception:
        pass
    return cab


_CACHE_WF = {}   # archivo -> (momento, datos). Solo se guardan respuestas buenas: un error (p. ej. límite de GitHub) no se queda 15 min
_TTL_WF = 900


def estado_workflows():
    """Último resultado de cada workflow. Una sola consulta por workflow cada 15 min (el límite sin token es de 60 por hora)."""
    def uno(w):
        archivo = w[0]
        hit = _CACHE_WF.get(archivo)
        if hit and time.time() - hit[0] < _TTL_WF:
            return archivo, hit[1]
        try:
            r = requests.get(f"https://api.github.com/repos/{REPO}/actions/workflows/{archivo}/runs",
                             params={"per_page": 10, "status": "completed"}, headers=_cabeceras(), timeout=12)
            if r.status_code in (403, 429):
                return archivo, {"error": "límite de consultas de GitHub (se reintenta en unos minutos)"}
            r.raise_for_status()
            # las ejecuciones canceladas (por «concurrency», porque llegó otra más nueva) o saltadas no son un fallo
            runs = [x for x in r.json().get("workflow_runs", [])
                    if x.get("status") == "completed" and x.get("conclusion") not in ("cancelled", "skipped")]
            if not runs:
                return archivo, {"error": "sin ejecuciones todavía"}
            ultimo = runs[0]
            ok = next((x for x in runs if x.get("conclusion") == "success"), None)
            datos = {"conclusion": ultimo.get("conclusion"), "cuando": ultimo.get("updated_at"), "url": ultimo.get("html_url"),
                     "ok_cuando": ok.get("updated_at") if ok else None}
            _CACHE_WF[archivo] = (time.time(), datos)
            return archivo, datos
        except Exception as e:
            return archivo, {"error": str(e)[:80]}
    with ThreadPoolExecutor(max_workers=5) as ex:
        return dict(ex.map(uno, WORKFLOWS))


def _hace(iso):
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    s = (datetime.now(timezone.utc) - dt).total_seconds()
    if s < 3600:
        return f"hace {max(int(s // 60), 1)} min", s / 3600
    if s < 86400:
        return f"hace {s / 3600:.1f} h", s / 3600
    return f"hace {s / 86400:.1f} días", s / 3600


def resumen_bots():
    """(bots_con_problema, bots_sin_dato) para la línea de estado de la cabecera. Usa la misma caché de 15 min que la pestaña Sistema."""
    problemas, sin_dato = [], 0
    estados = estado_workflows()
    for archivo, nombre, tolerancia in WORKFLOWS:
        e = estados.get(archivo, {})
        if e.get("error"):
            sin_dato += 1
        elif e["conclusion"] != "success" or _hace(e["cuando"])[1] > tolerancia:
            problemas.append(nombre)
    return problemas, sin_dato


@st.cache_data(ttl=300, show_spinner=False)
def fuentes_en_vivo():
    """Comprueba que responden las fuentes de las que depende la app y mide cuánto tardan."""
    pruebas = {
        "Kraken (precios cripto)": ("GET", "https://api.kraken.com/0/public/Ticker?pair=XRPEUR", None),
        "Yahoo Finance (watchlist)": ("GET", "https://query1.finance.yahoo.com/v8/finance/chart/VUSA.AS?range=5d&interval=1d", None),
        "XRP Ledger (nodo público)": ("POST", "https://xrplcluster.com/", {"method": "server_info", "params": [{}]}),
        "Stellar (Horizon)": ("GET", "https://horizon.stellar.org/ledgers?order=desc&limit=1", None),
        "GitHub (datos del bot)": ("GET", f"https://raw.githubusercontent.com/{REPO}/datos/noticias/noticias.json", None),
    }

    def uno(item):
        nombre, (metodo, url, cuerpo) = item
        t0 = time.time()
        try:
            r = requests.request(metodo, url, json=cuerpo, headers={"User-Agent": "Mozilla/5.0"}, timeout=12)
            return nombre, (r.ok, time.time() - t0, None if r.ok else f"HTTP {r.status_code}")
        except Exception as e:
            return nombre, (False, time.time() - t0, str(e)[:60])
    with ThreadPoolExecutor(max_workers=5) as ex:
        return dict(ex.map(uno, pruebas.items()))


def _gasto_mes():
    import cerebro   # reutiliza el cálculo de coste que ya usa la pestaña Consumo IA
    regs = cerebro.cargar_uso()
    if not regs:
        return None
    df = pd.DataFrame(regs)
    df["fecha"] = pd.to_datetime(df["fecha"], utc=True).dt.tz_convert("Europe/Madrid")
    df["coste"] = df.apply(cerebro.coste, axis=1)
    ahora = pd.Timestamp.now(tz="Europe/Madrid")
    mes = df[df["fecha"] >= ahora.normalize().replace(day=1)]
    return float(mes["coste"].sum()), float(df[df["fecha"] >= ahora.normalize()]["coste"].sum()), cerebro.euros_por_dolar()


def mostrar(tope_usd=12.0):
    st.caption("Comprobaciones automáticas con datos públicos: sirven para saber de un vistazo si los bots y las fuentes funcionan. "
               "Si algo falla, aquí lo verás antes de que te falte un aviso.")
    estados = estado_workflows()
    filas, problemas = [], []
    for archivo, nombre, tolerancia in WORKFLOWS:
        e = estados.get(archivo, {})
        if e.get("error"):
            filas.append((nombre, "❔", e["error"], ""))
            continue
        cuando, horas = _hace(e["cuando"])
        if e["conclusion"] != "success":
            icono, nota = "❌", f"el último resultado fue «{e['conclusion']}»"
            problemas.append(nombre)
        elif horas > tolerancia:
            icono, nota = "⚠️", "lleva más tiempo del esperado sin ejecutarse"
            problemas.append(nombre)
        else:
            icono, nota = "✅", "en orden"
        filas.append((nombre, icono, f"{cuando} · {nota}", e.get("url", "")))

    if problemas:
        st.warning("Revisa: " + ", ".join(problemas) + ". Un fallo suelto suele ser pasajero (GitHub a veces retrasa o salta ejecuciones); "
                   "si se repite, avísame.")
    elif all(f[1] != "❔" for f in filas):
        st.success("Todos los bots han corrido dentro de lo esperado.")
    st.markdown("**Bots (GitHub Actions)**")
    for nombre, icono, texto, url in filas:
        enlace = f" · [ver]({url})" if url else ""
        st.markdown(f"{icono} **{nombre}** — {texto}{enlace}")

    st.markdown("**Fuentes de datos (en vivo)**")
    for nombre, (ok, seg, err) in fuentes_en_vivo().items():
        st.markdown(f"{'✅' if ok else '❌'} {nombre} — " + (f"responde en {seg:.1f} s" if ok else f"no responde ({err})"))

    st.markdown("**Gasto de IA este mes**")
    try:
        g = _gasto_mes()
    except Exception:
        g = None
    if g is None:
        st.info("Todavía no hay consumo registrado o no se pudo leer.")
    else:
        mes, hoy, eur = g
        c = st.columns(3)
        c[0].metric("Este mes", f"{mes:,.2f} $".replace(".", ","), help=f"≈ {mes * eur:,.2f} €".replace(".", ","))
        c[1].metric("Hoy", f"{hoy:,.2f} $".replace(".", ","))
        c[2].metric("Tope mensual del bot", f"{tope_usd:,.0f} $")
        st.progress(min(mes / tope_usd, 1.0), text=f"{mes / tope_usd:.0%} del tope")
    st.caption("Las ejecuciones se consultan cada 15 minutos y las fuentes cada 5. No incluye lo que gastas en tu suscripción de Claude: "
               "solo la API que usan los bots.")

"""🧠 Cerebro: tus apuntes (archivos .md de la carpeta cerebro/) convertidos en
biblioteca, glosario, datos, mapa y un chat con IA que responde con tu propia información."""
import base64
import hmac
import html as html_lib
import json
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st

CARPETA = Path(__file__).parent / "cerebro"
DOSSIERS = Path(__file__).parent / "informes" / "dossiers"   # investigaciones profundas, fuera de cerebro/ a propósito (no entran en el chat)
MODELO = "claude-sonnet-5-5"
REPO = "joeldragonball-jpg/requirements.txt"
RAW_DATOS = f"https://raw.githubusercontent.com/{REPO}/datos"   # rama 'datos': noticias y registro de uso
# Tarifa oficial en $ por millón de tokens: entrada, salida, lectura de caché, escritura de caché (5 min)
PRECIOS = {
    "claude-opus-5-5": (4.0, 20.0, 0.20, 5.0),
    "claude-sonnet-5-5": (2.0, 10.0, 0.20, 2.5),
    "claude-haiku-4-5": (1.0, 5.0, 0.10, 1.25),
}


# ---------------------------------------------------------------- utilidades
_REFS = None


def _referencias():
    """Frases de los apuntes marcadas a mano como «de referencia» (cerebro/revisiones_manuales.json)."""
    global _REFS
    if _REFS is None:
        try:
            datos = json.loads((CARPETA / "revisiones_manuales.json").read_text(encoding="utf-8")).get("revisiones", [])
        except Exception:
            datos = []
        _REFS = [m["texto"] for m in datos if m.get("estado") == "referencia" and m.get("texto")]
    return _REFS


def _caja(texto):
    """Cuadrito (código en línea) con el texto sin barras de escape de '$'."""
    return "`" + texto.replace("\\$", "$").replace("`", "'").strip() + "`"


def md(texto):
    """Prepara texto para st.markdown: '$' no es fórmula; [VERIFICAR] y [ESPECULACIÓN] salen como cuadritos discretos
    («referencia» y «opinión») en la misma frase, y las frases marcadas como de referencia llevan su cuadrito al final."""
    texto = texto.replace("$", r"\$")
    refs = _referencias()
    if refs:
        texto = "\n".join(l + " " + _caja("📌 referencia, sin confirmar") if "📌" not in l and "[VERIFICAR" not in l and any(r in l for r in refs) else l
                          for l in texto.split("\n"))
    texto = re.sub(r"\[ESPECULACI[OÓ]N([^\]]*)\]",
                   lambda m: _caja("💭 opinión" + (m.group(1) if m.group(1).strip() else "")), texto)
    return re.sub(r"\[VERIFICAR(?::?\s*([^\]]*))?\]",
                  lambda m: _caja("📌 referencia" + (": " + m.group(1).strip() if m.group(1) and m.group(1).strip() else ", sin confirmar")),
                  texto)


def enlace(titulo, url):
    """Enlace Markdown seguro con texto que viene de internet: sin HTML y solo direcciones http(s)."""
    texto = html_lib.escape(str(titulo)).replace("$", r"\$").replace("[", "(").replace("]", ")")
    url = str(url or "")
    if not url.startswith(("https://", "http://")):
        return texto
    return f"[{texto}]({url.replace('(', '%28').replace(')', '%29').replace(' ', '%20')})"


def normalizar(texto):
    """Minúsculas y sin tildes, para buscar 'regulacion' y encontrar 'regulación'."""
    return "".join(c for c in unicodedata.normalize("NFD", texto.lower()) if unicodedata.category(c) != "Mn")


def dividir(texto, patron):
    """Divide un texto por encabezados (### Título o **Título**) → [(título, contenido)]."""
    partes = re.split(patron, texto, flags=re.M)
    bloques = [("General", partes[0].strip())] if partes[0].strip() else []
    bloques += [(partes[i].strip(), partes[i + 1].strip()) for i in range(1, len(partes) - 1, 2)]
    return bloques


def subsecciones(texto):
    return dividir(texto, r"^###\s+(.+)$")


def grupos_negrita(texto):
    """Grupos que empiezan con una línea en negrita, p. ej. '**Europa**' o '**Macro 2026** (nota)'."""
    return [(t.replace("**", "").strip(), c) for t, c in dividir(texto, r"^(\*\*[^*\n]+\*\*[^\n]*)$")]


# ---------------------------------------------------------------- lectura de apuntes
@st.cache_data(ttl=600, show_spinner=False)
def cargar_apuntes():
    docs = []
    # Tus apuntes principales, lo que envías al bot (documentos) y la actualidad semanal (lo más reciente primero)
    for p in (sorted(CARPETA.glob("*.md")) + sorted(CARPETA.glob("documentos/*.md"), reverse=True)
              + sorted(CARPETA.glob("actualidad/*.md"), reverse=True)):
        texto = p.read_text(encoding="utf-8")
        meta, cuerpo = {}, texto
        m = re.match(r"^---\s*\n(.*?)\n---\s*\n", texto, re.S)
        if m:
            for linea in m.group(1).splitlines():
                if ":" in linea:
                    clave, valor = linea.split(":", 1)
                    valor = valor.strip()
                    if valor.startswith("[") and valor.endswith("]"):
                        valor = [x.strip() for x in valor[1:-1].split(",") if x.strip()]
                    meta[clave.strip()] = valor
            cuerpo = texto[m.end():]
        titulo, actual, secciones = meta.get("tema", p.stem), None, {}
        for linea in cuerpo.splitlines():
            if linea.startswith("# "):
                titulo = linea[2:].strip()
            elif linea.startswith("## "):
                actual = linea[3:].strip()
                secciones[actual] = []
            elif actual:
                secciones[actual].append(linea)
        docs.append({"archivo": str(p.relative_to(CARPETA)), "titulo": titulo, "meta": meta, "texto": cuerpo,
                     "secciones": {k: "\n".join(v).strip() for k, v in secciones.items()}})
    return docs


@st.cache_data(ttl=300, show_spinner=False)
def cargar_json_datos(ruta):
    """Lee un archivo JSON de la rama 'datos' (noticias, verificaciones, uso)."""
    marca = int(datetime.now().timestamp() // 120)  # evita la caché de GitHub
    try:
        r = requests.get(f"{RAW_DATOS}/{ruta}?t={marca}", timeout=10)
        return r.json() if r.ok else {}
    except Exception:
        return {}


def noticias_recientes(dias=30):
    """Noticias de los últimos días que no marcaste como 👎 (las que alimentan el cerebro)."""
    limite = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
    lista = cargar_json_datos("noticias/noticias.json").get("noticias", [])
    return sorted((n for n in lista if n.get("fecha_envio", "") >= limite and n.get("valoracion") != -1),
                  key=lambda n: n["fecha_envio"], reverse=True)


def seccion(doc, prefijo):
    """Busca una sección por el principio de su nombre ('cifras' → 'Cifras y datos importantes')."""
    for nombre, texto in doc["secciones"].items():
        if normalizar(nombre).startswith(normalizar(prefijo)):
            return texto
    return ""


def conceptos(docs):
    out = []
    for d in docs:
        for linea in seccion(d, "conceptos").splitlines():
            m = re.match(r"^\s*[-*]\s+\*\*(.+?)\*\*\s*:?\s*(.*)$", linea)
            if m:
                out.append({"concepto": m.group(1).strip(), "definicion": m.group(2).strip(), "doc": d["titulo"]})
    return sorted(out, key=lambda c: normalizar(c["concepto"]))


def fragmentos(docs):
    """Párrafos y viñetas sueltos con su ubicación, para el buscador."""
    out = []
    for d in docs:
        for nombre, texto in d["secciones"].items():
            for sub, cuerpo in subsecciones(texto):
                ruta = nombre if sub == "General" else f"{nombre} › {sub}"
                for trozo in re.split(r"\n(?=\s*[-*] |\s*\d+\. |\|)|\n\s*\n", cuerpo):
                    if trozo.strip():
                        out.append({"doc": d["titulo"], "ruta": ruta, "texto": trozo.strip()})
    return out


# ---------------------------------------------------------------- pantalla
INSTRUCCIONES_VACIO = """
Todavía no hay apuntes. Para añadirlos:
1. Prepara un archivo **.md** con el formato de siempre (resumen, explicación, conceptos, cifras…).
2. En GitHub, entra en la carpeta **`cerebro`** de tu repositorio → **Add file → Upload files** y arrástralo.
3. En un par de minutos aparecerá aquí.
"""


def mostrar():
    docs = cargar_apuntes()
    st.markdown("<h1 style='margin:0 0 8px;font-size:clamp(1.6rem,5vw,2.2rem);font-weight:700'>🧠 Mi Cerebro</h1>",
                unsafe_allow_html=True)
    if not docs:
        st.info(INSTRUCCIONES_VACIO)
        return

    todos_conceptos = conceptos(docs)
    verif = cargar_json_datos("cerebro/verificaciones.json").get("resultados", {})
    # Solo los datos que siguen escritos en tus apuntes (si ya los corregiste, desaparecen de aquí)
    texto_apuntes = "\n".join(d["texto"] for d in docs)
    verif = {k: v for k, v in verif.items() if v.get("texto", "")[:80] in texto_apuntes}
    # Revisiones hechas a mano con fuentes (cerebro/revisiones_manuales.json): sustituyen el estado de la verificación automática
    try:
        manuales = json.loads((CARPETA / "revisiones_manuales.json").read_text(encoding="utf-8")).get("revisiones", [])
    except Exception:
        manuales = []
    for k, v in list(verif.items()):
        for m in manuales:
            if m.get("texto") and m["texto"] in v.get("texto", ""):
                verif[k] = {**v, "estado": m["estado"], "explicacion": m.get("explicacion", ""),
                            "dato_actual": f"(Revisado a mano el 7-oct-2026. Fuente: {m.get('fuente', '—')})"}
                break
    n_temas = sum(len(subsecciones(seccion(d, "explicaci"))) for d in docs)
    principales = [d for d in docs if "/" not in d["archivo"] and "\\" not in d["archivo"]]
    semanas = sum(1 for d in docs if d["archivo"].startswith("actualidad"))
    enviados = sum(1 for d in docs if d["archivo"].startswith("documentos"))
    import html as _h

    def tarjeta(etiqueta, valor, ayuda="", color=None):
        estilo = f" style='color:{color}'" if color else ""
        titulo = f" title='{_h.escape(ayuda, quote=True)}'" if ayuda else ""
        return f"<div class='kpi'{titulo}><div class='lbl'>{etiqueta}</div><div class='val'{estilo}>{valor}</div></div>"

    if verif:
        pend = sum(1 for v in verif.values() if v.get("estado") in ("sin resolver", "corregido"))
        n_ref = sum(1 for v in verif.values() if v.get("estado") == "referencia")
        if pend:
            t_rev = tarjeta("⚠️ Datos por revisar", pend, "Datos corregidos o sin resolver tras la verificación automática. "
                            "Detalle en 'Dudas'.", "#f59e0b")
        else:
            t_rev = tarjeta("📌 Datos de referencia", n_ref, "Ejemplos y datos de contexto que no se han podido contrastar con "
                            "una fuente accesible: sirven de orientación, no como cifra exacta. Detalle en 'Dudas'.")
    else:
        pend = sum(d["texto"].count("[VERIFICAR") for d in docs)
        t_rev = tarjeta("⚠️ Datos a verificar", pend, "", "#f59e0b" if pend else None)
    pie = " · ".join(f"{_h.escape(d['titulo'])} (actualizado {_h.escape(str(d['meta'].get('actualizado', '—')))})" for d in principales)
    pie += (f" · {enviados} documento(s) enviados al bot" if enviados else "") + (f" · {semanas} semana(s) de actualidad" if semanas else "")
    st.markdown("<div class='kpis'>" + tarjeta("📄 Documentos", len(docs)) + tarjeta("📚 Bloques temáticos", n_temas)
                + tarjeta("🔤 Conceptos", len(todos_conceptos)) + t_rev + f"</div><div class='meta'>{pie}</div>",
                unsafe_allow_html=True)

    buscar = st.text_input("🔎 Buscar en todos tus apuntes", placeholder="p. ej. LTV, Modelo 721, Ormuz, FIFO…")
    if buscar.strip():
        mostrar_busqueda(docs, buscar.strip())

    # Menú de losetas (mismo estilo que el de la cartera); solo se ejecuta el apartado elegido
    def dudas_y_chat():
        tab_opiniones(docs, verif)
        st.divider()
        st.markdown("#### 💬 Pregúntale a tus apuntes")
        tab_chat(docs)

    apartados = [("📚 Apuntes", lambda: tab_apuntes(docs)), ("🔤 Glosario", lambda: tab_glosario(todos_conceptos)),
                 ("📊 Datos", lambda: tab_datos(docs)), ("🎯 Mi cartera", lambda: tab_cartera(docs)),
                 ("📰 Actualidad", lambda: tab_actualidad(docs)), ("🗺️ Mapa", lambda: tab_mapa(docs)),
                 ("💭 Dudas y chat", dudas_y_chat), ("🔬 Dossiers", tab_dossiers), ("💸 Consumo", lambda: tab_consumo())]
    elegido = st.radio("Apartado", range(len(apartados)), horizontal=True, label_visibility="collapsed",
                       key="grupo_menu_cerebro", format_func=lambda k: apartados[k][0].replace(" ", "  \n", 1))
    apartados[elegido][1]()


def elegir_doc(docs, clave):
    if len(docs) == 1:
        return docs[0]
    titulos = [d["titulo"] for d in docs]
    return docs[titulos.index(st.selectbox("Documento", titulos, key=clave))]


def mostrar_busqueda(docs, termino):
    clave = normalizar(termino)
    encontrados = [f for f in fragmentos(docs) + fragmentos_dossiers() if clave in normalizar(f["texto"])]
    with st.container(border=True):
        st.markdown(f"**{len(encontrados)} resultado(s) para «{termino}»**")
        patron = re.compile(re.escape(termino), re.IGNORECASE)
        for f in encontrados[:40]:
            texto = patron.sub(lambda m: f":orange-background[{m.group(0)}]", md(f["texto"]))
            st.markdown(f"<span style='color:#94a3b8;font-size:0.8rem'>📍 {f['ruta']}</span>", unsafe_allow_html=True)
            st.markdown(texto)
        if len(encontrados) > 40:
            st.caption("Hay más resultados: afina la búsqueda.")


def tab_apuntes(docs):
    d = elegir_doc(docs, "doc_apuntes")
    etiquetas = d["meta"].get("etiquetas") or []
    if etiquetas:
        st.markdown(" ".join(f"`{e}`" for e in etiquetas))
    resumen = seccion(d, "resumen")
    if resumen:
        with st.container(border=True):
            st.markdown("#### 📝 Resumen")
            st.markdown(md(resumen))
    st.markdown("#### 📖 Explicación")
    for i, (titulo, cuerpo) in enumerate(subsecciones(seccion(d, "explicaci"))):
        with st.expander(titulo, expanded=(i == 0)):
            st.markdown(md(cuerpo))
    puntos = seccion(d, "puntos clave")
    if puntos:
        with st.container(border=True):
            st.markdown("#### 🎯 Puntos clave")
            st.markdown(md(puntos))


def tab_predicciones():
    """Registro de predicciones (informes/predicciones.md) como tabla filtrable: quién predijo qué y cómo va."""
    ruta = Path(__file__).parent / "informes" / "predicciones.md"
    if not ruta.exists():
        st.info("Todavía no hay registro de predicciones.")
        return
    filas = []
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        celdas = [c.strip() for c in linea.strip().strip("|").split("|")]
        if len(celdas) >= 7 and celdas[0].isdigit():
            res = celdas[6].replace("**", "")
            bajo = res.lower()
            if bajo.startswith("sin resolver"):
                estado = "⏳ Sin resolver"
            elif "contradicho" in bajo or "parece que falló" in bajo or bajo.startswith("falló"):
                estado = "❌ Falló"
            elif bajo.startswith("acertó"):
                estado = "✅ Acertó"
            elif bajo.startswith("resuelta"):
                estado = "↺ Mal planteada"
            else:
                estado = "❔ Otro"
            filas.append({"#": int(celdas[0]), "Estado": estado, "Quién": celdas[2].replace("**", ""), "Predicción": celdas[3].replace("**", ""),
                          "Fecha límite": celdas[4], "Cómo se comprueba": celdas[5].replace("**", ""), "Detalle": res, "Fecha": celdas[1]})
    if not filas:
        st.info("El registro está vacío.")
        return
    df = pd.DataFrame(filas)
    st.caption("Cada predicción con plazo que aparece en las fuentes se anota aquí y se comprueba cuando vence. Sirve para saber a quién creer. "
               "Son opiniones, no hechos. Se actualiza con las sesiones de research.")
    cuenta = df["Estado"].value_counts()
    cols = st.columns(4)
    for col, (etq, clave) in zip(cols, [("Total", None), ("⏳ Sin resolver", "⏳ Sin resolver"), ("✅ Acertó", "✅ Acertó"), ("❌ Falló", "❌ Falló")]):
        col.metric(etq, len(df) if clave is None else int(cuenta.get(clave, 0)))
    filtro = st.selectbox("Mostrar", ["Todas"] + sorted(df["Estado"].unique()), key="filtro_pred")
    ver = df if filtro == "Todas" else df[df["Estado"] == filtro]
    tabla = ver[["#", "Estado", "Quién", "Predicción", "Fecha límite", "Detalle"]].sort_values("#", ascending=False)
    try:
        st.dataframe(tabla, hide_index=True, width="stretch")
    except Exception:                      # Streamlit antiguo: aún no existe width="stretch"
        st.dataframe(tabla, hide_index=True, use_container_width=True)


def fragmentos_dossiers():
    """Trozos de los dossiers para el buscador (sin IA)."""
    out = []
    if DOSSIERS.exists():
        for p in sorted(DOSSIERS.glob("*.md")):
            texto, sec, nombre = p.read_text(encoding="utf-8"), "Inicio", p.stem[11:].replace("-", " ")
            for linea in texto.splitlines():
                if linea.startswith("# "):
                    nombre = linea[2:].replace("Dossier: ", "")[:60]
                elif linea.startswith("## "):
                    sec = linea[3:].strip()
                elif linea.strip() and not set(linea.strip()) <= set("|-: "):
                    out.append({"doc": nombre, "ruta": f"🔬 {nombre} › {sec}", "texto": linea.strip()})
    return out


def _md_con_codigo(texto):
    """Como md(), pero sin tocar los bloques de código (ahí el '$' debe verse tal cual)."""
    trozos = re.split(r"(```.*?```)", texto, flags=re.S)
    return "\n".join(t if t.startswith("```") else md(t) for t in trozos)


def tab_dossiers():
    """Dossiers de research (informes/dossiers/*.md), de solo lectura. No usan IA ni entran en el chat."""
    if not DOSSIERS.exists():
        st.info("Todavía no hay dossiers.")
        return
    archivos = sorted(p for p in DOSSIERS.glob("*.md") if p.name != "MAPA.md")
    st.caption("Investigaciones profundas con fuentes y su grado de confianza. Informativo: no son recomendaciones. "
               "Solo lectura: no entran en el chat, así que no gastan IA.")

    # PDFs para imprimir: solo enlaces a GitHub (no se leen los archivos, así no ralentiza la app)
    try:
        pdfs = sorted((Path(__file__).parent / "informes" / "pdf").glob("*.pdf"))
    except Exception:
        pdfs = []
    if pdfs:
        base = "https://github.com/joeldragonball-jpg/requirements.txt/raw/main/informes/pdf/"
        with st.expander("📄 PDFs para imprimir", expanded=False):
            st.markdown("\n".join(f"- [{p.stem.replace('-', ' ')}]({base}{p.name})" for p in pdfs))
            st.caption("Se abren en el visor del navegador; desde ahí puedes guardarlos o imprimirlos.")

    def titulo(p):
        for linea in p.read_text(encoding="utf-8").splitlines():
            if linea.startswith("# "):
                return linea[2:].replace("Dossier: ", "").strip()
        return p.stem

    mapa = DOSSIERS / "MAPA.md"
    pred = Path(__file__).parent / "informes" / "predicciones.md"
    opciones = ([("🗂️ Índice de dossiers", mapa)] if mapa.exists() else []) + ([("🎯 Registro de predicciones", pred)] if pred.exists() else []) + [(titulo(p), p) for p in archivos]
    if not opciones:
        st.info("Todavía no hay dossiers.")
        return
    nombres = [o[0] for o in opciones]
    sel = st.selectbox("Dossier", nombres, key="doc_dossier")
    elegido = opciones[nombres.index(sel)][1]
    if elegido == pred:
        tab_predicciones()
        return
    texto = elegido.read_text(encoding="utf-8")
    # enlaces entre dossiers (rutas relativas del repo): en la app se dejan como texto
    texto = re.sub(r"\[([^\]]+)\]\((?!https?://)[^)]*\.md\)", r"\1", texto)
    partes = re.split(r"(?m)^(?=## )", texto)
    inicio, secciones = partes[0], partes[1:]
    st.markdown(_md_con_codigo(re.sub(r"(?m)^# .*\n?", "", inicio)))
    for i, sec in enumerate(secciones):
        cab, _, cuerpo = sec.partition("\n")
        with st.expander(cab.replace("## ", "", 1).strip(), expanded=(i == 0)):
            st.markdown(_md_con_codigo(cuerpo))


def tab_glosario(lista):
    import vistas
    filtro = st.text_input("Filtrar conceptos", placeholder="p. ej. colateral", key="filtro_glosario")
    if filtro:
        f = normalizar(filtro)
        lista = [c for c in lista if f in normalizar(c["concepto"]) or f in normalizar(c["definicion"])]
    st.caption(f"{len(lista)} conceptos, ordenados de la A a la Z")
    if not lista:
        st.info("Ningún concepto coincide con ese filtro.")
        return
    st.markdown(vistas.ESTILO_GLOSARIO + vistas.html_glosario(lista), unsafe_allow_html=True)


def tab_datos(docs):
    d = elegir_doc(docs, "doc_datos")
    bloques = grupos_negrita(seccion(d, "cifras"))
    filtro = st.text_input("Filtrar datos", placeholder="p. ej. Brent, ITP, BCE", key="filtro_datos")
    for titulo, cuerpo in bloques:
        if filtro:
            lineas = [l for l in cuerpo.splitlines() if normalizar(filtro) in normalizar(l)]
            if not lineas:
                continue
            cuerpo = "\n".join(lineas)
        with st.expander(f"{titulo} ({len([l for l in cuerpo.splitlines() if l.strip()])})", expanded=bool(filtro)):
            st.markdown(md(cuerpo))


def tab_cartera(docs):
    d = elegir_doc(docs, "doc_cartera")
    st.markdown("### 🎯 Relación con mi cartera")
    for titulo, cuerpo in grupos_negrita(seccion(d, "relaci")):
        with st.container(border=True):
            if titulo != "General":
                st.markdown(f"**{titulo}**")
            st.markdown(md(cuerpo))
    st.markdown("### 🏛️ Fiscalidad en España")
    for titulo, cuerpo in grupos_negrita(seccion(d, "fiscalidad")):
        with st.expander(titulo, expanded=(titulo == "Cripto")):
            st.markdown(md(cuerpo))


ESTADOS = {
    "corregido": ("🔄", "Corregidos o desactualizados", "orange"),
    "sin resolver": ("❓", "Sin resolver", "gray"),
    "confirmado": ("✅", "Confirmados", "green"),
    "referencia": ("📌", "De referencia (contexto o ejemplo, no verificado)", "gray"),
    "especulación": ("💭", "Especulaciones (no hace falta confirmarlas)", "violet"),
}


def tab_opiniones(docs, verif):
    d = elegir_doc(docs, "doc_opiniones")
    st.caption("Separado de los hechos a propósito: aquí están las opiniones y predicciones, "
               "y abajo las contradicciones y datos pendientes de comprobar.")
    st.markdown("### 💭 Opiniones y predicciones")
    for titulo, cuerpo in grupos_negrita(seccion(d, "opiniones")):
        with st.expander(titulo):
            st.markdown(md(cuerpo))

    st.markdown("### 🔍 Verificación automática")
    if not verif:
        st.info("Todavía no se ha verificado nada. En GitHub → Actions → **Verificar apuntes** → **Run workflow** "
                "busca en internet cada dato marcado ⚠️ VERIFICAR y lo clasifica. Cuesta alrededor de 1 € la primera "
                "vez; después se lanza solo el día 1 de cada mes y solo revisa lo pendiente.")
    else:
        conteo = {e: sum(1 for v in verif.values() if v.get("estado") == e) for e in ESTADOS}
        cols = st.columns(len(ESTADOS))
        for col, (estado, (icono, nombre, _)) in zip(cols, ESTADOS.items()):
            col.metric(f"{icono} {nombre.split(' (')[0]}", conteo[estado])
        for estado, (icono, nombre, color) in ESTADOS.items():
            items = [v for v in verif.values() if v.get("estado") == estado]
            if not items:
                continue
            with st.expander(f"{icono} {nombre} ({len(items)})", expanded=(estado == "corregido")):
                for v in items:
                    st.markdown(md(f"**{v['texto']}**"))
                    st.markdown(f":{color}[{icono} {md(v.get('explicacion', ''))}]")
                    if v.get("dato_actual"):
                        st.markdown(md(f"👉 **Dato actual:** {v['dato_actual']}"))
                    fuentes = [f for f in v.get("fuentes", []) if str(f).startswith("http")][:3]
                    if fuentes:
                        st.caption("Fuentes: " + " · ".join(f"[{i + 1}]({f})" for i, f in enumerate(fuentes))
                                   + f" · revisado el {v.get('fecha', '')[:10]}")
                    st.divider()

    st.markdown("### ⚠️ Dudas y datos a verificar (tal como están en tus apuntes)")
    for titulo, cuerpo in grupos_negrita(seccion(d, "dudas")):
        with st.expander(titulo):
            st.markdown(md(cuerpo))


def tab_actualidad(docs):
    st.caption("Las noticias que te llegan alimentan tu cerebro: el chat las tiene en cuenta y cada domingo "
               "el bot las convierte en un archivo de apuntes de la semana.")
    recientes = noticias_recientes(30)
    relacionadas = [n for n in recientes if n.get("actualiza_apuntes")]
    st.markdown("### 🧠 Noticias que tocan tus apuntes")
    if not relacionadas:
        st.info("Aún no hay noticias que confirmen, contradigan o actualicen tus apuntes. "
                "Irán apareciendo aquí a medida que lleguen.")
    for n in relacionadas:
        tipo = n["actualiza_apuntes"].split(":")[0].strip().lower()
        color = {"confirma": "green", "contradice": "red", "actualiza": "orange"}.get(tipo, "blue")
        with st.container(border=True):
            st.markdown(f"**{md(n['titulo'])}**")
            st.markdown(f":{color}[🧠 {md(n['actualiza_apuntes'])}]")
            st.caption(f"{n['tema']} · {n['fecha_envio'][:10]} · {enlace('Leer', n['url'])}")

    semanas = [d for d in docs if d["archivo"].startswith("actualidad")]
    st.markdown("### 🗓️ Apuntes de actualidad semanales")
    if not semanas:
        st.caption("El primero se creará el próximo domingo con las noticias de la semana.")
    for d in semanas:
        with st.expander(d["titulo"]):
            st.markdown(md(seccion(d, "resumen")))
            st.caption("El documento completo está en la pestaña 📚 Apuntes.")

    st.markdown(f"### 📰 Últimas noticias ({len(recientes)} en 30 días)")
    for n in recientes[:15]:
        voto = {1: " 👍"}.get(n.get("valoracion"), "")
        st.markdown(f"- {enlace(n['titulo'], n['url'])}{voto} · "
                    f"<span style='color:#94a3b8;font-size:0.8rem'>{html_lib.escape(str(n['tema']))}</span>",
                    unsafe_allow_html=True)


def tab_mapa(docs):
    ids, etiquetas, padres, valores = [], [], [], []
    for d in docs:
        ids.append(d["archivo"]); etiquetas.append(d["titulo"][:40]); padres.append(""); valores.append(0)
        for nombre, texto in d["secciones"].items():
            sid = f"{d['archivo']}/{nombre}"
            subs = subsecciones(texto)
            ids.append(sid); etiquetas.append(nombre); padres.append(d["archivo"])
            if len(subs) > 1:
                valores.append(0)
                for sub, cuerpo in subs:
                    ids.append(f"{sid}/{sub}"); etiquetas.append(sub); padres.append(sid)
                    valores.append(max(len(cuerpo.split()), 1))
            else:
                valores.append(max(len(texto.split()), 1))
    fig = go.Figure(go.Treemap(ids=ids, labels=etiquetas, parents=padres, values=valores, branchvalues="remainder",
                               hovertemplate="%{label}<br>%{value} palabras<extra></extra>",
                               marker=dict(colorscale="Blues"), maxdepth=3))
    fig.update_layout(template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", height=600,
                      margin=dict(l=0, r=0, t=10, b=0))
    st.caption("Cada recuadro es una parte de tus apuntes; el tamaño indica cuánta información tiene. Pulsa para entrar.")
    st.plotly_chart(fig, theme=None, config={"displayModeBar": False})


# ---------------------------------------------------------------- chat con IA
SYSTEM_CHAT = """Eres el asistente de estudio personal de un inversor particular español con XRP y XLM.
Respondes en español claro y sencillo, usando SOLO la información de sus apuntes, que tienes abajo.
- Indica al final de dónde sale la respuesta, así: "📍 Sección: (nombre de la sección o apartado)".
- Si sus apuntes no cubren la pregunta, dilo claramente ("Tus apuntes no lo cubren"). Puedes añadir
  conocimiento general solo si lo marcas como "Fuera de tus apuntes:".
- Si un dato que usas está marcado como [VERIFICAR] o es una opinión/predicción, avísalo. Si en
  <verificaciones> aparece corregido o confirmado, usa esa versión y dilo.
- También tienes sus noticias recientes en <noticias_recientes>: si usas una, indica "📰 Noticia del (fecha)".
  Si contradicen sus apuntes, dale prioridad a lo más reciente y avísale.
- Si la pregunta implica una decisión con consecuencias fiscales o de inversión, recuerda que conviene
  contrastarlo con un asesor; no eres su asesor financiero ni fiscal.
- Sé breve: ve al grano y usa listas cuando ayuden."""


def secreto(nombre):
    try:
        return st.secrets.get(nombre)
    except Exception:
        return None


def clave_api():
    return secreto("ANTHROPIC_API_KEY")


LIMITE_PREGUNTAS_DIA = 40   # tope diario del chat: si alguien abusara, como mucho gastaría ~2–4 € al día


def chat_desbloqueado():
    """El chat gasta tu saldo de la IA: con APP_CLAVE en los Secrets de Streamlit solo lo usa quien sepa la contraseña."""
    clave = secreto("APP_CLAVE")
    if not clave:
        st.warning("⚠️ El chat no tiene contraseña: cualquiera con el enlace de la app podría usarlo y gastar tu saldo. "
                   "Añade `APP_CLAVE = \"una-contraseña\"` en Settings → Secrets de Streamlit.")
        return True
    if st.session_state.get("app_ok") or st.session_state.get("chat_ok"):   # app_ok: ya entró con la contraseña de la app
        return True
    if st.session_state.get("chat_intentos", 0) >= 5:
        st.error("Demasiados intentos fallidos. Recarga la página para volver a intentarlo.")
        return False
    intento = st.text_input("🔒 Contraseña del chat", type="password", key="chat_clave")
    if intento:
        if hmac.compare_digest(intento.encode(), str(clave).encode()):
            st.session_state.chat_ok = True
            st.rerun()
        st.session_state.chat_intentos = st.session_state.get("chat_intentos", 0) + 1
        st.error("Contraseña incorrecta.")
    return False


def tab_chat(docs):
    clave = clave_api()
    if not clave:
        st.info("Para activar el chat, añade tu clave de Anthropic en Streamlit: en share.streamlit.io, "
                "en tu app → **⋮ → Settings → Secrets**, pega esta línea con tu clave y guarda:\n\n"
                "`ANTHROPIC_API_KEY = \"tu-clave\"`")
        return
    if not chat_desbloqueado():
        return
    preguntas_hoy = sum(1 for e in cargar_uso() + st.session_state.get("uso_sesion", [])
                        if e.get("origen") == "chat cerebro"
                        and str(e.get("fecha", "")) >= datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    if preguntas_hoy >= LIMITE_PREGUNTAS_DIA:
        st.warning(f"Se ha alcanzado el límite de {LIMITE_PREGUNTAS_DIA} preguntas de hoy (protección contra gastos "
                   "inesperados). Mañana vuelve a estar disponible.")
        return
    st.caption("Responde con tus apuntes. Cada pregunta cuesta unos céntimos; las siguientes en pocos minutos, menos. "
               f"Hoy llevas {preguntas_hoy} de {LIMITE_PREGUNTAS_DIA} preguntas.")
    if "chat_cerebro" not in st.session_state:
        st.session_state.chat_cerebro = []
    if st.session_state.chat_cerebro and st.button("🗑️ Nueva conversación"):
        st.session_state.chat_cerebro = []
        st.rerun()

    for m in st.session_state.chat_cerebro:
        with st.chat_message(m["role"]):
            st.markdown(md(m["content"]))

    pregunta = st.chat_input("Pregunta sobre tus apuntes… (p. ej. ¿cómo tributa una permuta XRP → USDC?)")
    if not pregunta:
        return
    st.session_state.chat_cerebro.append({"role": "user", "content": pregunta})
    with st.chat_message("user"):
        st.markdown(md(pregunta))
    with st.chat_message("assistant"):
        with st.spinner("Consultando tus apuntes…"):
            respuesta = preguntar(clave, docs, st.session_state.chat_cerebro[-10:])
        st.markdown(md(respuesta))
    st.session_state.chat_cerebro.append({"role": "assistant", "content": respuesta})


def preguntar(clave, docs, historial):
    import anthropic

    apuntes = "\n\n".join(f"<documento titulo=\"{d['titulo']}\">\n{d['texto']}\n</documento>" for d in docs)
    noticias = "\n".join(f"- ({n['fecha_envio'][:10]}, {n['tema']}) {n['titulo']}: {n['resumen']}"
                         + (f" [Relación con sus apuntes: {n['actualiza_apuntes']}]" if n.get("actualiza_apuntes") else "")
                         for n in noticias_recientes(30))
    verif = cargar_json_datos("cerebro/verificaciones.json").get("resultados", {})
    verificaciones = "\n".join(f"- [{v.get('estado')}] {v['texto']} → {v.get('explicacion', '')} {v.get('dato_actual', '')}"
                               for v in verif.values() if v.get("estado") in ("corregido", "confirmado"))
    apuntes += (f"\n\n<noticias_recientes>\n{noticias or 'Ninguna'}\n</noticias_recientes>"
                f"\n\n<verificaciones>\n{verificaciones or 'Ninguna'}\n</verificaciones>")
    client = anthropic.Anthropic(api_key=clave)
    try:
        resp = client.beta.messages.create(
            model=MODELO,
            max_tokens=8000,
            # Los apuntes van en caché: las preguntas seguidas son mucho más baratas
            system=[{"type": "text", "text": SYSTEM_CHAT},
                    {"type": "text", "text": f"<apuntes>\n{apuntes}\n</apuntes>", "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": m["role"], "content": m["content"]} for m in historial],
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.AuthenticationError:
        return "⚠️ La clave de Anthropic no es válida. Revísala en Settings → Secrets."
    except anthropic.RateLimitError:
        return "⚠️ Demasiadas peticiones seguidas. Espera un minuto y vuelve a preguntar."
    except anthropic.APIStatusError as e:
        return f"⚠️ Error de la API de Anthropic ({e.status_code}). Inténtalo de nuevo en un rato."
    except anthropic.APIConnectionError:
        return "⚠️ No se pudo conectar con Anthropic. Revisa la conexión e inténtalo de nuevo."
    u = resp.usage
    guardar_uso_chat({"fecha": datetime.now(timezone.utc).isoformat(), "origen": "chat cerebro", "modelo": resp.model,
                      "entrada": u.input_tokens, "salida": u.output_tokens,
                      "cache_lectura": getattr(u, "cache_read_input_tokens", 0) or 0,
                      "cache_escritura": getattr(u, "cache_creation_input_tokens", 0) or 0})
    if resp.stop_reason == "refusal":
        return "⚠️ No he podido responder a esa pregunta. Prueba a formularla de otra manera."
    return "\n".join(b.text for b in resp.content if b.type == "text").strip() or "⚠️ Respuesta vacía."


# ---------------------------------------------------------------- consumo de la IA
def guardar_uso_chat(entrada):
    """Apunta el gasto de cada pregunta. Con GITHUB_TOKEN en los Secrets queda guardado para siempre
    (rama 'datos', uso/chat.json); sin él, solo mientras la app está abierta."""
    st.session_state.setdefault("uso_sesion", []).append(entrada)
    token = secreto("GITHUB_TOKEN")
    if not token:
        return
    url = f"https://api.github.com/repos/{REPO}/contents/uso/chat.json"
    cab = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    try:
        r = requests.get(url, params={"ref": "datos"}, headers=cab, timeout=15)
        registros, sha = [], None
        if r.status_code == 200:
            registros, sha = json.loads(base64.b64decode(r.json()["content"])), r.json()["sha"]
        registros = (registros + [entrada])[-3000:]
        cuerpo = {"message": "Uso del chat del cerebro", "branch": "datos",
                  "content": base64.b64encode(json.dumps(registros, indent=1).encode()).decode()}
        if sha:
            cuerpo["sha"] = sha
        if requests.put(url, headers=cab, json=cuerpo, timeout=15).ok:
            st.session_state["uso_sesion"].remove(entrada)  # ya está guardado en GitHub
    except Exception:
        pass


def coste(e):
    def num(x):  # en la tabla, un campo que falta en unos registros llega como NaN (y `nan or 0` sigue siendo nan)
        return 0 if x is None or x != x else x

    p = next((v for k, v in PRECIOS.items() if str(e.get("modelo", "")).startswith(k)), PRECIOS[MODELO])
    tokens = (num(e.get("entrada", 0)) * p[0] + num(e.get("salida", 0)) * p[1]
              + num(e.get("cache_lectura", 0)) * p[2] + num(e.get("cache_escritura", 0)) * p[3]) / 1e6
    busquedas = num(e.get("busquedas", 0)) * 0.01  # búsqueda web: 10 $ cada 1.000
    return tokens + busquedas


@st.cache_data(ttl=120, show_spinner=False)
def cargar_uso():
    marca = int(datetime.now().timestamp() // 120)  # evita la caché de GitHub
    registros = []
    try:
        registros += requests.get(f"{RAW_DATOS}/noticias/noticias.json?t={marca}", timeout=10).json().get("uso", [])
    except Exception:
        pass
    try:
        r = requests.get(f"{RAW_DATOS}/uso/chat.json?t={marca}", timeout=10)
        if r.ok:
            registros += r.json()
    except Exception:
        pass
    try:
        r = requests.get(f"{RAW_DATOS}/cerebro/verificaciones.json?t={marca}", timeout=10)
        if r.ok:
            registros += r.json().get("uso", [])
    except Exception:
        pass
    try:
        r = requests.get(f"{RAW_DATOS}/uso/documentos.json?t={marca}", timeout=10)
        if r.ok:
            registros += r.json()
    except Exception:
        pass
    try:   # revisión semanal del cerebro (revision/revision.py)
        r = requests.get(f"{RAW_DATOS}/uso/revision.json?t={marca}", timeout=10)
        if r.ok:
            registros += r.json()
    except Exception:
        pass
    return registros


@st.cache_data(ttl=3600, show_spinner=False)
def euros_por_dolar():
    try:
        res = requests.get("https://api.kraken.com/0/public/Ticker", params={"pair": "EURUSD"}, timeout=8).json()["result"]
        return 1 / float(next(iter(res.values()))["c"][0])
    except Exception:
        return 0.86


def tab_consumo():
    registros = cargar_uso() + st.session_state.get("uso_sesion", [])
    if not registros:
        st.info("Todavía no hay consumo registrado. Aparecerá cuando el bot de noticias o el chat usen la IA.")
        return
    df = pd.DataFrame(registros)
    df["fecha"] = pd.to_datetime(df["fecha"], utc=True).dt.tz_convert("Europe/Madrid")
    df["coste"] = df.apply(coste, axis=1)
    df["tokens"] = df["entrada"] + df["salida"] + df["cache_lectura"] + df["cache_escritura"]
    eur = euros_por_dolar()
    ahora = pd.Timestamp.now(tz="Europe/Madrid")
    mes = df[df["fecha"] >= ahora.normalize().replace(day=1)]
    hoy = df[df["fecha"] >= ahora.normalize()]
    dias_mes = ahora.days_in_month
    proyeccion = mes["coste"].sum() / max(ahora.day, 1) * dias_mes

    def dinero(d):
        return f"{d:,.2f} $ (≈{d * eur:,.2f} €)".replace(",", "§").replace(".", ",").replace("§", ".")

    c = st.columns(4)
    c[0].metric("Gasto este mes", dinero(mes["coste"].sum()))
    c[1].metric("Gasto hoy", dinero(hoy["coste"].sum()))
    c[2].metric("Previsión del mes", dinero(proyeccion), help="Al ritmo de gasto medio de este mes.")
    c[3].metric("Preguntas al chat (mes)", int((mes["origen"] == "chat cerebro").sum()))

    ult = df[df["fecha"] >= ahora - pd.Timedelta(days=30)].copy()
    ult["dia"] = ult["fecha"].dt.date
    diario = ult.pivot_table(index="dia", columns="origen", values="coste", aggfunc="sum", fill_value=0)
    etiquetas_dia = [d.strftime("%d/%m") for d in diario.index]
    fig = go.Figure([go.Bar(x=etiquetas_dia, y=diario[o] * eur, name=o) for o in diario.columns])
    fig.update_xaxes(type="category")
    fig.update_layout(barmode="stack", template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)",
                      plot_bgcolor="rgba(0,0,0,0)", height=300, margin=dict(l=10, r=10, t=30, b=10),
                      title=dict(text="Gasto diario (últimos 30 días, €)", x=0), legend=dict(orientation="h", y=-0.2),
                      separators=",.")
    fig.update_yaxes(ticksuffix=" €", gridcolor="#262c3a")
    st.plotly_chart(fig, theme=None, config={"displayModeBar": False})

    st.markdown("##### Por uso (este mes)")
    resumen = mes.groupby("origen").agg(llamadas=("coste", "size"), tokens=("tokens", "sum"), coste=("coste", "sum"))
    resumen["coste"] = resumen["coste"].map(dinero)
    resumen["tokens"] = resumen["tokens"].map(lambda t: f"{t:,}".replace(",", "."))
    st.dataframe(resumen.rename(columns={"llamadas": "Llamadas", "tokens": "Tokens", "coste": "Coste"}))

    st.markdown("##### Últimas llamadas")
    tabla = df.sort_values("fecha", ascending=False).head(20)
    st.dataframe(pd.DataFrame({
        "Fecha": tabla["fecha"].dt.strftime("%d/%m %H:%M"), "Uso": tabla["origen"], "Modelo": tabla["modelo"],
        "Entrada": tabla["entrada"], "Salida": tabla["salida"], "Caché (lectura)": tabla["cache_lectura"],
        "Coste": tabla["coste"].map(lambda d: f"{d * eur:.3f} €".replace(".", ",")),
    }), hide_index=True)

    st.caption(f"Registros desde el {df['fecha'].min():%d/%m/%Y}. Son estimaciones con la tarifa oficial "
               "(la API cobra en dólares). La factura exacta está en console.anthropic.com → Usage.")
    if not secreto("GITHUB_TOKEN"):
        st.info("Las preguntas al chat solo se están contando mientras la app está abierta. Para guardarlas "
                "siempre, añade un `GITHUB_TOKEN` en los Secrets de Streamlit (te explico cómo crearlo).")

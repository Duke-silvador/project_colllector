"""Informe de plusvalías para la renta (cripto, método FIFO). Sin IA y sin dependencias: recibe una lista de operaciones y
devuelve las líneas por venta y lote, los lotes que te quedan y los avisos de datos dudosos. Es un cálculo orientativo:
revísalo con tu asesor o con el programa de la renta."""
import csv
import html
import io
import math
from collections import defaultdict, deque
from datetime import date, datetime


def _fecha(f):
    return f.date() if isinstance(f, datetime) else f


def _vacio(x):
    return x is None or x != x or (isinstance(x, float) and math.isinf(x))   # None, NaN, NaT o infinito


def _validar(ops):
    """Separa las filas utilizables de las que tienen fecha, cantidad o total vacíos (no se calculan con datos inventados)."""
    buenas, avisos = [], []
    for o in ops:
        f, c, t = o.get("fecha"), o.get("cantidad"), o.get("total")
        if isinstance(f, str):
            try:
                f = date.fromisoformat(f[:10])
            except ValueError:
                f = None
        try:
            c, t = (None if _vacio(c) else float(c)), (None if _vacio(t) else float(t))
        except (TypeError, ValueError):
            c = t = None
        if _vacio(f) or _vacio(c) or _vacio(t) or c == 0:
            if not (c == 0 and not _vacio(f) and not _vacio(t)):   # cantidad 0 con el resto bien: se ignora sin aviso
                avisos.append(f"Fila ignorada por datos vacíos o no válidos: {o.get('token', '?')} "
                              f"(fecha {'—' if _vacio(f) else f}, cantidad {'—' if _vacio(c) else c}, total {'—' if _vacio(t) else t}). "
                              "Revisa la hoja [VERIFICAR].")
            continue
        buenas.append({**o, "fecha": f, "cantidad": c, "total": t})
    return buenas, avisos


def lotes_fifo(ops):
    """ops: lista de dicts con fecha, token, cantidad (+compra / -venta) y total (€; en ventas, cobrado neto de comisión).
    FIFO conjunto por token (criterio AEAT). El mismo día se procesan antes las compras.
    Devuelve (lineas, abiertos, avisos): una línea por cada lote consumido por cada venta."""
    ops, avisos = _validar(ops)
    ops = sorted(({**o, "fecha": _fecha(o["fecha"])} for o in ops), key=lambda o: (o["fecha"], 0 if o["cantidad"] > 0 else 1))
    lotes = defaultdict(deque)
    lineas = []
    for o in ops:
        tok = o["token"]
        if o["cantidad"] > 0:
            lotes[tok].append([o["fecha"], o["cantidad"], max(float(o["total"]), 0.0)])   # fecha, restante, coste restante
            if float(o["total"]) <= 0:
                avisos.append(f"Compra de {o['cantidad']:.4f} {tok} del {o['fecha']:%d/%m/%Y} con coste 0 €: se trata como regalo. "
                              "Si fue un traspaso o una recompensa, pon su coste real en la hoja [VERIFICAR].")
            continue
        q = -o["cantidad"]
        cobrado = abs(float(o["total"]))
        falta = q
        while falta > 1e-9 and lotes[tok]:
            lote = lotes[tok][0]
            tomar = min(falta, lote[1])
            coste = lote[2] * tomar / lote[1] if lote[1] else 0.0
            lineas.append({"token": tok, "f_venta": o["fecha"], "f_compra": lote[0], "cantidad": tomar,
                           "v_transmision": cobrado * tomar / q, "v_adquisicion": coste,
                           "ganancia": cobrado * tomar / q - coste})
            lote[1] -= tomar
            lote[2] -= coste
            falta -= tomar
            if lote[1] <= 1e-9:
                lotes[tok].popleft()
        if falta > 1e-6:
            avisos.append(f"{o['fecha']:%d/%m/%Y} {tok}: vendes {q:.4f} y no hay compras anteriores para {falta:.4f}: "
                          "revisa si falta una compra en la hoja. Esa parte se calcula con coste 0 €.")
            lineas.append({"token": tok, "f_venta": o["fecha"], "f_compra": None, "cantidad": falta,
                           "v_transmision": cobrado * falta / q, "v_adquisicion": 0.0, "ganancia": cobrado * falta / q})
    abiertos = [{"token": t, "f_compra": l[0], "cantidad": l[1], "coste": l[2]} for t, ls in lotes.items() for l in ls]
    return lineas, abiertos, avisos


def resumen_anual(lineas):
    por = defaultdict(lambda: [0.0, 0.0])
    for l in lineas:
        por[l["f_venta"].year][0] += l["v_transmision"]
        por[l["f_venta"].year][1] += l["v_adquisicion"]
    return {a: {"transmision": t, "adquisicion": c, "ganancia": t - c} for a, (t, c) in sorted(por.items())}


def _eur(x):
    return f"{x:,.2f} €".replace(",", "§").replace(".", ",").replace("§", ".")


def _num(x, dec=4):
    return f"{x:,.{dec}f}".replace(",", "§").replace(".", ",").replace("§", ".")


def csv_anio(lineas, anio):
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Token", "Fecha adquisición", "Fecha transmisión", "Cantidad", "Valor adquisición (€)", "Valor transmisión (€)", "Ganancia/pérdida (€)"])
    for l in lineas:
        if l["f_venta"].year == anio:
            w.writerow([l["token"], f"{l['f_compra']:%d/%m/%Y}" if l["f_compra"] else "sin compra", f"{l['f_venta']:%d/%m/%Y}",
                        f"{l['cantidad']:.8f}".replace(".", ","), f"{l['v_adquisicion']:.2f}".replace(".", ","),
                        f"{l['v_transmision']:.2f}".replace(".", ","), f"{l['ganancia']:.2f}".replace(".", ",")])
    return buf.getvalue()


def html_anio(lineas, avisos, anio, generado=None):
    """Página HTML lista para imprimir (Ctrl+P → Guardar como PDF)."""
    ls = [l for l in lineas if l["f_venta"].year == anio]
    r = resumen_anual(ls).get(anio, {"transmision": 0.0, "adquisicion": 0.0, "ganancia": 0.0})
    cuerpo = []
    for l in ls:
        fc = f"{l['f_compra']:%d/%m/%Y}" if l["f_compra"] else "sin compra"
        cuerpo.append(f"<tr><td>{html.escape(l['token'])}</td><td>{fc}</td><td>{l['f_venta']:%d/%m/%Y}</td>"
                      f"<td class='n'>{_num(l['cantidad'])}</td><td class='n'>{_eur(l['v_adquisicion'])}</td>"
                      f"<td class='n'>{_eur(l['v_transmision'])}</td><td class='n'>{_eur(l['ganancia'])}</td></tr>")
    filas = "".join(cuerpo) or "<tr><td colspan='7'>Sin ventas este año.</td></tr>"
    av = "".join(f"<li>{html.escape(a)}</li>" for a in avisos) or "<li>Ninguno.</li>"
    gen = generado or date.today().strftime("%d/%m/%Y")
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Plusvalías cripto {anio}</title>
<style>body{{font-family:Arial,sans-serif;margin:32px;color:#111}}h1{{font-size:20px}}table{{border-collapse:collapse;width:100%;font-size:12px}}
th,td{{border:1px solid #bbb;padding:5px 7px;text-align:left}}th{{background:#eee}}td.n{{text-align:right}}
.res{{display:flex;gap:24px;margin:12px 0}}.res div{{border:1px solid #bbb;padding:8px 14px}}small{{color:#555}}</style></head><body>
<h1>Plusvalías y minusvalías de criptomonedas · ejercicio {anio}</h1>
<small>Cálculo orientativo por el método FIFO (lotes homogéneos conjuntos), generado el {gen}. No sustituye al asesor fiscal ni al programa
de la renta: contrasta cada cifra con tus extractos. No incluye permutas entre criptos, staking, recompensas ni otras monedas que no estén en tu hoja.</small>
<div class="res"><div>Valor de transmisión<br><b>{_eur(r['transmision'])}</b></div><div>Valor de adquisición<br><b>{_eur(r['adquisicion'])}</b></div>
<div>Ganancia / pérdida patrimonial<br><b>{_eur(r['ganancia'])}</b></div></div>
<table><tr><th>Moneda</th><th>Fecha adquisición</th><th>Fecha transmisión</th><th>Cantidad</th><th>Valor adquisición</th><th>Valor transmisión</th><th>Ganancia / pérdida</th></tr>
{filas}</table><h2 style="font-size:15px">Avisos y datos a verificar</h2><ul>{av}</ul></body></html>"""

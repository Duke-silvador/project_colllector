"""Arma el ZIP de la entrega final: informe, cuaderno, laboratorio Dash, API del reto y la app HTML completa sin conexión.

    python EntregaFinal/empaquetar_entrega.py            -> EntregaFinal/paquete/Entrega_final_Sobusa.zip (con la app HTML)
                                                            y EntregaFinal/paquete/Entrega_final_Sobusa_sin_app.zip
    python EntregaFinal/empaquetar_entrega.py --carpeta  -> además deja la carpeta descomprimida en paquete/ (para probarla)

La app HTML va en app_sobusa/: se recorre desde app.html todo lo que las páginas cargan (src, href, iframes y rutas entre
comillas en .html/.js/.css), más lib/, app/ y sistema_tiempo_real/replay/ (los días se cargan por nombre de fecha). Solo
entran archivos versionados en git: así nunca entran credenciales, datos crudos ni archivos con datos personales, que están
en .gitignore. Además hay una lista negra explícita por si acaso.
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import zipfile
from collections import deque
from pathlib import Path

ENTREGA = Path(__file__).resolve().parent
PROYECTO = ENTREGA.parent
SALIDA = ENTREGA / "paquete"
NOMBRE = "Entrega_final_Sobusa"

# Lo que va de EntregaFinal/
ARCHIVOS_ENTREGA = ["README.md", "Informe_tecnico_Sobusa.pdf", "entrega_final.ipynb", "entrega_final.html",
                    "requirements_cuaderno.txt", "empaquetar_entrega.py", "MATRIZ_CUMPLIMIENTO.md", "PLAN_EVOLUCION.md",
                    "HISTORIAL_DESARROLLO.md", "historial_desarrollo.py"]
CARPETAS_ENTREGA = ["documentos", "dash_app", "informe", "api_frecuencias"]
# Entornos, cachés y datos locales de PostgreSQL nunca viajan; .env (con secretos) tampoco: solo .env.example
EXCLUIR_PARTES = {".venv", "venv", "__pycache__", ".ipynb_checkpoints", "paquete", ".pytest_cache", ".ruff_cache",
                  ".mypy_cache", "htmlcov", "pgdata", ".env"}
EXCLUIR_SUFIJOS = {".pyc", ".log", ".blg", ".aux", ".bbl", ".xdv", ".out", ".synctex"}
EXCLUIR_NOMBRES = {"main.pdf",          # informe/main.pdf es la misma que Informe_tecnico_Sobusa.pdf
                   ".env", ".coverage"}
# Carpetas datos/ propias de la entrega (datos derivados y pequeños, no los crudos): no cuentan para la lista negra
DATOS_PERMITIDOS = ("dash_app/datos/", "api_frecuencias/datos/", "api_frecuencias/docs/evidencias/datos/")

# App HTML: punto de partida y carpetas que entran completas
SEMILLAS = ["app.html"]
CARPETAS_APP = ["app", "lib", "sistema_tiempo_real/replay"]
TEXTO = {".html", ".js", ".css"}
EXTS = "html|js|css|png|jpg|jpeg|svg|webp|gif|woff2?|ttf|otf|pdf|md|json|csv|glb|pbf"
PATRON = re.compile(r"""["'`(]\.?/?([A-Za-z0-9_./\-]+?\.(?:""" + EXTS + r"""))(?:[?#][^"'`)\s]*)?["'`)]""")
LISTA_NEGRA = re.compile(r"(^|/)(datos/|info\.txt|credenciales|rptVehiculos|conductor_dia|horas_por_conductor)", re.I)


def versionados() -> set[str]:
    r = subprocess.run(["git", "ls-files", "-z"], cwd=PROYECTO, capture_output=True, check=True)
    return {f for f in r.stdout.decode("utf-8").split("\0") if f}


def archivos_app(git: set[str]) -> list[str]:
    """Archivos de la app HTML (rutas relativas a la raíz del proyecto), versionados y fuera de la lista negra."""
    elegidos: set[str] = set()
    cola: deque[str] = deque()

    def agregar(rel: str):
        if rel in elegidos or rel not in git or LISTA_NEGRA.search(rel) or not (PROYECTO / rel).is_file():
            return
        elegidos.add(rel)
        if Path(rel).suffix.lower() in TEXTO:
            cola.append(rel)

    for s in SEMILLAS:
        agregar(s)
    for c in CARPETAS_APP:
        for f in git:
            if f.startswith(c + "/"):
                agregar(f)
    while cola:
        rel = cola.popleft()
        texto = (PROYECTO / rel).read_text(encoding="utf-8", errors="ignore")
        base = Path(rel).parent
        for m in PATRON.finditer(texto):
            ref = m.group(1)
            if ref.startswith(("http", "//", "data:")):
                continue
            for cand in (base / ref, Path(ref)):
                norm = "/".join(p for p in cand.as_posix().split("/") if p not in ("", "."))
                agregar(norm)
    return sorted(elegidos)


def no_ignorados() -> set[str]:
    """Archivos que git versiona o versionaría (respeta .gitignore): cachés, .env y salidas locales quedan fuera."""
    r = subprocess.run(["git", "ls-files", "-co", "--exclude-standard", "-z"], cwd=PROYECTO, capture_output=True,
                       check=True)
    return {f for f in r.stdout.decode("utf-8").split("\0") if f}


def archivos_entrega() -> list[Path]:
    out = [ENTREGA / a for a in ARCHIVOS_ENTREGA if (ENTREGA / a).is_file()]
    permitidos = no_ignorados()
    prefijo = ENTREGA.relative_to(PROYECTO).as_posix() + "/"
    for c in CARPETAS_ENTREGA:
        if not (ENTREGA / c).is_dir():
            continue
        for p in sorted((ENTREGA / c).rglob("*")):
            rel = p.relative_to(ENTREGA)
            if (p.is_file() and prefijo + rel.as_posix() in permitidos and not (set(rel.parts) & EXCLUIR_PARTES)
                    and p.suffix.lower() not in EXCLUIR_SUFIJOS and p.name not in EXCLUIR_NOMBRES):
                out.append(p)
    return out


def escribir_zip(destino: Path, entrega: list[Path], app: list[str]) -> None:
    with zipfile.ZipFile(destino, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in entrega:
            z.write(p, f"{NOMBRE}/{p.relative_to(ENTREGA).as_posix()}")
        for rel in app:
            z.write(PROYECTO / rel, f"{NOMBRE}/app_sobusa/{rel}")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--carpeta", action="store_true", help="dejar también la carpeta descomprimida en paquete/")
    args = ap.parse_args()

    git = versionados()
    entrega = archivos_entrega()
    app = archivos_app(git)
    faltan = [a for a in ("Informe_tecnico_Sobusa.pdf", "entrega_final.ipynb", "entrega_final.html", "README.md")
              if not (ENTREGA / a).is_file()]
    if faltan:
        sys.exit(f"Faltan en EntregaFinal/: {', '.join(faltan)}")
    def sin_datos_permitidos(rel: str) -> str:
        for prefijo in DATOS_PERMITIDOS:
            rel = rel.replace(prefijo, "")
        return rel

    malos = [str(p) for p in entrega if LISTA_NEGRA.search(sin_datos_permitidos(p.relative_to(ENTREGA).as_posix()))]
    if malos:
        sys.exit(f"Archivos en la lista negra dentro de EntregaFinal/: {malos}")

    SALIDA.mkdir(exist_ok=True)
    completo = SALIDA / f"{NOMBRE}.zip"
    ligero = SALIDA / f"{NOMBRE}_sin_app.zip"
    escribir_zip(completo, entrega, app)
    escribir_zip(ligero, entrega, [])

    peso_app = sum((PROYECTO / a).stat().st_size for a in app) / 1e6
    peso_ent = sum(p.stat().st_size for p in entrega) / 1e6
    print(f"EntregaFinal: {len(entrega)} archivos, {peso_ent:.1f} MB · app HTML: {len(app)} archivos, {peso_app:.1f} MB")
    print(f"{completo.name}: {completo.stat().st_size / 1e6:.1f} MB")
    print(f"{ligero.name}: {ligero.stat().st_size / 1e6:.1f} MB")
    raices = sorted({a.split("/")[0] for a in app})
    print("app_sobusa/ trae: " + ", ".join(raices))

    if args.carpeta:
        destino = SALIDA / NOMBRE
        if destino.exists():
            shutil.rmtree(destino)
        with zipfile.ZipFile(completo) as z:
            z.extractall(SALIDA)
        print(f"carpeta: {destino}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Historial verificable del desarrollo (entregable E03 «historial», fila E03.3 de la matriz de cumplimiento).

El repositorio de entrega (público) se arma con empaquetar_entrega.py a partir de esta carpeta y solo guarda sus
sincronizaciones; el historial de desarrollo está en el repositorio de desarrollo del equipo. Este
script lee ese historial con git, sin red, y escribe HISTORIAL_DESARROLLO.md junto a este archivo: todos los commits en
orden cronológico, agrupados por día, con la hora, el hash corto, el asunto, cuántos archivos y líneas cambian
(git log --numstat) y una marca para los que tocan EntregaFinal/.

Qué no publica: correos, nombres de autor (todo el historial es de un solo contribuyente), cuerpos de mensaje ni rutas
de archivos. Un asunto con algo que parezca un secreto (clave, contraseña, token, credenciales en una URL, una cadena
larga con aspecto aleatorio) no se publica: se reemplaza por un aviso y se informa por la salida de errores con su hash
corto, sin mostrar el texto. Un correo dentro de un asunto se tacha.

Uso (desde cualquier carpeta; solo biblioteca estándar; necesita git):
    python EntregaFinal/historial_desarrollo.py                 # rama actual (HEAD)
    python EntregaFinal/historial_desarrollo.py --ref main      # una rama o commit concreto
Opciones: --repo RUTA (por defecto, el repositorio que contiene este archivo) y --salida RUTA.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI / "HISTORIAL_DESARROLLO.md"
CARPETA = "EntregaFinal/"
SEP_COMMIT, SEP_CAMPO = "\x1e", "\x1f"
FORMATO = "%x1e%H%x1f%h%x1f%P%x1f%aI%x1f%s"
DIAS = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
MESES = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
         "noviembre", "diciembre")
OMITIDO = "[asunto omitido: posible dato sensible]"
CORREO = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
SECRETOS = (
    ("una credencial asignada", re.compile(
        r"(?i)\b(?:pass(?:word|wd)?|pwd|contrase[ñn]a|secret[oa]?|token|api[_-]?key|access[_-]?key)\s*[:=]\s*\S+")),
    ("una clave asignada", re.compile(r"(?i)\bclave\s*=\s*\S+")),     # «cifras clave: …» no es un secreto
    ("credenciales en una URL", re.compile(r"(?i)\b[a-z][a-z0-9+.-]*://[^\s/:@]+:[^\s/@]+@")),
    ("un token de GitHub", re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})")),
    ("una clave de AWS", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b")),
    ("una clave de API", re.compile(r"\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}")),
    ("un token de Slack", re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}")),
    ("una clave de Google", re.compile(r"\bAIza[0-9A-Za-z_-]{35}")),
    ("una llave privada", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("un JWT", re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")),
    ("el servidor de una base de datos", re.compile(r"(?i)\b[\w.-]+\.rds\.amazonaws\.com\b")),
)


@dataclass
class Commit:
    hash: str
    corto: str
    padres: int
    fecha: datetime
    asunto: str
    archivos: int = 0
    binarios: int = 0
    agregadas: int = 0
    quitadas: int = 0
    en_entrega: int = 0            # archivos del commit dentro de EntregaFinal/


# --- Lectura -------------------------------------------------------------------------------------------------------
def rutas_numstat(campo: str) -> list[str]:
    """Rutas de una línea de --numstat; un renombre («a => b» o «dir/{a => b}/x») da la ruta vieja y la nueva."""
    campo = campo.strip()
    if len(campo) > 1 and campo[0] == campo[-1] == '"':
        campo = campo[1:-1]
    m = re.match(r"^(.*)\{(.*) => (.*)\}(.*)$", campo)
    if m:
        antes, viejo, nuevo, despues = m.groups()
        return [re.sub(r"/{2,}", "/", antes + parte + despues).lstrip("/") for parte in (viejo, nuevo)]
    return campo.split(" => ", 1) if " => " in campo else [campo]


def parsear_log(texto: str) -> list[Commit]:
    """Salida de `git log --numstat --format=FORMATO` → commits con sus conteos, en orden cronológico (fecha del
    autor; a igual fecha, el orden de git)."""
    commits = []
    for bloque in texto.split(SEP_COMMIT)[1:]:
        cabeza, _, resto = bloque.partition("\n")
        campos = cabeza.split(SEP_CAMPO)
        if len(campos) != 5:
            raise ValueError(f"línea de commit inesperada: {cabeza[:80]!r}")
        completo, corto, padres, fecha, asunto = campos
        c = Commit(completo, corto, len(padres.split()), datetime.fromisoformat(fecha), asunto.strip())
        for linea in resto.splitlines():
            partes = linea.split("\t", 2)
            if len(partes) != 3:
                continue
            mas, menos, ruta = partes
            c.archivos += 1
            if mas == "-" or menos == "-":
                c.binarios += 1
            else:
                c.agregadas += int(mas)
                c.quitadas += int(menos)
            if any(r.startswith(CARPETA) for r in rutas_numstat(ruta)):
                c.en_entrega += 1
        commits.append(c)
    return [c for _, c in sorted(enumerate(commits), key=lambda par: (par[1].fecha, par[0]))]


def depurar(commits: list[Commit]) -> list[tuple[str, str]]:
    """Tacha los correos y omite los asuntos con aspecto de secreto. Devuelve [(hash corto, motivo)] de los omitidos
    (sin el texto del asunto)."""
    omitidos = []
    for c in commits:
        motivo = next((nombre for nombre, patron in SECRETOS if patron.search(c.asunto)), None)
        if motivo is None and any(parece_aleatorio(p) for p in re.findall(r"[A-Za-z0-9+/_=-]{32,}", c.asunto)):
            motivo = "una cadena larga con aspecto aleatorio"
        if motivo:
            c.asunto = OMITIDO
            omitidos.append((c.corto, motivo))
        else:
            c.asunto = CORREO.sub("[correo omitido]", c.asunto)
    return omitidos


def parece_aleatorio(palabra: str) -> bool:
    """Cadena de 32 o más caracteres con mayúsculas, minúsculas y dígitos (base64), o hexadecimal largo que no es un
    hash de git (40) ni un SHA-256 (64)."""
    if re.fullmatch(r"[0-9a-fA-F]+", palabra):
        return len(palabra) not in (40, 64)
    return bool(re.search(r"[A-Z]", palabra) and re.search(r"[a-z]", palabra) and re.search(r"\d", palabra))


# --- Formato -------------------------------------------------------------------------------------------------------
def miles(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def fecha_larga(d: datetime) -> str:
    return f"{d.day} de {MESES[d.month - 1]} de {d.year}"


def huso(d: datetime) -> str:
    return d.strftime("%z")[:3].replace("-", "−") + ":" + d.strftime("%z")[3:]


def celda(texto: str) -> str:
    return " ".join(texto.split()).replace("|", "\\|").replace("<", "&lt;").replace(">", "&gt;")


def lineas_txt(c: Commit) -> str:
    return f"+{miles(c.agregadas)} / −{miles(c.quitadas)}"


def formatear(commits: list[Commit], omitidos: list[tuple[str, str]], generado: datetime, ref: str,
              punta: str | None = None) -> str:
    """El Markdown de HISTORIAL_DESARROLLO.md (sin correos, autores, cuerpos de mensaje ni rutas). `punta` es el hash
    completo al que apunta `ref`; si no se da, se toma el último commit por fecha."""
    if not commits:
        raise ValueError("el historial no tiene commits")
    primero, ultimo = commits[0], commits[-1]
    final = next((c for c in commits if c.hash == punta), ultimo)
    dias: dict = {}
    for c in commits:
        dias.setdefault(c.fecha.date(), []).append(c)
    husos = {huso(c.fecha) for c in commits}
    un_huso = husos.pop() if len(husos) == 1 else None
    tocan = sum(c.en_entrega > 0 for c in commits)
    fusiones = sum(c.padres > 1 for c in commits)
    if omitidos:
        nota_omitidos = (f"{len(omitidos)} asunto(s) se omitieron porque parecían traer un dato sensible: "
                         + ", ".join(f"`{h}`" for h, _ in omitidos) + ".")
    else:
        nota_omitidos = ("La revisión automática de los asuntos (claves, contraseñas, tokens, credenciales en URL, "
                         "cadenas largas con aspecto aleatorio) no omitió ninguno.")
    out = [
        "# Historial de desarrollo",
        "",
        f"Lista cronológica de **todos los commits** ({len(commits)}) del repositorio de desarrollo del equipo, "
        f"desde el primero hasta `{final.corto}`, el commit al que apuntaba `{ref}` al generarla. "
        "Responde al «historial» del entregable E03 (fila E03.3 de `MATRIZ_CUMPLIMIENTO.md`): el repositorio de "
        "entrega se arma con `empaquetar_entrega.py` a partir de `EntregaFinal/` y solo guarda sus sincronizaciones.",
        "",
        "- **De dónde sale.** `historial_desarrollo.py` lee `git log` del repositorio de desarrollo, sin red, y escribe "
        "este archivo. Por cada commit publica la fecha y la hora del autor, el hash corto, el asunto, cuántos archivos y "
        "líneas cambia (`git log --numstat -M`) y cuántos de esos archivos están en `EntregaFinal/`, la carpeta que se "
        "convierte en el repositorio de entrega.",
        "- **Qué no publica.** Correos, nombres de autor (todo el historial es de un solo contribuyente), cuerpos de "
        f"los mensajes ni rutas de archivos. {nota_omitidos}",
        "- **Cómo verificarlo.** Los hashes son los del repositorio de desarrollo del equipo, que se muestra a quien "
        "evalúe si lo pide. Ahí, "
        f"`git log --reverse --format=\"%h %aI %s\" {ref}` da la misma lista y `git show --numstat <hash>` las cifras "
        "de cada commit. Cada hash de git depende de todo lo anterior, así que el hash completo del último commit fija "
        f"la cadena entera: `{final.hash}`. El primer commit es `{primero.hash}`.",
        f"- **Generado** el {fecha_larga(generado)} a las {generado:%H:%M} ({huso(generado)}), desde `{ref}` "
        f"(`{final.corto}`). Al integrar commits nuevos se vuelve a correr el script.",
        "",
        "## Resumen",
        "",
        "| Commits | Días con commits | Primer commit | Último commit | Tocan `EntregaFinal/` | Archivos cambiados "
        "(suma) | Líneas agregadas / quitadas |",
        "|---|---|---|---|---|---|---|",
        f"| {len(commits)} | {len(dias)} | {primero.fecha.date()} | {ultimo.fecha.date()} | {tocan} | "
        f"{miles(sum(c.archivos for c in commits))} | +{miles(sum(c.agregadas for c in commits))} / "
        f"−{miles(sum(c.quitadas for c in commits))} |",
        "",
        "Un archivo binario cuenta como archivo pero no suma líneas; un archivo renombrado cuenta una vez. "
        + (f"Todas las horas tienen el mismo huso ({un_huso}). " if un_huso else "Cada hora lleva su huso. ")
        + (f"{fusiones} commit(s) de fusión no traen cifras: git no muestra su diferencia." if fusiones else
           "No hay commits de fusión: el historial es lineal."),
    ]
    for dia, lista in dias.items():
        out += ["", f"## {dia} · {DIAS[dia.weekday()]} · {len(lista)} commit{'s' if len(lista) != 1 else ''}", "",
                "| Hora | Commit | Asunto | Archivos | Líneas | En `EntregaFinal/` |", "|---|---|---|---|---|---|"]
        for c in lista:
            hora = f"{c.fecha:%H:%M}" + ("" if un_huso else f" {huso(c.fecha)}")
            if c.padres > 1:
                archivos, lineas, entrega = "fusión", "—", "—"
            else:
                binarios = f" ({c.binarios} binario{'s' if c.binarios != 1 else ''})" if c.binarios else ""
                archivos = miles(c.archivos) + binarios
                lineas = lineas_txt(c)
                entrega = f"sí ({miles(c.en_entrega)})" if c.en_entrega else "—"
            out.append(f"| {hora} | `{c.corto}` | {celda(c.asunto)} | {archivos} | {lineas} | {entrega} |")
    return "\n".join(out) + "\n"


# --- Git -----------------------------------------------------------------------------------------------------------
def git(repo: Path, *args: str) -> str:
    ejecutable = shutil.which("git")
    if ejecutable is None:
        raise RuntimeError("no encuentro git en el PATH")
    r = subprocess.run(  # noqa: S603 - git con argumentos fijos, sin shell
        [ejecutable, "-C", str(repo), "-c", "core.quotePath=false", "-c", "log.showSignature=false", *args],
        capture_output=True, encoding="utf-8", errors="replace", check=False)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or f"git {args[0]} falló")
    return r.stdout


def leer_git(repo: Path, ref: str) -> str:
    return git(repo, "log", "--reverse", "--numstat", "-M", "--no-color", "--no-ext-diff", "--no-textconv",
               f"--format={FORMATO}", ref, "--")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", type=Path, default=AQUI, help="carpeta dentro del repositorio de desarrollo del proyecto")
    ap.add_argument("--ref", default="HEAD", help="rama o commit hasta el que se lista (por defecto HEAD)")
    ap.add_argument("--salida", type=Path, default=SALIDA, help="archivo Markdown que se escribe")
    args = ap.parse_args(argv)
    try:
        raiz = Path(git(args.repo, "rev-parse", "--show-toplevel").strip())
        if not (raiz / CARPETA).is_dir():
            raise RuntimeError(f"{raiz} no tiene la carpeta {CARPETA}: el historial se genera en el repositorio "
                               "de desarrollo del proyecto; en el de entrega este archivo ya viene hecho")
        punta = git(raiz, "rev-parse", "--verify", f"{args.ref}^{{commit}}").strip()
        commits = parsear_log(leer_git(raiz, args.ref))
    except (RuntimeError, ValueError) as e:
        print(f"No se generó el historial: {e}", file=sys.stderr)
        return 2
    omitidos = depurar(commits)
    texto = formatear(commits, omitidos, datetime.now().astimezone(), args.ref, punta)
    args.salida.write_text(texto, encoding="utf-8", newline="\n")
    for corto, motivo in omitidos:
        print(f"aviso: el asunto del commit {corto} parece traer {motivo}; no se publicó (revíselo)", file=sys.stderr)
    print(f"{args.salida}: {len(commits)} commits hasta {commits[-1].corto} ({args.ref}), {len(omitidos)} asuntos "
          "omitidos")
    return 0


if __name__ == "__main__":
    sys.exit(main())

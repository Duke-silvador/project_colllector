"""Catalogo configurable de lineas de negocio para comisiones."""

import json
from pathlib import Path

PATH = Path(__file__).resolve().parent / "config" / "business_lines.json"


def cargar_lineas_negocio():
    with PATH.open(encoding="utf-8") as source:
        names = json.load(source)["business_lines"]
    if not isinstance(names, list) or not names:
        raise ValueError("business_lines debe ser una lista no vacia.")
    if any(not isinstance(name, str) or not name.strip() for name in names):
        raise ValueError("Cada linea de negocio debe tener un nombre no vacio.")
    names = [name.strip() for name in names]
    if len({name.casefold() for name in names}) != len(names):
        raise ValueError("Hay lineas de negocio duplicadas en la configuracion.")
    return names


def agregar_linea_negocio(name):
    name = str(name).strip()
    if not (1 <= len(name) <= 50):
        raise ValueError("Escribe un nombre de 1 a 50 caracteres.")
    names = cargar_lineas_negocio()
    if any(existing.casefold() == name.casefold() for existing in names):
        raise ValueError("Esa línea de negocio ya existe.")
    names.append(name)
    temporary = PATH.with_suffix(".tmp")
    temporary.write_text(json.dumps({"business_lines": names}, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(PATH)
    return name

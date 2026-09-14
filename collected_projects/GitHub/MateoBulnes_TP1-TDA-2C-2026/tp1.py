#!/usr/bin/env python3
import sys

def requiere_desbalanceo_inicial(monedas):
    n = len(monedas)
    if n % 2 != 0:
        return False

    # capicua
    for k in range(n // 2):
        if monedas[k] != monedas[n - 1 - k]:
            return False

    # no decreciente desde el extremo hacia el centro
    for k in range(n // 2 - 1):
        if monedas[k] > monedas[k + 1]:
            return False

    return True


def resolver(monedas):
    i, j = 0, len(monedas) - 1
    jugadas = []
    total = {"Sophia": 0, "Mateo": 0}
    turno = "Sophia"

    desbalanceo = requiere_desbalanceo_inicial(monedas)
    nro_turno = 0

    while i <= j:
        nro_turno += 1

        if turno == "Sophia":
            tomar_primera = monedas[i] >= monedas[j]
        elif desbalanceo and nro_turno == 2:
            tomar_primera = monedas[i] >= monedas[j]
        else:
            tomar_primera = monedas[i] <= monedas[j]

        pos = i if tomar_primera else j
        jugadas.append((turno, "Primera" if tomar_primera else "Ultima", monedas[pos]))
        total[turno] += monedas[pos]

        if tomar_primera:
            i += 1
        else:
            j -= 1

        turno = "Mateo" if turno == "Sophia" else "Sophia"

    return jugadas, total["Sophia"], total["Mateo"]

def leer_entrada(ruta):
    valores = []
    with open(ruta, "r", encoding="utf-8") as f:
        for linea in f:
            linea = linea.strip()
            if not linea or linea.startswith("#"):
                continue
            for token in linea.replace(";", " ").replace(",", " ").split():
                try:
                    valores.append(int(token))
                except ValueError:
                    raise ValueError("valor no numerico en la entrada: '{}'".format(token))

    if not valores:
        raise ValueError("el archivo no contiene monedas")

    return valores


def imprimir_resultado(jugadas, total_sophia, total_mateo):
    partes = []
    for jugador, extremo, _ in jugadas:
        etiqueta = "Primera" if extremo == "Primera" else "Última"
        partes.append("{} moneda para {}".format(etiqueta, jugador))

    print("; ".join(partes))
    print("Puntos de Sophia: {}".format(total_sophia))
    print("Puntos de Mateo: {}".format(total_mateo))
    print("Ganador: {} por {}".format("Sophia" if total_sophia > total_mateo else "Mateo",total_sophia - total_mateo if total_sophia > total_mateo else total_mateo - total_sophia))


def main():
    if len(sys.argv) != 2:
        print("Uso: python3 tp1.py ruta/a/entrada.txt", file=sys.stderr)
        return 1

    try:
        monedas = leer_entrada(sys.argv[1])
    except FileNotFoundError:
        print("Error: no se encontro el archivo '{}'".format(sys.argv[1]), file=sys.stderr)
        return 1
    except (ValueError, OSError) as e:
        print("Error al leer la entrada: {}".format(e), file=sys.stderr)
        return 1

    jugadas, total_sophia, total_mateo = resolver(monedas)
    imprimir_resultado(jugadas, total_sophia, total_mateo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
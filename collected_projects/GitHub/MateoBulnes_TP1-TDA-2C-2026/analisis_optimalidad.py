#!/usr/bin/env python3

import os
import random
import statistics
import sys
from itertools import product

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tp1 import resolver



def optimo_fuerza_bruta(monedas):
    a = monedas

    def explorar(i, j, turno):
        if i > j:
            return 0
        if turno == 0:                   
            return max(a[i] + explorar(i + 1, j, 1),
                       a[j] + explorar(i, j - 1, 1))
        return max(explorar(i + 1, j, 0),  
                   explorar(i, j - 1, 0))

    return explorar(0, len(a) - 1, 0)


def paridad(monedas):
    return max(sum(monedas[0::2]), sum(monedas[1::2]))


def exhaustivo(n_max=8, v_max=3):
    print("=" * 76)
    print("EXPERIMENTO 1 - Todos los arreglos de n<=%d con valores 1..%d" % (n_max, v_max))
    print("=" * 76)
    print("%-4s %-9s %-12s %-8s %-9s %-8s %-9s" % (
        "n", "casos", "Ms=optimo", "gana", "empata", "pierde", "Ms<T/2"))

    ejemplos = []
    for n in range(2, n_max + 1):
        casos = iguales = gana = empata = pierde = bajo_mitad = 0

        for arr in product(range(1, v_max + 1), repeat=n):
            arr = list(arr)
            casos += 1
            _, s, m = resolver(arr)
            opt = optimo_fuerza_bruta(arr)

            if s == opt:
                iguales += 1
            if 2 * s < sum(arr):
                bajo_mitad += 1

            if s > m:
                gana += 1
            elif s == m:
                empata += 1
                # empate evitable: existia una secuencia ganadora
                if opt * 2 > sum(arr) and len(ejemplos) < 5:
                    ejemplos.append((arr, s, m, opt, sum(arr)))
            else:
                pierde += 1

        print("%-4d %-9d %-12d %-8d %-9d %-8d %-9d" % (
            n, casos, iguales, gana, empata, pierde, bajo_mitad))

    if ejemplos:
        print("\nEmpates evitables (el algoritmo empata pero existia victoria):")
        for arr, s, m, opt, tot in ejemplos:
            print("  %-24s -> %d-%d (empate), maximo alcanzable %d de %d" % (
                arr, s, m, opt, tot))
    print()


def dispersion(n=14, repeticiones=200, semilla=42):
    print("=" * 76)
    print("EXPERIMENTO 2 - Dispersion de los valores (n=%d, %d muestras por escenario)" % (
        n, repeticiones))
    print("=" * 76)
    print("%-22s %-7s %-13s %-14s %-9s" % (
        "distribucion", "CV", "Ms/optimo", "paridad/optimo", "gana"))

    random.seed(semilla)

    escenarios = [
        ("todas iguales", lambda: [50] * n),
        ("rango estrecho", lambda: [random.randint(48, 52) for _ in range(n)]),
        ("rango medio", lambda: [random.randint(25, 75) for _ in range(n)]),
        ("rango amplio", lambda: [random.randint(1, 100) for _ in range(n)]),
        ("muy disperso", lambda: [random.choice([1, 2, 3, 500, 1000]) for _ in range(n)]),
        ("un pico dominante", lambda: [random.randint(1, 5) for _ in range(n)]),
    ]

    for nombre, generador in escenarios:
        razones, razones_par, cvs = [], [], []
        victorias = 0

        for _ in range(repeticiones):
            arr = generador()
            if nombre == "un pico dominante":
                arr[random.randrange(n)] = 1000

            _, s, m = resolver(arr)
            opt = optimo_fuerza_bruta(arr)

            razones.append(s / opt)
            razones_par.append(paridad(arr) / opt)
            media = statistics.mean(arr)
            cvs.append(statistics.pstdev(arr) / media if media else 0)
            if s > m:
                victorias += 1

        print("%-22s %-7.2f %-13.4f %-14.4f %d/%d" % (
            nombre, statistics.mean(cvs),
            statistics.mean(razones), statistics.mean(razones_par),
            victorias, repeticiones))
    print()


def peor_razon(intentos=6000, semilla=11):
    print("=" * 76)
    print("EXPERIMENTO 3 - Peor razon Ms/optimo hallada (%d intentos)" % intentos)
    print("=" * 76)

    random.seed(semilla)
    peor = None

    for _ in range(intentos):
        n = random.choice([8, 10])
        arr = [random.choice([1, 2, 3, 100, 200]) for _ in range(n)]
        _, s, _ = resolver(arr)
        opt = optimo_fuerza_bruta(arr)
        razon = s / opt
        if peor is None or razon < peor[0]:
            peor = (razon, arr, s, opt)

    razon, arr, s, opt = peor
    print("razon:   %.4f" % razon)
    print("arreglo: %s" % arr)
    print("Ms = %d   maximo alcanzable = %d   total = %d" % (s, opt, sum(arr)))
    print()
    print("La cota teorica es 1/2: el algoritmo garantiza Ms >= T/2 y el maximo")
    print("no puede exceder T, de modo que Ms/optimo >= 1/2.")
    print()


if __name__ == "__main__":
    exhaustivo()
    dispersion()
    peor_razon()
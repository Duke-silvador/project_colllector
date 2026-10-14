import csv
import os
import statistics

# ---------- Configuracion ----------

ARCHIVO_RESULTADOS = "resultados.csv"
ARCHIVO_METRICAS = "metricas.csv"
VERSION_BASE = "secuencial"
REPETICIONES_ESPERADAS = 30


# ---------- Funciones ----------

def leer_tiempos(ruta):
    # Agrupa los tiempos validos por (version, imagen, kernel, hilos).
    # Tambien cuenta las ejecuciones que no son validas, que no se usan.
    tiempos = {}
    no_validas = 0
    with open(ruta, newline="") as archivo:
        for fila in csv.DictReader(archivo):
            if fila["valido"] == "si":
                clave = (fila["version"], int(fila["imagen"]), int(fila["kernel"]), int(fila["hilos"]))
                if clave not in tiempos:
                    tiempos[clave] = []
                tiempos[clave].append(float(fila["tiempo_ms"]))
            else:
                no_validas = no_validas + 1
    return tiempos, no_validas


def calcular_filas(tiempos):
    filas = []
    for clave in sorted(tiempos):
        version, imagen, kernel, hilos = clave
        lista = tiempos[clave]

        # Promedio y desviacion estandar (con N - 1) de los tiempos
        promedio = statistics.mean(lista)
        desviacion = 0.0
        if len(lista) > 1:
            desviacion = statistics.stdev(lista)

        # Speedup = T1 / Tp y Eficiencia = Speedup / p
        # T1 es el tiempo promedio de la secuencial con la misma imagen y kernel
        speedup = ""
        eficiencia = ""
        clave_base = (VERSION_BASE, imagen, kernel, 1)
        if clave_base in tiempos:
            t1 = statistics.mean(tiempos[clave_base])
            speedup = round(t1 / promedio, 4)
            eficiencia = round(t1 / promedio / hilos, 4)

        filas.append([version, imagen, kernel, hilos, len(lista),
                      round(promedio, 4), round(desviacion, 4),
                      round(min(lista), 4), round(max(lista), 4),
                      speedup, eficiencia])
    return filas


def main():
    if not os.path.exists(ARCHIVO_RESULTADOS):
        print(f"No se encontro {ARCHIVO_RESULTADOS}. Primero hay que correr ejecutar_pruebas.py")
    else:
        tiempos, no_validas = leer_tiempos(ARCHIVO_RESULTADOS)

        if no_validas > 0:
            print(f"Aviso: hay {no_validas} ejecuciones no validas. No se usaron en los calculos.")
        for clave in sorted(tiempos):
            cantidad = len(tiempos[clave])
            if cantidad != REPETICIONES_ESPERADAS:
                print(f"Aviso: {clave[0]}, imagen {clave[1]}, kernel {clave[2]}, hilos {clave[3]} "
                      f"tiene {cantidad} ejecuciones validas y se esperaban {REPETICIONES_ESPERADAS}.")
        if not any(clave[0] == VERSION_BASE for clave in tiempos):
            print("Aviso: no hay datos de la version secuencial, no se puede calcular speedup ni eficiencia.")

        filas = calcular_filas(tiempos)
        with open(ARCHIVO_METRICAS, "w", newline="") as archivo:
            escritor = csv.writer(archivo)
            escritor.writerow(["version", "imagen", "kernel", "hilos", "repeticiones",
                               "tiempo_promedio_ms", "desviacion_ms", "minimo_ms", "maximo_ms",
                               "speedup", "eficiencia"])
            escritor.writerows(filas)
        print(f"Se guardaron {len(filas)} configuraciones en {ARCHIVO_METRICAS}")


main()

import csv
import os
import subprocess

# ---------- Configuracion ----------

# True hace una prueba rapida con pocas repeticiones y pocas configuraciones.
# False hace la corrida completa del experimento.
MODO_PRUEBA = False

ARCHIVO_RESULTADOS = "resultados.csv"

# Nombre de cada version y ruta de su ejecutable.
VERSIONES = {
    "secuencial": "./secuencial",
    "paralelo_ia": "./paralelo_ia",
    "paralelo_ia_opt": "./paralelo_ia_opt",
    "paralelo_manual": "./paralelo_manual",
}

# La version secuencial es la referencia y solo se ejecuta con 1 hilo.
VERSION_BASE = "secuencial"

if MODO_PRUEBA:
    REPETICIONES = 3
    IMAGENES = [512]
    KERNELS = [3, 5]
    HILOS = [1, 2]
else:
    REPETICIONES = 30
    IMAGENES = [512, 1024, 2048, 4096]
    KERNELS = [3, 5, 7, 11]
    HILOS = [1, 2, 4, 8, 16]

# Checksum de referencia de la version secuencial para cada (imagen, kernel).
# Son los mismos valores del archivo checksums_referencia.md
REFERENCIAS = {
    (512, 3): 521274,
    (512, 5): 843863,
    (512, 7): 260804,
    (512, 11): 997219,
    (1024, 3): 486587,
    (1024, 5): 355593,
    (1024, 7): 931979,
    (1024, 11): 780123,
    (2048, 3): 33804,
    (2048, 5): 218845,
    (2048, 7): 584088,
    (2048, 11): 711740,
    (4096, 3): 126470,
    (4096, 5): 69486,
    (4096, 7): 570480,
    (4096, 11): 281186,
}


# ---------- Funciones ----------

def versiones_disponibles():
    # Devuelve las versiones cuyo ejecutable existe y avisa de las que faltan.
    disponibles = []
    for version in VERSIONES:
        if os.path.exists(VERSIONES[version]):
            disponibles.append(version)
        else:
            print(f"No se encontro el ejecutable de {version} ({VERSIONES[version]}). Se omite.")
    return disponibles


def hilos_de(version):
    lista = HILOS
    if version == VERSION_BASE:
        lista = [1]
    return lista


def leer_hechas(ruta):
    # Devuelve las ejecuciones que ya estan guardadas, para poder continuar
    # si la corrida se interrumpio.
    hechas = set()
    if os.path.exists(ruta):
        with open(ruta, newline="") as archivo:
            for fila in csv.DictReader(archivo):
                clave = (fila["version"], int(fila["imagen"]), int(fila["kernel"]),
                         int(fila["hilos"]), int(fila["repeticion"]))
                hechas.add(clave)
    return hechas


def ejecutar_una(ruta, imagen, kernel, hilos):
    # Corre el programa una vez y devuelve (tiempo en ms, checksum).
    # Si algo falla devuelve None en el dato que no pudo leer.
    entrada = f"{imagen} {kernel} {hilos}\n"
    resultado = subprocess.run([ruta], input=entrada, capture_output=True, text=True)
    tiempo = None
    checksum = None
    if resultado.returncode == 0:
        for linea in resultado.stdout.splitlines():
            if linea.startswith("Tiempo de procesamiento"):
                tiempo = float(linea.split(":")[1])
            if linea.startswith("Checksum:"):
                checksum = int(linea.split(":")[1])
    return tiempo, checksum


def decidir_validez(tiempo, checksum, referencia):
    # "si" si el checksum coincide con el de referencia,
    # "no" si es distinto y "error" si el programa fallo o no imprimio lo esperado.
    validez = "si"
    if tiempo is None or checksum is None:
        validez = "error"
    elif checksum != referencia:
        validez = "no"
    return validez


def main():
    disponibles = versiones_disponibles()
    hechas = leer_hechas(ARCHIVO_RESULTADOS)
    archivo_nuevo = not os.path.exists(ARCHIVO_RESULTADOS)
    nuevas = 0
    no_validas = 0

    with open(ARCHIVO_RESULTADOS, "a", newline="") as archivo:
        escritor = csv.writer(archivo)
        if archivo_nuevo:
            escritor.writerow(["version", "imagen", "kernel", "hilos",
                               "repeticion", "tiempo_ms", "checksum", "valido"])

        for imagen in IMAGENES:
            for kernel in KERNELS:
                referencia = REFERENCIAS[(imagen, kernel)]
                for version in disponibles:
                    for hilos in hilos_de(version):
                        for repeticion in range(1, REPETICIONES + 1):
                            clave = (version, imagen, kernel, hilos, repeticion)
                            if clave not in hechas:
                                tiempo, checksum = ejecutar_una(VERSIONES[version], imagen, kernel, hilos)
                                validez = decidir_validez(tiempo, checksum, referencia)
                                escritor.writerow([version, imagen, kernel, hilos,
                                                   repeticion, tiempo, checksum, validez])
                                archivo.flush()
                                nuevas = nuevas + 1
                                if validez != "si":
                                    no_validas = no_validas + 1
                        print(f"Imagen {imagen}, kernel {kernel}, {version}, {hilos} hilo(s): listo")

    print(f"Ejecuciones nuevas: {nuevas}")
    print(f"Ejecuciones no validas o con error: {no_validas}")
    print(f"Resultados guardados en {ARCHIVO_RESULTADOS}")
    if no_validas > 0:
        print("Revisar la columna valido del archivo: hay resultados que no coinciden con la referencia.")


main()
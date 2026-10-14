import datetime
import os
import platform
import shutil
import subprocess

# Guarda los datos de la maquina donde se corren las pruebas.

ARCHIVO_SALIDA = "informacion_maquina.txt"


def leer_dato(ruta, inicio):
    # Busca en un archivo de texto la primera linea que empieza con "inicio"
    # y devuelve lo que hay despues de los dos puntos.
    dato = ""
    if os.path.exists(ruta):
        with open(ruta) as archivo:
            for linea in archivo:
                if dato == "" and linea.startswith(inicio):
                    dato = linea.split(":", 1)[1].strip()
    return dato


def procesador():
    nombre = leer_dato("/proc/cpuinfo", "model name")
    if nombre == "":
        nombre = platform.processor()
    return nombre


def memoria_gb():
    texto = leer_dato("/proc/meminfo", "MemTotal")
    resultado = "No se pudo leer, revisar a mano"
    if texto != "":
        kilobytes = int(texto.split()[0])
        resultado = str(round(kilobytes / 1024 / 1024, 1))
    return resultado


def compilador():
    version = "g++ no encontrado"
    if shutil.which("g++") is not None:
        salida = subprocess.run(["g++", "--version"], capture_output=True, text=True)
        version = salida.stdout.splitlines()[0]
    return version


def datos_de_nucleos():
    # Con lscpu (Linux) se obtienen los nucleos fisicos. En otros sistemas se revisa a mano.
    lineas = []
    if shutil.which("lscpu") is not None:
        salida = subprocess.run(["lscpu"], capture_output=True, text=True)
        for linea in salida.stdout.splitlines():
            if linea.startswith(("Thread(s) per core", "Core(s) per socket", "Socket(s)")):
                lineas.append(linea.strip())
    else:
        lineas.append("Nucleos fisicos: revisar en el Administrador de tareas (pestana Rendimiento)")
    return lineas


def main():
    lineas = [
        f"Fecha: {datetime.date.today()}",
        f"Procesador: {procesador()}",
        f"Nucleos logicos (hilos que ofrece el sistema): {os.cpu_count()}",
    ]
    lineas = lineas + datos_de_nucleos()
    lineas.append(f"Memoria RAM (GB): {memoria_gb()}")
    lineas.append(f"Sistema operativo: {platform.platform()}")
    lineas.append(f"Compilador: {compilador()}")
    lineas.append(f"Python: {platform.python_version()}")

    with open(ARCHIVO_SALIDA, "w") as archivo:
        for linea in lineas:
            print(linea)
            archivo.write(linea + "\n")
    print(f"Datos guardados en {ARCHIVO_SALIDA}")


main()

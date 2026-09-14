from concurrent.futures import ProcessPoolExecutor, as_completed
import time
import os

# Este parámetro controla cuantas veces se ejecuta el algoritmo para cada
# tamaño. Esto es conveniente para reducir el error estadístico en la medición
# de tiempos. Al finalizar las ejecuciones, se promedian los tiempos obtenidos
RUNS_PER_SIZE = 10

# Ajustar este valor si se quiere usar más de un proceso para medir los tiempos
# de ejecución, o None para usar todos los procesadores disponibles. Si se usan
# varios procesos, tener cuidado con el uso de memoria del sistema.
MAX_WORKERS = max(1, (os.cpu_count() or 0) // 4)


def _time_run(algorithm, *args):
    start = time.time()
    algorithm(*args)
    return time.time() - start


def time_algorithm(algorithm, sizes, get_args):
    futures = {}
    total_times = {i: 0 for i in sizes}
    total_tasks = len(sizes) * RUNS_PER_SIZE
    completados = 0
    print(f"Procesos en paralelo (workers): {MAX_WORKERS}")
    print(f"Repeticiones por tamaño: {RUNS_PER_SIZE}")
    print(f"Ejecuciones totales a realizar: {total_tasks}\n")
    # Usa un ProcessPoolExecutor para ejecutar las mediciones en paralelo
    # (el ThreadPoolExecutor no sirve por el GIL de Python)
    with ProcessPoolExecutor(MAX_WORKERS) as p:
        for i in sizes:
            for _ in range(RUNS_PER_SIZE):
                futures[p.submit(_time_run, algorithm, *get_args(i))] = i

        for f in as_completed(futures):
            result = f.result()
            i = futures[f]
            total_times[i] += result
            completados += 1
            porcentaje = (completados / total_tasks) * 100
            print(f"\rProgreso de mediciones: [{completados}/{total_tasks}] ({porcentaje:.1f}%)", end="", flush=True)
    return {s: t / RUNS_PER_SIZE for s, t in total_times.items()}
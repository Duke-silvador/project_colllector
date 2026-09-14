from random import seed
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from util import time_algorithm
from tp1 import resolver

def generar_array_random(tamaño):
    return (list(np.random.randint(0, 50000, tamaño)),)

def ajustar_cuadrados_minimos(x, y):
    c1, c2 = np.polyfit(x, y, 1)
    y_ajuste = c1 * x + c2
    error = np.sum((y_ajuste - y) ** 2)
    return c1, c2, error

def graficar(x, resultados, c1, c2):
    tiempos_medidos = []
    for n in x:
        tiempo_promedio = resultados[n]
        tiempos_medidos.append(tiempo_promedio)
    y = np.array(tiempos_medidos)
    y_ajuste = c1 * x + c2
    errores = np.abs(y - y_ajuste)

    fig, (ax_principal, ax_error) = plt.subplots(2, 1, figsize=(8, 7))
    plt.subplots_adjust(left=0.15, hspace=0.40)

    ax_principal.plot(x, y, 'o-', label="Medicion", color='tab:blue')
    ax_principal.plot(x, y_ajuste, 'r--', label="Ajuste $O(n)$")
    ax_principal.set_title('Tiempo de ejecucion de jugar_greedy')
    ax_principal.set_xlabel('Cantidad de monedas ($n$)')
    ax_principal.set_ylabel('Tiempo de ejecucion (s)')
    ax_principal.legend(loc='upper left')

    ax_error.plot(x, errores, 'o-', color='tab:red', label="Error absoluto")
    ax_error.set_title('Error absoluto del ajuste')
    ax_error.set_xlabel('Cantidad de monedas ($n$)')
    ax_error.set_ylabel('|medido - ajuste| (s)')

    plt.show()

def main():
    seed(12345)
    np.random.seed(12345)
    sns.set_theme()

    tamaño_inicial = 10000
    tamaño_final = 100000
    cantidad_pasos = 10
    puntos_flotantes = np.linspace(tamaño_inicial, tamaño_final, num=cantidad_pasos)
    x = puntos_flotantes.astype(int)

    print("Midiendo tiempos de ejecucion...")
    resultados = time_algorithm(resolver, x, generar_array_random)
    tiempos_medidos = []
    for n in x:
        tiempo_promedio = resultados[n]
        tiempos_medidos.append(tiempo_promedio)
    y = np.array(tiempos_medidos)

    print("\nCalculando ajuste lineal...")
    c1, c2, error = ajustar_cuadrados_minimos(x, y)

    y_ajuste = c1 * x + c2
    errores_abs = np.abs(y - y_ajuste)

    print("\n--- Resultados del ajuste T(n) = c1*n + c2 ---")
    print(f"c1 (pendiente)        : {c1:.6e}")
    print(f"c2 (ordenada)         : {c2:.6e}")
    print(f"Error cuadrático total: {error:.6e}")
    print(f"Error abs máximo      : {np.max(errores_abs):.6f} s")
    print(f"Error abs promedio    : {np.mean(errores_abs):.6f} s\n")
    graficar(x, resultados, c1, c2)

if __name__ == '__main__':
    main()
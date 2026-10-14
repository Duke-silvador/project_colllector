#include <iostream>
#include <vector>
#include <omp.h>

using namespace std;

// Genera una imagen cuadrada con valores (0 a 255)
vector<int> generarImagen(int n) {
    vector<int> img(n * n);
    int estado = 12345;
    for (int i = 0; i < n * n; i++) {
        estado = (estado * 75 + 74) % 65537;
        img[i] = estado % 256;
    }
    return img;
}

// Crea una matriz de kernel de tamano k x k llena de unos
vector<int> generarKernel(int k) {
    return vector<int>(k * k, 1);
}

// Aplica el filtro de convolucion 2D con una zona interior optimizada
void convolucion(const vector<int>& entrada, vector<int>& salida,
                 const vector<int>& kernel, int n, int k, int hilos) {
    const int r = k / 2;
    const int divisor = k * k;
    const int ventana = 2 * r + 1;
    // OPT-5: evitar accesos fuera del kernel para k par; el referente solo
    // tiene comportamiento definido con su rango original cuando k es impar.
    const bool kernel_completo = (ventana <= k);

    // OPT-1: usar punteros restrict para expresar que los buffers no se
    // solapan y evitar accesos repetidos a las abstracciones vectoriales.
    const int* __restrict entrada_ptr = entrada.data();
    int* __restrict salida_ptr = salida.data();
    const int* __restrict kernel_ptr = kernel.data();

    // OPT-2: static es adecuado porque cada fila tiene un costo similar y
    // evita la sobrecarga de repartir trabajo dinamicamente.
    #pragma omp parallel for num_threads(hilos) schedule(static)
    for (int y = 0; y < n; y++) {
        const bool fila_interior =
            kernel_completo && y >= r && y + r < n;

        if (fila_interior) {
            // OPT-3: las columnas interiores no necesitan comprobaciones de
            // limites; se conservan caminos separados para los bordes.
            for (int x = 0; x < r; x++) {
                int suma = 0;
                for (int ky = -r; ky <= r; ky++) {
                    for (int kx = -r; kx <= r; kx++) {
                        int yy = y + ky;
                        int xx = x + kx;
                        if (yy >= 0 && yy < n && xx >= 0 && xx < n &&
                            ky + r < k && kx + r < k) {
                            suma += entrada_ptr[yy * n + xx] *
                                    kernel_ptr[(ky + r) * k + (kx + r)];
                        }
                    }
                }
                salida_ptr[y * n + x] = suma / divisor;
            }

            for (int x = r; x < n - r; x++) {
                int suma = 0;

                // OPT-4: se calculan una vez los punteros a las filas de la
                // ventana y del kernel; los offsets avanzan linealmente.
                for (int ky = 0; ky < ventana; ky++) {
                    const int* fila_entrada =
                        entrada_ptr + (y + ky - r) * n + x - r;
                    const int* fila_kernel = kernel_ptr + ky * k;
                    for (int kx = 0; kx < ventana; kx++) {
                        suma += fila_entrada[kx] * fila_kernel[kx];
                    }
                }
                salida_ptr[y * n + x] = suma / divisor;
            }

            for (int x = n - r; x < n; x++) {
                int suma = 0;
                for (int ky = -r; ky <= r; ky++) {
                    for (int kx = -r; kx <= r; kx++) {
                        int yy = y + ky;
                        int xx = x + kx;
                        if (yy >= 0 && yy < n && xx >= 0 && xx < n &&
                            ky + r < k && kx + r < k) {
                            suma += entrada_ptr[yy * n + xx] *
                                    kernel_ptr[(ky + r) * k + (kx + r)];
                        }
                    }
                }
                salida_ptr[y * n + x] = suma / divisor;
            }
        } else {
            for (int x = 0; x < n; x++) {
                int suma = 0;
                for (int ky = -r; ky <= r; ky++) {
                    for (int kx = -r; kx <= r; kx++) {
                        int yy = y + ky;
                        int xx = x + kx;
                        if (yy >= 0 && yy < n && xx >= 0 && xx < n &&
                            ky + r < k && kx + r < k) {
                            suma += entrada_ptr[yy * n + xx] *
                                    kernel_ptr[(ky + r) * k + (kx + r)];
                        }
                    }
                }
                salida_ptr[y * n + x] = suma / divisor;
            }
        }
    }
}

// Calcula un hash de verificacion para comprobar el resultado
int checksum(const vector<int>& img) {
    int h = 7;
    for (int i = 0; i < (int)img.size(); i++) {
        h = (h * 131 + img[i]) % 1000003;
    }
    return h;
}

int main() {
    int n, k, hilos;
    cin >> n >> k >> hilos;

    vector<int> entrada = generarImagen(n);
    vector<int> kernel = generarKernel(k);
    vector<int> salida(n * n);

    double inicio = omp_get_wtime();
    convolucion(entrada, salida, kernel, n, k, hilos);
    double fin = omp_get_wtime();
    double ms = (fin - inicio) * 1000.0;

    cout << "Tiempo de procesamiento (ms): " << ms << endl;
    cout << "Checksum: " << checksum(salida) << endl;
    return 0;
}

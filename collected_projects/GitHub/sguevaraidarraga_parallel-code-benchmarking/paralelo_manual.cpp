#include <iostream>
#include <vector>
#include <chrono>
#include <iomanip>
#include <omp.h>
using namespace std;

// Generacion y checksum copiados de la referencia del equipo (rama secuencial).
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

// Cada hilo escribe filas diferentes; entrada y kernel son de solo lectura.
int convolucionParalela(const vector<int>& entrada, vector<int>& salida,
                        const vector<int>& kernel, int n, int k, int hilos) {
    const int r = k / 2;
    const int divisor = k * k;
    int hilosUsados = 0;
    #pragma omp parallel num_threads(hilos) default(none) \
        shared(entrada, salida, kernel, hilosUsados) firstprivate(n, k, r, divisor)
    {
        #pragma omp single
        hilosUsados = omp_get_num_threads();

        #pragma omp for schedule(static)
        for (int y = 0; y < n; y++) {
            for (int x = 0; x < n; x++) {
                int suma = 0;
                for (int ky = -r; ky <= r; ky++) {
                    for (int kx = -r; kx <= r; kx++) {
                        const int yy = y + ky;
                        const int xx = x + kx;
                        if (yy >= 0 && yy < n && xx >= 0 && xx < n) {
                            suma += entrada[yy * n + xx] * kernel[(ky + r) * k + (kx + r)];
                        }
                    }
                }
                salida[y * n + x] = suma / divisor;
            }
        }
    }
    return hilosUsados;
}

int checksum(const vector<int>& img) {
    int h = 7;
    for (int i = 0; i < (int)img.size(); i++) {
        h = (h * 131 + img[i]) % 1000003;
    }
    return h;
}

int main() {
    int n, k, hilos;
    if (!(cin >> n >> k >> hilos) ||
        (n != 512 && n != 1024 && n != 2048 && n != 4096) ||
        (k != 3 && k != 5 && k != 7 && k != 11) ||
        (hilos != 1 && hilos != 2 && hilos != 4 && hilos != 8 && hilos != 16)) {
        cerr << "Entrada invalida. Use n k hilos con los valores del CL11.\n";
        return 1;
    }
    vector<int> entrada = generarImagen(n);
    vector<int> kernel = generarKernel(k);
    vector<int> salida(n * n);
    omp_set_dynamic(0);

    const auto inicio = chrono::steady_clock::now();
    const int usados = convolucionParalela(entrada, salida, kernel, n, k, hilos);
    const auto fin = chrono::steady_clock::now();

    if (usados != hilos) {
        cerr << "OpenMP no pudo utilizar la cantidad de hilos solicitada.\n";
        return 1;
    }
    const double ms = chrono::duration<double, milli>(fin - inicio).count();
    cout << fixed << setprecision(6);
    cout << "Tiempo de procesamiento (ms): " << ms << '\n';
    cout << "Checksum: " << checksum(salida) << '\n';
    return 0;
}

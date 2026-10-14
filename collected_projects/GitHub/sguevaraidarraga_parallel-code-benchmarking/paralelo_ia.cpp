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

// Aplica el filtro de convolucion 2D en paralelo sobre las filas
void convolucion(const vector<int>& entrada, vector<int>& salida,
                 const vector<int>& kernel, int n, int k, int hilos) {
    int r = k / 2;
    int divisor = k * k;

    #pragma omp parallel for num_threads(hilos)
    for (int y = 0; y < n; y++) {
        for (int x = 0; x < n; x++) {
            int suma = 0;
            for (int ky = -r; ky <= r; ky++) {
                for (int kx = -r; kx <= r; kx++) {
                    int yy = y + ky;
                    int xx = x + kx;
                    if (yy >= 0 && yy < n && xx >= 0 && xx < n) {
                        suma += entrada[yy * n + xx] *
                                kernel[(ky + r) * k + (kx + r)];
                    }
                }
            }
            salida[y * n + x] = suma / divisor;
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

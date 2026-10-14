#include <iostream>
#include <vector>
#include <ctime>
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

// Aplica el filtro de convolucion 2D a la imagen de forma secuencial
void convolucion(const vector<int>& entrada, vector<int>& salida, const vector<int>& kernel, int n, int k) {
    int r = k / 2;
    int divisor = k * k;

    // Recorre cada pixel de la imagen
    for (int y = 0; y < n; y++) {
        for (int x = 0; x < n; x++) {
            int suma = 0;

            // Recorre los vecinos segun el tamaño del kernel
            for (int ky = -r; ky <= r; ky++) {
                for (int kx = -r; kx <= r; kx++) {
                    int yy = y + ky;
                    int xx = x + kx;

                    // Verifica que este dentro de los limites de la imagen
                    if (yy >= 0 && yy < n && xx >= 0 && xx < n) {
                        suma += entrada[yy * n + xx] * kernel[(ky + r) * k + (kx + r)];
                    }
                }
            }
            // Guarda el promedio en la posicion correspondiente
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
    // Lectura: tamano imagen (n), tamano kernel (k) e hilos
    int n, k, hilos;
    cin >> n >> k >> hilos;

    // Creacion de datos
    vector<int> entrada = generarImagen(n);
    vector<int> kernel = generarKernel(k);
    vector<int> salida(n * n);

    // Medicion de tiempo de ejecucion
    clock_t inicio = clock();
    convolucion(entrada, salida, kernel, n, k);
    clock_t fin = clock();

    double ms = 1000.0 * (fin - inicio) / CLOCKS_PER_SEC;

    // Salida de resultados
cout << "Tiempo de procesamiento (ms): " << ms << endl;
    cout << "Checksum: " << checksum(salida) << endl;
    return 0;
}
#include <algorithm>
#include <chrono>
#include <fstream>
#include <iostream>
#include <numeric>
#include <string>
#include <vector>

#include "fileUtils.h"
#include "shortestPaths.h"

// Benchmark no mesmo formato do LCS: 6 execuções por tamanho/algoritmo,
// a primeira é descartada e a média é tomada sobre as últimas 5.
// A leitura do grafo fica fora da seção cronometrada (como no LCS).
// Origem única s = 0 para todos os grafos.
int main()
{
    std::string filePrefix = "./input/Entrada ";
    std::string fileSufix = ".txt";
    std::vector<std::string> fileList = {"10", "25", "50", "75", "100",
                                         "150", "200", "250", "300", "400",
                                         "500", "650", "800", "1000", "1500"};
    const int source = 0;  // origem única para todos os grafos
    const int reps = 6;    // 6 execuções, descartando a primeira

    // Guarda as distâncias do Dijkstra (última repetição) por tamanho
    // para conferir Dijkstra == Bellman-Ford ao final de cada tamanho.
    std::vector<std::vector<int>> dijkstraDists(fileList.size());

    std::ofstream CSVfileDijkstra;
    auto startDijkstra = PrepareCsvOutput("resultadosDijkstra_grafos.csv",
                                          "Tamanho;Tempo_Dijkstra_Segundos;\n",
                                          fileList,
                                          CSVfileDijkstra);

    if (!startDijkstra) {
        return 1;
    }

    std::cout << "Iniciando execucao do Dijkstra a partir do tamanho: "
              << fileList[*startDijkstra] << '\n';

    for (std::size_t k = *startDijkstra; k < fileList.size(); ++k) {
        const std::string& strsize = fileList[k];
        std::string fileName = filePrefix + strsize + fileSufix;

        std::ifstream file(fileName);
        Graph graph;

        if (!ReadGraphFile(file, graph)) {
            std::cerr << "Falha ao ler " << fileName << '\n';
            return 1;
        }

        double soma = 0.0;

        for (int i = 0; i < reps; ++i) {
            auto inicio = std::chrono::steady_clock::now();
            PathResult result = Dijkstra(graph, source);
            auto fim = std::chrono::steady_clock::now();
            std::chrono::duration<double> duracao = fim - inicio;

            if (i > 0) {
                soma += duracao.count();
            }

            long long somaDist = std::accumulate(result.dist.begin(),
                                                 result.dist.end(),
                                                 0LL);

            std::cout << "\nTamanho: " << strsize << '\n';
            std::cout << "Soma das distâncias: " << somaDist << '\n';
            std::cout << "Tempo decorrido: " << duracao.count() << " s\n";

            if (i == reps - 1) {
                dijkstraDists[k] = result.dist;
            }
        }

        double media = soma / (reps - 1);

        CSVfileDijkstra << strsize << ";" << media << "\n";
        CSVfileDijkstra.flush();
        std::cout << "Tamanho " << strsize << " concluido.\n";
    }

    CSVfileDijkstra.close();

    std::ofstream CSVfileBellman;
    auto startBellman = PrepareCsvOutput(
        "resultadosBellmanFord_grafos.csv",
        "Tamanho;Tempo_BellmanFord_Segundos;\n",
        fileList,
        CSVfileBellman);

    if (!startBellman) {
        return 1;
    }

    std::cout << "Iniciando execucao do Bellman-Ford a partir do tamanho: "
              << fileList[*startBellman] << '\n';

    for (std::size_t k = *startBellman; k < fileList.size(); ++k) {
        const std::string& strsize = fileList[k];
        std::string fileName = filePrefix + strsize + fileSufix;

        std::ifstream file(fileName);
        Graph graph;

        if (!ReadGraphFile(file, graph)) {
            std::cerr << "Falha ao ler " << fileName << '\n';
            return 1;
        }

        double soma = 0.0;

        for (int i = 0; i < reps; ++i) {
            auto inicio = std::chrono::steady_clock::now();
            PathResult result = BellmanFord(graph, source);
            auto fim = std::chrono::steady_clock::now();
            std::chrono::duration<double> duracao = fim - inicio;

            if (i > 0) {
                soma += duracao.count();
            }

            long long somaDist = std::accumulate(result.dist.begin(),
                                                 result.dist.end(),
                                                 0LL);

            std::cout << "\nTamanho: " << strsize << '\n';
            std::cout << "Soma das distâncias: " << somaDist << '\n';
            std::cout << "Tempo decorrido: " << duracao.count() << " s\n";

            if (result.hasNegativeCycle) {
                std::cerr << "Ciclo negativo detectado em "
                          << fileName << '\n';
                return 1;
            }

            if (i == reps - 1) {
                if (!dijkstraDists[k].empty() &&
                    !EqualDistances(result.dist, dijkstraDists[k])) {
                    std::cerr << "DIVERGÊNCIA em " << fileName << '\n';
                    return 1;
                }
            }
        }

        double media = soma / (reps - 1);

        CSVfileBellman << strsize << ";" << media << "\n";
        CSVfileBellman.flush();
        std::cout << "Tamanho " << strsize << " concluido.\n";
    }

    CSVfileBellman.close();
    return 0;
}

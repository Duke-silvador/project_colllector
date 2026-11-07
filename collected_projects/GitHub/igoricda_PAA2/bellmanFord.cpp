#include <fstream>
#include <iostream>
#include <string>

#include "fileUtils.h"
#include "shortestPaths.h"

int main(int argc, char* argv[])
{
    // Uso: ./bellmanFord [arquivo] — padrão ./input/Entrada 10.txt
    std::string fileName = "./input/Entrada 10.txt";

    if (argc > 1) {
        fileName = argv[1];
    }

    std::ifstream file(fileName);
    Graph graph;

    if (!ReadGraphFile(file, graph)) {
        std::cout << "Arquivo: " << fileName << '\n';
        return 1;
    }

    int s = 0;  // origem: vértice 0 (Cormen: s ∈ V)

    std::cout << "Arquivo: " << fileName << '\n';
    std::cout << "Vértices: " << graph.n
              << " | Arcos orientados: " << graph.edges.size()
              << " | Origem (s): " << s << '\n';

    PathResult result = BellmanFord(graph, s);

    std::cout << "\nDistâncias (Bellman-Ford) a partir de " << s << ":\n";

    for (int v = 0; v < graph.n; ++v) {
        std::cout << "dist[" << v << "] = ";

        if (result.dist[v] == INF) {
            std::cout << "infinito";
        } else {
            std::cout << result.dist[v];
        }

        std::cout << " | caminho: " << GetPath(result.pred, s, v) << '\n';
    }

    if (result.hasNegativeCycle) {
        std::cout << "\nGrafo contém ciclo de peso negativo!\n";
    }

    return 0;
}

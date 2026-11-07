#ifndef GRAPH_H
#define GRAPH_H

#include <utility>
#include <vector>

struct Edge {
    int u;
    int v;
    int weight;
};

// Representação do grafo conforme o formato de entrada:
// matriz de adjacência `matrix` (N x N), onde matrix[i][j] != 0
// representa uma aresta não direcionada entre i e j com peso matrix[i][j].
// As listas `adj` e `edges` são as representações clássicas (Cormen):
// adj é lista de adjacência orientada (os dois sentidos), edges é a
// lista de arcos orientados usada pelo Bellman-Ford.
struct Graph {
    int n = 0;
    std::vector<std::vector<int>> matrix;
    std::vector<std::vector<std::pair<int, int>>> adj;
    std::vector<Edge> edges;
};

Graph BuildGraph(const std::vector<std::vector<int>>& matrix);

#endif

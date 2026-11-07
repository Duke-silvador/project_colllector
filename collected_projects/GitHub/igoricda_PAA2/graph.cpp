#include "graph.h"

Graph BuildGraph(const std::vector<std::vector<int>>& matrix)
{
    Graph g;
    g.n = static_cast<int>(matrix.size());
    g.matrix = matrix;

    g.adj.assign(g.n, {});
    for (int i = 0; i < g.n; ++i) {
        g.adj[i].reserve(g.n);
    }

    // Cada entrada não nula matrix[i][j] (i != j) gera o arco i -> j.
    // Como o grafo é não direcionado e a matriz é simétrica, isso
    // automaticamente gera os dois sentidos (i -> j e j -> i).
    for (int i = 0; i < g.n; ++i) {
        for (int j = 0; j < g.n; ++j) {
            int w = matrix[i][j];
            if (i != j && w != 0) {
                g.adj[i].push_back({j, w});
                g.edges.push_back({i, j, w});
            }
        }
    }

    return g;
}

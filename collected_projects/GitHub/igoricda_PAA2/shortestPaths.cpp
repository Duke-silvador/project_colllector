#include "shortestPaths.h"

#include <iostream>

#include "minHeap.h"

void InitializeSingleSource(const Graph& g, int s,
                            std::vector<int>& dist, std::vector<int>& pred)
{
    dist.assign(g.n, INF);
    pred.assign(g.n, -1);

    if (s < 0 || s >= g.n) {
        return;
    }

    dist[s] = 0;
}

bool Relax(int u, int v, int w,
           std::vector<int>& dist, std::vector<int>& pred)
{
    if (dist[u] == INF) {
        return false;  // evita overflow com Õ
    }

    if (dist[v] > dist[u] + w) {
        dist[v] = dist[u] + w;
        pred[v] = u;
        return true;
    }

    return false;
}

PathResult Dijkstra(const Graph& g, int s)
{
    // Variáveis/parâmetros de interesse: g, s, dist, pred, S, Q, u, v
    std::vector<int> dist;
    std::vector<int> pred;

    InitializeSingleSource(g, s, dist, pred);

    MinHeap q(g.n, dist);  // Q contém todos os vértices (BUILD-MIN-HEAP)
    std::vector<char> inS(g.n, 0);

    while (!q.Empty()) {
        int u = q.ExtractMin();  // EXTRACT-MIN(Q)
        inS[u] = 1;              // S ← S ∪ {u}

        for (auto [v, w] : g.adj[u]) {
            if (Relax(u, v, w, dist, pred)) {
                q.DecreaseKey(v, dist[v]);  // DECREASE-KEY(Q, v, dist[v])
            }
        }
    }

    PathResult result;
    result.dist = dist;
    result.pred = pred;
    result.hasNegativeCycle = false;
    return result;
}

PathResult BellmanFord(const Graph& g, int s)
{
    // Variáveis/parâmetros de interesse: g, s, dist, pred, i, (u, v, w)
    std::vector<int> dist;
    std::vector<int> pred;

    InitializeSingleSource(g, s, dist, pred);

    // |-V| - 1 rodadas de relaxamento (sem early-exit: custo clássico).
    for (int i = 0; i < g.n - 1; ++i) {
        for (const Edge& e : g.edges) {
            Relax(e.u, e.v, e.weight, dist, pred);
        }
    }

    // Teste de ciclo de peso negativo.
    bool hasNegativeCycle = false;
    for (const Edge& e : g.edges) {
        if (dist[e.u] != INF && dist[e.v] > dist[e.u] + e.weight) {
            hasNegativeCycle = true;
            break;
        }
    }

    PathResult result;
    result.dist = dist;
    result.pred = pred;
    result.hasNegativeCycle = hasNegativeCycle;
    return result;
}

std::string GetPath(const std::vector<int>& pred, int s, int v)
{
    if (v == s) {
        return std::to_string(s);
    }
    if (pred[v] == -1) {
        return "sem caminho";
    }

    std::vector<int> path;
    int cur = v;

    while (cur != -1) {
        path.push_back(cur);
        if (cur == s) {
            break;
        }
        cur = pred[cur];
    }

    if (path.back() != s) {
        return "sem caminho";
    }

    std::string out;
    for (int i = static_cast<int>(path.size()) - 1; i >= 0; --i) {
        if (!out.empty()) {
            out += " -> ";
        }
        out += std::to_string(path[i]);
    }
    return out;
}

void PrintPath(const std::vector<int>& pred, int s, int v)
{
    std::cout << GetPath(pred, s, v) << '\n';
}

bool EqualDistances(const std::vector<int>& a, const std::vector<int>& b)
{
    if (a.size() != b.size()) {
        return false;
    }

    for (std::size_t i = 0; i < a.size(); ++i) {
        if (a[i] != b[i]) {
            return false;
        }
    }

    return true;
}

/*
 * VARIÁVEIS DE INTERESSE (modelo Cormen)
 *
 * Dijkstra      = g, s, dist, pred, S, Q, u, v (8)
 * BellmanFord   = g, s, dist, pred, i, (u, v, w) (7)
 * Relax         = u, v, w, dist, pred (5)
 * Initialize..  = g, s, dist, pred (4)
 * MinHeap (ver minHeap.h/.cpp)
 */

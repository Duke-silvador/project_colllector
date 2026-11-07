#ifndef SHORTESTPATHS_H
#define SHORTESTPATHS_H

#include <string>
#include <vector>

#include "graph.h"

// Distância infinita (Cormen: Õ). Suficiente para os pesos das entradas.
constexpr int INF = 1000000000;

struct PathResult {
    std::vector<int> dist;
    std::vector<int> pred;
    bool hasNegativeCycle = false;
};

// INITIALIZE-SINGLE-SOURCE(G, s): dist[v] = Õ para todo v; dist[s] = 0; pred = NIL.
void InitializeSingleSource(const Graph& g, int s,
                            std::vector<int>& dist, std::vector<int>& pred);

// RELAX(u, v, w): se dist[v] > dist[u] + w(u, v), atualiza dist[v] e pred[v].
// Devolve true se houve relaxamento.
bool Relax(int u, int v, int w,
           std::vector<int>& dist, std::vector<int>& pred);

// DIJKSTRA(G, w, s) clássico (Cormen cap. 24) com min-heap binário.
// Pressupõe pesos não negativos (verificado nas entradas). O vetor
// pred representa a árvore de caminhos mais curtos (predecessores).
PathResult Dijkstra(const Graph& g, int s);

// BELLMAN-FORD(G, w, s) clássico (Cormen cap. 24): faz |V| - 1 rodadas de
// relaxamento sobre a lista de arcos e, ao final, testa ciclo negativo.
// Não usa early-exit: mantém o custo clássico O(V·E).
PathResult BellmanFord(const Graph& g, int s);

// PRINT-PATH / reconstrução: devolve "s -> ... -> v" ou "sem caminho".
std::string GetPath(const std::vector<int>& pred, int s, int v);

void PrintPath(const std::vector<int>& pred, int s, int v);

// Compara duas distâncias elemento a elemento (incl. Õ).
bool EqualDistances(const std::vector<int>& a, const std::vector<int>& b);

#endif

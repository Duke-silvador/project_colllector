#ifndef MINHEAP_H
#define MINHEAP_H

#include <vector>

// Min-heap binário no modelo do Cormen (cap. 6), usado como fila de
// prioridades Q no Dijkstra. Suporta BUILD-MIN-HEAP, EXTRACT-MIN,
// DECREASE-KEY, INSERT e Contains, todos em O(log n) (build em O(n)).
// A chave de um vértice é a distância atual dist[v] (clássica).
//
// O vetor pos_[v] mantém o índice do vértice no heap (-1 se fora do
// heap), o que permite DECREASE-KEY em tempo O(log n) sem duplicatas.
class MinHeap {
public:
    MinHeap() = default;

    // Constrói o heap com os vértices 0..n-1 usando as chaves dist.
    explicit MinHeap(int n, const std::vector<int>& dist);

    void BuildMinHeap(int n, const std::vector<int>& dist);

    void Insert(int vertex, int key);

    // Remove e devolve o vértice de menor chave. Devolve -1 se vazio.
    int ExtractMin();

    // Reduz a chave de um vértice já presente no heap (O(log n)).
    void DecreaseKey(int vertex, int newKey);

    bool Empty() const;
    bool Contains(int vertex) const;
    int Size() const;

private:
    std::vector<int> heapVertex_;
    std::vector<int> heapKey_;
    std::vector<int> pos_;

    void SwapEntries(int i, int j);
    void BubbleUp(int i);
    void BubbleDown(int i);

    int Parent(int i) const;
    int Left(int i) const;
    int Right(int i) const;
};

#endif

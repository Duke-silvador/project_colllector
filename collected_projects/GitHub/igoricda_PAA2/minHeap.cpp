#include "minHeap.h"

MinHeap::MinHeap(int n, const std::vector<int>& dist)
{
    BuildMinHeap(n, dist);
}

void MinHeap::BuildMinHeap(int n, const std::vector<int>& dist)
{
    heapVertex_.clear();
    heapKey_.clear();
    pos_.assign(n, -1);

    heapVertex_.reserve(n);
    heapKey_.reserve(n);

    for (int v = 0; v < n; ++v) {
        heapVertex_.push_back(v);
        heapKey_.push_back(dist[v]);
        pos_[v] = v;
    }

    for (int i = n / 2 - 1; i >= 0; --i) {
        BubbleDown(i);
    }
}

void MinHeap::Insert(int vertex, int key)
{
    if (vertex < 0 || vertex >= static_cast<int>(pos_.size())) {
        pos_.assign(vertex + 1, -1);
        // Garante espaço para vértices maiores (caso geral).
        while (static_cast<int>(pos_.size()) <= vertex) {
            pos_.push_back(-1);
        }
    }
    if (pos_[vertex] != -1) {
        return;  // já presente: nada a fazer
    }

    int idx = static_cast<int>(heapVertex_.size());
    heapVertex_.push_back(vertex);
    heapKey_.push_back(key);
    pos_[vertex] = idx;
    BubbleUp(idx);
}

int MinHeap::ExtractMin()
{
    if (heapVertex_.empty()) {
        return -1;
    }

    int minVertex = heapVertex_[0];

    int last = static_cast<int>(heapVertex_.size()) - 1;

    if (last != 0) {
        SwapEntries(0, last);
    }

    heapVertex_.pop_back();
    heapKey_.pop_back();

    pos_[minVertex] = -1;

    if (!heapVertex_.empty()) {
        BubbleDown(0);
    }

    return minVertex;
}

void MinHeap::DecreaseKey(int vertex, int newKey)
{
    if (vertex < 0 || vertex >= static_cast<int>(pos_.size())) {
        return;
    }

    int idx = pos_[vertex];
    if (idx == -1) {
        return;  // fora do heap (ex.: já extraído)
    }

    if (newKey >= heapKey_[idx]) {
        return;  // não é uma redução
    }

    heapKey_[idx] = newKey;
    BubbleUp(idx);
}

bool MinHeap::Empty() const
{
    return heapVertex_.empty();
}

bool MinHeap::Contains(int vertex) const
{
    if (vertex < 0 || vertex >= static_cast<int>(pos_.size())) {
        return false;
    }
    return pos_[vertex] != -1;
}

int MinHeap::Size() const
{
    return static_cast<int>(heapVertex_.size());
}

void MinHeap::SwapEntries(int i, int j)
{
    if (i == j) {
        return;
    }

    int vI = heapVertex_[i];
    int vJ = heapVertex_[j];
    int kI = heapKey_[i];
    int kJ = heapKey_[j];

    heapVertex_[i] = vJ;
    heapVertex_[j] = vI;
    heapKey_[i] = kJ;
    heapKey_[j] = kI;

    pos_[vI] = j;
    pos_[vJ] = i;
}

void MinHeap::BubbleUp(int i)
{
    while (i > 0) {
        int p = Parent(i);
        if (heapKey_[i] < heapKey_[p]) {
            SwapEntries(i, p);
            i = p;
        } else {
            break;
        }
    }
}

void MinHeap::BubbleDown(int i)
{
    int n = static_cast<int>(heapVertex_.size());

    for (;;) {
        int l = Left(i);
        int r = Right(i);
        int smallest = i;

        if (l < n && heapKey_[l] < heapKey_[smallest]) {
            smallest = l;
        }
        if (r < n && heapKey_[r] < heapKey_[smallest]) {
            smallest = r;
        }

        if (smallest != i) {
            SwapEntries(i, smallest);
            i = smallest;
        } else {
            break;
        }
    }
}

int MinHeap::Parent(int i) const
{
    return (i - 1) / 2;
}

int MinHeap::Left(int i) const
{
    return 2 * i + 1;
}

int MinHeap::Right(int i) const
{
    return 2 * i + 2;
}

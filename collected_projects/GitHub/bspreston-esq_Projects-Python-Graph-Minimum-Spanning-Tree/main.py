#!/usr/bin/env python3
"""Minimum spanning tree via Kruskal (union-find) and Prim (heap)."""
import argparse
import heapq

class DisjointSet:
    def __init__(self, nodes):
        self.parent = {n: n for n in nodes}
        self.rank = {n: 0 for n in nodes}

    def find(self, node):
        while self.parent[node] != node:
            self.parent[node] = self.parent[self.parent[node]]
            node = self.parent[node]
        return node

    def union(self, a, b):
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return False
        if self.rank[root_a] < self.rank[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        if self.rank[root_a] == self.rank[root_b]:
            self.rank[root_a] += 1
        return True

def kruskal(nodes, edges):
    """Return (mst_edges, total_weight)."""
    mst, total = [], 0.0
    forest = DisjointSet(nodes)
    for weight, a, b in sorted(edges):
        if forest.union(a, b):
            mst.append((a, b, weight))
            total += weight
    if len(mst) != len(nodes) - 1:
        raise ValueError("graph is not connected")
    return mst, total

def prim(nodes, edges):
    """Return (mst_edges, total_weight) using Prim's algorithm."""
    adjacency = {n: [] for n in nodes}
    for weight, a, b in edges:
        adjacency[a].append((weight, b))
        adjacency[b].append((weight, a))
    start = nodes[0]
    visited, heap = {start}, [(w, start, b) for w, b in adjacency[start]]
    heapq.heapify(heap)
    mst, total = [], 0.0
    while heap and len(visited) < len(nodes):
        weight, a, b = heapq.heappop(heap)
        if b in visited:
            continue
        visited.add(b)
        mst.append((a, b, weight))
        total += weight
        for w, neighbour in adjacency[b]:
            if neighbour not in visited:
                heapq.heappush(heap, (w, b, neighbour))
    if len(visited) != len(nodes):
        raise ValueError("graph is not connected")
    return mst, total

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()

    nodes = ["A", "B", "C", "D", "E", "F"]
    edges = [(4, "A", "B"), (2, "A", "C"), (1, "B", "C"), (5, "B", "D"),
             (8, "C", "D"), (10, "C", "E"), (2, "D", "E"), (6, "D", "F"), (3, "E", "F")]
    if not args.demo:
        print("Demo graph (use --demo for the same output):")
    mst_k, total_k = kruskal(nodes, edges)
    mst_p, total_p = prim(nodes, edges)
    print("Kruskal:", ", ".join(f"{a}-{b}({w})" for a, b, w in mst_k), f"= {total_k:g}")
    print("Prim:   ", ", ".join(f"{a}-{b}({w})" for a, b, w in mst_p), f"= {total_p:g}")
    print(f"Algorithms agree: {total_k == total_p}")

if __name__ == "__main__":
    main()

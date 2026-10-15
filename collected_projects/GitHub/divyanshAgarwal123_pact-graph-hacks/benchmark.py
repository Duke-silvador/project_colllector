"""Warm, single-case latency breakdown; not a scale or superiority benchmark."""

import argparse
import json
from math import ceil
from statistics import median
from time import perf_counter

from pact import graph, scenario
from planner import plan


class MeteredGraph:
    def __init__(self, inner):
        self.inner = inner
        self.calls = 0
        self.query_ms = 0.0

    def query(self, *args, **kwargs):
        start = perf_counter()
        try:
            return self.inner.query(*args, **kwargs)
        finally:
            self.calls += 1
            self.query_ms += (perf_counter() - start) * 1000

    def ro_query(self, *args, **kwargs):
        start = perf_counter()
        try:
            return self.inner.ro_query(*args, **kwargs)
        finally:
            self.calls += 1
            self.query_ms += (perf_counter() - start) * 1000


def stats(values):
    ordered = sorted(values)
    return {"p50_ms": round(median(ordered), 3),
            "p95_ms": round(ordered[ceil(0.95 * len(ordered)) - 1], 3),
            "max_ms": round(ordered[-1], 3)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=30)
    args = parser.parse_args()
    if not 5 <= args.runs <= 1000:
        parser.error("runs must be between 5 and 1000")
    inner = graph()
    measured = MeteredGraph(inner)
    buckets = {"scenario": [], "graph_queries": [], "solver_and_checker": [],
               "end_to_end": [], "query_count": []}
    for _ in range(args.runs):
        measured.calls = 0
        measured.query_ms = 0.0
        start = perf_counter()
        current = scenario(measured)
        after_graph = perf_counter()
        answer = plan(current)
        end = perf_counter()
        if answer["status"] != "feasible_within_model":
            raise RuntimeError(f"Benchmark case changed: {answer['status']}")
        buckets["scenario"].append((after_graph - start) * 1000)
        buckets["graph_queries"].append(measured.query_ms)
        buckets["solver_and_checker"].append((end - after_graph) * 1000)
        buckets["end_to_end"].append((end - start) * 1000)
        buckets["query_count"].append(measured.calls)
    print(json.dumps({"runs": args.runs, "case_revision": current["revision"],
                      "alternatives": len(answer["alternatives"]),
                      "query_count_per_run": sorted(set(buckets["query_count"])),
                      "warm_local_only": {key: stats(buckets[key]) for key in
                                          ("scenario", "graph_queries", "solver_and_checker",
                                           "end_to_end")},
                      "limits": "Single synthetic case, warm local service, no model, no concurrent load"},
                     indent=2))


if __name__ == "__main__":
    main()

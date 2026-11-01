#!/usr/bin/env python3
"""Print RESULTS.md's table from results/*.jsonl: the median of each job, end to end.

GitHub, end to end: queue + the job on its runner.
agental, end to end: getting the machine (create, or start) + the job + stopping it.
"""
import json, math, pathlib, statistics

GITHUB_PER_MINUTE = 0.012   # Linux 4-core, billed per started minute of each job; queue not billed
AGENTAL_PER_HOUR = 0.054    # medium running, billed per second from create or start to stop

ROOT = pathlib.Path(__file__).resolve().parent
rows = [json.loads(l) for f in ("github.jsonl", "agental.jsonl") for l in open(ROOT / "results" / f)]


def end_to_end(r):
    return r["queue"] + r["run"] if r["platform"] == "github" else r["total"]


def cost(r):
    if r["platform"] == "github":
        return math.ceil(r["run"] / 60) * GITHUB_PER_MINUTE
    return r["total"] * AGENTAL_PER_HOUR / 3600


def med(platform, job, mode, f=end_to_end):
    xs = [f(r) for r in rows if r["platform"] == platform and r["job"] == job and r["mode"] == mode]
    return statistics.median(xs), len(xs)


def fmt(s):
    s = round(s)
    return f"{s // 60}m {s % 60:02d}s" if s >= 60 else f"{s}s"


print("| Job | Cache | GitHub | agental | Faster | GitHub, 1,000 runs | agental, 1,000 runs | Cheaper |")
print("| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |")
for job in ("node-test", "rust-build", "docker-build"):
    for mode in ("cold", "warm"):
        g, gn = med("github", job, mode)
        a, an = med("agental", job, mode)
        gc, _ = med("github", job, mode, cost)
        ac, _ = med("agental", job, mode, cost)
        print(f"| `{job}` | {mode} | {fmt(g)} | {fmt(a)} | {g / a:.1f}× | ${gc * 1000:,.2f} | ${ac * 1000:,.2f} | {gc / ac:.0f}× |")

#!/usr/bin/env python3
"""Decide whether this wake-up should collect. The workflow wakes every 5 minutes (GitHub schedule and/or an
external repository_dispatch "tick"), but collects only:
1. Pre-show: a known screening starts within PRE_SHOW_MIN minutes and hasn't been captured in that window.
   The API drops a screening when it starts, so this is the snapshot that gives the final estimate.
2. Baseline: the last successful run was at least BASELINE_MIN minutes ago (roughly every half hour).
Prints "collect=true|false" plus the reason, in GITHUB_OUTPUT format. Times are Asia/Jerusalem.
"""
import csv
import glob
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")
FMT = "%Y-%m-%d %H:%M"
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
PRE_SHOW_MIN = 8    # cron fires ~6 min before a start; the window absorbs a few minutes of GitHub delay
BASELINE_MIN = 28   # "every half hour" on a 5-minute tick


def parse(s):
    return datetime.strptime(s, FMT).replace(tzinfo=TZ)


def decide(now, pre_show_min=PRE_SHOW_MIN, force=False, every_minute=False):
    """every_minute: in the pre-show window, collect on every call (the loop calls once a minute),
    so the last snapshot lands ~1 minute before the start. Otherwise collect once per window."""
    if force:
        return True, "manual run"
    catalog = os.path.join(DATA, "presentations.csv")
    if os.path.exists(catalog):
        with open(catalog, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                start = parse(r["dateTime"])
                if now < start <= now + timedelta(minutes=pre_show_min):
                    since = now - timedelta(seconds=30) if every_minute else start - timedelta(minutes=pre_show_min)
                    if parse(r["last_seen"]) < since:
                        return True, f"pre-show: {r['featureName']} at {r['dateTime']}"
    last_ok = None
    for path in sorted(glob.glob(os.path.join(DATA, "runs", "*.csv")))[-2:]:
        with open(path, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r["status"] == "ok":
                    last_ok = parse(r["run_at"])
    if last_ok is None or now - last_ok >= timedelta(minutes=BASELINE_MIN):
        return True, f"baseline (last ok run: {last_ok.strftime(FMT) if last_ok else 'none'})"
    return False, f"skip (last ok run: {last_ok.strftime(FMT)})"


if __name__ == "__main__":
    go, why = decide(datetime.now(TZ), force=os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch")
    print(f"{'COLLECT' if go else 'SKIP'}: {why}")
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a") as f:
            f.write(f"collect={'true' if go else 'false'}\n")

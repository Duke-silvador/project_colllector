#!/usr/bin/env python3
"""Continuous collector for GitHub Actions (.github/workflows/loop.yml).

GitHub's cron trigger proved unreliable, so this job stays up for ~5.5 hours, checks every minute,
and collects when gate.py says so: every minute in the last 5 minutes before each screening (the API
drops a screening when it starts, so the last snapshot is ~1 minute before), plus half-hourly.
When it ends, the workflow dispatches the next run of itself, so the chain never stops.
"""
import subprocess
import sys
import time
from datetime import datetime, timedelta

from gate import TZ, decide

RUN_FOR = timedelta(hours=5, minutes=30)  # job limit is 6h; leave room for the hand-off
PRE_SHOW_MIN = 5


def sh(*cmd):
    return subprocess.run(cmd, check=False).returncode


def commit():
    sh("git", "add", "-A", "data", "docs", "README.md")
    if sh("git", "diff", "--cached", "--quiet") == 0:
        return
    stamp = datetime.now(TZ).strftime("%Y-%m-%d %H:%M")
    sh("git", "commit", "-q", "-m", f"snapshot {stamp}")
    for _ in range(3):
        if sh("git", "pull", "-q", "--rebase") == 0 and sh("git", "push", "-q") == 0:
            return
        time.sleep(5)
    print("push failed", file=sys.stderr)


def main():
    end = datetime.now(TZ) + RUN_FOR
    while datetime.now(TZ) < end:
        sh("git", "pull", "-q", "--rebase")  # pick up snapshots from other runs, so the gate sees them
        go, why = decide(datetime.now(TZ), pre_show_min=PRE_SHOW_MIN, every_minute=True)
        if go:
            print(f"{datetime.now(TZ):%H:%M} COLLECT: {why}", flush=True)
            sh(sys.executable, "collect.py")
            sh(sys.executable, "build.py")
            commit()
        time.sleep(60 - datetime.now(TZ).second)  # wake at the top of each minute


if __name__ == "__main__":
    main()

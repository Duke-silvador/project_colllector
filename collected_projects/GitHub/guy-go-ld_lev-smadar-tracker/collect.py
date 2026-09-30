#!/usr/bin/env python3
"""Collect Lev Smadar screenings from the public ticketing API (GitHub Actions; gate.py decides when).

What it keeps, and why:
- data/presentations.csv : one row per screening, with every field the API returns, plus
  first_seen / last_seen and the ticket availability at last_seen. The API drops a screening
  the moment it starts, so last_seen ~ start time and avail_at_last_seen ~ final sales.
- data/changes/YYYY-MM.csv : a row only when a screening's availability changes (the sales curve).
- data/runs/YYYY-MM.csv : one row per run (time, screenings seen, ok/error), to measure coverage.
All times are Asia/Jerusalem.
"""
import csv
import json
import os
import sys
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

URL = "https://ticket.lev.co.il/api/presentations?locationId=1158&includeSynopsis=0"
TZ = ZoneInfo("Asia/Jerusalem")
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
CATALOG = os.path.join(DATA, "presentations.csv")

TRACK = ["first_seen", "last_seen", "avail_at_first_seen", "avail_at_last_seen", "soldout_at_last_seen",
         "snapshots_seen"]


def flat(v):
    if isinstance(v, list):
        return ";".join(str(x) for x in v)
    return "" if v is None else v


def append(path, fields, rows):
    new = not os.path.exists(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        if new:
            w.writeheader()
        w.writerows(rows)


def main():
    now = datetime.now(TZ)
    stamp = now.strftime("%Y-%m-%d %H:%M")
    month = now.strftime("%Y-%m")
    run_log = os.path.join(DATA, "runs", f"{month}.csv")
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (lev-smadar-tracker)",
                                               "Accept": "application/json"})
    try:
        data = json.load(urllib.request.urlopen(req, timeout=40))
        pres = data.get("presentations", [])
    except Exception as e:  # keep a record of the failure, never crash the workflow
        append(run_log, ["run_at", "screenings", "status"], [{"run_at": stamp, "screenings": 0,
                                                               "status": f"error: {e}"[:200]}])
        print(f"{stamp} ERROR {e}", file=sys.stderr)
        return

    catalog = {}
    fields = []
    if os.path.exists(CATALOG):
        with open(CATALOG, encoding="utf-8") as f:
            r = csv.DictReader(f)
            fields = list(r.fieldnames or [])
            for row in r:
                catalog[row["id"]] = row

    changes = []
    for p in pres:
        pid = str(p["id"])
        api = {k: flat(v) for k, v in p.items()}
        for k in api:
            if k not in fields:
                fields.append(k)
        old = catalog.get(pid)
        avail = str(p.get("availRatio"))
        if old is None:
            row = dict(api)
            row.update(first_seen=stamp, avail_at_first_seen=avail, snapshots_seen=0)
            changes.append({"snapshot_at": stamp, "id": pid, "dateTime": p.get("dateTime"),
                            "featureName": p.get("featureName"), "availRatio": avail,
                            "soldout": p.get("soldout"), "event": "new"})
        else:
            row = dict(old)
            row.update(api)  # keep the latest version of every field
            if old.get("avail_at_last_seen") != avail:
                changes.append({"snapshot_at": stamp, "id": pid, "dateTime": p.get("dateTime"),
                                "featureName": p.get("featureName"), "availRatio": avail,
                                "soldout": p.get("soldout"), "event": "change"})
        row.update(last_seen=stamp, avail_at_last_seen=avail, soldout_at_last_seen=p.get("soldout"),
                   snapshots_seen=int(row.get("snapshots_seen") or 0) + 1)
        catalog[pid] = row

    for k in TRACK:
        if k not in fields:
            fields.append(k)
    # id first, tracking columns right after the schedule fields
    head = ["id", "dateTime", "businessDate", "featureName", "featureAdditionalName"] + TRACK
    fields = head + [k for k in fields if k not in head]
    rows = sorted(catalog.values(), key=lambda r: (r.get("dateTime", ""), r["id"]))
    tmp = CATALOG + ".tmp"
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    os.replace(tmp, CATALOG)

    if changes:
        append(os.path.join(DATA, "changes", f"{month}.csv"),
               ["snapshot_at", "id", "dateTime", "featureName", "availRatio", "soldout", "event"], changes)
    append(run_log, ["run_at", "screenings", "status"], [{"run_at": stamp, "screenings": len(pres), "status": "ok"}])
    print(f"{stamp}: {len(pres)} screenings, {len(changes)} changes")


if __name__ == "__main__":
    main()

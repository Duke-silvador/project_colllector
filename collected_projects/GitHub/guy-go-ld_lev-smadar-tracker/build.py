#!/usr/bin/env python3
"""Turn the collected data into audience estimates (runs after every collection).

Outputs:
- data/attendance.csv     : one row per screening that has started, with estimated tickets sold
- data/summary.json       : aggregates for the Smadar summary page (by weekday, time slot, week, film)
- data/snapshots-flat.csv : the same data in the old local format (tools/lev_attendance.py reads it)
- README.md               : the latest numbers, between the AUTO markers

Estimate: tickets = round((1 - availRatio) * 267) (no blocked-seat deduction: a hall count on 28.9 matched the raw number), taken from the last time the
screening was seen before it started. "final" when that was at most 20 minutes before the start.
"""
import csv
import glob
import json
import os
import re
from collections import defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Asia/Jerusalem")
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
SEATS, BLOCKED, FINAL_MIN = 267, 0, 20  # BLOCKED was 2 until 28.9; Omaha 16:45 hall count = 14 = raw
DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]
PY2HEB = {6: "א'", 0: "ב'", 1: "ג'", 2: "ד'", 3: "ה'", 4: "ו'", 5: "ש'"}
SLOTS = ["בוקר (<12)", "צהריים (12-16)", "ערב מוקדם (16-19)", "ערב (19+)"]
FMT = "%Y-%m-%d %H:%M"


def slot(h):
    return SLOTS[0] if h < 12 else SLOTS[1] if h < 16 else SLOTS[2] if h < 19 else SLOTS[3]


def tickets(avail):
    return max(0, round((1 - float(avail)) * SEATS) - BLOCKED)


def read(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    now = datetime.now(TZ).replace(tzinfo=None)
    catalog = read(os.path.join(DATA, "presentations.csv"))
    changes = [r for p in sorted(glob.glob(os.path.join(DATA, "changes", "*.csv"))) for r in read(p)]
    runs = [r for p in sorted(glob.glob(os.path.join(DATA, "runs", "*.csv"))) for r in read(p)]

    shows = {}  # key: (date, HH:MM, film)
    for r in catalog:
        start = datetime.strptime(r["dateTime"], FMT)
        last = datetime.strptime(r["last_seen"], FMT)
        shows[(r["businessDate"], r["dateTime"][11:], r["featureName"])] = dict(
            id=r["id"], start=start, last_seen=last, avail=r["avail_at_last_seen"], film=r["featureName"],
            film_en=r.get("featureAdditionalName", ""), duration=r.get("durationInMinutes", ""),
            language=r.get("languageISO", ""), hall=r.get("venueName", ""), date=r["businessDate"],
            source="github")
    # seed: snapshots collected on the laptop before the tracker existed
    for r in read(os.path.join(DATA, "legacy", "lev-snapshots-local.csv")):
        k = (r["business_date"], r["start"], r["film"])
        start = datetime.strptime(f"{r['business_date']} {r['start']}", FMT)
        snap = datetime.strptime(r["snapshot_at"], FMT)
        if snap > start or (k in shows and shows[k]["source"] == "github"):
            continue
        if k not in shows or snap > shows[k]["last_seen"]:
            shows[k] = dict(id=r["presentation_id"], start=start, last_seen=snap, avail=r["avail_ratio"],
                            film=r["film"], film_en="", duration=r.get("duration_min", ""), language="", hall="",
                            date=r["business_date"], source="legacy")

    rows, upcoming = [], []
    for k, s in sorted(shows.items(), key=lambda x: x[1]["start"]):
        lag = int((s["start"] - s["last_seen"]).total_seconds() // 60)
        base = dict(date=s["date"], weekday=PY2HEB[s["start"].weekday()], start=s["start"].strftime("%H:%M"),
                    film=s["film"], tickets_est=tickets(s["avail"]))
        if s["start"] <= now and lag >= -5:
            iso = s["start"].isocalendar()
            rows.append(dict(base, week=f"{iso[0]}-W{iso[1]:02d}", slot=slot(s["start"].hour),
                             last_seen_min_before=max(lag, 0),
                             status="final" if lag <= FINAL_MIN else "partial", film_en=s["film_en"],
                             duration_min=s["duration"], language=s["language"], hall=s["hall"],
                             source=s["source"]))
        elif s["start"] > now:
            upcoming.append(dict(base, sold_so_far=base.pop("tickets_est")))

    fields = ["date", "week", "weekday", "start", "slot", "film", "tickets_est", "last_seen_min_before", "status",
              "film_en", "duration_min", "language", "hall", "source"]
    with open(os.path.join(DATA, "attendance.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    # flat file in the old local format
    flat = []
    for r in catalog:
        d = datetime.strptime(r["dateTime"], FMT)
        base = dict(presentation_id=r["id"], business_date=r["businessDate"], weekday=PY2HEB[d.weekday()],
                    start=r["dateTime"][11:], film=r["featureName"], duration_min=r.get("durationInMinutes", ""))
        flat.append(dict(base, snapshot_at=r["first_seen"], avail_ratio=r["avail_at_first_seen"], soldout=""))
        flat.append(dict(base, snapshot_at=r["last_seen"], avail_ratio=r["avail_at_last_seen"],
                         soldout=r.get("soldout_at_last_seen", "")))
    for r in read(os.path.join(DATA, "legacy", "lev-snapshots-local.csv")):
        flat.append({k: r[k] for k in ["snapshot_at", "presentation_id", "business_date", "weekday", "start", "film",
                                       "duration_min", "avail_ratio", "soldout"]})
    flat.sort(key=lambda r: (r["snapshot_at"], r["business_date"], r["start"]))
    with open(os.path.join(DATA, "snapshots-flat.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["snapshot_at", "presentation_id", "business_date", "weekday", "start",
                                          "film", "duration_min", "avail_ratio", "soldout"])
        w.writeheader()
        w.writerows(flat)

    # aggregates (final estimates only, so partial numbers don't pull averages down)
    final = [r for r in rows if r["status"] == "final"]
    use = final if final else rows

    def agg(key):
        g = defaultdict(list)
        for r in use:
            g[key(r)].append(r["tickets_est"])
        return {k: dict(screenings=len(v), avg=round(sum(v) / len(v), 1), total=sum(v)) for k, v in g.items()}

    week_ago = now - timedelta(days=7)
    recent_runs = [r for r in runs if datetime.strptime(r["run_at"], FMT) >= week_ago]
    ok_runs = [r for r in recent_runs if r["status"] == "ok"]
    gaps = []
    times = sorted(datetime.strptime(r["run_at"], FMT) for r in ok_runs)
    for a, b_ in zip(times, times[1:]):
        if (b_ - a) > timedelta(minutes=45):
            gaps.append(dict(start=a.strftime(FMT), end=b_.strftime(FMT), minutes=int((b_ - a).total_seconds() // 60)))

    summary = dict(
        generated_at=now.strftime(FMT),
        screenings_total=len(rows), screenings_final=len(final),
        based_on="final" if final else "all (no final estimates yet)",
        first_screening=rows[0]["date"] if rows else None, last_screening=rows[-1]["date"] if rows else None,
        avg_per_screening=round(sum(r["tickets_est"] for r in use) / len(use), 1) if use else None,
        by_weekday={d: v for d in DAYS for k, v in agg(lambda r: r["weekday"]).items() if k == d},
        by_slot={s: v for s in SLOTS for k, v in agg(lambda r: r["slot"]).items() if k == s},
        by_weekday_slot={f"{d}|{s}": v for (d, s), v in agg(lambda r: (r["weekday"], r["slot"])).items()},
        by_week=dict(sorted(agg(lambda r: r["week"]).items())),
        by_film=dict(sorted(agg(lambda r: r["film"]).items(), key=lambda x: -x[1]["total"])),
        upcoming=upcoming[:40],
        coverage_7d=dict(runs=len(recent_runs), ok=len(ok_runs), expected_baseline=7 * 24 * 2,
                         gaps_over_45min=gaps[-10:]),
        method=f"tickets = round((1-availRatio)*{SEATS}) - {BLOCKED}; final = last seen <= {FINAL_MIN} min before start",
    )
    with open(os.path.join(DATA, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)

    # README auto section
    readme = os.path.join(ROOT, "README.md")
    if os.path.exists(readme):
        lines = [f"עודכן: {summary['generated_at']} (שעון ישראל)", "",
                 f"- הקרנות שהסתיימו בנתונים: {len(rows)} (מתוכן {len(final)} עם אומדן סופי)",
                 f"- ממוצע כרטיסים להקרנה: {summary['avg_per_screening']}",
                 f"- ריצות ב-7 הימים האחרונים: {len(ok_runs)} מוצלחות מתוך {len(recent_runs)} "
                 f"(בסיס של כל חצי שעה: {7 * 24 * 2}, ועוד ריצה לפני כל הקרנה)", "", "| יום | הקרנות | ממוצע כרטיסים |", "|---|---|---|"]
        lines += [f"| {d} | {v['screenings']} | {v['avg']} |" for d, v in summary["by_weekday"].items()]
        txt = open(readme, encoding="utf-8").read()
        txt = re.sub(r"(<!-- AUTO-START -->).*(<!-- AUTO-END -->)", lambda m: m.group(1) + "\n" + "\n".join(lines)
                     + "\n" + m.group(2), txt, flags=re.S)
        open(readme, "w", encoding="utf-8").write(txt)
    print(f"built: {len(rows)} past screenings ({len(final)} final), {len(upcoming)} upcoming")

    import dashboard  # GitHub Pages dashboard (docs/)
    dashboard.main()


if __name__ == "__main__":
    main()

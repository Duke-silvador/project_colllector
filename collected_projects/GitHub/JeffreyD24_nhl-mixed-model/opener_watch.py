"""
Quick check, run every minute by alert_loop.sh between full checks: has DraftKings posted a line for any game we have
a model for (today, tomorrow) since the last look? Exits with code 10 if so, so the loop runs a full alert check at once.
DraftKings usually posts NHL lines around 11:20 AM to 12:30 PM ET the day before the game (from research/line_moves).

  python opener_watch.py WORKDIR
"""
import os, sys, json, datetime as dt
from zoneinfo import ZoneInfo
W = os.path.abspath(sys.argv[1]); sys.path.insert(0, W)
import nhl_data as nd

STATE = os.path.join(W, "state")
today = dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()
days = sorted({f[6:16] for f in os.listdir(STATE) if f.startswith("model_") and f[6:16] >= today})
path = os.path.join(STATE, "openers_seen.json")
seen = set(json.load(open(path))) if os.path.exists(path) else set()
new = []
for d in days:
    try:
        rows = nd.an_lines(d, books=(68,))
    except Exception as e:
        print("Action Network unavailable:", type(e).__name__); continue
    for r in rows:
        if r["book_id"] == 68 and r["home_ml"] == r["home_ml"]:           # has a DraftKings moneyline
            k = f"{d}|{r['away']}@{r['home']}"
            if k not in seen: new.append(k); seen.add(k)
json.dump(sorted(k for k in seen if k[:10] >= today), open(path, "w"))
if new:
    print("New DraftKings lines:", ", ".join(new)); sys.exit(10)
print("No new DraftKings lines.")

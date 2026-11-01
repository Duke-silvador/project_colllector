"""
Builds data/training_games.csv (every game 2019-20..2025-26 with features and lines) and runs the walk-forward
backtests. Lines: open = Action Network's opening line; close = DraftKings close (2024-25 on), else the last
pre-game line Action Network kept (2021-22..2023-24).

  python make_training.py WORKDIR
"""
import os, sys, json
import pandas as pd
W = os.path.abspath(sys.argv[1]); sys.path.insert(0, W)
import build_features as bf
from nhl_mixed_model import run

G = pd.read_csv(os.path.join(W, "data", "games_hist.csv"), parse_dates=["date"])
B = pd.read_csv(os.path.join(W, "data", "box_hist.csv"))
L = pd.read_csv(os.path.join(W, "data", "lines_hist.csv"), parse_dates=["date"])
F, _ = bf.build(G, B)
cols = ["home_ml", "away_ml", "home_pl", "home_pl_odds", "away_pl_odds", "total", "over_odds", "under_odds"]
def pick(books, pre):
    x = L[L.book.isin(books)].copy(); x["r"] = x.book.map({b: i for i, b in enumerate(books)})
    x = x.sort_values("r").drop_duplicates(["date", "home", "away"])
    return x[["date", "home", "away"] + cols].rename(columns={c: f"{pre}_{c}" for c in cols})
F = F.merge(pick(["Open"], "open"), on=["date", "home", "away"], how="left")
F = F.merge(pick(["DraftKings", "Consensus", "Latest"], "close"), on=["date", "home", "away"], how="left")
F = F.drop(columns=["tip_et", "detail"], errors="ignore")
F.to_csv(os.path.join(W, "data", "training_games.csv"), index=False)
print("training games", len(F), "with open lines", F.open_home_ml.notna().sum(), "with close", F.close_home_ml.notna().sum())
print(F.groupby("season")[["home_miss_off", "home_miss_off_open", "home_n_out", "home_n_out_open"]].mean().round(3))
os.makedirs(os.path.join(W, "_tmp"), exist_ok=True)
for test, train in ((2023, [2020, 2021, 2022]), (2024, [2020, 2021, 2022, 2023]), (2025, [2021, 2022, 2023, 2024]), (2026, [2022, 2023, 2024, 2025])):
    summ, P, _ = run(F, train, test)
    json.dump(summ, open(os.path.join(W, "_tmp", f"backtest_{test}.json"), "w"), indent=1, default=float)
    P.to_csv(os.path.join(W, "_tmp", f"backtest_{test}.csv"), index=False)
    print("== test", test, json.dumps({k: v for k, v in summ.items() if k != "test"}, default=float)[:900])
    print(json.dumps(summ["test"].get("accuracy"), default=float))
    for k, v in summ["test"].items():
        if k == "accuracy": continue
        print(" ", k)
        for mk, rows in v.items():
            print("    ", mk, " | ".join(f"ev>={r['ev_threshold']:.2f}: {r['wins']}-{r['losses']} {r['units']:+.1f}u" for r in rows))

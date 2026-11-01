"""
One-time build of the training data (rerun to refresh). Writes:
  data/games_hist.csv   every regular-season game 2019-20 .. last season: teams, regulation and final goals, how it ended
  data/box_hist.csv     player time on ice, goals, assists; goalies with starter flag and goals against
  data/lines_hist.csv   Action Network opening line (book 'Open'), consensus close, and DraftKings close, 2021-22 on

  python build_history.py WORKDIR [CACHE_DIR]
"""
import os, sys, json, pickle
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
sys.path.insert(0, os.path.abspath(sys.argv[1]))
import nhl_data as nd

W = os.path.abspath(sys.argv[1]); CACHE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(W, "_tmp", "cache")
os.makedirs(CACHE, exist_ok=True); os.makedirs(os.path.join(W, "data"), exist_ok=True)
SEASONS = range(2020, 2027)            # 2019-20 .. 2025-26
LINE_SEASONS = range(2022, 2027)       # Action Network: full markets from 2024-25 on, last pre-game line before that


def cached(name, fn):
    p = os.path.join(CACHE, name + ".pkl")
    if os.path.exists(p): return pickle.load(open(p, "rb"))
    v = fn(); pickle.dump(v, open(p, "wb")); return v


def dates(season):
    return pd.date_range(f"{season - 1}-09-25", f"{season}-07-15")


def main():
    days = [d for s in SEASONS for d in dates(s)]
    with ThreadPoolExecutor(16) as ex:
        sb = list(ex.map(lambda d: cached(f"sb_{d:%Y%m%d}", lambda: nd.scoreboard(d)), days))
    G = pd.DataFrame([r for rows in sb for r in rows]).drop_duplicates("game_id")
    G = G[(G.state == "post") & G.home_goals.notna() & G.home.notna() & G.away.notna()].drop(columns=["probables", "state"])
    G["season"] = G.date.map(nd.season_of)
    G = G.sort_values(["date", "tip_et"]).reset_index(drop=True)
    print("games", len(G), G.groupby("season").size().to_dict())
    with ThreadPoolExecutor(24) as ex:
        bx = list(ex.map(lambda g: cached(f"box_{g}", lambda: nd.box(g)), G.game_id))
    B = pd.DataFrame([r for rows in bx for r in rows])
    B = B.merge(G[["game_id", "date", "season"]], on="game_id")
    print("box rows", len(B), "games with box", B.game_id.nunique())
    ldays = [d for s in LINE_SEASONS for d in dates(s) if d in set(G.date)]
    with ThreadPoolExecutor(8) as ex:
        ln = list(ex.map(lambda d: cached(f"an_{d:%Y%m%d}", lambda: nd.an_lines(d)), ldays))
    L = pd.DataFrame([r for rows in ln for r in rows]).drop(columns=["_raw", "_goalies"])
    print("line rows", len(L), L.book.value_counts().to_dict())
    G.to_csv(os.path.join(W, "data", "games_hist.csv"), index=False)
    B.to_csv(os.path.join(W, "data", "box_hist.csv"), index=False)
    L.to_csv(os.path.join(W, "data", "lines_hist.csv"), index=False)


if __name__ == "__main__":
    main()

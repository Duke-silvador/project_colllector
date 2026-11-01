"""
Precomputes what the live xG model needs, so daily runs don't need the 53 MB shot history:
  data/xg_model.json            xG coefficients fit on the live training seasons' shots (2021-22..2025-26)
  data/training_games.csv       gains home_xg/away_xg/home_att/away_att (regulation xG and unblocked attempts)
Needs data/shots_hist.csv (python build_shots.py .).

  python make_xg_inputs.py WORKDIR
"""
import os, sys, json
import pandas as pd
W = os.path.abspath(sys.argv[1]); sys.path.insert(0, W)
import nhl_xg_model as xm

TRAIN = [2022, 2023, 2024, 2025, 2026]
T = pd.read_csv(os.path.join(W, "data", "training_games.csv"))
S = pd.read_csv(os.path.join(W, "data", "shots_hist.csv"), low_memory=False)
mod = xm.xg_model(S, T, TRAIN)
json.dump(mod, open(os.path.join(W, "data", "xg_model.json"), "w"), indent=1)
TG = xm.team_game_xg(xm.apply_xg(S, T, mod), T)
T = T.drop(columns=[c for c in TG.columns if c != "game_id" and c in T]).merge(TG, on="game_id", how="left")
T.to_csv(os.path.join(W, "data", "training_games.csv"), index=False)
print("xG coefficients:", dict(zip(mod["cols"], [round(c, 3) for c in mod["coef"]])))
print("games with xG:", T.home_xg.notna().sum(), "of", len(T), "| mean regulation xG per team", round(T[["home_xg", "away_xg"]].stack().mean(), 3),
      "vs goals", round(T[["home_reg", "away_reg"]].stack().mean(), 3))

"""
NHL live tracker (2026-27). One run = one morning or evening update.

  python tracker.py WORKDIR [YYYY-MM-DD] [--tomorrow]

Each run:
  1. pulls 2026-27 results and the schedule from ESPN, and box scores for newly finished games (state/box_2026_27.csv)
  2. builds features: expected starting goalie (last 10 starts, back-to-back adjusted) and regular skaters who missed
     the previous game (the 'open' information, the same setup the backtests used for opening lines)
  3. refits the mixed model on 2021-22..2025-26 and walks forward through 2026-27 with no lookahead
  4. LOCKS predictions for the target day's games (timestamped, before puck drop). Locked picks are never changed.
  5. pulls DraftKings opening/closing lines from ESPN, grades finished games, alerts and logged bets
  6. writes state/picks_log.csv, the model file for the intraday checks, and NHL_Live_Tracker.xlsx
"""
import os, sys, json, warnings, datetime as dt
from concurrent.futures import ThreadPoolExecutor
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd

W = os.path.abspath(sys.argv[1])
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
def now_et(): return pd.Timestamp(dt.datetime.now(ET).replace(tzinfo=None))
_args = [a for a in sys.argv[2:] if not a.startswith("--")]
TODAY = pd.Timestamp(_args[0]) if _args else now_et().normalize()
# morning run: today's games.  evening run (--tomorrow): tomorrow's games, locked before most opening lines are posted
TARGET = TODAY + pd.Timedelta(days=1) if "--tomorrow" in sys.argv else TODAY
# Tomorrow's picks use only results through yesterday: today's games aren't played yet when DraftKings posts tomorrow's
# lines (~11:20 AM the day before). The backtests use the same one-day lag (dev/lag_backtest.py).
LAG = 1 if TARGET > TODAY else 0
sys.path.insert(0, W)
import nhl_data as nd                                            # noqa: E402
import build_features as bf                                      # noqa: E402
import nhl_mixed_model as nm                                     # noqa: E402
import nhl_xg_model as xm                                        # noqa: E402

STATE = os.path.join(W, "state"); os.makedirs(STATE, exist_ok=True)
SEASON = 2027; SEASON_START = pd.Timestamp("2026-09-25")
TRAIN = [2022, 2023, 2024, 2025, 2026]
MARKETS = ("moneyline", "puck line", "total")
RULE = dict(line="open", markets=("moneyline", "puck line"), ev=0.06)   # the tracked rule
# Every model runs every day, keeps its own locked picks and sends its own alerts (labeled; one alert when they agree).
MODELS = {"goals": "Goals model (team offense/defense + goalie, on goals)",
          "xg": "Shot model (expected goals from shot location + finishing + goalie)"}
PRIMARY = "xg"              # the model the workbook notes and the bet-log probabilities lead with (better in the backtests)
def picks_path(name): return os.path.join(STATE, "picks_log.csv" if name == "goals" else f"picks_log_{name}.csv")
log = []
def say(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); log.append(s)


# ------------------------------------------------------------------ 1. results, schedule, box scores
def load_season_data():
    days = pd.date_range(SEASON_START, TARGET)
    with ThreadPoolExecutor(12) as ex:
        sb = list(ex.map(nd.scoreboard, days))
    games = pd.DataFrame([r for rows in sb for r in rows]).drop_duplicates("game_id")
    games = games[games.home.notna() & games.away.notna()]
    games = games[~games.detail.astype(str).str.contains("Postponed|Canceled|Cancelled", case=False)]
    games["season"] = SEASON
    for c in ("home_goals", "away_goals", "home_reg", "away_reg", "ending"):
        if c not in games: games[c] = np.nan
    games = games.sort_values(["date", "tip_et"]).reset_index(drop=True)
    bpath = os.path.join(STATE, "box_2026_27.csv")
    box = pd.read_csv(bpath) if os.path.exists(bpath) else pd.DataFrame(columns=["game_id"])
    fin = games[games.home_goals.notna()]
    need = sorted(set(fin.game_id) - set(box.game_id))
    if need:
        with ThreadPoolExecutor(12) as ex:
            rows = list(ex.map(nd.box, need))
        new = pd.DataFrame([r for rs in rows for r in rs])
        if len(new):
            new = new.merge(fin[["game_id", "date"]], on="game_id"); new["season"] = SEASON
            new["date"] = pd.to_datetime(new.date).dt.strftime("%Y-%m-%d")
            box = pd.concat([box, new], ignore_index=True) if len(box) else new
            box.to_csv(bpath, index=False)
    say(f"Schedule: {len(games)} regular-season games through {TARGET.date()}; {len(fin)} finished, results through "
        f"{fin.date.max().date() if len(fin) else 'none'}; box scores on file for {box.game_id.nunique()} games.")
    return games, box


# ------------------------------------------------------------------ 1b. shots -> expected goals (for the shot model)
def add_xg(games):
    import build_shots as bs
    spath = os.path.join(STATE, "shots_2026_27.csv")
    S = pd.read_csv(spath, low_memory=False) if os.path.exists(spath) else pd.DataFrame(columns=["game_id"])
    fin = games[games.home_goals.notna()]
    need = sorted(set(fin.game_id) - set(S.game_id))
    if need:
        with ThreadPoolExecutor(12) as ex:
            rows = list(ex.map(bs.shots, need))
        new = pd.DataFrame([r for rs in rows for r in rs])
        if len(new):
            S = pd.concat([S, new], ignore_index=True) if len(S) else new
            S.to_csv(spath, index=False)
    for c in ("home_xg", "away_xg", "home_att", "away_att"): games[c] = np.nan
    if len(S):
        mod = json.load(open(os.path.join(W, "data", "xg_model.json")))
        TG = xm.team_game_xg(xm.apply_xg(S, games, mod), games).set_index("game_id")
        for c in ("home_xg", "away_xg", "home_att", "away_att"): games[c] = games.game_id.map(TG[c])
    say(f"Shots: {S.game_id.nunique() if len(S) else 0} games with shot data; expected goals computed for {games.home_xg.notna().sum()}.")
    return games


# ------------------------------------------------------------------ 2. features
def build_features(games, box):
    prior = pd.read_csv(os.path.join(W, "data", "box_2025_26.csv"))
    tr = pd.read_csv(os.path.join(W, "data", "training_games.csv"), usecols=["game_id", "date", "season", "home", "away"])
    allg = pd.concat([tr[tr.season == 2026], games[["game_id", "date", "season", "home", "away"]]], ignore_index=True)
    allg["date"] = pd.to_datetime(allg.date)
    allb = pd.concat([prior, box], ignore_index=True)
    F, rosters = bf.build(allg, allb, lag_days=LAG)
    F = F[F.season == SEASON].set_index("game_id")
    for c in F.columns:
        if c.startswith(("home_", "away_")) and c not in games: games[c] = games.game_id.map(F[c])
    return games, rosters, allb


# ------------------------------------------------------------------ 3/4. model + locked picks
def predict(games, name):
    tr = pd.read_csv(os.path.join(W, "data", "training_games.csv"))
    games = games[(games.date == TARGET) | ((games.date < TARGET) & games.home_goals.notna())].reset_index(drop=True)
    cur = games.drop(columns=["tip_et", "probables", "state", "detail"], errors="ignore").copy()
    df = pd.concat([tr, cur], ignore_index=True)
    if name == "xg":
        summ, P, extra = xm.run(df, TRAIN, SEASON, lag_days=LAG)
    else:
        summ, P, extra = nm.run(df, TRAIN, SEASON, lag_days=LAG)
        extra["c_miss"] = float(extra["fit"]["b"][4])
    P = P.set_index("game_id")
    g = games.copy()
    for c in ("lam_home_open", "lam_away_open", "p_home_win_open", "p_home_by2_open", "p_away_by2_open", "pred_margin_open", "pred_total_open",
              "b2b_home", "b2b_away"):
        g[c] = g.game_id.map(P[c])
    return g, summ, extra


def top_goalie(mix, names):
    m = json.loads(mix) if isinstance(mix, str) else {}
    if not m: return ""
    k, w = max(m.items(), key=lambda x: x[1])
    return f"{names.get(int(k), k)} ({w:.0%})"


def lock_picks(g, games_through, names, name):
    path = picks_path(name)
    logdf = pd.read_csv(path, parse_dates=["date", "tip_et", "locked_at_et"]) if os.path.exists(path) else pd.DataFrame()
    locked = set(logdf.game_id) if len(logdf) else set()
    now = now_et()
    new = g[~g.game_id.isin(locked) & (g.date <= TARGET)].copy()
    live_mask = (new.date == TARGET) & (new.tip_et > now)
    new["pick_type"] = np.where(live_mask, "live", "backfilled")
    new = new[(new.pick_type == "live") | new.home_goals.notna()]
    new["locked_at_et"] = now; new["results_through"] = games_through
    new["home_goalie_exp"] = [top_goalie(m, names) for m in new.home_gmix]
    new["away_goalie_exp"] = [top_goalie(m, names) for m in new.away_gmix]
    new = new.rename(columns={"lam_home_open": "lam_home", "lam_away_open": "lam_away", "p_home_win_open": "p_home_win",
                              "p_home_by2_open": "p_home_by2", "p_away_by2_open": "p_away_by2",
                              "pred_margin_open": "pred_margin", "pred_total_open": "pred_total"})
    keep = ["game_id", "date", "tip_et", "home", "away", "pick_type", "locked_at_et", "results_through",
            "lam_home", "lam_away", "pred_margin", "pred_total", "p_home_win", "p_home_by2", "p_away_by2",
            "home_goalie_exp", "away_goalie_exp", "home_n_out_open", "away_n_out_open"]
    new = new[keep]
    logdf = pd.concat([logdf, new], ignore_index=True) if len(logdf) else new
    say(f"[{name}] Locked {int((new.pick_type == 'live').sum())} live picks for {TARGET.date()} and {int((new.pick_type == 'backfilled').sum())} backfilled.")
    return logdf


# ------------------------------------------------------------------ 5. lines (ESPN) + grading
LCOLS = list(__import__("espn").MARKET_COLS)


def clv(ev_price_dec, side, market, line, close_row):
    """closing line value: expected return of your bet if the no-vig closing price were the true chance.
    0.05 = your price was 5% better than the fair closing price. Blank when the line number changed."""
    import espn
    if close_row is None: return np.nan
    def fair(a, b):
        if pd.isna(a) or pd.isna(b): return np.nan
        ia, ib = 1 / espn.nd_dec(a), 1 / espn.nd_dec(b); return ia / (ia + ib)
    c = close_row
    if market == "moneyline":
        p = fair(c["home_ml"], c["away_ml"]); p = p if side == "home" else 1 - p
    elif market == "puck line":
        if pd.isna(c["home_pl"]) or pd.isna(line): return np.nan
        cl = c["home_pl"] if side == "home" else -c["home_pl"]
        if cl != line: return np.nan
        p = fair(c["home_pl_odds"], c["away_pl_odds"]); p = p if side == "home" else 1 - p
    else:
        if pd.isna(c["total"]) or c["total"] != line: return np.nan
        p = fair(c["over_odds"], c["under_odds"]); p = p if side == "over" else 1 - p
    return round(ev_price_dec * p - 1, 4) if not pd.isna(p) else np.nan


def grade_picks(logdf, games, extra):
    res = games.set_index("game_id")[["home_goals", "away_goals", "home_reg", "away_reg"]]
    for c in res.columns: logdf[c] = logdf.game_id.map(res[c])
    for w in ("open", "close"):
        for c in LCOLS:
            if f"{w}_{c}" not in logdf: logdf[f"{w}_{c}"] = np.nan
    need = logdf[logdf.open_home_ml.isna() | (logdf.close_home_ml.isna() & logdf.home_goals.notna())]
    if len(need):
        try:
            import espn
            L = espn.lines(sorted(need.date.dt.normalize().unique()), when=("open", "close"))
            if len(L) and "open_home_ml" in L:
                L = L.set_index("game_id")
                finished = logdf.home_goals.notna()
                for w in ("open", "close"):
                    for c in LCOLS:
                        new = logdf.game_id.map(L[f"{w}_{c}"]) if f"{w}_{c}" in L else pd.Series(np.nan, index=logdf.index)
                        if w == "close": new = new.where(finished)
                        logdf[f"{w}_{c}"] = logdf[f"{w}_{c}"].fillna(new)
                say(f"Lines: pulled DraftKings lines from ESPN for {len(L)} games.")
            else:
                say("Lines: ESPN returned no odds.")
        except Exception as e:
            say(f"Lines: ESPN not reachable ({type(e).__name__}); picks stay locked and are graded once lines are available.")
    cal, h_ot = extra["cal"]["open"], extra["h_ot"]
    P = logdf.copy()
    for w in ("open", "close"):
        for mk in MARKETS:
            for c in ("bet", "price", "line", "p", "ev", "result", "profit", "clv"): logdf[f"{w}_{mk}_{c}"] = None
        if not P[f"{w}_home_ml"].notna().any(): continue
        Bt = nm.bets(P, w, "", cal, h_ot)
        for r in Bt.itertuples():
            mk = r.market; i = r.idx
            logdf.at[i, f"{w}_{mk}_bet"] = r.side; logdf.at[i, f"{w}_{mk}_price"] = r.price
            logdf.at[i, f"{w}_{mk}_line"] = r.line; logdf.at[i, f"{w}_{mk}_p"] = round(r.p, 4); logdf.at[i, f"{w}_{mk}_ev"] = round(r.ev, 4)
            if not pd.isna(r.profit):
                logdf.at[i, f"{w}_{mk}_result"] = "P" if r.push == 1 else ("W" if r.profit > 0 else "L")
                logdf.at[i, f"{w}_{mk}_profit"] = round(r.profit, 3)
            if w == "open" and logdf.at[i, "close_home_ml"] == logdf.at[i, "close_home_ml"]:
                crow = {c: logdf.at[i, f"close_{c}"] for c in LCOLS}
                logdf.at[i, f"open_{mk}_clv"] = clv(r.dec, r.side, mk, r.line, crow)
    return logdf


# ------------------------------------------------------------------ for the intraday alert checks
def export_today_model(results, rosters, names, active):
    """Everything alert.py needs to re-predict today's games without refitting, for every model: each side's expected
    goals before the goalie and missing-skater terms, the goalie effects, the regular skaters, calibration."""
    models = {}
    for name, (g, summ, extra) in results.items():
        c_miss = extra["c_miss"]
        gval = {int(k): round(float(v), 4) for k, v in extra["effects"]["goalies"].items()}
        out = []
        for r in g[g.date == TARGET].itertuples():
            def mixval(m):
                m = json.loads(m) if isinstance(m, str) else {}
                return sum(w * gval.get(int(k), 0.0) for k, w in m.items())
            out.append(dict(game_id=int(r.game_id), home=r.home, away=r.away, tip_et=str(r.tip_et),
                            base_home=r.lam_home_open - c_miss * r.home_miss_off_open - mixval(r.away_gmix),
                            base_away=r.lam_away_open - c_miss * r.away_miss_off_open - mixval(r.home_gmix),
                            morning_lam_home=r.lam_home_open, morning_lam_away=r.lam_away_open,
                            home_gmix=json.loads(r.home_gmix), away_gmix=json.loads(r.away_gmix),
                            home_regulars=rosters.get((r.game_id, "home"), {}), away_regulars=rosters.get((r.game_id, "away"), {}),
                            home_miss_open=r.home_miss_off_open, away_miss_open=r.away_miss_off_open))
        models[name] = dict(label=MODELS[name], c_miss=c_miss, h_ot=extra["h_ot"], cal=extra["cal"], goalies=gval,
                            goalie_names={int(k): names.get(int(k), "") for k in gval}, games=out)
    for f in os.listdir(STATE):
        if f.startswith("model_") and f[6:16] < str(TODAY.date()): os.remove(os.path.join(STATE, f))
    json.dump(dict(date=str(TARGET.date()), made_at_et=str(now_et()), active=active, models=models),
              open(os.path.join(STATE, f"model_{TARGET.date()}.json"), "w"))
    say(f"Saved {len(models)} models for intraday checks ({len(out)} games).")


def leaderboard(logs):
    """Season-to-date scorecard for every model: rule bets at opening prices (units, return, closing line value),
    moneyline accuracy, and each model's phone alerts. Nothing switches automatically; both models keep alerting."""
    apath = os.path.join(STATE, "alerts.csv")
    A = pd.read_csv(apath) if os.path.exists(apath) else pd.DataFrame()
    if len(A) and "model" not in A: A["model"] = "goals"
    rows = {}
    for name, df in logs.items():
        parts = []
        for mk in RULE["markets"]:
            ev = pd.to_numeric(df[f"open_{mk}_ev"], errors="coerce")
            sel = df[(ev >= RULE["ev"]) & df[f"open_{mk}_result"].isin(["W", "L", "P"])]
            parts.append(pd.DataFrame({"profit": pd.to_numeric(sel[f"open_{mk}_profit"], errors="coerce"),
                                       "clv": pd.to_numeric(sel[f"open_{mk}_clv"], errors="coerce"), "type": sel.pick_type}))
        B = pd.concat(parts)
        fin = df[df.home_goals.notna()]
        y = (fin.home_goals > fin.away_goals).astype(float)
        live = B[B.type == "live"]
        al = A[(A.model.fillna("goals") == name) & A.skipped.isna()] if len(A) and "skipped" in A else pd.DataFrame()
        alg = al[al.result.isin(["W", "L", "P"])] if len(al) and "result" in al else pd.DataFrame()
        rows[name] = dict(label=MODELS[name], rule_bets=int(len(B)), wins=int((B.profit > 0).sum()), losses=int((B.profit < 0).sum()),
                          units=round(float(B.profit.sum()), 2), return_per_bet=round(float(B.profit.mean()), 4) if len(B) else None,
                          avg_clv=round(float(B.clv.mean()), 4) if B.clv.notna().any() else None, bets_with_clv=int(B.clv.notna().sum()),
                          live_rule_bets=int(len(live)), live_units=round(float(live.profit.sum()), 2),
                          alerts_graded=int(len(alg)), alert_units=round(float(pd.to_numeric(alg.profit, errors="coerce").sum()), 2) if len(alg) else 0.0,
                          moneyline_brier=round(float(((fin.p_home_win - y) ** 2).mean()), 4) if len(fin) else None, games_graded=int(len(fin)))
    board = dict(updated_et=str(now_et()), active=PRIMARY, rule=RULE, models=rows)
    json.dump(board, open(os.path.join(STATE, "leaderboard.json"), "w"), indent=1)
    for k, r in rows.items():
        say(f"Scorecard [{k}]: {r['wins']}-{r['losses']} on rule bets, {r['units']:+.1f} units ({r['live_rule_bets']} live), average CLV "
            + (f"{r['avg_clv']:+.2%}" if r["avg_clv"] is not None else "n/a") + f"; alerts {r['alert_units']:+.1f} units on {r['alerts_graded']}; moneyline Brier {r['moneyline_brier']}.")
    return PRIMARY, board


def grade_alerts(games, logdf):
    path = os.path.join(STATE, "alerts.csv")
    if not os.path.exists(path): return
    a = pd.read_csv(path)
    if not len(a): return
    res = games.set_index("game_id")[["home_goals", "away_goals"]]
    out, prof, clvs = [], [], []
    L = logdf.set_index("game_id")
    import espn
    for r in a.itertuples():
        hg, ag = res.home_goals.get(r.game_id, np.nan), res.away_goals.get(r.game_id, np.nan)
        result = settle(r.market, r.side, r.line, hg, ag)
        out.append(result)
        d = espn.nd_dec(r.price) if not pd.isna(r.price) else np.nan
        prof.append(np.nan if result is None else (0.0 if result == "P" else (d - 1 if result == "W" else -1.0)))
        crow = {c: L[f"close_{c}"].get(r.game_id, np.nan) for c in LCOLS} if r.game_id in L.index else None
        clvs.append(clv(d, r.side, r.market, r.line, crow) if crow and not pd.isna(crow["home_ml"]) else np.nan)
    a["result"], a["profit"], a["clv"] = out, prof, clvs
    a.to_csv(path, index=False)
    g = a[a.result.isin(["W", "L"]) & a.skipped.isna()] if "skipped" in a else a[a.result.isin(["W", "L"])]
    if len(g):
        w, l = int((g.result == "W").sum()), int((g.result == "L").sum())
        say(f"Alerts graded so far: {w}-{l}, {g.profit.sum():+.2f} units at the alerted prices.")


def settle(market, side, line, hg, ag):
    """W/L/P for a bet; side = home/away/over/under; line = the bettor's puck line or the total"""
    if pd.isna(hg) or pd.isna(ag): return None
    m = hg - ag
    if market == "moneyline":
        v = m if side == "home" else -m
    elif market == "puck line":
        v = (m if side == "home" else -m) + line
    else:
        v = (hg + ag - line) * (1 if side == "over" else -1)
    return "W" if v > 0 else ("L" if v < 0 else "P")


def grade_my_bets(games, logdf):
    """grade bets the user logged through the 'Log a bet' form, with their own odds and stake"""
    path = os.path.join(STATE, "my_bets.csv")
    if not os.path.exists(path): return
    B = pd.read_csv(path)
    if not len(B): return
    import espn
    g = games.copy(); g["date_s"] = g.date.dt.strftime("%Y-%m-%d")
    key = {(r.date_s, r.home, r.away): r for r in g.itertuples()}
    picks = logdf.copy(); picks["date_s"] = pd.to_datetime(picks.date).dt.strftime("%Y-%m-%d")
    pk = {(r.date_s, r.home, r.away): r for r in picks.itertuples()}
    res, prof, mp, mev, clvs = [], [], [], [], []
    for r in B.itertuples():
        gm = key.get((r.date, r.home, r.away))
        side = "home" if r.pick == r.home else ("away" if r.pick == r.away else r.pick)
        result = settle(r.market, side, r.line, gm.home_goals, gm.away_goals) if gm is not None else None
        d = espn.nd_dec(r.odds)
        res.append(result)
        prof.append(np.nan if result is None else (0.0 if result == "P" else (round(r.stake * (d - 1), 2) if result == "W" else -r.stake)))
        p = pk.get((r.date, r.home, r.away)); pr = np.nan
        if p is not None:
            if r.market == "moneyline": pr = p.p_home_win if side == "home" else 1 - p.p_home_win
            elif r.market == "puck line":
                if r.line == -1.5: pr = p.p_home_by2 if side == "home" else p.p_away_by2
                elif r.line == 1.5: pr = 1 - (p.p_away_by2 if side == "home" else p.p_home_by2)
            else:
                po, pu, pp = nm.over_prob(np.array([p.lam_home]), np.array([p.lam_away]), np.array([r.line]), EXTRA["h_ot"], EXTRA["cal"]["open"])
                pr = float(po[0] if side == "over" else pu[0])
        mp.append(round(pr, 4) if not pd.isna(pr) else np.nan)
        mev.append(round(pr * d - 1, 4) if not pd.isna(pr) else np.nan)
        crow = {c: getattr(p, f"close_{c}", np.nan) for c in LCOLS} if p is not None else None
        clvs.append(clv(d, side, r.market, r.line, crow) if crow and not pd.isna(crow["home_ml"]) else np.nan)
    B["result"], B["profit"], B["model_prob"], B["model_ev_at_your_price"], B["clv"] = res, prof, mp, mev, clvs
    B.to_csv(path, index=False)
    d = B[B.result.isin(["W", "L", "P"])]
    if len(d):
        w, l = int((d.result == "W").sum()), int((d.result == "L").sum())
        say(f"Your logged bets: {w}-{l}" + (f"-{int((d.result == 'P').sum())}" if (d.result == "P").any() else "")
            + f", ${d.profit.sum():+.2f} on ${d.stake.sum():.2f} staked.")


def grade_jumps(games, logdf):
    """for each logged line jump: did the line keep moving that way by the close, and did the result land on that side?"""
    path = os.path.join(STATE, "line_jumps.csv")
    if not os.path.exists(path): return
    J = pd.read_csv(path)
    if not len(J): return
    import espn
    res = games.set_index("game_id")[["home_goals", "away_goals"]]
    L = logdf.set_index("game_id")
    kept, right, closes = [], [], []
    for r in J.itertuples():
        hg, ag = res.home_goals.get(r.game_id, np.nan), res.away_goals.get(r.game_id, np.nan)
        if r.game_id in L.index:
            c = L.loc[r.game_id]
            cl = (round(100 * espn.novig_home(c.close_home_ml, c.close_away_ml), 1) if r.market == "moneyline" else c.close_total)
        else: cl = np.nan
        closes.append(cl); sgn = np.sign(r.move)
        kept.append(None if pd.isna(cl) else ("yes" if (cl - r.to_line) * sgn > 0 else ("same" if cl == r.to_line else "no (bounced back)")))
        if pd.isna(hg): right.append(None); continue
        v = ((hg + ag) - r.to_line) * sgn if r.market == "total" else (hg - ag) * sgn      # home prob up -> market leaned home
        right.append("yes" if v > 0 else ("push" if v == 0 else "no"))
    J["closing_line"], J["kept_moving_to_close"], J["result_matched_move"] = closes, kept, right
    J.to_csv(path, index=False)
    g = J[J.result_matched_move.isin(["yes", "no"])]
    if len(g): say(f"Line jumps graded: {len(g)}; the result matched the jump's direction {int((g.result_matched_move == 'yes').sum())} times.")


EXTRA = {}


# ------------------------------------------------------------------ main
def main():
    say(f"NHL tracker run on {TODAY.date()} (ET), predicting games on {TARGET.date()}.")
    games, box = load_season_data()
    games, rosters, allb = build_features(games, box)
    games = add_xg(games)
    names = dict(zip(allb.playerid.astype(int), allb.player))
    if not (games.date == TARGET).any():
        say(f"No regular-season games on {TARGET.date()}; grading earlier picks only.")
    played = games.dropna(subset=["home_goals"])
    through = str(played.date.max().date()) if len(played) else "none"
    results, logs = {}, {}
    for name in MODELS:
        g, summ, extra = predict(games, name)
        results[name] = (g, summ, extra)
        logdf = lock_picks(g, through, names, name)
        logdf = grade_picks(logdf.reset_index(drop=True), games, extra)
        logdf.sort_values(["date", "tip_et"]).to_csv(picks_path(name), index=False)
        logs[name] = logdf
    try:                                    # full line histories: Action Network only keeps them about a day, so save them now
        import research
        research.init(W)
        tips = {(r.home, r.away): (int(r.game_id), r.tip_et) for r in games.itertuples()}
        for d in sorted({TODAY - pd.Timedelta(days=1), TODAY, TARGET}):
            say(f"Line histories {d.date()}: {research.line_moves(d, tips)} new price changes saved.")
    except Exception as e:
        say(f"Line histories skipped ({type(e).__name__}: {str(e)[:80]}).")
    active, board = leaderboard(logs)
    export_today_model(results, rosters, names, active)
    EXTRA.update(results[active][2])
    grade_alerts(games, logs["goals"])
    grade_my_bets(games, logs[active])
    grade_jumps(games, logs["goals"])
    today = logs[active][(logs[active].date == TARGET) & (logs[active].pick_type == "live")]
    json.dump({"active_model": active, "today": [dict(home=r.home, away=r.away, tip=str(r.tip_et), home_win_prob=round(r.p_home_win, 3),
                              expected_goals=f"{r.lam_home:.2f}-{r.lam_away:.2f} (regulation)", expected_total=round(r.pred_total, 2))
                         for r in today.itertuples()],
               "models": {k: {kk: vv for kk, vv in v[1].items() if kk not in ("test", "calibration", "tune")} for k, v in results.items()},
               "log": log}, open(os.path.join(STATE, "last_run.json"), "w"), indent=1, default=float)
    import build_tracker_workbook
    build_tracker_workbook.build({k: picks_path(k) for k in MODELS}, os.path.join(W, "NHL_Live_Tracker.xlsx"), RULE, log, board)
    say("Done.")


if __name__ == "__main__":
    main()

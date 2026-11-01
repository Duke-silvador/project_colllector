"""
Per-game features from box scores, with no lookahead.

For each game and team:
  goalie      the actual starting goalie (known about an hour before puck drop; used for closing-line predictions)
  gmix        expected starter before it's announced: each goalie's share of the team's last 10 starts, with the
              goalie who started yesterday down-weighted on the second night of a back-to-back (same goalie starts
              both nights only ~14% of the time, vs ~50% otherwise)
  miss_off    value of regular skaters missing from the lineup = sum of (expected TOI / 60) x (last season's
              points per 60, shrunk, minus replacement level). A regular = played in 3+ of the team's last 5 games.
                pretip version: regulars not in this game's lineup (actual lineup; for closing lines)
                open version:   regulars who also missed the team's previous game (known the day before)
  n_out       how many regulars are missing (open and pretip)

Live use: unfinished games get the open version for both, unless the tracker passes newer information.
"""
import json
import numpy as np, pandas as pd

B2B_SAME_FACTOR = 0.1          # weight multiplier for yesterday's starter on a back-to-back
SHRINK_MIN = 300               # minutes of league-average production added to every player's rate
REPL_PCT = 0.20                # replacement level = 20th percentile of regulars' rates, by position


def player_rates(box):
    """points per 60 by player-season, shrunk toward the position mean, minus replacement level"""
    sk = box[box.pos != "G"]
    ps = sk.groupby(["playerid", "season"]).agg(toi=("toi", "sum"), pts=("g", "sum"), a=("a", "sum"),
                                                pos=("pos", lambda s: s.mode()[0]), gp=("game_id", "nunique")).reset_index()
    ps["pts"] = ps.pts + ps.a
    out = []
    for (s, pos), g in ps.groupby(["season", "pos"]):
        m = g.pts.sum() / (g.toi.sum() / 60)
        rate = (g.pts + m * SHRINK_MIN / 60) / ((g.toi + SHRINK_MIN) / 60)
        repl = rate[g.toi >= 500].quantile(REPL_PCT)
        out.append(pd.DataFrame({"playerid": g.playerid, "season": s, "value60": rate - repl}))
    return pd.concat(out).set_index(["playerid", "season"]).value60.to_dict()


def build(games, box, overrides=None, lag_days=0):
    """games: game_id, date, season, home, away (all games, past and to predict). box: player rows of finished games.
    overrides: {(game_id, side): dict(goalie=id, missing={pid: p_miss})} newer info for unfinished games.
    lag_days: the 'open' features (goalie mix, regulars who missed the last game) use only games played at least
    lag_days before the previous day. lag_days=1 matches what is known when DraftKings posts its line, about 31 hours
    before the game: the previous day's games haven't been played yet. On a back-to-back, the goalie expected to start
    that previous-day game (the most likely one) is the one down-weighted.
    Returns games with feature columns and a dict of team rosters (for intraday re-prediction)."""
    games = games.copy(); games["date"] = pd.to_datetime(games.date)
    box = box.copy()
    rates = player_rates(box)
    sk = box[box.pos != "G"]
    lineup = {k: dict(zip(g.playerid, g.toi)) for k, g in sk.groupby(["game_id", "team"])}
    starters = box[(box.pos == "G") & (box.starter == 1)].set_index(["game_id", "team"]).playerid.to_dict()
    names = dict(zip(box.playerid, box.player))
    tg = pd.concat([games[["game_id", "date", "season", "home"]].rename(columns={"home": "team"}).assign(side="home"),
                    games[["game_id", "date", "season", "away"]].rename(columns={"away": "team"}).assign(side="away")])
    tg = tg.sort_values(["team", "date"])
    feats, rosters = {}, {}
    for team, g in tg.groupby("team"):
        hist = []                   # (date, lineup dict, starter) of finished games
        prev_date = None
        for r in g.itertuples():
            ov = (overrides or {}).get((r.game_id, r.side), {})
            full = hist
            hist = [h for h in full if h[0] < r.date - pd.Timedelta(days=lag_days)] if lag_days else full
            last5 = hist[-5:]
            cnt = {}
            for _, lu, _ in last5:
                for p in lu: cnt[p] = cnt.get(p, 0) + 1
            regs = [p for p, c in cnt.items() if c >= 3]
            exp_toi = {}
            for p in regs:
                t = [lu[p] for _, lu, _ in hist[-10:] if p in lu]
                exp_toi[p] = float(np.mean(t)) if t else 0.0
            val = {p: exp_toi[p] / 60 * rates.get((p, r.season - 1), 0.0) for p in regs}
            last_lu = hist[-1][1] if hist else {}
            miss_open = [p for p in regs if p not in last_lu]
            cur = lineup.get((r.game_id, team))
            if cur is not None:
                miss_pre = {p: 1.0 for p in regs if p not in cur}
            elif "missing" in ov:
                miss_pre = {p: pm for p, pm in ov["missing"].items() if p in val}
            else:
                miss_pre = {p: 1.0 for p in miss_open}
            # goalie mix from the last 10 starts
            st = [s for _, _, s in hist[-10:] if s is not None]
            w = {}
            for s in st: w[s] = w.get(s, 0) + 1
            if hist and (r.date - hist[-1][0]).days == 1 and hist[-1][2] in w:
                w[hist[-1][2]] *= B2B_SAME_FACTOR
            elif lag_days and prev_date is not None and (r.date - prev_date).days == 1 and w:
                likely = max(w, key=w.get)            # yesterday's starter isn't known yet: assume the usual starter
                w[likely] *= B2B_SAME_FACTOR
            tot = sum(w.values()) or 1
            gmix = {int(k): v / tot for k, v in w.items()}
            goalie = starters.get((r.game_id, team), ov.get("goalie"))
            feats[(r.game_id, r.side)] = dict(
                goalie=goalie, gmix=json.dumps(gmix),
                miss_off=sum(val[p] * pm for p, pm in miss_pre.items()), n_out=int(round(sum(miss_pre.values()))),
                miss_off_open=sum(val[p] for p in miss_open), n_out_open=len(miss_open))
            rosters[(r.game_id, r.side)] = {int(p): [names.get(p, ""), round(val[p], 4), int(p in miss_open)] for p in regs}
            hist = full
            if cur is not None:
                hist.append((r.date, cur, starters.get((r.game_id, team))))
            prev_date = r.date
    for side in ("home", "away"):
        for c in ("goalie", "gmix", "miss_off", "n_out", "miss_off_open", "n_out_open"):
            games[f"{side}_{c}"] = [feats[(i, side)][c] for i in games.game_id]
    return games, rosters

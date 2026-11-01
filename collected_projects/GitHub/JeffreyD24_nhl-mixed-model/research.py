"""
Research database: records market data that can't be recovered later.

Everything lands in research/ as append-only CSVs, keyed by game_id. See research/DATA_DICTIONARY.md.
Called at the end of every alert check; any failure here is caught and never blocks alerts.
"""
import os, json, hashlib
import numpy as np, pandas as pd
import espn
import nhl_data as nd

R = None  # set by init()


def init(workdir):
    global R
    R = os.path.join(workdir, "research"); os.makedirs(os.path.join(R, "odds"), exist_ok=True)
    os.makedirs(os.path.join(R, "model"), exist_ok=True)


def _append_changed(path, rows, key_cols, value_cols):
    """append only rows whose values differ from the last recorded row for the same key"""
    if not rows: return 0
    new = pd.DataFrame(rows)
    if os.path.exists(path):
        old = pd.read_csv(path)
        last = old.groupby(key_cols).tail(1).set_index(key_cols)[value_cols] if len(old) else None
    else:
        old, last = None, None
    keep = []
    for r in new.itertuples(index=False):
        rd = r._asdict(); k = tuple(rd[c] for c in key_cols)
        k = k if len(k) > 1 else k[0]
        if last is not None and k in last.index:
            prev = last.loc[k]
            same = all((pd.isna(prev[c]) and pd.isna(rd[c])) or (not pd.isna(prev[c]) and not pd.isna(rd[c]) and str(prev[c]) == str(rd[c]))
                       for c in value_cols)
            if same: continue
        keep.append(rd)
    if keep:
        out = pd.DataFrame(keep)
        out.to_csv(path, mode="a", header=not os.path.exists(path), index=False)
    return len(keep)


def _num(x):
    try: return float(str(x).replace("+", "").replace("PK", "0").replace("pk", "0").replace("EVEN", "100"))
    except Exception: return np.nan


def odds_snapshot(now, day, games):
    """full DraftKings market for each game: moneyline, puck line, total, prices, opening values"""
    L = espn.lines([day], when=("open", "current"))
    ids = {(g["home"], g["away"]): g["game_id"] for g in games}
    rows = []
    for r in L.to_dict("records"):
        gid = ids.get((r.get("home"), r.get("away")))
        if gid is None or r.get("state") not in (None, "pre") or pd.isna(r.get("current_home_ml", np.nan)): continue
        rec = dict(seen_at_et=str(now)[:16], game_id=gid, date=str(pd.Timestamp(day).date()), book=r.get("book"))
        for k in espn.MARKET_COLS: rec[k] = r.get(f"current_{k}")
        for k in espn.MARKET_COLS: rec[f"open_{k}"] = r.get(f"open_{k}")
        rec["espn_event_id"] = r.get("espn_event_id")
        rows.append(rec)
    path = os.path.join(R, "odds", f"{pd.Timestamp(day).date()}.csv")
    return _append_changed(path, rows, ["game_id"], list(espn.MARKET_COLS)), rows


def goalie_snapshot(now, day, games):
    """ESPN's probable starting goalies and their status (Expected -> Confirmed), whenever they change"""
    ids = {(g["home"], g["away"]): g["game_id"] for g in games}
    rows = []
    for r in nd.scoreboard(day):
        gid = ids.get((r["home"], r["away"]))
        if gid is None or r.get("state") != "pre": continue
        for side in ("home", "away"):
            p = r["probables"].get(side)
            rows.append(dict(seen_at_et=str(now)[:16], game_id=gid, date=str(pd.Timestamp(day).date()), side=side,
                             team=r[side], goalie_id=p[0] if p else None, goalie=p[1] if p else None, status=p[2] if p else None))
    return _append_changed(os.path.join(R, "goalies.csv"), rows, ["game_id", "side"], ["goalie_id", "status"])


def predictor_snapshot(now, day, odds_rows):
    """ESPN's matchup predictor (home win %), at most once an hour per game"""
    path = os.path.join(R, "espn_predictor.csv")
    old = pd.read_csv(path) if os.path.exists(path) else pd.DataFrame(columns=["game_id", "seen_at_et"])
    rows = []
    for r in odds_rows:
        prev = old[old.game_id == r["game_id"]]
        if len(prev) and now - pd.Timestamp(prev.seen_at_et.iloc[-1]) < pd.Timedelta(minutes=55): continue
        try:
            s = espn._get(f"https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event={r['espn_event_id']}")
            p = s.get("predictor") or {}
            rows.append(dict(seen_at_et=str(now)[:16], game_id=r["game_id"], date=r["date"],
                             home_win_pct=_num((p.get("homeTeam") or {}).get("gameProjection")),
                             away_win_pct=_num((p.get("awayTeam") or {}).get("gameProjection"))))
        except Exception:
            pass
    if rows: pd.DataFrame(rows).to_csv(path, mode="a", header=not os.path.exists(path), index=False)
    return len(rows)


def news_log(now, news):
    """every injury note, kept with the time it was first seen (ESPN's feed only keeps the latest per player)"""
    path = os.path.join(R, "news.csv")
    seen = set(pd.read_csv(path).note_id) if os.path.exists(path) else set()
    rows = []
    for team, items in (news or {}).items():
        for when, text in items:
            nid = hashlib.md5(f"{team}|{text}".encode()).hexdigest()[:12]
            if nid in seen: continue
            seen.add(nid)
            rows.append(dict(first_seen_et=str(now)[:16], posted_et=str(when.replace(tzinfo=None))[:16], team=team, note=text, note_id=nid))
    if rows: pd.DataFrame(rows).to_csv(path, mode="a", header=not os.path.exists(path), index=False)
    return len(rows)


def model_snapshot(now, model_rows):
    """every model's number for each game whenever it changes"""
    for r in model_rows: r.setdefault("model", "goals")
    for f in os.listdir(os.path.join(R, "model")):          # files from before there were several models
        p = os.path.join(R, "model", f)
        old = pd.read_csv(p)
        if "model" not in old: old.insert(1, "model", "goals"); old.to_csv(p, index=False)
    by_day = {}
    for r in model_rows: by_day.setdefault(r["date"], []).append(r)
    n = 0
    for day, rows in by_day.items():
        n += _append_changed(os.path.join(R, "model", f"{day}.csv"), rows, ["game_id", "model"], ["model_home_win", "model_total", "away_goalie", "home_goalie", "missing"])
    return n


# ---------------- Action Network: public betting splits and lines at several books ----------------
AN_BOOKS = nd.AN_BOOKS


def _an_get(url):
    return nd.get(url)


def splits_snapshot(now, day, games):
    """% of bets (tickets) and % of money on each side, plus every book's line and prices.
    Returns (split rows written, book rows written)."""
    ids = {(g["home"], g["away"]): g["game_id"] for g in games}
    d = _an_get(f"https://api.actionnetwork.com/web/v2/scoreboard/nhl?bookIds={','.join(map(str, AN_BOOKS))}"
                f"&date={pd.Timestamp(day):%Y%m%d}")
    splits, books = [], []
    for g in d.get("games", []):
        t = {x["id"]: (nd.FULL.get(x.get("full_name")) or nd.code(x.get("abbr"))) for x in g.get("teams", [])}
        home, away = t.get(g["home_team_id"]), t.get(g["away_team_id"])
        gid = ids.get((home, away))
        if gid is None or g.get("status") not in ("scheduled", None): continue
        base = dict(seen_at_et=str(now)[:16], game_id=gid, date=str(pd.Timestamp(day).date()), away=away, home=home)
        for bid, m in (g.get("markets") or {}).items():
            ev = (m or {}).get("event") or {}
            pick = lambda mk, side: next((o for o in ev.get(mk, []) if o.get("side") == side), {}) or {}
            hs, as_, ov, un = pick("spread", "home"), pick("spread", "away"), pick("total", "over"), pick("total", "under")
            hm, am = pick("moneyline", "home"), pick("moneyline", "away")
            tot = _num(ov.get("value"))
            if not np.isnan(tot) and not (3.5 <= tot <= 9.5): tot = np.nan          # period/team totals
            books.append(dict(base, book=AN_BOOKS.get(int(bid), bid), home_pl=_num(hs.get("value")),
                              home_pl_odds=_num(hs.get("odds")), away_pl_odds=_num(as_.get("odds")),
                              total=tot, over_odds=_num(ov.get("odds")) if not np.isnan(tot) else np.nan,
                              under_odds=_num(un.get("odds")) if not np.isnan(tot) else np.nan,
                              home_ml=_num(hm.get("odds")), away_ml=_num(am.get("odds"))))
            if int(bid) == 15:
                bi = lambda o, k: _num(((o.get("bet_info") or {}).get(k) or {}).get("percent"))
                splits.append(dict(base, num_bets=g.get("num_bets"),
                                   consensus_home_pl=_num(hs.get("value")),
                                   pl_home_bets_pct=bi(hs, "tickets"), pl_home_money_pct=bi(hs, "money"),
                                   consensus_total=tot, over_bets_pct=bi(ov, "tickets"), over_money_pct=bi(ov, "money"),
                                   home_ml_bets_pct=bi(hm, "tickets"), home_ml_money_pct=bi(hm, "money")))
    os.makedirs(os.path.join(R, "splits"), exist_ok=True); os.makedirs(os.path.join(R, "books"), exist_ok=True)
    dd = pd.Timestamp(day).date()
    n1 = _append_changed(os.path.join(R, "splits", f"{dd}.csv"), splits, ["game_id"],
                         ["pl_home_bets_pct", "pl_home_money_pct", "over_bets_pct", "over_money_pct",
                          "home_ml_bets_pct", "home_ml_money_pct", "consensus_home_pl", "consensus_total"])
    n2 = _append_changed(os.path.join(R, "books", f"{dd}.csv"), books, ["game_id", "book"],
                         ["home_pl", "home_pl_odds", "away_pl_odds", "total", "over_odds", "under_odds",
                          "home_ml", "away_ml"])
    return n1, n2


# ---------------- complete line histories (every price change at every book, with exact times) ----------------
HIST_BOOKS = (15, 30, 68, 69, 71, 75, 79, 123, 2988)


def line_moves(day, ids):
    """Every recorded change to the moneyline, puck line and total at each book for the games on `day`, from Action
    Network's line history (kept only about a day after the game, so the tracker saves it daily).
    ids: {(home, away): (game_id, puck drop ET)}. Writes research/line_moves/YYYY-MM-DD.csv; returns rows added.
    pre_game = 1 for changes before puck drop (the rest are in-game prices some books keep in the same history)."""
    from zoneinfo import ZoneInfo
    sb = _an_get(f"https://api.actionnetwork.com/web/v2/scoreboard/nhl?bookIds=68&date={pd.Timestamp(day):%Y%m%d}")
    rows = []
    for g in sb.get("games", []):
        t = {x["id"]: (nd.FULL.get(x.get("full_name")) or nd.code(x.get("abbr"))) for x in g.get("teams", [])}
        home, away = t.get(g["home_team_id"]), t.get(g["away_team_id"])
        gid = ids.get((home, away))
        if gid is None: continue
        gid, tip = gid if isinstance(gid, tuple) else (gid, None)
        try:
            h = _an_get(f"https://api.actionnetwork.com/web/v2/markets/event/{g['id']}/history?bookIds={','.join(map(str, HIST_BOOKS))}")
        except Exception:
            continue
        for bid, m in (h or {}).items():
            ev = (m or {}).get("event") or {}
            for mk, name in (("moneyline", "moneyline"), ("spread", "puck line"), ("total", "total")):
                for o in ev.get(mk, []):
                    for x in (o.get("history") or []) + [dict(odds=o.get("odds"), value=o.get("value"), updated_at=None, line_status=o.get("line_status"))]:
                        when = pd.to_datetime(x.get("updated_at"), utc=True, errors="coerce")
                        rows.append(dict(game_id=gid, date=str(pd.Timestamp(day).date()), away=away, home=home,
                                         book=AN_BOOKS.get(int(bid), bid), market=name, side=o.get("side"),
                                         line=_num(x.get("value")) if name != "moneyline" else np.nan, price=_num(x.get("odds")),
                                         changed_at_et=str(when.tz_convert(ZoneInfo("America/New_York")).tz_localize(None))[:19] if when is not pd.NaT else "",
                                         status=x.get("line_status"), puck_drop_et=str(tip)[:16] if tip is not None else "",
                                         an_game_id=g["id"]))
    if not rows: return 0
    new = pd.DataFrame(rows)
    new = new[~((new.changed_at_et == "") & new.duplicated(["game_id", "book", "market", "side", "line", "price"], keep=False))]
    new = new[new.changed_at_et != ""] if (new.changed_at_et != "").any() else new
    if new.market.eq("total").any():
        tl = new.market == "total"
        new = new[~tl | new.line.between(3.5, 9.5)]                               # drop period/team totals
    os.makedirs(os.path.join(R, "line_moves"), exist_ok=True)
    path = os.path.join(R, "line_moves", f"{pd.Timestamp(day).date()}.csv")
    old = pd.read_csv(path) if os.path.exists(path) else pd.DataFrame(columns=new.columns)
    key = ["game_id", "book", "market", "side", "line", "price", "changed_at_et"]
    allr = pd.concat([old, new], ignore_index=True)
    allr["line"] = pd.to_numeric(allr.line, errors="coerce")
    allr = allr.drop_duplicates(key).sort_values(["game_id", "book", "market", "side", "changed_at_et"])
    t = pd.to_datetime(allr.changed_at_et, errors="coerce"); tp = pd.to_datetime(allr.puck_drop_et, errors="coerce")
    allr["pre_game"] = np.where(tp.isna() | t.isna(), np.nan, (t < tp).astype(float))
    allr.to_csv(path, index=False)
    return len(allr) - len(old)

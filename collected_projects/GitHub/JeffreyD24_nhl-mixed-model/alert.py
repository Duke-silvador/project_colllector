"""
Intraday line check. Runs every 5 minutes (see alert_loop.sh).

  python alert.py WORKDIR [--force] [--test]

Uses state/model_YYYY-MM-DD.json from the last tracker run (no refitting). Each check: pulls ESPN's probable/confirmed
starting goalies and injury list, re-predicts today's and tomorrow's games, pulls the current DraftKings prices from ESPN,
and sends one ntfy push per game and market when the model's expected value at the current price is >= THRESHOLD.
Every alert is logged to state/alerts.csv and graded by the next morning run.
"""
import os, sys, json, urllib.request, urllib.parse, datetime as dt
from zoneinfo import ZoneInfo
import numpy as np, pandas as pd

W = os.path.abspath(sys.argv[1]); FORCE = "--force" in sys.argv
sys.path.insert(0, W)
import nhl_data as nd                                    # noqa: E402
import nhl_mixed_model as nm                             # noqa: E402
import espn                                              # noqa: E402

THRESHOLD = 0.06                    # expected value needed while the price is at (or within 1.5 win-% points of) its opening price
THRESHOLD_MOVED = 0.09              # needed once the price has moved more than that: in the backtests the edge mostly disappears
REMIND_AFTER_MIN = 30              # reminder if an alert's bet still isn't logged this many minutes later (once, before puck drop)
NEAR_OPEN = 0.015                   #   as prices move toward the close (shot model +9% ROI at open, +2% halfway, -2% at close)
OPEN_ONLY_LONGSHOTS = {"goals": 150}  # model -> bets priced at this or longer (+150) are alerted ONLY at/near the opening price
                                     #   (within NEAR_OPEN), labeled "OPENING PRICE ONLY" with the shortest price still worth taking.
                                     #   The goals model's underdog win chances run ~5 points high: its +150-and-longer bets made
                                     #   +13.5u on 641 bets at the open but lost once the price moved (backtests/IDEA_TESTS.md).
                                     #   The shot model's long shots are calibrated, so they get normal alerts. Scorecard unchanged.
ALERT_MARKETS = ("moneyline", "puck line")   # add "total" to alert on totals too (they lost money in the backtests)
MAX_MOVE = 5.0                      # caution when the home win chance implied by the moneyline moved this many points AGAINST the bet since open
JUMP_WINDOW_MIN = 60                # a "jump" is a move within this many minutes
JUMP_LOG_PROB = 3.0                 # log moneyline moves of at least this many win-probability points (and any change in the total)
JUMP_ALERT_PROB = 5.0               # send a "Line jump" notification at this size (and for totals moving a full goal)
P_MISS = {"Out": 1.0, "Injured Reserve": 1.0, "Long Term Injured Reserve": 1.0, "Suspension": 1.0, "Suspended": 1.0, "Day-To-Day": 0.5}
SHORT = {"xg": "Shot model", "goals": "Goals model"}
WINDOW = None                       # None = check all day; or (16, 0, 19, 0) for 4:00-7:00 PM ET
ET = ZoneInfo("America/New_York")
STATE = os.path.join(W, "state")
NOW = pd.Timestamp(dt.datetime.now(ET).replace(tzinfo=None))
TODAY = NOW.normalize()


def in_window():
    if WINDOW is None: return True
    start = TODAY + pd.Timedelta(hours=WINDOW[0], minutes=WINDOW[1]); end = TODAY + pd.Timedelta(hours=WINDOW[2], minutes=WINDOW[3])
    return start <= NOW < end


def fair(a, b):
    if pd.isna(a) or pd.isna(b): return np.nan
    ia, ib = 1 / espn.nd_dec(a), 1 / espn.nd_dec(b); return ia / (ia + ib)


def log_link(date, away, home, market, pick, line, odds):
    repo = os.environ.get("GITHUB_REPOSITORY", "JeffreyD24/nhl-mixed-model")
    desc = f"{pick.upper()} {'ML' if market == 'moneyline' else line}"
    q = dict(template="log-bet.yml", title=f"Bet: {desc} {away.upper()} @ {home.upper()} {date}", game_date=date, away=away.upper(),
             home=home.upper(), market=market, pick=pick.upper() if market != "total" else pick, line=line, odds=odds)
    return f"https://github.com/{repo}/issues/new?" + urllib.parse.urlencode(q)


def notify(title, body, priority="high", tags="ice_hockey", link=None, dk=None):
    topic = os.environ.get("NTFY_TOPIC")
    if not topic:
        print("NTFY_TOPIC not set; would have sent:", title, "|", body); return False
    req = urllib.request.Request(f"https://ntfy.sh/{topic}", data=body.encode("utf-8"), method="POST",
                                 headers={"Title": title.encode("ascii", "ignore").decode(), "Priority": priority, "Tags": tags,
                                          **({"Actions": "; ".join(a for a in (f"view, Bet on DraftKings, {dk}" if dk else "",
                                                                               f"view, Log this bet, {link}" if link else "") if a)}
                                             if (link or dk) else {})})
    urllib.request.urlopen(req, timeout=20)
    return True


def load_models(path):
    """model file for one day; older single-model files are wrapped as the goals model"""
    M = json.load(open(path))
    if "models" not in M:
        M = dict(date=M["date"], made_at_et=M.get("made_at_et", ""), active="goals", models={"goals": M})
    return M


def fill_from_action_network(L, day):
    """ESPN can trail DraftKings by a few minutes when a line first posts. For games where ESPN has no DraftKings price
    yet, use DraftKings' price from Action Network (as both the current and the opening price: it has just opened)."""
    try:
        A = pd.DataFrame(nd.an_lines(day, books=(68,)))
    except Exception:
        return L
    if not len(A) or not len(L): return L
    A = A[A.book_id == 68].set_index(["home", "away"])
    L = L.copy()
    for i, r in L.iterrows():
        if not pd.isna(r.get("current_home_ml", np.nan)) or (r.home, r.away) not in A.index: continue
        a = A.loc[(r.home, r.away)]
        a = a.iloc[0] if isinstance(a, pd.DataFrame) else a
        if pd.isna(a.home_ml): continue
        for k in espn.MARKET_COLS:
            L.at[i, f"current_{k}"] = a[k]; L.at[i, f"open_{k}"] = a[k]
        L.at[i, "book"] = "DraftKings (via Action Network)"
        print(f"Using Action Network's new DraftKings line for {r.away} @ {r.home} (not on ESPN yet).")
    return L


def threshold_for(price, oprice):
    """EV bar for a bet: THRESHOLD near the opening price, THRESHOLD_MOVED once it has moved (or the line number changed)"""
    if pd.isna(oprice) or pd.isna(price): return THRESHOLD_MOVED
    return THRESHOLD if abs(1 / espn.nd_dec(price) - 1 / espn.nd_dec(oprice)) <= NEAR_OPEN else THRESHOLD_MOVED


def fmt_price(o): return "" if pd.isna(o) else f"{o:+.0f}"


def near_open(price, oprice):
    return not (pd.isna(oprice) or pd.isna(price)) and abs(1 / espn.nd_dec(price) - 1 / espn.nd_dec(oprice)) <= NEAR_OPEN


def american(d):
    return (d - 1) * 100 if d >= 2 else -100 / (d - 1)


def open_only_floor(p, oprice):
    """shortest price still worth taking on an opening-price-only bet: still near the opening price AND still EV >= THRESHOLD"""
    d_near = 1 / (1 / espn.nd_dec(oprice) + NEAR_OPEN)
    d_ev = (1 + THRESHOLD) / p
    return american(max(d_near, d_ev))


def is_open_only(name, price):
    return name in OPEN_ONLY_LONGSHOTS and not pd.isna(price) and price >= OPEN_ONLY_LONGSHOTS[name]


def main():
    if "--test" in sys.argv:
        topic = os.environ.get("NTFY_TOPIC") or ""
        try:
            ok = notify("Test alert: NHL tracker connected", "If you can read this, phone alerts from your NHL GitHub tracker are working. No bet here.")
            msg = (f"sent OK to a topic {len(topic)} characters long, starting with '{topic[:2]}'" if ok
                   else "NOT sent: the NTFY_TOPIC secret is missing or empty")
        except Exception as e:
            msg = f"NOT sent: ntfy returned an error ({type(e).__name__}: {str(e)[:80]})"
        open(os.path.join(STATE, "test_alert_result.txt"), "w").write(f"{NOW}: test alert {msg}\n")
        print("Test alert", msg); return
    if not FORCE and not in_window():
        print(f"{NOW:%H:%M} ET is outside the alert window; nothing to do."); return
    models = sorted(f for f in os.listdir(STATE) if f.startswith("model_") and f[6:16] >= str(TODAY.date()))
    if not models: print("No model saved for today or tomorrow yet."); return
    try:
        FEED = espn.injury_feed()
    except Exception as e:
        FEED = None; print("Injury feed unavailable:", type(e).__name__)
    NEWS = espn.injury_news(hours=24, feed=FEED) if FEED is not None else None
    status_of = {}
    for team, items in (FEED or {}).items():
        for pid, name, st, _, _ in items:
            if pid: status_of[pid] = st

    apath = os.path.join(STATE, "alerts.csv")
    A = pd.read_csv(apath) if os.path.exists(apath) else pd.DataFrame(columns=["game_id", "market", "skipped", "model"])
    if "model" not in A: A["model"] = "goals"                 # alerts from before both models ran
    A["model"] = A.model.fillna("goals")
    if len(A) and "sent" in A:          # an alert that couldn't be delivered (e.g. no ntfy topic yet) is tried again next check
        A = A[A.sent.astype(str) == "True"].reset_index(drop=True)
    done = set(zip(A[A.skipped.isna()].game_id, A[A.skipped.isna()].market, A[A.skipped.isna()].model)) if len(A) else set()
    skipped = set(zip(A[A.skipped.notna()].game_id, A[A.skipped.notna()].market, A[A.skipped.notna()].model)) if len(A) else set()
    bpath = os.path.join(STATE, "my_bets.csv")
    try:
        MYB = pd.read_csv(bpath) if os.path.exists(bpath) else pd.DataFrame(columns=["date", "home", "away", "market"])
    except Exception:
        MYB = pd.DataFrame(columns=["date", "home", "away", "market"])

    def bets_note(date, home, away, market, want=None):
        """('same market' text, 'other markets' text) for bets already logged on this game (ported from the NBA tracker)"""
        if not len(MYB): return "", ""
        x = MYB[(MYB.date.astype(str) == str(date)) & (MYB.home.astype(str).str.lower() == home) & (MYB.away.astype(str).str.lower() == away)]
        def desc(r):
            try:
                pick = str(r.pick).upper(); mk_ = str(r.market)
                ln_ = "" if mk_ == "moneyline" or pd.isna(r.line) else (f" {float(r.line):+g}" if mk_ == "puck line" else f" {float(r.line):g}")
                st = float(r.stake); stake = f"${st:.0f}" if st == int(st) else f"${st:.2f}"
                when = pd.Timestamp(r.logged_at_et).strftime("%-I:%M %p") if isinstance(r.logged_at_et, str) else "earlier"
                book = f", {r.book}" if isinstance(r.book, str) and r.book else ""
                return f"{pick}{' ML' if mk_ == 'moneyline' else ''}{ln_} ({float(r.odds):+g}, {stake}{book}, logged {when})"
            except Exception:
                return "a bet (see My Bets)"
        sm = x[x.market == market]
        if want is not None:            # bets on the same market but the OTHER side are reported separately
            opp = sm[sm.pick.astype(str).str.lower() != str(want).lower()]
            sm = sm[sm.pick.astype(str).str.lower() == str(want).lower()]
        else:
            opp = sm.iloc[:0]
        return ("; ".join(desc(r) for r in sm.itertuples()),
                "; ".join(desc(r) for r in x[x.market != market].itertuples()) +
                (("; " if (x.market != market).any() else "") + "OTHER SIDE: " + "; ".join(desc(r) for r in opp.itertuples()) if len(opp) else ""))

    def caution_before(gid, market, names):
        """the latest caution alert sent earlier for this game, market and any of these models"""
        c = A[(A.game_id == gid) & (A.market == market) & A.skipped.notna() & A.model.isin(names)] if len(A) else A.iloc[:0]
        return c.iloc[-1] if len(c) else None

    def record(name, caution):
        g = A[(A.model == name) & (A.skipped.notna() if caution else A.skipped.isna())]
        g = g[g.result.isin(["W", "L"])] if "result" in g else g.iloc[:0]
        return (f"{int((g.result == 'W').sum())}-{int((g.result == 'L').sum())}, {g.profit.sum():+.1f}u" if len(g) else "none graded yet")
    new, n_games, model_rows = [], 0, []
    hpath = os.path.join(STATE, "line_history.csv")
    H_ = pd.read_csv(hpath) if os.path.exists(hpath) else pd.DataFrame(columns=["game_id", "market", "seen_at_et", "line", "prices", "prob"])
    hist_new = []

    def record_line(gid, market, line, prices, prob):
        """log the line whenever it or its prices change (or the first time it is seen), with the time we saw it"""
        if pd.isna(prob): return
        prev = [r for r in hist_new if r["game_id"] == gid and r["market"] == market]
        old = H_[(H_.game_id == gid) & (H_.market == market)]
        last = (prev[-1]["line"], prev[-1]["prices"]) if prev else ((old.line.iloc[-1], old.prices.iloc[-1]) if len(old) else None)
        if last is None or str(last[0]) != str(line) or str(last[1]) != str(prices):
            hist_new.append(dict(game_id=gid, market=market, seen_at_et=str(NOW)[:16], line=line, prices=prices, prob=round(prob, 1)))

    def history_text(gid, market):
        rows = pd.concat([H_[(H_.game_id == gid) & (H_.market == market)],
                          pd.DataFrame([r for r in hist_new if r["game_id"] == gid and r["market"] == market])], ignore_index=True)
        if not len(rows): return ""
        lab = (lambda r: f"{r.prices}") if market == "moneyline" else (lambda r: f"{r.line:g} {r.prices}")
        steps = [f"{lab(r)} ({'first seen ' if i == 0 else ''}{pd.Timestamp(r.seen_at_et):%a %-I:%M %p})" for i, r in enumerate(rows.itertuples())]
        if len(steps) > 5: steps = steps[:1] + ["…"] + steps[-3:]
        return f"\n{'Moneyline' if market == 'moneyline' else 'Total'} history: " + " -> ".join(steps)

    news_for = lambda g: ("\n" + espn.news_text(NEWS, [g["away"], g["home"]])) if NEWS is not None else ""
    mpath = os.path.join(STATE, "market_moves.csv")
    MV = pd.read_csv(mpath) if os.path.exists(mpath) else pd.DataFrame(columns=["game_id", "market"])
    moved_done = set(zip(MV.game_id, MV.market)); moves_new = []
    info = {}
    NOWC, GINFO = {}, {}   # this check's price and EV for every (game, market, side, model), and game details, for reminders

    for mf in models:
        Mall = load_models(os.path.join(STATE, mf))
        order = [k for k in ("xg", "goals") if k in Mall["models"]] + [k for k in Mall["models"] if k not in ("xg", "goals")]
        lead = order[0]
        M = dict(Mall["models"][lead], date=Mall["date"], made_at_et=Mall["made_at_et"])
        day = pd.Timestamp(M["date"])
        gname = {int(k): v for k, v in M.get("goalie_names", {}).items()}
        try:
            SB = {(r["home"], r["away"]): r for r in nd.scoreboard(day)}
        except Exception as e:
            SB = {}; print("Scoreboard unavailable:", type(e).__name__)
        L = espn.lines([day], when=("open", "current"))
        L = fill_from_action_network(L, day)
        for g in M["games"]:
            info[g["game_id"]] = (g, M)
            line = L[(L.home == g["home"]) & (L.away == g["away"])] if len(L) else L
            if not len(line) or line.iloc[0].get("state") not in (None, "pre"): continue
            n_games += 1
            ln = line.iloc[0]
            pr = SB.get((g["home"], g["away"]), {}).get("probables", {})

            def goalie(def_side, gv):
                """(effect, label, confirmed, known) for the goalie facing the other team, using one model's goalie effects"""
                p = pr.get(def_side)
                if p:
                    pid, name, st = p
                    return gv.get(int(pid), 0.0), f"{name} ({(st or 'listed').lower()})", st == "Confirmed", True
                mix = {int(k): w for k, w in g[f"{def_side}_gmix"].items()}
                top = max(mix.items(), key=lambda x: x[1]) if mix else (None, 0)
                return (sum(w * gv.get(k, 0.0) for k, w in mix.items()),
                        f"{gname.get(top[0], 'unknown')} ({top[1]:.0%} likely, not announced)" if top[0] else "unknown", False, False)

            def missing(side):
                tot, out = 0.0, []
                for pid, (name, val, missed_last) in g[f"{side}_regulars"].items():
                    st = status_of.get(int(pid)) if FEED is not None else None
                    pm = P_MISS.get(st, 0.0) if st else (1.0 if missed_last else 0.0)
                    if pm > 0: tot += pm * val; out.append(name.split()[-1] + ("" if pm == 1 else "?"))
                return tot, out
            _, gh_lab, gh_conf, gh_known = goalie("home", {}); _, ga_lab, ga_conf, ga_known = goalie("away", {})
            mh, outs_h = missing("home"); ma, outs_a = missing("away")
            goalies_txt = f"{g['away'].upper()} {ga_lab}; {g['home'].upper()} {gh_lab}"
            missing_txt = f"{g['away'].upper()}: {', '.join(outs_a) or '-'} | {g['home'].upper()}: {', '.join(outs_h) or '-'}"
            c, o = {k: ln.get(f"current_{k}") for k in espn.MARKET_COLS}, {k: ln.get(f"open_{k}") for k in espn.MARKET_COLS}
            ph_now, ph_open = fair(c["home_ml"], c["away_ml"]), fair(o["home_ml"], o["away_ml"])
            record_line(g["game_id"], "moneyline", c["home_ml"], f"{g['away'].upper()} {fmt_price(c['away_ml'])} / {g['home'].upper()} {fmt_price(c['home_ml'])}", 100 * ph_now)
            record_line(g["game_id"], "puck line", c["home_pl"], f"{g['home'].upper()} {c['home_pl']:+g} {fmt_price(c['home_pl_odds'])} / {g['away'].upper()} {fmt_price(c['away_pl_odds'])}" if not pd.isna(c["home_pl"]) else "",
                        100 * fair(c["home_pl_odds"], c["away_pl_odds"]))
            record_line(g["game_id"], "total", c["total"], f"o{fmt_price(c['over_odds'])}/u{fmt_price(c['under_odds'])}", 100 * fair(c["over_odds"], c["under_odds"]))
            tip = pd.Timestamp(g["tip_et"]).strftime("%a %-I:%M %p")
            H, Aw = g["home"].upper(), g["away"].upper()
            move = 100 * (ph_now - ph_open) if not (pd.isna(ph_now) or pd.isna(ph_open)) else 0.0
            # ---- every model's numbers and best bet per market at the current prices
            best, est = {}, {}
            for name in order:
                OM = Mall["models"][name]
                og = next((x for x in OM["games"] if x["game_id"] == g["game_id"]), None)
                if og is None: continue
                gv = {int(k): v for k, v in OM["goalies"].items()}
                lam_h = og["base_home"] + OM["c_miss"] * mh + goalie("away", gv)[0]
                lam_a = og["base_away"] + OM["c_miss"] * ma + goalie("home", gv)[0]
                cal = OM["cal"]["pretip" if (gh_known and ga_known) else "open"]
                mp = nm.market_probs(np.array([lam_h]), np.array([lam_a]), OM["h_ot"], cal)
                p_home, p_hby2, p_aby2 = float(mp["home_win"][0]), float(mp["home_by2"][0]), float(mp["away_by2"][0])
                exp_total = float(lam_h + lam_a + nm.raw_probs(np.array([lam_h]), np.array([lam_a]), OM["h_ot"])["tie"][0])
                est[name] = (lam_h, lam_a, exp_total, p_home)
                model_rows.append(dict(seen_at_et=str(NOW)[:16], model=name, game_id=g["game_id"], date=M["date"], away=g["away"], home=g["home"],
                                       model_home_win=round(p_home, 4), lam_home=round(lam_h, 3), lam_away=round(lam_a, 3),
                                       model_total=round(exp_total, 2), away_goalie=ga_lab, home_goalie=gh_lab, missing=missing_txt))
                cands = []
                if not pd.isna(c["home_ml"]):
                    for side, p, price in (("home", p_home, c["home_ml"]), ("away", 1 - p_home, c["away_ml"])):
                        cands.append(("moneyline", side, np.nan, price, p, o[f"{side}_ml"]))
                if not pd.isna(c["home_pl"]):
                    hl = c["home_pl"]; p_hc = p_hby2 if hl < 0 else 1 - p_aby2
                    cands += [("puck line", "home", hl, c["home_pl_odds"], p_hc, o["home_pl_odds"] if o["home_pl"] == hl else np.nan),
                              ("puck line", "away", -hl, c["away_pl_odds"], 1 - p_hc, o["away_pl_odds"] if o["home_pl"] == hl else np.nan)]
                if not pd.isna(c["total"]):
                    po, pu, pp = nm.over_prob(np.array([lam_h]), np.array([lam_a]), np.array([c["total"]]), OM["h_ot"], cal)
                    same = o["total"] == c["total"]
                    cands += [("total", "over", c["total"], c["over_odds"], float(po[0]), o["over_odds"] if same else np.nan),
                              ("total", "under", c["total"], c["under_odds"], float(pu[0]), o["under_odds"] if same else np.nan)]
                for mk, side, lnum, price, p, oprice in cands:
                    if pd.isna(price): continue
                    ev = p * espn.nd_dec(price) - 1
                    NOWC[(g["game_id"], mk, side, name)] = (lnum, price, p, ev, oprice)
                    if (name, mk) not in best or ev > best[(name, mk)][4]: best[(name, mk)] = (side, lnum, price, p, ev, oprice)
            GINFO[g["game_id"]] = dict(H=H, Aw=Aw, tip=tip, tip_et=g["tip_et"], goalies=goalies_txt, conf=gh_conf and ga_conf)
            # ---- alerts: one per side; both models in one alert when they agree
            for mk in ALERT_MARKETS:
                hist_txt = history_text(g["game_id"], "total" if mk == "total" else "moneyline")
                groups = {}
                for name in order:
                    bt = best.get((name, mk))
                    if bt is None: continue
                    if name in OPEN_ONLY_LONGSHOTS and bt[2] >= OPEN_ONLY_LONGSHOTS[name] and not near_open(bt[2], bt[5]): continue
                    thr = threshold_for(bt[2], bt[5])
                    if bt[4] < thr:
                        side = bt[0]
                        toward = mk != "total" and abs(move) >= MAX_MOVE and ((move > 0) == (side == "home"))
                        if name == lead and toward and (g["game_id"], mk) not in moved_done:
                            team = H if side == "home" else Aw
                            notify(f"Market agrees: {Aw} @ {H} {mk}, {tip}",
                                   f"The moneyline moved {abs(move):.1f} win-% points toward the {SHORT.get(name, name)}'s side ({team}) since open. "
                                   f"EV left: {bt[4]:+.1%} (under {thr:.0%}, so no bet). Info only." + hist_txt + news_for(g),
                                   priority="low", tags="chart_with_upwards_trend")
                            moves_new.append(dict(at_et=str(NOW), game_id=g["game_id"], date=M["date"], home=g["home"], away=g["away"], market=mk,
                                                  model=name, model_side=side, open_home_prob=round(100 * ph_open, 1), home_prob=round(100 * ph_now, 1),
                                                  move=round(move, 1), model_home_prob=round(100 * est[name][3], 1), ev_left=round(bt[4], 4)))
                            moved_done.add((g["game_id"], mk))
                        continue
                    groups.setdefault((bt[0], bt[1], bt[2]), []).append((name, bt))
                for (side, lnum, price), members in groups.items():
                    oprice = members[0][1][5]
                    team = H if side == "home" else (Aw if side == "away" else side.upper())
                    against = mk != "total" and abs(move) >= MAX_MOVE and ((move > 0) != (side == "home"))
                    toward = mk != "total" and abs(move) >= MAX_MOVE and ((move > 0) == (side == "home"))
                    skip = None
                    if not (gh_conf and ga_conf): skip = "starting goalies not both confirmed yet"
                    elif against: skip = f"the moneyline moved {abs(move):.1f} win-% points against this side since open"
                    pending = [(n, bt) for n, bt in members if (g["game_id"], mk, n) not in (skipped if skip else done)]
                    if not pending: continue
                    tag = "Both models" if len(pending) > 1 else SHORT.get(pending[0][0], pending[0][0])
                    what = (f"{team} ML {fmt_price(price)}" if mk == "moneyline" else
                            (f"{team} {lnum:+g} ({fmt_price(price)})" if mk == "puck line" else f"{side.upper()} {lnum:g} ({fmt_price(price)})"))
                    title = f"[{tag}] Bet {what}: {Aw} @ {H}, {tip}"
                    oo = [(n, bt) for n, bt in pending if is_open_only(n, price)]
                    if oo and len(oo) == len(pending):
                        title = "OPENING PRICE ONLY - " + title
                    lines_ = []
                    for n, bt in pending:
                        p, ev = bt[3], bt[4]
                        s_ = f"{SHORT.get(n, n)}: {p:.1%} to win (needs {1 / espn.nd_dec(price):.1%}), EV {ev:+.1%}"
                        if not pd.isna(oprice) and oprice != price: s_ += f" (EV at the opening {fmt_price(oprice)}: {p * espn.nd_dec(oprice) - 1:+.1%})"
                        lh, la, et, _ = est[n]
                        lines_.append(s_ + f"; score {Aw} {la:.2f}, {H} {lh:.2f} in regulation, total {et:.2f}.")
                    body = ("DraftKings " + fmt_price(price) + (" (opening price)." if oprice == price else
                            (f" (opened {fmt_price(oprice)})." if not pd.isna(oprice) else ".")) + "\n" + "\n".join(lines_))
                    if oo:
                        floor = min(open_only_floor(bt[3], oprice) for _, bt in oo)
                        who = SHORT.get(oo[0][0], oo[0][0])
                        body = (f"OPENING PRICE ONLY ({who}): bet this only at {fmt_price(floor)} or longer. If DraftKings now shows a shorter "
                                f"price than {fmt_price(floor)}, skip it. In the backtests the {who}'s +150-and-longer bets made money at "
                                f"the opening price (+13.5u on 641 bets) but lost once the price moved.\n" + body)
                        if len(oo) < len(pending):
                            body += f"\nThe shot model's number on this bet holds at any price; only the {who}'s needs the opening price."
                    if threshold_for(price, oprice) > THRESHOLD:
                        body += f"\nThe price has moved since it opened, so this needed {THRESHOLD_MOVED:.0%}+ EV (vs {THRESHOLD:.0%} at the opening price)."
                    tail = f"\nGoalies: {goalies_txt}."
                    if outs_a or outs_h: tail += f"\nMissing: {Aw} {', '.join(outs_a) or 'none'}; {H} {', '.join(outs_h) or 'none'}."
                    link = log_link(M["date"], g["away"], g["home"], mk, team if mk != "total" else side,
                                    "" if mk == "moneyline" else f"{lnum:+g}" if mk == "puck line" else f"{lnum:g}", f"{price:+.0f}")
                    dkcol = {"moneyline": f"dk_link_{side}_ml", "puck line": f"dk_link_{side}_pl", "total": f"dk_link_{side}"}[mk]
                    dk = ln.get(dkcol) if isinstance(ln.get(dkcol), str) else None
                    recs = "; ".join(f"{SHORT.get(n, n)} {record(n, bool(skip))}" for n, _ in pending)
                    if skip:
                        body += f"\nCAUTION: {skip}. The model may be missing news here; bet with caution." + tail + \
                                f"\nCaution alerts so far: {recs}." + hist_txt + news_for(g)
                        same, other = bets_note(M["date"], g["home"], g["away"], mk, (team if mk != "total" else side))
                        ctitle = "CAUTION " + title
                        if same: body = f"ALREADY BET: you logged {same}.\n" + body; ctitle = "ALREADY BET - " + ctitle
                        if other: body += f"\nYour other bets on this game: {other}."
                        if "OTHER SIDE" in other: ctitle = "YOU BET THE OTHER SIDE - " + ctitle
                        sent = notify(ctitle, body, priority="default", tags="warning,ice_hockey", link=link, dk=dk)
                    else:
                        if toward: body += f"\nMarket agrees: the moneyline has moved {abs(move):.1f} win-% points toward this side since open."
                        body += tail + f"\nAlerts so far: {recs}. Tracking test: neither model has proven an edge live yet." + hist_txt + news_for(g)
                        prio = "high"; why = ""
                        cb = caution_before(g["game_id"], mk, [n for n, _ in pending])
                        if cb is not None:      # a caution went out earlier: say why this one follows it
                            reason = str(cb.skipped)
                            cleared = ("both starting goalies are now confirmed" if "goalies" in reason else
                                       "the moneyline is no longer moving against this side" if "against" in reason else
                                       "the caution no longer applies")
                            why = (f"UPDATE to the CAUTION alert at {pd.Timestamp(cb.alerted_at_et):%-I:%M %p}: {cleared}. "
                                   f"EV now {max(bt[4] for _, bt in pending):+.1%} (was {float(cb.ev):+.1%} at {fmt_price(cb.price)}).\n")
                            title = "UPDATE - " + title
                        same, other = bets_note(M["date"], g["home"], g["away"], mk, (team if mk != "total" else side))
                        if same:
                            why = f"ALREADY BET: you logged {same}. Only add to it if you mean to.\n" + why
                            title = "ALREADY BET - " + title; prio = "default"
                        if other: body += f"\nYour other bets on this game: {other}."
                        if "OTHER SIDE" in other: title = "YOU BET THE OTHER SIDE - " + title
                        sent = notify(title, why + body, priority=prio, link=link, dk=dk)
                    for n, bt in pending:
                        new.append(dict(alerted_at_et=str(NOW), model=n, both_models=len(pending) > 1, game_id=g["game_id"], date=M["date"],
                                        home=g["home"], away=g["away"], tip_et=g["tip_et"], market=mk, side=side, line=lnum, price=price,
                                        open_price=oprice, model_prob=round(bt[3], 4), ev=round(bt[4], 4), goalies=goalies_txt, sent=sent, skipped=skip,
                                        open_only=is_open_only(n, price), remind_ok=True))
                        (skipped if skip else done).add((g["game_id"], mk, n))
                    print(("CAUTION " if skip else "") + "ALERT:", title, "|", skip or "")
    # ---- reminders: an alert's bet still not logged REMIND_AFTER_MIN later (every placed bet gets logged). Ported from the NBA tracker.
    A2 = pd.concat([A, pd.DataFrame(new)], ignore_index=True) if new else A.copy()
    n_rem = 0
    if len(A2) and "remind_ok" in A2:
        if "reminded_at_et" not in A2: A2["reminded_at_et"] = np.nan
        A2["reminded_at_et"] = A2["reminded_at_et"].astype(object)
        ok_ = A2.remind_ok.astype(str).isin(["True", "1", "1.0"]) & A2.sent.astype(str).isin(["True", "1", "1.0"])
        for (gid, mk), grp in A2[ok_].groupby(["game_id", "market"]):
            if A2[(A2.game_id == gid) & (A2.market == mk)].reminded_at_et.astype(str).str.len().gt(3).any(): continue
            t_last = grp.alerted_at_et.max(); rows = grp[grp.alerted_at_et == t_last]; r = rows.iloc[0]
            gi = GINFO.get(gid)
            if gi is None or pd.Timestamp(gi["tip_et"]) <= NOW: continue
            if NOW - pd.Timestamp(t_last) < pd.Timedelta(minutes=REMIND_AFTER_MIN): continue
            logged = len(MYB) and ((MYB.date.astype(str) == str(r.date)) & (MYB.home.astype(str).str.lower() == r.home) &
                                   (MYB.away.astype(str).str.lower() == r.away) & (MYB.market == mk)).any()
            if logged: continue
            nowv = [(m, NOWC.get((gid, mk, r.side, m))) for m in rows.model]
            nowv = [(m, v) for m, v in nowv if v is not None]
            if not nowv: continue
            m_best, (lnum, price, p, ev, oprice) = max(nowv, key=lambda x: x[1][3])
            thr = threshold_for(price, oprice)
            longshot_gone = m_best in OPEN_ONLY_LONGSHOTS and price >= OPEN_ONLY_LONGSHOTS[m_best] and not near_open(price, oprice)
            ok_now = ev >= thr and not longshot_gone
            vd = "BET" if ok_now else "PASS"
            team = gi["H"] if r.side == "home" else (gi["Aw"] if r.side == "away" else str(r.side).upper())
            what = (f"{team} ML {fmt_price(price)}" if mk == "moneyline" else
                    (f"{team} {lnum:+g} ({fmt_price(price)})" if mk == "puck line" else f"{str(r.side).upper()} {lnum:g} ({fmt_price(price)})"))
            why = (f"EV now {ev:+.1%} at {fmt_price(price)}, " + ("still meets" if ok_now else "below") + f" the {thr:.0%} bar"
                   + (" (opening-price-only long shot and the price has moved)" if longshot_gone else ""))
            body = (f"{vd}: {why}.\nNo bet logged yet for the alert at {pd.Timestamp(t_last):%-I:%M %p} (price then {fmt_price(r.price)}, "
                    f"EV {float(r.ev):+.1%}). [{SHORT.get(m_best, m_best)}] win chance {p:.1%}.\nGoalies: {gi['goalies']}."
                    + (" Both confirmed." if gi["conf"] else " Not both confirmed yet."))
            notify(f"[{vd}] REMINDER - {what}: {gi['Aw']} @ {gi['H']}, {gi['tip']}", body,
                   priority="default" if vd == "BET" else "low", tags="alarm_clock")
            A2.loc[rows.index, "reminded_at_et"] = str(NOW)[:16]; n_rem += 1
            print("REMINDER:", what, vd, why)
    if new or n_rem:
        A2.to_csv(apath, index=False)
    # ---- line jumps: fast moves, logged for research and alerted when large
    jpath = os.path.join(STATE, "line_jumps.csv")
    J = pd.read_csv(jpath) if os.path.exists(jpath) else pd.DataFrame(columns=["game_id", "market", "detected_at_et"])
    allh = pd.concat([H_, pd.DataFrame(hist_new)], ignore_index=True)
    jumps_new = []
    if len(allh):
        allh["t"] = pd.to_datetime(allh.seen_at_et)
        for (gid, market), rows in allh.groupby(["game_id", "market"]):
            if gid not in info or market == "puck line": continue      # puck line moves follow the moneyline
            rows = rows.sort_values("t"); t_cur = rows.t.iloc[-1]
            val = (lambda r: float(r.prob)) if market == "moneyline" else (lambda r: float(r.line))
            cur = val(rows.iloc[-1]); start = NOW - pd.Timedelta(minutes=JUMP_WINDOW_MIN)
            before = rows[rows.t <= start]; ref_row = before.iloc[-1] if len(before) else rows.iloc[0]
            ref, t_ref = val(ref_row), ref_row.t
            move = cur - ref
            big = abs(move) >= (JUMP_LOG_PROB if market == "moneyline" else 0.5)
            if not big or t_cur < start: continue
            recent = J[(J.game_id == gid) & (J.market == market)]
            if len(recent) and pd.to_datetime(recent.detected_at_et).max() >= start: continue
            moving = rows[rows.t > start]; t_move = moving.t.iloc[0] if len(moving) else t_cur
            g, M2 = info[gid]
            mod = 100 * float(nm.market_probs(np.array([g["morning_lam_home"]]), np.array([g["morning_lam_away"]]), M2["h_ot"], M2["cal"]["open"])["home_win"][0]) \
                if market == "moneyline" else g["morning_lam_home"] + g["morning_lam_away"]
            toward = (move > 0) == (mod > ref)
            win_news = []
            if NEWS is not None:
                for team in (g["away"], g["home"]):
                    for when, text in NEWS.get(team, []):
                        if when.replace(tzinfo=None) >= t_ref - pd.Timedelta(minutes=30):
                            win_news.append(f"{team.upper()} {when:%-I:%M %p}: {text}")
            tipd = pd.Timestamp(g["tip_et"])
            alert_it = abs(move) >= (JUMP_ALERT_PROB if market == "moneyline" else 1.0)
            row = dict(detected_at_et=str(NOW)[:16], game_id=gid, date=M2["date"], away=g["away"], home=g["home"], market=market,
                       from_line=round(ref, 1), to_line=round(cur, 1), move=round(move, 1), steady_since=str(t_ref)[:16], move_started=str(t_move)[:16],
                       move_seen=str(t_cur)[:16], minutes=int((t_cur - t_move).total_seconds() // 60),
                       hours_to_tip=round((tipd - t_cur).total_seconds() / 3600, 1), model=round(mod, 1),
                       direction="toward model" if toward else "away from model", news_in_window=" | ".join(win_news),
                       news_count=len(win_news), alerted=alert_it)
            jumps_new.append(row)
            if alert_it:
                H2, A2 = g["home"].upper(), g["away"].upper()
                what = f"{H2} win chance {ref:.0f}% -> {cur:.0f}%" if market == "moneyline" else f"total {ref:g} -> {cur:g}"
                speed = (f"within one check (seen {t_cur:%-I:%M %p})" if row["minutes"] < 5
                         else f"over about {row['minutes']} min ({t_move:%-I:%M} to {t_cur:%-I:%M %p})")
                body = (f"Moved {speed}; steady since {t_ref:%a %-I:%M %p}. {row['hours_to_tip']:.1f} h before puck drop. "
                        f"Model: {mod:.0f}% home" if market == "moneyline" else
                        f"Moved {speed}; steady since {t_ref:%a %-I:%M %p}. {row['hours_to_tip']:.1f} h before puck drop. Model total {mod:.2f}")
                body += f" ({'toward' if toward else 'away from'} the model)." + history_text(gid, market)
                body += ("\nNews around the move:\n- " + "\n- ".join(win_news[:6])) if win_news else \
                        "\nNo injury news reported around the move yet: possibly a goalie announcement, breaking news or big bets."
                notify(f"Line jump: {A2} @ {H2} {what}", body, priority="default", tags="zap")
                print("LINE JUMP:", what, "|", body)
    if jumps_new: pd.concat([J, pd.DataFrame(jumps_new)], ignore_index=True).to_csv(jpath, index=False)
    if hist_new: pd.concat([H_, pd.DataFrame(hist_new)], ignore_index=True).to_csv(hpath, index=False)
    if moves_new: pd.concat([MV, pd.DataFrame(moves_new)], ignore_index=True).to_csv(mpath, index=False)
    # ---- research database (never allowed to break alerts)
    try:
        import research
        research.init(W)
        n_odds = n_pred = n_spl = n_bk = n_g = 0
        for mf in models:
            M3 = load_models(os.path.join(STATE, mf)); M3 = dict(date=M3["date"], games=next(iter(M3["models"].values()))["games"])
            try:
                k, rows = research.odds_snapshot(NOW, M3["date"], M3["games"]); n_odds += k
                n_pred += research.predictor_snapshot(NOW, M3["date"], rows)
            except Exception as e:
                print("ESPN research logging skipped:", type(e).__name__, str(e)[:120])
            try:
                a, b = research.splits_snapshot(NOW, M3["date"], M3["games"]); n_spl += a; n_bk += b
            except Exception as e:
                print("Betting splits logging skipped:", type(e).__name__, str(e)[:120])
            try:
                n_g += research.goalie_snapshot(NOW, M3["date"], M3["games"])
            except Exception as e:
                print("Goalie logging skipped:", type(e).__name__, str(e)[:120])
        n_news = research.news_log(NOW, NEWS) if NEWS is not None else 0
        n_mod = research.model_snapshot(NOW, model_rows)
        print(f"Research log: {n_odds} odds changes, {n_pred} predictor snapshots, {n_spl} betting-split changes, "
              f"{n_bk} book line changes, {n_g} goalie changes, {n_news} new news notes, {n_mod} model changes.")
    except Exception as e:
        print("Research logging skipped:", type(e).__name__, str(e)[:120])
    n_clean = sum(1 for x in new if not x.get("skipped"))
    print(f"{NOW:%H:%M} ET: checked {n_games} upcoming games, {n_clean} alerts and {len(new) - n_clean} caution alerts sent.")


if __name__ == "__main__":
    main()

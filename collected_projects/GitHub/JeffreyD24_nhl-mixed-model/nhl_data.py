"""
NHL data from public feeds: ESPN (schedule, results, box scores, goalies, injuries, DraftKings odds)
and Action Network (opening and closing lines at several books, betting splits).

Team codes are lowercase ESPN-style abbreviations (bos, nyr, vgk, uta, ...). Arizona (2023-24 and
earlier) is mapped to uta, since Utah took over that roster, so team effects carry over.
"""
import json, time, urllib.request
import numpy as np, pandas as pd

ALIAS = {"ana": "ana", "ari": "uta", "phx": "uta", "uta": "uta", "utah": "uta", "bos": "bos", "buf": "buf",
         "cgy": "cgy", "cal": "cgy", "car": "car", "chi": "chi", "col": "col", "cbj": "cbj", "clb": "cbj", "dal": "dal",
         "det": "det", "edm": "edm", "fla": "fla", "la": "la", "lak": "la", "min": "min", "mtl": "mtl", "mon": "mtl",
         "nsh": "nsh", "nas": "nsh", "nj": "nj", "njd": "nj", "nyi": "nyi", "nyr": "nyr", "ott": "ott", "phi": "phi",
         "pit": "pit", "sj": "sj", "sjs": "sj", "sea": "sea", "stl": "stl", "tb": "tb", "tbl": "tb", "tor": "tor",
         "van": "van", "vgk": "vgk", "lv": "vgk", "veg": "vgk", "wsh": "wsh", "was": "wsh", "wpg": "wpg", "win": "wpg"}
FULL = {"Anaheim Ducks": "ana", "Arizona Coyotes": "uta", "Utah Hockey Club": "uta", "Utah Mammoth": "uta", "Utah HC": "uta",
        "Boston Bruins": "bos", "Buffalo Sabres": "buf", "Calgary Flames": "cgy", "Carolina Hurricanes": "car",
        "Chicago Blackhawks": "chi", "Colorado Avalanche": "col", "Columbus Blue Jackets": "cbj", "Dallas Stars": "dal",
        "Detroit Red Wings": "det", "Edmonton Oilers": "edm", "Florida Panthers": "fla", "Los Angeles Kings": "la",
        "Minnesota Wild": "min", "Montreal Canadiens": "mtl", "Montréal Canadiens": "mtl", "Nashville Predators": "nsh",
        "New Jersey Devils": "nj", "New York Islanders": "nyi", "New York Rangers": "nyr", "Ottawa Senators": "ott",
        "Philadelphia Flyers": "phi", "Pittsburgh Penguins": "pit", "San Jose Sharks": "sj", "Seattle Kraken": "sea",
        "St. Louis Blues": "stl", "Tampa Bay Lightning": "tb", "Toronto Maple Leafs": "tor", "Vancouver Canucks": "van",
        "Vegas Golden Knights": "vgk", "Washington Capitals": "wsh", "Winnipeg Jets": "wpg"}
NAMES = {"ana": ["anaheim", "ducks"], "uta": ["utah", "mammoth", "uhc"], "bos": ["boston", "bruins"], "buf": ["buffalo", "sabres"],
         "cgy": ["calgary", "flames"], "car": ["carolina", "hurricanes", "canes"], "chi": ["chicago", "blackhawks", "hawks"],
         "col": ["colorado", "avalanche", "avs"], "cbj": ["columbus", "blue jackets", "jackets"], "dal": ["dallas", "stars"],
         "det": ["detroit", "red wings", "wings"], "edm": ["edmonton", "oilers"], "fla": ["florida", "panthers"],
         "la": ["los angeles", "kings"], "min": ["minnesota", "wild"], "mtl": ["montreal", "canadiens", "habs"],
         "nsh": ["nashville", "predators", "preds"], "nj": ["new jersey", "devils"], "nyi": ["islanders", "isles"],
         "nyr": ["rangers"], "ott": ["ottawa", "senators", "sens"], "phi": ["philadelphia", "flyers"],
         "pit": ["pittsburgh", "penguins", "pens"], "sj": ["san jose", "sharks"], "sea": ["seattle", "kraken"],
         "stl": ["st louis", "st. louis", "blues"], "tb": ["tampa", "tampa bay", "lightning", "bolts"],
         "tor": ["toronto", "maple leafs", "leafs"], "van": ["vancouver", "canucks"], "vgk": ["vegas", "golden knights", "knights"],
         "wsh": ["washington", "capitals", "caps"], "wpg": ["winnipeg", "jets"]}
ESPN = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl"
CORE = "https://sports.core.api.espn.com/v2/sports/hockey/leagues/nhl"
AN_BOOKS = {15: "Consensus", 30: "Open", 68: "DraftKings", 69: "FanDuel", 71: "BetRivers", 75: "BetMGM",
            79: "bet365", 123: "Caesars", 2988: "Fanatics"}


def code(abbr):
    return ALIAS.get(str(abbr).lower())


def get(url, tries=3, headers=None):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json", **(headers or {})})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except Exception:
            if k == tries - 1: raise
            time.sleep(1.5 * (k + 1))


def num(x):
    try: return float(str(x).replace("+", "").replace("PK", "0").replace("pk", "0").replace("EVEN", "100"))
    except Exception: return np.nan


def season_of(d):
    """season label = the year it ends (2025-26 -> 2026)"""
    d = pd.Timestamp(d)
    return d.year + 1 if d.month >= 8 else d.year


def mins(s):
    try:
        m, sec = str(s).split(":"); return int(m) + int(sec) / 60
    except Exception: return 0.0


# ------------------------------------------------------------------ ESPN schedule and results
def scoreboard(day):
    """one row per regular-season game on an ET date: ids, teams, tip, state, regulation and final goals"""
    d = get(f"{ESPN}/scoreboard?dates={pd.Timestamp(day):%Y%m%d}&limit=50")
    out = []
    for ev in d.get("events", []):
        if (ev.get("season") or {}).get("type") != 2: continue
        c = ev["competitions"][0]
        tm = {x["homeAway"]: x for x in c["competitors"]}
        st = c["status"]["type"]
        rec = dict(game_id=int(ev["id"]), date=pd.Timestamp(day).normalize(),
                   tip_et=pd.Timestamp(ev["date"]).tz_convert("America/New_York").tz_localize(None),
                   home=code(tm["home"]["team"]["abbreviation"]), away=code(tm["away"]["team"]["abbreviation"]),
                   state=st.get("state"), detail=st.get("shortDetail"))
        probables = {}
        for side in ("home", "away"):
            p = next((p for p in tm[side].get("probables", []) if p.get("name") == "probableStartingGoalie"), None)
            if p: probables[side] = (int(p["playerId"]), p["athlete"]["displayName"], (p.get("status") or {}).get("name"))
        rec["probables"] = probables
        if st.get("completed"):
            for side in ("home", "away"):
                ls = tm[side].get("linescores") or []
                rec[f"{side}_goals"] = int(num(tm[side]["score"]))
                rec[f"{side}_reg"] = int(sum(num(x.get("value")) for x in ls if x.get("period", 0) <= 3)) if ls else np.nan
            per = max([x.get("period", 0) for x in tm["home"].get("linescores") or []] or [3])
            rec["ending"] = "SO" if "SO" in str(st.get("shortDetail")) else ("OT" if per > 3 or "OT" in str(st.get("shortDetail")) else "REG")
        out.append(rec)
    return out


def box(game_id):
    """player rows for a finished game: team, player id/name, position group, TOI, G, A; goalies with starter flag"""
    d = get(f"{ESPN}/summary?event={game_id}")
    rows = []
    for p in (d.get("boxscore") or {}).get("players", []):
        team = code(p["team"]["abbreviation"])
        for s in p.get("statistics", []):
            grp = s.get("name"); lab = s.get("labels", [])
            ix = {l: i for i, l in enumerate(lab)}
            for k, a in enumerate(s.get("athletes", [])):
                st = a.get("stats") or []
                if not st: continue
                g = lambda l: st[ix[l]] if l in ix and ix[l] < len(st) else None
                rows.append(dict(game_id=int(game_id), team=team, playerid=int(a["athlete"]["id"]), player=a["athlete"]["displayName"],
                                 pos="G" if grp == "goalies" else ("D" if grp == "defenses" else "F"),
                                 toi=round(mins(g("TOI")), 2), g=num(g("G")), a=num(g("A")), sog=num(g("SOG") or g("S")),
                                 ga=num(g("GA")), sa=num(g("SA")), starter=int(grp == "goalies" and k == 0)))
    return rows


# ------------------------------------------------------------------ Action Network lines
def an_lines(day, books=(15, 30, 68)):
    """lines for every game on a date at the given books: moneyline, puck line and total with prices.
    Also returns the projected/confirmed starting goalie ids when listed."""
    d = get(f"https://api.actionnetwork.com/web/v2/scoreboard/nhl?bookIds={','.join(map(str, books))}&date={pd.Timestamp(day):%Y%m%d}")
    out = []
    for g in d.get("games", []):
        t = {x["id"]: (FULL.get(x.get("full_name")) or code(x.get("abbr"))) for x in g.get("teams", [])}
        home, away = t.get(g["home_team_id"]), t.get(g["away_team_id"])
        for bid, m in (g.get("markets") or {}).items():
            ev = (m or {}).get("event") or {}
            pick = lambda mk, side: next((o for o in ev.get(mk, []) if o.get("side") == side), {}) or {}
            hs, as_, ov, un = pick("spread", "home"), pick("spread", "away"), pick("total", "over"), pick("total", "under")
            hm, am = pick("moneyline", "home"), pick("moneyline", "away")
            tot = num(ov.get("value") if ov else un.get("value"))
            if not np.isnan(tot) and not (3.5 <= tot <= 9.5): tot = np.nan            # period/team totals
            out.append(dict(date=pd.Timestamp(day).normalize(), home=home, away=away, an_id=g["id"], status=g.get("status"),
                            num_bets=g.get("num_bets"), book=AN_BOOKS.get(int(bid), str(bid)), book_id=int(bid),
                            home_ml=num(hm.get("odds")), away_ml=num(am.get("odds")),
                            home_pl=num(hs.get("value")), home_pl_odds=num(hs.get("odds")), away_pl_odds=num(as_.get("odds")),
                            total=tot, over_odds=num(ov.get("odds")) if not np.isnan(tot) else np.nan,
                            under_odds=num(un.get("odds")) if not np.isnan(tot) else np.nan,
                            _raw=ev if int(bid) == 15 else None, _goalies=(g.get("boxscore") or {}).get("goalies")))
        lo = ((g.get("boxscore") or {}).get("latest_odds") or {}).get("game")
        if lo and not g.get("markets"):           # older seasons: only the last line before the game is kept
            tot = num(lo.get("total"))
            out.append(dict(date=pd.Timestamp(day).normalize(), home=home, away=away, an_id=g["id"], status=g.get("status"),
                            num_bets=g.get("num_bets"), book="Latest", book_id=-1, home_ml=num(lo.get("ml_home")),
                            away_ml=num(lo.get("ml_away")), home_pl=num(lo.get("spread_home")), home_pl_odds=num(lo.get("spread_home_line")),
                            away_pl_odds=num(lo.get("spread_away_line")), total=tot, over_odds=num(lo.get("over")),
                            under_odds=num(lo.get("under")), _raw=None, _goalies=None))
    return out

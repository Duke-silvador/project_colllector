"""DraftKings lines (moneyline, puck line, total, with prices), probable goalies and injury news from ESPN's public feeds."""
import numpy as np, pandas as pd
import nhl_data as nd

_get = nd.get
_num = nd.num
ESPN2 = {k.upper(): v for k, v in nd.ALIAS.items()}
MARKET_COLS = ("home_ml", "away_ml", "home_pl", "home_pl_odds", "away_pl_odds", "total", "over_odds", "under_odds")


def _am(d, *ks):
    for k in ks: d = (d or {}).get(k)
    return _num(d)


def parse_odds_item(it, w):
    """one ESPN odds item -> dict of market values for w in open/close/current"""
    h, a = it.get("homeTeamOdds") or {}, it.get("awayTeamOdds") or {}
    t = it.get(w) or {}
    r = dict(home_ml=_am(h, w, "moneyLine", "american"), away_ml=_am(a, w, "moneyLine", "american"),
             home_pl=_am(h, w, "pointSpread", "american"), home_pl_odds=_am(h, w, "spread", "american"),
             away_pl_odds=_am(a, w, "spread", "american"), total=_am(t, "total", "american"),
             over_odds=_am(t, "over", "american"), under_odds=_am(t, "under", "american"))
    if w == "current":       # older items only carry flat fields
        if np.isnan(r["home_ml"]): r["home_ml"], r["away_ml"] = _num(h.get("moneyLine")), _num(a.get("moneyLine"))
        if np.isnan(r["total"]): r["total"], r["over_odds"], r["under_odds"] = _num(it.get("overUnder")), _num(it.get("overOdds")), _num(it.get("underOdds"))
        if np.isnan(r["home_pl"]) and not pd.isna(it.get("spread")):
            r["home_pl"] = _num(it.get("spread")); r["home_pl_odds"], r["away_pl_odds"] = _num(h.get("spreadOdds")), _num(a.get("spreadOdds"))
    return r


def lines(dates, when=("open", "close", "current")):
    """one row per game: date, home, away, game_id, state, book, {open,close,current}_{market columns}"""
    out = []
    for d in dates:
        sb = _get(f"{nd.ESPN}/scoreboard?dates={pd.Timestamp(d):%Y%m%d}&limit=50")
        for ev in sb.get("events", []):
            if (ev.get("season") or {}).get("type") != 2: continue
            comp = ev["competitions"][0]
            teams = {c["homeAway"]: nd.code(c["team"]["abbreviation"]) for c in comp["competitors"]}
            rec = dict(date=pd.Timestamp(d).normalize(), game_id=int(ev["id"]), home=teams.get("home"), away=teams.get("away"),
                       state=comp.get("status", {}).get("type", {}).get("state"), espn_event_id=ev["id"])
            try:
                od = _get(f"{nd.CORE}/events/{ev['id']}/competitions/{comp['id']}/odds")
                items = od.get("items", [])
                it = next((i for i in items if "draftkings" in str(i.get("provider", {}).get("name", "")).lower()), items[0] if items else None)
                if it:
                    rec["book"] = it.get("provider", {}).get("name")
                    for k, v in dk_links(it).items(): rec[f"dk_link_{k}"] = v
                    for w in when:
                        for k, v in parse_odds_item(it, w).items(): rec[f"{w}_{k}"] = v
            except Exception as e:
                rec["error"] = str(e)[:80]
            out.append(rec)
    return pd.DataFrame(out)


DK_REL = {"home": "home_ml", "away": "away_ml", "homeSpread": "home_pl", "awaySpread": "away_pl", "over": "over", "under": "under", "game": "game"}


def dk_links(it):
    """DraftKings bet-slip links from ESPN's odds item: opening one puts that exact bet on your DraftKings bet slip.
    ESPN wraps them in its own referral link; the direct DraftKings address is inside (preurl=...)."""
    import urllib.parse
    out = {}
    for l in it.get("links", []) or []:
        rel = (l.get("rel") or [None])[0]; href = l.get("href") or ""
        if rel not in DK_REL or "draftkings" not in href: continue
        q = urllib.parse.parse_qs(urllib.parse.urlparse(href).query)
        out[DK_REL[rel]] = q.get("preurl", [href])[0]
    return out


def novig_home(home_ml, away_ml):
    """no-vig home win probability from the two moneylines"""
    if pd.isna(home_ml) or pd.isna(away_ml): return np.nan
    ih, ia = 1 / float(nd_dec(home_ml)), 1 / float(nd_dec(away_ml))
    return ih / (ih + ia)


def nd_dec(o):
    o = float(o); return 1 + o / 100 if o > 0 else 1 + 100 / abs(o)


def injury_feed():
    """ESPN injury list: {team: [(player_id, name, status, time_et, short comment), ...]}"""
    from zoneinfo import ZoneInfo
    d = _get(f"{nd.ESPN}/injuries")
    out = {}
    for t in d.get("injuries", []):
        code = nd.FULL.get(t.get("displayName"))
        if not code: continue
        items = []
        for i in t.get("injuries", []):
            ath = i.get("athlete") or {}
            pid = None
            for l in ath.get("links", []):
                h = l.get("href", "")
                if "/id/" in h:
                    try: pid = int(h.split("/id/")[1].split("/")[0]); break
                    except ValueError: pass
            when = pd.to_datetime(i.get("date"), utc=True, errors="coerce")
            items.append((pid, ath.get("displayName"), i.get("status"),
                          when.tz_convert(ZoneInfo("America/New_York")) if when is not pd.NaT else None, _comment(i, ath)))
        out[code] = items
    return out


def _comment(i, ath):
    """ESPN's hockey notes are sometimes one word ('out'); then say who and what status"""
    s = (i.get("shortComment") or "").strip(); l = (i.get("longComment") or "").strip()
    import html
    s, l = html.unescape(s), html.unescape(l)
    t = s if len(s) >= 25 else (l if len(l) > len(s) else s)
    if len(t) > 220: t = t[:219] + "…"
    if len(t) < 25: t = f"{ath.get('displayName', '')} ({i.get('status', '')})" + (f": {t}" if t else "")
    return t


def injury_news(hours=24, now_utc=None, feed=None):
    """Latest reporter-sourced injury updates from ESPN, by team code: {code: [(time_et, text), ...]} newest first."""
    feed = injury_feed() if feed is None else feed
    now = pd.Timestamp.now(tz="UTC") if now_utc is None else now_utc
    out = {}
    for code, items in feed.items():
        x = [(w, txt) for _, _, _, w, txt in items if txt and w is not None and now - w <= pd.Timedelta(hours=hours)]
        out[code] = sorted(x, key=lambda z: z[0], reverse=True)
    return out


def news_text(news, teams, per_team=3, max_chars=700):
    """short block for a notification body"""
    lines_ = []
    for t in teams:
        for when, text in news.get(t, [])[:per_team]:
            lines_.append(f"- {t.upper()} {when:%a %-I:%M %p}: {text}")
    if not lines_: return "Latest news: nothing reported for either team in the last 24 hours."
    s = "Latest news:\n" + "\n".join(lines_)
    return s if len(s) <= max_chars else s[:max_chars - 1] + "…"

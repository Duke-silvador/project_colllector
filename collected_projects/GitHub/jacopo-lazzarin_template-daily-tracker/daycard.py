#!/usr/bin/env python3
"""Daily Tracker — generator.

Reads day.md (hand-kept log) + health/plans/block-1.json (the agreed plan) and writes
one static, mobile-first HTML page.

The invariant (inherited from the day-card-starter skeleton, do not break):
  GREY means NO DATA. A red is only rendered when the day HAS been reported (its
  `## date` heading exists) and a check's line is missing. No heading -> the whole
  day is grey, which is never a fail. Today stays open (None) until the day ends.

Usage:
  python3 daycard.py                 # day-by-day verdict list (verification)
  python3 daycard.py --html [PATH]   # write the page (default web/index.html)
  python3 daycard.py --json          # dump the graded data
"""
import json, os, re, sys, datetime
from figures import FIGURES, MARKER, CAPTIONS


def local_today():
    """Today in the user's timezone (TZ env, default Pacific) — a UTC container must not
    roll the day over at 5 pm. Falls back to the system clock if tz data is missing."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo(os.environ.get("TZ", "America/Los_Angeles"))).date()
    except Exception:
        return datetime.date.today()

ROOT = os.path.dirname(os.path.abspath(__file__))
PLAN_PATH = os.path.join(ROOT, "health", "plans", "block-1.json")
LOG_PATH = os.path.join(ROOT, "day.md")

SESSION_TAGS = {"train", "lift", "v", "z2", "z", "tennis", "run", "ride", "cardio",
                "session", "workout", "a", "b", "c"}
POSTURE_TAGS = {"posture"}
STRETCH_TAGS = {"stretch", "stretching"}
MED_TAGS = {"med", "meditate", "meditation"}


def parse_log(path):
    """day.md -> {date: {"tags": [(tag, value)…], "raw": [line…]}}. Missing file -> {}."""
    if not os.path.exists(path):
        return {}
    days, cur = {}, None
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$", line)
        if m:
            cur = m.group(1)
            days.setdefault(cur, {"tags": [], "raw": []})
            continue
        if cur is None:
            continue
        line = line.rstrip()
        if not line or line.startswith("#"):
            continue
        t = re.match(r"^-\s*([\w][\w ]*?)\s*:\s*(.*)$", line)
        if t:
            days[cur]["tags"].append((t.group(1).strip().lower(), t.group(2).strip()))
            days[cur]["raw"].append(line.lstrip("- ").strip())
        else:
            days[cur]["raw"].append(line.lstrip("- ").strip())
    return days


def tag_check(label, key, entry, tags, is_today, reported):
    """Shared grey-rule logic for a yes/value tag check."""
    if not reported:
        return [label, None, "tocca per registrare" if is_today else "nessun dato per questo giorno — grigio, non un fallimento", key]
    val = next((v for t, v in entry["tags"] if t in tags), None)
    if val is not None:
        done = not val.strip().lower().startswith("n") if val.strip() else True
        return [label, done, val if val else "done", key]
    if is_today:
        return [label, None, "ancora aperto — tocca per registrare", key]
    return [label, False, "giorno registrato, voce mancante — tocca per registrare", key]


def grade_day(iso, entry, letter, today):
    """-> (status, checks). checks = [[label, state, detail]], state True/False/None."""
    d = datetime.date.fromisoformat(iso)
    sunday = d.weekday() == 6
    is_today, reported = iso == today, entry is not None
    checks = []

    # Session — omitted entirely on Rest days (a check that can't apply is omitted,
    # not None: a lone None among Trues would wrongly amber a perfect day).
    if letter != "R":
        if not reported:
            checks.append(["Sessione", None, "tocca per registrare" if is_today else "nessun dato per questo giorno — grigio, non un fallimento", "session"])
        else:
            ev = next((f"{t}: {v}" if v else t for t, v in entry["tags"] if t in SESSION_TAGS), None)
            if ev:
                checks.append(["Sessione", True, ev, "session"])
            elif is_today:
                checks.append(["Sessione", None, "ancora aperto — tocca per registrare", "session"])
            else:
                checks.append(["Sessione", False, "giorno registrato, nessuna sessione — tocca per registrare", "session"])

    if not sunday:  # posture + stretch have Sunday free
        checks.append(tag_check("Postura 10′", "posture", entry, POSTURE_TAGS, is_today, reported))
        checks.append(tag_check("Stretching 10′", "stretch", entry, STRETCH_TAGS, is_today, reported))
    checks.append(tag_check("Meditazione", "med", entry, MED_TAGS, is_today, reported))

    considered = [c[1] for c in checks if c[1] is not None]
    if is_today:
        # live view: green only when EVERY check is done; anything logged shows amber;
        # untouched stays open. Today is never red — the day isn't over yet.
        if checks and all(c[1] is True for c in checks):
            status = "green"
        elif considered:
            status = "amber"
        else:
            status = "open"
    elif not considered:
        status = "grey"
    elif all(considered):
        status = "green"
    elif not any(considered):
        status = "red"
    else:
        status = "amber"
    return status, checks


def build(today_override=None):
    plan = json.load(open(PLAN_PATH, encoding="utf-8"))
    log = parse_log(LOG_PATH)
    tw = datetime.date.fromisoformat(today_override) if today_override else local_today()
    today = tw.isoformat()
    start = datetime.date.fromisoformat(plan["start"])
    end = datetime.date.fromisoformat(plan["end"])

    months, m = [], datetime.date(start.year, start.month, 1)
    while (m.year, m.month) <= (end.year, end.month):
        months.append([m.year, m.month])
        m = datetime.date(m.year + (m.month == 12), m.month % 12 + 1, 1)

    days = {}
    first_shown = datetime.date(months[0][0], months[0][1], 1)
    last_shown = (datetime.date(months[-1][0], months[-1][1], 28) + datetime.timedelta(days=4))
    last_shown = last_shown.replace(day=1) - datetime.timedelta(days=1)
    d = first_shown
    while d <= last_shown:
        iso = d.isoformat()
        in_block = start <= d <= end
        letter = plan["weekmap"][d.weekday()] if in_block else None
        week_n = ((d - start).days // 7) + 1 if in_block else None
        entry = log.get(iso)
        if not in_block:
            status, checks = "pre", []
        elif iso > today:
            status, checks = "future", []
        else:
            status, checks = grade_day(iso, entry, letter, today)
        days[iso] = {
            "s": letter, "w": week_n, "status": status, "checks": checks,
            "raw": (entry or {}).get("raw", []),
            "event": plan.get("events", {}).get(iso),
        }
        d += datetime.timedelta(days=1)

    graded = [v for k, v in days.items() if start.isoformat() <= k <= today and k != today]
    greens = sum(1 for v in graded if v["status"] == "green")
    ambers = sum(1 for v in graded if v["status"] == "amber")
    reds = sum(1 for v in graded if v["status"] == "red")
    if days.get(today, {}).get("status") == "green":
        greens += 1  # today joins the count only once fully done — in progress is not a miss
    denom = greens + ambers + reds
    adherence = round(100 * greens / denom) if denom else None

    streak, d = 0, min(tw, end)
    while d >= start:
        s = days[d.isoformat()]["status"]
        if s == "green":
            streak += 1
        elif s in ("grey", "open", "future") or d == tw:
            pass  # grey neither extends nor breaks; an in-progress today doesn't either
        else:
            break
        d -= datetime.timedelta(days=1)

    total = (end - start).days + 1
    day_n = (tw - start).days + 1 if start <= tw <= end else None
    week_now = days.get(tw.isoformat(), {}).get("w")
    base = max(tw, start)  # before the block starts, the strip shows block week 1
    monday = base - datetime.timedelta(days=base.weekday())
    this_week = [(monday + datetime.timedelta(days=i)).isoformat() for i in range(7)]

    return {
        "meta": {
            "today": today, "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "start": plan["start"], "end": plan["end"], "weekNow": week_now,
            "dayN": day_n, "total": total, "nWeeks": len(plan["weeks"]),
            "streak": streak, "adherence": adherence,
            "counts": {"green": greens, "amber": ambers, "red": reds},
            "months": months, "thisWeek": this_week,
        },
        "plan": plan, "days": days,
    }


# ---------------------------------------------------------------- HTML template
TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f6f4f0">
<title>Daily Tracker</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#f6f4f0">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
:root{
  --bg:#f6f4f0; --card:#ffffff; --line:#e4e1da; --ink:#161616; --mut:#6d6a64; --dim:#a3a099;
  --green:#1a9e5f; --greenD:#157a47; --greenBg:#e3f3ea;
  --amber:#d97706; --amberBg:#fbf1de;
  --red:#dc2626; --redBg:#fbe9e9;
  --grey:#b8b4ac;
  color-scheme: light;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html{-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);
  font:15.5px/1.5 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Segoe UI,Roboto,sans-serif;
  padding-bottom:env(safe-area-inset-bottom)}
.wrap{max-width:520px;margin:0 auto;padding:18px 16px 56px}
.mono{font-family:ui-monospace,"SF Mono",SFMono-Regular,Menlo,monospace}
.lbl{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10px;font-weight:600;
  letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
h1{font-size:38px;font-weight:900;letter-spacing:-.03em;text-transform:uppercase;line-height:1.02;margin:2px 0 18px}
.disp{font-weight:900;letter-spacing:-.02em;text-transform:uppercase}
.sechead{font-size:20px;font-weight:900;letter-spacing:-.02em;text-transform:uppercase;margin:30px 0 10px}
html{scroll-behavior:smooth}
.topnav{position:sticky;top:0;z-index:30;display:flex;gap:6px;overflow-x:auto;background:var(--bg);padding:8px 0 10px;margin:-8px 0 10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.topnav::-webkit-scrollbar{display:none}
.topnav a{flex:none;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--mut);text-decoration:none;padding:7px 11px;border:1px solid var(--line);border-radius:999px;background:var(--card)}
.topnav a.cur{color:var(--ink);border-color:var(--ink)}
#todaycard,#posture-sec,#stretch-sec,#sessions,.sechead{scroll-margin-top:56px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px}
.stats{display:grid;grid-template-columns:1fr 1fr;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;margin-bottom:14px}
.stat{padding:13px 16px 11px;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}
.stat:nth-child(2n){border-right:none}
.stat:nth-child(n+3){border-bottom:none}
.stat b{display:block;font-size:24px;font-weight:800;letter-spacing:-.01em;line-height:1.15}
.stat b small{font-size:14px;font-weight:600;color:var(--dim)}
.bar{height:5px;background:#e8e5df;border-radius:3px;overflow:hidden;margin:2px 0 6px}
.bar i{display:block;height:100%;background:var(--green)}
.barrow{display:flex;justify-content:space-between;margin-bottom:22px}
.callout{background:var(--amberBg);border:1px solid #ecd9b3;border-radius:10px;padding:11px 14px;font-size:13.5px;margin-bottom:14px}
.callout b{font-weight:700}
.todayc{padding:16px 16px 8px;margin-bottom:14px}
.todayc .tname{font-size:23px;margin:4px 0 4px}
.todayc .wlab{color:var(--mut);font-size:13.5px;margin-bottom:8px}
.chk{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--line)}
.chk svg{width:19px;height:19px;flex:none;margin-top:1px}
.chk b{font-size:14px;font-weight:700;display:block;line-height:1.3}
.chk span{color:var(--mut);font-size:13px}
.linkbtn{display:block;width:100%;text-align:left;padding:12px 0 12px;border:none;border-top:1px solid var(--line);background:none;color:var(--ink);font-size:13px;font-weight:700;font-family:ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
.wkstrip{display:grid;grid-template-columns:repeat(7,1fr);border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card);margin-bottom:14px}
.wd{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 0 9px;border-right:1px solid var(--line);cursor:pointer}
.wd:last-child{border-right:none}
.wd svg{width:15px;height:15px}
.wd .sn{font-size:8.5px;font-family:ui-monospace,Menlo,monospace;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--mut)}
.wd.todaywd{background:#f1efe9}
.month h3{font-size:17px;font-weight:900;letter-spacing:-.01em;text-transform:uppercase;margin:16px 2px 8px}
.dow,.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
.dow div{text-align:center;font-family:ui-monospace,Menlo,monospace;font-size:9px;color:var(--dim);font-weight:600;padding-bottom:3px}
.cell{min-height:54px;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:var(--card);border:1px solid var(--line);position:relative;cursor:pointer;padding:5px 1px 4px}
.cell.blank{background:transparent;border:none;cursor:default}
.cell .n{font-size:12.5px;font-weight:700;line-height:1}
.cell svg{width:14px;height:14px}
.cell .sn{font-size:7.5px;font-family:ui-monospace,Menlo,monospace;color:var(--dim);letter-spacing:.02em;text-transform:uppercase;line-height:1;max-width:100%;overflow:hidden;white-space:nowrap}
.cell.pre{opacity:.45;cursor:default}
.cell.pre .n{color:var(--dim);font-weight:600}
.cell.future svg{opacity:.55}
.cell.today{border:1.5px solid var(--ink)}
.cell .ev{position:absolute;top:3px;right:5px;color:var(--amber);font-size:10px;font-weight:800}
.legend{display:flex;gap:14px;flex-wrap:wrap;margin:12px 2px 0;color:var(--mut);font-size:12.5px;align-items:center}
.legend svg{width:15px;height:15px;vertical-align:-3px;margin-right:4px}
.sesscard{margin-bottom:12px;overflow:hidden}
.sesshead{display:flex;align-items:baseline;gap:8px;padding:13px 15px 2px}
.sesshead b{font-size:15px;font-weight:900;letter-spacing:-.01em;text-transform:uppercase}
.sesshead .dur{margin-left:auto;font-family:ui-monospace,Menlo,monospace;color:var(--mut);font-size:11px;font-weight:600}
.sessnote{padding:2px 15px 12px;color:var(--mut);font-size:13px}
.exrow{display:flex;align-items:center;gap:12px;padding:10px 15px;border-top:1px solid var(--line);cursor:pointer}
.exrow svg{width:34px;height:34px;flex:none;color:#8a877f}
.exrow .nm{font-weight:600;font-size:14px}
.exrow .dose{margin-left:auto;font-family:ui-monospace,Menlo,monospace;color:var(--mut);font-size:11.5px;text-align:right;white-space:nowrap}
.exrow .chev{color:var(--dim);font-size:15px}
.tbl{padding:4px 15px}
.zrow{display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--line);align-items:baseline}
.zrow:first-child{border-top:none}
.zrow b{font-size:13.5px;font-weight:700;flex:none}
.zrow .rg{font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:12.5px;flex:none;margin-left:auto;order:3}
.zrow span{color:var(--mut);font-size:12px;display:block}
.zrow .zl{flex:1}
.wkrow{padding:11px 15px;border-top:1px solid var(--line)}
.wkrow:first-child{border-top:none}
.wkrow b{font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.wkrow.cur{background:#f1efe9}
.wkrow p{color:var(--mut);font-size:13px;margin-top:3px}
footer{color:var(--mut);font-size:12.5px;padding:26px 4px 8px;line-height:1.65;border-top:1px solid var(--line);margin-top:26px}
#ovl{position:fixed;inset:0;background:rgba(20,18,14,.42);opacity:0;pointer-events:none;transition:opacity .2s;z-index:40}
#ovl.on{opacity:1;pointer-events:auto}
#sheet{position:fixed;left:0;right:0;bottom:0;max-height:86vh;overflow-y:auto;background:var(--card);border-radius:18px 18px 0 0;border-top:1px solid var(--line);padding:10px 20px calc(26px + env(safe-area-inset-bottom));transform:translateY(105%);transition:transform .25s cubic-bezier(.2,.8,.2,1);z-index:50;max-width:560px;margin:0 auto}
#sheet.on{transform:none}
#sheet .grab{width:36px;height:4px;border-radius:4px;background:var(--line);margin:4px auto 10px}
.shnav{display:flex;justify-content:space-between;align-items:center;margin:0 0 10px}
.navbtn{background:none;border:none;padding:6px 0;color:var(--mut);font-family:ui-monospace,Menlo,monospace;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;cursor:pointer}
.navbtn:active{color:var(--ink)}
.navbtn.right{margin-left:auto}
#sheet h3{font-size:21px;font-weight:900;letter-spacing:-.02em;text-transform:uppercase;margin-bottom:3px}
#sheet .sub{color:var(--mut);font-size:13px;margin-bottom:12px}
#sheet .evline{color:var(--amber);font-weight:700;font-size:13.5px;margin:2px 0 8px}
.loglines{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:12px}
.loglines div{font-size:13.5px;padding:2px 0}
.exbig{display:flex;justify-content:center;margin:6px 0 14px}
.exbig svg{width:120px;height:120px;color:#8a877f}
.exbig.fig{margin:4px 0 12px}
.exbig.fig svg{width:100%;max-width:360px;height:auto;color:#8a877f}
a.linkbtn{text-decoration:none}
.exphoto{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:6px 0 12px}
.exphoto figure{margin:0}
.exphoto img{width:100%;height:auto;border-radius:10px;border:1px solid var(--line);display:block}
.exphoto figcaption{font-family:ui-monospace,Menlo,monospace;font-size:10px;color:var(--mut);letter-spacing:.08em;text-transform:uppercase;margin-top:4px;text-align:center}
.figcap{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin:-4px 0 14px;font-family:ui-monospace,Menlo,monospace;font-size:10.5px;line-height:1.45;color:var(--mut);letter-spacing:.04em;text-transform:uppercase}
.figcap.one{grid-template-columns:1fr}
.figcap b{display:inline-block;width:14px;height:14px;border-radius:50%;background:#8a877f;color:#fff;font-size:9px;text-align:center;line-height:14px;margin-right:6px;vertical-align:1px}
.dosegrid{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.dose-pill{border:1px solid var(--line);border-radius:8px;padding:6px 11px;font-family:ui-monospace,Menlo,monospace;font-size:12px;font-weight:700}
.dose-pill small{display:block;font-size:9px;color:var(--dim);font-weight:600;letter-spacing:.1em;text-transform:uppercase}
#sheet p.desc{font-size:14.5px;margin-bottom:12px}
.cues{margin:0 0 12px 2px}
.cues li{list-style:none;padding:3px 0 3px 20px;position:relative;color:var(--mut);font-size:13.5px}
.cues li:before{content:"→";position:absolute;left:0;color:var(--ink);font-weight:700}
.subnote{background:var(--amberBg);border:1px solid #ecd9b3;border-radius:10px;padding:10px 12px;font-size:13px}
.chkbtn{cursor:pointer;border-radius:8px;margin:0 -8px;padding-left:8px;padding-right:8px}
.chkbtn:active{background:#f1efe9}
.btnrow{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 10px}
.pillbtn{border:1px solid var(--line);background:var(--card);border-radius:9px;padding:10px 16px;font-family:ui-monospace,Menlo,monospace;font-size:13px;font-weight:600;cursor:pointer;color:var(--ink)}
.pillbtn:active{background:#f1efe9}
.pillbtn.strong{background:var(--ink);color:#fff;border-color:var(--ink)}
.sessin{width:100%;padding:12px;border:1px solid var(--line);border-radius:9px;font-family:ui-monospace,Menlo,monospace;font-size:14px;margin:6px 0 10px;background:var(--card);color:var(--ink)}
.svgdefs{position:absolute;width:0;height:0;overflow:hidden}
</style>
</head>
<body>
<svg class="svgdefs" xmlns="http://www.w3.org/2000/svg">
__FIGS__
<defs>
<symbol id="st-g" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.2" fill="#e3f3ea" stroke="#1a9e5f" stroke-width="1.5"/><path d="M6.3 10.3l2.4 2.5 4.9-5.4" fill="none" stroke="#157a47" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="st-a" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.2" fill="#fbf1de" stroke="#d97706" stroke-width="1.5"/><path d="M10 2.6 a7.4 7.4 0 0 1 0 14.8 Z" fill="#d97706"/></symbol>
<symbol id="st-r" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.2" fill="#fbe9e9" stroke="#dc2626" stroke-width="1.5"/><path d="M7 7l6 6M13 7l-6 6" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="st-n" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.2" fill="none" stroke="#b8b4ac" stroke-width="1.5" stroke-dasharray="2.6 3"/></symbol>
<symbol id="x-squat" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="18" y1="42" x2="88" y2="42" stroke-width="6"/><circle cx="18" cy="42" r="6"/><circle cx="88" cy="42" r="6"/><circle cx="56" cy="26" r="7"/><path d="M54 34 L48 62 L72 70 L70 96"/><path d="M48 62 L44 92"/><path d="M52 44 L66 42"/></g></symbol>
<symbol id="x-hinge" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="84" cy="38" r="7"/><path d="M78 42 L46 58 L44 96"/><path d="M46 58 L58 96"/><path d="M64 50 L66 78"/><line x1="42" y1="80" x2="90" y2="80" stroke-width="6"/><circle cx="42" cy="80" r="6"/><circle cx="90" cy="80" r="6"/></g></symbol>
<symbol id="x-splitsquat" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><rect x="76" y="72" width="26" height="22" rx="3"/><circle cx="44" cy="22" r="7"/><path d="M44 30 L44 58"/><path d="M44 58 L28 66 L30 94"/><path d="M44 58 L66 66 L84 72"/><path d="M36 40 L30 58 M52 40 L58 58"/></g></symbol>
<symbol id="x-hipthrust" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><rect x="8" y="52" width="26" height="30" rx="3"/><circle cx="26" cy="38" r="7"/><path d="M34 46 L62 58 L84 58"/><path d="M84 58 L92 88"/><circle cx="62" cy="50" r="9" stroke-width="6"/></g></symbol>
<symbol id="x-deadbug" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="12" y1="92" x2="108" y2="92"/><circle cx="30" cy="80" r="7"/><path d="M38 82 L74 82"/><path d="M52 82 L52 52"/><path d="M74 82 L80 58 L96 52"/><path d="M66 82 L60 58"/></g></symbol>
<symbol id="x-sideplank" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="10" y1="94" x2="110" y2="94"/><circle cx="86" cy="52" r="7"/><path d="M80 58 L34 86 L14 94"/><path d="M64 68 L64 94"/><path d="M84 60 L84 78"/></g></symbol>
<symbol id="x-birddog" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="8" y1="94" x2="112" y2="94"/><circle cx="88" cy="46" r="7"/><path d="M82 52 L46 56"/><path d="M84 56 L84 94"/><path d="M52 56 L52 94"/><path d="M46 56 L12 48"/><path d="M82 56 L112 66"/></g></symbol>
<symbol id="x-chintuck" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="66" cy="40" r="12"/><path d="M66 54 L66 96"/><path d="M50 70 L82 70" stroke-width="4" opacity=".5"/><path d="M96 40 L78 40 M84 33 L78 40 L84 47"/></g></symbol>
<symbol id="x-wallslide" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="92" y1="10" x2="92" y2="110"/><circle cx="76" cy="34" r="7"/><path d="M78 42 L80 76 L64 96"/><path d="M80 76 L88 100"/><path d="M80 48 L88 30 L86 14"/></g></symbol>
<symbol id="x-stretch" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="8" y1="96" x2="100" y2="96"/><line x1="100" y1="30" x2="100" y2="96"/><circle cx="40" cy="34" r="7"/><path d="M42 42 L48 70"/><path d="M48 70 L26 76 L28 96"/><path d="M48 70 L76 82 L98 62"/></g></symbol>
<symbol id="x-stand" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="60" cy="22" r="7"/><path d="M60 30 L60 72"/><path d="M60 72 L48 100 M60 72 L72 100"/><path d="M60 40 L44 58 M60 40 L76 58"/><line x1="60" y1="8" x2="60" y2="112" stroke-width="2" opacity=".3" stroke-dasharray="4 5"/></g></symbol>
<symbol id="x-bench" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><rect x="18" y="72" width="84" height="10" rx="3"/><path d="M30 82 L26 100 M92 82 L96 100"/><circle cx="38" cy="62" r="7"/><path d="M46 66 L84 66"/><path d="M64 64 L64 36"/><line x1="40" y1="34" x2="88" y2="34" stroke-width="6"/><circle cx="40" cy="34" r="6"/><circle cx="88" cy="34" r="6"/></g></symbol>
<symbol id="x-ohp" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="60" cy="34" r="7"/><path d="M60 42 L60 80"/><path d="M60 80 L48 106 M60 80 L72 106"/><path d="M60 50 L42 38 L42 22 M60 50 L78 38 L78 22"/><path d="M34 22 L50 22 M70 22 L86 22" stroke-width="7"/></g></symbol>
<symbol id="x-dip" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="22" y1="40" x2="22" y2="104"/><line x1="98" y1="40" x2="98" y2="104"/><line x1="12" y1="40" x2="34" y2="40"/><line x1="86" y1="40" x2="110" y2="40"/><circle cx="60" cy="28" r="7"/><path d="M60 36 L58 66"/><path d="M56 42 L34 48 L24 40 M58 42 L84 48 L96 40"/><path d="M58 66 L50 92 L56 106"/></g></symbol>
<symbol id="x-latraise" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="60" cy="22" r="7"/><path d="M60 30 L60 74"/><path d="M60 74 L50 104 M60 74 L70 104"/><path d="M60 40 L26 44 M60 40 L94 44"/><path d="M20 38 L20 50 M100 38 L100 50" stroke-width="7"/></g></symbol>
<symbol id="x-curl" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="58" cy="22" r="7"/><path d="M58 30 L58 76"/><path d="M58 76 L48 104 M58 76 L68 104"/><path d="M58 42 L74 56 L76 34"/><path d="M70 28 L84 30" stroke-width="7"/></g></symbol>
<symbol id="x-triext" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="60" cy="30" r="7"/><path d="M60 38 L60 80"/><path d="M60 80 L50 106 M60 80 L70 106"/><path d="M60 46 L78 34 L78 14"/><path d="M70 12 L86 12" stroke-width="7"/></g></symbol>
<symbol id="x-yraise" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M14 92 L74 60" stroke-width="8" opacity=".45"/><circle cx="82" cy="42" r="7"/><path d="M76 48 L36 74"/><path d="M36 74 L26 96"/><path d="M74 50 L96 28 M66 56 L58 30"/></g></symbol>
<symbol id="x-pullup" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="16" y1="18" x2="104" y2="18" stroke-width="6"/><circle cx="60" cy="36" r="7"/><path d="M60 44 L60 74"/><path d="M60 50 L42 32 L42 18 M60 50 L78 32 L78 18"/><path d="M60 74 L50 96 L54 108 M60 74 L70 96 L66 108"/></g></symbol>
<symbol id="x-row" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="86" cy="34" r="7"/><path d="M80 40 L44 52 L42 96"/><path d="M44 52 L58 96"/><path d="M66 46 L64 66"/><line x1="42" y1="68" x2="88" y2="68" stroke-width="6"/><circle cx="42" cy="68" r="6"/><circle cx="88" cy="68" r="6"/></g></symbol>
<symbol id="x-reardelt" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M20 88 L78 58" stroke-width="8" opacity=".45"/><circle cx="84" cy="40" r="7"/><path d="M78 46 L40 70"/><path d="M40 70 L30 94"/><path d="M66 54 L92 62 M62 58 L34 44"/></g></symbol>
<symbol id="x-carry" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="58" cy="22" r="7"/><path d="M58 30 L58 72"/><path d="M58 72 L44 102 M58 72 L74 100"/><path d="M58 40 L80 52 L80 70"/><path d="M72 72 L88 72" stroke-width="7"/><path d="M58 40 L40 54"/></g></symbol>
<symbol id="x-run" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="72" cy="22" r="7"/><path d="M68 30 L56 58"/><path d="M56 58 L30 66 L22 88"/><path d="M56 58 L74 76 L70 102"/><path d="M62 40 L86 46 M64 38 L42 30"/><path d="M96 34 L108 34 M92 46 L106 46" stroke-width="3" opacity=".5"/></g></symbol>
<symbol id="x-jog" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="66" cy="24" r="7"/><path d="M64 32 L58 62"/><path d="M58 62 L40 76 L38 98"/><path d="M58 62 L72 80 L70 102"/><path d="M60 42 L78 50 M60 40 L44 38"/></g></symbol>
<symbol id="x-tennis" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><circle cx="52" cy="26" r="7"/><path d="M52 34 L54 66"/><path d="M54 66 L40 96 M54 66 L70 92"/><path d="M54 44 L78 34 L92 22"/><ellipse cx="98" cy="16" rx="10" ry="12" transform="rotate(35 98 16)"/><circle cx="30" cy="50" r="4" stroke-width="4"/></g></symbol>
<symbol id="x-rest" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path d="M74 24 a26 26 0 1 0 22 40 a22 22 0 0 1 -22 -40Z"/><path d="M34 30 L50 30 L34 46 L50 46" stroke-width="4"/></g></symbol>
<symbol id="x-hipswitch" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="10" y1="96" x2="110" y2="96"/><circle cx="46" cy="30" r="7"/><path d="M46 38 L48 68"/><path d="M48 68 L26 76 L40 88"/><path d="M48 68 L74 72 L64 88"/></g></symbol>
<symbol id="x-hamfloss" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="10" y1="94" x2="110" y2="94"/><circle cx="26" cy="82" r="7"/><path d="M34 84 L72 84"/><path d="M72 84 L84 46"/><path d="M86 40 L88 28" stroke-width="4" opacity=".5"/><path d="M52 84 L70 62"/><path d="M72 84 L98 88"/></g></symbol>
<symbol id="x-openbook" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="10" y1="94" x2="110" y2="94"/><circle cx="34" cy="60" r="7"/><path d="M40 64 L70 70 L90 84"/><path d="M70 70 L84 94"/><path d="M46 66 L64 44"/><path d="M64 44 a30 30 0 0 1 22 -12" stroke-width="3" opacity=".5" stroke-dasharray="4 5"/></g></symbol>
<symbol id="x-childpose" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><line x1="10" y1="96" x2="110" y2="96"/><circle cx="34" cy="70" r="7"/><path d="M40 76 L60 80 L84 84 L96 96"/><path d="M34 78 L18 84 L12 82"/><path d="M60 80 L64 96"/></g></symbol>
<symbol id="x-calf" viewBox="0 0 120 120"><g fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><rect x="48" y="90" width="38" height="9" rx="2"/><circle cx="64" cy="16" r="7"/><path d="M64 24 L64 60"/><path d="M64 60 L60 82 L58 90"/><path d="M64 60 L70 82 L72 90"/><path d="M64 34 L54 48"/><path d="M94 82 L94 62 M89 67 L94 62 L99 67"/></g></symbol>
</defs>
</svg>

<div class="wrap">
  <div class="lbl" id="hblk"></div>
  <h1>Daily Tracker</h1>
  <nav class="topnav" id="topnav"><a href="#todaycard">Oggi</a><a href="#posture-sec">Postura</a><a href="#stretch-sec">Stretching</a><a href="#sessions">Sessioni</a><a href="#zones-h">Zone</a><a href="#weeks-h">Settimane</a><a href="#skin-h">Skincare</a></nav>
  <div class="stats" id="stats"></div>
  <div class="bar"><i id="barfill"></i></div>
  <div class="barrow"><span class="lbl" id="barl"></span><span class="lbl" id="barr"></span></div>
  <div class="card todayc" id="todaycard"></div>
  <div class="callout" id="tennisline"></div>
  <div class="lbl" id="weeksec" style="margin:0 2px 6px">Questa settimana</div>
  <div class="wkstrip" id="wkstrip"></div>
  <div id="cal"></div>
  <div class="legend" id="legend"></div>
  <div class="sechead" id="plan-h">Il Piano</div>
  <div id="plansec"></div>
  <div class="sechead" id="zones-h">Zone cardiache</div>
  <div class="card tbl" id="zones"></div>
  <div class="sechead" id="weeks-h">Settimana per settimana</div>
  <div class="card" id="weeks" style="overflow:hidden"></div>
  <div class="sechead" id="skin-h">Skincare</div>
  <div class="card" id="skinsec" style="overflow:hidden"></div>
  <footer id="foot"></footer>
</div>

<div id="ovl"></div>
<div id="sheet"><div class="grab"></div><div id="sheetbody"></div></div>

<script>
const DATA = __DATA__;
const P = DATA.plan, DAYS = DATA.days, M = DATA.meta;
const $ = id => document.getElementById(id);
const MON = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
const WD = ["lun","mar","mer","gio","ven","sab","dom"];
const esc = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function d2(iso){ const [y,m,d] = iso.split("-").map(Number); return {y,m,d,wd:(new Date(y,m-1,d).getDay()+6)%7}; }
function fmtD(iso){ const t = d2(iso); return WD[t.wd] + " " + t.d + " " + MON[t.m-1]; }
function sess(k){ return P.sessions[k]; }
function icon(state, size){ // state: true/false/null or a status string
  const id = state === true || state === "green" ? "st-g"
    : state === false || state === "red" ? "st-r"
    : state === "amber" ? "st-a" : "st-n";
  return '<svg width="' + size + '" height="' + size + '"><use href="#' + id + '"/></svg>';
}

// ---------- header / stats / progress
$("hblk").textContent = P.title.toUpperCase() + " · " + fmtD(M.start).toUpperCase() + " → " + fmtD(M.end).toUpperCase();
$("stats").innerHTML =
  '<div class="stat"><b>' + (M.dayN || "—") + '<small> / ' + M.total + '</small></b><span class="lbl">giorno</span></div>' +
  '<div class="stat"><b>' + M.streak + '</b><span class="lbl">giorni di fila</span></div>' +
  '<div class="stat"><b>' + (M.adherence === null ? "—" : M.adherence + "%") + '</b><span class="lbl">aderenza</span></div>' +
  '<div class="stat"><b>' + (M.weekNow || "—") + '<small> / ' + M.nWeeks + '</small></b><span class="lbl">settimana</span></div>';
const pct = M.dayN ? Math.round(100 * M.dayN / M.total) : 0;
$("barfill").style.width = pct + "%";
$("barl").textContent = pct + "% del blocco";
const left = Math.max(0, Math.round((new Date(M.end) - new Date(M.today)) / 864e5));
$("barr").textContent = left + " giorni rimasti";

// ---------- tennis on top
$("tennisline").innerHTML = "<b>Tennis × " + (sess("T").perWeek || 2) + " a settimana</b> — i giorni variano, sta sopra la mappa. " +
  "Cade su un giorno di riposo o raddoppia con uno facile; registralo quando succede (“tennis: 1h lezione”).";

// ---------- today card
(function(){
  const t = DAYS[M.today], el = $("todaycard");
  if (!t || t.status === "pre") {
    const days = Math.round((new Date(M.start) - new Date(M.today)) / 864e5);
    el.innerHTML = '<div class="lbl">' + fmtD(M.today).toUpperCase() + '</div>' +
      '<div class="disp tname">Inizia ' + fmtD(M.start) + '</div>' +
      '<div class="wlab">' + (days > 0 ? days + (days > 1 ? " giorni" : " giorno") + " all'inizio. Prima la settimana di calibrazione — leggi il piano sotto." : "") + '</div>' +
      '<button class="linkbtn" onclick="daySheet(\'' + M.start + '\')">Giorno 1 →</button>';
    return;
  }
  const s = sess(t.s);
  el.innerHTML = '<div class="lbl">OGGI · ' + fmtD(M.today).toUpperCase() + ' · SETTIMANA ' + t.w + '</div>' +
    '<div class="disp tname">' + esc(s.name) + '</div>' +
    '<div class="wlab">' + esc(P.weeks[t.w-1].label) + '</div>' +
    (t.event ? '<div class="evline">★ ' + esc(t.event) + '</div>' : "") +
    t.checks.map(c => chkRow(M.today, c)).join("") +
    (s.exercises.length ? '<button class="linkbtn" onclick="sessSheet(\'' + t.s + '\')">Apri la sessione →</button>' : "");
})();

// ---------- week strip
$("wkstrip").innerHTML = M.thisWeek.map(iso => {
  const d = DAYS[iso], t = d2(iso);
  const short = d && d.s ? (sess(d.s).short || d.s) : "—";
  const ic = d && d.status !== "pre" && d.status !== "future" ? icon(d.status, 15) : icon(null, 15);
  return '<div class="wd' + (iso === M.today ? " todaywd" : "") + '" onclick="daySheet(\'' + iso + '\')">' +
    '<span class="lbl" style="letter-spacing:0">' + WD[t.wd][0] + '</span>' + ic +
    '<span class="sn">' + esc(short) + '</span></div>';
}).join("");

// ---------- calendar
// Calendar: three weeks by default (last, this, next) — the full block is a toggle,
// so weeks of pre-block grey don't bury the part that matters. Choice is remembered.
function dayCell(iso, dnum){
  const day = DAYS[iso];
  if (!day) return '<div class="cell blank"></div>';
  let cls = "cell", inner = '<span class="n">' + dnum + '</span>';
  if (day.status === "pre") { cls += " pre"; }
  else {
    if (day.status === "future") cls += " future";
    if (iso === M.today) cls += " today";
    inner += icon(day.status === "future" ? null : day.status, 14) +
      '<span class="sn">' + esc(sess(day.s).short || day.s) + '</span>';
  }
  const ev = day.event ? '<span class="ev">*</span>' : "";
  return '<div class="' + cls + '"' + (day.status === "pre" ? "" : ' onclick="daySheet(\'' + iso + '\')"') + '>' + ev + inner + '</div>';
}
function addDays(iso, n){ const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function monthsHTML(){
  return M.months.map(([y, m]) => {
    const first = (new Date(y, m-1, 1).getDay() + 6) % 7;
    const ndays = new Date(y, m, 0).getDate();
    let cells = Array(first).fill('<div class="cell blank"></div>');
    for (let d = 1; d <= ndays; d++)
      cells.push(dayCell(y + "-" + String(m).padStart(2,"0") + "-" + String(d).padStart(2,"0"), d));
    return '<div class="month"><h3>' + MON[m-1] + ' ' + y + '</h3>' +
      '<div class="dow">' + WD.map(w => "<div>" + w[0] + "</div>").join("") + '</div>' +
      '<div class="grid">' + cells.join("") + '</div></div>';
  }).join("");
}
function compactHTML(){
  const days = []; for (let i = -7; i < 14; i++) days.push(addDays(M.thisWeek[0], i));
  const a = days[0], b = days[20];
  const title = MON[+a.slice(5,7)-1] + (a.slice(5,7) === b.slice(5,7) ? "" : "–" + MON[+b.slice(5,7)-1]) + " " + b.slice(0,4);
  return '<div class="month"><h3>' + title + '</h3>' +
    '<div class="dow">' + WD.map(w => "<div>" + w[0] + "</div>").join("") + '</div>' +
    '<div class="grid">' + days.map(iso => dayCell(iso, +iso.slice(8))).join("") + '</div></div>';
}
let calFull = false;
try { calFull = localStorage.getItem("calFull") === "1"; } catch (e) {}
function renderCal(){
  $("cal").innerHTML = (calFull ? monthsHTML() : compactHTML()) +
    '<button class="linkbtn" onclick="toggleCal()">' + (calFull ? "Torna a tre settimane ▴" : "Mostra tutto il blocco ▾") + '</button>';
}
function toggleCal(){ calFull = !calFull; try { localStorage.setItem("calFull", calFull ? "1" : "0"); } catch (e) {} renderCal(); }
renderCal();
$("legend").innerHTML = '<span>' + icon("green",15) + 'tutto fatto</span><span>' + icon("amber",15) + 'in parte</span>' +
  '<span>' + icon("red",15) + 'niente</span><span>' + icon(null,15) + 'nessun dato — non è un fallimento</span>';

// ---------- plan section
function exRow(sk, i, ex){
  return '<div class="exrow" onclick="exSheet(\'' + sk + '\',' + i + ')">' +
    '<svg><use href="#x-' + ex.svg + '"/></svg>' +
    '<div class="nm">' + esc(ex.name) + '</div>' +
    '<div class="dose">' + esc(ex.sets) + '</div><span class="chev">›</span></div>';
}
(function(){
  let html = "";
  const routine = (key, r, tag) => '<div class="card sesscard" id="' + (key === "_P" ? "posture-sec" : "stretch-sec") + '"><div class="sesshead"><b>' + esc(r.name) + ' — ogni giorno</b>' +
    '<span class="dur">' + tag + '</span></div><div class="sessnote">' + esc(r.note) + '</div>' +
    r.items.map((ex, i) => exRow(key, i, {svg: ex.svg, name: ex.name, sets: ex.dose})).join("") + '</div>';
  html += routine("_P", P.posture, "AM");
  html += routine("_S", P.stretch, "PM");
  html += '<div id="sessions"></div>';
  for (const k of ["A","B","C","V","Z","T"]) {
    const s = sess(k);
    if (!s.exercises.length) continue;
    html += '<div class="card sesscard" style="border-left:3px solid ' + s.color + '">' +
      '<div class="sesshead"><b>' + esc(s.name) + '</b><span class="dur">' + esc(s.duration) + '</span></div>' +
      '<div class="sessnote">' + esc(s.note) + '</div>' +
      s.exercises.map((ex, i) => exRow(k, i, ex)).join("") + '</div>';
  }
  html += '<div class="card sesscard"><div class="sesshead"><b>' + esc(P.meditation.name) + ' — ogni giorno</b></div>' +
    '<div class="sessnote">' + esc(P.meditation.note) + '</div></div>';
  $("plansec").innerHTML = html;
})();

// ---------- zones + weeks + footer
$("zones").innerHTML = P.zones.map(z => '<div class="zrow"><div class="zl"><b>' + esc(z.name) + '</b><span>' + esc(z.note) + '</span></div><span class="rg">' + esc(z.range) + '</span></div>').join("");
$("weeks").innerHTML = P.weeks.map(w => {
  const cur = w.n === M.weekNow;
  return '<div class="wkrow' + (cur ? " cur" : "") + '"><b>Settimana ' + w.n + (cur ? " — ora" : "") + '</b><p>' + esc(w.label) + '</p></div>';
}).join("");
// ---------- skincare (reference only — no checks). Hidden entirely when the plan has none.
if (!P.skincare) {
  $("skin-h").remove(); $("skinsec").remove();
  const a = document.querySelector('#topnav a[href="#skin-h"]'); if (a) a.remove();
}
if (P.skincare) {
  const todayWd = d2(M.today).wd;
  $("skinsec").innerHTML = '<div class="sessnote" style="padding-top:12px">' + esc(P.skincare.note) + '</div>' +
    P.skincare.week.map((r, i) =>
      '<div class="wkrow' + (i === todayWd ? " cur" : "") + '"><b>' + esc(r.d) + (i === todayWd ? " — oggi" : "") + '</b>' +
      '<p><span class="lbl" style="letter-spacing:.08em">AM</span>&nbsp; ' + esc(r.am) + '<br>' +
      '<span class="lbl" style="letter-spacing:.08em">PM</span>&nbsp; ' + esc(r.pm) + '</p></div>').join("");
}

$("foot").innerHTML = 'Tutto nasce da <b>day.md</b> — una sezione “## data” per giorno. Scrivere l\'intestazione significa che il giorno ' +
  'è stato riportato: da lì in poi una voce mancante è un vero miss. Nessuna intestazione = grigio, e il grigio non è mai un fallimento — un ' +
  'log rotto non deve distruggere un record vero. Il tennis fluttua sopra la settimana; i giorni di riposo non devono nulla. Generato ' + esc(M.generated) + '.';

// ---------- top menu: highlight the section currently under it
(function(){
  const nav = $("topnav"), links = [...nav.querySelectorAll("a")];
  const targets = links.map(a => document.querySelector(a.getAttribute("href")));
  let ticking = false;
  function spy(){
    ticking = false;
    let cur = 0;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= 72) cur = i; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) cur = links.length - 1; // last section can't reach the top
    links.forEach((a, i) => a.classList.toggle("cur", i === cur));
    const a = links[cur];
    nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  spy();
})();

// ---------- sheets
const sheetStack = [];                                           // previous sheets, for ← Back
function renderSheet(html){
  const nav = '<div class="shnav">' +
    (sheetStack.length ? '<button class="navbtn" onclick="backSheet()">← Indietro</button>' : "") +
    '<button class="navbtn right" onclick="closeSheet()">Chiudi ✕</button></div>';
  $("sheetbody").innerHTML = nav + html;
  $("sheet").scrollTop = 0;
}
function openSheet(html){
  const open = $("sheet").classList.contains("on");
  if (open) sheetStack.push($("sheetbody").dataset.html); else sheetStack.length = 0;
  $("sheetbody").dataset.html = html;
  renderSheet(html);
  $("ovl").classList.add("on"); $("sheet").classList.add("on");
}
function backSheet(){
  if (!sheetStack.length) return closeSheet();
  const html = sheetStack.pop();
  $("sheetbody").dataset.html = html;
  renderSheet(html);
}
function closeSheet(){ sheetStack.length = 0; $("ovl").classList.remove("on"); $("sheet").classList.remove("on"); }
$("ovl").onclick = closeSheet;
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

// ---------- logging from the page (writes day.md via the server, then reloads)
function chkRow(iso, c){
  return '<div class="chk chkbtn" onclick="event.stopPropagation();tapCheck(\'' + iso + '\',\'' + c[3] + '\',' + (c[1] === true) + ')">' +
    icon(c[1], 19) + '<div><b>' + esc(c[0]) + '</b><span>' + esc(c[2]) + '</span></div></div>';
}
async function postLog(date, tag, value){
  try {
    const r = await fetch('/api/log', { method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({date, tag, value}) });
    if (!r.ok) throw new Error(await r.text());
    location.reload();
  } catch (e) {
    openSheet('<h3>Salvataggio fallito</h3><div class="sub">' + esc(e.message || e) +
      '</div><p class="desc">Il server è raggiungibile? Puoi sempre modificare day.md a mano.</p>');
  }
}
function tapCheck(iso, key, done){
  if (key === "session") return sessLogSheet(iso);
  return done ? postLog(iso, key, null) : postLog(iso, key, "yes");
}
function sessLogSheet(iso){
  const d = DAYS[iso], s = sess(d.s);
  const ex = d.checks.find(c => c[3] === "session");
  const existing = ex && ex[1] === true ? ex[2] : null;                 // e.g. "train: A — squat 95x8"
  const curTag = existing ? existing.split(":")[0].trim() : null;
  const tag = curTag || (s.kind === "lift" ? "train" : d.s === "V" ? "v" : d.s === "Z" ? "z2" : d.s === "T" ? "tennis" : "train");
  const prefill = existing ? existing.slice(existing.indexOf(":") + 1).trim()
    : (s.kind === "lift" ? d.s + " — " : "");
  openSheet('<h3>Registra la sessione</h3><div class="sub">' + fmtD(iso) + ' · in programma: ' + esc(s.name) + '</div>' +
    '<input class="sessin" id="sessin" value="' + esc(prefill) + '" placeholder="es. squat 95x8,8,8 · rdl 75x10,10,10">' +
    '<div class="btnrow"><button class="pillbtn strong" onclick="postLog(\'' + iso + '\',\'' + tag + '\',document.getElementById(\'sessin\').value.trim()||\'done\')">Salva</button>' +
    (existing ? '<button class="pillbtn" onclick="postLog(\'' + iso + '\',\'' + esc(curTag) + '\',null)">Rimuovi</button>' : '') + '</div>' +
    '<div class="sub" style="margin-top:8px">I carichi che scrivi qui sono la memoria della progressione — valgono i 20 secondi.</div>');
  setTimeout(() => { const i = $("sessin"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 260);
}

function daySheet(iso){
  const d = DAYS[iso];
  if (!d || d.status === "pre") return;
  const s = sess(d.s);
  let html = '<h3>' + fmtD(iso) + '</h3>' +
    '<div class="sub">Settimana ' + d.w + ' · ' + esc(P.weeks[d.w-1].label) + '</div>' +
    (d.event ? '<div class="evline">★ ' + esc(d.event) + '</div>' : "") +
    '<div style="display:flex;align-items:baseline;gap:8px;margin:2px 0 8px">' +
    '<b class="disp" style="font-size:17px">' + esc(s.name) + '</b>' +
    (s.duration !== "—" ? '<span class="lbl" style="margin-left:auto">' + esc(s.duration) + '</span>' : "") + '</div>';
  if (d.status === "future") {
    html += '<div class="sub">In programma.</div>';
  } else {
    html += d.checks.map(c => chkRow(iso, c)).join("");
    if (d.raw.length) html += '<div class="loglines"><div class="lbl" style="margin-bottom:4px">Registrato</div>' + d.raw.map(l => "<div>" + esc(l) + "</div>").join("") + '</div>';
  }
  if (s.exercises.length) html += '<button class="linkbtn" onclick="sessSheet(\'' + d.s + '\')">Apri la sessione →</button>';
  openSheet(html);
}

function sessSheet(k){
  const s = sess(k);
  openSheet('<h3>' + esc(s.name) + '</h3><div class="sub">' + esc(s.duration) + ' · ' + esc(s.note) + '</div>' +
    s.exercises.map((ex, i) => exRow(k, i, ex)).join(""));
}

function figCap(f){
  const c = (DATA.figcap || {})[f] || [];
  return '<div class="figcap' + (c.length === 1 ? ' one' : '') + '">' +
    c.map((t, i) => '<div>' + (c.length > 1 ? '<b>' + (i + 1) + '</b>' : '') + esc(t) + '</div>').join("") + '</div>';
}
function exSheet(k, i){
  const ex = k === "_P" ? P.posture.items[i] : k === "_S" ? P.stretch.items[i] : sess(k).exercises[i];
  const from = k === "_P" ? P.posture.name : k === "_S" ? P.stretch.name : sess(k).name;
  const dose = ex.sets || ex.dose;
  let pills = '<div class="dose-pill">' + esc(dose) + '<small>dose</small></div>';
  if (ex.rpe) pills += '<div class="dose-pill">' + esc(ex.rpe) + '<small>sforzo</small></div>';
  if (ex.rest) pills += '<div class="dose-pill">' + esc(ex.rest) + '<small>recupero</small></div>';
  let html = '<h3>' + esc(ex.name) + '</h3><div class="sub">' + esc(from) + '</div>' +
    (ex.img ? '<div class="exphoto"><figure><img src="/img/' + ex.img + '-0.jpg" alt=""><figcaption>1 · inizio</figcaption></figure>' +
              '<figure><img src="/img/' + ex.img + '-1.jpg" alt=""><figcaption>2 · fine</figcaption></figure></div>' + (ex.fig ? figCap(ex.fig) : "")
     : ex.fig ? '<div class="exbig fig"><svg viewBox="0 0 240 130"><use href="#fig-' + ex.fig + '"/></svg></div>' + figCap(ex.fig)
            : '<div class="exbig"><svg><use href="#x-' + ex.svg + '"/></svg></div>') +
    '<div class="dosegrid">' + pills + '</div>' +
    '<p class="desc">' + esc(ex.desc) + '</p>';
  if (ex.cues && ex.cues.length) html += '<ul class="cues">' + ex.cues.map(c => "<li>" + esc(c) + "</li>").join("") + '</ul>';
  if (ex.sub) html += '<div class="subnote"><b>Alternativa:</b> ' + esc(ex.sub) + '</div>';
  if (!/^(warm-up|cool-down|riscaldamento|defaticamento)$/i.test(ex.name)) html += '<a class="linkbtn" style="margin-top:12px" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=' +
    encodeURIComponent(ex.name + ' esercizio tutorial') + '">▶ Guarda una demo (YouTube) →</a>';
  openSheet(html);
}
</script>
</body>
</html>
"""


def render(data):
    data["figcap"] = CAPTIONS
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return TEMPLATE.replace("__DATA__", payload).replace("__FIGS__", MARKER + FIGURES)


def main():
    today_override = None
    if "--today" in sys.argv:  # testing/dev: grade as if it were this date
        today_override = sys.argv[sys.argv.index("--today") + 1]
    data = build(today_override)
    if "--json" in sys.argv:
        print(json.dumps(data, indent=2, ensure_ascii=False))
        return
    if "--html" in sys.argv:
        i = sys.argv.index("--html")
        out = sys.argv[i + 1] if len(sys.argv) > i + 1 else os.path.join(ROOT, "web", "index.html")
        html = render(data)
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"wrote {out} ({len(html)} bytes)")
        return
    for iso in sorted(data["days"]):
        d = data["days"][iso]
        if d["status"] in ("pre",):
            continue
        parts = ", ".join(f"{c[0]}={'✓' if c[1] else '✗' if c[1] is False else '·'}" for c in d["checks"])
        print(f"{iso}  wk{d['w']}  {d['s']}  {d['status']:<6}  {parts}")


if __name__ == "__main__":
    main()

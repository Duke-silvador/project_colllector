#!/usr/bin/env python3
"""Day Trader Dashboard: lokaler Server fuer die 11 trader-* Skills.

Nur Standardbibliothek. Hoert ausschliesslich auf 127.0.0.1.
Ruft die Skill-Skripte aus ./skills ueber eine feste Whitelist auf (keine Shell,
alle Parameter werden validiert). Das Dashboard platziert KEINE Orders und
zeichnet kein "Ja" auf: Bestellen geht nur im Claude-Chat mit /trader-broker.

Start:   python3 server.py            (live, Daten von Yahoo/SEC/Nasdaq/House Clerk)
         python3 server.py --demo     (offline mit den Beispieldaten vom 19.10.2026)
"""

import argparse
import datetime
import json
import math
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
SKILLS = os.path.join(HERE, "skills")
DEMO = os.path.join(HERE, "demo")
DEMO_NOW = "2026-10-19 10:15"

CFG = {"demo": False, "work": None, "port": 8765}
BUSY = set()
BUSY_LOCK = threading.Lock()


class Bad(Exception):
    """Ungueltiger Parameter."""


# ---------------------------------------------------------------- validators

SYM_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-]{0,9}$")
HHMM_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
YMD_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_RE = re.compile(r"^[A-Za-z0-9_.:\-]{1,64}$")
NAME_RE = re.compile(r"^[A-Za-z .'\-]{2,40}$")


def sym(v):
    v = str(v or "").strip().upper()
    if not SYM_RE.match(v):
        raise Bad("Ungueltiges Kuerzel: %r" % v)
    return v


def syms(v):
    return [sym(p) for p in re.split(r"[\s,;]+", str(v or "").strip()) if p]


def num(v, name, lo=None, hi=None):
    try:
        x = float(str(v).replace(",", "."))
    except (TypeError, ValueError):
        raise Bad("%s muss eine Zahl sein" % name)
    if not math.isfinite(x) or (lo is not None and x < lo) or (hi is not None and x > hi):
        raise Bad("%s ausserhalb des erlaubten Bereichs" % name)
    return x


def intg(v, name, lo=None, hi=None):
    return int(num(v, name, lo, hi))


def hhmm(v, name):
    v = str(v or "").strip()
    if not HHMM_RE.match(v):
        raise Bad("%s muss HH:MM sein" % name)
    return v


def ymd(v, name):
    v = str(v or "").strip()
    if not YMD_RE.match(v):
        raise Bad("%s muss JJJJ-MM-TT sein" % name)
    return v


def choice(v, opts, name):
    if v not in opts:
        raise Bad("%s: erlaubt sind %s" % (name, ", ".join(opts)))
    return v


def has(p, k):
    return p.get(k) not in (None, "", False)


def fmt(x):
    s = ("%.6f" % x).rstrip("0").rstrip(".")
    return s or "0"


def stop_rule(v):
    v = str(v or "or-mid").strip()
    if v in ("or-mid", "or-low"):
        return v
    m = re.match(r"^(price|pct|atr):([0-9]+(?:\.[0-9]+)?)$", v)
    if not m:
        raise Bad("Stop: or-mid, or-low, price:X, pct:X oder atr:K")
    return v


def target_rule(v):
    v = str(v or "2R").strip()
    if re.match(r"^[0-9]+(?:\.[0-9]+)?R$", v) or re.match(r"^price:[0-9]+(?:\.[0-9]+)?$", v):
        return v
    raise Bad("Ziel: 2R, 1R, 1.5R oder price:X")


# ------------------------------------------------------------------- actions
# Jede Aktion liefert (ordner, skript, argumente, timeout_s).

ACTIONS = {}


def action(name):
    def deco(fn):
        ACTIONS[name] = fn
        return fn
    return deco


def demo_now(args):
    if CFG["demo"]:
        args += ["--now", DEMO_NOW]
    return args


def sec_agent():
    if CFG["demo"]:
        return ["--user-agent", "Demo demo@example.com"]
    cfg = read_json("config.json") or {}
    ua = str(cfg.get("sec_user_agent") or "")
    if ua and "you@example.com" not in ua and "@" in ua:
        return ["--user-agent", ua]
    return []


@action("universe")
def a_universe(p):
    a = ["universe"]
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "symdir")]
    return "trader-scanner", "scan.py", a, 300


def _scan_common(p, a):
    if has(p, "symbols"):
        a += ["--symbols", ",".join(syms(p["symbols"]))]
    if has(p, "limit"):
        a += ["--limit", str(intg(p["limit"], "Limit", 1, 10000))]
    if has(p, "min_price"):
        a += ["--min-price", fmt(num(p["min_price"], "Mindestpreis", 0, 100000))]
    if has(p, "min_volume"):
        a += ["--min-volume", str(intg(p["min_volume"], "Mindestvolumen", 0, 10 ** 12))]
    return a


@action("scan_daily")
def a_scan_daily(p):
    a = _scan_common(p, ["daily", "--json"])
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "scan-daily.json"), "--now", "2026-10-19 09:00", "--min-price", "0"]
    return "trader-scanner", "scan.py", a, 1800


@action("scan_orb")
def a_scan_orb(p):
    a = _scan_common(p, ["orb", "--json"])
    if has(p, "at"):
        a += ["--at", hhmm(p["at"], "Uhrzeit")]
    if has(p, "or_minutes"):
        a += ["--or-minutes", str(intg(p["or_minutes"], "Opening Range", 1, 120))]
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "scan-orb.json.gz"), "--now", DEMO_NOW, "--min-price", "0"]
    return "trader-scanner", "scan.py", a, 1800


@action("news")
def a_news(p):
    a = ["--json"]
    if has(p, "tickers"):
        a += ["--tickers"] + syms(p["tickers"])
    if has(p, "hours"):
        a += ["--hours", str(intg(p["hours"], "Stunden", 1, 720))]
    if has(p, "all"):
        a.append("--all")
    if has(p, "no_sec"):
        a.append("--no-sec")
    a += sec_agent()
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "news"), "--now", DEMO_NOW, "--dry-run"]
    return "trader-news", "news.py", a, 300


def _entry_args(p, a):
    if has(p, "setup"):
        a += ["--setup", choice(p["setup"], ("orb", "level"), "Setup")]
    if has(p, "or_minutes"):
        a += ["--or-minutes", str(intg(p["or_minutes"], "Opening Range", 1, 120))]
    if has(p, "interval"):
        a += ["--interval", choice(p["interval"], ("5m", "1m"), "Intervall")]
    if has(p, "level"):
        a += ["--level", fmt(num(p["level"], "Level", 0.0001, 10 ** 7))]
    if has(p, "min_volume_x"):
        a += ["--min-volume-x", fmt(num(p["min_volume_x"], "Volumen-Faktor", 0, 1000))]
    return a


@action("entry_check")
def a_entry_check(p):
    a = _entry_args(p, ["check", sym(p.get("symbol")), "--write", "--json"])
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "entry-TSLA.json"), "--now", DEMO_NOW]
    return "trader-entry", "entry.py", a, 120


@action("entry_watchlist")
def a_entry_watchlist(p):
    a = _entry_args(p, ["watchlist", "--json"])
    if CFG["demo"]:
        raise Bad("Demo-Modus: Watchlist-Pruefung braucht Live-Daten (die Demo hat nur TSLA)")
    return "trader-entry", "entry.py", a, 900


@action("exit_plan")
def a_exit_plan(p):
    a = ["plan", "--write", "--json", "--stop", stop_rule(p.get("stop")), "--target", target_rule(p.get("target"))]
    if has(p, "flat_by"):
        a += ["--flat-by", hhmm(p["flat_by"], "Flat-by")]
    if has(p, "symbol"):
        # manueller Plan ohne entry.json
        a += ["--symbol", sym(p["symbol"]), "--entry", fmt(num(p.get("entry"), "Einstieg", 0.0001, 10 ** 7))]
        if has(p, "or_high"):
            a += ["--or-high", fmt(num(p["or_high"], "OR-Hoch", 0.0001, 10 ** 7))]
        if has(p, "or_low"):
            a += ["--or-low", fmt(num(p["or_low"], "OR-Tief", 0.0001, 10 ** 7))]
        if has(p, "date"):
            a += ["--date", ymd(p["date"], "Datum")]
    else:
        a += ["--from", "trader/entry.json"]
        if has(p, "entry"):
            a += ["--entry", fmt(num(p["entry"], "Einstieg", 0.0001, 10 ** 7))]
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "entry-TSLA.json"), "--now", DEMO_NOW]
    return "trader-exit", "exit.py", a, 120


@action("timemachine")
def a_timemachine(p):
    a = ["run", "--write", "--json"]
    if has(p, "replays"):
        a += ["--replays", str(intg(p["replays"], "Replays", 100, 100000))]
    if has(p, "seed"):
        a += ["--seed", str(intg(p["seed"], "Seed", 0, 10 ** 9))]
    if has(p, "window"):
        a += ["--window", str(intg(p["window"], "Fenster", 0, 30))]
    if has(p, "until"):
        a += ["--until", hhmm(p["until"], "Bis")]
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "timemachine-TSLA.json.gz"), "--now", DEMO_NOW]
    return "trader-timemachine", "timemachine.py", a, 600


@action("budget")
def a_budget(p):
    a = ["--write", "--json"]
    if has(p, "budget"):
        a += ["--budget", fmt(num(p["budget"], "Budget", 1, 10 ** 9))]
    if has(p, "limit"):
        a.append("--limit")
        if has(p, "limit_price"):
            a.append(fmt(num(p["limit_price"], "Limit-Preis", 0.0001, 10 ** 7)))
    return "trader-budget", "size.py", demo_now(a), 60


@action("risk")
def a_risk(p):
    return "trader-risk", "check.py", demo_now(["--json"]), 60


@action("ticket_show")
def a_ticket_show(p):
    return "trader-broker", "ticket.py", demo_now(["show", "--json"]), 60


@action("ticket_log")
def a_ticket_log(p):
    return "trader-broker", "ticket.py", demo_now(["log"]), 60


@action("alerts_clock")
def a_alerts_clock(p):
    return "trader-alerts", "alerts.py", demo_now(["clock", "--json"]), 30


@action("alerts_quote")
def a_alerts_quote(p):
    a = ["quote", "--json", "--write"]
    if has(p, "holdings"):
        a.append("--holdings")
    a += syms(p.get("symbols"))
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "alerts")]
    return "trader-alerts", "alerts.py", demo_now(a), 120


@action("alerts_check")
def a_alerts_check(p):
    a = ["check", "--json"]
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "alerts")]
    return "trader-alerts", "alerts.py", demo_now(a), 120


@action("alerts_add")
def a_alerts_add(p):
    kind = choice(p.get("kind"), ("above", "below", "stop", "target", "pct", "opening_bell", "at", "from_plan"), "Art")
    a = ["add"]
    if kind == "from_plan":
        a.append("--from-plan")
    elif kind == "opening_bell":
        a.append("--opening-bell")
    elif kind == "at":
        a += ["--at", hhmm(p.get("value"), "Uhrzeit")]
        if has(p, "label"):
            a += ["--label", str(p["label"])[:60].replace("\n", " ")]
    else:
        a += ["--symbol", sym(p.get("symbol"))]
        v = num(p.get("value"), "Wert", 0.0001, 10 ** 7)
        a += ["--" + kind, fmt(v)]
        if kind == "pct" and has(p, "direction"):
            a += ["--direction", choice(p["direction"], ("up", "down"), "Richtung")]
    if has(p, "note"):
        a += ["--note", str(p["note"])[:120].replace("\n", " ")]
    if has(p, "rearm"):
        a.append("--rearm")
    return "trader-alerts", "alerts.py", a, 30


@action("alerts_reset")
def a_alerts_reset(p):
    rid = str(p.get("id") or "")
    if not ID_RE.match(rid):
        raise Bad("Ungueltige Regel-ID")
    return "trader-alerts", "alerts.py", ["reset", rid], 30


@action("analyst")
def a_analyst(p):
    t = syms(p.get("tickers"))
    if not t:
        raise Bad("Mindestens ein Kuerzel angeben")
    a = ["--json"]
    if has(p, "quarters"):
        a += ["--quarters", str(intg(p["quarters"], "Quartale", 1, 20))]
    a += sec_agent()
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "analyst")]
    return "trader-analyst", "facts.py", a + t, 300


def _member(v):
    v = str(v or "").strip()
    if v and not NAME_RE.match(v):
        raise Bad("Ungueltiger Name")
    return v


@action("pelosi_index")
def a_pelosi_index(p):
    a = ["index", "--json"]
    m = _member(p.get("member") or "Pelosi")
    a += ["--member", m]
    if has(p, "since"):
        a += ["--since", ymd(p["since"], "Seit")]
    a += ["--limit", str(intg(p.get("limit") or 20, "Limit", 1, 200))]
    if has(p, "year"):
        a += ["--year", str(intg(p["year"], "Jahr", 2012, 2100))]
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "pelosi-2026FD.zip")]
    return "trader-pelosi", "ptr.py", a, 300


@action("pelosi_new")
def a_pelosi_new(p):
    a = ["new", "--json", "--dry-run"] if not has(p, "mark_seen") else ["new", "--json"]
    a += ["--member", _member(p.get("member") or "Pelosi")]
    if has(p, "since"):
        a += ["--since", ymd(p["since"], "Seit")]
    if has(p, "read"):
        a.append("--read")
    if has(p, "tickers"):
        a += ["--tickers"] + syms(p["tickers"])
    if CFG["demo"]:
        a += ["--offline", os.path.join(DEMO, "pelosi-2026FD.zip"), "--today", "2026-10-19"]
    return "trader-pelosi", "ptr.py", a, 600


# ------------------------------------------------------------------ plumbing

def trader_path(rel):
    return os.path.join(CFG["work"], "trader", rel)


def read_json(rel):
    try:
        with open(trader_path(rel), encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def write_json(rel, data):
    path = trader_path(rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    os.replace(tmp, path)


def run_action(name, params):
    if name not in ACTIONS:
        raise Bad("Unbekannte Aktion: %s" % name)
    folder, script, args, timeout = ACTIONS[name](params)
    path = os.path.join(SKILLS, folder, script)
    argv = [sys.executable, "-I", path] + args
    shown = " ".join([script] + [a if re.match(r"^[\w.:,/\-+]+$", a) else repr(a) for a in args])
    with BUSY_LOCK:
        if name in BUSY:
            raise Bad("Diese Aktion laeuft bereits")
        BUSY.add(name)
    started = time.time()
    try:
        proc = subprocess.run(argv, cwd=CFG["work"], capture_output=True, text=True, timeout=timeout,
                              env=dict(os.environ, PYTHONIOENCODING="utf-8"))
        out, err, code = proc.stdout, proc.stderr, proc.returncode
    except subprocess.TimeoutExpired:
        out, err, code = "", "Zeitlimit von %d s ueberschritten" % timeout, 124
    finally:
        with BUSY_LOCK:
            BUSY.discard(name)
    parsed = None
    if out.strip()[:1] in "[{":
        try:
            parsed = json.loads(out)
        except ValueError:
            parsed = None
    cap = 400000
    # Exit 1 ist bei den Skills oft ein Status ("nichts Neues", "Markt zu", "keine Eintraege"), kein Fehler.
    ok = code == 0 or (code == 1 and not err.strip() and (parsed is not None or bool(out.strip())))
    return {"ok": ok, "code": code, "action": name, "cmd": shown, "ms": int((time.time() - started) * 1000),
            "json": parsed, "stdout": out[:cap] if parsed is None else "", "stderr": err[:20000]}


STATE_FILES = {
    "config": "config.json", "watchlist": "watchlist.json", "entry": "entry.json", "plan": "plan.json",
    "timemachine": "timemachine.json", "orders": "orders.json", "risk": "state/risk.json",
    "alerts": "alerts.json", "alerts_state": "state/alerts.json", "prices": "prices.json",
    "portfolio": "portfolio.json", "broker": "state/broker.json",
}


def build_state():
    files = {}
    for key, rel in STATE_FILES.items():
        path = trader_path(rel)
        data = read_json(rel)
        if data is None:
            continue
        if key == "timemachine" and isinstance(data.get("mc"), dict):
            data["mc"].pop("sample_paths", None)
        files[key] = {"data": data, "mtime": int(os.path.getmtime(path))}
    return {"mode": "demo" if CFG["demo"] else "live", "demo_now": DEMO_NOW if CFG["demo"] else None,
            "server_time": datetime.datetime.now(datetime.timezone.utc).isoformat(), "files": files,
            "busy": sorted(BUSY), "actions": sorted(ACTIONS)}


CONFIG_NUM = {  # key: (min, max)
    "budget": (1, 10 ** 9), "cash_buffer_pct": (0, 100), "max_position_pct": (1, 100),
    "max_order_usd": (1, 10 ** 9), "min_order_usd": (0, 10 ** 6), "max_loss_per_trade_usd": (0.01, 10 ** 8),
    "max_daily_loss_usd": (0.01, 10 ** 8), "max_trades_per_day": (1, 100), "max_orders_per_day": (1, 500),
    "min_reward_risk": (0, 20),
}
CONFIG_TIME = ("no_entries_before", "no_entries_after", "flat_by")


def save_config(patch):
    cfg = read_json("config.json") or {}
    for k, (lo, hi) in CONFIG_NUM.items():
        if k in patch and patch[k] not in (None, ""):
            x = num(patch[k], k, lo, hi)
            cfg[k] = int(x) if k.startswith("max_trades") or k.startswith("max_orders") else x
    for k in CONFIG_TIME:
        if k in patch and patch[k] not in (None, ""):
            cfg[k] = hhmm(patch[k], k)
    if "blocked" in patch:
        cfg["blocked"] = syms(patch["blocked"]) if isinstance(patch["blocked"], str) else [sym(x) for x in patch["blocked"]]
    if "sec_user_agent" in patch:
        ua = str(patch["sec_user_agent"] or "").strip()
        if len(ua) > 100 or "\n" in ua or "\r" in ua:
            raise Bad("SEC-User-Agent: max. 100 Zeichen, eine Zeile")
        cfg["sec_user_agent"] = ua
    # paper, broker, allow_* usw. werden hier bewusst NICHT geaendert (config.json von Hand).
    write_json("config.json", cfg)
    return cfg


def remove_alert(rid):
    if not ID_RE.match(rid or ""):
        raise Bad("Ungueltige Regel-ID")
    data = read_json("alerts.json") or {"rules": []}
    before = len(data.get("rules", []))
    data["rules"] = [r for r in data.get("rules", []) if r.get("id") != rid]
    if len(data["rules"]) == before:
        raise Bad("Regel nicht gefunden")
    write_json("alerts.json", data)
    st = read_json("state/alerts.json")
    if isinstance(st, dict):
        for key in ("rang", "fired", "rung"):
            if isinstance(st.get(key), dict):
                st[key].pop(rid, None)
            elif isinstance(st.get(key), list) and rid in st[key]:
                st[key].remove(rid)
        write_json("state/alerts.json", st)


def prepare_workspace():
    work = os.path.join(HERE, "workspace-demo" if CFG["demo"] else "workspace")
    CFG["work"] = work
    os.makedirs(os.path.join(work, "trader", "state"), exist_ok=True)
    cfg = os.path.join(work, "trader", "config.json")
    if not os.path.exists(cfg):
        shutil.copy(os.path.join(SKILLS, "trader-budget", "config.example.json"), cfg)


class Handler(BaseHTTPRequestHandler):
    server_version = "TraderDashboard/1.0"

    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json; charset=utf-8"):
        raw = body if isinstance(body, bytes) else body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(raw)

    def _json(self, code, obj):
        self._send(code, json.dumps(obj, ensure_ascii=False, default=str))

    def _guard(self):
        host = (self.headers.get("Host") or "").lower()
        ok = {"127.0.0.1:%d" % CFG["port"], "localhost:%d" % CFG["port"]}
        if host not in ok:
            self._json(403, {"error": "Host nicht erlaubt"})
            return False
        return True

    def do_GET(self):
        if not self._guard():
            return
        path = self.path.split("?")[0]
        if path in ("/", "/index.html"):
            with open(os.path.join(HERE, "index.html"), "rb") as fh:
                self._send(200, fh.read(), "text/html; charset=utf-8")
        elif path == "/api/state":
            self._json(200, build_state())
        elif path == "/favicon.ico":
            self._send(204, b"", "image/x-icon")
        else:
            self._json(404, {"error": "nicht gefunden"})

    def do_POST(self):
        if not self._guard():
            return
        if self.headers.get("X-Requested-With") != "dash":
            self._json(403, {"error": "Header fehlt"})
            return
        try:
            n = int(self.headers.get("Content-Length") or 0)
            body = json.loads(self.rfile.read(min(n, 100000)) or b"{}")
            if not isinstance(body, dict):
                raise Bad("JSON-Objekt erwartet")
            path = self.path.split("?")[0]
            if path == "/api/run":
                self._json(200, run_action(str(body.get("action")), body.get("params") or {}))
            elif path == "/api/config":
                self._json(200, {"ok": True, "config": save_config(body)})
            elif path == "/api/alerts/remove":
                remove_alert(str(body.get("id")))
                self._json(200, {"ok": True})
            else:
                self._json(404, {"error": "nicht gefunden"})
        except Bad as exc:
            self._json(400, {"ok": False, "error": str(exc)})
        except ValueError:
            self._json(400, {"ok": False, "error": "Ungueltiges JSON"})
        except Exception as exc:  # pragma: no cover
            self._json(500, {"ok": False, "error": "%s: %s" % (type(exc).__name__, exc)})


def main():
    ap = argparse.ArgumentParser(description="Day Trader Dashboard")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--demo", action="store_true", help="offline mit den Beispieldaten (19.10.2026, TSLA)")
    ap.add_argument("--no-browser", action="store_true")
    a = ap.parse_args()
    CFG["demo"], CFG["port"] = a.demo, a.port
    prepare_workspace()
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), Handler)
    url = "http://127.0.0.1:%d/" % a.port
    print("Day Trader Dashboard (%s) laeuft auf %s" % ("DEMO" if a.demo else "LIVE", url))
    print("Daten liegen in %s" % os.path.join(CFG["work"], "trader"))
    print("Beenden mit Strg+C. Orders werden hier nie gesendet: dafuer /trader-broker im Claude-Chat.")
    if not a.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nBeendet.")


if __name__ == "__main__":
    main()

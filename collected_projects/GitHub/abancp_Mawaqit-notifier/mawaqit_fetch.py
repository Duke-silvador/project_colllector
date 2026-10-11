#!/usr/bin/env python3
"""Fetch today's prayer (Adhan) and Iqamah times from a Mawaqit mosque page
and cache them as JSON for prayer_notify.py to read.

If internet is unavailable today, it automatically falls back to yesterday's
cached times so you never miss prayers.
"""
import argparse
import json
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

CONFIG_FILE = Path.home() / ".config" / "mawaqit-notify" / "config.json"
CACHE_DIR = Path.home() / ".cache" / "mawaqit-notify"
TODAY_FILE = CACHE_DIR / "today.json"
YESTERDAY_FILE = CACHE_DIR / "yesterday.json"

DEFAULT_MOSQUE_URL = "https://mawaqit.net/en/islamic-culture-centre-thiruvananthapuram-695016-india"
PRAYER_KEYS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/125.0 Safari/537.36"
    )
}


def load_config() -> dict:
    try:
        return json.loads(CONFIG_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def fetch_html(url: str) -> str:
    req = Request(url, headers=HEADERS)
    with urlopen(req, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def extract_conf_data(html: str) -> dict:
    marker = "confData = "
    start = html.find(marker)
    if start == -1:
        raise RuntimeError("confData not found on page")
    start += len(marker)
    depth = 0
    end = None
    for i, ch in enumerate(html[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise RuntimeError("could not find end of confData JSON")
    return json.loads(html[start:end])


def widget_url_to_canonical(url: str) -> str:
    return url.replace("/en/m/", "/en/").replace("/fr/m/", "/fr/")


def fetch_conf_data(url: str) -> dict:
    try:
        return extract_conf_data(fetch_html(url))
    except RuntimeError:
        canonical = widget_url_to_canonical(url)
        if canonical == url:
            raise
        return extract_conf_data(fetch_html(canonical))


def today_index():
    d = date.today()
    return d.month - 1, d.day


def get_month_day_entry(block, month_idx: int, day: int):
    month = block[month_idx]
    if isinstance(month, dict):
        return month.get(str(day))
    return month[day - 1]


def add_minutes(hhmm: str, minutes: int) -> str:
    h, m = map(int, hhmm.split(":"))
    total = (h * 60 + m + minutes) % (24 * 60)
    return f"{total // 60:02d}:{total % 60:02d}"


def get_today_adhan(conf: dict) -> list:
    times = conf.get("times")
    if times and len(times) >= 5:
        return list(times[:5])
    calendar = conf.get("calendar")
    if calendar:
        month_idx, day = today_index()
        entry = get_month_day_entry(calendar, month_idx, day)
        if entry:
            return list(entry[:5])
    raise RuntimeError("could not determine adhan times from confData")


def resolve_iqama_entry(entry, adhan_times: list) -> list:
    resolved = []
    for i, val in enumerate(entry[:5]):
        s = str(val).strip()
        if ":" in s:
            resolved.append(s)
        else:
            minutes = int(s.replace("+", "") or 0)
            resolved.append(add_minutes(adhan_times[i], minutes))
    return resolved


def get_today_iqama(conf: dict, adhan_times: list) -> list:
    iqama_cal = conf.get("iqamaCalendar")
    if iqama_cal:
        try:
            month_idx, day = today_index()
            entry = get_month_day_entry(iqama_cal, month_idx, day)
            if entry:
                return resolve_iqama_entry(entry, adhan_times)
        except (IndexError, KeyError, TypeError):
            pass

    iqama = conf.get("iqama")
    if isinstance(iqama, dict):
        offset_keys = ["fajr", "dhuhr", "asr", "maghrib", "isha"]
        if all(k in iqama for k in offset_keys):
            offsets = [int(iqama.get(k) or 0) for k in offset_keys]
            return [add_minutes(t, o) for t, o in zip(adhan_times, offsets)]

    raise RuntimeError(
        "could not determine iqama times from confData; run with --dump "
        "to inspect the raw object and adjust get_today_iqama()"
    )


def build_today_payload(conf: dict) -> dict:
    adhan_times = get_today_adhan(conf)
    iqama_times = get_today_iqama(conf, adhan_times)
    return {
        "date": date.today().isoformat(),
        "mosque": conf.get("name", "mosque"),
        "adhan": dict(zip(PRAYER_KEYS, adhan_times)),
        "iqama": dict(zip(PRAYER_KEYS, iqama_times)),
        "shuruq": conf.get("shuruq"),
        "fetched_at": datetime.now().astimezone().isoformat(),
        "offline_fallback": False,
    }


def notify_system(title: str, message: str) -> None:
    subprocess.run(
        ["notify-send", "-u", "normal", "-a", "Mawaqit",
         "--hint=string:sound-name:message-new-instant",
         title, message],
        check=False,
    )


def backup_to_yesterday_if_old(new_date: str) -> None:
    """Save existing today.json as yesterday.json before overwriting if it is from an older date."""
    if TODAY_FILE.exists():
        try:
            old_data = json.loads(TODAY_FILE.read_text())
            if old_data.get("date") != new_date:
                YESTERDAY_FILE.parent.mkdir(parents=True, exist_ok=True)
                YESTERDAY_FILE.write_text(json.dumps(old_data, indent=2, ensure_ascii=False))
        except Exception:
            pass


def fallback_to_yesterday() -> dict | None:
    """If internet is unavailable, load yesterday's cache and adapt for today."""
    source_candidate = None
    data = None

    if YESTERDAY_FILE.exists():
        try:
            data = json.loads(YESTERDAY_FILE.read_text())
            source_candidate = "yesterday.json"
        except Exception:
            data = None

    if not data and TODAY_FILE.exists():
        try:
            data = json.loads(TODAY_FILE.read_text())
            source_candidate = "today.json (previous cache)"
        except Exception:
            data = None

    if data and "adhan" in data and "iqama" in data:
        data["date"] = date.today().isoformat()
        data["offline_fallback"] = True
        data["fallback_source"] = source_candidate
        data["fetched_at"] = datetime.now().astimezone().isoformat()

        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        TODAY_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        return data

    return None


def main():
    parser = argparse.ArgumentParser(description="Fetch daily Mawaqit prayer times")
    parser.add_argument("--url", help="mosque page URL, overrides config.json")
    parser.add_argument("--dump", action="store_true",
                        help="print the raw confData JSON and exit")
    args = parser.parse_args()

    config = load_config()
    mosque_url = args.url or config.get("mosque_url", DEFAULT_MOSQUE_URL)

    conf = None
    fetch_err = None

    try:
        conf = fetch_conf_data(mosque_url)
    except (URLError, HTTPError, OSError, RuntimeError, Exception) as exc:
        fetch_err = exc

    if fetch_err or not conf:
        print(f"Internet or fetch failed: {fetch_err}. Attempting offline fallback...", file=sys.stderr)
        fallback = fallback_to_yesterday()
        if fallback:
            notify_system(
                "Mawaqit Offline Mode",
                "Internet unavailable today. Using yesterday's prayer times."
            )
            print("Successfully loaded offline fallback from yesterday's times:")
            print(json.dumps(fallback, indent=2, ensure_ascii=False))
            sys.exit(0)
        else:
            notify_system(
                "Mawaqit Update Failed",
                f"Fetch failed and no previous cache available: {fetch_err}"
            )
            print(f"error: {fetch_err}", file=sys.stderr)
            sys.exit(1)

    if args.dump:
        json.dump(conf, sys.stdout, indent=2, ensure_ascii=False)
        return

    try:
        payload = build_today_payload(conf)
    except RuntimeError as exc:
        print(f"Parsing confData failed: {exc}. Attempting offline fallback...", file=sys.stderr)
        fallback = fallback_to_yesterday()
        if fallback:
            notify_system(
                "Mawaqit Offline Mode",
                "Could not parse new schedule. Using yesterday's prayer times."
            )
            sys.exit(0)
        notify_system("Mawaqit Update Failed", str(exc))
        print(f"error: {exc}", file=sys.stderr)
        sys.exit(1)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    backup_to_yesterday_if_old(payload["date"])
    TODAY_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

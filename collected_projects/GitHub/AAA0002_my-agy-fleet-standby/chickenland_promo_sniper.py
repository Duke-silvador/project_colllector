#!/usr/bin/env python3
"""
chickenland_promo_sniper.py
=============================================================================
CHICKEN LAND ULTRA-FAST FLEET PROMO CODE SNIPER & AUTO-REINVEST ENGINE
=============================================================================
Monitors https://t.me/ChickenLandCodes (@ChickenLandCodes) for drops of
limited-user promo codes and redeems them concurrently across all fleet accounts
in sub-second bursts via aiohttp.

Key Features:
- Sub-second parallel async redemption across all fleet accounts (~300-500ms)
- Programmatic channel extraction from https://t.me/s/ChickenLandCodes
- Deduplication & persistent state via Upstash Redis (chickenland:claimed_codes)
- Autonomous flock reinvestment: automatically buys hens when balance >= 1000
- Instant Telegram notifications to Admin Vault (@myagyai / REPORT_CHAT_ID)
- Cloud-native: zero phone load, designed to run 24/7 on Render Node 2
=============================================================================
"""

import os
import sys
import json
import time
import re
import asyncio
import aiohttp
import urllib.parse
import urllib.request
import base64
from typing import Dict, Any, List, Set, Optional

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

# Constants & Configuration
CHANNEL_URL = "https://t.me/s/ChickenLandCodes"
RPC_URL = "https://app8968434282.tgcloud.ai/api/rpc"
UPSTASH_URL = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""
REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN") or os.getenv("ADMIN_BOT_TOKEN") or ""
REPORT_CHAT_ID = os.getenv("REPORT_CHAT_ID") or "6727787768"

USER_AGENT = "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
SCRAPER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

# Helpers for Redis
def redis_command(cmd: str, *args) -> Any:
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return None
    url = f"{UPSTASH_URL.rstrip('/')}/{cmd}/" + "/".join(urllib.parse.quote(str(a), safe='') for a in args)
    req = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("result")
    except Exception:
        return None

def is_code_seen(code: str) -> bool:
    res = redis_command("SISMEMBER", "chickenland:seen_codes", code)
    if res == 1:
        return True
    return False

def is_code_claimed(code: str) -> bool:
    res = redis_command("SISMEMBER", "chickenland:claimed_codes", code)
    if res == 1:
        return True
    return False

def mark_code_seen(code: str):
    redis_command("SADD", "chickenland:seen_codes", code)

def mark_code_claimed(code: str):
    redis_command("SADD", "chickenland:claimed_codes", code)

def send_telegram_alert(text: str):
    if not REPORT_BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
    targets = [REPORT_CHAT_ID]
    notif_channel = os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")
    if notif_channel:
        targets.append(notif_channel)
    for tid in targets:
        payload = {
            "chat_id": tid,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        try:
            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=5)
        except Exception as e:
            print(f"[Telegram Alert Error]: {e}", file=sys.stderr)

def get_b64_token(init_data: str) -> str:
    if init_data.startswith("TMA "):
        return init_data[4:].strip()
    if "%3D" in init_data or "query_id=" in init_data or "user=" in init_data:
        decoded = urllib.parse.unquote(init_data) if "%3D" in init_data else init_data
        return base64.b64encode(decoded.encode("utf-8")).decode("utf-8")
    return init_data.strip()

def load_fleet_tokens() -> Dict[str, Dict[str, Any]]:
    tokens_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fleet_miniapp_tokens.json")
    accs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accounts.json")
    
    fleet = {}
    names = {}
    if os.path.exists(accs_path):
        try:
            with open(accs_path, "r", encoding="utf-8") as f:
                for acc in json.load(f):
                    uid = str(acc.get("user_id", ""))
                    if uid:
                        names[uid] = acc.get("name", f"Account {uid}")
        except Exception:
            pass

    # Always prioritize Upstash Redis for ground-truth 21-account fleet tokens
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            req = urllib.request.Request(f"{UPSTASH_URL}/get/miniapp_tokens", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                res = data.get("result")
                if res:
                    tok_map = json.loads(res) if isinstance(res, str) else res
                    for uid, toks in tok_map.items():
                        tok = toks.get("chickenland_init_data") if isinstance(toks, dict) else None
                        if tok:
                            fleet[str(uid)] = {
                                "user_id": str(uid),
                                "name": names.get(str(uid), f"User {uid}"),
                                "b64_token": get_b64_token(tok)
                            }
        except Exception:
            pass

    # Local fallback if Upstash unavailable
    if not fleet and os.path.exists(tokens_path):
        try:
            with open(tokens_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for uid, toks in data.items():
                    tok = toks.get("chickenland_init_data")
                    if tok and str(uid) not in fleet:
                        fleet[str(uid)] = {
                            "user_id": str(uid),
                            "name": names.get(str(uid), f"User {uid}"),
                            "b64_token": get_b64_token(tok)
                        }
        except Exception:
            pass
            
    return fleet

async def redeem_single_account(
    session: aiohttp.ClientSession,
    account: Dict[str, Any],
    code: str,
    auto_buy_hens: bool = True
) -> Dict[str, Any]:
    b64 = account["b64_token"]
    uid = account["user_id"]
    name = account["name"]

    # Pre-check: skip immediately if this account already claimed this code
    if uid:
        try:
            if redis_command("SISMEMBER", f"chickenland:claimed:{uid}", code) == 1:
                return {
                    "uid": uid,
                    "name": name,
                    "ok": False,
                    "coins": 0,
                    "code_status": "ALREADY_CLAIMED_CACHED",
                    "latency_ms": 0,
                    "hen_bought": False
                }
        except Exception:
            pass
    
    headers = {
        "Authorization": f"TMA {b64}",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT
    }
    
    payload = {
        "method": "POST",
        "path": "/api/promo",
        "body": {"code": code}
    }
    
    t0 = time.time()
    result = {
        "uid": uid,
        "name": name,
        "ok": False,
        "coins": 0,
        "code_status": "UNKNOWN",
        "latency_ms": 0,
        "hen_bought": False
    }
    
    try:
        async with session.post(RPC_URL, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
            data = await resp.json()
            result["latency_ms"] = int((time.time() - t0) * 1000)
            
            if data.get("ok"):
                res = data.get("result", {})
                coins = res.get("coins", 0)
                result["ok"] = True
                result["coins"] = coins
                result["code_status"] = "SUCCESS"
                
                # Check if we can buy a hen with accumulated coins
                if auto_buy_hens and res.get("user"):
                    user = res["user"]
                    total_coins = user.get("coins", 0)
                    if total_coins >= 1000:
                        buy_payload = {
                            "method": "POST",
                            "path": "/api/buy",
                            "body": {"breed": "basic", "n": int(total_coins // 1000)}
                        }
                        try:
                            async with session.post(RPC_URL, json=buy_payload, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as b_resp:
                                b_data = await b_resp.json()
                                if b_data.get("ok"):
                                    result["hen_bought"] = True
                        except Exception:
                            pass
            else:
                params = data.get("parameters", {})
                result["code_status"] = params.get("code") or data.get("description", "ERROR")
    except Exception as e:
        result["latency_ms"] = int((time.time() - t0) * 1000)
        result["code_status"] = f"TIMEOUT/ERR: {str(e)[:30]}"
        
    return result

async def snipe_promo_fleet(
    code: str,
    fleet: Optional[Dict[str, Dict[str, Any]]] = None,
    auto_buy_hens: bool = True,
    send_alert: bool = False
) -> Dict[str, Any]:
    code = code.strip().upper()
    if not fleet:
        fleet = load_fleet_tokens()
        
    if not fleet:
        return {"ok": False, "description": "No fleet tokens available"}
        
    connector = aiohttp.TCPConnector(limit=50, keepalive_timeout=30)
    async with aiohttp.ClientSession(connector=connector) as session:
        t_start = time.time()
        tasks = [
            redeem_single_account(session, acc, code, auto_buy_hens=auto_buy_hens)
            for acc in fleet.values()
        ]
        results = await asyncio.gather(*tasks)
        total_time = time.time() - t_start
        
    successful = [r for r in results if r["ok"]]
    total_coins = sum(r["coins"] for r in successful)
    hens_bought = sum(1 for r in results if r.get("hen_bought"))
    
    report = {
        "code": code,
        "total_accounts": len(fleet),
        "claimed_count": len(successful),
        "total_coins": total_coins,
        "hens_bought": hens_bought,
        "burst_time_sec": round(total_time, 3),
        "details": results
    }
    
    # Mark code in Redis
    mark_code_seen(code)
    if successful:
        mark_code_claimed(code)
        for r in successful:
            s_uid = r.get("uid")
            if s_uid:
                redis_command("SADD", f"chickenland:claimed:{s_uid}", code)

    # Also record accounts that returned 'already claimed' so they skip on future cycles
    for r in results:
        s_uid = r.get("uid")
        stat_desc = str(r.get("code_status", "")).lower()
        if s_uid and ("already" in stat_desc or "claimed" in stat_desc):
            redis_command("SADD", f"chickenland:claimed:{s_uid}", code)
        
        # Per user directive: Completely silent operation - do not send promo code broadcast alerts to Telegram
        if False and send_alert:
            alert_msg = (
                f"⚡ <b>CHICKEN LAND PROMO CODE SNIPED!</b> 🐔\n\n"
                f"🎟 <b>Code:</b> <code>{code}</code>\n"
                f"💰 <b>Coins Claimed:</b> +{total_coins:,} Coins total\n"
                f"👥 <b>Fleet Success:</b> {len(successful)}/{len(fleet)} accounts\n"
                f"⏱ <b>Burst Latency:</b> {report['burst_time_sec']}s\n"
            )
            if hens_bought > 0:
                alert_msg += f"🐣 <b>Autonomous Expansion:</b> {hens_bought} new hens purchased!\n"
            send_telegram_alert(alert_msg)
        
    return report

def fetch_channel_codes() -> List[Dict[str, Any]]:
    """
    Scrapes https://t.me/s/ChickenLandCodes to extract promo codes and claim status.
    Multi-stage extraction:
    1. Extracts post IDs from channel page.
    2. Deeply inspects og:description on latest individual message endpoints
       (e.g. /24, /25) to bypass Telegram's 'message_media_not_supported' preview gate
       caused by inline keyboard buttons.
    3. Scrapes visible tgme_widget_message_text for older standard posts.
    Returns list of {'code': str, 'is_exhausted': bool, 'post_id': Optional[int], 'raw_snippet': str}.
    """
    req = urllib.request.Request(
        CHANNEL_URL,
        headers={"User-Agent": SCRAPER_UA}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8")
    except Exception as e:
        print(f"[Channel Scrape Error]: {e}", file=sys.stderr)
        return []

    post_ids = set(int(m) for m in re.findall(r'ChickenLandCodes/(\d+)', html))
    sorted_pids = sorted(list(post_ids))
    found_codes = {}

    # 1. Deep inspect recent individual post endpoints (bypasses inline button media-not-supported gate)
    for pid in reversed(sorted_pids[-8:]):
        p_url = f"https://t.me/ChickenLandCodes/{pid}"
        try:
            p_req = urllib.request.Request(p_url, headers={"User-Agent": SCRAPER_UA})
            with urllib.request.urlopen(p_req, timeout=4) as p_resp:
                p_html = p_resp.read().decode("utf-8")
                m = re.search(r'<meta property=[\"\']og:description[\"\'] content=[\"\']([^\"\']+)[\"\']', p_html)
                if m:
                    desc = m.group(1)
                    c_match = re.search(r'<code>([A-Z0-9]{6,16})</code>|👉\s*([A-Z0-9]{6,16})\s*👈|CL[A-Z0-9]{8}', desc)
                    if c_match:
                        code = (c_match.group(1) or c_match.group(2) or c_match.group(0)).strip().upper()
                        is_claimed = ("ALL CLAIMED" in desc or "❌" in desc)
                        if code not in found_codes:
                            found_codes[code] = {
                                "code": code,
                                "is_exhausted": is_claimed,
                                "post_id": pid,
                                "raw_snippet": desc[:80].replace("\n", " ")
                            }
        except Exception:
            pass

    # 2. Scrape visible message text in channel HTML for older standard posts
    pattern = r'<div class=\"tgme_widget_message_text[^>]*>(.*?)</div>'
    messages = re.findall(pattern, html, re.DOTALL)
    for msg in messages:
        code_match = re.search(r'<code>([A-Z0-9]{6,16})</code>|👉\s*([A-Z0-9]{6,16})\s*👈|CL[A-Z0-9]{8}', msg)
        if code_match:
            code = (code_match.group(1) or code_match.group(2) or code_match.group(0)).strip().upper()
            is_claimed = ("ALL CLAIMED" in msg or "❌" in msg)
            clean_text = re.sub(r'<[^>]+>', ' ', msg).strip()
            if code not in found_codes:
                found_codes[code] = {
                    "code": code,
                    "is_exhausted": is_claimed,
                    "post_id": None,
                    "raw_snippet": clean_text[:80].replace("\n", " ")
                }

    return list(found_codes.values())

async def watch_and_snipe_daemon(poll_interval: int = 10):
    """
    Continuous cloud watcher loop.
    Polls the channel every poll_interval seconds, extracts unexhausted codes,
    and triggers instant parallel redemption.
    """
    print(f"🐔 Chicken Land Promo Code Sniper Daemon started (polling every {poll_interval}s)...")
    fleet = load_fleet_tokens()
    print(f"Loaded {len(fleet)} accounts from fleet.")
    
    seen_in_memory: Set[str] = set()
    
    # Pre-populate known codes & immediately snipe any unexhausted ones
    initial_codes = fetch_channel_codes()
    for item in initial_codes:
        code = item["code"]
        is_exhausted = item["is_exhausted"]
        if is_exhausted:
            seen_in_memory.add(code)
            mark_code_seen(code)
        else:
            if not is_code_claimed(code):
                print(f"🔥 ACTIVE PROMO CODE FOUND ON STARTUP: {code}! LAUNCHING PARALLEL FLEET BURST...")
                report = await snipe_promo_fleet(code)
                print(f"✅ Startup burst: {report['claimed_count']}/{report['total_accounts']} claimed, +{report['total_coins']} coins")
            seen_in_memory.add(code)
            mark_code_seen(code)
    print(f"Initial setup: {len(seen_in_memory)} historical codes analyzed.")

    while True:
        try:
            codes_in_channel = fetch_channel_codes()
            for item in codes_in_channel:
                code = item["code"]
                is_exhausted = item["is_exhausted"]

                # Check if newly discovered or unexhausted and unclaimed
                if (code not in seen_in_memory and not is_code_seen(code)) or (not is_exhausted and not is_code_claimed(code)):
                    seen_in_memory.add(code)
                    if is_exhausted:
                        print(f"ℹ️ Found historic exhausted code {code}, skipping.")
                        mark_code_seen(code)
                        continue

                    print(f"🔥 NEW PROMO CODE DETECTED: {code}! LAUNCHING PARALLEL FLEET BURST...")
                    report = await snipe_promo_fleet(code)
                    print(f"✅ Burst complete: {report['claimed_count']}/{report['total_accounts']} claimed, +{report['total_coins']} coins in {report['burst_time_sec']}s")
            
        except Exception as e:
            print(f"[Watcher Error]: {e}", file=sys.stderr)
            
        await asyncio.sleep(poll_interval)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Chicken Land Fleet Promo Code Sniper")
    parser.add_argument("--code", type=str, help="Immediately snipe a specific promo code across all accounts")
    parser.add_argument("--check", action="store_true", help="Check channel and snipe any active codes once")
    parser.add_argument("--watch", action="store_true", help="Run 24/7 background watcher loop")
    parser.add_argument("--interval", type=int, default=10, help="Polling interval in seconds for --watch")
    args = parser.parse_args()
    
    if args.code:
        print(f"🚀 Sniping code: {args.code} across fleet...")
        rep = asyncio.run(snipe_promo_fleet(args.code))
        print(json.dumps(rep, indent=2))
    elif args.check:
        print("🔍 Checking channel for active promo codes...")
        codes = fetch_channel_codes()
        print(f"Found {len(codes)} codes in channel feed:")
        for c in codes:
            status = "❌ Exhausted" if c['is_exhausted'] else "🔥 ACTIVE"
            print(f"  • {c['code']} ({status})")
    elif args.watch:
        asyncio.run(watch_and_snipe_daemon(poll_interval=args.interval))
    else:
        # Default: check and report status
        codes = fetch_channel_codes()
        print(f"Chicken Land Promo Sniper Ready. Fleet accounts: {len(load_fleet_tokens())}")
        print(f"Channel {CHANNEL_URL} contains {len(codes)} promo codes.")
        for c in codes[-5:]:
            print(f"  - {c['code']}: {'EXHAUSTED' if c['is_exhausted'] else 'ACTIVE'}")

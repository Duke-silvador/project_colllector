#!/usr/bin/env python3
"""
MY AGY AI — 100% Cloud MRG Auto-Farming & Turnstile Solver Engine
Runs 100% in Cloud (GitHub Actions / Cloud VMs) — Zero Phone Load.

Solves Cloudflare Turnstile invisibly using Patchright Chromium stealth,
refreshes `humanVerifiedUntil` pass across all 20 accounts,
claims accumulated mining rewards, and compounds miner levels.
"""

import os
import sys
import json
import time
import random
import struct
import hashlib
import base64
import asyncio
import aiohttp
import logging
import urllib.parse
import urllib.request
from datetime import datetime, timezone

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("mrg_turnstile_solver")

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

UPSTASH_URL = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""
ALERT_BOT_TOKEN = os.getenv("ALERT_BOT_TOKEN") or ""
OWNER_ID = os.getenv("OWNER_ID") or "6727787768"
BACKUP_CHANNEL = os.getenv("BACKUP_CHANNEL") or os.getenv("REPORT_CHAT_ID") or "-1004453515167"
CAPSOLVER_KEY = os.getenv("CAPSOLVER_KEY") or ""
TWOCAPTCHA_KEY = os.getenv("TWOCAPTCHA_KEY") or ""

SITE_KEY = "0x4AAAAAAFI-XXL7bFNbLU_J"
APP_ORIGIN = "https://app.mrgtoken.xyz"
API_BASE = "https://mrg.up.railway.app"

VICTORS_SITEKEY = "0x4AAAAAAFD0KRgPRFVwDvgn"
VICTORS_ORIGIN = "https://app.victors.company"
VICTORS_API = "https://server.victors.company/api"
VICTORS_REF = "ref_A20AA96F18"

ATF_SITEKEY = "0x4AAAAAAEbiOQ5xhVRMXGgt"
ATF_ORIGIN = "https://atfminers.asloni.online"
ATF_API = "https://atfminers.asloni.online/miner/index.php"

PEPE_ORIGIN = "https://app.miniempire.app"
PEPE_API = "https://app.miniempire.app/miniapp"

ADX_ORIGIN = "https://app.adxearnai.xyz"
ADX_API = "https://api.adxearnai.xyz/api"

DIGGO_ORIGIN = "https://diggo.linkpc.net"
DIGGO_API = "https://diggo.linkpc.net/api"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FLEET_TON_WALLETS_FILE = os.path.join(BASE_DIR, "fleet_ton_wallets.json")

def load_fleet_ton_wallets() -> dict:
    if os.path.exists(FLEET_TON_WALLETS_FILE):
        try:
            with open(FLEET_TON_WALLETS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    return data
        except Exception:
            pass
    # Fallback to Upstash Redis for 100% cloud environments (GitHub Actions, VMs)
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/fleet:wallets:ton",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                return json.loads(res) if isinstance(res, str) else res
    except Exception as e:
        logger.warning(f"Error fetching ton wallets from Upstash Redis: {e}")
    return {}


_VERIFIED_MRG_PROXIES = []

def get_webshare_proxy() -> dict | None:
    """
    Fetches an active high-speed elite proxy (Webshare or elite residential/datacenter pool)
    to bypass Cloudflare WAF datacenter rate limits in GitHub Actions and cloud runners.
    Returns None if direct runner connection is preferred.
    """
    global _VERIFIED_MRG_PROXIES
    if _VERIFIED_MRG_PROXIES:
        random.shuffle(_VERIFIED_MRG_PROXIES)
        return _VERIFIED_MRG_PROXIES[0]

    env_keys = []
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    if "=" in line and "WEBSHARE_KEY" in line:
                        _, v = line.strip().split("=", 1)
                        clean_v = v.strip("\"' ")
                        if clean_v:
                            env_keys.append(clean_v)
        except Exception:
            pass

    webshare_keys = [
        os.getenv("WEBSHARE_KEY_3") or "",
        os.getenv("WEBSHARE_KEY_2") or "",
        os.getenv("WEBSHARE_KEY") or "",
        os.getenv("WEBSHARE_KEY_1") or "",
        *env_keys
    ]
    seen_keys = set()
    candidate_proxies = []
    for key in webshare_keys:
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
        try:
            req = urllib.request.Request(
                "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=10",
                headers={"Authorization": f"Token {key}"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode())
                results = [p for p in data.get("results", []) if p.get("valid", True)]
                candidate_proxies.extend(results)
        except Exception as e:
            logger.warning(f"Webshare proxy fetch warning ({key[:8]}...): {e}")

    if candidate_proxies:
        random.shuffle(candidate_proxies)
        for candidate in candidate_proxies:
            u = candidate.get("username", "Arif2743")
            pw = candidate.get("password", "Arif2743")
            host = candidate["proxy_address"]
            port = candidate["port"]
            proxy_str = f"http://{u}:{pw}@{host}:{port}"
            try:
                ph = urllib.request.ProxyHandler({"http": proxy_str, "https": proxy_str})
                opener = urllib.request.build_opener(ph)
                test_req = urllib.request.Request(
                    "https://challenges.cloudflare.com/turnstile/v0/api.js",
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"}
                )
                with opener.open(test_req, timeout=5) as test_resp:
                    if test_resp.status == 200:
                        verified = {
                            "server": f"http://{host}:{port}",
                            "username": u,
                            "password": pw
                        }
                        if verified not in _VERIFIED_MRG_PROXIES:
                            _VERIFIED_MRG_PROXIES.append(verified)
                        logger.info(f"🌐 Verified live Webshare proxy: {host}:{port} ({candidate.get('country_code', 'US')})")
                        if len(_VERIFIED_MRG_PROXIES) >= 4:
                            break
            except Exception:
                continue

    if _VERIFIED_MRG_PROXIES:
        return _VERIFIED_MRG_PROXIES[0]

    logger.info("🌐 Webshare proxies unavailable or quota exhausted. Using direct high-speed cloud connection.")
    return None


ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")

def load_all_fleet_uids() -> list:
    """Dynamically discovers all fleet UIDs from accounts.json, Upstash Redis, or cloud sync without hardcoded limits."""
    # 1. Local accounts.json
    if os.path.exists(ACCOUNTS_FILE):
        try:
            with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
                accs = json.load(f)
                uids = [int(a.get("user_id") or a.get("account_id") or a.get("id")) for a in accs if (a.get("user_id") or a.get("account_id") or a.get("id"))]
                if uids:
                    return uids
        except Exception:
            pass

    # 2. Dynamic discovery from Upstash Redis fleet:tokens:*
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            req = urllib.request.Request(
                f"{UPSTASH_URL}/keys/fleet:tokens:*",
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
            )
            with urllib.request.urlopen(req, timeout=5) as r:
                d = json.loads(r.read().decode())
                keys = d.get("result", [])
                uids = sorted(list(set(int(k.split(":")[-1]) for k in keys if k.split(":")[-1].isdigit())))
                if uids:
                    return uids
        except Exception:
            pass

        # 3. Dynamic discovery from fleet:accounts
        try:
            req = urllib.request.Request(
                f"{UPSTASH_URL}/get/fleet:accounts",
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
            )
            with urllib.request.urlopen(req, timeout=5) as r:
                d = json.loads(r.read().decode())
                raw = d.get("result")
                if raw:
                    accs = json.loads(raw) if isinstance(raw, str) else raw
                    uids = [int(a["user_id"]) for a in accs if isinstance(a, dict) and a.get("user_id")]
                    if uids:
                        return uids
        except Exception:
            pass

    # 4. Fallback roster
    return [
        6727787768, 8881914294, 7648254021, 8826375659, 8450010161,
        8782429452, 7734849205, 8025472383, 8851426148, 8203342513,
        8190649727, 7487048946, 8741547543, 8727040932, 7749125802,
        7954290138, 8841038141, 8975442879, 8937908003, 8609131528,
        8669217201
    ]

FLEET_UIDS = load_all_fleet_uids()


def send_tg_alert(text: str):
    """Sends notification to Owner, Backup channel, and AAA Admin notification channel."""
    if not ALERT_BOT_TOKEN:
        return
    targets = [t for t in [OWNER_ID, BACKUP_CHANNEL, os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")] if t]
    for chat_id in targets:
        try:
            url = f"https://api.telegram.org/bot{ALERT_BOT_TOKEN}/sendMessage"
            payload = json.dumps({
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            logger.warning(f"Telegram notification warning for {chat_id}: {e}")


def load_all_miniapp_tokens() -> dict:
    """Fetch miniapp_tokens master dictionary from Upstash Redis."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/miniapp_tokens",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                parsed = json.loads(res) if isinstance(res, str) else res
                while isinstance(parsed, str):
                    parsed = json.loads(parsed)
                return parsed if isinstance(parsed, dict) else {}
    except Exception as e:
        logger.warning(f"Error fetching miniapp_tokens: {e}")
    return {}


def get_token_from_upstash(uid: int, miniapp_cache: dict = None) -> dict:
    """Fetch tokens from Upstash Redis REST, falling back to miniapp_tokens."""
    res_dict = {}
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/fleet:tokens:{uid}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                parsed = json.loads(res) if isinstance(res, str) else res
                while isinstance(parsed, str):
                    parsed = json.loads(parsed)
                if isinstance(parsed, dict):
                    res_dict = parsed
    except Exception:
        pass

    if isinstance(miniapp_cache, dict) and str(uid) in miniapp_cache:
        m_entry = miniapp_cache[str(uid)]
        if isinstance(m_entry, dict):
            for k, v in m_entry.items():
                if k not in res_dict or not res_dict[k]:
                    res_dict[k] = v
    return res_dict


def safe_post(url: str, json_data: dict, extra_headers: dict = None) -> tuple:
    """Synchronous POST request wrapper."""
    headers = {
        "Content-Type": "application/json",
        "Origin": APP_ORIGIN,
        "Referer": f"{APP_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
    }
    if extra_headers:
        headers.update(extra_headers)

    data_bytes = json.dumps(json_data).encode("utf-8")
    req = urllib.request.Request(url, data=data_bytes, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as he:
        try:
            body = json.loads(he.read().decode())
            return he.code, body
        except Exception:
            return he.code, {"error": str(he)}
    except Exception as e:
        return 0, {"error": str(e)}


def safe_get(url: str, extra_headers: dict = None) -> tuple:
    """Synchronous GET request wrapper."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
    }
    if extra_headers:
        headers.update(extra_headers)

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as he:
        try:
            body = json.loads(he.read().decode())
            return he.code, body
        except Exception:
            return he.code, {"error": str(he)}
    except Exception as e:
        return 0, {"error": str(e)}


def check_account_status(init_data: str) -> dict:
    """Queries /api/user/me to inspect human pass and balances."""
    status_code, body = safe_post(f"{API_BASE}/api/user/me", {"initData": init_data})
    if status_code == 200 and isinstance(body, dict):
        user = body.get("user", {})
        return {
            "success": True,
            "inAppBalance": float(user.get("inAppBalance") or 0),
            "tonWalletBalance": float(user.get("tonWalletBalance") or 0),
            "unclaimed": float(user.get("unclaimedMiningBalance") or 0),
            "humanVerifiedUntil": user.get("humanVerifiedUntil"),
            "manualUnlockedLevel": int(user.get("manualUnlockedLevel") or 1),
            "peakLevel": int(user.get("peakLevel") or 1),
            "isVerified": user.get("isVerified", False),
            "isTonConnected": user.get("isTonConnected", False),
            "tonWalletAddress": user.get("tonWalletAddress", ""),
            "referrerId": user.get("referrerId"),
            "isQualified": user.get("isQualified", False),
            "tasks": body.get("tasks", []),
            "completedTaskIds": body.get("completedTaskIds", [])
        }
    return {"success": False, "error": body.get("error", "Unknown error")}


def is_human_pass_active(human_verified_until: str) -> bool:
    """Returns True if human pass is active with at least 45 minutes remaining."""
    if not human_verified_until:
        return False
    try:
        dt = datetime.fromisoformat(human_verified_until.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff_seconds = (dt - now).total_seconds()
        return diff_seconds > 2700  # More than 45 minutes remaining
    except Exception:
        return False


def claim_mining_reward(init_data: str, turnstile_token: str = None) -> dict:
    """Calls /api/user/claim-mining."""
    payload = {
        "initData": init_data,
        "deviceInfo": {
            "model": "SM-S928B",
            "ram": 12,
            "cores": 8,
            "screen": "1440x3120",
            "language": "en-US"
        }
    }
    if turnstile_token:
        payload["turnstileToken"] = turnstile_token

    status_code, body = safe_post(f"{API_BASE}/api/user/claim-mining", payload)
    return body


def verify_human_token(init_data: str, turnstile_token: str) -> dict:
    """Calls /api/user/verify-human."""
    payload = {
        "initData": init_data,
        "turnstileToken": turnstile_token
    }
    status_code, body = safe_post(f"{API_BASE}/api/user/verify-human", payload)
    return body


def auto_unlock_mrg_level(init_data: str, current_level: int, balance: float):
    """Auto-unlocks MRG levels up to 203 if balance allows."""
    if balance < 100:
        return current_level

    def wp_calc(e):
        if e <= 0: return 0
        if e == 1: return 100
        if e <= 203: return round(100 + 9900 * (((e - 1) / 202.0) ** 1.8))
        return 10000

    lo, hi, target_lvl = 1, 203, current_level
    while lo <= hi:
        mid = (lo + hi) // 2
        if balance >= wp_calc(mid):
            target_lvl = mid
            lo = mid + 1
        else:
            hi = mid - 1

    if target_lvl > current_level:
        logger.info(f"⬆️ Upgrading miner level from {current_level} to {target_lvl}...")
        safe_post(f"{API_BASE}/api/user/unlock-level", {"initData": init_data, "level": target_lvl})
        return target_lvl
    return current_level


async def solve_turnstile_for_account(browser, acc_info: dict) -> bool:
    """
    Opens app.mrgtoken.xyz with account's actual Telegram initData in stealth browser.
    Allows the app to mount the Turnstile component, solve it, and invoke verify-human.
    """
    uid = acc_info["uid"]
    m_init = acc_info["init_data"]

    # 0. Fast pre-check: solve via Turnstile API if solver credentials available
    api_tok = solve_turnstile_via_api(SITE_KEY, APP_ORIGIN, action="verify-human")
    if api_tok:
        logger.info(f"⚡ UID {uid}: Turnstile solved via API: {api_tok[:16]}...")
        ver_res = verify_human_token(m_init, api_tok)
        if ver_res.get("success"):
            claim_mining_reward(m_init, api_tok)
            safe_post(f"{API_BASE}/api/user/daily-checkin", {"initData": m_init, "turnstileToken": api_tok})
            save_mrg_pass_to_upstash(uid, api_tok)
            return True

    ws_proxy = get_webshare_proxy() if os.getenv("USE_BROWSER_PROXY", "1") != "0" else None
    context_kwargs = {
        "bypass_csp": True,
        "user_agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
        "viewport": {"width": 412, "height": 915},
        "is_mobile": True,
        "has_touch": True,
        "locale": "en-US",
        "timezone_id": "UTC"
    }
    if ws_proxy:
        context_kwargs["proxy"] = ws_proxy
    context = await browser.new_context(**context_kwargs)

    page = await context.new_page()

    # Always strictly URL-encode initData inside tgWebAppData hash to prevent & delimiter truncation
    target_url = (
        f"{APP_ORIGIN}/#tgWebAppData={urllib.parse.quote(m_init, safe='')}"
        f"&tgWebAppPlatform=android"
        f"&tgWebAppVersion=8.0"
        f"&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%2318181b%22%2C%22text_color%22%3A%22%23ffffff%22%7D"
    )

    json_m_init = json.dumps(m_init)

    await page.add_init_script(f"""
        // Anti-fingerprinting consistency (matches SM-S928B Android user agent)
        try {{
            Object.defineProperty(navigator, 'platform', {{ get: () => 'Linux armv8l' }});
            if (navigator.userAgentData) {{
                Object.defineProperty(navigator.userAgentData, 'mobile', {{ get: () => true }});
                Object.defineProperty(navigator.userAgentData, 'platform', {{ get: () => 'Android' }});
            }}
        }} catch(e) {{}}

        // 0. Pre-fill sessionStorage so telegram-web-app.js SDK initializes full initData
        try {{
            sessionStorage.setItem('__telegram__initParams', JSON.stringify({{
                tgWebAppData: {json_m_init},
                tgWebAppPlatform: 'android',
                tgWebAppVersion: '8.0'
            }}));
            sessionStorage.setItem('initParams', JSON.stringify({{
                tgWebAppData: {json_m_init},
                tgWebAppPlatform: 'android',
                tgWebAppVersion: '8.0'
            }}));
        }} catch(e) {{}}

        // 1. Hook Telegram WebApp object and permanently protect initData
        const mockWebApp = {{
            initData: {json_m_init},
            initDataUnsafe: {{ user: {{ id: {uid} }} }},
            version: '8.0',
            platform: 'android',
            colorScheme: 'dark',
            themeParams: {{
                bg_color: '#18181b',
                text_color: '#ffffff'
            }},
            isExpanded: true,
            viewportHeight: 915,
            viewportStableHeight: 915,
            ready: () => {{}},
            expand: () => {{}},
            close: () => {{}},
            onEvent: () => {{}},
            offEvent: () => {{}},
            sendData: () => {{}}
        }};
        try {{
            Object.defineProperty(mockWebApp, 'initData', {{
                configurable: true,
                enumerable: true,
                get: () => {json_m_init},
                set: () => {{}}
            }});
        }} catch(e) {{}}

        let _tg = {{ WebApp: mockWebApp }};
        try {{
            Object.defineProperty(window, 'Telegram', {{
                configurable: true,
                enumerable: true,
                get: () => _tg,
                set: (v) => {{
                    _tg = v || {{}};
                    if (!_tg.WebApp) {{
                        _tg.WebApp = mockWebApp;
                    }} else {{
                        try {{
                            Object.defineProperty(_tg.WebApp, 'initData', {{
                                configurable: true,
                                enumerable: true,
                                get: () => {json_m_init},
                                set: () => {{}}
                            }});
                        }} catch(e) {{
                            _tg.WebApp.initData = {json_m_init};
                        }}
                    }}
                }}
            }});
        }} catch(e) {{}}

        window.__mrgTurnstileToken = null;

        // Hook window.turnstile.render to capture token on generation
        let _cfPoll = setInterval(() => {{
            if (window.turnstile && typeof window.turnstile.render === 'function') {{
                clearInterval(_cfPoll);
                const _origRender = window.turnstile.render;
                window.turnstile.render = function(container, options) {{
                    try {{
                        if (options) {{
                            const _origCb = options.callback;
                            options.callback = function(tok) {{
                                window.__mrgTurnstileToken = tok;
                                if (_origCb) _origCb(tok);
                            }};
                        }}
                    }} catch(e) {{}}
                    return _origRender.call(this, container, options);
                }};
            }}
        }}, 30);

        const origFetch = window.fetch;
        window.fetch = async function(...args) {{
            const url = String(args[0] || '');
            if (url.includes('verify-human') || url.includes('claim-mining')) {{
                try {{
                    const body = JSON.parse(args[1]?.body || '{{}}');
                    if (body.turnstileToken) {{
                        window.__mrgTurnstileToken = body.turnstileToken;
                    }}
                }} catch(e) {{}}
            }}
            return await origFetch.apply(this, args);
        }};
    """)

    verified_event = asyncio.Event()
    acquired_token = {"token": None}

    async def handle_response(response):
        try:
            if "verify-human" in response.url:
                res_json = await response.json()
                if res_json.get("success"):
                    logger.info(f"🎉 UID {uid}: Real app received 200 OK from verify-human!")
                    verified_event.set()
        except Exception:
            pass

    async def handle_request(request):
        try:
            if "verify-human" in request.url:
                post_data = request.post_data_json
                if post_data and post_data.get("turnstileToken"):
                    acquired_token["token"] = post_data["turnstileToken"]
        except Exception:
            pass

    page.on("response", handle_response)
    page.on("request", handle_request)
    page.on("console", lambda msg: logger.info(f"[MRG Console UID {uid}] {msg.text}"))

    logger.info(f"⏳ Navigating to {APP_ORIGIN} for UID {uid}...")
    try:
        await page.goto(target_url, wait_until="domcontentloaded", timeout=18000)
    except Exception as e:
        logger.warning(f"UID {uid} navigation failed: {e}")
        await context.close()
        return False

    # Verify DOM document is intact
    try:
        has_dom = await page.evaluate("() => document.body !== null")
        if not has_dom:
            logger.warning(f"UID {uid} DOM body is null after navigation")
            await context.close()
            return False
    except Exception as e:
        logger.warning(f"UID {uid} DOM check failed: {e}")
        await context.close()
        return False

    await asyncio.sleep(2.0)

    # Passive monitoring and humanized interaction loop
    # In app.mrgtoken.xyz, expired humanVerifiedUntil displays the security check screen directly.
    clicked_checkbox = False
    for step in range(20):
        if verified_event.is_set():
            break
        tok = await page.evaluate("() => window.__mrgTurnstileToken || (window.turnstile && typeof window.turnstile.getResponse === 'function' ? window.turnstile.getResponse() : null) || null")
        if tok and len(tok) > 20:
            acquired_token["token"] = tok
            break

        # Check if Turnstile has expanded to an interactive visible checkbox (>= 200px wide, >= 45px tall)
        if not clicked_checkbox:
            try:
                # 1. Try frame locator click directly inside challenge frame
                for fl in [
                    page.frame_locator("iframe[src*='challenges.cloudflare.com']"),
                    page.frame_locator("iframe[src*='cloudflare']"),
                    page.frame_locator("iframe[title*='Cloudflare']"),
                    page.frame_locator("iframe[title*='Turnstile']")
                ]:
                    try:
                        cb = fl.locator("input[type='checkbox'], #challenge-stage, .ctp-checkbox-label, body").first
                        if await cb.count() > 0 and await cb.is_visible():
                            await cb.click(timeout=1000)
                            clicked_checkbox = True
                            logger.info(f"🖱️ Clicked Turnstile checkbox via frame_locator for MRG UID {uid}")
                            break
                    except Exception:
                        pass

                # 2. Hardware CDP mouse click on bounding box
                if not clicked_checkbox:
                    ts_iframe = page.locator("iframe[src*='challenges.cloudflare.com'], iframe[src*='cloudflare']").first
                    if await ts_iframe.count() > 0:
                        box = await ts_iframe.bounding_box()
                        if box and box["width"] >= 200 and box["height"] >= 45:
                            click_x = box["x"] + 32.0
                            click_y = box["y"] + (box["height"] / 2.0)
                            logger.info(f"🖱️ Found visible Turnstile checkbox for MRG UID {uid}! Dispatched genuine CDP hardware click at ({click_x:.1f}, {click_y:.1f})...")
                            await page.mouse.move(click_x - 30, click_y - 15)
                            await asyncio.sleep(0.1)
                            await page.mouse.move(click_x, click_y, steps=8)
                            await asyncio.sleep(0.15)
                            await page.mouse.down()
                            await asyncio.sleep(0.12)
                            await page.mouse.up()
                            clicked_checkbox = True
            except Exception:
                pass

        # At step 4, if still not solving and on mine home page, trigger claim button
        if step == 4 and not verified_event.is_set() and not acquired_token["token"]:
            try:
                await page.evaluate("""() => {
                    const btn = document.getElementById('btn-claim-mining') || Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.toLowerCase().includes('claim'));
                    if (btn) btn.click();
                }""")
            except Exception:
                pass

        # If native check times out at 15s, app shows "Retry" button. Click it to reset cleanly.
        if step >= 15 and not verified_event.is_set() and not acquired_token["token"]:
            try:
                retry_btn = page.locator("button:has-text('Retry')").first
                if await retry_btn.count() > 0 and await retry_btn.is_visible():
                    logger.info(f"🔄 Clicking MRG native Retry button for UID {uid}...")
                    await retry_btn.click()
            except Exception:
                pass

        await asyncio.sleep(1.0)

    if acquired_token["token"]:
        ver_res = verify_human_token(m_init, acquired_token["token"])
        if ver_res.get("success"):
            logger.info(f"🎉 UID {uid}: Turnstile verify-human succeeded via DOM token!")
            claim_mining_reward(m_init, acquired_token["token"])
            safe_post(f"{API_BASE}/api/user/daily-checkin", {"initData": m_init, "turnstileToken": acquired_token["token"]})
            save_mrg_pass_to_upstash(uid, acquired_token["token"])
            await context.close()
            return True

    if verified_event.is_set():
        logger.info(f"✅ UID {uid}: Turnstile successfully solved natively by MiniApp!")
        if acquired_token["token"]:
            claim_mining_reward(m_init, acquired_token["token"])
            safe_post(f"{API_BASE}/api/user/daily-checkin", {"initData": m_init, "turnstileToken": acquired_token["token"]})
            save_mrg_pass_to_upstash(uid, acquired_token["token"])
        await context.close()
        return True

    # Fallback: Clean programmatic Turnstile render without re-injecting duplicate script
    solve_js = f"""
        async () => {{
            return new Promise((resolve) => {{
                let doc = document.body || document.documentElement;
                if (!doc) {{
                    resolve({{ success: false, error: 'no_dom' }});
                    return;
                }}
                let container = document.getElementById('cf-manual-slot');
                if (!container) {{
                    container = document.createElement('div');
                    container.id = 'cf-manual-slot';
                    container.style.position = 'fixed';
                    container.style.top = '50%';
                    container.style.left = '50%';
                    container.style.transform = 'translate(-50%, -50%)';
                    container.style.width = '300px';
                    container.style.height = '65px';
                    container.style.zIndex = '9999999';
                    container.style.background = '#18181b';
                    doc.appendChild(container);
                }} else {{
                    container.innerHTML = '';
                }}

                function renderWidget() {{
                    try {{
                        window.turnstile.render(container, {{
                            sitekey: '{SITE_KEY}',
                            theme: 'dark',
                            appearance: 'interaction-only',
                            callback: function(tok) {{
                                window.__mrgTurnstileToken = tok;
                                resolve({{ success: true, token: tok }});
                            }},
                            'error-callback': function(err) {{
                                resolve({{ success: false, error: String(err) }});
                            }}
                        }});
                    }} catch (e) {{
                        resolve({{ success: false, error: String(e) }});
                    }}
                }}

                if (window.turnstile && typeof window.turnstile.render === 'function') {{
                    renderWidget();
                }} else {{
                    if (!document.querySelector('script[src*=\"challenges.cloudflare.com/turnstile\"]')) {{
                        const s = document.createElement('script');
                        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                        s.async = true;
                        s.defer = true;
                        let head = document.head || document.getElementsByTagName('head')[0] || doc;
                        head.appendChild(s);
                    }}
                    let attempts = 0;
                    const iv = setInterval(() => {{
                        attempts++;
                        if (window.turnstile && typeof window.turnstile.render === 'function') {{
                            clearInterval(iv);
                            renderWidget();
                        }} else if (attempts > 120) {{
                            clearInterval(iv);
                            resolve({{ success: false, error: 'turnstile_load_timeout' }});
                        }}
                    }}, 100);
                }}

                setTimeout(() => {{
                    resolve({{ success: false, error: 'timeout_20s' }});
                }}, 20000);
            }});
        }}
    """
    try:
        solve_task = asyncio.create_task(page.evaluate(solve_js))
        for _ in range(12):
            ts_iframe = page.locator("#cf-manual-slot iframe, iframe[src*='challenges.cloudflare.com']").first
            if await ts_iframe.count() > 0:
                box = await ts_iframe.bounding_box()
                if box and box["width"] >= 200 and box["height"] >= 45:
                    click_x = box["x"] + 32.0
                    click_y = box["y"] + (box["height"] / 2.0)
                    logger.info(f"🖱️ Clicking MRG programmatic Turnstile checkbox at ({click_x:.1f}, {click_y:.1f})...")
                    await page.mouse.move(click_x - 20, click_y - 10)
                    await asyncio.sleep(0.1)
                    await page.mouse.move(click_x, click_y, steps=8)
                    await asyncio.sleep(0.2)
                    await page.mouse.down()
                    await asyncio.sleep(0.12)
                    await page.mouse.up()
                    break
            await asyncio.sleep(0.8)

        render_res = await asyncio.wait_for(solve_task, timeout=22.0)
        if render_res and render_res.get("success") and render_res.get("token"):
            tok = render_res["token"]
            logger.info(f"✅ UID {uid}: Programmatic MRG token acquired: {tok[:16]}...")
            ver_res = verify_human_token(m_init, tok)
            if ver_res.get("success"):
                logger.info(f"🎉 UID {uid}: Programmatic verify-human succeeded!")
                claim_mining_reward(m_init, tok)
                safe_post(f"{API_BASE}/api/user/daily-checkin", {"initData": m_init, "turnstileToken": tok})
                save_mrg_pass_to_upstash(uid, tok)
                await context.close()
                return True
        else:
            logger.warning(f"UID {uid} MRG programmatic note: {render_res}")
    except Exception as e:
        logger.warning(f"UID {uid} evaluate note: {e}")

    await context.close()
    return False


def save_mrg_pass_to_upstash(uid: int, turnstile_token: str):
    """Saves valid MRG turnstile token to Upstash Redis for edge nodes."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/set/mrg:pass:{uid}?ex=86400",
            data=json.dumps({"turnstileToken": turnstile_token, "updated_at": time.time()}).encode(),
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        logger.warning(f"Error saving MRG pass to Redis for UID {uid}: {e}")


def get_mrg_pass_from_upstash(uid: int) -> str | None:
    """Retrieves cached MRG turnstile token from Upstash Redis."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/mrg:pass:{uid}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                parsed = json.loads(res) if isinstance(res, str) else res
                tok = parsed.get("turnstileToken") if isinstance(parsed, dict) else str(parsed)
                if tok and str(tok).strip() not in ("null", "nil", "None", ""):
                    return str(tok).strip()
    except Exception:
        pass
    return None


def solve_turnstile_via_api(sitekey: str, page_url: str, action: str = "login", cdata: str = None) -> str | None:
    """
    Solves Cloudflare Turnstile using CapSolver or 2Captcha REST APIs if credentials are provided.
    Returns the Turnstile token string or None if unconfigured / failed.
    """
    if CAPSOLVER_KEY:
        try:
            logger.info(f"🧩 Solving Turnstile via CapSolver API for {page_url}...")
            task_dict = {
                "type": "AntiTurnstileTaskProxyLess",
                "websiteURL": page_url,
                "websiteKey": sitekey,
                "action": action
            }
            if cdata:
                task_dict["cdata"] = cdata
            create_payload = {
                "clientKey": CAPSOLVER_KEY,
                "task": task_dict
            }
            req = urllib.request.Request(
                "https://api.capsolver.com/createTask",
                data=json.dumps(create_payload).encode("utf-8"),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
            task_id = data.get("taskId")
            if task_id:
                for _ in range(25):
                    time.sleep(2)
                    res_req = urllib.request.Request(
                        "https://api.capsolver.com/getTaskResult",
                        data=json.dumps({"clientKey": CAPSOLVER_KEY, "taskId": task_id}).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(res_req, timeout=15) as resp:
                        res_data = json.loads(resp.read().decode())
                    if res_data.get("status") == "ready":
                        tok = res_data.get("solution", {}).get("token")
                        if tok:
                            logger.info(f"🎉 [CapSolver] Turnstile token acquired: {tok[:16]}...")
                            return tok
                    elif res_data.get("status") == "failed":
                        logger.warning(f"[CapSolver] Task failed: {res_data}")
                        break
        except Exception as e:
            logger.warning(f"[CapSolver] API error: {e}")

    if TWOCAPTCHA_KEY:
        try:
            logger.info(f"🧩 Solving Turnstile via 2Captcha API for {page_url}...")
            in_url = f"https://2captcha.com/in.php?key={TWOCAPTCHA_KEY}&method=turnstile&sitekey={sitekey}&pageurl={urllib.parse.quote(page_url)}&action={action}&json=1"
            req = urllib.request.Request(in_url)
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
            if data.get("status") == 1:
                req_id = data.get("request")
                for _ in range(25):
                    time.sleep(3)
                    res_url = f"https://2captcha.com/res.php?key={TWOCAPTCHA_KEY}&action=get&id={req_id}&json=1"
                    with urllib.request.urlopen(res_url, timeout=15) as resp:
                        res_data = json.loads(resp.read().decode())
                    if res_data.get("status") == 1:
                        tok = res_data.get("request")
                        if tok:
                            logger.info(f"🎉 [2Captcha] Turnstile token acquired: {tok[:16]}...")
                            return tok
                    elif res_data.get("request") != "CAPCHA_NOT_READY":
                        logger.warning(f"[2Captcha] Error: {res_data}")
                        break
        except Exception as e:
            logger.warning(f"[2Captcha] API error: {e}")

    return None


def save_victors_pass_to_upstash(uid: int, human_pass: str):
    """Saves valid Victor's Company humanPass to Upstash Redis for edge nodes."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/set/victors:pass:{uid}?ex=86400",
            data=json.dumps({"humanPass": human_pass, "updated_at": time.time()}).encode(),
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        logger.warning(f"Error saving Victor's pass to Redis for UID {uid}: {e}")


async def solve_victors_turnstile(browser, uid: int, v_init: str, is_master: bool) -> bool:
    """
    Solves Turnstile for Victor's Company, logs in, binds referral, and saves humanPass.
    Supports instant API solving (CapSolver / 2Captcha) and headless Patchright Chromium stealth.
    Clicks Cloudflare Turnstile iframe with precise coordinates, and executes full recruitment pipeline.
    """
    # 0. Check API solver first (instant, proxy-less)
    acquired_token = solve_turnstile_via_api(VICTORS_SITEKEY, VICTORS_ORIGIN, action="login")
    acquired_pass = None

    if not acquired_token:
        ws_proxy = get_webshare_proxy() if os.getenv("USE_BROWSER_PROXY", "1") != "0" else None
        context_kwargs = {
            "bypass_csp": True,
            "user_agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
            "viewport": {"width": 412, "height": 915},
            "is_mobile": True,
            "has_touch": True,
            "locale": "en-US",
            "timezone_id": "UTC"
        }
        if ws_proxy:
            context_kwargs["proxy"] = ws_proxy
        context = await browser.new_context(**context_kwargs)
        page = await context.new_page()

        encoded_init = urllib.parse.quote(v_init)
        target_url = (
            f"{VICTORS_ORIGIN}/#tgWebAppData={encoded_init}"
            f"&tgWebAppPlatform=android"
            f"&tgWebAppVersion=8.0"
            f"&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%231a1147%22%2C%22text_color%22%3A%22%23ffffff%22%7D"
        )

        ref_to_bind = "" if is_master else VICTORS_REF
        json_v_init = json.dumps(v_init)
        json_ref_to_bind = json.dumps(ref_to_bind)
    
        await page.add_init_script(f"""
    
            // 0. Pre-fill sessionStorage so telegram-web-app.js parses valid initData
            try {{
                sessionStorage.setItem('__telegram__initParams', JSON.stringify({{
                    tgWebAppData: {json_v_init},
                    tgWebAppPlatform: 'android',
                    tgWebAppVersion: '8.0'
                }}));
                sessionStorage.setItem('initParams', JSON.stringify({{
                    tgWebAppData: {json_v_init},
                    tgWebAppPlatform: 'android',
                    tgWebAppVersion: '8.0'
                }}));
            }} catch(e) {{}}

            // 1. Hook Telegram WebApp object
            const mockWebApp = {{
                initData: {json_v_init},
                initDataUnsafe: {{
                    start_param: {json_ref_to_bind},
                    user: {{ id: {uid} }}
                }},
                version: '8.0',
                platform: 'android',
                colorScheme: 'dark',
                themeParams: {{
                    bg_color: '#1a1147',
                    text_color: '#ffffff',
                    hint_color: '#8b8b8b',
                    link_color: '#ffd700',
                    button_color: '#ffd700',
                    button_text_color: '#000000'
                }},
                isExpanded: true,
                viewportHeight: 915,
                viewportStableHeight: 915,
                ready: () => {{}},
                expand: () => {{}},
                close: () => {{}},
                onEvent: () => {{}},
                offEvent: () => {{}},
                sendData: () => {{}}
            }};
            let _tg = {{ WebApp: mockWebApp }};
            try {{
                Object.defineProperty(window, 'Telegram', {{
                    configurable: true,
                    enumerable: true,
                    get: () => _tg,
                    set: (v) => {{
                        _tg = v || {{}};
                        if (!_tg.WebApp) {{
                            _tg.WebApp = mockWebApp;
                        }} else {{
                            _tg.WebApp.initData = {json_v_init};
                            _tg.WebApp.initDataUnsafe = {{
                                start_param: {json_ref_to_bind},
                                user: {{ id: {uid} }}
                            }};
                        }}
                    }}
                }});
            }} catch(e) {{}}
    
            // 2. State containers
            window.__victorsTurnstileToken = null;
            window.__victorsHumanPass = null;

            // Hook window.turnstile.render to force appearance: 'always' and hook callback
            let _cfPoll = setInterval(() => {{
                if (window.turnstile && typeof window.turnstile.render === 'function') {{
                    clearInterval(_cfPoll);
                    const _origRender = window.turnstile.render;
                    window.turnstile.render = function(container, options) {{
                        try {{
                            if (options) {{
                                options.appearance = 'always';
                                const _origCb = options.callback;
                                options.callback = function(tok) {{
                                    window.__victorsTurnstileToken = tok;
                                    if (_origCb) _origCb(tok);
                                }};
                            }}
                        }} catch(e) {{}}
                        return _origRender.call(this, container, options);
                    }};
                }}
            }}, 30);
    
            // 3. Hook fetch to intercept /auth/login payload & response directly
            const origFetch = window.fetch;
            window.fetch = async function(...args) {{
                const url = String(args[0] || '');
                if (url.includes('/auth/login')) {{
                    try {{
                        const body = JSON.parse(args[1]?.body || '{{}}');
                        if (body.turnstileToken) {{
                            window.__victorsTurnstileToken = body.turnstileToken;
                        }}
                    }} catch(e) {{}}
                }}
                const res = await origFetch.apply(this, args);
                if (url.includes('/auth/login')) {{
                    try {{
                        const clone = res.clone();
                        const data = await clone.json();
                        if (data && data.humanPass) {{
                            window.__victorsHumanPass = data.humanPass;
                            console.log('[CF-HOOK] Captured humanPass from /auth/login: ' + data.humanPass.substring(0, 16) + '...');
                        }}
                    }} catch(e) {{}}
                }}
                return res;
            }};
        """)
    
        acquired_token_dict = {"token": None}
        acquired_pass_dict = {"pass": None}
    
        async def handle_victors_response(response):
            try:
                if "/auth/login" in response.url:
                    data = await response.json()
                    hp = data.get("humanPass") or (data.get("data", {}).get("humanPass") if isinstance(data.get("data"), dict) else None)
                    if hp:
                        logger.info(f"🎉 [Victor's] Captured humanPass from /auth/login: {str(hp)[:16]}...")
                        acquired_pass_dict["pass"] = str(hp)
            except Exception:
                pass
    
        async def handle_victors_request(request):
            try:
                if "/auth/login" in request.url:
                    post_data = request.post_data_json
                    if post_data and post_data.get("turnstileToken"):
                        acquired_token_dict["token"] = post_data["turnstileToken"]
            except Exception:
                pass
    
        page.on("response", handle_victors_response)
        page.on("request", handle_victors_request)
        page.on("console", lambda msg: logger.info(f"[Victor's Console UID {uid}] {msg.text}"))
    
        try:
            await page.goto(target_url, wait_until="domcontentloaded", timeout=18000)
        except Exception as e:
            logger.warning(f"[Victor's] UID {uid} navigation note: {e}")
    
        await asyncio.sleep(2.5)
    
        acquired_token = None
        acquired_pass = None
    
        # Step 1: Check if Turnstile solved passively / automatically
        for _ in range(8):
            tok = await page.evaluate("() => window.__victorsTurnstileToken || (document.querySelector('[name=\"cf-turnstile-response\"]')?.value) || (document.querySelector('[name=\"g-recaptcha-response\"]')?.value) || (window.turnstile && typeof window.turnstile.getResponse === 'function' ? window.turnstile.getResponse() : null) || null")
            acquired_token = tok or acquired_token_dict.get("token")
            if acquired_token and len(acquired_token) > 20:
                break
            hp = await page.evaluate("() => window.__victorsHumanPass || null")
            acquired_pass = hp or acquired_pass_dict.get("pass")
            if acquired_pass:
                break
            await asyncio.sleep(1.0)
    
        # Step 2: If not solved, locate Turnstile iframe and simulate clean human click if visible
        if not acquired_token and not acquired_pass:
            for click_round in range(1, 4):
                if acquired_token or acquired_pass:
                    break
                try:
                    # 1. Frame locator click
                    for fl in [
                        page.frame_locator("iframe[src*='challenges.cloudflare.com']"),
                        page.frame_locator("iframe[src*='cloudflare']")
                    ]:
                        try:
                            cb = fl.locator("input[type='checkbox'], #challenge-stage, .ctp-checkbox-label, body").first
                            if await cb.count() > 0 and await cb.is_visible():
                                await cb.click(timeout=1000)
                                logger.info(f"🖱️ Clicked Turnstile checkbox via frame_locator for Victor's UID {uid}")
                                break
                        except Exception:
                            pass

                    # 2. Hardware CDP mouse click
                    ts_iframe = page.locator("iframe[src*='challenges.cloudflare.com']").first
                    if await ts_iframe.count() > 0:
                        box = await ts_iframe.bounding_box()
                        if box and box["width"] >= 200 and box["height"] >= 45:
                            click_x = box["x"] + 32.0
                            click_y = box["y"] + (box["height"] / 2.0)
                            logger.info(f"🖱️ [Victor's] Humanized mouse interaction #{click_round} at ({click_x:.1f}, {click_y:.1f}) for UID {uid}...")
                            await page.mouse.move(click_x - 30, click_y - 15)
                            await asyncio.sleep(0.1)
                            await page.mouse.move(click_x, click_y, steps=6)
                            await asyncio.sleep(0.15)
                            await page.mouse.down()
                            await asyncio.sleep(0.12)
                            await page.mouse.up()
                except Exception as ce:
                    logger.warning(f"[Victor's] UID {uid} iframe click note: {ce}")
    
                # Wait up to 6s after each click for token or humanPass
                for _ in range(6):
                    tok = await page.evaluate("() => window.__victorsTurnstileToken || (document.querySelector('[name=\"cf-turnstile-response\"]')?.value) || (document.querySelector('[name=\"g-recaptcha-response\"]')?.value) || (window.turnstile && typeof window.turnstile.getResponse === 'function' ? window.turnstile.getResponse() : null) || null")
                    acquired_token = tok or acquired_token_dict.get("token")
                    if acquired_token and len(acquired_token) > 20:
                        break
                    hp = await page.evaluate("() => window.__victorsHumanPass || null")
                    acquired_pass = hp or acquired_pass_dict.get("pass")
                    if acquired_pass:
                        break
                    await asyncio.sleep(1.0)
                if acquired_token or acquired_pass:
                    break

        await context.close()
    
        acquired_pass = acquired_pass or acquired_pass_dict.get("pass")
        acquired_token = acquired_token or acquired_token_dict.get("token")
    
    # Step 4: Exchange acquired Turnstile token for humanPass via POST /api/auth/login
    if not acquired_pass and acquired_token:
        logger.info(f"✅ [Victor's] UID {uid}: Turnstile solved ({acquired_token[:16]}...)! Calling /auth/login...")
        login_p = {
            "turnstileToken": acquired_token,
            "device": {
                "platform": "android",
                "tgVersion": "8.0",
                "screen": "430x932@3",
                "ram": 8,
                "cpu": 8
            }
        }
        if not is_master:
            login_p["startParam"] = VICTORS_REF

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"tma {v_init}",
            "Origin": VICTORS_ORIGIN,
            "Referer": f"{VICTORS_ORIGIN}/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
        }
        st_code, body = safe_post(f"{VICTORS_API}/auth/login", login_p, extra_headers=headers)
        if st_code in (200, 201) and isinstance(body, dict):
            hp = body.get("humanPass") or (body.get("data", {}).get("humanPass") if isinstance(body.get("data"), dict) else None)
            if hp:
                acquired_pass = str(hp)
        else:
            logger.warning(f"[Victor's] UID {uid} /auth/login response: {st_code} {body}")

    # Step 5: Save humanPass to Upstash Redis and execute recruitment & farming pipeline
    if acquired_pass:
        save_victors_pass_to_upstash(uid, str(acquired_pass))
        logger.info(f"🎉 [Victor's] UID {uid}: Successfully obtained humanPass: {str(acquired_pass)[:16]}... (Saved to Redis)")

        v_authed_headers = {
            "Content-Type": "application/json",
            "Authorization": f"tma {v_init}",
            "x-human-pass": str(acquired_pass),
            "Origin": VICTORS_ORIGIN,
            "Referer": f"{VICTORS_ORIGIN}/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
        }

        # 1. Complete tutorial & daily check-in
        safe_post(f"{VICTORS_API}/me/tutorial", {}, extra_headers=v_authed_headers)
        safe_post(f"{VICTORS_API}/checkin", {}, extra_headers=v_authed_headers)

        # 2. Connect TON wallet to qualify recruit & unlock Level 1 Miner via TonConnect 2.0 proof
        fleet_ton_wallets = load_fleet_ton_wallets()
        w_entry = fleet_ton_wallets.get(str(uid)) or fleet_ton_wallets.get(uid)
        if w_entry and w_entry.get("mnemonic"):
            np_code, np_res = safe_get(f"{VICTORS_API}/wallet/proof-payload", extra_headers=v_authed_headers)
            if np_code == 200 and isinstance(np_res, dict) and np_res.get("payload"):
                nonce = np_res["payload"]
                proof_data = create_ton_proof(w_entry, nonce, domain="app.victors.company")
                words = w_entry["mnemonic"].split() if isinstance(w_entry["mnemonic"], str) else w_entry["mnemonic"]
                from tonsdk.contract.wallet import Wallets, WalletVersionEnum
                _, _, _, wallet_contract = Wallets.from_mnemonics(mnemonics=words, version=WalletVersionEnum.v4r2)
                friendly_addr = wallet_contract.address.to_string(is_user_friendly=True, is_bounceable=False, is_url_safe=True)
                conn_body = {
                    "address": friendly_addr,
                    "proof": proof_data["proof"],
                    "stateInit": proof_data["walletStateInit"],
                    "publicKey": proof_data["publicKey"]
                }
                c_code, c_res = safe_post(f"{VICTORS_API}/wallet/connect", conn_body, extra_headers=v_authed_headers)
                logger.info(f"💼 [Victor's] UID {uid}: Connected TON wallet {friendly_addr[:12]}... (code: {c_code}, walletOwned=True)")

        # Dynamic task discovery & claim across ALL available tasks
        try:
            _, tk_data = safe_get(f"{VICTORS_API}/tasks", extra_headers=v_authed_headers)
            if isinstance(tk_data, dict):
                raw_tasks = tk_data.get("tasks") or (tk_data.get("data", {}).get("tasks") if isinstance(tk_data.get("data"), dict) else [])
                if isinstance(raw_tasks, list):
                    for task_item in raw_tasks:
                        if isinstance(task_item, dict):
                            t_status = task_item.get("status")
                            is_claimed = task_item.get("claimed", False)
                            tid = task_item.get("id") or task_item.get("taskId")
                            if tid and (t_status in ("open", "READY_TO_CLAIM", "PENDING", "COMPLETED") or not is_claimed):
                                t_kind = task_item.get("kind", "")
                                if t_kind in ("onchain_hold", "nft_hold"):
                                    continue
                                c_stat, c_res = safe_post(f"{VICTORS_API}/tasks/claim", {"taskId": tid}, extra_headers=v_authed_headers)
                                logger.info(f"📋 [Victor's] UID {uid} task '{tid}' claim result: {c_stat} {c_res}")
        except Exception as t_err:
            logger.warning(f"[Victor's] UID {uid} task sweep error: {t_err}")

        # 3. Claim daily passive mining (Shift Cart)
        m_code, m_res = safe_post(f"{VICTORS_API}/mining/claim", {}, extra_headers=v_authed_headers)
        logger.info(f"⛏️ [Victor's] UID {uid}: Mining shift cart claim: {m_code} {m_res}")

        # 4. Check profile and unlock levels if available
        p_code, p_res = safe_get(f"{VICTORS_API}/me", extra_headers=v_authed_headers)
        if p_code == 200 and isinstance(p_res, dict):
            u_info = p_res.get("user") or p_res.get("state", {}).get("user") or p_res
            cur_lvl = u_info.get("level", 1)
            manual_lvl = u_info.get("manualUnlockedLevel", 0)
            if manual_lvl < 1 or cur_lvl < 1:
                safe_post(f"{VICTORS_API}/levels/unlock", {"level": 1}, extra_headers=v_authed_headers)
                logger.info(f"⬆️ [Victor's] UID {uid}: Hired Level 1 Miner to start auto mining!")
            unlocked = u_info.get("unlockedLevel", cur_lvl)
            if unlocked > cur_lvl:
                safe_post(f"{VICTORS_API}/levels/unlock", {"level": unlocked}, extra_headers=v_authed_headers)
                logger.info(f"⬆️ [Victor's] UID {uid}: Miner level upgraded to {unlocked}!")

        # 5. Play arcade minigame
        try:
            import victors_arcade_solver
            async with aiohttp.ClientSession() as arc_session:
                await victors_arcade_solver.solve_deep_mine_expeditions(arc_session, v_authed_headers, f"UID {uid}", max_runs=2)
        except Exception as arc_e:
            logger.debug(f"[Victor's] UID {uid} arcade note: {arc_e}")

        # 6. If Master Account: sweep referral hiring bonuses & commissions
        if is_master:
            b_code, b_res = safe_post(f"{VICTORS_API}/referral/claim-bonus", {}, extra_headers=v_authed_headers)
            c_code, c_res = safe_post(f"{VICTORS_API}/referral/claim-commission", {}, extra_headers=v_authed_headers)
            logger.info(f"👑 [Victor's] Master recruitment bonus: {b_code} {b_res}, commissions: {c_code} {c_res}")

        return True

    return False


def create_ton_proof(wallet_entry: dict, payload_nonce: str, domain: str = "app.victors.company") -> dict:
    """Creates a TonConnect 2.0 proof-of-ownership payload signed with the account's TON key."""
    from nacl.signing import SigningKey
    from tonsdk.contract.wallet import Wallets, WalletVersionEnum
    from tonsdk.utils import Address

    mnemonic = wallet_entry.get("mnemonic")
    if not mnemonic:
        raise ValueError("Missing mnemonic in wallet entry")
    words = mnemonic.split() if isinstance(mnemonic, str) else mnemonic
    _, pub_key_bytes, priv_key_bytes, wallet_contract = Wallets.from_mnemonics(
        mnemonics=words, version=WalletVersionEnum.v4r2
    )
    state_init_res = wallet_contract.create_state_init()
    state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")

    t_addr = wallet_contract.address
    wc = t_addr.wc
    addr_hash = t_addr.hash_part

    timestamp = int(time.time())

    # Standard TonConnect 2.0 ton-proof-item-v2 structure
    prefix = b"ton-proof-item-v2/"
    wc_bytes = struct.pack(">i", wc)
    domain_bytes = domain.encode("utf-8")
    domain_len = struct.pack("<I", len(domain_bytes))
    ts_bytes = struct.pack("<Q", timestamp)
    payload_bytes = payload_nonce.encode("utf-8")

    msg = prefix + wc_bytes + addr_hash + domain_len + domain_bytes + ts_bytes + payload_bytes
    msg_hash = hashlib.sha256(msg).digest()
    full_msg = b"\xff\xff" + b"ton-connect" + msg_hash
    digest = hashlib.sha256(full_msg).digest()

    signing_key = SigningKey(priv_key_bytes[:32])
    sig = signing_key.sign(digest).signature
    sig_b64 = base64.b64encode(sig).decode("utf-8")

    raw_addr = f"{wc}:{addr_hash.hex()}"

    return {
        "address": raw_addr,
        "chain": "-239",
        "publicKey": pub_key_bytes.hex(),
        "walletStateInit": state_init_b64,
        "proof": {
            "timestamp": timestamp,
            "domain": {
                "lengthBytes": len(domain_bytes),
                "value": domain
            },
            "signature": sig_b64,
            "payload": payload_nonce
        }
    }



async def solve_atf_turnstile(browser, uid: int, atf_init: str) -> bool:
    """
    Solves Cloudflare Turnstile entry captcha for ATF Miner (5-day cycle or new accounts).
    Submits verified captcha_token to index.php?action=verify_entry_captcha, and saves pass to Upstash.
    """
    acquired_token = solve_turnstile_via_api(ATF_SITEKEY, ATF_ORIGIN, action="verify_entry_captcha")
    if not acquired_token and browser:
        try:
            ws_proxy = get_webshare_proxy() if os.getenv("USE_BROWSER_PROXY", "1") != "0" else None
            context_kwargs = {
                "bypass_csp": True,
                "user_agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
                "viewport": {"width": 412, "height": 915},
                "is_mobile": True,
                "has_touch": True
            }
            if ws_proxy:
                context_kwargs["proxy"] = ws_proxy
            context = await browser.new_context(**context_kwargs)
            page = await context.new_page()
            target_url = f"{ATF_ORIGIN}/miner/index.html?entry=bot_start#tgWebAppData={urllib.parse.quote(atf_init, safe='')}"
            json_atf_init = json.dumps(atf_init)
            await page.add_init_script(f"""
                try {{
                    sessionStorage.setItem('__telegram__initParams', JSON.stringify({{ tgWebAppData: {json_atf_init} }}));
                    sessionStorage.setItem('initParams', JSON.stringify({{ tgWebAppData: {json_atf_init} }}));
                }} catch(e) {{}}
                const mockWebApp = {{
                    initData: {json_atf_init},
                    initDataUnsafe: {{ user: {{ id: {uid} }} }},
                    version: '8.0', platform: 'android',
                    ready: () => {{}}, expand: () => {{}}, close: () => {{}},
                    onEvent: () => {{}}, offEvent: () => {{}}, sendData: () => {{}}
                }};
                window.Telegram = {{ WebApp: mockWebApp }};
                window.__atfSolvedToken = null;

                let _atfCb = null;
                Object.defineProperty(window, '__atfEntryCaptchaCallback', {{
                    configurable: true,
                    enumerable: true,
                    get: () => _atfCb,
                    set: (fn) => {{
                        _atfCb = async (tok) => {{
                            window.__atfSolvedToken = tok;
                            if (typeof fn === 'function') {{
                                try {{ return await fn(tok); }} catch(e) {{}}
                            }}
                        }};
                    }}
                }});

                const origFetch = window.fetch;
                window.fetch = async function(...args) {{
                    const url = String(args[0] || '');
                    if (url.includes('verify_entry_captcha')) {{
                        try {{
                            const b = JSON.parse(args[1]?.body || '{{}}');
                            if (b.captcha_token) window.__atfSolvedToken = b.captcha_token;
                        }} catch(e) {{}}
                    }}
                    return await origFetch.apply(this, args);
                }};
            """)

            try:
                await page.goto(target_url, wait_until="domcontentloaded", timeout=18000)
            except Exception:
                pass

            await asyncio.sleep(2.0)

            # Trigger gate if frontend did not auto-open
            await page.evaluate(f"""
                () => {{
                    try {{
                        if (typeof showEntryCaptchaGate === 'function') showEntryCaptchaGate(true);
                        if (typeof ensureEntryCaptchaBeforeLogin === 'function') ensureEntryCaptchaBeforeLogin({{ id: {uid} }}, true);
                    }} catch(e) {{}}
                }}
            """)

            # Fast check: wait for token or click iframe
            for _ in range(15):
                tok = await page.evaluate("() => window.__atfSolvedToken || null")
                if tok and len(tok) > 20:
                    acquired_token = tok
                    break
                try:
                    ts_iframe = page.locator("#entryCaptchaBox iframe, iframe[src*='challenges.cloudflare.com']").first
                    if await ts_iframe.count() > 0:
                        box = await ts_iframe.bounding_box()
                        if box and box["width"] >= 200 and box["height"] >= 45:
                            click_x = box["x"] + 32.0
                            click_y = box["y"] + (box["height"] / 2.0)
                            await page.mouse.move(click_x - 20, click_y - 10)
                            await asyncio.sleep(0.1)
                            await page.mouse.move(click_x, click_y, steps=8)
                            await asyncio.sleep(0.2)
                            await page.mouse.down()
                            await asyncio.sleep(0.1)
                            await page.mouse.up()
                except Exception:
                    pass
                await asyncio.sleep(1.2)

            # Programmatic fallback render
            if not acquired_token:
                logger.info(f"⚡ [ATF] UID {uid}: Attempting programmatic Turnstile render into #entryCaptchaBox...")
                try:
                    has_ts = await page.evaluate("() => typeof window.turnstile?.render === 'function'")
                    if not has_ts:
                        logger.info(f"Adding Turnstile script tag via Playwright for ATF UID {uid}...")
                        await page.add_script_tag(url="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit")
                        try:
                            await page.wait_for_function("() => typeof window.turnstile?.render === 'function'", timeout=12000)
                        except Exception:
                            pass
                except Exception as tse:
                    logger.warning(f"ATF Turnstile script tag note: {tse}")

                solve_js = f"""
                    async () => {{
                        return new Promise((resolve) => {{
                            let box = document.getElementById('entryCaptchaBox') || document.body;

                            function renderWidget() {{
                                try {{
                                    window.turnstile.render(box, {{
                                        sitekey: '{ATF_SITEKEY}',
                                        size: 'normal',
                                        theme: 'dark',
                                        appearance: 'interaction-only',
                                        callback: function(tok) {{
                                            window.__atfSolvedToken = tok;
                                            resolve({{ success: true, token: tok }});
                                        }},
                                        'error-callback': function(err) {{
                                            resolve({{ success: false, error: String(err) }});
                                        }}
                                    }});
                                }} catch(e) {{
                                    resolve({{ success: false, error: String(e) }});
                                }}
                            }}

                            if (window.turnstile && typeof window.turnstile.render === 'function') {{
                                renderWidget();
                            }} else {{
                                let attempts = 0;
                                const iv = setInterval(() => {{
                                    attempts++;
                                    if (window.turnstile && typeof window.turnstile.render === 'function') {{
                                        clearInterval(iv);
                                        renderWidget();
                                    }} else if (attempts > 200) {{
                                        clearInterval(iv);
                                        resolve({{ success: false, error: 'turnstile_load_timeout' }});
                                    }}
                                }}, 100);
                            }}

                            setTimeout(() => {{
                                resolve({{ success: false, error: 'timeout_20s' }});
                            }}, 20000);
                        }});
                    }}
                """
                try:
                    solve_task = asyncio.create_task(page.evaluate(solve_js))
                    for _ in range(6):
                        try:
                            ts_iframe = page.locator("#entryCaptchaBox iframe, iframe[src*='challenges.cloudflare.com']").first
                            if await ts_iframe.count() > 0:
                                box = await ts_iframe.bounding_box()
                                if box and box["width"] >= 200 and box["height"] >= 45:
                                    click_x = box["x"] + 32.0
                                    click_y = box["y"] + (box["height"] / 2.0)
                                    await page.mouse.move(click_x - 20, click_y - 10)
                                    await asyncio.sleep(0.1)
                                    await page.mouse.move(click_x, click_y, steps=8)
                                    await asyncio.sleep(0.2)
                                    await page.mouse.down()
                                    await asyncio.sleep(0.1)
                                    await page.mouse.up()
                                    break
                        except Exception:
                            pass
                        await asyncio.sleep(0.8)
                    render_res = await asyncio.wait_for(solve_task, timeout=12.0)
                    if render_res and render_res.get("success") and render_res.get("token"):
                        acquired_token = render_res["token"]
                except Exception as pe:
                    logger.warning(f"[ATF] UID {uid} programmatic render note: {pe}")

            await context.close()
        except Exception as e:
            logger.warning(f"[ATF Turnstile] Browser solve error for UID {uid}: {e}")

    if acquired_token:
        logger.info(f"🎉 [ATF] Turnstile token acquired for UID {uid}: {acquired_token[:16]}...")
        p = {
            "initData": atf_init,
            "tg_id": uid,
            "username": "",
            "captcha_token": acquired_token
        }
        atf_h = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json",
            "Referer": f"{ATF_ORIGIN}/miner/index.html",
            "Origin": ATF_ORIGIN
        }
        v_code, v_data = safe_post(f"{ATF_API}?action=verify_entry_captcha&t={int(time.time()*1000)}", p, extra_headers=atf_h)
        if (v_code in (200, 201)) or (isinstance(v_data, dict) and v_data.get("status") == "success"):
            logger.info(f"✅ [ATF] Verified entry captcha for UID {uid} on ATF server!")
            try:
                req_up = urllib.request.Request(
                    f"{UPSTASH_URL}/set/atf:pass:{uid}",
                    data=json.dumps({"captcha_token": acquired_token, "updated_at": time.time()}).encode(),
                    headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req_up, timeout=8):
                    pass
            except Exception:
                pass
            return True
    return False


def check_and_farm_victors_rest(v_acc: dict, is_master: bool = False) -> tuple[bool, bool]:
    """
    Fast REST handler for Victor's Company (@VictorsCompanybot).
    Checks cached humanPass in Upstash Redis. If valid, harvests rewards via REST.
    Returns: (is_handled_via_rest, needs_browser_solve)
    """
    v_uid = v_acc["uid"]
    v_init = v_acc["init_data"]

    cached_pass = None
    try:
        c_resp = safe_get(f"{UPSTASH_URL}/get/victors:pass:{v_uid}", extra_headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        if c_resp and isinstance(c_resp[1], dict) and c_resp[1].get("result"):
            raw_r = c_resp[1]["result"]
            try:
                parsed_r = json.loads(raw_r) if isinstance(raw_r, str) else raw_r
            except Exception:
                parsed_r = raw_r
            cached_pass = parsed_r.get("humanPass") if isinstance(parsed_r, dict) else str(parsed_r)
            if cached_pass in ("null", "nil", "None", ""):
                cached_pass = None
    except Exception:
        pass

    if cached_pass:
        test_h = {
            "Authorization": f"tma {v_init}",
            "Origin": VICTORS_ORIGIN,
            "Referer": f"{VICTORS_ORIGIN}/",
            "x-human-pass": str(cached_pass)
        }
        t_code, t_d = safe_get(f"{VICTORS_API}/me", extra_headers=test_h)
        if t_code == 200 and isinstance(t_d, dict) and (t_d.get("success") is True or "state" in t_d or "user" in t_d):
            logger.info(f"✅ [Victor's] UID {v_uid}: Human pass valid in Redis! Harvesting via REST.")
            safe_post(f"{VICTORS_API}/mining/claim", {}, extra_headers=test_h)
            safe_post(f"{VICTORS_API}/checkin", {}, extra_headers=test_h)
            safe_post(f"{VICTORS_API}/me/tutorial", {}, extra_headers=test_h)
            u_res = t_d.get("user") or t_d
            if isinstance(u_res, dict) and u_res.get("manualUnlockedLevel", 0) < 1:
                safe_post(f"{VICTORS_API}/levels/unlock", {"level": 1}, extra_headers=test_h)
            if is_master or str(v_uid) == "6727787768":
                safe_post(f"{VICTORS_API}/referral/claim-bonus", {}, extra_headers=test_h)
                safe_post(f"{VICTORS_API}/referral/claim-commission", {}, extra_headers=test_h)
            # Fetch and claim pending tasks
            _, tk_data = safe_get(f"{VICTORS_API}/tasks", extra_headers=test_h)
            if isinstance(tk_data, dict):
                raw_tasks = tk_data.get("tasks") or (tk_data.get("data", {}).get("tasks") if isinstance(tk_data.get("data"), dict) else [])
                if isinstance(raw_tasks, list):
                    for task_item in raw_tasks:
                        if isinstance(task_item, dict):
                            t_status = task_item.get("status")
                            is_claimed = task_item.get("claimed", False)
                            tid = task_item.get("id") or task_item.get("taskId")
                            if tid and (t_status in ("open", "READY_TO_CLAIM", "PENDING", "COMPLETED") or not is_claimed):
                                t_kind = task_item.get("kind", "")
                                if t_kind in ("onchain_hold", "nft_hold"):
                                    continue
                                c_stat, c_res = safe_post(f"{VICTORS_API}/tasks/claim", {"taskId": tid}, extra_headers=test_h)
                                logger.info(f"📋 [Victor's] UID {v_uid} task '{tid}' claim result: {c_stat} {c_res}")
            v_acc["authed_headers"] = test_h
            return True, False
        else:
            logger.info(f"⚠️ [Victor's] UID {v_uid}: Cached pass expired (HTTP {t_code}). Needs browser solve.")
    else:
        logger.info(f"⚠️ [Victor's] UID {v_uid}: No cached pass in Redis. Needs browser solve.")

    return False, True



def solve_atf_math(question_text: str) -> str:
    """100% deterministic local arithmetic & challenge solver for ATF Miner."""
    if not question_text:
        return "0"
    import re
    q_lower = question_text.lower().replace("=", " ").replace("?", " ").strip()

    # 1. Factoid & Time Units
    if "days in a week" in q_lower or "days a week" in q_lower: return "7"
    if "hours in a day" in q_lower: return "24"
    if "minutes in an hour" in q_lower or "seconds in a minute" in q_lower: return "60"
    if "months in a year" in q_lower: return "12"
    if "days in a year" in q_lower: return "365"
    if "even or odd" in q_lower or "odd or even" in q_lower:
        m_num = re.search(r"\b(\d+)\b", q_lower)
        if m_num: return "even" if int(m_num.group(1)) % 2 == 0 else "odd"

    word_to_num = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
        "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
        "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
        "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
        "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
        "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
        "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000
    }

    # 2. Tokenize words, digits and operators
    tokens = re.findall(r"[a-z0-9\+\-\*\/\%]+", q_lower)
    converted_tokens = []
    i = 0
    while i < len(tokens):
        w = tokens[i]
        if w in word_to_num:
            val = word_to_num[w]
            while i + 1 < len(tokens) and tokens[i+1] in word_to_num:
                next_val = word_to_num[tokens[i+1]]
                if next_val in (100, 1000):
                    val = val * next_val
                    i += 1
                elif val >= 20 and next_val < 10:
                    val += next_val
                    i += 1
                else:
                    break
            converted_tokens.append(str(val))
        elif w in ("plus", "add", "added", "sum", "+"):
            converted_tokens.append("+")
        elif w in ("minus", "subtract", "subtracted", "take", "-"):
            converted_tokens.append("-")
        elif w in ("times", "multiplied", "multiply", "*", "x"):
            converted_tokens.append("*")
        elif w in ("divided", "divide", "/"):
            converted_tokens.append("/")
        elif w in ("mod", "modulo", "remainder", "%"):
            converted_tokens.append("%")
        elif w.isdigit() or re.match(r"^\d+[\+\-\*\/\%]\d+$", w):
            converted_tokens.append(w)
        i += 1

    normalized = " ".join(converted_tokens)

    # 3. Standard arithmetic "A op B"
    m = re.search(r"(\d+)\s*([\+\-\*\/\%])\s*(\d+)", normalized)
    if m:
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        if op == "+": return str(a + b)
        if op == "-": return str(a - b)
        if op == "*": return str(a * b)
        if op == "/" and b != 0: return str(a // b)
        if op == "%" and b != 0: return str(a % b)

    nums = [int(n) for n in re.findall(r"\d+", normalized)]

    # 4. Unary & Comparison operations
    if nums:
        if ("half of" in q_lower or "half" in q_lower) and len(nums) == 1:
            return str(nums[0] // 2)
        if ("double of" in q_lower or "twice" in q_lower) and len(nums) == 1:
            return str(nums[0] * 2)
        if "square of" in q_lower and len(nums) == 1:
            return str(nums[0] * nums[0])
        if any(w in q_lower for w in ["larger", "greater", "bigger", "highest", "maximum", "max", "most"]):
            return str(max(nums))
        if any(w in q_lower for w in ["smaller", "less", "lowest", "minimum", "least", "min"]):
            return str(min(nums))

    # 5. Two-number semantic operations
    if len(nums) >= 2:
        if any(op in q_lower for op in ["plus", "add", "sum", "total", "+"]):
            return str(nums[0] + nums[1])
        if any(op in q_lower for op in ["minus", "subtract", "difference", "take", "-"]):
            return str(nums[0] - nums[1])
        if any(op in q_lower for op in ["times", "multipl", "product", "*"]):
            return str(nums[0] * nums[1])
        if any(op in q_lower for op in ["divid", "quotient", "/"]):
            return str(nums[0] // nums[1]) if nums[1] != 0 else "0"

    return str(nums[0]) if nums else "0"


def check_and_farm_atf_rest(a_acc: dict) -> tuple[bool, bool]:
    """
    Fast REST handler for ATF Miner (@atfminers_bot).
    Checks login status. If valid without captcha, claims mining rewards,
    referrals, boost, and restarts mining with session cookies.
    Returns: (is_handled_via_rest, needs_browser_solve)
    """
    import uuid
    a_uid = a_acc["uid"]
    a_init = a_acc["init_data"]
    dev_id = f"dev-chk-{a_uid}"

    def make_atf_payload(extra=None):
        p = {
            "initData": a_init,
            "tg_id": int(a_uid),
            "username": "",
            "request_id": f"rq-{uuid.uuid4()}",
            "device_id": dev_id
        }
        if extra:
            p.update(extra)
        return p

    atf_h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/json",
        "Referer": f"{ATF_ORIGIN}/miner/index.html",
        "Origin": ATF_ORIGIN
    }

    login_url = f"{ATF_API}?action=login&t={int(time.time()*1000)}"
    req = urllib.request.Request(login_url, data=json.dumps(make_atf_payload()).encode("utf-8"), headers=atf_h)
    chk_code = 0
    chk_d = {}
    cookies = []
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            chk_code = resp.status
            cookies = resp.headers.get_all("Set-Cookie") or []
            chk_d = json.loads(resp.read().decode())
    except urllib.error.HTTPError as he:
        chk_code = he.code
        try:
            chk_d = json.loads(he.read().decode())
        except Exception:
            chk_d = {"error": str(he)}
    except Exception as e:
        logger.warning(f"[ATF] UID {a_uid} login error: {e}")
        return False, True

    needs_atf_captcha = (chk_code == 403) or (isinstance(chk_d, dict) and chk_d.get("reason") in ("entry_captcha_required", "captcha_required"))
    if not needs_atf_captcha and chk_code == 200:
        logger.info(f"✅ [ATF] UID {a_uid}: Login valid without captcha! Auto-claiming rewards with session cookies.")
        cookie_str = "; ".join([c.split(";")[0] for c in cookies]) if cookies else ""
        authed_h = dict(atf_h)
        if cookie_str:
            authed_h["Cookie"] = cookie_str

        # 1. Claim mining rewards
        cl_code, cl_data = safe_post(f"{ATF_API}?action=claim&t={int(time.time()*1000)}", make_atf_payload(), extra_headers=authed_h)
        if cl_code == 200 and isinstance(cl_data, dict):
            claimed_amt = float(cl_data.get("claimed_amount", 0) or 0.0)
            logger.info(f"⛏️ [ATF] UID {a_uid}: Claimed +{claimed_amt:.4f} ATF! Bal: {cl_data.get('new_pool_balance')}")

        # 2. Daily claims & boosts
        safe_post(f"{ATF_API}?action=claim_referrals&t={int(time.time()*1000)}", make_atf_payload(), extra_headers=authed_h)
        safe_post(f"{ATF_API}?action=claim_team_wallet&t={int(time.time()*1000)}", make_atf_payload(), extra_headers=authed_h)
        safe_post(f"{ATF_API}?action=activate_boost&t={int(time.time()*1000)}", make_atf_payload(), extra_headers=authed_h)
        safe_post(f"{ATF_API}?action=record_daily_interaction&t={int(time.time()*1000)}", make_atf_payload(), extra_headers=authed_h)

        # 3. Solve Math Challenge & Start Mining
        try:
            mc_code, mc_data = safe_post(f"{ATF_API}?action=get_math_challenge&t={int(time.time()*1000)}", make_atf_payload({"scope": "start_mine"}), extra_headers=authed_h)
            if mc_code == 200 and isinstance(mc_data, dict) and mc_data.get("challenge_id"):
                ans = solve_atf_math(mc_data.get("question", ""))
                time.sleep(1.5)
                safe_post(f"{ATF_API}?action=start_mine&t={int(time.time()*1000)}", make_atf_payload({"math_challenge_id": mc_data["challenge_id"], "math_answer": ans}), extra_headers=authed_h)
        except Exception:
            pass

        return True, False
    return False, True


def check_and_farm_pepegram_rest(p_acc: dict) -> tuple[bool, float]:
    """
    Fast REST handler for PepeGram (@Pepe_gram_bot).
    Authenticates, claims accumulated PEPE tokens, starts 6h production, spins free slot.
    Returns: (is_success, claimed_pepe)
    """
    p_uid = p_acc["uid"]
    p_init = p_acc["init_data"]
    pepe_h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36",
        "Content-Type": "application/json",
        "Origin": PEPE_ORIGIN,
        "Referer": f"{PEPE_ORIGIN}/miniapp/"
    }
    auth_code, auth_data = safe_post(
        f"{PEPE_API}/auth?tid=1449",
        {"initData": p_init, "tid": 1449},
        extra_headers=pepe_h
    )
    if auth_code != 200 or not isinstance(auth_data, dict):
        return False, 0.0

    claimed_pepe = 0.0
    safe_post(f"{PEPE_API}/claim-welcome-bonus?tid=1449", {"initData": p_init, "tid": 1449}, extra_headers=pepe_h)
    cl_code, cl_data = safe_post(f"{PEPE_API}/claim?tid=1449", {"initData": p_init, "tid": 1449}, extra_headers=pepe_h)
    if cl_code == 200 and isinstance(cl_data, dict):
        claimed_pepe = float(cl_data.get("hashes_added") or cl_data.get("amount") or 0.0)

    safe_post(f"{PEPE_API}/start-production?tid=1449", {"initData": p_init, "tid": 1449}, extra_headers=pepe_h)
    safe_post(f"{PEPE_API}/tasks/mine?tid=1449", {"initData": p_init, "tid": 1449}, extra_headers=pepe_h)
    safe_post(f"{PEPE_API}/tasks/slot-spin?tid=1449", {"initData": p_init, "tid": 1449}, extra_headers=pepe_h)

    logger.info(f"🐸 [PepeGram] UID {p_uid}: Successfully farmed via REST (+{claimed_pepe:.2f} PEPE hashes).")
    return True, claimed_pepe


def check_and_farm_adxearn_rest(a_acc: dict) -> tuple[bool, int]:
    """
    Fast REST handler for AdxEarn AI (@AdxEarnAibot).
    Checks in, claims farming points, and sweeps rewards.
    Returns: (is_success, claimed_points)
    """
    a_uid = a_acc["uid"]
    a_init = a_acc["init_data"]
    adx_h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36",
        "Content-Type": "application/json",
        "Origin": ADX_ORIGIN,
        "Referer": f"{ADX_ORIGIN}/",
        "X-Telegram-Init-Data": a_init
    }
    sess_code, sess_data = safe_post(f"{ADX_API}/user/session", {"initData": a_init, "fp": f"fp_{a_uid}"}, extra_headers=adx_h)
    if sess_code not in (200, 201) or not isinstance(sess_data, dict):
        return False, 0

    claimed_pts = 0
    chk_code, chk_data = safe_post(f"{ADX_API}/rewards/checkin", {}, extra_headers=adx_h)
    if chk_code == 200 and isinstance(chk_data, dict):
        claimed_pts += int(chk_data.get("points") or chk_data.get("reward") or 0)

    # Claim active farming yield
    farm_code, farm_data = safe_post(f"{ADX_API}/farming/claim", {}, extra_headers=adx_h)
    if farm_code == 200 and isinstance(farm_data, dict):
        claimed_pts += int(farm_data.get("reward") or farm_data.get("claimed") or farm_data.get("points") or 0)

    # Restart farming session
    safe_post(f"{ADX_API}/farming/start", {}, extra_headers=adx_h)
    # Strictly NEVER call /farming/boost - it deducts $0.1000 points from user balance to skip 5% time!

    # Dynamic tasks sweeping
    try:
        t_code, t_data = safe_get(f"{ADX_API}/rewards/tasks", extra_headers=adx_h)
        if t_code == 200 and isinstance(t_data, dict):
            for tk in t_data.get("tasks", []):
                t_id = tk.get("id")
                if t_id and not tk.get("completed") and not tk.get("claimed"):
                    safe_post(f"{ADX_API}/rewards/task-start", {"taskId": t_id}, extra_headers=adx_h)
                    time.sleep(1.0)
                    cl_code, cl_d = safe_post(f"{ADX_API}/rewards/task-claim", {"taskId": t_id}, extra_headers=adx_h)
                    if cl_code == 200 and isinstance(cl_d, dict):
                        claimed_pts += int(cl_d.get("reward") or 0)
    except Exception:
        pass

    # Ad Networks & Flash Bonus Auto-Watch
    try:
        ns_code, ns_data = safe_get(f"{ADX_API}/rewards/ad-networks/status", extra_headers=adx_h)
        if ns_code == 200 and isinstance(ns_data, dict):
            st_dict = ns_data.get("status", {})
            for net_slug, net_info in st_dict.items():
                if isinstance(net_info, dict):
                    watched = net_info.get("watchedToday", 0)
                    cap = net_info.get("dailyCap", 0)
                    cd_rem = net_info.get("cooldownRemainingSec", 0)
                    if (cap == 0 or watched < cap) and cd_rem == 0:
                        safe_post(f"{ADX_API}/rewards/ad-verify-start", {"network": net_slug}, extra_headers=adx_h)
                        wait_s = 6 if net_slug == "adsgram" else 10
                        time.sleep(wait_s)
                        ac_code, ac_d = safe_post(f"{ADX_API}/rewards/ad-claim", {"network": net_slug}, extra_headers=adx_h)
                        if ac_code == 200 and isinstance(ac_d, dict):
                            claimed_pts += int(ac_d.get("reward") or 100)
                        break
    except Exception:
        pass

    # CPA Offers Auto-Claim
    try:
        co_code, co_data = safe_get(f"{ADX_API}/cpa-offers", extra_headers=adx_h)
        if co_code == 200 and isinstance(co_data, dict):
            for off in co_data.get("offers", []):
                oid = off.get("id")
                if oid:
                    safe_post(f"{ADX_API}/cpa-offers/start", {"offerId": oid}, extra_headers=adx_h)
                    time.sleep(8)
                    co_cl_code, co_cl_d = safe_post(f"{ADX_API}/cpa-offers/claim", {"offerId": oid}, extra_headers=adx_h)
                    if co_cl_code == 200 and isinstance(co_cl_d, dict):
                        claimed_pts += int(co_cl_d.get("reward") or 300)
                    break
    except Exception:
        pass

    logger.info(f"🤖 [AdxEarn] UID {a_uid}: Successfully farmed via REST (+{claimed_pts} pts).")
    return True, claimed_pts


def check_and_farm_diggo_rest(d_acc: dict) -> tuple[bool, float]:
    """
    Fast REST handler for DiggoMiner (@Diggominer_bot).
    Uses cached 30-day JWT or attempts exchange to claim mining.
    Returns: (is_success, claimed_amount)
    """
    d_uid = d_acc["uid"]
    d_jwt = d_acc.get("jwt")
    if not d_jwt:
        try:
            r = safe_get(f"{UPSTASH_URL}/get/fleet:diggo:jwt:{d_uid}", extra_headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
            if r and isinstance(r[1], dict) and r[1].get("result"):
                d_jwt = r[1]["result"]
        except Exception:
            pass

    if not d_jwt and d_acc.get("init_data"):
        diggo_h = {
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36",
            "Content-Type": "application/json",
            "Origin": DIGGO_ORIGIN,
            "Referer": f"{DIGGO_ORIGIN}/"
        }
        auth_code, auth_data = safe_post(
            f"{DIGGO_API}/auth/telegram",
            {"initData": d_acc["init_data"]},
            extra_headers=diggo_h
        )
        if auth_code == 200 and isinstance(auth_data, dict) and auth_data.get("token"):
            d_jwt = auth_data["token"]
            safe_post(f"{UPSTASH_URL}/set/fleet:diggo:jwt:{d_uid}", {"value": d_jwt}, extra_headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})

    if not d_jwt:
        return False, 0.0

    claim_h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36",
        "Content-Type": "application/json",
        "Authorization": f"Bearer {d_jwt}",
        "Origin": DIGGO_ORIGIN,
        "Referer": f"{DIGGO_ORIGIN}/"
    }
    # 1. Inspect state to determine pending mining and streak
    st_code, st_data = safe_get(f"{DIGGO_API}/state", extra_headers=claim_h)
    st = st_data.get("state", {}) if (st_code == 200 and isinstance(st_data, dict)) else {}
    mining_obj = st.get("mining") if isinstance(st.get("mining"), dict) else {}
    pending = float(st.get("pending") or mining_obj.get("pending") or 0.0)
    is_paused = bool(mining_obj.get("paused"))

    claimed_amt = 0.0
    import uuid
    # 2. Main mining claim (restarts miner when pending > 0 or paused)
    if pending > 0 or is_paused:
        cl_code, cl_data = safe_post(f"{DIGGO_API}/claims/mining", {}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
        if cl_code == 200 and isinstance(cl_data, dict):
            claimed_amt = float(cl_data.get("amount") or cl_data.get("claimed") or pending)
    
    # 3. Side Tasks: Daily Checkin, Referral Commission, and Day Streak
    safe_post(f"{DIGGO_API}/tasks/claim", {"taskId": "checkin"}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
    safe_post(f"{DIGGO_API}/referrals/claim", {}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
    
    # 4. Day Rewards & Milestones
    for dr in st.get("dayRewards", []):
        if isinstance(dr, dict) and dr.get("status") == "available":
            safe_post(f"{DIGGO_API}/streak/claim", {"day": dr.get("day")}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
    
    # 5. Play / Level Milestone
    tasks = st.get("tasks", {})
    p_lvl = st.get("player", {}).get("level", 1)
    t_play = tasks.get("play", {})
    if t_play.get("enabled") and not t_play.get("claimed"):
        if p_lvl >= (t_play.get("targetLevel") or 1) or (t_play.get("progress", 0) >= t_play.get("total", 1)):
            safe_post(f"{DIGGO_API}/tasks/claim", {"taskId": "play"}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})

    # 6. Telegram Verification
    t_tg = tasks.get("telegram", {})
    if t_tg.get("enabled") and not t_tg.get("claimed"):
        safe_post(f"{DIGGO_API}/tasks/verify", {"taskId": "telegram"}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
        safe_post(f"{DIGGO_API}/tasks/claim", {"taskId": "telegram"}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})

    # 7. Social & Partner Tasks (dynamic iteration)
    for tid, t_obj in tasks.items():
        if tid in ("checkin", "play", "telegram", "ad", "invite"):
            continue
        if isinstance(t_obj, dict) and t_obj.get("enabled") and not t_obj.get("claimed"):
            conf = t_obj.get("confirmation")
            att_id = conf.get("attemptId") if isinstance(conf, dict) else None
            if not att_id:
                s_c, s_d = safe_post(f"{DIGGO_API}/tasks/social/start", {"taskId": tid}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
                if s_c == 200 and isinstance(s_d, dict):
                    att_id = s_d.get("attempt", {}).get("attemptId")
                    time.sleep(1.5)
            if att_id:
                safe_post(f"{DIGGO_API}/tasks/social/confirm", {"taskId": tid, "attemptId": att_id, "confirmed": True}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
                safe_post(f"{DIGGO_API}/tasks/claim", {"taskId": tid}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})

    # 8. Rewarded Ad Task
    t_ad = tasks.get("ad", {})
    if t_ad.get("enabled") and not t_ad.get("claimed") and (t_ad.get("quotaUsed", 0) < t_ad.get("quotaTotal", 4)):
        a_c, a_d = safe_post(f"{DIGGO_API}/adsgram/start", {}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
        if a_c == 200 and isinstance(a_d, dict) and a_d.get("attemptId"):
            time.sleep(2.0)
            safe_post(f"{DIGGO_API}/adsgram/complete", {"attemptId": a_d["attemptId"]}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
            safe_post(f"{DIGGO_API}/tasks/claim", {"taskId": "ad"}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})

    # 9. Solana Launch Campaign Tasks (quiz & pump)
    try:
        lr_code, ld = safe_get(f"{DIGGO_API}/launch-tasks", extra_headers=claim_h)
        if lr_code == 200 and isinstance(ld, dict) and ld.get("enabled"):
            quiz = ld.get("quiz", {})
            pump = ld.get("pump", {})
            if not quiz.get("claimed"):
                qr_code, qr_d = safe_post(f"{DIGGO_API}/launch-tasks/quiz", {"answer": "ton_continues"}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
                if qr_code == 200 and isinstance(qr_d, dict):
                    claimed_amt += float(qr_d.get("amount", 5.0) or 5.0)
            if not pump.get("confirmed"):
                safe_post(f"{DIGGO_API}/launch-tasks/pump/open", {}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
                safe_post(f"{DIGGO_API}/launch-tasks/pump/confirm", {"confirmed": True}, extra_headers={**claim_h, "Idempotency-Key": str(uuid.uuid4())})
    except Exception:
        pass

    logger.info(f"⛏️ [Diggo] UID {d_uid}: Successfully farmed main & side tasks via REST (+{claimed_amt:.2f} DIGGO).")
    return True, claimed_amt


def check_and_farm_chickenland_rest(c_acc: dict) -> tuple[bool, int, int]:
    """
    Fast REST handler for Chicken Land (@ChickenLandBot).
    Sells accumulated eggs, completes daily & social tasks, auto-redeems promos, claims referral rewards, and auto-buys hens.
    Returns: (is_success, eggs_sold, hens_bought)
    """
    c_uid = c_acc["uid"]
    c_init = c_acc.get("init_data")
    if not c_init:
        return False, 0, 0

    try:
        try:
            from chickenland_miner import ChickenLandMiner
            miner = ChickenLandMiner(c_init, user_id=c_uid)
            rep = miner.run_farming_cycle()
            if rep.get("status") == "success":
                eggs_sold = int(rep.get("eggs_collected", 0) or 0)
                hens_bought = int(rep.get("hens_bought", 0) or 0)
                logger.info(f"🐔 [ChickenLand] UID {c_uid}: Successfully farmed via ChickenLandMiner (eggs sold: {eggs_sold}, hens bought: {hens_bought}).")
                return True, eggs_sold, hens_bought
            else:
                logger.debug(f"[ChickenLand] UID {c_uid} rest farm note: {rep.get('error')}")
                return False, 0, 0
        except ImportError:
            import base64
            if c_init.startswith("TMA "):
                b64_token = c_init[4:].strip()
            elif "%3D" in c_init or "query_id=" in c_init or "user=" in c_init:
                decoded = urllib.parse.unquote(c_init) if "%3D" in c_init else c_init
                b64_token = base64.b64encode(decoded.encode("utf-8")).decode("utf-8")
            else:
                b64_token = c_init.strip()

            c_headers = {
                "Content-Type": "application/json",
                "Authorization": f"TMA {b64_token}",
                "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36"
            }
            rpc_url = "https://app8968434282.tgcloud.ai/api/rpc"

            def c_rpc(path: str, body: dict = None):
                payload = {"method": "POST" if body is not None else "GET", "path": path, "body": body if body is not None else {}}
                return safe_post(rpc_url, payload, extra_headers=c_headers)

            code, me_data = c_rpc("/api/me", {"ref": "12668", "lang": "en"})
            if code != 200 or not isinstance(me_data, dict) or not me_data.get("ok"):
                return False, 0, 0

            u = me_data.get("result", {}).get("user", {})
            current_coins = float(u.get("coins", 0) or 0)
            eggs_sold = 0
            hens_bought = 0

            # 1. Welcome bonus
            if not u.get("welcome"):
                c_rpc("/api/welcome", {})

            # 2. Daily check-in
            c_rpc("/api/task", {"id": "daily"})

            # 3. Sell eggs if accumulated
            if int(u.get("eggs", 0) or 0) > 0:
                s_code, s_data = c_rpc("/api/sell", {})
                if s_code == 200 and isinstance(s_data, dict) and s_data.get("ok"):
                    res_obj = s_data.get("result", {})
                    eggs_sold = int(res_obj.get("eggs", 0) or 0)
                    current_coins = float(res_obj.get("user", {}).get("coins", current_coins))

            # 4. Uncompleted tasks
            completed = set((u.get("tasks") or []) + (u.get("dayTasks") or []))
            for tid in ["channel", "payments", "dnews", "dpay", "dpromo"]:
                if tid not in completed:
                    c_rpc("/api/task/open", {"id": tid})
                    time.sleep(0.5)
                    t_c, t_d = c_rpc("/api/task", {"id": tid})
                    if t_c == 200 and isinstance(t_d, dict) and t_d.get("ok"):
                        if t_d.get("result", {}).get("user"):
                            current_coins = float(t_d["result"]["user"].get("coins", current_coins))

            # 5. Referral claim
            c_rpc("/api/ref/claim", {})

            # 6. Auto-buy basic hens with accumulated coins
            if current_coins >= 1000:
                n_buy = int(current_coins // 1000)
                b_code, b_data = c_rpc("/api/buy", {"breed": "basic", "n": n_buy})
                if b_code == 200 and isinstance(b_data, dict) and b_data.get("ok"):
                    hens_bought = n_buy

            logger.info(f"🐔 [ChickenLand] UID {c_uid}: Successfully farmed via built-in REST fallback (eggs sold: {eggs_sold}, hens bought: {hens_bought}).")
            return True, eggs_sold, hens_bought
    except Exception as ce:
        logger.debug(f"[ChickenLand] UID {c_uid} rest farm note: {ce}")
        return False, 0, 0


async def run_mrg_auto_solver():
    """Main workflow: audits all 20 accounts across 5 bots, solves needed challenges, connects wallets, and auto-claims."""
    logger.info("====================================================================")
    logger.info("🚀 Starting 100% Cloud Fleet Auto-Farming & Turnstile Solver Cycle")
    logger.info("====================================================================")

    fleet_ton_wallets = load_fleet_ton_wallets()
    miniapp_cache = load_all_miniapp_tokens()
    accounts_data = []
    accounts_needing_solver = []
    victors_accounts = []
    victors_needing_solver = []
    victors_active = []
    atf_accounts = []
    atf_needing_solver = []
    kynex_accounts = []

    victors_solved = 0
    atf_solved = 0
    pepe_solved = 0
    adx_solved = 0
    diggo_solved = 0
    chicken_solved = 0
    total_claimed_mrg = 0.0
    total_claimed_pepe = 0.0
    total_claimed_adx = 0
    total_claimed_diggo = 0.0
    total_eggs_sold = 0
    total_hens_bought = 0

    # 1. Fetch tokens and execute Fast REST Audits & Instant Harvesting
    logger.info("⚡ Phase 1: Rapid REST Pre-Flight & Instant Multi-Bot Harvesting...")
    for idx, uid in enumerate(FLEET_UIDS, 1):
        tok_dict = get_token_from_upstash(uid, miniapp_cache=miniapp_cache)
        mrg_init = tok_dict.get("mrg_init_data")
        atf_init = tok_dict.get("atf_init_data")
        vic_init = tok_dict.get("victors_init_data")
        kynex_init = tok_dict.get("kynex_init_data")

        # ATF Fast REST Check
        if atf_init:
            a_acc = {"uid": uid, "init_data": atf_init}
            atf_accounts.append(a_acc)
            handled, needs_b = check_and_farm_atf_rest(a_acc)
            if handled:
                atf_solved += 1
            elif needs_b:
                atf_needing_solver.append(a_acc)

        # Victor's Company Fast REST Check
        if vic_init:
            v_acc = {"uid": uid, "init_data": vic_init}
            victors_accounts.append(v_acc)
            handled, needs_b = check_and_farm_victors_rest(v_acc, is_master=(str(uid) == "6727787768"))
            if handled:
                victors_solved += 1
                victors_active.append(v_acc)
            elif needs_b:
                victors_needing_solver.append(v_acc)

        # Kynex Network Collector
        if kynex_init:
            kynex_accounts.append({"uid": uid, "init_data": kynex_init})

        # PepeGram Fast REST Check
        pepe_init = tok_dict.get("pepegram_init_data") or tok_dict.get("pepe_init_data")
        if pepe_init:
            p_handled, p_claimed = check_and_farm_pepegram_rest({"uid": uid, "init_data": pepe_init})
            if p_handled:
                pepe_solved += 1
                total_claimed_pepe += p_claimed

        # AdxEarn AI Fast REST Check
        adx_init = tok_dict.get("adxearn_init_data") or tok_dict.get("adx_init_data")
        if adx_init:
            a_handled, a_pts = check_and_farm_adxearn_rest({"uid": uid, "init_data": adx_init})
            if a_handled:
                adx_solved += 1
                total_claimed_adx += a_pts

        # DiggoMiner Fast REST Check
        diggo_jwt = tok_dict.get("diggo_jwt")
        diggo_init = tok_dict.get("diggo_init_data")
        if diggo_jwt or diggo_init:
            d_handled, d_claimed = check_and_farm_diggo_rest({"uid": uid, "init_data": diggo_init, "jwt": diggo_jwt})
            if d_handled:
                diggo_solved += 1
                total_claimed_diggo += d_claimed

        # Chicken Land Fast REST Check
        chicken_init = tok_dict.get("chickenland_init_data") or tok_dict.get("chicken_init_data")
        if chicken_init:
            c_handled, c_eggs, c_hens = check_and_farm_chickenland_rest({"uid": uid, "init_data": chicken_init})
            if c_handled:
                chicken_solved += 1
                total_eggs_sold += c_eggs
                total_hens_bought += c_hens

        # MRG Status Check
        if not mrg_init:
            logger.warning(f"[{idx:02d}/{len(FLEET_UIDS)}] UID {uid}: No mrg_init_data found in Upstash. Skipping.")
            continue

        if mrg_init.startswith("user%3D") or "%257B" in mrg_init or "%2522" in mrg_init:
            mrg_init = urllib.parse.unquote(mrg_init)

        stat = check_account_status(mrg_init)
        if not stat.get("success"):
            logger.warning(f"[{idx:02d}/{len(FLEET_UIDS)}] UID {uid}: Could not fetch account status ({stat.get('error')}).")
            continue

        # Claim MRG side tasks via REST (including recurring 24h/12h/6h tasks)
        completed_mrg_tasks = set(stat.get("completedTaskIds", []))
        for tk in stat.get("tasks", []):
            tk_id = tk.get("taskId")
            tk_type = str(tk.get("taskType") or "")
            is_recurring = "recurring" in tk_type
            if tk_id and (tk_id not in completed_mrg_tasks or is_recurring):
                safe_post(f"{API_BASE}/api/user/claim-task", {"initData": mrg_init, "taskId": tk_id})

        # Auto unlock level if balance permits
        cur_mrg_lvl = stat.get("manualUnlockedLevel", 1)
        tot_mrg_bal = stat.get("inAppBalance", 0.0) + stat.get("tonWalletBalance", 0.0)
        auto_unlock_mrg_level(mrg_init, cur_mrg_lvl, tot_mrg_bal)

        has_active_pass = is_human_pass_active(stat.get("humanVerifiedUntil"))
        acc_info = {
            "uid": uid,
            "idx": idx,
            "init_data": mrg_init,
            "stat": stat,
            "has_active_pass": has_active_pass
        }
        accounts_data.append(acc_info)

        if not has_active_pass:
            accounts_needing_solver.append(acc_info)
            logger.info(
                f"[{idx:02d}/{len(FLEET_UIDS)}] UID {uid}: ⚠️ MRG Human pass needed. "
                f"Bal: {stat['inAppBalance']:.1f} MRG, Unclaimed: {stat['unclaimed']:.2f} MRG (Lvl {stat['manualUnlockedLevel']})"
            )
        else:
            logger.info(
                f"[{idx:02d}/{len(FLEET_UIDS)}] UID {uid}: ✅ MRG Human pass active until {stat['humanVerifiedUntil']}. "
                f"Bal: {stat['inAppBalance']:.1f} MRG, Unclaimed: {stat['unclaimed']:.2f} MRG"
            )
            # CRITICAL: Instantly claim mining reward and daily checkin via REST for accounts with active pass
            if stat.get("unclaimed", 0) > 0.05:
                c_res = claim_mining_reward(mrg_init)
                if c_res.get("success"):
                    logger.info(f"🎉 UID {uid}: Successfully claimed {stat['unclaimed']:.2f} MRG via active human pass!")
                    total_claimed_mrg += stat["unclaimed"]
            cached_pass = get_mrg_pass_from_upstash(uid)
            checkin_body = {"initData": mrg_init}
            if cached_pass:
                checkin_body["turnstileToken"] = cached_pass
            safe_post(f"{API_BASE}/api/user/daily-checkin", checkin_body)
            auto_unlock_mrg_level(mrg_init, cur_mrg_lvl, stat.get("inAppBalance", 0.0) + stat.get("unclaimed", 0.0))

    needed_mrg = len(accounts_needing_solver)
    total_browser_solves_needed = (
        needed_mrg +
        len(victors_needing_solver) +
        len(atf_needing_solver)
    )

    logger.info(
        f"📊 Audit Summary: {len(accounts_data)} accounts connected. "
        f"MRG browser solves: {needed_mrg}. "
        f"Victor's browser solves: {len(victors_needing_solver)} ({victors_solved} verified via REST). "
        f"ATF browser solves: {len(atf_needing_solver)} ({atf_solved} logged in via REST). "
        f"Kynex accounts: {len(kynex_accounts)}. "
        f"PepeGram: {pepe_solved} farmed. "
        f"AdxEarn AI: {adx_solved} farmed. "
        f"DiggoMiner: {diggo_solved} farmed."
    )

    # 2. Kynex Network Multi-Account Cloud Auto-Farming (Fast REST First)
    kynex_farmed = 0
    total_claimed_knx = 0.0
    if kynex_accounts:
        logger.info(f"⚡ Phase 2: Starting Kynex Network Auto-Farming for {len(kynex_accounts)} accounts...")
        try:
            from kynex_miner import farm_kynex_account
            async with aiohttp.ClientSession() as kyn_session:
                sem = asyncio.Semaphore(4)
                async def farm_single_kynex(k_acc):
                    kuid = k_acc["uid"]
                    kinit = k_acc["init_data"]
                    async with sem:
                        try:
                            k_res = await farm_kynex_account(
                                kyn_session,
                                kinit,
                                {"user_id": kuid, "account_id": kuid},
                                is_master=(str(kuid) == "6727787768")
                            )
                            c_knx = float(k_res.get("claimed_knx") or 0.0)
                            logger.info(f"✅ [Kynex] UID {kuid}: {k_res.get('status')}")
                            return (True, c_knx)
                        except Exception as ke:
                            logger.warning(f"⚠️ [Kynex] UID {kuid} farm error: {ke}")
                            return (False, 0.0)

                results = await asyncio.gather(*(farm_single_kynex(a) for a in kynex_accounts))
                for ok, knx in results:
                    if ok:
                        kynex_farmed += 1
                        total_claimed_knx += knx
        except Exception as kerr:
            logger.warning(f"⚠️ Kynex fleet farm exception: {kerr}")

    # 3. Victor's Arcade Expeditions (Deep Mine Minigame via REST)
    logger.info("🎮 Phase 3: Executing Victor's Deep Mine Arcade expeditions for active accounts...")
    try:
        import victors_arcade_solver
        async with aiohttp.ClientSession() as arc_session:
            for v_act in victors_active:
                v_uid = v_act["uid"]
                v_h = v_act.get("authed_headers")
                if not v_h:
                    v_init = v_act["init_data"]
                    c_resp = safe_get(f"{UPSTASH_URL}/get/victors:pass:{v_uid}", extra_headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
                    if c_resp and isinstance(c_resp[1], dict) and c_resp[1].get("result"):
                        r_raw = c_resp[1]["result"]
                        try:
                            r_parsed = json.loads(r_raw) if isinstance(r_raw, str) else r_raw
                        except Exception:
                            r_parsed = r_raw
                        h_pass = r_parsed.get("humanPass") if isinstance(r_parsed, dict) else str(r_parsed)
                        if h_pass:
                            v_h = {
                                "Authorization": f"tma {v_init}",
                                "Origin": VICTORS_ORIGIN,
                                "Referer": f"{VICTORS_ORIGIN}/",
                                "x-human-pass": str(h_pass)
                            }
                if v_h:
                    try:
                        await victors_arcade_solver.solve_deep_mine_expeditions(arc_session, v_h, f"UID {v_uid}", max_runs=2)
                    except Exception as arc_e:
                        logger.debug(f"[Victor's Arcade] UID {v_uid} error: {arc_e}")
    except Exception as e:
        logger.debug(f"Victor's arcade batch error: {e}")

    # 4. Targeted Browser Solving with Circuit Breakers (ONLY for accounts that actually require Turnstile/Captcha)
    solved_count = 0
    if total_browser_solves_needed == 0:
        logger.info("🎉 [Fast Path] 100% of fleet accounts are active and verified across all bots! Browser launch bypassed.")
    else:
        logger.info(f"🛡️ Phase 4: Launching stealth Chromium for {total_browser_solves_needed} specific accounts requiring Turnstile...")
        try:
            from patchright.async_api import async_playwright
            logger.info("🛡️ Using Patchright stealth browser engine.")
        except ImportError:
            from playwright.async_api import async_playwright
            logger.info("🌐 Using Playwright browser engine.")

        # Dynamically refresh miniapp_tokens and fleet_ton_wallets right before browser solving
        fresh_tokens = load_all_miniapp_tokens()
        if fresh_tokens:
            for v_acc in victors_needing_solver:
                u_str = str(v_acc["uid"])
                if u_str in fresh_tokens and fresh_tokens[u_str].get("victors_init_data"):
                    v_acc["init_data"] = fresh_tokens[u_str]["victors_init_data"]
            for acc in accounts_needing_solver:
                u_str = str(acc["uid"])
                if u_str in fresh_tokens and fresh_tokens[u_str].get("mrg_init_data"):
                    acc["init_data"] = fresh_tokens[u_str]["mrg_init_data"]
        fleet_ton_wallets = load_fleet_ton_wallets()

        # Prioritize Master Account (6727787768) first in every queue
        victors_needing_solver.sort(key=lambda a: 0 if str(a["uid"]) == "6727787768" else 1)
        accounts_needing_solver.sort(key=lambda a: 0 if str(a["uid"]) == "6727787768" else 1)
        atf_needing_solver.sort(key=lambda a: 0 if str(a["uid"]) == "6727787768" else 1)

        is_xvfb = bool(os.getenv("DISPLAY") or os.getenv("CI"))
        headless_flag = False if is_xvfb else True
        logger.info(f"🖥️ Launching Chromium (headless={headless_flag}, DISPLAY={os.getenv('DISPLAY')}, CI={os.getenv('CI')})...")

        launch_kwargs = {
            "headless": headless_flag,
            "args": [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=1280,800"
            ]
        }

        async with async_playwright() as p:
            browser = await p.chromium.launch(**launch_kwargs)

            # A. Solve Victor's Company passes & unlock Level 1 Miner (Protected by circuit breaker & auto direct-fallback)
            vic_fails = 0
            for v_acc in victors_needing_solver:
                if vic_fails >= 3 and _VERIFIED_MRG_PROXIES:
                    logger.warning("⚠️ 3 consecutive Victor's solve failures. Clearing proxy pool and switching to DIRECT connection.")
                    _VERIFIED_MRG_PROXIES.clear()
                    vic_fails = 0
                elif vic_fails >= 6:
                    logger.warning("⚠️ Victor's Turnstile consecutive failure circuit breaker tripped. Skipping remaining Victor's browser solves.")
                    break
                v_uid = v_acc["uid"]
                v_init = v_acc["init_data"]
                try:
                    v_res = await asyncio.wait_for(
                        solve_victors_turnstile(browser, v_uid, v_init, is_master=(str(v_uid) == "6727787768")),
                        timeout=50.0
                    )
                    if v_res:
                        victors_solved += 1
                        vic_fails = 0
                        victors_active.append(v_acc)
                    else:
                        vic_fails += 1
                except asyncio.TimeoutError:
                    logger.warning(f"Victor's solve timed out (50s) for UID {v_uid}")
                    vic_fails += 1
                except Exception as ve:
                    logger.warning(f"Victor's solve exception for UID {v_uid}: {ve}")
                    vic_fails += 1
                await asyncio.sleep(0.5)

            # C. Solve MRG passes (Protected by circuit breaker & auto direct-fallback)
            mrg_fails = 0
            for acc in accounts_needing_solver:
                if mrg_fails >= 3 and _VERIFIED_MRG_PROXIES:
                    logger.warning("⚠️ 3 consecutive MRG solve failures. Clearing proxy pool and switching to DIRECT connection.")
                    _VERIFIED_MRG_PROXIES.clear()
                    mrg_fails = 0
                elif mrg_fails >= 6:
                    logger.warning("⚠️ MRG Turnstile consecutive failure circuit breaker tripped (runner IP rate-limited). Skipping remaining MRG browser solves.")
                    break
                uid = acc["uid"]
                m_init = acc["init_data"]
                try:
                    success = await asyncio.wait_for(solve_turnstile_for_account(browser, acc), timeout=50.0)
                except asyncio.TimeoutError:
                    logger.warning(f"MRG Turnstile timed out (50s) for UID {uid}")
                    success = False
                except Exception as me:
                    logger.warning(f"MRG Turnstile exception for UID {uid}: {me}")
                    success = False

                if success:
                    solved_count += 1
                    mrg_fails = 0
                    claim_res = claim_mining_reward(m_init)
                    claimed_amt = float(claim_res.get("claimedAmount") or acc["stat"]["unclaimed"])
                    total_claimed_mrg += claimed_amt
                    logger.info(f"⛏️ UID {uid}: Successfully claimed {claimed_amt:.2f} MRG! Miner restarted.")
                    new_bal = acc["stat"]["inAppBalance"] + claimed_amt + acc["stat"].get("tonWalletBalance", 0.0)
                    auto_unlock_mrg_level(m_init, acc["stat"]["manualUnlockedLevel"], new_bal)
                else:
                    mrg_fails += 1

                await asyncio.sleep(0.5)

            # D. Solve ATF Miner entry captcha (Protected by 2-fail circuit breaker)
            atf_fails = 0
            for atf_acc in atf_needing_solver:
                if atf_fails >= 2:
                    logger.warning("⚠️ ATF Turnstile consecutive failure circuit breaker tripped. Skipping remaining ATF browser solves.")
                    break
                a_uid = atf_acc["uid"]
                a_init = atf_acc["init_data"]
                try:
                    atf_res = await asyncio.wait_for(
                        solve_atf_turnstile(browser, a_uid, a_init),
                        timeout=45.0
                    )
                    if atf_res:
                        atf_solved += 1
                        atf_fails = 0
                        # Auto-claim rewards with session cookies & deterministic math challenge solver
                        check_and_farm_atf_rest(atf_acc)
                    else:
                        atf_fails += 1
                except asyncio.TimeoutError:
                    logger.warning(f"ATF solve timed out (45s) for UID {a_uid}")
                    atf_fails += 1
                except Exception as ae:
                    logger.warning(f"ATF solve exception for UID {a_uid}: {ae}")
                    atf_fails += 1
                await asyncio.sleep(0.5)

            await browser.close()
            logger.info("🛡️ Phase 4 Complete: Chromium closed successfully.")

    # 5. Claim rewards for MRG accounts that already had an active pass
    for acc in accounts_data:
        if acc["has_active_pass"]:
            uid = acc["uid"]
            m_init = acc["init_data"]
            if acc["stat"]["unclaimed"] > 0.05:
                claim_res = claim_mining_reward(m_init)
                if claim_res.get("success"):
                    claimed_amt = float(claim_res.get("claimedAmount") or acc["stat"]["unclaimed"])
                    total_claimed_mrg += claimed_amt
                    logger.info(f"⛏️ UID {uid}: Auto-claimed active pass reward: {claimed_amt:.2f} MRG.")
                    new_bal = acc["stat"]["inAppBalance"] + claimed_amt + acc["stat"].get("tonWalletBalance", 0.0)
                    auto_unlock_mrg_level(m_init, acc["stat"]["manualUnlockedLevel"], new_bal)

    # 6. Master Account Referral Sweep
    master_acc = next((a for a in accounts_data if str(a["uid"]) == "6727787768"), None)
    if master_acc:
        m_init = master_acc["init_data"]
        safe_post(f"{API_BASE}/api/user/claim-commission", {"initData": m_init})
        safe_post(f"{API_BASE}/api/user/claim-one-time-bonus", {"initData": m_init})
        logger.info("👑 Master Account referral commission and team bonus claimed.")

    # 7. Telegram Telemetry Notification
    report_msg = (
        f"🚀 <b>Fleet Cloud Multi-Farming & Turnstile Solver Report</b>\n\n"
        f"• <b>Total Fleet Accounts:</b> {len(FLEET_UIDS)}\n"
        f"• <b>MRG Pass Solved:</b> {solved_count}/{needed_mrg} (+{total_claimed_mrg:.2f} MRG)\n"
        f"• <b>ATF Captcha / Login:</b> {atf_solved}/{len(atf_accounts)}\n"
        f"• <b>Victor's Pass & Mining:</b> {victors_solved}/{len(victors_accounts)}\n"
        f"• <b>Kynex Network Farmed:</b> {kynex_farmed}/{len(kynex_accounts)} (+{total_claimed_knx:.2f} KNX)\n"
        f"• <b>PepeGram Farmed:</b> {pepe_solved} (+{total_claimed_pepe:.2f} PEPE)\n"
        f"• <b>AdxEarn AI Farmed:</b> {adx_solved} (+{total_claimed_adx} Pts)\n"
        f"• <b>DiggoMiner Farmed:</b> {diggo_solved} (+{total_claimed_diggo:.2f} DIGGO)\n"
        f"• <b>Chicken Land Farmed:</b> {chicken_solved} (+{total_eggs_sold} Eggs sold, {total_hens_bought} Hens bought)\n"
        f"• <b>Execution Time:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
        f"⚡ <i>100% Cloud Execution. Zero phone load.</i>"
    )
    logger.info(
        f"📢 Telemetry: MRG Solved {solved_count}/{needed_mrg}, "
        f"ATF Solved {atf_solved}/{len(atf_accounts)}, "
        f"Victor's Solved {victors_solved}/{len(victors_accounts)}, "
        f"Kynex Farmed {kynex_farmed}/{len(kynex_accounts)}, "
        f"Pepe Farmed {pepe_solved}, Adx Farmed {adx_solved}, Diggo Farmed {diggo_solved}, "
        f"Chicken Land Farmed {chicken_solved}, "
        f"Claimed {total_claimed_mrg:.2f} MRG, {total_claimed_knx:.2f} KNX, {total_claimed_pepe:.2f} PEPE."
    )
    send_tg_alert(report_msg)


if __name__ == "__main__":
    asyncio.run(run_mrg_auto_solver())

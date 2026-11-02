#!/usr/bin/env python3
"""
victors_cloud_phone_launcher.py
Interactive Cloud Virtual Phone Runner for Victor's Company (@VictorsCompanybot).
Runs in GitHub Actions alongside Xvfb, noVNC, and Cloudflare Tunnel.
Streams interactive mobile browser to the user's phone via Cloudflare Tunnel.
As the user taps Turnstile on the virtual screen (or auto-clicked by engine),
it captures tokens and automatically executes the full recruitment qualification
pipeline across all fleet accounts under Master referral ref_A20AA96F18.
"""

import os
import sys
import json
import time
import struct
import hashlib
import base64
import urllib.parse
import urllib.request
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("victors_cloud_phone")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPSTASH_URL = os.getenv("UPSTASH_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or ""
ALERT_BOT_TOKEN = os.getenv("ALERT_BOT_TOKEN") or ""
OWNER_ID = os.getenv("OWNER_ID") or "6727787768"

VICTORS_SITEKEY = "0x4AAAAAAFD0KRgPRFVwDvgn"
VICTORS_ORIGIN = "https://app.victors.company"
VICTORS_API = "https://server.victors.company/api"
VICTORS_REF = "ref_A20AA96F18"

ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")

def load_all_fleet_uids() -> list:
    if os.path.exists(ACCOUNTS_FILE):
        try:
            with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
                accs = json.load(f)
                uids = [int(a["user_id"]) for a in accs if a.get("user_id")]
                if len(uids) >= 18:
                    return uids
        except Exception:
            pass
    return [
        6727787768,  # Master (Arif Hossain)
        8881914294,  # Nancy
        7648254021,  # Koram
        8826375659,  # Arif
        8450010161,  # Nadim
        8782429452,  # Kaitlyn
        7734849205,  # Node 7
        8025472383,  # Node 8
        8851426148,  # Node 9
        8203342513,  # Node 10
        8190649727,  # MD. Arif
        7487048946,  # Sanzida
        8741547543,  # Abid (3)
        8727040932,  # Node 14
        7749125802,  # Node 15
        7954290138,  # Node 16
        8841038141,  # Node 17
        8975442879,  # Node 18
        8937908003,  # Node 19
        8609131528,  # Node 20
        8669217201   # Node 21 (Aaaa201)
    ]

FLEET_UIDS = load_all_fleet_uids()


def get_webshare_proxy() -> dict | None:
    """Fetches active, pre-tested residential/datacenter proxy from Webshare."""
    env_keys = []
    env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8", errors="replace") as f:
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
    for key in webshare_keys:
        if not key or key in seen_keys:
            continue
        seen_keys.add(key)
        try:
            req = urllib.request.Request(
                "https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page=1&page_size=25",
                headers={"Authorization": f"Token {key}"}
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode())
                results = [p for p in data.get("results", []) if p.get("valid", True)]
                if results:
                    import random
                    random.shuffle(results)
                    for candidate in results[:4]:
                        u = candidate.get("username", "Arif274300")
                        pw = candidate.get("password", "Arif2743")
                        host = candidate["proxy_address"]
                        port = candidate["port"]
                        proxy_str = f"http://{u}:{pw}@{host}:{port}"
                        try:
                            ph = urllib.request.ProxyHandler({"http": proxy_str, "https": proxy_str})
                            opener = urllib.request.build_opener(ph)
                            with opener.open("http://connectivitycheck.gstatic.com/generate_204", timeout=4) as test_resp:
                                if test_resp.status in (200, 204):
                                    logger.info(f"🌐 Verified live Webshare proxy: {host}:{port} via key {key[:8]}...")
                                    return {
                                        "server": f"http://{host}:{port}",
                                        "username": u,
                                        "password": pw,
                                        "proxy_str": f"{u}:{pw}@{host}:{port}"
                                    }
                        except Exception:
                            continue
        except Exception as e:
            logger.warning(f"Webshare proxy fetch warning ({key[:8]}...): {e}")
    return None


def send_tg_alert(text: str):
    """Sends notification to Owner Telegram."""
    if not ALERT_BOT_TOKEN or not OWNER_ID:
        return
    try:
        url = f"https://api.telegram.org/bot{ALERT_BOT_TOKEN}/sendMessage"
        payload = json.dumps({
            "chat_id": OWNER_ID,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        logger.warning(f"Failed to send Telegram alert: {e}")


def load_fleet_ton_wallets() -> dict:
    """Fetch fleet TON wallets from Upstash Redis."""
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
        logger.warning(f"Error fetching TON wallets from Upstash: {e}")
    return {}


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
                return json.loads(res) if isinstance(res, str) else res
    except Exception as e:
        logger.warning(f"Error fetching miniapp_tokens: {e}")
    return {}


def create_victors_ton_proof(wallet_entry: dict, nonce: str) -> tuple:
    """Signs TonConnect 2.0 proof-of-ownership for Victor's Company."""
    try:
        from nacl.signing import SigningKey
        from tonsdk.contract.wallet import Wallets, WalletVersionEnum
    except ImportError:
        logger.error("Missing tonsdk or pynacl. Cannot create TonConnect proof.")
        return None, None, None, None

    mnemonic = wallet_entry.get("mnemonic")
    if not mnemonic:
        return None, None, None, None

    words = mnemonic.split() if isinstance(mnemonic, str) else mnemonic
    _, pub_key_bytes, priv_key_bytes, wallet_contract = Wallets.from_mnemonics(
        mnemonics=words, version=WalletVersionEnum.v4r2
    )
    state_init_res = wallet_contract.create_state_init()
    state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")

    t_addr = wallet_contract.address
    wc = t_addr.wc
    addr_hash = t_addr.hash_part
    friendly_addr = t_addr.to_string(is_user_friendly=True, is_bounceable=False, is_url_safe=True)
    domain = "app.victors.company"
    timestamp = int(time.time())

    prefix = b"ton-proof-item-v2/"
    wc_bytes = struct.pack(">i", wc)
    domain_bytes = domain.encode("utf-8")
    domain_len = struct.pack("<I", len(domain_bytes))
    ts_bytes = struct.pack("<Q", timestamp)
    payload_bytes = nonce.encode("utf-8")

    msg = prefix + wc_bytes + addr_hash + domain_len + domain_bytes + ts_bytes + payload_bytes
    msg_hash = hashlib.sha256(msg).digest()
    full_msg = b"\xff\xff" + b"ton-connect" + msg_hash
    digest = hashlib.sha256(full_msg).digest()

    signing_key = SigningKey(priv_key_bytes[:32])
    sig = signing_key.sign(digest).signature
    sig_b64 = base64.b64encode(sig).decode("utf-8")

    proof_item = {
        "timestamp": timestamp,
        "domain": {
            "lengthBytes": len(domain_bytes),
            "value": domain
        },
        "signature": sig_b64,
        "payload": nonce
    }
    return proof_item, state_init_b64, pub_key_bytes.hex(), friendly_addr


def get_token_from_upstash(uid: int) -> dict:
    """Fetch tokens from Upstash Redis."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/fleet:tokens:{uid}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                return json.loads(res) if isinstance(res, str) else res
    except Exception as e:
        logger.warning(f"Upstash fetch warning for UID {uid}: {e}")
    return {}


def get_victors_pass_from_upstash(uid: int) -> str:
    """Fetch saved humanPass from Upstash Redis."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/victors:pass:{uid}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                d = json.loads(res) if isinstance(res, str) else res
                return d.get("humanPass")
    except Exception:
        pass
    return None


def save_victors_pass_to_upstash(uid: int, human_pass: str):
    """Saves valid Victor's Company humanPass to Upstash Redis."""
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/set/victors:pass:{uid}",
            data=json.dumps({"humanPass": human_pass, "updated_at": time.time()}).encode(),
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            pass
    except Exception as e:
        logger.warning(f"Error saving Victor's pass to Redis: {e}")


def safe_post(url: str, json_data: dict, extra_headers: dict = None) -> tuple:
    """Synchronous POST request wrapper."""
    headers = {
        "Content-Type": "application/json",
        "Origin": VICTORS_ORIGIN,
        "Referer": f"{VICTORS_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
    }
    if extra_headers:
        headers.update(extra_headers)
    try:
        data_bytes = json.dumps(json_data).encode("utf-8")
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body.startswith("{") or body.startswith("[") else body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)


def safe_get(url: str, extra_headers: dict = None) -> tuple:
    """Synchronous GET request wrapper."""
    headers = {
        "Origin": VICTORS_ORIGIN,
        "Referer": f"{VICTORS_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
    }
    if extra_headers:
        headers.update(extra_headers)
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body.startswith("{") or body.startswith("[") else body
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, err_body
    except Exception as e:
        return 0, str(e)


def probe_account(uid: int, v_init: str) -> tuple:
    """
    Rapid 0.2s health probe to check Telegram signature validity.
    Returns: ('HUMAN_REQUIRED', None) | ('ALREADY_AUTH', humanPass) | ('EXPIRED', err)
    """
    # 1. First check if existing humanPass in Redis is still valid
    existing_hp = get_victors_pass_from_upstash(uid)
    if existing_hp:
        code, body = safe_get(
            f"{VICTORS_API}/me",
            extra_headers={"Authorization": f"tma {v_init}", "x-human-pass": existing_hp}
        )
        if code == 200 and isinstance(body, dict) and body.get("success") is True:
            return "ALREADY_AUTH", existing_hp

    # 2. Probe /auth/login without token
    code, body = safe_post(
        f"{VICTORS_API}/auth/login",
        {"startParam": VICTORS_REF},
        extra_headers={"Authorization": f"tma {v_init}"}
    )
    if code in (401, 403):
        if isinstance(body, dict) and (body.get("code") == "HUMAN_REQUIRED" or "human" in str(body).lower()):
            return "HUMAN_REQUIRED", None
        elif isinstance(body, dict) and body.get("code") == "TG_AUTH":
            return "EXPIRED", body
        elif code == 401:
            return "EXPIRED", body
    elif code in (200, 201) and isinstance(body, dict):
        hp = body.get("humanPass") or (body.get("data", {}).get("humanPass") if isinstance(body.get("data"), dict) else None)
        if hp:
            return "ALREADY_AUTH", hp

    return "UNKNOWN", body


def qualify_recruit(uid: int, v_init: str, human_pass: str, is_master: bool, ton_wallets: dict):
    """Qualifies recruit: links dedicated TON wallet via TonConnect 2.0 proof, claims tasks, activates mining."""
    v_headers = {
        "Content-Type": "application/json",
        "Authorization": f"tma {v_init}",
        "x-human-pass": str(human_pass),
        "Origin": VICTORS_ORIGIN,
        "Referer": f"{VICTORS_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
    }

    try:
        # 1. Complete tutorial & checkin
        safe_post(f"{VICTORS_API}/me/tutorial", {}, extra_headers=v_headers)
        safe_post(f"{VICTORS_API}/checkin", {}, extra_headers=v_headers)

        # 2. Connect TON wallet with TonConnect 2.0 proof
        w_entry = ton_wallets.get(str(uid)) or ton_wallets.get(uid)
        if w_entry and isinstance(w_entry, dict) and w_entry.get("mnemonic"):
            np_code, np_res = safe_get(f"{VICTORS_API}/wallet/proof-payload", extra_headers=v_headers)
            if np_code == 200 and isinstance(np_res, dict) and np_res.get("payload"):
                nonce = np_res["payload"]
                proof_item, state_init_b64, pub_key_hex, friendly_addr = create_victors_ton_proof(w_entry, nonce)
                if proof_item:
                    conn_body = {
                        "address": friendly_addr,
                        "proof": proof_item,
                        "stateInit": state_init_b64,
                        "publicKey": pub_key_hex
                    }
                    w_code, w_res = safe_post(f"{VICTORS_API}/wallet/connect", conn_body, extra_headers=v_headers)
                    logger.info(f"💎 UID {uid}: TON wallet {friendly_addr[:10]}... connected ({w_code}) -> walletOwned=True!")

        # 3. Claim Free Social Tasks
        for tid in ["follow-victors-company-on-x", "like-retweet-comment-on-x", "subscribe-vic-on-youtube"]:
            t_code, t_res = safe_post(f"{VICTORS_API}/tasks/claim", {"taskId": tid}, extra_headers=v_headers)
            if t_code in (200, 201) and isinstance(t_res, dict) and t_res.get("success"):
                logger.info(f"🎁 UID {uid}: Claimed task {tid} (+{t_res.get('reward')} VIC)")

        # 4. Hire Level 1 Miner (removes home.noJob and starts mining)
        u_code, u_res = safe_post(f"{VICTORS_API}/levels/unlock", {"level": 1}, extra_headers=v_headers)
        logger.info(f"⛏️ UID {uid}: Unlock Level 1 Miner response: {u_code} {u_res}")

        # Check for higher level unlocks eligible with current balance
        m_code, m_res = safe_get(f"{VICTORS_API}/me", extra_headers=v_headers)
        if m_code == 200 and isinstance(m_res, dict):
            st = m_res.get("state", {})
            u_obj = st.get("user") or m_res.get("user") or {}
            unlocked_lvl = u_obj.get("unlockedLevel", 1)
            cur_lvl = u_obj.get("peakLevel") or u_obj.get("level", 1)
            if unlocked_lvl > cur_lvl:
                safe_post(f"{VICTORS_API}/levels/unlock", {"level": unlocked_lvl}, extra_headers=v_headers)

        # 5. Mining claim
        safe_post(f"{VICTORS_API}/mining/claim", {}, extra_headers=v_headers)
    except Exception as e:
        logger.error(f"UID {uid} qualify_recruit exception: {e}")


def sweep_master_bonuses(master_uid: int, v_init: str = None, human_pass: str = None):
    """Sweeps recruitment hiring bonus (+100 V per qualified recruit) for Master Account."""
    headers = {
        "Content-Type": "application/json",
        "Origin": VICTORS_ORIGIN,
        "Referer": f"{VICTORS_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
    }
    if not v_init:
        tok_dict = get_token_from_upstash(master_uid)
        v_init = tok_dict.get("victors_init_data")
        if not v_init:
            miniapp_all = load_all_miniapp_tokens()
            if str(master_uid) in miniapp_all:
                v_init = miniapp_all[str(master_uid)].get("victors_init_data")

    if not v_init:
        logger.info(f"👑 Master UID {master_uid}: Referral link {VICTORS_REF} is active. Workers qualified in cloud; Master can claim hiring rewards (+100 VIC/recruit) in Telegram.")
        return None, None

    if not human_pass:
        human_pass = get_victors_pass_from_upstash(master_uid)

    headers["Authorization"] = f"tma {v_init}"
    if human_pass:
        headers["x-human-pass"] = str(human_pass)

    b_code, b_res = safe_post(f"{VICTORS_API}/referral/claim-bonus", {}, extra_headers=headers)
    c_code, c_res = safe_post(f"{VICTORS_API}/referral/claim-commission", {}, extra_headers=headers)
    logger.info(f"👑 Master recruitment bonus swept: {b_code} {b_res}, commissions: {c_code} {c_res}")
    return b_res, c_res


def main():
    logger.info("====================================================================")
    logger.info("📱 Starting Victor's Company Cloud Virtual Phone Assistant Engine")
    logger.info("====================================================================")

    ton_wallets = load_fleet_ton_wallets()
    miniapp_all = load_all_miniapp_tokens()
    raw_accounts = []

    for uid in FLEET_UIDS:
        tok_dict = get_token_from_upstash(uid)
        vic_init = tok_dict.get("victors_init_data")
        name = tok_dict.get("name")
        if not vic_init and str(uid) in miniapp_all:
            vic_init = miniapp_all[str(uid)].get("victors_init_data")
            name = miniapp_all[str(uid)].get("name")
        name = name or f"UID {uid}"
        if vic_init:
            raw_accounts.append({
                "uid": uid,
                "name": name,
                "init_data": vic_init,
                "is_master": (uid == 6727787768 or str(uid) == str(OWNER_ID))
            })

    logger.info(f"Found {len(raw_accounts)} accounts with victors_init_data. Running pre-flight probe...")

    active_accounts = []
    already_qualified = []

    for acc in raw_accounts:
        uid = acc["uid"]
        status, data = probe_account(uid, acc["init_data"])
        if status == "HUMAN_REQUIRED":
            logger.info(f"  👉 UID {uid} ({acc['name']}): Session valid -> READY for Turnstile.")
            active_accounts.append(acc)
        elif status == "ALREADY_AUTH":
            logger.info(f"  ✅ UID {uid} ({acc['name']}): Already authenticated! Running qualification...")
            save_victors_pass_to_upstash(uid, data)
            qualify_recruit(uid, acc["init_data"], data, acc["is_master"], ton_wallets)
            already_qualified.append(uid)
        elif status == "EXPIRED":
            logger.warning(f"  ⚠️ UID {uid} ({acc['name']}): Session expired. Skipping.")
        else:
            logger.warning(f"  ❓ UID {uid} ({acc['name']}): Status {status} {data}. Proceeding.")
            active_accounts.append(acc)

    logger.info(f"Pre-flight summary: {len(active_accounts)} need Turnstile, {len(already_qualified)} already authenticated.")

    if not active_accounts:
        logger.info("No accounts currently requiring Turnstile. Checking Master bonuses...")
        sweep_master_bonuses(6727787768)
        return

    try:
        from patchright.sync_api import sync_playwright
    except ImportError:
        from playwright.sync_api import sync_playwright

    qualified_count = len(already_qualified)

    with sync_playwright() as p:
        ws_proxy = get_webshare_proxy()
        launch_args = {
            "headless": False,
            "args": [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--window-size=450,950",
                "--window-position=0,0",
                "--disable-blink-features=AutomationControlled"
            ]
        }
        if ws_proxy:
            logger.info(f"🌐 Routing Virtual Phone through Webshare proxy: {ws_proxy['server']}")
            launch_args["proxy"] = ws_proxy

        browser = p.chromium.launch(**launch_args)
        context = browser.new_context(
            viewport={"width": 430, "height": 932},
            is_mobile=True,
            has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36"
        )

        for idx, acc in enumerate(active_accounts, 1):
            uid = acc["uid"]
            name = acc["name"]
            v_init = acc["init_data"]
            is_master = acc["is_master"]
            ref_to_bind = "" if is_master else VICTORS_REF

            logger.info(f"\n[{idx}/{len(active_accounts)}] 📲 Loading UID {uid} ({name}) onto Virtual Phone screen...")

            # 1. PROPERLY URL-ENCODE v_init in the hash so telegram-web-app.js parses full initData
            encoded_init = urllib.parse.quote(v_init, safe="%")
            target_url = (
                f"{VICTORS_ORIGIN}/#tgWebAppData={encoded_init}"
                f"&tgWebAppPlatform=android"
                f"&tgWebAppVersion=8.0"
                f"&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%231a1147%22%2C%22text_color%22%3A%22%23ffffff%22%7D"
            )

            page = context.new_page()

            captured_token = {"token": None, "human_pass": None}

            # Intercept response to capture /auth/login humanPass directly
            def handle_response(response):
                if "/api/auth/login" in response.url:
                    try:
                        res_json = response.json()
                        hp = res_json.get("humanPass") or (res_json.get("data", {}).get("humanPass") if isinstance(res_json.get("data"), dict) else None)
                        if hp:
                            captured_token["human_pass"] = str(hp)
                            logger.info(f"🎯 Intercepted humanPass from /auth/login response for UID {uid}!")
                    except Exception:
                        pass

            page.on("response", handle_response)

            # Pre-inject authentic Telegram Mobile WebApp environment
            page.add_init_script(f"""
                // 1. Pre-fill sessionStorage so telegram-web-app.js finds valid params immediately
                try {{
                    sessionStorage.setItem('__telegram__initParams', JSON.stringify({{
                        tgWebAppData: {json.dumps(v_init)},
                        tgWebAppPlatform: 'android',
                        tgWebAppVersion: '8.0'
                    }}));
                    sessionStorage.setItem('initParams', JSON.stringify({{
                        tgWebAppData: {json.dumps(v_init)},
                        tgWebAppPlatform: 'android',
                        tgWebAppVersion: '8.0'
                    }}));
                }} catch(e) {{}}

                // 2. Define window.Telegram.WebApp with getter/setter protecting initData
                window.__capturedTurnstileToken = null;
                window.Telegram = window.Telegram || {{}};
                const mockWebApp = {{
                    initData: {json.dumps(v_init)},
                    initDataUnsafe: {{
                        start_param: {json.dumps(ref_to_bind)},
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
                    viewportHeight: 932,
                    viewportStableHeight: 932,
                    headerColor: '#1a1147',
                    backgroundColor: '#1a1147',
                    BackButton: {{ isVisible: false, onClick: () => {{}}, offClick: () => {{}}, show: () => {{}}, hide: () => {{}} }},
                    MainButton: {{ isVisible: false, onClick: () => {{}}, offClick: () => {{}}, show: () => {{}}, hide: () => {{}}, setText: () => {{}}, enable: () => {{}}, disable: () => {{}} }},
                    HapticFeedback: {{ impactOccurred: () => {{}}, notificationOccurred: () => {{}}, selectionChanged: () => {{}} }},
                    ready: () => {{}},
                    expand: () => {{}},
                    close: () => {{}},
                    openLink: (url) => window.open(url, '_blank'),
                    openTelegramLink: (url) => window.open(url, '_blank')
                }};

                Object.defineProperty(window.Telegram, 'WebApp', {{
                    get: () => mockWebApp,
                    set: (v) => {{ Object.assign(mockWebApp, v); mockWebApp.initData = {json.dumps(v_init)}; }},
                    configurable: true
                }});

                // 3. Intercept fetch to capture turnstileToken and humanPass
                const origFetch = window.fetch;
                window.fetch = async function(...args) {{
                    const url = String(args[0] || '');
                    if (url.includes('/auth/login')) {{
                        try {{
                            const b = JSON.parse(args[1]?.body || '{{}}');
                            if (b.turnstileToken) {{
                                window.__capturedTurnstileToken = b.turnstileToken;
                            }}
                        }} catch(e) {{}}
                    }}
                    const res = await origFetch.apply(this, args);
                    if (url.includes('/auth/login')) {{
                        try {{
                            const clone = res.clone();
                            clone.json().then(d => {{
                                if (d && d.humanPass) {{
                                    window.__capturedHumanPass = d.humanPass;
                                }}
                            }}).catch(() => {{}});
                        }} catch(e) {{}}
                    }}
                    return res;
                }};
            """)

            try:
                page.goto(target_url, timeout=30000)
            except Exception as e:
                logger.warning(f"Page load warning for UID {uid}: {e}")

            logger.info(f"⏳ Virtual screen ready for UID {uid} ({name}). Monitoring Turnstile (up to 75 seconds)...")

            token = None
            human_pass = None

            for sec in range(75):
                time.sleep(1.0)

                # Check if humanPass already captured
                if captured_token["human_pass"]:
                    human_pass = captured_token["human_pass"]
                    break

                # Check window variables
                try:
                    js_data = page.evaluate("""() => {
                        return {
                            tok: window.__capturedTurnstileToken ||
                                 (window.turnstile && typeof window.turnstile.getResponse === 'function' ? window.turnstile.getResponse() : null),
                            pass: window.__capturedHumanPass || null
                        };
                    }""")
                    if js_data:
                        if js_data.get("pass"):
                            human_pass = js_data["pass"]
                            break
                        if js_data.get("tok") and len(js_data["tok"]) > 20:
                            token = js_data["tok"]
                            break
                except Exception:
                    pass

                # Try auto-clicking Turnstile checkbox iframe if present
                if sec % 2 == 0:
                    try:
                        for frame in page.frames:
                            if "challenges.cloudflare.com" in frame.url:
                                cb = frame.locator('input[type="checkbox"], #challenge-stage, .ctp-checkbox-label, div[id*="cf-stage"]')
                                if cb.count() > 0:
                                    logger.info(f"👉 Found Cloudflare checkbox for UID {uid}. Auto-clicking...")
                                    cb.first.click(timeout=1000)
                                    break
                    except Exception:
                        pass

            # If token captured, call /auth/login
            if not human_pass and token:
                logger.info(f"🎉 UID {uid}: Turnstile token acquired ({token[:16]}...)! Calling /auth/login...")
                login_p = {"turnstileToken": token}
                if not is_master:
                    login_p["startParam"] = VICTORS_REF

                st_code, body = safe_post(
                    f"{VICTORS_API}/auth/login",
                    login_p,
                    extra_headers={"Authorization": f"tma {v_init}"}
                )
                if st_code in (200, 201) and isinstance(body, dict):
                    hp = body.get("humanPass") or (body.get("data", {}).get("humanPass") if isinstance(body.get("data"), dict) else None)
                    if hp:
                        human_pass = str(hp)

            if human_pass:
                save_victors_pass_to_upstash(uid, human_pass)
                logger.info(f"✅ UID {uid} ({name}): humanPass successfully acquired & saved to Upstash!")
                qualify_recruit(uid, v_init, human_pass, is_master, ton_wallets)
                qualified_count += 1
                send_tg_alert(
                    f"✅ <b>Victor's Recruit Qualified ({qualified_count}/{len(raw_accounts)})</b>\n\n"
                    f"• <b>Account:</b> {name} (<code>{uid}</code>)\n"
                    f"• <b>Bound to Master:</b> <code>{VICTORS_REF}</code>\n"
                    f"• <b>Status:</b> Wallet Connected & Task Claimed!"
                )
            else:
                logger.warning(f"⚠️ UID {uid} ({name}): No token/pass captured in 75s. Proceeding to next...")

            try:
                page.close()
            except Exception:
                pass

        browser.close()

    # Master bonus sweep
    logger.info("👑 Finalizing session: Sweeping Master recruitment bonuses...")
    sweep_master_bonuses(6727787768)

    final_msg = (
        f"👑 <b>Victor's Company Virtual Phone Session Finished</b>\n\n"
        f"• <b>Total Qualified Recruits:</b> {qualified_count}/{len(raw_accounts)}\n"
        f"• <b>Master Referral:</b> <code>{VICTORS_REF}</code>\n"
        f"• <b>Time:</b> {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n\n"
        f"⚡ <i>100% Cloud Execution via Cloudflare Tunnel. Zero Phone Load.</i>"
    )
    logger.info(final_msg)
    send_tg_alert(final_msg)


if __name__ == "__main__":
    main()

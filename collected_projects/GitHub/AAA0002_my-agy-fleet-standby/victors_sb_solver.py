#!/usr/bin/env python3
"""
victors_sb_solver.py
Dedicated 100% Cloud Turnstile Solver & Referral Qualification Engine for Victor's Company (@VictorsCompanybot).
Runs in GitHub Actions / Cloud VMs using SeleniumBase UC Mode + CDP Stealth (Zero Phone Load).
Bypasses Cloudflare Turnstile natively without requiring paid third-party APIs.
Qualifies all fleet recruits under Master referral ref_A20AA96F18.
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
logger = logging.getLogger("victors_sb_solver")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

UPSTASH_URL = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""
ALERT_BOT_TOKEN = os.getenv("ALERT_BOT_TOKEN") or ""
OWNER_ID = os.getenv("OWNER_ID") or "6727787768"

if not UPSTASH_TOKEN:
    env_file = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_file):
        try:
            with open(env_file, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    if "=" in line and "UPSTASH" in line:
                        k, v = line.strip().split("=", 1)
                        if "URL" in k and not os.getenv("UPSTASH_URL"):
                            UPSTASH_URL = v.strip("\"' ")
                        if "TOKEN" in k and not UPSTASH_TOKEN:
                            UPSTASH_TOKEN = v.strip("\"' ")
        except Exception:
            pass

VICTORS_SITEKEY = "0x4AAAAAAFD0KRgPRFVwDvgn"
VICTORS_ORIGIN = "https://app.victors.company"
VICTORS_API = "https://server.victors.company/api"
VICTORS_REF = "ref_A20AA96F18"

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


def get_webshare_proxy() -> str | None:
    """Fetches active, pre-tested proxy string from Webshare in user:pass@host:port format."""
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
                                    return f"{u}:{pw}@{host}:{port}"
                        except Exception:
                            continue
        except Exception as e:
            logger.warning(f"Webshare proxy fetch warning ({key[:8]}...): {e}")
    return None


def send_tg_alert(text: str):
    """Sends notification to Owner Telegram & Admin Notification Channel."""
    if not ALERT_BOT_TOKEN:
        return
    targets = list(set([t for t in [OWNER_ID, os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")] if t]))
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
            logger.warning(f"Failed to send Telegram alert to {chat_id}: {e}")


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
        logger.warning(f"Error fetching TON wallets from Upstash Redis: {e}")
    return {}


def load_all_miniapp_tokens() -> dict:
    """Fetch miniapp_tokens master dictionary from Upstash Redis with local file fallback."""
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

    local_file = os.path.join(os.path.dirname(__file__), "fleet_miniapp_tokens.json")
    if os.path.exists(local_file):
        try:
            with open(local_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
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
        logger.warning(f"Upstash token fetch warning for UID {uid}: {e}")
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
    """Rapid health probe to check session validity."""
    existing_hp = get_victors_pass_from_upstash(uid)
    if existing_hp:
        code, body = safe_get(
            f"{VICTORS_API}/me",
            extra_headers={"Authorization": f"tma {v_init}", "x-human-pass": existing_hp}
        )
        if code == 200 and isinstance(body, dict) and body.get("success") is True:
            return "ALREADY_AUTH", existing_hp

    code, body = safe_post(
        f"{VICTORS_API}/auth/login",
        {"startParam": VICTORS_REF},
        extra_headers={"Authorization": f"tma {v_init}"}
    )
    if code in (401, 403) and isinstance(body, dict) and (body.get("code") == "HUMAN_REQUIRED" or "human" in str(body).lower()):
        return "HUMAN_REQUIRED", None
    elif code in (200, 201) and isinstance(body, dict):
        hp = body.get("humanPass") or (body.get("data", {}).get("humanPass") if isinstance(body.get("data"), dict) else None)
        if hp:
            return "ALREADY_AUTH", hp
    elif code == 401:
        if isinstance(body, dict) and ("expired" in str(body.get("error", "")).lower() or body.get("code") == "SESSION_EXPIRED"):
            return "EXPIRED", body
        return "HUMAN_REQUIRED", None

    return "UNKNOWN", body


def play_deep_mine_sync(uid: int, v_headers: dict, max_runs: int = 2):
    """Executes safe Deep Mine expeditions synchronously (Rows 0-1 safe mining)."""
    try:
        # Check current balance
        m_code, m_res = safe_get(f"{VICTORS_API}/me", extra_headers=v_headers)
        if m_code != 200 or not isinstance(m_res, dict):
            return
        bal = m_res.get("state", {}).get("user", {}).get("inAppBalance", 0)

        for _ in range(max_runs):
            a_code, a_res = safe_get(f"{VICTORS_API}/arcade", extra_headers=v_headers)
            if a_code != 200 or not isinstance(a_res, dict):
                break
            active_run = a_res.get("mine")
            mine_meta = next((g for g in a_res.get("games", []) if isinstance(g, dict) and g.get("id") == "mine"), None)
            plays_left = mine_meta.get("playsLeft", 0) if mine_meta else 0

            if not active_run:
                if plays_left <= 0 or bal < 25:
                    break
                s_code, s_res = safe_post(f"{VICTORS_API}/arcade/mine/start", {"tool": "shovel", "items": {}}, extra_headers=v_headers)
                if s_code not in (200, 201) or not isinstance(s_res, dict) or not s_res.get("success"):
                    break
                active_run = s_res.get("run")
                bal -= 25

            if not active_run or active_run.get("status") != "active":
                break

            run = active_run
            while run.get("status") == "active":
                open_s = run.get("open", "0" * 360)
                rock_s = run.get("rock", "0" * 360)
                hint_s = run.get("hint", "0" * 360)
                energy = run.get("energy", 0)
                bag = run.get("bag", 0.0)

                if energy <= 1 or bag >= 28.5:
                    break

                # Safe candidate tiles in row 0 & 1
                cands = []
                for y in range(2):
                    for x in range(9):
                        idx = y * 9 + x
                        if idx >= len(open_s) or open_s[idx] == "1":
                            continue
                        if y == 1 and open_s[x] != "1":
                            continue
                        is_rock = (idx < len(rock_s) and rock_s[idx] == "1")
                        cost = 2 if is_rock else 1
                        if energy < cost:
                            continue
                        hint_val = int(hint_s[idx]) if idx < len(hint_s) and hint_s[idx].isdigit() else 0
                        prio = (100 if (hint_val & 1) else 50) - (25 if is_rock else 0)
                        cands.append({"x": x, "y": y, "priority": prio})

                if not cands:
                    break

                cands.sort(key=lambda c: c["priority"], reverse=True)
                pick = cands[0]
                time.sleep(0.15)
                d_code, d_res = safe_post(f"{VICTORS_API}/arcade/mine/dig", {"x": pick["x"], "y": pick["y"]}, extra_headers=v_headers)
                if d_code not in (200, 201) or not isinstance(d_res, dict) or not d_res.get("success"):
                    break
                run = d_res.get("run") or run
                if d_res.get("result"):
                    res_obj = d_res.get("result", {})
                    bal = d_res.get("state", {}).get("user", {}).get("inAppBalance", bal + res_obj.get("paid", 0))
                    logger.info(f"🏆 UID {uid}: Deep Mine auto-concluded: Paid={res_obj.get('paid', 0)} VIC (Net: {res_obj.get('net', 0):+.1f} VIC), New Bal: {bal} VIC")
                    run["status"] = "ended"
                    break

            if run.get("status") == "active":
                e_code, e_res = safe_post(f"{VICTORS_API}/arcade/mine/end", {}, extra_headers=v_headers)
                if e_code in (200, 201) and isinstance(e_res, dict) and e_res.get("success"):
                    res_obj = e_res.get("result", {})
                    bal = e_res.get("state", {}).get("user", {}).get("inAppBalance", bal + res_obj.get("paid", 0))
                    logger.info(f"🏆 UID {uid}: Deep Mine cashed out: Paid={res_obj.get('paid', 0)} VIC (Net: {res_obj.get('net', 0):+.1f} VIC), New Bal: {bal} VIC")
    except Exception as e:
        logger.warning(f"UID {uid} arcade execution note: {e}")


def run_pipeline_for_account(uid: int, v_init: str, human_pass: str, is_master: bool, ton_wallets: dict):
    """Executes the full recruitment qualification pipeline."""
    v_headers = {
        "Content-Type": "application/json",
        "Authorization": f"tma {v_init}",
        "x-human-pass": str(human_pass),
        "Origin": VICTORS_ORIGIN,
        "Referer": f"{VICTORS_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
    }

    try:
        # 1. Tutorial & checkin
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

        # 3. Dynamic Task Discovery & Claims
        t_code, t_res = safe_get(f"{VICTORS_API}/tasks", extra_headers=v_headers)
        if t_code == 200 and isinstance(t_res, dict):
            for t in t_res.get("tasks", []):
                if isinstance(t, dict) and t.get("status") == "open":
                    tid = t.get("taskId") or t.get("id")
                    if tid:
                        time.sleep(0.3)
                        c_code, c_res = safe_post(f"{VICTORS_API}/tasks/claim", {"taskId": tid}, extra_headers=v_headers)
                        if c_code in (200, 201) and isinstance(c_res, dict) and c_res.get("success"):
                            logger.info(f"🎁 UID {uid}: Claimed task {tid} (+{c_res.get('reward', t.get('reward', 0))} VIC)")

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

        # 5. Mining claim (harvests accrued mining tokens)
        c_code, c_res = safe_post(f"{VICTORS_API}/mining/claim", {}, extra_headers=v_headers)
        logger.info(f"⛏️ UID {uid}: Mining claim response: {c_code} {c_res}")

        # 6. Autonomous Deep Mine Arcade Solver (Rows 0-1 safe mining)
        play_deep_mine_sync(uid, v_headers)
    except Exception as e:
        logger.error(f"UID {uid} pipeline execution exception: {e}")


def sweep_master_bonuses(master_uid: int):
    """Sweeps recruitment hiring bonus (+100 V per qualified recruit) for Master Account."""
    tok_dict = get_token_from_upstash(master_uid)
    v_init = tok_dict.get("victors_init_data")
    if not v_init:
        miniapp_all = load_all_miniapp_tokens()
        if str(master_uid) in miniapp_all:
            v_init = miniapp_all[str(master_uid)].get("victors_init_data")

    if not v_init:
        logger.info(f"👑 Master UID {master_uid}: Referral link {VICTORS_REF} is active. Workers qualified in cloud; Master can claim hiring rewards (+100 VIC/recruit) in Telegram.")
        return

    hp = get_victors_pass_from_upstash(master_uid)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"tma {v_init}",
        "Origin": VICTORS_ORIGIN,
        "Referer": f"{VICTORS_ORIGIN}/",
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
    }
    if hp:
        headers["x-human-pass"] = str(hp)

    b_code, b_res = safe_post(f"{VICTORS_API}/referral/claim-bonus", {}, extra_headers=headers)
    c_code, c_res = safe_post(f"{VICTORS_API}/referral/claim-commission", {}, extra_headers=headers)
    logger.info(f"👑 Master recruitment bonus swept: {b_code} {b_res}, commissions: {c_code} {c_res}")


def solve_victors_with_seleniumbase():
    """Main execution using SeleniumBase UC mode to solve Turnstile for Victor's accounts."""
    try:
        from seleniumbase import SB
    except ImportError:
        logger.error("SeleniumBase not installed. Please install with: pip install seleniumbase")
        return

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

    logger.info(f"🏢 Found {len(raw_accounts)} accounts with Victor's Company initData. Running pre-flight probe...")

    active_accounts = []
    solved_count = 0

    for acc in raw_accounts:
        uid = acc["uid"]
        status, data = probe_account(uid, acc["init_data"])
        if status == "HUMAN_REQUIRED":
            logger.info(f"  👉 UID {uid} ({acc['name']}): Session valid -> READY for Turnstile.")
            active_accounts.append(acc)
        elif status == "ALREADY_AUTH":
            logger.info(f"  ✅ UID {uid} ({acc['name']}): Already authenticated! Running qualification...")
            save_victors_pass_to_upstash(uid, data)
            run_pipeline_for_account(uid, acc["init_data"], data, acc["is_master"], ton_wallets)
            solved_count += 1
        elif status == "EXPIRED":
            logger.warning(f"  ⚠️ UID {uid} ({acc['name']}): Session expired. Skipping.")
        else:
            active_accounts.append(acc)

    if not active_accounts:
        logger.info("No accounts currently requiring Turnstile. Checking Master bonuses...")
        sweep_master_bonuses(6727787768)
        return

    # Run SeleniumBase directly (proxy-less) to prevent Chrome proxy authentication extension blank page hangs (Body='')
    sb_kwargs = {"uc": True, "test": True, "xvfb": True, "locale": "en", "ad_block": False}
    logger.info("⚡ Running SeleniumBase directly on clean runner IP (eliminates proxy auth extension hangs)")

    with SB(**sb_kwargs) as sb:
        for acc in active_accounts:
            uid = acc["uid"]
            name = acc["name"]
            v_init = acc["init_data"]
            is_master = acc["is_master"]
            ref_to_bind = "" if is_master else VICTORS_REF

            logger.info(f"🚀 Processing UID {uid} ({name}, is_master={is_master})...")
            encoded_init = urllib.parse.quote(v_init, safe="")
            target_url = (
                f"{VICTORS_ORIGIN}/#tgWebAppData={encoded_init}"
                f"&tgWebAppPlatform=android"
                f"&tgWebAppVersion=8.0"
                f"&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%231a1147%22%2C%22text_color%22%3A%22%23ffffff%22%7D"
            )

            mock_telegram_js = f"""
                window.__victorsTurnstileToken = null;
                window.__victorsHumanPass = null;

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
                            if (!_tg.WebApp) _tg.WebApp = mockWebApp;
                            else {{
                                _tg.WebApp.initData = {json.dumps(v_init)};
                                _tg.WebApp.initDataUnsafe = {{
                                    start_param: {json.dumps(ref_to_bind)},
                                    user: {{ id: {uid} }}
                                }};
                            }}
                        }}
                    }});
                }} catch(e) {{}}

                // Intercept window.turnstile.render to hook callback
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

                // Intercept fetch to capture humanPass from /auth/login response directly
                const origFetch = window.fetch;
                window.fetch = async function(...args) {{
                    const url = String(args[0] || '');
                    if (url.includes('/auth/login')) {{
                        try {{
                            const b = JSON.parse(args[1]?.body || '{{}}');
                            if (b.turnstileToken) {{
                                window.__victorsTurnstileToken = b.turnstileToken;
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
                            }}
                        }} catch(e) {{}}
                    }}
                    return res;
                }};
            """

            try:
                try:
                    sb.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {"source": mock_telegram_js})
                except Exception as cdp_err:
                    logger.warning(f"CDP script injection note: {cdp_err}")

                try:
                    sb.uc_open_with_reconnect(target_url, reconnect_time=4)
                except Exception:
                    sb.uc_open(target_url)
                sb.sleep(1.0)
                try:
                    sb.execute_script(mock_telegram_js)
                except Exception:
                    pass
                sb.sleep(2.0)
                try:
                    title = sb.get_title()
                    current_url = sb.get_current_url()
                    body_snippet = sb.get_text("body")[:250].replace("\n", " ")
                    iframe_count = len(sb.find_elements("iframe"))
                    logger.info(f"🔎 UID {uid} page state: Title='{title}', URL='{current_url}', Iframes={iframe_count}, Body='{body_snippet}'")
                except Exception as diag_err:
                    logger.warning(f"Diagnostics error: {diag_err}")
                token = None
                human_pass = None

                for attempt in range(35):
                    captured = sb.execute_script("""
                        let hp = window.__victorsHumanPass || null;
                        let tok = window.__victorsTurnstileToken || null;
                        if (!tok) {
                            let el = document.querySelector('[name="cf-turnstile-response"]');
                            if (el && el.value) tok = el.value;
                            if (!tok) {
                                for (const e of document.querySelectorAll('*')) {
                                    if (e.shadowRoot) {
                                        let s_el = e.shadowRoot.querySelector('[name="cf-turnstile-response"]');
                                        if (s_el && s_el.value) { tok = s_el.value; break; }
                                    }
                                }
                            }
                        }
                        if (!tok && window.turnstile && typeof window.turnstile.getResponse === 'function') {
                            try { tok = window.turnstile.getResponse() || null; } catch(e) {}
                        }
                        return { humanPass: hp, token: tok };
                    """)
                    if captured:
                        human_pass = captured.get("humanPass")
                        token = captured.get("token")
                        if human_pass:
                            break
                        if token and len(token) > 20:
                            break

                    iframe_info = sb.execute_script("""
                        function findCfIframe(root) {
                            if (!root) return null;
                            let iframes = root.querySelectorAll ? Array.from(root.querySelectorAll('iframe')) : [];
                            for (let f of iframes) {
                                if (f.src && (f.src.includes('challenges.cloudflare.com') || f.src.includes('turnstile'))) return f;
                            }
                            let all = root.querySelectorAll ? root.querySelectorAll('*') : [];
                            for (let el of all) {
                                if (el.shadowRoot) {
                                    let found = findCfIframe(el.shadowRoot);
                                    if (found) return found;
                                }
                            }
                            return null;
                        }

                        let cf_if = findCfIframe(document);
                        let cont = document.querySelector('div[class*="min-h"]') || document.querySelector('div[ref]');
                        let cont_rect = cont ? cont.getBoundingClientRect() : null;

                        if (cf_if) {
                            let rect = cf_if.getBoundingClientRect();
                            return {
                                present: true,
                                x: rect.left || (cont_rect ? cont_rect.left : 0),
                                y: rect.top || (cont_rect ? cont_rect.top : 0),
                                width: rect.width || (cont_rect ? cont_rect.width : 300),
                                height: rect.height || (cont_rect ? cont_rect.height : 65)
                            };
                        }
                        if (cont_rect && cont_rect.height > 20) {
                            return {
                                present: true,
                                container: true,
                                x: cont_rect.left,
                                y: cont_rect.top,
                                width: cont_rect.width,
                                height: cont_rect.height
                            };
                        }
                        return { present: false };
                    """)

                    if (iframe_info and iframe_info.get("present")) or sb.is_element_present("iframe[src*='challenges.cloudflare.com']"):
                        try:
                            sb.solve_captcha()
                        except Exception:
                            pass
                        try:
                            sb.uc_gui_click_captcha()
                        except Exception:
                            pass
                        if iframe_info and iframe_info.get("present"):
                            try:
                                bx = iframe_info.get("x", 0) + 32
                                by = iframe_info.get("y", 0) + (iframe_info.get("height", 65) / 2)
                                sb.driver.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": bx, "y": by})
                                time.sleep(0.05)
                                sb.driver.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": bx, "y": by, "button": "left", "clickCount": 1})
                                time.sleep(0.1)
                                sb.driver.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": bx, "y": by, "button": "left", "clickCount": 1})
                            except Exception:
                                pass
                    else:
                        # 1. Trigger interaction-only activation by real CDP click on the Turnstile host container
                        try:
                            cont_pos = sb.execute_script("""
                                const el = document.querySelector('div[class*="min-h"]') || document.querySelector('h1') || document.body;
                                if (el) {
                                    const r = el.getBoundingClientRect();
                                    return { x: r.left + 35, y: r.top + 35 };
                                }
                                return null;
                            """)
                            if cont_pos:
                                sb.driver.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseMoved", "x": cont_pos["x"], "y": cont_pos["y"]})
                                sb.driver.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mousePressed", "x": cont_pos["x"], "y": cont_pos["y"], "button": "left", "clickCount": 1})
                                time.sleep(0.05)
                                sb.driver.execute_cdp_cmd("Input.dispatchMouseEvent", {"type": "mouseReleased", "x": cont_pos["x"], "y": cont_pos["y"], "button": "left", "clickCount": 1})
                        except Exception:
                            pass

                        # 2. Programmatic render fallback with script tag injection & appearance: always
                        if attempt > 2:
                            try:
                                sb.execute_script("""
                                    if (!window.turnstile || typeof window.turnstile.render !== 'function') {
                                        if (!document.getElementById('sb-cf-script')) {
                                            let s = document.createElement('script');
                                            s.id = 'sb-cf-script';
                                            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                                            document.head.appendChild(s);
                                        }
                                    }
                                """)
                            except Exception:
                                pass

                        if attempt > 4:
                            try:
                                sb.execute_script(f"""
                                    if (window.turnstile && typeof window.turnstile.render === 'function' && !document.getElementById('sb-cf-slot')) {{
                                        let slot = document.createElement('div');
                                        slot.id = 'sb-cf-slot';
                                        slot.style.position = 'fixed';
                                        slot.style.top = '50%';
                                        slot.style.left = '50%';
                                        slot.style.transform = 'translate(-50%, -50%)';
                                        slot.style.width = '300px';
                                        slot.style.height = '65px';
                                        slot.style.zIndex = '9999999';
                                        slot.style.background = '#1a1147';
                                        document.body.appendChild(slot);
                                        window.turnstile.render(slot, {{
                                            sitekey: '{VICTORS_SITEKEY}',
                                            action: 'login',
                                            theme: 'dark',
                                            appearance: 'always',
                                            callback: function(tok) {{
                                                window.__victorsTurnstileToken = tok;
                                            }}
                                        }});
                                    }}
                                """)
                            except Exception:
                                pass

                    sb.sleep(1.0)

                if token and not human_pass:
                    logger.info(f"✅ UID {uid}: Cloudflare Turnstile token obtained ({token[:16]}...)!")
                    login_p = {
                        "turnstileToken": token,
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
                        human_pass = body.get("humanPass") or (body.get("data", {}).get("humanPass") if isinstance(body.get("data"), dict) else None)
                    else:
                        logger.warning(f"UID {uid} /auth/login error: {st_code} {body}")

                if human_pass:
                    logger.info(f"🎉 UID {uid}: Acquired humanPass ({human_pass[:16]}...)! Executing qualification pipeline...")
                    save_victors_pass_to_upstash(uid, str(human_pass))
                    run_pipeline_for_account(uid, v_init, str(human_pass), is_master, ton_wallets)
                    solved_count += 1
                    send_tg_alert(f"✅ <b>Victor's Recruit Qualified ({solved_count}/{len(raw_accounts)})</b>\nUID: <code>{uid}</code> bound to <code>{VICTORS_REF}</code>!")
                else:
                    logger.warning(f"UID {uid}: Turnstile could not be solved in this cycle.")

            except Exception as e:
                logger.warning(f"UID {uid} processing note: {e}")

            sb.sleep(1.0)

    sweep_master_bonuses(6727787768)

    report_msg = (
        f"🏢 <b>Victor's Company Cloud Turnstile Solver Report</b>\n\n"
        f"• <b>Accounts Processed:</b> {len(raw_accounts)}\n"
        f"• <b>Turnstile Solved & Qualified:</b> {solved_count}/{len(raw_accounts)}\n"
        f"• <b>Master Referral Bound:</b> <code>{VICTORS_REF}</code>\n"
        f"• <b>Execution Time:</b> {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}\n\n"
        f"⚡ <i>100% Cloud Execution (SeleniumBase UC Stealth). Zero phone load.</i>"
    )
    logger.info(f"📢 Final: {solved_count}/{len(raw_accounts)} accounts solved & qualified.")
    send_tg_alert(report_msg)


if __name__ == "__main__":
    solve_victors_with_seleniumbase()

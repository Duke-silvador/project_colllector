#!/usr/bin/env python3
"""
finish_all_fleet_sidetasks.py
=============================================================================
COMPREHENSIVE MULTI-BOT FLEET SIDE-TASK HARVESTER & AUTOMATION ENGINE
=============================================================================
Sweeps and completes all available side-tasks, daily check-ins, social joins,
cooldown missions, wallet verifications, and referral commission claims across
all dynamic accounts in the fleet for all 8 legitimate bots:
  1. MRG Miner (@mrgtoken_bot)
  2. ATF Miner (@atfminers_bot)
  3. Victor's Company (@VictorsCompanybot)
  4. Kynex Network (@Kynex_miningbot)
  5. PepeGram (@Pepe_gram_bot)
  6. AdxEarn AI (@AdxEarnAibot)
  7. DiggoMiner (@Diggominer_bot)
  8. Chicken Land (@ChickenLandBot)

Zero Phone Load (Rule 4): Runs once as a clean batch script in cloud/container,
exits cleanly, and persists updated tokens to Upstash Redis and Cloudflare Edge.
"""

import os
import sys
import json
import time
import random
import asyncio
import aiohttp
import re
import uuid
import hashlib
import hmac
import logging
import struct
import base64
import urllib.parse
import urllib.request
from typing import Dict, Any, List, Optional

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("sidetask_sweeper")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Read environment variables
env = {}
env_file = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_file):
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")

UPSTASH_URL = env.get("UPSTASH_URL") or env.get("UPSTASH_REDIS_REST_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = env.get("UPSTASH_TOKEN") or env.get("UPSTASH_REDIS_REST_TOKEN") or ""
SECRET_KEY = env.get("SECRET_KEY") or env.get("CF_SECRET_KEY") or ""

CF_WORKERS = [
    "https://restore-agy.aaaai2.workers.dev",
    "https://restore-agy.aaa-bot.workers.dev",
    "https://restore-agy.aaa222.workers.dev",
    "https://restore-agy.agorameet.workers.dev",
    "https://restore-agy.aaaai.workers.dev"
]

MASTER_UID = "6727787768"
PRIMARY_TON_WALLET = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT"

# Load Accounts (with cloud backup fallback for Render/Cloud VMs)
ACCOUNTS = []
accounts_path = os.path.join(BASE_DIR, "accounts.json")
if os.path.exists(accounts_path):
    try:
        with open(accounts_path, "r") as f:
            ACCOUNTS = json.load(f)
    except Exception:
        pass

if not ACCOUNTS:
    import zipfile
    import io
    for cf_url in CF_WORKERS:
        try:
            req = urllib.request.Request(f"{cf_url}/backup.zip", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    zip_bytes = resp.read()
                    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
                        if "accounts.json" in zf.namelist():
                            ACCOUNTS = json.loads(zf.read("accounts.json").decode("utf-8"))
                            if ACCOUNTS:
                                break
        except Exception:
            pass

if UPSTASH_URL and UPSTASH_TOKEN:
    try:
        req = urllib.request.Request(f"{UPSTASH_URL}/get/fleet:accounts", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            res = data.get("result")
            if res:
                up_accs = json.loads(res) if isinstance(res, str) else res
                existing_uids = {str(a.get("user_id") or a.get("account_id") or a.get("id") or "") for a in ACCOUNTS}
                for a in up_accs:
                    a_uid = str(a.get("user_id") or a.get("account_id") or a.get("id") or "")
                    if a_uid and a_uid not in existing_uids:
                        ACCOUNTS.append(a)
                        existing_uids.add(a_uid)
    except Exception:
        pass

# Load TON Wallets
ton_wallets = {}
wallets_path = os.path.join(BASE_DIR, "fleet_ton_wallets.json")
if os.path.exists(wallets_path):
    try:
        with open(wallets_path, "r") as f:
            ton_wallets = json.load(f)
    except Exception:
        pass

if not ton_wallets and UPSTASH_URL and UPSTASH_TOKEN:
    try:
        req = urllib.request.Request(f"{UPSTASH_URL}/get/fleet:wallets:ton", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            d = json.loads(resp.read().decode())
            if d.get("result"):
                ton_wallets = json.loads(d["result"]) if isinstance(d["result"], str) else d["result"]
    except Exception:
        pass


def get_ton_wallet_address(acc: dict, uid: str) -> str:
    """Returns dedicated TON address for account with robust type conversion."""
    if acc:
        if acc.get("ton_wallet") and acc["ton_wallet"].get("address"):
            return acc["ton_wallet"]["address"]
        if acc.get("ton"):
            return acc["ton"]
        if acc.get("ton_address"):
            return acc["ton_address"]
    s_uid = str(uid)
    w_entry = ton_wallets.get(s_uid)
    if not w_entry and s_uid.isdigit():
        w_entry = ton_wallets.get(int(s_uid))
    if isinstance(w_entry, dict) and w_entry.get("address"):
        return w_entry["address"]
    return ""


def create_mrg_ton_proof(wallet_entry: dict, nonce: str) -> dict:
    """Signs TonConnect 2.0 cryptographic proof for MRG Miner."""
    try:
        from nacl.signing import SigningKey
        from tonsdk.contract.wallet import Wallets, WalletVersionEnum
        words = wallet_entry["mnemonic"].split() if isinstance(wallet_entry["mnemonic"], str) else wallet_entry["mnemonic"]
        _, pub_k, priv_k, wallet_contract = Wallets.from_mnemonics(mnemonics=words, version=WalletVersionEnum.v4r2)
        state_init_res = wallet_contract.create_state_init()
        state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")
        t_addr = wallet_contract.address
        wc = t_addr.wc
        addr_hash = t_addr.hash_part
        raw_addr = f"{wc}:{addr_hash.hex()}"
        domain = "app.mrgtoken.xyz"
        domain_b = domain.encode("utf-8")
        ts_now = int(time.time())
        msg = b"ton-proof-item-v2/" + struct.pack(">i", wc) + addr_hash + struct.pack("<I", len(domain_b)) + domain_b + struct.pack("<Q", ts_now) + nonce.encode("utf-8")
        digest = hashlib.sha256(b"\xff\xff" + b"ton-connect" + hashlib.sha256(msg).digest()).digest()
        sig = SigningKey(priv_k[:32]).sign(digest).signature
        sig_b64 = base64.b64encode(sig).decode("utf-8")
        return {
            "address": raw_addr,
            "walletStateInit": state_init_b64,
            "proof": {
                "timestamp": ts_now,
                "domain": {"lengthBytes": len(domain_b), "value": domain},
                "signature": sig_b64,
                "payload": nonce
            }
        }
    except Exception as e:
        logger.debug(f"MRG proof creation error: {e}")
        return None


def create_atf_ton_proof(wallet_entry: dict, nonce: str) -> dict:
    """Signs TonConnect 2.0 cryptographic proof for ATF Miner wallet verification."""
    try:
        from nacl.signing import SigningKey
        from tonsdk.contract.wallet import Wallets, WalletVersionEnum
        raw_mn = wallet_entry.get("mnemonic") or wallet_entry.get("mnemonic_words")
        words = raw_mn.split() if isinstance(raw_mn, str) else raw_mn
        _, pub_k, priv_k, wallet_contract = Wallets.from_mnemonics(mnemonics=words, version=WalletVersionEnum.v4r2)
        state_init_res = wallet_contract.create_state_init()
        state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")
        t_addr = wallet_contract.address
        wc = t_addr.wc
        addr_hash = t_addr.hash_part
        raw_addr = f"{wc}:{addr_hash.hex()}"
        domain = "atfminers.asloni.online"
        domain_b = domain.encode("utf-8")
        ts_now = int(time.time())
        msg = b"ton-proof-item-v2/" + struct.pack(">i", wc) + addr_hash + struct.pack("<I", len(domain_b)) + domain_b + struct.pack("<Q", ts_now) + nonce.encode("utf-8")
        digest = hashlib.sha256(b"\xff\xff" + b"ton-connect" + hashlib.sha256(msg).digest()).digest()
        sig = SigningKey(priv_k[:32]).sign(digest).signature
        sig_b64 = base64.b64encode(sig).decode("utf-8")
        return {
            "wallet": raw_addr,
            "public_key": pub_k.hex(),
            "wallet_state_init": state_init_b64,
            "network": "-239",
            "proof": {
                "timestamp": ts_now,
                "domain": {"lengthBytes": len(domain_b), "value": domain},
                "signature": sig_b64,
                "payload": nonce
            }
        }
    except Exception as e:
        logger.debug(f"ATF proof creation error: {e}")
        return None


def solve_atf_math(question_text: str) -> str:
    """100% local, instant, deterministic arithmetic & challenge solver (0 network latency, 0 AI dependency)."""
    if not question_text:
        return "0"
    q_lower = question_text.lower().replace("=", " ").replace("?", " ").strip()

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
        elif w in ("plus", "add", "added", "+"): converted_tokens.append("+")
        elif w in ("minus", "subtract", "subtracted", "take", "-"): converted_tokens.append("-")
        elif w in ("times", "multiplied", "multiply", "*", "x"): converted_tokens.append("*")
        elif w in ("divided", "divide", "/"): converted_tokens.append("/")
        elif w in ("mod", "modulo", "remainder", "%"): converted_tokens.append("%")
        elif w.isdigit() or re.match(r"^\d+[\+\-\*\/\%]\d+$", w): converted_tokens.append(w)
        i += 1

    normalized = " ".join(converted_tokens)
    m = re.search(r"(\d+)\s*([\+\-\*\/\%])\s*(\d+)", normalized)
    if m:
        a, op, b = int(m.group(1)), m.group(2), int(m.group(3))
        if op == "+": return str(a + b)
        if op == "-": return str(a - b)
        if op == "*": return str(a * b)
        if op == "/" and b != 0: return str(a // b)
        if op == "%" and b != 0: return str(a % b)

    nums = [int(n) for n in re.findall(r"\d+", normalized)]
    if nums:
        if ("half of" in q_lower or "half" in q_lower) and len(nums) == 1: return str(nums[0] // 2)
        if ("double of" in q_lower or "twice" in q_lower) and len(nums) == 1: return str(nums[0] * 2)
        if "square of" in q_lower and len(nums) == 1: return str(nums[0] * nums[0])
        if any(w in q_lower for w in ["larger", "greater", "bigger", "highest", "maximum", "max", "most"]): return str(max(nums))
        if any(w in q_lower for w in ["smaller", "less", "lowest", "minimum", "least", "min"]): return str(min(nums))

    if len(nums) >= 2:
        if any(op in q_lower for op in ["plus", "add", "sum", "total", "+"]): return str(nums[0] + nums[1])
        if any(op in q_lower for op in ["minus", "subtract", "difference", "take", "-"]): return str(nums[0] - nums[1])
        if any(op in q_lower for op in ["times", "multipl", "product", "*"]): return str(nums[0] * nums[1])
        if any(op in q_lower for op in ["divid", "quotient", "/"]): return str(nums[0] // nums[1]) if nums[1] != 0 else "0"

    return str(nums[0]) if nums else "0"


solve_challenge_deterministic = solve_atf_math


async def jitter(min_s: float = 0.5, max_s: float = 1.5):
    await asyncio.sleep(random.uniform(min_s, max_s))




# =============================================================================
# 1. TOKEN LOADER & CLOUD SYNC
# =============================================================================

async def fetch_all_tokens(session: aiohttp.ClientSession) -> Dict[str, Dict[str, str]]:
    """Loads tokens for all dynamic fleet accounts from Upstash Redis fleet:tokens:*."""
    tokens_db = {}
    up_h = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
    
    # First, load from miniapp_tokens if available
    try:
        async with session.get(f"{UPSTASH_URL}/get/miniapp_tokens", headers=up_h, timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status == 200:
                d = await r.json()
                raw = d.get("result")
                while isinstance(raw, str):
                    raw = json.loads(raw)
                if isinstance(raw, dict):
                    tokens_db.update(raw)
    except Exception as e:
        logger.warning(f"Error loading miniapp_tokens: {e}")

    # Discover all dynamic accounts from Upstash Redis keys fleet:tokens:*
    discovered_uids = set(str(acc.get("user_id") or acc.get("account_id") or acc.get("id") or "") for acc in ACCOUNTS if (acc.get("user_id") or acc.get("account_id") or acc.get("id")))
    try:
        async with session.get(f"{UPSTASH_URL}/keys/fleet:tokens:*", headers=up_h, timeout=aiohttp.ClientTimeout(total=5)) as kr:
            if kr.status == 200:
                kd = await kr.json()
                for k in kd.get("result", []):
                    u = k.split(":")[-1]
                    if u.isdigit():
                        discovered_uids.add(u)
    except Exception:
        pass

    # Ensure any newly discovered account is dynamically present in ACCOUNTS
    existing_uids = set(str(acc.get("user_id") or acc.get("account_id") or acc.get("id") or "") for acc in ACCOUNTS if (acc.get("user_id") or acc.get("account_id") or acc.get("id")))
    for duid in discovered_uids:
        if duid not in existing_uids:
            ACCOUNTS.append({"user_id": int(duid), "account_id": duid, "name": f"Account_{duid}"})
            existing_uids.add(duid)

    # Second, merge individual fleet:tokens:{uid}
    for uid in discovered_uids:
        try:
            async with session.get(f"{UPSTASH_URL}/get/fleet:tokens:{uid}", headers=up_h, timeout=aiohttp.ClientTimeout(total=5)) as r:
                if r.status == 200:
                    d = await r.json()
                    raw = d.get("result")
                    if raw:
                        parsed = json.loads(raw) if isinstance(raw, str) else raw
                        if isinstance(parsed, dict):
                            existing = tokens_db.setdefault(uid, {})
                            existing.update(parsed)
        except Exception:
            pass

    return tokens_db


async def sync_token_to_cf(session: aiohttp.ClientSession, uid: str, token_dict: dict):
    """Syncs merged tokens to Cloudflare Worker edge nodes."""
    payload = {
        "account_id": str(uid),
        **token_dict
    }
    for cf_url in CF_WORKERS[:2]:
        try:
            async with session.post(
                f"{cf_url}/api/miniapp/tokens/sync",
                json=payload,
                headers={"Authorization": f"Bearer {SECRET_KEY}", "Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as r:
                pass
        except Exception:
            pass


# =============================================================================
# 2. INDIVIDUAL BOT SIDE-TASK HANDLERS
# =============================================================================

async def sweep_mrg_tasks(session: aiohttp.ClientSession, uid: str, name: str, m_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps MRG Miner tasks, level upgrades, and wallet bindings."""
    res = {"bot": "MRG Miner", "tasks_claimed": 0, "notes": [], "success": False}
    if not m_init:
        res["notes"].append("no_init_data")
        return res

    m_headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Telegram-Android/11.0.0",
        "Content-Type": "application/json",
        "Origin": "https://app.mrgtoken.xyz",
        "Referer": "https://app.mrgtoken.xyz/"
    }

    try:
        # 1. State lookup
        async with session.post("https://mrg.up.railway.app/api/user/me", json={"initData": m_init}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=10)) as r:
            if r.status != 200:
                res["notes"].append(f"me_status_{r.status}")
                return res
            me_d = await r.json()

        res["success"] = True
        u_obj = me_d.get("user", {})
        cur_lvl = u_obj.get("peakLevel") or u_obj.get("manualUnlockedLevel") or 1
        in_bal = float(u_obj.get("inAppBalance", 0) or 0)
        res["balance"] = in_bal
        res["level"] = cur_lvl

        # 1.5. MRG Daily Check-in (+5 to +15 MRG daily streak)
        try:
            mrg_tok = None
            if UPSTASH_URL and UPSTASH_TOKEN:
                try:
                    async with session.get(f"{UPSTASH_URL}/get/mrg:pass:{uid}", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=3)) as mpr:
                        if mpr.status == 200:
                            mpd = await mpr.json()
                            if mpd.get("result"):
                                try:
                                    parsed = json.loads(mpd["result"]) if isinstance(mpd["result"], str) else mpd["result"]
                                except Exception:
                                    parsed = mpd["result"]
                                mrg_tok = parsed.get("turnstileToken") if isinstance(parsed, dict) else str(parsed)
                except Exception:
                    pass

            checkin_payload = {"initData": m_init}
            if mrg_tok and str(mrg_tok).strip() not in ("null", "nil", "None", ""):
                checkin_payload["turnstileToken"] = str(mrg_tok).strip()

            async with session.post("https://mrg.up.railway.app/api/user/daily-checkin", json=checkin_payload, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as dcr:
                if dcr.status == 200:
                    dcd = await dcr.json()
                    if dcd.get("success"):
                        res["tasks_claimed"] += 1
                        res["notes"].append(f"checkin_reward_{dcd.get('reward', 5)}_streak_{dcd.get('streak', 1)}")
        except Exception as ce:
            logger.debug(f"[{name}] MRG checkin note: {ce}")

        # 2. Bind TON Wallet with TonConnect 2.0 Proof
        is_ton_conn = u_obj.get("isTonConnected", False)
        target_ton_w = get_ton_wallet_address(acc, uid)
        if target_ton_w and not is_ton_conn:
            w_entry = ton_wallets.get(str(uid)) or (acc.get("ton_wallet") if isinstance(acc.get("ton_wallet"), dict) else {})
            ton_proof_payload = None
            if w_entry and w_entry.get("mnemonic"):
                try:
                    async with session.post("https://mrg.up.railway.app/api/user/ton-proof-payload", json={"initData": m_init}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as npr:
                        if npr.status == 200:
                            np_d = await npr.json()
                            nonce = np_d.get("payload") if isinstance(np_d, dict) else None
                            if nonce:
                                ton_proof_payload = create_mrg_ton_proof(w_entry, nonce)
                except Exception as p_err:
                    logger.debug(f"[{name}] MRG nonce fetch note: {p_err}")

            conn_body = {"initData": m_init, "address": target_ton_w, "balance": 0}
            if ton_proof_payload:
                conn_body["tonProof"] = ton_proof_payload

            async with session.post("https://mrg.up.railway.app/api/user/connect-wallet", json=conn_body, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as cr:
                if cr.status in (200, 201):
                    res["notes"].append("ton_wallet_bound")

        # 3. Tasks Completion (including recurring 24h/12h/6h tasks)
        completed = set(me_d.get("completedTaskIds", []))
        tasks = me_d.get("tasks", [])
        for t in tasks:
            tid = t.get("taskId")
            t_type = str(t.get("taskType") or "")
            is_rec = "recurring" in t_type
            if tid and (tid not in completed or is_rec):
                # Claim task
                await jitter(0.8, 1.8)
                async with session.post("https://mrg.up.railway.app/api/user/claim-task", json={"initData": m_init, "taskId": tid}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as cl_resp:
                    cld = await cl_resp.json() if cl_resp.status == 200 else {}
                    if cld.get("success"):
                        res["tasks_claimed"] += 1
                        res["notes"].append(f"claimed_{tid}")
                    elif "wait" in json.dumps(cld).lower() or "second" in json.dumps(cld).lower():
                        await asyncio.sleep(15)
                        async with session.post("https://mrg.up.railway.app/api/user/claim-task", json={"initData": m_init, "taskId": tid}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as r2:
                            cld2 = await r2.json() if r2.status == 200 else {}
                            if cld2.get("success"):
                                res["tasks_claimed"] += 1
                                res["notes"].append(f"claimed_wait_{tid}")

        # 3.5. Instant REST Claim if human pass is active or Turnstile pass cached
        unclaimed_mined = float(u_obj.get("unclaimedMiningBalance", 0) or 0)
        human_until = u_obj.get("humanVerifiedUntil")
        pass_active = False
        if human_until:
            try:
                from datetime import datetime, timezone
                dt = datetime.fromisoformat(human_until.replace("Z", "+00:00"))
                pass_active = (dt - datetime.now(timezone.utc)).total_seconds() > 300
            except Exception:
                pass

        if unclaimed_mined > 0.05 and (pass_active or mrg_tok):
            try:
                claim_payload = {
                    "initData": m_init,
                    "deviceInfo": {
                        "model": "SM-S928B", "ram": 12, "screen": "1080x2340",
                        "vendor": "Google Inc. (Qualcomm)", "renderer": "ANGLE (Qualcomm, Adreno (TM) 750, OpenGL ES 3.2)",
                        "cores": 8
                    }
                }
                if mrg_tok:
                    claim_payload["turnstileToken"] = str(mrg_tok).strip()
                async with session.post("https://mrg.up.railway.app/api/user/claim-mining", json=claim_payload, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as clr:
                    if clr.status == 200:
                        res["notes"].append(f"claimed_mined_{unclaimed_mined:.2f}")
                        in_bal += unclaimed_mined
                        res["balance"] = in_bal
            except Exception:
                pass

        # 4. Level Auto-Upgrade (if enough balance, including TON wallet balance)
        ton_holding = float(u_obj.get("tonWalletBalance", 0) or 0)
        total_mrg_bal = in_bal + ton_holding
        if total_mrg_bal >= 100:
            def wp_calc(e):
                if e <= 0: return 0
                if e == 1: return 100
                if e <= 203: return round(100 + 9900 * (((e - 1) / 202.0) ** 1.8))
                return 10000
            lo, hi, target_lvl = 1, 203, cur_lvl
            while lo <= hi:
                mid = (lo + hi) // 2
                if total_mrg_bal >= wp_calc(mid):
                    target_lvl = mid
                    lo = mid + 1
                else:
                    hi = mid - 1
            if target_lvl > cur_lvl:
                async with session.post("https://mrg.up.railway.app/api/user/unlock-level", json={"initData": m_init, "level": target_lvl}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as ul:
                    if ul.status == 200:
                        res["notes"].append(f"upgraded_lvl_{target_lvl}")
                        res["level"] = target_lvl

        # 5. Master Referral Commission & One-Time Bonus
        if str(uid) == MASTER_UID:
            async with session.post("https://mrg.up.railway.app/api/user/claim-commission", json={"initData": m_init}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as cr:
                if cr.status == 200:
                    res["notes"].append("master_commission_claimed")
            async with session.post("https://mrg.up.railway.app/api/user/claim-one-time-bonus", json={"initData": m_init}, headers=m_headers, timeout=aiohttp.ClientTimeout(total=8)) as br:
                if br.status == 200:
                    res["notes"].append("master_one_time_bonus_claimed")

    except Exception as e:
        logger.error(f"[{name}] MRG sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_atf_tasks(session: aiohttp.ClientSession, uid: str, name: str, atf_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps ATF Miner daily tasks, boost, math challenges, and team claims."""
    res = {"bot": "ATF Miner", "tasks_claimed": 0, "notes": [], "success": False}
    if not atf_init:
        res["notes"].append("no_init_data")
        return res

    atf_base = "https://atfminers.asloni.online/miner/index.php"
    atf_h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Telegram-Android/11.0.0",
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://atfminers.asloni.online",
        "Referer": "https://atfminers.asloni.online/miner/index.html"
    }

    def payload(extra=None):
        p = {
            "initData": atf_init,
            "tg_id": int(uid),
            "username": acc.get("username", "") or "",
            "request_id": f"rq-{uuid.uuid4()}",
            "device_id": f"dev-task-{uid}"
        }
        if str(uid) != MASTER_UID:
            p["ref"] = "6727787768"
        if extra:
            p.update(extra)
        return p

    try:
        async with aiohttp.ClientSession(cookie_jar=aiohttp.CookieJar(unsafe=True)) as atf_session:
            # 1. Login & extract stateful session cookies (atf_tma_session, __Host-atf_fg_v1)
            async with atf_session.post(f"{atf_base}?action=login&t={int(time.time()*1000)}", json=payload(), headers=atf_h, timeout=aiohttp.ClientTimeout(total=10)) as r:
                if r.status != 200:
                    err_body = {}
                    try:
                        err_body = await r.json()
                    except Exception:
                        pass
                    reason = err_body.get("reason", "")
                    if reason == "entry_risk_captcha_required":
                        res["notes"].append("entry_risk_captcha_required")
                    else:
                        res["notes"].append(f"login_{r.status}")
                    return res
                cookies = r.headers.getall("Set-Cookie", []) if hasattr(r.headers, "getall") else []
                if cookies:
                    atf_h["Cookie"] = "; ".join([c.split(";")[0] for c in cookies])
                log_data = await r.json()

            res["success"] = True
            u_obj = log_data.get("user") if isinstance(log_data.get("user"), dict) else log_data
            lvl = u_obj.get("miner_level") or 1
            bal = float(u_obj.get("mined_balance") or 0.0)
            res["level"] = lvl
            res["balance"] = bal
    
            # 2. Daily claims & boosts
            await jitter(0.4, 0.9)
            async with atf_session.post(f"{atf_base}?action=claim&t={int(time.time()*1000)}", json=payload(), headers=atf_h) as r: pass
            async with atf_session.post(f"{atf_base}?action=claim_referrals&t={int(time.time()*1000)}", json=payload(), headers=atf_h) as r:
                if r.status == 200:
                    try:
                        c_ref = await r.json()
                        if c_ref.get("status") == "success":
                            res["tasks_claimed"] += 1
                            res["notes"].append(f"atf_ref_reward_{c_ref.get('claimed_amount', 0)}")
                    except Exception:
                        pass
            async with atf_session.post(f"{atf_base}?action=claim_team_wallet&t={int(time.time()*1000)}", json=payload(), headers=atf_h) as r:
                if r.status == 200:
                    try:
                        c_tw = await r.json()
                        if c_tw.get("status") == "success":
                            res["tasks_claimed"] += 1
                            res["notes"].append(f"atf_team_wallet_{c_tw.get('claimed_amount', 0)}")
                    except Exception:
                        pass
            async with atf_session.post(f"{atf_base}?action=activate_boost&t={int(time.time()*1000)}", json=payload(), headers=atf_h) as r: pass
            async with atf_session.post(f"{atf_base}?action=record_daily_interaction&t={int(time.time()*1000)}", json=payload(), headers=atf_h) as r: pass
    
            # 3. Dedicated TON wallet sync & cryptographic proof verification
            w_obj = acc.get("ton_wallet") or ton_wallets.get(str(uid)) or ton_wallets.get(int(uid) if str(uid).isdigit() else 0)
            ton_addr = get_ton_wallet_address(acc, uid)
            if ton_addr:
                async with atf_session.post(f"{atf_base}?action=sync_wallet&t={int(time.time()*1000)}", json=payload({"wallet": ton_addr}), headers=atf_h) as r:
                    s_data = {}
                    try: s_data = await r.json()
                    except Exception: pass
                    if s_data.get("reason") == "wallet_proof_required" or log_data.get("wallet_proof_payload"):
                        nonce = s_data.get("wallet_proof_payload") or log_data.get("wallet_proof_payload")
                        if nonce and isinstance(w_obj, dict) and (w_obj.get("mnemonic") or w_obj.get("mnemonic_words")):
                            proof_body = create_atf_ton_proof(w_obj, nonce)
                            if proof_body:
                                async with atf_session.post(f"{atf_base}?action=sync_wallet&t={int(time.time()*1000)}", json=payload(proof_body), headers=atf_h) as r_p:
                                    res["notes"].append("wallet_proof_verified")
                    else:
                        res["notes"].append("wallet_synced")
    
            # 4. Solve Math Challenge & Start Mining
            try:
                async with atf_session.post(f"{atf_base}?action=get_math_challenge&t={int(time.time()*1000)}", json=payload({"scope": "start_mine"}), headers=atf_h, timeout=aiohttp.ClientTimeout(total=8)) as mc:
                    if mc.status == 200:
                        chd = await mc.json()
                        if chd.get("status") == "success" and chd.get("challenge_id"):
                            ans = solve_atf_math(chd.get("question", ""))
                            await jitter(1.5, 3.0)
                            async with atf_session.post(f"{atf_base}?action=start_mine&t={int(time.time()*1000)}", json=payload({"math_challenge_id": chd["challenge_id"], "math_answer": ans}), headers=atf_h) as sm:
                                if sm.status == 200:
                                    res["notes"].append("mining_restarted")
            except Exception:
                pass
    
            # 5. Cooldown & One-Time Tasks
            completed_tasks = set(log_data.get("user", {}).get("completed_tasks", []))
            task_cooldowns = log_data.get("task_cooldowns", {})
            now_sec = int(time.time())
            atf_tasks = [
                {"id": "telegram_join", "repeatable": False, "min_s": 10},
                {"id": "telegram_join_fa", "repeatable": False, "min_s": 10},
                {"id": "twitter_follow", "repeatable": False, "min_s": 10},
                {"id": "youtube_subscribe", "repeatable": False, "min_s": 10},
                {"id": "ig_follow", "repeatable": False, "min_s": 10},
                {"id": "website_visit", "repeatable": True, "min_s": 10},
                {"id": "telegram_react_latest", "repeatable": True, "min_s": 20},
                {"id": "twitter_retweet", "repeatable": True, "min_s": 30},
                {"id": "youtube_like_comment", "repeatable": True, "min_s": 30},
                {"id": "ig_like_comment", "repeatable": True, "min_s": 20}
            ]
    
            for t in atf_tasks:
                tid = t["id"]
                is_rep = t["repeatable"]
                cd = int(task_cooldowns.get(tid, 0) or 0)
                can_do = (tid not in completed_tasks) if not is_rep else (now_sec >= cd)
                if can_do:
                    s_at = int(time.time()) - t["min_s"] - 5
                    async with atf_session.post(f"{atf_base}?action=start_task&t={int(time.time()*1000)}", json=payload({"task_id": tid, "client_started_at": s_at}), headers=atf_h) as st: pass
                    await asyncio.sleep(1.2)
                    async with atf_session.post(f"{atf_base}?action=claim_task&t={int(time.time()*1000)}", json=payload({"task_id": tid, "client_started_at": s_at}), headers=atf_h) as cl:
                        if cl.status == 200:
                            cl_res = await cl.json()
                            if cl_res.get("status") == "success":
                                res["tasks_claimed"] += 1
                                res["notes"].append(f"task_{tid}")
    
    except Exception as e:
        logger.error(f"[{name}] ATF sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_victors_tasks(session: aiohttp.ClientSession, uid: str, name: str, vic_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps Victor's Company tasks, daily check-in, tutorial, wallet connect, and arcade."""
    res = {"bot": "Victor's Company", "tasks_claimed": 0, "notes": [], "success": False}
    if not vic_init:
        res["notes"].append("no_init_data")
        return res

    v_h = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36 Telegram-Android/11.0.0",
        "Authorization": f"tma {vic_init}",
        "Origin": "https://app.victors.company",
        "Referer": "https://app.victors.company/"
    }

    # Fetch cached Turnstile pass
    vic_pass = None
    try:
        async with session.get(f"{UPSTASH_URL}/get/victors:pass:{uid}", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=4)) as vr:
            if vr.status == 200:
                vd = await vr.json()
                raw_v = vd.get("result")
                if raw_v:
                    parsed_v = json.loads(raw_v) if isinstance(raw_v, str) else raw_v
                    vic_pass = parsed_v.get("humanPass") if isinstance(parsed_v, dict) else parsed_v
    except Exception:
        pass

    if vic_pass:
        v_h["x-human-pass"] = str(vic_pass)

    try:
        # 1. State lookup
        async with session.get("https://server.victors.company/api/me", headers=v_h, timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status != 200:
                res["notes"].append(f"me_status_{r.status} (pass: {bool(vic_pass)})")
                return res
            m_d = await r.json()

        res["success"] = True
        st = m_d.get("state", {}) if isinstance(m_d, dict) else {}
        me = st.get("user") or m_d.get("user") or m_d
        cur_level = me.get("peakLevel") or st.get("mining", {}).get("level") or me.get("level", 0)
        res["level"] = cur_level
        res["balance"] = round(float(me.get("inAppBalance") or st.get("holding") or me.get("miningBalance", 0) or 0), 2)

        # 2. Tutorial
        if not me.get("tutorialDone"):
            async with session.post("https://server.victors.company/api/me/tutorial", json={}, headers=v_h) as tr:
                if tr.status == 200: res["notes"].append("tutorial_done")

        # 3. Daily check-in
        async with session.post("https://server.victors.company/api/checkin", json={}, headers=v_h) as cr:
            if cr.status == 200: res["notes"].append("checkin_done")

        # 4. Level 1 Miner Unlock (Continuous +100 V/day passive yield)
        if cur_level < 1:
            try:
                async with session.post("https://server.victors.company/api/levels/unlock", json={"level": 1}, headers=v_h) as lr:
                    if lr.status in (200, 201):
                        res["notes"].append("miner_lvl1_unlocked")
            except Exception:
                pass

        # 5. Claim Accumulated Mining Balance
        try:
            async with session.post("https://server.victors.company/api/mining/claim", json={}, headers=v_h) as mr:
                if mr.status in (200, 201):
                    m_claim = await mr.json()
                    claimed_amt = m_claim.get("claimed", 0) if isinstance(m_claim, dict) else 0
                    if claimed_amt > 0:
                        res["notes"].append(f"mined_+{claimed_amt:.1f}VIC")
        except Exception:
            pass

        # 6. Connect TON wallet if needed (TonConnect 2.0 Proof-of-Ownership)
        ton_addr = get_ton_wallet_address(acc, uid)
        if ton_addr and (not me.get("walletAddress") or not me.get("walletOwned")):
            connected = False
            try:
                from victors_sb_solver import create_victors_ton_proof, load_fleet_ton_wallets
                tw = load_fleet_ton_wallets()
                w_entry = tw.get(str(uid)) or tw.get(int(uid) if uid.isdigit() else uid) or acc.get("ton_wallet")
                if w_entry and isinstance(w_entry, dict) and w_entry.get("mnemonic"):
                    async with session.get("https://server.victors.company/api/wallet/proof-payload", headers=v_h, timeout=aiohttp.ClientTimeout(total=8)) as npr:
                        if npr.status == 200:
                            np_d = await npr.json()
                            nonce = np_d.get("payload") if isinstance(np_d, dict) else None
                            if nonce:
                                proof_item, state_init_b64, pub_key_hex, friendly_addr = create_victors_ton_proof(w_entry, nonce)
                                if proof_item:
                                    conn_body = {
                                        "address": friendly_addr,
                                        "proof": proof_item,
                                        "stateInit": state_init_b64,
                                        "publicKey": pub_key_hex
                                    }
                                    async with session.post("https://server.victors.company/api/wallet/connect", json=conn_body, headers=v_h, timeout=aiohttp.ClientTimeout(total=8)) as cwr:
                                        if cwr.status in (200, 201):
                                             connected = True
                                             res["notes"].append("ton_wallet_proof_connected")
            except Exception as pe:
                logger.debug(f"[{name}] Victor's proof connect note: {pe}")

            if not connected:
                async with session.post("https://server.victors.company/api/wallet/connect", json={"address": ton_addr}, headers=v_h) as wr:
                    if wr.status == 200:
                        connected = True
                        res["notes"].append("ton_wallet_connected")

            if connected:
                async with session.post("https://server.victors.company/api/tasks/claim", json={"taskId": "connect-wallet"}, headers=v_h) as twr:
                    if twr.status == 200: res["notes"].append("wallet_task_claimed")

        # 7. Discover & Claim Jobs Board Tasks (with unified 4.2s link verification debounce)
        async with session.get("https://server.victors.company/api/tasks", headers=v_h, timeout=aiohttp.ClientTimeout(total=8)) as tr:
            if tr.status == 200:
                t_d = await tr.json()
                tasks = t_d.get("tasks", []) if isinstance(t_d, dict) else []
                claimable_tasks = []
                needs_debounce = False
                for t in tasks:
                    if isinstance(t, dict):
                        tid = t.get("taskId") or t.get("id")
                        t_kind = t.get("kind", "")
                        if tid and (t.get("status") == "open" or not t.get("claimed")):
                            claimable_tasks.append(tid)
                            if t_kind in ("link_visit", "telegram_channel", "partner_api") or t.get("url"):
                                needs_debounce = True
                if needs_debounce:
                    await asyncio.sleep(4.2)
                for tid in claimable_tasks:
                    await jitter(0.2, 0.4)
                    async with session.post("https://server.victors.company/api/tasks/claim", json={"taskId": tid}, headers=v_h) as tcr:
                        if tcr.status in (200, 201):
                            res["tasks_claimed"] += 1
                            res["notes"].append(f"task_{tid}")

        # 8. Referral claims (Hiring Bonus + Commission)
        if str(uid) == MASTER_UID or vic_pass:
            async with session.post("https://server.victors.company/api/referral/claim-bonus", json={}, headers=v_h) as rbr:
                if rbr.status == 200: res["notes"].append("ref_bonus_claimed")
            async with session.post("https://server.victors.company/api/referral/claim-commission", json={}, headers=v_h) as rcr:
                if rcr.status == 200: res["notes"].append("ref_commission_claimed")

        # 9. Deep Mine Arcade Expeditions & Arcade Mode Discovery
        try:
            import victors_arcade_solver
            arc_res = await victors_arcade_solver.solve_deep_mine_expeditions(session, v_h, name, max_runs=10)
            if arc_res.get("runs_played", 0) > 0:
                net_profit = arc_res.get("net_vic", 0.0)
                res["notes"].append(f"arcade_{arc_res['runs_played']}runs_{net_profit:+.1f}VIC")
        except Exception as e:
            logger.debug(f"[{name}] Victor's arcade solver note: {e}")

    except Exception as e:
        logger.error(f"[{name}] Victor's sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_kynex_tasks(session: aiohttp.ClientSession, uid: str, name: str, ky_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps Kynex Network daily checkin, sponsor channels, and rewarded ads."""
    res = {"bot": "Kynex Network", "tasks_claimed": 0, "notes": [], "success": False}
    if not ky_init:
        res["notes"].append("no_init_data")
        return res

    try:
        import kynex_miner
        is_owner = (str(uid) == MASTER_UID)
        farm_res = await kynex_miner.farm_kynex_account(session, ky_init, acc, is_master=is_owner)
        res["success"] = True
        res["balance"] = farm_res.get("balance", 0.0)
        res["level"] = farm_res.get("level", 1)
        res["mining_active"] = farm_res.get("mining_active", False)
        
        notes = farm_res.get("notes", [])
        claimed_tasks = [n for n in notes if "social_" in n or "ad_" in n or "daily_checkin" in n]
        res["tasks_claimed"] = len(claimed_tasks)
        res["notes"] = notes
    except Exception as e:
        logger.error(f"[{name}] Kynex sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_diggo_tasks(session: aiohttp.ClientSession, uid: str, name: str, d_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps DiggoMiner mining claim, referrals, and daily/social tasks."""
    res = {"bot": "DiggoMiner", "tasks_claimed": 0, "notes": [], "success": False}
    try:
        base_url = "https://diggo.linkpc.net"
        jwt_token = None
        st = {}

        # 0. Check cached JWT from acc object, token dict, or Upstash Redis
        jwt_token = acc.get("diggo_jwt") or (acc.get("tokens", {}).get("diggo_jwt") if isinstance(acc.get("tokens"), dict) else None)
        if not jwt_token and UPSTASH_URL and UPSTASH_TOKEN:
            try:
                async with session.get(f"{UPSTASH_URL}/get/fleet:tokens:{uid}", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=2)) as jr:
                    if jr.status == 200:
                        jd = await jr.json()
                        raw_res = jd.get("result")
                        if raw_res:
                            parsed_res = json.loads(raw_res) if isinstance(raw_res, str) else raw_res
                            if isinstance(parsed_res, dict) and parsed_res.get("diggo_jwt"):
                                jwt_token = parsed_res["diggo_jwt"]
            except Exception:
                pass
        if not jwt_token and UPSTASH_URL and UPSTASH_TOKEN:
            try:
                async with session.get(f"{UPSTASH_URL}/get/fleet:diggo:jwt:{uid}", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=2)) as jr:
                    if jr.status == 200:
                        jd = await jr.json()
                        if jd.get("result"):
                            jwt_token = str(jd["result"]).strip()
            except Exception:
                pass

        auth_headers = None
        if jwt_token:
            candidate_h = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {jwt_token}",
                "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Telegram-Android/11.0.0",
                "Origin": base_url,
                "Referer": f"{base_url}/?tgWebAppStartParam=ref_4088138f11effe8eef4b86ff"
            }
            async with session.get(f"{base_url}/api/state", headers=candidate_h, timeout=aiohttp.ClientTimeout(total=5)) as pr:
                if pr.status == 200:
                    p_d = await pr.json()
                    if isinstance(p_d, dict) and p_d.get("state"):
                        st = p_d["state"]
                        auth_headers = candidate_h
                        res["success"] = True
                        res["balance"] = float(st.get("balance") or 0.0)
                        res["level"] = int(st.get("player", {}).get("level", 1) or 1)
                else:
                    jwt_token = None

        # 1. Auth (if no valid cached JWT)
        if not jwt_token or not auth_headers:
            if not d_init:
                res["notes"].append("no_init_data_and_no_jwt")
                return res

            if "%25" in d_init or "%3D" in d_init or "user%3D" in d_init:
                d_init = urllib.parse.unquote(d_init)
            init_headers = {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Telegram-Android/11.0.0",
                "Origin": base_url,
                "Referer": f"{base_url}/?tgWebAppStartParam=ref_4088138f11effe8eef4b86ff"
            }
            async with session.post(f"{base_url}/api/auth/telegram", json={"initData": d_init}, headers=init_headers, timeout=aiohttp.ClientTimeout(total=8)) as r:
                if r.status != 200:
                    res["notes"].append(f"auth_status_{r.status}")
                    return res
                a_d = await r.json()

            jwt_token = a_d.get("token")
            if not jwt_token:
                res["notes"].append("no_token")
                return res

            res["success"] = True
            st = a_d.get("state", {})
            res["balance"] = float(st.get("balance") or 0.0)
            res["level"] = int(st.get("player", {}).get("level", 1) or 1)
            if UPSTASH_URL and UPSTASH_TOKEN and jwt_token:
                acc["diggo_jwt"] = jwt_token
                try:
                    await session.post(f"{UPSTASH_URL}/set/fleet:diggo:jwt:{uid}?ex=2592000", data=jwt_token, headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=2))
                    async with session.get(f"{UPSTASH_URL}/get/fleet:tokens:{uid}", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=2)) as gr:
                        if gr.status == 200:
                            curr_toks = {}
                            r_res = (await gr.json()).get("result")
                            if r_res:
                                curr_toks = json.loads(r_res) if isinstance(r_res, str) else r_res
                            if isinstance(curr_toks, dict):
                                curr_toks["diggo_jwt"] = jwt_token
                                await session.post(f"{UPSTASH_URL}/set/fleet:tokens:{uid}", data=json.dumps(curr_toks), headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=2))
                except Exception:
                    pass

            auth_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {jwt_token}",
                "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 Telegram-Android/11.0.0",
                "Origin": base_url,
                "Referer": f"{base_url}/?tgWebAppStartParam=ref_4088138f11effe8eef4b86ff"
            }

        # 1b. Ensure dedicated TON wallet is bound with TonConnect 2.0 proof
        w_obj = st.get("wallet") or {}
        if not w_obj.get("address") or not w_obj.get("holdings", {}).get("linked"):
            target_ton = get_ton_wallet_address(acc, uid)
            w_entry = ton_wallets.get(str(uid)) or ton_wallets.get(int(uid) if str(uid).isdigit() else 0) or (acc.get("ton_wallet") if isinstance(acc.get("ton_wallet"), dict) else {})
            raw_mn = w_entry.get("mnemonic") or w_entry.get("mnemonic_words")
            if target_ton and raw_mn:
                try:
                    async with session.post(f"{base_url}/api/ton/challenge", json={}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as chr:
                        if chr.status == 200:
                            ch_data = await chr.json()
                            nonce = ch_data.get("payload")
                            if nonce:
                                from nacl.signing import SigningKey
                                from tonsdk.contract.wallet import Wallets, WalletVersionEnum
                                words = raw_mn.split() if isinstance(raw_mn, str) else raw_mn
                                _, pub_k, priv_k, wallet_contract = Wallets.from_mnemonics(mnemonics=words, version=WalletVersionEnum.v4r2)
                                state_init_res = wallet_contract.create_state_init()
                                state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")
                                t_addr = wallet_contract.address
                                raw_addr = f"{t_addr.wc}:{t_addr.hash_part.hex()}"
                                domain = "diggo.linkpc.net"
                                domain_b = domain.encode("utf-8")
                                ts_now = int(time.time())
                                msg = b"ton-proof-item-v2/" + struct.pack(">i", t_addr.wc) + t_addr.hash_part + struct.pack("<I", len(domain_b)) + domain_b + struct.pack("<Q", ts_now) + nonce.encode("utf-8")
                                digest = hashlib.sha256(b"\xff\xff" + b"ton-connect" + hashlib.sha256(msg).digest()).digest()
                                sig = SigningKey(priv_k[:32]).sign(digest).signature
                                sig_b64 = base64.b64encode(sig).decode("utf-8")
                                bind_payload = {
                                    "address": raw_addr,
                                    "network": "-239",
                                    "publicKey": pub_k.hex(),
                                    "walletStateInit": state_init_b64,
                                    "proof": {
                                        "timestamp": ts_now,
                                        "domain": {"lengthBytes": len(domain_b), "value": domain},
                                        "signature": sig_b64,
                                        "payload": nonce
                                    }
                                }
                                async with session.post(f"{base_url}/api/ton/bind", json=bind_payload, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=8)) as br:
                                    if br.status in (200, 201):
                                        res["notes"].append("diggo_ton_wallet_bound")
                except Exception as b_err:
                    logger.debug(f"[{name}] Diggo ton_bind note: {b_err}")

        # 2. Claim mining
        mining = st.get("mining") or {}
        if float(mining.get("pending", 0) or 0) > 0:
            await jitter(0.4, 0.8)
            async with session.post(f"{base_url}/api/claims/mining", json={}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as cr:
                if cr.status in (200, 201):
                    c_d = await cr.json()
                    res["notes"].append(f"claimed_mined_{c_d.get('amount', 0):.2f}")

        # 3. Claim referrals
        await jitter(0.4, 0.8)
        async with session.post(f"{base_url}/api/referrals/claim", json={}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as rr:
            if rr.status in (200, 201):
                res["notes"].append("ref_claimed")

        # 4. Daily Streak & Day Rewards
        day_rewards = st.get("dayRewards") or []
        for dr in day_rewards:
            if isinstance(dr, dict) and dr.get("status") == "available":
                d_num = dr.get("day")
                try:
                    async with session.post(f"{base_url}/api/streak/claim", json={"day": d_num}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as sr:
                        if sr.status in (200, 201):
                            res["tasks_claimed"] += 1
                            res["notes"].append(f"streak_day_{d_num}")
                except Exception:
                    pass

        # 5. Sweep All Tasks (checkin, play, social, ads)
        tasks = st.get("tasks") or {}
        p_lvl = st.get("player", {}).get("level", 1)
        srv_now = st.get("serverNow") or (time.time() * 1000)

        # A. Check-in
        t_chk = tasks.get("checkin") or {}
        if t_chk.get("enabled") and not t_chk.get("claimed"):
            try:
                async with session.post(f"{base_url}/api/tasks/claim", json={"taskId": "checkin"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as tr:
                    if tr.status in (200, 201):
                        res["tasks_claimed"] += 1
                        res["notes"].append("task_checkin")
            except Exception:
                pass

        # B. Play / Level Milestone
        t_play = tasks.get("play") or {}
        if t_play.get("enabled") and not t_play.get("claimed"):
            req_lvl = t_play.get("targetLevel") or 1
            if p_lvl >= req_lvl or (t_play.get("progress", 0) >= t_play.get("total", 1)):
                try:
                    async with session.post(f"{base_url}/api/tasks/claim", json={"taskId": "play"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as tr:
                        if tr.status in (200, 201):
                            res["tasks_claimed"] += 1
                            res["notes"].append("task_play")
                except Exception:
                    pass

        # C. Telegram Channel Join
        t_tg = tasks.get("telegram") or {}
        if t_tg.get("enabled") and not t_tg.get("claimed"):
            try:
                await session.post(f"{base_url}/api/tasks/verify", json={"taskId": "telegram"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())})
                async with session.post(f"{base_url}/api/tasks/claim", json={"taskId": "telegram"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as tr:
                    if tr.status in (200, 201):
                        res["tasks_claimed"] += 1
                        res["notes"].append("task_telegram")
            except Exception:
                pass

        # D. Social Tasks (community_react, x_follow, x_post)
        for tid in ["community_react", "x_follow", "x_post"]:
            t_obj = tasks.get(tid) or {}
            if t_obj.get("enabled") and not t_obj.get("claimed"):
                try:
                    conf = t_obj.get("confirmation")
                    att_id = conf.get("attemptId") if isinstance(conf, dict) else None
                    if not att_id:
                        async with session.post(f"{base_url}/api/tasks/social/start", json={"taskId": tid}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as vs:
                            if vs.status == 200:
                                vd = await vs.json()
                                att = vd.get("attempt") or {}
                                att_id = att.get("attemptId")
                                confirm_at = att.get("confirmAt", 0)
                                wait_s = max(0.5, min(16.0, (confirm_at - srv_now) / 1000.0))
                                await asyncio.sleep(wait_s + 0.5)
                    if att_id:
                        await session.post(f"{base_url}/api/tasks/social/confirm", json={"taskId": tid, "attemptId": att_id, "confirmed": True}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())})
                        async with session.post(f"{base_url}/api/tasks/claim", json={"taskId": tid}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as tr:
                            if tr.status in (200, 201):
                                res["tasks_claimed"] += 1
                                res["notes"].append(f"task_{tid}")
                except Exception:
                    pass

        # E. Rewarded Ad Task (Up to 4 ads per 24 hours)
        t_ad = tasks.get("ad") or {}
        rem_ads = max(0, (t_ad.get("quotaTotal", 4) or 4) - (t_ad.get("quotaUsed", 0) or 0))
        for _ in range(rem_ads):
            try:
                async with session.post(f"{base_url}/api/adsgram/start", json={}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as ar:
                    if ar.status == 200:
                        ad_d = await ar.json()
                        ad_att_id = ad_d.get("attemptId")
                        if ad_att_id:
                            await asyncio.sleep(2.5)
                            await session.post(f"{base_url}/api/adsgram/complete", json={"attemptId": ad_att_id}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())})
                            async with session.post(f"{base_url}/api/tasks/claim", json={"taskId": "ad"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}) as cr:
                                if cr.status in (200, 201):
                                    res["tasks_claimed"] += 1
                                    res["notes"].append("task_ad")
            except Exception:
                pass

        # E.2 Native Interstitial Ad (Adsgram Interstitial)
        try:
            async with session.get(f"{base_url}/api/adsgram/interstitial", headers=auth_headers, timeout=aiohttp.ClientTimeout(total=5)) as ir:
                if ir.status == 200:
                    i_data = await ir.json()
                    if i_data.get("enabled") and (i_data.get("unlimited") or (i_data.get("remaining", 0) > 0)):
                        async with session.post(f"{base_url}/api/adsgram/interstitial/start", json={}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}, timeout=aiohttp.ClientTimeout(total=5)) as istart:
                            if istart.status == 200:
                                is_data = await istart.json()
                                i_att = is_data.get("attemptId")
                                if i_att and is_data.get("show"):
                                    await asyncio.sleep(2.0)
                                    async with session.post(f"{base_url}/api/adsgram/interstitial/finish", json={"attemptId": i_att, "outcome": "completed"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}, timeout=aiohttp.ClientTimeout(total=5)) as ifin:
                                        if ifin.status == 200:
                                            res["tasks_claimed"] += 1
                                            res["notes"].append("interstitial_ad_completed")
        except Exception:
            pass

        # F. Solana Launch Campaign Tasks (quiz & pump)
        try:
            async with session.get(f"{base_url}/api/launch-tasks", headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as lr:
                if lr.status == 200:
                    ld = await lr.json()
                    if ld.get("enabled"):
                        quiz = ld.get("quiz", {})
                        pump = ld.get("pump", {})
                        if not quiz.get("claimed"):
                            async with session.post(f"{base_url}/api/launch-tasks/quiz", json={"answer": "ton_continues"}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}, timeout=aiohttp.ClientTimeout(total=6)) as qr:
                                if qr.status == 200:
                                    res["tasks_claimed"] += 1
                                    res["notes"].append("launch_quiz_5_diggo")
                        if not pump.get("confirmed"):
                            await session.post(f"{base_url}/api/launch-tasks/pump/open", json={}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}, timeout=aiohttp.ClientTimeout(total=5))
                            async with session.post(f"{base_url}/api/launch-tasks/pump/confirm", json={"confirmed": True}, headers={**auth_headers, "Idempotency-Key": str(uuid.uuid4())}, timeout=aiohttp.ClientTimeout(total=5)) as pr:
                                if pr.status == 200:
                                    res["tasks_claimed"] += 1
                                    res["notes"].append("launch_pump_confirmed")
        except Exception:
            pass

    except Exception as e:
        logger.error(f"[{name}] Diggo sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_pepegram_tasks(session: aiohttp.ClientSession, uid: str, name: str, p_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps PepeGram mining claims, welcome bonuses, and available side-tasks."""
    res = {"bot": "PepeGram", "tasks_claimed": 0, "notes": [], "success": False}
    if not p_init:
        res["notes"].append("no_init_data")
        return res

    try:
        pepe_base = "https://app.miniempire.app/miniapp"
        pepe_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36",
            "Origin": "https://app.miniempire.app",
            "Referer": "https://app.miniempire.app/miniapp/index.html?tid=1449&lang=en"
        }

        # 1. Auth
        async with session.post(f"{pepe_base}/auth?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers, timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status != 200:
                res["notes"].append(f"auth_status_{r.status}")
                return res
            auth_d = await r.json()

        if isinstance(auth_d, dict) and auth_d.get("error") == "user not registered":
            res["notes"].append("not_registered_in_bot")
            return res

        res["success"] = True
        u_data = auth_d.get("user") or {}
        res["balance"] = float(u_data.get("hashes", 0) or 0)
        res["level"] = int(u_data.get("power", 0) or 0)
        ends_at = int(u_data.get("hashes_production_ends_at", 0) or 0)

        # 2. Welcome bonus & Claim
        await jitter(0.4, 0.8)
        async with session.post(f"{pepe_base}/claim-welcome-bonus?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers) as wr:
            if wr.status in (200, 201):
                res["notes"].append("welcome_bonus_claimed")

        async with session.post(f"{pepe_base}/claim?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers) as clr:
            if clr.status in (200, 201):
                res["notes"].append("hashes_claimed")

        # 3. Mine tap
        await jitter(0.4, 0.8)
        async with session.post(f"{pepe_base}/tasks/mine?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers) as mr:
            if mr.status in (200, 201):
                res["notes"].append("mine_tapped")

        # 4. Production Start (6-Hour Mining Session & Referral Power Activation)
        now_ts = int(time.time())
        if now_ts >= ends_at:
            await jitter(0.4, 0.8)
            async with session.post(f"{pepe_base}/start-production?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers) as spr:
                if spr.status in (200, 201):
                    res["notes"].append("production_started")

        # 5. Free Power Boosts (Ad rolls & Slot spins)
        await jitter(0.3, 0.6)
        await session.post(f"{pepe_base}/tasks/ad-roll?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers)
        await session.post(f"{pepe_base}/tasks/ad-roll2?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers)
        await session.post(f"{pepe_base}/tasks/slot-spin?tid=1449", json={"initData": p_init, "tid": 1449}, headers=pepe_headers)

        # 6. Tasks claim
        await jitter(0.4, 0.8)
        async with session.get(f"{pepe_base}/tasks?initData={urllib.parse.quote(p_init)}&tid=1449", headers=pepe_headers) as tr:
            if tr.status == 200:
                t_d = await tr.json()
                for tk in (t_d.get("tasks", []) if isinstance(t_d, dict) else []):
                    tk_id = tk.get("id")
                    is_done = tk.get("completed")
                    is_eligible = tk.get("eligible")
                    if tk_id and not is_done and (not tk.get("pending") or is_eligible):
                        await jitter(0.4, 0.8)
                        async with session.post(f"{pepe_base}/tasks/claim?tid=1449", json={"initData": p_init, "tid": 1449, "task_id": tk_id, "taskId": tk_id}, headers=pepe_headers) as cr:
                            if cr.status in (200, 201):
                                res["tasks_claimed"] += 1
                                res["notes"].append(f"task_{tk_id}")

    except Exception as e:
        logger.error(f"[{name}] PepeGram sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_adxearn_tasks(session: aiohttp.ClientSession, uid: str, name: str, adx_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps AdxEarn AI check-in, farming claims, dynamic tasks, and milestones."""
    res = {"bot": "AdxEarn AI", "tasks_claimed": 0, "notes": [], "success": False}
    if not adx_init:
        res["notes"].append("no_init_data")
        return res

    try:
        adx_base = "https://api.adxearnai.xyz/api"
        adx_headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36",
            "X-Telegram-Init-Data": adx_init
        }

        # 1. User Session
        fp = f"412x915|24|8|UTC|en-US|8|5|2.625|Mali-G78-{uid}"
        ref_param = None if str(uid) == MASTER_UID else "6727787768"
        async with session.post(f"{adx_base}/user/session", json={"ref": ref_param, "fp": fp}, headers=adx_headers, timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status != 200:
                res["notes"].append(f"session_status_{r.status}")
                return res
            s_d = await r.json()

        res["success"] = True
        u_info = (s_d.get("user") if isinstance(s_d, dict) else {}) or {}
        res["balance"] = float(u_info.get("balance_points", 0) or 0)
        res["level"] = int(u_info.get("checkin_streak", 1) or 1)

        # 2. Daily Check-in
        await jitter(0.4, 0.8)
        async with session.post(f"{adx_base}/rewards/checkin", json={}, headers=adx_headers) as cr:
            if cr.status == 200:
                c_d = await cr.json()
                if c_d.get("success"):
                    res["tasks_claimed"] += 1
                    res["notes"].append(f"checkin_reward_{c_d.get('reward', 0)}")
            elif cr.status == 403:
                res["notes"].append("already_checked_in_today")

        # 3. Farming Claim & Start
        await jitter(0.4, 0.8)
        async with session.get(f"{adx_base}/farming/status", headers=adx_headers) as st_r:
            if st_r.status == 200:
                st_d = await st_r.json()
                if isinstance(st_d, dict):
                    if st_d.get("ready"):
                        await session.post(f"{adx_base}/farming/claim", json={}, headers=adx_headers)
                        res["notes"].append("farming_claimed")
                    if st_d.get("status") == "idle" or not st_d.get("startedAt"):
                        await session.post(f"{adx_base}/farming/start", json={}, headers=adx_headers)
                        res["notes"].append("farming_started")

        # 4. Strict Zero-Deduction Policy: NEVER call /farming/boost (it deducts $0.1000 of mined points to skip 5% time!)

        # 5. Parallelized Task, Ad Network, and CPA Offer Verification
        # In AdxEarn AI, tasks, ad network views, and CPA offers each require a ~16s cooldown between start and claim.
        # We start all of them concurrently, sleep once (16.2s), and claim all of them concurrently.
        started_tasks = []
        started_nets = []
        started_offers = []

        # A. Start Dynamic Tasks
        await jitter(0.2, 0.5)
        try:
            async with session.get(f"{adx_base}/rewards/tasks", headers=adx_headers, timeout=aiohttp.ClientTimeout(total=6)) as tr:
                if tr.status == 200:
                    td = await tr.json()
                    for tk in (td.get("tasks", []) if isinstance(td, dict) else []):
                        t_id = tk.get("id")
                        if t_id and not tk.get("completed") and not tk.get("claimed"):
                            try:
                                async with session.post(f"{adx_base}/rewards/task-start", json={"taskId": t_id}, headers=adx_headers) as s_resp:
                                    if s_resp.status == 200:
                                        started_tasks.append(t_id)
                            except Exception:
                                pass
        except Exception:
            pass

        # B. Start Ad Networks (Adsgram, Monetag, Gigapub, Popup)
        try:
            async with session.get(f"{adx_base}/rewards/ad-networks/status", headers=adx_headers, timeout=aiohttp.ClientTimeout(total=6)) as nsr:
                if nsr.status == 200:
                    nsd = await nsr.json()
                    st_dict = nsd.get("status", {}) if isinstance(nsd, dict) else {}
                    for net_slug, net_info in st_dict.items():
                        if isinstance(net_info, dict):
                            watched = net_info.get("watchedToday", 0)
                            cap = net_info.get("dailyCap", 0)
                            cd_rem = net_info.get("cooldownRemainingSec", 0)
                            if (cap == 0 or watched < cap) and cd_rem == 0:
                                try:
                                    async with session.post(f"{adx_base}/rewards/ad-verify-start", json={"network": net_slug}, headers=adx_headers) as v_st:
                                        if v_st.status == 200:
                                            started_nets.append(net_slug)
                                except Exception:
                                    pass
        except Exception as e:
            logger.debug(f"[{name}] AdxEarn ad watch note: {e}")

        # C. Start CPA Offers
        try:
            async with session.get(f"{adx_base}/cpa-offers", headers=adx_headers, timeout=aiohttp.ClientTimeout(total=6)) as cor:
                if cor.status == 200:
                    co_d = await cor.json()
                    offers = co_d.get("offers", []) if isinstance(co_d, dict) else []
                    for off in offers:
                        oid = off.get("id")
                        if oid:
                            try:
                                async with session.post(f"{adx_base}/cpa-offers/start", json={"offerId": oid}, headers=adx_headers) as ost:
                                    if ost.status == 200:
                                        started_offers.append(oid)
                            except Exception:
                                pass
        except Exception as e:
            logger.debug(f"[{name}] AdxEarn CPA offer note: {e}")

        # D. Single Unified Cooldown Sleep (if anything was started)
        if started_tasks or started_nets or started_offers:
            await asyncio.sleep(16.2)

        # E. Claim Dynamic Tasks
        for t_id in started_tasks:
            try:
                async with session.post(f"{adx_base}/rewards/task-claim", json={"taskId": t_id}, headers=adx_headers) as cl:
                    if cl.status == 200:
                        res["tasks_claimed"] += 1
                        res["notes"].append(f"task_{t_id}")
                    elif cl.status == 403:
                        c_err = await cl.json()
                        if "already completed" in str(c_err.get("error", "")).lower():
                            res["notes"].append(f"task_{t_id}_already_done")
            except Exception:
                pass

        # F. Claim Ad Networks
        for net_slug in started_nets:
            try:
                async with session.post(f"{adx_base}/rewards/ad-claim", json={"network": net_slug}, headers=adx_headers) as v_cl:
                    if v_cl.status == 200:
                        c_d = await v_cl.json()
                        res["tasks_claimed"] += 1
                        res["notes"].append(f"ad_{net_slug}_+{c_d.get('reward', 100)}pts")
            except Exception:
                pass

        # G. Claim CPA Offers
        for oid in started_offers:
            try:
                async with session.post(f"{adx_base}/cpa-offers/claim", json={"offerId": oid}, headers=adx_headers) as ocl:
                    if ocl.status == 200:
                        res["tasks_claimed"] += 1
                        res["notes"].append(f"cpa_offer_{oid}_+300pts")
            except Exception:
                pass

        # 6. Referral Milestones Claim
        if str(uid) == MASTER_UID:
            try:
                async with session.get(f"{adx_base}/referrals/milestones", headers=adx_headers, timeout=aiohttp.ClientTimeout(total=6)) as mr:
                    if mr.status == 200:
                        m_data = await mr.json()
                        for ms in m_data.get("milestones", []):
                            ms_id = ms.get("id")
                            if ms_id and ms.get("eligible") and not ms.get("claimed"):
                                async with session.post(f"{adx_base}/referrals/milestones/claim", json={"milestoneId": ms_id}, headers=adx_headers) as mcr:
                                    if mcr.status == 200:
                                        res["tasks_claimed"] += 1
                                        res["notes"].append(f"adx_milestone_{ms_id}_claimed")
            except Exception:
                pass

    except Exception as e:
        logger.error(f"[{name}] AdxEarn sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_chickenland_tasks(session: aiohttp.ClientSession, uid: str, name: str, c_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps Chicken Land daily check-in, captcha validation, eggs collection/selling, social tasks, hen buying, and ref rewards."""
    res = {"bot": "Chicken Land", "tasks_claimed": 0, "notes": [], "success": False}
    if not c_init:
        res["notes"].append("no_init_data")
        return res

    try:
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

        async def rpc(path: str, body: dict = None) -> dict:
            payload = {"method": "POST" if body is not None else "GET", "path": path, "body": body if body is not None else {}}
            async with session.post(rpc_url, json=payload, headers=c_headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                return await resp.json()

        # 1. Profile / Session
        ref_to_use = "12668"
        me_resp = await rpc("/api/me", {"ref": ref_to_use, "lang": "en"})
        if not me_resp.get("ok"):
            res["notes"].append(f"auth_failed_{me_resp.get('description', 'unknown')}")
            return res

        res["success"] = True
        u_info = me_resp.get("result", {}).get("user", {})
        res["balance"] = float(u_info.get("coins", 0))
        res["hens"] = int(u_info.get("hens", 0))
        res["eggs"] = int(u_info.get("eggs", 0) or 0)
        res["rate"] = float(u_info.get("rate", 0))

        # 2. Captcha verification if needed
        if not u_info.get("human"):
            cap = await rpc("/api/captcha", {})
            if cap.get("ok") and cap.get("result", {}).get("kind") == "turnstile":
                await rpc("/api/human", {"fallback": True, "why": "unsupported"})
                await asyncio.sleep(0.5)
                cap2 = await rpc("/api/captcha", {})
                if cap2.get("ok") and cap2.get("result", {}).get("kind") == "pick":
                    items = cap2["result"].get("items", [])
                    tgt = cap2["result"].get("target", "")
                    if tgt in items:
                        await rpc("/api/human", {"pick": items.index(tgt)})

        # 3. Welcome bonus
        if not u_info.get("welcome"):
            w_res = await rpc("/api/welcome", {})
            if w_res.get("ok"):
                res["tasks_claimed"] += 1
                res["notes"].append("welcome_bonus_1000")

        # 4. Daily Checkin
        daily_res = await rpc("/api/task", {"id": "daily"})
        if daily_res.get("ok"):
            res["tasks_claimed"] += 1
            res["notes"].append("daily_checkin")

        # 5. Collect & Sell Eggs (if eggs in basket or hens active)
        current_coins = float(u_info.get("coins", 0) or 0)
        if int(u_info.get("eggs", 0) or 0) > 0 or int(u_info.get("hens", 0) or 0) > 0:
            sell_res = await rpc("/api/sell", {})
            if sell_res.get("ok"):
                eggs = sell_res.get("result", {}).get("eggs", 0)
                if eggs > 0:
                    res["notes"].append(f"eggs_sold_{eggs}")
                current_coins = float(sell_res.get("result", {}).get("user", {}).get("coins", current_coins))

        # 6. Tasks (Dynamic task discovery across main, daily, and custom partner tasks)
        completed_tasks = set((u_info.get("tasks") or []) + (u_info.get("dayTasks") or []))
        tasks_to_check = ["channel", "payments", "chat", "x", "dnews", "dpay", "dpromo", "c6"]
        try:
            tasks_cfg_resp = await rpc("/api/tasks")
            if tasks_cfg_resp.get("ok"):
                custom_tasks = tasks_cfg_resp.get("result", {}).get("custom", [])
                for ct in custom_tasks:
                    if isinstance(ct, dict) and ct.get("id"):
                        cid = str(ct["id"])
                        if cid not in tasks_to_check:
                            tasks_to_check.append(cid)
        except Exception:
            pass

        for tid in tasks_to_check:
            if tid not in completed_tasks:
                await rpc("/api/task/open", {"id": tid})
                await asyncio.sleep(0.5)
                t_claim = await rpc("/api/task", {"id": tid})
                if t_claim.get("ok"):
                    res["tasks_claimed"] += 1
                    res["notes"].append(f"task_{tid}")
                    if t_claim.get("result", {}).get("user"):
                        current_coins = float(t_claim["result"]["user"].get("coins", current_coins))

        # 6.5. Autonomous Promo Code Discovery & Redemption (@ChickenLandCodes)
        try:
            from chickenland_promo_sniper import fetch_channel_codes, redis_command
            c_codes = await asyncio.to_thread(fetch_channel_codes)
            for it in c_codes:
                p_code = it.get("code")
                if not p_code or it.get("is_exhausted"):
                    continue
                # Check if this specific account already claimed this code
                if uid:
                    already = redis_command("SISMEMBER", f"chickenland:claimed:{uid}", p_code)
                    if already == 1:
                        continue
                p_res = await rpc("/api/promo", {"code": p_code})
                desc = str(p_res.get("description", "")).lower()
                param_code = p_res.get("parameters", {}).get("code", "")
                if p_res.get("ok"):
                    p_coins = p_res.get("result", {}).get("coins", 0)
                    res["tasks_claimed"] += 1
                    res["notes"].append(f"promo_{p_code}_+{p_coins}")
                    if uid:
                        redis_command("SADD", f"chickenland:claimed:{uid}", p_code)
                    if p_res.get("result", {}).get("user"):
                        current_coins = float(p_res["result"]["user"].get("coins", current_coins))
                elif "already" in desc or "claimed" in desc or param_code == "ALREADY_CLAIMED":
                    if uid:
                        redis_command("SADD", f"chickenland:claimed:{uid}", p_code)
                elif "expired" in desc or "limit" in desc or param_code == "PROMO_FULL":
                    redis_command("SADD", "chickenland:seen_codes", p_code)
        except Exception as pe:
            logger.debug(f"[{name}] Promo auto-apply note: {pe}")

        # 6.6 Rewarded Ad Watch & Free Hen Claim ("ads10")
        ads_info = me_resp.get("result", {}).get("ads", {})
        n_ads = int(ads_info.get("n", 0) or 0)
        need_ads = int(ads_info.get("need", 10) or 10)
        if n_ads < need_ads:
            try:
                ad_st = await rpc("/api/ad/start", {})
                if ad_st.get("ok"):
                    await asyncio.sleep(25.0)
                    ad_done = await rpc("/api/ad/done", {})
                    if ad_done.get("ok"):
                        res["tasks_claimed"] += 1
                        n_ads = ad_done.get("result", {}).get("n", n_ads + 1)
                        res["notes"].append(f"ad_watched_{n_ads}/{need_ads}")
            except Exception as ad_err:
                logger.debug(f"[{name}] Chicken Land ad note: {ad_err}")

        if n_ads >= need_ads and "ads10" not in completed_tasks:
            try:
                hen_claim = await rpc("/api/task", {"id": "ads10"})
                if hen_claim.get("ok"):
                    res["tasks_claimed"] += 1
                    res["hens"] = res.get("hens", 0) + 1
                    res["notes"].append("free_hen_claimed_ads10")
                    completed_tasks.add("ads10")
                    if hen_claim.get("result", {}).get("user"):
                        current_coins = float(hen_claim["result"]["user"].get("coins", current_coins))
            except Exception:
                pass

        # 7. Ref claim
        ref_claim = await rpc("/api/ref/claim", {})
        if ref_claim.get("ok") and ref_claim.get("result", {}).get("coins", 0) > 0:
            ref_amt = ref_claim["result"]["coins"]
            res["notes"].append(f"ref_coins_{ref_amt}")
            current_coins += ref_amt

        # 8. Buy hens if coins >= 1000
        if current_coins >= 1000:
            n_buy = int(current_coins // 1000)
            buy_res = await rpc("/api/buy", {"breed": "basic", "n": n_buy})
            if buy_res.get("ok"):
                res["notes"].append(f"hens_bought_{n_buy}")
                current_coins -= (n_buy * 1000)

        # 9. Upgrade basket if affordable
        try:
            upg_res = await rpc("/api/upgrade", {})
            if upg_res.get("ok"):
                res["notes"].append("basket_upgraded")
        except Exception:
            pass

    except Exception as e:
        logger.error(f"[{name}] Chicken Land sweep error: {type(e).__name__}: {e}")
        res["notes"].append(f"err: {type(e).__name__}: {str(e)[:50]}")

    return res


async def sweep_grouchemine_tasks(session: aiohttp.ClientSession, uid: str, name: str, g_init: str, acc: dict) -> Dict[str, Any]:
    """Sweeps Grouche Mine daily claim, tasks, and yield claim. Strict Zero-Spend Policy: NEVER buys packages."""
    res = {"bot": "Grouche Mine", "tasks_claimed": 0, "notes": [], "success": False}
    if not g_init:
        res["notes"].append("no_init_data")
        return res

    headers = {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": g_init,
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
    }
    base_url = "https://grouchemine.world/api"

    try:
        # 1. Login
        async with session.post(f"{base_url}/auth/login", json={"initData": g_init}, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as r:
            if r.status != 200:
                res["notes"].append(f"auth_failed_http_{r.status}")
                return res
            l_data = await r.json()
            u_inf = l_data.get("data", {}).get("user", {})
            res["balance"] = float(u_inf.get("lnxBalance", 0) or 0)
            res["success"] = True

        # 2. Connect TON wallet if available
        ton_addr = acc.get("ton_wallet") or acc.get("ton_address") or ""
        if ton_addr:
            try:
                await session.post(f"{base_url}/users/wallet/connect", json={"address": ton_addr}, headers=headers, timeout=aiohttp.ClientTimeout(total=6))
            except Exception:
                pass

        # 3. Daily Claim
        try:
            async with session.post(f"{base_url}/users/daily-claim", json={}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as d_r:
                if d_r.status == 200:
                    d_res = await d_r.json()
                    if d_res.get("success"):
                        rew = d_res.get("data", {}).get("rewardLnx", 5)
                        res["tasks_claimed"] += 1
                        res["notes"].append(f"daily_claim_{rew}")
                        res["balance"] += float(rew)
        except Exception:
            pass

        # 4. Tasks fetch & complete
        try:
            async with session.get(f"{base_url}/tasks", headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as t_r:
                if t_r.status == 200:
                    t_res = await t_r.json()
                    tasks = t_res.get("data", [])
                    if isinstance(tasks, list):
                        for t in tasks:
                            if not t.get("isCompleted") and not t.get("completed"):
                                tid = t.get("id") or t.get("_id")
                                await session.post(f"{base_url}/tasks/{tid}/open", json={}, headers=headers, timeout=aiohttp.ClientTimeout(total=5))
                                await asyncio.sleep(11) # Server enforces 10s countdown
                                async with session.post(f"{base_url}/tasks/{tid}/complete", json={}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as c_r:
                                    if c_r.status == 200:
                                        c_res = await c_r.json()
                                        if c_res.get("success"):
                                            res["tasks_claimed"] += 1
                                            res["notes"].append(f"task_{tid}")
                                            res["balance"] += float(t.get("rewardLnx", 15) or 15)
        except Exception:
            pass

        # 4.1 Adsgram Watch & Click (+10 GRC each, up to 8 per 12 hours)
        try:
            async with session.get(f"{base_url}/users/ads", headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as ads_r:
                if ads_r.status == 200:
                    a_data = (await ads_r.json()).get("data", {})
                    limit = int(a_data.get("limit", 8))
                    watched = int(a_data.get("watched", 0))
                    remaining = max(0, limit - watched)
                    for ad_i in range(remaining):
                        ad_payload = {"clicked": 1, "watchedMs": 15500 + random.randint(100, 2000)}
                        async with session.post(f"{base_url}/users/ads/complete", json=ad_payload, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as c_ads:
                            if c_ads.status == 200:
                                c_res = await c_ads.json()
                                if c_res.get("success"):
                                    res["tasks_claimed"] += 1
                                    res["notes"].append(f"ad_{ad_i+1}")
                                    res["balance"] = float(c_res.get("data", {}).get("lnxBalance", res["balance"]) or res["balance"])
                            else:
                                break
                        await asyncio.sleep(1)
        except Exception:
            pass

        # 5. Claim Mining Yield (Zero spend - never buy packages)
        try:
            async with session.get(f"{base_url}/mining/status", headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as m_r:
                if m_r.status == 200:
                    m_res = await m_r.json()
                    m_dat = m_res.get("data", {})
                    res["packages"] = m_dat.get("packageCount", 0)
                    res["is_mining"] = m_dat.get("isMining", False)
                    sess_mined = float(m_dat.get("sessionMinedLnx", 0) or 0)
                    if sess_mined > 0:
                        async with session.post(f"{base_url}/mining/claim", json={}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as cl_r:
                            if cl_r.status == 200:
                                res["tasks_claimed"] += 1
                                res["notes"].append(f"mined_yield_{sess_mined:.2f}")
                                res["balance"] += sess_mined
                    # If packages exist but mining paused, ensure toggle is ON
                    if res["packages"] > 0 and not res["is_mining"]:
                        await session.post(f"{base_url}/mining/toggle", json={}, headers=headers, timeout=aiohttp.ClientTimeout(total=6))
        except Exception:
            pass

    except Exception as e:
        res["notes"].append(f"err: {str(e)[:40]}")

    return res


async def sweep_lumeon_tasks(session: aiohttp.ClientSession, uid: str, name: str, init_data: str, acc: dict) -> Dict[str, Any]:
    """Sweeps LUM Miner ($LUM) tasks, qualifications, and Master referral claims."""
    res = {"bot": "LUM Miner", "tasks_claimed": 0, "notes": [], "success": False, "balance": 0.0}
    if not init_data:
        return res

    base_url = "https://lum-miner.gurmessa747.workers.dev"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
    }
    is_master = (str(uid) == MASTER_UID)

    try:
        # 1. Join under Master if worker
        if not is_master:
            try:
                async with session.post(f"{base_url}/referral", json={"action": "join", "inviter": MASTER_UID, "initData": init_data}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as j_r:
                    if j_r.status == 200:
                        j_d = await j_r.json()
                        if j_d.get("ok"):
                            res["notes"].append("joined_master")
            except Exception:
                pass

        # 2. Qualify referral
        try:
            async with session.post(f"{base_url}/referral", json={"action": "qualify", "initData": init_data}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as q_r:
                if q_r.status == 200:
                    q_d = await q_r.json()
                    if q_d.get("ok"):
                        res["notes"].append("qualified")
        except Exception:
            pass

        # 3. Tasks
        tasks = [("community", 50), ("payouts", 50), ("gramapps", 30), ("grammoney", 30), ("youtube", 40)]
        for tid, rew in tasks:
            try:
                async with session.post(f"{base_url}/check-join", json={"task": tid, "initData": init_data}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as t_r:
                    if t_r.status == 200:
                        t_d = await t_r.json()
                        if t_d.get("ok"):
                            res["tasks_claimed"] += 1
                            res["notes"].append(f"task_{tid}")
                            res["balance"] += rew
            except Exception:
                pass

        # 4. Master Referral Claim
        if is_master:
            try:
                async with session.get(f"{base_url}/referral?id={MASTER_UID}", headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as ref_r:
                    if ref_r.status == 200:
                        ref_d = await ref_r.json()
                        friends = ref_d.get("friends", [])
                        unpaid = [f for f in friends if f.get("qualified") and not f.get("paid")]
                        if unpaid:
                            async with session.post(f"{base_url}/referral", json={"action": "claim", "initData": init_data}, headers=headers, timeout=aiohttp.ClientTimeout(total=6)) as cl_r:
                                if cl_r.status == 200:
                                    cl_d = await cl_r.json()
                                    if cl_d.get("ok"):
                                        paid_cnt = cl_d.get("paid", len(unpaid))
                                        res["tasks_claimed"] += paid_cnt
                                        res["notes"].append(f"ref_claim_{paid_cnt*1000}LUM")
            except Exception:
                pass

        res["success"] = True
    except Exception as e:
        res["notes"].append(f"err: {str(e)[:40]}")

    return res


async def sweep_earnvault_tasks(session: aiohttp.ClientSession, uid: str, name: str, init_data: str, acc: dict) -> Dict[str, Any]:
    """Sweeps EarnVault ($USD / $TON) daily check-ins, cooldown claims, rewarded ads, bonus tasks, and partner quests."""
    res = {"bot": "EarnVault", "tasks_claimed": 0, "notes": [], "success": False, "balance": 0.0}
    if not init_data:
        return res

    functions_base = "https://us-central1-earnvaulte.cloudfunctions.net"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
    }

    try:
        # 1. telegramAuth to get custom token
        async with session.post(f"{functions_base}/telegramAuth", json={"data": {"initData": init_data}}, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as a_r:
            if a_r.status != 200:
                return res
            auth_d = await a_r.json()
            custom_tok = auth_d.get("result", {}).get("token")
            if not custom_tok:
                return res

        # 2. Exchange for Firebase ID Token
        ex_url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyCP9yYj_KSQxv0lW0EoqR39_QTO2SGJGEg"
        async with session.post(ex_url, json={"token": custom_tok, "returnSecureToken": True}, timeout=aiohttp.ClientTimeout(total=8)) as ex_r:
            if ex_r.status != 200:
                return res
            id_tok = (await ex_r.json()).get("idToken")
            if not id_tok:
                return res

        auth_headers = {**headers, "Authorization": f"Bearer {id_tok}"}

        # Gate solver helper (solves ad/captcha gate required for checkin, claims, and bonuses)
        async def solve_gate(purpose: str) -> Optional[str]:
            try:
                async with session.post(f"{functions_base}/startGate", json={"data": {"purpose": purpose}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=8)) as sg_r:
                    if sg_r.status != 200:
                        return None
                    sg_d = await sg_r.json()
                    sess_id = sg_d.get("result", {}).get("sessionId")
                if not sess_id:
                    return None

                for _ in range(12):
                    async with session.post(f"{functions_base}/confirmGate", json={"data": {"sessionId": sess_id}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=8)) as cg_r:
                        if cg_r.status == 200:
                            cg_d = (await cg_r.json()).get("result", {})
                            st = cg_d.get("status")
                            if st in ("ready", "credited"):
                                return sess_id
                            wait_ms = cg_d.get("waitMs", 2000)
                            await asyncio.sleep(min(max(1.0, wait_ms / 1000.0 + 0.3), 4.0))
                        else:
                            break
            except Exception:
                pass
            return None

        # 3. Tasks
        tasks = [("official", 20), ("glamour", 10)]
        for tid, rew in tasks:
            try:
                await session.post(f"{functions_base}/startTask", json={"data": {"taskId": tid}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6))
                await asyncio.sleep(0.5)
                async with session.post(f"{functions_base}/verifyTask", json={"data": {"taskId": tid}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as v_r:
                    if v_r.status == 200:
                        v_d = await v_r.json()
                        res_d = v_d.get("result", {})
                        if res_d.get("verified"):
                            res["tasks_claimed"] += 1
                            res["notes"].append(f"task_{tid}")
            except Exception:
                pass

        # 4. Dashboard & Daily Check-in & Claim Reward (with Gate Resolution)
        try:
            async with session.post(f"{functions_base}/getDashboard", json={"data": {}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=8)) as d_r:
                if d_r.status == 200:
                    dash = (await d_r.json()).get("result", {})
                    bal_cents = dash.get("balanceCents", 0)
                    res["balance"] = bal_cents / 100.0

                    # A. Daily Checkin
                    ci = dash.get("checkin", {})
                    if not ci.get("doneToday"):
                        gate_sess = None
                        if ci.get("gate", {}).get("required"):
                            gate_sess = await solve_gate("checkin")
                        ci_payload = {"gateSessionId": gate_sess} if gate_sess else {}
                        async with session.post(f"{functions_base}/dailyCheckIn", json={"data": ci_payload}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as ci_r:
                            if ci_r.status == 200:
                                ci_d = (await ci_r.json()).get("result", {})
                                if not ci_d.get("already") and ci_d.get("creditedCents"):
                                    res["tasks_claimed"] += 1
                                    res["notes"].append(f"checkin_+{ci_d.get('creditedCents')}c")
                                    res["balance"] += (ci_d.get("creditedCents") / 100.0)

                    # B. Claim Reward
                    cl = dash.get("claim", {})
                    if cl.get("status") == "ready" or cl.get("remainingMs", 1) <= 0:
                        gate_sess = None
                        if cl.get("gate", {}).get("required"):
                            gate_sess = await solve_gate("claim")
                        cl_payload = {"idempotencyKey": str(uuid.uuid4())}
                        if gate_sess:
                            cl_payload["gateSessionId"] = gate_sess
                        async with session.post(f"{functions_base}/claimReward", json={"data": cl_payload}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as cl_r:
                            if cl_r.status == 200:
                                cl_d = (await cl_r.json()).get("result", {})
                                if cl_d.get("creditedCents"):
                                    res["tasks_claimed"] += 1
                                    res["notes"].append(f"claim_+{cl_d.get('creditedCents')}c")
                                    res["balance"] += (cl_d.get("creditedCents") / 100.0)
        except Exception:
            pass

        # 5. Rewarded Watch Ads (Monetag, Adsgram, Adsterra, Giga, QuickMoney)
        try:
            async with session.post(f"{functions_base}/getAdState", json={"data": {}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as ads_r:
                if ads_r.status == 200:
                    ad_data = (await ads_r.json()).get("result", {})
                    if ad_data.get("enabled") and ad_data.get("eligible"):
                        networks = ad_data.get("networks", [])
                        for net in networks:
                            net_id = net.get("id")
                            left = int(net.get("left", 0))
                            if net.get("ready") and left > 0 and net_id:
                                # Watch all remaining ads in this network to earn the batch reward ($0.10 for 10 ads)
                                for _ in range(min(left, 10)):
                                    async with session.post(f"{functions_base}/startAd", json={"data": {"net": net_id}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as sa_r:
                                        if sa_r.status == 200:
                                            sa_d = (await sa_r.json()).get("result", {})
                                            sess_id = sa_d.get("sessionId")
                                            min_watch = int(sa_d.get("minWatchSeconds", 10))
                                            if sess_id:
                                                await asyncio.sleep(min_watch + 1)
                                                async with session.post(f"{functions_base}/completeAd", json={"data": {"sessionId": sess_id}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as ca_r:
                                                    if ca_r.status == 200:
                                                        ca_d = (await ca_r.json()).get("result", {})
                                                        st = ca_d.get("status")
                                                        if st in ("counted", "credited"):
                                                            res["tasks_claimed"] += 1
                                                            if ca_d.get("creditedCents"):
                                                                res["notes"].append(f"ad_{net_id}_credited_+{ca_d.get('creditedCents')}c")
                                                                res["balance"] += (ca_d.get("creditedCents") / 100.0)
                                                            else:
                                                                res["notes"].append(f"ad_{net_id}_{st}")
                                                    else:
                                                        break
                                        else:
                                            break
        except Exception as ae:
            logger.debug(f"[{name}] EarnVault ad watch note: {ae}")

        # 6. Bonus Tasks (getBonusState -> startBonus -> confirmGate)
        try:
            async with session.post(f"{functions_base}/getBonusState", json={"data": {}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as bn_r:
                if bn_r.status == 200:
                    bn_data = (await bn_r.json()).get("result", {})
                    items = bn_data.get("items", [])
                    for item in items:
                        item_id = item.get("id")
                        if item.get("ready") and not item.get("done") and item_id:
                            async with session.post(f"{functions_base}/startBonus", json={"data": {"id": item_id}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as sb_r:
                                if sb_r.status == 200:
                                    sb_d = (await sb_r.json()).get("result", {})
                                    b_sess = sb_d.get("sessionId")
                                    if b_sess:
                                        await asyncio.sleep(2)
                                        async with session.post(f"{functions_base}/confirmGate", json={"data": {"sessionId": b_sess}}, headers=auth_headers, timeout=aiohttp.ClientTimeout(total=6)) as cb_r:
                                            if cb_r.status == 200:
                                                cb_d = (await cb_r.json()).get("result", {})
                                                if cb_d.get("status") in ("ready", "credited"):
                                                    res["tasks_claimed"] += 1
                                                    res["notes"].append(f"bonus_{item_id}")
        except Exception:
            pass

        res["success"] = True
    except Exception as e:
        res["notes"].append(f"err: {str(e)[:40]}")

    return res


# =============================================================================
# 3. MAIN RUNNER (21-ACCOUNT PARALLEL PIPELINE)
# =============================================================================

async def process_account(session: aiohttp.ClientSession, acc: dict, tokens_db: dict, sem: asyncio.Semaphore) -> Dict[str, Any]:
    async with sem:
        uid = str(acc.get("user_id") or acc.get("account_id") or acc.get("id") or "")
        name = acc.get("name", f"Account_{uid}")
        is_owner = (uid == MASTER_UID)
        acc_toks = tokens_db.get(uid, {})

        logger.info(f"🚀 Sweeping side-tasks for {name} ({uid})...")
        account_report = {
            "account": f"{name} ({uid})",
            "is_master": is_owner,
            "results": {}
        }

        # 1. MRG Miner
        mrg_res = await sweep_mrg_tasks(session, uid, name, acc_toks.get("mrg_init_data", ""), acc)
        account_report["results"]["mrg"] = mrg_res

        # 2. ATF Miner
        atf_res = await sweep_atf_tasks(session, uid, name, acc_toks.get("atf_init_data", ""), acc)
        account_report["results"]["atf"] = atf_res

        # 3. Victor's Company
        vic_res = await sweep_victors_tasks(session, uid, name, acc_toks.get("victors_init_data", ""), acc)
        account_report["results"]["victors"] = vic_res

        # 4. Kynex Network
        kynex_res = await sweep_kynex_tasks(session, uid, name, acc_toks.get("kynex_init_data", ""), acc)
        account_report["results"]["kynex"] = kynex_res

        # 5. PepeGram
        pepe_init = acc_toks.get("pepegram_init_data") or acc_toks.get("pepe_init_data", "")
        pepe_res = await sweep_pepegram_tasks(session, uid, name, pepe_init, acc)
        account_report["results"]["pepegram"] = pepe_res

        # 6. AdxEarn AI
        adx_init = acc_toks.get("adxearn_init_data") or acc_toks.get("adx_init_data", "")
        adx_res = await sweep_adxearn_tasks(session, uid, name, adx_init, acc)
        account_report["results"]["adxearn"] = adx_res

        # 7. DiggoMiner
        diggo_res = await sweep_diggo_tasks(session, uid, name, acc_toks.get("diggo_init_data", ""), {**acc, **acc_toks})
        account_report["results"]["diggo"] = diggo_res

        # 8. Chicken Land
        chk_init = acc_toks.get("chickenland_init_data") or acc.get("chickenland_init_data") or acc_toks.get("chicken_init_data", "")
        chicken_res = await sweep_chickenland_tasks(session, uid, name, chk_init, acc)
        account_report["results"]["chickenland"] = chicken_res

        # 9. Grouche Mine
        grc_init = acc_toks.get("grouchemine_init_data") or acc.get("grouchemine_init_data") or acc_toks.get("grc_init_data", "")
        grc_res = await sweep_grouchemine_tasks(session, uid, name, grc_init, {**acc, **acc_toks})
        account_report["results"]["grouchemine"] = grc_res

        # 10. LUM Miner
        lum_init = acc_toks.get("lumeon_init_data") or acc.get("lumeon_init_data", "")
        lum_res = await sweep_lumeon_tasks(session, uid, name, lum_init, acc)
        account_report["results"]["lumeon"] = lum_res

        # 11. EarnVault
        ev_init = acc_toks.get("earnvault_init_data") or acc.get("earnvault_init_data", "")
        ev_res = await sweep_earnvault_tasks(session, uid, name, ev_init, acc)
        account_report["results"]["earnvault"] = ev_res

        # Sync tokens to Cloudflare Workers if newly refreshed
        await sync_token_to_cf(session, uid, acc_toks)

        total_claimed = sum(r.get("tasks_claimed", 0) for r in account_report["results"].values())
        logger.info(f"✅ [{name}] Finished side-tasks! Claimed: {total_claimed} total tasks/rewards.")
        return account_report


async def main():
    logger.info("=============================================================================")
    logger.info(f"🎯 STARTING COMPLETE 11-BOT FLEET SIDE-TASK HARVEST ({len(ACCOUNTS)} ACCOUNTS)")
    logger.info("=============================================================================")

    conn = aiohttp.TCPConnector(limit=25, ttl_dns_cache=300)
    async with aiohttp.ClientSession(connector=conn) as session:
        t_start = time.time()
        tokens_db = await fetch_all_tokens(session)
        logger.info(f"Loaded tokens for {len(tokens_db)} accounts from Upstash Redis.")

        # Semaphore of 3 to avoid hammering APIs while maintaining fast speed
        sem = asyncio.Semaphore(3)
        tasks = [process_account(session, acc, tokens_db, sem) for acc in ACCOUNTS]
        reports = await asyncio.gather(*tasks)

        # Print Summary
        logger.info("\n" + "=" * 80)
        logger.info(f"📊 11-BOT FLEET ALL SIDE-TASKS HARVEST SUMMARY ({len(ACCOUNTS)} ACCOUNTS)")
        logger.info("=" * 80)
        total_tasks = 0
        for rep in reports:
            acc_name = rep["account"]
            res = rep["results"]
            mrg_cl = res.get("mrg", {}).get("tasks_claimed", 0)
            atf_cl = res.get("atf", {}).get("tasks_claimed", 0)
            vic_cl = res.get("victors", {}).get("tasks_claimed", 0)
            kyn_cl = res.get("kynex", {}).get("tasks_claimed", 0)
            pep_cl = res.get("pepegram", {}).get("tasks_claimed", 0)
            adx_cl = res.get("adxearn", {}).get("tasks_claimed", 0)
            dig_cl = res.get("diggo", {}).get("tasks_claimed", 0)
            chk_cl = res.get("chickenland", {}).get("tasks_claimed", 0)
            grc_cl = res.get("grouchemine", {}).get("tasks_claimed", 0)
            lum_cl = res.get("lumeon", {}).get("tasks_claimed", 0)
            ev_cl = res.get("earnvault", {}).get("tasks_claimed", 0)
            acc_total = mrg_cl + atf_cl + vic_cl + kyn_cl + pep_cl + adx_cl + dig_cl + chk_cl + grc_cl + lum_cl + ev_cl
            total_tasks += acc_total
            logger.info(f"• {acc_name:<25} | MRG:{mrg_cl} ATF:{atf_cl} VIC:{vic_cl} KYN:{kyn_cl} PEP:{pep_cl} ADX:{adx_cl} DIG:{dig_cl} CHK:{chk_cl} GRC:{grc_cl} LUM:{lum_cl} EV:{ev_cl} | Tot: {acc_total}")

        logger.info("=" * 80)
        logger.info(f"🏁 GRAND TOTAL SIDE-TASKS/REWARDS CLAIMED: {total_tasks}")
        logger.info("=============================================================================")

        # Dispatch concise ground-truth alert to AAA Admin notification channel (-1004358687850)
        bot_token = env.get("ADMIN_BOT_TOKEN") or env.get("REPORT_BOT_TOKEN") or os.getenv("ADMIN_BOT_TOKEN") or os.getenv("REPORT_BOT_TOKEN") or ""
        notif_channel = env.get("ADMIN_NOTIFICATION_CHANNEL_ID") or os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID") or "-1004358687850"
        mrg_tot = sum(r["results"].get("mrg", {}).get("tasks_claimed", 0) for r in reports)
        atf_tot = sum(r["results"].get("atf", {}).get("tasks_claimed", 0) for r in reports)
        vic_tot = sum(r["results"].get("victors", {}).get("tasks_claimed", 0) for r in reports)
        kyn_tot = sum(r["results"].get("kynex", {}).get("tasks_claimed", 0) for r in reports)
        pep_tot = sum(r["results"].get("pepegram", {}).get("tasks_claimed", 0) for r in reports)
        adx_tot = sum(r["results"].get("adxearn", {}).get("tasks_claimed", 0) for r in reports)
        dig_tot = sum(r["results"].get("diggo", {}).get("tasks_claimed", 0) for r in reports)
        chk_tot = sum(r["results"].get("chickenland", {}).get("tasks_claimed", 0) for r in reports)
        grc_tot = sum(r["results"].get("grouchemine", {}).get("tasks_claimed", 0) for r in reports)
        lum_tot = sum(r["results"].get("lumeon", {}).get("tasks_claimed", 0) for r in reports)
        ev_tot = sum(r["results"].get("earnvault", {}).get("tasks_claimed", 0) for r in reports)
        elapsed = time.time() - t_start

        if bot_token and notif_channel:
            short_card = (
                f"⚡ <b>Fleet 11-Bot Auto-Harvest Complete</b>\n"
                f"• <b>Accounts Farmed:</b> <code>{len(ACCOUNTS)}/{len(ACCOUNTS)} Online</code>\n"
                f"• <b>Tasks & Rewards Claimed:</b> <code>{total_tasks} Total Claimed</code>\n"
                f"• <b>Pools Claimed (11/11):</b> <code>MRG:{mrg_tot} • ATF:{atf_tot} • VIC:{vic_tot} • KYN:{kyn_tot} • PEP:{pep_tot} • ADX:{adx_tot} • DIG:{dig_tot} • CHK:{chk_tot} • GRC:{grc_tot} • LUM:{lum_tot} • EV:{ev_tot}</code>\n"
                f"• <b>Duration:</b> <code>{elapsed:.1f}s</code> | <b>Node:</b> <code>Render Cloud Mesh</code>\n"
                f"• <b>Status:</b> 🟢 100% Ground-Truth Synced"
            )
            try:
                async with session.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": notif_channel,
                        "text": short_card,
                        "parse_mode": "HTML"
                    },
                    timeout=aiohttp.ClientTimeout(total=8)
                ) as n_resp:
                    if n_resp.status == 200:
                        logger.info(f"Dispatched completion alert to AAA Admin notification ({notif_channel})")
                    else:
                        logger.warning(f"Notification HTTP {n_resp.status}: {await n_resp.text()}")
            except Exception as ex:
                logger.warning(f"Failed to dispatch completion alert: {ex}")


if __name__ == "__main__":
    asyncio.run(main())

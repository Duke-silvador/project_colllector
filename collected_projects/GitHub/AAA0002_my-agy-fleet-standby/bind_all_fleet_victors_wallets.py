#!/usr/bin/env python3
"""
bind_all_fleet_victors_wallets.py
=============================================================================
Binds authentic, non-custodial TON wallets to all 21 AAA AUTO fleet accounts
on Victor's Company (@VictorsCompanybot / app.victors.company) using TonConnect 2.0
cryptographic proof-of-ownership, completes tutorial & check-in, unlocks Level 1
Miner to eliminate home.noJob, and activates autonomous mining.
=============================================================================
"""

import os
import sys
import json
import time
import struct
import hashlib
import base64
import urllib.request
import urllib.error
import logging
from typing import Dict, Any, List

from nacl.signing import SigningKey
from tonsdk.contract.wallet import Wallets, WalletVersionEnum

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("victors_wallet_binder")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
FLEET_WALLETS_FILE = os.path.join(BASE_DIR, "fleet_ton_wallets.json")

UPSTASH_URL = os.getenv("UPSTASH_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or ""

if not UPSTASH_TOKEN and os.path.exists(os.path.join(BASE_DIR, ".env")):
    with open(os.path.join(BASE_DIR, ".env"), "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("UPSTASH_TOKEN="):
                UPSTASH_TOKEN = line.split("=", 1)[1].strip().strip("\"'")
            elif line.startswith("UPSTASH_URL="):
                UPSTASH_URL = line.split("=", 1)[1].strip().strip("\"'")

VICTORS_API = "https://server.victors.company/api"
VICTORS_ORIGIN = "https://app.victors.company"
VICTORS_DOMAIN = "app.victors.company"


def get_upstash(key: str) -> Any:
    if not UPSTASH_TOKEN:
        return None
    try:
        req = urllib.request.Request(
            f"{UPSTASH_URL}/get/{key}",
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            res = json.loads(r.read())["result"]
            return json.loads(res) if isinstance(res, str) else res
    except Exception as e:
        logger.warning(f"Upstash GET {key} failed: {e}")
        return None


def safe_post(url: str, data: dict, headers: dict) -> tuple:
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body.startswith("{") or body.startswith("[") else body
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8") if e.fp else ""
        try:
            return e.code, json.loads(err)
        except Exception:
            return e.code, err
    except Exception as e:
        return 0, str(e)


def safe_get(url: str, headers: dict) -> tuple:
    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body.startswith("{") or body.startswith("[") else body
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8") if e.fp else ""
        try:
            return e.code, json.loads(err)
        except Exception:
            return e.code, err
    except Exception as e:
        return 0, str(e)


def create_victors_ton_proof(w_entry: dict, nonce: str) -> tuple:
    """Signs TonConnect 2.0 cryptographic proof for Victor's Company."""
    raw_m = w_entry.get("mnemonic") or w_entry.get("mnemonic_words")
    words = raw_m.split() if isinstance(raw_m, str) else raw_m
    _, pub_key_bytes, priv_key_bytes, wallet_contract = Wallets.from_mnemonics(
        mnemonics=words, version=WalletVersionEnum.v4r2
    )
    state_init_res = wallet_contract.create_state_init()
    state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")

    t_addr = wallet_contract.address
    friendly_addr = t_addr.to_string(is_user_friendly=True, is_bounceable=False, is_url_safe=True)
    domain_bytes = VICTORS_DOMAIN.encode("utf-8")
    timestamp = int(time.time())

    prefix = b"ton-proof-item-v2/"
    wc_bytes = struct.pack(">i", t_addr.wc)
    domain_len = struct.pack("<I", len(domain_bytes))
    ts_bytes = struct.pack("<Q", timestamp)
    payload_bytes = nonce.encode("utf-8")

    msg = prefix + wc_bytes + t_addr.hash_part + domain_len + domain_bytes + ts_bytes + payload_bytes
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
            "value": VICTORS_DOMAIN
        },
        "signature": sig_b64,
        "payload": nonce
    }
    return proof_item, state_init_b64, pub_key_bytes.hex(), friendly_addr


def main():
    logger.info("📡 Loading accounts, tokens, and TON wallets for Victor's Company...")
    
    # Load accounts
    accounts = []
    if os.path.exists(ACCOUNTS_FILE):
        with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
            accounts = json.load(f)
    if not accounts:
        accounts = get_upstash("fleet:accounts") or []

    # Load wallets
    wallets = {}
    if os.path.exists(FLEET_WALLETS_FILE):
        with open(FLEET_WALLETS_FILE, "r", encoding="utf-8") as f:
            wallets = json.load(f)
    if not wallets:
        wallets = get_upstash("fleet:wallets:ton") or {}

    # Load tokens
    tokens_map = get_upstash("miniapp_tokens") or {}

    logger.info(f"Loaded {len(accounts)} fleet accounts, {len(wallets)} TON wallets, {len(tokens_map)} token sets.")

    success_count = 0
    already_connected = 0
    skipped_count = 0

    for idx, acc in enumerate(accounts):
        uid = str(acc.get("user_id"))
        name = acc.get("name", f"Account #{idx+1}")
        w_entry = wallets.get(uid) or acc.get("ton_wallet") or {}
        raw_m = w_entry.get("mnemonic") or w_entry.get("mnemonic_words")

        toks = tokens_map.get(uid, {})
        v_init = toks.get("victors_init_data")
        if not v_init:
            t_data = get_upstash(f"fleet:tokens:{uid}")
            if t_data and isinstance(t_data, dict):
                v_init = t_data.get("victors_init_data")

        if not v_init:
            logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): Missing victors_init_data. Skipping.")
            skipped_count += 1
            continue

        # Check humanPass
        p_data = get_upstash(f"victors:pass:{uid}")
        hp = None
        if p_data:
            hp = p_data.get("humanPass") if isinstance(p_data, dict) else str(p_data)

        headers = {
            "Authorization": f"tma {v_init}",
            "Content-Type": "application/json",
            "Origin": VICTORS_ORIGIN,
            "Referer": f"{VICTORS_ORIGIN}/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 Mobile"
        }
        if hp:
            headers["x-human-pass"] = str(hp)

        # 1. Probe /api/me
        me_code, me_res = safe_get(f"{VICTORS_API}/me", headers)
        if me_code != 200 or not isinstance(me_res, dict) or not me_res.get("success"):
            if me_code in (401, 403) and "HUMAN_REQUIRED" in str(me_res):
                logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): Needs fresh Turnstile humanPass. Solve via cloud runner.")
            else:
                logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): /me request failed: {me_code} {str(me_res)[:100]}")
            skipped_count += 1
            continue

        user = me_res.get("user", {})
        fname = user.get("firstName", name)
        bal = user.get("inAppBalance", 0)
        is_conn = user.get("isWalletConnected", False)
        is_owned = user.get("walletOwned", False)
        w_addr = user.get("walletAddress", "")
        lvl = int(user.get("level") or user.get("peakLevel") or 0)
        manual_lvl = int(user.get("manualUnlockedLevel") or 0)

        logger.info(f"[{idx+1}/{len(accounts)}] 👤 {fname} ({uid}) | Bal: {bal} VIC | Lvl: {lvl} (man: {manual_lvl}) | Connected: {is_conn} | Owned: {is_owned}")

        # 2. Tutorial & Daily Check-in
        safe_post(f"{VICTORS_API}/me/tutorial", {}, headers)
        safe_post(f"{VICTORS_API}/checkin", {}, headers)

        # 3. Connect TON Wallet via TonConnect 2.0 Proof
        if not (is_conn and is_owned):
            if raw_m:
                np_code, np_res = safe_get(f"{VICTORS_API}/wallet/proof-payload", headers)
                if np_code == 200 and isinstance(np_res, dict) and np_res.get("payload"):
                    nonce = np_res["payload"]
                    proof_item, state_init_b64, pub_key_hex, friendly_addr = create_victors_ton_proof(w_entry, nonce)
                    conn_body = {
                        "address": friendly_addr,
                        "proof": proof_item,
                        "stateInit": state_init_b64,
                        "publicKey": pub_key_hex
                    }
                    c_code, c_res = safe_post(f"{VICTORS_API}/wallet/connect", conn_body, headers)
                    if c_code in (200, 201) and isinstance(c_res, dict) and c_res.get("success"):
                        logger.info(f"  💎 {name} ({uid}): Successfully connected TON wallet {friendly_addr[:12]}... (walletOwned=True)!")
                        success_count += 1
                        safe_post(f"{VICTORS_API}/tasks/claim", {"taskId": "connect-wallet"}, headers)
                    else:
                        logger.warning(f"  {name} ({uid}): Connect wallet error: {c_code} {c_res}")
                else:
                    logger.warning(f"  {name} ({uid}): Failed to obtain proof-payload nonce: {np_code} {np_res}")
            else:
                logger.warning(f"  {name} ({uid}): Missing mnemonic. Cannot generate proof.")
        else:
            logger.info(f"  💎 {name} ({uid}): TON wallet already verified owned ({w_addr[:12]}...).")
            already_connected += 1

        # 4. Unlock Level 1 Miner to eliminate home.noJob & start mining
        if manual_lvl < 1 or lvl < 1:
            u_code, u_res = safe_post(f"{VICTORS_API}/levels/unlock", {"level": 1}, headers)
            logger.info(f"  ⛏️ {name} ({uid}): Level 1 Miner unlock status: {u_code}")

        # 5. Check if higher level unlocked
        unl = int(user.get("unlockedLevel") or lvl)
        if unl > lvl:
            safe_post(f"{VICTORS_API}/levels/unlock", {"level": unl}, headers)

        # 6. Tasks
        for tid in ["connect-wallet", "follow-victors-company-on-x", "like-retweet-comment-on-x", "subscribe-vic-on-youtube"]:
            safe_post(f"{VICTORS_API}/tasks/claim", {"taskId": tid}, headers)

        # 7. Mining Claim
        m_code, m_res = safe_post(f"{VICTORS_API}/mining/claim", {}, headers)
        logger.info(f"  ⛏️ {name} ({uid}): Mining claim status: {m_code}")

        time.sleep(1.0)

    logger.info("==================================================")
    logger.info(f"🎉 Victor's Wallet Binding Complete: {success_count} newly connected, {already_connected} already connected, {skipped_count} skipped out of {len(accounts)} accounts!")
    logger.info("==================================================")


if __name__ == "__main__":
    main()

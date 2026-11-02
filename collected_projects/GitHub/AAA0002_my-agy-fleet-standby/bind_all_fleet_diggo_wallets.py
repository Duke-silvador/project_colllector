#!/usr/bin/env python3
"""
bind_all_fleet_diggo_wallets.py
=============================================================================
Binds authentic, non-custodial TON wallets to all 21 AAA AUTO fleet accounts
on DiggoMiner (@Diggominer_bot / diggo.linkpc.net) using TonConnect 2.0
cryptographic proof-of-ownership.
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
from typing import Dict, Any

from nacl.signing import SigningKey
from tonsdk.contract.wallet import Wallets, WalletVersionEnum

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("diggo_wallet_binder")

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

DIGGO_BASE = "https://diggo.linkpc.net"
DIGGO_DOMAIN = "diggo.linkpc.net"


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


def create_diggo_ton_proof(w_entry: dict, nonce: str) -> tuple:
    """Signs TonConnect 2.0 cryptographic proof for DiggoMiner."""
    raw_m = w_entry.get("mnemonic") or w_entry.get("mnemonic_words")
    words = raw_m.split() if isinstance(raw_m, str) else raw_m
    _, pub_k_b, priv_k_b, w_contract = Wallets.from_mnemonics(
        mnemonics=words, version=WalletVersionEnum.v4r2
    )
    state_init_res = w_contract.create_state_init()
    state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")
    t_addr = w_contract.address
    raw_addr = f"{t_addr.wc}:{t_addr.hash_part.hex()}"
    friendly_addr = t_addr.to_string(is_user_friendly=True, is_bounceable=False, is_url_safe=True)

    domain_b = DIGGO_DOMAIN.encode("utf-8")
    ts_now = int(time.time())
    msg = b"ton-proof-item-v2/" + struct.pack(">i", t_addr.wc) + t_addr.hash_part + struct.pack("<I", len(domain_b)) + domain_b + struct.pack("<Q", ts_now) + nonce.encode("utf-8")
    digest = hashlib.sha256(b"\xff\xff" + b"ton-connect" + hashlib.sha256(msg).digest()).digest()

    sig = SigningKey(priv_k_b[:32]).sign(digest).signature
    sig_b64 = base64.b64encode(sig).decode("utf-8")

    proof_obj = {
        "timestamp": ts_now,
        "domain": {"lengthBytes": len(domain_b), "value": DIGGO_DOMAIN},
        "signature": sig_b64,
        "payload": nonce
    }

    return proof_obj, state_init_b64, pub_k_b.hex(), raw_addr, friendly_addr


def main():
    logger.info("📡 Loading accounts, tokens, and TON wallets...")
    
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

    # Load miniapp tokens
    tokens_map = get_upstash("miniapp_tokens") or {}

    logger.info(f"Loaded {len(accounts)} fleet accounts, {len(wallets)} TON wallets, {len(tokens_map)} token sets.")

    success_count = 0
    already_bound = 0
    skipped_count = 0

    for idx, acc in enumerate(accounts):
        uid = str(acc.get("user_id"))
        name = acc.get("name", f"Account #{idx+1}")
        w_entry = wallets.get(uid) or acc.get("ton_wallet") or {}
        raw_m = w_entry.get("mnemonic") or w_entry.get("mnemonic_words")
        
        toks = tokens_map.get(uid, {})
        jwt = toks.get("diggo_jwt")

        if not jwt:
            # Check if cached in Redis directly
            jwt = get_upstash(f"fleet:diggo:jwt:{uid}")

        if not jwt:
            logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): Missing diggo_jwt. Skipping.")
            skipped_count += 1
            continue

        if not raw_m:
            logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): Missing TON mnemonic. Skipping.")
            skipped_count += 1
            continue

        d_headers = {
            "Authorization": f"Bearer {jwt}",
            "Content-Type": "application/json",
            "Origin": DIGGO_BASE,
            "Referer": f"{DIGGO_BASE}/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36"
        }

        # 1. Check current wallet state
        try:
            req_st = urllib.request.Request(f"{DIGGO_BASE}/api/state", headers=d_headers)
            with urllib.request.urlopen(req_st, timeout=8) as r:
                sd = json.loads(r.read().decode("utf-8"))
                st_w = sd.get("state", {}).get("wallet", {})
                if st_w.get("address") and st_w.get("holdings", {}).get("linked"):
                    logger.info(f"[{idx+1}/{len(accounts)}] ✅ {name} ({uid}): Already bound to {st_w.get('address')[:12]}... (linked=True)")
                    already_bound += 1
                    continue
        except Exception as se:
            logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): /api/state note: {se}")

        # 2. Request TonConnect challenge
        try:
            req_ch = urllib.request.Request(
                f"{DIGGO_BASE}/api/ton/challenge",
                data=json.dumps({}).encode("utf-8"),
                headers=d_headers
            )
            with urllib.request.urlopen(req_ch, timeout=8) as r_ch:
                ch_data = json.loads(r_ch.read().decode("utf-8"))
                nonce = ch_data.get("payload")
                if not nonce:
                    logger.error(f"[{idx+1}/{len(accounts)}] {name} ({uid}): No nonce returned in challenge: {ch_data}")
                    skipped_count += 1
                    continue

            # 3. Sign proof
            proof_obj, state_init_b64, pub_k_hex, raw_addr, friendly_addr = create_diggo_ton_proof(w_entry, nonce)
            bind_payload = {
                "address": raw_addr,
                "network": "-239",
                "publicKey": pub_k_hex,
                "walletStateInit": state_init_b64,
                "proof": proof_obj
            }

            # 4. Bind wallet
            req_bind = urllib.request.Request(
                f"{DIGGO_BASE}/api/ton/bind",
                data=json.dumps(bind_payload).encode("utf-8"),
                headers=d_headers
            )
            with urllib.request.urlopen(req_bind, timeout=10) as r_b:
                bind_res = json.loads(r_b.read().decode("utf-8"))
                bound_w = bind_res.get("state", {}).get("wallet", {})
                if bound_w.get("address"):
                    logger.info(f"[{idx+1}/{len(accounts)}] 💎 {name} ({uid}): Bound Diggo TON wallet {bound_w.get('address')[:12]}... (raw: {raw_addr})")
                    success_count += 1
                else:
                    logger.warning(f"[{idx+1}/{len(accounts)}] {name} ({uid}): Bind response missing address: {bind_res}")

            time.sleep(1.0)
        except urllib.error.HTTPError as he:
            err_body = he.read().decode("utf-8") if he.fp else ""
            logger.error(f"[{idx+1}/{len(accounts)}] ❌ {name} ({uid}): HTTP {he.code} -> {err_body[:120]}")
            skipped_count += 1
        except Exception as e:
            logger.error(f"[{idx+1}/{len(accounts)}] ❌ {name} ({uid}): Bind error: {e}")
            skipped_count += 1

    logger.info("==================================================")
    logger.info(f"🎉 Diggo Wallet Binding Sweep Complete: {success_count} newly bound, {already_bound} already bound, {skipped_count} skipped/error out of {len(accounts)} accounts!")
    logger.info("==================================================")


if __name__ == "__main__":
    main()

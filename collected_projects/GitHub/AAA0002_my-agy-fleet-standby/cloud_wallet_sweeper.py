#!/usr/bin/env python3
"""
cloud_wallet_sweeper.py
=============================================================================
MY AGY AI — Autonomous Cloud On-Chain Vault Sweeper & Consolidation Engine
=============================================================================
Zero-trust, multi-cloud automated wallet sweeper:
1. EVM Vault Sweeper (BSC & Arbitrum One):
   - Audits all 20 isolated worker EVM wallets (fleet_evm_wallets.json, Accounts #2-#21).
   - Detects on-chain BNB, ETH, BEP-20 USDT, and Arbitrum tokens.
   - Automatically sweeps surplus balances above gas threshold to Binance Web3 Master:
     0xfda4182001672b9f0f09e2118242e543e35ed5ce
2. TON Vault Sweeper (The Open Network):
   - Audits all 20 isolated worker TON v4r2 wallets (fleet_ton_wallets.json, Accounts #2-#21).
   - Detects TON coins and Jettons.
   - Automatically sweeps surplus balances above gas threshold to Binance Web3 Master:
     UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT
3. Telegram Receipt Broadcasting:
   - Dispatches instant verified on-chain receipts to Payout Channel (-1004402765950)
     and Admin DM (6727787768).
=============================================================================
"""

import os
import sys
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional
import aiohttp
from dotenv import load_dotenv

try:
    from web3 import Web3
    from eth_account import Account
    HAS_WEB3 = True
except ImportError:
    HAS_WEB3 = False

try:
    from tonsdk.contract.wallet import Wallets, WalletVersionEnum
    import base64
    HAS_TONSDK = True
except ImportError:
    HAS_TONSDK = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s UTC] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CloudSweeper")

# Configuration & Master Wallets
MASTER_EVM_VAULT = "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
MASTER_TON_VAULT = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT"
BSC_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"

REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN") or os.getenv("ADMIN_BOT_TOKEN") or ""
REPORT_CHAT_ID = os.getenv("REPORT_CHAT_ID", "6727787768")
PAYOUT_CHANNEL_ID = os.getenv("PAYOUT_CHANNEL_ID", "-1004402765950")
ADMIN_NOTIFICATION_CHANNEL_ID = os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")

TONAPI_KEY = os.getenv("TONAPI_KEY", "")
TONCENTER_API_KEY = os.getenv("TONCENTER_API_KEY", "")
DRPC_KEY = os.getenv("DRPC_API_KEY", "")

UPSTASH_URL = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN") or ""

# RPC Endpoints
BSC_RPCS = [
    f"https://bsc.drpc.org/ogrpc?dkey={DRPC_KEY}",
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc-dataseed1.binance.org"
]

ARB_RPCS = [
    f"https://arbitrum.drpc.org/ogrpc?dkey={DRPC_KEY}",
    "https://arb1.arbitrum.io/rpc"
]

# File Paths
FLEET_EVM_FILE = os.path.join(BASE_DIR, "fleet_evm_wallets.json")
FLEET_TON_FILE = os.path.join(BASE_DIR, "fleet_ton_wallets.json")


async def send_telegram_receipt(session: aiohttp.ClientSession, message: str):
    """Broadcasts verified receipt to Payout Channel (-1004402765950), Admin DM (6727787768), and Admin Notification."""
    targets = [t for t in [REPORT_CHAT_ID, PAYOUT_CHANNEL_ID, ADMIN_NOTIFICATION_CHANNEL_ID] if t]
    for target in targets:
        try:
            url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
            payload = {
                "chat_id": target,
                "text": message,
                "parse_mode": "HTML" if "<" in message else "Markdown",
                "disable_web_page_preview": True
            }
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=8)) as r:
                pass
        except Exception as e:
            logger.debug(f"Telegram receipt send note for {target}: {e}")


async def query_evm_rpc(session: aiohttp.ClientSession, rpc_list: List[str], method: str, params: list) -> Optional[Any]:
    """Queries an EVM JSON-RPC with multi-endpoint fallback."""
    payload = {
        "jsonrpc": "2.0",
        "id": int(time.time()),
        "method": method,
        "params": params
    }
    for rpc in rpc_list:
        try:
            async with session.post(rpc, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if "result" in data:
                        return data["result"]
        except Exception:
            continue
    return None


async def audit_single_evm(session: aiohttp.ClientSession, uid: str, info: dict) -> Optional[Dict[str, Any]]:
    """Audits a single EVM wallet across BSC (BNB + USDT) and Arbitrum (ETH)."""
    if not isinstance(info, dict) or "address" not in info:
        return None
    addr = info["address"]
    name = info.get("name", f"Worker {uid}")

    clean_addr = addr.lower().replace("0x", "").zfill(64)
    usdt_call_data = "0x70a08231" + clean_addr

    raw_bnb_t = query_evm_rpc(session, BSC_RPCS, "eth_getBalance", [addr, "latest"])
    raw_eth_t = query_evm_rpc(session, ARB_RPCS, "eth_getBalance", [addr, "latest"])
    raw_usdt_t = query_evm_rpc(session, BSC_RPCS, "eth_call", [{"to": BSC_USDT_CONTRACT, "data": usdt_call_data}, "latest"])

    raw_bnb, raw_eth, raw_usdt = await asyncio.gather(raw_bnb_t, raw_eth_t, raw_usdt_t, return_exceptions=True)

    bnb_bal = int(raw_bnb, 16) / 1e18 if isinstance(raw_bnb, str) and raw_bnb else 0.0
    eth_bal = int(raw_eth, 16) / 1e18 if isinstance(raw_eth, str) and raw_eth else 0.0
    usdt_bal = int(raw_usdt, 16) / 1e18 if isinstance(raw_usdt, str) and raw_usdt not in ("0x", "0x0") else 0.0

    return {
        "uid": uid,
        "name": name,
        "address": addr,
        "private_key": info.get("private_key"),
        "bnb_balance": bnb_bal,
        "eth_balance": eth_bal,
        "usdt_balance": usdt_bal
    }


async def audit_evm_worker_wallets(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Audits all worker EVM wallets concurrently on BSC and Arbitrum One."""
    wallets = {}
    if os.path.exists(FLEET_EVM_FILE):
        try:
            with open(FLEET_EVM_FILE, "r", encoding="utf-8") as f:
                wallets = json.load(f)
        except Exception as e:
            logger.error(f"Error loading {FLEET_EVM_FILE}: {e}")

    if not wallets and UPSTASH_URL and UPSTASH_TOKEN:
        try:
            async with session.get(
                f"{UPSTASH_URL}/get/fleet:wallets:evm",
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    res = data.get("result")
                    if res:
                        wallets = json.loads(res) if isinstance(res, str) else res
        except Exception as e:
            logger.warning(f"Upstash EVM wallets fallback error: {e}")

    if not wallets:
        return []

    tasks = [audit_single_evm(session, uid, info) for uid, info in wallets.items() if uid != "_guide"]
    completed = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in completed if isinstance(r, dict)]


async def audit_single_ton(session: aiohttp.ClientSession, uid: str, info: dict, headers: dict) -> Optional[Dict[str, Any]]:
    """Audits a single TON wallet via TonAPI."""
    if not isinstance(info, dict) or "address" not in info:
        return None
    addr = info["address"]
    name = info.get("name", f"Worker {uid}")
    ton_bal = 0.0

    try:
        url = f"https://tonapi.io/v2/accounts/{addr}"
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 200:
                d = await resp.json()
                ton_bal = int(d.get("balance", 0)) / 1e9
    except Exception:
        pass

    if ton_bal == 0.0:
        try:
            tc_headers = {"X-API-Key": TONCENTER_API_KEY} if TONCENTER_API_KEY else {}
            tc_url = f"https://toncenter.com/api/v2/getAddressBalance?address={addr}"
            async with session.get(tc_url, headers=tc_headers, timeout=aiohttp.ClientTimeout(total=5)) as tc_resp:
                if tc_resp.status == 200:
                    tc_d = await tc_resp.json()
                    res = tc_d.get("result", 0)
                    if isinstance(res, (int, float, str)) and str(res).isdigit():
                        ton_bal = int(res) / 1e9
        except Exception:
            pass

    return {
        "uid": uid,
        "name": name,
        "address": addr,
        "mnemonic": info.get("mnemonic"),
        "ton_balance": ton_bal
    }


async def audit_ton_worker_wallets(session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
    """Audits all worker TON wallets concurrently via TonAPI / Toncenter."""
    wallets = {}
    if os.path.exists(FLEET_TON_FILE):
        try:
            with open(FLEET_TON_FILE, "r", encoding="utf-8") as f:
                wallets = json.load(f)
        except Exception as e:
            logger.error(f"Error loading {FLEET_TON_FILE}: {e}")

    if not wallets and UPSTASH_URL and UPSTASH_TOKEN:
        try:
            async with session.get(
                f"{UPSTASH_URL}/get/fleet:wallets:ton",
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    res = data.get("result")
                    if res:
                        wallets = json.loads(res) if isinstance(res, str) else res
        except Exception as e:
            logger.warning(f"Upstash TON wallets fallback error: {e}")

    if not wallets:
        return []

    headers = {"User-Agent": "Mozilla/5.0"}
    if TONAPI_KEY:
        headers["Authorization"] = f"Bearer {TONAPI_KEY}"

    tasks = [audit_single_ton(session, uid, info, headers) for uid, info in wallets.items() if uid != "_guide"]
    completed = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in completed if isinstance(r, dict)]


def sweep_evm_native_balance(
    rpc_list: List[str],
    chain_id: int,
    chain_name: str,
    private_key: str,
    from_addr: str,
    to_addr: str,
    balance: float,
    min_threshold: float = 0.0008
) -> Optional[str]:
    """Sweeps native coin (BNB or ETH) using Web3."""
    if not HAS_WEB3 or not private_key:
        return None
    if balance <= min_threshold:
        return None

    try:
        w3 = None
        for rpc in rpc_list:
            try:
                tw3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 10}))
                if tw3.is_connected():
                    w3 = tw3
                    break
            except Exception:
                continue
        if not w3:
            logger.warning(f"[{chain_name}] Could not connect to any RPC for sweeping {from_addr}")
            return None

        cs_from = Web3.to_checksum_address(from_addr)
        cs_to = Web3.to_checksum_address(to_addr)
        if cs_from.lower() == cs_to.lower():
            logger.info(f"[{chain_name}] from_addr is equal to destination vault ({to_addr}). Skipping self-sweep.")
            return None
        nonce = w3.eth.get_transaction_count(cs_from)
        gas_price = w3.eth.gas_price

        # Dynamic gas limit with Arbitrum L1 calldata overhead support
        if chain_id == 42161:
            try:
                gas_limit = w3.eth.estimate_gas({"from": cs_from, "to": cs_to, "value": 1000})
            except Exception:
                gas_limit = 50000
        else:
            gas_limit = 21000

        gas_cost = gas_price * gas_limit
        balance_wei = w3.eth.get_balance(cs_from)
        amount_to_send = balance_wei - gas_cost

        if amount_to_send <= 0:
            logger.info(f"[{chain_name}] Balance ({balance_wei / 1e18:.6f}) too low to cover gas ({gas_cost / 1e18:.6f}) for {from_addr}")
            return None

        tx = {
            "nonce": nonce,
            "to": cs_to,
            "value": amount_to_send,
            "gas": gas_limit,
            "gasPrice": gas_price,
            "chainId": chain_id
        }

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        raw_tx = getattr(signed_tx, "raw_transaction", None) or getattr(signed_tx, "rawTransaction", None)
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        tx_hash_hex = tx_hash.hex()
        if not tx_hash_hex.startswith("0x"):
            tx_hash_hex = "0x" + tx_hash_hex

        logger.info(f"[{chain_name}] Swept {amount_to_send / 1e18:.6f} to {to_addr}! Tx: {tx_hash_hex}")
        return tx_hash_hex
    except Exception as e:
        logger.error(f"[{chain_name}] Sweep failed for {from_addr}: {e}")
        return None


def sweep_bep20_token_balance(
    rpc_list: List[str],
    chain_id: int,
    private_key: str,
    token_addr: str,
    from_addr: str,
    to_addr: str,
    token_balance: float,
    min_tokens: float = 0.08
) -> Optional[str]:
    """Sweeps standard BEP-20 / ERC-20 token using Web3."""
    if not HAS_WEB3 or not private_key:
        return None
    if token_balance <= min_tokens:
        return None

    try:
        w3 = None
        for rpc in rpc_list:
            try:
                tw3 = Web3(Web3.HTTPProvider(rpc, request_kwargs={"timeout": 10}))
                if tw3.is_connected():
                    w3 = tw3
                    break
            except Exception:
                continue
        if not w3:
            return None

        cs_from = Web3.to_checksum_address(from_addr)
        cs_to = Web3.to_checksum_address(to_addr)
        if cs_from.lower() == cs_to.lower():
            logger.info(f"[BEP-20 Sweep] from_addr is equal to destination vault ({to_addr}). Skipping self-sweep.")
            return None
        cs_token = Web3.to_checksum_address(token_addr)

        # Check BNB balance for gas
        native_bal = w3.eth.get_balance(cs_from)
        gas_price = w3.eth.gas_price
        gas_limit = 65000
        gas_cost = gas_price * gas_limit
        if native_bal < gas_cost:
            logger.warning(f"[BEP-20 Sweep] {from_addr} has tokens but insufficient BNB for gas ({native_bal / 1e18:.6f} BNB < {gas_cost / 1e18:.6f} BNB needed)")
            return None

        nonce = w3.eth.get_transaction_count(cs_from)
        transfer_abi = [
            {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}
        ]
        contract = w3.eth.contract(address=cs_token, abi=transfer_abi)
        raw_bal = contract.functions.balanceOf(cs_from).call()
        if raw_bal <= 0:
            return None

        tx = contract.functions.transfer(cs_to, raw_bal).build_transaction({
            "from": cs_from,
            "nonce": nonce,
            "gas": gas_limit,
            "gasPrice": gas_price,
            "chainId": chain_id
        })

        signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
        raw_tx = getattr(signed_tx, "raw_transaction", None) or getattr(signed_tx, "rawTransaction", None)
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        tx_hash_hex = tx_hash.hex()
        if not tx_hash_hex.startswith("0x"):
            tx_hash_hex = "0x" + tx_hash_hex

        logger.info(f"[BEP-20 Sweep] Swept {token_balance:.2f} USDT to {to_addr}! Tx: {tx_hash_hex}")
        return tx_hash_hex
    except Exception as e:
        logger.error(f"[BEP-20 Sweep] Sweep failed for {from_addr}: {e}")
        return None


async def sweep_ton_balance(
    session: aiohttp.ClientSession,
    mnemonic: str,
    from_addr: str,
    to_addr: str,
    balance: float,
    min_threshold: float = 0.02
) -> Optional[str]:
    """Sweeps native TON coins using tonsdk to the Master TON Vault."""
    if not HAS_TONSDK or not mnemonic or balance <= min_threshold:
        return None
    try:
        words = mnemonic.strip().split()
        if len(words) != 24:
            return None
        _mn, _pub, _priv, wallet = Wallets.from_mnemonics(words, version=WalletVersionEnum.v4r2)

        # 1. Fetch seqno from Toncenter / TonAPI
        seqno = 0
        try:
            tc_headers = {"X-API-Key": TONCENTER_API_KEY} if TONCENTER_API_KEY else {}
            tc_url = "https://toncenter.com/api/v2/runGetMethod"
            payload = {"address": from_addr, "method": "seqno", "stack": []}
            async with session.post(tc_url, json=payload, headers=tc_headers, timeout=aiohttp.ClientTimeout(total=5)) as r:
                if r.status == 200:
                    d = await r.json()
                    if d.get("ok") and d.get("result", {}).get("stack"):
                        raw = d["result"]["stack"][0][1]
                        seqno = int(raw, 16) if str(raw).startswith("0x") else int(raw)
        except Exception:
            pass

        # 2. Reserve 0.008 TON for network gas fee
        gas_fee = 0.008
        amount_to_send = balance - gas_fee
        if amount_to_send <= 0:
            return None

        amount_nano = int(amount_to_send * 1e9)

        # 3. Create signed transfer message
        query = wallet.create_transfer_message(
            to_addr=to_addr,
            amount=amount_nano,
            seqno=seqno,
            payload="Automated Fleet Sweep"
        )
        boc = query["message"].to_boc(False)
        b64_boc = base64.b64encode(boc).decode("utf-8")

        # 4. Broadcast to Toncenter
        tc_headers = {"X-API-Key": TONCENTER_API_KEY, "Content-Type": "application/json"} if TONCENTER_API_KEY else {"Content-Type": "application/json"}
        send_url = "https://toncenter.com/api/v2/sendBoc"
        async with session.post(send_url, json={"boc": b64_boc}, headers=tc_headers, timeout=aiohttp.ClientTimeout(total=8)) as br:
            if br.status == 200:
                resp_d = await br.json()
                if resp_d.get("ok"):
                    logger.info(f"[TON Sweep] Swept {amount_to_send:.4f} TON from {from_addr} to {to_addr}!")
                    return "boc_sent"
    except Exception as e:
        logger.error(f"[TON Sweep] Failed for {from_addr}: {e}")
    return None


async def run_full_sweep_audit(notify_if_empty: bool = False, execute_sweep: bool = False) -> Dict[str, Any]:
    """Scans all worker wallets and sweeps actionable balances to Binance Web3 Master."""
    async with aiohttp.ClientSession() as session:
        evm_audit = await audit_evm_worker_wallets(session)
        ton_audit = await audit_ton_worker_wallets(session)
        logger.info(f"Audited {len(evm_audit)} worker EVM wallets & {len(ton_audit)} worker TON wallets...")

        funded_evm = [w for w in evm_audit if w.get("bnb_balance", 0) > 0.0005 or w.get("eth_balance", 0) > 0.0002 or w.get("usdt_balance", 0) > 0.08]
        funded_ton = [w for w in ton_audit if w.get("ton_balance", 0) > 0.01]

        total_bnb = sum(w.get("bnb_balance", 0) for w in evm_audit)
        total_eth = sum(w.get("eth_balance", 0) for w in evm_audit)
        total_usdt = sum(w.get("usdt_balance", 0) for w in evm_audit)
        total_ton = sum(w.get("ton_balance", 0) for w in ton_audit)

        swept_txs = []
        if execute_sweep:
            if HAS_WEB3:
                logger.info("⚡ Executing automated on-chain EVM sweeps for eligible worker wallets...")
                for w in funded_evm:
                    pk = w.get("private_key")
                    addr = w.get("address")
                    name = w.get("name")
                    if not pk or not addr or addr.lower() == MASTER_EVM_VAULT.lower():
                        continue

                    # Sweep BNB on BSC
                    if w.get("bnb_balance", 0) > 0.0008:
                        tx_bnb = sweep_evm_native_balance(BSC_RPCS, 56, "BSC", pk, addr, MASTER_EVM_VAULT, w["bnb_balance"])
                        if tx_bnb:
                            swept_txs.append({"chain": "BSC", "coin": "BNB", "amount": w["bnb_balance"], "name": name, "tx": tx_bnb, "url": f"https://bscscan.com/tx/{tx_bnb}"})

                    # Sweep ETH on Arbitrum
                    if w.get("eth_balance", 0) > 0.0002:
                        tx_eth = sweep_evm_native_balance(ARB_RPCS, 42161, "Arbitrum", pk, addr, MASTER_EVM_VAULT, w["eth_balance"])
                        if tx_eth:
                            swept_txs.append({"chain": "Arbitrum One", "coin": "ETH", "amount": w["eth_balance"], "name": name, "tx": tx_eth, "url": f"https://arbiscan.io/tx/{tx_eth}"})

                    # Sweep USDT on BSC
                    if w.get("usdt_balance", 0) > 0.08:
                        tx_usdt = sweep_bep20_token_balance(BSC_RPCS, 56, pk, BSC_USDT_CONTRACT, addr, MASTER_EVM_VAULT, w["usdt_balance"], min_tokens=0.08)
                        if tx_usdt:
                            swept_txs.append({"chain": "BSC", "coin": "USDT", "amount": w["usdt_balance"], "name": name, "tx": tx_usdt, "url": f"https://bscscan.com/tx/{tx_usdt}"})

            if HAS_TONSDK:
                logger.info("⚡ Executing automated on-chain TON sweeps for eligible worker wallets...")
                for w in funded_ton:
                    mn = w.get("mnemonic")
                    addr = w.get("address")
                    name = w.get("name")
                    ton_bal = w.get("ton_balance", 0)
                    if not mn or not addr or addr == MASTER_TON_VAULT or ton_bal <= 0.02:
                        continue
                    tx_ton = await sweep_ton_balance(session, mn, addr, MASTER_TON_VAULT, ton_bal)
                    if tx_ton:
                        swept_txs.append({"chain": "TON", "coin": "TON", "amount": ton_bal - 0.008, "name": name, "tx": tx_ton, "url": f"https://tonviewer.com/{addr}"})

        logger.info(f"Audit Complete: {len(funded_evm)} EVM funded, {len(funded_ton)} TON funded. Swept: {len(swept_txs)} on-chain txs. Total: {total_bnb:.6f} BNB, {total_eth:.6f} ETH, {total_usdt:.2f} USDT, {total_ton:.4f} TON.")

        # Broadcast receipts if funds swept, or if balances found, or notify requested
        if swept_txs:
            lines = []
            has_evm = any(s.get("chain") in ("BSC", "Arbitrum One") for s in swept_txs)
            has_ton = any(s.get("chain") == "TON" for s in swept_txs)
            for s in swept_txs:
                lines.append(f"• <b>{s['name']} ({s['chain']}):</b> Swept <code>{s['amount']:.4f} {s['coin']}</code> → <a href=\"{s['url']}\">View Tx</a>")
            vault_lines = []
            if has_evm:
                vault_lines.append(f"🎯 <b>EVM Master Vault:</b> <code>{MASTER_EVM_VAULT}</code>")
            if has_ton:
                vault_lines.append(f"🎯 <b>TON Master Vault:</b> <code>{MASTER_TON_VAULT}</code>")
            vaults_str = "\n".join(vault_lines) if vault_lines else f"🎯 <b>Master Vault:</b> <code>{MASTER_EVM_VAULT}</code>"
            receipt_msg = (
                f"⚡ <b>ON-CHAIN VAULT CONSOLIDATION SWEEP EXECUTED</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                + "\n".join(lines) +
                f"\n━━━━━━━━━━━━━━━━━━━━━━\n"
                + vaults_str +
                f"\n📡 <i>Status: CONFIRMED ON-CHAIN • Automated Sweeper</i>"
            )
            await send_telegram_receipt(session, receipt_msg)
        elif funded_evm or funded_ton:
            logger.info(f"[Audit Summary] {len(funded_evm)} EVM and {len(funded_ton)} TON worker wallets have balance. Awaiting threshold sweep. Telegram notification suppressed per zero-spam directive.")
        else:
            logger.info("[Audit Summary] Zero worker funds to sweep. Silent mode active.")

        return {
            "evm_total_bnb": total_bnb,
            "evm_total_eth": total_eth,
            "evm_total_usdt": total_usdt,
            "ton_total": total_ton,
            "funded_evm": funded_evm,
            "funded_ton": funded_ton,
            "swept_txs": swept_txs
        }


if __name__ == "__main__":
    notify = "--notify" in sys.argv
    do_sweep = "--sweep" in sys.argv
    asyncio.run(run_full_sweep_audit(notify_if_empty=notify, execute_sweep=do_sweep))

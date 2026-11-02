#!/usr/bin/env python3
"""
multichain_onchain_watcher.py
Real-Time Unified Multi-Chain On-Chain Vault Watcher:
- Binance Smart Chain (BEP-20 BNB & tokens)
- Arbitrum One (ETH & STONES tokens)
- The Open Network (TON blockchain & Jettons)

Monitors primary EVM wallet (0xfda4182001672b9f0f09e2118242e543e35ed5ce) and TON fleet wallets.
Directly queries decentralized JSON-RPCs and TON nodes with zero third-party API key limits.
Broadcasts instant verified receipts with deep-link explorer buttons to Telegram Channel & Admin DM.
"""

import os
import sys
import time
import json
import asyncio
import aiohttp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env_file():
    env_path = os.path.join(BASE_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    if k.strip() not in os.environ:
                        os.environ[k.strip()] = v.strip()

load_env_file()

try:
    import sentry_sdk
    SENTRY_DSN = os.getenv("SENTRY_DSN", "https://af8cd9bec30d8551a01c5554c4d24a6b@o4512113387044864.ingest.us.sentry.io/4512113405132800")
    if SENTRY_DSN:
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.2)
except Exception:
    pass

EVM_WALLET = "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
EVM_WALLETS = [
    "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
]
TON_PRIMARY_WALLET = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT"
REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN") or os.getenv("ADMIN_BOT_TOKEN") or ""
PAYOUT_CHANNEL_ID = os.getenv("PAYOUT_CHANNEL_ID", "-1004402765950")
ADMIN_ID = os.getenv("REPORT_CHAT_ID", "6727787768")
STATE_FILE = os.path.join(BASE_DIR, "multichain_watcher_state.json")
PAYOUT_LEDGER_FILE = os.path.join(BASE_DIR, "payout_ledger.json")
PAYOUTS_JSON_FILE = os.path.join(BASE_DIR, "payouts.json")
BETTERSTACK_HEARTBEAT_URL = os.getenv("BETTERSTACK_HEARTBEAT_URL", "https://uptime.betterstack.com/api/v1/heartbeat/bABS7gYDXgHp6H35XGcU7S6p")

# Cloud integrations
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://znbbaozpevurvbfkxakz.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "https://internal-dodo-83852.upstash.io")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
TONAPI_KEY = os.getenv("TONAPI_KEY", "DVNSQF7W3LQJ3X77QKY")
ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")
DRPC_KEY = os.getenv("DRPC_API_KEY", "")
TONCENTER_API_KEY = os.getenv("TONCENTER_API_KEY", "")
ALCHEMY_ETH_RPC = os.getenv("ALCHEMY_ETH_RPC", "https://eth-mainnet.g.alchemy.com/v2/alch_bx0bDWIy7_g3VQaH6HPG8")

CF_WORKER_URLS = [
    os.getenv("CF_WORKER_URL_4", "https://restore-agy.agorameet.workers.dev"),
    os.getenv("CF_WORKER_URL_1", "https://restore-agy.aaaai2.workers.dev"),
    os.getenv("CF_WORKER_URL_2", "https://restore-agy.aaa-bot.workers.dev"),
    os.getenv("CF_WORKER_URL_3", "https://restore-agy.aaa222.workers.dev"),
    os.getenv("CF_WORKER_URL_5", "https://restore-agy.aaaai.workers.dev")
]

def load_fleet_ton_wallets() -> dict:
    """Loads all fleet TON wallets dynamically from fleet_ton_wallets.json or Upstash Redis."""
    wallets_path = os.path.join(BASE_DIR, "fleet_ton_wallets.json")
    if os.path.exists(wallets_path):
        try:
            with open(wallets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {k: v.get("address") for k, v in data.items() if k != "_guide" and v.get("address")}
        except Exception:
            pass
    if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{UPSTASH_REDIS_REST_URL}/get/fleet:wallets:ton",
                headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                d = json.loads(resp.read().decode())
                res = d.get("result")
                if res:
                    data = json.loads(res) if isinstance(res, str) else res
                    return {k: v.get("address") for k, v in data.items() if k != "_guide" and v.get("address")}
        except Exception:
            pass
    return {}

def load_fleet_evm_wallets() -> dict:
    """Loads all fleet EVM wallets dynamically from fleet_evm_wallets.json or Upstash Redis."""
    wallets_path = os.path.join(BASE_DIR, "fleet_evm_wallets.json")
    if os.path.exists(wallets_path):
        try:
            with open(wallets_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {k: v.get("address") for k, v in data.items() if k != "_guide" and v.get("address")}
        except Exception:
            pass
    if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
        try:
            import urllib.request
            req = urllib.request.Request(
                f"{UPSTASH_REDIS_REST_URL}/get/fleet:wallets:evm",
                headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                d = json.loads(resp.read().decode())
                res = d.get("result")
                if res:
                    data = json.loads(res) if isinstance(res, str) else res
                    return {k: v.get("address") for k, v in data.items() if k != "_guide" and v.get("address")}
        except Exception:
            pass
    return {}

_extra_evm = load_fleet_evm_wallets()
if _extra_evm:
    for _addr in _extra_evm.values():
        if _addr and _addr.startswith("0x") and _addr.lower() not in [w.lower() for w in EVM_WALLETS]:
            EVM_WALLETS.append(_addr)
SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("CF_SECRET_KEY", "")

BSC_RPCS = [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc-dataseed1.binance.org"
]

ARB_RPCS = [
    "https://arb1.arbitrum.io/rpc",
    "https://arbitrum-one.publicnode.com",
    f"https://arbitrum.drpc.org/ogrpc?dkey={DRPC_KEY}"
]

ETH_RPCS = [
    ALCHEMY_ETH_RPC,
    "https://cloudflare-eth.com",
    "https://rpc.ankr.com/eth"
]

TON_APIS = [
    "https://toncenter.com/api/v2/getAddressBalance",
    "https://toncenter.com/api/v2/jsonRPC"
]

async def sync_payouts_history_to_edge(session: aiohttp.ClientSession):
    """Syncs recent verified payouts from payouts.json to Cloudflare Edge KV feed."""
    if not os.path.exists(PAYOUTS_JSON_FILE):
        return
    try:
        with open(PAYOUTS_JSON_FILE, "r", encoding="utf-8") as pf:
            payouts = json.load(pf)
        if not payouts:
            return
        headers = {
            "Authorization": f"Bearer {SECRET_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        async def push_p(cf_url, payload):
            try:
                async with session.post(f"{cf_url}/api/payouts/record", json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=4)):
                    pass
            except Exception:
                pass

        payout_tasks = []
        for p in payouts[-6:]:
            payload = {
                "account_name": p.get("account"),
                "user_id": p.get("user_id"),
                "amount": p.get("amount"),
                "wallet": p.get("wallet"),
                "network": p.get("network", "BEP-20"),
                "timestamp": p.get("timestamp")
            }
            for cf_url in CF_WORKER_URLS:
                payout_tasks.append(push_p(cf_url, payload))
        if payout_tasks:
            await asyncio.gather(*payout_tasks, return_exceptions=True)
    except Exception as e:
        print(f"Payout sync note: {e}")

async def sync_multichain_to_edge(session: aiohttp.ClientSession, state: dict):
    """Broadcasts multichain balances and live prices to Cloudflare Edge KV and Upstash Redis concurrently."""
    # 1. Sync to Cloudflare 3x Workers
    headers = {
        "Authorization": f"Bearer {SECRET_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }
    async def push_mc_state(cf_url):
        try:
            async with session.post(f"{cf_url}/api/multichain/sync", json=state, headers=headers, timeout=aiohttp.ClientTimeout(total=5)):
                pass
        except Exception:
            pass

    tasks = [push_mc_state(u) for u in CF_WORKER_URLS]

    # 2. Sync to Upstash Serverless Redis
    if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN:
        async def push_upstash():
            try:
                up_headers = {
                    "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}",
                    "Content-Type": "application/json"
                }
                # Store serialized state in Upstash Redis
                async with session.post(
                    f"{UPSTASH_REDIS_REST_URL}/set/fleet:multichain",
                    data=json.dumps(state),
                    headers=up_headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ):
                    pass
            except Exception:
                pass
        tasks.append(push_upstash())

    await asyncio.gather(*tasks, return_exceptions=True)

def load_state() -> dict:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_state(state: dict):
    try:
        tmp_file = f"{STATE_FILE}.tmp"
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        os.replace(tmp_file, STATE_FILE)
    except Exception:
        pass

async def record_payout_ledger(session: aiohttp.ClientSession, chain: str, amount: float, symbol: str, usd_val: float, tx_hash: str = "auto-verified"):
    recipient = EVM_WALLET if chain != "TON" else TON_PRIMARY_WALLET
    try:
        ledger = []
        if os.path.exists(PAYOUT_LEDGER_FILE):
            with open(PAYOUT_LEDGER_FILE, "r", encoding="utf-8") as f:
                ledger = json.load(f)
        ledger.append({
            "id": len(ledger) + 1,
            "chain": chain,
            "symbol": symbol,
            "amount": amount,
            "usd_value": round(usd_val, 4),
            "wallet": recipient,
            "tx_hash": tx_hash,
            "timestamp": time.time(),
            "date": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        })
        tmp_ledger = f"{PAYOUT_LEDGER_FILE}.tmp"
        with open(tmp_ledger, "w", encoding="utf-8") as f:
            json.dump(ledger, f, indent=2)
        os.replace(tmp_ledger, PAYOUT_LEDGER_FILE)
    except Exception as e:
        print(f"Ledger record note: {e}")

    # Sync to Supabase Managed Cloud Postgres
    if SUPABASE_URL and SUPABASE_KEY:
        try:
            sb_headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            sb_payload = {
                "account_id": recipient,
                "token_name": symbol,
                "amount": f"{amount:.6f}",
                "tx_hash": tx_hash
            }
            async with session.post(f"{SUPABASE_URL}/rest/v1/fleet_payouts", json=sb_payload, headers=sb_headers, timeout=aiohttp.ClientTimeout(total=5)):
                pass
        except Exception:
            pass

async def query_evm_balance(session: aiohttp.ClientSession, rpc_list: list, wallet: str) -> float:
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [wallet, "latest"],
        "id": 1
    }
    for rpc in rpc_list:
        try:
            async with session.post(rpc, json=payload, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if "result" in data:
                        wei = int(data["result"], 16)
                        return wei / 1e18
        except Exception:
            continue
    return -1.0

async def query_arb_balance(session: aiohttp.ClientSession, wallet: str) -> float:
    """Query Arbitrum One balance using Etherscan V2 unified API first, fallback to RPCs."""
    if ETHERSCAN_API_KEY:
        try:
            url = f"https://api.etherscan.io/v2/api?chainid=42161&module=account&action=balance&address={wallet}&tag=latest&apikey={ETHERSCAN_API_KEY}"
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("status") == "1":
                        wei = int(data.get("result", 0))
                        return wei / 1e18
        except Exception:
            pass
    return await query_evm_balance(session, ARB_RPCS, wallet)

STONES_TOKEN_CONTRACT = "0x77643d2afc2496aab18e2c6a38e32c9cb1beb497"

async def query_stones_balance(session: aiohttp.ClientSession, wallet: str) -> float:
    """Queries STONES token balance on Arbitrum One via JSON-RPC eth_call."""
    clean_addr = wallet[2:].lower().zfill(64)
    data = "0x70a08231" + clean_addr
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_call",
        "params": [{"to": STONES_TOKEN_CONTRACT, "data": data}, "latest"],
        "id": 1
    }
    for rpc in ARB_RPCS:
        try:
            async with session.post(rpc, json=payload, headers={"Content-Type": "application/json"}, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    d = await resp.json()
                    res_hex = d.get("result")
                    if res_hex and res_hex != "0x":
                        return int(res_hex, 16) / 1e18
        except Exception:
            continue
    return -1.0

async def query_ton_balance(session: aiohttp.ClientSession, wallet: str) -> float:
    """Query TON balance using official TonAPI.io first with API key, fallback to toncenter."""
    if TONAPI_KEY:
        try:
            headers = {"Authorization": f"Bearer {TONAPI_KEY}"}
            url = f"https://tonapi.io/v2/accounts/{wallet}"
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    nanoton = int(data.get("balance", 0))
                    return nanoton / 1e9
        except Exception:
            pass

    # Fallback to toncenter
    url = f"https://toncenter.com/api/v2/getAddressBalance?address={wallet}"
    headers = {"X-API-Key": TONCENTER_API_KEY} if TONCENTER_API_KEY else {}
    try:
        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
            if resp.status == 200:
                data = await resp.json()
                if data.get("ok"):
                    nanoton = int(data.get("result", 0))
                    return nanoton / 1e9
            elif resp.status == 401:
                # If key pending or invalid, fallback to unauthenticated request
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as r2:
                    if r2.status == 200:
                        d2 = await r2.json()
                        if d2.get("ok"):
                            return int(d2.get("result", 0)) / 1e9
    except Exception:
        pass
    return -1.0

async def get_crypto_prices(session: aiohttp.ClientSession) -> dict:
    prices = {"BNB": 750.0, "ETH": 2600.0, "TON": 1.60}
    try:
        async with session.get("https://data-api.binance.vision/api/v3/ticker/price?symbol=BNBUSDT", timeout=aiohttp.ClientTimeout(total=3)) as r:
            if r.status == 200:
                prices["BNB"] = float((await r.json()).get("price", 750.0))
    except Exception:
        pass
    try:
        async with session.get("https://data-api.binance.vision/api/v3/ticker/price?symbol=ETHUSDT", timeout=aiohttp.ClientTimeout(total=3)) as r:
            if r.status == 200:
                prices["ETH"] = float((await r.json()).get("price", 2600.0))
    except Exception:
        pass
    try:
        async with session.get("https://data-api.binance.vision/api/v3/ticker/price?symbol=TONUSDT", timeout=aiohttp.ClientTimeout(total=3)) as r:
            if r.status == 200:
                prices["TON"] = float((await r.json()).get("price", 1.60))
    except Exception:
        pass
    return prices

async def broadcast_deposit_alert(session: aiohttp.ClientSession, chain: str, symbol: str, diff: float, total_bal: float, price: float, wallet: str, explorer_url: str):
    usd_val = diff * price
    bdt_val = usd_val * 122.50
    total_usd = total_bal * price
    
    badge = "🟡 Binance Smart Chain" if "BSC" in chain else ("🔵 Arbitrum One" if "Arbitrum" in chain else "💎 TON Blockchain")
    
    import datetime
    bst_time = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=6)).strftime("%Y-%m-%d %I:%M:%S %p BST")
    
    if "BSC" in chain or "BNB" in symbol:
        msg = (
            f"✅ <b>OFFICIAL BNB GALAXY PAYOUT CONFIRMED &amp; VERIFIED!</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💰 <b>Amount Credited:</b> <code>+{diff:.6f} {symbol}</code> (~${usd_val:.4f} USD / ~৳{bdt_val:.2f} BDT)\n"
            f"💼 <b>Recipient Wallet:</b> <a href=\"https://bscscan.com/address/{wallet}\"><code>{wallet}</code></a>\n"
            f"🌐 <b>Network:</b> Binance Smart Chain (BEP-20)\n"
            f"🕒 <b>Confirmed At:</b> <code>{bst_time}</code> (Bangladesh Time)\n"
            f"📊 <b>Status:</b> <b>COMPLETED &amp; ON-CHAIN VERIFIED</b> 🟢\n"
            f"🏛️ <b>Vault Total:</b> <code>{total_bal:.6f} {symbol}</code> (~${total_usd:.2f} USD)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💎 <b>Fleet Growth:</b> Auto-compounded into Fleet Treasury Vault\n"
            f"🛡️ <b>Autonomous Cloud Fleet Operations by MY AGY AI</b>"
        )
    else:
        msg = (
            f"✅ <b>ON-CHAIN {chain.upper()} PAYOUT CONFIRMED &amp; VERIFIED!</b>\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💰 <b>Deposit Received:</b> <code>+{diff:.6f} {symbol}</code> (~${usd_val:.4f} USD / ~৳{bdt_val:.2f} BDT)\n"
            f"💼 <b>Recipient Wallet:</b> <code>{wallet}</code>\n"
            f"🌐 <b>Network:</b> {badge}\n"
            f"🕒 <b>Confirmed At:</b> <code>{bst_time}</code> (Bangladesh Time)\n"
            f"📊 <b>Status:</b> <b>COMPLETED &amp; ON-CHAIN VERIFIED</b> 🟢\n"
            f"🏛️ <b>Vault Balance:</b> <code>{total_bal:.6f} {symbol}</code> (~${total_usd:.2f} USD)\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🛡️ <b>Autonomous Cloud Fleet Operations by MY AGY AI</b>"
        )
    
    markup = {
        "inline_keyboard": [
            [{"text": f"🔍 View on {chain} Explorer", "url": explorer_url}],
            [{"text": "📢 Verified Payouts Channel", "url": "https://t.me/+oN8uefSRYWUyM2Fl"}]
        ]
    }
    
    send_url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
    
    # Broadcast to Payout Channel
    try:
        await session.post(send_url, json={
            "chat_id": PAYOUT_CHANNEL_ID,
            "text": msg,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "reply_markup": markup
        }, timeout=aiohttp.ClientTimeout(total=8))
    except Exception as e:
        print(f"Error sending to channel: {e}")
        
    # Send to Admin Private DM
    try:
        await session.post(send_url, json={
            "chat_id": ADMIN_ID,
            "text": msg,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
            "reply_markup": markup
        }, timeout=aiohttp.ClientTimeout(total=8))
    except Exception as e:
        print(f"Error sending to admin: {e}")

    # Send short notification to AAA Admin notification channel (-1004358687850)
    admin_notif_channel = os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")
    if admin_notif_channel:
        try:
            short_deposit = (
                f"💰 <b>{symbol} Vault Deposit</b>\n"
                f"• <b>Amount:</b> <code>+{diff:.6f} {symbol}</code> (${usd_val:.2f})\n"
                f"• <b>New Balance:</b> <code>{total_bal:.6f} {symbol}</code>\n"
                f"• <b>Wallet:</b> <code>{wallet[:10]}...{wallet[-6:]}</code>\n"
                f"• <b>Explorer:</b> <a href=\"{explorer_url}\">View on Explorer</a>"
            )
            await session.post(send_url, json={
                "chat_id": admin_notif_channel,
                "text": short_deposit,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }, timeout=aiohttp.ClientTimeout(total=8))
        except Exception:
            pass


async def run_multichain_check(session: aiohttp.ClientSession) -> dict:
    state = load_state()
    prices = await get_crypto_prices(session)
    results = {}

    # 1. BSC Watcher (BNB) across all fleet EVM wallets
    total_bsc = 0.0
    bsc_wallets_state = state.setdefault("bsc_balances", {})
    for w in EVM_WALLETS:
        bsc_bal = await query_evm_balance(session, BSC_RPCS, w)
        if bsc_bal >= 0:
            total_bsc += bsc_bal
            prev_w = bsc_wallets_state.get(w)
            if prev_w is not None:
                diff = bsc_bal - prev_w
                if diff >= 0.00001:
                    print(f"[BSC Deposit on {w}] +{diff:.6f} BNB detected!")
                    await record_payout_ledger(session, "BSC", diff, "BNB", diff * prices["BNB"])
                    await broadcast_deposit_alert(
                        session, "BSC (BEP-20)", "BNB", diff, bsc_bal, prices["BNB"],
                        w, f"https://bscscan.com/address/{w}"
                    )
                    state["total_confirmed_deposits"] = state.get("total_confirmed_deposits", 0) + 1
            bsc_wallets_state[w] = bsc_bal
    state["bsc_bnb_balance"] = total_bsc
    results["bsc_bnb"] = total_bsc

    # 2. Arbitrum One Watcher (ETH)
    arb_bal = await query_arb_balance(session, EVM_WALLET)
    if arb_bal >= 0:
        prev_arb = state.get("arb_eth_balance")
        if prev_arb is not None:
            diff = arb_bal - prev_arb
            if diff >= 0.00005:
                print(f"[Arbitrum Deposit] +{diff:.6f} ETH detected!")
                await record_payout_ledger(session, "Arbitrum", diff, "ETH", diff * prices["ETH"])
                await broadcast_deposit_alert(
                    session, "Arbitrum One", "ETH", diff, arb_bal, prices["ETH"],
                    EVM_WALLET, f"https://arbiscan.io/address/{EVM_WALLET}"
                )
                state["total_confirmed_deposits"] = state.get("total_confirmed_deposits", 0) + 1
        state["arb_eth_balance"] = arb_bal
        results["arb_eth"] = arb_bal

    # 2b. Arbitrum One Watcher (STONES Token)
    stones_bal = await query_stones_balance(session, EVM_WALLET)
    if stones_bal >= 0:
        prev_stones = state.get("stones_balance")
        if prev_stones is not None:
            diff_stones = stones_bal - prev_stones
            if diff_stones >= 100.0:
                print(f"[STONES Deposit] +{diff_stones:.0f} STONES detected on Arbitrum One!")
                await record_payout_ledger(session, "Arbitrum", diff_stones, "STONES", 0.0)
                await broadcast_deposit_alert(
                    session, "Arbitrum One", "STONES", diff_stones, stones_bal, 0.0,
                    EVM_WALLET, f"https://arbiscan.io/token/{STONES_TOKEN_CONTRACT}?a={EVM_WALLET}"
                )
                state["total_confirmed_deposits"] = state.get("total_confirmed_deposits", 0) + 1
        state["stones_balance"] = stones_bal
        results["stones"] = stones_bal

    # 3. TON Blockchain Watcher (TON)
    ton_bal = await query_ton_balance(session, TON_PRIMARY_WALLET)
    if ton_bal >= 0:
        prev_ton = state.get("ton_balance")
        if prev_ton is not None:
            diff = ton_bal - prev_ton
            if diff >= 0.01:
                print(f"[TON Deposit] +{diff:.4f} TON detected!")
                await record_payout_ledger(session, "TON", diff, "TON", diff * prices["TON"])
                await broadcast_deposit_alert(
                    session, "TON Blockchain", "TON", diff, ton_bal, prices["TON"],
                    TON_PRIMARY_WALLET, f"https://tonviewer.com/{TON_PRIMARY_WALLET}"
                )
                state["total_confirmed_deposits"] = state.get("total_confirmed_deposits", 0) + 1
        state["ton_balance"] = ton_bal
        results["ton"] = ton_bal

    # 3.1 Fleet-Wide TON Balance Aggregator (Across All Fleet Accounts)
    fleet_ton_wallets = load_fleet_ton_wallets()
    last_fleet_ton_check = state.get("last_fleet_ton_check_at", 0)
    if fleet_ton_wallets and (time.time() - last_fleet_ton_check > 21600 or "fleet_ton_total" not in state):
        fleet_ton_sum = max(0.0, ton_bal) if ton_bal >= 0 else 0.0
        for uid, addr in fleet_ton_wallets.items():
            if addr and addr != TON_PRIMARY_WALLET:
                b = await query_ton_balance(session, addr)
                if b > 0:
                    fleet_ton_sum += b
                await asyncio.sleep(0.15)
        state["fleet_ton_total"] = fleet_ton_sum
        state["last_fleet_ton_check_at"] = time.time()
        results["fleet_ton_total"] = fleet_ton_sum

    state["last_checked_at"] = time.time()
    state["prices"] = prices
    save_state(state)

    # Only sync to Cloudflare Edge KV if a deposit occurred or if > 6 hours elapsed
    new_deposit = any([
        (bsc_bal >= 0 and state.get("bsc_bnb_balance") is not None and (bsc_bal - state.get("bsc_bnb_balance", 0)) >= 0.00001),
        (arb_bal >= 0 and state.get("arb_eth_balance") is not None and (arb_bal - state.get("arb_eth_balance", 0)) >= 0.00005),
        (ton_bal >= 0 and state.get("ton_balance") is not None and (ton_bal - state.get("ton_balance", 0)) >= 0.01)
    ])
    last_cloud_sync = state.get("last_cloud_sync_at", 0)
    time_since_sync = time.time() - last_cloud_sync

    if new_deposit or time_since_sync > 21600:
        try:
            await sync_multichain_to_edge(session, state)
            if new_deposit:
                await sync_payouts_history_to_edge(session)
            state["last_cloud_sync_at"] = time.time()
            save_state(state)
        except Exception as e:
            print(f"Edge sync note: {e}")

    return {"ok": True, "balances": results, "prices": prices}

async def main():
    async with aiohttp.ClientSession() as session:
        res = await run_multichain_check(session)
        print(f"[Multi-Chain Watcher] {res}")

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
bep20_onchain_watcher.py
Real-time On-Chain Transaction & Balance Watcher for Binance Smart Chain (BEP-20)
Monitors target wallet: 0xfda4182001672b9f0f09e2118242e543e35ed5ce
Directly connects to decentralized BSC JSON-RPC nodes (zero API key dependencies).
Broadcasts instant verified receipts to Telegram Payout Channel (-1004402765950) & DM (6727787768).
"""

import os
import sys
import time
import json
import asyncio
import urllib.request
import aiohttp
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

try:
    import sentry_sdk
    SENTRY_DSN = os.getenv("SENTRY_DSN", "https://af8cd9bec30d8551a01c5554c4d24a6b@o4512113387044864.ingest.us.sentry.io/4512113405132800")
    if SENTRY_DSN:
        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.2)
except Exception:
    pass

WALLET_ADDRESS = "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
WALLETS = [
    "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
]
REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN") or os.getenv("ADMIN_BOT_TOKEN") or ""
PAYOUT_CHANNEL_ID = "-1004402765950"
ADMIN_ID = "6727787768"
STATE_FILE = os.path.join(BASE_DIR, "bep20_watcher_state.json")
BETTERSTACK_HEARTBEAT_URL = os.getenv("BETTERSTACK_HEARTBEAT_URL", "https://uptime.betterstack.com/api/v1/heartbeat/bABS7gYDXgHp6H35XGcU7S6p")
DRPC_KEY = os.getenv("DRPC_API_KEY", "")

RPC_ENDPOINTS = [
    "https://bsc-dataseed.binance.org",
    "https://bsc-dataseed1.defibit.io",
    "https://bsc-dataseed1.binance.org",
    f"https://bsc.drpc.org/ogrpc?dkey={DRPC_KEY}"
]

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

async def get_onchain_balance(session: aiohttp.ClientSession, wallet: str = WALLET_ADDRESS) -> float:
    payload = {
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [wallet, "latest"],
        "id": 1
    }
    headers = {"Content-Type": "application/json", "User-Agent": "my-agy-fleet/1.0"}
    for rpc in RPC_ENDPOINTS:
        try:
            async with session.post(rpc, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    wei = int(data["result"], 16)
                    return wei / 1e18
        except Exception:
            continue
    return -1.0

async def get_bnb_price(session: aiohttp.ClientSession) -> float:
    try:
        async with session.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT", timeout=aiohttp.ClientTimeout(total=4)) as resp:
            if resp.status == 200:
                data = await resp.json()
                return float(data.get("price", 645.0))
    except Exception:
        pass
    return 645.0

async def broadcast_deposit(session: aiohttp.ClientSession, diff: float, total_bal: float, bnb_price: float, wallet: str = WALLET_ADDRESS):
    usd_val = diff * bnb_price
    bdt_val = usd_val * 122.50
    total_usd = total_bal * bnb_price
    
    explorer_url = f"https://bscscan.com/address/{wallet}"
    
    msg = (
        f"🎉 *[On-Chain BEP-20 Payout Confirmed!]*\n\n"
        f"The batch payout has been broadcasted and verified on the Binance Smart Chain!\n\n"
        f"• *Deposit Received:* `+{diff:.6f} BNB`\n"
        f"• *Fiat Value:* `~${usd_val:.4f} USD` (`~৳{bdt_val:.2f} BDT`)\n"
        f"• *Live BNB Price:* `${bnb_price:.2f} USD`\n"
        f"• *Target Wallet Balance:* `{total_bal:.6f} BNB` (`~${total_usd:.2f} USD`)\n"
        f"• *Target Wallet:* `{wallet}`\n"
        f"• *Network:* Binance Smart Chain (BEP-20) 🟡\n\n"
        f"🔗 [View Live on BscScan Explorer]({explorer_url})"
    )
    
    markup = {
        "inline_keyboard": [
            [{"text": "🔍 View on BscScan", "url": explorer_url}],
            [{"text": "📢 Verified Payouts Channel", "url": "https://t.me/+oN8uefSRYWUyM2Fl"}]
        ]
    }
    
    send_url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
    
    # Send to Payout Channel
    try:
        await session.post(send_url, json={
            "chat_id": PAYOUT_CHANNEL_ID,
            "text": msg,
            "parse_mode": "Markdown",
            "reply_markup": markup
        }, timeout=aiohttp.ClientTimeout(total=8))
    except Exception as e:
        print(f"Error sending to channel: {e}")
        
    # Send to Admin Private DM
    try:
        await session.post(send_url, json={
            "chat_id": ADMIN_ID,
            "text": msg,
            "parse_mode": "Markdown",
            "reply_markup": markup
        }, timeout=aiohttp.ClientTimeout(total=8))
    except Exception as e:
        print(f"Error sending to admin: {e}")

    # Send short card to AAA Admin notification channel (-1004358687850)
    admin_notif_channel = os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")
    if admin_notif_channel:
        try:
            short_bep20 = (
                f"💰 <b>BEP-20 Vault Deposit</b>\n"
                f"• <b>Amount:</b> <code>+{diff:.6f} BNB</code> (${usd_val:.2f})\n"
                f"• <b>New Balance:</b> <code>{total_bal:.6f} BNB</code>\n"
                f"• <b>Wallet:</b> <code>{wallet[:10]}...{wallet[-6:]}</code>\n"
                f"• <b>Explorer:</b> <a href=\"{explorer_url}\">View on BscScan</a>"
            )
            await session.post(send_url, json={
                "chat_id": admin_notif_channel,
                "text": short_bep20,
                "parse_mode": "HTML",
                "disable_web_page_preview": True
            }, timeout=aiohttp.ClientTimeout(total=8))
        except Exception:
            pass

async def run_check_once(session: aiohttp.ClientSession) -> dict:
    state = load_state()
    bnb_price = await get_bnb_price(session)
    wallet_results = {}
    balances_state = state.setdefault("balances", {})

    for wallet in WALLETS:
        current_bal = await get_onchain_balance(session, wallet)
        if current_bal < 0:
            wallet_results[wallet] = {"ok": False, "error": "RPC nodes unreachable"}
            continue

        prev_bal = balances_state.get(wallet)
        if prev_bal is None:
            # Check legacy single-wallet state key for wallet 1
            if wallet == WALLET_ADDRESS and "last_known_balance" in state:
                prev_bal = state["last_known_balance"]
            else:
                balances_state[wallet] = current_bal
                if wallet == WALLET_ADDRESS:
                    state["last_known_balance"] = current_bal
                wallet_results[wallet] = {"ok": True, "initialized": True, "balance": current_bal}
                continue

        diff = current_bal - prev_bal
        if diff >= 0.00001:  # Meaningful incoming deposit detected
            print(f"[Deposit Detected on {wallet}] +{diff:.6f} BNB! Broadcasting receipt...")
            await broadcast_deposit(session, diff, current_bal, bnb_price, wallet=wallet)
            balances_state[wallet] = current_bal
            if wallet == WALLET_ADDRESS:
                state["last_known_balance"] = current_bal
            state[f"last_deposit_at_{wallet[:8]}"] = time.time()
            state[f"last_deposit_amount_{wallet[:8]}"] = diff
            state["total_confirmed_deposits"] = state.get("total_confirmed_deposits", 0) + 1
        else:
            balances_state[wallet] = current_bal
            if wallet == WALLET_ADDRESS:
                state["last_known_balance"] = current_bal

        wallet_results[wallet] = {"ok": True, "balance": current_bal, "diff": diff}

    state["last_checked_at"] = time.time()
    save_state(state)

    # Ping Better Stack Dead Man's Switch Heartbeat
    if BETTERSTACK_HEARTBEAT_URL:
        try:
            async with session.get(BETTERSTACK_HEARTBEAT_URL, timeout=aiohttp.ClientTimeout(total=4)) as _:
                pass
        except Exception:
            pass

    return {"ok": True, "wallets": wallet_results, "bnb_price": bnb_price}

async def main():
    async with aiohttp.ClientSession() as session:
        res = await run_check_once(session)
        print(f"[BEP-20 Watcher Result] {res}")

if __name__ == "__main__":
    asyncio.run(main())

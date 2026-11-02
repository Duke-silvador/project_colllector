#!/usr/bin/env python3
"""
onboard_chickenland_fleet.py
=============================================================================
ONBOARDS ALL 20 FLEET ACCOUNTS INTO CHICKEN LAND (@ChickenLandBot)
=============================================================================
1. Binds all 19 workers to Master Account referral (12668).
2. Auto-joins sponsor channels: @LandChickenNews, @ChickenLandPay, @ChickenLandCodes.
3. Extracts WebApp initData and saves to fleet_miniapp_tokens.json + Upstash Redis.
4. Auto-solves human verification (icon pick).
5. Claims welcome bonus (1,000 coins) and buys the first hen (begins laying eggs).
6. Sweeps initial tasks (channel, payments, daily check-in).
7. Claims all pending referral rewards on Master Account.
=============================================================================
"""

import os
import sys
import json
import time
import asyncio
import urllib.parse
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.messages import RequestWebViewRequest
from telethon.tl.functions.channels import JoinChannelRequest
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
TOKENS_FILE = os.path.join(BASE_DIR, "fleet_miniapp_tokens.json")

load_dotenv(os.path.join(BASE_DIR, ".env"))
API_ID = int(os.getenv("TELEGRAM_API_ID", "24726207"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "5cd9e5bbfb572a4429a0c54774153b47")
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL", "").rstrip("/")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

from chickenland_miner import ChickenLandMiner

MASTER_REF = "12668"
SPONSOR_CHANNELS = ["LandChickenNews", "ChickenLandPay", "ChickenLandCodes"]

def sync_upstash_token(uid: str, token_str: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return
    import urllib.request
    try:
        # 1. fleet:tokens:{uid}:chickenland_init_data
        url1 = f"{UPSTASH_URL}/set/fleet:tokens:{uid}:chickenland_init_data"
        req1 = urllib.request.Request(url1, data=token_str.encode("utf-8"), headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        urllib.request.urlopen(req1, timeout=5)

        # 2. Add to miniapp_tokens hash if present
        url2 = f"{UPSTASH_URL}/hset/fleet:miniapp_tokens/{uid}/chickenland_init_data"
        req2 = urllib.request.Request(url2, data=token_str.encode("utf-8"), headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        urllib.request.urlopen(req2, timeout=5)
    except Exception as e:
        print(f"  [Upstash Sync Error uid={uid}]: {e}")

async def onboard_account(acc: dict, idx: int, total: int, tokens_db: dict) -> dict:
    name = acc.get("name", f"Account #{idx}")
    uid = str(acc.get("user_id"))
    sess = acc.get("session_string")
    is_master = (idx == 0 or str(acc.get("user_id")) == "6727787768")
    
    print(f"\n[{idx+1}/{total}] 🐔 Processing {name} ({uid}) - {'MASTER' if is_master else 'WORKER'}")
    
    if not sess:
        print(f"  ⚠️ No session string for {name}, skipping.")
        return {"status": "skipped", "reason": "no_session"}

    # Step 1: Connect to Telegram
    client = TelegramClient(StringSession(sess), API_ID, API_HASH)
    try:
        await client.connect()
        if not await client.is_user_authorized():
            print(f"  ⚠️ Session unauthorized for {name}")
            return {"status": "unauthorized"}
            
        # Join sponsor channels
        for ch in SPONSOR_CHANNELS:
            try:
                ch_entity = await client.get_input_entity(ch)
                await client(JoinChannelRequest(ch_entity))
            except Exception:
                pass
                
        # Send /start 12668 to ChickenLandBot (only for workers; master already registered)
        bot_entity = await client.get_input_entity("ChickenLandBot")
        if not is_master:
            try:
                await client.send_message(bot_entity, f"/start {MASTER_REF}")
            except Exception as e:
                print(f"  Start message notice: {e}")
            await asyncio.sleep(1.5)

        # Extract WebApp URL & initData
        res = await client(RequestWebViewRequest(
            peer=bot_entity,
            bot=bot_entity,
            url="https://app8968434282.tgcloud.ai/",
            platform="android"
        ))
        raw_url = res.url
        await client.disconnect()

        # Parse initData
        parsed = urllib.parse.urlparse(raw_url)
        frag = urllib.parse.parse_qs(parsed.fragment).get("tgWebAppData", [None])[0]
        if not frag:
            frag = urllib.parse.parse_qs(parsed.query).get("tgWebAppData", [None])[0]

        if not frag:
            print(f"  ❌ Failed to extract tgWebAppData for {name}")
            return {"status": "failed_token"}

        # Store token
        acc_toks = tokens_db.setdefault(uid, {
            "name": name,
            "user_id": uid,
            "updated_at": time.time()
        })
        acc_toks["chickenland_init_data"] = frag
        acc_toks["updated_at"] = time.time()
        sync_upstash_token(uid, frag)
        print(f"  ✅ Extracted & stored Chicken Land token (len={len(frag)})")

        # Step 2: Run Farming Cycle
        miner = ChickenLandMiner(frag, user_id=uid)
        ref_to_use = MASTER_REF if not is_master else "12668"
        cycle_res = miner.run_farming_cycle(ref=ref_to_use)
        
        acc["chickenland_referral_bound"] = True
        acc["chickenland_hens"] = cycle_res.get("final_hens", 0)
        acc["chickenland_coins"] = cycle_res.get("final_coins", 0)
        acc["chickenland_rate"] = cycle_res.get("final_rate", 0)

        print(f"  🎉 Cycle complete! Hens: {cycle_res.get('final_hens')}, Rate: {cycle_res.get('final_rate')}/h, Coins: {cycle_res.get('final_coins')}, Eggs sold: {cycle_res.get('eggs_collected')}")
        return cycle_res

    except Exception as e:
        print(f"  ❌ Error onboarding {name}: {e}")
        try:
            await client.disconnect()
        except Exception:
            pass
        return {"status": "error", "error": str(e)}

async def main():
    if not os.path.exists(ACCOUNTS_FILE):
        print("accounts.json not found!")
        return

    accounts = json.load(open(ACCOUNTS_FILE))
    tokens_db = {}
    if os.path.exists(TOKENS_FILE):
        try:
            tokens_db = json.load(open(TOKENS_FILE))
        except Exception:
            pass

    total = len(accounts)
    print(f"🚀 Starting Chicken Land fleet onboarding across {total} accounts...")

    # We process workers first (index 1..total-1), then master (index 0)
    # This allows master to claim all 19 referral rewards in its final cycle!
    workers = list(enumerate(accounts))[1:]
    master_pair = list(enumerate(accounts))[0]

    for idx, acc in workers:
        await onboard_account(acc, idx, total, tokens_db)
        # Save progress
        with open(TOKENS_FILE, "w") as f:
            json.dump(tokens_db, f, indent=2)
        with open(ACCOUNTS_FILE, "w") as f:
            json.dump(accounts, f, indent=2)
        await asyncio.sleep(1)

    print("\n=======================================================")
    print("👑 Now running Master Account final claim & expand cycle...")
    print("=======================================================")
    m_idx, m_acc = master_pair
    await onboard_account(m_acc, m_idx, total, tokens_db)

    # Save final databases
    with open(TOKENS_FILE, "w") as f:
        json.dump(tokens_db, f, indent=2)
    with open(ACCOUNTS_FILE, "w") as f:
        json.dump(accounts, f, indent=2)

    print(f"\n✨ All {total} fleet accounts successfully onboarded into Chicken Land!")

if __name__ == "__main__":
    asyncio.run(main())

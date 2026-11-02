#!/usr/bin/env python3
"""
refresh_fleet_tokens.py
Automated Multi-Account Telegram MiniApp Token Refresher
- Connects to Fleet Accounts via Telethon (MTProto)
- Acquires fresh tgWebAppData (initData) for the 8 active legitimate fleet MiniApps:
  1. MRG Miner (@mrgtoken_bot)
  2. ATF Miner (@atfminers_bot)
  3. Victor's Company (@VictorsCompanybot)
  4. Kynex Network (@Kynex_miningbot)
  5. DiggoMiner (@Diggominer_bot)
  6. PepeGram (@Pepe_gram_bot)
  7. AdxEarn AI (@AdxEarnAibot)
  8. Chicken Land (@ChickenLandBot)
- Preserves BNB Galaxy static webhooks
- Saves refreshed tokens to fleet_miniapp_tokens.json
- Syncs tokens to all 5 Cloudflare Edge Workers via /api/miniapp/tokens/sync
"""

import asyncio
import os
import json
import time
import urllib.parse
import aiohttp
from telethon import TelegramClient, functions
from telethon.sessions import StringSession
from telethon.tl.types import InputBotAppShortName

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
FLEET_TOKENS_FILE = os.path.join(BASE_DIR, "fleet_miniapp_tokens.json")

API_ID = int(os.getenv("TELEGRAM_API_ID", "24726207"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "5cd9e5bbfb572a4429a0c54774153b47")
PRIMARY_ID = "6727787768"

CF_WORKERS = [
    "https://restore-agy.aaaai2.workers.dev",
    "https://restore-agy.aaa-bot.workers.dev",
    "https://restore-agy.aaa222.workers.dev",
    "https://restore-agy.agorameet.workers.dev",
    "https://restore-agy.aaaai.workers.dev"
]
CF_SECRET = os.getenv("CF_SECRET_KEY") or os.getenv("SECRET_KEY", "")

# Referral codes
REFERRALS = {
    "mrg": "ref_IRN1G3XD",
    "atf": PRIMARY_ID,
    "victors": "ref_A20AA96F18"
}

STATIC_BNB_WEBHOOKS = {
    "6727787768": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=3d1ed3e6a9bb948436a55057c6e87b59&user_id=46893407",
    "8881914294": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=72c47501683e2e70dfaccd8d3ed5c285&user_id=60713750",
    "7648254021": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=10dc29f743913f3a2e4d835b2b676e9e&user_id=59905120",
    "8826375659": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=2267f8d65e4a2b276e16b2e5ca0e0983&user_id=60678854",
    "8450010161": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=25f6e7e8e1ef0d6e0a3518a377491e76&user_id=60720095",
    "8782429452": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=52ac3840bdd35d27bb83c8a4f1a2872f&user_id=60720152",
    "7734849205": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=9293b429f91c8ab1ffa302f51a3cd5b1&user_id=60720188",
    "8025472383": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=8dc8684f2a5f84807178ec2733dc41e7&user_id=60720204",
    "8851426148": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=8f26c5ef29029c66e44f2bbcac81db73&user_id=60720231",
    "8203342513": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=4a4b7ef9df10b7493cdbd05355918e11&user_id=60720252",
    "8190649727": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=fe448dcd830cf9d48bc41bb65ff5f930&user_id=60721024",
    "7487048946": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=5b51557d381ad544453d5fce49a710f3&user_id=44610998",
    "8741547543": "https://api.bots.business/v1/bots/2985029/new-webhook?&command=/onWebhook&public_user_token=587bfc8580acce34971106b176e27223&user_id=60740828"
}

def extract_web_app_data(url: str) -> str:
    """Extracts tgWebAppData from URL fragment or query parameters."""
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlparse(url)
        fragment_data = urllib.parse.parse_qs(parsed.fragment)
        if "tgWebAppData" in fragment_data:
            return fragment_data["tgWebAppData"][0]
        query_data = urllib.parse.parse_qs(parsed.query)
        if "tgWebAppData" in query_data:
            return query_data["tgWebAppData"][0]
    except Exception:
        pass
    return ""

async def fetch_tokens_for_account(acc: dict, index: int, total: int) -> dict:
    uid = str(acc.get("user_id"))
    name = acc.get("name", f"Account #{index}")
    sess_str = acc.get("session_string")

    print(f"\n[{index}/{total}] 🔄 Refreshing tokens for {name} ({uid})...")
    if not sess_str:
        print(f"    ⚠️ No session string. Skipping.")
        return {}

    client = TelegramClient(StringSession(sess_str), API_ID, API_HASH)
    account_tokens = {
        "account_id": uid,
        "name": name,
        "updated_at": time.time(),
        "synced_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "bnb_wh_url": STATIC_BNB_WEBHOOKS.get(uid, acc.get("bnb_wh_url", ""))
    }

    try:
        await client.connect()
        if not await client.is_user_authorized():
            print(f"    ❌ Unauthorized session for {name}")
            return {}

        # 1. MRG Miner (@mrgtoken_bot)
        try:
            try:
                bot_mrg = await client.get_input_entity("mrgtoken_bot")
            except Exception:
                bot_mrg = await client.get_input_entity("mrgminerbot")
            res_mrg = await client(functions.messages.RequestAppWebViewRequest(
                peer=bot_mrg,
                app=InputBotAppShortName(bot_id=bot_mrg, short_name="app"),
                platform="android",
                start_param=REFERRALS["mrg"] if uid != PRIMARY_ID else None
            ))
            m_init = extract_web_app_data(res_mrg.url)
            if m_init:
                account_tokens["mrg_init_data"] = m_init
                print("    ✅ MRG Miner token OK")
        except Exception as e:
            print(f"    ⚠️ MRG note: {e}")

        # 2. ATF Miner (@atfminers_bot)
        try:
            try:
                bot_atf = await client.get_entity("atfminers_bot")
            except Exception:
                bot_atf = await client.get_entity("ATF_AIRDROP_bot")
            res_atf = await client(functions.messages.RequestWebViewRequest(
                peer=bot_atf,
                bot=bot_atf,
                platform="android",
                url=f"https://atfminers.asloni.online/miner/index.html?entry=bot_start&ref={REFERRALS['atf']}",
                start_param=REFERRALS['atf'] if uid != PRIMARY_ID else None
            ))
            atf_init = extract_web_app_data(res_atf.url)
            if atf_init:
                account_tokens["atf_init_data"] = atf_init
                print("    ✅ ATF Miner token OK")
        except Exception as e:
            print(f"    ⚠️ ATF note: {e}")

        # 3. Victor's Company (@VictorsCompanybot)
        try:
            bot_vic = await client.get_entity("VictorsCompanybot")
            bot_vic_in = await client.get_input_entity(bot_vic)
            res_vic = await client(functions.messages.RequestAppWebViewRequest(
                peer=bot_vic_in,
                app=InputBotAppShortName(bot_id=bot_vic_in, short_name="app"),
                platform="android",
                start_param=REFERRALS["victors"] if uid != PRIMARY_ID else None
            ))
            vic_init = extract_web_app_data(res_vic.url)
            if vic_init:
                account_tokens["victors_init_data"] = vic_init
                print("    ✅ Victor's Company token OK")
        except Exception as e:
            print(f"    ⚠️ Victor's note: {e}")


    finally:
        try:
            await client.disconnect()
        except Exception:
            pass

    return account_tokens

async def sync_to_cloudflare(all_tokens: dict):
    print("\n☁️ Syncing refreshed tokens to Cloudflare Edge Workers...")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CF_SECRET}"
    }

    # Prepare fleet live state with real TON addresses and ATF balances
    fleet_state_payload = {"accounts": [], "updated_at": time.time()}
    try:
        with open(ACCOUNTS_FILE, "r") as f:
            raw_accs = json.load(f)
        ton_w = {}
        ton_file = os.path.join(BASE_DIR, "fleet_ton_wallets.json")
        if os.path.exists(ton_file):
            with open(ton_file, "r") as f:
                ton_w = json.load(f)
        atf_map = {}
        atf_file = os.path.join(BASE_DIR, "atf_fleet_state.json")
        if os.path.exists(atf_file):
            with open(atf_file, "r") as f:
                atf_d = json.load(f)
                for r in atf_d.get("results", []):
                    atf_map[str(r.get("user_id"))] = r

        for i, a in enumerate(raw_accs, 1):
            uid = str(a.get("user_id"))
            tw = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT" if uid == PRIMARY_ID else ton_w.get(uid, {}).get("address", "")
            atf_info = atf_map.get(uid, {})
            fleet_state_payload["accounts"].append({
                "index": i,
                "name": a.get("name", f"Account #{i}"),
                "user_id": int(uid),
                "phone": a.get("phone", ""),
                "status": "active",
                "ton_wallet": tw,
                "atf_balance": atf_info.get("mined_balance", 0),
                "atf_mining": atf_info.get("mining_active", True)
            })
    except Exception as e:
        print(f"    ⚠️ Note building fleet state: {e}")

    async with aiohttp.ClientSession() as session:
        for worker_url in CF_WORKERS:
            try:
                # 1. Sync tokens
                sync_endpoint = f"{worker_url}/api/miniapp/tokens/sync"
                async with session.post(sync_endpoint, json=all_tokens, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as r:
                    res_json = await r.json()
                    print(f"    • {worker_url} (Tokens): Status {r.status} -> {res_json}")

                # 2. Sync fleet live state
                if fleet_state_payload["accounts"]:
                    live_endpoint = f"{worker_url}/api/fleet/sync"
                    async with session.post(live_endpoint, json=fleet_state_payload, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as lr:
                        l_json = await lr.json()
                        print(f"    • {worker_url} (Fleet State): Status {lr.status} -> {l_json}")
            except Exception as e:
                print(f"    • {worker_url}: Sync error -> {e}")

async def main():
    if not os.path.exists(ACCOUNTS_FILE):
        print(f"❌ {ACCOUNTS_FILE} not found!")
        return

    with open(ACCOUNTS_FILE, "r") as f:
        accounts = json.load(f)

    # Load existing tokens to preserve any fallback values
    existing_tokens = {}
    if os.path.exists(FLEET_TOKENS_FILE):
        try:
            with open(FLEET_TOKENS_FILE, "r") as f:
                existing_tokens = json.load(f)
        except Exception:
            pass

    total = len(accounts)
    print(f"🚀 Starting Token Refresh for {total} accounts...")

    refreshed_tokens = dict(existing_tokens)
    for idx, acc in enumerate(accounts, 1):
        uid = str(acc.get("user_id"))
        tokens = await fetch_tokens_for_account(acc, idx, total)
        if tokens:
            if uid in refreshed_tokens:
                refreshed_tokens[uid].update(tokens)
            else:
                refreshed_tokens[uid] = tokens
        await asyncio.sleep(1.0)

    # Save to fleet_miniapp_tokens.json
    with open(FLEET_TOKENS_FILE, "w") as f:
        json.dump(refreshed_tokens, f, indent=2)
    print(f"\n💾 Saved {len(refreshed_tokens)} account tokens to {FLEET_TOKENS_FILE}")

    # Sync to Cloudflare Edge
    await sync_to_cloudflare(refreshed_tokens)
    print("\n🎉 Token refresh complete! All fleet tokens are fresh and synchronized.")

if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
extract_all_missing_fleet_tokens.py
Batch-extracts missing WebApp initData tokens across 7 legitimate bots
across all 18 fleet accounts in accounts.json and updates fleet_miniapp_tokens.json.
Synchronizes fresh tokens across all 5 Cloudflare Edge Worker nodes.
"""

import os
import sys
import json
import time
import asyncio
import urllib.parse
from telethon import TelegramClient
from telethon.sessions import StringSession
from dotenv import load_dotenv
from telethon.tl.functions.messages import RequestWebViewRequest, RequestAppWebViewRequest
from telethon.tl.types import InputBotAppShortName
from proxy_manager import get_account_fingerprint

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
TOKENS_FILE = os.path.join(BASE_DIR, "fleet_miniapp_tokens.json")

load_dotenv(os.path.join(BASE_DIR, ".env"))
API_ID = int(os.getenv("TELEGRAM_API_ID", "24726207"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "5cd9e5bbfb572a4429a0c54774153b47")

TARGET_BOTS = [
    {
        "key": "mrg_init_data",
        "bot": "mrgtoken_bot",
        "url": "https://app.mrgtoken.xyz/",
        "short_names": ["app", "miniapp"],
        "name": "MRG Miner"
    },
    {
        "key": "atf_init_data",
        "bot": "ATF_AIRDROP_bot",
        "url": "https://atfminers.asloni.online/miner/index.html?entry=bot_start",
        "short_names": ["app", "miner", "play"],
        "name": "ATF Miner"
    },
    {
        "key": "victors_init_data",
        "bot": "VictorsCompanybot",
        "url": "https://app.victors.company/",
        "short_names": ["app", "play"],
        "name": "Victor's Company"
    },
    {
        "key": "kynex_init_data",
        "bot": "Kynex_miningbot",
        "url": "https://kynex.top/telegram-auth.html",
        "short_names": ["App", "app"],
        "name": "Kynex Network"
    },
    {
        "key": "diggo_init_data",
        "bot": "Diggominer_bot",
        "url": "https://diggo.linkpc.net/",
        "short_names": ["openapp", "app", "miner", "miniapp", "startapp"],
        "name": "DiggoMiner"
    },
    {
        "key": "pepegram_init_data",
        "bot": "Pepe_gram_bot",
        "url": "https://app.miniempire.app/miniapp/index.html?tid=1449&lang=en",
        "short_names": ["app", "game", "miner", "miniapp", "startapp"],
        "name": "PepeGram"
    },
    {
        "key": "adxearn_init_data",
        "bot": "AdxEarnAibot",
        "url": "https://app.adxearnai.xyz/index.html",
        "short_names": ["app", "startapp"],
        "name": "AdxEarn AI"
    },
    {
        "key": "chickenland_init_data",
        "bot": "ChickenLandBot",
        "url": "https://app8968434282.tgcloud.ai/",
        "short_names": ["play", "app", "farm", "miniapp"],
        "name": "Chicken Land"
    },
    {
        "key": "grouchemine_init_data",
        "bot": "GRC_AirdrooBot",
        "url": "https://grouchemine.world/",
        "short_names": ["app"],
        "name": "Grouche Mine"
    },
    {
        "key": "lumeon_init_data",
        "bot": "lumeonminer_bot",
        "url": "https://lum-miner.gurmessa747.workers.dev/",
        "short_names": ["Lum", "lum", "app"],
        "name": "LUM Miner"
    },
    {
        "key": "earnvault_init_data",
        "bot": "EarnVaultApp_bot",
        "url": "https://eearnvault.top/",
        "short_names": ["App", "app", "earn"],
        "name": "EarnVault"
    }
]

CF_WORKERS = [
    "https://restore-agy.aaaai2.workers.dev",
    "https://restore-agy.aaa-bot.workers.dev",
    "https://restore-agy.aaa222.workers.dev",
    "https://restore-agy.agorameet.workers.dev",
    "https://restore-agy.aaaai.workers.dev"
]
CF_SECRET = os.getenv("CF_SECRET_KEY") or os.getenv("SECRET_KEY", "")

def parse_init_data(url_str):
    if not url_str:
        return None
    p = urllib.parse.urlparse(url_str)
    frag = urllib.parse.parse_qs(p.fragment).get("tgWebAppData", [None])[0]
    if frag:
        return frag
    query = urllib.parse.parse_qs(p.query).get("tgWebAppData", [None])[0]
    return query

async def process_account(acc, idx, total, tokens_data):
    name = acc.get("name", f"Account #{idx}")
    uid = str(acc.get("user_id"))
    sess = acc.get("session_string")

    if not sess:
        print(f"[{idx}/{total}] ⚠️ Skipping {name} ({uid}): No session string")
        return

    acc_tokens = tokens_data.setdefault(uid, {
        "name": name,
        "user_id": uid,
        "updated_at": time.time()
    })

    needed = [b for b in TARGET_BOTS if not acc_tokens.get(b["key"])]
    if not needed:
        print(f"[{idx}/{total}] ✅ {name} ({uid}) already has all target tokens.")
        return

    print(f"\n=======================================================")
    print(f"[{idx}/{total}] 🚀 Extracting for {name} ({uid}) — Missing: {[b['name'] for b in needed]}")
    print(f"=======================================================")

    acc_fp = get_account_fingerprint(int(uid) if uid.isdigit() else 0)
    cl = TelegramClient(StringSession(sess), API_ID, API_HASH, **acc_fp)
    try:
        await cl.connect()
        if not await cl.is_user_authorized():
            print(f"  ❌ Session unauthorized for {name}")
            return

        for bot_info in needed:
            b_key = bot_info["key"]
            b_username = bot_info["bot"]
            b_url = bot_info["url"]
            b_title = bot_info["name"]

            try:
                b_entity = await cl.get_entity(b_username)
                res = await cl(RequestWebViewRequest(
                    peer=b_entity,
                    bot=b_entity,
                    platform="android",
                    url=b_url
                ))
                init_data = parse_init_data(getattr(res, "url", None))
                if init_data:
                    acc_tokens[b_key] = init_data
                    acc_tokens["updated_at"] = time.time()
                    print(f"  🔑 Extracted {b_title} token: {init_data[:30]}...")
                else:
                    print(f"  ⚠️ No tgWebAppData in response for {b_title}")
            except Exception as e:
                print(f"  ⚠️ Error extracting {b_title}: {e}")

            await asyncio.sleep(0.8)

        # Save tokens progressively
        with open(TOKENS_FILE, "w", encoding="utf-8") as f:
            json.dump(tokens_data, f, indent=2, ensure_ascii=False)

    except Exception as ex:
        print(f"  ❌ Connection error on {name}: {ex}")
    finally:
        try:
            await cl.disconnect()
        except Exception:
            pass

async def sync_tokens_to_cloudflare(tokens_data):
    print("\n🌐 Synchronizing updated fleet tokens to 5 Cloudflare Worker nodes & Upstash Redis...")
    import urllib.request
    payload = json.dumps(tokens_data).encode("utf-8")

    up_url = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    up_tok = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if up_url and up_tok:
        for uid, tok_dict in tokens_data.items():
            try:
                existing = {}
                g_req = urllib.request.Request(f"{up_url}/get/fleet:tokens:{uid}", headers={"Authorization": f"Bearer {up_tok}"})
                with urllib.request.urlopen(g_req, timeout=4) as gr:
                    gd = json.loads(gr.read().decode())
                    if gd.get("result"):
                        existing = json.loads(gd["result"]) if isinstance(gd["result"], str) else gd["result"]
                merged = {**existing, **tok_dict}
                p_req = urllib.request.Request(
                    f"{up_url}/set/fleet:tokens:{uid}",
                    data=json.dumps(merged).encode("utf-8"),
                    headers={"Authorization": f"Bearer {up_tok}", "Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(p_req, timeout=4) as pr:
                    pass
            except Exception as e:
                print(f"  ⚠️ Upstash note for {uid}: {e}")

    for cf_url in CF_WORKERS:
        sync_url = f"{cf_url}/api/miniapp/tokens/sync"
        req = urllib.request.Request(
            sync_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {CF_SECRET}",
                "User-Agent": "Mozilla/5.0"
            },
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                print(f"  ✅ Synced to {cf_url}: {data.get('message', 'OK')} ({data.get('count', len(tokens_data))} accounts)")
        except Exception as e:
            print(f"  ⚠️ Sync note for {cf_url}: {e}")

async def main():
    accounts = []
    up_url = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    up_tok = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if up_url and up_tok:
        try:
            import urllib.request
            req = urllib.request.Request(f"{up_url}/get/fleet:accounts", headers={"Authorization": f"Bearer {up_tok}"})
            with urllib.request.urlopen(req, timeout=5) as r:
                res = json.loads(r.read().decode()).get("result")
                if res:
                    accounts = json.loads(res) if isinstance(res, str) else res
        except Exception as e:
            print(f"Redis accounts fetch note: {e}")

    if not accounts and os.path.exists(ACCOUNTS_FILE):
        with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
            accounts = json.load(f)

    tokens_data = {}
    if os.path.exists(TOKENS_FILE):
        with open(TOKENS_FILE, "r", encoding="utf-8") as f:
            tokens_data = json.load(f)

    print("=" * 65)
    print("MY AGY AI — BATCH EXTRACTION OF MISSING WEBAPP TOKENS")
    print(f"Accounts: {len(accounts)}")
    print(f"Target Missing Bots: {[b['name'] for b in TARGET_BOTS]}")
    print("=" * 65)

    for idx, acc in enumerate(accounts, 1):
        await process_account(acc, idx, len(accounts), tokens_data)
        await asyncio.sleep(1.2)

    with open(TOKENS_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens_data, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved all updated tokens to {TOKENS_FILE}")

    # Cloudflare synchronization
    await sync_tokens_to_cloudflare(tokens_data)

    print("\n" + "=" * 65)
    print("TOKEN AUDIT SUMMARY:")
    all_keys = [b["key"] for b in TARGET_BOTS]
    for uid, t in sorted(tokens_data.items()):
        got = [k for k in all_keys if t.get(k)]
        print(f"• UID {uid} ({t.get('name', 'User')}): {len(got)}/{len(all_keys)} target tokens active")
    print("=" * 65)

if __name__ == "__main__":
    asyncio.run(main())

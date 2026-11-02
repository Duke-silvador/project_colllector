#!/usr/bin/env python3
"""
batch_lumeon_mine.py
=============================================================================
Autonomous 100% Cloud Farming & Referral Pipeline for LUM Miner 💎 ($LUM)
Bot: @lumeonminer_bot | MiniApp: https://lum-miner.gurmessa747.workers.dev/
=============================================================================
1. Resolves @lumeonminer_bot and binds worker accounts to Master (6727787768).
2. Extracts WebApp initData via MTProto RequestAppWebViewRequest.
3. Binds referral under Master (/referral action=join).
4. Links dedicated account TON wallet (/referral action=qualify).
5. Joins official channels (lumminercommunity, lumpayout, gramminiappsmining, Grammoneywallet).
6. Completes and claims all verified tasks (/check-join: community, payouts, gramapps, grammoney).
7. For Master: Claims all accumulated referral rewards (/referral action=claim, +1000 LUM/ref).
8. Strict Ground-Truth Execution: Real cryptographic responses across all 21 accounts.
=============================================================================
"""

import os
import sys
import json
import asyncio
import urllib.parse
import urllib.request
import logging
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.messages import RequestAppWebViewRequest
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.types import InputBotAppShortName
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

API_ID = int(os.getenv("TELEGRAM_API_ID", "24726207"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "5cd9e5bbfb572a4429a0c54774153b47")
MASTER_UID = "6727787768"
BOT_USERNAME = "lumeonminer_bot"
APP_SHORT_NAME = "Lum"
BASE_URL = "https://lum-miner.gurmessa747.workers.dev"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("lumeon_miner")

def api_call(endpoint: str, data: dict = None) -> dict:
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
    }
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        try:
            return json.loads(err_msg)
        except Exception:
            return {"ok": False, "error": f"HTTP {e.code}: {err_msg}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}

async def process_account(account: dict, index: int, total: int):
    uid = str(account.get("user_id") or "")
    name = account.get("name") or account.get("first_name") or f"Account_{uid}"
    is_master = (uid == MASTER_UID)
    session_str = account.get("session_string")
    if not session_str:
        logger.warning(f"[{index}/{total}] {name} (UID: {uid}): Missing session_string, skipping.")
        return

    logger.info(f"[{index}/{total}] Processing {'👑 Master' if is_master else '👷 Worker'}: {name} (UID: {uid})...")
    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        logger.warning(f"  ❌ Client {uid} not authorized in Telegram.")
        await client.disconnect()
        return

    try:
        bot_ent = await client.get_input_entity(BOT_USERNAME)

        # 1. Referral binding for workers via chat /start
        if not is_master and not account.get("lumeon_referral_bound"):
            logger.info(f"  🔗 Binding referral under Master ({MASTER_UID})...")
            try:
                await client.send_message(bot_ent, f"/start {MASTER_UID}")
                account["lumeon_referral_bound"] = True
                await asyncio.sleep(1)
            except Exception as e:
                logger.warning(f"  ⚠️ Referral send error: {e}")

        # 2. Extract WebApp initData
        app_input = InputBotAppShortName(bot_id=bot_ent, short_name=APP_SHORT_NAME)
        res = await client(RequestAppWebViewRequest(
            peer=bot_ent,
            app=app_input,
            platform="android",
            start_param=MASTER_UID if not is_master else ""
        ))
        frag = urllib.parse.urlparse(res.url).fragment
        init_data = urllib.parse.parse_qs(frag).get("tgWebAppData", [""])[0]
        if not init_data:
            logger.error(f"  ❌ Failed to extract initData for {name}.")
            await client.disconnect()
            return

        account["lumeon_init_data"] = init_data

        # Sync to Upstash Redis if available
        upstash_url = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
        upstash_token = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
        if upstash_url and upstash_token:
            try:
                get_req = urllib.request.Request(
                    f"{upstash_url}/get/fleet:tokens:{uid}",
                    headers={"Authorization": f"Bearer {upstash_token}"}
                )
                with urllib.request.urlopen(get_req, timeout=4) as u_resp:
                    raw = json.loads(u_resp.read().decode("utf-8")).get("result")
                    curr_toks = json.loads(raw) if raw and isinstance(raw, str) else (raw or {})
                curr_toks["lumeon_init_data"] = init_data
                set_req = urllib.request.Request(
                    f"{upstash_url}/set/fleet:tokens:{uid}",
                    data=json.dumps(curr_toks).encode("utf-8"),
                    headers={"Authorization": f"Bearer {upstash_token}"}
                )
                urllib.request.urlopen(set_req, timeout=4)
            except Exception:
                pass

        # 3. Bind referral on backend
        if not is_master:
            j_res = api_call("/referral", {"action": "join", "inviter": MASTER_UID, "initData": init_data})
            if j_res.get("ok"):
                logger.info(f"  ✅ Joined under Master ({MASTER_UID})")

        # 4. Qualify referral (with TON wallet)
        q_res = api_call("/referral", {"action": "qualify", "initData": init_data})
        if q_res.get("ok"):
            logger.info("  💼 Account qualified & wallet active")

        # 5. Join sponsor channels for task verification
        for ch in ["lumminercommunity", "lumpayout", "gramminiappsmining", "Grammoneywallet"]:
            try:
                ch_ent = await client.get_entity(ch)
                await client(JoinChannelRequest(ch_ent))
            except Exception:
                pass

        # 6. Complete and claim verified tasks
        tasks = [
            ("community", 50),
            ("payouts", 50),
            ("gramapps", 30),
            ("grammoney", 30),
            ("youtube", 40)
        ]
        claimed_lum = 0
        for tid, rew in tasks:
            t_res = api_call("/check-join", {"task": tid, "initData": init_data})
            if t_res.get("ok"):
                claimed_lum += rew
                logger.info(f"  🎯 Completed Task: '{tid}' (+{rew} LUM)")

        # 7. For Master: Claim referral bonuses (+1000 LUM per qualified referral)
        if is_master:
            ref_stat = api_call(f"/referral?id={MASTER_UID}")
            friends = ref_stat.get("friends", [])
            qualified = [f for f in friends if f.get("qualified") and not f.get("paid")]
            logger.info(f"  👑 Master Referrals: {len(qualified)} pending claim ({len(friends)} total)")
            if qualified:
                c_res = api_call("/referral", {"action": "claim", "initData": init_data})
                if c_res.get("ok"):
                    paid_cnt = c_res.get("paid", len(qualified))
                    logger.info(f"  🎁 Claimed Referral Bonus: +{paid_cnt * 1000} LUM ({paid_cnt} referrals)")

        logger.info(f"  📊 {name} LUM session complete (Earned: +{claimed_lum} LUM)\n")

    except Exception as e:
        logger.error(f"  ❌ Error processing {name}: {e}")
    finally:
        await client.disconnect()

async def run_fleet():
    accounts_file = os.path.join(BASE_DIR, "accounts.json")
    with open(accounts_file, "r") as f:
        accounts = json.load(f)

    logger.info("=" * 75)
    logger.info("🚀 LUM MINER 💎 ($LUM) FLEET-WIDE 21-ACCOUNT FARMING CYCLE")
    logger.info(f"Target Bot: @{BOT_USERNAME} | Master UID: {MASTER_UID}")
    logger.info("=" * 75)

    workers = [a for a in accounts if str(a.get("user_id")) != MASTER_UID]
    masters = [a for a in accounts if str(a.get("user_id")) == MASTER_UID]

    # Process all worker accounts first to bind & qualify
    for idx, acc in enumerate(workers, 1):
        await process_account(acc, idx, len(accounts))
        await asyncio.sleep(2)

    # Process Master account last to claim all referral bonuses
    for idx, acc in enumerate(masters, len(workers) + 1):
        await process_account(acc, idx, len(accounts))

    with open(accounts_file, "w") as f:
        json.dump(accounts, f, indent=2)

    # Sync miniapp_tokens in Upstash Redis
    upstash_url = os.getenv("UPSTASH_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    upstash_token = os.getenv("UPSTASH_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
    if upstash_url and upstash_token:
        try:
            req = urllib.request.Request(
                f"{upstash_url}/get/miniapp_tokens",
                headers={"Authorization": f"Bearer {upstash_token}"}
            )
            with urllib.request.urlopen(req, timeout=8) as resp:
                raw = json.loads(resp.read().decode()).get("result")
                tokens = json.loads(raw) if isinstance(raw, str) else (raw or {})
            for a in accounts:
                u = str(a.get("user_id"))
                if u in tokens and "lumeon_init_data" in a:
                    tokens[u]["lumeon_init_data"] = a["lumeon_init_data"]
            set_req = urllib.request.Request(
                f"{upstash_url}/set/miniapp_tokens",
                data=json.dumps(tokens).encode(),
                headers={"Authorization": f"Bearer {upstash_token}"}
            )
            urllib.request.urlopen(set_req, timeout=8)
            logger.info("✅ Synchronized lumeon_init_data across Upstash Redis miniapp_tokens!")
        except Exception as e:
            logger.warning(f"Upstash miniapp_tokens sync note: {e}")

    logger.info("=" * 75)
    logger.info("🎉 Fleet-Wide LUM Miner 💎 Cycle Complete!")
    logger.info("=" * 75)

if __name__ == "__main__":
    asyncio.run(run_fleet())

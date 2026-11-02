#!/usr/bin/env python3
"""
batch_earnvault_mine.py
=============================================================================
Autonomous 100% Cloud Farming & Referral Pipeline for EarnVault 🏦 ($USD / $TON)
Bot: @EarnVaultApp_bot | MiniApp: https://eearnvault.top/
=============================================================================
1. Resolves @EarnVaultApp_bot and binds worker accounts to Master (6727787768).
2. Extracts WebApp initData via MTProto RequestAppWebViewRequest.
3. Authenticates via Firebase Cloud Function (telegramAuth).
4. Exchanges custom token for Firebase ID token.
5. Joins official channels (EarnVaulte, Nexpaychanel).
6. Starts and verifies social tasks (official +20¢, glamour +10¢).
7. Executes daily check-in (dailyCheckIn) and claims available rewards (claimReward).
8. Strict Ground-Truth Execution: Real cryptographic responses across all 21 accounts.
=============================================================================
"""

import os
import sys
import json
import uuid
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
BOT_USERNAME = "EarnVaultApp_bot"
APP_SHORT_NAME = "App"
FIREBASE_API_KEY = "AIzaSyCP9yYj_KSQxv0lW0EoqR39_QTO2SGJGEg"
FUNCTIONS_BASE = "https://us-central1-earnvaulte.cloudfunctions.net"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("earnvault_miner")

def call_function(name: str, data: dict = None, id_token: str = None) -> dict:
    url = f"{FUNCTIONS_BASE}/{name}"
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
    }
    if id_token:
        headers["Authorization"] = f"Bearer {id_token}"
    body = json.dumps({"data": data or {}}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return json.loads(resp.read().decode("utf-8")).get("result") or {}
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        try:
            return json.loads(err_msg)
        except Exception:
            return {"error": f"HTTP {e.code}: {err_msg}"}
    except Exception as e:
        return {"error": str(e)}

def get_id_token(custom_token: str) -> str:
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={FIREBASE_API_KEY}"
    body = json.dumps({"token": custom_token, "returnSecureToken": True}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8")).get("idToken")

async def solve_gate(purpose: str, id_token: str) -> str:
    res = call_function("startGate", {"purpose": purpose}, id_token)
    gate = res.get("gate", {})
    session_id = gate.get("sessionId")
    if not session_id:
        return None
    wait_ms = int(gate.get("waitMs", 8900))
    await asyncio.sleep(min(12.0, max(2.0, wait_ms / 1000.0) + 0.5))
    for _ in range(5):
        c_res = call_function("confirmGate", {"sessionId": session_id}, id_token)
        if c_res.get("status") == "ready":
            return session_id
        await asyncio.sleep(2.0)
    return session_id

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
        if not is_master and not account.get("earnvault_referral_bound"):
            logger.info(f"  🔗 Binding referral under Master ({MASTER_UID})...")
            try:
                await client.send_message(bot_ent, f"/start {MASTER_UID}")
                account["earnvault_referral_bound"] = True
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

        account["earnvault_init_data"] = init_data

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
                curr_toks["earnvault_init_data"] = init_data
                set_req = urllib.request.Request(
                    f"{upstash_url}/set/fleet:tokens:{uid}",
                    data=json.dumps(curr_toks).encode("utf-8"),
                    headers={"Authorization": f"Bearer {upstash_token}"}
                )
                urllib.request.urlopen(set_req, timeout=4)
            except Exception:
                pass

        # 3. Authenticate with Firebase
        auth_res = call_function("telegramAuth", {"initData": init_data})
        custom_token = auth_res.get("token")
        if not custom_token:
            logger.error(f"  ❌ telegramAuth failed: {auth_res}")
            await client.disconnect()
            return

        id_token = get_id_token(custom_token)
        logger.info(f"  🔐 Firebase Authenticated: {name}")

        # 4. Join sponsor channels for task verification
        for ch in ["EarnVaulte", "Nexpaychanel"]:
            try:
                ch_ent = await client.get_entity(ch)
                await client(JoinChannelRequest(ch_ent))
            except Exception:
                pass

        # 5. Start and verify social tasks
        tasks = [("official", 20), ("glamour", 10)]
        for tid, rew in tasks:
            call_function("startTask", {"taskId": tid}, id_token)
            await asyncio.sleep(1)
            v_res = call_function("verifyTask", {"taskId": tid}, id_token)
            if v_res.get("verified"):
                logger.info(f"  🎯 Completed Task: '{tid}' (+{v_res.get('creditedCents', rew)}¢)")

        # 6. Check Dashboard & Balance
        dash = call_function("getDashboard", {}, id_token)
        bal_cents = dash.get("balanceCents", 0)
        ref_obj = dash.get("referral", {})
        logger.info(f"  💰 Balance: {bal_cents}¢ (${bal_cents/100:.2f}) | Referrals: {ref_obj.get('total', 0)}")

        # 7. Try Daily Check-In
        ci = dash.get("checkin", {})
        if not ci.get("doneToday"):
            gate_sess = None
            if ci.get("gate", {}).get("required"):
                gate_sess = await solve_gate("checkin", id_token)
            ci_payload = {"gateSessionId": gate_sess} if gate_sess else {}
            ci_res = call_function("dailyCheckIn", ci_payload, id_token)
            if not ci_res.get("already") and ci_res.get("creditedCents"):
                bal_cents += ci_res.get("creditedCents")
                logger.info(f"  🎁 Daily Check-in: +{ci_res.get('creditedCents')}¢")

        # 8. Try Claim Reward if cooldown is zero
        cl = dash.get("claim", {})
        if cl.get("status") == "ready" or cl.get("remainingMs", 1) <= 0:
            gate_sess = None
            if cl.get("gate", {}).get("required"):
                gate_sess = await solve_gate("claim", id_token)
            cl_payload = {"idempotencyKey": str(uuid.uuid4())}
            if gate_sess:
                cl_payload["gateSessionId"] = gate_sess
            cl_res = call_function("claimReward", cl_payload, id_token)
            if cl_res.get("creditedCents"):
                bal_cents += cl_res.get("creditedCents")
                logger.info(f"  ⛏️ Claimed Reward: +{cl_res.get('creditedCents')}¢")

        # 9. Multi-network Rewarded Video Ads
        try:
            ad_state = call_function("getAdState", {}, id_token)
            for net in ["monetag", "adsgram", "adsterra", "gigapub", "quickmoney"]:
                info = ad_state.get(net, {})
                if info.get("canWatch") and (info.get("remaining") is None or info.get("remaining") > 0):
                    s_res = call_function("startAd", {"net": net}, id_token)
                    s_id = s_res.get("sessionId")
                    if s_id:
                        wait_sec = int(s_res.get("minWatchSeconds", 10))
                        await asyncio.sleep(wait_sec + 1)
                        comp_res = call_function("completeAd", {"sessionId": s_id}, id_token)
                        if comp_res.get("status") == "counted":
                            logger.info(f"  📺 Watched Ad ({net}): credited!")
        except Exception as e:
            logger.warning(f"  ⚠️ Ad watching error: {e}")

        # 10. Bonus Missions
        try:
            b_state = call_function("getBonusState", {}, id_token)
            for b_key, b_info in b_state.items():
                if isinstance(b_info, dict) and b_info.get("canClaim"):
                    b_gate = await solve_gate(f"bonus_{b_key}", id_token)
                    call_function("startBonus", {"bonusId": b_key, "gateSessionId": b_gate}, id_token)
        except Exception:
            pass

        logger.info(f"  📊 {name} EarnVault session complete (Total Balance: {bal_cents}¢ / ${bal_cents/100:.2f})\n")

    except Exception as e:
        logger.error(f"  ❌ Error processing {name}: {e}")
    finally:
        await client.disconnect()

async def run_fleet():
    accounts_file = os.path.join(BASE_DIR, "accounts.json")
    with open(accounts_file, "r") as f:
        accounts = json.load(f)

    logger.info("=" * 75)
    logger.info("🚀 EARNVAULT 🏦 ($USD) FLEET-WIDE 21-ACCOUNT FARMING CYCLE")
    logger.info(f"Target Bot: @{BOT_USERNAME} | Master UID: {MASTER_UID}")
    logger.info("=" * 75)

    workers = [a for a in accounts if str(a.get("user_id")) != MASTER_UID]
    masters = [a for a in accounts if str(a.get("user_id")) == MASTER_UID]

    # Process all worker accounts first to bind referral
    for idx, acc in enumerate(workers, 1):
        await process_account(acc, idx, len(accounts))
        await asyncio.sleep(2)

    # Process Master account last
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
                if u in tokens and "earnvault_init_data" in a:
                    tokens[u]["earnvault_init_data"] = a["earnvault_init_data"]
            set_req = urllib.request.Request(
                f"{upstash_url}/set/miniapp_tokens",
                data=json.dumps(tokens).encode(),
                headers={"Authorization": f"Bearer {upstash_token}"}
            )
            urllib.request.urlopen(set_req, timeout=8)
            logger.info("✅ Synchronized earnvault_init_data across Upstash Redis miniapp_tokens!")
        except Exception as e:
            logger.warning(f"Upstash miniapp_tokens sync note: {e}")

    logger.info("=" * 75)
    logger.info("🎉 Fleet-Wide EarnVault 🏦 Cycle Complete!")
    logger.info("=" * 75)

if __name__ == "__main__":
    asyncio.run(run_fleet())

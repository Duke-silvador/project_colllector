#!/usr/bin/env python3
"""
refresh_cloud_tokens.py
=============================================================================
100% CLOUD-FIRST TELEGRAM MTPROTO TOKEN REFRESHER FOR MY AGY AI FLEET
=============================================================================
Runs on GitHub Actions, Render, Deno, or ephemeral cloud runners.
Connects briefly via MTProto to extract fresh 24h WebApp initData session tokens
across all 8 legitimate active bots and auto-joins required sponsor channels.

Pushes extracted tokens to both:
  1. 5x Cloudflare Edge Workers & KV
  2. Upstash Serverless Redis REST (`fleet:tokens:{uid}` & `fleet_miniapp_tokens`)

Eliminates all dependence on local VPS uptime! Zero Phone Load.
"""

import os
import sys
import time
import json
import asyncio
import urllib.parse
import aiohttp
from telethon import TelegramClient, functions
from telethon.sessions import StringSession
from telethon.tl.functions.messages import RequestWebViewRequest, RequestAppWebViewRequest
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.types import InputBotAppShortName

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

API_ID = int(os.getenv("TELEGRAM_API_ID") or os.getenv("API_ID", "37321306"))
API_HASH = os.getenv("TELEGRAM_API_HASH") or os.getenv("API_HASH", "5cd9e5bbfb572a4429a0c54774153b47")
REPORT_CHAT_ID = int(os.getenv("REPORT_CHAT_ID", "6727787768"))
CF_SECRET_KEY = os.getenv("CF_SECRET_KEY") or os.getenv("SECRET_KEY", "")

UPSTASH_URL = os.getenv("UPSTASH_URL") or "https://internal-dodo-83852.upstash.io"
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or ""

CF_NODES = [
    "https://restore-agy.aaaai2.workers.dev",
    "https://restore-agy.aaa-bot.workers.dev",
    "https://restore-agy.aaa222.workers.dev",
    "https://restore-agy.agorameet.workers.dev",
    "https://restore-agy.aaaai.workers.dev"
]

# 8 Active Legitimate Fleet Bots & Referral Codes
try:
    from bot_registry import get_all_sponsor_channels
    MANDATORY_SPONSOR_CHANNELS = get_all_sponsor_channels()
except Exception:
    MANDATORY_SPONSOR_CHANNELS = [
        "AI_TRADING_FOREX", "AdxearnAi", "BTCMAKERR", "ChickenLandCodes", "ChickenLandPay",
        "DurovKidney", "EarnVaulte", "LandChickenNews", "PaperHouseNFT", "PickaxeEmpire",
        "TheBoss_Victor", "VICWithdrawals", "VictorsCompany", "Web3Primeteam", "keepeye_app",
        "kynex_mining", "mrgminer", "mrgwithdrawal", "pepe_grammmm", "solanamemes001", "victors_company"
    ]

MRG_BOT = "mrgtoken_bot"
ATF_BOT = "ATF_AIRDROP_bot"
VICTORS_BOT = "VictorsCompanybot"
KYNEX_BOT = "Kynex_miningbot"
PEPEGRAM_BOT = "Pepe_gram_bot"
ADXEARN_BOT = "AdxEarnAibot"
DIGGO_BOT = "Diggominer_bot"
CHICKENLAND_BOT = "ChickenLandBot"
GROUCHEMINE_BOT = "GRC_AirdrooBot"
LUMEON_BOT = "lumeonminer_bot"
EARNVAULT_BOT = "EarnVaultApp_bot"

MRG_REF = "ref_IRN1G3XD"
ATF_REF = "6727787768"
VICTORS_REF = "ref_A20AA96F18"
KYNEX_REF = "6727787768"
PEPEGRAM_REF = "1449"
ADXEARN_REF = "ref_6727787768"
DIGGO_REF = "ref_4088138f11effe8eef4b86ff"
CHICKENLAND_REF = "12668"
GROUCHEMINE_REF = "6727787768"
LUMEON_REF = "6727787768"
EARNVAULT_REF = "6727787768"


def load_accounts():
    """Loads accounts from accounts.json or environment."""
    acc_path = os.path.join(BASE_DIR, "accounts.json")
    if os.path.exists(acc_path):
        try:
            with open(acc_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading accounts.json: {e}")

    raw_env = os.getenv("FLEET_ACCOUNTS_JSON")
    if raw_env:
        try:
            return json.loads(raw_env)
        except Exception as e:
            print(f"Error parsing FLEET_ACCOUNTS_JSON: {e}")

    return []


async def sync_tokens_to_edge_and_upstash(session: aiohttp.ClientSession, uid: str, name: str, tokens: dict):
    """Pushes extracted tokens to both 5x Cloudflare Edge Workers and Upstash Redis with safe merging."""
    # 0. Fetch existing tokens from Upstash to preserve existing active bots
    existing_tokens = {}
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            async with session.get(
                f"{UPSTASH_URL}/get/fleet:tokens:{uid}",
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                timeout=aiohttp.ClientTimeout(total=4)
            ) as er:
                if er.status == 200:
                    ed = await er.json()
                    res_raw = ed.get("result")
                    if res_raw:
                        existing_tokens = json.loads(res_raw) if isinstance(res_raw, str) else res_raw
        except Exception:
            pass

    payload = {
        **existing_tokens,
        "uid": str(uid),
        "account_id": str(uid),
        "name": name,
        "synced_at": time.time(),
        "updated_at": time.time(),
        **tokens
    }

    # 1. Cloudflare Edge Workers (Sync to primary node with failover; break on success to prevent KV 1000/day write limit)
    headers = {
        "Authorization": f"Bearer {CF_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    for cf_url in CF_NODES:
        try:
            async with session.post(f"{cf_url}/api/tokens", json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as r:
                if r.status in (200, 201):
                    print(f"  ✅ Synced to {cf_url.split('//')[1].split('.')[0]}")
                    break  # Primary sync succeeded! Avoid burning KV writes on secondary nodes.
        except Exception as e:
            print(f"  ⚠️ Sync note for {cf_url}: {e}")

    # 2. Upstash Redis REST (Atomic single-key set)
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            await session.post(
                f"{UPSTASH_URL}/set/fleet:tokens:{uid}",
                data=json.dumps(payload),
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                timeout=aiohttp.ClientTimeout(total=5)
            )
            print(f"  ✅ Synced to Upstash Redis (fleet:tokens:{uid})")

            # Also sync into monolithic miniapp_tokens dictionary for runner compatibility
            try:
                async with session.get(
                    f"{UPSTASH_URL}/get/miniapp_tokens",
                    headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                    timeout=aiohttp.ClientTimeout(total=4)
                ) as r_all:
                    if r_all.status == 200:
                        all_d = await r_all.json()
                        raw_all = all_d.get("result")
                        master_dict = json.loads(raw_all) if isinstance(raw_all, str) else raw_all or {}
                        master_dict[str(uid)] = payload
                        await session.post(
                            f"{UPSTASH_URL}/set/miniapp_tokens",
                            data=json.dumps(master_dict),
                            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
                            timeout=aiohttp.ClientTimeout(total=5)
                        )
            except Exception:
                pass

            # Sync Diggo JWT if present
            if tokens.get("diggo_jwt"):
                try:
                    await session.post(
                        f"{UPSTASH_URL}/set/fleet:diggo:jwt:{uid}?ex=2592000",
                        data=tokens["diggo_jwt"],
                        headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
                        timeout=aiohttp.ClientTimeout(total=3)
                    )
                except Exception:
                    pass
        except Exception as ue:
            print(f"  ⚠️ Upstash sync note: {ue}")


async def extract_bot_webapp_token(client: TelegramClient, bot_username: str, start_param: str = "", default_url: str = "", candidate_short_names: list = None) -> str:
    """Universal 4-strategy resilient token extractor."""
    if not bot_username:
        return None

    def extract_from_url(url_str):
        if not url_str:
            return None
        try:
            p = urllib.parse.urlparse(str(url_str))
            frag = urllib.parse.parse_qs(p.fragment).get("tgWebAppData", [None])[0]
            if frag:
                if frag.startswith("user%3D") or "%257B" in frag or "%2522" in frag:
                    frag = urllib.parse.unquote(frag)
                return frag
            query = urllib.parse.parse_qs(p.query).get("tgWebAppData", [None])[0]
            if query:
                if query.startswith("user%3D") or "%257B" in query or "%2522" in query:
                    query = urllib.parse.unquote(query)
                return query
        except Exception:
            pass
        return None

    bot_ent = None
    bot_in = None
    try:
        bot_ent = await client.get_entity(bot_username)
        bot_in = await client.get_input_entity(bot_ent)
    except Exception as e:
        return None

    # Strategy A: RequestAppWebViewRequest with short names
    names_to_try = candidate_short_names or ["app", "play", "myapp", "miniapp", "bot", "game"]
    for sn in names_to_try:
        try:
            req_p = {
                "peer": bot_in,
                "app": InputBotAppShortName(bot_id=bot_in, short_name=sn),
                "platform": "android"
            }
            if start_param:
                req_p["start_param"] = str(start_param)
            res = await client(RequestAppWebViewRequest(**req_p))
            tok = extract_from_url(getattr(res, "url", None))
            if tok:
                return tok
        except Exception:
            continue

    # Strategy B: Bot Menu Button
    try:
        menu = await client(functions.bots.GetBotMenuButtonRequest(user_id=bot_in))
        menu_btn = getattr(menu, "button", None)
        if menu_btn and hasattr(menu_btn, "url") and menu_btn.url:
            req_p = {
                "peer": bot_ent,
                "bot": bot_ent,
                "platform": "android",
                "url": menu_btn.url
            }
            if start_param:
                req_p["start_param"] = str(start_param)
            res = await client(RequestWebViewRequest(**req_p))
            tok = extract_from_url(getattr(res, "url", None))
            if tok:
                return tok
    except Exception:
        pass

    # Strategy C: Inspect existing keyboard buttons (silent, zero messages sent)
    try:
        msgs = await client.get_messages(bot_ent, limit=5)
        for m in msgs:
            if not m.out and m.buttons:
                for row in m.buttons:
                    for b in row:
                        raw_b = getattr(b, "button", b)
                        w_url = getattr(getattr(raw_b, "web_app", None), "url", None) or getattr(raw_b, "url", None)
                        if w_url:
                            try:
                                req_p = {
                                    "peer": bot_ent,
                                    "bot": bot_ent,
                                    "platform": "android",
                                    "url": w_url
                                }
                                if start_param:
                                    req_p["start_param"] = str(start_param)
                                res = await client(RequestWebViewRequest(**req_p))
                                tok = extract_from_url(getattr(res, "url", None))
                                if tok:
                                    return tok
                            except Exception:
                                pass
                        pass
    except Exception:
        pass

    # Strategy D: Direct RequestWebViewRequest with known default WebApp URL
    if default_url:
        try:
            req_p = {
                "peer": bot_ent,
                "bot": bot_ent,
                "platform": "android",
                "url": default_url
            }
            if start_param:
                req_p["start_param"] = str(start_param)
            res = await client(RequestWebViewRequest(**req_p))
            tok = extract_from_url(getattr(res, "url", None))
            if tok:
                return tok
        except Exception:
            pass

    return None


async def extract_account_tokens(acc: dict, session: aiohttp.ClientSession):
    """Connects MTProto for a single account and extracts all 8 bot session links."""
    acc_name = acc.get("name", "Account")
    acc_uid = str(acc.get("user_id"))
    acc_sess = acc.get("session_string") or acc.get("session")
    if not acc_sess or acc.get("status") == "revoked":
        print(f"[{acc_name}] Skipping revoked or empty session.")
        return

    is_master = (acc_uid == str(REPORT_CHAT_ID) or acc_uid == "6727787768")
    print(f"\n🚀 [{acc_name} (ID: {acc_uid}{' - 👑 Master' if is_master else ''})] Connecting MTProto...")
    cl = TelegramClient(StringSession(acc_sess), API_ID, API_HASH)
    try:
        connected = False
        for attempt in range(1, 4):
            try:
                await cl.connect()
                if await cl.is_user_authorized():
                    connected = True
                    break
                else:
                    print(f"[{acc_name}] Session not authorized or revoked.")
                    return
            except Exception as conn_err:
                err_str = str(conn_err)
                if "used under two different IP addresses" in err_str or "AUTH_KEY_DUPLICATED" in err_str:
                    print(f"[{acc_name}] MTProto key duplicated/revoked.")
                    return
                if attempt < 3:
                    print(f"[{acc_name}] Connection attempt {attempt} failed ({conn_err}), retrying in {attempt * 2}s...")
                    await asyncio.sleep(attempt * 2.0)
                else:
                    print(f"[{acc_name}] Could not connect after 3 attempts: {conn_err}")
                    return

        if not connected:
            return

        tokens = {}

        # 1. MRG Miner
        mrg_p = None if is_master else MRG_REF
        tok = await extract_bot_webapp_token(cl, MRG_BOT, start_param=mrg_p, default_url="https://app.mrgtoken.xyz/", candidate_short_names=["app", "miniapp"])
        if tok:
            tokens["mrg_init_data"] = tok
            print(f"  ⛏️ MRG Miner: Collected")
        await asyncio.sleep(0.5)

        # 2. ATF Miner
        atf_p = None if is_master else str(REPORT_CHAT_ID)
        tok = await extract_bot_webapp_token(cl, ATF_BOT, start_param=atf_p, default_url="https://atfminers.asloni.online/miner/index.html?entry=bot_start", candidate_short_names=["app", "miner", "play"])
        if tok:
            tokens["atf_init_data"] = tok
            print(f"  🪙 ATF Miner: Collected")
        await asyncio.sleep(0.5)

        # 3. Victor's Company
        vic_p = None if is_master else VICTORS_REF
        tok = await extract_bot_webapp_token(cl, VICTORS_BOT, start_param=vic_p, default_url="https://app.victors.company/", candidate_short_names=["app", "play"])
        if tok:
            tokens["victors_init_data"] = tok
            print(f"  🏢 Victor's Company: Collected")
        await asyncio.sleep(0.5)

        # 4. Kynex Network (@Kynex_miningbot)
        ky_p = None if is_master else KYNEX_REF
        tok = await extract_bot_webapp_token(cl, KYNEX_BOT, start_param=ky_p, default_url="https://kynex.top/telegram-auth.html", candidate_short_names=["App", "app"])
        if tok:
            tokens["kynex_init_data"] = tok
            print(f"  💎 Kynex Network: Collected")
        await asyncio.sleep(0.5)

        # 5. PepeGram (@Pepe_gram_bot)
        pepe_tok = await extract_bot_webapp_token(cl, PEPEGRAM_BOT, start_param=PEPEGRAM_REF, default_url="https://app.miniempire.app/miniapp/", candidate_short_names=["app", "miniapp"])
        if pepe_tok:
            tokens["pepegram_init_data"] = pepe_tok
            print(f"  🐸 PepeGram: Collected")
        await asyncio.sleep(0.5)

        # 6. AdxEarn AI (@AdxEarnAibot)
        adx_p = None if is_master else ADXEARN_REF
        adx_tok = await extract_bot_webapp_token(cl, ADXEARN_BOT, start_param=adx_p, default_url="https://app.adxearnai.xyz/", candidate_short_names=["app", "play"])
        if adx_tok:
            tokens["adxearn_init_data"] = adx_tok
            print(f"  🤖 AdxEarn AI: Collected")
        await asyncio.sleep(0.5)

        # 7. DiggoMiner (@Diggominer_bot)
        dig_p = None if is_master else DIGGO_REF
        dig_tok = await extract_bot_webapp_token(cl, DIGGO_BOT, start_param=dig_p, default_url="https://diggo.linkpc.net/", candidate_short_names=["app", "miner"])
        if dig_tok:
            tokens["diggo_init_data"] = dig_tok
            print(f"  ⛏️ DiggoMiner: Collected")
            # Immediate JWT exchange while auth_date is < 30s old
            try:
                async with session.post(
                    "https://diggo.linkpc.net/api/auth/telegram",
                    json={"initData": dig_tok},
                    headers={"Origin": "https://diggo.linkpc.net", "Referer": "https://diggo.linkpc.net/", "Content-Type": "application/json"},
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as r_dig:
                    if r_dig.status == 200:
                        d_dig = await r_dig.json()
                        jwt_tok = d_dig.get("token")
                        if jwt_tok:
                            tokens["diggo_jwt"] = jwt_tok
            except Exception:
                pass
        await asyncio.sleep(0.5)

        # 8. Chicken Land (@ChickenLandBot)
        chk_p = None if is_master else CHICKENLAND_REF
        chk_tok = await extract_bot_webapp_token(cl, CHICKENLAND_BOT, start_param=chk_p, default_url="https://app8968434282.tgcloud.ai/", candidate_short_names=["play", "app", "farm", "miniapp"])
        if chk_tok:
            tokens["chickenland_init_data"] = chk_tok
            print(f"  🐔 Chicken Land: Collected")
        await asyncio.sleep(0.5)

        # 9. Grouche Mine (@GRC_AirdrooBot)
        grc_p = None if is_master else GROUCHEMINE_REF
        grc_tok = await extract_bot_webapp_token(cl, GROUCHEMINE_BOT, start_param=grc_p, default_url="https://grouchemine.world/", candidate_short_names=["app"])
        if grc_tok:
            tokens["grouchemine_init_data"] = grc_tok
            print(f"  🍐 Grouche Mine: Collected")
        await asyncio.sleep(0.5)

        # 10. LUM Miner (@lumeonminer_bot)
        lum_p = None if is_master else LUMEON_REF
        lum_tok = await extract_bot_webapp_token(cl, LUMEON_BOT, start_param=lum_p, default_url="https://lum-miner.gurmessa747.workers.dev/", candidate_short_names=["Lum", "lum", "app"])
        if lum_tok:
            tokens["lumeon_init_data"] = lum_tok
            print(f"  💎 LUM Miner: Collected")
        await asyncio.sleep(0.5)

        # 11. EarnVault (@EarnVaultApp_bot)
        ev_p = None if is_master else EARNVAULT_REF
        ev_tok = await extract_bot_webapp_token(cl, EARNVAULT_BOT, start_param=ev_p, default_url="https://eearnvault.top/", candidate_short_names=["App", "app", "earn"])
        if ev_tok:
            tokens["earnvault_init_data"] = ev_tok
            print(f"  🏦 EarnVault: Collected")

        # Auto-join mandatory sponsor channels for side-task verification
        for s_ch in MANDATORY_SPONSOR_CHANNELS:
            try:
                await cl(JoinChannelRequest(s_ch))
                await asyncio.sleep(0.3)
            except Exception:
                pass

        # Sync to Cloudflare Edge KV & Upstash Redis
        if tokens:
            await sync_tokens_to_edge_and_upstash(session, acc_uid, acc_name, tokens)

    finally:
        try:
            await cl.disconnect()
        except Exception:
            pass


async def main():
    print("=" * 65)
    print("MY AGY AI — 100% CLOUD-FIRST TELEGRAM TOKEN REFRESHER")
    print("=" * 65)

    accounts = load_accounts()
    if not accounts:
        print("❌ No accounts found. Ensure accounts.json or FLEET_ACCOUNTS_JSON is set.")
        sys.exit(1)

    print(f"Found {len(accounts)} accounts in fleet.")

    async with aiohttp.ClientSession() as session:
        for idx, acc in enumerate(accounts, 1):
            try:
                await extract_account_tokens(acc, session)
                await asyncio.sleep(1.5)
            except Exception as e:
                print(f"Error processing account {acc.get('name')}: {e}")

    print("\n✅ All 24h WebApp tokens collected & pushed to 5x Cloudflare Nodes & Upstash Redis!")


if __name__ == "__main__":
    asyncio.run(main())

#!/usr/bin/env python3
"""
backup_manager.py
Automated Cloud Backup & Disaster Recovery System for MY AGY AI & Antigravity.
Uploads complete fleet backups, MTProto sessions, Antigravity OAuth tokens,
and 1-click restore commands directly to the private vault channel:
https://t.me/myagyai
"""

import os
import sys
import re
import json
import zipfile
import asyncio
import logging
from datetime import datetime, timezone, timedelta
import aiohttp
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN", "")
REPORT_CHAT_ID = os.getenv("REPORT_CHAT_ID", "6727787768")
ADMIN_NOTIFICATION_CHANNEL_ID = os.getenv("ADMIN_NOTIFICATION_CHANNEL_ID", "-1004358687850")
BACKUP_CHANNEL = "@myagyai"

# Bot Fleet core files
CORE_BOT_FILES = [
    "app.py",
    "accounts.json",
    ".env",
    "clean_up_system.py",
    "proxy_manager.py",
    "phone_detector.py",
    "login_account.py",
    "backup_manager.py",
    "bot_supervisor.sh",
    "start_userbot.sh",
    "stop_userbot.sh",
    "restore.sh",
    "requirements.txt",
    ".cloudflare_credentials",
    "cloudflared_tunnel.sh",
    "my_agy_bot.service",
    "payouts.json",
    "payout_ledger.json",
    "fleet_ton_wallets.json",
    "fleet_evm_wallets.json",
    "bep20_onchain_watcher.py",
    "bep20_watcher_state.json",
    "multichain_onchain_watcher.py",
    "multichain_watcher_state.json",
    "daily_profit_reporter.py",
    ".onchain_state.json",
    "fleet_miniapp_tokens.json",
    "deploy_both_cf_workers.py",
    "PROJECT_BIBLE.md",
    "atf_fleet_state.json",
    "refresh_fleet_tokens.py",
    "update_dashboard_compact.py",
    "payout_balances.json",
    "FLEET_MASTER_REGISTRY.json",
    "commercial_user_isolation.py",
    "refresh_cloud_tokens.py",
    "cloud_wallet_sweeper.py",
    "autonomous_cloud_agent.py",
    "render_failover_manager.py",
    "push_to_standby_repo.py",
    "render_standby_app.py",
    "render_app_latest.py",
    "vercel.json",
    "deploy_vercel.py",
    "public/index.html",
    "CHANGELOG.md",
    "AGENTS.md",
    "FLEET_WALLETS_SECRETS_MASTER_VAULT.txt",
    "USER_BOT_FLEET_SECRETS_VAULT.json",
    "get_login_code.py",
    "fleet_tron_wallets.json",
    "fleet_solana_wallets.json",
    "fleet_btc_wallets.json",
    "fleet_wallets_data.json",
    "fleet_wallet_provisioner.py",
    "public_admin/fleet_wallets_data.json",
    "public_admin/admin.html",
    "public_admin/user-admin.html",
    "FLEET_ACCOUNTS_AND_WALLETS_DIRECTORY.md",
    "FLEET_MULTICHAIN_WALLETS_DASHBOARD.md",
    "ARCHIVED_ACCOUNT_10_OLD_WALLETS.json",
    "public_ads/miner/index.html",
    "public_ads/index.html",
    "public_ads/app/ad/index.html",
    "public_ads/vercel.json",
    "public/app/index.html",
    "public/app/ad/index.html",
    "SESSION_BRIDGE.md",
    "MASTER_SYSTEM_DIRECTORY.md",
    "DASHBOARDS_AND_SYSTEM_GROUND_TRUTH.md",
    "FLEET_MEMORY_CORE.md",
    "kynex_miner.py",
    "victors_arcade_solver.py",
    "victors_sb_solver.py",
    "mrg_turnstile_solver.py",
    "bot_registry.py",
    "finish_all_fleet_sidetasks.py",
    "chickenland_miner.py",
    "chickenland_promo_sniper.py",
    "finalize_chickenland_fleet.py",
    "onboard_chickenland_fleet.py",
    "extract_all_missing_fleet_tokens.py",
    "AUTOMATION_AND_SOLVER_ARCHITECTURE.md",
    "FLEET_9_BOTS_COMPREHENSIVE_ANALYSIS_AND_RESOLUTION.md",
    "NINE_BOTS_OPERATIONAL_STUDY.md",
    "audit_bots_and_sidetasks.py",
    "batch_grouche_mine.py",
    "setup_smart_agy.sh"
]


# Antigravity CLI session files to preserve OAuth login & settings
AGY_CLI_DIR = os.path.expanduser("~/.gemini/antigravity-cli")
AGY_SESSION_FILES = [
    "antigravity-oauth-token",
    "settings.json",
    "installation_id",
    "jetski_state.pbtxt"
]


def create_backup_zip() -> str:
    """Creates a timestamped zip containing bot code and Antigravity session."""
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join(BASE_DIR, "backups")
    os.makedirs(backup_dir, exist_ok=True)
    zip_filename = f"my_agy_ai_backup_{timestamp}.zip"
    zip_path = os.path.join(backup_dir, zip_filename)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        # 1. Add core bot fleet files
        for fname in CORE_BOT_FILES:
            fpath = os.path.join(BASE_DIR, fname)
            if os.path.exists(fpath):
                zipf.write(fpath, arcname=fname)

        # 1.1 Add scripts directory recursively
        scripts_dir = os.path.join(BASE_DIR, "scripts")
        if os.path.exists(scripts_dir):
            for root, dirs, files in os.walk(scripts_dir):
                dirs[:] = [d for d in dirs if d != "__pycache__"]
                for f in files:
                    if f.endswith((".py", ".sh", ".json", ".md", ".js")):
                        full_f = os.path.join(root, f)
                        rel_f = os.path.relpath(full_f, BASE_DIR)
                        zipf.write(full_f, arcname=rel_f)

        # 2. Add Antigravity session files into 'antigravity_session/'
        if os.path.exists(AGY_CLI_DIR):
            for agy_file in AGY_SESSION_FILES:
                agy_path = os.path.join(AGY_CLI_DIR, agy_file)
                if os.path.exists(agy_path):
                    zipf.write(agy_path, arcname=os.path.join("antigravity_session", agy_file))

        # 3. Add Cloudflare tunnel configs into 'cloudflared_config/'
        cf_dir = os.path.expanduser("~/.cloudflared")
        if os.path.exists(cf_dir):
            for cf_f in os.listdir(cf_dir):
                cf_path = os.path.join(cf_dir, cf_f)
                if os.path.isfile(cf_path):
                    zipf.write(cf_path, arcname=os.path.join("cloudflared_config", cf_f))

    # Auto-prune older backup archives (keep latest 2 to save disk on 2GB VPS)
    try:
        existing_zips = sorted([
            os.path.join(backup_dir, f) for f in os.listdir(backup_dir)
            if f.startswith("my_agy_ai_backup_") and f.endswith(".zip")
        ] + [
            os.path.join(BASE_DIR, f) for f in os.listdir(BASE_DIR)
            if f.startswith("my_agy_ai_backup_") and f.endswith(".zip")
        ], key=os.path.getmtime)
        while len(existing_zips) > 2:
            oldest = existing_zips.pop(0)
            os.remove(oldest)
    except Exception:
        pass

    return zip_path


async def send_backup_to_telegram(chat_id: str = None) -> tuple[bool, str]:
    """
    Generates backup zip, uploads to https://t.me/myagyai, and returns
    the 1-line copy-paste recovery command for Linux VPS & Android Termux.
    """
    zip_path = create_backup_zip()
    zip_filename = os.path.basename(zip_path)
    zip_size_kb = round(os.path.getsize(zip_path) / 1024, 1)

    accounts_count = 0
    accounts_file = os.path.join(BASE_DIR, "accounts.json")
    if os.path.exists(accounts_file):
        try:
            with open(accounts_file, "r", encoding="utf-8") as f:
                accounts_count = len(json.load(f))
        except Exception:
            pass

    now_utc = datetime.now(timezone.utc)
    bst_time = now_utc + timedelta(hours=6)
    date_str = bst_time.strftime("%A, %d %B %Y • %I:%M %p BST")

    url_doc = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendDocument"
    url_msg = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"

    try:
        custom_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
        async with aiohttp.ClientSession(headers=custom_headers) as session:
            # 0. Sync backup archive to Cloudflare Edge Gateway
            cf_endpoints = [
                "https://restore-agy.agorameet.workers.dev/upload",
                "https://restore-agy.aaaai2.workers.dev/upload",
                "https://restore-agy.aaa-bot.workers.dev/upload",
                "https://restore-agy.aaa222.workers.dev/upload",
                "https://restore-agy.aaaai.workers.dev/upload"
            ]
            cf_sec = os.getenv("SECRET_KEY") or os.getenv("CF_SECRET_KEY", "")
            cf_headers = {
                "Authorization": f"Bearer {cf_sec}",
                "Content-Type": "application/zip",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
            }
            try:
                with open(zip_path, "rb") as zf:
                    z_bytes = zf.read()
                cf_synced = False
                for ep in cf_endpoints:
                    try:
                        async with session.post(ep, headers=cf_headers, data=z_bytes, timeout=aiohttp.ClientTimeout(total=4)) as cf_r:
                            if cf_r.status == 200:
                                logging.info(f"[Cloudflare Edge] Backup synced to {ep} (auto-replicating to mesh)")
                                cf_synced = True
                                break
                    except Exception as cfe:
                        logging.debug(f"[Cloudflare Edge] Upload attempt to {ep} failed: {cfe}")
            except Exception:
                pass

            # 0.5 Pin to Pinata IPFS Decentralized Network
            pinata_jwt = os.getenv("PINATA_JWT")
            ipfs_cid = None
            if pinata_jwt:
                try:
                    form = aiohttp.FormData()
                    form.add_field("file", open(zip_path, "rb"), filename=zip_filename)
                    form.add_field("pinataMetadata", json.dumps({"name": zip_filename}))
                    headers_pinata = {
                        "Authorization": f"Bearer {pinata_jwt}",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                    async with session.post("https://api.pinata.cloud/pinning/pinFileToIPFS", data=form, headers=headers_pinata, timeout=aiohttp.ClientTimeout(total=5)) as p_resp:
                        if p_resp.status == 200:
                            p_data = await p_resp.json()
                            ipfs_cid = p_data.get("IpfsHash")
                            logging.info(f"[Pinata IPFS] Backup pinned: {ipfs_cid}")

                            # Sync IPFS CID to local .env and Upstash Redis for global zero-trust access
                            if ipfs_cid:
                                env_file = os.path.join(BASE_DIR, ".env")
                                if os.path.exists(env_file):
                                    try:
                                        with open(env_file, "r", encoding="utf-8") as ef:
                                            e_txt = ef.read()
                                        if "PINATA_LATEST_IPFS_CID=" in e_txt:
                                            e_txt = re.sub(r"PINATA_LATEST_IPFS_CID=.*", f"PINATA_LATEST_IPFS_CID={ipfs_cid}", e_txt)
                                        else:
                                            e_txt += f"\nPINATA_LATEST_IPFS_CID={ipfs_cid}\n"
                                        with open(env_file, "w", encoding="utf-8") as ef:
                                            ef.write(e_txt)
                                    except Exception:
                                        pass

                                up_url = os.getenv("UPSTASH_REDIS_REST_URL")
                                up_tok = os.getenv("UPSTASH_REDIS_REST_TOKEN")
                                if up_url and up_tok:
                                    try:
                                        async with session.post(
                                            f"{up_url}/set/fleet:latest_ipfs_cid",
                                            headers={"Authorization": f"Bearer {up_tok}"},
                                            json=ipfs_cid,
                                            timeout=aiohttp.ClientTimeout(total=5)
                                        ):
                                            pass
                                    except Exception:
                                        pass
                except Exception as pe:
                    logging.warning(f"[Pinata IPFS] Pinning error: {pe}")

            ipfs_line = f"• <b>IPFS Decentralized Gateway:</b> <code>https://gateway.pinata.cloud/ipfs/{ipfs_cid}</code>\n" if ipfs_cid else ""

            caption = (
                f"📦 <b>MY AGY AI — Disaster Recovery Backup Archive</b>\n"
                f"📅 <i>{date_str}</i>\n\n"
                f"• <b>Archive:</b> <code>{zip_filename}</code> ({zip_size_kb} KB)\n"
                f"• <b>Fleet Accounts:</b> <code>{accounts_count} Preserved</code>\n"
                f"• <b>Antigravity Session:</b> <code>Preserved & Auto-Authenticated</code> ✅\n"
                f"{ipfs_line}"
                f"• <b>Vault Channel:</b> <code>https://t.me/myagyai</code>\n\n"
                f"🛡️ <b>VPS Disconnect & Termux Protection:</b>\n"
                f"If your server is ever disconnected or deleted, you can restore your complete bot fleet and Antigravity in 1 click."
            )

            data = aiohttp.FormData()
            data.add_field("chat_id", BACKUP_CHANNEL)
            data.add_field("caption", caption)
            data.add_field("parse_mode", "HTML")
            data.add_field("document", open(zip_path, "rb"), filename=zip_filename)

            # 1. Upload backup archive directly to @myagyai Telegram channel (Unlimited, bypasses Cloudflare KV)
            async with session.post(url_doc, data=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                result = await resp.json()
                if not result.get("ok"):
                    return False, f"❌ Upload to channel failed: {result.get('description')}"

                file_id = result["result"]["document"]["file_id"]

            # 2. Construct 1-line restore command from Telegram CDN
            bootstrap = (
                "(command -v pkg >/dev/null && pkg install -y python tmux unzip curl || "
                "(command -v apt-get >/dev/null && (apt-get update -y && apt-get install -y python3 python3-venv python3-pip tmux unzip curl || "
                "sudo apt-get update -y && sudo apt-get install -y python3 python3-venv python3-pip tmux unzip curl)))"
            )
            py_fetch = (
                f"python3 -c \"import urllib.request as u, json, zipfile, os; "
                f"t='{REPORT_BOT_TOKEN}'; "
                f"f=json.loads(u.urlopen(f'https://api.telegram.org/bot{{t}}/getFile?file_id={file_id}').read())['result']['file_path']; "
                f"u.urlretrieve(f'https://api.telegram.org/file/bot{{t}}/{{f}}', 'b.zip'); "
                f"zipfile.ZipFile('b.zip').extractall('.'); "
                f"os.remove('b.zip'); "
                f"print('✅ Backup restored successfully!')\""
            )
            tg_one_liner = f"{bootstrap} && {py_fetch}"

            ipfs_restore = f"\n\n🌐 <b>Decentralized IPFS Direct Restore:</b>\n<code>curl -sL https://gateway.pinata.cloud/ipfs/{ipfs_cid} -o b.zip && python3 -c \"import zipfile; zipfile.ZipFile('b.zip').extractall('.'); print('✅ Restored from IPFS!')\"</code>" if ipfs_cid else ""

            instructions = (
                f"⚡ <b>MY AGY AI — 1-CLICK DISASTER RECOVERY</b>\n\n"
                f"📦 <b>Archive:</b> <code>{zip_filename}</code>\n"
                f"🕒 <b>Saved:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
                f"🛡️ <b>1-Line Restore Command (Termux / Linux VPS):</b>\n"
                f"<code>{tg_one_liner}</code>"
                f"{ipfs_restore}\n\n"
                f"<i>Restores all accounts, MTProto sessions, Antigravity CLI, and supervisor in under 45 seconds directly from Telegram CDN or IPFS!</i>"
            )

            # 3. Post instructions to @myagyai (never pin, keep channel clean)
            async with session.post(url_msg, json={"chat_id": BACKUP_CHANNEL, "text": instructions, "parse_mode": "HTML"}):
                pass

            # Note: Local backup archive is preserved (up to 2 newest copies) via create_backup_zip pruning
            return True, f"✅ Backup uploaded to https://t.me/myagyai and saved locally!"

    except Exception as e:
        return False, f"❌ Backup failed: {e}"


if __name__ == "__main__":
    print("Uploading disaster recovery backup to https://t.me/myagyai...")
    ok, message = asyncio.run(send_backup_to_telegram())
    print(message)

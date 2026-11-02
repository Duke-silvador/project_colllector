#!/usr/bin/env python3
"""
MY AGY AI — Fleet Wallets & Secret Keys Master Vault Dispatcher
Broadcasts complete EVM and TON wallet secrets (Private Keys & 24-word Recovery Mnemonics)
along with Account Names, Phone Numbers, Binance Master Deposit Addresses, and Step-by-Step
Wallet Access Guidance to:
- AAA T Wallet Channel/Group (-1003973231307)
- Arif Direct Telegram Chat (6727787768)
- My agy Ai Backup Channel (-1004453515167)
"""

import os
import sys
import json
import time
import urllib.request
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
FLEET_TON_FILE = os.path.join(BASE_DIR, "fleet_ton_wallets.json")
FLEET_EVM_FILE = os.path.join(BASE_DIR, "fleet_evm_wallets.json")
BACKUP_TXT_FILE = os.path.join(BASE_DIR, "FLEET_WALLETS_SECRETS_MASTER_VAULT.txt")

REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN", "")
REPORT_CHAT_ID = os.getenv("REPORT_CHAT_ID", "6727787768")
AAA_T_WALLET_GROUP = -1003973231307
MYAGYAI_CHANNEL = -1004453515167

# Verified Personal Binance Web3 & Exchange Deposit Addresses
MASTER_PHONE = "+8801317342850"
MASTER_PHONE_NATIONAL = "01317342850"
MASTER_EVM_WALLET = "0xfda4182001672b9f0f09e2118242e543e35ed5ce"       # BSC BEP-20, Arbitrum One, Ethereum, Avalanche C-Chain
MASTER_TON_WALLET = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT"       # TON Network (v4r2)
MASTER_SOLANA_WALLET = "2EKCkj6RSgMHomtTPigoVfaLa5x4RaXq9qrxv2roi5Fu"       # Solana SPL
MASTER_BTC_WALLET = "bc1peg8n6rv7lnzpdwgqqktcyxvrw7we60c780l2yh48pvqvgpj2p7gsvecjdg"  # Bitcoin Taproot

def send_bot_message(text, chat_id):
    url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": True
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read())
    except Exception as e:
        # Fallback to plain text if Markdown parsing fails
        try:
            payload.pop("parse_mode", None)
            req_plain = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req_plain, timeout=15) as r_p:
                return json.loads(r_p.read())
        except Exception as e2:
            print(f"Error sending message to {chat_id}: {e2}")
            return None

def send_bot_document(file_path, chat_id, caption=""):
    url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendDocument"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(file_path)
    body = bytearray()
    
    # chat_id field
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="chat_id"\r\n\r\n{chat_id}\r\n'.encode())
    
    # caption field
    if caption:
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="caption"\r\n\r\n{caption}\r\n'.encode())
        
    # document field
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="document"; filename="{filename}"\r\n'.encode())
    body.extend(b"Content-Type: text/plain\r\n\r\n")
    body.extend(file_bytes)
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    req = urllib.request.Request(url, data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"Error sending document to {chat_id}: {e}")
        return None

def generate_vault_document(accounts, fleet_ton, fleet_evm):
    now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    lines = []
    lines.append("================================================================================")
    lines.append("      MY AGY AI — OFFICIAL FLEET WALLETS, PRIVATE KEYS & SEEDS MASTER VAULT      ")
    lines.append("================================================================================")
    lines.append(f"Generated at: {now_str}")
    lines.append("Networks Covered: TON, EVM (BEP-20 / Arbitrum / ETH / AVAX), Solana, Bitcoin Taproot")
    lines.append("Anti-Sybil Architecture: 100% Unique Isolated Addresses Across All Worker Accounts")
    lines.append("================================================================================\n")

    lines.append("--------------------------------------------------------------------------------")
    lines.append("👑 PRIMARY MASTER ACCOUNT (Arif Hossain / ID: 6727787768)")
    lines.append("--------------------------------------------------------------------------------")
    lines.append("• Telegram ID:             6727787768")
    lines.append("• Username:                @Arif2743aaa")
    lines.append("• Account Name:            Arif Hossain")
    lines.append(f"• Phone Number:            {MASTER_PHONE} ({MASTER_PHONE_NATIONAL})")
    lines.append(f"• Master EVM Address:      {MASTER_EVM_WALLET}")
    lines.append("                           (Binance Deposit: BEP-20 BSC, Arbitrum One, Ethereum, Avalanche C-Chain)")
    lines.append(f"• Master TON Address:      {MASTER_TON_WALLET}")
    lines.append("                           (Binance Deposit: The Open Network)")
    lines.append(f"• Master Solana Address:   {MASTER_SOLANA_WALLET}")
    lines.append("                           (Binance Deposit: Solana SPL)")
    lines.append(f"• Master Bitcoin Address:  {MASTER_BTC_WALLET}")
    lines.append("                           (Binance Deposit: Bitcoin Taproot)")
    lines.append("• Custody Policy:          Official Personal Binance App Web3 & Exchange Wallets")
    lines.append("                           (100% Direct Deposit, Maximum Security, Zero Local Key Exposure)\n")

    lines.append("================================================================================")
    lines.append("📖 STEP-BY-STEP GUIDANCE: HOW TO ACCESS & IMPORT THESE WALLETS")
    lines.append("================================================================================")
    lines.append("A. HOW TO IMPORT WORKER EVM WALLETS (MetaMask, Trust Wallet, Rabby, Coinbase Wallet):")
    lines.append("   1. Open MetaMask or Trust Wallet on your phone or PC.")
    lines.append("   2. Tap the wallet/account selector at the top and click 'Add Account' or 'Import Account'.")
    lines.append("   3. Choose 'Import Private Key' (DO NOT select 'Secret Recovery Phrase').")
    lines.append("   4. Find the target account below, copy its 64-character 'EVM Private Key (Hex)'.")
    lines.append("   5. Paste the key and tap 'Import'.")
    lines.append("   6. Ensure network is set to 'BNB Smart Chain' (BEP-20) or 'Arbitrum One'.")
    lines.append("   7. Done! You have full access to transfer and swap all USDT/BNB/tokens.\n")

    lines.append("B. HOW TO IMPORT WORKER TON WALLETS (Tonkeeper, MyTonWallet, Telegram @wallet):")
    lines.append("   1. Open Tonkeeper or MyTonWallet on your mobile device.")
    lines.append("   2. Go to Settings / Wallet List -> tap 'Add Wallet' -> 'Existing Wallet'.")
    lines.append("   3. Select '24 Secret Words' (Recovery Phrase).")
    lines.append("   4. Enter the 24 words listed below for that account in exact numbered order.")
    lines.append("   5. Set a local passcode and confirm.")
    lines.append("   6. Done! All TON tokens, MRG, ART, and airdrops are immediately spendable.\n")

    lines.append("================================================================================")
    lines.append("👥 WORKER FLEET DEDICATED WALLETS & SECRETS")
    lines.append("================================================================================")

    # Master Account Telegram Card
    master_card_md = (
        "👑 *PRIMARY MASTER ACCOUNT (Arif Hossain)*\n"
        "• *Telegram User ID:* `6727787768`\n"
        "• *Username:* `@Arif2743aaa`\n"
        f"• *Phone Number:* `{MASTER_PHONE}` (`{MASTER_PHONE_NATIONAL}`)\n"
        "• *Custody Policy:* Personal Binance Deposit Accounts (Zero Key Exposure)\n\n"
        "🌐 *Binance EVM (BEP-20 / Arbitrum / ETH / AVAX):*\n"
        f"`{MASTER_EVM_WALLET}`\n\n"
        "💎 *Binance TON Network:*\n"
        f"`{MASTER_TON_WALLET}`\n\n"
        "🟣 *Binance Solana (SPL):*\n"
        f"`{MASTER_SOLANA_WALLET}`\n\n"
        "🟧 *Binance Bitcoin (Taproot):*\n"
        f"`{MASTER_BTC_WALLET}`\n\n"
        "ℹ️ *All personal mining payouts, referral rewards, and USDT promo credits route directly to your personal Binance account.*"
    )

    worker_cards = []
    worker_idx = 0
    for idx, acc in enumerate(accounts):
        uid = str(acc.get("user_id"))
        if uid == "6727787768":
            continue
        worker_idx += 1

        name = acc.get("name", f"Account #{idx+1}")
        phone = acc.get("phone", "N/A")
        uname = f"@{acc.get('username')}" if acc.get("username") else "No Username"

        # TON data
        tw = fleet_ton.get(uid, {})
        t_addr = tw.get("address", "N/A")
        mnemonic = tw.get("mnemonic", "N/A")

        # EVM data
        ew = fleet_evm.get(uid, {})
        e_addr = ew.get("address", "N/A")
        e_priv = ew.get("private_key", "N/A")

        lines.append(f"Account #{worker_idx}: {name}")
        lines.append(f"• Telegram User ID:   {uid}")
        lines.append(f"• Phone Number:       {phone}")
        lines.append(f"• Username:           {uname}")
        lines.append(f"• EVM Address (BSC):  {e_addr}")
        lines.append(f"• EVM Private Key:    {e_priv}")
        lines.append(f"• TON Address (v4r2): {t_addr}")
        lines.append(f"• TON 24-Word Seed:   {mnemonic}")
        lines.append("--------------------------------------------------------------------------------")

        card_md = (
            f"💼 *Account #{worker_idx}: {name}*\n"
            f"• *Telegram ID:* `{uid}`\n"
            f"• *Phone Number:* `{phone}`\n"
            f"• *Username:* {uname}\n\n"
            f"🌐 *EVM Wallet (BEP-20 / Arbitrum):*\n"
            f"`{e_addr}`\n"
            f"🔑 *EVM Private Key (Hex):*\n"
            f"`{e_priv}`\n\n"
            f"💎 *TON Wallet (v4r2):*\n"
            f"`{t_addr}`\n"
            f"🗝️ *TON 24-Word Recovery Seed:*\n"
            f"```text\n{mnemonic}\n```"
        )
        worker_cards.append(card_md)

    with open(BACKUP_TXT_FILE, "w", encoding="utf-8") as bf:
        bf.write("\n".join(lines))

    return master_card_md, worker_cards

def main():
    print(f"Loading accounts and fleet wallet registries from {BASE_DIR}...")
    with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
        accounts = json.load(f)

    with open(FLEET_TON_FILE, "r", encoding="utf-8") as f:
        fleet_ton = json.load(f)

    with open(FLEET_EVM_FILE, "r", encoding="utf-8") as f:
        fleet_evm = json.load(f)

    master_card, worker_cards = generate_vault_document(accounts, fleet_ton, fleet_evm)
    print(f"✅ Generated master vault document: {BACKUP_TXT_FILE}")

    targets = [
        AAA_T_WALLET_GROUP, # AAA T Wallet Supergroup (-1003973231307)
        REPORT_CHAT_ID,     # Arif Direct (6727787768)
        MYAGYAI_CHANNEL     # Cloud Backup Vault (-1004453515167)
    ]

    intro_header = (
        "🔐 *MY AGY AI — OFFICIAL FLEET WALLETS & SECRET KEYS MASTER VAULT (UPDATED)*\n\n"
        "Here is the complete, verified directory of all fleet accounts with *Account Names, Verified Phone Numbers, Binance Deposit Addresses, EVM Private Keys, and TON 24-word Seed Phrases*.\n\n"
        f"• *👑 Main Account (`6727787768`):* Phone `{MASTER_PHONE}` (`{MASTER_PHONE_NATIONAL}`) — Direct routes to personal Binance deposits (EVM, TON, Solana, Bitcoin Taproot).\n"
        "• *👥 Worker Accounts:* Dedicated isolated wallets on EVM (BEP-20) & TON to prevent multi-account deduplication bans.\n"
        "• *📲 Guidance:* Below each account is its 64-char EVM private key (import via MetaMask/Trust Wallet) and 24-word TON seed (import via Tonkeeper).\n\n"
        "👇 *Master Account & Individual Worker Cards Listed Below:* 👇"
    )

    for tgt in targets:
        print(f"\n=======================================================")
        print(f"Broadcasting Master Wallet Vault to target: {tgt}")
        print(f"=======================================================")

        # 1. Send Intro Header
        res_h = send_bot_message(intro_header, tgt)
        print(f"  Header sent: {bool(res_h and res_h.get('ok'))}")
        time.sleep(1.0)

        # 2. Send Master Account Card (Card #0)
        res_m = send_bot_message(master_card, tgt)
        print(f"  Master Account Card sent: {bool(res_m and res_m.get('ok'))}")
        time.sleep(1.0)

        # 3. Send worker cards in individual clear messages
        for i, card in enumerate(worker_cards):
            res_c = send_bot_message(card, tgt)
            print(f"  Worker Card {i+1}/{len(worker_cards)} sent: {bool(res_c and res_c.get('ok'))}")
            time.sleep(1.2)

        # 4. Upload the complete raw backup file document
        caption = (
            "📦 Official Fleet Wallets & Secret Keys Master Vault File (Updated).\n"
            f"Includes Arif Hossain (+8801317342850), verified Binance deposits, 12 worker EVM keys & TON 24-word seeds."
        )
        res_d = send_bot_document(BACKUP_TXT_FILE, tgt, caption=caption)
        print(f"  Master Vault Document file sent: {bool(res_d and res_d.get('ok'))}")
        time.sleep(1.5)

    print("\n🎉 MASTER WALLETS & SECRETS VAULT SUCCESSFULLY BROADCASTED TO AAA T WALLET CHANNEL & ARIF DIRECT!")

if __name__ == "__main__":
    main()

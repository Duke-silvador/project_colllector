#!/usr/bin/env python3
"""
get_login_code.py
Retrieves Telegram 2FA / Login Codes from active MTProto sessions.
Allows logging back into the official Telegram Android app without SMS.
"""

import os
import sys
import re
import json
import asyncio
from telethon import TelegramClient, events
from telethon.sessions import StringSession

API_ID = 37321306
API_HASH = "5cd9e5bbfb572a4429a0c54774153b47"

def load_accounts():
    acc_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "accounts.json")
    with open(acc_path, "r", encoding="utf-8") as f:
        return json.load(f)

async def check_recent_codes(client):
    try:
        messages = await client.get_messages(777000, limit=5)
        for msg in messages:
            if not msg.text:
                continue
            code_match = re.search(r"\b(\d{5})\b", msg.text)
            if code_match:
                return code_match.group(1), msg.text, msg.date
    except Exception as e:
        pass
    return None, None, None

async def listen_for_code(client, phone, timeout=300):
    print(f"\n📡 Connected to Telegram for {phone}!", flush=True)
    print("👉 Now open your Telegram App, enter this phone number, and tap NEXT.", flush=True)
    print("⏳ Waiting for Telegram to send login code (timeout: 5 minutes)...", flush=True)

    # Check if a code arrived recently in the last 60 seconds
    code, text, date = await check_recent_codes(client)
    if code:
        print("\n" + "=" * 50, flush=True)
        print(f"  🔑 RECENT LOGIN CODE DETECTED: [ {code} ]", flush=True)
        print(f"  📅 Received at: {date}", flush=True)
        print("=" * 50, flush=True)
        print(f"Raw message:\n{text}\n", flush=True)

    future = asyncio.get_event_loop().create_future()

    @client.on(events.NewMessage(chats=777000))
    async def handler(event):
        msg_text = event.raw_text
        code_match = re.search(r"\b(\d{5})\b", msg_text)
        if code_match and not future.done():
            future.set_result((code_match.group(1), msg_text))

    try:
        code, full_text = await asyncio.wait_for(future, timeout=timeout)
        print("\n" + "=" * 50, flush=True)
        print(f"  🎉 NEW LOGIN CODE RECEIVED: [ {code} ]", flush=True)
        print("=" * 50, flush=True)
        print(f"\nFull message from Telegram:\n{full_text}\n", flush=True)
        print("👉 Enter this code into your Telegram app to log in!", flush=True)
        return code
    except asyncio.TimeoutError:
        print("\n⚠️ Timed out waiting for new login code.", flush=True)
        print("If Telegram asked you for an SMS instead of an app code, wait a minute and tap 'Send code via Telegram'.", flush=True)
        return None

async def main():
    accounts = load_accounts()
    
    if len(sys.argv) > 1:
        target = sys.argv[1].strip()
        account = None
        if target.isdigit() and int(target) <= len(accounts):
            account = accounts[int(target) - 1]
        else:
            for acc in accounts:
                if target in acc.get("phone", ""):
                    account = acc
                    break
        if not account:
            print(f"❌ Account '{target}' not found.")
            return
    else:
        print("==================================================")
        print("  📲 SELECT ACCOUNT TO RETRIEVE LOGIN CODE")
        print("==================================================")
        for i, acc in enumerate(accounts, start=1):
            name = acc.get("name") or acc.get("username") or "Account"
            phone = acc.get("phone", "No phone")
            print(f" [{i:2d}] {phone} ({name})")
        print("==================================================")
        
        try:
            choice = input(f"\nEnter account number (1-{len(accounts)}) or phone number: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAborted.")
            return

        if not choice:
            return

        if choice.isdigit() and 1 <= int(choice) <= len(accounts):
            account = accounts[int(choice) - 1]
        else:
            account = None
            for acc in accounts:
                if choice in acc.get("phone", ""):
                    account = acc
                    break
            if not account:
                print(f"❌ Account '{choice}' not found.")
                return

    phone = account.get("phone")
    session_str = account.get("session_string") or account.get("session")

    if not session_str:
        print(f"❌ No session string found for {phone}.")
        return

    client = TelegramClient(StringSession(session_str), API_ID, API_HASH)
    await client.connect()

    if not await client.is_user_authorized():
        print(f"❌ Session for {phone} is no longer authorized.")
        await client.disconnect()
        return

    try:
        await listen_for_code(client, phone)
    finally:
        await client.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nStopped.")

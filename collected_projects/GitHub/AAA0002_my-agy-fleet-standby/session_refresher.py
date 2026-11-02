#!/usr/bin/env python3
"""
session_refresher.py
Clean 2-step Telegram login session generator for renewing revoked StringSessions.
Step 1: request <phone> -> sends OTP via Telegram
Step 2: signin <code> [password] -> authenticates, updates accounts.json, Upstash Redis & triggers cloud sync.
"""

import os
import sys
import json
import asyncio
from datetime import datetime, timezone
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import (
    SessionPasswordNeededError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
    PhoneNumberInvalidError
)
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATE_FILE = "/tmp/pending_telegram_login.json"
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
load_dotenv(os.path.join(BASE_DIR, ".env"))

API_ID = int(os.getenv("TELEGRAM_API_ID", "37321306"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "5cd9e5bbfb572a4429a0c54774153b47")
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")


async def request_code(phone: str):
    phone = phone.strip()
    if not phone.startswith("+"):
        phone = "+" + phone

    client = TelegramClient(StringSession(), API_ID, API_HASH)
    try:
        await client.connect()
        print(f"📡 Connected to Telegram DC. Requesting code for {phone}...")
        sent_code = await client.send_code_request(phone)
        temp_session = client.session.save()
        
        state = {
            "phone": phone,
            "phone_code_hash": sent_code.phone_code_hash,
            "temp_session": temp_session,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
            
        print(f"✅ SUCCESS: Verification code sent by Telegram to {phone}!")
        print(f"Phone Code Hash: {sent_code.phone_code_hash}")
        return True
    except PhoneNumberInvalidError:
        print(f"❌ Error: Phone number {phone} is invalid according to Telegram.")
        return False
    except Exception as e:
        print(f"❌ Error requesting code: {type(e).__name__}: {e}")
        return False
    finally:
        await client.disconnect()


async def signin(code: str, password: str = None):
    if not os.path.exists(STATE_FILE):
        print(f"❌ Error: No pending login state found at {STATE_FILE}. Run 'request <phone>' first.")
        return False

    with open(STATE_FILE, "r") as f:
        state = json.load(f)

    phone = state["phone"]
    phone_code_hash = state["phone_code_hash"]
    temp_session = state["temp_session"]

    code = str(code).strip().replace("-", "").replace(" ", "")

    client = TelegramClient(StringSession(temp_session), API_ID, API_HASH)
    try:
        await client.connect()
        try:
            await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        except SessionPasswordNeededError:
            if not password:
                print(f"🔒 2FA_REQUIRED: Two-Factor Authentication password is required for {phone}.")
                return "2FA_REQUIRED"
            print("🔒 Submitting 2FA Cloud Password...")
            await client.sign_in(password=password)

        me = await client.get_me()
        new_session = client.session.save()
        full_name = f"{me.first_name or ''} {me.last_name or ''}".strip()
        uid = me.id

        print("=" * 60)
        print(" 🎉 LOGIN SUCCESSFUL!")
        print(f" Name:     {full_name}")
        print(f" UID:      {uid}")
        print(f" Username: @{me.username}")
        print(f" Phone:    {phone}")
        print("=" * 60)

        # 1. Update accounts.json
        if os.path.exists(ACCOUNTS_FILE):
            with open(ACCOUNTS_FILE, "r") as f:
                accounts = json.load(f)
            
            matched = False
            for a in accounts:
                if str(a.get("user_id")) == str(uid) or a.get("phone") == phone:
                    a["session_string"] = new_session
                    a["updated_at"] = datetime.now(timezone.utc).isoformat()
                    a["status"] = "active"
                    matched = True
                    break
            
            if not matched:
                accounts.append({
                    "name": full_name,
                    "username": me.username,
                    "user_id": uid,
                    "phone": phone,
                    "session_string": new_session,
                    "status": "active",
                    "added_at": datetime.now(timezone.utc).isoformat()
                })
            
            with open(ACCOUNTS_FILE, "w") as f:
                json.dump(accounts, f, indent=2)
            print(f"✅ Updated {ACCOUNTS_FILE} with new session string.")

        # 2. Update Upstash Redis
        if UPSTASH_URL and UPSTASH_TOKEN:
            import requests
            up_h = {"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"}
            # Fetch existing account data in Redis if any
            r = requests.get(f"{UPSTASH_URL}/get/account:{uid}", headers=up_h)
            acc_data = {}
            if r.status_code == 200 and r.json().get("result"):
                raw_val = r.json()["result"]
                try:
                    acc_data = json.loads(raw_val)
                    while isinstance(acc_data, str):
                        acc_data = json.loads(acc_data)
                except Exception:
                    acc_data = {}
            
            acc_data["name"] = full_name
            acc_data["username"] = me.username
            acc_data["user_id"] = uid
            acc_data["phone"] = phone
            acc_data["session_string"] = new_session
            acc_data["status"] = "active"
            acc_data["updated_at"] = datetime.now(timezone.utc).isoformat()

            sr = requests.post(
                f"{UPSTASH_URL}/set/account:{uid}",
                headers=up_h,
                json=json.dumps(acc_data)
            )
            print(f"✅ Synced fresh session to Upstash Redis (status: {sr.status_code}).")

        # 3. Clean up pending state file
        try:
            os.remove(STATE_FILE)
        except Exception:
            pass

        return True
    except PhoneCodeInvalidError:
        print("❌ Error: Verification code is invalid.")
        return False
    except PhoneCodeExpiredError:
        print("❌ Error: Verification code has expired. Request a new one.")
        return False
    except Exception as e:
        print(f"❌ Login error: {type(e).__name__}: {e}")
        return False
    finally:
        await client.disconnect()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 session_refresher.py request <phone_number>")
        print("  python3 session_refresher.py signin <code> [2fa_password]")
        sys.exit(1)

    cmd = sys.argv[1].lower()
    if cmd == "request":
        if len(sys.argv) < 3:
            print("❌ Phone number required: python3 session_refresher.py request +8801...")
            sys.exit(1)
        asyncio.run(request_code(sys.argv[2]))
    elif cmd in ["signin", "verify"]:
        if len(sys.argv) < 3:
            print("❌ Code required: python3 session_refresher.py signin 12345 [password]")
            sys.exit(1)
        code_arg = sys.argv[2]
        pwd_arg = sys.argv[3] if len(sys.argv) > 3 else None
        asyncio.run(signin(code_arg, pwd_arg))
    else:
        print(f"❌ Unknown command: {cmd}")
        sys.exit(1)

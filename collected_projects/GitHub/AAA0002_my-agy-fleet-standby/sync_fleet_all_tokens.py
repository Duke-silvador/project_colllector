#!/usr/bin/env python3
"""
sync_fleet_all_tokens.py
=============================================================================
BIDIRECTIONAL 11-BOT TOKEN SYNCHRONIZER & STATE UNIFIER
=============================================================================
Synchronizes all 11 bot initData tokens across all 21 accounts between:
  1. Upstash Redis `fleet:tokens:{uid}` (individual account keys)
  2. Upstash Redis `miniapp_tokens` & `fleet_miniapp_tokens` (master aggregated dictionaries)
  3. Local `accounts.json`
  4. Local `fleet_miniapp_tokens.json`
  5. Cloudflare Edge KV (via Primary Edge Gateway Node 4 /api/tokens)
"""

import os
import json
import time
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

env = {}
env_file = os.path.join(BASE_DIR, ".env")
if os.path.exists(env_file):
    with open(env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip("\"'\"'")

UPSTASH_URL = os.getenv("UPSTASH_URL") or env.get("UPSTASH_URL")
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN") or env.get("UPSTASH_TOKEN")
CF_SECRET_KEY = os.getenv("CF_SECRET_KEY") or env.get("CF_SECRET_KEY", "")

PRIMARY_EDGE_NODE = "https://restore-agy.agorameet.workers.dev"

TARGET_BOTS = [
    "mrg",
    "atf",
    "victors",
    "kynex",
    "pepegram",
    "adxearn",
    "diggo",
    "chickenland",
    "grouchemine",
    "lumeon",
    "earnvault"
]

TOKEN_KEYS = [
    "mrg_init_data",
    "atf_init_data",
    "victors_init_data",
    "kynex_init_data",
    "pepegram_init_data",
    "adxearn_init_data",
    "diggo_init_data",
    "chickenland_init_data",
    "grouchemine_init_data",
    "lumeon_init_data",
    "earnvault_init_data",
    "diggo_jwt",
    # Aliases
    "pepe_init_data",
    "adx_init_data",
    "chicken_init_data",
    "grc_init_data",
]

def upstash_get(key: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return None
    try:
        url = f"{UPSTASH_URL}/get/{key}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            val = data.get("result")
            if val:
                return json.loads(val) if isinstance(val, str) else val
    except Exception as e:
        print(f"  ⚠️ Error getting {key} from Upstash: {e}")
    return None

def upstash_set(key: str, data: dict):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return False
    try:
        url = f"{UPSTASH_URL}/set/{key}"
        payload = json.dumps(data)
        req = urllib.request.Request(
            url,
            data=payload.encode("utf-8"),
            headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status == 200
    except Exception as e:
        print(f"  ⚠️ Error setting {key} in Upstash: {e}")
    return False

def upstash_get_keys(pattern: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return []
    try:
        url = f"{UPSTASH_URL}/keys/{pattern}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            return data.get("result") or []
    except Exception as e:
        print(f"  ⚠️ Error getting keys for {pattern}: {e}")
    return []

def main():
    print("=" * 70)
    print("🚀 AAA AUTO FLEET 11-BOT TOKEN SYNCHRONIZER & STATE UNIFIER")
    print("=" * 70)

    # 1. Load accounts.json
    accs_file = os.path.join(BASE_DIR, "accounts.json")
    accs = []
    if os.path.exists(accs_file):
        with open(accs_file, "r", encoding="utf-8") as f:
            accs = json.load(f)
    print(f"📁 Loaded {len(accs)} accounts from accounts.json")

    # Map accounts by str(account_id)
    accs_by_id = {}
    for a in accs:
        uid = str(a.get("account_id") or a.get("id") or a.get("uid", ""))
        if uid:
            accs_by_id[uid] = a

    # 2. Load individual Upstash Redis keys `fleet:tokens:{uid}`
    redis_keys = upstash_get_keys("fleet:tokens:*")
    print(f"🌐 Found {len(redis_keys)} fleet:tokens keys in Upstash Redis")

    redis_tokens_by_id = {}
    for k in redis_keys:
        uid = k.split(":")[-1]
        data = upstash_get(k)
        if data and isinstance(data, dict):
            redis_tokens_by_id[uid] = data

    print(f"📦 Successfully fetched tokens for {len(redis_tokens_by_id)} accounts from Upstash")

    # 3. Load existing miniapp_tokens from Upstash
    miniapp_tokens = upstash_get("miniapp_tokens") or {}
    print(f"📦 Existing Upstash miniapp_tokens entries: {len(miniapp_tokens)}")

    # 4. Bidirectional merge for all known accounts
    all_uids = set(accs_by_id.keys()) | set(redis_tokens_by_id.keys()) | set(miniapp_tokens.keys())
    print(f"🎯 Total unique accounts across all sources: {len(all_uids)}")

    master_miniapp_tokens = {}
    updated_accs = []

    for uid in sorted(all_uids, key=lambda x: str(x)):
        acc = accs_by_id.get(uid, {})
        redis_tok = redis_tokens_by_id.get(uid, {})
        m_tok = miniapp_tokens.get(uid, {})

        # Merge tokens: prefer redis_tok, fallback to acc, fallback to m_tok
        merged_tokens = {}

        # First collect all token fields
        for k in TOKEN_KEYS:
            val = redis_tok.get(k) or acc.get(k) or m_tok.get(k)
            if val:
                merged_tokens[k] = val

        # Ensure canonical aliases are populated
        if merged_tokens.get("pepegram_init_data") and not merged_tokens.get("pepe_init_data"):
            merged_tokens["pepe_init_data"] = merged_tokens["pepegram_init_data"]
        elif merged_tokens.get("pepe_init_data") and not merged_tokens.get("pepegram_init_data"):
            merged_tokens["pepegram_init_data"] = merged_tokens["pepe_init_data"]

        if merged_tokens.get("adxearn_init_data") and not merged_tokens.get("adx_init_data"):
            merged_tokens["adx_init_data"] = merged_tokens["adxearn_init_data"]
        elif merged_tokens.get("adx_init_data") and not merged_tokens.get("adxearn_init_data"):
            merged_tokens["adxearn_init_data"] = merged_tokens["adx_init_data"]

        if merged_tokens.get("chickenland_init_data") and not merged_tokens.get("chicken_init_data"):
            merged_tokens["chicken_init_data"] = merged_tokens["chickenland_init_data"]
        elif merged_tokens.get("chicken_init_data") and not merged_tokens.get("chickenland_init_data"):
            merged_tokens["chickenland_init_data"] = merged_tokens["chicken_init_data"]

        if merged_tokens.get("grouchemine_init_data") and not merged_tokens.get("grc_init_data"):
            merged_tokens["grc_init_data"] = merged_tokens["grouchemine_init_data"]
        elif merged_tokens.get("grc_init_data") and not merged_tokens.get("grouchemine_init_data"):
            merged_tokens["grouchemine_init_data"] = merged_tokens["grc_init_data"]

        name = acc.get("name") or redis_tok.get("name") or m_tok.get("name") or f"Account_{uid}"
        phone = acc.get("phone") or redis_tok.get("phone") or m_tok.get("phone") or ""

        # Update accounts.json entry
        if not acc:
            acc = {
                "account_id": uid,
                "name": name,
                "phone": phone
            }
        for k, v in merged_tokens.items():
            acc[k] = v
        acc["miniapp_tokens_synced"] = True
        updated_accs.append(acc)

        # Update master_miniapp_tokens entry
        entry = {
            "account_id": uid,
            "uid": uid,
            "name": name,
            "phone": phone,
            "synced_at": time.time(),
            "updated_at": time.time(),
            **merged_tokens
        }
        master_miniapp_tokens[uid] = entry

        # Update individual Upstash Redis key if missing any bot tokens
        needs_redis_update = False
        for k, v in merged_tokens.items():
            if k not in redis_tok:
                needs_redis_update = True
                break
        if needs_redis_update:
            updated_redis_payload = {**redis_tok, **entry}
            upstash_set(f"fleet:tokens:{uid}", updated_redis_payload)

    # 5. Save updated accounts.json
    with open(accs_file, "w", encoding="utf-8") as f:
        json.dump(updated_accs, f, indent=2)
    print(f"✅ Saved updated accounts.json ({len(updated_accs)} accounts)")

    # 6. Save fleet_miniapp_tokens.json
    miniapp_json_file = os.path.join(BASE_DIR, "fleet_miniapp_tokens.json")
    with open(miniapp_json_file, "w", encoding="utf-8") as f:
        json.dump(master_miniapp_tokens, f, indent=2)
    print(f"✅ Saved local fleet_miniapp_tokens.json ({len(master_miniapp_tokens)} accounts)")

    # 7. Write master_miniapp_tokens to Upstash Redis `miniapp_tokens` & `fleet_miniapp_tokens`
    s1 = upstash_set("miniapp_tokens", master_miniapp_tokens)
    s2 = upstash_set("fleet_miniapp_tokens", master_miniapp_tokens)
    print(f"✅ Synced master dictionary to Upstash miniapp_tokens (success={s1})")
    print(f"✅ Synced master dictionary to Upstash fleet_miniapp_tokens (success={s2})")

    # 8. Push to Primary Edge Gateway Node 4 (/api/tokens)
    print(f"🌐 Syncing all {len(master_miniapp_tokens)} accounts to Edge Gateway Node 4 KV...")
    synced_edge = 0
    headers = {
        "Authorization": f"Bearer {CF_SECRET_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    for uid, tok_dict in master_miniapp_tokens.items():
        try:
            req = urllib.request.Request(
                f"{PRIMARY_EDGE_NODE}/api/tokens",
                data=json.dumps(tok_dict).encode("utf-8"),
                headers=headers
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status in (200, 201):
                    synced_edge += 1
        except Exception as ee:
            pass

    print(f"✅ Synced {synced_edge}/{len(master_miniapp_tokens)} accounts directly to Edge Gateway Node 4 KV")

    # 9. Audit and verify final state
    print("\n" + "=" * 70)
    print("📊 FINAL VERIFICATION: 11-BOT COVERAGE AUDIT")
    print("=" * 70)
    for bot in TARGET_BOTS:
        acc_c = sum(1 for a in updated_accs if a.get(f"{bot}_init_data") or a.get(f"{bot}_token"))
        miniapp_c = sum(1 for uid, d in master_miniapp_tokens.items() if d.get(f"{bot}_init_data") or d.get(f"{bot}_token"))
        status = "✅" if acc_c == 21 and miniapp_c == 21 else "⚠️"
        print(f"  {status} {bot:12}: accounts.json={acc_c}/21 | miniapp_tokens={miniapp_c}/21")

    print("\n🎉 Token state synchronization and database unification complete!")

if __name__ == "__main__":
    main()

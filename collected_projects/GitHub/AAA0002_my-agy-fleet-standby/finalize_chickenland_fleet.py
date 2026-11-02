#!/usr/bin/env python3
"""
finalize_chickenland_fleet.py
=============================================================================
FINALIZES CHICKEN LAND FLEET-WIDE FARMING ACROSS ALL FLEET ACCOUNTS
=============================================================================
1. Syncs all chickenland_init_data tokens to Upstash Redis with proper JSON encoding.
2. Ensures human verification (auto-solves turnstile / picture pick captcha).
3. Claims 1,000 welcome coins for any accounts that haven't claimed yet.
4. Buys basic hens to start / expand egg laying across the entire fleet.
5. Collects & sells eggs, sweeps daily checkin and tasks.
6. Claims all accumulated referral rewards on Master Account (6727787768).
=============================================================================
"""

import os
import sys
import json
import time
import base64
import urllib.parse
import urllib.request
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
TOKENS_FILE = os.path.join(BASE_DIR, "fleet_miniapp_tokens.json")

load_dotenv(os.path.join(BASE_DIR, ".env"))
UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL", "").rstrip("/")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

from chickenland_miner import ChickenLandMiner

def sync_upstash_key(key: str, value: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return False
    try:
        url = f"{UPSTASH_URL}/set/{key}"
        data = json.dumps(value).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={
                "Authorization": f"Bearer {UPSTASH_TOKEN}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return True
    except Exception:
        return False

def main():
    if not os.path.exists(TOKENS_FILE):
        print("Tokens file not found!")
        return

    tokens_db = json.load(open(TOKENS_FILE))
    accounts = json.load(open(ACCOUNTS_FILE)) if os.path.exists(ACCOUNTS_FILE) else []
    acc_map = {str(a.get("user_id")): a for a in accounts}

    total = len(tokens_db)
    print("="*80)
    print(f"🐔 FINALIZING CHICKEN LAND FARMING & CAPTCHA RESOLUTION ACROSS {total} ACCOUNTS")
    print("="*80)

    # 1. Sync tokens to Upstash
    synced = 0
    for uid, tdata in tokens_db.items():
        tok = tdata.get("chickenland_init_data")
        if tok:
            if sync_upstash_key(f"fleet:tokens:{uid}:chickenland_init_data", tok):
                synced += 1
    print(f"✅ Synced {synced}/{total} Chicken Land tokens to Upstash Redis.\n")

    # 2. Process all worker accounts
    fleet_summary = {
        "total_hens": 0,
        "total_rate": 0,
        "total_coins": 0,
        "total_eggs": 0,
        "accounts_active": 0
    }

    worker_uids = [u for u in tokens_db.keys() if u != "6727787768"]
    for idx, uid in enumerate(worker_uids, 1):
        tdata = tokens_db[uid]
        tok = tdata.get("chickenland_init_data")
        acc = acc_map.get(uid, {})
        name = acc.get("name", tdata.get("name", f"Worker {uid}"))
        
        if not tok:
            print(f"[{idx:02d}/{len(worker_uids)}] ⚠️ {name} ({uid}): Missing Chicken Land token")
            continue

        miner = ChickenLandMiner(tok, user_id=uid)
        prof = miner.get_profile(ref="12668")
        if not prof.get("ok"):
            print(f"[{idx:02d}/{len(worker_uids)}] ❌ {name} ({uid}): Auth failed ({prof.get('description')})")
            continue

        u_info = prof.get("result", {}).get("user", {})
        
        # Ensure human
        if not u_info.get("human"):
            print(f"[{idx:02d}/{len(worker_uids)}] 🧩 Solving human captcha for {name} ({uid})...")
            if miner.ensure_human():
                time.sleep(1)
                print(f"  -> Human verified ✅")
            else:
                print(f"  -> Human verification failed ⚠️")

        # Claim welcome if needed
        if not u_info.get("welcome"):
            w = miner.claim_welcome()
            if w.get("ok"):
                print(f"  -> 🎁 Welcome bonus 1,000 coins claimed for {name} ({uid})")
            time.sleep(0.5)

        # Claim daily check-in
        miner.claim_daily()

        # Collect & sell eggs
        miner.collect_and_sell()

        # Quick task claims (channel, payments)
        tasks_done = set(u_info.get("tasks", []))
        for tid in ["channel", "payments", "dnews", "dpay", "dpromo"]:
            if tid not in tasks_done:
                miner.rpc("/api/task/open", {"id": tid})
                miner.rpc("/api/task", {"id": tid})

        # Buy hens if coins >= 1000
        miner.buy_hens()

        # Fetch final stats
        p_final = miner.get_profile(ref="12668")
        u_final = p_final.get("result", {}).get("user", {})
        hens = u_final.get("hens", 0)
        rate = u_final.get("rate", 0)
        coins = u_final.get("coins", 0)
        eggs = u_final.get("eggs", 0) + u_final.get("eggBal", 0)

        fleet_summary["total_hens"] += hens
        fleet_summary["total_rate"] += rate
        fleet_summary["total_coins"] += coins
        fleet_summary["total_eggs"] += eggs
        if hens > 0:
            fleet_summary["accounts_active"] += 1

        print(f"[{idx:02d}/{len(worker_uids)}] 🐔 {name} ({uid}): {hens} Hens | {rate}/h | {coins} Coins | {eggs} Eggs | {'Laying Eggs 🟢' if hens > 0 else 'Idle 🟡'}")
        
        if uid in acc_map:
            acc_map[uid]["chickenland_referral_bound"] = True
            acc_map[uid]["chickenland_hens"] = hens
            acc_map[uid]["chickenland_coins"] = coins
            acc_map[uid]["chickenland_rate"] = rate

        time.sleep(0.2)

    # 3. Process Master Account (6727787768)
    master_uid = "6727787768"
    master_tok = tokens_db.get(master_uid, {}).get("chickenland_init_data")
    if master_tok:
        print("\n" + "="*80)
        print("👑 MASTER ACCOUNT ARIF HOSSAIN (6727787768) - COMMISSION HARVEST & EXPANSION")
        print("="*80)
        m_miner = ChickenLandMiner(master_tok, user_id=master_uid)
        
        # Ensure human
        m_prof = m_miner.get_profile()
        m_user = m_prof.get("result", {}).get("user", {})
        if not m_user.get("human"):
            m_miner.ensure_human()
            time.sleep(1)

        # Claim referrals
        ref_res = m_miner.claim_referrals()
        ref_coins = ref_res.get("result", {}).get("coins", 0) if ref_res.get("ok") else 0
        print(f"  💰 Claimed referral commissions: +{ref_coins} Coins!")

        # Sell eggs & daily check-in
        m_miner.claim_daily()
        m_miner.collect_and_sell()

        # Buy hens with all accumulated coins
        bought = m_miner.buy_hens(max_count=50)
        print(f"  🐔 Bought new hens for Master flock: +{bought} Hens!")

        # Basket upgrade if affordable
        up = m_miner.upgrade_basket()
        if up:
            print(f"  🧺 Upgraded Master Basket capacity!")

        # Final Master Stats
        m_final = m_miner.get_profile()
        m_fuser = m_final.get("result", {}).get("user", {})
        m_hens = m_fuser.get("hens", 0)
        m_rate = m_fuser.get("rate", 0)
        m_coins = m_fuser.get("coins", 0)
        m_eggs = m_fuser.get("eggs", 0) + m_fuser.get("eggBal", 0)

        fleet_summary["total_hens"] += m_hens
        fleet_summary["total_rate"] += m_rate
        fleet_summary["total_coins"] += m_coins
        fleet_summary["total_eggs"] += m_eggs
        fleet_summary["accounts_active"] += 1

        print(f"  👑 Master Final Status: {m_hens} Hens | {m_rate}/h rate | {m_coins} Coins | {m_eggs} Eggs | ${m_fuser.get('withdrawnUsd', 0)} USD withdrawn")
        
        if master_uid in acc_map:
            acc_map[master_uid]["chickenland_referral_bound"] = True
            acc_map[master_uid]["chickenland_hens"] = m_hens
            acc_map[master_uid]["chickenland_coins"] = m_coins
            acc_map[master_uid]["chickenland_rate"] = m_rate

    # Save accounts
    with open(ACCOUNTS_FILE, "w") as f:
        json.dump(list(acc_map.values()), f, indent=2)

    print("\n" + "="*80)
    print("🌟 CHICKEN LAND FLEET TOTAL SUMMARY")
    print(f"• Active Laying Accounts: {fleet_summary['accounts_active']}/{total}")
    print(f"• Total Fleet Hens: {fleet_summary['total_hens']}")
    print(f"• Total Fleet Production Rate: {fleet_summary['total_rate']} Eggs/hour ({fleet_summary['total_rate']*24:,} Eggs/day)")
    print(f"• Total Fleet Coins Balance: {fleet_summary['total_coins']:,} Coins")
    print(f"• Total Fleet Egg Balance: {fleet_summary['total_eggs']:,} Eggs")
    print("="*80)

if __name__ == "__main__":
    main()

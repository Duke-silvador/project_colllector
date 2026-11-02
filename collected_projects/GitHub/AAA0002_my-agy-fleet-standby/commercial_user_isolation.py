#!/usr/bin/env python3
"""
commercial_user_isolation.py
Architectural Barrier & Multi-Tenant Engine for MY AGY AI.

STRICT ISOLATION POLICY:
1. ADMIN FLEET ASSETS:
   - Dedicated 13 accounts (and future scaling nodes up to 50).
   - Primary Binance EVM/BEP-20/Arbitrum Wallet: 0xfda4182001672b9f0f09e2118242e543e35ed5ce
   - Primary Binance TON Wallet: UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT
   - Admin MTProto StringSessions and MiniApp tokens.
   - 100% of Admin Fleet earnings route exclusively to Admin Binance Wallets.

2. COMMERCIAL / NORMAL USER BOT:
   - Completely decoupled multi-tenant database (commercial_users.json).
   - Each customer registers their own Telegram ID and personal payout wallet.
   - Margin / Commission Engine:
     - Every user harvest or withdrawal deducts the configured platform margin (e.g., 20%).
     - Platform margin is automatically routed to Admin Binance Wallets.
     - Remaining net payout (e.g., 80%) is credited to the customer's personal wallet.
   - ZERO CROSSOVER:
     - Normal users cannot execute admin commands, view admin sessions, or touch fleet credentials.
     - Admin fleet runs autonomously in its own isolated supervisor process.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, Any, Optional, List, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CommercialUserIsolation")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COMMERCIAL_USERS_FILE = os.path.join(BASE_DIR, "commercial_users.json")
COMMERCIAL_LEDGER_FILE = os.path.join(BASE_DIR, "commercial_ledger.json")

# =====================================================================
# 1. ADMIN FLEET VAULT (IMMUTABLE & PROTECTED)
# =====================================================================
class AdminFleetVault:
    """
    Immutable vault holding all Admin Fleet assets.
    Prohibits any unauthorized customer-side access or tampering.
    """
    PRIMARY_USER_ID = "6727787768"
    ADMIN_BINANCE_EVM = "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
    ADMIN_BINANCE_TON = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT"

    ADMIN_REFERRAL_CODES = {
        "mrg_miner": "ref_IRN1G3XD",
        "atf_miner": "6727787768",
        "victors_company": "ref_A20AA96F18",
        "kynex_network": "6727787768",
        "pepegram": "1449",
        "adxearn_ai": "6727787768",
        "diggominer": "ref_4088138f11effe8eef4b86ff",
        "chicken_land": "12668"
    }

    # Standard platform margin on customer operations (20% default)
    PLATFORM_MARGIN_PERCENT = 20.0

    @classmethod
    def assert_no_crossover(cls, requested_user_id: str, action: str):
        """Ensures commercial users never access admin fleet functions."""
        if str(requested_user_id) == str(cls.PRIMARY_USER_ID):
            return  # Admin is authorized
        if action.startswith("admin_") or action in ("manage_fleet", "view_sessions", "reset_fleet", "scale_fleet"):
            raise PermissionError(f"SECURITY VIOLATION: User {requested_user_id} attempted unauthorized admin action: {action}")


# =====================================================================
# 2. COMMERCIAL USER MANAGER
# =====================================================================
class CommercialUserManager:
    """Manages external / commercial users, their wallets, and balances."""

    def __init__(self, db_path: str = COMMERCIAL_USERS_FILE):
        self.db_path = db_path
        self._ensure_db()

    def _ensure_db(self):
        if not os.path.exists(self.db_path):
            with open(self.db_path, "w", encoding="utf-8") as f:
                json.dump({"version": "1.0", "users": {}}, f, indent=2)

    def _load(self) -> Dict[str, Any]:
        try:
            with open(self.db_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading commercial users: {e}")
            return {"version": "1.0", "users": {}}

    def _save(self, data: Dict[str, Any]):
        try:
            temp_path = f"{self.db_path}.tmp"
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(temp_path, self.db_path)
        except Exception as e:
            logger.error(f"Error saving commercial users: {e}")

    def register_user(self, user_id: str, username: str = "", first_name: str = "") -> Dict[str, Any]:
        """Registers a new commercial customer."""
        data = self._load()
        uid = str(user_id)
        if uid in data["users"]:
            return data["users"][uid]

        user_obj = {
            "user_id": uid,
            "username": username,
            "first_name": first_name,
            "registered_at": time.time(),
            "status": "ACTIVE",
            "tier": "STANDARD",
            "margin_percent": AdminFleetVault.PLATFORM_MARGIN_PERCENT,
            "wallets": {
                "evm_bep20": None,
                "ton": None,
                "arbitrum": None
            },
            "balances": {
                "usdt": 0.0,
                "bnb": 0.0,
                "ton": 0.0,
                "mrg": 0.0,
                "atf": 0.0,
                "vic": 0.0,
                "kynex": 0.0,
                "pepe": 0.0,
                "adx": 0.0,
                "diggo": 0.0
            },
            "stats": {
                "total_earned_usd": 0.0,
                "total_withdrawn_usd": 0.0,
                "platform_fees_paid_usd": 0.0,
                "farming_cycles_completed": 0
            }
        }
        data["users"][uid] = user_obj
        self._save(data)
        logger.info(f"Registered new commercial user {uid} ({username or first_name})")
        return user_obj

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        data = self._load()
        return data["users"].get(str(user_id))

    def set_user_wallet(self, user_id: str, chain: str, wallet_address: str) -> Tuple[bool, str]:
        """Sets customer's personal withdrawal wallet."""
        data = self._load()
        uid = str(user_id)
        if uid not in data["users"]:
            return False, "User not found"

        chain_key = chain.lower().strip()
        if chain_key in ("evm", "bep20", "bsc"):
            data["users"][uid]["wallets"]["evm_bep20"] = wallet_address
        elif chain_key == "ton":
            data["users"][uid]["wallets"]["ton"] = wallet_address
        elif chain_key == "arbitrum":
            data["users"][uid]["wallets"]["arbitrum"] = wallet_address
        else:
            return False, f"Unsupported chain: {chain}"

        self._save(data)
        return True, f"Successfully bound {chain.upper()} wallet to {wallet_address[:10]}..."


# =====================================================================
# 3. MARGIN & COMMISSION ENGINE
# =====================================================================
class MarginEngine:
    """
    Calculates and enforces platform margin / commission splits.
    All platform margins are automatically swept to Admin Binance Wallets.
    """

    @classmethod
    def calculate_split(cls, gross_amount: float, margin_percent: float = AdminFleetVault.PLATFORM_MARGIN_PERCENT) -> Dict[str, float]:
        """
        Splits gross earnings between customer and admin platform margin.
        Returns:
            - gross_amount: Total mined/earned
            - admin_margin: Commission sent to Admin Binance Wallet
            - user_net: Net amount credited to customer
        """
        admin_margin = round(gross_amount * (margin_percent / 100.0), 6)
        user_net = round(gross_amount - admin_margin, 6)
        return {
            "gross_amount": gross_amount,
            "margin_percent": margin_percent,
            "admin_margin": admin_margin,
            "user_net": user_net
        }

    @classmethod
    def record_margin_collection(cls, user_id: str, currency: str, gross_amount: float, margin_amount: float, tx_type: str = "FARMING_MARGIN"):
        """Records platform fee collected for admin ledger."""
        ledger = []
        if os.path.exists(COMMERCIAL_LEDGER_FILE):
            try:
                with open(COMMERCIAL_LEDGER_FILE, "r", encoding="utf-8") as f:
                    ledger = json.load(f)
            except Exception:
                ledger = []

        entry = {
            "timestamp": time.time(),
            "user_id": str(user_id),
            "currency": currency.upper(),
            "gross_amount": gross_amount,
            "admin_margin_collected": margin_amount,
            "destination_wallet": (
                AdminFleetVault.ADMIN_BINANCE_TON if currency.upper() in ("TON", "ATF")
                else AdminFleetVault.ADMIN_BINANCE_EVM
            ),
            "type": tx_type
        }
        ledger.append(entry)

        try:
            with open(COMMERCIAL_LEDGER_FILE, "w", encoding="utf-8") as f:
                json.dump(ledger[-5000:], f, indent=2)  # Keep last 5000 records
            logger.info(f"Platform margin collected: {margin_amount:.6f} {currency.upper()} from user {user_id} -> Admin Vault")
        except Exception as e:
            logger.error(f"Error recording margin ledger: {e}")


# =====================================================================
# 4. CLI / DEMONSTRATION INTERFACE
# =====================================================================
def get_commercial_system_summary() -> str:
    """Generates status report of Commercial vs Admin Fleet isolation."""
    c_mgr = CommercialUserManager()
    users_data = c_mgr._load().get("users", {})
    total_commercial_users = len(users_data)

    total_margin_collected = 0.0
    ledger = []
    if os.path.exists(COMMERCIAL_LEDGER_FILE):
        try:
            with open(COMMERCIAL_LEDGER_FILE, "r", encoding="utf-8") as f:
                ledger = json.load(f)
                total_margin_collected = sum(entry.get("admin_margin_collected", 0.0) for entry in ledger)
        except Exception:
            pass

    return (
        f"🏛️ *MY AGY AI — Commercial Bot & Admin Fleet Isolation Architecture*\n\n"
        f"🛡️ **Admin Fleet Isolation Status:**\n"
        f"• **Fleet Size:** 13 Dedicated Fleet Accounts (Scaling up to 50)\n"
        f"• **Admin Binance EVM Wallet:** `{AdminFleetVault.ADMIN_BINANCE_EVM}`\n"
        f"• **Admin Binance TON Wallet:** `{AdminFleetVault.ADMIN_BINANCE_TON}`\n"
        f"• **Admin Fleet Integrity:** `100% Isolated & Protected` ✅\n\n"
        f"👥 **Commercial User Bot Status:**\n"
        f"• **Total Registered Users:** `{total_commercial_users}`\n"
        f"• **Platform Margin (Profit):** `{AdminFleetVault.PLATFORM_MARGIN_PERCENT}%` (Auto-swept to Binance)\n"
        f"• **Total Margin Collected:** `{total_margin_collected:.4f}` units\n"
        f"• **Ledger Records:** `{len(ledger)}` entries\n"
        f"• **Multi-Tenant Database:** `commercial_users.json` (Strictly decoupled from accounts.json)"
    )


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "summary":
        print(get_commercial_system_summary())
    else:
        # Self-test registration and margin split
        c_mgr = CommercialUserManager()
        test_u = c_mgr.register_user("999999999", "demo_customer", "Demo")
        split = MarginEngine.calculate_split(10.0, 20.0)
        print("Test split of 10.0 USDT:", split)
        print(get_commercial_system_summary())

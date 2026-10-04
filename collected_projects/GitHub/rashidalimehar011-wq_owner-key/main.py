#!/usr/bin/env python3
# ═══════════════════════════════════════════
#     👑  OWNER-KEY  👑
#     Made by: Rashid Ali Mehar
#     GitHub: github.com/rashidalimehar
# ═══════════════════════════════════════════

import os
import sys

BANNER = """
╔═══════════════════════════════════════╗
║   👑  OWNER-KEY  👑                   ║
║   By: Rashid Ali Mehar                ║
╚═══════════════════════════════════════╝
"""

OWNER_PASS = "Rashid@2024"   # <-- apna password yahan change kar sakte ho

def check_owner():
    print(BANNER)
    print("🔐 Owner Verification Required")
    entered = input("Enter Owner Key: ").strip()
    if entered != OWNER_PASS:
        print("\n❌ Access Denied! Ye tool sirf Owner ke liye hai.")
        sys.exit(1)
    print("\n✅ Welcome, Rashid Ali Mehar! 👑\n")

def main():
    check_owner()
    print("► Tool ready.")
    print("► Folder:", os.getcwd())
    print("\n✅ Kaam mukammal.")

if __name__ == "__main__":
    main()

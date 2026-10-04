#!/usr/bin/env python3
# ═══════════════════════════════════════════
#     👑  OWNER APPROVAL CHECKER  👑
#     By: Rashid Ali Mehar
# ═══════════════════════════════════════════

import sys
import os

BANNER = """
╔═══════════════════════════════════════════╗
║   👑  OWNER APPROVAL REQUIRED  👑         ║
║   By: Rashid Ali Mehar                    ║
╚═══════════════════════════════════════════╝
"""

# ✅ DEFAULT APPROVED KEYS (code ke andar)
DEFAULT_KEYS = [
    "Rashid@2024",      # Owner - Rashid Ali Mehar
    "DOST123",          # Dost 1
    "ALI456",           # Dost 2
]

def load_keys():
    """Approved keys load karo"""
    keys = list(DEFAULT_KEYS)  # Default keys se shuru karo
    
    # Agar local owner_keys.txt mojood hai, uski keys bhi add karo
    key_file = os.path.join(os.path.dirname(__file__), "owner_keys.txt")
    try:
        with open(key_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    if line not in keys:
                        keys.append(line)
    except FileNotFoundError:
        pass  # File nahi hai to koi masla nahi
    
    return keys

def verify():
    """Check karo ke user approved hai ya nahi"""
    print(BANNER)
    print("🔐 Ye tool sirf approved users ke liye hai.")
    print("")
    
    entered = input("Enter Access Key: ").strip()
    
    keys = load_keys()
    
    if entered in keys:
        # Owner check
        if entered == "Rashid@2024":
            print("\n✅ Welcome, Owner! 👑")
        else:
            print(f"\n✅ Welcome! Access Granted.")
        print("► Tool start ho raha hai...\n")
        return True
    else:
        print("\n❌ Access Denied!")
        print("   Aap authorized nahi hain.")
        print("   Owner se contact karein: Rashid Ali Mehar")
        print("")
        sys.exit(1)

if __name__ == "__main__":
    verify()

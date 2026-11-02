#!/usr/bin/env python3
"""
session_guardian.py
=============================================================================
AAA AUTO / MY AGY AI — SESSION GUARDIAN & ANTI-IDLE HEARTBEAT
=============================================================================
1. Periodically sends keepalive pings to Render Node 2 and Cloudflare Edge.
2. Touches local terminal / pty if available to prevent shell idle timeout.
3. Logs heartbeat health to /tmp/session_guardian.log.
"""

import os
import sys
import time
import urllib.request
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [GUARDIAN] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/tmp/session_guardian.log", mode="a")
    ]
)
logger = logging.getLogger("session_guardian")

RENDER_NODE3_URL = "https://my-agy-fleet-standby-node3.onrender.com/health"
RENDER_NODE2_URL = "https://my-agy-fleet-standby-node2.onrender.com/health"
CF_URL = "https://restore-agy.agorameet.workers.dev/health"

def ping_url(url: str):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "SessionGuardian/1.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.status
    except Exception as e:
        return f"ERR: {e}"

def touch_pty():
    try:
        # Check /dev/tty or pts
        if os.path.exists("/dev/tty"):
            with open("/dev/tty", "w") as f:
                f.flush()
    except Exception:
        pass

def main():
    logger.info("🛡️ Session Guardian started. Anti-idle keepalive active.")
    r3_stat = ping_url(RENDER_NODE3_URL)
    r2_stat = ping_url(RENDER_NODE2_URL)
    c_stat = ping_url(CF_URL)
    touch_pty()
    logger.info(f"Heartbeat sent: Render Node 3 -> {r3_stat} | Render Node 2 -> {r2_stat} | CF Edge -> {c_stat}")

if __name__ == "__main__":
    main()

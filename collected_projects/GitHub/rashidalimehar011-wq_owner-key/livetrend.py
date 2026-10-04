#!/usr/bin/env python3
# ═══════════════════════════════════════════
#     🌐  L I V E   T R E N D  🌐
#     Real-Time Trend Analyzer
#     By: Rashid Ali Mehar
# ═══════════════════════════════════════════

import requests
from datetime import datetime
import xml.etree.ElementTree as ET

BANNER = """
╔═══════════════════════════════════════════╗
║   🌐  L I V E   T R E N D  🌐             ║
║   Real-Time Analyzer                      ║
║   By: Rashid Ali Mehar                    ║
╚═══════════════════════════════════════════╝
"""

# Google Trends Pakistan ka RSS feed
TREND_URL = "https://trends.google.com/trending/rss?geo=PK"

def fetch_trends():
    print(BANNER)
    print(f"► Fetching live trends... {datetime.now().strftime('%d %b %Y, %I:%M %p')}")
    print("► Source: Google Trends Pakistan\n")

    try:
        # Data uthao
        response = requests.get(TREND_URL, timeout=10)
        response.raise_for_status()

        # XML parse karo
        root = ET.fromstring(response.content)
        items = root.findall(".//item")[:5]

        if not items:
            print("⚠️  Aaj koi trend data nahi mila.")
            return

        print("🔥 AAJ KE TOP 5 TRENDS (PAKISTAN):\n")
        print(f"{'#':<4}{'Trend':<45}{'Growth':<15}")
        print("─" * 70)

        for i, item in enumerate(items, 1):
            title = item.findtext("title") or "Unknown"
            traffic = item.findtext(".//{*}approx_traffic") or "N/A"

            # Title ko trim karo
            if len(title) > 42:
                title = title[:39] + "..."

            print(f"{i:<4}{title:<45}+{traffic:<15}")

        print("\n" + "═" * 70)
        print("✅ Live analysis complete!")
        print("💡 Ye trends aaj Pakistan mein sabse zyada search ho rahe hain.")
        print("► YouTube/TikTok pe in topics pe content banao!")

    except requests.exceptions.Timeout:
        print("❌ Timeout: Internet slow hai ya source available nahi.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fetch_trends()

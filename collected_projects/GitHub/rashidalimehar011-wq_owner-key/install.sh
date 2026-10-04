#!/data/data/com.termux/files/usr/bin/bash

# ═══════════════════════════════════════════
#     👑  YOUTUBE TREND ANALYZER  👑
#     One-Click Installer
#     By: Rashid Ali Mehar
# ═══════════════════════════════════════════

clear
echo "╔═══════════════════════════════════════════╗"
echo "║   👑  YOUTUBE TREND ANALYZER  👑          ║"
echo "║   By: Rashid Ali Mehar                    ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "► Setup shuru ho raha hai..."
echo ""

echo "► [1/5] Packages update..."
pkg update -y > /dev/null 2>&1
pkg upgrade -y > /dev/null 2>&1
echo "   ✔ Done"

echo "► [2/5] Python, Git, curl, termux-api install..."
pkg install -y python git curl termux-api > /dev/null 2>&1
echo "   ✔ Done"

echo "► [3/5] requests library install..."
pip install requests > /dev/null 2>&1
echo "   ✔ Done"

echo "► [4/5] Tool download..."
cd ~
if [ -d "owner-key" ]; then
    cd owner-key
    git pull > /dev/null 2>&1
else
    git clone https://github.com/rashidalimehar011-wq/owner-key.git > /dev/null 2>&1
    cd owner-key
fi
echo "   ✔ Done"

echo "► [5/5] Setup complete!"
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   ✅  SETUP COMPLETE                      ║"
echo "╚═══════════════════════════════════════════╝"
echo ""
echo "► Ab tool start ho raha hai..."
echo "► Approval ke liye WhatsApp par message jayega"
echo ""

python yt_live.py

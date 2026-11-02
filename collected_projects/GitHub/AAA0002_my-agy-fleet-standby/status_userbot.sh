#!/usr/bin/env bash
# =======================================================
# status_userbot.sh - Live Status & Fleet Health Inspector
# =======================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSION_NAME="telegram_bot"

echo "================== MY AGY AI FLEET STATUS =================="
echo "🕒 Current Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# 1. Tmux & Supervisor Status
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo "🟢 Tmux Session: '$SESSION_NAME' is ACTIVE"
else
    echo "🔴 Tmux Session: '$SESSION_NAME' is NOT FOUND"
fi

if [ -f "$DIR/supervisor.pid" ]; then
    S_PID=$(cat "$DIR/supervisor.pid" 2>/dev/null)
    if [ -n "$S_PID" ] && kill -0 "$S_PID" 2>/dev/null; then
        echo "🟢 Supervisor Daemon: Running (PID: $S_PID)"
    else
        echo "🔴 Supervisor Daemon: Stale PID ($S_PID)"
    fi
else
    echo "🟡 Supervisor Daemon: No PID file"
fi

# 2. Userbot Status
UB_PID=$(pgrep -f "userbot_refresher.py" 2>/dev/null | head -n 1)
if [ -n "$UB_PID" ]; then
    MEM_USAGE=$(ps -p "$UB_PID" -o rss= 2>/dev/null | awk '{print int($1/1024) " MB"}')
    CPU_USAGE=$(ps -p "$UB_PID" -o %cpu= 2>/dev/null | tr -d ' ')
    echo "🟢 Userbot Refresher: Running (PID: $UB_PID | RAM: $MEM_USAGE | CPU: $CPU_USAGE%)"
else
    echo "🔴 Userbot Refresher: NOT RUNNING"
fi

# 3. Fleet Summary from accounts.json & payouts.json
if [ -f "$DIR/venv/bin/python" ]; then
    $DIR/venv/bin/python -c "
import json, os
try:
    with open('$DIR/accounts.json') as f:
        accs = json.load(f)
    print(f'👥 Fleet Size: {len(accs)} accounts registered')
except Exception:
    pass

try:
    with open('$DIR/payouts.json') as f:
        p = json.load(f)
    total_bnb = sum(float(x.get('amount', 0)) for x in p)
    print(f'💰 Verified Payouts: {len(p)} withdrawals completed | Total: {total_bnb:.6f} BNB')
except Exception:
    pass
" 2>/dev/null || true
fi

# 4. Disk Usage
AVAIL_MB=$(df -m "$DIR" 2>/dev/null | awk 'NR==2 {print $4}')
echo "💾 Disk Available: ${AVAIL_MB} MB free"

echo "============================================================"
echo "Recent Activity (last 12 lines):"
tail -n 12 "$DIR/userbot.log" 2>/dev/null || echo "No log file found."
echo "============================================================"

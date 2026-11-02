#!/usr/bin/env bash
# =======================================================
# STOP SCRIPT - STOP SUPERVISOR AND BOT
# =======================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping Supervisor Daemon..."
pkill -f "$DIR/bot_supervisor.sh" 2>/dev/null || true

echo "Stopping Telegram Userbot..."
pkill -f "refresh_cloud_tokens.py" 2>/dev/null || true
pkill -f "autonomous_cloud_agent.py" 2>/dev/null || true

# Kill tmux session if any exists
tmux kill-session -t "telegram_bot" 2>/dev/null || true

# Remove runtime locks and pidfiles
rm -f "$DIR/supervisor.lock" "$DIR/supervisor.pid" "$DIR/userbot.pid"

sleep 1
echo "Checking remaining processes..."
if ! pgrep -f "bot_supervisor.sh" > /dev/null; then
    echo "✅ All bot and supervisor processes stopped successfully."
else
    echo "⚠️ Forcing termination of remaining processes..."
    pkill -9 -f "bot_supervisor.sh" 2>/dev/null || true
    echo "✅ Force stopped."
fi

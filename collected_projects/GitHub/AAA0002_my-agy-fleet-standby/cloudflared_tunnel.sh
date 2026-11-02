#!/usr/bin/env bash
# =======================================================
# MY AGY AI — Cloudflare Zero-Trust Tunnel Service
# =======================================================
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v cloudflared &>/dev/null; then
    echo "Detecting architecture for cloudflared..."
    ARCH="$(uname -m)"
    case "$ARCH" in
        aarch64|arm64) CF_ARCH="arm64" ;;
        x86_64) CF_ARCH="amd64" ;;
        armv7l|armhf) CF_ARCH="arm" ;;
        *) CF_ARCH="arm64" ;;
    esac
    echo "Installing cloudflared ($CF_ARCH) into ~/.local/bin..."
    mkdir -p "$HOME/.local/bin"
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" -o "$HOME/.local/bin/cloudflared"
    chmod +x "$HOME/.local/bin/cloudflared"
fi

MODE="${1:-status}"
CONFIG_FILE="$HOME/.cloudflared/config.yml"
TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"

case "$MODE" in
    start)
        echo "🚀 Starting named Cloudflare Tunnel 'my-agy-vps-tunnel' in background..."
        pkill -f "cloudflared tunnel" || true
        tmux kill-window -t telegram_bot:tunnel 2>/dev/null || true
        tmux new-window -d -t telegram_bot -n tunnel "cloudflared tunnel run --token '$TOKEN' 2>&1 | tee '$BASE_DIR/cloudflared.log'"
        sleep 2
        echo "✅ Tunnel running in tmux window 'tunnel'!"
        ;;
    quick)
        echo "🚀 Starting Cloudflare Quick Tunnel for SSH (Port 2203)..."
        pkill -f "cloudflared tunnel" || true
        nohup cloudflared tunnel --url tcp://localhost:2203 > "$BASE_DIR/cloudflared_quick.log" 2>&1 &
        sleep 3
        echo "✅ Quick Tunnel started. Check log: tail -f cloudflared_quick.log"
        ;;
    stop)
        pkill -f "cloudflared tunnel" || true
        echo "Cloudflare tunnels stopped."
        ;;
    status)
        if pgrep -f "cloudflared" > /dev/null; then
            echo "🟢 Cloudflare Tunnel is running (PID: $(pgrep -f 'cloudflared' | tr '\n' ' '))"
        else
            echo "⚪ Cloudflare Tunnel is stopped."
        fi
        ;;
    *)
        echo "Usage: $0 {start|quick|stop|status}"
        ;;
esac

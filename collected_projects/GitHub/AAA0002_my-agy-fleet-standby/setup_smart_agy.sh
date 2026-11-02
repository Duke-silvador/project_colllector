#!/bin/bash
# ==============================================================================
# AAA AUTO Smart Session Resume & Remote Control Daemon Setup
# Compatible with: Linux VPS, Instabox VM, Cloudflare Nodes, and Android Termux
# ==============================================================================

set -e

echo "=============================================================="
echo "  🚀 Installing AAA Smart Session Resume & Remote Control"
echo "=============================================================="

USER_HOME="${HOME:-/data/home}"
BIN_DIR="$USER_HOME/.local/bin"
mkdir -p "$BIN_DIR"

# 1. Detect Environment (Termux vs Linux VPS)
IS_TERMUX=false
if [ -n "$TERMUX_VERSION" ] || [ "$(uname -o 2>/dev/null)" = "Android" ] || [ -f "/system/bin/app_process" ]; then
    IS_TERMUX=true
    echo "📱 Android Termux / Mobile environment detected."
    TERMUX_BIN="/data/data/com.termux/files/usr/bin"
    [ -d "$TERMUX_BIN" ] && BIN_DIR="$TERMUX_BIN"
else
    echo "🖥️ Linux VPS / Cloud VM environment detected ($(uname -m))."
fi

# 2. Configure Lag-Free Mobile TMUX (~/.tmux.conf)
echo "⚡ Configuring lag-free mobile TMUX (~/.tmux.conf)..."
cat << 'TMUX_CONF' > "$USER_HOME/.tmux.conf"
# ==============================================================================
# AAA AUTO Mobile & Termux Optimized TMUX Configuration
# ZERO Touch Lag | Instant Typing | Clean Display
# ==============================================================================

# Disable mouse completely - prevents Termux touches from sending laggy escape codes
set -g mouse off

# 0ms escape delay for instant keystrokes and arrows
set -s escape-time 0
set -sg escape-time 0
set -g repeat-time 0

# Terminal geometry & colors
set -g default-terminal "xterm-256color"
set -ga terminal-overrides ",xterm-256color:Tc"
set -g history-limit 10000

# Aggressive window resizing for mobile screens
setw -g aggressive-resize on
set -g window-size latest

# Window numbering
set -g base-index 1
setw -g pane-base-index 1
set -g renumber-windows on

# Minimal, clean status bar (No heavy polling)
set -g status on
set -g status-interval 10
set -g status-style bg=black,fg=cyan
set -g status-left "#[fg=green,bold]⚡ [AGY] #[default]"
set -g status-right "#[fg=yellow]%H:%M #[fg=cyan]| Host"
set -g status-left-length 20
set -g status-right-length 30

# Clean disconnect and persistence
set-option -g destroy-unattached off
set -g visual-bell off
set -g bell-action none
TMUX_CONF

# Reload tmux server if already running
tmux source-file "$USER_HOME/.tmux.conf" 2>/dev/null || true

# 3. Create Smart Entrypoint Script (agy-entry)
echo "⚡ Installing agy-entry smart session switcher..."
cat << 'ENTRY_SCRIPT' > "$BIN_DIR/agy-entry"
#!/bin/bash
# ==============================================================================
# AAA AUTO Smart Antigravity Session & Remote Control Entrypoint
# Zero Lag | Auto-Session Resume | Remote Control Daemon Assurance
# ==============================================================================

# Locate true compiled agy binary
REAL_AGY=""
for p in "$HOME/.local/bin/agy" "/usr/local/bin/agy" "/data/data/com.termux/files/usr/bin/agy"; do
    if [ -x "$p" ] && [ ! -L "$p" -o "$(readlink -f "$p" 2>/dev/null)" != "$0" ]; then
        REAL_AGY="$p"
        break
    fi
done
[ -z "$REAL_AGY" ] && REAL_AGY="$(which agy 2>/dev/null)"

# 1. Ensure Antigravity Remote Control Daemon is active in background
if command -v systemctl >/dev/null 2>&1 && systemctl --user is-active antigravity-cli-daemon.service >/dev/null 2>&1; then
    : # Already running via systemd
elif command -v systemctl >/dev/null 2>&1 && systemctl --user status antigravity-cli-daemon.service >/dev/null 2>&1; then
    systemctl --user start antigravity-cli-daemon.service >/dev/null 2>&1 || true
else
    # Non-systemd (e.g. Android Termux) background daemon fallback
    if ! pgrep -f "agy remote-control serve" >/dev/null 2>&1; then
        nohup "$REAL_AGY" remote-control serve >/dev/null 2>&1 &
    fi
fi

# 2. If user passes custom subcommands/flags (like -p, --help, mcp, plugin), execute directly
if [ "$#" -gt 0 ] && [ "$1" != "-c" ] && [ "$1" != "--continue" ]; then
    exec "$REAL_AGY" "$@"
fi

# 3. If already inside tmux:
if [ -n "$TMUX" ]; then
    if tmux list-windows -t agy 2>/dev/null | grep -q "agy"; then
        tmux select-window -t agy:1 2>/dev/null
        exit 0
    else
        [ -d "/data/workspace/AAA_AUTO" ] && cd "/data/workspace/AAA_AUTO" || cd "$HOME"
        exec "$REAL_AGY" --continue
    fi
fi

# 4. If tmux session "agy" exists, attach directly to it (instant, zero-lag)
if tmux has-session -t agy 2>/dev/null; then
    exec tmux attach-session -t agy
fi

# 5. Otherwise create fresh persistent session
[ -d "/data/workspace/AAA_AUTO" ] && cd "/data/workspace/AAA_AUTO" || cd "$HOME"
exec tmux new-session -s agy "$REAL_AGY --continue"
ENTRY_SCRIPT
chmod +x "$BIN_DIR/agy-entry"

# Also symlink / copy to /usr/local/bin if root/sudo available
if [ "$(id -u)" -eq 0 ]; then
    cp -f "$BIN_DIR/agy-entry" /usr/local/bin/agy-entry 2>/dev/null || true
    chmod +x /usr/local/bin/agy-entry 2>/dev/null || true
elif command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    sudo cp -f "$BIN_DIR/agy-entry" /usr/local/bin/agy-entry 2>/dev/null || true
    sudo chmod +x /usr/local/bin/agy-entry 2>/dev/null || true
fi

# 4. Configure Remote Control Daemon
INSTANCE_NAME="aaa-hub-$(hostname 2>/dev/null || echo 'node')"
echo "⚡ Checking Remote Control daemon for instance: $INSTANCE_NAME..."
if command -v systemctl >/dev/null 2>&1; then
    if agy remote-control status 2>&1 | grep -q "active"; then
        echo "✅ Remote Control daemon is already active."
    else
        agy remote-control start --name "$INSTANCE_NAME" 2>/dev/null || true
        echo "✅ Remote Control daemon started via systemd."
    fi
else
    # Non-systemd (Termux) background fallback
    if ! pgrep -f "agy remote-control serve" >/dev/null 2>&1; then
        nohup agy remote-control serve >/dev/null 2>&1 &
        echo "✅ Remote Control background daemon started (PID: $!)."
    else
        echo "✅ Remote Control background daemon already running."
    fi
fi

# 5. Update ~/.bashrc Aliases & Profile
BASHRC="$USER_HOME/.bashrc"
touch "$BASHRC"

# Clean old duplicate aliases
sed -i '/alias agy=/d' "$BASHRC" 2>/dev/null || true
sed -i '/alias agy-direct=/d' "$BASHRC" 2>/dev/null || true
sed -i '/alias agy-remote=/d' "$BASHRC" 2>/dev/null || true
sed -i '/alias resume-session=/d' "$BASHRC" 2>/dev/null || true
sed -i '/alias new-session=/d' "$BASHRC" 2>/dev/null || true
sed -i '/alias agy-attach=/d' "$BASHRC" 2>/dev/null || true

cat << 'BASHRC_SNIPPET' >> "$BASHRC"

# AAA AUTO Smart Session Resume & Remote Control
alias agy='agy-entry'
alias agy-direct='$(command -v agy 2>/dev/null || echo "$HOME/.local/bin/agy")'
alias agy-remote='agy remote-control status'
alias resume-session='agy-entry'
alias new-session='agy-entry'
alias agy-attach='tmux attach -t agy 2>/dev/null || tmux attach'
BASHRC_SNIPPET

echo "=============================================================="
echo "  🎉 SMART SESSION RESUME & REMOTE CONTROL INSTALLED!"
echo "  • Run 'agy'        -> Instantly resume active session"
echo "  • Run 'agy-direct' -> Run native CLI without tmux"
echo "  • Remote Control   -> Active at https://antigravity.google.com"
echo "  • Touch Lag        -> 100% Eliminated (mouse off)"
echo "=============================================================="

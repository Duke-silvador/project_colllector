#!/usr/bin/env bash
set -e
echo "[*] Jellodh Zsh Installer - Universal"

# --- deps (Termux, Ubuntu/Debian, Arch, Void, Fedora, Suse, Alpine, Mac) ---
if command -v pkg >/dev/null 2>&1; then
  pkg install -y zsh git curl
elif command -v xbps-install >/dev/null 2>&1; then
  sudo xbps-install -Sy zsh git curl
elif command -v pacman >/dev/null 2>&1; then
  sudo pacman -Sy --noconfirm zsh git curl
elif command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update && sudo apt-get install -y zsh git curl
elif command -v apt >/dev/null 2>&1; then
  sudo apt update && sudo apt install -y zsh git curl
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y zsh git curl
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y zsh git curl
elif command -v zypper >/dev/null 2>&1; then
  sudo zypper install -y zsh git curl
elif command -v apk >/dev/null 2>&1; then
  sudo apk add zsh git curl
elif command -v brew >/dev/null 2>&1; then
  brew install zsh git curl
fi

# --- oh-my-zsh ---
if [ ! -d "$HOME/.oh-my-zsh" ]; then
  RUNZSH=no CHSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# --- plugins ---
ZSH_CUSTOM="${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}"
if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then
  git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"
else
  git -C "$ZSH_CUSTOM/plugins/zsh-autosuggestions" pull
fi
if [ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]; then
  git clone https://github.com/zsh-users/zsh-syntax-highlighting "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"
else
  git -C "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" pull
fi

# --- zshrc ---
cat > "$HOME/.zshrc" << 'INNEREOF'
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="random"
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)
source $ZSH/oh-my-zsh.sh
INNEREOF

# --- default shell ---
if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
  chsh -s zsh 2>/dev/null || true
  sed -i '/exec zsh/d' "$HOME/.bashrc" 2>/dev/null || true
  echo "exec zsh" >> "$HOME/.bashrc"
else
  command -v zsh >/dev/null && sudo chsh -s "$(command -v zsh)" "$USER" 2>/dev/null || chsh -s "$(command -v zsh)" 2>/dev/null || true
fi

echo ""
echo "----------------------------------------"
echo "Thank you for installing! | Dh"
echo "GitHub: github.com/jellodh"
echo "Repo: ZshInstallAutomate"
echo "----------------------------------------"

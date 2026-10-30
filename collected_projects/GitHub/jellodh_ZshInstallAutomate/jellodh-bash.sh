#!/usr/bin/env bash
echo "[*] Jellodh Bash Installer - Universal (ble.sh + starship)"

# --- deps ---
if command -v xbps-install >/dev/null 2>&1; then
  xbps-install -Sy git curl fzf zoxide 2>/dev/null || xbps-install -Sy git curl fzf zoxide
elif command -v pacman >/dev/null 2>&1; then
  pacman -Sy --noconfirm git curl fzf zoxide 2>/dev/null || sudo pacman -Sy --noconfirm git curl fzf zoxide
elif command -v apt-get >/dev/null 2>&1; then
  apt-get update && apt-get install -y git curl fzf zoxide 2>/dev/null || sudo apt-get install -y git curl fzf zoxide
elif command -v pkg >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  pkg install -y git curl fzf zoxide
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y git curl fzf zoxide 2>/dev/null || sudo dnf install -y git curl fzf zoxide
fi

# --- ble.sh ---
if [ ! -d "$HOME/ble.sh" ]; then
  git clone --recursive https://github.com/akinomyoga/ble.sh.git ~/ble.sh
  make -C ~/ble.sh
fi

# --- starship ---
if ! command -v starship >/dev/null 2>&1; then
  curl -fsSL https://starship.rs/install.sh | sh -s -- -y
fi

# --- bashrc ---
# Backup
cp ~/.bashrc ~/.bashrc.bak 2>/dev/null || true

# Remove old jellodh blocks
sed -i '/Jellodh Bash/,/End Jellodh/d' ~/.bashrc 2>/dev/null || true
sed -i '/ble.sh/d' ~/.bashrc
sed -i '/starship init/d' ~/.bashrc
sed -i '/zoxide init/d' ~/.bashrc

cat >> ~/.bashrc << 'INNEREOF'

# --- Jellodh Bash ---
source ~/ble.sh/out/ble.sh
eval "$(starship init bash)"
eval "$(zoxide init bash)" 2>/dev/null || true
# --- End Jellodh ---
INNEREOF

echo ""
echo "----------------------------------------"
echo "Thank you for installing! | Dh"
echo "Bash is now zsh-like with ble.sh + starship"
echo "Run: exec bash"
echo "----------------------------------------"

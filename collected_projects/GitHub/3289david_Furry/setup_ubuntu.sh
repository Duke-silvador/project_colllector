#!/usr/bin/env bash
# ==============================================================================
# Mochi-Puff AI 3D Virtual Pet — Ubuntu / Debian Automated Setup Script
# ==============================================================================
# This script prepares and sets up the complete Mochi-Puff environment on
# Ubuntu 20.04 / 22.04 / 24.04 LTS (and compatible Debian-based distributions).
#
# It verifies/installs:
#   1. System build tools (curl, git, build-essential)
#   2. Node.js (v20 LTS recommended) & npm
#   3. Project npm dependencies
#   4. Environment variables (.env file)
#   5. Production build (Vite + WebGL2/GPGPU Fur simulation)
#   6. Systemd service template & execution instructions
# ==============================================================================

set -e

# ANSI Color codes for clean output
CLR_RESET="\033[0m"
CLR_BOLD="\033[1m"
CLR_GREEN="\033[1;32m"
CLR_CYAN="\033[1;36m"
CLR_YELLOW="\033[1;33m"
CLR_RED="\033[1;31m"
CLR_PINK="\033[38;5;218m"

echo -e "${CLR_PINK}"
echo "  __  __            _     _       ____         __  __ "
echo " |  \/  | ___   ___| |__ (_)     |  _ \ _   _ / _|/ _|"
echo " | |\/| |/ _ \ / __| '_ \| |_____| |_) | | | | |_| |_ "
echo " | |  | | (_) | (__| | | | |_____|  __/| |_| |  _|  _|"
echo " |_|  |_|\___/ \___|_| |_|_|     |_|    \__,_|_| |_|  "
echo "        AI 3D GPU Fur Pet — Ubuntu Setup Utility       "
echo -e "${CLR_RESET}"

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${CLR_CYAN}[1/6] Checking Linux OS Environment...${CLR_RESET}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo -e "Detected OS: ${CLR_BOLD}${NAME} ${VERSION_ID:-}${CLR_RESET}"
else
  echo -e "${CLR_YELLOW}Warning: Could not detect /etc/os-release. Proceeding assuming Debian/Ubuntu compatibility.${CLR_RESET}"
fi

echo ""
echo -e "${CLR_CYAN}[2/6] Checking System Dependencies & Node.js...${CLR_RESET}"

HAS_SUDO=0
if command -v sudo >/dev/null 2>&1; then
  HAS_SUDO=1
fi

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif [ "$HAS_SUDO" -eq 1 ]; then
    sudo "$@"
  else
    echo -e "${CLR_RED}Error: Administrative privileges (root or sudo) required for this step.${CLR_RESET}"
    exit 1
  fi
}

# Check for curl
if ! command -v curl >/dev/null 2>&1; then
  echo -e "${CLR_YELLOW}Installing curl...${CLR_RESET}"
  run_privileged apt-get update -y
  run_privileged apt-get install -y curl
fi

# Check Node.js version
NODE_INSTALL_NEEDED=1
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/^v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    echo -e "${CLR_GREEN}[OK] Node.js is already installed: v${NODE_VER}${CLR_RESET}"
    NODE_INSTALL_NEEDED=0
  else
    echo -e "${CLR_YELLOW}Node.js v${NODE_VER} is too old (v18+ or v20 LTS required). Upgrading...${CLR_RESET}"
  fi
fi

if [ "$NODE_INSTALL_NEEDED" -eq 1 ]; then
  echo -e "${CLR_CYAN}Installing Node.js v20 LTS via NodeSource PPA...${CLR_RESET}"
  run_privileged apt-get update -y
  run_privileged apt-get install -y ca-certificates curl gnupg
  run_privileged mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | run_privileged gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | run_privileged tee /etc/apt/sources.list.d/nodesource.list
  run_privileged apt-get update -y
  run_privileged apt-get install -y nodejs build-essential
  echo -e "${CLR_GREEN}[OK] Node.js installed: $(node -v)${CLR_RESET}"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${CLR_RED}npm not found. Please install npm.${CLR_RESET}"
  exit 1
else
  echo -e "${CLR_GREEN}[OK] npm version: $(npm -v)${CLR_RESET}"
fi

echo ""
echo -e "${CLR_CYAN}[3/6] Setting Up Environment Configuration (.env)...${CLR_RESET}"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${CLR_GREEN}[OK] Created .env from .env.example${CLR_RESET}"
  else
    cat <<EOF > .env
# Google Gemini API Key (Optional if using Custom OpenAI-Compatible Endpoints)
GEMINI_API_KEY=

# Custom OpenAI-Compatible API Key (Optional)
CUSTOM_API_KEY=

# Server Port (Default: 3000)
PORT=3000
EOF
    echo -e "${CLR_GREEN}[OK] Created new .env file${CLR_RESET}"
  fi
  echo -e "${CLR_YELLOW}Note: You can add your GEMINI_API_KEY or configure OpenAI-compatible endpoints directly in .env or via the in-app Settings UI.${CLR_RESET}"
else
  echo -e "${CLR_GREEN}[OK] Existing .env detected.${CLR_RESET}"
fi

echo ""
echo -e "${CLR_CYAN}[4/6] Installing NPM Dependencies...${CLR_RESET}"
npm install --no-audit --prefer-offline || npm install

echo ""
echo -e "${CLR_CYAN}[5/6] Building Production Web Assets (Vite)...${CLR_RESET}"
npm run build

echo ""
echo -e "${CLR_CYAN}[6/6] Generating Systemd Service (Optional)...${CLR_RESET}"
SERVICE_FILE_PATH="$PROJECT_DIR/mochi-puff.service"
CURRENT_USER="$(whoami)"
NODE_BIN="$(which node)"

cat <<EOF > "$SERVICE_FILE_PATH"
[Unit]
Description=Mochi-Puff AI 3D Virtual Pet Service
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${PROJECT_DIR}
EnvironmentFile=-${PROJECT_DIR}/.env
ExecStart=${NODE_BIN} ${PROJECT_DIR}/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

echo -e "${CLR_GREEN}[OK] Generated service template at: ${SERVICE_FILE_PATH}${CLR_RESET}"

echo ""
echo -e "${CLR_PINK}========================================================================${CLR_RESET}"
echo -e "${CLR_GREEN}${CLR_BOLD}Setup Complete! Mochi-Puff is ready to run on Ubuntu.${CLR_RESET}"
echo -e "${CLR_PINK}========================================================================${CLR_RESET}"
echo ""
echo -e "${CLR_BOLD}Quick Start Commands:${CLR_RESET}"
echo -e "  ${CLR_CYAN}# 1. Run in Development Mode (Live reload on port 3000):${CLR_RESET}"
echo -e "     npm run dev"
echo ""
echo -e "  ${CLR_CYAN}# 2. Run in Production Mode:${CLR_RESET}"
echo -e "     npm start"
echo ""
echo -e "  ${CLR_CYAN}# 3. (Optional) Run permanently as a systemd background daemon:${CLR_RESET}"
echo -e "     sudo cp ${SERVICE_FILE_PATH} /etc/systemd/system/"
echo -e "     sudo systemctl daemon-reload"
echo -e "     sudo systemctl enable --now mochi-puff"
echo -e "     sudo systemctl status mochi-puff"
echo ""
echo -e "${CLR_BOLD}AI Configuration Tips:${CLR_RESET}"
echo -e "  * ${CLR_BOLD}Google Gemini:${CLR_RESET} Add ${CLR_CYAN}GEMINI_API_KEY=your_key${CLR_RESET} in ${CLR_CYAN}.env${CLR_RESET}"
echo -e "  * ${CLR_BOLD}Custom Endpoints:${CLR_RESET} Click ${CLR_BOLD}Settings -> AI Endpoints${CLR_RESET} in the app UI to"
echo -e "    configure independent OpenAI-compatible endpoints for Chat, STT, and TTS!"
echo ""

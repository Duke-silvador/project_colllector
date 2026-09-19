#!/bin/bash
echo "📦 Checking Chrome & dependencies..."
if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null; then
    echo "Installing Google Chrome..."
    sudo apt-get update -y
    sudo apt-get install -y wget curl
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
    sudo apt-get install -y ./google-chrome-stable_current_amd64.deb || sudo apt-get -f install -y
    rm -f google-chrome-stable_current_amd64.deb
fi

echo "📦 Installing Python packages..."
pip install --no-cache-dir selenium requests packaging

echo "🚀 Starting main.py..."
while true; do
    python main.py
    echo "Bot stopped. Rerunning in 10s..."
    sleep 10
done

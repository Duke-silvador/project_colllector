#!/bin/bash
# Check if we can access WSL and set up Ubuntu
set -e

echo "=== Checking WSL status ==="
wsl --list --verbose 2>&1 || echo "WSL check failed"

echo ""
echo "=== Installing Ubuntu ==="
# Try to install Ubuntu
wsl --install -d Ubuntu --no-launch 2>&1 || {
    echo "First install method failed, trying alternative..."
    # Alternative: download Ubuntu directly
    # First check if we can run Ubuntu at all
    echo "Trying to start Ubuntu..."
    wsl -d Ubuntu --version 2>&1 || echo "Cannot access Ubuntu yet"
}

echo ""
echo "=== Checking what happened ==="
wsl --list --verbose 2>&1 || echo "WSL still not working"

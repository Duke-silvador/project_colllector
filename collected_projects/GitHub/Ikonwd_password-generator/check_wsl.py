#!/usr/bin/env python3
"""Check WSL status and return readable output."""
import subprocess
import os

result = subprocess.run(
    ['wsl.exe', '-e', 'bash', '-c', 'wsl --list --verbose 2>&1'],
    capture_output=True
)

# WSL outputs UTF-16 on Windows
raw = result.stdout
try:
    text = raw.decode('utf-16')
except:
    try:
        text = raw.decode('utf-16-le')
    except:
        text = raw.decode('utf-8', errors='replace')

print("=== WSL STATUS ===")
print(text.strip())
print("=== STDERR ===")
print(result.stderr.decode('utf-16', errors='replace').strip())
print("=== RC ===")
print(result.returncode)

# Also check if Ubuntu is accessible
result2 = subprocess.run(
    ['wsl.exe', '-e', 'bash', '-c', 'echo "Ubuntu accessible" && whoami && pwd'],
    capture_output=True
)
try:
    text2 = result2.stdout.decode('utf-16')
except:
    text2 = result2.stdout.decode('utf-8', errors='replace')
print("\n=== UBUNTU ACCESS TEST ===")
print(text2.strip())

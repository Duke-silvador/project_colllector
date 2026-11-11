#!/usr/bin/env bash

set -Eeuo pipefail

# ==========================================
# PTV BACKUP CONFIGURATION
# ==========================================

SOURCE="/home/benxo"
BACKUP_DIR="/home/benxo/backups/PTV"
GDRIVE_REMOTE="gdrive:PTV-backups"

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
ARCHIVE="PTV-${TIMESTAMP}.tar.gz"
ENCRYPTED="${ARCHIVE}.gpg"

ARCHIVE_PATH="$BACKUP_DIR/$ARCHIVE"
ENCRYPTED_PATH="$BACKUP_DIR/$ENCRYPTED"

# ==========================================
# ERROR HANDLING
# ==========================================

cleanup() {
    if [[ -f "$ARCHIVE_PATH" ]]; then
        echo "[!] Removing leftover unencrypted archive..."
        shred -u "$ARCHIVE_PATH" 2>/dev/null || rm -f "$ARCHIVE_PATH"
    fi
}

trap cleanup EXIT

# ==========================================
# PRE-FLIGHT CHECKS
# ==========================================

echo "[*] Starting PTV backup..."

if [[ $EUID -eq 0 ]]; then
    echo "[!] Do not run this script as root."
    echo "[!] Run it as benxo instead."
    exit 1
fi

for cmd in tar gpg rclone shred; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "[!] Missing dependency: $cmd"
        exit 1
    fi
done

if [[ ! -d "$SOURCE/PTV" ]]; then
    echo "[!] Source directory does not exist: $SOURCE/PTV"
    exit 1
fi

# ==========================================
# BACKUP DIRECTORY
# ==========================================

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# ==========================================
# COMPRESS
# ==========================================

echo "[*] Creating compressed archive..."

tar -czf "$ARCHIVE_PATH" -C "$SOURCE" PTV

# ==========================================
# ENCRYPT
# ==========================================

echo "[*] Encrypting archive..."

gpg --symmetric \
    --cipher-algo AES256 \
    --output "$ENCRYPTED_PATH" \
    "$ARCHIVE_PATH"

if [[ ! -s "$ENCRYPTED_PATH" ]]; then
    echo "[!] Encryption failed: encrypted archive missing or empty."
    exit 1
fi

# ==========================================
# VERIFY ENCRYPTED ARCHIVE
# ==========================================

echo "[*] Verifying encrypted archive..."

gpg --list-packets "$ENCRYPTED_PATH" >/dev/null

# ==========================================
# UPLOAD
# ==========================================

echo "[*] Uploading to Google Drive..."

rclone copy "$ENCRYPTED_PATH" "$GDRIVE_REMOTE" \
    --progress

# Verify remote file exists and has matching size
LOCAL_SIZE=$(stat -c%s "$ENCRYPTED_PATH")
REMOTE_SIZE=$(rclone size "$GDRIVE_REMOTE" \
    --json | python3 -c \
    "import sys,json; print(sum(x['Size'] for x in json.load(sys.stdin)['Hashes'].values()) if False else json.load(open('/dev/null')))" 2>/dev/null || true)

if ! rclone check "$BACKUP_DIR" "$GDRIVE_REMOTE" \
    --one-way \
    --include "$ENCRYPTED"; then
    echo "[!] Upload verification failed!"
    exit 1
fi

# ==========================================
# REMOVE UNENCRYPTED ARCHIVE
# ==========================================

echo "[*] Removing unencrypted archive..."

shred -u "$ARCHIVE_PATH"
trap - EXIT

# ==========================================
# COMPLETE
# ==========================================

echo "[+] Backup completed successfully!"
echo "[+] Encrypted archive: $ENCRYPTED_PATH"
echo "[+] Google Drive: $GDRIVE_REMOTE/$ENCRYPTED"

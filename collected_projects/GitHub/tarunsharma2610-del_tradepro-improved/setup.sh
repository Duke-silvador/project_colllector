#!/usr/bin/env bash
# Generates .env with securely-random bootstrap secrets. Safe to re-run —
# it only fills in blank values, it never overwrites ones you've already set.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

random_urlsafe() {
  python3 -c "import secrets; print(secrets.token_urlsafe($1))" 2>/dev/null \
    || openssl rand -base64 "$1" | tr -d '=+/\n'
}

fernet_key() {
  python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || {
    echo "Could not generate MASTER_ENCRYPTION_KEY automatically (python3 + cryptography not found)." >&2
    echo "Generate one manually: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"" >&2
    exit 1
  }
}

fill_if_blank() {
  local key="$1" value_fn="$2"
  if grep -q "^${key}=$" .env; then
    local value
    value="$($value_fn)"
    # Escape & and | for sed's replacement side
    value_escaped=$(printf '%s' "$value" | sed -e 's/[&|]/\\&/g')
    sed -i.bak "s|^${key}=$|${key}=${value_escaped}|" .env && rm -f .env.bak
    echo "Generated ${key}"
  fi
}

fill_if_blank "POSTGRES_PASSWORD" "random_urlsafe 24"
fill_if_blank "SECRET_KEY" "random_urlsafe 48"
fill_if_blank "MASTER_ENCRYPTION_KEY" "fernet_key"

echo ""
echo "Done. .env is ready — you shouldn't need to open it by hand."
echo "Next: docker compose up -d --build"

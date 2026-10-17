#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-$HOME/cluster-status}"
KEY_FILE="${CLUSTER_STATUS_SSH_KEY:-$HOME/.ssh/cluster_status_deploy_key}"
cd "$REPO_DIR"

before="$(mktemp)"
trap 'rm -f "$before"' EXIT
cp index.html "$before"

/bin/bash "$REPO_DIR/update_status.sh" "$REPO_DIR"

# Do not create a GitHub commit when only the generated timestamp changed.
normalize() {
  sed -E 's/更新于 [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/更新于 TIMESTAMP/' "$1"
}
if diff -q <(normalize "$before") <(normalize index.html) >/dev/null; then
  cp "$before" index.html
  exit 0
fi

/usr/bin/git add index.html
if /usr/bin/git diff --cached --quiet; then
  exit 0
fi
/usr/bin/git commit -m 'Update cluster status'
GIT_SSH_COMMAND="ssh -i $KEY_FILE -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
  /usr/bin/git push origin main


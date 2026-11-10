#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$REPO_DIR/deploy"

echo "🧹 Cleaning previous deploy directory..."
rm -rf "$DEPLOY_DIR" 2>/dev/null || true
mkdir -p "$DEPLOY_DIR"

echo "📄 Copying root index.html..."
cp "$REPO_DIR/index.html" "$DEPLOY_DIR/index.html"

APPS_BUILT=0
APPS_FAILED=0
APPS_SKIPPED=0

APP_NAMES=$(
  python3 - <<'PY' "$REPO_DIR/index.html"
import re
import sys

path = sys.argv[1]
with open(path, "r", encoding="utf-8") as fh:
    html = fh.read()

for folder in re.findall(r'folder:"([^"]+)"', html):
    print(folder)
PY
)

while IFS= read -r APP_NAME; do
  [ -n "$APP_NAME" ] || continue
  app_dir="$REPO_DIR/$APP_NAME"
  [ -d "$app_dir" ] || continue

  if [ -f "$app_dir/package.json" ] && [ -f "$app_dir/vite.config.js" ]; then
    if [ -d "$app_dir/dist" ] && [ -f "$app_dir/dist/index.html" ]; then
      echo "📦 Copying pre-built $APP_NAME..."
      mkdir -p "$DEPLOY_DIR/$APP_NAME"
      cp -R "$app_dir/dist/." "$DEPLOY_DIR/$APP_NAME/"
      echo "  ✅ $APP_NAME copied (already built)"
      APPS_BUILT=$((APPS_BUILT + 1))
    else
      echo "🔨 Building Vite app $APP_NAME..."
      if [ -d "$app_dir/node_modules/.bin/vite" ] || [ -f "$app_dir/node_modules/vite/bin/vite.js" ]; then
        cd "$app_dir"
        if node ./node_modules/vite/bin/vite.js build > /dev/null 2>&1; then
          if [ -d "$app_dir/dist" ]; then
            mkdir -p "$DEPLOY_DIR/$APP_NAME"
            cp -R "$app_dir/dist/." "$DEPLOY_DIR/$APP_NAME/"
            echo "  ✅ $APP_NAME built and copied"
            APPS_BUILT=$((APPS_BUILT + 1))
          else
            echo "  ⚠️ $APP_NAME built but dist/ missing"
            APPS_FAILED=$((APPS_FAILED + 1))
          fi
        else
          echo "  ❌ $APP_NAME build failed"
          APPS_FAILED=$((APPS_FAILED + 1))
        fi
        cd "$REPO_DIR"
      else
        echo "  ⏭️  Skipping (vite not found): $APP_NAME"
        APPS_SKIPPED=$((APPS_SKIPPED + 1))
      fi
    fi
  elif [ -f "$app_dir/index.html" ]; then
    echo "📦 Copying legacy app $APP_NAME..."
    mkdir -p "$DEPLOY_DIR/$APP_NAME"
    cp "$app_dir/index.html" "$DEPLOY_DIR/$APP_NAME/"
    [ -f "$app_dir/README.md" ] && cp "$app_dir/README.md" "$DEPLOY_DIR/$APP_NAME/"
  fi
done <<< "$APP_NAMES"

echo
echo "📊 Built: $APPS_BUILT | Failed: $APPS_FAILED | Skipped: $APPS_SKIPPED"

# Keep the combined published site below the GitHub Pages size limit.
python3 "$REPO_DIR/scripts/dedupe-runtime.py"

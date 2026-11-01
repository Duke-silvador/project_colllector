#!/usr/bin/env bash
# Links this repo's config into $HOME. Safe to re-run: existing files are
# backed up once to <file>.bak-<date> before being replaced by a symlink.
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
stamp="$(date +%Y-%m-%d-%H%M%S)"

link() {
  local src="$repo/$1" dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [ -L "$dest" ] && [ "$(readlink "$dest")" = "$src" ]; then
    echo "ok      $dest"
    return
  fi
  if [ -e "$dest" ] || [ -L "$dest" ]; then
    mv "$dest" "$dest.bak-$stamp"
    echo "backup  $dest -> $dest.bak-$stamp"
  fi
  ln -s "$src" "$dest"
  echo "linked  $dest"
}

link claude/CLAUDE.md     "$HOME/.claude/CLAUDE.md"
link claude/settings.json "$HOME/.claude/settings.json"
link claude/hooks         "$HOME/.claude/hooks"
link claude/skills        "$HOME/.claude/skills"
link mise/config.toml     "$HOME/.config/mise/config.toml"
link zsh/.zshrc           "$HOME/.zshrc"
link zsh/.zprofile        "$HOME/.zprofile"

if [ "${1:-}" = "--tools" ]; then
  echo "Installing runtimes and global tools..."
  ~/.local/bin/mise install
  npm i -g typescript-language-server typescript pyright
  dotnet tool update --global csharp-ls
  # Plugins and marketplaces are declared in claude/settings.json; this installs them.
  claude plugin marketplace add obra/superpowers-marketplace || true
  jq -r '.enabledPlugins | to_entries[] | select(.value) | .key' "$repo/claude/settings.json" \
    | while read -r p; do claude plugin install "$p" --scope user || true; done
  claude mcp add --scope user playwright -- npx -y @playwright/mcp@latest || true
  claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp@latest || true
fi

echo "Done. Open a new terminal tab to pick up shell changes."

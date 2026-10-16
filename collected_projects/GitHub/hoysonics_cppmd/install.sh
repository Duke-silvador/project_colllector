#!/usr/bin/env bash
# Install the cppmd skill for Claude Code and/or Codex.
#
#   curl -fsSL https://raw.githubusercontent.com/hoysonics/cppmd/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/hoysonics/cppmd/main/install.sh | bash -s -- --claude
#   ./install.sh --codex            # from a local checkout: links to this checkout
#
# Re-running updates the installation. Existing non-cppmd folders are backed up, never deleted.

set -euo pipefail

REPO_URL="${CPPMD_REPO_URL:-https://github.com/hoysonics/cppmd.git}"
SRC_DIR="${CPPMD_HOME:-$HOME/.local/share/cppmd}"
BACKUP_DIR="${CPPMD_BACKUP_DIR:-$HOME/.local/share/cppmd-backups}"
NAME="cppmd"

usage() {
  cat <<'EOF'
Usage: install.sh [options]

Targets (default: every agent found in ~/.claude or ~/.codex, else Claude):
  --claude       Link into ~/.claude/skills/cppmd
  --codex        Link into ~/.codex/skills/cppmd
  --project      Copy into ./.claude/skills/cppmd (commit it to share with a team)
  --all          --claude and --codex

Other:
  --uninstall    Remove links/copies this script created for the chosen targets
  -h, --help     Show this help

Environment:
  CPPMD_HOME        Where the skill is cloned when not run from a checkout
                    (default: ~/.local/share/cppmd)
  CPPMD_BACKUP_DIR  Where replaced folders are moved
                    (default: ~/.local/share/cppmd-backups)
EOF
}

say()  { printf '%s\n' "$*"; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

want_claude=0 want_codex=0 want_project=0 uninstall=0
for arg in "$@"; do
  case "$arg" in
    --claude)    want_claude=1 ;;
    --codex)     want_codex=1 ;;
    --project)   want_project=1 ;;
    --all)       want_claude=1; want_codex=1 ;;
    --uninstall) uninstall=1 ;;
    -h|--help)   usage; exit 0 ;;
    *)           usage >&2; die "unknown option: $arg" ;;
  esac
done

if (( want_claude + want_codex + want_project == 0 )); then
  [[ -d "$HOME/.claude" ]] && want_claude=1
  [[ -d "$HOME/.codex"  ]] && want_codex=1
  (( want_claude + want_codex == 0 )) && want_claude=1
fi

# Use the checkout this script lives in; otherwise (e.g. piped from curl) clone or update one.
script_dir=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
fi

resolve_source() {
  if [[ -n "$script_dir" && -f "$script_dir/SKILL.md" ]]; then
    SRC_DIR="$script_dir"
    return
  fi
  command -v git >/dev/null || die "git is required"
  if [[ -d "$SRC_DIR/.git" ]]; then
    say "Updating $SRC_DIR"
    git -C "$SRC_DIR" pull --ff-only --quiet
  elif [[ -e "$SRC_DIR" ]]; then
    die "$SRC_DIR exists but is not a git checkout; set CPPMD_HOME to another path"
  else
    say "Cloning $REPO_URL into $SRC_DIR"
    mkdir -p "$(dirname "$SRC_DIR")"
    git clone --quiet --depth 1 "$REPO_URL" "$SRC_DIR"
  fi
}

# Backups go outside skills/ so the agent does not load them as a second cppmd skill.
backup() {
  local dest="$1" bak
  mkdir -p "$BACKUP_DIR"
  bak="$BACKUP_DIR/$(basename "$(dirname "$(dirname "$dest")")" | tr -d .)-$NAME.$(date +%Y%m%d%H%M%S)"
  mv "$dest" "$bak"
  say "  backed up existing $dest -> $bak"
}

is_cppmd_link() {
  [[ -L "$1" ]] && grep -q "^name: $NAME\$" "$1/SKILL.md" 2>/dev/null
}

is_ours_copy() {
  [[ -f "$1/SKILL.md" ]] && grep -q "^name: $NAME\$" "$1/SKILL.md" && [[ -f "$1/.cppmd-install" ]]
}

link_to() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  if [[ -L "$dest" && "$(readlink "$dest")" == "$SRC_DIR" ]]; then
    say "  already linked: $dest"
    return
  fi
  if is_cppmd_link "$dest"; then rm "$dest"; elif [[ -e "$dest" || -L "$dest" ]]; then backup "$dest"; fi
  ln -s "$SRC_DIR" "$dest"
  say "  linked $dest -> $SRC_DIR"
}

copy_to() {
  local dest="$1"
  mkdir -p "$(dirname "$dest")"
  if is_ours_copy "$dest"; then
    rm -rf "$dest"
  elif [[ -e "$dest" || -L "$dest" ]]; then
    backup "$dest"
  fi
  mkdir -p "$dest"
  cp "$SRC_DIR/SKILL.md" "$dest/"
  cp -R "$SRC_DIR/templates" "$dest/"
  : > "$dest/.cppmd-install"
  say "  copied skill into $dest"
}

remove() {
  local dest="$1"
  if is_cppmd_link "$dest"; then
    rm "$dest"; say "  removed link $dest"
  elif is_ours_copy "$dest"; then
    rm -rf "$dest"; say "  removed $dest"
  elif [[ -e "$dest" || -L "$dest" ]]; then
    say "  skipped $dest (not installed by this script)"
  fi
}

claude_dest="$HOME/.claude/skills/$NAME"
codex_dest="$HOME/.codex/skills/$NAME"
project_dest="$PWD/.claude/skills/$NAME"

if (( uninstall )); then
  (( want_claude ))  && remove "$claude_dest"
  (( want_codex ))   && remove "$codex_dest"
  (( want_project )) && remove "$project_dest"
  say "Done. The source checkout (if any) at $SRC_DIR was left in place."
  exit 0
fi

resolve_source
[[ -f "$SRC_DIR/SKILL.md" ]] || die "SKILL.md not found in $SRC_DIR"

(( want_claude ))  && { say "Claude Code:";        link_to "$claude_dest"; }
(( want_codex ))   && { say "Codex:";              link_to "$codex_dest"; }
(( want_project )) && { say "Project (Claude Code):"; copy_to "$project_dest"; }

say ""
say "Installed. Start a new agent session, then in a git repository run:"
(( want_claude || want_project )) && say "  Claude Code: /cppmd   (or ask for c / cpp / cppm)"
(( want_codex ))                  && say "  Codex:       \$cppmd   (or ask for c / cpp / cppm)"
say "Update later by re-running this installer."

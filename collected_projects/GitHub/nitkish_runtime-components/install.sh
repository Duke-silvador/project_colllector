#!/usr/bin/env bash
#
# install.sh: put the rc files in this repository to work.
#
# Usage:
#   ./install.sh             install everything
#   ./install.sh --dry-run   show what would happen, change nothing
#   ./install.sh --no-omz    skip installing oh-my-zsh
#
# What it does:
#   1. Copies each rc file here into your home directory, e.g.
#        ~/runtime_components/vimrc  ->  ~/.vimrc
#      These are copies: after editing a file in the repo, run this
#      script again to install the new version.
#   2. Copies gitconfig to ~/.gitconfig.rc and tells git to also read it
#      (your name and email stay in ~/.gitconfig, out of this repository).
#   3. Installs oh-my-zsh, if zsh is available.
#
# Safe to run more than once. Nothing is ever deleted: a file already in
# the way is renamed to  ~/.NAME.backup-DATE-TIME  first.

set -eu

# Files in this repository that become ~/.NAME. Missing ones are skipped,
# so add names here as your collection grows.
FILES=".bashrc .zshrc .vimrc .gdbinit"

OMZ_URL="https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh"

# ---------------------------------------------------------------------------
# Options
# ---------------------------------------------------------------------------
DRY_RUN=0
INSTALL_OMZ=1
for arg in "$@"; do
    case "$arg" in
        -n|--dry-run) DRY_RUN=1 ;;
        --no-omz)     INSTALL_OMZ=0 ;;
        -h|--help)    sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *)            echo "unknown option: $arg  (try --help)" >&2; exit 1 ;;
    esac
done

# Absolute path of the directory holding this script, so it works no matter
# which directory you run it from.
REPO_DIR="$(cd "$(dirname "$0")" && pwd -P)"
STAMP="$(date +%Y%m%d-%H%M%S)"

# Run a command, or just print it during a dry run.
run() {
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "          would run: $*"
    else
        "$@"
    fi
}

# ---------------------------------------------------------------------------
# 1. Copy rc files
# ---------------------------------------------------------------------------
install_file() {
    local src="$REPO_DIR/$1"
    local dest="$HOME/$1"

    if [ ! -e "$src" ]; then
        echo "skip      .$1  (no $1 in this repo)"
        return
    fi

    # Already an identical copy: nothing to do.
    if [ -f "$dest" ] && [ ! -L "$dest" ] && cmp -s "$src" "$dest"; then
        echo "ok        .$1"
        return
    fi

    # A different file is in the way: move it aside, never delete it.
    if [ -e "$dest" ] || [ -L "$dest" ]; then
        local bak="$dest.backup-$STAMP" n=1
        while [ -e "$bak" ] || [ -L "$bak" ]; do   # never overwrite a backup
            bak="$dest.backup-$STAMP-$n"; n=$((n + 1))
        done
        echo "backup    .$1  ->  ${bak##*/}"
        run mv "$dest" "$bak"
    fi

    echo "copy      $1  ->  ~/$1"
    run cp "$src" "$dest"
}

# ---------------------------------------------------------------------------
# 2. gitconfig: include it, don't replace ~/.gitconfig
# ---------------------------------------------------------------------------
# ~/.gitconfig holds your name and email. Replacing it would lose them.
# Instead, gitconfig is copied to ~/.gitconfig.rc, and ~/.gitconfig gets
# one extra line telling git to also read that file.
setup_gitconfig() {
    local src="$REPO_DIR/.gitconfig"
    local dest="$HOME/.gitconfig.rc"

    if [ ! -e "$src" ]; then
        echo "skip      gitconfig  (no gitconfig in this repo)"
        return
    fi

    if git config -f "$src" --get user.name >/dev/null 2>&1 ||
       git config -f "$src" --get user.email >/dev/null 2>&1; then
        echo "WARNING   $src has a [user] section."
        echo "          It would override the name and email in ~/.gitconfig."
        echo "          Remove it from the repo copy, then run this script again."
        return
    fi

    if [ -f "$dest" ] && cmp -s "$src" "$dest"; then
        echo "ok        .gitconfig.rc"
    else
        echo "copy      .gitconfig  ->  ~/.gitconfig.rc"
        run cp "$src" "$dest"
    fi

    if git config --global --get-all include.path 2>/dev/null | grep -qxF "$dest"; then
        echo "ok        .gitconfig.rc  (already included)"
    else
        echo "include   .gitconfig.rc  (added to ~/.gitconfig)"
        run git config --global --add include.path "$dest"
    fi
}

# ---------------------------------------------------------------------------
# 3. oh-my-zsh
# ---------------------------------------------------------------------------
install_omz() {
    if ! command -v zsh >/dev/null 2>&1; then
        echo "skip      oh-my-zsh  (zsh is not installed)"
        echo "          Ubuntu/WSL: sudo apt install zsh     macOS: already installed"
        return
    fi

    if [ -d "${ZSH:-$HOME/.oh-my-zsh}" ]; then
        echo "ok        oh-my-zsh  (already installed)"
        return
    fi

    local fetch
    if command -v curl >/dev/null 2>&1; then
        fetch="curl -fsSL"
    elif command -v wget >/dev/null 2>&1; then
        fetch="wget -qO-"
    else
        echo "skip      oh-my-zsh  (needs curl or wget)"
        return
    fi

    echo "install   oh-my-zsh"
    if [ "$DRY_RUN" -eq 1 ]; then
        echo "          would download and run $OMZ_URL"
        return
    fi

    # Download first, then run, so a failed download is reported instead of
    # silently doing nothing. You can read the installer before running it.
    local tmp
    tmp="$(mktemp "${TMPDIR:-/tmp}/omz-install.XXXXXX")"
    if ! $fetch "$OMZ_URL" > "$tmp"; then
        echo "ERROR     could not download oh-my-zsh. Check your connection."
        rm -f "$tmp"
        return
    fi

    # --unattended : don't change your shell and don't start zsh.
    # KEEP_ZSHRC   : don't overwrite the ~/.zshrc we just copied.
    KEEP_ZSHRC=yes sh "$tmp" --unattended
    rm -f "$tmp"
}

# ---------------------------------------------------------------------------
# Go
# ---------------------------------------------------------------------------
echo "Installing from $REPO_DIR"
[ "$DRY_RUN" -eq 1 ] && echo "(dry run: nothing will be changed)"
echo

for f in $FILES; do
    install_file "$f"
done

setup_gitconfig

if [ "$INSTALL_OMZ" -eq 1 ]; then
    install_omz
fi

echo
echo "Done. Open a new terminal to load everything."

case "${SHELL:-}" in
    */zsh) ;;
    *)
        if command -v zsh >/dev/null 2>&1; then
            echo
            echo "Your login shell is ${SHELL:-unknown}, so zshrc will not load yet."
            echo "To switch to zsh:  chsh -s \"\$(command -v zsh)\""
        fi
        ;;
esac

#!/bin/sh

DOTFILES=$(realpath $0 | xargs dirname)

ssctl() {
    "$DOTFILES/bin/ssctl" "$@"
}

echo "Setting up dotfiles..."

if [ ! -d "$HOME/.oh-my-zsh" ]; then
    echo "Installing Oh My Zsh..."
    RUNZSH=no sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
fi

if ! command -v brew >/dev/null 2>&1; then
    echo "Installing Homebrew..."
    bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

/opt/homebrew/bin/brew update
/opt/homebrew/bin/brew bundle --file=./Brewfile

ln -sf "$DOTFILES/.gitconfig" "$HOME/.gitconfig"
ln -sf "$DOTFILES/.vimrc" "$HOME/.vimrc"
ln -sf "$DOTFILES/.zshrc" "$HOME/.zshrc"
ln -sf "$DOTFILES/aliases.zsh" "$HOME/.oh-my-zsh/custom/aliases.zsh"
ln -sf "$DOTFILES/env.zsh" "$HOME/.oh-my-zsh/custom/env.zsh"
ln -sf "$DOTFILES/vscodium/settings.json" "$HOME/Library/Application Support/VSCodium/User/settings.json"

osascript -e 'quit app "Self Service+"'

ssctl install "Firefox"
ssctl install "Google Chrome"
ssctl install "Slack"
ssctl install "VSCodium (Visual Studio Codium)"
ssctl install "Microsoft Excel"
ssctl install "Microsoft OneDrive"
ssctl install "Microsoft Outlook"
ssctl install "Microsoft Powerpoint"
ssctl install "Microsoft Teams"
ssctl install "Microsoft Word"
ssctl install "Install/Update Microsoft Office Suite"

open -a "Self Service+"
sleep 4
osascript -e 'quit app "Self Service+"'

dockutil --no-restart --remove all
dockutil --no-restart --add "/Applications/Firefox.app" --section apps
dockutil --no-restart --add "/Applications/Microsoft Outlook.app" --section apps
dockutil --no-restart --add "/Applications/Microsoft Teams.app" --section apps
dockutil --no-restart --add "/Applications/Slack.app" --section apps
dockutil --no-restart --add "/Applications/zoom.us.app" --section apps
dockutil --no-restart --add "/System/Applications/Utilities/Terminal.app" --section apps
dockutil --no-restart --add "/Applications/VSCodium" --section apps
dockutil --no-restart --add "/Applications/Bixal App Store" --section apps
dockutil --no-restart --add "/Applications/System Settings.app" --section apps
killall Dock

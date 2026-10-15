#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_NAME="${SUVHLATEX_ENV_NAME:-suvhlatex}"
INSTALL_TEX=0
YES=0

usage() {
  cat <<'HELP'
Usage: ./install.sh [options]

Prepare suvhlatex and create a desktop launcher.

Options:
  --install-tex  Install the recommended TeX Live, BibTeX, and Biber packages
                 through apt when they are missing.
  --yes          Do not ask for confirmation when installing system packages.
  -h, --help     Show this help.
HELP
}

for argument in "$@"; do
  case "$argument" in
    --install-tex) INSTALL_TEX=1 ;;
    --yes) YES=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $argument" >&2; usage >&2; exit 2 ;;
  esac
done

if command -v conda >/dev/null 2>&1; then
  if conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
    conda env update --name "$ENV_NAME" --file "$APP_DIR/environment.yml" --prune
  else
    conda env create --file "$APP_DIR/environment.yml"
  fi
  PYTHON=(conda run --no-capture-output --name "$ENV_NAME" python)
else
  if [[ ! -x "$APP_DIR/.venv/bin/python" ]]; then
    python3 -m venv "$APP_DIR/.venv"
  fi
  PYTHON=("$APP_DIR/.venv/bin/python")
fi

missing_tools=()
for tool in pdflatex bibtex biber; do
  command -v "$tool" >/dev/null 2>&1 || missing_tools+=("$tool")
done

if ((${#missing_tools[@]})); then
  echo "Missing LaTeX tools: ${missing_tools[*]}"
  if ((INSTALL_TEX == 0)); then
    echo "Run ./install.sh --install-tex to install the recommended Ubuntu/Debian packages."
    exit 1
  fi
  if ! command -v apt-get >/dev/null 2>&1; then
    echo "Automatic TeX installation is currently supported only on Debian/Ubuntu systems." >&2
    exit 1
  fi
  if ((YES == 0)); then
    read -r -p "Install TeX Live and bibliography packages with sudo? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }
  fi
  sudo apt-get update
  sudo apt-get install -y \
    texlive-latex-base \
    texlive-latex-recommended \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-publishers \
    texlive-science \
    texlive-bibtex-extra \
    biber
fi

for tool in pdflatex bibtex biber; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Required tool is still missing: $tool" >&2; exit 1; }
done

"${PYTHON[@]}" -m py_compile "$APP_DIR/server.py"
mkdir -p "$HOME/.local/share/applications"
sed "s|__APP_DIR__|$APP_DIR|g" "$APP_DIR/packaging/suvhlatex.desktop.in" > "$HOME/.local/share/applications/suvhlatex.desktop"

echo
echo "suvhlatex is ready."
echo "Run: $APP_DIR/run.sh"
echo "Desktop launcher: $HOME/.local/share/applications/suvhlatex.desktop"

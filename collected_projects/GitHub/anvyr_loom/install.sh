#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────
#  Anvyr Loom — Environment Bootstrap
# ──────────────────────────────────────────────
# Validates the host environment, installs Composer
# dependencies, then hands off to ./loom install.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[1;36m'
BOLD='\033[1m'
RESET='\033[0m'

DEFAULTS=false
PARSER_CHOICE=""
COMPOSER_CMD=()
FORWARD_ARGS=()

normalize_parser() {
    printf '%s' "${1,,}"
}

valid_parser() {
    case "$1" in
        commonmark|parsedown|html) return 0 ;;
        *) return 1 ;;
    esac
}

parser_package() {
    case "$1" in
        commonmark) printf '%s' 'league/commonmark' ;;
        parsedown) printf '%s' 'erusev/parsedown' ;;
        *) printf '%s' '' ;;
    esac
}

composer_require_has_package() {
    local package="$1"

    LOOM_PACKAGE="$package" php -r '
        $json = json_decode((string) file_get_contents("composer.json"), true);
        if (!is_array($json)) {
            exit(1);
        }

        exit(isset($json["require"][getenv("LOOM_PACKAGE")]) ? 0 : 1);
    ' >/dev/null 2>&1
}

run_composer() {
    "${COMPOSER_CMD[@]}" "$@" 2>&1 | sed \
        -e '/ is currently present in the require-dev key and you ran the command without the --dev flag, which will move it to the require key\.$/d' \
        -e 's/^/  /'
}

declared_parser() {
    if composer_require_has_package 'league/commonmark'; then
        printf '%s' 'commonmark'
        return
    fi

    if composer_require_has_package 'erusev/parsedown'; then
        printf '%s' 'parsedown'
        return
    fi

    printf '%s' 'html'
}

prompt_parser_choice() {
    local default_parser="$1"
    local default_index=1
    local choice=""

    case "$default_parser" in
        parsedown) default_index=2 ;;
        html) default_index=3 ;;
    esac

    echo ""
    echo -e "${BOLD}Markdown parser...${RESET}"
    echo "  [1] commonmark - Recommended, full-featured"
    echo "  [2] parsedown  - Fast and simple"
    echo "  [3] html       - No extra dependency"
    echo -n "  Select parser [${default_index}]: "
    read -r choice
    choice="${choice:-$default_index}"

    case "$choice" in
        1) PARSER_CHOICE='commonmark' ;;
        2) PARSER_CHOICE='parsedown' ;;
        3) PARSER_CHOICE='html' ;;
        *) PARSER_CHOICE="$default_parser" ;;
    esac
}

ensure_parser_dependency() {
    local parser="$1"
    local package=""

    package="$(parser_package "$parser")"
    if [[ -z "$package" ]]; then
        return
    fi

    if composer_require_has_package "$package"; then
        check_pass "Optional parser dependency already declared: $package"
        return
    fi

    echo ""
    echo -e "${BOLD}Installing optional parser dependency...${RESET}"

    if run_composer require "$package" --no-interaction --update-no-dev --optimize-autoloader; then
        echo ""
        check_pass "Installed $package"
    else
        echo ""
        check_fail "Failed to install $package"
        exit 1
    fi
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --defaults)
            DEFAULTS=true
            FORWARD_ARGS+=("$1")
            shift
            ;;
        --force|--no-migrate|--no-sample)
            FORWARD_ARGS+=("$1")
            shift
            ;;
        --parser=*)
            PARSER_CHOICE="$(normalize_parser "${1#--parser=}")"
            if ! valid_parser "$PARSER_CHOICE"; then
                echo "Invalid parser: ${1#--parser=}" >&2
                echo "Use one of: commonmark, parsedown, html" >&2
                exit 1
            fi
            shift
            ;;
        --parser)
            if [[ $# -lt 2 ]]; then
                echo "Missing value for --parser" >&2
                exit 1
            fi

            PARSER_CHOICE="$(normalize_parser "$2")"
            if ! valid_parser "$PARSER_CHOICE"; then
                echo "Invalid parser: $2" >&2
                echo "Use one of: commonmark, parsedown, html" >&2
                exit 1
            fi
            shift 2
            ;;
        --help|-h)
            echo "Usage: ./install.sh [--defaults] [--force] [--no-migrate] [--no-sample] [--parser=commonmark|parsedown|html]"
            echo ""
            echo "Bootstraps the environment and runs ./loom install."
            echo "If a parser is selected, install.sh installs the optional package before running the installer."
            exit 0
            ;;
        *)
            FORWARD_ARGS+=("$1")
            shift
            ;;
    esac
done

passed=0
failed=0
warned=0

check_pass() {
    echo -e "  ${GREEN}✓${RESET} $1"
    passed=$((passed + 1))
}

check_fail() {
    echo -e "  ${RED}✗${RESET} $1"
    failed=$((failed + 1))
}

check_warn() {
    echo -e "  ${YELLOW}!${RESET} $1"
    warned=$((warned + 1))
}

# ── Banner ──────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║       Anvyr Loom Environment Setup       ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── 1. PHP ──────────────────────────────────
echo -e "${BOLD}Checking PHP...${RESET}"

if ! command -v php &>/dev/null; then
    check_fail "PHP not found in PATH"
else
    PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION . "." . PHP_MINOR_VERSION;')
    PHP_MAJOR=$(php -r 'echo PHP_MAJOR_VERSION;')
    PHP_MINOR=$(php -r 'echo PHP_MINOR_VERSION;')

    if [[ "$PHP_MAJOR" -gt 8 ]] || { [[ "$PHP_MAJOR" -eq 8 ]] && [[ "$PHP_MINOR" -ge 4 ]]; }; then
        check_pass "PHP ${PHP_VERSION} ($(php -r 'echo PHP_VERSION;'))"
    else
        check_fail "PHP ${PHP_VERSION} — requires >= 8.4"
    fi
fi

# ── 2. Required extensions ──────────────────
echo ""
echo -e "${BOLD}Checking PHP extensions...${RESET}"

REQUIRED_EXTS=(pdo pdo_sqlite mbstring json openssl)
OPTIONAL_EXTS=(curl pdo_mysql pdo_pgsql apcu redis)

has_ext() { php -r "exit(extension_loaded('$1') ? 0 : 1);" 2>/dev/null; }

for ext in "${REQUIRED_EXTS[@]}"; do
    if has_ext "$ext"; then
        check_pass "$ext"
    else
        check_fail "$ext (required)"
    fi
done

for ext in "${OPTIONAL_EXTS[@]}"; do
    if has_ext "$ext"; then
        check_pass "$ext (optional)"
    else
        check_warn "$ext (optional, not loaded)"
    fi
done

# ── 3. Composer ─────────────────────────────
echo ""
echo -e "${BOLD}Checking Composer...${RESET}"

if command -v composer &>/dev/null; then
    COMPOSER_CMD=(composer)
    COMPOSER_VERSION=$("${COMPOSER_CMD[@]}" --version 2>/dev/null | head -1)
    check_pass "$COMPOSER_VERSION"
elif [[ -f "$SCRIPT_DIR/composer.phar" ]]; then
    COMPOSER_CMD=(php composer.phar)
    check_pass "composer.phar (local)"
else
    check_warn "Composer not found"

    if [[ "$DEFAULTS" == true ]]; then
        INSTALL_COMPOSER="y"
    else
        echo -n "  Download composer.phar locally? [Y/n] "
        read -r INSTALL_COMPOSER
        INSTALL_COMPOSER="${INSTALL_COMPOSER:-y}"
    fi

    if [[ "${INSTALL_COMPOSER,,}" == "y" ]]; then
        echo "  Downloading..."
        if php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"; then
            if php composer-setup.php --quiet 2>/dev/null; then
                rm -f composer-setup.php
                COMPOSER_CMD=(php composer.phar)
                check_pass "composer.phar downloaded"
            else
                rm -f composer-setup.php
                check_fail "Composer install failed"
            fi
        else
            check_fail "Could not download Composer installer"
        fi
    else
        check_fail "Composer is required"
    fi
fi

# ── 4. Permissions ──────────────────────────
echo ""
echo -e "${BOLD}Checking permissions...${RESET}"

if [[ -w "$SCRIPT_DIR" ]]; then
    check_pass "Project directory is writable"
else
    check_fail "Project directory is not writable"
fi

# ── Summary ─────────────────────────────────
echo ""
echo -e "${BOLD}Pre-flight: ${GREEN}${passed} passed${RESET}, ${RED}${failed} failed${RESET}, ${YELLOW}${warned} warnings${RESET}"

if [[ "$failed" -gt 0 ]]; then
    echo ""
    echo -e "${RED}Cannot proceed — fix the failed checks above.${RESET}"
    exit 1
fi

if [[ -z "${COMPOSER_ROOT_VERSION:-}" ]]; then
    COMPOSER_ROOT_VERSION="$(php -r '$config = require "config/version.php"; echo $config["core"]["version"] ?? "";' 2>/dev/null)"
    export COMPOSER_ROOT_VERSION
fi

# ── 5. Composer install ─────────────────────
echo ""
echo -e "${BOLD}Installing dependencies...${RESET}"

if [[ ! -f "$SCRIPT_DIR/vendor/autoload.php" ]] || [[ "$SCRIPT_DIR/composer.lock" -nt "$SCRIPT_DIR/vendor/autoload.php" ]]; then
    run_composer install --no-dev --optimize-autoloader --no-interaction
    echo ""
    check_pass "Dependencies installed"
else
    check_pass "Dependencies up to date"
fi

if [[ -z "$PARSER_CHOICE" ]]; then
    if [[ "$DEFAULTS" == true ]]; then
        PARSER_CHOICE="$(declared_parser)"
    else
        DEFAULT_PARSER="$(declared_parser)"
        if [[ "$DEFAULT_PARSER" == 'html' ]]; then
            DEFAULT_PARSER='commonmark'
        fi
        prompt_parser_choice "$DEFAULT_PARSER"
    fi
fi

ensure_parser_dependency "$PARSER_CHOICE"

if [[ -n "$PARSER_CHOICE" ]]; then
    FORWARD_ARGS+=("--parser=$PARSER_CHOICE")
fi

# ── 6. Hand off to ./loom install ─────────
echo ""
echo -e "${BOLD}Starting project setup...${RESET}"
echo ""

exec php "$SCRIPT_DIR/loom" install "${FORWARD_ARGS[@]}"

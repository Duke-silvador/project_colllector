#!/bin/bash

set -Eeuo pipefail

readonly API_URL="https://api.github.com"
readonly REPO_OWNER="${1:-}"
readonly REPO_NAME="${2:-}"
readonly GITHUB_TOKEN="${GITHUB_TOKEN:-}"
readonly GITHUB_USER="${GITHUB_USER:-}"

usage() {
    cat <<EOF
Usage:
    GITHUB_TOKEN=<token> GITHUB_USER=<username> $0 <repo-owner> <repo-name>

Example:
    GITHUB_TOKEN="\$TOKEN" \
    GITHUB_USER="HamzehMughal" \
    $0 haemzey aws_resource_tracker
EOF
}

log() {
    printf '[INFO] %s\n' "$*"
}

warn() {
    printf '[WARN] %s\n' "$*" >&2
}

error() {
    printf '[ERROR] %s\n' "$*" >&2
}

die() {
    error "$*"
    exit 1
}

cleanup() {
    rm -f "${response_file:-}" 2>/dev/null || true
}

trap cleanup EXIT
trap 'error "Command failed at line $LINENO: $BASH_COMMAND"' ERR

[[ -n "$REPO_OWNER" ]] ||
    die "Repository owner is required."

[[ -n "$REPO_NAME" ]] ||
    die "Repository name is required."

[[ -n "$GITHUB_TOKEN" ]] ||
    die "GITHUB_TOKEN environment variable is not set."

[[ -n "$GITHUB_USER" ]] ||
    die "GITHUB_USER environment variable is not set."

for command in curl jq mktemp; do
    command -v "$command" >/dev/null 2>&1 ||
        die "Required command not found: $command"
done

github_api_get() {
    local endpoint="$1"
    local url="${API_URL}/${endpoint}"

    response_file="$(mktemp)"

    local http_code

    http_code="$(
        curl \
            --silent \
            --show-error \
            --location \
            --request GET \
            --user "${GITHUB_USER}:${GITHUB_TOKEN}" \
            --header "Accept: application/vnd.github+json" \
            --header "X-GitHub-Api-Version: 2022-11-28" \
            --output "$response_file" \
            --write-out '%{http_code}' \
            "$url"
    )"

    if [[ "$http_code" != "200" ]]; then
        error "GitHub API request failed."
        error "Endpoint : $endpoint"
        error "HTTP code : $http_code"

        if jq -e '.message' "$response_file" >/dev/null 2>&1; then
            error "Message   : $(jq -r '.message' "$response_file")"
        fi

        return 1
    fi

    cat "$response_file"
}

list_collaborators() {

    local endpoint
    endpoint="repos/${REPO_OWNER}/${REPO_NAME}/collaborators?per_page=100"

    log "Fetching repository collaborators..."
    log "Repository: ${REPO_OWNER}/${REPO_NAME}"

    github_api_get "$endpoint"
}

display_collaborators() {

    local collaborators="$1"

    local count

    count="$(jq 'length' <<< "$collaborators")"

    if [[ "$count" -eq 0 ]]; then
        warn "No collaborators found."
        return 0
    fi

    printf '\n'
    printf '%-25s %-12s %-12s\n' \
        "USERNAME" "ROLE" "ACCESS"

    printf '%-25s %-12s %-12s\n' \
        "-------------------------" \
        "------------" \
        "------------"

    jq -r '
        .[] |
        [
            .login,
            .role_name,
            (
                if .permissions.admin then "admin"
                elif .permissions.maintain then "maintain"
                elif .permissions.push then "write"
                elif .permissions.triage then "triage"
                elif .permissions.pull then "read"
                else "unknown"
                end
            )
        ] |
        @tsv
    ' <<< "$collaborators" |
    while IFS=$'\t' read -r username role access; do
        printf '%-25s %-12s %-12s\n' \
            "$username" \
            "$role" \
            "$access"
    done

    printf '\n'
    log "Total collaborators: $count"
}

list_read_users() {

    local collaborators="$1"

    printf '\n'
    printf '%s\n' \
        "Users with read-level access:"
    printf '%s\n' \
        "--------------------------------"

    jq -r '
        .[] |
        select(
            .permissions.pull == true and
            .permissions.push == false and
            .permissions.admin == false and
            .permissions.maintain == false
        ) |
        .login
    ' <<< "$collaborators"
}

list_write_users() {

    local collaborators="$1"

    printf '\n'
    printf '%s\n' \
        "Users with write-level access:"
    printf '%s\n' \
        "--------------------------------"

    jq -r '
        .[] |
        select(
            .permissions.push == true
        ) |
        .login
    ' <<< "$collaborators"
}

main() {

    if [[ "$REPO_OWNER" == "-h" || "$REPO_OWNER" == "--help" ]]; then
        usage
        exit 0
    fi

    log "Starting GitHub repository access audit."

    collaborators="$(list_collaborators)"

    display_collaborators "$collaborators"

    list_read_users "$collaborators"

    list_write_users "$collaborators"

    log "GitHub repository access audit completed."
}

main "$@"


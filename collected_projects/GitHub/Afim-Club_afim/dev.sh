#!/usr/bin/env bash
# Local development: start/stop MariaDB, the CMS and both Astro sites in one go.
#
#   ./dev.sh          start everything in the background (logs in .tmp/)
#   ./dev.sh stop     stop the CMS and the sites (MariaDB keeps running; `docker compose stop` stops it)
#
# Public hostnames (e.g. a Cloudflare tunnel) are optional. Set them in the root .env
# or in the environment; when unset, everything stays on localhost:
#   DEV_WEB_HOST=dev.afim.club  DEV_PARTNERS_HOST=dev-afiliados.afim.club  DEV_CMS_HOST=dev-dash.afim.club
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p .tmp

# Read only the DEV_* lines from .env (the rest of it is for docker compose).
if [ -f .env ]; then
  while IFS='=' read -r key value; do
    [ -z "${!key:-}" ] && export "$key=$value"
  done < <(grep -E '^DEV_[A-Z_]+=' .env || true)
fi

stop() {
  (cd web && npx astro dev stop >/dev/null 2>&1) || true
  (cd partners && npx astro dev stop >/dev/null 2>&1) || true
  if [ -f .tmp/cms.pid ]; then
    kill -- "-$(cat .tmp/cms.pid)" 2>/dev/null || true
    rm -f .tmp/cms.pid
  fi
  echo "Stopped the CMS and the sites."
}

if [ "${1:-}" = "stop" ]; then stop; exit 0; fi
stop >/dev/null

[ -f cms/.env ] || cp cms/.env.example cms/.env
docker compose up -d --wait

# Browser-side API base and CORS origins follow the public hostnames when set.
cors="http://localhost:4321,http://localhost:4322"
api="http://localhost:1337"
[ -n "${DEV_WEB_HOST:-}" ] && cors="$cors,https://$DEV_WEB_HOST"
[ -n "${DEV_PARTNERS_HOST:-}" ] && cors="$cors,https://$DEV_PARTNERS_HOST"
[ -n "${DEV_CMS_HOST:-}" ] && api="https://$DEV_CMS_HOST"

(
  cd cms
  export DATABASE_HOST=127.0.0.1 CORS_ORIGINS="$cors"
  if [ -n "${DEV_CMS_HOST:-}" ]; then export PROXY=true PUBLIC_URL="$api"; fi
  # Social logins redirect back to the public site
  if [ -n "${DEV_WEB_HOST:-}" ]; then export WEB_URL="https://$DEV_WEB_HOST"; fi
  setsid nohup npm run develop > ../.tmp/cms.log 2>&1 &
  echo $! > ../.tmp/cms.pid
)
echo -n "Waiting for the CMS"
until curl -sf http://localhost:1337/_health >/dev/null; do
  sleep 3; echo -n .
  kill -0 "$(cat .tmp/cms.pid)" 2>/dev/null || { echo; echo "CMS failed, see .tmp/cms.log"; exit 1; }
done
echo

# site dir, public hostname
start_site() {
  local args=()
  [ -n "$2" ] && args=(--host --allowed-hosts "$2")
  (cd "$1" && PUBLIC_STRAPI_URL="$api" nohup npm run dev -- "${args[@]}" > "../.tmp/$1.log" 2>&1 < /dev/null)
}
start_site web "${DEV_WEB_HOST:-}"
start_site partners "${DEV_PARTNERS_HOST:-}"

cat <<EOF
Running:
  CMS       http://localhost:1337/admin ${DEV_CMS_HOST:+-> https://$DEV_CMS_HOST}
  web       http://localhost:4321       ${DEV_WEB_HOST:+-> https://$DEV_WEB_HOST}
  partners  http://localhost:4322       ${DEV_PARTNERS_HOST:+-> https://$DEV_PARTNERS_HOST}
Logs in .tmp/. Stop with ./dev.sh stop
EOF

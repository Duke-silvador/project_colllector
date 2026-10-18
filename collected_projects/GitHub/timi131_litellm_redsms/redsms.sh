#!/usr/bin/env bash
# Управление всем: LLM-стек и Telegram-бот.
#
#   ./redsms.sh start      запустить всё
#   ./redsms.sh stop       остановить всё
#   ./redsms.sh restart    перезапустить всё (после изменения настроек)
#   ./redsms.sh status     состояние контейнеров
#   ./redsms.sh logs [bot|admin|open-webui|litellm|tika|ollama]   логи (по умолчанию бот)
#   ./redsms.sh check      проверить API, модель, базу знаний и токен бота
#   ./redsms.sh update     обновить код и контейнеры (то же, что ./deploy.sh --yes)
set -euo pipefail
cd "$(dirname "$0")"
BOT_DIR=${BOT_DIR:-bot}

bot() { [ -d "$BOT_DIR" ] || { echo "Бот не установлен: запустите ./deploy.sh" >&2; return 1; }; (cd "$BOT_DIR" && docker compose "$@"); }
stack() { docker compose "$@"; }

wait_ready() {
  echo "Ожидание готовности LiteLLM и Open WebUI..."
  for _ in $(seq 1 90); do
    status=$(stack ps --format '{{.Service}}={{.Health}}')
    echo "$status" | grep -q '^litellm=healthy' && echo "$status" | grep -q '^open-webui=healthy' && return 0
    sleep 2
  done
  echo "Сервисы не стали готовы за 3 минуты: ./redsms.sh logs open-webui" >&2
  return 1
}

case "${1:-}" in
  start)   stack up -d && bot up -d && wait_ready && ./scripts/ui.sh url ;;
  stop)    bot stop || true; stack stop ;;
  restart) stack restart && bot restart ;;
  status)  echo "LLM-стек:"; stack ps --format '{{.Service}}: {{.Status}}'
           echo "Бот:"; bot ps --format '{{.Service}}: {{.Status}}' ;;
  logs)    service=${2:-bot}
           case "$service" in bot|admin|jivo|omnidesk) bot logs -f --tail 100 "$service" ;;
                              *) stack logs -f --tail 100 "$service" ;; esac ;;
  check)   failed=0
           echo "LLM API:"; ./scripts/test.sh || failed=1
           echo "Бот:"; bot run --rm --no-deps bot python -m support.check || failed=1
           exit "$failed" ;;
  update)  ./deploy.sh --yes ;;
  *)       sed -n '2,11p' "$0"; exit 1 ;;
esac

#!/usr/bin/env bash
# Установка и обновление стека LiteLLM + Open WebUI.
#
#   ./install.sh                 первая установка (вопросы) или обновление
#   ./install.sh --reconfigure   заново выбрать, где работает Ollama
#   ./install.sh --yes           без вопросов (значения по умолчанию или из .env)
set -euo pipefail
cd "$(dirname "$0")"

RECONFIGURE=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --reconfigure) RECONFIGURE=1 ;;
    -y|--yes) ASSUME_YES=1 ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "Неизвестный параметр: $arg" >&2; exit 1 ;;
  esac
done

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- работа с .env без sed -i (одинаково на Linux и macOS) ---
get_kv() {
  [ -f .env ] || return 0
  { grep -E "^$1=" .env || true; } | tail -n 1 | tr -d '\r' | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//"
}
set_kv() {  # set_kv KEY VALUE; пустое VALUE удаляет ключ
  local key=$1 value=$2 tmp
  tmp=$(mktemp)
  awk -v k="$key" -v v="$value" '
    BEGIN { done = 0 }
    { sub(/\r$/, "") }
    index($0, k "=") == 1 { if (!done && v != "") print k "=" v; done = 1; next }
    { print }
    END { if (!done && v != "") print k "=" v }
  ' .env > "$tmp"
  cat "$tmp" > .env && rm -f "$tmp"
}
choose() {  # choose "вопрос" вариант_по_умолчанию → REPLY_VALUE
  local prompt=$1 default=$2 answer
  if [ "$ASSUME_YES" = 1 ]; then REPLY_VALUE=$default; return; fi
  read -r -p "  $prompt [$default]: " answer
  REPLY_VALUE=${answer:-$default}
}
yes_no() {
  local prompt=$1 default=$2 answer
  [ "$ASSUME_YES" = 1 ] && { [ "$default" = y ]; return; }
  read -r -p "  $prompt [$([ "$default" = y ] && echo Y/n || echo y/N)]: " answer
  answer=${answer:-$default}
  [[ "$answer" =~ ^[YyДд] ]]
}
host_ollama_up() { curl -sf -o /dev/null --max-time 3 http://localhost:11434/api/version; }

# --- 1. Проверки ---
say "1/5 Проверка окружения"
command -v docker >/dev/null || die "Нужен Docker: https://docs.docker.com/engine/install/"
docker compose version >/dev/null 2>&1 || die "Нужен Docker Compose v2 (команда docker compose)"
docker info >/dev/null 2>&1 || die "Docker не запущен (на macOS/Windows откройте Docker Desktop)"
command -v openssl >/dev/null || die "Нужен openssl"
command -v curl >/dev/null || die "Нужен curl"
ok "Docker $(docker version --format '{{.Server.Version}}')"

# --- 2. Настройки ---
say "2/5 Настройки (.env)"
FRESH=0
[ -f .env ] || FRESH=1
./scripts/init.sh >/dev/null
ok "$([ "$FRESH" = 1 ] && echo "Создан .env, сгенерированы секреты" || echo "Используется существующий .env")"

current_mode() {
  case "$(get_kv COMPOSE_PROFILES)" in
    *ollama*) case "$(get_kv COMPOSE_FILE)" in *gpu*) echo gpu ;; *) echo container ;; esac ;;
    *) case "$(get_kv OLLAMA_URL)" in ""|*host.docker.internal*) echo host ;; *) echo remote ;; esac ;;
  esac
}
detect_mode() {
  if [ "$(uname -s)" = Darwin ]; then echo host
  elif command -v nvidia-smi >/dev/null && docker info 2>/dev/null | grep -qi nvidia; then echo gpu
  elif host_ollama_up; then echo host
  else echo container
  fi
}

MODE=$(current_mode)
if [ "$FRESH" = 1 ] || [ "$RECONFIGURE" = 1 ]; then
  default_mode=$( [ "$FRESH" = 1 ] && detect_mode || echo "$MODE" )
  echo "  Где будет работать Ollama (модели)?"
  echo "    host      — на этом компьютере вне Docker (macOS: лучший вариант, есть GPU/Metal)"
  echo "    container — в контейнере на процессоре (Linux без видеокарты)"
  echo "    gpu       — в контейнере с NVIDIA GPU (нужен NVIDIA Container Toolkit)"
  echo "    remote    — на другом сервере"
  while :; do
    choose "Вариант" "$default_mode"; MODE=$REPLY_VALUE
    case "$MODE" in host|container|gpu|remote) break ;; esac
    [ "$ASSUME_YES" = 1 ] && die "Неизвестный вариант $MODE"
    warn "Введите host, container, gpu или remote"
  done

  case "$MODE" in
    host)      set_kv OLLAMA_URL "http://host.docker.internal:11434"; set_kv COMPOSE_PROFILES ""; set_kv COMPOSE_FILE "" ;;
    container) set_kv OLLAMA_URL "http://ollama:11434"; set_kv COMPOSE_PROFILES ollama; set_kv COMPOSE_FILE "" ;;
    gpu)       set_kv OLLAMA_URL "http://ollama:11434"; set_kv COMPOSE_PROFILES ollama
               set_kv COMPOSE_FILE "docker-compose.yml:docker-compose.gpu.yml" ;;
    remote)    current=$(get_kv OLLAMA_URL)
               case "$current" in *host.docker.internal*|*//ollama:*|"") current="http://192.168.1.10:11434" ;; esac
               choose "Адрес Ollama на другом сервере" "$current"
               set_kv OLLAMA_URL "$REPLY_VALUE"; set_kv COMPOSE_PROFILES ""; set_kv COMPOSE_FILE "" ;;
  esac
fi
ok "Ollama: $MODE ($(get_kv OLLAMA_URL))"

if [ "$MODE" = host ] && ! host_ollama_up; then
  if [ "$(uname -s)" = Darwin ] && command -v brew >/dev/null && yes_no "Ollama не запущена. Установить и запустить через Homebrew?" y; then
    command -v ollama >/dev/null || brew install ollama
    brew services start ollama
    for _ in $(seq 1 30); do host_ollama_up && break; sleep 1; done
  fi
  host_ollama_up || die "Ollama на этом компьютере не отвечает на :11434. Установите её с https://ollama.com и запустите, затем повторите ./install.sh"
fi
if [ "$MODE" = host ] && [ "$(uname -s)" = Darwin ] && [ ! -f "$HOME/Library/LaunchAgents/local.ollama.tuning.plist" ] \
   && yes_no "Включить для Ollama flash attention и удержание модели в памяти (перезапустит Ollama)?" y; then
  ./scripts/ollama-tuning.sh install
fi
if [ "$MODE" = remote ]; then
  curl -sf -o /dev/null --max-time 5 "$(get_kv OLLAMA_URL)/api/version" \
    && ok "Удалённая Ollama отвечает" \
    || warn "Удалённая Ollama не отвечает с этого компьютера: проверьте OLLAMA_HOST=0.0.0.0 и файрвол на том сервере"
fi

# --- 3. Запуск ---
say "3/5 Загрузка образов и запуск"
docker compose pull --ignore-buildable --quiet
docker compose up -d --build --remove-orphans
echo "  Ожидание готовности сервисов (первый запуск Open WebUI — до пары минут)..."
for _ in $(seq 1 150); do
  status=$(docker compose ps --format '{{.Service}}={{.Health}}')
  echo "$status" | grep -q '^litellm=healthy' && echo "$status" | grep -q '^open-webui=healthy' && break
  sleep 2
done
echo "$status" | grep -q '^open-webui=healthy' || die "Open WebUI не запустился: docker compose logs open-webui"
ok "Сервисы: $(docker compose ps --services --status running | tr '\n' ' ')"

# --- 4. Модели ---
say "4/5 Модели"
if [ "$MODE" = remote ]; then
  warn "Скачайте модели на сервере Ollama: ollama pull llama3.1:8b && ollama pull embeddinggemma"
else
  ./scripts/pull-models.sh
  ok "Модели скачаны"
fi

# --- 5. Проверка ---
say "5/5 Проверка API"
if ./scripts/test.sh; then CHECK_OK=1; else CHECK_OK=0; fi

say "Готово"
./scripts/ui.sh url
[ "$FRESH" = 1 ] && echo "  Откройте чат и зарегистрируйтесь первым: первый пользователь становится администратором."
echo "  Модель поддержки с базой знаний: README.md, раздел «База знаний и модель поддержки»."
echo "  Логи:       docker compose logs -f open-webui"
echo "  Бэкап:      ./scripts/backup.sh"
echo "  Обновление: git pull && ./install.sh"
[ "$CHECK_OK" = 1 ] || { warn "Проверка API не прошла: docker compose logs litellm"; exit 1; }

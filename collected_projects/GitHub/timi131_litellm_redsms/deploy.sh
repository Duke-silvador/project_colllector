#!/usr/bin/env bash
# Полное развёртывание одной командой: LLM-стек (LiteLLM, Open WebUI, Tika, Ollama)
# и Telegram-бот поддержки, отвечающий по базе знаний.
#
#   ./deploy.sh                 первая установка или обновление всего
#   ./deploy.sh --reconfigure   заново ответить на вопросы
#   ./deploy.sh --yes           без вопросов (обновление)
#
# Спрашивает: где работает Ollama, email и пароль администратора чата,
# токен Telegram-бота, ID чата специалистов. Остальное настраивается само.
# Документы для базы знаний положите в knowledge/ (иначе берутся документы из репозитория бота).
set -euo pipefail
cd "$(dirname "$0")"

BOT_REPO=${BOT_REPO:-https://github.com/timi131/redsms_jivo_test.git}
BOT_DIR=${BOT_DIR:-bot}
KB_NAME=${KB_NAME:-База знаний REDSMS}
MODEL_ID=${MODEL_ID:-redsms-support}
MODEL_NAME=${MODEL_NAME:-Поддержка REDSMS}

FLAGS=()
RECONFIGURE=0
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --reconfigure) RECONFIGURE=1; FLAGS+=("$arg") ;;
    -y|--yes) ASSUME_YES=1; FLAGS+=("$arg") ;;
    -h|--help) sed -n '2,11p' "$0"; exit 0 ;;
    *) echo "Неизвестный параметр: $arg" >&2; exit 1 ;;
  esac
done

say()  { printf '\n\033[1;34m== %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

get_kv() {  # get_kv FILE KEY
  [ -f "$1" ] || return 0
  { grep -E "^$2=" "$1" || true; } | tail -n 1 | tr -d '\r' | cut -d= -f2- | sed -e "s/^['\"]//" -e "s/['\"]$//"
}
set_kv() {  # set_kv FILE KEY VALUE
  local file=$1 key=$2 value=$3 tmp
  case "$value" in *[[:space:]#]*) value="\"${value//\"/\\\"}\"" ;; esac
  touch "$file"; tmp=$(mktemp)
  awk -v k="$key" -v v="$value" '
    BEGIN { done = 0 } { sub(/\r$/, "") }
    index($0, k "=") == 1 { if (!done) print k "=" v; done = 1; next }
    { print } END { if (!done) print k "=" v }
  ' "$file" > "$tmp"
  cat "$tmp" > "$file" && rm -f "$tmp"
}
ask() {  # ask "вопрос" "по умолчанию" → REPLY_VALUE
  local answer
  if [ "$ASSUME_YES" = 1 ]; then REPLY_VALUE=$2; return; fi
  read -r -p "  $1${2:+ [$2]}: " answer; REPLY_VALUE=${answer:-$2}
}
ask_secret() {  # ask_secret "вопрос" "regex" → REPLY_VALUE
  local answer
  while :; do
    read -r -s -p "  $1: " answer; echo
    [[ "$answer" =~ $2 ]] && break
    warn "Неверный формат, попробуйте ещё раз"
  done
  REPLY_VALUE=$answer
}

STACK_ENV=.env
BOT_ENV=$BOT_DIR/config/.env

# --- 1. Код ---
say "1/5 Код стека и бота"
if [ -d .git ] && git diff --quiet 2>/dev/null; then
  git pull --ff-only -q 2>/dev/null && ok "Стек обновлён ($(git log -1 --format=%h))" || warn "Не удалось обновить стек из git, продолжаю с текущей версией"
fi
if [ -d "$BOT_DIR/.git" ]; then
  git -C "$BOT_DIR" pull --ff-only -q 2>/dev/null && ok "Бот обновлён ($(git -C "$BOT_DIR" log -1 --format=%h))" || warn "Не удалось обновить бота из git"
else
  command -v git >/dev/null || die "Нужен git"
  git clone -q "$BOT_REPO" "$BOT_DIR"
  ok "Бот скачан в $BOT_DIR/"
fi

# --- 2. LLM-стек ---
say "2/5 LLM-стек"
./install.sh "${FLAGS[@]+"${FLAGS[@]}"}"

# --- 3. Open WebUI: администратор, ключ, база знаний, модель ---
say "3/5 Настройка Open WebUI"
NEED_BOOTSTRAP=$RECONFIGURE
[ -n "$(get_kv "$BOT_ENV" OPENWEBUI_API_KEY)" ] && [ -n "$(get_kv "$BOT_ENV" OPENWEBUI_KNOWLEDGE_ID)" ] || NEED_BOOTSTRAP=1
if [ "$NEED_BOOTSTRAP" = 1 ]; then
  [ "$ASSUME_YES" = 1 ] && die "Open WebUI ещё не настроен для бота: запустите ./deploy.sh без --yes"
  onboarding=$(docker compose exec -T open-webui python -c "import json,urllib.request;print(json.load(urllib.request.urlopen('http://localhost:8080/api/config')).get('onboarding',False))" </dev/null)
  if [ "$onboarding" = True ]; then
    echo "  Создаём администратора чата (первый пользователь Open WebUI)."
  else
    echo "  Open WebUI уже настроен: войдите как администратор."
  fi
  ask "Email администратора" "$(get_kv "$STACK_ENV" WEBUI_ADMIN_EMAIL)"; admin_email=$REPLY_VALUE
  [[ "$admin_email" =~ ^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$ ]] || die "Неверный email"
  ask_secret "Пароль администратора (не короче 8 символов)" '^.{8,}$'; admin_password=$REPLY_VALUE
  set_kv "$STACK_ENV" WEBUI_ADMIN_EMAIL "$admin_email"

  kb_src=knowledge
  if [ -z "$(find "$kb_src" -type f ! -name '.*' 2>/dev/null | head -1)" ]; then
    kb_src=$BOT_DIR/knowledge
    warn "knowledge/ пуст — в базу знаний пойдут документы из репозитория бота ($kb_src)"
  fi
  container=$(docker compose ps -q open-webui)
  docker exec "$container" rm -rf /tmp/kb </dev/null
  docker cp "$kb_src/." "$container:/tmp/kb"
  docker cp bootstrap/support-prompt.md "$container:/tmp/support-prompt.md"
  result=$(docker compose exec -T \
    -e ADMIN_EMAIL="$admin_email" -e ADMIN_PASSWORD="$admin_password" \
    -e KB_NAME="$KB_NAME" -e KB_DIR=/tmp/kb -e MODEL_ID="$MODEL_ID" -e MODEL_NAME="$MODEL_NAME" \
    -e PROMPT_FILE=/tmp/support-prompt.md \
    open-webui python - < bootstrap/openwebui_bootstrap.py | tail -n 1)
  docker exec "$container" rm -rf /tmp/kb /tmp/support-prompt.md </dev/null
  json_get() { printf '%s' "$result" | sed -n "s/.*\"$1\": \"\([^\"]*\)\".*/\1/p"; }
  owui_key=$(json_get api_key); kb_id=$(json_get knowledge_id)
  [ -n "$owui_key" ] && [ -n "$kb_id" ] || die "Настройка Open WebUI не завершилась"

  set_kv "$STACK_ENV" WEBUI_DEFAULT_MODEL "$MODEL_ID"
  docker compose up -d --quiet-pull >/dev/null || die "Не удалось применить модель по умолчанию: docker compose up -d"
  ok "Модель «$MODEL_NAME» выбрана по умолчанию в чате"
else
  ok "Open WebUI уже настроен для бота"
fi

# --- 4. Бот ---
say "4/5 Telegram-бот"
mkdir -p "$BOT_DIR/config"
[ -f "$BOT_ENV" ] || { tr -d '\r' < "$BOT_DIR/.env.example" > "$BOT_ENV"; chmod 600 "$BOT_ENV"; }

network=$(get_kv "$STACK_ENV" STACK_NETWORK); network=${network:-redsms-llm}
ollama_url=$(get_kv "$STACK_ENV" OLLAMA_URL)
# Бот подключается к сети стека и обращается к сервисам по именам
cat > "$BOT_DIR/docker-compose.override.yml" <<EOF
# Создано deploy.sh: подключает бота к сети LLM-стека ($network)
services:
  bot:      { networks: [default, llm] }
  admin:    { networks: [default, llm] }
  jivo:     { networks: [default, llm] }
  omnidesk: { networks: [default, llm] }
networks:
  llm:
    external: true
    name: $network
EOF
grep -qx 'docker-compose.override.yml' "$BOT_DIR/.git/info/exclude" 2>/dev/null || echo 'docker-compose.override.yml' >> "$BOT_DIR/.git/info/exclude"

set_kv "$BOT_ENV" LLM_PROVIDER ollama
set_kv "$BOT_ENV" OLLAMA_BASE_URL "${ollama_url:-http://host.docker.internal:11434}"
set_kv "$BOT_ENV" OLLAMA_MODEL llama3.1:8b
set_kv "$BOT_ENV" OLLAMA_NUM_CTX 8192
set_kv "$BOT_ENV" KNOWLEDGE_SOURCE openwebui
set_kv "$BOT_ENV" OPENWEBUI_URL http://open-webui:8080
if [ "$NEED_BOOTSTRAP" = 1 ]; then
  set_kv "$BOT_ENV" OPENWEBUI_API_KEY "$owui_key"
  set_kv "$BOT_ENV" OPENWEBUI_KNOWLEDGE_ID "$kb_id"
fi
if [ -z "$(get_kv "$BOT_ENV" TELEGRAM_BOT_TOKEN)" ] || [ "$RECONFIGURE" = 1 ]; then
  [ "$ASSUME_YES" = 1 ] && die "Не задан токен бота: запустите ./deploy.sh без --yes"
  ask_secret "Токен Telegram-бота от @BotFather" '^[0-9]+:[A-Za-z0-9_-]{30,}$'
  set_kv "$BOT_ENV" TELEGRAM_BOT_TOKEN "$REPLY_VALUE"
  ask "ID чата специалистов для передачи вопросов (Enter — пропустить)" "$(get_kv "$BOT_ENV" SUPPORT_CHAT_ID)"
  set_kv "$BOT_ENV" SUPPORT_CHAT_ID "$REPLY_VALUE"
fi
ok "Настройки бота: $BOT_ENV"

# Мастер бота: без вопросов, все значения уже в config/.env
bot_ok=1
(cd "$BOT_DIR" && ./install.sh --yes </dev/null) || bot_ok=0

# --- 5. Итог ---
say "5/5 Готово"
./scripts/ui.sh url
[ "$NEED_BOOTSTRAP" = 1 ] && echo "  Вход в чат: $(get_kv "$STACK_ENV" WEBUI_ADMIN_EMAIL) и пароль, который вы ввели"
admin_port=$(get_kv "$BOT_DIR/.env" ADMIN_PORT)
echo "  Админка бота: http://127.0.0.1:${admin_port:-8765} (пароль показан выше при первой установке, хранится в $BOT_ENV)"
echo
echo "  Управление: ./redsms.sh start | stop | restart | status | logs | check"
echo "  Обновление: ./deploy.sh"
[ "$bot_ok" = 1 ] || { warn "Бот запущен, но не все проверки прошли — см. вывод выше"; exit 1; }

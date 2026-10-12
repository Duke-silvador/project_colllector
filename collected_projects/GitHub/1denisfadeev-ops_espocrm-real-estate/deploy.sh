#!/bin/sh
# Выкладка кастомизаций в работающий контейнер EspoCRM.
#
# Исходники лежат в espo-custom/ и versionируются git-ом, а в контейнере
# живут в двух томах Docker. Скрипт копирует одно в другое и чистит кэш.
# Контейнеры при этом не пересоздаются, данные CRM не трогаются.
#
# Запуск:  ./deploy.sh
# Другой экземпляр:  ESPO_CONTAINER=espo-test ./deploy.sh

set -e

HERE=$(dirname "$0")

# Имя контейнера берём из .env рядом со скриптом: так один и тот же
# deploy.sh обслуживает и рабочий экземпляр, и любой другой.
if [ -f "$HERE/.env" ]; then
    . "$HERE/.env"
fi

CONTAINER="${ESPO_CONTAINER:-espocrm}"
SRC="$HERE/espo-custom"

docker cp "$SRC/backend/Espo/." "$CONTAINER:/var/www/html/custom/Espo/"
docker cp "$SRC/client/src" "$CONTAINER:/var/www/html/client/custom/"

# Папка с шаблонами появляется, только если они есть: шахматка держит
# разметку внутри вьюхи, поэтому сейчас её нет.
if [ -d "$SRC/client/res" ]; then
    docker cp "$SRC/client/res" "$CONTAINER:/var/www/html/client/custom/"
fi

# Файлы от docker cp принадлежат root, а apache работает под www-data.
docker exec "$CONTAINER" chown -R www-data:www-data /var/www/html/custom /var/www/html/client/custom

docker exec -u www-data "$CONTAINER" php bin/command rebuild

echo "Выложено. В браузере обнови страницу с Ctrl+Shift+R."

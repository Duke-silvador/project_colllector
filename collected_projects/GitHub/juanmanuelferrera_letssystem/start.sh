#!/usr/bin/env bash
# start.sh — arranque en un paso: comprueba Node, siembra datos y sirve la web.
# Uso:  ./start.sh          (siembra datos de ejemplo si no hay base de datos)
#       SEED=0 ./start.sh   (no sembrar)
set -euo pipefail
cd "$(dirname "$0")"

# 0) ¿Estamos en una plataforma PaaS? (Railway, Render, Fly.io, Heroku…)
#    En ese caso hay que escuchar en 0.0.0.0 y respetar el puerto que asigna la plataforma.
PAAS=""
if [ -n "${RAILWAY_ENVIRONMENT:-}${RENDER:-}${FLY_APP_NAME:-}${DYNO:-}${HEROKU_APP_NAME:-}" ]; then
  PAAS=1
fi
PAAS_PORT="${PORT:-}"

# 1) ¿Node instalado y suficientemente nuevo? (node:sqlite exige >=22.5)
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js no está instalado."
  echo "Instálalo desde https://nodejs.org (versión 24 LTS recomendada)."
  exit 1
fi
node -e 'const [a,b]=process.versions.node.split(".").map(Number);
  if (a<22 || (a===22 && b<5)) {
    console.error("ERROR: Node "+process.versions.node+" es demasiado antiguo. Necesitas >=22.5 (recomendado 24+).");
    process.exit(1);
  }'

# 2) Primera instalación: crear .env y elegir idioma del sitio
#    Si no hay .env, preguntamos el idioma por defecto (ES/EN/FR/PT) y lo guardamos.
if [ ! -f .env ]; then
  LETS_LANG=""
  if [ -t 0 ]; then
    echo ""
    echo "Idioma del sitio / Site language:"
    echo "  1) Español (es)   2) English (en)   3) Français (fr)   4) Português (pt)"
    printf "Elige 1-4 [1]: "
    read -r _opt || true
    case "${_opt:-1}" in
      2|en|EN) LETS_LANG="en" ;;
      3|fr|FR) LETS_LANG="fr" ;;
      4|pt|PT) LETS_LANG="pt" ;;
      *)       LETS_LANG="es" ;;
    esac
  else
    LETS_LANG="es"   # sin terminal: español por defecto
  fi
  if [ -f .env.example ]; then cp .env.example .env; fi
  # Fija (o añade) LETS_LANG en .env
  if grep -q '^LETS_LANG=' .env 2>/dev/null; then
    sed -i.bak "s/^LETS_LANG=.*/LETS_LANG=${LETS_LANG}/" .env && rm -f .env.bak
  else
    printf '\n# Idioma por defecto del sitio (es|en|fr|pt)\nLETS_LANG=%s\n' "$LETS_LANG" >> .env
  fi
  echo "· primera vez: idioma guardado en .env (LETS_LANG=$LETS_LANG)"
fi

# 2b) ¿.env existente? (se carga si está)
if [ -f .env ]; then set -a; . ./.env; set +a; fi

# 2c) PaaS: escuchar en 0.0.0.0 y no dejar que un PORT fijado en .env
#     pise el que asigna la plataforma.
if [ -n "$PAAS" ]; then
  export HOST=0.0.0.0
  [ -n "$PAAS_PORT" ] && export PORT="$PAAS_PORT"
  export LETS_SECURE_COOKIE=1     # la plataforma sirve siempre por HTTPS
  echo "· PaaS detectado: escuchando en ${HOST}:${PORT}"
fi

# 3) Sembrar datos de ejemplo si es la primera vez
DB="${LETS_DB:-data/lets.db}"
mkdir -p "$(dirname "$DB")"   # por si el disco/volumen está vacío
if [ "${SEED:-1}" = "1" ] && [ ! -f "$DB" ]; then
  echo "· primera vez: sembrando datos de ejemplo"
  node --no-warnings src/seed.mjs
fi

# 4) Arrancar
echo "· Lets System en http://${HOST:-127.0.0.1}:${PORT:-4173}"
exec node --no-warnings src/server.mjs

#!/usr/bin/env bash
# ============================================================
#  Desinstalador Modulo Coexy v1.0.0
#  Restaura backup e remove arquivos do modulo
# ============================================================
set -euo pipefail

# ---- cores ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC}  $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }

# ---- banner ----
echo ""
echo -e "${BOLD}${RED}================================================${NC}"
echo -e "${BOLD}${RED}   Desinstalador Modulo Coexy v1.0.0${NC}"
echo -e "${BOLD}${RED}================================================${NC}"
echo ""

# ---- diretorio do projeto alvo ----
DEFAULT_DIR="/home/deploy/empresa01"

if [ -n "${1:-}" ]; then
  PROJECT_DIR="$1"
else
  read -rp "Diretorio do projeto Whaticket [$DEFAULT_DIR]: " PROJECT_DIR
  PROJECT_DIR="${PROJECT_DIR:-$DEFAULT_DIR}"
fi

# ---- validar estrutura ----
if [ ! -d "${PROJECT_DIR}/backend" ]; then
  err "Diretorio do projeto nao encontrado: ${PROJECT_DIR}/backend"
  exit 1
fi

# ============================================================
#  FASE 1 - Encontrar ultimo backup
# ============================================================
info "Procurando backup mais recente ..."

LATEST_BACKUP=""
for d in "${PROJECT_DIR}"/.coexy_backup_*; do
  if [ -d "$d" ]; then
    LATEST_BACKUP="$d"
  fi
done

if [ -z "$LATEST_BACKUP" ]; then
  err "Nenhum backup encontrado em ${PROJECT_DIR}/.coexy_backup_*"
  err "Nao e possivel restaurar sem backup. Abortando."
  exit 1
fi

ok "Backup encontrado: ${LATEST_BACKUP}"

# ---- confirmacao ----
echo ""
echo -e "${YELLOW}ATENCAO: Esta operacao ira:${NC}"
echo -e "  - Restaurar arquivos do backup: ${CYAN}${LATEST_BACKUP}${NC}"
echo -e "  - Remover diretorios do modulo Coexy"
echo -e "  - Reconstruir o frontend"
echo -e "  - Reiniciar PM2"
echo -e "  - ${RED}NAO reverter migrations de banco de dados${NC}"
echo ""
read -rp "Deseja continuar? (s/N): " CONFIRM
if [[ ! "$CONFIRM" =~ ^[sS]$ ]]; then
  info "Operacao cancelada."
  exit 0
fi

# ============================================================
#  FASE 2 - Restaurar arquivos do backup
# ============================================================
info "Restaurando arquivos do backup ..."

RESTORED=0

restore_file() {
  local REL_PATH="$1"
  local BACKUP_FILE="${LATEST_BACKUP}/${REL_PATH}"
  local TARGET_FILE="${PROJECT_DIR}/${REL_PATH}"

  if [ -f "$BACKUP_FILE" ]; then
    mkdir -p "$(dirname "$TARGET_FILE")"
    cp "$BACKUP_FILE" "$TARGET_FILE"
    ok "Restaurado: ${REL_PATH}"
    RESTORED=$((RESTORED + 1))
  else
    warn "Nao encontrado no backup: ${REL_PATH}"
  fi
}

PATCH_FILES=(
  "backend/src/models/Whatsapp.ts"
  "backend/src/controllers/MessageController.ts"
  "backend/src/helpers/SetTicketMessagesAsRead.ts"
  "backend/src/queues.ts"
  "backend/src/controllers/WhatsAppController.ts"
  "backend/src/routes/whatsappRoutes.ts"
  "api_oficial/src/app.module.ts"
  "api_oficial/prisma/schema.prisma"
  "frontend/src/pages/Connections/index.js"
)

for f in "${PATCH_FILES[@]}"; do
  restore_file "$f"
done

ok "Total de arquivos restaurados: ${RESTORED}"

# ============================================================
#  FASE 3 - Remover diretorios do modulo
# ============================================================
info "Removendo diretorios do modulo Coexy ..."

DIRS_TO_REMOVE=(
  "backend/src/services/CoexyServices"
  "backend/src/libs/coexy"
  "api_oficial/src/resources/v1/webhook-coexy"
  "api_oficial/src/resources/v1/send-message-coexy"
  "frontend/src/components/CoexyModal"
  "frontend/src/components/CoexyStatusModal"
)

for d in "${DIRS_TO_REMOVE[@]}"; do
  TARGET="${PROJECT_DIR}/${d}"
  if [ -d "$TARGET" ]; then
    rm -rf "$TARGET"
    ok "Removido: ${d}"
  else
    info "Ja removido ou inexistente: ${d}"
  fi
done

# Remover migration do coexy
MIGRATION_FILE="${PROJECT_DIR}/backend/src/database/migrations/20260902000000-add-coexy-fields-to-whatsapp.ts"
if [ -f "$MIGRATION_FILE" ]; then
  rm -f "$MIGRATION_FILE"
  ok "Migration coexy removida"
else
  info "Migration coexy ja removida"
fi

# ============================================================
#  FASE 4 - Rebuild Frontend
# ============================================================
echo ""
info "Reconstruindo frontend ..."

if [ -f "${PROJECT_DIR}/frontend/package.json" ]; then
  (cd "${PROJECT_DIR}/frontend" && npm install --legacy-peer-deps 2>&1 && npm run build 2>&1) && \
    ok "Frontend reconstruido" || \
    warn "Build do frontend falhou - execute manualmente: cd ${PROJECT_DIR}/frontend && npm install --legacy-peer-deps && npm run build"
fi

# ============================================================
#  FASE 5 - Reiniciar PM2
# ============================================================
echo ""
info "Reiniciando servicos via PM2 ..."

if command -v pm2 &>/dev/null; then
  pm2 restart all 2>&1 && ok "PM2 reiniciado" || warn "PM2 restart falhou"
else
  warn "PM2 nao encontrado no PATH - reinicie manualmente"
fi

# ============================================================
#  PRONTO!
# ============================================================
echo ""
echo -e "${BOLD}${GREEN}================================================${NC}"
echo -e "${BOLD}${GREEN}   Modulo Coexy removido com sucesso!${NC}"
echo -e "${BOLD}${GREEN}================================================${NC}"
echo ""
echo -e "${YELLOW}Notas importantes:${NC}"
echo -e "  - As migrations de banco de dados ${RED}NAO foram revertidas${NC}."
echo -e "    As colunas coexy_* permanecem na tabela Whatsapps."
echo -e "    A tabela coexyConnection permanece no banco prisma."
echo -e "    Remova manualmente se necessario."
echo ""
echo -e "  - Voce pode remover as variaveis de ambiente:"
echo -e "    ${CYAN}COEXY_API_KEY${NC}"
echo -e "    ${CYAN}COEXY_HMAC_SECRET${NC}"
echo ""
echo -e "  - Backup utilizado: ${CYAN}${LATEST_BACKUP}${NC}"
echo -e "    (outros backups podem ser removidos manualmente)"
echo ""

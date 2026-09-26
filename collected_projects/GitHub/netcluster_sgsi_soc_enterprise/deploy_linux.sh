#!/usr/bin/env bash
# =============================================================================
# Script de Despliegue Directo SGSI & SOC Enterprise (Linux Ubuntu/Debian/RHEL)
# SERVICIO NACIONAL DE MIGRACIONES (SERMIG 2026)
# =============================================================================

set -e

echo "================================================================="
echo "   INSTALADOR DIRECTO SGSI & SOC ENTERPRISE (SERMIG 2026)"
echo "================================================================="

# 1. Comprobar Python 3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 no está instalado. Instalando dependencias base..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y python3 python3-pip python3-venv git
    elif command -v dnf &> /dev/null; then
        sudo dnf install -y python3 python3-pip git
    else
        echo "[ERROR] Instale Python 3 manualmente para continuar."
        exit 1
    fi
fi

# 2. Directorio base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

# 3. Crear y activar entorno virtual
if [ ! -d ".venv" ]; then
    echo "[1/4] Creando entorno virtual Python (.venv)..."
    python3 -m venv .venv
fi

echo "[2/4] Activando entorno virtual e instalando librerías..."
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 4. Asegurar carpetas requeridas
echo "[3/4] Inicializando directorios y permisos..."
mkdir -p static/uploads static/evidencias config logs

# 5. Iniciar Servidor
PORT=8000
echo "[4/4] Iniciando SGSI & SOC Enterprise en el puerto ${PORT}..."
echo "================================================================="
echo "  🚀 SERVIDOR ACTIVO EN: http://$(hostname -I | awk '{print $1}'):${PORT}"
echo "================================================================="

python3 -m uvicorn server:app --host 0.0.0.0 --port ${PORT} --reload

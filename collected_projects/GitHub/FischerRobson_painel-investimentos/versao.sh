#!/usr/bin/env bash
# Imprime a versão do projeto (tag <version> do pom.xml). Fonte única da versão da API.
#   ./versao.sh               → versão do pom.xml desta pasta
#   ./versao.sh outro/pom.xml → versão de outro pom (o CI usa para ler o da master)
set -euo pipefail
python3 - "${1:-$(dirname "$0")/pom.xml}" <<'PY'
import sys, xml.etree.ElementTree as ET
v = ET.parse(sys.argv[1]).getroot().find("{http://maven.apache.org/POM/4.0.0}version")
if v is None or not (v.text or "").strip():
    sys.exit("pom.xml sem <version>")
print(v.text.strip())
PY

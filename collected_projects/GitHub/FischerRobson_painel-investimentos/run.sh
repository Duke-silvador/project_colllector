#!/usr/bin/env bash
# Sobe o painel em http://localhost:8765
#   ./run.sh        → empacota (se preciso) e roda o jar
#   ./run.sh dev    → modo dev do Quarkus (live reload, Dev UI em /q/dev-ui)
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v java >/dev/null 2>&1; then
  export JAVA_HOME="${JAVA_HOME:-$HOME/.sdkman/candidates/java/21.0.0.0-graal}"
  export PATH="$JAVA_HOME/bin:$PATH"
fi
# IPv4 puro: com o socket IPv6 padrão do Java ([::ffff:127.0.0.1]) o WSL não repassa a porta para o Windows
JVM_OPTS="-Djava.net.preferIPv4Stack=true"
if [[ "${1:-}" == "dev" ]]; then
  exec ./mvnw quarkus:dev -Djvm.args="$JVM_OPTS"
fi
# Recompila se o código mudou ou se o último build foi o do Lambda (./deploy.sh usa a mesma pasta target/)
if [[ ! -f target/quarkus-app/quarkus-run.jar \
      || -n "$(find src pom.xml -newer target/quarkus-app/quarkus-run.jar -print -quit)" \
      || -n "$(ls target/quarkus-app/lib/main 2>/dev/null | grep -m1 amazon-lambda)" ]]; then
  ./mvnw -q -B clean package -DskipTests
fi
exec java $JVM_OPTS -jar target/quarkus-app/quarkus-run.jar

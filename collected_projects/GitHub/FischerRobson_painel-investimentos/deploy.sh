#!/usr/bin/env bash
# Empacota para o Lambda e faz o deploy do stack (template.yaml).
#   ./deploy.sh            → build + deploy
#   ./deploy.sh --dry-run  → build + mostra o change set sem aplicar
#
# Parâmetros vêm de variáveis de ambiente (GitHub Actions) ou, localmente, dos arquivos deploy.env e .env:
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAILS, BRAPI_TOKEN (opcional)
#   CFN_EXEC_ROLE_ARN (opcional): papel que o CloudFormation assume para criar os recursos
set -euo pipefail
cd "$(dirname "$0")"

STACK=painel-investimentos
REGION=${AWS_REGION:-us-east-1}

if [[ -f deploy.env ]]; then
  # shellcheck disable=SC1091
  source deploy.env
fi
: "${GOOGLE_CLIENT_ID:?defina GOOGLE_CLIENT_ID (deploy.env ou variável de ambiente)}"
: "${GOOGLE_CLIENT_SECRET:?defina GOOGLE_CLIENT_SECRET}"
: "${ALLOWED_EMAILS:?defina ALLOWED_EMAILS}"
BRAPI_TOKEN=${BRAPI_TOKEN:-$(grep -s '^BRAPI_TOKEN=' .env | cut -d= -f2- || true)}
APP_VERSION=$(./versao.sh)

if ! command -v java >/dev/null 2>&1; then
  export JAVA_HOME="${JAVA_HOME:-$HOME/.sdkman/candidates/java/21.0.0.0-graal}"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "==> Build (perfil lambda)"
./mvnw -B -q clean package -Plambda -DskipTests   # clean: não levar classes de outra branch
ls -lh target/function.zip

EXTRA=()
[[ "${1:-}" == "--dry-run" ]] && EXTRA+=(--no-execute-changeset)
[[ -n "${CFN_EXEC_ROLE_ARN:-}" ]] && EXTRA+=(--role-arn "$CFN_EXEC_ROLE_ARN")

echo "==> Deploy da versão $APP_VERSION ($STACK em $REGION)"
sam deploy \
  --template-file template.yaml \
  --stack-name "$STACK" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --no-fail-on-empty-changeset \
  --no-confirm-changeset \
  "${EXTRA[@]}" \
  --parameter-overrides \
    "GoogleClientId=$GOOGLE_CLIENT_ID" \
    "GoogleClientSecret=$GOOGLE_CLIENT_SECRET" \
    "AllowedEmails=$ALLOWED_EMAILS" \
    "BrapiToken=$BRAPI_TOKEN" \
    "AppVersion=$APP_VERSION"

aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query 'Stacks[0].Outputs[].[OutputKey,OutputValue]' --output table

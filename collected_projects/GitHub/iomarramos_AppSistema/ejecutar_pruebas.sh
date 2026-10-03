#!/usr/bin/env bash
# Ejecuta TODAS las pruebas: base PostgreSQL, dominio, capa de datos, instalador y compilación del escritorio.
# Requisitos: PostgreSQL 16+ (usuario con CREATEDB/CREATEROLE; variables PG* estándar) y .NET SDK 8.
# La aplicación WinForms se compila solo si el SDK incluye el soporte de escritorio (SDK oficial de Microsoft).
set -euo pipefail
cd "$(dirname "$0")"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
# Para la capa de datos se usan las mismas credenciales que psql.
export APPSISTEMA_PG_PRUEBAS=1
export APPSISTEMA_PG_HOST="${APPSISTEMA_PG_HOST:-${PGHOST:-/var/run/postgresql}}"
export APPSISTEMA_PG_USER="${APPSISTEMA_PG_USER:-${PGUSER:-$(whoami)}}"
export APPSISTEMA_PG_PASSWORD="${APPSISTEMA_PG_PASSWORD:-${PGPASSWORD:-}}"

echo "######## 1/5  Base de datos PostgreSQL"
database/postgresql/ejecutar_pruebas.sh

echo
echo "######## 2/5  Dominio VB.NET (sin base de datos)"
dotnet test tests/AppSistema.Dominio.Tests --nologo -v q

echo
echo "######## 3/5  Capa de datos VB.NET contra PostgreSQL"
dotnet test tests/AppSistema.Datos.Tests --nologo -v q

echo
echo "######## 4/5  Instalador de consola (migrar dos veces + crear empresa + catalogo, recetas e inventario inicial dos veces + sincronizacion con la central + respaldo, restauracion y actualizacion + exportacion de resultados)"
DB=appsistema_instalador
dropdb --if-exists "$DB" >/dev/null 2>&1 || true
createdb "$DB"
CLAVE=""; [ -n "$APPSISTEMA_PG_PASSWORD" ] && CLAVE=";Password=$APPSISTEMA_PG_PASSWORD"
export APPSISTEMA_CONEXION_PROPIETARIO="Host=$APPSISTEMA_PG_HOST;Username=$APPSISTEMA_PG_USER;Database=$DB$CLAVE"
dotnet run --project src/AppSistema.Instalador -v q -- migrar | tail -2
dotnet run --project src/AppSistema.Instalador -v q -- migrar | grep -c "ya estaba" | xargs -I{} echo "  segunda corrida: {} migraciones ya estaban"
printf 'DEMO\nEmpresa demo\nOP1\nOperacion demo\nALM\nAlmacen demo\nadmin\nAdministrador\nDemo-Clave-2026\nDemo-Clave-2026\n' \
  | dotnet run --project src/AppSistema.Instalador -v q -- crear-empresa | tail -1
export APPSISTEMA_CONEXION="Host=$APPSISTEMA_PG_HOST;Username=$APPSISTEMA_PG_USER;Database=$DB;Options=-c role=app_stock$CLAVE"
# Flujo recomendado: catálogo por ingrediente (productos SGP como variantes) y luego recetas enlazadas; dos veces.
for archivo in datos/enlace/catalogo_por_ingrediente.csv; do
  printf 'DEMO\nadmin\nDemo-Clave-2026\nSI\n' | dotnet run --project src/AppSistema.Instalador -v q -- importar-catalogo "$archivo" | tail -1
  printf 'DEMO\nadmin\nDemo-Clave-2026\n' | dotnet run --project src/AppSistema.Instalador -v q -- importar-catalogo "$archivo" | tail -1
done
printf 'DEMO\nadmin\nDemo-Clave-2026\nSI\n' \
  | dotnet run --project src/AppSistema.Instalador -v q -- importar-recetas datos/enlace/recetas_enlazadas.csv --aprobar | tail -1
printf 'DEMO\nadmin\nDemo-Clave-2026\n' \
  | dotnet run --project src/AppSistema.Instalador -v q -- importar-recetas datos/enlace/recetas_enlazadas.csv --aprobar | tail -1
psql -d "$DB" -tAc "SELECT 'ingredientes: ' || count(DISTINCT p.id) || ', productos SGP como variantes: ' || count(v.id) FROM producto_base p LEFT JOIN variante_producto v ON v.producto_base_id = p.id AND v.codigo LIKE 'SGP%'"
psql -d "$DB" -tAc "SELECT 'recetas aprobadas: ' || count(*) FROM receta_version WHERE estado = 'aprobada'"
printf 'DEMO\nadmin\nDemo-Clave-2026\n2026-10-01\nSI\n' \
  | dotnet run --project src/AppSistema.Instalador -v q -- importar-inventario datos/inventario/inventario_inicial.csv | tail -1
printf 'DEMO\nadmin\nDemo-Clave-2026\n2026-10-01\n' \
  | dotnet run --project src/AppSistema.Instalador -v q -- importar-inventario datos/inventario/inventario_inicial.csv 2>&1 | tail -1 || true
psql -d "$DB" -tAc "SELECT 'stock inicial: ' || count(*) || ' variantes, valor ' || round(sum(valor_u6) / 1000000.0, 2) FROM saldo_stock"

echo "  -- continuidad: central, sede, sincronizacion repetida, respaldo y restauracion conciliada"
CENTRAL=appsistema_central; RESTAURADA=appsistema_restaurada; RESPALDO="$(mktemp -d)/sede.dump"
dropdb --if-exists "$CENTRAL" >/dev/null 2>&1 || true; dropdb --if-exists "$RESTAURADA" >/dev/null 2>&1 || true
createdb "$CENTRAL"; createdb "$RESTAURADA"
PROP_CENTRAL="Host=$APPSISTEMA_PG_HOST;Username=$APPSISTEMA_PG_USER;Database=$CENTRAL$CLAVE"
APPSISTEMA_CONEXION_PROPIETARIO="$PROP_CENTRAL" dotnet run --project src/AppSistema.Instalador -v q -- migrar | tail -1
printf 'DEMO\nEmpresa demo\nCEN\nCentral\nCEN\nAlmacen central\nadmin\nAdministrador\nDemo-Clave-2026\nDemo-Clave-2026\n' \
  | APPSISTEMA_CONEXION_PROPIETARIO="$PROP_CENTRAL" dotnet run --project src/AppSistema.Instalador -v q -- crear-empresa | tail -1
export APPSISTEMA_CREDENCIAL_SEDE="$(APPSISTEMA_CONEXION_PROPIETARIO="$PROP_CENTRAL" dotnet run --project src/AppSistema.Instalador -v q -- registrar-sede DEMO OP1 Sede demo | tail -1)"
dotnet run --project src/AppSistema.Instalador -v q -- configurar-sede DEMO OP1
export APPSISTEMA_CONEXION_CENTRAL="Host=$APPSISTEMA_PG_HOST;Username=$APPSISTEMA_PG_USER;Database=$CENTRAL;Options=-c role=app_sincronizacion$CLAVE"
dotnet run --project src/AppSistema.Instalador -v q -- sincronizar DEMO
dotnet run --project src/AppSistema.Instalador -v q -- sincronizar DEMO
APPSISTEMA_CONEXION_PROPIETARIO="$PROP_CENTRAL" dotnet run --project src/AppSistema.Instalador -v q -- reporte-central DEMO
test "$(psql -d "$DB" -tAc "SELECT sum(valor_u6) FROM saldo_stock")" = "$(psql -d "$CENTRAL" -tAc "SELECT sum(valor_u6) FROM v_central_saldo")" \
  && echo "  stock de la central = stock de la sede"
dotnet run --project src/AppSistema.Instalador -v q -- respaldar "$RESPALDO"
APPSISTEMA_CONEXION_PROPIETARIO="Host=$APPSISTEMA_PG_HOST;Username=$APPSISTEMA_PG_USER;Database=$RESTAURADA$CLAVE" \
  dotnet run --project src/AppSistema.Instalador -v q -- restaurar "$RESPALDO"
dotnet run --project src/AppSistema.Instalador -v q -- actualizar "$(dirname "$RESPALDO")/antes_de_actualizar.dump"
printf 'DEMO\nadmin\nDemo-Clave-2026\n' | dotnet run --project src/AppSistema.Instalador -v q -- exportar-resultados 2026-10 "$(dirname "$RESPALDO")/resultado.csv" | tail -1
head -1 "$(dirname "$RESPALDO")/resultado.csv" | grep -q '^.*version;empresa;operacion;periodo' && echo "  CSV de resultados con el encabezado del contrato v1"
unset APPSISTEMA_CREDENCIAL_SEDE APPSISTEMA_CONEXION_CENTRAL
rm -rf "$(dirname "$RESPALDO")"
dropdb "$DB"; dropdb "$CENTRAL"; dropdb "$RESTAURADA"

echo
echo "######## 5/5  Aplicacion de escritorio WinForms (compilacion)"
SDK_DIR="$(dotnet --list-sdks | tail -1 | sed -E 's/^([^ ]+) \[(.*)\]$/\2\/\1/')"
if [ -d "$SDK_DIR/Sdks/Microsoft.NET.Sdk.WindowsDesktop" ]; then
  dotnet build src/AppSistema.Escritorio --nologo -v q -warnaserror | tail -3
else
  echo "  OMITIDA: este SDK de .NET no incluye Microsoft.NET.Sdk.WindowsDesktop (use el SDK oficial de Microsoft)."
fi

echo
echo "TODO OK"

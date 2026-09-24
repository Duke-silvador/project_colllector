"""MySQL local sin TLS; conexiones remotas con certificado verificado."""

import os
from getpass import getpass
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent


def conectar(*, solicitar_password=False):
    load_dotenv(ROOT / ".env")
    required = ("MYSQL_HOST", "MYSQL_USER", "MYSQL_DATABASE")
    missing = [key for key in required if not os.getenv(key, "").strip()]
    if missing:
        raise ValueError("Completa estas variables en .env: " + ", ".join(missing))
    host = os.environ["MYSQL_HOST"].strip()
    if host.lower() in ("localhost", "127.0.0.1", "::1"):
        ssl_options = {"ssl_disabled": True}
    else:
        ca_value = os.getenv("MYSQL_SSL_CA", "").strip()
        if not ca_value:
            raise ValueError("Falta MYSQL_SSL_CA para verificar la conexion remota.")
        ca = Path(ca_value)
        if not ca.is_absolute():
            ca = ROOT / ca
        if not ca.is_file():
            raise ValueError("No existe el certificado configurado en MYSQL_SSL_CA.")
        ssl_options = dict(ssl_ca=str(ca), ssl_verify_cert=True, ssl_verify_identity=True)
    password = os.getenv("MYSQL_PASSWORD")
    if not password and solicitar_password:
        password = getpass("Contrasena MySQL (no se muestra): ")
    if not password:
        raise ValueError("Falta MYSQL_PASSWORD.")
    return mysql.connector.connect(
        host=host,
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.environ["MYSQL_USER"].strip(),
        password=password,
        database=os.environ["MYSQL_DATABASE"].strip(),
        connection_timeout=10,
        autocommit=False,
        charset="utf8mb4",
        **ssl_options,
    )


def probar_conexion():
    connection = conectar(solicitar_password=True)
    try:
        cursor = connection.cursor()
        try:
            cursor.execute("SELECT 1")
            if cursor.fetchone() != (1,):
                raise RuntimeError("Respuesta inesperada de MySQL.")
            print("Conexion MySQL verificada correctamente.")
        finally:
            cursor.close()
    finally:
        connection.close()


if __name__ == "__main__":
    try:
        probar_conexion()
    except mysql.connector.Error as exc:
        print(f"No se pudo conectar a MySQL (codigo {exc.errno}). Revisa acceso de red, credenciales y nombre de base.")
        raise SystemExit(1)
    except (ValueError, RuntimeError) as exc:
        print(str(exc))
        raise SystemExit(1)

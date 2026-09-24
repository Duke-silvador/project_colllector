"""Crear cuenta local: python crear_usuario.py. Nunca pasa claves por argumentos."""
from getpass import getpass
from mysql.connector import Error
from autenticacion import crear_usuario


if __name__ == '__main__':
    username = input('Usuario / Username: ').strip()
    password = getpass('Contraseña / Password (mínimo 12 caracteres): ')
    confirmation = getpass('Repetir contraseña / Confirm password: ')
    if password != confirmation:
        raise SystemExit('Las contraseñas no coinciden / Passwords do not match.')
    try:
        crear_usuario(username, password)
    except (ValueError, Error) as exc:
        if isinstance(exc, Error):
            raise SystemExit('No se pudo crear el usuario. Revisa si ya existe y la conexión a MySQL.')
        raise SystemExit(str(exc))
    print('Usuario creado / User created.')

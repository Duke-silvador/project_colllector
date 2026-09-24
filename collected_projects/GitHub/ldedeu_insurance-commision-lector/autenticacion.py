"""Cuentas del sistema. Las credenciales de Compass son independientes."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from database import conectar

SESSION_HOURS = 8


def crear_sesion(user_id):
    token = secrets.token_urlsafe(32)
    connection = conectar()
    cursor = connection.cursor()
    try:
        cursor.execute('INSERT INTO staging_hub.system_sessions (token_hash,user_id,expires_at) VALUES (%s,%s,%s)',
                       (hashlib.sha256(token.encode()).hexdigest(), user_id, datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=SESSION_HOURS)))
        connection.commit()
        return token
    finally:
        cursor.close()
        connection.close()


def recuperar_sesion(token):
    if not isinstance(token, str) or not 40 <= len(token) <= 100:
        return None
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT u.id,u.username FROM staging_hub.system_sessions s JOIN staging_hub.system_users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.expires_at>UTC_TIMESTAMP() AND u.active=TRUE',
                       (hashlib.sha256(token.encode()).hexdigest(),))
        return cursor.fetchone()
    finally:
        cursor.close()
        connection.close()


def revocar_sesion(token):
    if not token:
        return
    connection = conectar()
    cursor = connection.cursor()
    try:
        cursor.execute('DELETE FROM staging_hub.system_sessions WHERE token_hash=%s', (hashlib.sha256(token.encode()).hexdigest(),))
        connection.commit()
    finally:
        cursor.close()
        connection.close()


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode('utf-8'), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f'scrypt${salt}${digest}'


def verificar_password(password, stored):
    try:
        algorithm, salt, expected = stored.split('$')
        if algorithm != 'scrypt':
            return False
        digest = hashlib.scrypt(password.encode('utf-8'), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError, AttributeError):
        return False


def crear_usuario(username, password):
    username = username.strip()
    if not username or len(username) > 100:
        raise ValueError('El usuario debe tener entre 1 y 100 caracteres.')
    if len(password) < 12:
        raise ValueError('La contraseña debe tener al menos 12 caracteres.')
    connection = conectar()
    cursor = connection.cursor()
    try:
        cursor.execute('INSERT INTO staging_hub.system_users (username,password_hash) VALUES (%s,%s)', (username, hash_password(password)))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def autenticar(username, password):
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT * FROM staging_hub.system_users WHERE username=%s FOR UPDATE', (username.strip(),))
        user = cursor.fetchone()
        if user is None:
            verificar_password(password, 'scrypt$' + '00' * 16 + '$' + '00' * 64)
            return None
        if not user['active'] or (user.get('locked_until') and user['locked_until'] > datetime.now()):
            return None
        if not verificar_password(password, user['password_hash']):
            count = user.get('failed_attempts', 0) + 1
            cursor.execute('UPDATE staging_hub.system_users SET failed_attempts=%s, locked_until=%s WHERE id=%s',
                           (count, datetime.now() + timedelta(minutes=5) if count >= 5 else None, user['id']))
            connection.commit()
            return None
        cursor.execute('UPDATE staging_hub.system_users SET failed_attempts=0,locked_until=NULL WHERE id=%s', (user['id'],))
        connection.commit()
        return {'id': user['id'], 'username': user['username']}
    finally:
        connection.rollback()
        cursor.close()
        connection.close()


def usuario_activo(user_id):
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id,username FROM staging_hub.system_users WHERE id=%s AND active=TRUE', (user_id,))
        return cursor.fetchone()
    finally:
        cursor.close()
        connection.close()


def listar_usuarios():
    connection = conectar()
    cursor = connection.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id,username FROM staging_hub.system_users ORDER BY username')
        return cursor.fetchall()
    finally:
        cursor.close()
        connection.close()


def cambiar_password(user_id, password):
    if len(password) < 12:
        raise ValueError('La contraseña debe tener al menos 12 caracteres.')
    connection = conectar()
    cursor = connection.cursor()
    try:
        cursor.execute('SELECT id FROM staging_hub.system_users WHERE id=%s FOR UPDATE', (user_id,))
        if cursor.fetchone() is None:
            raise ValueError('El usuario no existe.')
        cursor.execute('UPDATE staging_hub.system_users SET password_hash=%s WHERE id=%s',
                       (hash_password(password), user_id))
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()

from app.security.jwt_handler import create_access_token
from app.security.jwt_handler import verify_token

token = create_access_token({
    "sub": "admin",
    "role": "admin"
})

print(token)

payload = verify_token(token)

print(payload)
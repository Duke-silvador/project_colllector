from app.security.jwt_handler import (
    create_access_token,
    verify_token
)

token = create_access_token(
    {
        "sub": "admin"
    }
)

print("\nGenerated Token:\n")
print(token)

payload = verify_token(token)

print("\nDecoded Payload:\n")
print(payload)
from app.security.security import (
    hash_password,
    verify_password
)

hashed = hash_password(
    "admin123"
)

print("Hashed password:")
print(hashed)

print(
    verify_password(
        "admin123",
        hashed
    )
)
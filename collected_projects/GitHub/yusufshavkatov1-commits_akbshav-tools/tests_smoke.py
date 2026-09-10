from __future__ import annotations

import os
import sys

# Keep imports testable in a clean checkout. Runtime validation still happens when services start.
os.environ.setdefault("USER_BOT_TOKEN", "test-user-token")
os.environ.setdefault("ADMIN_BOT_TOKEN", "test-admin-token")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("ADMIN_IDS", "1")
os.environ.setdefault("ADMIN_PASSWORD", "test-password")
os.environ.setdefault("ENVIRONMENT", "test")

from common.i18n import LANGS, TEXT, t
from common.config import validate_runtime
from user_bot.features import command_help, limited_repeat, reverse


def main() -> None:
    validate_runtime(production=False)
    assert set(LANGS) == {"ru", "uz", "en"}
    for lang in LANGS:
        assert TEXT[lang]
        assert t(lang, "main")
    assert reverse("abc") == "cba"
    assert limited_repeat("x", 3) == "x\nx\nx"
    assert ".qr" not in command_help()
    assert "AI" not in command_help().upper()
    print("SMOKE_OK")


if __name__ == "__main__":
    main()

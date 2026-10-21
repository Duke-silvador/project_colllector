import asyncio
import os
import sys
from pathlib import Path


def main() -> None:
    if getattr(sys, "frozen", False):
        os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(Path(__file__).resolve().parent / "browsers")
    if sys.argv[1:] == ["--smoke-test"]:
        from downloader.smoke import smoke
        asyncio.run(smoke())
        print("SMOKE_OK: bundled Chromium and TUI; offline temporary session only.")
    else:
        from downloader.app import main as run
        run()


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build the game into one self-contained file.

  python3 build.py            -> index.html (standalone page, open in any browser)
  python3 build.py --artifact -> dist/artifact.html (no doctype/head/body; for claude.ai artifacts)
"""
import pathlib, sys

root = pathlib.Path(__file__).parent
src = root / "src"
body = (src / "template.html").read_text()
body = body.replace("/*__DATA__*/", (src / "data.js").read_text())
body = body.replace("/*__APP__*/", (src / "app.js").read_text())

if "--artifact" in sys.argv:
    out = root / "dist" / "artifact.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(body)
else:
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<style>body{margin:0}</style>\n</head>\n<body>\n' + body + '\n</body>\n</html>\n')
    out = root / "index.html"
    out.write_text(page)
print(f"wrote {out}")

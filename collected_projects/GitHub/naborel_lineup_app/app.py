"""Lineup: plan a lifting split and track your progress.

Run this file (PyCharm: right-click → Run, or `python app.py`). It builds Lineup.html, one file with the
whole app inside, and opens it in your browser. That file is the app: it runs with no server, saves in the
browser it's opened in, and can be copied to your phone and opened in Chrome there.

    python app.py              build Lineup.html and open it
    python app.py --no-open    just build
    python app.py --catalog    rebuild data/exercises.json first (after editing tools/build_catalog.py)
    python app.py --serve      serve the unbuilt app at http://127.0.0.1:8770/web/ while editing code
                               (that address keeps its own saved data, separate from Lineup.html)

Standard library only, Python 3.9+.
"""
import time
import base64
import json
import re
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "Lineup.html"

NOTICES = """<!--
Lineup. One file: page, styles, fonts, code and data.

Exercise names, instructions and photos: free-exercise-db (public domain / Unlicense), github.com/yuhonas/free-exercise-db
Body map paths: react-muscle-highlighter 1.2.0, MIT License, Copyright (c) 2024 My Muscle Contributors.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
  documentation files (the "Software"), to deal in the Software without restriction, including without limitation
  the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
  to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
  copyright notice and this permission notice shall be included in all copies or substantial portions of the
  Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
  LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
  SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
  DEALINGS IN THE SOFTWARE.
Fonts: Geist and Geist Mono (Vercel), Instrument Serif; SIL Open Font License 1.1.
-->
"""


def _data_script(element_id: str, data) -> str:
    text = data if isinstance(data, str) else json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    # JSON allows "\/" and "!", so these keep the data from ever closing its <script> tag early
    text = text.replace("</", "<\\/").replace("<!--", "<\\u0021--")
    return f'<script type="application/json" id="{element_id}">{text}</script>'


def _css(web: Path) -> str:
    css = (web / "css" / "app.css").read_text(encoding="utf-8")

    def font(m):
        blob = (web / "css" / m.group(1)).resolve().read_bytes()
        return f'url("data:font/woff2;base64,{base64.b64encode(blob).decode()}")'
    return re.sub(r'url\("(\.\./fonts/[^"]+\.woff2)"\)', font, css)


def _modules(web: Path) -> dict:
    return {p.relative_to(web).as_posix(): p.read_text(encoding="utf-8") for p in sorted((web / "js").rglob("*.js"))}


def build(out: Path = OUT) -> Path:
    web = ROOT / "web"
    page = (web / "index.html").read_text(encoding="utf-8")
    page = page.replace('<link rel="stylesheet" href="css/app.css">', f"<style>\n{_css(web)}\n</style>")
    payload = "\n".join([
        _data_script("lb-catalog", (ROOT / "data" / "exercises.json").read_text(encoding="utf-8")),
        _data_script("lb-body", (ROOT / "data" / "body.json").read_text(encoding="utf-8")),
        _data_script("lb-modules", _modules(web)),
        # when this copy was built: saved data remembers it, so an older copy won't save over a newer one's data
        f"<script>window.LB_BUILD = {int(time.time() * 1000)};</script>",
        "<script>\n" + (web / "runtime.js").read_text(encoding="utf-8") + "\n</script>",
    ])
    tag = '<script type="module" src="js/app.js"></script>'
    if tag not in page:
        raise RuntimeError("web/index.html no longer loads js/app.js the expected way")
    page = page.replace(tag, payload).replace("<!doctype html>", "<!doctype html>\n" + NOTICES, 1)
    tmp = out.with_suffix(".html.tmp")
    tmp.write_text(page, encoding="utf-8")
    tmp.replace(out)
    return out


def serve(port: int = 8770):
    import http.server

    class Handler(http.server.SimpleHTTPRequestHandler):
        extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript"}

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")   # always the file as it is on disk
            super().end_headers()

        def log_message(self, *args):
            pass

    with http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler) as httpd:
        url = f"http://127.0.0.1:{port}/web/"
        print(f"Serving the unbuilt app at {url}  (Ctrl+C to stop)")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


def main(argv):
    if "--catalog" in argv:
        sys.path.insert(0, str(ROOT / "tools"))
        import build_catalog
        build_catalog.build()
    out = build()
    print(f"Built {out}  ({out.stat().st_size // 1024} KB)")
    if "--serve" in argv:
        serve()
    elif "--no-open" not in argv:
        webbrowser.open(out.as_uri())


if __name__ == "__main__":
    main(sys.argv[1:])

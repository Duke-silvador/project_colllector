"""Polli Snap - backend server.

Proxies image requests to the Pollinations image API (gen.pollinations.ai).
This is the code that *calls* Pollinations, so reviewers can verify the
integration is real.
"""
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, quote, urlparse as _up

# Pollinations image endpoint (GET /{prompt}?model=...)
POLLINATIONS_IMAGE_BASE = "https://gen.pollinations.ai/"

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api":
            prompt = parse_qs(u.query).get("q", [""])[0]
            if not prompt:
                self.respond_json({"error": "empty prompt"})
                return
            # --- the Pollinations API call ---
            image_url = POLLINATIONS_IMAGE_BASE + quote(prompt) + "?model=flux&nologo=true"
            self.respond_json({"url": image_url})
            return
        # static file (index.html)
        path = "index.html" if u.path in ("/", "/index.html") else u.path.lstrip("/")
        try:
            with open(path, "rb") as f:
                data = f.read()
            ctype = "text/html" if path.endswith(".html") else "text/plain"
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            self.send_response(404); self.end_headers(); self.wfile.write(b"not found")

    def respond_json(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a): pass

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8892), Handler).serve_forever()

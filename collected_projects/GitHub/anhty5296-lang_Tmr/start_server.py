import http.server
import socketserver
import os
from pathlib import Path

PORT = 8080
os.chdir(Path(__file__).parent)

with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
    print(f"Mcredit mirror: http://localhost:{PORT}/")
    print("Nhan Ctrl+C de dung server.")
    httpd.serve_forever()

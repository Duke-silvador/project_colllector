"""Servidor local do Literadados: só arquivos de web/ (spec RNF-07, design D26).
O site publicado é estático (Netlify); a Diadorim consulta o banco no navegador (DuckDB-WASM), sem /api."""
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

RAIZ = Path(__file__).parent


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".parquet": "application/vnd.apache.parquet", ".mjs": "text/javascript"}

    def end_headers(self):
        # Revalida a cada carga (304 se nada mudou): sem isso, módulos ES antigos ficam presos no cache.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


def main():
    porta = int(os.environ.get("PORT", 8000))
    if not (RAIZ / "web" / "contexto.json").exists():
        raise SystemExit("web/contexto.json não existe. Rode antes: python build.py")
    srv = ThreadingHTTPServer(("127.0.0.1", porta), partial(Handler, directory=str(RAIZ / "web")))
    print(f"Literadados em http://localhost:{porta}")
    srv.serve_forever()


if __name__ == "__main__":
    main()

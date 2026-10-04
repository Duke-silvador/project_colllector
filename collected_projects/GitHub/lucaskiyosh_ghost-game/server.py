#!/usr/bin/env python3
"""Serve o jogo (docs/) e recebe sugestões de palavras para o dicionário.

GET  /api/palavras-extras  -> lista das palavras já aceitas
POST /api/sugerir          -> {"palavra": "..."}; valida com o hunspell pt-BR e grava

Uso: python3 server.py [--port 8000]
Precisa de: sudo apt install hunspell hunspell-pt-br
"""
import argparse
import json
import os
import re
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.abspath(__file__))
FRONT = os.path.join(RAIZ, "docs")
BASE = os.path.join(RAIZ, "data", "palavras_validas.txt")
EXTRAS = os.environ.get("GHOST_EXTRAS", os.path.join(RAIZ, "data", "palavras_extras.txt"))
HUNSPELL = os.environ.get("GHOST_HUNSPELL", "hunspell")
HUNSPELL_DICT = os.environ.get("GHOST_HUNSPELL_DICT", "pt_BR")

# mesmas regras do dicionário: só letras minúsculas do português, 4+ letras
FORMATO = re.compile(r"^[a-záàâãéêíìîóòôõúùûç]{4,}$")


def ler_lista(caminho):
    try:
        with open(caminho, encoding="utf-8") as f:
            return [linha.strip() for linha in f if linha.strip()]
    except FileNotFoundError:
        return []


trava = threading.Lock()
base = set(ler_lista(BASE))
extras = ler_lista(EXTRAS)


def hunspell_aceita(palavra):
    """True/False conforme o hunspell; None se o hunspell não está disponível."""
    try:
        r = subprocess.run(
            [HUNSPELL, "-i", "UTF-8", "-d", HUNSPELL_DICT, "-G"],
            input=palavra + "\n", capture_output=True, text=True, timeout=10,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    if r.returncode != 0 and not r.stdout:
        return None
    return r.stdout.strip() == palavra


def sugerir(palavra):
    """Devolve (status http, resposta)."""
    palavra = palavra.strip().lower()
    if not FORMATO.match(palavra):
        return 400, {"ok": False, "motivo": "Use só letras, com pelo menos 4."}
    with trava:
        if palavra in base or palavra in extras:
            return 200, {"ok": False, "motivo": f'"{palavra}" já está no dicionário.'}
        aceita = hunspell_aceita(palavra)
        if aceita is None:
            return 503, {"ok": False, "motivo": "Validação indisponível no servidor "
                         "(instale: sudo apt install hunspell hunspell-pt-br)."}
        if not aceita:
            return 200, {"ok": False, "motivo": f'"{palavra}" não foi encontrada no corretor de português.'}
        with open(EXTRAS, "a", encoding="utf-8") as f:
            f.write(palavra + "\n")
        extras.append(palavra)
    return 200, {"ok": True, "palavra": palavra}


class Handler(SimpleHTTPRequestHandler):
    def responder(self, status, dados):
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        if self.path == "/api/palavras-extras":
            with trava:
                return self.responder(200, list(extras))
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/sugerir":
            return self.responder(404, {"ok": False, "motivo": "Rota desconhecida."})
        try:
            tamanho = min(int(self.headers.get("Content-Length", 0)), 1024)
            dados = json.loads(self.rfile.read(tamanho) or b"{}")
            palavra = str(dados.get("palavra", ""))
        except (ValueError, AttributeError):
            return self.responder(400, {"ok": False, "motivo": "Corpo inválido."})
        self.responder(*sugerir(palavra))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    args = ap.parse_args()
    servidor = ThreadingHTTPServer(("", args.port), partial(Handler, directory=FRONT))
    print(f"Ghost em http://localhost:{args.port}  (extras: {EXTRAS})")
    servidor.serve_forever()


if __name__ == "__main__":
    main()

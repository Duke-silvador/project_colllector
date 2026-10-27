"""Gera index.html a partir de src/app.html (a mesma página da app no Claude).

Uso:  python3 build.py
"""
from pathlib import Path

ROOT = Path(__file__).parent
src = (ROOT / "src" / "app.html").read_text(encoding="utf-8")

# textos que só faziam sentido dentro do Claude
PATCHES = [
    ("Volte a ligá-lo em claude.ai → Definições → Conectores.", "Entre outra vez com a sua conta Google."),
    ("Adicione-o em claude.ai → Definições → Conectores.", "Entre com a sua conta Google."),
    ("Tem mais de um Google Calendar ligado. Escolha qual usar no aviso do Claude.", "Não foi possível escolher a agenda."),
    ("Carregue outra vez em Adicionar e aceite o pedido do Claude.", "Saia e entre outra vez, aceitando o acesso à agenda."),
    ("A agenda só funciona com a página aberta no Claude, com sessão iniciada.", "Entre com a sua conta Google para ver a agenda."),
    ("Só é possível adicionar com a página aberta no Claude, com sessão iniciada.", "Entre com a sua conta Google para adicionar."),
    ("Abra a página no Claude com sessão iniciada para descarregar ficheiros.", "Não foi possível descarregar o ficheiro."),
    (" registos guardados na nuvem", " registos no seu Google Drive"),
    (" com a página aberta no Claude, com sessão iniciada.", " depois de entrar com a sua conta Google."),
    ("Tente outra vez e aceite o pedido do Claude.", "Saia, entre outra vez e aceite o acesso à agenda."),
]
for old, new in PATCHES:
    src = src.replace(old, new)

head = """<!doctype html>
<html lang="pt-PT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1d1b33">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bezerra">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
<script src="config.js"></script>
<script src="https://accounts.google.com/gsi/client" async defer></script>
<script src="standalone.js"></script>
</head>
<body>
"""
(ROOT / "index.html").write_text(head + src + "\n</body>\n</html>\n", encoding="utf-8")
print("index.html gerado")

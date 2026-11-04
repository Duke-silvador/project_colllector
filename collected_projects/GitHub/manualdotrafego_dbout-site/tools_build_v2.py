#!/usr/bin/env python3
"""Gera v2.html a partir do index.html: mesma página, hero cinematográfico sobre foto e nav sobreposta."""
import pathlib, re, json
R = pathlib.Path(__file__).parent
s = (R / "index.html").read_text(encoding="utf-8")
cred = json.load(open(R / "assets/fundo-v2-credito.json", encoding="utf-8"))
s = s.replace("<title>", "<title>v2 · ", 1)
s = re.sub(r'(<link rel="stylesheet" href="styles.css"[^>]*>)', r'\1\n<link rel="stylesheet" href="v2.css">', s, count=1)
s = re.sub(r'  <p class="banner">.*?</p>\n', "", s, count=1)
s = s.replace('<div class="top" data-top>', '<div class="top top--v2" data-top>', 1)
s = s.replace('src="assets/wordmark-ink.png"', 'src="assets/wordmark-paper.png"', 1)
a = s.index('  <section class="hero"'); b = s.index("</section>", a) + len("</section>")
hero = f'''  <section class="hero-v2" aria-labelledby="titulo">
    <figure class="hero-v2__foto" aria-hidden="true">
      <picture>
        <source media="(max-width: 60rem)" srcset="assets/fundo-v2-mobile.webp">
        <img src="assets/fundo-v2-1600.webp" srcset="assets/fundo-v2-1600.webp 1600w, assets/fundo-v2-2400.webp 2400w" sizes="100vw" width="2400" height="1600" alt="" fetchpriority="high">
      </picture>
    </figure>
    <div class="hero-v2__veu" aria-hidden="true"></div>
    <div class="container">
      <div class="hero-v2__copy">
        <h1 id="titulo">Segunda‑feira, já com a agenda cheia.</h1>
        <p class="lead">A Dbout roda os anúncios da sua clínica e responde os pacientes enquanto você dorme.</p>
        <div class="hero-v2__acoes">
          <a class="btn btn--primary" href="https://manualdotrafego.github.io/diagnostico-dbout/">Fazer o diagnóstico gratuito</a>
          <small>Um minuto, sem custo, resultado na hora</small>
        </div>
      </div>
      <aside class="painel" aria-labelledby="t-painel">
        <div class="painel__cab">
          <div><h2 id="t-painel">A noite de ontem</h2><p>Quarta, 4 de novembro · anúncios no ar das 0h às 7h</p></div>
          <span class="painel__selo"><b>7</b> avaliações marcadas</span>
        </div>
        <ul>
          <li><span class="painel__ico" aria-hidden="true">M</span><span class="painel__nome"><b>Meta Ads</b><span>412 cliques</span></span><span class="painel__estado">No ar</span><span class="painel__valor">23<small>leads</small></span></li>
          <li><span class="painel__ico" aria-hidden="true">G</span><span class="painel__nome"><b>Google Ads</b><span>96 cliques</span></span><span class="painel__estado">No ar</span><span class="painel__valor">6<small>leads</small></span></li>
          <li><span class="painel__ico" aria-hidden="true">W</span><span class="painel__nome"><b>WhatsApp</b><span>29 conversas</span></span><span class="painel__estado">Resposta em 4 min</span><span class="painel__valor">19<small>qualificados</small></span></li>
          <li><span class="painel__ico" aria-hidden="true">A</span><span class="painel__nome"><b>Agenda</b><span>segunda, 10 de novembro</span></span><span class="painel__estado painel__estado--aberto">1 em aberto</span><span class="painel__valor">7<small>avaliações</small></span></li>
          <li><span class="painel__ico" aria-hidden="true">R</span><span class="painel__nome"><b>Recepção</b><span>roteiro da Máquina de Vendas</span></span><span class="painel__estado">Pronto</span><span class="painel__valor">3<small>orçamentos</small></span></li>
        </ul>
        <div class="painel__pe"><span>Mariana, 8h, avaliação ortodôntica. Veio do anúncio do aparelho.</span><a href="#jornada">Ver a jornada</a></div>
      </aside>
    </div>
    <p class="hero-v2__credito">Foto: <a href="{cred['page']}">{cred['artist']}</a>, {cred['lic']}</p>
  </section>'''
s = s[:a] + hero + s[b:]
(R / "v2.html").write_text(s, encoding="utf-8")
print("v2.html ok")

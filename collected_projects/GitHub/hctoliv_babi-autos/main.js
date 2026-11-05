(() => {
  const WA = '5511942815384';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  requestAnimationFrame(() => setTimeout(() => document.documentElement.classList.add('is-ready'), 80));

  /* header + menu */
  const top = $('#top');
  const onScroll = () => top.classList.toggle('is-solid', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(onScroll);
  const burger = $('#burger'), drawer = $('#drawer');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open);
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  $$('a', drawer).forEach(a => a.addEventListener('click', () => burger.click()));

  /* aberto agora (fuso de São Paulo) */
  const HOURS = { 0: null, 1: [9, 18], 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 14] };
  const DAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  function spNow() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), h: (+p.hour % 24) + (+p.minute) / 60 };
  }
  function updateOpen() {
    const { day, h } = spNow();
    const today = HOURS[day];
    const open = !!(today && h >= today[0] && h < today[1]);
    let msg = `Loja aberta agora · até as ${today && today[1]}h`;
    if (!open) {
      let d = day;
      for (let i = 0; i < 8; i++) {
        const hh = HOURS[d];
        if (hh && (i > 0 || h < hh[0])) { msg = `Loja fechada · abre ${i === 0 ? 'hoje' : i === 1 ? 'amanhã' : DAYS[d]} às ${hh[0]}h`; break; }
        d = (d + 1) % 7;
      }
    }
    $$('[data-open]').forEach(el => {
      el.textContent = msg;
      el.parentElement.classList.toggle('is-open', open);
      el.parentElement.classList.toggle('is-closed', !open);
    });
    $$('#hours tr').forEach(tr => tr.classList.toggle('today', +tr.dataset.d === day));
  }
  updateOpen();
  setInterval(updateOpen, 60000);

  /* reveal */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* reels: carrega e toca só quando aparecem */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }), { threshold: .4 });
  const track = $('#rtrack');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  (window.__reels || fetch('reels.json').then(r => r.json())).then(list => {
    track.innerHTML = list.map(r => `<a class="rc" href="${esc(r.url)}" target="_blank" rel="noopener"><div class="rc__v">${r.video ? `<video data-src="${esc(r.video)}" poster="${esc(r.poster)}" muted playsinline loop preload="none"></video>` : `<img src="${esc(r.poster)}" alt="" width="540" height="960" loading="lazy">`}</div><p>${esc(r.title)}</p><span>${esc(r.meta)}</span></a>`).join('');
    $$('video[data-src]', track).forEach(v => vio.observe(v));
    setHero(list.filter(r => r.hero));
  });

  /* hero: um reel sobre carros por dia, no fuso de São Paulo */
  const hv = $('#heroVideo'), sound = $('#heroSound');
  function setHero(heroes) {
    if (!heroes.length) return;
    const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).split('-').map(Number);
    const n = heroes.length, i = Math.floor(Date.UTC(y, m - 1, d) / 864e5) % n;
    const r = heroes[i], at = k => heroes[(i + k) % n];
    $('#heroTitle').textContent = r.heroTitle || r.title;
    $('#heroSobre').textContent = r.sobre || '';
    $('#heroLink').href = r.url;
    $('#heroCount').textContent = `${i + 1}/${n}`;
    $('#heroBars').innerHTML = heroes.map((_, k) => `<i class="${k < i ? 'done' : k === i ? 'now' : ''}"></i>`).join('');
    if (n > 1) {
      $('#heroBack1').src = at(1).poster;
      if (n > 2) $('#heroBack2').src = at(2).poster;
    }
    if (hv.getAttribute('src') === r.hero) return;
    hv.poster = r.poster;
    /* o vídeo só começa a baixar depois que a página carregou, pra não disputar com o resto */
    const start = () => { hv.src = r.hero; hv.play().catch(() => {}); };
    if (document.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
  }
  hv.addEventListener('timeupdate', () => {
    const bar = $('#heroBars .now');
    if (bar && hv.duration) bar.style.setProperty('--p', hv.currentTime / hv.duration);
  });
  sound.addEventListener('click', () => {
    hv.muted = !hv.muted;
    sound.setAttribute('aria-pressed', !hv.muted);
    sound.querySelector('span').textContent = hv.muted ? 'Ouvir' : 'Som ligado';
    if (!hv.muted) { hv.currentTime = 0; hv.play().catch(() => {}); }
  });
  $$('.rnav button').forEach(b => b.addEventListener('click', () => {
    track.scrollBy({ left: +b.dataset.dir * track.clientWidth * .8, behavior: 'smooth' });
  }));

  /* pedido de caça */
  const state = { objetivo: 'Comprar', tipo: 'Tanto faz, me indica', troca: 'Não' };
  const brl = n => 'R$ ' + n.toLocaleString('pt-BR');
  const ent = $('#entrada'), par = $('#parcela'), nome = $('#nome'), modelo = $('#modelo');
  $('#ticketNo').textContent = 'Nº ' + String(Date.now() % 10000).padStart(4, '0');

  let booted = false;
  function setText(id, val) {
    const el = $(id);
    if (el.textContent === val) return;
    el.textContent = val;
    if (!booted) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  function render() {
    const e = +ent.value, pa = +par.value, n = nome.value.trim(), m = modelo.value.trim();
    ent.style.setProperty('--p', (e / +ent.max * 100) + '%');
    par.style.setProperty('--p', ((pa - +par.min) / (+par.max - +par.min) * 100) + '%');
    $('#entradaOut').textContent = e ? brl(e) : 'sem entrada';
    $('#parcelaOut').textContent = brl(pa);
    setText('#tNome', n || '—');
    setText('#tObj', state.objetivo);
    setText('#tTipo', m ? (state.tipo === 'Tanto faz, me indica' ? m : `${state.tipo} · ${m}`) : state.tipo);
    setText('#tEnt', e ? brl(e) : 'Sem entrada');
    setText('#tPar', 'até ' + brl(pa));
    setText('#tTroca', state.troca);
    const msg = [
      `Oi Babi! ${n ? 'Aqui é ' + n + '. ' : ''}Montei meu pedido no site:`,
      `• Quero: ${state.objetivo}`,
      `• Tipo: ${state.tipo}`,
      m ? `• Modelo dos sonhos: ${m}` : '',
      `• Entrada: ${e ? brl(e) : 'sem entrada'}`,
      `• Parcela que cabe: até ${brl(pa)}`,
      `• Carro na troca: ${state.troca}`,
      '#MeAjudaBabi'
    ].filter(Boolean).join('\n');
    $('#send').href = `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
  }
  function pick(field, v) {
    $$(`[data-field="${field}"] .chip`).forEach(c => c.classList.toggle('is-on', c.dataset.v === v));
    state[field] = v;
  }
  $$('.chips').forEach(g => g.addEventListener('click', ev => {
    const c = ev.target.closest('.chip'); if (!c) return;
    pick(g.dataset.field, c.dataset.v); render();
  }));
  [ent, par, nome, modelo].forEach(i => i.addEventListener('input', render));
  $$('[data-pick]').forEach(a => a.addEventListener('click', () => {
    pick('objetivo', a.dataset.pick);
    if (a.dataset.pick === 'Carro pra app') ent.value = 25000;
    render();
  }));
  render();
  booted = true;

  $('#year').textContent = new Date().getFullYear();
})();

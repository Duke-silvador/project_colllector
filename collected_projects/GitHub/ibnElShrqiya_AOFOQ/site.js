'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let lang = 'ar'; try { lang = localStorage.getItem('ofoq-lang') === 'en' ? 'en' : 'ar'; } catch (e) {}
const MSG = {
 req: ['يرجى ملء الحقول المطلوبة.', 'Please fill the required fields.'],
 mail: ['البريد الإلكتروني غير صالح.', 'Invalid email address.'],
 ck: ['يلزم الموافقة على سياسة الخصوصية.', 'You must accept the privacy policy.'],
 ok: ['تم فتح تطبيق البريد برسالة جاهزة. لم يُرسل الطلب بعد: اضغط إرسال في تطبيق البريد.', 'Your email app opened with a prepared message. Nothing was sent yet: press send in your email app.']
};
let last = null;
function say(k, ok) { last = [k, ok]; const m = $('#msg'); if (!m) return; m.textContent = MSG[k][lang === 'ar' ? 0 : 1]; m.className = 'msg ' + (ok ? 'ok' : 'err'); }
function setLang() {
  const h = document.documentElement; h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-ar]').forEach(n => { n.textContent = n.dataset[lang]; });
  if (h.dataset.titleEn) document.title = lang === 'en' ? h.dataset.titleEn : h.dataset.titleAr;
  const b = $('#lang'); if (b) b.textContent = lang === 'ar' ? 'EN' : 'AR';
  if (last) say(last[0], last[1]);
  try { localStorage.setItem('ofoq-lang', lang); } catch (e) {}
}
function init() {
  document.documentElement.classList.remove('js-off');
  const h = document.documentElement; h.dataset.titleAr = document.title; setLang();
  const l = $('#lang'); if (l) l.addEventListener('click', () => { lang = lang === 'ar' ? 'en' : 'ar'; setLang(); });
  const bg = $('#burger'), lk = $('#links');
  if (bg) { bg.addEventListener('click', () => bg.setAttribute('aria-expanded', lk.classList.toggle('open'))); lk.addEventListener('click', e => { if (e.target.closest('a')) lk.classList.remove('open'); }); }
  const y = $('#yr'); if (y) y.textContent = new Date().getFullYear();
  // reveal
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 }) : null;
  $$('.rv').forEach(n => io ? io.observe(n) : n.classList.add('in'));
  // light 3D tilt (mouse only)
  if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches) $$('.tilt').forEach(c => {
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); c.style.transform = `perspective(700px) rotateY(${((e.clientX - r.left) / r.width - .5) * 6}deg) rotateX(${(.5 - (e.clientY - r.top) / r.height) * 6}deg)`; });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });
  // project filters
  $$('[data-f]').forEach(b => b.addEventListener('click', () => {
    $$('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === b));
    $$('[data-tags]').forEach(c => { c.hidden = b.dataset.f !== 'all' && !c.dataset.tags.split(' ').includes(b.dataset.f); });
  }));
  // forms (mailto, honest about it)
  const f = $('form[data-mail]');
  if (f) {
    const q = new URLSearchParams(location.search).get('s'); if (q && f.elements.service) f.elements.service.selectedIndex = Math.max(0, +q) || 0;
    f.addEventListener('submit', e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f));
      $$('.bad', f).forEach(x => x.classList.remove('bad'));
      const miss = ['name', 'email', 'details'].filter(k => f.elements[k] && !String(d[k] || '').trim());
      miss.forEach(k => f.elements[k].classList.add('bad')); if (miss.length) return say('req', false);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { f.elements.email.classList.add('bad'); return say('mail', false); }
      if (!d.consent) return say('ck', false);
      const sel = f.elements.service, svc = sel ? sel.options[sel.selectedIndex].dataset.en : '-';
      const body = ['Name: ' + d.name, 'Email: ' + d.email, 'Phone: ' + (d.phone || '-'), 'Type: ' + svc, 'Budget: ' + (d.budget || '-'), 'Date: ' + (d.date || '-'), '', d.details].join('\n');
      say('ok', true);
      location.href = 'mailto:harammasr54@gmail.com?subject=' + encodeURIComponent('OFOQ: ' + svc) + '&body=' + encodeURIComponent(body);
    });
  }
  // terminal
  const t = $('#term');
  if (t) { const s = ['$ ofoq --status', '> web ........ ready', '> mobile ..... ready', '> automation . ready', '> security ... authorized scope only', '$ _'].join('\n'); if (reduce) t.textContent = s; else { let i = 0; const id = setInterval(() => { t.textContent = s.slice(0, ++i); if (i >= s.length) clearInterval(id); }, 40); } }
  // background grid, paused when hidden; lighter on phones
  const c = $('#bg'); if (c) {
    const x = c.getContext('2d'); let w, hh, p = [];
    const size = () => { w = c.width = innerWidth; hh = c.height = innerHeight; p = Array.from({ length: Math.min(w < 700 ? 22 : 55, w / 25 | 0) }, () => ({ x: Math.random() * w, y: Math.random() * hh, vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25 })); };
    const draw = mv => { x.clearRect(0, 0, w, hh); p.forEach((a, i) => { if (mv) { a.x = (a.x + a.vx + w) % w; a.y = (a.y + a.vy + hh) % hh; } x.fillStyle = '#10b98166'; x.fillRect(a.x, a.y, 2, 2); for (let j = i + 1; j < p.length; j++) { const d = Math.hypot(a.x - p[j].x, a.y - p[j].y); if (d < 110) { x.strokeStyle = `rgba(16,185,129,${.12 * (1 - d / 110)})`; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(p[j].x, p[j].y); x.stroke(); } } }); };
    size(); addEventListener('resize', size);
    if (reduce) draw(false); else (function loop() { if (!document.hidden) draw(true); requestAnimationFrame(loop); })();
  }
}
try { init(); } catch (e) { console.error('OFOQ:', e); }
})();

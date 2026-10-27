// Header con sombra al hacer scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 20), { passive: true });

// Menú móvil
const toggle = document.getElementById('navToggle');
const nav = document.getElementById('nav');
toggle.addEventListener('click', () => nav.classList.toggle('open'));
document.querySelectorAll('nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// Banner de cookies
function setCookieChoice(val) {
  try { localStorage.setItem('starperfecta_cookies', val); } catch (e) {}
  document.getElementById('cookie-banner').style.display = 'none';
}
(function () {
  let choice = null;
  try { choice = localStorage.getItem('starperfecta_cookies'); } catch (e) {}
  const banner = document.getElementById('cookie-banner');
  if (banner && !choice) banner.style.display = 'flex';
})();

// Pestañas (servicios y portafolio)
const tabBtns = document.querySelectorAll('.tab-btn');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});
function activateTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  const btn = document.querySelector('.tab-btn[data-tab="' + hash + '"]');
  if (btn) btn.click();
}
window.addEventListener('DOMContentLoaded', activateTabFromHash);
window.addEventListener('hashchange', activateTabFromHash);

// Modales de servicios
function openModal(id) { document.getElementById('modal-' + id).classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById('modal-' + id).classList.remove('open'); document.body.style.overflow = ''; }
document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) { ov.classList.remove('open'); document.body.style.overflow = ''; } });
});

// Lightbox del portafolio
const lb = document.getElementById('lightbox');
if (lb) {
  const lbImg = lb.querySelector('img');
  document.querySelectorAll('.portfolio-grid img').forEach(img => {
    img.addEventListener('click', () => { lbImg.src = img.src; lbImg.alt = img.alt; lb.classList.add('open'); });
  });
  lb.addEventListener('click', () => lb.classList.remove('open'));
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal-overlay.open, .lightbox.open').forEach(el => el.classList.remove('open'));
  document.body.style.overflow = '';
  nav.classList.remove('open');
});

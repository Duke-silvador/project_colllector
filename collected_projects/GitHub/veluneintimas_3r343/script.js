const glow = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', e => {
  if (glow) {
    glow.animate({left: `${e.clientX}px`, top: `${e.clientY}px`}, {
      duration: 450, fill: 'forwards'
    });
  }
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

const carousel = document.querySelector('.works-carousel');
let down = false, startX, scrollLeft;
carousel?.addEventListener('mousedown', e => {
  down = true; startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft;
});
window.addEventListener('mouseup', () => down = false);
carousel?.addEventListener('mouseleave', () => down = false);
carousel?.addEventListener('mousemove', e => {
  if (!down) return;
  e.preventDefault();
  const x = e.pageX - carousel.offsetLeft;
  carousel.scrollLeft = scrollLeft - (x - startX) * 1.2;
});

document.getElementById('quoteForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const company = document.getElementById('company').value.trim();
  const service = document.getElementById('service').value;
  const message = document.getElementById('message').value.trim();

  const text = [
    'Olá, J.M.A! Vim pelo site e gostaria de solicitar um orçamento.',
    '',
    `*Nome:* ${name}`,
    company ? `*Empresa:* ${company}` : '',
    `*Serviço:* ${service}`,
    `*Projeto:* ${message}`
  ].filter(Boolean).join('\n');

  const phone = '5511953639970';
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
});

// Smooth navigation fallback for browsers that disable CSS smooth scroll.
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

(() => {
  const carousel = document.querySelector('.presentation-carousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.presentation-slide')];
  const dots = [...carousel.querySelectorAll('.presentation-dot')];
  const previous = carousel.querySelector('.previous');
  const next = carousel.querySelector('.next');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, transition, readingLink = false;
  const schedule = () => {
    clearTimeout(timer);
    if (!readingLink && !document.hidden) timer = setTimeout(() => show(current + 1), 3000);
  };
  const show = target => {
    clearTimeout(timer);
    clearTimeout(transition);
    target = (target + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== current; slide.classList.remove('is-entering', 'is-leaving'); });
    const outgoing = slides[current];
    const finish = () => {
      outgoing.hidden = true;
      outgoing.classList.remove('is-leaving');
      current = target;
      slides[current].hidden = false;
      slides[current].classList.add('is-entering');
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === current)));
      schedule();
    };
    if (target === current) { schedule(); return; }
    if (motion.matches) finish();
    else { outgoing.classList.add('is-leaving'); transition = setTimeout(finish, 180); }
  };
  previous.hidden = next.hidden = false;
  carousel.querySelector('.presentation-dots').hidden = false;
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
  // Keep links still for keyboard readers; hovering the carousel no longer stops rotation.
  carousel.addEventListener('focusin', event => { readingLink = event.target.matches('a'); schedule(); });
  carousel.addEventListener('focusout', event => { readingLink = !!event.relatedTarget && carousel.contains(event.relatedTarget) && event.relatedTarget.matches('a'); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  schedule();
})();

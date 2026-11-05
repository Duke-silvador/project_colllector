(() => {
  'use strict';
  const tabs = [...document.querySelectorAll('[data-shot]')];
  const select = (tab, focus = false) => {
    tabs.forEach(item => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
      document.getElementById(`shot-${item.dataset.shot}`).hidden = !active;
    });
    if (focus) tab.focus();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
    });
  });
  const dialog = document.querySelector('.show-dialog');
  let opener;
  document.querySelectorAll('[data-enlarge]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    const image = dialog.querySelector('img');
    image.src = button.dataset.enlarge;
    image.alt = button.querySelector('img').alt;
    dialog.showModal();
  }));
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => opener?.focus({ preventScroll: true }));
  const updateLanguage = () => {
    const french = document.documentElement.lang === 'fr';
    document.querySelector('[role=tablist]').setAttribute('aria-label', french ? 'Captures du logiciel' : 'Application screenshots');
    document.querySelectorAll('[data-enlarge]').forEach(button => button.setAttribute('aria-label', `${french ? 'Agrandir la capture' : 'Enlarge screenshot'} ${button.dataset.enlarge.includes('coach') ? (french ? 'Mon coach' : 'My coach') : 'Dashboard'}`));
    dialog.setAttribute('aria-label', french ? 'Capture agrandie du logiciel' : 'Enlarged application screenshot');
    dialog.querySelector('button').setAttribute('aria-label', french ? 'Fermer la capture' : 'Close screenshot');
  };
  updateLanguage();
  new MutationObserver(updateLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('show-enter'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    document.querySelectorAll('.show-section-head').forEach(section => observer.observe(section));
  }
})();

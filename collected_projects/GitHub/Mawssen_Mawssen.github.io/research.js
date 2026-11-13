(() => {
  const explainer = document.querySelector('.research-explainer');
  if (!explainer) return;
  const controls = explainer.querySelector('fieldset');
  const region = explainer.querySelector('.research-explanations');
  const panels = [...region.querySelectorAll('.research-explanation')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pending;
  const select = value => {
    clearTimeout(pending);
    const update = () => {
      panels.forEach(panel => {
        const active = panel.dataset.audience === value;
        panel.classList.toggle('is-active', active);
        panel.setAttribute('aria-hidden', String(!active));
      });
      region.classList.remove('is-changing');
    };
    if (motion.matches) update();
    else {
      region.classList.add('is-changing');
      pending = setTimeout(update, 140);
    }
  };
  controls.addEventListener('change', event => {
    if (event.target.name === 'research-audience' && event.target.checked) select(event.target.value);
  });
  motion.addEventListener('change', () => {
    if (motion.matches) select(controls.querySelector('input:checked').value);
  });
  // Synchronize restored form state when returning with the browser Back button.
  window.addEventListener('pageshow', () => select(controls.querySelector('input:checked').value));
  controls.hidden = false;
})();

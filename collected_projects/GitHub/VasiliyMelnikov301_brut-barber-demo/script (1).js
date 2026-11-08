'use strict';
// Сайт работает без JS. Скрипт добавляет сворачиваемое меню на телефоне.
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const mobile = window.matchMedia('(max-width: 680px)');

if (menuButton && navigation) {
  menuButton.hidden = false;
  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.dataset.collapsed = String(mobile.matches && !open);
    menuButton.innerHTML = open
      ? 'Закрыть <span aria-hidden="true">×</span>'
      : 'Меню <span aria-hidden="true">☰</span>';
  };
  const syncMenu = () => {
    menuButton.hidden = !mobile.matches;
    setMenu(false);
  };
  menuButton.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a') && mobile.matches) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  mobile.addEventListener('change', syncMenu);
  syncMenu();
}

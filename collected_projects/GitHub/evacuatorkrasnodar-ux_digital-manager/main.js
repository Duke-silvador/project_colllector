(() => {
  'use strict';

  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const toast = document.getElementById('toast');
  const managerName = document.getElementById('managerName');
  const managerLine = document.getElementById('managerLine');
  const closingName = document.getElementById('closingName');
  const autopilot = document.getElementById('autopilotCard');
  const autopilotStatus = document.getElementById('autopilotStatus');

  const state = {
    theme: localStorage.getItem('db-theme') || 'light',
    managerName: localStorage.getItem('db-manager-name') || 'Цифровой управляющий',
    autopilot: localStorage.getItem('db-autopilot') !== 'off'
  };

  applyTheme(state.theme, false);
  managerName.value = state.managerName;
  syncManagerName();
  syncAutopilot();

  themeToggle.addEventListener('click', () => applyTheme(state.theme === 'light' ? 'dark' : 'light'));

  document.querySelectorAll('[data-set-theme]').forEach(button => {
    button.addEventListener('click', () => applyTheme(button.dataset.setTheme));
  });

  document.querySelectorAll('[data-toast]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      showToast(button.dataset.toast || 'Готово');
    });
  });

  document.querySelectorAll('.selection').forEach(button => {
    button.addEventListener('click', () => button.classList.toggle('is-on'));
  });

  document.getElementById('saveManagerName').addEventListener('click', () => {
    const value = managerName.value.trim() || 'Цифровой управляющий';
    state.managerName = value;
    localStorage.setItem('db-manager-name', value);
    syncManagerName();
    showToast(`Теперь я — ${value}`);
  });

  managerName.addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('saveManagerName').click();
  });

  const toggleAutopilot = () => {
    state.autopilot = !state.autopilot;
    localStorage.setItem('db-autopilot', state.autopilot ? 'on' : 'off');
    syncAutopilot();
    showToast(state.autopilot ? 'Автопилот включён' : 'Автопилот выключен');
  };

  autopilot.addEventListener('click', toggleAutopilot);
  autopilot.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleAutopilot();
    }
  });

  function applyTheme(theme, announce = true) {
    state.theme = theme === 'dark' ? 'dark' : 'light';
    body.dataset.theme = state.theme;
    localStorage.setItem('db-theme', state.theme);
    themeToggle.textContent = state.theme === 'dark' ? '☾' : '☼';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', state.theme === 'dark' ? '#07111f' : '#f6f7f8');
    document.querySelectorAll('[data-set-theme]').forEach(button => button.classList.toggle('is-active', button.dataset.setTheme === state.theme));
    if (announce) showToast(state.theme === 'dark' ? 'Тёмная тема' : 'Светлая тема');
  }

  function syncManagerName() {
    managerLine.textContent = state.managerName;
    closingName.textContent = state.managerName;
  }

  function syncAutopilot() {
    autopilotStatus.textContent = state.autopilot ? 'Включён' : 'Выключен';
    autopilotStatus.style.opacity = state.autopilot ? '1' : '.6';
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1600);
  }
})();

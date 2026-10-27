/* Passive activity tracking for signed-in ZombieCash survivors. No points are awarded here. */
(() => {
  'use strict';
  const API = 'https://zombcash-bot.fadehost.app';
  const TOKEN = 'zombcash-survivor-token';
  const PROFILE = 'zombcash-survivor-profile';
  try {
    const token = localStorage.getItem(TOKEN) || '';
    const profile = JSON.parse(localStorage.getItem(PROFILE) || 'null');
    if (!token || !profile || !profile.telegramId) return;
    const day = new Date().toISOString().slice(0, 10);
    const key = 'zombcash-survivor-visit:' + String(profile.telegramId) + ':' + day;
    if (localStorage.getItem(key) === '1') return;
    fetch(API + '/api/survival/visit', {
      method: 'POST',
      headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
      body: '{}',
      cache: 'no-store',
      keepalive: true
    }).then(response => {
      if (response.ok) {
        try { localStorage.setItem(key, '1'); } catch (_) {}
      }
    }).catch(() => {});
  } catch (_) {}
})();

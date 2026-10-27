/* Independent runtime recovery for the ZombieCash dashboard and floating page controls.
   Kept separate so a syntax error in the legacy bundle cannot disable these essentials. */
(() => {
  'use strict';

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scroll = (where) => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo({ top: where === 'top' ? 0 : max, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };

  document.getElementById('scroll-to-top')?.addEventListener('click', () => scroll('top'));
  document.getElementById('scroll-to-bottom')?.addEventListener('click', () => scroll('bottom'));

  // Keep the embedded arcade game from recording a second homepage visit or polling analytics.
  if (new URLSearchParams(window.location.search).get('arcadeSnake') === '1') return;

  const root = document.getElementById('campaign-dashboard');
  const endpoint = 'https://zombcash-bot.fadehost.app/api/track';
  const byId = id => document.getElementById(id);
  const fmt = value => Number(value || 0).toLocaleString();
  const safe = value => String(value).replace(/[&<>"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));

  const renderList = (node, entries, emptyText) => {
    if (!node) return;
    const rows = Object.entries(entries || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 8);
    if (!rows.length) {
      node.innerHTML = '<span>' + emptyText + '</span>';
      return;
    }
    const max = Math.max(1, ...rows.map(row => Number(row[1]) || 0));
    node.innerHTML = rows.map(([label, value]) => {
      const n = Number(value) || 0;
      const pct = Math.max(2, Math.round(n / max * 100));
      return '<div class="campaign-row"><span>' + safe(label) + '</span><div class="campaign-bar"><i style="width:' + pct + '%"></i></div><b class="campaign-count">' + fmt(n) + '</b></div>';
    }).join('');
  };

  const loadDashboard = async () => {
    if (!root) return;
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) throw new Error('Analytics API HTTP ' + response.status);
      const data = await response.json();
      const events = data.events || {};
      const sum = keys => keys.reduce((total, key) => total + (Number(events[key]) || 0), 0);
      if (byId('campaign-pageviews')) byId('campaign-pageviews').textContent = fmt(events.page_view);
      if (byId('campaign-outbound')) byId('campaign-outbound').textContent = fmt(events.outbound_click);
      if (byId('campaign-community')) byId('campaign-community').textContent = fmt(sum(['telegram_open', 'radar_open']));
      if (byId('campaign-conversions')) byId('campaign-conversions').textContent = fmt(sum(['ca_copy', 'game_start', 'game_share', 'maker_share', 'cta_click', 'token_info_open']));
      renderList(byId('campaign-sources'), data.sources, 'No campaign traffic recorded yet.');
      renderList(byId('campaign-days'), data.daily, 'No daily events recorded yet.');
      if (byId('campaign-updated')) byId('campaign-updated').textContent = 'UPDATED ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' + (data.retentionDays || 60) + ' DAY RETENTION';
    } catch (error) {
      console.warn('ZombieCash analytics unavailable:', error);
      if (byId('campaign-updated')) byId('campaign-updated').textContent = 'ANALYTICS TEMPORARILY UNAVAILABLE · CHECK API DEPLOYMENT';
      if (byId('campaign-sources')) byId('campaign-sources').innerHTML = '<span>Analytics API is not responding yet.</span>';
      if (byId('campaign-days')) byId('campaign-days').innerHTML = '<span>Try again after the API deployment completes.</span>';
    }
  };

  const params = new URLSearchParams(window.location.search);
  const clean = (value, fallback) => String(value || fallback).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60) || fallback;
  let refSource = 'direct';
  try {
    refSource = document.referrer ? new URL(document.referrer).hostname.split('.')[0] : 'direct';
  } catch (_) {}
  const source = clean(params.get('utm_source') || params.get('source') || refSource, 'direct');
  const medium = clean(params.get('utm_medium') || 'unknown', 'unknown');
  const campaign = clean(params.get('utm_campaign') || 'none', 'none');
  const page = (window.location.pathname || '/').replace(/[^a-zA-Z0-9_./-]/g, '').slice(0, 120) || '/';
  const send = (eventName, target = 'none') => {
    const body = JSON.stringify({ event: eventName, source, medium, campaign, page, target: clean(target, 'none') });
    fetch(endpoint, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  };

  // Record a page view and classify meaningful outgoing actions.
  send('page_view');
  document.addEventListener('click', event => {
    const el = event.target?.closest?.('a,button');
    if (!el) return;
    const id = String(el.id || '').toLowerCase();
    const label = String(el.getAttribute('aria-label') || el.textContent || '').trim().toLowerCase();
    const href = el.href || '';
    if (id === 'copy-ca' || id === 'footer-copy-ca' || /copy contract|copy ca/.test(label)) send('ca_copy', 'token');
    if (id === 'start-game' || id === 'game-action' || /start game|play now|play again/.test(label)) send('game_start', 'zombie_lab');
    if (/zombie-maker\.html/.test(href) || /make your zombie/.test(label)) send('cta_click', 'zombie_maker');
    if (/t\.me\/zombiecashmemeradarbot/i.test(href)) send('radar_open', 'meme_radar');
    if (/t\.me\/zombcash\/?(?:\?|$)/i.test(href)) send('telegram_open', 'telegram_channel');
    if (/pump\.fun\/coin|dexscreener\.com\/solana/i.test(href)) send('token_info_open', 'token_market');
    try {
      const url = new URL(href, window.location.href);
      if (/^https?:$/i.test(url.protocol) && url.origin !== window.location.origin) send('outbound_click', url.hostname.split('.')[0]);
    } catch (_) {}
  }, { capture: true });

  loadDashboard();
  if (root) window.setInterval(loadDashboard, 60000);
  // Only one homepage bundle should register page_view and click tracking.
  if (window.__zombcashCampaignTrackingLoaded) return;
  window.__zombcashCampaignTrackingLoaded = true;
})();
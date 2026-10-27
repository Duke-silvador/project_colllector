/* Independent recovery for live ZombieCash market + Living World panels.
   Runs only when the legacy script did not initialize these panels. */
(() => {
  'use strict';
  const API = 'https://zombcash-bot.fadehost.app';
  const byId = id => document.getElementById(id);
  const newsList = byId('world-news-list');
  const newsStatus = byId('world-news-status');
  const newsUpdated = byId('world-news-updated');
  const alertList = byId('world-alert-list');
  const alertStatus = byId('world-alarm-status');
  const marketRoot = byId('zombcash-market');

  // The legacy script sets this synchronously before its first request.
  // If it already started, don't duplicate its timers or requests.
  // The legacy script can change status to SYNCING RSS / SIGNAL INTERRUPTED
  // before this file runs. Recover whenever a panel exists but has no rendered
  // content, or still shows a transient/loading/error status.
  const newsLooksUninitialized = !!(newsList && newsStatus &&
    (!newsList.querySelector('.world-news-item') ||
     /CONNECTING|SCANNING|SYNCING|INTERRUPTED|ERROR|RETRY/i.test(newsStatus.textContent || '')));
  const alertsLookUninitialized = !!(alertList && alertStatus &&
    (!alertList.children.length ||
     /CONNECTING|SCANNING|MONITORING|CONNECTION|ERROR|RETRY/i.test(alertStatus.textContent || '')));
  const needsWorldRecovery = newsLooksUninitialized || alertsLookUninitialized;
  const marketStatusAtStart = byId('zombcash-market-status');
  const needsMarketRecovery = !!(marketRoot && marketStatusAtStart &&
    (!byId('zombcash-price')?.textContent?.trim() ||
     /CONNECTING|LOADING|SCANNING|ERROR|RETRY/i.test(marketStatusAtStart.textContent || '')));

  const request = async (path, timeout = 10000) => {
    const response = await fetch(API + path, {
      cache: 'no-store',
      signal: AbortSignal.timeout(timeout)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  };
  const node = (tag, cls, value) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (value != null) el.textContent = value;
    return el;
  };
  if (!document.getElementById('zombcash-enriched-news-styles')) {
    const style = document.createElement('style');
    style.id = 'zombcash-enriched-news-styles';
    style.textContent = `
      .world-news-item.is-enriched{display:flex;flex-direction:column;gap:9px}
      .world-news-image{display:block;width:100%;max-height:210px;object-fit:cover;border:1px solid #344b2d;background:#080d0a}
      .world-news-kind{display:inline-flex;align-self:flex-start;border:1px solid #567d36;padding:4px 7px;color:#a4ff43;font:700 8px Orbitron,sans-serif;letter-spacing:1px}
      .world-news-commentary{display:block;margin:2px 0 0;padding:10px 12px;border-left:2px solid #9bff45;background:linear-gradient(90deg,#9bff450d,transparent);color:#c9d7c2;font:500 13px/1.55 Rajdhani,sans-serif}
      .world-news-commentary b{display:block;margin-bottom:5px;color:#a4ff43;font:700 8px Orbitron,sans-serif;letter-spacing:1px}
    `;
    document.head.append(style);
  }
  const priceText = value => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '—';
    if (n >= 1) return '$' + n.toLocaleString('en-US', {maximumFractionDigits: 5});
    if (n >= .01) return '$' + n.toFixed(5);
    if (n >= .0001) return '$' + n.toFixed(7);
    return '$' + n.toPrecision(4);
  };
  const money = value => {
    const n = value == null || value === '' ? NaN : Number(value);
    if (!Number.isFinite(n) || n < 0) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toFixed(2);
  };

  async function loadNews() {
    if (!newsList || !newsStatus) return;
    newsStatus.textContent = 'SYNCING RSS';
    try {
      const data = await request('/api/news');
      const articles = Array.isArray(data.articles) ? data.articles : [];
      if (!articles.length) throw new Error('API returned no articles');
      newsList.replaceChildren();
      articles.slice(0, 7).forEach(article => {
        const item = node('article', 'world-news-item' + (article.enriched ? ' is-enriched' : ''));
        if (article.enriched && article.imageUrl) {
          const image = node('img', 'world-news-image');
          image.src = /^https?:\/\//i.test(article.imageUrl) ? article.imageUrl : API + article.imageUrl;
          image.alt = 'ZombieCash editorial illustration for ' + (article.title || 'news');
          image.loading = 'lazy';
          image.referrerPolicy = 'no-referrer';
          item.append(image);
        }
        if (article.enriched) item.append(node('span', 'world-news-kind', '☣ ZOMBIECASH ORIGINAL'));
        const meta = node('div', 'world-news-meta');
        meta.append(node('span', 'world-news-source', article.enriched ? 'ZOMBIECASH NEWS' : (article.source || 'OUTBREAK WIRE')));
        const published = article.published ? new Date(article.published) : null;
        meta.append(node('span', 'world-news-age', published && !Number.isNaN(published.getTime())
          ? published.toLocaleString('en-US', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})
          : 'LATEST'));
        const link = node('a', 'world-news-title', article.title || 'Untitled transmission');
        link.href = /^https?:\/\//i.test(article.link || '') ? article.link : '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        item.append(meta, link);
        if (article.summary) item.append(node('p', 'world-news-summary', article.summary));
        if (article.commentary) {
          const commentary = node('div', 'world-news-commentary');
          commentary.append(node('b', '', '🧟 ZOMBIE COMMENTARY'));
          commentary.append(node('span', '', article.commentary));
          item.append(commentary);
        }
        newsList.append(item);
      });
      newsStatus.textContent = data.stale ? 'LAST KNOWN FEED' : (Number(data.enrichedCount || 0) > 0 ? 'ZOMBIECASH NEWS ONLINE' : 'RSS FEED ONLINE');
      if (newsUpdated) newsUpdated.textContent = 'UPDATED ' + new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    } catch (error) {
      console.warn('Living World recovery: news feed failed', error);
      newsStatus.textContent = 'FEED ERROR · ' + String(error.message || 'REQUEST FAILED').slice(0, 45);
      if (newsUpdated) newsUpdated.textContent = 'AUTOMATIC RETRY ENABLED';
      if (!newsList.querySelector('.world-news-item')) {
        newsList.replaceChildren(node('p', 'world-empty', 'News API could not be reached from this browser. Check connection/CORS and retry.'));
      }
    }
  }

  async function loadAlarms() {
    if (!alertList || !alertStatus) return;
    try {
      const data = await request('/api/zombcash');
      const changeValue = data.priceChange && data.priceChange.h24;
      const change = changeValue == null ? NaN : Number(changeValue);
      const changeText = Number.isFinite(change) ? ((change > 0 ? '+' : '') + change.toFixed(2) + '% in 24h') : '24h change unavailable';
      const volume = data.volume && data.volume.h24 != null ? money(data.volume.h24) : 'volume unavailable';
      alertList.replaceChildren();
      const item = node('div', 'world-alert');
      item.append(node('span', 'alert-icon', '◉'));
      const body = node('div', '');
      body.append(node('strong', '', 'ZOMBCASH MARKET'));
      body.append(node('p', '', 'Price ' + priceText(data.priceUsd) + ' · ' + changeText + ' · 24h volume ' + volume));
      item.append(body, node('span', 'alert-level', data.stale ? 'CACHED' : 'LIVE'));
      alertList.append(item);
      alertStatus.textContent = data.stale ? 'LAST KNOWN DATA' : 'MARKET ONLINE';
    } catch (error) {
      console.warn('Living World recovery: market alarms failed', error);
      alertStatus.textContent = 'MARKET API ERROR';
      if (!alertList.children.length) {
        alertList.replaceChildren(node('p', 'world-empty', 'Market endpoint could not be reached from this browser.'));
      }
    }
  }

  async function loadMarketCard() {
    if (!marketRoot) return;
    const status = byId('zombcash-market-status');
    try {
      const data = await request('/api/zombcash', 12000);
      if (byId('zombcash-price')) byId('zombcash-price').textContent = priceText(data.priceUsd);
      const changeValue = data.priceChange && data.priceChange.h24;
      const change = changeValue == null ? NaN : Number(changeValue);
      if (byId('zombcash-change')) {
        byId('zombcash-change').textContent = Number.isFinite(change) ? ((change > 0 ? '+' : '') + change.toFixed(2) + '%') : '—';
        byId('zombcash-change').className = change > 0 ? 'change-up' : change < 0 ? 'change-down' : '';
      }
      if (byId('zombcash-volume')) byId('zombcash-volume').textContent = money(data.volume && data.volume.h24);
      if (byId('zombcash-liquidity')) byId('zombcash-liquidity').textContent = money(data.liquidity && data.liquidity.usd);
      if (byId('zombcash-cap')) byId('zombcash-cap').textContent = money(data.marketCap || data.fdv);
      if (status) status.textContent = data.stale ? 'LAST KNOWN DATA' : (data.activityAvailable === false ? 'PRICE AVAILABLE · ACTIVITY UNAVAILABLE' : 'TOKEN FEED ONLINE');
      const updated = byId('zombcash-market-updated');
      if (updated) updated.textContent = 'SOURCE UPDATED ' + new Date().toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    } catch (error) {
      console.warn('ZombieCash market recovery failed', error);
      if (status) status.textContent = 'API ERROR';
      const updated = byId('zombcash-market-updated');
      if (updated) updated.textContent = String(error.message || 'REQUEST FAILED').slice(0, 70);
    }
  }

  if (needsWorldRecovery) {
    loadNews();
    loadAlarms();
    window.setInterval(loadNews, 300000);
    window.setInterval(loadAlarms, 60000);
  }
  if (needsMarketRecovery) {
    loadMarketCard();
    window.setInterval(loadMarketCard, 45000);
  }
})();
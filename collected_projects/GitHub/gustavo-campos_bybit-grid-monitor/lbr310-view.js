// LBR310 monitor — read-only display, independent from trading/account UI.
(() => {
  const root = document.getElementById('lbr310Panel');
  if (!root) return;
  const get = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = value => value == null || !Number.isFinite(Number(value)) ? '—' :
    new Intl.NumberFormat('pt-PT',{maximumFractionDigits:2}).format(Number(value));
  const dt = value => {
    const d = new Date(value || '');
    return Number.isFinite(d.getTime()) ? d.toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Lisbon'}) : '—';
  };
  const typeName = {first_cross_v2:'First Cross V3 · estrutura confirmada'};
  function render(x) {
    const error = get('lbrError');
    if (!x || x.status !== 'ok' || !x.closed_bar_only) {
      error.hidden = false;
      error.textContent = 'LBR sem dados válidos no momento. Sinais não disponíveis; os restantes indicadores do painel não são afetados.';
      get('lbrStatus').textContent = 'SEM DADOS';
      get('lbrHistory').innerHTML = '<tr><td colspan="4">Aguardando candles fechados da Bybit.</td></tr>';
      for (const id of ['lbrTrend','lbrFast','lbrSlow','lbrHist','lbrPrice','lbrClosed','lbrLast']) get(id).textContent = '—';
      return;
    }
    const closedAt = new Date(x.last_closed_at || '').getTime();
    if (!Number.isFinite(closedAt) || Date.now() - closedAt > 2 * 3600000 || closedAt > Date.now() + 60000) {
      render(null);
      error.textContent = 'Os candles LBR estão desatualizados. Nenhum sinal deve ser usado.';
      get('lbrStatus').textContent = 'DESATUALIZADO';
      return;
    }
    error.hidden = true;
    get('lbrStatus').textContent = 'PESQUISA V3 · ENTRADAS PAUSADAS';
    const bull = x.trend === 'bull', bear = x.trend === 'bear';
    const trend = get('lbrTrend');
    trend.textContent = bull ? 'ALTA' : bear ? 'BAIXA' : 'NEUTRA';
    trend.className = bull ? 'lbr-up' : bear ? 'lbr-down' : '';
    get('lbrFast').textContent = fmt(x.fast_line);
    get('lbrSlow').textContent = fmt(x.slow_line);
    get('lbrHist').textContent = fmt(x.histogram);
    get('lbrPrice').textContent = fmt(x.close);
    get('lbrClosed').textContent = dt(x.last_closed_at);
    const sig = x.v3?.last_signal;
    get('lbrLast').textContent = sig ? (sig.direction === 'long' ? 'LONG' : 'SHORT') + ' · ' + dt(sig.time) : 'Nenhum First Cross V3 confirmado';
    const events = Array.isArray(x.v3?.recent_events) ? x.v2.recent_events.slice(0, 12) : [];
    get('lbrHistory').innerHTML = events.length ? events.map(ev => {
      const direction = ev.direction === 'long' ? 'long' : 'short';
      return '<tr><td>' + esc(dt(ev.time)) + '</td><td>' +
        esc(typeName[ev.type] || ev.type) + '</td><td><span class="lbr-tag ' + direction + '">' +
        (direction === 'long' ? 'LONG' : 'SHORT') + '</span></td><td>' + esc(fmt(ev.price)) +
        '</td></tr>';
    }).join('') : '<tr><td colspan="4">Ainda sem eventos First Cross V3 na janela carregada.</td></tr>';
  }
  async function refresh() {
    try {
      const r = await fetch('./data/grid-status.json?t=' + Date.now(),{cache:'no-store'});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      render(data.research?.lbr310);
    } catch (_) { render(null); }
  }
  refresh();
  setInterval(refresh,30000);
})();

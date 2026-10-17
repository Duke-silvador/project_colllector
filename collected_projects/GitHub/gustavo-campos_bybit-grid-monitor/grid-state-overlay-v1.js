(() => {
  const GRID_STRATEGIES = { eth: 'V44_ETH_VAULT_GRID', btc: 'V44_BTC_VAULT_GRID' };
  const fmtDate = value => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-PT');
  };
  const strategy = (data, id) => (data?.system?.strategies || []).find(s => s.id === id && (s.mode || 'demo') === 'demo');
  const isDisabled = s => Boolean(s) && (!s.cron_enabled || s.health === 'disabled');

  function forceDisabledCard(prefix, s, grid) {
    const status = document.getElementById(`${prefix}Status`);
    if (status) {
      status.textContent = 'DESATIVADO';
      status.className = 'status blocked';
      status.title = 'Estratégia desativada: cron OFF e sem novas execuções.';
    }
    const price = document.getElementById(`${prefix}Price`);
    const target = document.getElementById(`${prefix}Target`);
    const progress = document.getElementById(`${prefix}Progress`);
    const progressText = document.getElementById(`${prefix}ProgressText`);
    const distance = document.getElementById(`${prefix}Distance`);
    const details = document.getElementById(`${prefix}Details`);
    if (price) price.textContent = '—';
    if (target) target.textContent = '—';
    if (progress) progress.style.width = '0%';
    if (progressText) progressText.textContent = 'Grid desativado';
    if (distance) distance.textContent = 'sem execução';
    if (details) {
      const last = s?.last_update || grid?.source_ts;
      details.innerHTML = [
        ['Estado', 'DESATIVADO'], ['Cron', 'OFF'], ['Novas ordens', 'BLOQUEADAS'], ['Último snapshot', fmtDate(last)]
      ].map(([label, value]) => `<div class="detail"><span>${label}</span><strong>${value}</strong></div>`).join('');
    }
  }

  function updateHeading(allDisabled) {
    const section = document.getElementById('gridSection');
    if (!section) return;
    const heading = section.querySelector('.section-title h2');
    const note = section.querySelector('.section-note');
    if (heading) heading.textContent = 'Spot Grids';
    if (note) note.textContent = allDisabled ? 'Vault Grid desativado · snapshots anteriores são apenas históricos' : 'estado operacional e histórico';
  }

  function setMiniStat(containerId, label, value) {
    const box = document.getElementById(containerId);
    if (!box) return;
    for (const item of box.querySelectorAll('.mini')) {
      const name = item.querySelector('span')?.textContent?.trim();
      if (name === label) {
        const strong = item.querySelector('strong');
        if (strong) strong.textContent = String(value);
      }
    }
  }

  function suppressClosedDisabledGridPositions(data, disabledIds) {
    if (!disabledIds.size) return;
    const all = (data?.system?.open_positions || []).filter(p => (p.mode || 'demo') === 'demo');
    const effective = all.filter(p => !disabledIds.has(p.strategy));
    const labels = new Map((data?.system?.strategies || []).map(s => [s.id, s.label || s.id]));
    const suppressedLabels = new Set([...disabledIds].map(id => labels.get(id) || id));

    const box = document.getElementById('openPositions');
    if (box) {
      for (const card of [...box.querySelectorAll('.position-card')]) {
        const label = card.querySelector('.position-strategy')?.textContent?.trim();
        if (label && suppressedLabels.has(label)) card.remove();
      }
      const cardsLeft = box.querySelectorAll('.position-card').length;
      if (!cardsLeft) box.innerHTML = '<div class="empty-state">Nenhuma posição aberta neste ambiente.</div>';
    }

    const total = effective.length;
    const spot = effective.filter(p => p.market === 'spot').length;
    const futures = effective.filter(p => p.market === 'futures').length;

    const openCount = document.getElementById('openCount');
    const openHint = document.getElementById('openMarketHint');
    const openPositionsCount = document.getElementById('openPositionsCount');
    if (openCount) openCount.textContent = String(total);
    if (openHint) openHint.textContent = `${spot} Spot • ${futures} Futures`;
    if (openPositionsCount) openPositionsCount.textContent = `${total} posiç${total === 1 ? 'ão' : 'ões'}`;
    setMiniStat('spotStats', 'Abertas', spot);
    setMiniStat('futuresStats', 'Abertas', futures);
  }

  function apply(data) {
    const disabledIds = new Set();
    const states = Object.entries(GRID_STRATEGIES).map(([prefix, id]) => {
      const s = strategy(data, id);
      const grid = data?.grids?.[prefix === 'eth' ? 'ETHUSDT' : 'BTCUSDT'] || {};
      const disabled = isDisabled(s);
      if (disabled) {
        disabledIds.add(id);
        forceDisabledCard(prefix, s, grid);
      }
      return disabled;
    });
    updateHeading(states.length > 0 && states.every(Boolean));
    suppressClosedDisabledGridPositions(data, disabledIds);
  }

  async function sync() {
    try {
      const r = await fetch(`data/grid-status.json?gridstate=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return;
      apply(await r.json());
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync, { once: true });
  else sync();
  setInterval(sync, 3000);
})();

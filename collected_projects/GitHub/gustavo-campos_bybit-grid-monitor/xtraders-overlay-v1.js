(() => {
  const TARGET_ID = 'futuresStrategies';
  const FALLBACK_ID = 'xtraders-pc2m-context-v2-fallback';

  function loadGridStateOverlay() {
    if (document.querySelector('script[data-grid-state-overlay]')) return;
    const script = document.createElement('script');
    script.src = 'grid-state-overlay-v1.js?v=20260928-1';
    script.dataset.gridStateOverlay = 'true';
    document.head.appendChild(script);
  }

  function installStyle() {
    if (document.getElementById('xtraders-overlay-style')) return;
    const style = document.createElement('style');
    style.id = 'xtraders-overlay-style';
    style.textContent = `
      .xtraders-research-row{border-color:rgba(138,164,255,.18);background:linear-gradient(135deg,rgba(77,99,190,.12),rgba(4,8,14,.22))}
      .health-dot.xtr-unknown{background:#fbbf24;color:#fbbf24}
      .strategy-chip.xtr-demo{color:#86efac;border-color:rgba(34,197,94,.30);background:rgba(22,101,52,.18)}
      .strategy-chip.xtr-orders{color:#93c5fd;border-color:rgba(59,130,246,.30);background:rgba(30,64,175,.18)}
      .strategy-chip.xtr-liveoff{color:#fca5a5;border-color:rgba(239,68,68,.28);background:rgba(127,29,29,.18)}
      .strategy-chip.xtr-runner{color:#fde68a;border-color:rgba(251,191,36,.28);background:rgba(92,68,12,.20)}
      .strategy-chip.xtr-context{color:#c4b5fd;border-color:rgba(167,139,250,.25);background:rgba(76,29,149,.16)}
    `;
    document.head.appendChild(style);
  }

  function snapshotHasRealXtraders() {
    const labels = Array.from(document.querySelectorAll(`#${TARGET_ID} .strategy-name`));
    return labels.some(el => /xtraders|pc2m/i.test(el.textContent || '') && el.closest('.strategy-row')?.id !== FALLBACK_ID);
  }

  function fallbackRow() {
    const row = document.createElement('div');
    row.className = 'strategy-row xtraders-research-row';
    row.id = FALLBACK_ID;
    row.dataset.catalogOnly = 'true';
    row.innerHTML = `
      <div class="strategy-main">
        <div class="strategy-name">XTRADERS PC2m — DEMO</div>
        <div class="strategy-meta">
          <span class="health-dot xtr-unknown" title="Status do runner ainda não é publicado pelo monitor"></span>
          <span class="strategy-chip xtr-demo">DEMO CONFIGURADO</span>
          <span class="strategy-chip xtr-orders">ORDENS DEMO HABILITADAS</span>
          <span class="strategy-chip xtr-liveoff">LIVE BLOQUEADO</span>
          <span class="strategy-chip">XAU</span>
          <span class="strategy-chip">CL</span>
          <span class="strategy-chip">QQQ</span>
          <span class="strategy-chip">SPY</span>
          <span class="strategy-chip">IWM</span>
          <span class="strategy-chip">XAG</span>
          <span class="strategy-chip xtr-context">CONTEXT V2</span>
          <span class="strategy-chip xtr-runner">RUNNER: NÃO PUBLICADO</span>
        </div>
      </div>
      <div class="strategy-stat"><span>Ops reais</span><strong>—</strong></div>
      <div class="strategy-stat"><span>W / L</span><strong>—</strong></div>
      <div class="strategy-stat"><span>PnL real</span><strong>—</strong></div>`;
    row.title = 'Estado conhecido: XTRADERS está configurado para Bybit DEMO, com envio de ordens DEMO habilitado e LIVE bloqueado. O publisher ainda não informa se o runner está ativo agora, nem publica operações, W/L ou PnL desta estratégia. Os campos ficam em branco para não inferir dados.';
    return row;
  }

  function ensureVisible() {
    const box = document.getElementById(TARGET_ID);
    if (!box) return;
    const current = document.getElementById(FALLBACK_ID);
    if (snapshotHasRealXtraders()) {
      if (current) current.remove();
      return;
    }
    if (!current) box.appendChild(fallbackRow());
  }

  function installObserver() {
    installStyle();
    loadGridStateOverlay();
    const box = document.getElementById(TARGET_ID);
    if (!box) return;
    const observer = new MutationObserver(() => queueMicrotask(ensureVisible));
    observer.observe(box, {childList:true});
    ensureVisible();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installObserver, {once:true});
  else installObserver();
  setInterval(ensureVisible, 5000);
})();

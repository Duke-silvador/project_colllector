(function () {
  'use strict';
  const $ = id => document.getElementById(id), M = window.Municipality, A = window.Investment, GEO = window.MTMapData;
  const money = n => n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const number = n => n.toLocaleString('pt-BR');
  const short = n => n.toLocaleString('pt-BR', {notation: 'compact', maximumFractionDigits: 1});
  const paths = new Map(), locations = new Map(GEO.municipalities.map(c => [c.id, c]));
  const colors = ['#e8f2ff', '#bad7f3', '#74a9da', '#367db6', '#1c3580'];
  let context = null, data = {cities: new Map(), unmatched: [], aliases: []}, selected = null, zoom = 1, thresholds = [];
  const tooltip = document.createElement('div'); tooltip.id = 'municipalityTooltip'; tooltip.className = 'municipality-tooltip'; tooltip.role = 'tooltip'; tooltip.hidden = true; document.body.append(tooltip);
  const create = (tag, className, text) => {const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el;};
  function hideTooltip() {tooltip.hidden = true; for (const p of paths.values()) p.classList.remove('is-hovered');}
  function valueFor(id) {
    const total = M.totals(data.cities.get(id), context?.product || 'all');
    return $('mapMetric').value === 'value' ? total.value : total.qty;
  }
  function labelValue(value) {return value === null ? 'Sem dados' : $('mapMetric').value === 'value' ? money(value) : number(value) + ' famílias/cartões';}
  function paint() {
    const values = [...locations.keys()].map(valueFor).filter(v => v !== null && v > 0).sort((a, b) => a - b);
    thresholds = values.length ? [...new Set([0.25, 0.5, 0.75, 1].map(q => values[Math.max(0, Math.ceil(values.length * q) - 1)]))] : [];
    for (const [id, path] of paths) {
      const value = valueFor(id);
      const color = value === null ? '#dfe4eb' : value === 0 ? colors[0] : colors[1 + thresholds.findIndex(limit => value <= limit)];
      path.setAttribute('fill', color || colors.at(-1));
      path.setAttribute('aria-label', `${locations.get(id).name}: ${labelValue(value)}. Enter para selecionar.`);
      path.setAttribute('aria-pressed', String(id === selected));
      path.classList.toggle('is-selected', id === selected);
      path.dataset.value = value === null ? '' : String(value);
    }
    const legend = $('mapLegend'); legend.replaceChildren();
    const add = (color, label) => {const span = create('span', 'map-legend-item'); const swatch = create('i'); swatch.style.background = color; span.append(swatch, document.createTextNode(label)); legend.append(span);};
    add('#dfe4eb', 'Sem dados'); add(colors[0], 'Zero informado');
    thresholds.forEach((threshold, index) => add(colors[index + 1], 'Até ' + ($('mapMetric').value === 'value' ? 'R$ ' : '') + short(threshold)));
  }
  function detailContent(id, compact = false) {
    const geo = locations.get(id), city = data.cities.get(id), total = M.totals(city, context?.product || 'all');
    const actual = context?.view === 'actual';
    const container = create('div', compact ? 'city-content compact-city' : 'city-content');
    container.append(create('span', 'source-caption', compact ? 'MUNICÍPIO' : 'MUNICÍPIO SELECIONADO'));
    container.append(create(compact ? 'strong' : 'h4', 'city-name', geo.name));
    container.append(create('p', 'city-period', context?.month ? `${context.month.name} / ${context.month.period.slice(0, 4)} · ${actual ? 'Acumulado salvo' : 'Estimativa mensal'}` : 'Sem período disponível'));
    const summary = create('div', 'city-summary');
    const quantity = create('div'); quantity.append(create('strong', '', total.qty === null ? '—' : number(total.qty)), create('span', '', 'Famílias / cartões'));
    const amount = create('div'); amount.append(create('strong', '', total.value === null ? '—' : money(total.value)), create('span', '', actual ? 'Valor acumulado' : 'Valor estimado do mês'));
    summary.append(quantity, amount); container.append(summary);
    if (context?.product !== 'all') container.append(create('p', 'city-filter-hint', `Resumo e cor: ${A.LABELS[context.product]}. Detalhes de todos os benefícios abaixo.`));
    if (!city) container.append(create('p', 'city-no-data', context?.month?.invalid ? 'Há dados conflitantes ou inválidos neste período. Confira as fontes da análise.' : 'Nenhum registro localizado neste município para o mês selecionado.'));
    const table = create('table', 'city-benefits');
    const head = create('thead'), headRow = create('tr');
    for (const label of ['Benefício', 'Famílias', actual ? 'Acumulado' : 'Valor mensal']) headRow.append(create('th', '', label));
    head.append(headRow); table.append(head);
    const body = create('tbody');
    for (const code of M.PRODUCTS) {
      const item = city?.products[code]?.families;
      const tr = create('tr', context?.product === code ? 'selected-benefit' : ''); tr.dataset.product = code;
      tr.append(create('td', '', A.LABELS[code]), create('td', '', item?.qtyComplete ? number(item.qty) : '—'), create('td', '', item ? money(item.cents / 100) : '—'));
      body.append(tr);
    }
    table.append(body); container.append(table);
    const personnel = city?.products['1054']?.professionals;
    const professional = create('div', 'city-professionals');
    professional.append(create('span', '', 'Profissionais · Família'), create('strong', '', personnel ? `${personnel.qtyComplete ? number(personnel.qty) : '—'} prof. · ${money(personnel.cents / 100)}` : 'Sem registro / não incluídos'));
    container.append(professional);
    if (!compact) {
      container.append(create('p', 'city-data-note', 'Profissionais não entram na contagem de famílias. Seu valor entra no resumo quando o filtro inclui Família. “—” significa informação ausente.'));
      if (context?.month?.sources.length) container.append(create('p', 'city-origin', 'Origem: ' + context.month.sources.join(' · ')));
    }
    return container;
  }
  function showTooltip(id, event) {
    if (!context) return;
    paths.get(id).classList.add('is-hovered');
    tooltip.replaceChildren(detailContent(id, true)); tooltip.hidden = false;
    placeTooltip(event);
  }
  function placeTooltip(event) {
    const margin = 12, width = tooltip.offsetWidth, height = tooltip.offsetHeight;
    let x = event.clientX + 16, y = event.clientY + 16;
    if (x + width > window.innerWidth - margin) x = event.clientX - width - 16;
    if (y + height > window.innerHeight - margin) y = window.innerHeight - height - margin;
    tooltip.style.left = Math.max(margin, x) + 'px'; tooltip.style.top = Math.max(margin, y) + 'px';
  }
  function selectCity(id, scroll = false) {
    if (!locations.has(id)) return;
    selected = id; hideTooltip();
    $('mapCitySearch').value = locations.get(id).name;
    $('mapCityDetail').replaceChildren(detailContent(id)); paint();
    if (zoom > 1) applyZoom();
    if (scroll && window.matchMedia('(max-width: 760px)').matches) $('mapCityDetail').scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }
  for (const city of GEO.municipalities) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', city.path); path.setAttribute('fill-rule', 'evenodd'); path.setAttribute('tabindex', '0'); path.setAttribute('role', 'button'); path.setAttribute('vector-effect', 'non-scaling-stroke'); path.setAttribute('aria-describedby', 'mapContext');
    path.classList.add('municipality-shape'); path.dataset.id = city.id; path.dataset.name = city.name;
    path.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') showTooltip(city.id, event);});
    path.addEventListener('pointermove', event => {if (!tooltip.hidden && event.pointerType !== 'touch') placeTooltip(event);});
    path.addEventListener('pointerleave', hideTooltip);
    path.addEventListener('click', () => selectCity(city.id, true));
    path.addEventListener('focus', () => {if (context) selectCity(city.id);});
    path.addEventListener('keydown', event => {if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); selectCity(city.id, true);} if (event.key === 'Escape') hideTooltip();});
    paths.set(city.id, path); $('municipalityPaths').append(path);
    const option = document.createElement('option'); option.value = city.name; $('mapCityNames').append(option);
  }
  function applyZoom() {
    const width = GEO.width / zoom, height = GEO.height / zoom;
    const bounds = selected ? locations.get(selected).bounds : [0, 0, GEO.width, GEO.height];
    const cx = (bounds[0] + bounds[2]) / 2, cy = (bounds[1] + bounds[3]) / 2;
    const x = Math.max(0, Math.min(GEO.width - width, cx - width / 2)), y = Math.max(0, Math.min(GEO.height - height, cy - height / 2));
    $('municipalityMap').setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
    $('mapZoomOut').disabled = zoom <= 1; $('mapZoomIn').disabled = zoom >= 4;
  }
  $('mapZoomIn').addEventListener('click', () => {zoom = Math.min(4, zoom * 1.5); hideTooltip(); applyZoom();});
  $('mapZoomOut').addEventListener('click', () => {zoom = Math.max(1, zoom / 1.5); hideTooltip(); applyZoom();});
  $('mapReset').addEventListener('click', () => {zoom = 1; hideTooltip(); applyZoom();});
  $('mapMetric').addEventListener('change', () => {hideTooltip(); paint();});
  function findCity() {
    const input = M.key($('mapCitySearch').value), canonical = M.ALIASES[input] || input;
    const city = GEO.municipalities.find(c => M.key(c.name) === canonical);
    if (city) {selectCity(city.id, true); $('mapCitySearch').setCustomValidity('');}
    else if (input) {$('mapCitySearch').setCustomValidity('Escolha um município de Mato Grosso na lista.'); $('mapCitySearch').reportValidity();}
  }
  $('mapCitySearch').addEventListener('input', () => $('mapCitySearch').setCustomValidity(''));
  $('mapCitySearch').addEventListener('change', findCity);
  $('mapCitySearch').addEventListener('keydown', event => {if (event.key === 'Enter') {event.preventDefault(); findCity();}});
  $('mapMonth').addEventListener('change', () => document.dispatchEvent(new CustomEvent('map-month-change', {detail: Number($('mapMonth').value)})));
  window.addEventListener('scroll', hideTooltip, true); window.addEventListener('resize', hideTooltip);
  document.addEventListener('keydown', event => {if (event.key === 'Escape') hideTooltip();});
  function update(next) {
    context = next; hideTooltip();
    data = M.aggregate(next.month?.records || [], GEO.municipalities);
    $('mapMonth').replaceChildren(...next.months.map((m, i) => {const option = new Option(m.name + (m.value === null ? ' · sem dados' : ''), i); option.disabled = m.value === null; return option;}));
    $('mapMonth').value = String(next.selected);
    const product = next.product === 'all' ? 'Todos os produtos' : A.LABELS[next.product];
    $('mapProductBadge').textContent = product;
    const coverage = [...data.cities.values()].filter(c => M.totals(c, next.product).present).length;
    $('mapContext').textContent = `${next.month?.name || 'Sem mês'} ${next.month?.period.slice(0, 4) || ''} · ${next.view === 'actual' ? 'Valores acumulados salvos' : 'Estimativa mensal'} · ${coverage} de ${GEO.municipalities.length} municípios com registros para ${product.toLowerCase()}.`;
    if (!selected) selected = [...data.cities.values()].sort((a, b) => (M.totals(b, next.product).value || 0) - (M.totals(a, next.product).value || 0))[0]?.id || '5103403';
    selectCity(selected);
    const notices = [];
    if (next.month?.invalid) notices.push('O mapa deste mês não exibe valores porque há conflitos ou dados inválidos nas fontes. Confira a análise e as abas incluídas.');
    if (data.unmatched.length) notices.push(`${data.unmatched.length} registro(s) sem município correspondente no mapa: ${[...new Set(data.unmatched.map(r => r.city || '(município ausente na descrição)'))].join(', ')}. Esses registros continuam no gráfico anual, mas não estão distribuídos no mapa.`);
    const missingQuantities = (next.month?.records || []).filter(r => r.qty === null).length;
    if (missingQuantities) notices.push(`${missingQuantities} registro(s) têm quantidade ausente ou inválida. O valor é preservado, mas a quantidade aparece como “—”.`);
    if (data.aliases.length) notices.push('Grafia conciliada somente no mapa: ' + data.aliases.join('; ') + '. Os valores originais foram mantidos.');
    $('mapWarnings').hidden = !notices.length; $('mapWarnings').textContent = notices.join(' ');
  }
  applyZoom();
  window.MunicipalityMap = {update, hideTooltip};
  LocalSession.register('map', {
    order: 30,
    capture: () => ({selected, zoom, metric: $('mapMetric').value}),
    restore: saved => {
      $('mapMetric').value = saved.metric === 'value' ? 'value' : 'qty';
      zoom = Math.max(1, Math.min(4, saved.zoom || 1));
      if (locations.has(saved.selected)) selected = saved.selected;
      if (selected && context) selectCity(selected);
      applyZoom();
    },
    clear: () => {context = null; selected = null; zoom = 1; data = {cities: new Map(), unmatched: [], aliases: []}; $('mapMetric').value = 'qty'; $('mapCitySearch').value = ''; $('mapCityDetail').replaceChildren(); hideTooltip(); paint(); applyZoom();}
  });
})();

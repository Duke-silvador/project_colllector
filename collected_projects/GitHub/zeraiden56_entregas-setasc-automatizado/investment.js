(function () {
  'use strict';
  const $ = id => document.getElementById(id), A = window.Investment, T = window.Treatment;
  const cash = n => n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
  const compact = n => n.toLocaleString('pt-BR', {notation: 'compact', maximumFractionDigits: 1});
  const model = {view: 'estimate', actual: [], estimate: [], sector: null, year: {actual: '', estimate: ''}, series: null, selected: -1, upload: 0};
  const activeSources = () => model[model.view];
  function activateTab(id, focus = false) {
    for (const tab of ['treatment', 'investment']) {
      const active = tab === id;
      $(tab + 'Tab').setAttribute('aria-selected', String(active));
      $(tab + 'Tab').tabIndex = active ? 0 : -1;
      $(tab + 'Panel').hidden = !active;
    }
    if (focus) $(id + 'Tab').focus();
  }
  for (const id of ['treatment', 'investment']) {
    $(id + 'Tab').addEventListener('click', () => activateTab(id));
    $(id + 'Tab').addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); activateTab(event.key === 'Home' ? 'treatment' : event.key === 'End' ? 'investment' : id === 'treatment' ? 'investment' : 'treatment', true);
      }
    });
  }
  $('goToUploads').addEventListener('click', () => {activateTab('treatment', true); $('sectorDrop').scrollIntoView({behavior: 'smooth', block: 'center'});});
  function fillYears() {
    const years = [...new Set(activeSources().filter(s => s.enabled && A.validPeriod(s.period)).map(s => s.period.slice(0, 4)))].sort().reverse();
    const preferred = model.year[model.view] || String(new Date().getFullYear());
    $('investmentYear').replaceChildren(...(years.length ? years.map(y => new Option(y, y)) : [new Option('Sem períodos disponíveis', '')]));
    if (years.includes(preferred)) $('investmentYear').value = preferred;
    model.year[model.view] = $('investmentYear').value;
    $('investmentYear').disabled = !years.length;
  }
  function mapping() {
    const sources = activeSources();
    $('sourceCount').textContent = `${sources.filter(s => s.enabled).length} de ${sources.length} abas incluídas`;
    $('mappingBody').replaceChildren(...sources.map(source => {
      const tr = document.createElement('tr');
      const cell = () => {const td = document.createElement('td'); tr.append(td); return td;};
      const include = document.createElement('input'); include.type = 'checkbox'; include.checked = source.enabled; include.setAttribute('aria-label', 'Incluir ' + source.name);
      include.addEventListener('change', () => {source.enabled = include.checked; fillYears(); render(); $('sourceCount').textContent = `${sources.filter(s => s.enabled).length} de ${sources.length} abas incluídas`;});
      cell().append(include);
      const title = cell(); title.textContent = source.name;
      if (source.file) {const small = document.createElement('small'); small.textContent = source.file; title.append(small);}
      const month = document.createElement('input'); month.type = 'month'; month.min = '1900-01'; month.max = '9999-12'; month.value = source.period; month.setAttribute('aria-label', 'Mês de referência de ' + source.name);
      month.addEventListener('change', () => {source.period = month.value; fillYears(); render();});
      cell().append(month); cell().textContent = source.basis;
      return tr;
    }));
    if (!sources.length) {const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 4; td.textContent = 'Importe a fonte de dados para conferir os períodos.'; tr.append(td); $('mappingBody').append(tr);}
  }
  function setView(view) {
    model.year[model.view] = $('investmentYear').value;
    model.view = view; model.selected = -1;
    $('actualView').setAttribute('aria-pressed', String(view === 'actual'));
    $('estimateView').setAttribute('aria-pressed', String(view === 'estimate'));
    $('actualSources').hidden = view !== 'actual';
    $('estimateSources').hidden = view !== 'estimate';
    $('estimateRules').hidden = view !== 'estimate';
    fillYears(); mapping(); render();
  }
  $('actualView').addEventListener('click', () => setView('actual'));
  $('estimateView').addEventListener('click', () => setView('estimate'));
  $('investmentYear').addEventListener('change', () => {model.year[model.view] = $('investmentYear').value; model.selected = -1; render();});
  $('investmentProduct').addEventListener('change', render);
  $('estimateRules').addEventListener('input', render);
  $('estimateRules').addEventListener('change', render);
  document.addEventListener('sector-sources-changed', event => {
    if (model.sector === event.detail) return;
    model.sector = event.detail;
    const seen = new Set();
    model.estimate = event.detail ? [...event.detail.tables].map(([name, table]) => {
      const inferred = A.inferPeriod(name), duplicate = inferred.period && seen.has(inferred.period);
      if (inferred.period) seen.add(inferred.period);
      return {name, table, file: event.detail.name, ...inferred, enabled: !duplicate, basis: inferred.basis + (duplicate ? ' · alternativa desmarcada para evitar duplicidade' : '')};
    }) : [];
    $('estimateSourceInfo').textContent = event.detail ? `${event.detail.name} · ${model.estimate.length} abas disponíveis. Cada mês é calculado com suas próprias quantidades.` : 'Carregue o input do setor para calcular cada mês e preencher o mapa. Não é necessário importar a planilha de tratamento.';
    if (model.view === 'estimate') {fillYears(); mapping(); render();}
  });
  $('historyFile').addEventListener('change', async event => {
    const files = [...event.target.files]; if (!files.length) return;
    const token = ++model.upload;
    const job = LoadingUI.begin('Carregando histórico', 'Preparando a leitura dos arquivos…');
    $('historyStatus').hidden = false; $('historyStatus').classList.remove('error');
    $('historyStatus').textContent = 'Lendo o histórico localmente. Planilhas com muitas abas podem levar alguns segundos.';
    $('historyFileInfo').textContent = 'Analisando os arquivos…';
    try {
      const sources = [];
      let skipped = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parsed = await WorkbookIO.load(file, 'history', (percent, message) => LoadingUI.progress(job, (i + percent / 100) / files.length * 95, message));
        if (model.upload !== token) return;
        sources.push(...parsed.sources.map(source => ({...source, file: file.name, enabled: true})));
        skipped += parsed.skipped;
      }
      if (!sources.length) throw Error('Nenhuma aba de exportação de cartões encontrada. Use as seis colunas do CSV de entregas, incluindo entrega_nome e entrega_valorOrgao.');
      model.actual = sources;
      $('historyFileInfo').textContent = `${files.length} arquivo(s) · ${sources.length} abas de cartões identificadas`;
      $('historyStatus').textContent = `Histórico carregado. ${skipped} aba(s) fora do formato de exportação de cartões foram ignoradas. Confira os meses de referência e eventuais conflitos abaixo.`;
      if (model.view === 'actual') {fillYears(); mapping(); render();}
      LoadingUI.progress(job, 97, 'Salvando o histórico neste navegador…');
      await LocalSession.saveNow();
    } catch (error) {
      $('historyStatus').classList.add('error'); $('historyStatus').textContent = error.message;
      $('historyFileInfo').textContent = 'Não foi possível carregar o histórico.';
    } finally {LoadingUI.end(job); $('historyFile').value = '';}
  });
  function options() {
    const value = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
    return {benefit: value('estimateBenefit'), technician: value('estimateTechnician'), assistant: value('estimateAssistant'), professionalMode: $('estimateProfessionalMode').value, includeProfessionals: $('estimateProfessionals').checked};
  }
  function render() {
    window.MunicipalityMap.hideTooltip();
    const actual = model.view === 'actual', year = Number($('investmentYear').value), product = $('investmentProduct').value;
    const label = product === 'all' ? 'Todos os produtos' : A.LABELS[product];
    $('investmentNotice').textContent = actual ? 'Valores acumulados salvos nas abas de exportação, sem recalcular ou corrigir o histórico. Não são somados entre meses. Família inclui as entregas de profissionais. Meses sem registros ficam sem valor.' : 'Estimativa de um mês calculada a partir das quantidades de cada aba do setor. Não representa pagamento comprovado nem o acumulado do sistema. Os parâmetros desta visão são independentes do tratamento.';
    let series;
    try {series = actual ? A.actualSeries(model.actual, year, product) : A.estimateSeries(model.estimate, year, product, options());}
    catch (error) {series = {months: [], notices: [error.message]};}
    model.series = series;
    try {
      model.mapSeries = !actual && product === 'all' ? series : A.estimateSeries(model.estimate, year, 'all', options());
    } catch {model.mapSeries = {months: []};}
    const available = series.months.filter(m => m.value !== null);
    $('investmentData').hidden = !available.length;
    $('investmentEmpty').hidden = !!available.length;
    $('investmentEmptyTitle').textContent = activeSources().length ? 'Sem valores disponíveis para esta seleção' : actual ? 'Importe o histórico para acompanhar a evolução' : 'Importe o controle mensal do setor';
    $('investmentEmptyText').textContent = activeSources().length ? 'Confira o ano, o produto, as abas incluídas e os meses de referência. Conflitos ou dados inválidos deixam o período sem valor.' : actual ? 'Use a planilha de tratamento ou selecione os CSVs dos períodos que deseja analisar.' : 'As abas mensais do controle do setor serão usadas para estimar o investimento de cada mês.';
    $('annualWarnings').hidden = !series.notices.length;
    $('annualWarningsList').replaceChildren(...series.notices.slice(0, 100).map(message => {const li = document.createElement('li'); li.textContent = message; return li;}));
    if (!available.length) return;
    const first = available[0], last = available.at(-1), peak = available.reduce((best, m) => m.value > best.value ? m : best);
    const sum = available.reduce((n, m) => n + Math.round(m.value * 100), 0) / 100;
    $('annualMainLabel').textContent = actual ? 'Último valor acumulado' : 'Total estimado nos meses disponíveis';
    $('annualMain').textContent = cash(actual ? last.value : sum);
    $('annualMainHint').textContent = actual ? `${last.name} de ${year}` : `${available.length} mês(es) com dados em ${year}`;
    $('annualChangeLabel').textContent = actual ? 'Variação entre registros' : 'Média mensal estimada';
    $('annualChange').textContent = actual ? available.length > 1 ? cash(last.value - first.value) : '—' : cash(sum / available.length);
    $('annualChangeHint').textContent = actual ? available.length > 1 ? `${first.name} → ${last.name}; não indica desembolso` : 'É necessário mais de um mês' : 'Considera somente meses com dados';
    $('annualPeakLabel').textContent = actual ? 'Maior valor registrado' : 'Maior estimativa mensal';
    $('annualPeak').textContent = cash(peak.value); $('annualPeakHint').textContent = peak.name;
    $('annualCoverage').textContent = `${available.length} / 12`;
    $('chartEyebrow').textContent = actual ? 'VALORES ACUMULADOS SALVOS' : 'ESTIMATIVA MENSAL DO SETOR';
    $('chartTitle').textContent = `Investimento em ${year}`;
    $('chartSubtitle').textContent = `${label} · selecione um mês abaixo para ver o valor e a origem`;
    $('chartLegend').textContent = actual ? 'Acumulado por período' : 'Estimativa de um mês';
    $('annualValueHeader').textContent = actual ? 'Valor acumulado salvo' : 'Valor estimado do mês';
    if (model.selected < 0 || series.months[model.selected]?.value == null) model.selected = series.months.findLastIndex(m => m.value !== null);
    drawChart(actual);
    $('annualTableBody').replaceChildren(...series.months.map((month, index) => {
      const tr = document.createElement('tr'), previous = series.months[index - 1];
      for (const text of [month.name, month.value === null ? 'Sem dados' : cash(month.value), month.value !== null && previous?.value != null ? cash(month.value - previous.value) : '—', month.sources.length ? month.sources.join(' · ') : 'Sem aba para este período']) {
        const td = document.createElement('td'); td.textContent = text; tr.append(td);
      }
      if (month.value === null) tr.classList.add('no-data');
      return tr;
    }));
  }
  function svg(tag, attributes = {}, text) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function drawChart(actual) {
    const chart = $('investmentChart'), months = model.series.months;
    const max = Math.max(...months.filter(m => m.value !== null).map(m => m.value), 1) * 1.12;
    const x = i => 105 + i * 82, y = v => 253 - v / max * 220;
    chart.replaceChildren(svg('title', {id: 'svgChartTitle'}, $('chartTitle').textContent), svg('desc', {id: 'svgChartDescription'}, 'Valores em reais. Meses sem dados não são estimados. Os mesmos valores estão na tabela abaixo.'));
    for (let i = 0; i <= 4; i++) {
      const value = max * i / 4, py = y(value);
      chart.append(svg('line', {x1: 75, x2: 1040, y1: py, y2: py, stroke: '#e7ecf3', 'stroke-dasharray': i ? '4 5' : '0'}));
      chart.append(svg('text', {x: 64, y: py + 4, 'text-anchor': 'end', fill: '#718096', 'font-size': 11}, 'R$ ' + compact(value)));
    }
    let path = '', connected = false;
    months.forEach((m, i) => {
      chart.append(svg('text', {x: x(i), y: 284, 'text-anchor': 'middle', fill: '#667892', 'font-size': 12}, m.name.slice(0, 3)));
      if (m.value === null) {connected = false; chart.append(svg('text', {x: x(i), y: 243, 'text-anchor': 'middle', fill: '#b0bac9', 'font-size': 15}, '—')); return;}
      if (actual) {path += `${connected ? 'L' : 'M'}${x(i)},${y(m.value)} `; connected = true;}
      else {
        const bar = svg('rect', {x: x(i) - 21, y: y(m.value), width: 42, height: Math.max(2, 253 - y(m.value)), rx: 5, fill: i === model.selected ? '#0084c9' : '#1c3580', class: 'chart-target'});
        bar.append(svg('title', {}, `${m.name}: ${cash(m.value)}`));
        bar.addEventListener('click', () => {model.selected = i; drawChart(actual);}); chart.append(bar);
      }
    });
    if (actual) {
      chart.append(svg('path', {d: path, fill: 'none', stroke: '#1c3580', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}));
      months.forEach((m, i) => {
        if (m.value === null) return;
        const point = svg('circle', {cx: x(i), cy: y(m.value), r: i === model.selected ? 7 : 5, fill: i === model.selected ? '#0084c9' : '#1c3580', stroke: '#fff', 'stroke-width': 2, class: 'chart-target'});
        point.append(svg('title', {}, `${m.name}: ${cash(m.value)}`)); point.addEventListener('click', () => {model.selected = i; drawChart(actual);}); chart.append(point);
      });
    }
    $('monthButtons').replaceChildren(...months.map((m, i) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = m.name.slice(0, 3); button.disabled = m.value === null; button.setAttribute('aria-label', m.name + (m.value === null ? ': sem dados' : ': ' + cash(m.value))); button.setAttribute('aria-pressed', String(model.selected === i));
      button.addEventListener('click', () => {model.selected = i; drawChart(actual); $('monthButtons').children[i].focus();}); return button;
    }));
    const selected = months[model.selected];
    $('monthDetail').replaceChildren();
    if (selected) {
      const heading = document.createElement('strong'); heading.textContent = `${selected.name}: ${cash(selected.value)}`;
      const detail = document.createElement('span'); detail.textContent = `Origem: ${selected.sources.join(' · ')}${actual ? ' · ' + selected.count + ' entregas' : ''}`;
      $('monthDetail').append(heading, detail);
    }
    $('municipalityMapCard').hidden = model.view !== 'estimate';
    if (model.view === 'estimate') window.MunicipalityMap.update({view: 'estimate', product: $('investmentProduct').value, month: model.mapSeries?.months[model.selected], months: model.series.months, selected: model.selected});
  }
  document.addEventListener('map-month-change', event => {
    model.selected = event.detail;
    drawChart(model.view === 'actual');
  });
  $('exportInvestment').addEventListener('click', () => {
    if (!model.series) return;
    const escape = value => '"' + String(value).replace(/"/g, '""') + '"';
    const lines = [['visao', 'ano_mes', 'produto', 'valor_reais', 'origem'], ...model.series.months.map(m => [model.view === 'actual' ? 'acumulado_salvo' : 'estimativa_mensal', m.period, $('investmentProduct').selectedOptions[0].text, m.value === null ? '' : T.formatNumber(m.value), m.sources.join(' | ')])];
    download('\ufeff' + lines.map(row => row.map(escape).join(';')).join('\r\n'), `analise-investimento-${model.view}-${$('investmentYear').value}.csv`, 'text/csv;charset=utf-8');
  });
  const savedAnalysisControls = ['investmentProduct', 'estimateBenefit', 'estimateTechnician', 'estimateAssistant', 'estimateProfessionalMode', 'estimateProfessionals'];
  LocalSession.register('investment', {
    order: 20,
    capture: () => ({actual: model.actual, estimate: model.estimate, view: model.view, year: model.year, selected: model.selected, controls: LocalSession.controls(savedAnalysisControls), activeTab: $('investmentPanel').hidden ? 'treatment' : 'investment', historyInfo: $('historyFileInfo').textContent}),
    restore: saved => {
      model.actual = saved.actual || []; model.estimate = saved.estimate || model.estimate;
      model.year = saved.year || {actual: '', estimate: ''};
      LocalSession.restoreControls(saved.controls);
      model.view = saved.view === 'actual' ? 'actual' : 'estimate';
      $('actualView').setAttribute('aria-pressed', String(model.view === 'actual'));
      $('estimateView').setAttribute('aria-pressed', String(model.view === 'estimate'));
      $('actualSources').hidden = model.view !== 'actual'; $('estimateSources').hidden = model.view !== 'estimate'; $('estimateRules').hidden = model.view !== 'estimate';
      $('historyFileInfo').textContent = saved.historyInfo || 'Nenhum histórico importado.';
      fillYears(); mapping(); model.selected = saved.selected ?? -1; render(); activateTab(saved.activeTab || 'treatment');
    },
    clear: () => {
      model.actual = []; model.estimate = []; model.sector = null; model.year = {actual: '', estimate: ''}; model.upload++;
      LocalSession.restoreControls({investmentProduct: 'all', estimateBenefit: '150', estimateTechnician: '320', estimateAssistant: '150', estimateProfessionalMode: 'example', estimateProfessionals: true});
      $('historyFileInfo').textContent = 'Nenhum histórico importado.'; $('historyStatus').hidden = true;
      $('historyFile').value = ''; $('investmentSectorFile').value = '';
      setView('estimate'); activateTab('treatment');
    }
  });
  setView('estimate');
})();

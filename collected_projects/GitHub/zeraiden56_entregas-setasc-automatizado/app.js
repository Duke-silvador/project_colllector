'use strict';
const $ = id => document.getElementById(id);
const T = window.Treatment;
const state = {base: null, sector: null, result: null, page: 0, loading: {base: false, sector: false}, version: {base: 0, sector: 0}};
const money = n => n.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
const integer = n => n.toLocaleString('pt-BR');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
$('date').value = today();
function status(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
  $('status').hidden = !message;
  if (!$('investmentPanel').hidden) {
    $('historyStatus').textContent = message;
    $('historyStatus').classList.toggle('error', error);
    $('historyStatus').hidden = !message;
  }
}
function ready() {
  const can = !!(state.base && state.sector && !state.loading.base && !state.loading.sector);
  $('process').disabled = !can;
  $('step2').classList.toggle('active', can);
}
function invalidate() {
  state.result = null;
  $('export').disabled = true;
  $('empty').hidden = false;
  $('resultContent').hidden = true;
  $('resultBadge').textContent = 'Aguardando tratamento';
  $('resultBadge').classList.remove('ready');
  $('step3').classList.remove('active');
}
function tableFor(kind) {
  return state[kind]?.tables.get($(kind + 'Sheet').value);
}
function selected(kind) {
  invalidate();
  const table = tableFor(kind);
  $(kind + 'Info').textContent = `${integer(table.rows.length)} linhas · cabeçalho na linha ${table.headerRow + 1}`;
  if (kind === 'base') {
    const records = T.objects(table);
    const years = [...new Set(records.filter(r => T.PRODUCTS[T.number(r.CODPRODUTO)]).map(r => T.number(r['ANO CONCLUSAO'])).filter(Number.isInteger))].sort((a, b) => b - a);
    $('year').replaceChildren(...years.map(year => new Option(year, year)));
    if (years.includes(new Date().getFullYear())) $('year').value = String(new Date().getFullYear());
  }
  ready();
  document.dispatchEvent(new CustomEvent('sector-sources-changed', {detail: state.sector}));
}
function displaySource(kind, source, sheet) {
  state[kind] = source;
  $(kind + 'Sheet').replaceChildren(...[...source.tables.keys()].map(name => new Option(name, name)));
  if (source.tables.has(sheet)) $(kind + 'Sheet').value = sheet;
  $(kind + 'Sheet').disabled = false;
  $(kind + 'Name').textContent = source.name;
  $(kind + 'Badge').textContent = 'Identificado';
  $(kind + 'Badge').classList.add('ready');
  const table = tableFor(kind);
  $(kind + 'Info').textContent = `${integer(table.rows.length)} linhas · cabeçalho na linha ${table.headerRow + 1}`;
}
async function loadFile(kind, file) {
  if (!file) return;
  const token = ++state.version[kind];
  const previous = state[kind], previousSheet = $(kind + 'Sheet').value;
  const job = LoadingUI.begin('Carregando dados', file.name);
  state.loading[kind] = true;
  ready();
  $(kind + 'Badge').textContent = 'Lendo…';
  $(kind + 'Badge').classList.remove('ready');
  $(kind + 'Name').textContent = file.name;
  $(kind + 'Info').textContent = 'Analisando estrutura das planilhas…';
  $(kind + 'Sheet').replaceChildren(new Option('Lendo arquivo…', ''));
  $(kind + 'Sheet').disabled = true;
  status('Lendo os arquivos localmente. Aguarde a identificação dos cabeçalhos.');
  try {
    const parsed = await WorkbookIO.load(file, kind, (percent, message) => LoadingUI.progress(job, percent, message));
    if (state.version[kind] !== token) return;
    const tables = new Map(parsed.tables);
    if (!tables.size) throw Error('Estrutura incompatível. Cabeçalhos esperados: ' + T.REQUIRED[kind].join(', ') + '.');
    displaySource(kind, {tables, name: file.name});
    selected(kind);
    LoadingUI.progress(job, 97, 'Salvando os dados neste navegador…');
    await LocalSession.saveNow();
    LoadingUI.progress(job, 100, 'Dados carregados.');
    status('Arquivo reconhecido. Confira a aba selecionada e os parâmetros antes de tratar os dados.');
  } catch (error) {
    if (state.version[kind] !== token) return;
    if (previous) displaySource(kind, previous, previousSheet);
    else {
      $(kind + 'Badge').textContent = 'Verificar arquivo';
      $(kind + 'Info').textContent = 'Não foi possível reconhecer o formato.';
      $(kind + 'Sheet').replaceChildren(new Option('Importe um arquivo compatível', ''));
    }
    status(error.message, true);
  } finally {
    if (state.version[kind] === token) {state.loading[kind] = false; ready();}
    LoadingUI.end(job);
    $(kind + 'File').value = '';
  }
}
$('investmentSectorFile').addEventListener('change', async event => {await loadFile('sector', event.target.files[0]); event.target.value = '';});
for (const kind of ['base', 'sector']) {
  $(kind + 'File').addEventListener('change', event => loadFile(kind, event.target.files[0]));
  $(kind + 'Sheet').addEventListener('change', () => {selected(kind); status('Aba alterada. Execute o tratamento novamente.');});
  const drop = $(kind + 'Drop');
  for (const event of ['dragenter', 'dragover']) drop.addEventListener(event, e => {e.preventDefault(); drop.classList.add('drag');});
  for (const event of ['dragleave', 'drop']) drop.addEventListener(event, e => {e.preventDefault(); drop.classList.remove('drag');});
  drop.addEventListener('drop', event => loadFile(kind, event.dataTransfer.files[0]));
}
$('settings').addEventListener('input', () => {invalidate(); status('Parâmetros alterados. Execute o tratamento para atualizar a prévia.');});
$('settings').addEventListener('change', invalidate);
$('settings').addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.base || !state.sector || state.loading.base || state.loading.sector) return;
  invalidate();
  status('Cruzando municípios e calculando os valores…');
  $('process').disabled = true;
  await new Promise(resolve => setTimeout(resolve, 30));
  try {
    const options = {
      year: Number($('year').value), date: $('date').value,
      percent: $('percent').value === '' ? null : Number($('percent').value),
      months: Number($('months').value), benefit: Number($('benefit').value),
      technician: Number($('technician').value), assistant: Number($('assistant').value),
      professionalMode: $('professionalMode').value, missingMode: $('missingMode').value, adjustSingular: $('adjustSingular').checked
    };
    const result = T.process(tableFor('base'), tableFor('sector'), options);
    try {T.latin1(T.csv(result.rows));} catch (error) {result.issues.push({code: '', city: '', message: error.message});}
    showResult(result, `${$('sectorSheet').value} · conclusão em ${options.year} · ${options.months} mês(es) acrescentado(s)`);
    await LocalSession.saveNow();
    $('results').scrollIntoView({behavior: 'smooth', block: 'start'});
  } catch (error) {status(error.message, true);} finally {ready();}
});
function showResult(result, description) {
    state.result = result;
    state.page = 0;
    $('search').value = '';
    $('empty').hidden = true;
    $('resultContent').hidden = false;
    $('count').textContent = integer(result.rows.length);
    $('ignored').textContent = `${integer(result.ignored)} registros fora do filtro`;
    for (const [id, field] of [['quantity', 'qty'], ['increment', 'increment'], ['value', 'value']]) {
      const sum = result.rows.reduce((n, r) => n + r[field], 0);
      $(id).textContent = id === 'quantity' ? integer(sum) : money(sum);
    }
    const notices = [...result.issues, ...result.warnings];
    $('issuesBox').hidden = !notices.length;
    $('issuesTitle').textContent = `${integer(result.issues.length)} erro(s) · ${integer(result.warnings.length)} aviso(s)`;
    $('issuesDescription').textContent = result.issues.length ? 'Corrija os erros de origem e processe novamente. A exportação está bloqueada.' : 'O modo compatível mantém o comportamento da planilha: municípios não encontrados recebem quantidade zero e nenhum acréscimo. Confira estas entregas antes de importar o CSV no sistema.';
    $('issuesList').replaceChildren(...notices.slice(0, 100).map(issue => {
      const li = document.createElement('li'); li.textContent = [issue.code, issue.city, issue.message].filter(Boolean).join(' · '); return li;
    }));
    $('export').disabled = !!result.issues.length || !result.rows.length;
    $('resultBadge').textContent = result.issues.length ? 'Revisão necessária' : 'Pronto para exportar';
    $('resultBadge').classList.toggle('ready', !result.issues.length);
    $('step3').classList.add('active');
    $('previewDescription').textContent = description;
    renderTable();
    status(result.issues.length ? 'Tratamento concluído com erros. Revise a lista abaixo antes da exportação.' : `${integer(result.rows.length)} entregas tratadas.${result.warnings.length ? ' Atenção: há ' + result.warnings.length + ' entregas zeradas por município não encontrado.' : ''} Confira a prévia antes de exportar.`, !!notices.length);
}
function renderTable() {
  if (!state.result) return;
  const query = T.normalize($('search').value);
  const rows = state.result.rows.filter(r => T.normalize(`${r.code} ${r.name} ${r.city}`).includes(query));
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  state.page = Math.min(Math.max(0, state.page), pages - 1);
  const fragment = document.createDocumentFragment();
  for (const row of rows.slice(state.page * 25, (state.page + 1) * 25)) {
    const tr = document.createElement('tr');
    for (const value of [row.code, row.name, T.formatNumber(row.qty), money(row.increment), money(row.value), T.formatNumber(row.percent) + '%', row.date]) {
      const td = document.createElement('td'); td.textContent = value; tr.append(td);
    }
    const city = document.createElement('small'); city.textContent = row.city;
    tr.children[1].append(city); fragment.append(tr);
  }
  if (!rows.length) {const tr = document.createElement('tr'), td = document.createElement('td'); td.colSpan = 7; td.textContent = 'Nenhuma entrega encontrada.'; tr.append(td); fragment.append(tr);}
  $('tbody').replaceChildren(fragment);
  $('pageInfo').textContent = `${integer(rows.length)} entregas · página ${state.page + 1} de ${pages}`;
  $('prev').disabled = state.page === 0;
  $('next').disabled = state.page >= pages - 1;
}
$('search').addEventListener('input', () => {state.page = 0; renderTable();});
$('prev').addEventListener('click', () => {state.page--; renderTable();});
$('next').addEventListener('click', () => {state.page++; renderTable();});
function download(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], {type}));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
$('export').addEventListener('click', () => {
  if (!state.result || state.result.issues.length || !state.result.rows.length) return;
  try {
    const bytes = T.latin1(T.csv(state.result.rows));
    download(bytes, `cartoes-${$('year').value}-entregas_${$('date').value}.csv`, 'text/csv;charset=iso-8859-1');
    status(`CSV gerado com ${integer(state.result.rows.length)} entregas. A busca da prévia não altera o conteúdo exportado.`);
  } catch (error) {status(error.message, true);}
});
$('downloadIssues').addEventListener('click', () => {
  if (!state.result) return;
  download([...state.result.issues, ...state.result.warnings].map(i => [i.code, i.city, i.message].filter(Boolean).join(' · ')).join('\r\n'), 'pendencias-tratamento.txt', 'text/plain;charset=utf-8');
});
function clearTreatment() {
  for (const kind of ['base', 'sector']) {
    state.version[kind]++; state[kind] = null; state.loading[kind] = false;
    $(kind + 'File').value = '';
    $(kind + 'Name').textContent = 'Clique ou arraste sua planilha';
    $(kind + 'Info').textContent = 'XLS, XLSX ou CSV · até 50 MB';
    $(kind + 'Badge').textContent = 'Pendente'; $(kind + 'Badge').classList.remove('ready');
    $(kind + 'Sheet').replaceChildren(new Option('Importe um arquivo para selecionar', '')); $(kind + 'Sheet').disabled = true;
  }
  $('settings').reset(); $('date').value = today();
  $('year').replaceChildren(new Option(new Date().getFullYear(), new Date().getFullYear()));
  invalidate(); ready(); status('');
  document.dispatchEvent(new CustomEvent('sector-sources-changed', {detail: null}));
}
const savedTreatmentControls = ['year', 'date', 'percent', 'months', 'benefit', 'professionalMode', 'technician', 'assistant', 'adjustSingular', 'missingMode'];
LocalSession.register('treatment', {
  order: 10,
  capture: () => ({base: state.base, sector: state.sector, baseSheet: $('baseSheet').value, sectorSheet: $('sectorSheet').value, controls: LocalSession.controls(savedTreatmentControls), result: state.result, description: $('previewDescription').textContent, page: state.page, search: $('search').value}),
  restore: saved => {
    for (const kind of ['base', 'sector']) if (saved[kind]?.tables instanceof Map && saved[kind].tables.size) {
      displaySource(kind, saved[kind], saved[kind + 'Sheet']); selected(kind);
    }
    LocalSession.restoreControls(saved.controls);
    if (saved.result?.rows && state.base && state.sector) {
      showResult(saved.result, saved.description);
      state.page = saved.page || 0; $('search').value = saved.search || ''; renderTable();
    }
    ready();
  },
  clear: clearTreatment
});

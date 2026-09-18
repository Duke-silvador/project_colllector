(function (root) {
  'use strict';
  const HEADER = ['entrega_codigo', 'entrega_nome', 'entrega_quantidade', 'entrega_valorOrgao', 'entrega_percExecucao', 'entrega_dataPercentualExecucao'];
  const PRODUCTS = {1054: 'SER FAMILIA', 1056: 'SER CRIANCA', 1055: 'SER IDOSO', 1057: 'SER INCLUSIVO', 1058: 'SER INDIGENA'};
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const REQUIRED = {
    base: ['CodEnt', 'Entrega', 'Local', 'Qtde', 'R$ - Total', '% executado', 'Ano conclusão', 'CodProduto'],
    sector: ['MUNICIPIOS', 'SER FAMILIA', 'SER CRIANCA', 'SER IDOSO', 'SER INCLUSIVO', 'SER INDIGENA', 'TECNICOS', 'AUXILIARES']
  };
  function number(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    let s = String(value ?? '').trim();
    if (!s) return NaN;
    if (!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(s)) return NaN;
    return Number(s.replace(/\./g, '').replace(',', '.'));
  }
  function detect(rows, kind) {
    const required = REQUIRED[kind].map(normalize);
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const headers = rows[i].map(normalize);
      if (required.every(h => headers.includes(h))) {
        if (required.some(h => headers.filter(v => v === h).length !== 1)) throw Error('Cabeçalhos obrigatórios duplicados.');
        return {headerRow: i, headers, rows: rows.slice(i + 1).filter(r => r.some(v => String(v ?? '').trim()))};
      }
    }
    return null;
  }
  function objects(table) {
    return table.rows.map((row, i) => Object.assign(Object.fromEntries(table.headers.map((h, j) => [h, row[j] ?? ''])), {_row: i + table.headerRow + 2}));
  }
  function dateBR(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw Error('Informe uma data de apuração válida.');
    const d = new Date(iso + 'T12:00:00Z');
    if (isNaN(d) || d.toISOString().slice(0, 10) !== iso) throw Error('Data de apuração inválida.');
    return iso.split('-').reverse().join('/');
  }
  function process(baseTable, sectorTable, options) {
    const o = {months: 2, benefit: 150, technician: 320, assistant: 150, professionalMode: 'example', missingMode: 'zero', adjustSingular: false, ...options};
    const date = dateBR(o.date);
    if (!Number.isInteger(o.year) || o.year < 1900 || o.year > 9999) throw Error('Ano de conclusão inválido.');
    for (const key of ['months', 'benefit', 'technician', 'assistant']) if (!Number.isFinite(o[key]) || o[key] < 0) throw Error('Parâmetros de cálculo inválidos.');
    if (o.months < 1 || !Number.isInteger(o.months)) throw Error('O multiplicador de meses deve ser inteiro e maior que zero.');
    if (o.percent !== null && o.percent !== undefined && (!Number.isFinite(o.percent) || o.percent < 0 || o.percent > 100)) throw Error('Percentual deve estar entre 0 e 100.');
    const issues = [], warnings = [], output = [], cities = new Map(), seen = new Set();
    for (const row of objects(sectorTable)) {
      const city = normalize(row.MUNICIPIOS);
      if (!city || /^(TOTAL|SUBTOTAL)(\b|\s)/.test(city)) continue;
      if (cities.has(city)) {
        issues.push({code: '', city, message: 'Município duplicado no input do setor.'});
        cities.set(city, null);
      } else cities.set(city, row);
    }
    const base = objects(baseTable);
    const candidates = base.filter(r => PRODUCTS[number(r.CODPRODUTO)] && number(r['ANO CONCLUSAO']) === o.year);
    for (const row of candidates) {
      const code = String(row.CODENT).trim(), name = String(row.ENTREGA).trim(), city = String(row.LOCAL).trim();
      const fail = message => issues.push({code, city, message});
      if (!code || !name) { fail('Código ou descrição da entrega ausente.'); continue; }
      if (seen.has(code)) { fail('Código de entrega duplicado na base.'); continue; }
      seen.add(code);
      let sector = cities.get(normalize(city));
      if (sector === null || (!sector && o.missingMode !== 'zero')) { fail('Município ausente ou duplicado no input do setor.'); continue; }
      if (!sector) {
        warnings.push({code, city, message: 'Município não encontrado: quantidade e acréscimo zerados, conforme SEERRO da planilha.'});
        sector = Object.fromEntries([...Object.values(PRODUCTS), 'TECNICOS', 'AUXILIARES', 'TOTAL PROFISSIONAIS'].map(h => [h, 0]));
      }
      const professionals = name.includes('profissionais');
      const tech = number(sector.TECNICOS), assistant = number(sector.AUXILIARES);
      const total = sector['TOTAL PROFISSIONAIS'];
      const qty = professionals ? (String(total ?? '').trim() ? number(total) : tech + assistant) : number(sector[PRODUCTS[number(row.CODPRODUTO)]]);
      const previous = number(row['R$ - TOTAL']);
      const previousQty = number(row.QTDE);
      const percent = o.percent ?? number(row['% EXECUTADO']);
      if (!Number.isInteger(qty) || qty < 0) { fail('Quantidade ausente, negativa ou inválida no setor.'); continue; }
      if (![previous, previousQty, percent].every(Number.isFinite) || previous < 0 || previousQty < 0 || percent < 0 || percent > 100) { fail('Valor, quantidade ou percentual inválido na base.'); continue; }
      if (professionals && o.professionalMode === 'team' && (![tech, assistant].every(n => Number.isInteger(n) && n >= 0))) { fail('Quantidade de técnicos ou auxiliares inválida.'); continue; }
      const increment = Math.round((professionals && o.professionalMode === 'team' ? tech * o.technician + assistant * o.assistant : qty * o.benefit) * o.months * 100) / 100;
      const regex = o.adjustSingular ? /\d+(?:[.,]\d+)?(\s+(?:famílias|família|profissionais|cobertores|trabalhadores|filtros de barro|cestas básicas))/g : /\d+(?:[.,]\d+)?(\s+(?:famílias|profissionais|cobertores|trabalhadores|filtros de barro|cestas básicas))/g;
      const adjusted = name.replace(regex, (_, suffix) => String(qty) + suffix);
      output.push({code, name: adjusted, qty, value: Math.round((previous + increment) * 100) / 100, percent, date, city, product: PRODUCTS[number(row.CODPRODUTO)], previous, previousQty, increment, professionals});
    }
    if (!candidates.length) issues.push({code: '', city: '', message: 'Nenhuma entrega dos cinco produtos de cartões encontrada para o ano selecionado.'});
    return {rows: output, issues, warnings, total: base.length, candidates: candidates.length, ignored: base.length - candidates.length};
  }
  function formatNumber(n) {
    const [integer, decimal] = n.toFixed(2).split('.');
    return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + decimal;
  }
  function latinize(value) {
    return String(value).replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/\u00a0/g, ' ');
  }
  function escapeCSV(value) {
    const s = latinize(value);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(rows) {
    return [HEADER.join(';'), ...rows.map(r => [r.code, r.name, formatNumber(r.qty), formatNumber(r.value), formatNumber(r.percent), r.date].map(escapeCSV).join(';'))].join('\r\n');
  }
  function latin1(text) {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 255) throw Error('Caractere não compatível com Latin-1: ' + text[i] + '. Revise a descrição na base.');
      bytes[i] = text.charCodeAt(i);
    }
    return bytes;
  }
  const api = {HEADER, PRODUCTS, REQUIRED, normalize, number, detect, objects, process, formatNumber, csv, latin1};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Treatment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

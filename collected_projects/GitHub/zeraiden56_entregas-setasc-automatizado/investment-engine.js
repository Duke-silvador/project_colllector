(function (root) {
  'use strict';
  const T = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.Treatment;
  const LABELS = {1054: 'Família', 1056: 'Criança', 1055: 'Idoso', 1057: 'Inclusivo', 1058: 'Indígena'};
  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const validPeriod = p => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);
  function datePeriod(value) {
    if (typeof value === 'number' && value > 0 && value < 2958466) return new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000).toISOString().slice(0, 7);
    const s = String(value ?? '').trim();
    const br = s.match(/^\d{1,2}[/-](\d{1,2})[/-](\d{4})$/);
    if (br) {const p = `${br[2]}-${br[1].padStart(2, '0')}`; return validPeriod(p) ? p : '';}
    return validPeriod(s.slice(0, 7)) ? s.slice(0, 7) : '';
  }
  function inferPeriod(name, dates = []) {
    const n = T.normalize(name);
    const year = n.match(/(?:19|20)\d{2}/)?.[0];
    const tokens = n.replace(/\d+/g, ' ').split(/[^A-Z]+/).filter(Boolean);
    const months = MONTHS.map((m, i) => tokens.some(t => t === T.normalize(m) || t === T.normalize(m).slice(0, 3)) ? i + 1 : 0).filter(Boolean);
    const datePeriods = [...new Set(dates.map(datePeriod).filter(Boolean))];
    const dateYears = [...new Set(datePeriods.map(p => p.slice(0, 4)))];
    const y = year || (dateYears.length === 1 ? dateYears[0] : '');
    if (months.length === 1 && y) return {period: `${y}-${String(months[0]).padStart(2, '0')}`, basis: 'Mês da aba; confira a referência'};
    if (months.length > 1) return {period: '', basis: 'Mais de um mês no nome; escolha a referência'};
    const iso = n.match(/((?:19|20)\d{2})[- /](0[1-9]|1[0-2])(?:\D|$)/);
    if (iso) return {period: `${iso[1]}-${iso[2]}`, basis: 'Período da aba; confira a referência'};
    if (datePeriods.length === 1) return {period: datePeriods[0], basis: 'Data de apuração; confira o mês de referência'};
    return {period: '', basis: 'Informe o mês de referência'};
  }
  function classify(name) {
    const match = T.normalize(name).match(/SER FAMILIA\s*:\s*(FAMILIA|CRIANCA|IDOSO|INCLUSIVO|INDIGENA)\b/);
    if (!match) return null;
    return Object.keys(T.PRODUCTS).find(code => T.PRODUCTS[code] === 'SER ' + match[1]) || null;
  }
  function snapshot(rows, name) {
    const needed = T.HEADER.map(T.normalize);
    const index = rows.slice(0, 30).findIndex(row => needed.every(h => row.map(T.normalize).includes(h)) && !row.map(T.normalize).includes('CODENT'));
    if (index < 0) return null;
    const header = rows[index].map(T.normalize);
    const records = [], errors = [], dates = [], deliveryYears = new Set();
    for (const raw of rows.slice(index + 1)) {
      const get = key => raw[header.indexOf(T.normalize(key))];
      const title = String(get('entrega_nome') ?? '');
      const product = classify(title);
      if (!product) continue;
      const deliveryYear = title.match(/\b(?:19|20)\d{2}\b/)?.[0];
      if (deliveryYear) deliveryYears.add(deliveryYear);
      const code = String(get('entrega_codigo') ?? '').trim(), value = T.number(get('entrega_valorOrgao'));
      if (!code || !Number.isFinite(value) || value < 0) {errors.push('Entrega sem código ou valor válido: ' + title); continue;}
      dates.push(get('entrega_dataPercentualExecucao'));
      const rawQty = T.number(get('entrega_quantidade'));
      const city = title.match(/\s[-–—]\s*([^,]+)$/)?.[1]?.trim() || '';
      records.push({code, product, value, city, qty: Number.isInteger(rawQty) && rawQty >= 0 ? rawQty : null, professionals: T.normalize(title).includes('PROFISSIONAIS')});
    }
    if (!records.length && !errors.length) return null;
    const inferred = inferPeriod(name, dates);
    if (inferred.basis.startsWith('Data de apuração') && inferred.period && deliveryYears.size > 0 && !deliveryYears.has(inferred.period.slice(0, 4))) {
      inferred.period = '';
      inferred.basis = 'Ano da apuração difere do ano das entregas; informe a referência';
    }
    return {name, records, errors, ...inferred};
  }
  function actualSeries(sources, year, product = 'all') {
    const notices = [];
    const months = MONTHS.map((name, i) => {
      const period = `${year}-${String(i + 1).padStart(2, '0')}`;
      const selected = sources.filter(s => s.enabled && s.period === period);
      if (!selected.length) return {name, period, value: null, count: 0, sources: []};
      const deliveries = new Map(); let invalid = false, duplicates = 0;
      for (const source of selected) {
        if (source.errors.length) {invalid = true; notices.push(`${source.name}: ${source.errors.length} registro(s) inválido(s).`);}
        for (const r of source.records) {
          if (product !== 'all' && r.product !== product) continue;
          const previous = deliveries.get(r.code);
          if (previous) {
            if (previous.value !== r.value || previous.product !== r.product || previous.qty !== r.qty || T.normalize(previous.city) !== T.normalize(r.city) || previous.professionals !== r.professionals) {
              invalid = true; notices.push(`${period}: dados conflitantes para a entrega ${r.code}. Selecione somente uma versão desse período.`);
            } else duplicates++;
          } else deliveries.set(r.code, r);
        }
      }
      if (duplicates) notices.push(`${period}: ${duplicates} registro(s) idêntico(s) repetido(s), contado(s) uma única vez.`);
      // A product absent from a snapshot is unknown, not a confirmed zero.
      const value = invalid || !deliveries.size ? null : [...deliveries.values()].reduce((sum, r) => sum + Math.round(r.value * 100), 0) / 100;
      return {name, period, value, count: invalid ? 0 : deliveries.size, sources: selected.map(s => s.name), invalid, records: invalid ? [] : [...deliveries.values()]};
    });
    for (const s of sources.filter(s => s.enabled && !validPeriod(s.period))) notices.push(`${s.name}: informe o período para incluir esta aba.`);
    return {months, notices: [...new Set(notices)]};
  }
  function estimateSeries(sources, year, product = 'all', options = {}) {
    const o = {benefit: 150, technician: 320, assistant: 150, professionalMode: 'example', includeProfessionals: true, ...options};
    if (![o.benefit, o.technician, o.assistant].every(v => Number.isFinite(v) && v >= 0)) throw Error('Informe valores unitários válidos, maiores ou iguais a zero.');
    const notices = [];
    const months = MONTHS.map((name, i) => {
      const period = `${year}-${String(i + 1).padStart(2, '0')}`;
      const selected = sources.filter(s => s.enabled && s.period === period);
      if (!selected.length) return {name, period, value: null, count: 0, sources: []};
      if (selected.length > 1) {notices.push(`${period}: há mais de uma aba do setor. Selecione apenas uma para evitar duplicidade.`); return {name, period, value: null, count: 0, sources: selected.map(s => s.name), invalid: true};}
      let cents = 0, count = 0, invalid = false;
      const records = [];
      const cities = new Set();
      for (const row of T.objects(selected[0].table)) {
        const city = T.normalize(row.MUNICIPIOS);
        // The provided control has payment/contract tables below the grand total.
        // Those values are currency, not municipality quantities.
        if (/^TOTAL(?: GERAL)?$/.test(city)) break;
        if (!city || /^(TOTAL|SUBTOTAL)(\b|\s)/.test(city)) continue;
        if (cities.has(city)) {invalid = true; notices.push(`${period}: município repetido: ${city}.`); continue;}
        cities.add(city);
        for (const code of Object.keys(LABELS).filter(c => product === 'all' || c === product)) {
          const qty = T.number(row[T.PRODUCTS[code]]);
          if (!Number.isInteger(qty) || qty < 0) {invalid = true; notices.push(`${period}: quantidade inválida em ${city}, ${LABELS[code]}.`); continue;}
          cents += Math.round(qty * o.benefit * 100); count += qty;
          records.push({city: String(row.MUNICIPIOS).trim(), product: code, qty, value: Math.round(qty * o.benefit * 100) / 100, professionals: false});
          if (code === '1054' && o.includeProfessionals) {
            const tech = T.number(row.TECNICOS), assistant = T.number(row.AUXILIARES);
            const total = String(row['TOTAL PROFISSIONAIS'] ?? '').trim() ? T.number(row['TOTAL PROFISSIONAIS']) : tech + assistant;
            const nums = o.professionalMode === 'team' ? [tech, assistant, total] : [total];
            if (!nums.every(n => Number.isInteger(n) && n >= 0)) {invalid = true; notices.push(`${period}: profissionais inválidos em ${city}.`); continue;}
            count += total;
            const personnelCents = Math.round((o.professionalMode === 'team' ? tech * o.technician + assistant * o.assistant : total * o.benefit) * 100);
            cents += personnelCents;
            records.push({city: String(row.MUNICIPIOS).trim(), product: code, qty: total, value: personnelCents / 100, professionals: true});
          }
        }
      }
      return {name, period, value: invalid || !cities.size ? null : cents / 100, count, sources: [selected[0].name], invalid, records: invalid ? [] : records};
    });
    for (const s of sources.filter(s => s.enabled && !validPeriod(s.period))) notices.push(`${s.name}: informe o período para incluir esta aba.`);
    return {months, notices: [...new Set(notices)]};
  }
  const api = {LABELS, MONTHS, validPeriod, datePeriod, inferPeriod, classify, snapshot, actualSeries, estimateSeries};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Investment = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

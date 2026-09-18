(function (root) {
  'use strict';
  const T = typeof module !== 'undefined' && module.exports ? require('./engine.js') : root.Treatment;
  const PRODUCTS = ['1054', '1056', '1055', '1057', '1058'];
  const key = name => T.normalize(name).replace(/[‘’´`]/g, "'");
  // This explicit spelling equivalence applies only to the map, never treatment/export.
  const ALIASES = {'SANTO ANTONIO DO LEVERGER': 'SANTO ANTONIO DE LEVERGER'};
  function aggregate(records, municipalities) {
    const names = new Map(municipalities.map(city => [key(city.name), city]));
    const cities = new Map(), unmatched = [], aliases = new Set();
    for (const record of records) {
      const raw = key(record.city), canonical = ALIASES[raw] || raw;
      const geographic = names.get(canonical);
      if (!geographic) {unmatched.push(record); continue;}
      if (raw !== canonical) aliases.add(`${record.city} → ${geographic.name}`);
      if (!cities.has(geographic.id)) cities.set(geographic.id, {id: geographic.id, name: geographic.name, products: {}});
      const city = cities.get(geographic.id);
      if (!city.products[record.product]) city.products[record.product] = {families: null, professionals: null};
      const type = record.professionals ? 'professionals' : 'families';
      const group = city.products[record.product];
      if (!group[type]) group[type] = {qty: 0, qtyComplete: true, cents: 0, records: 0};
      const item = group[type];
      if (Number.isInteger(record.qty) && record.qty >= 0) item.qty += record.qty;
      else item.qtyComplete = false;
      item.cents += Math.round(record.value * 100); item.records++;
    }
    return {cities, unmatched, aliases: [...aliases]};
  }
  function totals(city, product = 'all') {
    let qty = 0, personnel = 0, cents = 0, present = false, familiesPresent = false, qtyComplete = true;
    for (const code of product === 'all' ? PRODUCTS : [product]) {
      const group = city?.products[code];
      if (!group) continue;
      present = true;
      if (group.families) {
        familiesPresent = true; qty += group.families.qty; cents += group.families.cents;
        qtyComplete = qtyComplete && group.families.qtyComplete;
      }
      if (group.professionals) {personnel += group.professionals.qty; cents += group.professionals.cents;}
    }
    return {present, qty: familiesPresent && qtyComplete ? qty : null, personnel, value: present ? cents / 100 : null};
  }
  const api = {PRODUCTS, key, ALIASES, aggregate, totals};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Municipality = api;
})(globalThis);

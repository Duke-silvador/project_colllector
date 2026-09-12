/* ============================================================
   JOH Room Tracker — Item Library module
   Project-wide code libraries — one per element category (walls,
   ceilings, floors, doors, furniture/FF&E, other) — each a lookup
   table keyed by Code: {description, spec, ...extra columns}.
   Uploaded once per category (xlsx/xls/csv with Code, Description,
   Specification columns). Room pages cross-reference the code
   already captured from the Room Schedule (e.g. floor code "PT-01")
   against the matching category library to show the full entry.
   ============================================================ */
'use strict';

var LIB_CATEGORIES = [
  { key: 'walls', label: 'Walls' },
  { key: 'ceilings', label: 'Ceilings' },
  { key: 'floors', label: 'Floors' },
  { key: 'skirting', label: 'Skirting' },
  { key: 'doors', label: 'Doors' },
  { key: 'furniture', label: 'Furniture / FF&E' },
  { key: 'other', label: 'Other items' }
];
function libCategoryLabel(key) {
  for (var i = 0; i < LIB_CATEGORIES.length; i++) if (LIB_CATEGORIES[i].key === key) return LIB_CATEGORIES[i].label;
  return key || 'Other';
}
/* which library category a Room Schedule item field cross-references */
var ITEM_TO_LIB_CATEGORY = { doorType: 'doors', floorFinish: 'floors', wallFinish: 'walls', ceilingFinish: 'ceilings', skirting: 'skirting' };

var CODE_COL_MATCH = ['code', 'item code', 'type code', 'ref', 'reference', 'mark'];
var DESC_COL_MATCH = ['description', 'desc', 'item description', 'type description', 'name', 'type'];
var SPEC_COL_MATCH = ['specification', 'spec', 'material specification', 'material spec', 'description build up', 'build up', 'buildup'];

var Library = (function () {
  var KEY = 'joh_item_library_v1';       // { category: { CODE: {description,spec,extra} } }
  var METAKEY = 'joh_item_library_meta_v1'; // { category: {fileName, count, uploadedAt} }

  function allData() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function allMeta() {
    try { return JSON.parse(localStorage.getItem(METAKEY) || '{}'); } catch (e) { return {}; }
  }
  function meta(category) { return allMeta()[category] || null; }
  function lookup(category, code) {
    if (!category || !code) return null;
    var d = allData()[category];
    if (!d) return null;
    return d[String(code).trim().toUpperCase()] || null;
  }
  function entries(category) {
    var d = allData()[category] || {};
    return Object.keys(d).sort().map(function (c) { return Object.assign({ code: c }, d[c]); });
  }

  function saveCategory(category, table, fileName, count) {
    try {
      var data = allData(); data[category] = table; localStorage.setItem(KEY, JSON.stringify(data));
      var m = allMeta(); m[category] = { fileName: fileName, count: count, uploadedAt: new Date().toISOString() };
      localStorage.setItem(METAKEY, JSON.stringify(m));
      if (window.Sync && Sync.markDirty) Sync.markDirty('library');
      return true;
    } catch (e) { return false; }
  }

  /* accept a remote category only if it's newer than the local copy */
  function applyRemoteCategory(category, remoteTable, remoteMeta) {
    if (!remoteMeta || !remoteTable) return false;
    var m = meta(category);
    if (m && m.uploadedAt >= remoteMeta.uploadedAt) return false;
    var data = allData(); data[category] = remoteTable; localStorage.setItem(KEY, JSON.stringify(data));
    var metaAll = allMeta(); metaAll[category] = remoteMeta; localStorage.setItem(METAKEY, JSON.stringify(metaAll));
    return true;
  }

  function ingestRows(category, rows, fileName) {
    if (!rows || !rows.length) return { ok: false, error: 'The file has no rows.' };
    var header = rows[0];
    var codeIdx = -1, descIdx = -1, specIdx = -1, extraCols = [];
    for (var i = 0; i < header.length; i++) {
      var h = norm(header[i]);
      if (!h) continue;
      if (codeIdx < 0 && CODE_COL_MATCH.indexOf(h) >= 0) { codeIdx = i; continue; }
      if (descIdx < 0 && DESC_COL_MATCH.indexOf(h) >= 0) { descIdx = i; continue; }
      if (specIdx < 0 && SPEC_COL_MATCH.indexOf(h) >= 0) { specIdx = i; continue; }
      extraCols.push({ idx: i, label: String(header[i]).trim() });
    }
    if (codeIdx < 0) return { ok: false, error: 'Could not find a "Code" column in the first row. Add a column header named "Code" and try again.' };

    var table = {}, count = 0;
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r]; if (!row || !row.length) continue;
      var codeRaw = row[codeIdx];
      if (codeRaw == null || String(codeRaw).trim() === '') continue;
      var code = String(codeRaw).trim().toUpperCase();
      var rec = {};
      if (descIdx >= 0) { var dv = row[descIdx]; if (dv != null && String(dv).trim() !== '') rec.description = String(dv).trim(); }
      if (specIdx >= 0) { var sv = row[specIdx]; if (sv != null && String(sv).trim() !== '') rec.spec = String(sv).trim(); }
      if (extraCols.length) {
        var extraObj = {};
        extraCols.forEach(function (e) { var v = row[e.idx]; if (v != null && String(v).trim() !== '') extraObj[e.label] = String(v).trim(); });
        if (Object.keys(extraObj).length) rec.extra = extraObj;
      }
      table[code] = rec;
      count++;
    }
    if (!count) return { ok: false, error: 'No rows with a Code value were found.' };
    saveCategory(category, table, fileName, count);
    return { ok: true, count: count };
  }

  function importFile(category, file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb({ ok: false, error: 'Could not read that file.' }); };
    reader.onload = function () {
      try {
        var wb = XLSX.read(reader.result, { type: 'array' });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        cb(ingestRows(category, rows, file.name));
      } catch (e) {
        cb({ ok: false, error: 'Could not parse this file. Use an .xlsx, .xls or .csv with Code / Description / Specification columns.' });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }

  return { meta: meta, lookup: lookup, entries: entries, importFile: importFile, ingestRows: ingestRows, applyRemoteCategory: applyRemoteCategory, allData: allData, allMeta: allMeta };
})();

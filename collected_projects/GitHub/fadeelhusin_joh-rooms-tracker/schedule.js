/* ============================================================
   JOH Room Tracker — Room Schedule module
   Lets the team upload a Room Schedule (xlsx / xls / csv) from any
   device. Columns are matched by header name (flexible, case/spacing
   insensitive) to: Door Type, Floor / Wall / Ceiling finish,
   Skirting, Acoustic rating, Special items. Anything else in the
   sheet is kept as "additional data" per room, so nothing is lost.
   Stored locally (localStorage) — this is the offline-first source
   of finishing truth until it's wired to a shared sheet.
   ============================================================ */
'use strict';

/* Finishing items always shown as Code / Description / Specification —
   matched from three dedicated columns when present ("Floor Finish Code",
   "Floor Finish Description", "Floor Finish Specification"), or split
   automatically from one combined column ("Floor Finish": "PT-01 Porcelain
   Tile") when the sheet only has one column per item. */
var ITEM_FIELDS = [
  { key: 'doorType', label: 'Door type',
    code: ['door type code', 'door code', 'door ref', 'door mark', 'door no', 'door number'],
    desc: ['door type description', 'door description', 'door type desc', 'door desc'],
    spec: ['door type specification', 'door specification', 'door type spec', 'door spec'],
    bare: ['door type', 'door'] },
  { key: 'floorFinish', label: 'Floor finish',
    code: ['floor finish code', 'floor code', 'flooring code'],
    desc: ['floor finish description', 'floor description', 'flooring description', 'floor desc'],
    spec: ['floor finish specification', 'floor specification', 'flooring spec', 'floor spec'],
    bare: ['floor finish', 'floor finishes', 'flooring', 'floor'] },
  { key: 'wallFinish', label: 'Wall finish',
    code: ['wall finish code', 'wall code'],
    desc: ['wall finish description', 'wall description', 'wall desc'],
    spec: ['wall finish specification', 'wall specification', 'wall spec'],
    bare: ['wall finish', 'wall finishes', 'walls', 'wall'] },
  { key: 'ceilingFinish', label: 'Ceiling finish',
    code: ['ceiling finish code', 'ceiling code'],
    desc: ['ceiling finish description', 'ceiling description', 'ceiling desc'],
    spec: ['ceiling finish specification', 'ceiling specification', 'ceiling spec'],
    bare: ['ceiling finish', 'ceiling finishes', 'ceiling', 'ceilings'] },
  { key: 'skirting', label: 'Skirting',
    code: ['skirting code'],
    desc: ['skirting description', 'skirting desc'],
    spec: ['skirting specification', 'skirting spec'],
    bare: ['skirting', 'skirting finish'] }
];
/* free-text fields — not code-based items, kept as a single value */
var TEXT_FIELDS = [
  { key: 'acoustic', label: 'Acoustic rating', match: ['acoustic', 'acoustic rating', 'stc', 'nrc', 'stc/nrc'] },
  { key: 'specialItems', label: 'Special items / remarks', match: ['special items', 'special finish', 'remarks', 'notes', 'comments'] }
];
/* comma/semicolon-separated code lists — cross-referenced against the Item Library */
var CODE_LIST_FIELDS = [
  { key: 'furnitureCodes', label: 'Furniture / FF&E', libCategory: 'furniture', match: ['furniture codes', 'ffe codes', 'ff e codes', 'furniture', 'ffe'] },
  { key: 'otherCodes', label: 'Other items', libCategory: 'other', match: ['other items codes', 'other codes', 'additional codes', 'other items'] }
];
var ROOM_COL_MATCH = ['room no', 'room no.', 'room number', 'room id', 'roomid', 'room'];
/* splits a combined cell like "PT-01 Porcelain Tile" into code + description */
var CODE_SPLIT_RE = /^([A-Za-z]{1,6}-?\d{1,4}[A-Za-z]?)[\s\-:]+(.+)$/;
var CODE_ONLY_RE = /^[A-Za-z]{1,6}-?\d{1,4}[A-Za-z]?$/;
/* columns that duplicate data already known elsewhere (room name/level/area…) — skipped, not dumped into "extra" */
var IGNORE_COL_MATCH = ['no', 'room name', 'level', 'area m2', 'area m', 'parts', 'no of parts'];

function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function splitCode(val) {
  if (!val) return { code: '', description: '' };
  var v = String(val).trim();
  if (CODE_ONLY_RE.test(v)) return { code: v, description: '' };
  var m = CODE_SPLIT_RE.exec(v);
  return m ? { code: m[1], description: m[2] } : { code: '', description: v };
}

var Schedule = (function () {
  var KEY = 'joh_room_schedule_v1';
  var METAKEY = 'joh_room_schedule_meta_v1';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
  }
  function meta() {
    try { return JSON.parse(localStorage.getItem(METAKEY) || 'null'); } catch (e) { return null; }
  }
  function forRoom(roomId) { return all()[roomId] || null; }
  function hasAny() { return !!meta(); }

  function saveAll(map, fileName, matched, total) {
    try {
      localStorage.setItem(KEY, JSON.stringify(map));
      localStorage.setItem(METAKEY, JSON.stringify({ fileName: fileName, matched: matched, total: total, uploadedAt: new Date().toISOString() }));
      if (window.Sync && Sync.markDirty) Sync.markDirty('schedule');
      return true;
    } catch (e) { return false; }
  }

  /* accept a remote copy only if it's newer than what's stored locally */
  function applyRemote(remoteData, remoteMeta) {
    if (!remoteMeta || !remoteData) return false;
    var m = meta();
    if (m && m.uploadedAt >= remoteMeta.uploadedAt) return false;
    localStorage.setItem(KEY, JSON.stringify(remoteData));
    localStorage.setItem(METAKEY, JSON.stringify(remoteMeta));
    return true;
  }

  function clear() {
    localStorage.removeItem(KEY); localStorage.removeItem(METAKEY);
  }

  /* map a header row to column indices for every item's code/desc/spec/bare
     slots, the free-text fields, and the room-number column. */
  function mapHeaders(headerRow) {
    var roomCol = -1, items = {}, text = {}, lists = {}, extra = [];
    ITEM_FIELDS.forEach(function (f) { items[f.key] = {}; });
    for (var i = 0; i < headerRow.length; i++) {
      var h = norm(headerRow[i]);
      if (!h) continue;
      if (roomCol < 0 && ROOM_COL_MATCH.indexOf(h) >= 0) { roomCol = i; continue; }
      if (IGNORE_COL_MATCH.indexOf(h) >= 0) continue;
      var claimed = false;
      for (var f = 0; f < ITEM_FIELDS.length && !claimed; f++) {
        var it = ITEM_FIELDS[f], slot = items[it.key];
        if (it.code.indexOf(h) >= 0) { slot.codeIdx = i; claimed = true; }
        else if (it.desc.indexOf(h) >= 0) { slot.descIdx = i; claimed = true; }
        else if (it.spec.indexOf(h) >= 0) { slot.specIdx = i; claimed = true; }
        else if (slot.bareIdx == null && it.bare.indexOf(h) >= 0) { slot.bareIdx = i; claimed = true; }
      }
      if (claimed) continue;
      for (var t = 0; t < TEXT_FIELDS.length; t++) {
        if (TEXT_FIELDS[t].match.indexOf(h) >= 0) { text[TEXT_FIELDS[t].key] = i; claimed = true; break; }
      }
      if (claimed) continue;
      for (var cl = 0; cl < CODE_LIST_FIELDS.length; cl++) {
        if (CODE_LIST_FIELDS[cl].match.indexOf(h) >= 0) { lists[CODE_LIST_FIELDS[cl].key] = i; claimed = true; break; }
      }
      if (!claimed) extra.push({ idx: i, label: String(headerRow[i]).trim() });
    }
    return { roomCol: roomCol, items: items, text: text, lists: lists, extra: extra };
  }

  function cell(row, idx) {
    if (idx == null) return '';
    var v = row[idx];
    return v == null ? '' : String(v).trim();
  }

  /* rows: array of arrays (first row = header). Returns {ok, error, matched, total, unmatchedSample} */
  function ingestRows(rows, fileName) {
    if (!rows || !rows.length) return { ok: false, error: 'The file has no rows.' };
    var header = rows[0];
    var map = mapHeaders(header);
    if (map.roomCol < 0) return { ok: false, error: 'Could not find a "Room No" column in the first row. Rename the room-number column header to "Room No" and try again.' };

    var out = {}, matched = 0, total = 0, unmatched = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      if (!row || !row.length) continue;
      var roomRaw = row[map.roomCol];
      if (roomRaw == null || String(roomRaw).trim() === '') continue;
      total++;
      var roomId = String(roomRaw).trim().toUpperCase();
      if (!ROOMS[roomId]) { if (unmatched.length < 8) unmatched.push(roomId); continue; }

      var rec = {};
      ITEM_FIELDS.forEach(function (f) {
        var slot = map.items[f.key];
        var codeV = cell(row, slot.codeIdx), descV = cell(row, slot.descIdx), specV = cell(row, slot.specIdx);
        if (slot.bareIdx != null && !descV) {
          var bare = cell(row, slot.bareIdx);
          if (bare) {
            if (!codeV) { var sp = splitCode(bare); codeV = sp.code; descV = sp.description; }
            else descV = bare; // code already known from its own column — the bare column is just the plain-language name
          }
        }
        if (codeV || descV || specV) rec[f.key] = { code: codeV, description: descV, spec: specV };
      });
      TEXT_FIELDS.forEach(function (f) {
        var v = cell(row, map.text[f.key]);
        if (v) rec[f.key] = v;
      });
      CODE_LIST_FIELDS.forEach(function (f) {
        var v = cell(row, map.lists[f.key]);
        if (v) {
          var codes = v.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
          if (codes.length) rec[f.key] = codes;
        }
      });
      if (map.extra.length) {
        var extraObj = {};
        map.extra.forEach(function (e) {
          var v = cell(row, e.idx);
          if (v) extraObj[e.label] = v;
        });
        if (Object.keys(extraObj).length) rec.extra = extraObj;
      }
      out[roomId] = rec;
      matched++;
    }
    if (!matched) return { ok: false, error: 'No rows matched an existing room number. Check the Room No column values (e.g. 1.00.CAT.01).' };
    saveAll(out, fileName, matched, total);
    return { ok: true, matched: matched, total: total, unmatchedSample: unmatched };
  }

  /* File -> rows via SheetJS (handles xlsx/xls/csv) */
  function importFile(file, cb) {
    var reader = new FileReader();
    reader.onerror = function () { cb({ ok: false, error: 'Could not read that file.' }); };
    reader.onload = function () {
      try {
        var wb = XLSX.read(reader.result, { type: 'array' });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        cb(ingestRows(rows, file.name));
      } catch (e) {
        cb({ ok: false, error: 'Could not parse this file. Use an .xlsx, .xls or .csv export of the room schedule.' });
      }
    };
    reader.readAsArrayBuffer(file);
  }

  /* normalizes a stored item (new {code,description,spec} shape, legacy
     plain string, or missing) into a always-present triplet for display */
  function itemParts(item) {
    if (!item) return { code: '', description: '', spec: '' };
    if (typeof item === 'string') return { code: '', description: item, spec: '' };
    return { code: item.code || '', description: item.description || '', spec: item.spec || '' };
  }

  return { forRoom: forRoom, hasAny: hasAny, meta: meta, importFile: importFile, ingestRows: ingestRows, itemParts: itemParts, applyRemote: applyRemote, clear: clear, all: all };
})();

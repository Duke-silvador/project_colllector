/* ============================================================
   JOH Room Tracker — Excel Exporter + Room-Info Editor (added)
   - Edits to room info & progress saved in localStorage
   - "Update Excel Files" rebuilds BOTH xlsx (Room-by-Room Finishing
     + Level-00 Progress) via SheetJS, merged with all local edits.
   - Files download for you to upload to Drive/GitHub for sharing.
   ============================================================ */
'use strict';
var Exporter = (function () {
  var RIKEY = 'joh_roominfo_edits_v1';   // { code: { field: value } }
  function edits() { try { return JSON.parse(localStorage.getItem(RIKEY) || '{}'); } catch (e) { return {}; } }
  function saveEdits(o) { localStorage.setItem(RIKEY, JSON.stringify(o)); }
  function setField(code, field, val) { var o = edits(); o[code] = o[code] || {}; o[code][field] = val; saveEdits(o); if (window.Sync && Sync.markDirty) Sync.markDirty('roominfo'); }
  function recFor(code) {
    var base = (window.ROOMINFO_DATA && ROOMINFO_DATA[code]) || {};
    var e = edits()[code] || {};
    var out = {};
    (window.ROOMINFO_FIELDS || Object.keys(base)).forEach(function (f) { out[f] = (e[f] !== undefined) ? e[f] : (base[f] != null ? base[f] : ''); });
    return out;
  }

  /* ---- rebuild Room-by-Room Finishing xlsx ---- */
  function buildFinishing() {
    var d = EXPORT_DATA.rbr, cols = d.cols.slice(), rows = d.rows.map(function (r) { return r.slice(); });
    var rnI = cols.indexOf('Room Number');
    var e = edits();
    // apply edits by matching room number
    rows.forEach(function (row) {
      var code = row[rnI]; if (!code || !e[code]) return;
      cols.forEach(function (c, i) { if (e[code][c] !== undefined) row[i] = e[code][c]; });
    });
    var aoa = [cols].concat(rows);
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Room Tracker');
    return wb;
  }

  /* ---- rebuild Level-00 Progress xlsx ---- */
  function buildProgress() {
    var wb = XLSX.utils.book_new();
    var LEAFCOLS = 23; // E..AA
    Object.keys(EXPORT_DATA.prog).forEach(function (sn) {
      var sh = EXPORT_DATA.prog[sn];
      var head1 = ['SN', 'Part', 'Room Code', 'Room Name'].concat(sh.leaf).concat(['AVG %']);
      var aoa = [head1];
      sh.rows.forEach(function (r, i) {
        var acts = (typeof Progress !== 'undefined' && Progress.actsFor) ? Progress.actsFor(r.code) : null;
        var vals = sh.leaf.map(function (lbl, j) {
          if (acts && acts[lbl] != null) return acts[lbl];   // live edited value
          return (r.vals[j] == null ? '' : r.vals[j]);
        });
        var nums = vals.filter(function (v) { return typeof v === 'number'; });
        var avg = nums.length ? Math.round(nums.reduce(function (a, b) { return a + b; }, 0) / vals.length * 100) / 100 : '';
        aoa.push([i + 1, r.part || '', r.code, r.name || ''].concat(vals).concat([avg]));
      });
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sn.slice(0, 31));
    });
    return wb;
  }

  function dl(wb, name) {
    var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([wbout], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function updateFiles() {
    if (typeof XLSX === 'undefined') { alert('Excel engine not loaded.'); return; }
    var stamp = new Date().toISOString().slice(0, 10);
    try {
      dl(buildFinishing(), 'JOH_Room_by_Room_Finishing_' + stamp + '.xlsx');
      setTimeout(function () { dl(buildProgress(), 'JOH_Level_00_fit_out_Tracker_Progress_' + stamp + '.xlsx'); }, 600);
      // push to GitHub sync if configured
      if (window.Sync && Sync.markDirty) { Sync.markDirty('progress'); Sync.markDirty('roominfo'); }
      toast('Both Excel files updated & downloaded' + (window.Sync && Sync.isConnected && Sync.isConnected() ? ' + synced to GitHub' : ''));
    } catch (e) { alert('Update failed: ' + e.message); }
  }
  function toast(msg) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:78px;transform:translateX(-50%);background:#2e7d32;color:#fff;padding:11px 18px;border-radius:10px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.4);font-size:13px';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }

  return { recFor: recFor, setField: setField, updateFiles: updateFiles };
})();

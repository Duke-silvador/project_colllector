/* ============================================================
   JOH Room Tracker — Site Progress module (added)
   - 23 fit-out activities per room (Walls/Ceiling/Floor/Door)
   - Editable % per activity, saved locally (localStorage)
   - Completion circle (colored) on browse dots + room page
   - Room Info (finishing) answers from embedded schedule
   ============================================================ */
'use strict';
var Progress = (function () {
  var KEY = 'joh_progress_v1';
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { store = {}; }

  function actsFor(code) {
    // merge embedded baseline with local edits
    var base = (PROG_DATA.rooms[code] && PROG_DATA.rooms[code].acts) || {};
    var loc = store[code] || {};
    var out = {};
    PROG_DATA.activities.forEach(function (a) {
      var lbl = a[1];
      out[lbl] = (loc[lbl] !== undefined) ? loc[lbl] : (base[lbl] != null ? base[lbl] : null);
    });
    return out;
  }
  function hasData(code) { return !!(PROG_DATA.rooms[code] || store[code]); }
  function set(code, lbl, val) {
    store[code] = store[code] || {};
    store[code][lbl] = val;
    localStorage.setItem(KEY, JSON.stringify(store));
    if (window.Sync && Sync.markDirty) Sync.markDirty('progress');
  }
  function roomAvg(code) {
    var a = actsFor(code); var vals = PROG_DATA.activities.map(function (x) { var v = a[x[1]]; return v == null ? 0 : v; });
    if (!vals.length) return null;
    return vals.reduce(function (x, y) { return x + y; }, 0) / vals.length;
  }
  function groupAvg(code, grp) {
    var a = actsFor(code);
    var labs = PROG_DATA.activities.filter(function (x) { return x[0] === grp; }).map(function (x) { return x[1]; });
    if (!labs.length) return null;
    var s = labs.reduce(function (acc, l) { return acc + (a[l] == null ? 0 : a[l]); }, 0);
    return s / labs.length;
  }
  function pctColor(p) { if (p == null) return '#9aa'; if (p >= 1) return '#2e7d32'; if (p > 0) return '#e6a700'; return '#c62828'; }
  function checked(code) { // "checked" = any activity has been given a value
    var a = actsFor(code); return PROG_DATA.activities.some(function (x) { return a[x[1]] != null; });
  }

  var GCOL = { Walls: '#2E75B6', Ceiling: '#C55A11', Floor: '#548235', Door: '#7B6000' };

  /* ---- Progress section injected into the room page ---- */
  function sectionHTML(code) {
    if (!hasData(code)) return '';
    var h = '<h2 class="sec" style="display:flex;align-items:center;justify-content:space-between">Site Progress' +
      '<span id="prAvg" style="font-size:14px;font-weight:800"></span></h2>';
    h += '<div id="prGroups" class="card" style="padding:8px">';
    ['Walls', 'Ceiling', 'Floor', 'Door'].forEach(function (g) {
      var ga = groupAvg(code, g);
      if (ga == null) return;
      h += '<button class="prGrp" data-g="' + g + '" style="width:100%;text-align:left;border:none;border-radius:9px;' +
        'padding:11px 13px;margin:4px 0;font-size:14px;font-weight:700;color:#fff;cursor:pointer;background:' + GCOL[g] + ';' +
        'display:flex;justify-content:space-between;align-items:center">' +
        '<span>' + g + '</span><span style="background:rgba(255,255,255,.25);padding:2px 9px;border-radius:20px;font-size:12.5px">' + Math.round(ga * 100) + '%</span></button>';
      h += '<div class="prActs" data-g="' + g + '" style="display:none;padding:0 0 6px"></div>';
    });
    h += '</div>';
    return h;
  }
  function wire(code) {
    if (!hasData(code)) return;
    var avgEl = document.getElementById('prAvg');
    function refreshAvg() { var a = roomAvg(code); if (avgEl) { avgEl.textContent = a == null ? '' : Math.round(a * 100) + '%'; avgEl.style.color = pctColor(a); } }
    refreshAvg();
    document.querySelectorAll('.prGrp').forEach(function (gb) {
      gb.onclick = function () {
        var g = gb.dataset.g;
        var pane = document.querySelector('.prActs[data-g="' + g + '"]');
        if (pane.style.display === 'block') { pane.style.display = 'none'; return; }
        document.querySelectorAll('.prActs').forEach(function (p) { p.style.display = 'none'; });
        var a = actsFor(code);
        var labs = PROG_DATA.activities.filter(function (x) { return x[0] === g; }).map(function (x) { return x[1]; });
        pane.innerHTML = labs.map(function (l) {
          var v = a[l]; var pc = v == null ? 0 : Math.round(v * 100);
          return '<div class="prAct" data-l="' + encodeURIComponent(l) + '" style="background:#f3efe7;border:1px solid var(--line);border-radius:8px;padding:9px 12px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer">' +
            '<span style="font-size:13px">' + l + '</span><span class="prPct" style="font-weight:700;padding:2px 9px;border-radius:20px;font-size:12px;color:#fff;background:' + pctColor(v) + '">' + pc + '%</span></div>';
        }).join('');
        pane.style.display = 'block';
        pane.querySelectorAll('.prAct').forEach(function (ab) {
          ab.onclick = function () { openEditor(code, decodeURIComponent(ab.dataset.l), ab, gb, g, refreshAvg); };
        });
      };
    });
  }
  function openEditor(code, lbl, ab, gb, g, refreshAvg) {
    if (ab.nextSibling && ab.nextSibling.className === 'prEditor') { ab.nextSibling.remove(); return; }
    document.querySelectorAll('.prEditor').forEach(function (e) { e.remove(); });
    var a = actsFor(code); var v = a[lbl] == null ? 0 : Math.round(a[lbl] * 100);
    var ed = document.createElement('div'); ed.className = 'prEditor';
    ed.style.cssText = 'background:#fff;border:1px solid var(--brass);border-radius:8px;padding:10px 12px;margin:4px 0';
    ed.innerHTML = '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:7px">' + lbl + ' — set % complete</div>' +
      '<div style="display:flex;gap:8px;align-items:center"><input type="range" min="0" max="100" step="5" value="' + v + '" style="flex:1">' +
      '<input type="number" min="0" max="100" value="' + v + '" style="width:60px;text-align:center;padding:6px;border:1px solid var(--line);border-radius:6px">%</div>' +
      '<div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap">' +
      [0, 25, 50, 75, 90, 100].map(function (q) { return '<button class="qk" data-v="' + q + '" style="background:#efe9df;border:1px solid var(--line);border-radius:6px;padding:5px 11px;cursor:pointer">' + q + '</button>'; }).join('') +
      '</div><button class="prDone" style="background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-weight:700;margin-top:8px;cursor:pointer">&#10003; Done</button>';
    ab.after(ed);
    var rng = ed.querySelector('input[type=range]'), num = ed.querySelector('input[type=number]');
    rng.oninput = function () { num.value = rng.value; };
    num.oninput = function () { rng.value = num.value; };
    ed.querySelectorAll('.qk').forEach(function (b) { b.onclick = function () { rng.value = b.dataset.v; num.value = b.dataset.v; }; });
    ed.querySelector('.prDone').onclick = function () {
      var nv = Math.max(0, Math.min(100, parseInt(num.value) || 0)) / 100;
      set(code, lbl, nv);
      ab.querySelector('.prPct').style.background = pctColor(nv);
      ab.querySelector('.prPct').textContent = Math.round(nv * 100) + '%';
      var ga = groupAvg(code, g); gb.querySelector('span:last-child').textContent = Math.round(ga * 100) + '%';
      refreshAvg();
      if (window.updateDotCircle) window.updateDotCircle(code);
      ed.remove();
    };
  }

  return { actsFor: actsFor, roomAvg: roomAvg, groupAvg: groupAvg, pctColor: pctColor, checked: checked,
    hasData: hasData, sectionHTML: sectionHTML, wire: wire, GCOL: GCOL,
    activities: function () { return PROG_DATA.activities; } };
})();

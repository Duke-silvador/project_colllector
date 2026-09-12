/* ============================================================
   JOH Room Tracker — Phase 0 (local)
   Scope: room identity + location on the level plans only.
   English-only UI. Runs directly from file:// (data embedded).
   ============================================================ */
'use strict';

var ROOMS = ROOMS_DATA;
var META = META_DATA;
var LEVELS = META.levels;

var app = document.getElementById('app');
var q = document.getElementById('q');
var fl = document.getElementById('fl');
var fa = document.getElementById('fa');

function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
function row2(k, v) { return '<tr><td>' + esc(k) + '</td><td>' + esc(v == null || v === '' ? '\u2013' : v) + '</td></tr>'; }
function rowFinish(fieldKey, label, item) {
  var p = Schedule.itemParts(item);
  var libCat = ITEM_TO_LIB_CATEGORY[fieldKey];
  if (p.code && libCat) {
    var libRec = Library.lookup(libCat, p.code);
    if (libRec) {
      if (!p.description && libRec.description) p.description = libRec.description;
      if (!p.spec && libRec.spec) p.spec = libRec.spec;
    }
  }
  var html = '<div class="finishmini">' +
    '<div><span class="fm-k">Code:</span> ' + esc(p.code || '\u2013') + '</div>' +
    '<div><span class="fm-k">Description:</span> ' + esc(p.description || '\u2013') + '</div>' +
    '<div><span class="fm-k">Specification:</span> ' + esc(p.spec || '\u2013') + '</div>' +
    '</div>';
  return '<tr><td>' + esc(label) + '</td><td>' + html + '</td></tr>';
}

/* ---------- boot ---------- */
function boot() {
  LEVELS.forEach(function (l) {
    var o = document.createElement('option'); o.value = l; o.textContent = 'Level ' + l; fl.appendChild(o);
  });
  var abbrs = {};
  Object.keys(ROOMS).forEach(function (id) { var a = ROOMS[id].abbr; if (a) abbrs[a] = 1; });
  Object.keys(abbrs).sort().forEach(function (a) {
    var o = document.createElement('option'); o.value = a; o.textContent = a; fa.appendChild(o);
  });

  q.addEventListener('input', function () { setTab('rooms'); doSearch(); });
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var t = q.value.trim().toUpperCase(); if (ROOMS[t]) location.hash = '#/room/' + encodeURIComponent(t); }
  });
  fl.addEventListener('change', function () { setTab('rooms'); doSearch(); });
  fa.addEventListener('change', function () { setTab('rooms'); doSearch(); });

  document.querySelectorAll('#tabbar button').forEach(function (b) {
    b.addEventListener('click', function () { location.hash = '#/' + b.dataset.tab; });
  });

  window.addEventListener('hashchange', route);
  route();
}

/* ---------- router ---------- */
function setTab(t) {
  document.querySelectorAll('#tabbar button').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === t); });
}
function route() {
  var h = location.hash.replace(/^#\/?/, '');
  var parts = h.split('/').filter(Boolean).map(decodeURIComponent);
  window.scrollTo(0, 0);
  if (parts[0] === 'rfis') { setTab('rfis'); return openRfisTab(parts[1]); }
  if (parts[0] === 'library') { setTab('library'); return openLibraryTab(); }
  if (parts[0] === 'room' && parts[1]) { setTab('rooms'); return openRoom(parts[1]); }
  if (parts[0] === 'plan') { setTab('plan'); return openPlanBrowse(parts[1] || LEVELS[0]); }
  setTab('rooms'); renderHome();
}
function renderHome() {
  q.style.display = ''; fl.style.display = ''; fa.style.display = '';
  doSearch();
}

/* ---------- search & list ---------- */
function doSearch() {
  var t = (q.value || '').trim().toUpperCase(), L = fl.value, A = fa.value;
  var keys = Object.keys(ROOMS), out = [];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i], d = ROOMS[k];
    if (L && d.baseLevel !== L) continue;
    if (A && d.abbr !== A) continue;
    if (t) {
      if (k.toUpperCase() === t) { location.hash = '#/room/' + encodeURIComponent(k); return; }
      var hay = (k + ' ' + (d.name || '') + ' ' + (d.abbr || '') + ' ' + (d.function || '')).toUpperCase();
      if (hay.indexOf(t) < 0) continue;
    }
    out.push(k);
    if (out.length > 250) break;
  }
  renderList(out, t, L, A);
}
function renderList(keys, t, L, A) {
  if (!t && !L && !A) {
    var withPos = 0;
    Object.keys(ROOMS).forEach(function (k) { if (ROOMS[k].pos) withPos++; });
    var sm = Schedule.meta();
    app.innerHTML =
      '<div class="eyebrow" style="padding:8px 2px 0">Jeddah Opera House</div>' +
      '<div class="hint" style="font-size:13px;color:var(--ink-soft)">Search a room number (e.g. <b>5.04.TEC.01</b>) or name, filter by level / type, or browse a floor plan and tap a room. ' +
      Object.keys(ROOMS).length + ' rooms indexed across ' + LEVELS.length + ' levels &middot; ' + withPos + ' located on plan.</div>' +
      '<div class="card" style="display:flex;gap:10px;align-items:center;cursor:pointer" onclick="location.hash=\'#/plan\'">' +
      '<div style="font-size:26px">&#128506;&#65039;</div><div><div style="font-weight:700;font-family:var(--serif)">Browse the plan</div>' +
      '<div class="small">Tap any room on the floor plan to open its identity card</div></div></div>' +
      '<div class="card" style="display:flex;gap:10px;align-items:center;cursor:pointer" onclick="triggerScheduleUpload()">' +
      '<div style="font-size:26px">&#128203;</div><div><div style="font-weight:700;font-family:var(--serif)">Room Finishing Schedule</div>' +
      '<div class="small">' + (sm ? sm.matched + ' of ' + sm.total + ' rows matched &middot; from ' + esc(sm.fileName) + ' &middot; tap to update' : 'No schedule uploaded yet &mdash; tap to upload door type, floor, wall &amp; ceiling finish for every room') + '</div></div></div>';
    return;
  }
  var h = '<div class="hint">' + keys.length + ' result(s)</div>';
  keys.slice(0, 150).forEach(function (k) {
    var d = ROOMS[k];
    h += '<div class="card roomrow" style="padding:12px 14px" onclick="location.hash=\'#/room/' + encodeURIComponent(k) + '\'">' +
      '<span class="rn">' + esc(k) + '</span><span class="rt">' + esc(d.name || '') + '</span>' +
      '<span class="meta">L' + esc(d.baseLevel) + (d.area ? (' &middot; ' + d.area + 'm&sup2;') : '') + '</span></div>';
  });
  app.innerHTML = h || '<div class="emptystate"><div class="big">&#128269;</div>No match.</div>';
}

/* ---------- room identity card ---------- */
function openRoom(k) {
  var d = ROOMS[k];
  if (!d) { app.innerHTML = '<div class="emptystate">Room not found.</div>'; return; }
  var st = d.study || ['', ''];
  var dwg = (META.dwg && META.dwg[d.baseLevel]) || '';

  var h = '<button class="btn ghost" onclick="history.length>1?history.back():location.hash=\'#/\'">&larr; Back</button>';

  /* hero: location on plan */
  h += SCOPE_LEGEND;
  h += '<div class="hero" data-curroom="' + esc(k) + '">';
  if (d.pos) {
    h += '<div class="frame" id="pv"><canvas></canvas><div class="mk"></div>' +
      '<div id="pvlvl">LEVEL ' + esc(d.baseLevel) + '</div><div class="pvstat-el" id="pvstat">loading&hellip;</div>' +
      '<div id="pvctl"><button onclick="Viewer.zoomBy(1.4)">+</button><button onclick="Viewer.zoomBy(0.72)">&minus;</button><button onclick="Viewer.centerRoom()">&#9678;</button></div></div>';
  } else {
    h += '<div class="frame" style="display:flex;align-items:center;justify-content:center;color:#eee;font-size:12.5px;padding:20px;text-align:center">Location not yet mapped on the Level ' + esc(d.baseLevel) + ' plan.</div>';
  }
  h += '<div class="caption"><div class="rn">' + esc(k) + '</div><div class="rt">' + esc(d.name || '') + '</div>' +
    '<div class="tags"><span class="tag">Level ' + esc(d.baseLevel) + '</span><span class="tag">Zone ' + esc(d.zone || '\u2013') + '</span>' +
    (d.area ? '<span class="tag">' + d.area + ' m&sup2;</span>' : '') + '<span class="tag">' + esc(d.abbr) + '</span></div></div></div>';
  if (d.pos) h += '<div class="small" style="margin:-6px 0 8px">Drag to pan &middot; pinch / +&minus; to zoom &middot; &#9678; re-centre.</div>';


  /* ---- Site progress + Room Info quick button (added) ---- */
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 8px">' +
    '<button class="btn" style="font-size:12.5px;padding:7px 14px" onclick="Progress_scrollTo()">&#128202; Site Progress</button>' +
    '<button class="btn ghost" style="font-size:12.5px;padding:7px 14px" onclick="RoomInfo_show(\'' + esc(k) + '\')">&#8505;&#65039; Room Info (Finishing)</button>' +
    '<button class="btn ghost" style="font-size:12.5px;padding:7px 14px" onclick="Notes_scrollTo()">&#128221; Room Site Notes</button>' +
    '</div>';
  h += '<div id="roomInfoBox"></div>';
  h += Progress.sectionHTML(k);
  h += Notes.sectionHTML(k);

  /* clearance status */
  h += '<h2 class="sec">Clearance Status</h2>';
  h += '<div id="clrlist">' + renderClearanceList(k) + '</div>';

  /* documents: approved shop drawings, material approvals, TQs */
  h += '<h2 class="sec">Documents</h2>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">' +
    '<button class="btn ghost" style="font-size:12.5px;padding:6px 12px" onclick="AttachUI.openDoc(\'' + esc(k) + '\',\'shop_drawing\')">+ Shop Drawing</button>' +
    '<button class="btn ghost" style="font-size:12.5px;padding:6px 12px" onclick="AttachUI.openDoc(\'' + esc(k) + '\',\'material_approval\')">+ Material Approval</button>' +
    '<button class="btn ghost" style="font-size:12.5px;padding:6px 12px" onclick="AttachUI.openDoc(\'' + esc(k) + '\',\'tq\')">+ TQ</button></div>';
  h += '<div id="docslist">' + renderDocsList(k) + '</div>';

  /* RFIs for this room */
  h += '<h2 class="sec" style="display:flex;align-items:center;justify-content:space-between">Site Issues (RFI)' +
    '<button class="btn" style="font-size:12.5px;padding:6px 12px" onclick="RFIUI.open(\'' + esc(k) + '\')">+ Raise RFI</button></h2>';
  h += '<div id="rfilist">' + renderRfiList(k) + '</div>';

  app.innerHTML = h;
  if (d.pos) Viewer.openRoom(k, 'pv');
  Progress.wire(k);
  Notes.render(k);
  window._curRoomInfo = k;
}

/* ---- Room Info — full IFC record, EDITABLE ---- */
var ROOMINFO_SECTIONS = [
  ['Identity', ['Room Number','Room Name','Room Function Area','Function Sub Area','Nett Area (m²)']],
  ['Walls', ['Wall Finish (Schedule)','Wall Keynotes (IFC)','Wall Family & Type (IFC)','Wall Materials (IFC, m²)','Wall Total (m²)']],
  ['Floor', ['Floor Finish (Schedule)','Floor Keynotes (IFC)','Floor Family & Type (IFC)','Floor Materials (IFC, m²)','Floor Total (m²)']],
  ['Ceiling', ['Ceiling Finish (Schedule)','Ceiling Keynotes (IFC)','Ceiling Family & Type (IFC)','Ceiling Materials (IFC, m²)','Ceiling Total (m²)']],
  ['Doors', ['No. of Doors (Schedule)','Door Marks','Door Keynotes (IFC)','Door Family & Type (IFC)','IFC Doors Count']],
  ['Scope', ['IFC Part Zone','IFC Scope Code','Scope','Scope Basis (auto)']]
];
function RoomInfo_show(code) {
  var box = document.getElementById('roomInfoBox'); if (!box) return;
  var rec = Exporter.recFor(code);
  var h = '<div class="card" style="margin:4px 0 10px;padding:12px;border:1.5px solid var(--brass)">';
  h += '<div style="font-weight:800;font-size:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">Room Information &mdash; ' + esc(code) +
    '<span><button class="btn" id="riEdit" style="font-size:12px;padding:4px 12px;margin-right:6px">&#9998; Edit</button>' +
    '<button class="btn ghost" style="font-size:12px;padding:4px 10px" onclick="document.getElementById(\'roomInfoBox\').innerHTML=\'\'">&times; close</button></span></div>';
  h += '<div id="riBody"></div></div>';
  box.innerHTML = h;
  renderRoomInfo(code, false);
  document.getElementById('riEdit').onclick = function () {
    var editing = this.textContent.indexOf('Edit') > -1;
    if (editing) { this.innerHTML = '&#128190; Save'; renderRoomInfo(code, true); }
    else { saveRoomInfoEdits(code); this.innerHTML = '&#9998; Edit'; renderRoomInfo(code, false); }
  };
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function renderRoomInfo(code, editing) {
  var rec = Exporter.recFor(code);
  var body = document.getElementById('riBody'); if (!body) return;
  var h = '';
  ROOMINFO_SECTIONS.forEach(function (sec) {
    h += '<div style="margin-top:8px;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--brass)">' + sec[0] + '</div>';
    h += '<table class="kv" style="margin-top:2px"><tbody>';
    sec[1].forEach(function (f) {
      var v = rec[f]; if (v === '' || v == null) v = editing ? '' : '\u2013';
      var cell = editing
        ? '<input class="riInp" data-f="' + esc(f) + '" value="' + esc(rec[f] == null ? '' : rec[f]) + '" style="width:100%;border:1px solid var(--line);border-radius:6px;padding:5px 7px;font-size:12.5px">'
        : esc(v);
      h += '<tr><td class="k" style="width:42%;vertical-align:top">' + esc(f) + '</td><td style="word-break:break-word">' + cell + '</td></tr>';
    });
    h += '</tbody></table>';
  });
  body.innerHTML = h;
}
function saveRoomInfoEdits(code) {
  document.querySelectorAll('#riBody .riInp').forEach(function (inp) {
    Exporter.setField(code, inp.dataset.f, inp.value);
  });
  if (window.updateDotCircle) window.updateDotCircle(code);
}
function Progress_scrollTo() { var e = document.getElementById('prGroups'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function Notes_scrollTo() { var e = document.getElementById('notesList'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

/* ---------- scope legend (color-coded contractor areas, per drawing) ---------- */
var SCOPE_LEGEND =
  '<div class="card" style="display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;padding:9px 12px;margin-bottom:8px">' +
  '<span style="display:flex;align-items:center;gap:6px"><span style="width:13px;height:13px;border-radius:3px;background:#E8564B;display:inline-block"></span>THEATRE</span>' +
  '<span style="display:flex;align-items:center;gap:6px"><span style="width:13px;height:13px;border-radius:3px;background:#3FA845;display:inline-block"></span>FOH</span>' +
  '<span style="display:flex;align-items:center;gap:6px"><span style="width:13px;height:13px;border-radius:3px;background:#3F6FD1;display:inline-block"></span>BOH</span>' +
  '<span style="display:flex;align-items:center;gap:6px;color:var(--ink-soft)">(per colored scope plan)</span>' +
  '</div>';

/* ---------- plan browse ---------- */
function openPlanBrowse(level) {
  if (LEVELS.indexOf(level) < 0) level = LEVELS[0];
  q.style.display = 'none'; fl.style.display = 'none'; fa.style.display = 'none';
  var h = SCOPE_LEGEND;
  h += '<div class="eyebrow" style="padding:4px 2px 0">Tap a pin to open that room</div>';
  h += '<div class="levelpicker">';
  LEVELS.forEach(function (l) { h += '<button class="' + (l === level ? 'active' : '') + '" onclick="location.hash=\'#/plan/' + l + '\'">Level ' + l + '</button>'; });
  h += '</div>';
  h += '<div class="planwrap" id="pvb"><canvas></canvas><div class="dotlayer" style="position:absolute;inset:0;pointer-events:none"></div>' +
    '<div id="pvlvl">LEVEL ' + esc(level) + '</div><div class="pvstat-el" id="pvstat"></div></div>';
  h += '<div class="small" style="margin-top:8px">Drag to pan &middot; pinch / scroll to zoom &middot; tap a gold pin to open the room.</div>';
  app.innerHTML = h;
  document.querySelector('#pvb .dotlayer').style.pointerEvents = 'auto';
  Viewer.openBrowse(level, 'pvb', function (roomId) { location.hash = '#/room/' + encodeURIComponent(roomId); });
}

/* keep header search usable again when back on rooms tab */
window.addEventListener('hashchange', function () {
  var h = location.hash;
  if (h.indexOf('#/plan') !== 0 && h.indexOf('#/rfis') !== 0 && h.indexOf('#/library') !== 0) { q.style.display = ''; fl.style.display = ''; fa.style.display = ''; }
});

/* ---------- shared: refresh whatever view is currently open ---------- */
function refreshCurrentView() {
  var h = location.hash;
  if (h.indexOf('#/room/') === 0 || h.indexOf('#/rfis') === 0 || h.indexOf('#/library') === 0) route();
}

/* ---------- Clearance Status: compact short-name + checkbox grid ---------- */
var CLR_SHORT = {
  mep_closed: 'MEP closed', blockwork_plaster: 'Block & plaster', waterproofing: 'Waterproofing',
  screed: 'Screed ready', shop_drawing: 'Shop dwg', material_approval: 'Material appr.',
  mep_clash: 'MEP clash', snagging: 'Snagging', clean_dust_free: 'Clean/dust-free', access_possession: 'Access handed'
};
function renderClearanceList(roomId) {
  var prog = Clearance.roomProgress(roomId);
  var h = '<div class="clrprogress" style="margin-bottom:6px">' + prog.done + ' of ' + prog.total + ' cleared</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px 10px">';
  h += CLEARANCE_ITEMS.map(function (it) {
    var st = Clearance.itemStatus(roomId, it.key);
    var short = CLR_SHORT[it.key] || it.label;
    return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:5px 7px;border:1px solid var(--line);border-radius:7px;background:' + (st.checked ? '#e6f4e6' : '#faf7f1') + '">' +
      '<input type="checkbox" ' + (st.checked ? 'checked' : '') + ' onchange="toggleClearance(\'' + esc(roomId) + '\',\'' + it.key + '\',this.checked)">' +
      '<span>' + esc(short) + '</span></label>';
  }).join('');
  h += '</div>';
  return h;
}
function toggleClearance(roomId, itemKey, checked) {
  var by = null;
  if (checked) by = prompt('Your name (for the record):', '') || '';
  Clearance.setChecked(roomId, itemKey, checked, by);
  document.getElementById('clrlist').innerHTML = renderClearanceList(roomId);
}
function removeClearanceAttachment(roomId, itemKey, attId) {
  if (!confirm('Remove this evidence?')) return;
  Clearance.removeAttachment(roomId, itemKey, attId);
  document.getElementById('clrlist').innerHTML = renderClearanceList(roomId);
}

/* ---------- Documents: render a room's shop drawings / material approvals / TQs ---------- */
function renderDocsList(roomId) {
  var items = Docs.byRoom(roomId);
  if (!items.length) return '<div class="small">No shop drawings, material approvals or TQs attached yet.</div>';
  return items.map(docCardHtml).join('');
}
function docCardHtml(d) {
  var dt = d.date ? d.date : new Date(d.createdAt).toISOString().slice(0, 10);
  var h = '<div class="rficard doccard">';
  h += '<div class="rfihead"><span class="rficat">' + esc(docTypeLabel(d.type)) + '</span>' +
    '<span class="rfimeta">' + esc(dt) + '</span></div>';
  if (d.refNo) h += '<div class="rfidesc"><b>' + esc(d.refNo) + '</b>' + (d.title ? ' &mdash; ' + esc(d.title) : '') + '</div>';
  else if (d.title) h += '<div class="rfidesc">' + esc(d.title) + '</div>';
  if (d.notes) h += '<div class="rfimeta">' + esc(d.notes) + '</div>';
  h += attachmentLinksHtml(Docs.filesOf(d), Docs.linksOf(d));
  h += '<div class="rfiactions"><button onclick="AttachUI.delDoc(\'' + d.id + '\')">Delete</button></div>';
  h += '</div>';
  return h;
}
/* shared renderer: a list of {fileId,fileName} + {url,label} as clickable rows */
function attachmentLinksHtml(files, links) {
  files = files || []; links = links || [];
  if (!files.length && !links.length) return '';
  var h = '<div class="attlist">';
  files.forEach(function (f) {
    h += '<a href="#" onclick="FileStore.openInNewTab(\'' + f.fileId + '\');return false;">&#128206; ' + esc(f.fileName || 'attachment') + '</a>';
  });
  links.forEach(function (l) {
    h += '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">&#128279; ' + esc(l.label || l.url) + '</a>';
  });
  h += '</div>';
  return h;
}

/* ---------- RFI: render a room's issue list ---------- */
function renderRfiList(roomId) {
  var items = RFI.byRoom(roomId);
  if (!items.length) return '<div class="small">No open issues logged for this room.</div>';
  return items.map(rfiCardHtml).join('');
}
function rfiCardHtml(r) {
  var cls = 'rficard' + (r.priority === 'urgent' ? ' urgent' : '') + (r.status === 'closed' ? ' closed' : '');
  var dt = new Date(r.createdAt);
  var when = dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  var h = '<div class="' + cls + '">';
  h += '<div class="rfihead"><span class="rficat">' + esc(rfiCategoryLabel(r.category)) + '</span>' +
    '<span class="rfistatus ' + (r.status === 'closed' ? 'closed' : 'open') + '">' + (r.status === 'closed' ? 'Closed' : 'Open') + '</span>' +
    (r.priority === 'urgent' ? '<span class="rfipri-urgent">&#9888; Urgent</span>' : '') + '</div>';
  if (r.description) h += '<div class="rfidesc">' + esc(r.description) + '</div>';
  h += '<div class="rfimeta">' + esc(r.raisedBy || 'Unnamed') + ' &middot; ' + when + '</div>';
  if (r.photos && r.photos.length) {
    h += '<div class="rfiphotos">' + r.photos.map(function (p) {
      return '<img src="' + p.dataUrl + '" onclick="Lightbox.open(\'' + p.id + '\',\'' + r.id + '\')">';
    }).join('') + '</div>';
  }
  if (r.responses && r.responses.length) {
    h += r.responses.map(function (rp) {
      var rd = new Date(rp.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
      return '<div class="rfiresponse"><div class="rfiresponse-h">&#8618; Response &middot; ' + esc(rp.respondedBy || 'Unnamed') + ' &middot; ' + rd + '</div>' +
        (rp.note ? '<div class="rfidesc">' + esc(rp.note) + '</div>' : '') +
        attachmentLinksHtml(RFI.responseFilesOf(rp), RFI.responseLinksOf(rp)) + '</div>';
    }).join('');
  }
  h += '<div class="rfiactions">';
  h += '<button onclick="AttachUI.openResponse(\'' + r.id + '\')">+ Add response</button>';
  h += r.status === 'closed'
    ? '<button onclick="RFIUI.reopen(\'' + r.id + '\')">Reopen</button>'
    : '<button onclick="RFIUI.close_(\'' + r.id + '\')">Mark closed</button>';
  h += '<button onclick="RFIUI.del(\'' + r.id + '\')">Delete</button>';
  h += '</div></div>';
  return h;
}

/* ---------- Attach modal: Room Documents (shop drawing / material approval / TQ) + RFI responses ---------- */
var AttachUI = (function () {
  var mode = null, ctxId = null, ctxItemKey = null, docType = null, pendingFiles = [], pendingLinks = [];

  function setField(id, val) { document.getElementById(id).value = val || ''; }
  function show(id, on) { document.getElementById(id).style.display = on ? '' : 'none'; }

  function resetFields() { pendingFiles = []; pendingLinks = []; renderFileStrip(); renderLinkStrip(); }

  function openDoc(roomId, type) {
    mode = 'doc'; ctxId = roomId; ctxItemKey = null; docType = type; resetFields();
    document.getElementById('attTitleText').textContent = 'Add ' + docTypeLabel(type);
    document.getElementById('attCtxLabel').textContent = roomId;
    show('attRefWrap', true); show('attTitleWrap', true); show('attDateWrap', true); show('attByWrap', false);
    document.getElementById('attDate').parentElement.style.display = '';
    document.getElementById('attRefLabel').textContent = (DOC_TYPES.filter(function (t) { return t.key === type; })[0] || {}).refLabel || 'Reference no.';
    document.getElementById('attNoteLabel').textContent = 'Notes';
    setField('attRef', ''); setField('attTitleField', ''); setField('attDate', new Date().toISOString().slice(0, 10)); setField('attNote', '');
    document.getElementById('attOverlay').classList.add('show');
  }
  function openResponse(rfiId) {
    mode = 'response'; ctxId = rfiId; ctxItemKey = null; docType = null; resetFields();
    document.getElementById('attTitleText').textContent = 'Add RFI response';
    var r = RFI.get(rfiId);
    document.getElementById('attCtxLabel').textContent = r ? r.roomId : '';
    show('attRefWrap', false); show('attTitleWrap', false); show('attDateWrap', true); show('attByWrap', true);
    document.getElementById('attNoteLabel').textContent = 'Response note';
    setField('attBy', ''); setField('attNote', '');
    document.getElementById('attDate').parentElement.style.display = 'none';
    document.getElementById('attOverlay').classList.add('show');
  }
  function openClearance(roomId, itemKey) {
    mode = 'clearance'; ctxId = roomId; ctxItemKey = itemKey; docType = null; resetFields();
    document.getElementById('attTitleText').textContent = 'Add evidence';
    document.getElementById('attCtxLabel').textContent = roomId + ' \u2014 ' + clearanceItemLabel(itemKey);
    show('attRefWrap', false); show('attTitleWrap', false); show('attByWrap', false);
    document.getElementById('attDate').parentElement.style.display = 'none';
    document.getElementById('attNoteLabel').textContent = 'Notes (optional)';
    setField('attNote', '');
    document.getElementById('attOverlay').classList.add('show');
  }
  function close() {
    document.getElementById('attOverlay').classList.remove('show');
    document.getElementById('attDate').parentElement.style.display = '';
  }

  function renderFileStrip() {
    var strip = document.getElementById('attFileStrip');
    strip.innerHTML = pendingFiles.map(function (pf, i) {
      var isImg = /^image\//.test(pf.type);
      return '<div class="photothumb" style="width:auto;height:auto;padding:6px 8px;display:flex;align-items:center;gap:6px">' +
        (isImg && pf._preview ? '<img src="' + pf._preview + '" style="width:34px;height:34px;object-fit:cover;border-radius:4px">' : '<span style="font-size:20px">&#128196;</span>') +
        '<span style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(pf.name) + '</span>' +
        '<button class="rm" style="position:static;background:var(--line-strong);color:var(--ink)" onclick="AttachUI.dropFile(' + i + ')">&times;</button></div>';
    }).join('');
  }
  function dropFile(i) { pendingFiles.splice(i, 1); renderFileStrip(); }
  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    files.forEach(function (f) {
      pendingFiles.push(f);
      if (/^image\//.test(f.type)) {
        var reader = new FileReader();
        reader.onload = function () { f._preview = reader.result; renderFileStrip(); };
        reader.readAsDataURL(f);
      }
    });
    renderFileStrip();
  }

  function renderLinkStrip() {
    var strip = document.getElementById('attLinkStrip');
    strip.innerHTML = pendingLinks.map(function (l, i) {
      return '<div class="card roomrow" style="padding:7px 10px;margin:6px 0 0">' +
        '<span style="font-size:12px;color:var(--brass-deep);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(l.label || l.url) + '</span>' +
        '<button class="rm" style="position:static;background:var(--line-strong);color:var(--ink)" onclick="AttachUI.dropLink(' + i + ')">&times;</button></div>';
    }).join('');
  }
  function addLink() {
    var url = document.getElementById('attLinkUrl').value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { alert('Links must start with http:// or https://'); return; }
    pendingLinks.push({ url: url, label: document.getElementById('attLinkLabel').value.trim() });
    setField('attLinkUrl', ''); setField('attLinkLabel', '');
    renderLinkStrip();
  }
  function dropLink(i) { pendingLinks.splice(i, 1); renderLinkStrip(); }

  function submit() {
    var note = document.getElementById('attNote').value.trim();
    if (mode === 'doc') {
      var rec = {
        roomId: ctxId, type: docType,
        refNo: document.getElementById('attRef').value.trim(),
        title: document.getElementById('attTitleField').value.trim(),
        date: document.getElementById('attDate').value,
        notes: note
      };
      Docs.add(rec, pendingFiles, pendingLinks).then(function () { close(); refreshCurrentView(); })
        .catch(function () { alert('Could not save the attachment — device storage may be full.'); });
    } else if (mode === 'response') {
      var resp = { note: note, respondedBy: document.getElementById('attBy').value.trim() };
      RFI.addResponse(ctxId, resp, pendingFiles, pendingLinks).then(function () { close(); refreshCurrentView(); })
        .catch(function () { alert('Could not save the response — device storage may be full.'); });
    } else if (mode === 'clearance') {
      if (!pendingFiles.length && !pendingLinks.length) { close(); return; }
      Clearance.addAttachment(ctxId, ctxItemKey, pendingFiles, pendingLinks).then(function () { close(); refreshCurrentView(); })
        .catch(function () { alert('Could not save the evidence — device storage may be full.'); });
    }
  }
  function delDoc(id) { if (confirm('Delete this attachment? This cannot be undone.')) { Docs.remove(id); refreshCurrentView(); } }

  var camInp = document.getElementById('attCamInput'), upInp = document.getElementById('attUploadInput');
  if (camInp) camInp.addEventListener('change', function () { handleFiles(camInp.files); camInp.value = ''; });
  if (upInp) upInp.addEventListener('change', function () { handleFiles(upInp.files); upInp.value = ''; });

  return {
    openDoc: openDoc, openResponse: openResponse, openClearance: openClearance, close: close, submit: submit,
    dropFile: dropFile, addLink: addLink, dropLink: dropLink, delDoc: delDoc
  };
})();

/* ---------- RFI: new-issue modal ---------- */
var RFIUI = (function () {
  var curRoom = null, pendingPhotos = [], priority = 'normal', category = null;

  function buildChips() {
    document.getElementById('rfiCatChips').innerHTML = RFI_CATEGORIES.map(function (c) {
      return '<div class="chip" data-cat="' + c.id + '" onclick="RFIUI.pickCat(\'' + c.id + '\')">' + esc(c.label) + '</div>';
    }).join('');
    document.getElementById('rfiPriChips').innerHTML =
      '<div class="chip on" data-pri="normal" onclick="RFIUI.pickPri(\'normal\')">Normal</div>' +
      '<div class="chip pri-urgent" data-pri="urgent" onclick="RFIUI.pickPri(\'urgent\')">Urgent</div>';
  }

  function pickCat(id) {
    category = id;
    var chips = document.getElementById('rfiCatChips').children;
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i].dataset.cat === id);
  }
  function pickPri(p) {
    priority = p;
    var chips = document.getElementById('rfiPriChips').children;
    for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('on', chips[i].dataset.pri === p);
  }

  function renderPhotoStrip() {
    var strip = document.getElementById('rfiPhotoStrip');
    strip.innerHTML = pendingPhotos.map(function (p, i) {
      return '<div class="photothumb"><img src="' + p + '"><button class="rm" onclick="RFIUI.dropPhoto(' + i + ')">&times;</button></div>';
    }).join('');
  }
  function dropPhoto(i) { pendingPhotos.splice(i, 1); renderPhotoStrip(); }

  function handleFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    var jobs = files.slice(0, 6 - pendingPhotos.length).map(function (f) { return RFI.compressImage(f); });
    Promise.all(jobs).then(function (urls) {
      pendingPhotos = pendingPhotos.concat(urls);
      renderPhotoStrip();
    }).catch(function () { alert('Could not read that photo.'); });
  }

  function open(roomId) {
    curRoom = roomId; pendingPhotos = []; priority = 'normal'; category = null;
    buildChips();
    pickPri('normal');
    document.getElementById('rfiRoomLabel').textContent = roomId;
    document.getElementById('rfiDesc').value = '';
    document.getElementById('rfiBy').value = '';
    renderPhotoStrip();
    document.getElementById('rfiOverlay').classList.add('show');
  }
  function close() { document.getElementById('rfiOverlay').classList.remove('show'); }

  function submit() {
    if (!category) { alert('Pick the issue type first.'); return; }
    var desc = document.getElementById('rfiDesc').value.trim();
    if (!desc) { alert('Add a short description of the problem.'); return; }
    var rec = {
      roomId: curRoom, category: category, description: desc,
      raisedBy: document.getElementById('rfiBy').value.trim(),
      priority: priority,
      photos: pendingPhotos.map(function (u, i) { return { id: 'p' + i, dataUrl: u }; })
    };
    var saved = RFI.add(rec);
    if (!saved) { alert('Could not save — device storage may be full. Try removing a photo.'); return; }
    close();
    if (location.hash.indexOf('#/room/' + encodeURIComponent(curRoom)) === 0) {
      document.getElementById('rfilist').innerHTML = renderRfiList(curRoom);
    }
  }
  function close_(id) { RFI.setStatus(id, 'closed'); refreshCurrentView(); }
  function reopen(id) { RFI.setStatus(id, 'open'); refreshCurrentView(); }
  function del(id) { if (confirm('Delete this RFI? This cannot be undone.')) { RFI.remove(id); refreshCurrentView(); } }

  var camInp = document.getElementById('rfiCamInput'), upInp = document.getElementById('rfiUploadInput');
  if (camInp) camInp.addEventListener('change', function () { handleFiles(camInp.files); camInp.value = ''; });
  if (upInp) upInp.addEventListener('change', function () { handleFiles(upInp.files); upInp.value = ''; });

  return { open: open, close: close, submit: submit, pickCat: pickCat, pickPri: pickPri, dropPhoto: dropPhoto, close_: close_, reopen: reopen, del: del };
})();

/* ---------- lightbox ---------- */
var Lightbox = (function () {
  function open(photoId, rfiId) {
    var r = RFI.get(rfiId); if (!r) return;
    var p = null;
    for (var i = 0; i < r.photos.length; i++) if (r.photos[i].id === photoId) p = r.photos[i];
    if (!p) return;
    document.getElementById('lbImg').src = p.dataUrl;
    document.getElementById('lbOverlay').classList.add('show');
  }
  function close() { document.getElementById('lbOverlay').classList.remove('show'); }
  return { open: open, close: close };
})();

/* ---------- RFIs tab: project-wide issue log ---------- */
function openRfisTab(filterCat) {
  q.style.display = 'none'; fl.style.display = 'none'; fa.style.display = 'none';
  var items = RFI.all().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
  var c = RFI.counts();
  var h = '<div class="eyebrow" style="padding:4px 2px 0">' + c.open + ' open &middot; ' + c.total + ' total</div>';
  h += '<div class="rfifilterbar"><select id="rfiFilterCat" onchange="applyRfiFilter()"><option value="">All issue types</option>' +
    RFI_CATEGORIES.map(function (cc) { return '<option value="' + cc.id + '"' + (cc.id === filterCat ? ' selected' : '') + '>' + esc(cc.label) + '</option>'; }).join('') + '</select>' +
    '<select id="rfiFilterStatus" onchange="applyRfiFilter()"><option value="">Open + closed</option><option value="open">Open only</option><option value="closed">Closed only</option></select></div>';
  h += '<div style="display:flex;gap:8px;margin-bottom:10px">' +
    '<button class="btn ghost" style="font-size:12.5px;padding:6px 12px" onclick="RFI.exportJson()">&#11015;&#65039; Export JSON</button>' +
    '<button class="btn ghost" style="font-size:12.5px;padding:6px 12px" onclick="document.getElementById(\'rfiImportInput\').click()">&#11014;&#65039; Import JSON</button>' +
    '<input type="file" id="rfiImportInput" accept="application/json" style="display:none" onchange="doRfiImport(this)"></div>';
  h += '<div id="rfiTabList"></div>';
  app.innerHTML = h;
  renderRfiTabList(items, filterCat || '', '');
}
function renderRfiTabList(items, cat, status) {
  var filtered = items.filter(function (r) {
    if (cat && r.category !== cat) return false;
    if (status && r.status !== status) return false;
    return true;
  });
  var box = document.getElementById('rfiTabList');
  if (!filtered.length) { box.innerHTML = '<div class="emptystate"><div class="big">&#128203;</div>No RFIs match this filter.</div>'; return; }
  box.innerHTML = filtered.map(function (r) {
    var d = ROOMS[r.roomId];
    var link = '<div class="small" style="margin:-2px 0 4px"><a href="#/room/' + encodeURIComponent(r.roomId) + '" style="color:var(--brass-deep);font-weight:700;text-decoration:none">' + esc(r.roomId) + '</a>' +
      (d ? ' &middot; ' + esc(d.name || '') + ' (Level ' + esc(d.baseLevel) + ')' : '') + '</div>';
    return link + rfiCardHtml(r);
  }).join('');
}
function applyRfiFilter() {
  var cat = document.getElementById('rfiFilterCat').value;
  var status = document.getElementById('rfiFilterStatus').value;
  renderRfiTabList(RFI.all().sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; }), cat, status);
}
function doRfiImport(inp) {
  var f = inp.files && inp.files[0]; if (!f) return;
  var reader = new FileReader();
  reader.onload = function () {
    RFI.importJson(reader.result, function (err, added) {
      if (err) { alert(err); return; }
      alert(added + ' RFI(s) imported.');
      openRfisTab();
    });
  };
  reader.readAsText(f);
  inp.value = '';
}

/* ---------- Library tab: per-category code schedules ---------- */
var pendingLibCategory = null;
function triggerLibraryUpload(category) {
  pendingLibCategory = category;
  document.getElementById('libraryInput').click();
}
function openLibraryTab() {
  q.style.display = 'none'; fl.style.display = 'none'; fa.style.display = 'none';
  var h = '<div class="eyebrow" style="padding:4px 2px 0">Element code libraries</div>' +
    '<div class="hint" style="font-size:13px;color:var(--ink-soft)">Upload one schedule per category (.xlsx / .xls / .csv with Code, Description, Specification columns). Every room automatically shows the matching entry for its code.</div>';
  LIB_CATEGORIES.forEach(function (c) {
    var m = Library.meta(c.key);
    var entries = m ? Library.entries(c.key) : [];
    h += '<details><summary><span>' + esc(c.label) + (m ? ' <span class="badge">' + m.count + '</span>' : '') + '</span></summary>';
    h += '<div class="body">';
    h += '<div class="small" style="margin-bottom:8px">' + (m ? 'From ' + esc(m.fileName) + ' &middot; uploaded ' + new Date(m.uploadedAt).toLocaleDateString() : 'No schedule uploaded yet.') + '</div>';
    h += '<button class="btn ghost" style="font-size:12.5px;padding:6px 12px" onclick="triggerLibraryUpload(\'' + c.key + '\')">' + (m ? 'Update' : 'Upload') + ' ' + esc(c.label) + ' schedule</button>';
    if (entries.length) {
      h += '<table class="kv" style="margin-top:10px"><tbody>' +
        entries.slice(0, 500).map(function (e) { return row2(e.code, e.description || '\u2013'); }).join('') +
        '</tbody></table>';
    }
    h += '</div></details>';
  });
  app.innerHTML = h;
}
(function () {
  var inp = document.getElementById('libraryInput');
  if (!inp) return;
  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0]; if (!f || !pendingLibCategory) return;
    Library.importFile(pendingLibCategory, f, function (res) {
      inp.value = '';
      if (!res.ok) { alert(res.error); return; }
      alert(res.count + ' code(s) loaded for ' + libCategoryLabel(pendingLibCategory) + '.');
      refreshCurrentView();
    });
  });
})();

/* ---------- Sync settings + status pill ---------- */
var SyncUI = (function () {
  function open() {
    var c = Sync.getCfg() || {};
    document.getElementById('syncToken').value = c.token || '';
    document.getElementById('syncOwner').value = c.owner || 'fadeelhusin';
    document.getElementById('syncRepo').value = c.repo || 'joh-rooms-tracker';
    document.getElementById('syncBranch').value = c.branch || 'main';
    var un = document.getElementById('syncUserName'); if (un) un.value = localStorage.getItem('joh_user_name') || '';
    renderStatus();
    document.getElementById('syncOverlay').classList.add('show');
  }
  function close() { document.getElementById('syncOverlay').classList.remove('show'); }
  function renderStatus() {
    var s = Sync.getStatus();
    var box = document.getElementById('syncStatusBox');
    var lines = [];
    lines.push(s.configured ? 'Sync is set up for this device.' : 'Not set up yet on this device.');
    if (s.lastSyncedAt) lines.push('Last synced: ' + new Date(s.lastSyncedAt).toLocaleString());
    if (s.pending) lines.push(s.pending + ' data set(s) waiting to sync.');
    if (!s.online) lines.push('This device is currently offline.');
    if (s.lastError) lines.push('Last error: ' + s.lastError);
    box.innerHTML = lines.map(function (l) { return esc(l); }).join('<br>');
  }
  function save() {
    var cfg = {
      token: document.getElementById('syncToken').value.trim(),
      owner: document.getElementById('syncOwner').value.trim(),
      repo: document.getElementById('syncRepo').value.trim(),
      branch: document.getElementById('syncBranch').value.trim() || 'main'
    };
    if (!cfg.token || !cfg.owner || !cfg.repo) { alert('Token, repository owner and repository name are all required.'); return; }
    var un = document.getElementById('syncUserName'); if (un && un.value.trim()) localStorage.setItem('joh_user_name', un.value.trim());
    Sync.setCfg(cfg);
    renderStatus();
    Sync.syncNow().then(function (res) {
      renderStatus();
      if (res && res.ok) { close(); refreshCurrentView(); }
      else if (res && res.error) alert('Saved, but the first sync failed:\n' + res.error + '\n\nCheck the token and repository name, then try "Save & sync" again.');
    });
  }
  function disconnect() {
    if (!confirm('Stop syncing on this device? Local data stays as-is.')) return;
    Sync.clearCfg();
    close();
  }
  return { open: open, close: close, save: save, disconnect: disconnect, renderStatus: renderStatus };
})();

function updateSyncPill(status) {
  var pill = document.getElementById('syncPill');
  if (!pill) return;
  status = status || Sync.getStatus();
  pill.className = 'syncpill';
  if (!status.configured) { pill.textContent = '\u2699\uFE0F Set up sync'; return; }
  if (status.syncing) { pill.className += ' pending'; pill.textContent = '\uD83D\uDD04 Syncing\u2026'; return; }
  if (status.lastError) { pill.className += ' err'; pill.textContent = '\u26A0\uFE0F Sync error'; return; }
  if (!status.online) { pill.className += ' pending'; pill.textContent = '\uD83D\uDCF4 Offline' + (status.pending ? ' \u2014 ' + status.pending + ' pending' : ''); return; }
  if (status.pending) { pill.className += ' pending'; pill.textContent = '\u23F3 ' + status.pending + ' pending'; return; }
  pill.className += ' ok';
  pill.textContent = '\u2705 ' + (status.lastSyncedAt ? 'Synced ' + timeAgo(status.lastSyncedAt) : 'Synced');
}
function timeAgo(iso) {
  var s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  var m = Math.round(s / 60); if (m < 60) return m + 'm ago';
  var h = Math.round(m / 60); if (h < 24) return h + 'h ago';
  return Math.round(h / 24) + 'd ago';
}
Sync.onChange(updateSyncPill);
updateSyncPill();
if (Sync.isConfigured()) Sync.syncNow();
setInterval(function () { if (Sync.isConfigured()) updateSyncPill(); }, 15000);

/* ---------- room schedule upload (global) ---------- */
function triggerScheduleUpload() { document.getElementById('scheduleInput').click(); }
(function () {
  var inp = document.getElementById('scheduleInput');
  if (!inp) return;
  inp.addEventListener('change', function () {
    var f = inp.files && inp.files[0]; if (!f) return;
    Schedule.importFile(f, function (res) {
      inp.value = '';
      if (!res.ok) { alert(res.error); return; }
      var msg = res.matched + ' of ' + res.total + ' room rows matched and saved.';
      if (res.unmatchedSample && res.unmatchedSample.length) {
        msg += '\n\nSome room numbers in the file did not match this project, e.g.: ' + res.unmatchedSample.slice(0, 5).join(', ');
      }
      alert(msg);
      route();
    });
  });
})();

boot();

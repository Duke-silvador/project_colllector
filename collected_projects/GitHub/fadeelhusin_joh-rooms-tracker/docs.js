/* ============================================================
   JOH Room Tracker — Room Documents module
   Approved shop drawings, material approvals, and TQs (Technical
   Queries) attached to a room. Metadata in localStorage; the actual
   file goes through FileStore (IndexedDB) since these are often
   multi-MB PDFs. Stored locally until wired to a shared system.
   ============================================================ */
'use strict';

var DOC_TYPES = [
  { key: 'shop_drawing', label: 'Approved Shop Drawing', refLabel: 'Drawing no.' },
  { key: 'material_approval', label: 'Material Approval', refLabel: 'Material code / submittal no.' },
  { key: 'tq', label: 'Technical Query (TQ)', refLabel: 'TQ no.' }
];
function docTypeLabel(key) {
  for (var i = 0; i < DOC_TYPES.length; i++) if (DOC_TYPES[i].key === key) return DOC_TYPES[i].label;
  return key || 'Document';
}

var Docs = (function () {
  var KEY = 'joh_room_docs_v1';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  function byRoom(roomId) {
    return all().filter(function (d) { return d.roomId === roomId; })
      .sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
  }
  function get(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function touch() { if (window.Sync && Sync.markDirty) Sync.markDirty('docs'); }

  /* rec: {roomId,type,refNo,title,date,notes}; files: array of File objects (may be empty);
     links: array of {url,label} (may be empty) */
  function add(rec, files, links) {
    files = files || []; links = links || [];
    return Promise.all(files.map(function (f) { return FileStore.put(f); })).then(function (metas) {
      var list = all();
      rec.id = 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      rec.createdAt = new Date().toISOString();
      rec.updatedAt = rec.createdAt;
      rec.files = metas.map(function (m) { return { fileId: m.id, fileName: m.name, fileType: m.type, fileSize: m.size }; });
      rec.links = links.filter(function (l) { return l && l.url; }).map(function (l) { return { url: l.url, label: l.label || '' }; });
      list.push(rec);
      save(list); touch();
      return rec;
    });
  }
  function remove(id) {
    var rec = get(id);
    var list = all().filter(function (d) { return d.id !== id; });
    save(list); touch();
    if (rec && rec.files) rec.files.forEach(function (f) { FileStore.remove(f.fileId); });
    if (rec && rec.fileId) FileStore.remove(rec.fileId); // legacy single-file records
    return true;
  }
  /* union-merge with a remote list by id; later updatedAt wins */
  function mergeFrom(remoteList) {
    if (!Array.isArray(remoteList)) return all();
    var byId = {};
    all().forEach(function (d) { byId[d.id] = d; });
    remoteList.forEach(function (d) {
      if (!d || !d.id) return;
      var cur = byId[d.id];
      if (!cur || (d.updatedAt || '') > (cur.updatedAt || '')) byId[d.id] = d;
    });
    var merged = Object.keys(byId).map(function (id) { return byId[id]; });
    save(merged);
    return merged;
  }

  /* normalizes a record's attachments to arrays, whether it's the new
     multi-file/link shape or an older single-fileId record */
  function filesOf(d) {
    if (d.files) return d.files;
    if (d.fileId) return [{ fileId: d.fileId, fileName: d.fileName, fileType: d.fileType, fileSize: d.fileSize }];
    return [];
  }
  function linksOf(d) { return d.links || []; }

  return { all: all, byRoom: byRoom, get: get, add: add, remove: remove, mergeFrom: mergeFrom, filesOf: filesOf, linksOf: linksOf };
})();

/* ============================================================
   JOH Room Tracker — RFI module
   Site-issue requests raised against a room: category, description,
   photos (camera or file upload, compressed client-side), status.
   Stored locally (localStorage) so the app keeps working offline.
   Export / Import (JSON) is the hand-off path until online sync
   is wired up — send the export file to the team, or import theirs.
   ============================================================ */
'use strict';

var RFI_CATEGORIES = [
  { id: 'walls', label: 'Walls' },
  { id: 'ceilings', label: 'Ceilings' },
  { id: 'floors', label: 'Floors' },
  { id: 'finishes', label: 'Finishes' },
  { id: 'levels', label: 'Levels / Elevations' },
  { id: 'mep_clash', label: 'MEP Clash' },
  { id: 'clearance', label: 'No Clearance' },
  { id: 'shop_drawing', label: 'No Shop Drawing' },
  { id: 'material_approval', label: 'No Material Approval' },
  { id: 'other', label: 'Other' }
];
function rfiCategoryLabel(id) {
  for (var i = 0; i < RFI_CATEGORIES.length; i++) if (RFI_CATEGORIES[i].id === id) return RFI_CATEGORIES[i].label;
  return id || 'Other';
}

var RFI = (function () {
  var KEY = 'joh_rfis_v1';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function byRoom(roomId) {
    return all().filter(function (r) { return r.roomId === roomId; })
      .sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : 1; });
  }
  function get(id) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function touch() { if (window.Sync && Sync.markDirty) Sync.markDirty('rfis'); }

  function add(rec) {
    var list = all();
    rec.id = 'rfi_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    rec.createdAt = new Date().toISOString();
    rec.updatedAt = rec.createdAt;
    rec.status = 'open';
    list.push(rec);
    var ok = save(list); if (ok) touch();
    return ok ? rec : null;
  }
  function setStatus(id, status) {
    var list = all();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { list[i].status = status; list[i].updatedAt = new Date().toISOString(); break; }
    var ok = save(list); if (ok) touch();
    return ok;
  }
  /* attach a response to an RFI: resp = {note, respondedBy}; files: array of
     File objects (may be empty); links: array of {url,label} (may be empty) */
  function addResponse(id, resp, files, links) {
    files = files || []; links = links || [];
    return Promise.all(files.map(function (f) { return FileStore.put(f); })).then(function (metas) {
      var list = all();
      for (var i = 0; i < list.length; i++) {
        if (list[i].id !== id) continue;
        if (!list[i].responses) list[i].responses = [];
        var r = { id: 'resp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), note: resp.note || '', respondedBy: resp.respondedBy || '', createdAt: new Date().toISOString() };
        r.files = metas.map(function (m) { return { fileId: m.id, fileName: m.name, fileType: m.type }; });
        r.links = links.filter(function (l) { return l && l.url; }).map(function (l) { return { url: l.url, label: l.label || '' }; });
        list[i].responses.push(r);
        list[i].updatedAt = new Date().toISOString();
        save(list); touch();
        return list[i];
      }
      return null;
    });
  }
  function remove(id) {
    var list = all().filter(function (r) { return r.id !== id; });
    var ok = save(list); if (ok) touch();
    return ok;
  }
  /* union-merge with a remote list by id; the record with the later
     updatedAt wins on conflicts. Returns the merged list; also saves
     it locally. Used by Sync — does not itself touch/mark dirty. */
  function mergeFrom(remoteList) {
    if (!Array.isArray(remoteList)) return all();
    var byId = {}, i;
    all().forEach(function (r) { byId[r.id] = r; });
    remoteList.forEach(function (r) {
      if (!r || !r.id) return;
      var cur = byId[r.id];
      if (!cur || (r.updatedAt || '') > (cur.updatedAt || '')) byId[r.id] = r;
    });
    var merged = Object.keys(byId).map(function (id) { return byId[id]; });
    save(merged);
    return merged;
  }
  function counts() {
    var list = all(), open = 0;
    for (var i = 0; i < list.length; i++) if (list[i].status === 'open') open++;
    return { total: list.length, open: open };
  }

  /* Downscale + JPEG-compress an image file so localStorage can hold a
     reasonable number of photos. Returns a Promise<dataURL>. */
  function compressImage(file, maxDim, quality) {
    maxDim = maxDim || 1100; quality = quality || 0.62;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () { img.src = reader.result; };
      img.onerror = reject;
      img.onload = function () {
        var w = img.width, h = img.height, scale = Math.min(1, maxDim / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      reader.readAsDataURL(file);
    });
  }

  function exportJson() {
    var blob = new Blob([JSON.stringify(all(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var d = new Date(), pad = function (n) { return (n < 10 ? '0' : '') + n; };
    a.download = 'JOH-RFIs-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }
  /* merge-import by id; existing ids are left untouched (no overwrite) */
  function importJson(text, cb) {
    var incoming;
    try { incoming = JSON.parse(text); } catch (e) { return cb('That file is not valid JSON.'); }
    if (!Array.isArray(incoming)) return cb('Expected a JSON array of RFIs.');
    var list = all(), have = {}, i;
    for (i = 0; i < list.length; i++) have[list[i].id] = true;
    var added = 0;
    for (i = 0; i < incoming.length; i++) {
      var r = incoming[i];
      if (r && r.id && !have[r.id]) { list.push(r); have[r.id] = true; added++; }
    }
    save(list);
    cb(null, added);
  }

  function responseFilesOf(r) {
    if (r.files) return r.files;
    if (r.fileId) return [{ fileId: r.fileId, fileName: r.fileName, fileType: r.fileType }];
    return [];
  }
  function responseLinksOf(r) { return r.links || []; }

  return {
    all: all, byRoom: byRoom, get: get, add: add, setStatus: setStatus, addResponse: addResponse, remove: remove,
    mergeFrom: mergeFrom, counts: counts, compressImage: compressImage, exportJson: exportJson, importJson: importJson,
    responseFilesOf: responseFilesOf, responseLinksOf: responseLinksOf
  };
})();

/* ============================================================
   JOH Room Tracker — File store
   Raw file/blob storage (shop drawings, material approvals, TQs,
   RFI responses…) via IndexedDB, since these can be multi-MB PDFs
   that would blow past localStorage's ~5-10MB quota. Metadata for
   each attachment (room, type, notes, dates) still lives in
   localStorage next to the record that owns it; this store only
   ever holds { id, blob, name, type, size, createdAt }.
   ============================================================ */
'use strict';

var FileStore = (function () {
  var DB_NAME = 'joh_tracker_files', STORE = 'files', VER = 1;
  var dbp = null;

  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('This browser does not support file storage (IndexedDB).')); return; }
      var req = indexedDB.open(DB_NAME, VER);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('Could not open file storage.')); };
    });
    return dbp;
  }

  function put(file) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var id = 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        var rec = { id: id, blob: file, name: file.name || 'file', type: file.type || '', size: file.size || 0, createdAt: new Date().toISOString() };
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = function () { resolve({ id: id, name: rec.name, type: rec.type, size: rec.size }); };
        tx.onerror = function () { reject(tx.error || new Error('Could not save the file.')); };
      });
    });
  }

  /* store a blob under a caller-chosen id — used when pulling a file
     from the sync remote so existing references (fileId) keep working */
  function putWithId(id, blob, name, type) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var rec = { id: id, blob: blob, name: name || 'file', type: type || blob.type || '', size: blob.size || 0, createdAt: new Date().toISOString() };
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = function () { resolve(rec); };
        tx.onerror = function () { reject(tx.error || new Error('Could not save the file.')); };
      });
    });
  }

  function has(id) {
    return get(id).then(function (rec) { return !!rec; });
  }

  function get(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error || new Error('Could not read the file.')); };
      });
    });
  }

  function remove(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
      });
    });
  }

  /* fetch + open in a new tab / trigger download, whichever the browser prefers */
  function openInNewTab(id) {
    return get(id).then(function (rec) {
      if (!rec) { alert('That file is no longer available on this device.'); return; }
      var url = URL.createObjectURL(rec.blob);
      window.open(url, '_blank');
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    });
  }

  return { put: put, putWithId: putWithId, get: get, has: has, remove: remove, openInNewTab: openInNewTab };
})();

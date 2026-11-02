/* Crown & Kingdoms — IndexedDB backup for manual slots and the rolling autosave.
   localStorage remains the synchronous primary store for compatibility. */
(function () {
  'use strict';
  const DB_NAME = 'ck-persistence-v1';
  const STORE_NAME = 'game-saves';
  let opening = null;

  function openDatabase() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (opening) return opening;
    opening = new Promise((resolve) => {
      let request;
      try { request = window.indexedDB.open(DB_NAME, 1); }
      catch (_) { resolve(null); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => {
        const db = request.result;
        // A different tab may upgrade the database; release the old connection
        // and allow the next backup or restore to open a fresh one.
        db.onversionchange = () => {
          try { db.close(); } catch (_) {}
          opening = null;
        };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    }).catch(() => null).then((db) => {
      // A blocked or temporarily unavailable IndexedDB open must not permanently
      // disable backup and restore attempts until the next page reload.
      if (!db) opening = null;
      return db;
    });
    return opening;
  }

  function mirrorSave(key, value) {
    return openDatabase().then((db) => new Promise((resolve) => {
      if (!db) { resolve(false); return; }
      let tx;
      try {
        tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
      } catch (_) { resolve(false); return; }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    })).catch(() => false);
  }

  const pendingDeletes = new Set();
  const tombstoneKey = (key) => 'ck_deleted_' + key;
  function clearDeletionMarker(key) {
    try { window.localStorage.removeItem(tombstoneKey(key)); } catch (_) {}
  }
  function markDeleted(key) {
    try { window.localStorage.setItem(tombstoneKey(key), '1'); } catch (_) {}
  }
  function deleteSave(key) {
    if (!/^ck_save(?:[2-3])?$/.test(key) && key !== 'ck_autosave') return Promise.resolve(false);
    pendingDeletes.add(key);
    markDeleted(key);
    return openDatabase().then((db) => new Promise((resolve) => {
      if (!db) { resolve(false); return; }
      let tx;
      try { tx = db.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).delete(key); }
      catch (_) { resolve(false); return; }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    })).catch(() => false).then((ok) => { pendingDeletes.delete(key); return ok; });
  }

  function restoreMissing() {
    return openDatabase().then((db) => new Promise((resolve) => {
      if (!db) { resolve(false); return; }
      let tx, restored = 0;
      try {
        tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          const key = cursor.key;
          if (typeof key === 'string' && (/^ck_save(?:[2-3])?$/.test(key) || key === 'ck_autosave')) {
            let existing = null, deleted = true;
            // If storage access is denied, fail closed: never resurrect a
            // potentially deleted backup without checking its tombstone.
            try {
              existing = window.localStorage.getItem(key);
              deleted = window.localStorage.getItem(tombstoneKey(key)) === '1';
            } catch (_) {}
            if (existing == null && !deleted && !pendingDeletes.has(key) && typeof cursor.value === 'string') {
              try { window.localStorage.setItem(key, cursor.value); restored++; } catch (_) {}
            }
          }
          cursor.continue();
        };
        tx.oncomplete = () => { try { if (typeof hs !== 'undefined' && window.localStorage.getItem('ck_autosave')) hs = 1; } catch (_) {} resolve(restored > 0); };
        tx.onerror = () => resolve(false);
        tx.onabort = () => resolve(false);
      } catch (_) { resolve(false); }
    })).catch(() => false);
  }

  window.CK_STORAGE = { mirrorSave, deleteSave, restoreMissing, clearDeletionMarker };
})();

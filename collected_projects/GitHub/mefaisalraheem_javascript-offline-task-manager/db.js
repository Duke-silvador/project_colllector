/* db.js — IndexedDB persistence layer */
(function (global) {
  'use strict';

  const DB_NAME = 'offline-task-manager';
  const DB_VERSION = 1;
  const STORE = 'tasks';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB blocked'));
    });
    return dbPromise;
  }

  function tx(mode) {
    return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  const DB = {
    async getAll() {
      const store = await tx('readonly');
      return reqToPromise(store.getAll());
    },
    async get(id) {
      const store = await tx('readonly');
      return reqToPromise(store.get(id));
    },
    async put(task) {
      const store = await tx('readwrite');
      await reqToPromise(store.put(task));
      return task;
    },
    async delete(id) {
      const store = await tx('readwrite');
      return reqToPromise(store.delete(id));
    },
    async clear() {
      const store = await tx('readwrite');
      return reqToPromise(store.clear());
    },
    async bulkPut(tasks) {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const txn = db.transaction(STORE, 'readwrite');
        const store = txn.objectStore(STORE);
        tasks.forEach((t) => store.put(t));
        txn.oncomplete = () => resolve(tasks);
        txn.onerror = () => reject(txn.error);
        txn.onabort = () => reject(txn.error || new Error('Transaction aborted'));
      });
    },
  };

  global.DB = DB;
})(window);
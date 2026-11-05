/* DebateBase – Datenbankschicht (IndexedDB)
 *
 * Diese Datei kümmert sich nur um das Speichern auf dem Gerät.
 * Die Oberfläche (app.js) ruft ausschließlich die Funktionen von DB auf.
 *
 * Aufbau der Datenbank "debatebase":
 *   entries   Wissenseinträge          Schlüssel: id
 *   args      Argumentationskarten     Schlüssel: id
 *   sources   Quellen                  Schlüssel: id
 *   links     Verknüpfungen            Schlüssel: id
 *   posts     X-Beiträge               Schlüssel: id
 *   topics    Themen (automatisch)     Schlüssel: name
 *   tags      Tags (automatisch)       Schlüssel: name
 *   settings  Einstellungen            Schlüssel: key
 *   meta      Verwaltungsdaten         Schlüssel: key
 *   inbox     Geteilte Beiträge, die noch auf eine Entscheidung warten
 *   backups   Automatische Sicherungen
 */
(function (global) {
  'use strict';

  var DB_NAME = 'debatebase';
  var DB_VERSION = 1;
  var DATA_STORES = ['entries', 'args', 'sources', 'links', 'posts'];
  var ALL_STORES = DATA_STORES.concat(['topics', 'tags', 'settings', 'meta', 'inbox', 'backups']);

  /* Versionierung: Jede spätere Änderung am Aufbau bekommt einen neuen,
     nummerierten Schritt. Beim Öffnen werden alle fehlenden Schritte der
     Reihe nach ausgeführt. Vorhandene Daten bleiben dabei erhalten. */
  var MIGRATIONS = {
    1: function (db) {
      var s;
      s = db.createObjectStore('entries', { keyPath: 'id' });
      s.createIndex('type', 'type');
      s.createIndex('status', 'status');
      s.createIndex('topic', 'topic');
      s.createIndex('tags', 'tags', { multiEntry: true });
      s.createIndex('created', 'created');
      s.createIndex('updated', 'updated');
      s.createIndex('postId', 'postId');

      s = db.createObjectStore('args', { keyPath: 'id' });
      s.createIndex('status', 'status');
      s.createIndex('topic', 'topic');
      s.createIndex('created', 'created');

      s = db.createObjectStore('sources', { keyPath: 'id' });
      s.createIndex('kind', 'kind');
      s.createIndex('url', 'url');

      s = db.createObjectStore('links', { keyPath: 'id' });
      s.createIndex('from', ['fromK', 'fromId']);
      s.createIndex('to', ['toK', 'toId']);
      s.createIndex('type', 'type');

      s = db.createObjectStore('posts', { keyPath: 'id' });
      s.createIndex('tweetId', 'tweetId');
      s.createIndex('created', 'created');

      db.createObjectStore('topics', { keyPath: 'name' });
      db.createObjectStore('tags', { keyPath: 'name' });
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('meta', { keyPath: 'key' });

      s = db.createObjectStore('inbox', { keyPath: 'id' });
      s.createIndex('received', 'received');

      s = db.createObjectStore('backups', { keyPath: 'id' });
      s.createIndex('at', 'at');
    }
  };

  var conn = null;

  /* Verständliche deutsche Fehlermeldungen */
  function explain(err) {
    var name = err && err.name;
    if (name === 'QuotaExceededError') return 'Der Speicher auf dem Gerät ist voll. Die Änderung konnte nicht gespeichert werden.';
    if (name === 'InvalidStateError') return 'Die Datenbank ist nicht verfügbar (z. B. im Inkognito-Modus oder nach einem Update in einem anderen Tab).';
    if (name === 'VersionError') return 'Auf diesem Gerät liegt eine neuere Datenbankversion. Bitte die App neu laden.';
    if (name === 'DataError' || name === 'DataCloneError') return 'Ein Datensatz hat ein ungültiges Format und wurde nicht gespeichert.';
    return (err && err.message) ? err.message : 'Unbekannter Speicherfehler.';
  }

  function open() {
    if (conn) return Promise.resolve(conn);
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error('Dieser Browser unterstützt keine IndexedDB-Datenbank.'));
        return;
      }
      var req;
      try { req = global.indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { reject(new Error(explain(e))); return; }

      req.onupgradeneeded = function (ev) {
        var db = req.result;
        for (var v = (ev.oldVersion || 0) + 1; v <= DB_VERSION; v++) {
          if (MIGRATIONS[v]) MIGRATIONS[v](db, req.transaction);
        }
      };
      req.onsuccess = function () {
        conn = req.result;
        /* Wenn eine neuere App-Version in einem anderen Tab die Datenbank
           umbauen will, geben wir sie frei und bitten um Neuladen. */
        conn.onversionchange = function () {
          conn.close();
          conn = null;
          if (DB.onVersionChange) DB.onVersionChange();
        };
        resolve(conn);
      };
      req.onerror = function () { reject(new Error(explain(req.error))); };
      req.onblocked = function () {
        if (DB.onBlocked) DB.onBlocked();
      };
    });
  }

  function reqP(r) {
    return new Promise(function (res, rej) {
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }

  /* Liest alle Daten in einem einzigen Lesevorgang. */
  function readAll() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(ALL_STORES, 'readonly'), out = {};
        ALL_STORES.forEach(function (name) {
          reqP(tx.objectStore(name).getAll()).then(function (rows) { out[name] = rows; });
        });
        tx.oncomplete = function () { resolve(out); };
        tx.onerror = function () { reject(new Error(explain(tx.error))); };
        tx.onabort = function () { reject(new Error(explain(tx.error))); };
      });
    });
  }

  function getAll(store) {
    return open().then(function (db) {
      return reqP(db.transaction(store, 'readonly').objectStore(store).getAll());
    });
  }

  /* Schreibt eine Gruppe von Änderungen als EINE Transaktion:
     Entweder wird alles gespeichert oder gar nichts.
     changes = { clear: [store], del: {store: [id]}, put: {store: [obj]} } */
  function write(changes) {
    changes = changes || {};
    var clear = changes.clear || [], del = changes.del || {}, put = changes.put || {};
    var names = {};
    clear.forEach(function (n) { names[n] = 1; });
    Object.keys(del).forEach(function (n) { if (del[n].length) names[n] = 1; });
    Object.keys(put).forEach(function (n) { if (put[n].length) names[n] = 1; });
    var stores = Object.keys(names);
    if (!stores.length) return Promise.resolve();
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx;
        try { tx = db.transaction(stores, 'readwrite'); }
        catch (e) { reject(new Error(explain(e))); return; }
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(new Error(explain(tx.error))); };
        tx.onabort = function () { reject(new Error(explain(tx.error))); };
        try {
          clear.forEach(function (n) { tx.objectStore(n).clear(); });
          Object.keys(del).forEach(function (n) {
            if (!del[n].length) return;
            var st = tx.objectStore(n);
            del[n].forEach(function (id) { st.delete(id); });
          });
          Object.keys(put).forEach(function (n) {
            if (!put[n].length) return;
            var st = tx.objectStore(n);
            put[n].forEach(function (o) { st.put(o); });
          });
        } catch (e) {
          try { tx.abort(); } catch (e2) { /* bereits abgebrochen */ }
          reject(new Error(explain(e)));
        }
      });
    });
  }

  /* Bittet den Browser, die Daten nicht automatisch zu löschen,
     wenn der Speicher knapp wird. Chrome entscheidet selbst. */
  function requestPersist() {
    var st = global.navigator && global.navigator.storage;
    if (!st || !st.persist) return Promise.resolve(null);
    return st.persisted().then(function (p) { return p ? true : st.persist(); }).catch(function () { return null; });
  }

  function estimate() {
    var st = global.navigator && global.navigator.storage;
    if (!st || !st.estimate) return Promise.resolve(null);
    return st.estimate().catch(function () { return null; });
  }

  var DB = {
    NAME: DB_NAME,
    VERSION: DB_VERSION,
    DATA_STORES: DATA_STORES,
    ALL_STORES: ALL_STORES,
    open: open,
    readAll: readAll,
    getAll: getAll,
    write: write,
    requestPersist: requestPersist,
    estimate: estimate,
    explain: explain,
    onBlocked: null,
    onVersionChange: null
  };
  global.DB = DB;
})(typeof self !== 'undefined' ? self : this);

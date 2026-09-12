/* ============================================================
   JOH Room Tracker — Sync module
   Syncs local data (RFIs, Documents, Room Schedule, Item Library,
   and their file attachments) to a GitHub repo via the REST API,
   directly from the browser — no server needed. The GitHub token
   is entered once by the user and stored ONLY in this browser's
   localStorage; it is sent only to api.github.com over HTTPS.

   Strategy:
   - RFIs / Documents: array data, merged by id — the record with
     the later `updatedAt` wins on conflict (safe union, since adds
     from different devices never collide).
   - Room Schedule / Item Library: bulk-imported spreadsheets, so
     synced as "whichever upload is newer wins" per dataset
     (Room Schedule) or per category (Item Library).
   - File attachments (shop drawings, TQs, RFI response files) live
     in IndexedDB (FileStore) and are uploaded/downloaded by id
     alongside the JSON metadata that references them.

   Runs automatically: shortly after every local change (debounced),
   whenever the browser regains connectivity, and on a 2-minute
   safety-net timer while online. A manual Sync.syncNow() is also
   available from the UI.
   ============================================================ */
'use strict';

var Sync = (function () {
  var CFG_KEY = 'joh_sync_cfg_v1';
  var STATE_KEY = 'joh_sync_state_v1';
  var DATA_DIR = 'tracker-data';
  var listeners = [];
  var syncing = false;
  var scheduleTimer = null;

  function getCfg() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) { return null; } }
  function setCfg(cfg) { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); notify(); scheduleSync(300); }
  function clearCfg() { localStorage.removeItem(CFG_KEY); notify(); }
  function isConfigured() { var c = getCfg(); return !!(c && c.token && c.owner && c.repo); }

  function getState() { try { return JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch (e) { return {}; } }
  function setState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); notify(); }

  function markDirty(dataset) {
    var s = getState();
    s.dirty = s.dirty || {};
    s.dirty[dataset] = true;
    setState(s);
    scheduleSync(1200); // small debounce so rapid successive edits batch into one sync
  }

  function onChange(fn) { listeners.push(fn); }
  function notify() {
    var st = getStatus();
    listeners.forEach(function (fn) { try { fn(st); } catch (e) { /* ignore listener errors */ } });
  }

  function getStatus() {
    var s = getState();
    var dirtyCount = s.dirty ? Object.keys(s.dirty).filter(function (k) { return s.dirty[k]; }).length : 0;
    return {
      configured: isConfigured(),
      syncing: syncing,
      lastSyncedAt: s.lastSyncedAt || null,
      pending: dirtyCount,
      lastError: s.lastError || null,
      online: navigator.onLine
    };
  }

  function scheduleSync(delay) {
    if (!isConfigured()) return;
    if (scheduleTimer) clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(function () { scheduleTimer = null; syncAll(); }, delay == null ? 500 : delay);
  }

  /* ---------------- GitHub REST helpers ---------------- */
  function api(path) {
    var c = getCfg();
    return 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path;
  }
  function ghHeaders() {
    var c = getCfg();
    return { 'Authorization': 'token ' + c.token, 'Accept': 'application/vnd.github+json' };
  }
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    var bin = atob(b64.replace(/\n/g, '')), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function blobToB64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onerror = reject;
      r.onload = function () { resolve(r.result.split(',')[1]); };
      r.readAsDataURL(blob);
    });
  }
  function extFor(name, type) {
    var m = name && /\.[a-zA-Z0-9]+$/.exec(name);
    if (m) return m[0];
    if (type === 'application/pdf') return '.pdf';
    if (/^image\//.test(type || '')) return '.jpg';
    return '';
  }

  function getRemoteJson(path) {
    var c = getCfg();
    return fetch(api(path) + '?ref=' + encodeURIComponent(c.branch || 'main'), { headers: ghHeaders() })
      .then(function (res) {
        if (res.status === 404) return { json: null, sha: null };
        if (!res.ok) return res.text().then(function (t) { throw new Error('GitHub read failed (' + res.status + '): ' + t.slice(0, 200)); });
        return res.json().then(function (body) { return { json: JSON.parse(b64ToUtf8(body.content)), sha: body.sha }; });
      });
  }
  function putJson(path, obj, sha, message, retried) {
    var c = getCfg();
    var body = { message: message || ('Update ' + path), content: utf8ToB64(JSON.stringify(obj, null, 2)), branch: c.branch || 'main' };
    if (sha) body.sha = sha;
    return fetch(api(path), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()), body: JSON.stringify(body) })
      .then(function (res) {
        if ((res.status === 409 || res.status === 422) && !retried) {
          return getRemoteJson(path).then(function (cur) { return putJson(path, obj, cur.sha, message, true); });
        }
        if (!res.ok) return res.text().then(function (t) { throw new Error('GitHub write failed (' + res.status + '): ' + t.slice(0, 200)); });
        return res.json();
      });
  }
  function getRemoteMeta(path) {
    var c = getCfg();
    return fetch(api(path) + '?ref=' + encodeURIComponent(c.branch || 'main'), { headers: ghHeaders() })
      .then(function (res) { if (res.status === 404) return null; if (!res.ok) return null; return res.json(); });
  }
  function putBlob(path, blob, message) {
    var c = getCfg();
    return blobToB64(blob).then(function (b64content) {
      return getRemoteMeta(path).then(function (existing) {
        var body = { message: message || ('Add ' + path), content: b64content, branch: c.branch || 'main' };
        if (existing && existing.sha) body.sha = existing.sha;
        return fetch(api(path), { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()), body: JSON.stringify(body) })
          .then(function (res) { if (!res.ok) return res.text().then(function (t) { throw new Error('upload failed (' + res.status + '): ' + t.slice(0, 200)); }); return res.json(); });
      });
    });
  }
  function getBlob(path) {
    var c = getCfg();
    return fetch(api(path) + '?ref=' + encodeURIComponent(c.branch || 'main'), { headers: ghHeaders() })
      .then(function (res) { if (res.status === 404) return null; if (!res.ok) throw new Error('get file failed (' + res.status + ')'); return res.json(); })
      .then(function (meta) { if (!meta) return null; return fetch(meta.download_url).then(function (r2) { return r2.blob(); }).then(function (blob) { return { blob: blob, meta: meta }; }); });
  }

  /* ---------------- per-dataset sync ---------------- */
  function syncRfis() {
    return getRemoteJson(DATA_DIR + '/rfis.json').then(function (remote) {
      var merged = RFI.mergeFrom(remote.json || []);
      return putJson(DATA_DIR + '/rfis.json', merged, remote.sha, 'Sync RFIs');
    });
  }
  function syncDocsMeta() {
    return getRemoteJson(DATA_DIR + '/docs.json').then(function (remote) {
      var merged = Docs.mergeFrom(remote.json || []);
      return putJson(DATA_DIR + '/docs.json', merged, remote.sha, 'Sync documents');
    });
  }
  function syncSchedule() {
    return getRemoteJson(DATA_DIR + '/room-schedule.json').then(function (remote) {
      var remoteBody = remote.json;
      if (remoteBody && remoteBody.meta) Schedule.applyRemote(remoteBody.data, remoteBody.meta);
      var localMeta = Schedule.meta();
      if (localMeta && (!remoteBody || !remoteBody.meta || localMeta.uploadedAt > remoteBody.meta.uploadedAt)) {
        return putJson(DATA_DIR + '/room-schedule.json', { data: Schedule.all(), meta: localMeta }, remote.sha, 'Sync room schedule');
      }
    });
  }
  function syncLibrary() {
    return getRemoteJson(DATA_DIR + '/library.json').then(function (remote) {
      var remoteBody = remote.json || {};
      LIB_CATEGORIES.forEach(function (c) {
        var rc = remoteBody[c.key];
        if (rc && rc.meta) Library.applyRemoteCategory(c.key, rc.data, rc.meta);
      });
      var payload = {};
      LIB_CATEGORIES.forEach(function (c) {
        var m = Library.meta(c.key);
        if (m) payload[c.key] = { data: Library.allData()[c.key] || {}, meta: m };
      });
      return putJson(DATA_DIR + '/library.json', payload, remote.sha, 'Sync item library');
    });
  }
  function syncClearance() {
    return getRemoteJson(DATA_DIR + '/clearance.json').then(function (remote) {
      var merged = Clearance.mergeFrom(remote.json || {});
      return putJson(DATA_DIR + '/clearance.json', merged, remote.sha, 'Sync clearance status');
    });
  }

  /* file attachments referenced by Documents, RFI responses, and Clearance evidence
     (handles both the current multi-file/link shape and older single-file records) */
  function collectFileRefs() {
    var refs = {};
    Docs.all().forEach(function (d) { Docs.filesOf(d).forEach(function (f) { if (f.fileId) refs[f.fileId] = { name: f.fileName, type: f.fileType }; }); });
    RFI.all().forEach(function (r) { (r.responses || []).forEach(function (rp) { RFI.responseFilesOf(rp).forEach(function (f) { if (f.fileId) refs[f.fileId] = { name: f.fileName, type: f.fileType }; }); }); });
    var clr = Clearance.all();
    Object.keys(clr).forEach(function (roomId) {
      Object.keys(clr[roomId]).forEach(function (itemKey) {
        (clr[roomId][itemKey].attachments || []).forEach(function (a) { if (a.type === 'file' && a.fileId) refs[a.fileId] = { name: a.fileName, type: a.fileType }; });
      });
    });
    try {
      var notes = JSON.parse(localStorage.getItem('joh_room_notes_v1') || '{}');
      Object.keys(notes).forEach(function (code) {
        (notes[code] || []).forEach(function (n) { (n.media || []).forEach(function (m) { if (m.fileId) refs[m.fileId] = { name: m.name, type: m.type }; }); });
      });
    } catch (e) {}
    return refs;
  }
  function syncFiles() {
    var refs = collectFileRefs(), ids = Object.keys(refs);
    var s = getState(); s.uploadedFileIds = s.uploadedFileIds || [];
    var uploaded = {}; s.uploadedFileIds.forEach(function (id) { uploaded[id] = true; });

    return ids.reduce(function (chain, id) {
      return chain.then(function () {
        return FileStore.get(id).then(function (rec) {
          if (rec && !uploaded[id]) {
            var path = DATA_DIR + '/files/' + id + extFor(rec.name, rec.type);
            return putBlob(path, rec.blob, 'Add attachment ' + id).then(function () { uploaded[id] = true; }).catch(function () {});
          }
          if (!rec) {
            var path2 = DATA_DIR + '/files/' + id + extFor(refs[id].name, refs[id].type);
            return getBlob(path2).then(function (res) {
              if (res) return FileStore.putWithId(id, res.blob, refs[id].name, refs[id].type).then(function () { uploaded[id] = true; });
            }).catch(function () {});
          }
        });
      });
    }, Promise.resolve()).then(function () {
      s.uploadedFileIds = Object.keys(uploaded);
      setState(s);
    });
  }

  /* progress (per-room per-activity %): merge cell-by-cell, latest wins */
  function syncProgress() {
    return getRemoteJson(DATA_DIR + '/progress.json').then(function (remote) {
      var rem = remote.json || {};
      var loc = {}; try { loc = JSON.parse(localStorage.getItem('joh_progress_v1') || '{}'); } catch (e) {}
      var merged = mergeDeep(rem, loc);
      localStorage.setItem('joh_progress_v1', JSON.stringify(merged));
      return putJson(DATA_DIR + '/progress.json', merged, remote.sha, 'Sync site progress');
    });
  }
  /* room-info edits: merge per room per field */
  function syncRoomInfo() {
    return getRemoteJson(DATA_DIR + '/roominfo.json').then(function (remote) {
      var rem = remote.json || {};
      var loc = {}; try { loc = JSON.parse(localStorage.getItem('joh_roominfo_edits_v1') || '{}'); } catch (e) {}
      var merged = mergeDeep(rem, loc);
      localStorage.setItem('joh_roominfo_edits_v1', JSON.stringify(merged));
      return putJson(DATA_DIR + '/roominfo.json', merged, remote.sha, 'Sync room info edits');
    });
  }
  /* site notes: array per room, merged by note id (safe union across devices) */
  function syncNotes() {
    return getRemoteJson(DATA_DIR + '/notes.json').then(function (remote) {
      var rem = remote.json || {};
      var loc = {}; try { loc = JSON.parse(localStorage.getItem('joh_room_notes_v1') || '{}'); } catch (e) {}
      var merged = {};
      Object.keys(rem).concat(Object.keys(loc)).forEach(function (code) {
        var seen = {}, out = [];
        (rem[code] || []).concat(loc[code] || []).forEach(function (n) {
          if (!seen[n.id] || (n.at || '') > (seen[n.id].at || '')) { seen[n.id] = n; }
        });
        Object.keys(seen).forEach(function (id) { out.push(seen[id]); });
        out.sort(function (a, b) { return (b.no || 0) - (a.no || 0); });
        merged[code] = out;
      });
      localStorage.setItem('joh_room_notes_v1', JSON.stringify(merged));
      return putJson(DATA_DIR + '/notes.json', merged, remote.sha, 'Sync site notes');
    });
  }
  /* deep-merge helper: local values win on leaf conflicts */
  function mergeDeep(base, over) {
    var out = {};
    Object.keys(base || {}).forEach(function (k) { out[k] = base[k]; });
    Object.keys(over || {}).forEach(function (k) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k]) && out[k] && typeof out[k] === 'object') {
        out[k] = mergeDeep(out[k], over[k]);
      } else { out[k] = over[k]; }
    });
    return out;
  }

  function syncAll() {
    if (!isConfigured() || syncing || !navigator.onLine) return Promise.resolve({ skipped: true });
    syncing = true; notify();
    return syncRfis().then(syncDocsMeta).then(syncSchedule).then(syncLibrary).then(syncClearance).then(syncProgress).then(syncRoomInfo).then(syncNotes).then(syncFiles)
      .then(function () {
        var s = getState();
        s.lastSyncedAt = new Date().toISOString(); s.dirty = {}; s.lastError = null;
        syncing = false; setState(s);
        return { ok: true };
      })
      .catch(function (err) {
        var s = getState();
        s.lastError = String((err && err.message) || err);
        syncing = false; setState(s);
        return { ok: false, error: s.lastError };
      });
  }

  window.addEventListener('online', function () { scheduleSync(500); });
  window.addEventListener('offline', notify);
  setInterval(function () { if (isConfigured() && navigator.onLine) scheduleSync(0); }, 120000);

  return {
    getCfg: getCfg, setCfg: setCfg, clearCfg: clearCfg, isConfigured: isConfigured,
    getStatus: getStatus, onChange: onChange, markDirty: markDirty, syncNow: syncAll
  };
})();

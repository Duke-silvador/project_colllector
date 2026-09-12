/* ============================================================
   JOH Room Tracker — Clearance Status module
   A per-room handover checklist: MEP closed, waterproofing tested,
   shop drawing approved, etc. Each item can be checked/unchecked and
   carries its own evidence — one or more files (photos, PDFs) and/or
   links — proving that item is cleared for handover.
   Stored locally; syncs like everything else once configured.
   ============================================================ */
'use strict';

var CLEARANCE_ITEMS = [
  { key: 'mep_closed', label: 'MEP above ceiling closed (first fix + testing)' },
  { key: 'blockwork_plaster', label: 'Blockwork & plaster complete' },
  { key: 'waterproofing', label: 'Waterproofing tested (wet areas)' },
  { key: 'screed', label: 'Screed / substrate ready for flooring' },
  { key: 'shop_drawing', label: 'Shop drawing approved' },
  { key: 'material_approval', label: 'Material approval obtained' },
  { key: 'mep_clash', label: 'MEP clashes resolved' },
  { key: 'snagging', label: 'Snagging closed' },
  { key: 'clean_dust_free', label: 'Clean, dust-free & climate controlled' },
  { key: 'access_possession', label: 'Access & possession handed over' }
];
function clearanceItemLabel(key) {
  for (var i = 0; i < CLEARANCE_ITEMS.length; i++) if (CLEARANCE_ITEMS[i].key === key) return CLEARANCE_ITEMS[i].label;
  return key;
}

var Clearance = (function () {
  var KEY = 'joh_clearance_v1'; // { roomId: { itemKey: {checked,checkedBy,updatedAt,attachments:[...]} } }

  function all() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(data) { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { return false; } }
  function touch() { if (window.Sync && Sync.markDirty) Sync.markDirty('clearance'); }

  function forRoom(roomId) { return (all()[roomId]) || {}; }
  function itemStatus(roomId, itemKey) {
    var r = forRoom(roomId);
    return r[itemKey] || { checked: false, attachments: [] };
  }
  function roomProgress(roomId) {
    var r = forRoom(roomId), done = 0;
    CLEARANCE_ITEMS.forEach(function (it) { if (r[it.key] && r[it.key].checked) done++; });
    return { done: done, total: CLEARANCE_ITEMS.length };
  }

  function setChecked(roomId, itemKey, checked, checkedBy) {
    var data = all();
    data[roomId] = data[roomId] || {};
    var cur = data[roomId][itemKey] || { attachments: [] };
    cur.checked = !!checked;
    cur.checkedBy = checkedBy || cur.checkedBy || '';
    cur.updatedAt = new Date().toISOString();
    data[roomId][itemKey] = cur;
    save(data); touch();
    return cur;
  }

  /* files: array of File objects (may be empty); links: array of {url,label} (may be empty) */
  function addAttachment(roomId, itemKey, files, links) {
    files = files || []; links = links || [];
    return Promise.all(files.map(function (f) { return FileStore.put(f); })).then(function (metas) {
      var data = all();
      data[roomId] = data[roomId] || {};
      var cur = data[roomId][itemKey] || { checked: false, attachments: [] };
      cur.attachments = cur.attachments || [];
      metas.forEach(function (m) {
        cur.attachments.push({ id: 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'file', fileId: m.id, fileName: m.name, fileType: m.type });
      });
      links.filter(function (l) { return l && l.url; }).forEach(function (l) {
        cur.attachments.push({ id: 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'link', url: l.url, label: l.label || '' });
      });
      cur.updatedAt = new Date().toISOString();
      data[roomId][itemKey] = cur;
      save(data); touch();
      return cur;
    });
  }
  function removeAttachment(roomId, itemKey, attId) {
    var data = all();
    var cur = data[roomId] && data[roomId][itemKey];
    if (!cur) return false;
    var att = (cur.attachments || []).filter(function (a) { return a.id === attId; })[0];
    cur.attachments = (cur.attachments || []).filter(function (a) { return a.id !== attId; });
    cur.updatedAt = new Date().toISOString();
    save(data); touch();
    if (att && att.type === 'file' && att.fileId) FileStore.remove(att.fileId);
    return true;
  }

  /* union-merge with a remote {roomId:{itemKey:status}} tree; per item,
     the side with the later updatedAt wins */
  function mergeFrom(remoteData) {
    if (!remoteData || typeof remoteData !== 'object') return all();
    var local = all();
    Object.keys(remoteData).forEach(function (roomId) {
      local[roomId] = local[roomId] || {};
      var remoteRoom = remoteData[roomId] || {};
      Object.keys(remoteRoom).forEach(function (itemKey) {
        var remoteItem = remoteRoom[itemKey], localItem = local[roomId][itemKey];
        if (!localItem || (remoteItem.updatedAt || '') > (localItem.updatedAt || '')) local[roomId][itemKey] = remoteItem;
      });
    });
    save(local);
    return local;
  }

  return {
    forRoom: forRoom, itemStatus: itemStatus, roomProgress: roomProgress, setChecked: setChecked,
    addAttachment: addAttachment, removeAttachment: removeAttachment, mergeFrom: mergeFrom, all: all
  };
})();

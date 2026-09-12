/* ============================================================
   JOH Room Tracker — Room Site Notes (added)
   Numbered site notes/comments per room. Each note can carry:
   text comment, voice note, video, captured photos, uploaded files.
   Metadata in localStorage; media blobs in FileStore (IndexedDB).
   ============================================================ */
'use strict';
var Notes = (function () {
  var KEY = 'joh_room_notes_v1';
  function all() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); if (window.Sync && Sync.markDirty) Sync.markDirty('notes'); } catch (e) {} }
  function forRoom(code) { var o = all(); return o[code] || []; }
  function nextNo(code) { var l = forRoom(code); return l.length ? Math.max.apply(null, l.map(function (n) { return n.no; })) + 1 : 1; }

  function addNote(code) {
    var o = all(); o[code] = o[code] || [];
    var note = { no: nextNo(code), id: 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: '', media: [], by: (localStorage.getItem('joh_user_name') || ''), at: new Date().toISOString() };
    o[code].unshift(note); save(o); return note;
  }
  function updateText(code, id, text, by) {
    var o = all(); (o[code] || []).forEach(function (n) { if (n.id === id) { n.text = text; if (by) n.by = by; n.at = new Date().toISOString(); } }); save(o);
  }
  function attachMedia(code, id, kind, fileMeta) {
    var o = all(); (o[code] || []).forEach(function (n) { if (n.id === id) { n.media.push({ kind: kind, fileId: fileMeta.id, name: fileMeta.name, type: fileMeta.type, size: fileMeta.size }); } }); save(o);
  }
  function removeMedia(code, id, fileId) {
    var o = all(); (o[code] || []).forEach(function (n) { if (n.id === id) { n.media = n.media.filter(function (m) { return m.fileId !== fileId; }); } });
    save(o); if (window.FileStore) FileStore.remove(fileId);
  }
  function removeNote(code, id) {
    var o = all(); var note = (o[code] || []).filter(function (n) { return n.id === id; })[0];
    if (note && window.FileStore) note.media.forEach(function (m) { FileStore.remove(m.fileId); });
    o[code] = (o[code] || []).filter(function (n) { return n.id !== id; }); save(o);
  }

  /* ---------------- UI ---------------- */
  function sectionHTML(code) {
    return '<h2 class="sec" style="display:flex;align-items:center;justify-content:space-between">Room Site Notes' +
      '<button class="btn" style="font-size:12.5px;padding:6px 12px" onclick="Notes.add(\'' + code + '\')">+ New Note</button></h2>' +
      '<div id="notesList"></div>';
  }
  function render(code) {
    var box = document.getElementById('notesList'); if (!box) return;
    var list = forRoom(code);
    if (!list.length) { box.innerHTML = '<div class="card small">No site notes yet. Tap <b>+ New Note</b> to add a numbered comment, voice note, video, photo or file.</div>'; return; }
    box.innerHTML = list.map(function (n) { return noteCard(code, n); }).join('');
    list.forEach(function (n) { wireNote(code, n.id); });
  }
  function noteCard(code, n) {
    var media = n.media.map(function (m) {
      return '<span class="noteMedia" data-fid="' + m.fileId + '" style="display:inline-flex;align-items:center;gap:4px;background:#efe9df;border:1px solid var(--line);border-radius:6px;padding:4px 8px;margin:3px 4px 0 0;font-size:11.5px;cursor:pointer">' +
        icon(m.kind) + esc(shortName(m)) + ' <b class="rmMedia" data-fid="' + m.fileId + '" style="color:var(--red);margin-left:3px">&times;</b></span>';
    }).join('');
    return '<div class="card noteItem" data-id="' + n.id + '" style="margin:6px 0;padding:11px 13px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<span style="font-weight:800"><span style="background:var(--brass);color:#fff;border-radius:6px;padding:1px 8px;margin-right:7px">#' + n.no + '</span>' +
      '<span style="font-size:11px;color:var(--ink-soft)">' + esc((n.by || 'site')) + ' &middot; ' + fmtDate(n.at) + '</span></span>' +
      '<button class="rmNote btn ghost" style="font-size:11px;padding:3px 9px" data-id="' + n.id + '">Delete</button></div>' +
      '<textarea class="noteText" data-id="' + n.id + '" rows="2" placeholder="Write a comment&hellip;" ' +
      'style="width:100%;border:1px solid var(--line);border-radius:7px;padding:8px;font-family:inherit;font-size:13px;resize:vertical">' + esc(n.text || '') + '</textarea>' +
      '<div class="noteBtns" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">' +
      mbtn('voice', '&#127908; Voice') + mbtn('video', '&#127909; Video') + mbtn('photo', '&#128247; Photo') + mbtn('file', '&#128193; File') +
      '<button class="noteSave btn" data-id="' + n.id + '" style="font-size:12px;padding:6px 14px;margin-left:auto">Save</button></div>' +
      '<div class="noteMediaStrip" style="margin-top:7px">' + media + '</div>' +
      '</div>';
  }
  function mbtn(kind, label) { return '<button class="noteCap btn ghost" data-kind="' + kind + '" style="font-size:12px;padding:6px 11px">' + label + '</button>'; }
  function icon(k) { return k === 'voice' ? '&#127908;' : k === 'video' ? '&#127909;' : k === 'photo' ? '&#128247;' : '&#128196;'; }
  function shortName(m) { var n = m.name || m.kind; return n.length > 18 ? n.slice(0, 16) + '…' : n; }
  function fmtDate(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return ''; } }

  function wireNote(code, id) {
    var card = document.querySelector('.noteItem[data-id="' + id + '"]'); if (!card) return;
    card.querySelector('.noteSave').onclick = function () {
      var t = card.querySelector('.noteText').value;
      var by = localStorage.getItem('joh_user_name') || prompt('Your name (saved on this device):') || '';
      if (by) localStorage.setItem('joh_user_name', by);
      updateText(code, id, t, by); render(code);
    };
    card.querySelector('.rmNote').onclick = function () { if (confirm('Delete note #?')) { removeNote(code, id); render(code); } };
    card.querySelectorAll('.noteCap').forEach(function (b) {
      b.onclick = function () { capture(code, id, b.dataset.kind); };
    });
    card.querySelectorAll('.rmMedia').forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); removeMedia(code, id, b.dataset.fid); render(code); };
    });
    card.querySelectorAll('.noteMedia').forEach(function (s) {
      s.onclick = function () { if (window.FileStore) FileStore.openInNewTab(s.dataset.fid); };
    });
  }

  function capture(code, id, kind) {
    var inp = document.createElement('input'); inp.type = 'file';
    if (kind === 'voice') { inp.accept = 'audio/*'; inp.capture = 'microphone'; }
    else if (kind === 'video') { inp.accept = 'video/*'; inp.capture = 'environment'; }
    else if (kind === 'photo') { inp.accept = 'image/*'; inp.capture = 'environment'; }
    else { inp.accept = '.pdf,image/*,audio/*,video/*,.doc,.docx,.xls,.xlsx'; inp.multiple = true; }
    inp.onchange = function () {
      var files = [].slice.call(inp.files || []);
      if (!files.length) return;
      Promise.all(files.map(function (f) { return FileStore.put(f); })).then(function (metas) {
        metas.forEach(function (m) { attachMedia(code, id, kind, m); });
        render(code);
      }).catch(function (e) { alert('Could not save media: ' + e.message); });
    };
    inp.click();
  }

  return { forRoom: forRoom, sectionHTML: sectionHTML, render: render,
    add: function (code) { addNote(code); render(code); } };
})();

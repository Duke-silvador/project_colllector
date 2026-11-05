/* DebateBase – Import, Migration und Wiederherstellung
 *
 * Ablauf:
 *   1. parse()    Text einlesen (JSON)
 *   2. analyze()  Format erkennen und alles prüfen, OHNE etwas zu verändern
 *   3. build()    festlegen, was geschrieben wird (je nach deiner Entscheidung bei Konflikten)
 *   4. (app.js)   Sicherung anlegen und alles in EINER Transaktion speichern
 *   5. verify()   gespeicherte Daten neu lesen und Datensatz für Datensatz vergleichen
 *
 * Grundsatz: Inhalte werden unverändert übernommen, auch Felder, die DebateBase
 * nicht kennt. Auffälligkeiten werden gemeldet, nicht stillschweigend „repariert“.
 */
(function (global) {
  'use strict';

  var COLS = ['entries', 'sources', 'args', 'links', 'posts'];
  var LABEL = { entries: 'Wissenseinträge', sources: 'Quellen', args: 'Argumentationskarten', links: 'Verknüpfungen', posts: 'X-Beiträge' };
  var ONE = { entries: 'Eintrag', sources: 'Quelle', args: 'Karte', links: 'Verknüpfung', posts: 'X-Beitrag' };
  var ARRAY_FIELDS = { entries: ['tags', 'sourceIds'], args: ['sourceIds'], posts: ['convertedTo'], sources: [], links: [] };

  /* ---------- Hilfen ---------- */
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function str(v) { return typeof v === 'string' ? v : ''; }
  /* Vergleich unabhängig von der Reihenfolge der Felder */
  function stable(v) {
    if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function name(col, o) {
    var t = o && (o.title || o.text || o.url || '');
    t = String(t).replace(/\s+/g, ' ').trim();
    if (t.length > 60) t = t.slice(0, 57) + '…';
    return ONE[col] + (t ? ' „' + t + '“' : ' ' + (o && o.id ? o.id : ''));
  }
  function newId(prefix, taken) {
    var id;
    do { id = prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); } while (taken[id]);
    taken[id] = 1;
    return id;
  }

  /* ---------- 1. Einlesen ---------- */
  function parse(text) {
    text = String(text || '').replace(/^﻿/, '').trim();
    if (!text) return { ok: false, error: 'Es wurde kein Text eingefügt und keine Datei gewählt.' };
    try { return { ok: true, data: JSON.parse(text), size: text.length }; }
    catch (e) {
      var hint = '';
      if (text[0] !== '{') hint = ' Der Text muss mit „{“ beginnen. Wurde vielleicht nur ein Teil kopiert?';
      else if (text[text.length - 1] !== '}') hint = ' Der Text endet nicht mit „}“. Wahrscheinlich wurde er beim Kopieren abgeschnitten.';
      return { ok: false, error: 'Das ist kein gültiges JSON (' + e.message + ').' + hint };
    }
  }

  /* ---------- Format erkennen ---------- */
  function detect(d) {
    if (!isObj(d)) return { ok: false, error: 'Die Datei enthält kein DebateBase-Objekt.' };
    if (d.app && d.app !== 'DebateBase') return { ok: false, error: 'Die Datei stammt nicht aus DebateBase (Absender: „' + d.app + '“).' };
    var bad = COLS.filter(function (k) { return d[k] != null && !Array.isArray(d[k]); });
    if (bad.length) return { ok: false, error: 'Diese Bereiche müssen Listen sein: ' + bad.join(', ') + '.' };
    if (!COLS.some(function (k) { return Array.isArray(d[k]); })) return { ok: false, error: 'Es wurden keine Datensätze gefunden (erwartet: entries, sources, args, links, posts).' };
    var label, version;
    if (d.version === 3) { version = 3; label = 'DebateBase 3 (Sicherungsdatei)'; }
    else if (d.version === 2 || Array.isArray(d.links) || Array.isArray(d.posts)) { version = 2; label = 'DebateBase Version 2'; }
    else { version = 1; label = 'DebateBase Version 1'; }
    if (!d.app) label += ' (interner Speicherstand)';
    return { ok: true, version: version, label: label, exportedAt: str(d.exportedAt), declared: isObj(d.counts) ? d.counts : null };
  }

  /* ---------- 2. Prüfen ---------- */
  /* current: aktuelle Daten {entries:[…], …}
     known:   {types:{…}, status:{…}, ltypes:{…}} zur Erkennung unbekannter Werte */
  function analyze(d, current, known) {
    known = known || {};
    var fmt = detect(d);
    var res = { ok: false, format: fmt, errors: [], warnings: [], skipped: [], cols: {}, conflicts: [], total: 0 };
    if (!fmt.ok) { res.errors.push(fmt.error); return res; }

    var existing = {};
    COLS.forEach(function (c) {
      existing[c] = {};
      ((current && current[c]) || []).forEach(function (o) { existing[c][o.id] = o; });
    });

    var seen = {}, valid = {};
    COLS.forEach(function (c) {
      var info = { inFile: 0, valid: 0, neu: [], same: [], conflict: [], invalid: 0 };
      res.cols[c] = info; seen[c] = {}; valid[c] = {};
      (d[c] || []).forEach(function (raw, i) {
        info.inFile++;
        var where = LABEL[c] + ' Nr. ' + (i + 1);
        if (!isObj(raw)) { info.invalid++; res.skipped.push(where + ': kein gültiger Datensatz – übersprungen'); return; }
        var o = clone(raw);
        if (typeof o.id === 'number') o.id = String(o.id);
        if (typeof o.id !== 'string' || !o.id.trim()) { info.invalid++; res.skipped.push(where + ' (' + name(c, o) + '): ohne ID – übersprungen'); return; }
        if (seen[c][o.id]) { info.invalid++; res.skipped.push(name(c, o) + ': ID „' + o.id + '“ kommt doppelt in der Datei vor – nur der erste wird übernommen'); return; }
        seen[c][o.id] = 1;

        if ((c === 'entries' || c === 'sources' || c === 'args') && !str(o.title).trim()) { info.invalid++; res.skipped.push(where + ' (ID ' + o.id + '): ohne Titel – übersprungen'); return; }
        if (c === 'links' && !(str(o.fromK) && str(o.fromId) && str(o.toK) && str(o.toId))) { info.invalid++; res.skipped.push('Verknüpfung ' + o.id + ': Start oder Ziel fehlt – übersprungen'); return; }
        if (c === 'posts' && !str(o.text).trim() && !str(o.url).trim()) { info.invalid++; res.skipped.push('X-Beitrag ' + o.id + ': weder Text noch Link – übersprungen'); return; }

        /* Listen-Felder müssen Listen sein, sonst kann die App sie nicht anzeigen. */
        ARRAY_FIELDS[c].forEach(function (f) {
          if (o[f] == null) return;
          if (!Array.isArray(o[f])) {
            var before = JSON.stringify(o[f]);
            o[f] = typeof o[f] === 'string' ? o[f].split(/[,;]+/).map(function (x) { return x.trim(); }).filter(Boolean) : [];
            res.warnings.push(name(c, o) + ': Feld „' + f + '“ war keine Liste (' + before.slice(0, 40) + ') und wurde in eine Liste umgewandelt');
          }
        });
        if ((c === 'entries') && known.types && o.type && !known.types[o.type]) res.warnings.push(name(c, o) + ': unbekannter Inhaltstyp „' + o.type + '“ – wird unverändert übernommen');
        if ((c === 'entries' || c === 'args') && known.status && o.status && !known.status[o.status]) res.warnings.push(name(c, o) + ': unbekannter Prüfstatus „' + o.status + '“ – wird unverändert übernommen');
        if (c === 'links' && known.ltypes && !known.ltypes[o.type]) res.warnings.push('Verknüpfung ' + o.id + ': unbekannte Art „' + o.type + '“ – wird unverändert übernommen');
        if (c === 'sources' && str(o.url) && !/^https?:\/\//i.test(o.url)) res.warnings.push(name(c, o) + ': Link beginnt nicht mit http(s):// – wird unverändert übernommen');

        info.valid++; valid[c][o.id] = o;
        var ex = existing[c][o.id];
        if (!ex) info.neu.push(o);
        else if (stable(ex) === stable(o)) info.same.push(o);
        else { info.conflict.push(o); res.conflicts.push({ col: c, id: o.id, incoming: o, existing: ex }); }
      });
      res.total += info.valid;
    });

    /* Verweise prüfen: Ziel muss in der Datei oder bereits auf dem Gerät vorhanden sein. */
    var has = function (c, id) { return !!(valid[c] && valid[c][id]) || !!existing[c][id]; };
    var refWarn = function (o, c, what) { res.warnings.push(name(c, o) + ': ' + what + ' – Verweis bleibt erhalten, siehe später „Datenprüfung“'); };
    ['entries', 'args'].forEach(function (c) {
      Object.keys(valid[c]).forEach(function (id) {
        var o = valid[c][id];
        (o.sourceIds || []).forEach(function (s) { if (!has('sources', s)) refWarn(o, c, 'verweist auf fehlende Quelle „' + s + '“'); });
      });
    });
    Object.keys(valid.entries).forEach(function (id) {
      var o = valid.entries[id];
      if (o.postId && !has('posts', o.postId)) refWarn(o, 'entries', 'verweist auf fehlenden X-Beitrag „' + o.postId + '“');
    });
    Object.keys(valid.posts).forEach(function (id) {
      var o = valid.posts[id];
      (o.convertedTo || []).forEach(function (e) { if (!has('entries', e)) refWarn(o, 'posts', 'verweist auf fehlenden Eintrag „' + e + '“'); });
    });
    Object.keys(valid.links).forEach(function (id) {
      var o = valid.links[id];
      if (!has(o.fromK, o.fromId) || !has(o.toK, o.toId)) refWarn(o, 'links', 'Start oder Ziel ist weder in der Datei noch auf dem Gerät vorhanden');
    });
    /* Doppelte X-Beiträge (gleicher Beitrag unter anderer ID) */
    var tweets = {};
    ((current && current.posts) || []).forEach(function (p) { if (p.tweetId) tweets[p.tweetId] = p.id; });
    Object.keys(valid.posts).forEach(function (id) {
      var p = valid.posts[id];
      if (p.tweetId && tweets[p.tweetId] && tweets[p.tweetId] !== p.id) res.warnings.push(name('posts', p) + ': derselbe X-Beitrag ist bereits gespeichert (ID ' + tweets[p.tweetId] + ') – wird trotzdem übernommen');
      if (p.tweetId) tweets[p.tweetId] = tweets[p.tweetId] || p.id;
    });
    /* Abweichung von der in der Datei angegebenen Anzahl */
    if (fmt.declared) COLS.forEach(function (c) {
      if (typeof fmt.declared[c] === 'number' && fmt.declared[c] !== res.cols[c].inFile) res.warnings.push(LABEL[c] + ': Die Datei nennt ' + fmt.declared[c] + ', enthält aber ' + res.cols[c].inFile + '. Möglicherweise unvollständig kopiert.');
    });

    if (!res.total) res.errors.push('Die Datei enthält keine gültigen Datensätze.');
    res.ok = res.errors.length === 0;
    res._valid = valid;
    return res;
  }

  /* ---------- 3. Festlegen, was geschrieben wird ----------
     opts.mode:     'merge'   vorhandene Daten bleiben, neue kommen hinzu
                    'replace' alle Daten werden durch die Datei ersetzt
     opts.conflict: 'skip' | 'replace' | 'copy' (nur bei 'merge') */
  function build(a, current, opts) {
    opts = opts || {};
    var mode = opts.mode === 'replace' ? 'replace' : 'merge';
    var conflict = opts.conflict || 'skip';
    var write = {}, sum = {}, idMap = {}, taken = {};
    COLS.forEach(function (c) {
      write[c] = []; idMap[c] = {}; sum[c] = { neu: 0, ersetzt: 0, kopiert: 0, behalten: 0, gleich: 0 };
      ((current && current[c]) || []).forEach(function (o) { taken[o.id] = 1; });
      Object.keys(a._valid[c] || {}).forEach(function (id) { taken[id] = 1; });
    });
    COLS.forEach(function (c) {
      var info = a.cols[c];
      if (mode === 'replace') {
        info.neu.concat(info.same, info.conflict).forEach(function (o) { write[c].push(clone(o)); });
        sum[c].neu = write[c].length;
        return;
      }
      info.neu.forEach(function (o) { write[c].push(clone(o)); sum[c].neu++; });
      sum[c].gleich = info.same.length;
      info.conflict.forEach(function (o) {
        if (conflict === 'replace') { write[c].push(clone(o)); sum[c].ersetzt++; }
        else if (conflict === 'copy') {
          var n = clone(o);
          n.id = newId(String(o.id).split('_')[0] || c[0], taken);
          idMap[c][o.id] = n.id;
          write[c].push(n); sum[c].kopiert++;
        } else sum[c].behalten++;
      });
    });
    /* Bei Kopien: Verweise innerhalb der importierten Daten auf die neuen IDs umschreiben */
    var remapped = 0;
    if (mode === 'merge' && conflict === 'copy') {
      var m = function (c, id) { if (idMap[c][id]) { remapped++; return idMap[c][id]; } return id; };
      write.entries.forEach(function (o) {
        if (Array.isArray(o.sourceIds)) o.sourceIds = o.sourceIds.map(function (s) { return m('sources', s); });
        if (o.postId) o.postId = m('posts', o.postId);
      });
      write.args.forEach(function (o) { if (Array.isArray(o.sourceIds)) o.sourceIds = o.sourceIds.map(function (s) { return m('sources', s); }); });
      write.posts.forEach(function (o) { if (Array.isArray(o.convertedTo)) o.convertedTo = o.convertedTo.map(function (e) { return m('entries', e); }); });
      write.links.forEach(function (o) {
        if (idMap[o.fromK]) o.fromId = m(o.fromK, o.fromId);
        if (idMap[o.toK]) o.toId = m(o.toK, o.toId);
      });
    }
    var count = COLS.reduce(function (n, c) { return n + write[c].length; }, 0);
    return { mode: mode, conflict: conflict, write: write, summary: sum, idMap: idMap, remapped: remapped, count: count };
  }

  /* ---------- 5. Nachkontrolle ----------
     stored: frisch aus der Datenbank gelesene Daten */
  function verify(plan, stored) {
    var out = { checked: 0, ok: 0, problems: [] };
    COLS.forEach(function (c) {
      var map = {};
      (stored[c] || []).forEach(function (o) { map[o.id] = o; });
      plan.write[c].forEach(function (o) {
        out.checked++;
        var s = map[o.id];
        if (!s) out.problems.push(name(c, o) + ' fehlt nach dem Speichern');
        else if (stable(s) !== stable(o)) out.problems.push(name(c, o) + ' wurde anders gespeichert als in der Datei');
        else out.ok++;
      });
      if (plan.mode === 'replace' && (stored[c] || []).length !== plan.write[c].length) out.problems.push(LABEL[c] + ': ' + (stored[c] || []).length + ' gespeichert, erwartet ' + plan.write[c].length);
    });
    out.ok_all = out.problems.length === 0;
    return out;
  }

  /* ---------- Bericht als Text (zum Kopieren) ---------- */
  function report(a, plan, ver) {
    var L = [];
    L.push('DebateBase – Importbericht (' + new Date().toLocaleString('de-DE') + ')');
    if (a.format && a.format.ok) L.push('Format: ' + a.format.label + (a.format.exportedAt ? ', exportiert ' + a.format.exportedAt : ''));
    COLS.forEach(function (c) {
      var i = a.cols[c]; if (!i) return;
      L.push(LABEL[c] + ': ' + i.inFile + ' in der Datei, ' + i.neu.length + ' neu, ' + i.same.length + ' identisch, ' + i.conflict.length + ' Konflikte, ' + i.invalid + ' übersprungen');
    });
    if (plan) {
      L.push('Modus: ' + (plan.mode === 'replace' ? 'Komplett ersetzen' : 'Zusammenführen, Konflikte: ' + { skip: 'vorhandene behalten', replace: 'durch Datei ersetzen', copy: 'als Kopie anlegen' }[plan.conflict]));
      L.push('Geschrieben: ' + plan.count + ' Datensätze' + (plan.remapped ? ', ' + plan.remapped + ' Verweise auf neue IDs umgeschrieben' : ''));
    }
    if (ver) L.push('Nachkontrolle: ' + ver.ok + ' von ' + ver.checked + ' korrekt' + (ver.problems.length ? ', ' + ver.problems.length + ' Probleme' : ''));
    if (a.errors.length) { L.push('', 'Fehler:'); a.errors.forEach(function (x) { L.push('- ' + x); }); }
    if (a.skipped.length) { L.push('', 'Übersprungen:'); a.skipped.forEach(function (x) { L.push('- ' + x); }); }
    if (a.warnings.length) { L.push('', 'Hinweise:'); a.warnings.forEach(function (x) { L.push('- ' + x); }); }
    if (ver && ver.problems.length) { L.push('', 'Probleme bei der Nachkontrolle:'); ver.problems.forEach(function (x) { L.push('- ' + x); }); }
    return L.join('\n');
  }

  global.Migrate = { COLS: COLS, LABEL: LABEL, parse: parse, detect: detect, analyze: analyze, build: build, verify: verify, report: report, stable: stable };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.Migrate;
})(typeof self !== 'undefined' ? self : this);

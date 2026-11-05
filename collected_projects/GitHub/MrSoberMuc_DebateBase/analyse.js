/* DebateBase – Lokale Analyse (Phase 4)
 *
 * Diese Datei enthält nur Rechenregeln, keine Bildschirmteile und keine
 * Speicherzugriffe. Sie verändert keine Daten.
 *
 * WICHTIG: Hier arbeitet KEINE künstliche Intelligenz. Alles beruht auf festen
 * Regeln: Wörter vergleichen, Wortendungen kürzen, eine Liste verwandter
 * Begriffe, kleine Tippfehler erkennen und Punkte vergeben. Die App versteht
 * die Bedeutung eines Textes nicht.
 *
 * Inhalt:
 *   normalize / words / stem     Text in vergleichbare Wörter zerlegen
 *   SYNONYMS                     eingebaute Liste verwandter Begriffe
 *   search(docs, query, opts)    Suche mit Punkten und Begründung
 *   related(target, docs, opts)  verwandte Inhalte mit Begründung
 */
(function (global) {
  'use strict';

  /* ---------- Text vergleichbar machen ---------- */

  /* Kleinschreibung; ä→ae, ö→oe, ü→ue, ß→ss; Akzente entfernen.
     So gelten „Erderwärmung“ und „Erderwaermung“ als gleich. */
  function normalize(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* Zerlegt Text in Wörter. Liefert Originalform und vergleichbare Form. */
  var SPLIT = /[^\p{L}\p{N}]+/u;
  function words(s) {
    var out = [];
    String(s == null ? '' : s).split(SPLIT).forEach(function (raw) {
      if (!raw) return;
      var n = normalize(raw);
      if (n) out.push({ raw: raw, norm: n });
    });
    return out;
  }
  /* Vergleichbarer Text mit einfachen Leerzeichen, für Wortfolgen */
  function flat(s) { return words(s).map(function (w) { return w.norm; }).join(' '); }

  /* Füllwörter, die bei der Suche keine Rolle spielen.
     „nicht“ und „kein“ fehlen absichtlich: Sie ändern die Aussage. */
  var STOP = {};
  ('der die das den dem des ein eine einer eines einem einen und oder aber sowie in im ins an am auf aus bei mit nach von vom zu zum zur fuer ueber unter vor um durch gegen ohne bis seit ' +
   'ist sind war waren wird werden wurde wurden sein hat haben hatte hatten es er sie wir ihr ich du man sich als auch so wie wenn dass da dann doch noch nur schon sehr mehr dieser diese dieses ' +
   'jener jene welche welcher welches was wer wo the of and a an to in is are on for').split(' ').forEach(function (w) { STOP[w] = 1; });
  function isStop(n) { return !!STOP[n]; }

  /* Einfache Wortstamm-Regel für Deutsch: häufige Endungen abschneiden.
     „Sanktionen“, „Sanktion“ → „sanktion“; „Staaten“, „Staates“ → „staat“.
     Das ist eine Näherung und liegt manchmal daneben. */
  var SUFFIXES = ['ern', 'em', 'en', 'er', 'es', 'e'];
  function stem(n) {
    if (/^\d/.test(n)) return n;
    for (var i = 0; i < SUFFIXES.length; i++) {
      var s = SUFFIXES[i];
      if (n.length - s.length >= 4 && n.slice(-s.length) === s) return n.slice(0, -s.length);
    }
    /* Plural-s nur nach Vokal („Autos“), nicht bei „Konsens“ oder „Prozess“ */
    if (n.length >= 5 && /[aeiouy]s$/.test(n)) return n.slice(0, -1);
    return n;
  }

  /* Tippfehler: höchstens ein Zeichen anders, fehlend, zu viel oder vertauscht */
  function near(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    var i = 0;
    while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) {
      if (a.slice(i + 1) === b.slice(i + 1)) return true;                       /* ersetzt */
      return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); /* vertauscht */
    }
    return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1); /* fehlt / zu viel */
  }

  /* ---------- Verwandte Begriffe ---------- */
  /* Allgemeine Gruppen gleichbedeutender oder sehr eng verwandter Begriffe.
     Eigene Gruppen legst du in den Optionen an. */
  var SYNONYMS = [
    ['UNO', 'UN', 'Vereinte Nationen'],
    ['EU', 'Europäische Union'],
    ['NATO', 'Nordatlantikpakt', 'Nordatlantikvertrag'],
    ['USA', 'Vereinigte Staaten', 'Amerika'],
    ['Großbritannien', 'Vereinigtes Königreich', 'Britannien', 'UK'],
    ['BRD', 'Bundesrepublik Deutschland'],
    ['DDR', 'Deutsche Demokratische Republik'],
    ['UdSSR', 'Sowjetunion'],
    ['Russland', 'Russische Föderation'],
    ['Kalter Krieg', 'Ost-West-Konflikt'],
    ['Klimawandel', 'Erderwärmung', 'globale Erwärmung', 'Klimakrise'],
    ['CO2', 'Kohlendioxid', 'Kohlenstoffdioxid'],
    ['Atomwaffen', 'Kernwaffen', 'Nuklearwaffen'],
    ['Atomkraft', 'Kernkraft', 'Kernenergie', 'Atomenergie'],
    ['erneuerbare Energien', 'regenerative Energien', 'Ökostrom'],
    ['Impfung', 'Impfstoff', 'Vakzin', 'Schutzimpfung'],
    ['Covid', 'Corona', 'Covid-19', 'SARS-CoV-2'],
    ['WHO', 'Weltgesundheitsorganisation'],
    ['EZB', 'Europäische Zentralbank'],
    ['BIP', 'Bruttoinlandsprodukt'],
    ['Inflation', 'Teuerung', 'Geldentwertung'],
    ['Arbeitslosigkeit', 'Erwerbslosigkeit'],
    ['Migration', 'Einwanderung', 'Zuwanderung'],
    ['Flüchtlinge', 'Geflüchtete'],
    ['Holocaust', 'Shoah'],
    ['Nationalsozialismus', 'NS-Zeit'],
    ['Desinformation', 'Falschinformation', 'Fake News'],
    ['Peer-Review', 'Begutachtung']
  ];

  /* Baut aus Gruppen ein Nachschlagewerk: vergleichbare Form → Gruppe */
  function synIndex(groups) {
    var byNorm = {}, multi = [];
    (groups || []).forEach(function (g) {
      var members = [];
      (g || []).forEach(function (label) {
        var f = flat(label);
        if (f && !members.some(function (m) { return m.norm === f; })) members.push({ label: String(label).trim(), norm: f });
      });
      if (members.length < 2) return;
      members.forEach(function (m) {
        (byNorm[m.norm] = byNorm[m.norm] || []).push(members);
        if (m.norm.indexOf(' ') > 0) multi.push(m);
      });
    });
    multi.sort(function (a, b) { return b.norm.length - a.norm.length; });
    return { byNorm: byNorm, multi: multi };
  }

  /* ---------- Vorbereitung der Datensätze ---------- */
  /* Ein Dokument: { id, kind, item, fields: [{ label, weight, text }] }
     Die vorbereitete Form wird zwischengespeichert, solange sich der Text nicht ändert. */
  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function prepField(f) {
    var w = words(f.text), list = [], set = {}, stems = {};
    w.forEach(function (x) { list.push(x); set[x.norm] = x.raw; var st = stem(x.norm); if (!stems[st]) stems[st] = x.raw; });
    /* Abschnitte (durch Komma, Semikolon, Zeilenumbruch getrennt) für Wortfolgen,
       damit z. B. zwei Tags nicht als zusammenhängende Wortfolge gelten */
    var segs = String(f.text || '').split(/[,;|\n]+/).map(function (t) { var w2 = words(t); return { flat: ' ' + w2.map(function (x) { return x.norm; }).join(' ') + ' ', stem: ' ' + w2.map(function (x) { return stem(x.norm); }).join(' ') + ' ' }; });
    return { label: f.label, weight: f.weight, words: list, set: set, stems: stems, segs: segs, flat: ' ' + list.map(function (x) { return x.norm; }).join(' ') + ' ', joined: list.map(function (x) { return x.norm; }).join('') };
  }
  function prep(doc) {
    var key = doc.fields.map(function (f) { return f.label + '\u0001' + (f.text || ''); }).join('\u0002');
    var hit = cache && doc.item && typeof doc.item === 'object' ? cache.get(doc.item) : null;
    if (hit && hit.key === key) return hit.fields;
    var fields = doc.fields.map(prepField);
    if (cache && doc.item && typeof doc.item === 'object') cache.set(doc.item, { key: key, fields: fields });
    return fields;
  }

  /* ---------- Suchanfrage zerlegen ---------- */
  function parseQuery(q, idx) {
    idx = idx || synIndex([]);
    var all = words(q), f = ' ' + all.map(function (w) { return w.norm; }).join(' ') + ' ';
    var terms = [], used = {};
    /* Mehrteilige verwandte Begriffe zuerst („Vereinte Nationen“) */
    idx.multi.forEach(function (m) {
      var p = f.indexOf(' ' + m.norm + ' ');
      if (p < 0) return;
      var start = f.slice(0, p + 1).trim().split(' ').filter(Boolean).length, n = m.norm.split(' ').length;
      for (var k = start; k < start + n; k++) if (used[k]) return;
      for (k = start; k < start + n; k++) used[k] = 1;
      terms.push(makeTerm(all.slice(start, start + n).map(function (w) { return w.raw; }).join(' '), m.norm, idx, start));
    });
    var meaningful = all.filter(function (w, i) { return !used[i] && !isStop(w.norm); }).length;
    all.forEach(function (w, i) {
      if (used[i]) return;
      /* Füllwörter weglassen, außer die Anfrage besteht nur daraus */
      if (isStop(w.norm) && (meaningful || terms.length)) return;
      terms.push(makeTerm(w.raw, w.norm, idx, i));
    });
    terms.sort(function (a, b) { return a.pos - b.pos; });
    return { terms: terms, flat: all.map(function (w) { return w.norm; }).join(' '), wordCount: all.length };
  }
  function makeTerm(raw, n, idx, pos) {
    var alts = [{ norm: n, stem: n.indexOf(' ') < 0 ? stem(n) : null, syn: null }], seen = {};
    seen[n] = 1;
    (idx.byNorm[n] || []).forEach(function (group) {
      group.forEach(function (m) {
        if (seen[m.norm]) return; seen[m.norm] = 1;
        alts.push({ norm: m.norm, stem: m.norm.indexOf(' ') < 0 ? stem(m.norm) : null, syn: m.label });
      });
    });
    return { raw: raw, norm: n, alts: alts, pos: pos };
  }

  /* ---------- Treffer in einem Feld bewerten ---------- */
  var MULT = { exact: 3, stem: 2.5, syn: 2.4, part: 1.5, fuzzy: 1 };
  function findWord(field, pred) { for (var i = 0; i < field.words.length; i++) if (pred(field.words[i].norm)) return field.words[i].raw; return ''; }
  function inSegs(field, phrase, key) { for (var i = 0; i < field.segs.length; i++) if (field.segs[i][key].indexOf(' ' + phrase + ' ') >= 0) return true; return false; }
  /* Originalschreibweise einer Wortfolge im Feld, z. B. „Vereinten Nationen“ */
  function rawPhrase(field, sp) {
    var st = sp.split(' '), w = field.words;
    for (var i = 0; i + st.length <= w.length; i++) {
      var ok = true;
      for (var j = 0; j < st.length; j++) if (stem(w[i + j].norm) !== st[j]) { ok = false; break; }
      if (ok) return w.slice(i, i + st.length).map(function (x) { return x.raw; }).join(' ');
    }
    return '';
  }
  function stemPhrase(n) { return n.split(' ').map(stem).join(' '); }
  function matchAlt(field, alt, term) {
    var n = alt.norm, isSyn = !!alt.syn;
    if (n.indexOf(' ') > 0) {
      if (inSegs(field, n, 'flat')) return { type: isSyn ? 'syn' : 'exact', word: alt.syn || term.raw };
      if (inSegs(field, stemPhrase(n), 'stem')) return { type: isSyn ? 'syn' : 'stem', word: isSyn ? alt.syn : rawPhrase(field, stemPhrase(n)) || term.raw };
      return null;
    }
    if (field.set[n] != null) return { type: isSyn ? 'syn' : 'exact', word: field.set[n] };
    if (alt.stem && field.stems[alt.stem] != null) return { type: isSyn ? 'syn' : 'stem', word: field.stems[alt.stem] };
    /* Wortteil, z. B. „klima“ in „Klimawandel“. Bei verwandten Begriffen erst ab 4 Zeichen. */
    if ((!isSyn || n.length >= 4) && field.flat.indexOf(n) >= 0) {
      return { type: isSyn ? 'syn' : 'part', word: findWord(field, function (w) { return w.indexOf(n) >= 0; }) || term.raw };
    }
    /* Wortteil über Wortgrenzen (z. B. bei Bindestrichen) */
    if (!isSyn && n.length >= 4 && field.joined.indexOf(n) >= 0) return { type: 'part', word: term.raw };
    if (!isSyn && n.length >= 5) {
      var w = findWord(field, function (x) { return x.length >= 5 && near(n, x); });
      if (w) return { type: 'fuzzy', word: w };
    }
    return null;
  }
  function matchTerm(field, term) {
    var best = null;
    term.alts.forEach(function (alt) {
      var m = matchAlt(field, alt, term);
      if (m && (!best || MULT[m.type] > MULT[best.type])) { best = m; best.alt = alt; }
    });
    return best;
  }

  function reasonText(term, m, label) {
    var q = '„' + term.raw + '“', w = '„' + m.word + '“';
    switch (m.type) {
      case 'exact': return q + ' in ' + label;
      case 'stem': return 'Wortform ' + w + ' zu ' + q + ' in ' + label;
      case 'syn': return 'verwandter Begriff ' + '„' + m.alt.syn + '“ zu ' + q + ' in ' + label;
      case 'part': return 'Wortteil ' + q + ' in ' + w + ' (' + label + ')';
      case 'fuzzy': return 'ähnliche Schreibweise ' + w + ' zu ' + q + ' in ' + label;
    }
    return q;
  }

  /* ---------- Suche ----------
     Liefert { full: [...], partial: [...], terms }.
     full    = Datensätze, die ALLE Suchwörter enthalten (wie bisher, nur besser sortiert)
     partial = nur gefüllt, wenn es keine vollständigen Treffer gibt
     Jeder Treffer: { doc, score, reasons: [Text], missing: [Suchwort] } */
  function search(docs, query, opts) {
    opts = opts || {};
    var idx = opts.synIndex || synIndex(opts.synonyms || SYNONYMS);
    var pq = parseQuery(query, idx);
    if (!pq.terms.length) return { full: [], partial: [], terms: [] };
    var full = [], partial = [];
    docs.forEach(function (doc, order) {
      var fields = prep(doc), score = 0, reasons = [], missing = [], hit = 0;
      pq.terms.forEach(function (term) {
        var tScore = 0, best = null, bestField = null;
        fields.forEach(function (fd) {
          var m = matchTerm(fd, term);
          if (!m) return;
          var s = fd.weight * MULT[m.type];
          tScore += s;
          if (!best || s > best.s) { best = m; best.s = s; bestField = fd; }
        });
        if (best) { hit++; score += tScore; reasons.push({ s: best.s, t: reasonText(term, best, bestField.label) }); }
        else missing.push(term.raw);
      });
      if (!hit) return;
      /* Bonus: genaue Wortfolge aus mehreren Wörtern */
      if (pq.wordCount > 1 && pq.flat) {
        var sp = stemPhrase(pq.flat);
        for (var i = 0; i < fields.length; i++) {
          if (inSegs(fields[i], pq.flat, 'flat') || inSegs(fields[i], sp, 'stem')) {
            var bonus = fields[i].weight >= 5 ? 10 : 4;
            score += bonus;
            if (pq.terms.length > 1) reasons.unshift({ s: 99, t: 'genaue Wortfolge in ' + fields[i].label });
            break;
          }
        }
      }
      reasons.sort(function (a, b) { return b.s - a.s; });
      var r = { doc: doc, score: Math.round(score * 10) / 10, reasons: reasons.map(function (x) { return x.t; }), missing: missing, order: order };
      (missing.length ? partial : full).push(r);
    });
    var by = function (a, b) { return b.score - a.score || a.order - b.order; };
    full.sort(by);
    partial.sort(function (a, b) { return a.missing.length - b.missing.length || by(a, b); });
    return { full: full, partial: full.length ? [] : partial, terms: pq.terms.map(function (t) { return t.raw; }) };
  }

  /* ---------- Verwandte Inhalte ----------
     target, docs: Dokumente wie bei search; zusätzlich je Dokument:
       tags: [Text], sourceIds: [id], topic: Text
     opts.links: [{ type, fromK, fromId, toK, toId }]
     opts.label(kind, id) → Anzeigename;  opts.sourceTitle(id) → Titel
     opts.ltypes: { type: [Bezeichnung] }
     Liefert die besten Treffer mit Punkten und Begründungen. */
  function bag(doc) {
    var b = {}, show = {};
    prep(doc).forEach(function (f) {
      if (f.weight < 2) return; /* nur inhaltliche Felder */
      f.words.forEach(function (w) {
        if (w.norm.length < 3 || isStop(w.norm) || /^\d+$/.test(w.norm)) return;
        var st = stem(w.norm);
        b[st] = (b[st] || 0) + (f.weight >= 4 ? 2 : 1);
        if (!show[st]) show[st] = w.raw;
      });
    });
    return { tf: b, show: show };
  }
  function related(target, docs, opts) {
    opts = opts || {};
    var key = function (d) { return d.kind + ':' + d.id; }, tk = key(target), links = opts.links || [], lt = opts.ltypes || {};
    var others = docs.filter(function (d) { return key(d) !== tk; });
    var all = [target].concat(others), bags = {}, df = {};
    all.forEach(function (d) { var b = bag(d); bags[key(d)] = b; Object.keys(b.tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; }); });
    var N = all.length, idf = function (t) { return Math.log((N + 1) / (df[t] || 1)); };
    var vec = function (b) { var v = {}, len = 0; Object.keys(b.tf).forEach(function (t) { v[t] = b.tf[t] * idf(t); len += v[t] * v[t]; }); return { v: v, len: Math.sqrt(len) }; };
    var tv = vec(bags[tk]);
    /* direkte und indirekte Verknüpfungen */
    var direct = {}, neighbours = {};
    links.forEach(function (l) {
      var a = l.fromK + ':' + l.fromId, b = l.toK + ':' + l.toId;
      if (a === tk) direct[b] = (direct[b] || []).concat([(lt[l.type] || [l.type])[0]]);
      else if (b === tk) direct[a] = (direct[a] || []).concat([(lt[l.type] || [l.type, l.type])[1] || l.type]);
    });
    links.forEach(function (l) {
      var a = l.fromK + ':' + l.fromId, b = l.toK + ':' + l.toId;
      if (direct[a] && b !== tk) (neighbours[b] = neighbours[b] || []).push(a);
      if (direct[b] && a !== tk) (neighbours[a] = neighbours[a] || []).push(b);
    });
    var tTags = {}; (target.tags || []).forEach(function (t) { tTags[normalize(t).trim()] = t; });
    var tSrc = {}; (target.sourceIds || []).forEach(function (s) { tSrc[s] = 1; });
    var tTopic = normalize(target.topic || '').trim();
    var out = [];
    others.forEach(function (d) {
      var k = key(d), score = 0, reasons = [], linked = !!direct[k];
      if (linked) { score += 10; reasons.push('direkt verknüpft: ' + direct[k].join(', ')); }
      if (neighbours[k]) {
        var via = neighbours[k].filter(function (x, i, a) { return a.indexOf(x) === i; });
        score += 2 * Math.min(via.length, 2);
        reasons.push('indirekt verbunden über „' + via.slice(0, 2).map(function (x) { var p = x.split(':'); return opts.label ? opts.label(p[0], p.slice(1).join(':')) : x; }).join('“, „') + '“');
      }
      var shared = (d.sourceIds || []).filter(function (s) { return tSrc[s]; });
      if (shared.length) { score += 4 * shared.length; reasons.push((shared.length === 1 ? 'gemeinsame Quelle: ' : 'gemeinsame Quellen: ') + shared.map(function (s) { return '„' + (opts.sourceTitle ? opts.sourceTitle(s) : s) + '“'; }).join(', ')); }
      var tags = (d.tags || []).filter(function (t) { return tTags[normalize(t).trim()] != null; });
      if (tags.length) { score += 3 * tags.length; reasons.push((tags.length === 1 ? 'gemeinsamer Tag: ' : 'gemeinsame Tags: ') + tags.join(', ')); }
      if (tTopic && normalize(d.topic || '').trim() === tTopic) { score += 1; reasons.push('gleiches Themengebiet: ' + d.topic); }
      var dv = vec(bags[k]), dot = 0, common = [];
      Object.keys(tv.v).forEach(function (t) { if (dv.v[t]) { dot += tv.v[t] * dv.v[t]; common.push(t); } });
      var cos = tv.len && dv.len ? dot / (tv.len * dv.len) : 0;
      if (cos >= 0.08 && common.length) {
        score += Math.round(cos * 20 * 10) / 10;
        common.sort(function (a, b) { return tv.v[b] * dv.v[b] - tv.v[a] * dv.v[a]; });
        reasons.push('ähnliche Begriffe: ' + common.slice(0, 4).map(function (t) { return bags[tk].show[t]; }).join(', '));
      }
      if (score >= (opts.min || 3)) out.push({ doc: d, score: Math.round(score * 10) / 10, reasons: reasons, linked: linked });
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, opts.max || 6);
  }

  global.Analyse = {
    normalize: normalize,
    words: words,
    flat: flat,
    stem: stem,
    isStop: isStop,
    near: near,
    SYNONYMS: SYNONYMS,
    synIndex: synIndex,
    parseQuery: parseQuery,
    search: search,
    related: related
  };
})(typeof self !== 'undefined' ? self : this);

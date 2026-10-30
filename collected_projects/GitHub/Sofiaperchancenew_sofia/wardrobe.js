export function attachWardrobe(App) {
  let _gallery = null;
  function showGallery(items, startNum, total) {
    try {
      if (!items || !items.length) return false;
      const rows = document.querySelectorAll('.messageRow.assistantRow');
      const row = rows.length ? rows[rows.length - 1] : null;
      if (!row || row.querySelector('[data-wd-gallery]')) return false;
      const host = row.querySelector('.msgWrapper') || row;
      const strip = galleryStrip(items, startNum, total);
      if (!strip) return false;
      host.appendChild(strip);
      return true;
    } catch (e) { return false; }
  }
  function galleryStrip(items, startNum, total) {
    try {
      const base = (typeof startNum === 'number' && startNum >= 0) ? startNum : 0;
      const tot = (typeof total === 'number' && total > 0) ? total : (base + items.length);
      const d = document.createElement('div');
      d.className = 'wd-gallery';
      d.setAttribute('data-wd-gallery', '1');
      d.style.cssText = 'margin-top:10px;';
      const grid = document.createElement('div');
      grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;';
      const choose = (n) => {
        try {
          const inp = (App.UI && App.UI.cache && App.UI.cache.promptInputEl) || document.querySelector('textarea');
          if (inp) {
            inp.value = String(n);
            try { inp.focus(); } catch (e) {}
            try {
              const ev = new Event('input', { bubbles: true });
              inp.dispatchEvent(ev);
            } catch (e) {}
          }
          if (App.UI && App.UI.showToast) App.UI.showToast('Numéro ' + n + ' : envoie pour confirmer', 'info');
        } catch (e) {}
      };
      items.forEach((it, i) => {
        const n = base + i + 1;        const cell = document.createElement('div');
        cell.style.cssText = 'position:relative;border:1px solid #3f3f46;border-radius:10px;overflow:hidden;background:#000;cursor:pointer;height:max-content;';
        cell.title = (it.name || '') + ' — cliquer pour agrandir, pastille rouge pour choisir le ' + n;
        if (it.img) {
          const im = document.createElement('img');
          im.loading = 'lazy';
          im.referrerPolicy = 'no-referrer';
          im.src = it.img;
          im.alt = it.name || '';
          im.style.cssText = 'max-width:100%;max-height:110px;object-fit:contain;object-position:center;display:block;background:#000;';
          const wrap = document.createElement('div');
          wrap.style.cssText = 'width:100%;height:110px;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;';
          wrap.appendChild(im);
          cell.appendChild(wrap);
        } else {
          const ph = document.createElement('div');
          ph.style.cssText = 'height:110px;display:flex;align-items:center;justify-content:center;color:#52525b;font-size:11px;padding:6px;text-align:center;';
          ph.textContent = it.name || 'sans photo';
          cell.appendChild(ph);
        }
        const badge = document.createElement('span');
        badge.textContent = n;
        badge.style.cssText = 'position:absolute;top:4px;left:4px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#e11d48;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;cursor:pointer;';
        badge.title = 'Choisir le numéro ' + n;
        badge.onclick = (e) => {
          try { if (e && e.stopPropagation) e.stopPropagation(); } catch (err) {}
          choose(n);
        };
        cell.appendChild(badge);
        const chooseBtn = document.createElement('button');
        chooseBtn.textContent = 'Choisir';
        chooseBtn.style.cssText = 'width:100%;border:none;background:#e11d48;color:#fff;font-size:12px;font-weight:700;padding:7px 0;cursor:pointer;';
        chooseBtn.onclick = (e) => {
          try { if (e && e.stopPropagation) e.stopPropagation(); } catch (err) {}
          choose(n);
        };
        cell.appendChild(chooseBtn);
        cell.onclick = () => {
          try { if (window.enlargeImage && it.img) window.enlargeImage(it.img); } catch (e) {}
        };
        grid.appendChild(cell);
      });
      d.appendChild(grid);
      const last = base + items.length;
      const hint = document.createElement('div');
      hint.style.cssText = 'margin-top:6px;font-size:12px;color:#a1a1aa;';
      hint.textContent = 'n°' + (base + 1) + '–' + last + ' sur ' + tot + ' — touche une photo pour l’agrandir, la pastille rouge pour choisir' + (last < tot ? ' — écris « suite » pour voir la suite' : ' — fin du catalogue');
      d.appendChild(hint);
      return d;
    } catch (e) { return null; }
  }
  function hookGallery() {
    return;
  }
  const LS = 'sofia-wardrobe';
  const W = {
    cats: [],
    outfit: null,
    proposal: null,
    others: {},
    descs: {},
    modes: {},
    open: false
  };
  try {
    const raw = localStorage.getItem(LS);
    if (raw) { const o = JSON.parse(raw); W.outfit = o.her || null; W.his = o.his || null; W.decor = o.decor || null; W.proposal = o.proposal || null; W.others = o.others || {}; W.descs = o.descs || {}; }
  } catch (e) {}
  function save() {
    try { localStorage.setItem(LS, JSON.stringify({ her: W.outfit, his: W.his || null, decor: W.decor || null, proposal: W.proposal || null, others: W.others || {}, descs: W.descs || {} })); } catch (e) {}
  }
  // Ronde 635 : un choix vestiaire collait au localStorage SANS discussion ni
  // personnage — une tenue d'essai (jean + pull...) habillait ensuite TOUTES
  // les photos, y compris Nina en dentelle noire de sa fiche. Chaque choix est
  // tamponne (discussion + heroine) et ignore des qu'il vient d'ailleurs.
  function curSid() { try { return (App && App.State && App.State.currentSessionId) || ''; } catch (e) { return ''; } }
  function normNm(s) { try { return String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z]+/g, ' ').trim(); } catch (e) { return ''; } }
  function curHeroine() {
    try {
      const Sid = curSid();
      const ss = (App && App.State && Array.isArray(App.State.sessions)) ? App.State.sessions.find(function (x) { return x && x.id === Sid; }) : null;
      if (App && App.Core && App.Core.soloLockedName) { const n = App.Core.soloLockedName(ss || undefined); if (n) return String(n); }
      if (App && App.Scene && App.Scene.state) { const sc = App.Scene.state(ss || undefined); if (sc && Array.isArray(sc.cast) && sc.cast[0]) return String(sc.cast[0]); }
    } catch (e) {}
    return '';
  }
  function stamp(o, who) {
    try {
      o._sid = curSid();
      o._at = Date.now();
      if (typeof who === 'string' && who.indexOf('other:') === 0 && who.length > 6) o._for = who.slice(6);
      else if (who === 'her') o._for = curHeroine();
    } catch (e) {}
    return o;
  }
  function fresh(o, needName) {
    if (!o) return false;
    try {
      const cs = curSid();
      if (!o._sid) { if (cs) return false; }
      else if (cs && o._sid !== cs) return false;
      if (needName && o._for) {
        const h = curHeroine();
        if (h && normNm(o._for) !== normNm(h)) return false;
      }
    } catch (e) {}
    return true;
  }
  function liveOutfit() { try { return fresh(W.outfit, true) ? W.outfit : null; } catch (e) { return null; } }
  function liveHis() { try { return fresh(W.his, false) ? (W.his || null) : null; } catch (e) { return null; } }
  function liveOthers() { try { const r = {}; const oo = W.others || {}; for (const k of Object.keys(oo)) if (fresh(oo[k], true)) r[k] = oo[k]; return r; } catch (e) { return {}; } }
  function liveDecor() { try { return fresh(W.decor, false) ? (W.decor || null) : null; } catch (e) { return null; } }
  function liveProposal() { try { return fresh(W.proposal, true) ? (W.proposal || null) : null; } catch (e) { return null; } }
  const KEEP = /(lingerie|soutien|culotte|string|boxer|slip|cale[çc]on|costume|chemise|pantalon|homme|bas|collant|nuit|pyjama|maillot|corset|gu[êe]pi[eè]re|jarretelle|latex|catsuit|combinaison|v[êe]tement|ensemble|nuisette|babydoll|bikini|dentelle|sexy|mobilier|meuble|d[ée]cor|canap[ée]|fauteuil|tabouret|balan[çc]oire|potence|cabine|machine|matelas|pouf|chaise\s+sm|si[èe]ge)/i;
  function isAdult() {
    try { if (App && App.Core && App.Core.sexoAllowed) return !!App.Core.sexoAllowed(); } catch (e) {}
    return false;
  }
  const SURFACE = { 'vetements-femme': 1, 'rg-vetements': 1, 'gl-pull': 1 };
  async function load() {
    const adult = isAdult();
    if (W._adult !== adult) { W.cats = []; W._adult = adult; }
    if (W.cats.length) return W.cats;
    const files = adult ? ['src/data/vetements-catalog.json', 'src/data/bdsm-catalog.json'] : ['src/data/vetements-catalog.json'];
    const extra = [];
    for (const f of files) {
      let c = null;
      try { c = await fetch(f).then(r => r.json()); } catch (e) { continue; }
      const cats = (c && c.categories) || {};
      for (const id of Object.keys(cats)) {
        if (!adult && !SURFACE[id]) continue;
        const cat = cats[id] || {};
        const items = Array.isArray(cat.items) ? cat.items.filter(it => it && it.name) : [];
        if (!items.length) continue;
        const label = cat.label || id;
        // Ronde 634 : en mode adulte, les rayons BDSM (cages, camisoles, baillons,
        // plugs, bondage...) sont selectionnables eux aussi — sinon la camisole de
        // sa scene n'existe pour personne. Ils passent EN SECOND (numeros 1..N
        // existants inchanges, les nouveaux prennent la suite).
        if (adult && !KEEP.test(label + ' ' + id)) { extra.push({ f: f, id: id, label: label, cat: cat, items: items }); continue; }
        if (!KEEP.test(label + ' ' + id)) continue;
        const kind = /(mobilier|meuble|d[ée]cor|machine|canap[ée]|fauteuil|cabine|potence)/i.test(label + ' ' + id) ? 'decor' : 'wear';
        W.cats.push({ id: f + '#' + id, label: label, shop: cat.shop || '', kind: kind, items: items });
      }
    }
    for (const e of extra) {
      const kind = /(mobilier|meuble|d[ée]cor|machine|canap[ée]|fauteuil|cabine|potence)/i.test(e.label + ' ' + e.id) ? 'decor' : 'wear';
      W.cats.push({ id: e.f + '#' + e.id, label: e.label, shop: e.cat.shop || '', kind: kind, items: e.items });
    }
    try {
      const v = await fetch('src/data/visions.json').then(r => r.json());
      if (v && typeof v === 'object') W.descs = Object.assign({}, v, W.descs || {});
    } catch (e) {}
    try {
      const mo = await fetch('src/data/modes.json').then(r => r.json());
      if (mo && typeof mo === 'object') W.modes = mo;
    } catch (e) {}
    try { _ridByPid = null; } catch (eR) {}
    return W.cats;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  let _decEl = null;
  function dec(s) {
    try {
      _decEl = _decEl || document.createElement('textarea');
      _decEl.innerHTML = String(s == null ? '' : s);
      return _decEl.value;
    } catch (e) { return String(s == null ? '' : s); }
  }
  function colorDot(it) {
    const cols = Array.isArray(it.colors) ? it.colors : [];
    if (!cols.length) return '';
    const c = String(cols[0]);
    if (/^#[0-9a-f]{3,8}$/i.test(c)) return '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + c + ';border:1px solid #52525b;vertical-align:-1px;"></span> ';
    return '<span style="font-size:11px;color:#a1a1aa;">' + esc(c) + '</span> ';
  }
  function card(it, idx, num) {
    let sel = false;
    try {
      const lo = liveOutfit(), lh = liveHis(), ld = liveDecor();
      sel = !!((lo && lo.pid === it.pid) || (lh && lh.pid === it.pid) || (ld && ld.pid === it.pid));
    } catch (e) { sel = false; }
    const nm = dec(it.name), br = dec(it.brand || ''), ds = dec(it.desc || '').replace(/\s+/g, ' ').trim().slice(0, 110);
    const n = (typeof num === 'number' && num > 0) ? num : (idx + 1);
    return '<div class="wd-card" data-i="' + idx + '" style="position:relative;background:#18181b;border:1px solid ' + (sel ? '#e11d48' : '#27272a') + ';border-radius:10px;overflow:hidden;cursor:pointer;height:max-content;">' +
      '<span style="position:absolute;top:6px;left:6px;z-index:2;min-width:24px;height:24px;padding:0 7px;border-radius:12px;background:#e11d48;color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;">' + n + '</span>' +
      '<div style="width:100%;height:220px;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">' +
      (it.img ? '<img loading="lazy" referrerpolicy="no-referrer" src="' + esc(it.img) + '" alt="" data-full="' + esc(it.img) + '" style="width:100%;height:220px;object-fit:contain;object-position:center;background:#000;display:block;cursor:zoom-in;" title="Voir en grand">' : '') +
      '<div data-wd-noimg style="display:' + (it.img ? 'none' : 'flex') + ';width:100%;height:220px;align-items:center;justify-content:center;flex-direction:column;gap:6px;color:#71717a;font-size:12px;background:#18181b;"><span style="font-size:26px;">&#128247;</span><span>photo indisponible</span></div></div>' +
      '<div style="padding:8px 10px;">' +
      '<div style="font-size:12.5px;color:#e4e4e7;line-height:1.3;"><b style="color:#fda4af;">n°' + n + '</b> ' + esc(nm) + '</div>' +
      '<div style="margin-top:4px;font-size:12px;color:#a1a1aa;">' + colorDot(it) + esc(br) + '</div>' +
      (ds ? '<div style="margin-top:4px;font-size:11.5px;color:#71717a;line-height:1.35;">' + esc(ds) + (dec(it.desc || '').length > 110 ? '…' : '') + '</div>' : '') +
      '<button data-wd-prompt="' + esc(it.pid || '') + '" title="Voir/copier le prompt de description" style="margin-top:6px;width:100%;background:transparent;border:1px solid #52525b;color:#a1a1aa;border-radius:6px;padding:5px 0;font-size:11px;cursor:pointer;">&#128203; prompt</button>' +
      '<div data-wd-promptout style="display:none;margin-top:4px;font-size:11px;color:#d4d4d8;line-height:1.4;white-space:pre-wrap;"></div>' +
      '<button data-wd-mode="' + esc(it.pid || '') + '" title="Mode d\u2019emploi et effets" style="display:none;margin-top:6px;width:100%;background:transparent;border:1px solid #a16207;color:#fcd34d;border-radius:6px;padding:5px 0;font-size:11px;cursor:pointer;">&#128214; mode d\u2019emploi</button>' +
      '<div data-wd-modeout style="display:none;margin-top:4px;font-size:11px;color:#fcd34d;line-height:1.4;white-space:pre-wrap;"></div>' +
      '</div></div>';
  }
  function collectAll() {
    const all = [];
    let g = 0;
    for (const c of W.cats) for (const it of c.items) { g++; try { if (it && !it._rid) it._rid = c.id; } catch (eR) {} all.push({ cat: c.label, kind: c.kind || 'wear', it: it, g: g }); }
    return all;
  }
  function render() {
    const grid = document.getElementById('wdGrid');
    if (!grid) return;
    const q = (document.getElementById('wdSearch').value || '').toLowerCase().trim();
    const catId = document.getElementById('wdCat').value;
    let all = collectAll();
    if (catId) all = all.filter(x => x.cat === catId);
    if (q) {
      const words = q.split(/\s+/);
      all = all.filter(x => {
        const hay = ((x.it.name || '') + ' ' + (x.it.brand || '') + ' ' + ((x.it.colors || []).join(' ')) + ' ' + (x.it.desc || '') + ' ' + x.cat).toLowerCase();
        return words.every(w => hay.indexOf(w) !== -1);
      });
    }
    all = all.slice(0, 120);
    grid.innerHTML = all.map((x, i) => card(x.it, i, x.g)).join('') ||
      '<div style="color:#71717a;font-size:13px;padding:20px;">Rien trouvé. Essaie « rouge », « dentelle », « corset »…</div>';
    const byPid = {};
    try { all.forEach(function (x) { if (x && x.it && x.it.pid) byPid[x.it.pid] = x.it; }); } catch (e) {}
    async function promptFor(btn) {
      try {
        const pid = btn.getAttribute('data-wd-prompt');
        const it = (pid && byPid[pid]) || null;
        if (!it) return;
        btn.textContent = '…';
        const s = await describeItem(it);
        const out = btn.parentNode ? btn.parentNode.querySelector('[data-wd-promptout]') : null;
        if (out && s) { out.style.display = 'block'; out.textContent = s; }
        btn.textContent = '📋 prompt';
        if (s) {
          try { await navigator.clipboard.writeText(s); } catch (e) { try { const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (e2) {} }
          try { if (App.UI && App.UI.showToast) App.UI.showToast('Prompt copié', 'success'); } catch (e) {}
        }
      } catch (e) {}
    }
    grid.querySelectorAll('.wd-card').forEach(el => {
      el.onclick = () => {
        const found = all[+el.dataset.i];
        if (!found || !found.it) return;
        modalChoose(found.it, found.kind);
      };
      const im = el.querySelector('img[data-full]');
      if (im) { im.onclick = (e) => { e.stopPropagation(); try { window.open(im.dataset.full, '_blank'); } catch (err) {} }; const showPh = () => { try { im.style.display = 'none'; const ph = el.querySelector('[data-wd-noimg]'); if (ph) ph.style.display = 'flex'; } catch (err2) {} }; im.onerror = showPh; try { if (im.complete && im.naturalWidth === 0) showPh(); } catch (err3) {} }
      const pb = el.querySelector('[data-wd-prompt]');
      if (pb) pb.onclick = (e) => { e.stopPropagation(); promptFor(pb); };
      try {
        const mb = el.querySelector('[data-wd-mode]');
        if (mb) {
          const mpid = mb.getAttribute('data-wd-mode');
          const mit = (mpid && byPid[mpid]) || null;
          const mtxt = mit ? modeText(mit) : '';
          if (mtxt) {
            mb.style.display = 'block';
            mb.onclick = (e) => {
              e.stopPropagation();
              try {
                const out = mb.parentNode ? mb.parentNode.querySelector('[data-wd-modeout]') : null;
                if (!out) return;
                const open = out.style.display === 'block';
                out.style.display = open ? 'none' : 'block';
                if (!open && !out.textContent) out.textContent = mtxt;
              } catch (err3) {}
            };
          }
        }
      } catch (eM) {}
    });
    const n = document.getElementById('wdCount');
    if (n) n.textContent = all.length ? ('n°' + all[0].g + '–' + all[all.length - 1].g + ' — ' + all.length + ' modèle(s), dis le numéro pour choisir') : '0 modèle';
  }
  function selectDecor(it) {
    if (!it) return;
    W.decor = { pid: it.pid, name: dec(it.name), brand: dec(it.brand || ''), shop: it.shop || '', colors: it.colors || [], img: it.img || '', url: it.url || '', desc: dec(it.desc || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
    try { stamp(W.decor, 'decor'); } catch (e) {}
    save();
    render();
    refreshBar();
    try {
      const t = (App.UI && App.UI.showToast) ? App.UI.showToast.bind(App.UI) : null;
      if (t) t('Pièce : ' + W.decor.name, 'success');
    } catch (e) {}
  }
  function modalChoose(it, kind) {
    try {
      if (!it) return;
      if (kind === 'decor') { selectDecor(it); return; }
      select(it);
    } catch (e) {}
  }
  function refreshBar() {
    const bar = document.getElementById('wdNow');
    if (!bar) return;
    let h = '';
    if (W.outfit) h += 'Elle portera : <b style="color:#fda4af;">' + esc(W.outfit.name) + '</b>' + (W.outfit.url ? ' <a href="' + esc(W.outfit.url) + '" target="_blank" style="font-size:12px;color:#fda4af;">(acheter' + (W.outfit.shop ? ' · ' + esc(W.outfit.shop) : '') + ')</a>' : '');
    if (W.his) h += (h ? '<br>' : '') + 'Il portera : <b style="color:#93c5fd;">' + esc(W.his.name) + '</b>';
    if (W.decor) h += (h ? '<br>' : '') + 'Dans la pièce : <b style="color:#fcd34d;">' + esc(W.decor.name) + '</b>';
    bar.innerHTML = h || 'Clique un modèle pour l\u2019utiliser : tenues sur eux, meubles dans la pièce.';
  }
  function select(it) {
    if (!it) return;
    const tgt = (W.target === 'him' || W.target === 'decor') ? W.target : 'her';
    if (tgt === 'decor') { selectDecor(it); return; }
    const o = { pid: it.pid, name: dec(it.name), brand: dec(it.brand || ''), price: it.price || '', shop: it.shop || '', colors: it.colors || [], img: it.img || '', url: it.url || '', desc: dec(it.desc || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
    try { stamp(o, tgt); } catch (e) {}
    if (tgt === 'him') W.his = o;
    else { W.outfit = o; W.proposal = null; }
    save();
    render();
    refreshBar();
    try {
      const t = (App.UI && App.UI.showToast) ? App.UI.showToast.bind(App.UI) : null;
      if (t) t((tgt === 'him' ? 'Lui portera : ' : 'Elle portera : ') + o.name, 'success');
    } catch (e) {}
  }
  async function describeItem(it) {
    try {
      if (!it) return '';
      const pid = it.pid || it.name || '';
      W.descs = W.descs || {};
      if (pid && W.descs[pid]) return W.descs[pid];
      let s = '';
      try {
        if (it.img && App && App.Core && App.Core.visionBlobFor && App.Core.visionLook) {
          const blob = await App.Core.visionBlobFor('url', it.img);
          if (blob) s = await App.Core.visionLook(blob, 'Describe this product for an image generator, in English: exact object type, shape, materials, exact colours (precise shade), parts and details. One dense sentence, no preamble.');
        }
      } catch (e) {}
      s = String(s || '').replace(/\s+/g, ' ').trim();
      if (!s) {
        let cols = '';
        try { cols = App.Wardrobe.colWords(it.colors || []); } catch (e) {}
        s = String(it.name || 'object') + (cols ? ', colour ' + cols : '') + (it.desc ? '. ' + String(it.desc).replace(/\s+/g, ' ').trim().slice(0, 160) : '');
      }
      if (pid && s) { W.descs[pid] = s; try { save(); } catch (e) {} }
      return s;
    } catch (e) { return ''; }
  }
  function verified(o) {
    try { if (o && o.pid && W.descs && W.descs[o.pid]) return '. Verified look (draw exactly this): ' + W.descs[o.pid]; } catch (e) {}
    return '';
  }
  function syncAdultNote(host) {
    try {
      let an = document.getElementById('wdAdultNote');
      if (isAdult()) { if (an) an.remove(); return; }
      if (!an) {
        an = document.createElement('div');
        an.id = 'wdAdultNote';
        an.style.cssText = 'padding:8px 16px;font-size:12px;color:#fbbf24;border-bottom:1px solid #27272a;';
        an.textContent = 'Rayons adultes masqués (BDSM, machines…) : déclare une personne majeure dans les réglages et coche « contenu adulte » pour les voir.';
        const grid = (host && host.querySelector) ? host.querySelector('#wdGrid') : document.getElementById('wdGrid');
        if (grid && grid.parentNode) grid.parentNode.insertBefore(an, grid);
      }
    } catch (e) {}
  }
  function openModal() {
    if (document.getElementById('wdModal')) {
      const m = document.getElementById('wdModal');
      m.hidden = false;
      try { const ws = document.getElementById('wdWho'); if (ws) ws.value = W.target || 'her'; } catch (e) {}
      refreshBar();
      render();
      syncAdultNote(m);
      return;
    }
    const d = document.createElement('div');
    d.id = 'wdModal';
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;padding:16px;';
    d.onclick = (e) => { if (e.target === d) d.hidden = true; };
    d.innerHTML =
      '<div style="background:#09090b;border:1px solid #27272a;border-radius:14px;max-width:860px;width:100%;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:14px 16px;border-bottom:1px solid #27272a;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
      '<b id="wdTitle" style="color:#e4e4e7;font-size:15px;">Catalogue</b>' +
      '<input id="wdSearch" placeholder="rouge, dentelle, corset…" style="flex:1;min-width:140px;background:#18181b;border:1px solid #3f3f46;color:#e4e4e7;border-radius:8px;padding:8px 10px;font-size:13px;">' +
      '<select id="wdCat" style="background:#18181b;border:1px solid #3f3f46;color:#e4e4e7;border-radius:8px;padding:8px;font-size:13px;max-width:220px;"></select>' +
      '<select id="wdWho" title="Pour qui ?" style="background:#18181b;border:1px solid #e11d48;color:#e4e4e7;border-radius:8px;padding:8px;font-size:13px;"><option value="her">Pour elle</option><option value="him">Pour lui</option><option value="decor">Pour la pi\u00e8ce</option></select>' +
      '<button id="wdClose" style="background:#27272a;border:none;color:#e4e4e7;border-radius:8px;padding:8px 12px;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div id="wdNow" style="padding:8px 16px;font-size:13px;color:#a1a1aa;border-bottom:1px solid #27272a;"></div>' +
      '<div style="padding:6px 16px;font-size:12px;color:#71717a;"><span id="wdCount"></span></div>' +
      '<div id="wdGrid" style="padding:6px 16px 16px;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;"></div>' +
      '<div style="padding:10px 16px;border-top:1px solid #27272a;display:flex;gap:10px;">' +
      '<button id="wdNude" style="background:transparent;border:1px solid #52525b;color:#a1a1aa;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:13px;">Retirer (nue)</button>' +
      '<span style="font-size:12px;color:#52525b;align-self:center;">La tenue choisie habille la scène et les images suivantes.</span>' +
      '</div></div>';
    document.body.appendChild(d);
    syncAdultNote(d);
    document.getElementById('wdClose').onclick = () => { d.hidden = true; };
    document.getElementById('wdSearch').oninput = render;
    document.getElementById('wdCat').onchange = render;
    try {
      const ws = document.getElementById('wdWho');
      if (ws) { ws.value = W.target || 'her'; ws.onchange = () => { try { W.target = ws.value; refreshBar(); } catch (e) {} }; }
    } catch (e) {}
    document.getElementById('wdNude').onclick = () => {
      W.outfit = null; save(); render();
      document.getElementById('wdNow').textContent = 'Elle est nue.';
    };
    load().then(() => {
      const t = document.getElementById('wdTitle');
      if (t) t.textContent = isAdult() ? 'Catalogue lingerie' : 'Catalogue vêtements';
      const sel = document.getElementById('wdCat');
      if (sel) sel.innerHTML = '<option value="">Toutes rayons</option>' + W.cats.map(c => '<option value="' + esc(c.label) + '">' + esc(c.label) + ' (' + c.items.length + ')</option>').join('');
      if (liveOutfit() && document.getElementById('wdNow')) document.getElementById('wdNow').innerHTML = 'Elle portera : <b style="color:#fda4af;">' + esc(liveOutfit().name) + '</b>';
      render();
    });
    render();
  }
  let _ridByPid = null;
  function shortRid(rid) { try { const s = String(rid || ''); const i = s.indexOf('#'); return i >= 0 ? s.slice(i + 1) : s; } catch (e) { return ''; } }
  function ridOf(pid) {
    try {
      if (!_ridByPid) { _ridByPid = {}; for (const c of (W.cats || [])) for (const it of (c.items || [])) { if (it && it.pid && !_ridByPid[it.pid]) _ridByPid[it.pid] = c.id; } }
      return _ridByPid[pid] || '';
    } catch (e) { return ''; }
  }
  function modeText(item) {
    try {
      if (!item) return '';
      const pid = item.pid || item;
      const M = W.modes || {};
      const im = (M.items || {})[pid];
      if (im && (im.mode || im.effets)) return 'MODE D\u2019EMPLOI : ' + (im.mode || '') + (im.effets ? '\nEFFETS : ' + im.effets : '');
      const rid = shortRid(item._rid || ridOf(pid));
      const rm = (M.rayons || {})[rid];
      if (rm && (rm.mode || rm.effets)) return 'MODE D\u2019EMPLOI (' + rid + ') : ' + (rm.mode || '') + (rm.effets ? '\nEFFETS : ' + rm.effets : '');
    } catch (e) {}
    return '';
  }
  function modeLine() {
    try {
      const jobs = [];
      if (W.outfit) jobs.push(['elle porte', W.outfit]);
      if (W.his) jobs.push(['il porte', W.his]);
      if (W.decor) jobs.push(['dans la pi\u00e8ce', W.decor]);
      if (W.others) for (const k of Object.keys(W.others)) { if (W.others[k]) jobs.push([k + ' porte', W.others[k]]); }
      const lines = [];
      for (const jb of jobs) { const t = modeText(jb[1]); if (t) lines.push('- ' + (jb[1].name || jb[1].pid) + ' (' + jb[0] + ') : ' + t.replace(/\s*\n\s*/g, ' | ')); }
      if (!lines.length) return '';
      return "[MODE D\u2019EMPLOI - OBJETS PORT\u00c9S] Tu connais ces objets par c\u0153ur, tu les utilises exactement comme d\u00e9crit, et tu racontes leurs effets vrais (physiques, mentaux, sexuels) dans tes propres mots, en sc\u00e8ne :\n" + lines.join('\n');
    } catch (e) { return ''; }
  }
  App.Wardrobe = {
    open: openModal,
    current: () => liveOutfit(),
    his: () => liveHis(),
    others: () => liveOthers(),
    decor: () => liveDecor(),
    clear: () => { W.outfit = null; save(); },
    proposal: () => liveProposal(),
    propose: (item) => {
      if (!item) return false;
      W.proposal = { pid: item.pid, name: dec(item.name), brand: dec(item.brand || ''), shop: item.shop || '', colors: item.colors || [], img: item.img || '', url: item.url || '', desc: dec(item.desc || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
      stamp(W.proposal, 'her');
      save();
      return true;
    },
    clearHis: () => { W.his = null; save(); },
    clearDecor: () => { W.decor = null; save(); },
    describe: (item) => describeItem(item),
    modeFor: (item) => modeText(item),
    modeLine: () => modeLine(),
    arm: (items, startNum, total) => {
      try { return showGallery(items, startNum, total); } catch (e) { return false; }
    },
    applyDecor: (item) => {
      if (!item) return false;
      W.decor = { pid: item.pid, name: dec(item.name), brand: dec(item.brand || ''), shop: item.shop || '', colors: item.colors || [], img: item.img || '', url: item.url || '', desc: dec(item.desc || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
      stamp(W.decor, 'decor');
      save();
      return true;
    },
    apply: (item, who) => {
      if (!item) return false;
      const o = { pid: item.pid, name: dec(item.name), brand: dec(item.brand || ''), shop: item.shop || '', colors: item.colors || [], img: item.img || '', url: item.url || '', desc: dec(item.desc || '').replace(/\s+/g, ' ').trim().slice(0, 200) };
      stamp(o, who);
      if (who === 'him') W.his = o;
      else if (typeof who === 'string' && who.indexOf('other:') === 0 && who.length > 6) { W.others = W.others || {}; W.others[who.slice(6)] = o; }
      else W.outfit = o;
      if (who !== 'him' && !(typeof who === 'string' && who.indexOf('other:') === 0)) W.proposal = null;
      save();
      return true;
    },
    pick: (query, n) => {
      try {
        const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const words = norm(query).split(/[^a-z]+/i).map(w => (w.length > 3 ? w.replace(/[sx]$/, '') : w)).filter(w => w.length > 2 && !/^(une|des|les|pour|avec|dans|elle|lui|moi|toi|nous|vous|ils|elles|est|sont|pas|plus|tout|tous|toute|toutes|avec|sans|peau|porter|mettre|veux|veut|peux|peut|que|qui|donne|montre|remontre|quel|quelle|choisir|habiller|robe|vetement|vetements|lingerie|tenue|tenues|ensemble|ensembles|catalogue)$/.test(w));
        let all = collectAll();
        if (words.length) {
          const scored = [];
          for (const x of all) {
            const hay = norm((x.it.name || '') + ' ' + (x.it.brand || '') + ' ' + ((x.it.colors || []).join(' ')) + ' ' + (x.it.desc || ''));
            let c = 0;
            for (const w of words) if (hay.indexOf(w) !== -1) c++;
            if (c > 0) scored.push({ x: x, c: c });
          }
          scored.sort((a, b) => b.c - a.c);
          if (scored.length) all = scored.map(s => s.x);
        }
        const out = all.slice(0, Math.max(1, Math.min(40, n || 10))).map(x => ({ kind: x.kind, cat: x.cat, pid: x.it.pid, name: dec(x.it.name), brand: dec(x.it.brand || ''), shop: x.it.shop || '', colors: x.it.colors || [], img: x.it.img || '', url: x.it.url || '', desc: dec(x.it.desc || '').replace(/\s+/g, ' ').trim().slice(0, 160) }));
        return out;
      } catch (e) { return []; }
    },
    byNumber: (n) => {
      try {
        n = parseInt(n, 10);
        if (!(n >= 1)) return null;
        let g = 0;
        for (const c of W.cats) for (const it of c.items) { g++; if (g === n) return { kind: c.kind || 'wear', item: it }; }
        return null;
      } catch (e) { return null; }
    },
    colName: function (hex) { try { const T = [['black','000000'],['white','ffffff'],['red','ff0000'],['dark red','8b0000'],['burgundy','800020'],['wine','722f37'],['pink','ffc0cb'],['fuchsia','ff00ff'],['orange','ff8000'],['beige','f5f5dc'],['nude','e3bc9a'],['yellow','ffff00'],['gold','ffd700'],['green','008000'],['dark green','013220'],['emerald','046a38'],['khaki','bdb76b'],['blue','0000ff'],['navy','000080'],['sky blue','87ceeb'],['turquoise','40e0d0'],['purple','800080'],['violet','8f00ff'],['brown','8b4513'],['camel','c19a6b'],['grey','808080'],['dark grey','3a3a3a'],['light grey','d3d3d3'],['silver','c0c0c0']]; let h = String(hex || '').replace('#','').toLowerCase(); if (/^[0-9a-f]{3}$/.test(h)) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]; if (!/^[0-9a-f]{6}$/.test(h)) return String(hex||''); const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16); let best='red',bd=1e12; for (const e of T) { const d=(r-parseInt(e[1].slice(0,2),16))**2+(g-parseInt(e[1].slice(2,4),16))**2+(b-parseInt(e[1].slice(4,6),16))**2; if(d<bd){bd=d;best=e[0];} } return best; } catch (e) { return String(hex||''); } },
    colWords: function (cols) { try { if (!Array.isArray(cols)||!cols.length) return ''; const self=this; return cols.map(function(c){ return (/^#[0-9a-f]{3,8}$/i.test(String(c||'')) ? self.colName(c) : String(c)); }).join('/'); } catch (e) { return ''; } },
    promptLine: () => {
      try {
        let s = '';
        const oL = liveOutfit();
        if (oL) {
          const o = oL;
          s += '[WARDROBE - WHAT SHE WEARS NOW] She wears exactly this real outfit and nothing else (unless the scene itself undresses her later): ' +
            o.name + (o.brand ? ' (' + o.brand + ')' : '') +
            (o.colors && o.colors.length ? ', colour ' + App.Wardrobe.colWords(o.colors) : '') +
            (o.desc ? '. ' + o.desc : '') +
            (o.price ? ' [listed at ' + o.price + (o.shop ? ' on ' + o.shop : '') + ']' : '') +
            '. Name it naturally when relevant; every image prompt of her draws exactly this outfit on her body. Quote its shop and price only if he asks where to buy it - never advertise unprompted.' + verified(o);
        }
        if (liveHis()) {
          const h = liveHis();
          if (s) s += '\n';
          s += '[WARDROBE - WHAT HE WEARS NOW] He wears exactly this real outfit and nothing else (unless the scene itself undresses him later): ' +
            h.name + (h.brand ? ' (' + h.brand + ')' : '') +
            (h.colors && h.colors.length ? ', colour ' + App.Wardrobe.colWords(h.colors) : '') +
            (h.desc ? '. ' + h.desc : '') +
            '. This overrides any older clothing: never mention previous garments again. Every image prompt of him draws exactly this outfit on his body.' + verified(h);
        }
        try {
          const oo = liveOthers();
          for (const nm of Object.keys(oo)) {
            const x = oo[nm];
            if (!x) continue;
            if (s) s += '\n';
            s += '[WARDROBE - ' + nm.toUpperCase() + ' WEARS NOW] ' + nm + ' wears exactly this real outfit and nothing else (unless the scene itself undresses them later): ' +
              x.name + (x.brand ? ' (' + x.brand + ')' : '') +
              (x.colors && x.colors.length ? ', colour ' + App.Wardrobe.colWords(x.colors) : '') +
              (x.desc ? '. ' + x.desc : '') +
              '. Every image prompt of the scene draws exactly this outfit on ' + nm + '.' + verified(x);
          }
        } catch (e) {}
        if (liveDecor()) {
          const d = liveDecor();
          if (s) s += '\n';
          s += '[SCENE DECOR - WHAT THE ROOM CONTAINS] The room of this scene contains exactly this real furniture piece, placed where it belongs and used as staged: ' +
            d.name + (d.brand ? ' (' + d.brand + ')' : '') +
            (d.colors && d.colors.length ? ', colour ' + App.Wardrobe.colWords(d.colors) : '') +
            (d.desc ? '. ' + d.desc : '') +
            '. It stays there for the whole scene unless he moves it. Every image prompt of the room draws exactly this piece in it.' + verified(d);
        }
        try {
          const p = liveProposal();
          if (p && (!oL || p.pid !== oL.pid)) {
            if (s) s += '\n';
            s += '[WARDROBE PROPOSAL - NOT WORN YET] He proposed this piece for her but she has NOT accepted it yet: ' +
              p.name + (p.brand ? ' (' + p.brand + ')' : '') +
              (p.colors && p.colors.length ? ', colour ' + p.colors.join('/') : '') +
              (p.desc ? '. ' + p.desc : '') +
              '. Draw it on her ONLY if the scene text above says she accepted it or was forced to wear it; otherwise draw what the scene text says she wears.';
          }
        } catch (e) {}
        return s;
      } catch (e) { return ''; }
    },
    hisLine: () => {
      try {
        const h = liveHis();
        if (!h) return '';
        return '[WARDROBE - WHAT HE WEARS NOW] He wears exactly this real outfit: ' + h.name + (h.brand ? ' (' + h.brand + ')' : '') + (h.colors && h.colors.length ? ', colour ' + App.Wardrobe.colWords(h.colors) : '') + (h.desc ? '. ' + h.desc : '');
      } catch (e) { return ''; }
    },
    otherLine: () => {
      try {
        const oo = liveOthers();
        const L = [];
        for (const nm of Object.keys(oo)) {
          const x = oo[nm];
          if (x) L.push(nm + ' wears: ' + x.name + (x.brand ? ' (' + x.brand + ')' : ''));
        }
        return L.join(' | ');
      } catch (e) { return ''; }
    }
  };
  function addBtn() {
    try {
      if (document.getElementById('wardrobeBtn')) return true;
      const anchor = document.getElementById('attachBtn');
      if (!anchor || !anchor.parentNode) return false;
      const b = document.createElement('button');
      b.id = 'wardrobeBtn';
      b.title = 'Catalogue lingerie — l\u2019habiller';
      b.setAttribute('aria-label', 'Catalogue lingerie');
      b.style.cssText = 'background:transparent;border:none;color:var(--text-muted);cursor:pointer;padding:5px;min-height:34px;min-width:34px;display:flex;align-items:center;justify-content:center;';
      b.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"></path></svg>';
      b.onclick = (e) => { e.stopPropagation(); openModal(); };
      anchor.parentNode.insertBefore(b, anchor.nextSibling);
      return true;
    } catch (e) { return false; }
  }
  if (!addBtn()) {
    let tries = 0;
    const t = setInterval(() => { if (addBtn() || ++tries > 20) clearInterval(t); }, 500);
  }
  try { load().catch(() => {}); } catch (e) {}
}

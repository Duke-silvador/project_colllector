// Loads the dataset once per data version and keeps it in the browser's cache, so
// moving between the explorer's pages does not download it each time (it is parsed again:
// a page is a document of its own). <dataset>-meta.json names the current version and its
// shards: gzipped JSON, shard 0 carrying the dictionaries and every shard a run of games,
// with a shard per column beside it (seat fields only some pages read). The shards stream
// through DecompressionStream while they download, and the response goes into the Cache
// API as fetched, under the version's stamp. The data may sit on another origin
// (window.ZH_DATA_BASE, config.js): the bucket behind the GitHub Pages deployment.
//
// The veil under #loading gets a progress bar while bytes are coming in (the first visit
// is a download of the whole set, tens of seconds on a slow line) and a phase message
// for each blocking step after that; window.ZH_LOAD lets common.js post its own phases.
window.ZH_LOAD = (function () {
  const veil = () => document.getElementById('loading');
  const part = (cls, tag) => {
    const v = veil(); if (!v) return null;
    let el = v.querySelector('.' + cls);
    if (!el) { el = document.createElement(tag || 'div'); el.className = cls; if (cls === 'prog') el.innerHTML = '<i></i>'; v.appendChild(el); }
    return el;
  };
  return {
    msg(t) { const el = part('msg'); if (el) el.textContent = t; },
    note(t) { const el = part('phase'); if (el) el.textContent = t || ''; },
    // fraction done, or null to take the bar away
    bar(f) { const el = part('prog'); if (!el) return; el.hidden = f == null; if (f != null) el.firstElementChild.style.width = (Math.max(0, Math.min(1, f)) * 100).toFixed(1) + '%'; },
    // a phase after the bytes are in: message + where the bar stands, then a paint before the step runs
    step(t, f) { this.msg(t); this.bar(f); return this.tick(); },
    // let the veil paint before a step that blocks the thread: a frame and then a task, so the paint is in
    // between. A hidden tab has nothing to paint and throttles its timers to once a second (rAF stops
    // altogether), so there it is no wait at all; the timeout is for a tab hidden mid-wait
    tick() {
      if (document.hidden) return Promise.resolve();
      return new Promise(r => { let done = false; const go = () => { if (!done) { done = true; r(); } };
        requestAnimationFrame(() => setTimeout(go, 0)); setTimeout(go, 250); });
    },
  };
})();

window.ZH_DATA = (async function () {
  const L = window.ZH_LOAD;
  // a page names its dataset before this script runs (window.ZH_DATASET); the unit-mix and
  // win-rate pages share 'units', the combat page has its own smaller export. A page also names
  // the columns it reads (window.ZH_COLS: seat fields the export keeps in shards of their own, see
  // the export's column list) - the posture page has no use for the build-order runs, 60% of the bytes -
  // and the ones it can read later than its first paint (window.ZH_COLS_LATER): those come after the
  // page is up, folded in a shard at a time between tasks, and the dataset's `later[col]` promise
  // resolves when the column is in (the win-rate cards that read the opening wait for it, the rest paint)
  const DS = window.ZH_DATASET || 'units', COLS = window.ZH_COLS || [], LATER = window.ZH_COLS_LATER || [];
  const DIR = window.ZH_DATA_BASE || 'data/', META = DIR + DS + '-meta.json', STORE = 'zh-data-' + DS, KEY = 'zh-data-stamp-' + DS;
  const mb = b => (b / 1048576).toFixed(1);
  const fmt = n => n.toLocaleString('en-US');

  const r = await fetch(META, { cache: 'no-cache' });
  if (!r.ok) throw new Error(META + ' ' + r.status);
  const meta = await r.json();
  if (meta.v !== 2 && meta.v !== 3) throw new Error('unexpected data version ' + meta.v);
  for (const c of COLS.concat(LATER)) if (!(meta.cols || []).includes(c)) throw new Error('the ' + DS + ' export has no ' + c + ' column - re-export');
  // a random subset of the games, from the URL: ?games=<count> or ?pct=<share of the games>, one or the other
  // (both given, neither is taken), with ?seed=<int> naming the draw so every page of the visit - the nav links
  // carry the query, common.js - and a shared link open the same games. A value that is not a number, or one
  // that is out of range (zero, the whole set or more), comes off the URL and the whole set loads. An export
  // with `draw` in its meta (the games shuffled, the shards cut every so many games) is drawn
  // by shard - a seeded order of the shards, whole ones until the count is reached and a prefix of one more -
  // so only that share is read and parsed; an older export is drawn by game (a seeded partial shuffle of the
  // indices), every shard read and the games not drawn dropped as they parse. A page's own ZH_SUBSET.link()
  // / clear() move between pages under the same draw and back to the whole set
  const nGames = meta.shards.every(sh => sh.games > 0) ? meta.shards.reduce((a, sh) => a + sh.games, 0) : meta.games || 0;
  const byShard = !!meta.draw && meta.shards.every(sh => sh.games > 0);
  const subset = (function () {
    const url = new URL(location.href), q = url.searchParams;
    const num = k => { if (!q.has(k)) return null; const v = q.get(k).trim(); return /^\d+(\.\d+)?$/.test(v) ? +v : NaN; };
    const games = num('games'), pct = num('pct');
    let n = 0, mode = null;
    if (games != null && pct != null) n = 0;   // both: neither
    else if (games != null) { n = Math.floor(games); mode = 'games'; }
    else if (pct != null) { n = Math.round(pct / 100 * nGames); mode = 'pct'; }
    if (!(n >= 1 && n < nGames)) { n = 0; mode = null; }
    let seed = q.get('seed');
    seed = n && seed != null && /^\d{1,10}$/.test(seed.trim()) && +seed < 4294967296 ? +seed : n ? Math.floor(Math.random() * 4294967296) : null;
    for (const k of ['games', 'pct', 'seed']) q.delete(k);
    if (n) { q.set(mode, mode === 'games' ? String(n) : String(pct)); q.set('seed', String(seed)); }
    if (url.href !== location.href) { try { history.replaceState(history.state, '', url.href); } catch (e) { /* file: or a sandbox */ } }
    // the query the nav links carry between pages: the draw, not a one-shot flag like ?tour
    const lq = new URLSearchParams(url.search); lq.delete('tour');
    const search = lq.toString() ? '?' + lq : '';
    window.ZH_SUBSET = {
      n, total: nGames, seed, active: !!n,
      link: to => { const [path, hash] = to.split('#'); return path + (n ? search : '') + (hash ? '#' + hash : ''); },
      clear: () => { location.href = location.pathname + location.hash; },
      // reload on a share of the games (the header's picker): the same seed when one is drawn, else a fresh one
      set: pct => { const p = new URLSearchParams(); p.set('pct', String(pct)); p.set('seed', String(seed != null ? seed : Math.floor(Math.random() * 4294967296))); location.href = location.pathname + '?' + p + location.hash; },
    };
    if (!n) return null;
    // mulberry32 on the seed
    let a = seed >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const out = { n, total: nGames, seed, pct: n / nGames * 100 };
    if (byShard) {
      // the shards in a seeded order, taken whole until the count is reached, the last one a prefix (the games
      // are shuffled at export, so any prefix of any shard is as random as the rest); take[shard] = games kept
      const S = meta.shards.length, order = new Uint32Array(S); for (let i = 0; i < S; i++) order[i] = i;
      for (let i = S - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
      const take = new Map(); let left = n;
      for (let i = 0; i < S && left > 0; i++) { const sh = order[i], k = Math.min(left, meta.shards[sh].games); take.set(sh, k); left -= k; }
      out.take = take; out.shards = [...take.keys()].sort((x, y) => x - y);
    } else {
      // the first n of a seeded shuffle of the game indices, the swaps stopped at n
      const idx = new Uint32Array(nGames); for (let i = 0; i < nGames; i++) idx[i] = i;
      const keep = new Uint8Array(nGames);
      for (let i = 0; i < n; i++) { const j = i + Math.floor(rnd() * (nGames - i)); const t = idx[i]; idx[i] = idx[j]; idx[j] = t; keep[idx[i]] = 1; }
      out.keep = keep;
    }
    return out;
  })();
  // the shards a draw by shard reads: the drawn ones, and shard 0 for its dictionaries (its games dropped unless drawn)
  const shardIn = i => !subset || !subset.take || i === 0 || subset.take.has(i);
  let cache = null;
  try { if (window.caches) cache = await caches.open(STORE); } catch (e) { cache = null; }
  // the cached shards are good while their stamp matches what the server says is current; the key
  // carries the stamp too, so a shard re-exported under the same name is never read from an HTTP cache
  let fresh = false;
  try { fresh = !!cache && localStorage.getItem(KEY) === meta.stamp; } catch (e) { fresh = false; }
  if (cache && !fresh) { try { for (const k of await cache.keys()) await cache.delete(k); } catch (e) { /* fine */ } }
  const urlOf = f => DIR + f + '?v=' + encodeURIComponent(meta.stamp);

  // the files to fetch: each data shard, then the columns asked for, aligned with it; the later columns after
  const files = [], laterFiles = [];
  const colFile = (sh, i, c) => { const cs = (sh.cols || {})[c]; if (!cs) throw new Error(sh.f + ' has no ' + c + ' column'); return { f: cs.f, bytes: cs.bytes, shard: i, col: c }; };
  meta.shards.forEach((sh, i) => {
    if (!shardIn(i)) return;
    files.push({ f: sh.f, bytes: sh.bytes, shard: i, col: null });
    for (const c of COLS) files.push(colFile(sh, i, c));
  });
  for (const c of LATER) meta.shards.forEach((sh, i) => { if (shardIn(i)) laterFiles.push(colFile(sh, i, c)); });
  files.forEach(x => { x.got = 0; });
  laterFiles.forEach(x => { x.got = 0; });
  const total = files.reduce((a, x) => a + (x.bytes || 0), 0), BYTES = .75;
  let last = 0, downloading = false, firstDone = false;
  const progress = () => {
    if (firstDone) return;   // the later columns report through laterProgress, the veil is down
    const sum = files.reduce((a, x) => a + x.got, 0);
    if (sum - last < 262144 && sum !== total) return;
    last = sum;
    L.msg((downloading ? 'downloading ' : 'reading ') + mb(sum) + (total ? ' / ' + mb(total) : '') + ' MB' + (downloading ? '' : ' from the cache'));
    if (total) L.bar(sum / total * BYTES);   // the bytes are the first BYTES of the bar; parsing, indexing and drawing take the rest
  };

  // base64 text -> bytes, a chunk at a time: a chunk is decoded up to its last whole quad and the rest
  // waits for the next one; whitespace (a trailing newline, wrapped lines) is dropped. Only the old
  // base64-wrapped export (.b64 files) needs this
  function b64Decoder(x) {
    let carry = '';
    const td = new TextDecoder();
    const take = (s, flush) => {
      s = carry + s.replace(/\s+/g, '');
      const keep = flush ? 0 : s.length % 4;
      carry = s.slice(s.length - keep); s = s.slice(0, s.length - keep);
      if (!s) return null;
      const bin = atob(s), out = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
      return out;
    };
    return new TransformStream({
      transform(chunk, ctl) { x.got += chunk.length; progress(); const o = take(td.decode(chunk, { stream: true }), false); if (o) ctl.enqueue(o); },
      flush(ctl) { const o = take(td.decode(), true); if (o) ctl.enqueue(o); },
    });
  }
  const counter = x => new TransformStream({ transform(c, ctl) { x.got += c.length; progress(); ctl.enqueue(c); } });

  const puts = [];
  // a file's JSON text, streamed. Gzip is told by the bytes (1f 8b), not the name: a server may hand a .gz
  // file already inflated (Content-Encoding), the Cache API keeps whichever came
  async function textOf(x) {
    const { f } = x, url = urlOf(f);
    let res = null;
    if (fresh) { try { res = await cache.match(url); } catch (e) { res = null; } }
    if (!res) {
      if (!downloading) { downloading = true; L.note('first visit: the whole dataset comes down once; later visits open it from the browser cache'); }
      res = await fetch(url);
      if (!res.ok) throw new Error(url + ' ' + res.status);
      if (cache) puts.push(cache.put(url, res.clone()).catch(() => { /* quota or private mode: next visit fetches again */ }));
    }
    let s = res.body || new Blob([await res.arrayBuffer()]).stream();
    s = s.pipeThrough(/\.b64$/.test(f) ? b64Decoder(x) : counter(x));
    const reader = s.getReader(), first = await reader.read();
    if (first.done) return '';
    const head = first.value, gz = head.length >= 2 ? head[0] === 0x1f && head[1] === 0x8b : /\.gz/.test(f);
    s = new ReadableStream({ start(ctl) { ctl.enqueue(head); }, async pull(ctl) { const x = await reader.read(); if (x.done) ctl.close(); else ctl.enqueue(x.value); } });
    if (gz) {
      if (!window.DecompressionStream) throw new Error('this browser cannot inflate gzip (no DecompressionStream)');
      s = s.pipeThrough(new DecompressionStream('gzip'));
    }
    return new Response(s).text();
  }

  // a column shard: per game the seats' fields, in the data shard's order, folded into its seats. Under a
  // draw, cut[shard] says which of the shard's games are in: a count (a prefix, the draw by shard) or a list
  // of indices (the draw by game); pick() applies it to a parsed shard's games
  const cut = [];
  const pick = (gs, c) => c == null ? gs : typeof c === 'number' ? (gs.length = Math.min(gs.length, c), gs) : c.map(k => gs[k]);
  const fold = (data, off, part, c) => { const gs = pick(part.games, c); for (let j = 0; j < gs.length; j++) { const seats = data.games[off + j].p, cs = gs[j]; for (let k = 0; k < cs.length; k++) Object.assign(seats[k], cs[k]); } };

  L.bar(0);
  const texts = await Promise.all(files.map(textOf));
  if (window.performance && performance.mark) performance.mark('zh-text');   // inflated: performance.getEntriesByName('zh-text')
  L.note('');
  let data = null, off = 0, orig = 0;   // orig: the first game of the shard being parsed, in the whole set
  const nShards = meta.shards.length, offs = [];   // offs[i]: the first game of shard i
  const parsing = subset && subset.take ? 'parsing a random ' + fmt(subset.n) + ' of ' + fmt(nGames) + ' games' : 'parsing ' + fmt(meta.games || 0) + ' games' + (subset ? ' (keeping ' + fmt(subset.n) + ' at random)' : '');
  let yielded = 0;   // the veil paints between parses by elapsed time, not once per file: the shards are small and many
  for (let i = 0; i < texts.length; i++) {
    const { shard, col } = files[i];
    L.msg(parsing + (files.length > 1 ? ' \u00b7 ' + (i + 1) + '/' + files.length : '') + (col ? ' (' + col + ')' : '') + '\u2026'); L.bar(BYTES + .1 * i / texts.length);
    if (!i || performance.now() - yielded > 80) { await L.tick(); yielded = performance.now(); }
    const part = JSON.parse(texts[i]); texts[i] = null;
    if (!col) {
      off = data ? data.games.length : 0; offs[shard] = off;
      if (subset && subset.keep) { const ks = []; for (let k = 0; k < part.games.length; k++) if (subset.keep[orig + k]) ks.push(k); orig += part.games.length; cut[shard] = ks; }
      else if (subset) cut[shard] = subset.take.get(shard) || 0;
      const gs = pick(part.games, cut[shard]); part.games = gs;
      if (!data) data = part;
      else for (const g of gs) data.games.push(g);
    } else fold(data, off, part, cut[shard]);
  }
  if (subset) { const { keep, take, ...rest } = subset; data.subset = rest; }
  firstDone = true;
  if (window.performance && performance.mark) performance.mark('zh-data');   // parsed: performance.getEntriesByName('zh-data')

  // the later columns: fetched now that the first paint's bytes are in, each parsed and folded a shard at a time
  // between tasks (a message port: a hidden tab clamps timers, not these), so the live page stalls for a shard's
  // parse at most. data.later[col] resolves when the column is on every seat; data.laterProgress[col] is its
  // bytes fraction meanwhile, for a card's placeholder
  const port = new MessageChannel(), queue = [];
  port.port1.onmessage = () => { const fn = queue.shift(); if (fn) fn(); };
  const task = () => new Promise(r => { queue.push(r); port.port2.postMessage(0); });
  data.later = {}; data.laterProgress = {};
  const laterTexts = laterFiles.map(x => textOf(x));   // the downloads start together; cached, they are reads
  // the parsing waits for the first paint (the veil down): the page's own passes come first on the thread
  const painted = async () => { while (document.getElementById('loading')) await new Promise(r => setTimeout(r, 100)); };
  for (const c of LATER) {
    const mine = laterFiles.map((x, i) => [x, i]).filter(([x]) => x.col === c), bytes = mine.reduce((a, [x]) => a + (x.bytes || 0), 0);
    const tick = setInterval(() => { data.laterProgress[c] = bytes ? mine.reduce((a, [x]) => a + x.got, 0) / bytes : 0; }, 200);
    data.laterProgress[c] = 0;
    data.later[c] = (async () => {
      for (const [x, i] of mine) {
        const text = await laterTexts[i]; laterTexts[i] = null;
        await painted(); await task();
        const part = JSON.parse(text);
        await task();
        fold(data, offs[x.shard], part, cut[x.shard]);
      }
      clearInterval(tick); data.laterProgress[c] = 1;
      if (window.performance && performance.mark) performance.mark('zh-later-' + c);
    })();
  }
  const done = Promise.all(Object.values(data.later));
  if (cache) { done.then(() => Promise.all(puts)).then(() => { try { localStorage.setItem(KEY, meta.stamp); } catch (e) { /* fine */ } }); }
  return data;
})();

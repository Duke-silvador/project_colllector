// The Mix over Time section's data and count, off the page's thread (a Web Worker, started by unit-mix.html).
// The timeline shards (data/<dataset>-time-*) are ~50 MB of JSON for the library: fetched, inflated and
// parsed here, they no longer freeze the page for two seconds after it is ready; and each count over the
// selection (~300 ms for the whole library) runs here too, the page posting the seat mask and getting
// the bins back. The page's copy of the population (games, seats, templates) arrives once as typed arrays
// ('ctx'); the count's result is the shape unit-mix.html's drawTime reads, the bins as transferred buffers.
'use strict';
let TIME = null;   // { stamp, bucket, cap, byMatch: match id -> game timelines }
let C = null;      // the population: see unit-mix.html timeCtx()

// a shard's JSON: gzip told by the bytes (a server may hand the .gz already inflated), base64 only on
// the old base64-wrapped export
const inflate = async (res, name, onBytes) => {
  let bytes;
  if (onBytes && res.body) {   // read in chunks, so the page can show how far the download is
    const reader = res.body.getReader(), chunks = []; let n = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); n += value.length; onBytes(n); }
    bytes = new Uint8Array(n); let o = 0; for (const c of chunks) { bytes.set(c, o); o += c.length; }
  } else bytes = new Uint8Array(await res.arrayBuffer());
  if (/\.b64$/.test(name)) { const bin = atob(new TextDecoder().decode(bytes).replace(/\s+/g, '')); bytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k); }
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  return JSON.parse(new TextDecoder().decode(bytes));
};

// shards: under a random draw of the games (data.js, an export cut by count) the data shards drawn - the time
// shards hold the same games' timelines at the same indexes, so those alone are read (and shard 0, for the head)
async function load(dataset, base, shards) {
  const DIR = base || 'data/';
  const r = await fetch(DIR + dataset + '-time-meta.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('no timeline data (' + r.status + ')');
  const meta = await r.json();
  // progress for the page: bytes in over the shards' bytes (capped: a server that inflates on the way hands more)
  const mine = meta.shards.filter((sh, i) => !shards || i === 0 || shards.includes(i)), total = mine.reduce((a, sh) => a + (sh.bytes || 0), 0), got = new Map();
  let last = 0;
  const tell = () => { const now = Date.now(); if (now - last < 150 || !total) return; last = now; let sum = 0; for (const v of got.values()) sum += v; postMessage({ type: 'progress', phase: 'load', at: Math.min(1, sum / total) }); };
  const parts = await Promise.all(mine.map(async sh => { const t = await fetch(DIR + sh.f + '?v=' + encodeURIComponent(meta.stamp)); if (!t.ok) throw new Error(sh.f + ' ' + t.status); return inflate(t, sh.f, n => { got.set(sh.f, n); tell(); }); }));
  const byMatch = new Map();
  for (const part of parts) for (const g of part.games) byMatch.set(g.m, g);
  TIME = { stamp: meta.stamp, bucket: parts[0].bucket || 60, cap: parts[0].seed_cap, byMatch };
  return { type: 'loaded', stamp: TIME.stamp, bucket: TIME.bucket, cap: TIME.cap, games: byMatch.size };
}

// one pass over the selection's timelines: per series (alive / lost / made) a group per unit (or class) with a
// count per bin, the seats known per bin, and the milestones' clocks. Bins are typed arrays sized for the
// longest game; alive is a difference array (+1 at the first bin a unit covers, -1 after the last) summed at the
// end, so a unit costs the same whatever it lived through. Groups are the page's ids (gid per template, the
// captured copy at gid + ng); the page puts the names and colours on
function count(o) {
  const { mask, thirds, BS, BK, clsOn, showCap, gid, ng } = o;
  const { TMAX_S, gm, gt, np, sf, tch, tci, town, markOf, NMARKS, MARK_MAX, M_ALL } = C;
  const NB = thirds ? 3 : Math.ceil(TMAX_S / BS) + 1;
  const mk = () => ({ v: new Array(ng * 2).fill(null), tot: new Float64Array(ng * 2) });
  const series = { alive: mk(), lost: mk(), made: mk() };
  const bins = (sr, gi) => sr.v[gi] || (sr.v[gi] = new Float64Array(NB + 2));
  let si = 0, seatsSel = 0, known = 0, capped = 0, unknown = 0, noSpans = 0;
  const seatsD = new Float64Array(NB + 2);   // seats known per bin, as a difference array
  // per kind, per ordinal: the seconds (and fraction of the game) at which each seat placed its nth
  const markT = [], markF = [];
  for (let mi = 0; mi < NMARKS; mi++) { markT.push([]); markF.push([]); for (let n = 0; n < MARK_MAX; n++) { markT[mi].push([]); markF[mi].push([]); } }
  const mkBuckets = []; for (let mi = 0; mi < NMARKS; mi++) mkBuckets.push([]);
  let ev = new Float64Array(2 * 64);   // one seat's (second, +1/-1) events of a kind, flat; the standing sweep sorts them in place
  // spans: [template, came out s, gone s | -1, end kind] per unit (end: 0 alive, 1 killed, 2 sold, 3 captured
  // away, 4 gone without an event) - alive counts the unit in every bin whose midpoint it covers, made in the
  // bin it came out (to the second, so bins can be finer than the runs' buckets), lost a kill or a capture away
  // in the bin it happened; an older export without spans falls back to the [template, bucket, count] runs
  const collectSpans = (ul, f, end) => {
    const nbSeat = thirds ? 3 : Math.ceil(end / BS);   // the seat's own bins (its denominators)
    const w = thirds ? end / 3 : BS;
    for (let j = 0; j < ul.length; j += 4) {
      const ti = ul[j];
      if (tch[ti] || !clsOn[tci[ti]]) continue;
      const captured = !((town[ti] >> f) & 1);
      if (captured && !showCap) continue;
      const gi = captured ? gid[ti] + ng : gid[ti];
      const born = ul[j + 1], gone = ul[j + 2] < 0 ? end : ul[j + 2], kind = ul[j + 3];
      bins(series.made, gi)[Math.min(nbSeat - 1, Math.floor(born / w))]++; series.made.tot[gi]++;
      // bins whose midpoint t_b lies in [born, gone): t_b = (b + .5) * w
      const b0 = Math.max(0, Math.ceil(born / w - .5)), b1 = Math.min(nbSeat, Math.ceil(gone / w - .5));
      if (b1 > b0) { const v = bins(series.alive, gi); v[b0]++; v[b1]--; series.alive.tot[gi]++; }
      if (kind === 1 || kind === 3) { bins(series.lost, gi)[Math.min(nbSeat - 1, Math.floor(gone / w))]++; series.lost.tot[gi]++; }
    }
  };
  const collectMade = (ul, f, end) => {
    for (let j = 0; j < ul.length; j += 3) {
      const ti = ul[j];
      if (tch[ti] || !clsOn[tci[ti]]) continue;
      const captured = !((town[ti] >> f) & 1);
      if (captured && !showCap) continue;
      const gi = captured ? gid[ti] + ng : gid[ti], k = ul[j + 1], n = ul[j + 2];
      const bin = thirds ? Math.min(2, Math.floor((k + .5) * BK * 3 / end)) : Math.floor(k * BK / BS);
      bins(series.made, gi)[bin] += n; series.made.tot[gi] += n;
    }
  };
  // the milestones of one seat: a sweep over the standing spans of each marked kind (+1 when one finishes, -1
  // when it goes), so a rebuild after a loss is the same nth again, not the next (the user, 2026-09-13: air
  // mirrors rebuild airfields); the events sorted in place by insertion (a handful per seat and kind)
  const sweep = (mi, a, end) => {
    let n = 0;
    if (a.length * 2 > ev.length) ev = new Float64Array(a.length * 4);
    for (let q = 0; q < a.length; q += 2) { ev[n++] = a[q]; ev[n++] = 1; if (a[q + 1] >= 0) { ev[n++] = a[q + 1]; ev[n++] = -1; } }
    for (let i = 2; i < n; i += 2) {   // a loss and a finish in the same second: the loss first
      const t = ev[i], d = ev[i + 1]; let j = i - 2;
      while (j >= 0 && (ev[j] > t || (ev[j] === t && ev[j + 1] > d))) { ev[j + 2] = ev[j]; ev[j + 3] = ev[j + 1]; j -= 2; }
      ev[j + 2] = t; ev[j + 3] = d;
    }
    let up = 0, best = 0;
    for (let i = 0; i < n; i += 2) {
      up += ev[i + 1]; const sec = ev[i];
      while (up > best && best < MARK_MAX) { markT[mi][best].push(sec); markF[mi][best].push(Math.min(1, sec / end)); best++; }
      if (best >= MARK_MAX) break;
    }
  };
  let lastTell = Date.now();
  for (let g = 0; g < gm.length; g++) {
    if ((g & 1023) === 0 && o.job != null) { const now = Date.now(); if (now - lastTell >= 150) { lastTell = now; postMessage({ type: 'progress', phase: 'count', job: o.job, at: g / gm.length }); } }
    const tg = TIME.byMatch.get(gm[g]), n = np[g], gmin = gt[g];
    for (let i = 0; i < n; i++) {
      const m = mask[si], f = sf[si]; si++;
      if ((m & M_ALL) !== M_ALL) continue;
      seatsSel++;
      const tl = tg && tg.p[i];
      if (tl == null || gmin !== gmin) { unknown++; continue; }   // NaN: the game has no length
      known++;
      const end = gmin * 60, cap = tg.c == null ? null : tg.c;   // seconds the timeline is known for
      if (cap != null && cap < end) capped++;
      // a seat stands in a bin's denominator while its game runs into the bin and its timeline covers the bin:
      // the bins up to the first one the timeline does not cover
      if (thirds) {
        let nOk = 0; for (let j = 0; j < 3; j++) if (cap == null || (j + 1) * end / 3 <= cap + 1) nOk++; else break;
        seatsD[0]++; seatsD[nOk]--;
      } else {
        const nbSeat = Math.ceil(end / BS);
        const nOk = cap == null || end <= cap + 1 ? nbSeat : Math.min(nbSeat, Math.floor((cap + 1) / BS));
        seatsD[0]++; seatsD[nOk]--;
      }
      if (tl[3]) collectSpans(tl[3], f, end); else { collectMade(tl[0], f, end); noSpans++; }
      const st = tl[2];
      if (st && st.length) {
        for (const a of mkBuckets) a.length = 0;
        for (let j = 0; j < st.length; j += 3) {
          const bits = markOf[st[j]];
          if (!bits) continue;
          for (let mi = 0; mi < NMARKS; mi++) if (bits & (1 << mi)) mkBuckets[mi].push(st[j + 1], st[j + 2]);
        }
        for (let mi = 0; mi < NMARKS; mi++) if (mkBuckets[mi].length) sweep(mi, mkBuckets[mi], end);
      } else if (tl[1] && tl[1].length) {   // an older export without spans: placement orders
        const bl = tl[1];
        for (const a of mkBuckets) a.length = 0;
        for (let j = 0; j < bl.length; j += 3) {
          const bits = markOf[bl[j]];
          if (!bits) continue;
          for (let mi = 0; mi < NMARKS; mi++) if (bits & (1 << mi)) mkBuckets[mi].push(bl[j + 1], bl[j + 2]);
        }
        for (let mi = 0; mi < NMARKS; mi++) {
          const a = mkBuckets[mi]; if (!a.length) continue;
          const pairs = []; for (let q = 0; q < a.length; q += 2) pairs.push([a[q], a[q + 1]]);
          pairs.sort((x, z) => x[0] - z[0]);
          let nth = 0;
          for (const [k, n] of pairs) {   // n placements in this bucket: the seat's next n ordinals all land here
            for (let c = 0; c < n && nth < MARK_MAX; c++, nth++) { const sec = (k + .5) * BK; markT[mi][nth].push(sec); markF[mi][nth].push(Math.min(1, sec / end)); }
            if (nth >= MARK_MAX) break;
          }
        }
      }
    }
  }
  // the difference arrays summed into counts; the seats trimmed to the last bin any seat reaches
  for (const v of series.alive.v) if (v) for (let b = 1; b < v.length; b++) v[b] += v[b - 1];
  let last = 0;
  for (let b = 1; b < seatsD.length; b++) { seatsD[b] += seatsD[b - 1]; if (seatsD[b - 1] > 0) last = b; }
  // the result, its buffers transferred: per series the groups that got anything as [gi, tot, bins]
  const transfer = [], out = {};
  for (const k in series) {
    const sr = series[k], groups = [];
    sr.v.forEach((v, gi) => { if (v) { groups.push([gi, sr.tot[gi], v]); transfer.push(v.buffer); } });
    out[k] = groups;
  }
  const mT = markT.map(a => a.map(x => { const v = Float64Array.from(x); transfer.push(v.buffer); return v; }));
  const mF = markF.map(a => a.map(x => { const v = Float64Array.from(x); transfer.push(v.buffer); return v; }));
  const seats = seatsD.slice(0, last); transfer.push(seats.buffer);
  return [{ type: 'count', job: o.job, key: o.key, series: out, seats, seatsSel, known, capped, unknown, noSpans, markT: mT, markF: mF }, transfer];
}

onmessage = async e => {
  const d = e.data;
  try {
    if (d.type === 'load') postMessage(await load(d.dataset, d.base, d.shards));
    else if (d.type === 'ctx') C = d;
    else if (d.type === 'count') { const [msg, transfer] = count(d); postMessage(msg, transfer); }
  } catch (err) { postMessage({ type: 'error', job: d.job, message: String(err && err.message || err) }); }
};

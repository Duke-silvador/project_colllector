// AI 大藏经 V1 — 纯静态前端（零依赖、可离线）
// 规则与 Python 参考实现（code/verify_citation.py）保持一致：C1/C2/C3/C7/C8/C9
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CHECK_LABELS = [["C1_exists", "C1 逐字"], ["C2_anchor", "C2 锚点"], ["C3_class", "C3 部类"],
  ["C7_context_clean", "C7 语境"], ["C8_attribution", "C8 说话者"], ["C9_tradition", "C9 宗派"]];

const CLASS_ORDER = ["canon", "treatise", "commentary", "vinaya", "history", "lexicon", "catalog"];
const CLASS_LABEL = { canon: "经", treatise: "论", commentary: "疏/注/诸宗", vinaya: "律", history: "史传", lexicon: "事汇", catalog: "目录" };

const NEG = ["不", "非", "無", "未", "莫", "勿", "弗", "毋"];
const HYP = ["若言", "若有人", "若使", "假使", "設有", "若謂", "若作是說", "若復有人", "若有說言", "假令", "設使"];
const OTH = ["外道", "計為", "執為", "有言", "有人言", "小乘計", "數論", "勝論"];
const CON = ["雖復", "雖然", "雖有", "雖作", "雖爾"];
const PUNCT = /[\s\u3000\u0021-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\u3001-\u3003\u3008-\u3011\u3014-\u301f\uff01-\uff65]/g;

let MANIFEST = null, CORPUS = null, CONCEPTS = {}, DOCMAP = {}, CUR = null,
    QUOTES = { items: [] }, PARALLEL = {}, DOCS = {}, CONCEPT_CACHE = {}, PAGE = 30, PAGE_LIMIT = false;

init();

async function init() {
  try {
    const man = await fetch("data/manifest.json?v=20261101044401").then(r => r.json());
    MANIFEST = man;
    (man.docs || []).forEach(d => DOCMAP[d.doc_id] = d);
    SENSECLS = {};
    (man.docs || []).forEach(d => { SENSECLS[d.doc_id] = d.class; });
    CONCEPTS = {};                                  // 概念列表：{name: {total, aliases}}（只存元信息）
    Object.entries(man.concepts || {}).forEach(([k, v]) => { CONCEPTS[k] = v; });
    QUOTES = await fetch("data/quotes.json?v=20261101044401").then(r => r.json());
    PARALLEL = await fetch("data/parallel.json?v=20261101044401").then(r => r.json());
    const meta = { stats: man.stats };

    $("#stats").innerHTML = [
      `<span class="chip">典籍 <b>${meta.stats.docs}</b> 部</span>`,
      `<span class="chip">段落 <b>${meta.stats.paragraphs}</b></span>`,
      `<span class="chip">字数 <b>${meta.stats.chars.toLocaleString()}</b></span>`,
      `<span class="chip">概念 <b>${meta.stats.concepts}</b></span>`,
      `<span class="chip">纯静态 · 零 API · 可离线</span>`,
    ].join("");

    $("#concepts").innerHTML = Object.keys(CONCEPTS).map(n => `<span class="c" data-q="${esc(n)}">${esc(n)}</span>`).join("");
    document.querySelectorAll(".concepts .c").forEach(el =>
      el.addEventListener("click", () => { $("#q").value = el.dataset.q; doSearch(); }));

    $("#search-form").addEventListener("submit", ev => { ev.preventDefault(); doSearch(); });

    document.querySelectorAll("#tabs .c").forEach(el => el.addEventListener("click", () => {
      const v = el.dataset.view;
      if (v === "quotes") renderQuoteIndex();
      else if (v === "parallel") renderParallelIndex();
      else if (v === "distribution") renderDistribution();
      else if (v === "review") renderReview();
      else if (v === "multi") renderMulti();
      else if (v === "dict") renderDict();
      else if (v === "align") renderAlign();
      else if (v === "unresolved") renderUnresolved();
    }));

    // 可分享链接：#q=涅槃
    const h = decodeURIComponent((location.hash || "").replace(/^#q=/, ""));
    if (h) { $("#q").value = h; doSearch(); }
  } catch (e) {
    $("#stats").innerHTML = `<span class="chip">数据载入失败：${esc(e.message)}</span>`;
  }
}

async function doSearch() {
  const q = $("#q").value.trim();
  if (!q) return;
  history.replaceState(null, "", "#q=" + encodeURIComponent(q));
  const dictHits = await dictLookup(q);
  if (dictHits.length) { renderDictHits(q, dictHits); return; }
  if (CONCEPTS[q]) return renderPrecomputed(await loadConcept(q));
  await ensureCorpus((d, n) => {
    $("#results").innerHTML = `<div class="empty"><p>自由检索：正在载入语料 ${d}/${n} 部…</p></div>`;
  });
  renderScan(q);
}

function renderDictHits(q, items) {
  $("#results").innerHTML = `<div class="notice"><b>佛学辞典 · 「${esc(q)}」</b> 命中 ${items.length} 条（丁福保，可继续用下方"概念检索"对比经文原文）</div>` +
    items.map(t => `<div class="hit"><div class="src"><b>${esc(t.term)}</b></div><div class="q">${esc(t.text)}</div></div>`).join("");
}

async function loadConcept(name) {
  if (CONCEPT_CACHE[name]) return CONCEPT_CACHE[name];
  const rep = await fetch(`data/concept/${encodeURIComponent(name)}.json?v=20261101044401`).then(r => r.json());
  CONCEPT_CACHE[name] = rep;
  return rep;
}

async function ensureCorpus(onProgress) {
  if (CORPUS) return CORPUS;
  // 按部懒加载（并发 6），避免一次性拉几十 MB
  const ids = (MANIFEST.docs || []).map(d => d.doc_id);
  CORPUS = { paragraphs: [] };
  let done = 0;
  for (let i = 0; i < ids.length; i += 6) {
    const batch = ids.slice(i, i + 6);
    const parts = await Promise.all(batch.map(id =>
      fetch(`data/search/${encodeURIComponent(id)}.json?v=20261101044401`).then(r => r.json()).catch(() => ({ paragraphs: [] }))));
    parts.forEach(pt => CORPUS.paragraphs.push(...(pt.paragraphs || [])));
    done += batch.length;
    if (onProgress) onProgress(done, ids.length);
  }
  return CORPUS;
}

const TERMS_CACHE = {};
async function ensureTerms(docId) {
  if (TERMS_CACHE[docId]) return TERMS_CACHE[docId];
  try {
    TERMS_CACHE[docId] = await fetch(`data/terms/${encodeURIComponent(docId)}.json?v=20261101044401`).then(r => r.json());
  } catch (e) { TERMS_CACHE[docId] = {}; }
  return TERMS_CACHE[docId];
}

async function ensureDoc(docId) {
  if (DOCS[docId]) return DOCS[docId];
  DOCS[docId] = await fetch(`data/doc/${encodeURIComponent(docId)}.json?v=20261101044401`).then(r => r.json());
  return DOCS[docId];
}

async function renderPrecomputed(rep) {
  CUR = { type: "concept", rep };
  const box = $("#results");
  if (!rep.groups.length) return renderScan(rep.query);
  const cls = ["canon", "treatise", "commentary", "vinaya", "history", "lexicon", "catalog"];
  const filters = `<div class="concepts" id="clsfilter"><span class="c active" data-cls="*">全部</span>` +
    cls.map(c => rep.groups.find(g => g.class === c)
      ? `<span class="c" data-cls="${c}">${esc(CLASS_LABEL[c] || c)}</span>` : "").join("") + `</div>`;
  const head = `<div class="notice">「<b>${esc(rep.query)}</b>」共命中 <b>${rep.total}</b> 处，展示 ${rep.shown} 条。
     异名展开：${rep.aliases.map(esc).join("、")}。<br>分组只呈现，不代表优劣；徽章由同一套公证规则逐条算出。</div>` + filters;
  let senseBox = "";
  try {
    const sd = await loadSenses();
    const lst = (sd.senses || {})[rep.query];
    if (lst && lst.length) {
      const clsSet = new Set(lst.map(x => (SENSECLS && SENSECLS[x.doc_id]) || "?"));
      const warn = clsSet.size > 1
        ? `<div class="notes">⚠ 这些义项来自 <b>${clsSet.size}</b> 个不同部类，<b>不是同一个定义</b>；系统只并列，不判哪家对。</div>`
        : "";
      senseBox = `<div class="notice"><b>经论义项</b>（${lst.length} 条，由定义句抽取，每条带锚点）${warn}
        <ul class="qlist">` + lst.slice(0, 12).map(it =>
          `<li>「${esc(it.head)}」<span class="b">${esc(it.pattern)}</span> ${esc(it.definition)}
           <a href="#" data-doc="${esc(it.doc_id)}" data-lb="${esc(it.lb)}">${esc(it.doc_id)} ${esc(it.lb)}</a></li>`).join("") +
        `</ul></div>`;
    }
  } catch (e) { /* 无义项数据时不显示 */ }

  box.innerHTML = senseBox + head + rep.groups.map(g => `
    <div class="group" data-cls="${esc(g.class)}"><h3>${esc(g.label)} <span class="cnt">${g.items.length}/${g.total}</span></h3>
    <div class="gl">${g.items.map((it, i) => hitHTML(it, i, g.class)).join("")}</div>
    ${g.items.length > PAGE ? `<button class="btn more" data-cls="${esc(g.class)}">显示全部 ${g.items.length} 条</button>` : ""}
    </div>`).join("");
  PAGE_LIMIT = true;
  $("#clsfilter").querySelectorAll(".c").forEach(el => el.addEventListener("click", () => {
    $("#clsfilter").querySelectorAll(".c").forEach(x => x.classList.remove("active"));
    el.classList.add("active");
    const want = el.dataset.cls;
    document.querySelectorAll("#results .group").forEach(g => {
      g.style.display = (want === "*" || g.dataset.cls === want) ? "" : "none";
    });
  }));
  box.querySelectorAll("button.more").forEach(b => b.addEventListener("click", () => {
    b.parentElement.querySelectorAll(".hit").forEach(el => el.style.display = "");
    b.remove();
  }));
  // 初始只显示前 PAGE 条
  box.querySelectorAll(".group .gl").forEach(gl => {
    gl.querySelectorAll(".hit").forEach((el, i) => { if (i >= PAGE) el.style.display = "none"; });
  });
  bindHits();
}

function renderScan(q) {
  const hits = [];
  const paras = CORPUS.paragraphs;
  for (let i = 0; i < paras.length && hits.length < 400; i++) {
    const p = paras[i];
    let idx = 0;
    while (true) {
      idx = p.t.indexOf(q, idx);
      if (idx < 0) break;
      const [s, e] = sentenceSpan(p.t, idx);
      hits.push({ p, s, e, q });
      idx += q.length;
    }
  }
  CUR = { type: "scan", hits };
  const box = $("#results");
  if (!hits.length) {
    box.innerHTML = `<div class="empty"><h2>「${esc(q)}」</h2><p>当前静态语料中未命中。</p>
      <p class="muted">试试预置概念：${Object.keys(CONCEPTS).map(esc).join("、")}</p></div>`;
    return;
  }
  const groups = {};
  hits.slice(0, 120).forEach(h => {
    const d = DOCMAP[h.p.doc];
    (groups[d.class] = groups[d.class] || []).push(h);
  });
  box.innerHTML = `<div class="notice">「<b>${esc(q)}</b>」自由检索：命中 <b>${hits.length}</b> 处（展示前 120 条）。
    徽章为前端按同一套规则实时计算。</div>` +
    CLASS_ORDER.filter(c => groups[c]).map(c => `
      <div class="group"><h3>${esc(CLASS_LABEL[c] || c)} <span class="cnt">${groups[c].length}</span></h3>
      ${groups[c].slice(0, 30).map((h, i) => scanHitHTML(h, i, c)).join("")}</div>`).join("");
  bindHits();
}

function scanHitHTML(h, i, cls) {
  const d = DOCMAP[h.p.doc];
  const sent = h.p.t.slice(h.s, h.e);
  const off = h.s;
  while (off < h.p.t.length && PUNCT.test(h.p.t[off])) { PUNCT.lastIndex = 0; off++; } PUNCT.lastIndex = 0;
  const lb = lbAt(h.p, off);
  const ck = checkJS(h.p, sent, off);
  const badges = CHECK_LABELS.map(([k, l]) => `<span class="b ${ck.checks[k] ? "ok" : "bad"}">${ck.checks[k] ? "✓" : "✗"} ${l}</span>`).join("");
  const notes = ck.warnings.filter(w => w.startsWith("C7")).map(w => `<div class="notes">⚠ ${esc(w)}</div>`).join("");
  return `<div class="hit" data-scan="${i}" data-cls="${esc(cls)}">
    <div class="src"><b>《${esc(shortTitle(d.title))}》</b> ${d.doc_id} 卷${h.p.juan} · 行${esc(lb)}</div>
    <div class="q">${esc(sent)}</div>
    <div class="badges">${badges}</div>${notes}</div>`;
}

function hitHTML(it, i, cls) {
  const badges = CHECK_LABELS.map(([k, l]) => {
    const ok = it.checks[k];
    return `<span class="b ${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${l}</span>`;
  }).join("");
  const warns = (it.warnings || []).filter(w => /C7/.test(w)).map(w => `<div class="notes">⚠ ${esc(w)}</div>`).join("");
  const errs = (it.errors || []).map(e => `<div class="notes">✗ ${esc(e)}</div>`).join("");
  return `<div class="hit" data-pre="${cls}:${i}">
    <div class="src"><b>《${esc(shortTitle(it.title))}》</b> ${it.doc_id} 卷${it.juan} · 行${esc(it.lb)}</div>
    <div class="q">${esc(it.quote)}</div>
    <div class="badges">${badges}</div>${errs}${warns}</div>`;
}

function bindHits() {
  document.querySelectorAll("#results .hit").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll("#results .hit.sel").forEach(x => x.classList.remove("sel"));
      el.classList.add("sel");
      let doc, lb, quote;
      if (el.dataset.pre) {
        const [cls, i] = el.dataset.pre.split(":");
        const g = CUR.rep.groups.find(x => x.class === cls);
        const it = g.items[+i];
        doc = it.doc_id; lb = it.lb; quote = it.quote;
      } else {
        const h = CUR.hits[+el.dataset.scan];
        doc = h.p.doc; lb = lbAt(h.p, h.s); quote = h.p.t.slice(h.s, h.e);
      }
      openContext(doc, lb, quote);
    });
  });
}

async function openContext(docId, lb, quote) {
  $("#reader").innerHTML = `<p class="muted">载入原文…</p>`;
  const d = DOCMAP[docId];
  const doc = await ensureDoc(docId);
  const paras = doc.paragraphs;
  let idx = paras.findIndex(p => p.lb0 && p.lb1 && p.lb0 <= lb && lb <= p.lb1);
  if (idx < 0) idx = paras.findIndex(p => p.lb0 === lb);
  if (idx < 0) idx = 0;
  const lo = Math.max(0, idx - 2), hi = Math.min(paras.length, idx + 3);
  await ensureTerms(docId);

  let commBox = "";
  try {
    const cm = await loadComm();
    const inv = cm.by_canon[docId];
    if (inv && inv.total) {
      const rows = Object.values(inv.commentators).sort((a, b) => b.count - a.count).map(c => {
        const items = c.edges.slice(0, 6).map(e => `<li>经文卷${e.to_juan}·行${esc(e.to_lb)} ←
          <a href="#" data-doc="${esc(c.doc)}">${esc(shortTitle(c.title))}</a> 行${esc(e.from_lb)}
          <span class="b ok">✓C1 连续 ${e.len} 字</span></li>`).join("");
        return `<div style="margin:6px 0"><b>《${esc(shortTitle(c.title))}》</b> ${c.count} 条
          <ul class="qlist">${items}</ul></div>`;
      }).join("");
      commBox = `<div class="notice"><b>谁在注我</b>（${inv.total} 条对齐）${rows}</div>`;
    }
  } catch (e) { /* ignore */ }

  let netBox = "";
  try {
    const net = await loadNet();
    const n = net.nets[docId];
    if (n && (n.stats.lcs_edges || n.stats.marked)) {
      const lcs = n.lcs.slice(0, 12).map(e => `<li>行${esc(e.from_lb)} → 引《${esc(shortTitle(e.to_title || e.to))}》
        ${e.to_lb ? `<a href="#" data-doc="${esc(e.to)}" data-lb="${esc(e.to_lb)}">${esc(e.to)} 卷${e.to_juan}·行${esc(e.to_lb)}</a>` : ""}
        <span class="b ok">连续 ${e.len} 字</span></li>`).join("");
      const mk = n.marked.slice(0, 12).map(m => `<li>行${esc(m.from_lb)} 標記「《${esc(m.target)}》」${m.verified ? '<span class="b ok">✓逐字核验</span>' : (m.target_doc ? '<span class="b warn">⚠未逐字</span>' : '<span class="b">⛔未收录</span>')}</li>`).join("");
      netBox = `<div class="notice"><b>引经网络</b>：LCS 对齐 ${n.stats.lcs_edges} 条 ｜ 引经标记 ${n.stats.marked} 条（逐字核验 ${n.stats.marked_verified}）
        <ul class="qlist">${lcs}${mk}</ul></div>`;
    }
  } catch (e) { /* 网络数据缺失时不影响阅读 */ }

  $("#reader").innerHTML = `
    <div class="rhead"><h2>《${esc(shortTitle(d.title))}》</h2>
      <div class="meta"><span>${d.doc_id}</span><span>卷 ${paras[idx].juan}</span>
        <span>引文锚 ${esc(lb)}</span><button class="btn" id="fulltext">打开全文</button></div></div>
    <div class="notice"><b>以经注经</b>：以下为该段原文及上下文，未加任何解释。</div>` +
    paras.slice(lo, hi).map((p, i) => `
      <div class="para ${lo + i === idx ? "task" : ""}">
        <div class="anch">${esc(p.lb0 || "")}${p.lb1 && p.lb1 !== p.lb0 ? "–" + esc(p.lb1) : ""} ｜ 卷${p.juan}</div>
        <div class="txt">${lo + i === idx ? highlight(p.t, quote) : esc(p.t)}</div></div>`).join("");
  $("#fulltext").addEventListener("click", () => openDoc(docId, lb));
}

async function openDoc(docId, lb) {
  $("#reader").innerHTML = `<p class="muted">载入全文…</p>`;
  const d = DOCMAP[docId];
  const doc = await ensureDoc(docId);
  const paras = doc.paragraphs;

  // 同本異譯：同一组内其他译本
  let para = "";
  for (const [name, g] of Object.entries(PARALLEL || {})) {
    if ((g.docs || []).includes(docId)) {
      const others = g.docs.filter(x => x !== docId);
      para = `<div class="notice"><b>同本異譯</b>：${esc(name)}。并置呈现，未做逐句对齐。
        ${others.map(x => DOCMAP[x] ? `<a href="#" data-doc="${esc(x)}">${esc(DOCMAP[x].doc_id)}</a>` : "").join(" · ")}</div>`;
    }
  }

  // 引用索引（本文明引他典）
  const myQuotes = (QUOTES.items || []).filter(q => q.from === docId);
  let qbox = "";
  if (myQuotes.length) {
    qbox = `<div class="notice"><b>引用索引</b>（文中明引 ${myQuotes.length} 处，只作公证、不判对错）<ul class="qlist">` +
      myQuotes.map(q => {
        const mark = q.verified ? `<span class="b ok">✓ 逐字核对 ${esc(q.target_doc)} 卷${q.target_juan}·行${esc(q.target_lb)}</span>`
          : (q.target_doc ? `<span class="b warn">⚠ 与现传本未逐字一致${q.target_lb ? "（最接近见 " + esc(q.target_doc) + " 卷" + q.target_juan + "·行" + esc(q.target_lb) + "）" : ""}</span>` : `<span class="b">⛔ 未收录该典</span>`);
        const near = (!q.verified && q.near_text) ? `<div class="notes">最接近原文：「${esc(q.near_text)}」</div>` : "";
        const link = q.target_doc && DOCMAP[q.target_doc] ? ` <a href="#" data-doc="${esc(q.target_doc)}">打开原文</a>` : "";
        return `<li>引《${esc(q.target)}》：「${esc(q.quote)}」 行${esc(q.lb)} ${mark}${link}${near}</li>`;
      }).join("") + `</ul></div>`;
  }

  await ensureTerms(docId);

  let commBox = "";
  try {
    const cm = await loadComm();
    const inv = cm.by_canon[docId];
    if (inv && inv.total) {
      const rows = Object.values(inv.commentators).sort((a, b) => b.count - a.count).map(c => {
        const items = c.edges.slice(0, 6).map(e => `<li>经文卷${e.to_juan}·行${esc(e.to_lb)} ←
          <a href="#" data-doc="${esc(c.doc)}">${esc(shortTitle(c.title))}</a> 行${esc(e.from_lb)}
          <span class="b ok">✓C1 连续 ${e.len} 字</span></li>`).join("");
        return `<div style="margin:6px 0"><b>《${esc(shortTitle(c.title))}》</b> ${c.count} 条
          <ul class="qlist">${items}</ul></div>`;
      }).join("");
      commBox = `<div class="notice"><b>谁在注我</b>（${inv.total} 条对齐）${rows}</div>`;
    }
  } catch (e) { /* ignore */ }

  let netBox = "";
  try {
    const net = await loadNet();
    const n = net.nets[docId];
    if (n && (n.stats.lcs_edges || n.stats.marked)) {
      const lcs = n.lcs.slice(0, 12).map(e => `<li>行${esc(e.from_lb)} → 引《${esc(shortTitle(e.to_title || e.to))}》
        ${e.to_lb ? `<a href="#" data-doc="${esc(e.to)}" data-lb="${esc(e.to_lb)}">${esc(e.to)} 卷${e.to_juan}·行${esc(e.to_lb)}</a>` : ""}
        <span class="b ok">连续 ${e.len} 字</span></li>`).join("");
      const mk = n.marked.slice(0, 12).map(m => `<li>行${esc(m.from_lb)} 標記「《${esc(m.target)}》」${m.verified ? '<span class="b ok">✓逐字核验</span>' : (m.target_doc ? '<span class="b warn">⚠未逐字</span>' : '<span class="b">⛔未收录</span>')}</li>`).join("");
      netBox = `<div class="notice"><b>引经网络</b>：LCS 对齐 ${n.stats.lcs_edges} 条 ｜ 引经标记 ${n.stats.marked} 条（逐字核验 ${n.stats.marked_verified}）
        <ul class="qlist">${lcs}${mk}</ul></div>`;
    }
  } catch (e) { /* 网络数据缺失时不影响阅读 */ }

  $("#reader").innerHTML = `
    <div class="rhead"><h2>《${esc(shortTitle(d.title))}》</h2>
      <div class="meta"><span>${d.doc_id}</span><span>${d.paragraphs} 段</span>
      <span>${d.chars.toLocaleString()} 字</span><span>${esc(d.license)}</span></div></div>` + commBox + netBox + para + qbox +
    paras.map((p, i) => `<div class="para ${(lb && p.lb0 && p.lb1 && p.lb0 <= lb && lb <= p.lb1) ? "task" : ""}">
      <div class="anch">${esc(p.lb0 || "")} ｜ 卷${p.juan}</div>
      <div class="txt">${esc(p.t)}</div>
      ${termChips(p)}</div>`).join("");
  setTimeout(scrollToTarget, 30);
  bindTermChips();

  document.querySelectorAll("#reader a[data-doc]").forEach(a =>
    a.addEventListener("click", ev => { ev.preventDefault(); openDoc(a.dataset.doc); }));
}

/* ---------- 术语 chips（丁福保） ---------- */
function termChips(p) {
  const m = TERMS_CACHE[p.doc] || {};
  const ints = (m[p.p] || {terms: []}).terms;
  if (!ints.length) return "";
  return `<div class="terms">${ints.map(t => `<span class="tchip" data-t="${esc(t)}">${esc(t)}</span>`).join("")}</div>`;
}

function bindTermChips() {
  document.querySelectorAll(".tchip").forEach(el => {
    el.addEventListener("click", async () => {
      const q = el.dataset.t;
      const hits = await dictLookup(q);
      const box = $("#results");
      box.innerHTML = `<div class="notice"><b>《佛學大辭典》·「${esc(q)}」</b> ${hits.length} 条
        <button class="btn" id="backprev">← 返回</button></div>` +
        (hits.length ? hits.map(t => `<div class="hit"><div class="src"><b>${esc(t.term)}</b></div>
          <div class="q">${esc(t.text)}</div></div>`).join("")
          : `<div class="empty"><p>辞典未收此条。</p></div>`);
      const b = $("#backprev"); if (b) b.addEventListener("click", () => doSearch());
      box.scrollTop = 0;
    });
  });
}

/* 滚动到阅读区里被标记的段落 */
function scrollToTarget() {
  const t = $("#reader .para.task");
  if (t) t.scrollIntoView({ block: "center", behavior: "smooth" });
}

/* ---------------- 规则移植：与 Python 参考实现对齐 ---------------- */
function lbAt(p, off) {
  let lb = "";
  for (const [k, l] of p.lbs) { if (k <= off) lb = l; else break; }
  return lb;
}
function sentenceSpan(t, hit) {
  let s = hit, e = hit;
  while (s > 0 && "。！？；".indexOf(t[s - 1]) < 0) s--;
  while (e < t.length && "。！？；".indexOf(t[e]) < 0) e++;
  if (e < t.length) e++;
  return [s, e];
}
function checkJS(p, sent, off) {
  const checks = { C1_exists: true, C8_attribution: true, C9_tradition: true };
  const warnings = [];
  const lb = lbAt(p, off);
  checks.C2_anchor = !!lb && p.lbs.some(([, l]) => l === lb);
  checks.C3_class = !!DOCMAP[p.doc] && !!CLASS_LABEL[DOCMAP[p.doc].class];

  const prefix = p.t.slice(Math.max(0, off - 8), off);
  const last3 = prefix.slice(-3);
  const neg = NEG.filter(n => last3.indexOf(n) >= 0);
  const win = p.t.slice(Math.max(0, off - 100), off + sent.length + 100);
  const near = (arr) => arr.filter(m => prefix.slice(-6).indexOf(m) >= 0);
  const soft = (arr) => arr.filter(m => win.indexOf(m) >= 0);

  let flagged = false;
  const hardHyp = near(HYP); if (hardHyp.length) { flagged = true; warnings.push(`C7: 引文紧邻假设/破斥句式 —— 不得作为正面依据（标记 ${hardHyp}）`); }
  else { const s = soft(HYP); if (s.length) warnings.push(`C7(软): 窗口内含假设/破斥句式，请人工确认语境（标记 ${s}）`); }
  const hardOth = near(OTH); if (hardOth.length) { flagged = true; warnings.push(`C7: 引文紧邻引述他宗语境 —— 不得当作佛说（标记 ${hardOth}）`); }
  else { const s = soft(OTH); if (s.length) warnings.push(`C7(软): 窗口内含他宗标记，请人工确认说话者（标记 ${s}）`); }
  const hardCon = near(CON); if (hardCon.length) { flagged = true; warnings.push(`C7: 引文紧邻让步句 —— 只引前半句会反义（标记 ${hardCon}）`); }
  else { const s = soft(CON); if (s.length) warnings.push(`C7(软): 窗口内含让步句式，请人工确认完整性（标记 ${s}）`); }
  if (neg.length) { flagged = true; warnings.push(`C7: 引文被前置否定词修饰（前文「${prefix.slice(-6)}」，否定词 ${neg}）—— 不得作为正面依据`); }
  checks.C7_context_clean = !flagged;
  return { checks, warnings, errors: [] };
}

function highlight(text, quote) {
  if (!quote) return esc(text);
  const q = quote.replace(/^[「『]/, "").replace(/[」』]$/, "");
  const i = text.indexOf(q.length > 4 ? q : quote);
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + "<em>" + esc(text.slice(i, i + q.length)) + "</em>" + esc(text.slice(i + q.length));
}
/* ---------- 引用总览 / 同本异译总览 ---------- */
function renderQuoteIndex(mode) {
  mode = mode || window.__qmode || "target";
  window.__qmode = mode;
  const items = (QUOTES.items || []);
  const keyer = mode === "from" ? (q => q.from) : (q => q.target);
  const toggle = `<div class="concepts"><span class="c ${mode === "target" ? "active" : ""}" data-qmode="target">按被引典籍</span>
    <span class="c ${mode === "from" ? "active" : ""}" data-qmode="from">按引者</span></div>`;
  const byTarget = {};
  items.forEach(q => { const k = keyer(q); (byTarget[k] = byTarget[k] || []).push(q); });
  const rows = Object.entries(byTarget).sort((a, b) => b[1].length - a[1].length).map(([t, arr]) => {
    const resolved = arr.filter(q => q.target_doc).length;
    const verified = arr.filter(q => q.verified).length;
    const list = arr.map(q => {
      const mark = q.verified ? `<span class="b ok">✓逐字</span>`
        : (q.target_doc ? `<span class="b warn">⚠未逐字</span>` : `<span class="b">⛔未收录</span>`);
      const link = q.target_doc && DOCMAP[q.target_doc] ? ` <a href="#" data-doc="${esc(q.target_doc)}">原文</a>` : "";
      const src = `<a href="#" data-doc="${esc(q.from)}" class="src">${esc(q.from)} 行${esc(q.lb)}</a>`;
      return `<li>${src}：「${esc(q.quote)}」 ${mark}${link}${q.near_text ? `<div class="notes">最接近：「${esc(q.near_text)}」</div>` : ""}</li>`;
    }).join("");
    const label = mode === "from" ? (DOCMAP[t] ? `《${esc(shortTitle(DOCMAP[t].title))}》` : esc(t)) : `《${esc(t)}》`;
    return `<div class="group"><h3>${label} <span class="cnt">${arr.length} 处引用 · 库内 ${resolved} · 逐字 ${verified}</span></h3><ul class="qlist">${list}</ul></div>`;
  }).join("");
  $("#results").innerHTML = toggle + `<div class="notice"><b>引用总览</b>：只统计文中<b>明引</b>（《X》曰「…」或「X經云：…」），不做相似度推测。
    「⚠未逐字」不是错误，是文献事实（省略/意引/异本），系统只标注并给出最接近原文。</div>` + rows;
  $("#results").querySelectorAll("[data-qmode]").forEach(el =>
    el.addEventListener("click", () => renderQuoteIndex(el.dataset.qmode)));
  bindDocLinks();
}

function renderParallelIndex() {
  const rows = Object.entries(PARALLEL || {}).map(([name, g]) => {
    const docs = (g.docs || []).filter(d => DOCMAP[d]);
    return `<div class="group"><h3>${esc(name)} <span class="cnt">${docs.length} 本</span></h3>
      <div class="notice">${esc(g.note || "")}</div>` +
      docs.map(d => `<div class="hit" data-doc="${esc(d)}">
        <div class="src"><b>${esc(DOCMAP[d].doc_id)}</b> · ${esc(DOCMAP[d].author || "")}</div>
        <div class="q">《${esc(shortTitle(DOCMAP[d].title))}》 ${DOCMAP[d].paragraphs} 段 / ${DOCMAP[d].chars} 字</div>
      </div>`).join("") + `</div>`;
  }).join("");
  $("#results").innerHTML = `<div class="notice"><b>同本异译</b>：只并置，不宣称逐句对齐。</div>` + rows;
  bindDocLinks();
}

function bindDocLinks() {
  document.querySelectorAll("#results a[data-doc], #results .hit[data-doc]").forEach(el =>
    el.addEventListener("click", ev => { ev.preventDefault(); openDoc(el.dataset.doc); }));
}

/* ---------- 多注并置 ---------- */
let MULTI = null;
async function renderMulti() {
  $("#results").innerHTML = `<p class="muted">载入并置关系…</p>`;
  if (!MULTI) MULTI = await fetch("data/multi_commentary.json?v=20261101044401").then(r => r.json());
  const rows = Object.entries(MULTI.by_canon)
    .sort((a, b) => b[1].commentators.length - a[1].commentators.length)
    .map(([doc, v]) => {
      const cols = v.commentators.map(c => `
        <div class="col">
          <div class="chead"><b>《${esc(shortTitle(c.title))}》</b>
            <span class="muted">${esc(c.author || "")} · ${c.count} 条</span></div>
          ${c.edges.slice(0, 4).map(e => `
            <div class="edge">
              <div class="elb">经 ${esc(e.to_lb)} ← 疏 ${esc(e.from_lb)} <span class="b ok">✓C1 ${e.len}字</span></div>
              ${(e.sentence || e.from_snip) ? `<div class="etxt">${esc((e.sentence || e.from_snip).slice(0, 110))}</div>` : ""}
            </div>`).join("")}
        </div>`).join("");
      return `<div class="group"><h3>《${esc(shortTitle(v.title))}》 <span class="cnt">${v.commentators.length} 家注疏并对</span>
        <a href="#" data-doc="${esc(doc)}">打开经文</a></h3>
        <div class="cols">${cols}</div></div>`;
    }).join("");
  $("#results").innerHTML = `<div class="notice"><b>多注并置</b>：同一部经下并列各家注疏——<b>只并列，不判优劣</b>。
    每条为连续原文对齐（✓C1 表示经疏两侧逐字可核）。</div>` + rows;
  bindDocLinks();
}

/* ---------- 佛学辞典（丁福保） ---------- */
const DICT_CACHE = {};
async function dictBucket(ch) {
  const k = ch.codePointAt(0) % 64;
  if (DICT_CACHE[k]) return DICT_CACHE[k];
  DICT_CACHE[k] = await fetch(`data/dict/${String(k).padStart(2, "0")}.json?v=20261101044401`).then(r => r.json());
  return DICT_CACHE[k];
}
async function dictLookup(q) {
  if (!q) return [];
  const arr = await dictBucket(q[0]);
  return arr.filter(t => t.term === q || t.term.startsWith(q)).slice(0, 40);
}
async function renderDict() {
  const q = ($("#q").value || "").trim();
  $("#results").innerHTML = `<p class="muted">检索辞典…</p>`;
  const items = q ? await dictLookup(q) : [];
  if (!items.length) {
    $("#results").innerHTML = `<div class="empty"><h2>佛学辞典 · 丁福保《佛學大辭典》</h2>
      <p>收录 <b>30,303</b> 条（原文 33,000+）。在上方输入任一词条即可查询。</p>
      <p class="muted">许可：文本公有领域；DILA TEI 版 CC BY-SA 2.5 TW（署名+相同方式共享）</p></div>`;
    return;
  }
  $("#results").innerHTML = `<div class="notice"><b>「${esc(q)}」</b> 命中 ${items.length} 条（丁福保）</div>` +
    items.map(t => `<div class="hit"><div class="src"><b>${esc(t.term)}</b></div>
      <div class="q">${esc(t.text)}</div></div>`).join("");
}

/* ---------- 经疏对齐（COMMENTARY_OF） ---------- */
let ALIGN = null, NET = null, COMM = null, SENSES = null, SENSECLS = null;
async function loadSenses() {
  if (SENSES) return SENSES;
  SENSES = await fetch("data/senses.json?v=20261101044401").then(r => r.json());
  return SENSES;
}

async function loadComm() {
  if (COMM) return COMM;
  COMM = await fetch("data/commentators.json?v=20261101044401").then(r => r.json());
  return COMM;
}

async function loadNet() {
  if (NET) return NET;
  NET = await fetch("data/citation_net.json?v=20261101044401").then(r => r.json());
  return NET;
}

async function renderAlign() {
  $("#results").innerHTML = `<p class="muted">载入对齐边…</p>`;
  if (!ALIGN) ALIGN = await fetch("data/align.json?v=20261101044401").then(r => r.json());
  const byTarget = {};
  ALIGN.edges.forEach(e => { (byTarget[e.to] = byTarget[e.to] || []).push(e); });
  const rows = Object.entries(byTarget).sort((a, b) => b[1].length - a[1].length).map(([doc, arr]) => {
    const t = ALIGN.titles[doc] || doc;
    const items = arr.slice(0, 20).map(e => `<li>
      <a href="#" data-doc="${esc(e.from)}">${esc(shortTitle(ALIGN.titles[e.from] || e.from))}</a>
      行${esc(e.from_lb)} → 经文 <a href="#" data-doc="${esc(e.to)}" data-lb="${esc(e.to_lb)}">${esc(e.to)} 卷${e.to_juan}·行${esc(e.to_lb)}</a>
      <span class="b ok">✓C1 连续 ${e.len} 字</span>${e.jumps ? `<span class="b warn">跳字 ${e.jumps} 处</span>` : ""}
      ${e.from_snip ? `<div class="notes">疏：${esc(e.from_snip)}</div>` : ""}
      ${e.to_text ? `<div class="notes">经：${esc(e.to_text)}</div>` : ""}</li>`).join("");
    return `<div class="group"><h3>《${esc(shortTitle(t))}》 <span class="cnt">${arr.length} 条注疏对齐</span></h3><ul class="qlist">${items}</ul></div>`;
  }).join("");
  const st = ALIGN.stat || {};
  $("#results").innerHTML = `<div class="notice"><b>经疏对齐</b>（COMMENTARY_OF）：注疏段落中出现某经<b>连续原文</b>
    （≥${ALIGN.params.min_len} 字，LCS 扩展）即建边。对齐 ${st.aligned_paras}/${st.commentary_paras} 段
    （${(st.coverage * 100).toFixed(1)}%），共 ${ALIGN.edges.length} 条边。<br>
    这是"以经注经"的数据底座：每条边都可点回两侧原文核验，不是相似度推测。</div>` + rows;
  bindDocLinks();
  document.querySelectorAll("#results a[data-lb]").forEach(a =>
    a.addEventListener("click", ev => { ev.preventDefault(); openContext(a.dataset.doc, a.dataset.lb, ""); }));
}

/* ---------- 依据分布 / 校对队列 / 未收录典籍 ---------- */
async function renderDistribution() {
  $("#results").innerHTML = `<p class="muted">载入依据分布…</p>`;
  const d = await fetch("data/distribution.json?v=20261101044401").then(r => r.json());
  const rows = Object.entries(d.dist).map(([name, arr]) => {
    const max = Math.max(1, ...arr.map(x => x[1]));
    const bars = arr.map(([doc, n]) => {
      const t = d.by_doc[doc] || doc;
      const w = Math.round(100 * n / max);
      return `<div class="bar"><span class="bl">${esc(shortTitle(t))}</span>
        <span class="bv" style="width:${w}%"></span><span class="bn">${n}</span></div>`;
    }).join("");
    return `<div class="group"><h3>${esc(name)} <span class="cnt">Top5 典籍</span></h3>${bars}</div>`;
  }).join("");
  $("#results").innerHTML = `<div class="notice"><b>依据分布</b>：每个概念的命中在典籍上的分布（Top5），用来回答"这个概念主要在哪几部经里被讲"。</div>` + rows;
}

async function renderReview() {
  $("#results").innerHTML = `<p class="muted">载入校对队列…</p>`;
  const d = await fetch("data/review.json?v=20261101044401").then(r => r.json());
  const items = d.items.slice(0, 150).map((it, i) => {
    const bads = Object.entries(it.checks).filter(([k, v]) => !v).map(([k]) => k);
    const warns = (it.warnings || []).filter(w => w.startsWith("C7")).map(w => `<div class="notes">⚠ ${esc(w)}</div>`).join("");
    return `<div class="hit" data-doc="${esc(it.doc_id)}" data-lb="${esc(it.lb)}">
      <div class="src">「${esc(it.concept)}」· <b>${esc(it.doc_id)}</b> 卷${it.juan} · 行${esc(it.lb)}
        ${bads.length ? `<span class="b bad">未过 ${bads.join(" ")}</span>` : `<span class="b warn">C7 语境旗</span>`}</div>
      <div class="q">${esc(it.quote)}</div>${warns}</div>`;
  }).join("");
  $("#results").innerHTML = `<div class="notice"><b>校对队列</b>：概念命中中<b>未全绿</b>或<b>被 C7 语境旗拦截</b>的条目，
    共 <b>${d.total}</b> 条（展示前 ${Math.min(150, d.total)}）。点开可看原文上下文。<br>
    这不是"错误列表"，是"需要人看一眼"的列表——系统不判对错，只标出风险。</div>` + items;
  bindHitsLb();
}

function renderUnresolved() {
  const acc = {};
  (QUOTES.items || []).forEach(q => { if (!q.target_doc) acc[q.target] = (acc[q.target] || 0) + 1; });
  const rows = Object.entries(acc).sort((a, b) => b[1] - a[1]).map(([t, n]) =>
    `<div class="hit"><div class="src">《${esc(t)}》</div><div class="q">被引用 ${n} 次，本库尚未收录该典籍</div></div>`).join("");
  $("#results").innerHTML = `<div class="notice"><b>未收录典籍</b>：被祖师引用、但当前语料尚未收录的典籍。
    系统显式列出自己的边界，而不是假装覆盖完整。</div>` + (rows || "<p class='muted'>无</p>");
}

function bindHitsLb() {
  document.querySelectorAll("#results .hit[data-doc]").forEach(el =>
    el.addEventListener("click", () => openContext(el.dataset.doc, el.dataset.lb, el.querySelector(".q").textContent)));
}

function shortTitle(t) { if (!t) return "（无题）"; const m = t.match(/No\.\s*\d+\s*(.+)$/); return (m ? m[1] : t).trim(); }

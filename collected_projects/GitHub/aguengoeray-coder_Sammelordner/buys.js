// Sammelordner – Reiter „Einkäufe & Wert“
// Erfasst Einkäufe von Einzelkarten (verknüpft mit der Checkliste) und Sealed-Produkten,
// Verkäufe (auch teilweise) und rechnet Bestand, Buchgewinn, realisierten Gewinn und Gesamtrendite aus.
// Gespeichert in st.buys (Liste). Ein Eintrag:
//   { id, type:"card"|"sealed", qty, price, value, valueDate, date, seller, note,
//     hist:   [{ d:"2026-10-13", v:12.5 }]                                    – Verlauf des Werts pro Stück
//     sales:  [{ id, qty, price, fee, ship, date, buyer }]                     – Verkäufe (price pro Stück, fee/ship gesamt)
//     card:   { key:"base-4:1e", b:1|2, set, no, de, en, setName, cardNo }   – nur bei type "card"
//     sealed: { name, kind, lang:"de"|"en" }                                  – nur bei type "sealed" }
// price und value sind Euro pro Stück; value darf fehlen (dann zählt der Kaufpreis, ohne Gewinn).
// Der aktuelle Wert wird von Hand gepflegt – es gibt keine freie Preis-Schnittstelle von Cardmarket.

const SEALED_KINDS = ["Booster", "Display", "Elite Trainer Box", "Kollektion / Box", "Tin", "Blister", "Kartenlot", "Sonstiges"];
const STALE_DAYS = 30;
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const eur0 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("de-DE", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const signed = n => (n > 0 ? "+" : "") + eur.format(n);
const tone = n => n > 0.004 ? "pos" : n < -0.004 ? "neg" : "";
const fmtDate = d => d ? d.split("-").reverse().join(".") : "";
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const dayNum = d => Math.floor(Date.parse(d) / 864e5);
const dayStr = n => new Date(n * 864e5).toISOString().slice(0, 10);
const daysSince = d => d ? dayNum(today()) - dayNum(d) : Infinity;
const parseMoney = s => { s = String(s || "").trim().replace(/\s|€/g, ""); if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const n = Number(s); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN; };
const money = n => n == null ? "" : String(n.toFixed(2)).replace(".", ",");
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const okDate = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

function cleanBuys(list){
  if (!Array.isArray(list)) return [];
  return list.filter(x => x && typeof x === "object" && (x.type === "card" ? x.card && x.card.key : x.type === "sealed" && x.sealed))
    .map(x => {
      const y = { ...x, id: x.id || newId(), qty: Math.max(1, parseInt(x.qty, 10) || 1),
                  price: +x.price || 0, value: x.value == null || x.value === "" ? null : +x.value };
      y.sales = (Array.isArray(x.sales) ? x.sales : []).filter(s => s && +s.qty > 0)
        .map(s => ({ id: s.id || newId(), qty: Math.max(1, parseInt(s.qty, 10) || 1), price: +s.price || 0,
                     fee: +s.fee || 0, ship: +s.ship || 0, date: okDate(s.date) ? s.date : (y.date || today()), buyer: s.buyer || "" }));
      y.hist = (Array.isArray(x.hist) ? x.hist : []).filter(h => h && okDate(h.d) && isFinite(+h.v)).map(h => ({ d: h.d, v: +h.v }));
      if (!y.hist.length && y.value != null) y.hist = [{ d: okDate(y.valueDate) ? y.valueDate : (okDate(y.date) ? y.date : today()), v: y.value }];
      y.hist.sort((a, b) => a.d.localeCompare(b.d));
      return y;
    });
}
st.buys = cleanBuys(st.buys);
// Japanisch: nur im Einkaufs-Reiter (Bit 4) – die Checkliste kennt nur DE/EN, daher wird dort nichts abgehakt
LANG_LABEL[4] = "JP";
const SEALED_LANG = { de: "DE", en: "EN", ja: "JP" };

// ---------- Kennzahlen ----------
const soldQty = x => x.sales.reduce((a, s) => a + s.qty, 0);
const held = x => x.qty - soldQty(x);
const unitVal = x => x.value == null ? x.price : x.value;
const cost = x => held(x) * x.price;                       // investiert im Bestand
const worth = x => held(x) * unitVal(x);                   // aktueller Wert des Bestands
const gain = x => worth(x) - cost(x);                      // Buchgewinn
const saleNet = s => s.qty * s.price - s.fee - s.ship;     // Erlös nach Kosten
const saleGain = (x, s) => saleNet(s) - s.qty * x.price;   // realisierter Gewinn
const stale = x => held(x) > 0 && (x.value == null || daysSince(x.valueDate) > STALE_DAYS);

function totals(){
  let inv = 0, val = 0, real = 0, ever = 0, nSales = 0, pieces = 0;
  for (const x of st.buys){
    inv += cost(x); val += worth(x); ever += x.qty * x.price; pieces += held(x);
    for (const s of x.sales){ real += saleGain(x, s); nSales++; }
  }
  const book = val - inv, total = book + real;
  return { inv, val, real, ever, book, total, nSales, pieces, rate: ever ? total / ever : 0 };
}

function buyTitle(x){
  if (x.type === "sealed") return x.sealed.name;
  return (st.lang === "de" ? x.card.de : x.card.en) || x.card.en || x.card.de;
}
function buySub(x){
  if (x.type === "sealed") return [x.sealed.kind, SEALED_LANG[x.sealed.lang] || "DE"].filter(Boolean);
  const v = x.card.key.includes(":") ? VSUF[x.card.key.split(":")[1]] : null;
  const c = x.card.b !== 4 && st.cond[Condition.key(x.card.key, x.card.b)];
  return [x.card.setName, x.card.cardNo, LANG_LABEL[x.card.b], v && v.short, c && has(x.card.key, x.card.b) && Condition.short(c)].filter(Boolean);
}

// ---------- Reiter ----------
function showTab(t){
  st.tab = t === "buys" ? "buys" : "check"; save();
  $("viewCheck").hidden = st.tab !== "check";
  $("viewBuys").hidden = st.tab !== "buys";
  $("subCheck").hidden = st.tab !== "check";
  document.querySelectorAll(".navbtn").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === st.tab)));
  if (st.tab === "buys") renderBuys();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll(".navbtn").forEach(b => b.onclick = () => showTab(b.dataset.tab));

// ---------- Übersicht ----------
const bv = { q: "", type: "all", view: "hold", sort: st.buySort || "date" };
function renderBuys(){
  const t = totals();
  const tile = (num, lbl, cls = "", sub = "") => `<div class="ct ${cls}"><span class="num">${num}</span><span class="lbl">${lbl}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`;
  $("buyStats").innerHTML =
      tile(eur.format(t.val), "Aktueller Wert", "wide", `${t.pieces} Stück im Bestand`)
    + tile(eur.format(t.inv), "Investiert", "wide", "im Bestand")
    + tile(signed(t.book), "Buchgewinn", "wide " + tone(t.book), t.inv ? pct.format(t.book / t.inv) + " auf den Bestand" : "noch nicht verkauft")
    + tile(signed(t.real), "Realisiert", "wide " + tone(t.real), t.nSales ? `aus ${t.nSales} Verkauf${t.nSales > 1 ? "en" : ""}` : "noch nichts verkauft")
    + tile(`${signed(t.total)} <small>${t.ever ? pct.format(t.rate) : ""}</small>`, "Gesamtrendite", "full " + tone(t.total), "Buchgewinn + realisierter Gewinn, bezogen auf alles, was du je investiert hast");
  const old = st.buys.filter(stale).length;
  $("buyStale").hidden = !old;
  $("buyStale").textContent = old ? `${old} ${old === 1 ? "Wert ist" : "Werte sind"} älter als ${STALE_DAYS} Tage oder noch nicht eingetragen – kurz auf Cardmarket nachsehen und aktualisieren.` : "";
  if ($("chartBox").open) renderChart();

  document.querySelectorAll("#buyType button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === bv.type)));
  document.querySelectorAll("#buyView button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === bv.view)));
  $("buySort").value = bv.sort;
  const q = bv.q.trim().toLowerCase();
  const match = x => (bv.type === "all" || x.type === bv.type)
    && (!q || [buyTitle(x), x.type === "card" ? x.card.en + " " + x.card.de : "", ...buySub(x), x.seller || "", x.note || "", ...x.sales.map(s => s.buyer)].join(" ").toLowerCase().includes(q));
  const list = $("buyList"); list.innerHTML = "";
  if (!st.buys.length){ list.innerHTML = `<p class="empty">Noch keine Einkäufe erfasst. Tippe auf „+ Einkauf“ – oder in der Checkliste auf einen Kartennamen und dann auf „Einkauf erfassen“.</p>`; return; }
  if (bv.view === "sold") return renderSold(list, match);

  const rows = st.buys.filter(x => held(x) > 0 && match(x));
  const by = { date: (a, b) => (b.date || "").localeCompare(a.date || ""), gain: (a, b) => gain(b) - gain(a),
               roi: (a, b) => (cost(b) ? gain(b) / cost(b) : 0) - (cost(a) ? gain(a) / cost(a) : 0),
               value: (a, b) => worth(b) - worth(a), stale: (a, b) => (stale(b) - stale(a)) || daysSince(b.valueDate) - daysSince(a.valueDate) };
  rows.sort(by[bv.sort] || by.date);
  if (!rows.length){ list.innerHTML = `<p class="empty">${st.buys.some(x => held(x) > 0) ? "Kein Eintrag passt zu diesem Filter." : "Alles verkauft – unter „Verkauft“ findest du deine Verkäufe."}</p>`; return; }
  const ul = document.createElement("ul"); ul.className = "buyul";
  for (const x of rows){
    const h = held(x), gg = gain(x), r = cost(x) ? gg / cost(x) : 0;
    const btn = rowButton(x, `<span class="br"><span class="bval">${eur.format(worth(x))}</span>
        <span class="bgain ${tone(gg)}">${x.value == null ? "kein Wert" : signed(gg) + " · " + pct.format(r)}</span>
        ${stale(x) && x.value != null ? `<span class="bold">Wert vom ${fmtDate(x.valueDate)}</span>` : ""}</span>`,
      `${h > 1 ? h + " × " : ""}${eur.format(x.price)} · ${fmtDate(x.date) || "ohne Datum"}${x.sales.length ? ` · ${soldQty(x)} verkauft` : ""}`);
    const li = document.createElement("li"); li.appendChild(btn); ul.appendChild(li);
  }
  list.appendChild(ul);
}
function rowButton(x, right, meta){
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "buyrow";
  btn.innerHTML = `<span class="bl"><span class="btype ${x.type}">${x.type === "card" ? "Karte" : "Sealed"}</span><b></b>
      <small class="bsub"></small><small class="bmeta"></small></span>${right}`;
  btn.querySelector("b").textContent = buyTitle(x);
  btn.querySelector(".bsub").textContent = buySub(x).join(" · ") + (x.seller ? " · " + x.seller : "");
  btn.querySelector(".bmeta").textContent = meta;
  btn.setAttribute("aria-label", `${buyTitle(x)} – öffnen`);
  btn.onclick = () => openBuy(x);
  return btn;
}
function renderSold(list, match){
  const rows = [];
  for (const x of st.buys) if (match(x)) for (const s of x.sales) rows.push({ x, s });
  const by = { date: (a, b) => b.s.date.localeCompare(a.s.date), gain: (a, b) => saleGain(b.x, b.s) - saleGain(a.x, a.s),
               roi: (a, b) => saleGain(b.x, b.s) / (b.s.qty * b.x.price || 1) - saleGain(a.x, a.s) / (a.s.qty * a.x.price || 1),
               value: (a, b) => saleNet(b.s) - saleNet(a.s) };
  rows.sort(by[bv.sort] || by.date);
  if (!rows.length){ list.innerHTML = `<p class="empty">${st.buys.some(x => x.sales.length) ? "Kein Verkauf passt zu diesem Filter." : "Noch nichts verkauft. Öffne einen Eintrag im Bestand und tippe auf „Verkaufen“."}</p>`; return; }
  const ul = document.createElement("ul"); ul.className = "buyul";
  for (const { x, s } of rows){
    const g = saleGain(x, s), base = s.qty * x.price;
    const btn = rowButton(x, `<span class="br"><span class="bval">${eur.format(saleNet(s))}</span>
        <span class="bgain ${tone(g)}">${signed(g)}${base ? " · " + pct.format(g / base) : ""}</span></span>`,
      `${s.qty > 1 ? s.qty + " × " : ""}${eur.format(s.price)} verkauft am ${fmtDate(s.date)}${s.buyer ? " · " + s.buyer : ""}`);
    btn.querySelector(".btype").textContent = "Verkauft"; btn.querySelector(".btype").className = "btype sold";
    const li = document.createElement("li"); li.appendChild(btn); ul.appendChild(li);
  }
  list.appendChild(ul);
}
$("buySearch").addEventListener("input", e => { bv.q = e.target.value; renderBuys(); });
$("buyType").onclick = e => { const v = e.target.dataset.v; if (v){ bv.type = v; renderBuys(); } };
$("buyView").onclick = e => { const v = e.target.dataset.v; if (v){ bv.view = v; renderBuys(); } };
$("buySort").onchange = e => { bv.sort = st.buySort = e.target.value; save(); renderBuys(); };
$("addBuy").onclick = () => openBuy(null);

// ---------- Verlauf (Graf) ----------
// Aus Käufen, Verkäufen und jedem aktualisierten Wert wird für jeden Stichtag der Stand berechnet.
const RANGES = { "1M": 30, "6M": 182, "1J": 365, "Max": null };
const chart = { mode: st.chartMode || "value", range: st.chartRange || "Max" };
const buyDay = x => okDate(x.date) ? x.date : (x.hist[0] ? x.hist[0].d : today());
function stateAt(D){
  let inv = 0, val = 0, real = 0, ever = 0;
  for (const x of st.buys){
    if (buyDay(x) > D) continue;
    let s0 = 0;
    for (const s of x.sales) if (s.date <= D){ s0 += s.qty; real += saleGain(x, s); }
    let unit = x.price; for (const h of x.hist){ if (h.d <= D) unit = h.v; else break; }
    const h = x.qty - s0;
    inv += h * x.price; val += h * unit; ever += x.qty * x.price;
  }
  return { d: D, inv, val, real, ret: ever ? (val - inv + real) / ever : 0 };
}
function chartSeries(){
  if (!st.buys.length) return [];
  const end = today(), days = new Set([end]);
  for (const x of st.buys){ days.add(buyDay(x)); x.hist.forEach(h => days.add(h.d)); x.sales.forEach(s => days.add(s.date)); }
  let pts = [...days].filter(d => d <= end).sort();
  const span = RANGES[chart.range];
  if (span){
    const start = dayStr(dayNum(end) - span);
    if (pts[0] < start) pts = [start, ...pts.filter(d => d > start)];
  }
  return pts.map(stateAt);
}
function niceTicks(lo, hi, n = 3){
  if (hi - lo < 1e-9){ const p = Math.abs(hi) || 1; lo -= p * 0.1; hi += p * 0.1; }
  const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
  for (let v = a; v <= b + step / 2; v += step) out.push(+v.toFixed(10));
  return out;
}
const SVGNS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
function renderChart(){
  document.querySelectorAll("#chartMode button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === chart.mode)));
  document.querySelectorAll("#chartRange button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === chart.range)));
  const pts = chartSeries(), wrap = $("chartPlot"); wrap.innerHTML = "";
  $("chartLegend").hidden = chart.mode !== "value";
  if (!pts.length){ wrap.innerHTML = `<p class="empty">Sobald du Einkäufe erfasst, erscheint hier der Verlauf.</p>`; $("chartRead").innerHTML = ""; $("chartHint").hidden = true; return; }
  const W = Math.max(260, wrap.clientWidth || 340), H = 190, L = 6, R = 6, T = 12, B = 22;
  const isVal = chart.mode === "value";
  const ys = isVal ? pts.flatMap(p => [p.val, p.inv]) : pts.map(p => p.ret);
  const ticks = niceTicks(Math.min(...ys, isVal ? Infinity : 0), Math.max(...ys, isVal ? -Infinity : 0));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const t0 = dayNum(pts[0].d), t1 = Math.max(dayNum(pts[pts.length - 1].d), t0 + 1);
  const X = d => L + (dayNum(d) - t0) / (t1 - t0) * (W - L - R);
  const Y = v => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chartsvg", role: "img",
    "aria-label": isVal ? "Verlauf von Gesamtwert und investiertem Betrag" : "Verlauf der Gesamtrendite" });
  // Gitter und Achsenbeschriftung
  for (const v of ticks){
    svg.appendChild(svgEl("line", { x1: L, x2: W - R, y1: Y(v), y2: Y(v), class: v === 0 && !isVal ? "gz" : "gl" }));
    const tx = svgEl("text", { x: L + 2, y: Y(v) - 4, class: "gt" }); tx.textContent = isVal ? eur0.format(v) : pct.format(v); svg.appendChild(tx);
  }
  const xl = (d, anchor) => { const t = svgEl("text", { x: anchor === "end" ? W - R : L, y: H - 6, class: "gt", "text-anchor": anchor }); t.textContent = fmtDate(d); svg.appendChild(t); };
  xl(pts[0].d, "start"); xl(pts[pts.length - 1].d, "end");
  // Treppenlinie: ein Wert gilt, bis der nächste eingetragen wird
  const step = f => { let p = `M${X(pts[0].d)},${Y(f(pts[0]))}`;
    for (let i = 1; i < pts.length; i++) p += `H${X(pts[i].d)}V${Y(f(pts[i]))}`;
    if (pts.length === 1) p += `H${W - R}`; return p; };
  if (isVal){
    const top = step(p => p.val), last = pts.length === 1 ? W - R : X(pts[pts.length - 1].d);
    svg.appendChild(svgEl("path", { d: `${top}V${H - B}H${X(pts[0].d)}Z`, class: "garea" }));
    svg.appendChild(svgEl("path", { d: step(p => p.inv), class: "gline inv" }));
    svg.appendChild(svgEl("path", { d: top, class: "gline val" }));
    svg.appendChild(svgEl("circle", { cx: last, cy: Y(pts[pts.length - 1].val), r: 4, class: "gdot" }));
  } else {
    svg.appendChild(svgEl("path", { d: step(p => p.ret), class: "gline val" }));
    svg.appendChild(svgEl("circle", { cx: pts.length === 1 ? W - R : X(pts[pts.length - 1].d), cy: Y(pts[pts.length - 1].ret), r: 4, class: "gdot" }));
  }
  // Fadenkreuz zum Antippen / Wischen
  const cross = svgEl("line", { y1: T, y2: H - B, class: "gx", visibility: "hidden" });
  const dot1 = svgEl("circle", { r: 5, class: "gdot hl", visibility: "hidden" });
  const dot2 = svgEl("circle", { r: 4, class: "gdot inv hl", visibility: "hidden" });
  svg.append(cross, dot1, dot2);
  const hit = svgEl("rect", { x: 0, y: 0, width: W, height: H, fill: "transparent", class: "ghit" });
  svg.appendChild(hit);
  wrap.appendChild(svg);

  const first = pts[0], lastP = pts[pts.length - 1];
  const read = (p, active) => {
    const box = $("chartRead");
    if (isVal){
      const ch = (p.val - p.inv + p.real) - (first.val - first.inv + first.real);
      box.innerHTML = `<span class="rv"></span><span class="rs"></span><span class="rd"></span>`;
      box.querySelector(".rv").textContent = eur.format(p.val);
      box.querySelector(".rs").textContent = `Investiert ${eur.format(p.inv)}${p.real ? ` · realisiert ${signed(p.real)}` : ""}`;
      box.querySelector(".rd").textContent = active ? fmtDate(p.d) : `${signed(ch)} im Zeitraum`;
      box.querySelector(".rd").className = "rd " + (active ? "" : tone(ch));
    } else {
      box.innerHTML = `<span class="rv"></span><span class="rs"></span><span class="rd"></span>`;
      box.querySelector(".rv").textContent = pct.format(p.ret);
      box.querySelector(".rv").className = "rv " + tone(p.ret);
      box.querySelector(".rs").textContent = `Gewinn gesamt ${signed(p.val - p.inv + p.real)}`;
      box.querySelector(".rd").textContent = active ? fmtDate(p.d) : "Gesamtrendite heute";
    }
  };
  read(lastP, false);
  const at = clientX => {
    const r = svg.getBoundingClientRect(), x = (clientX - r.left) / r.width * W;
    let p = pts[0]; for (const q of pts) if (X(q.d) <= x + 0.5) p = q;
    return p;
  };
  const show = e => {
    const p = at(e.clientX), cx = X(p.d);
    cross.setAttribute("x1", cx); cross.setAttribute("x2", cx); cross.setAttribute("visibility", "visible");
    dot1.setAttribute("cx", cx); dot1.setAttribute("cy", Y(isVal ? p.val : p.ret)); dot1.setAttribute("visibility", "visible");
    if (isVal){ dot2.setAttribute("cx", cx); dot2.setAttribute("cy", Y(p.inv)); dot2.setAttribute("visibility", "visible"); }
    read(p, true);
  };
  const hide = () => { [cross, dot1, dot2].forEach(e => e.setAttribute("visibility", "hidden")); read(lastP, false); };
  hit.addEventListener("pointerdown", e => { hit.setPointerCapture(e.pointerId); show(e); });
  hit.addEventListener("pointermove", e => { if (e.pointerType === "mouse" || e.buttons) show(e); });
  hit.addEventListener("pointerup", hide); hit.addEventListener("pointercancel", hide); hit.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hide(); });

  const valuePoints = st.buys.reduce((a, x) => a + x.hist.length, 0);
  $("chartHint").hidden = valuePoints > st.buys.length;
}
$("chartBox").addEventListener("toggle", () => { st.chartOpen = $("chartBox").open; save(); if (st.chartOpen) renderChart(); });
$("chartMode").onclick = e => { const v = e.target.dataset.v; if (v){ chart.mode = st.chartMode = v; save(); renderChart(); } };
$("chartRange").onclick = e => { const v = e.target.dataset.v; if (v){ chart.range = st.chartRange = v; save(); renderChart(); } };
let rsz; window.addEventListener("resize", () => { clearTimeout(rsz); rsz = setTimeout(() => { if (st.tab === "buys" && $("chartBox").open) renderChart(); }, 150); });
$("chartBox").open = !!st.chartOpen;

// ---------- Formular: Einkauf anlegen / bearbeiten ----------
let fb = null, fbReturn = null;   // Formularzustand
function openBuy(x, preset){
  fbReturn = document.activeElement;
  fb = x ? JSON.parse(JSON.stringify(x)) : {
    id: null, type: preset ? "card" : null, qty: 1, price: null, value: null, valueDate: null, date: today(), seller: "", note: "",
    hist: [], sales: [],
    card: preset ? { ...preset } : { set: st.set, key: "", b: isEnOnly(st.set) ? 2 : 1 }, sealed: { name: "", kind: "Booster", lang: "de" }
  };
  if (!fb.card) fb.card = { set: st.set, key: "", b: 1 };
  if (!fb.sealed) fb.sealed = { name: "", kind: "Booster", lang: "de" };
  fb.isNew = !x; fb.locked = !!preset;
  $("buySheet").hidden = false; document.body.classList.add("lock");
  $("bfTitle").textContent = x ? (held(x) > 0 ? "Eintrag" : "Verkaufter Eintrag") : "Neuer Einkauf";
  $("bfDelete").hidden = !x;
  $("bfQty").value = fb.qty; $("bfPrice").value = money(fb.price); $("bfValue").value = money(fb.value);
  $("bfDate").value = fb.date || ""; $("bfSeller").value = fb.seller || ""; $("bfNote").value = fb.note || "";
  $("bfMsg").textContent = "";
  renderBuyForm(); renderSellBox();
  $("buyForm").scrollTop = 0; $("bfClose").focus();
}
function closeBuy(){
  $("buySheet").hidden = true; fb = null;
  if ($("picker").hidden && $("collection").hidden && $("cardSheet").hidden) document.body.classList.remove("lock");
  if (fbReturn && document.contains(fbReturn)) fbReturn.focus();
}
function renderBuyForm(){
  const choosing = !fb.type;
  $("bfChoose").hidden = !choosing; $("bfRest").hidden = choosing;
  if (choosing){ $("bfType").hidden = true; $("bfCard").hidden = true; $("bfSealed").hidden = true; return; }
  document.querySelectorAll("#bfType button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === fb.type)));
  $("bfType").hidden = fb.locked || !fb.isNew;
  $("bfCard").hidden = fb.type !== "card"; $("bfSealed").hidden = fb.type !== "sealed";
  if (fb.type === "card") renderCardFields(); else renderSealedFields();
  $("bfValueHint").textContent = fb.valueDate ? `Zuletzt aktualisiert am ${fmtDate(fb.valueDate)}` : "Leer lassen, wenn du ihn noch nicht kennst.";
}
// Kasten oben im Eintrag: Bestand, „Verkaufen“ und die bisherigen Verkäufe
function renderSellBox(){
  const box = $("bfSellBox"), x = fb && fb.id ? st.buys.find(y => y.id === fb.id) : null;
  box.hidden = !x; if (!x) return;
  const h = held(x);
  box.innerHTML = `<div class="sbhead"><span><b></b><small></small></span></div><div class="sbsales"></div>`;
  box.querySelector("b").textContent = h > 0 ? `${h} von ${x.qty} im Bestand` : "Komplett verkauft";
  box.querySelector("small").textContent = h > 0 ? `Wert ${eur.format(worth(x))} · ${x.value == null ? "noch kein Wert eingetragen" : signed(gain(x)) + " Buchgewinn"}` : `Gewinn ${signed(x.sales.reduce((a, s) => a + saleGain(x, s), 0))}`;
  if (h > 0){
    const b = document.createElement("button"); b.type = "button"; b.className = "btn sellbtn"; b.textContent = "Verkaufen";
    b.onclick = () => openSell(x); box.querySelector(".sbhead").appendChild(b);
  }
  const wrap = box.querySelector(".sbsales");
  for (const s of x.sales.slice().sort((a, b) => b.date.localeCompare(a.date))){
    const g = saleGain(x, s), row = document.createElement("div"); row.className = "sbrow";
    row.innerHTML = `<span><b></b><small></small></span><span class="bgain ${tone(g)}"></span><button type="button" class="btn ghost sbundo">Rückgängig</button>`;
    row.querySelector("b").textContent = `${s.qty} × ${eur.format(s.price)} am ${fmtDate(s.date)}`;
    row.querySelector("small").textContent = [s.fee ? `Gebühren ${eur.format(s.fee)}` : "", s.ship ? `Versand ${eur.format(s.ship)}` : "", s.buyer].filter(Boolean).join(" · ") || `Erlös ${eur.format(saleNet(s))}`;
    row.querySelector(".bgain").textContent = signed(g);
    row.querySelector(".sbundo").onclick = () => {
      if (!confirm("Diesen Verkauf rückgängig machen? Die Stücke kommen zurück in den Bestand.")) return;
      x.sales = x.sales.filter(y => y.id !== s.id); fb.sales = JSON.parse(JSON.stringify(x.sales));
      afterBuyChange(null); renderSellBox(); $("bfTitle").textContent = "Eintrag"; toast("Verkauf rückgängig gemacht");
    };
    wrap.appendChild(row);
  }
}
function fillSetSelect(){
  const sel = $("bfSet"); if (sel.options.length) return;
  const groups = new Map();
  for (const s of INDEX){ if (!groups.has(s.series)) groups.set(s.series, []); groups.get(s.series).push(s); }
  const order = [...groups.entries()].sort((a, b) => b[1][0].date.localeCompare(a[1][0].date));
  for (const [name, sets] of order){
    const og = document.createElement("optgroup"); og.label = name === "Other" ? "Sonstige & Promos" : name;
    for (const s of sets.slice().reverse()){ const o = document.createElement("option"); o.value = s.id; o.textContent = `${s.name} (${s.date.slice(0, 4)})`; og.appendChild(o); }
    sel.appendChild(og);
  }
}
async function renderCardFields(){
  fillSetSelect();
  const c = fb.card, base = c.key ? c.key.split(":")[0] : "", suf = c.key.includes(":") ? ":" + c.key.split(":")[1] : "";
  $("bfSet").value = c.set; $("bfSet").disabled = fb.locked;
  const cardSel = $("bfCardSel"); cardSel.disabled = true;
  let d; try{ d = await loadSet(c.set); }catch(e){ cardSel.innerHTML = `<option>Set konnte nicht geladen werden</option>`; return; }
  if (!fb || fb.card !== c) return;   // Formular inzwischen geschlossen oder umgestellt
  cardSel.innerHTML = `<option value="">Karte wählen …</option>` + d.cards.map(k =>
    `<option value="${esc(k.key)}">${esc(cardNo(k, d))} ${esc(st.lang === "de" ? k.de : k.en)}</option>`).join("");
  cardSel.value = base; cardSel.disabled = fb.locked;
  const card = d.cards.find(k => k.key === base);
  const vs = card ? VARIANTS.filter(v => card.f & v.bit) : [];
  $("bfVarRow").hidden = !vs.length;
  $("bfVar").innerHTML = `<option value="">Normale Karte</option>` + vs.map(v => `<option value="${v.suffix}">${v.label}</option>`).join("");
  $("bfVar").value = vs.some(v => v.suffix === suf) ? suf : "";
  const enOnlySet = isEnOnly(c.set); if (enOnlySet && c.b === 1) c.b = 2;
  $("bfCardLang").querySelector('[data-v="1"]').hidden = enOnlySet;
  document.querySelectorAll("#bfCardLang button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.v === c.b)));
}
function renderSealedFields(){
  const s = fb.sealed;
  $("bfName").value = s.name || "";
  const k = $("bfKind"); if (!k.options.length) k.innerHTML = SEALED_KINDS.map(x => `<option>${esc(x)}</option>`).join("");
  k.value = SEALED_KINDS.includes(s.kind) ? s.kind : "Sonstiges";
  document.querySelectorAll("#bfSealedLang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === s.lang)));
}
$("bfChoose").onclick = e => { const b = e.target.closest(".choice"); if (b && fb){ fb.type = b.dataset.v; renderBuyForm(); } };
$("bfType").onclick = e => { const v = e.target.dataset.v; if (v && fb){ fb.type = v; renderBuyForm(); } };
$("bfSet").onchange = e => { fb.card = { set: e.target.value, key: "", b: fb.card.b }; renderCardFields(); };
$("bfCardSel").onchange = e => { fb.card.key = e.target.value; renderCardFields(); };
$("bfVar").onchange = e => { const base = fb.card.key.split(":")[0]; if (base) fb.card.key = base + e.target.value; };
$("bfCardLang").onclick = e => { const v = +e.target.dataset.v; if (v){ fb.card.b = v; renderCardFields(); } };
$("bfSealedLang").onclick = e => { const v = e.target.dataset.v; if (v){ fb.sealed.lang = v; renderSealedFields(); } };
$("bfName").addEventListener("input", e => { fb.sealed.name = e.target.value; });
$("bfKind").onchange = e => { fb.sealed.kind = e.target.value; };
$("bfClose").onclick = closeBuy; $("bfCancel").onclick = closeBuy;
$("buySheet").addEventListener("click", e => { if (e.target === $("buySheet")) closeBuy(); });

$("buyForm").addEventListener("submit", e => {
  e.preventDefault();
  const err = t => { $("bfMsg").textContent = t; };
  if (!fb.type) return;
  const qty = parseInt($("bfQty").value, 10), price = parseMoney($("bfPrice").value), value = parseMoney($("bfValue").value);
  const before = fb.id ? st.buys.find(x => x.id === fb.id) : null, sold = before ? soldQty(before) : 0;
  if (!(qty >= 1)) return err("Bitte eine Anzahl von mindestens 1 eintragen.");
  if (qty < sold) return err(`Davon sind schon ${sold} verkauft – die Anzahl kann nicht kleiner sein.`);
  if (price == null || isNaN(price)) return err("Bitte den Kaufpreis eintragen, z. B. 12,50.");
  if (isNaN(value)) return err("Der aktuelle Wert ist keine gültige Zahl.");
  const out = { id: fb.id || newId(), type: fb.type, qty, price, value, date: $("bfDate").value || "",
                seller: $("bfSeller").value.trim(), note: $("bfNote").value.trim(), valueDate: fb.valueDate || null,
                sales: before ? before.sales : [], hist: before ? before.hist.slice() : [] };
  if (value != null && (!before || before.value !== value || !before.valueDate)){
    out.valueDate = today();
    out.hist = out.hist.filter(h => h.d !== out.valueDate); out.hist.push({ d: out.valueDate, v: value });
    out.hist.sort((a, b) => a.d.localeCompare(b.d));
  }
  if (value == null){ out.valueDate = null; }
  if (fb.type === "card"){
    const c = fb.card; if (!c.key) return err("Bitte eine Karte wählen. Sealed gekauft? Oben auf „Sealed-Produkt“ umschalten.");
    const d = LOADED[c.set], card = d && d.cards.find(k => k.key === c.key.split(":")[0]);
    if (!card) return err("Bitte eine Karte wählen.");
    out.card = { key: c.key, b: c.b, set: c.set, no: card.no, de: card.de, en: card.en, setName: BYID[c.set].name, cardNo: cardNo(card, d) };
    if (c.b !== 4 && !has(c.key, c.b) && qty > sold){ setOwned(c.key, c.b, true); }   // gekaufte Karte gilt als vorhanden
  } else {
    const name = fb.sealed.name.trim(); if (!name) return err("Bitte das Produkt benennen, z. B. „Base Set Booster“.");
    out.sealed = { name, kind: fb.sealed.kind, lang: fb.sealed.lang };
  }
  if (before){ Object.assign(before, out); if (out.type === "sealed") delete before.card; else delete before.sealed; }
  else st.buys.push(out);
  afterBuyChange(out.type === "card" ? out.card.key : null);
  closeBuy(); toast("Gespeichert");
});
$("bfDelete").onclick = () => {
  if (!fb || !fb.id) return;
  const x = st.buys.find(y => y.id === fb.id);
  if (!confirm(`Diesen Eintrag${x && x.sales.length ? " samt Verkäufen" : ""} löschen? Die Karte bleibt in der Checkliste abgehakt.`)) return;
  st.buys = st.buys.filter(y => y.id !== fb.id);
  afterBuyChange(x && x.type === "card" ? x.card.key : null);
  closeBuy(); toast("Eintrag gelöscht");
};
function afterBuyChange(cardKey){
  st.dirty = true; save(); schedulePush();
  renderBuys();
  if (cardKey){ renderSummary(); renderMissing(); if (current && cardKey.startsWith(current.id + "-")) renderCards(); }
  if (!$("cardSheet").hidden) renderSheet();
  if (!$("collection").hidden) renderCollection();
}

// ---------- Verkaufen ----------
let sx = null;
function openSell(x){
  sx = x; const h = held(x);
  $("sellSheet").hidden = false;
  $("sfName").textContent = buyTitle(x);
  $("sfSub").textContent = `${h} im Bestand · gekauft für ${eur.format(x.price)} pro Stück`;
  $("sfQtyRow").hidden = h <= 1;
  $("sfQty").value = 1; $("sfQty").max = h; $("sfAll").textContent = `Alle ${h}`;
  $("sfPrice").value = x.value != null ? money(x.value) : "";
  $("sfFee").value = ""; $("sfShip").value = ""; $("sfDate").value = today(); $("sfBuyer").value = ""; $("sfMsg").textContent = "";
  sellPreview(); $("sfPrice").focus();
}
function closeSell(){ $("sellSheet").hidden = true; sx = null; }
function sellRead(){
  const qty = $("sfQtyRow").hidden ? 1 : parseInt($("sfQty").value, 10);
  return { qty, price: parseMoney($("sfPrice").value), fee: parseMoney($("sfFee").value) || 0, ship: parseMoney($("sfShip").value) || 0 };
}
function sellPreview(){
  if (!sx) return;
  const r = sellRead(), el = $("sfPreview");
  if (!(r.qty >= 1) || r.price == null || isNaN(r.price) || isNaN(r.fee) || isNaN(r.ship)){ el.innerHTML = `<span class="muted">Trag den Verkaufspreis ein – hier siehst du dann deinen Gewinn.</span>`; return; }
  const s = { qty: r.qty, price: r.price, fee: r.fee, ship: r.ship }, g = saleGain(sx, s), base = r.qty * sx.price;
  el.innerHTML = `<span>Erlös nach Kosten <b>${eur.format(saleNet(s))}</b></span><span class="bgain ${tone(g)}">Gewinn ${signed(g)}${base ? " · " + pct.format(g / base) : ""}</span>`;
}
["sfQty", "sfPrice", "sfFee", "sfShip"].forEach(id => $(id).addEventListener("input", sellPreview));
$("sfAll").onclick = () => { if (sx){ $("sfQty").value = held(sx); sellPreview(); } };
$("sfClose").onclick = closeSell; $("sfCancel").onclick = closeSell;
$("sellSheet").addEventListener("click", e => { if (e.target === $("sellSheet")) closeSell(); });
$("sellForm").addEventListener("submit", e => {
  e.preventDefault(); if (!sx) return;
  const err = t => { $("sfMsg").textContent = t; }, r = sellRead(), h = held(sx);
  if (!(r.qty >= 1) || r.qty > h) return err(`Bitte eine Anzahl zwischen 1 und ${h} eintragen.`);
  if (r.price == null || isNaN(r.price)) return err("Bitte den Verkaufspreis pro Stück eintragen, z. B. 25,00.");
  if (isNaN(r.fee) || isNaN(r.ship)) return err("Gebühren und Versand bitte als Betrag eintragen, z. B. 1,50.");
  const date = okDate($("sfDate").value) ? $("sfDate").value : today();
  sx.sales.push({ id: newId(), qty: r.qty, price: r.price, fee: r.fee, ship: r.ship, date, buyer: $("sfBuyer").value.trim() });
  const x = sx; closeSell();
  // Karte komplett verkauft und kein anderer Eintrag hält sie noch? Dann anbieten, den Haken zu entfernen.
  if (x.type === "card" && x.card.b !== 4 && held(x) === 0 && has(x.card.key, x.card.b)
      && !st.buys.some(y => y !== x && y.type === "card" && y.card.key === x.card.key && y.card.b === x.card.b && held(y) > 0)
      && confirm("Karte verkauft. Soll der Haken in der Checkliste entfernt werden?")){
    setOwned(x.card.key, x.card.b, false); delete st.cond[Condition.key(x.card.key, x.card.b)];
  }
  afterBuyChange(x.type === "card" ? x.card.key : null);
  if (fb && fb.id === x.id){ fb.sales = JSON.parse(JSON.stringify(x.sales)); renderSellBox(); $("bfTitle").textContent = held(x) > 0 ? "Eintrag" : "Verkaufter Eintrag"; }
  toast("Verkauf gespeichert");
});

// ---------- Kartendetail: Einkäufe dieser Karte ----------
function sheetBuys(c, s){
  const mine = st.buys.filter(x => x.type === "card" && x.card.key.split(":")[0] === c.key);
  const sec = document.createElement("section"); sec.className = "csslot csbuys";
  sec.innerHTML = `<h3>Einkäufe</h3>`;
  for (const x of mine){
    const b = document.createElement("button"); b.type = "button"; b.className = "csbuy";
    const h = held(x), gg = gain(x);
    b.innerHTML = `<span><b></b><small></small></span><span class="bgain ${h ? tone(gg) : ""}"></span>`;
    b.querySelector("b").textContent = buySub(x).slice(2).join(" · ") || "Karte";
    b.querySelector("small").textContent = `${x.qty > 1 ? x.qty + " × " : ""}${eur.format(x.price)} · ${fmtDate(x.date) || "ohne Datum"}`;
    b.querySelector(".bgain").textContent = !h ? "verkauft" : x.value == null ? "kein Wert" : eur.format(worth(x));
    b.onclick = () => openBuy(x);
    sec.appendChild(b);
  }
  const add = document.createElement("button"); add.type = "button"; add.className = "btn ghost"; add.textContent = "+ Einkauf erfassen";
  add.onclick = () => openBuy(null, { set: s.id, key: c.key, b: isEnOnly(s.id) ? 2 : (st.lang === "en" ? 2 : 1) });
  sec.appendChild(add);
  return sec;
}

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("sellSheet").hidden){ e.stopImmediatePropagation(); closeSell(); }
  else if (!$("buySheet").hidden){ e.stopImmediatePropagation(); closeBuy(); }
}, true);
showTab(st.tab);

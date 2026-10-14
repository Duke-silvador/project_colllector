// Sammelordner – App-Logik
// Speichert immer lokal im Browser. Ist Supabase eingerichtet und man ist angemeldet,
// wird die Sammlung zusätzlich in der Cloud gespeichert (eine Zeile pro Person).
// Kartendaten: data/sets.json (Übersicht) und data/<set>.json (wird erst beim Öffnen geladen).

const CFG = window.SAMMELORDNER_CONFIG || {};
const API = (CFG.supabaseUrl || "").replace(/\/+$/, "");
const CLOUD = Boolean(API && CFG.supabaseKey);

const $ = id => document.getElementById(id);
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k) || "null"); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- Zustand ----------
const KEY = "sammelordner-v1", SKEY = "sammelordner-session";
let st = { own:{}, cond:{}, buys:[], tab:"check", set:"base", recent:[], filter:"all", lang:"de", miss:"de", dirty:false, syncedUser:null };
const saved = store.get(KEY);
if (saved && typeof saved === "object") st = { ...st, ...saved, own: saved.own || {}, cond: Condition.clean(saved.cond), buys: saved.buys || [], recent: saved.recent || [] };
let session = store.get(SKEY);         // {access_token, refresh_token, expires_at, user:{id,email}}
let syncState = "local";               // local | ok | busy | warn

let INDEX = [], BYID = {};             // Übersicht aller Sets
const LOADED = {};                     // geladene Sets mit Karten
let current = null;                    // aktuell angezeigtes Set (mit Karten)

function save(){ store.set(KEY, st); updateBackup(); countsCache = null; }
const has = (k,b) => ((st.own[k] || 0) & b) !== 0;   // Bit 1 = DE, Bit 2 = EN

// Fortschritt pro Set aus den gespeicherten Schlüsseln "<set>-<nummer>"
let countsCache = null;
function counts(){
  if (countsCache) return countsCache;
  const c = {};
  for (const [k,v] of Object.entries(st.own)){
    if (k.includes(":")) continue;                 // Varianten zählen nicht zum Set-Fortschritt
    const id = k.slice(0, k.lastIndexOf("-")); const o = c[id] || (c[id] = {de:0,en:0});
    if (v & 1) o.de++; if (v & 2) o.en++;
  }
  return countsCache = c;
}
const progress = id => counts()[id] || {de:0,en:0};

const isNum = s => /^\d+$/.test(s);
const cardNo = (c,s) => isNum(c.no) ? c.no.padStart(String(s.printed).length,"0") + "/" + s.printed : c.no;

// Seltenheiten: kurze Codes der klassischen Sets, sonst die Bezeichnung aus der Datenbank
const RLABEL = { C:"● Häufig", U:"◆ Ungewöhnlich", R:"★ Selten", H:"★ Holo", S:"✦ Shining", E:"Basis-Energie", "":"",
  "Promo":"Promo", "Rare Ultra":"Ultra Rare", "Rare Secret":"Secret Rare", "Rare Rainbow":"Rainbow Rare",
  "Rare Shiny":"Shiny Rare", "Rare Shining":"✦ Shining", "Rare Holo EX":"★ Holo EX", "Rare Holo GX":"★ Holo GX",
  "Rare Holo V":"★ Holo V", "Rare Holo VMAX":"★ Holo VMAX", "Rare Holo VSTAR":"★ Holo VSTAR", "Rare Holo LV.X":"★ Holo LV.X",
  "MEGA_ATTACK_RARE":"Mega Attack Rare" };
const rlabel = r => RLABEL[r] !== undefined ? RLABEL[r] : r;
const special = r => !["C","U","R","E","","Promo"].includes(r);

async function loadIndex(){
  const res = await fetch("data/sets.json", {cache:"no-cache"}); INDEX = await res.json();
  BYID = Object.fromEntries(INDEX.map(s => [s.id, s]));
}
async function loadSet(id){
  if (LOADED[id]) return LOADED[id];
  const d = await (await fetch("data/" + id + ".json", {cache:"no-cache"})).json();
  d.cards = d.cards.map(([no,en,de,r,f]) => ({ no, en, de, r: d.rarities[r], f: f || 0, key: id + "-" + no }));
  return LOADED[id] = d;
}
async function openSet(id){
  if (!BYID[id]) id = INDEX[0].id;
  $("cards").innerHTML = `<li class="empty">Karten werden geladen …</li>`;
  try{ current = await loadSet(id); }
  catch(e){ $("cards").innerHTML = `<li class="empty">Dieses Set konnte nicht geladen werden. Prüfe die Internetverbindung und versuche es erneut.</li>`; return; }
  st.set = id; st.recent = [id, ...st.recent.filter(x => x !== id && BYID[x])].slice(0, 6);
  $("q").value = ""; save(); renderAll(); window.scrollTo({top:0});
}

// ---------- Varianten: eigener Schlüssel je Variante, z. B. "fossil-12:1e" oder "sv8-5:rh" ----------
const VARIANTS = [ { bit:1, suffix:":1e", label:"1. Edition", short:"1. Ed." }, { bit:2, suffix:":rh", label:"Reverse Holo", short:"Reverse" } ];
const showVariants = () => st.variants !== false;
// alle Felder einer Karte, die gerade angezeigt werden: die normale Karte plus vorhandene Varianten
const slots = c => [ { key:c.key, v:null }, ...(showVariants() ? VARIANTS.filter(v => c.f & v.bit).map(v => ({ key:c.key + v.suffix, v })) : []) ];
const setHasVariants = () => current && current.cards.some(c => c.f);
// Sets, die nie auf Deutsch erschienen sind: nur EN-Kästchen (bereits gesetzte DE-Haken bleiben gespeichert)
const isEnOnly = id => !!(BYID[id] && BYID[id].enOnly);
const enOnly = () => isEnOnly(st.set);
const FULL = () => enOnly() ? 2 : 3;

// ---------- Darstellung ----------
function renderHead(){
  const s = BYID[st.set]; if (!s) return;
  $("setName").textContent = s.name;
  $("setMeta").textContent = `${s.series} · ${s.date.slice(0,4)} · ${s.total} Karten` + (s.enOnly ? " · nur auf Englisch erschienen" : "");
  const chips = $("recent"); chips.innerHTML = `<span class="rl">Zuletzt:</span>`;
  for (const id of st.recent){
    if (id === st.set || !BYID[id]) continue;
    const b = document.createElement("button"); b.type = "button"; b.className = "chip";
    b.textContent = BYID[id].name; b.onclick = () => openSet(id); chips.appendChild(b);
  }
  chips.hidden = chips.children.length < 2;
}
function renderSummary(){
  const s = BYID[st.set], p = progress(st.set);
  const part = (cls,lbl,c) => { const pc = Math.round(c / s.total * 100);
    return `<div class="stat ${cls}"><span class="lbl">${lbl}</span><span class="num">${c}<span> / ${s.total} · ${pc} %</span></span><div class="bar"><i style="width:${pc}%"></i></div></div>`; };
  $("summary").innerHTML = (enOnly() ? "" : part("de","Deutsch",p.de)) + part("en","Englisch",p.en) + variantSummary();
  $("summary").classList.toggle("one", enOnly());
  $("varToggle").hidden = !setHasVariants();
}
function variantSummary(){
  if (!current || !showVariants()) return "";
  const parts = VARIANTS.map(v => {
    const cards = current.cards.filter(c => c.f & v.bit); if (!cards.length) return "";
    const de = cards.filter(c => has(c.key + v.suffix,1)).length, en = cards.filter(c => has(c.key + v.suffix,2)).length;
    return `<span><b>${v.label}:</b> ${enOnly() ? "" : `DE ${de} · `}EN ${en} von ${cards.length}</span>`;
  }).filter(Boolean);
  return parts.length ? `<p class="varsum">${parts.join("")}</p>` : "";
}
function renderCards(){
  if (!current) return;
  const s = current, q = $("q").value.trim().toLowerCase();
  const rows = s.cards.filter(c => {
    const vals = slots(c).map(x => st.own[x.key] || 0);
    const full = FULL();
    if (st.filter === "missing" && vals.every(v => (v & full) === full)) return false;
    if (st.filter === "have" && vals.every(v => (v & full) === 0)) return false;
    return !q || c.en.toLowerCase().includes(q) || c.de.toLowerCase().includes(q) || c.no.toLowerCase() === q;
  });
  const ol = $("cards"); ol.innerHTML = "";
  if (!rows.length){ ol.innerHTML = `<li class="empty">Keine Karte passt zu diesem Filter.</li>`; return; }
  const frag = document.createDocumentFragment(), noDE = enOnly();
  for (const c of rows){
    const li = document.createElement("li"); li.className = "card";
    const main = st.lang === "de" ? c.de : c.en, alt = st.lang === "de" ? c.en : c.de;
    li.innerHTML = `<span class="no">${esc(cardNo(c,s))}</span>
      <span class="nm"><button type="button" class="nmb"><b></b></button><small><span class="rar ${special(c.r)?"h":""}">${esc(rlabel(c.r))}</span>${alt!==main?`<span class="alt"></span>`:""}</small></span>
      <span class="boxes">${noDE ? "" : `<button type="button" class="box de" aria-pressed="${has(c.key,1)}">DE</button>`}<button type="button" class="box en" aria-pressed="${has(c.key,2)}">EN</button></span>`;
    li.querySelector("b").textContent = main;
    li.dataset.key = c.key;
    const nb = li.querySelector(".nmb"); nb.setAttribute("aria-label", `${main}: Details und Zustand`); nb.onclick = () => openCard(c);
    li.querySelector(".nm small").insertAdjacentHTML("beforeend", condBadges(c));
    const a = li.querySelector(".alt"); if (a) a.textContent = alt;
    const de = li.querySelector(".de"), en = li.querySelector(".en");
    en.setAttribute("aria-label", main + " englisch"); en.dataset.k = c.key; en.dataset.b = 2;
    if (de){ de.dataset.k = c.key; de.dataset.b = 1; }
    if (de){ de.setAttribute("aria-label", main + " deutsch"); de.onclick = () => toggle(c.key,1,de); }
    en.onclick = () => toggle(c.key,2,en);
    const extra = slots(c).slice(1);
    if (extra.length){
      const row = document.createElement("span"); row.className = "vars";
      for (const x of extra){
        const g = document.createElement("span"); g.className = "var";
        g.innerHTML = `<span class="vl">${x.v.short}</span>${noDE ? "" : `<button type="button" class="box de sm" aria-pressed="${has(x.key,1)}">DE</button>`}<button type="button" class="box en sm" aria-pressed="${has(x.key,2)}">EN</button>`;
        const vd = g.querySelector(".de"), ve = g.querySelector(".en");
        ve.setAttribute("aria-label", `${main} ${x.v.label} englisch`); ve.onclick = () => toggle(x.key,2,ve);
        ve.dataset.k = x.key; ve.dataset.b = 2; if (vd){ vd.dataset.k = x.key; vd.dataset.b = 1; }
        if (vd){ vd.setAttribute("aria-label", `${main} ${x.v.label} deutsch`); vd.onclick = () => toggle(x.key,1,vd); }
        row.appendChild(g);
      }
      li.appendChild(row);
    }
    frag.appendChild(li);
  }
  ol.appendChild(frag);
}
function toggle(k,b,btn){
  setOwned(k,b,!has(k,b));
  if (btn) btn.setAttribute("aria-pressed", String(has(k,b)));
  const ck = Condition.key(k,b);
  if (!has(k,b) && st.cond[ck]){ delete st.cond[ck]; refreshCondBadges(k); }
  st.dirty = true; save();
  renderSummary(); renderMissing();
  schedulePush();
}
function setOwned(k,b,on){
  st.own[k] = on ? (st.own[k] || 0) | b : (st.own[k] || 0) & ~b;
  if (!st.own[k]) delete st.own[k];
}
function renderMissing(){
  if (!current) return;
  const miss = enOnly() ? "en" : st.miss;
  const s = current, b = miss === "de" ? 1 : 2, lang = miss === "de" ? "deutsch" : "englisch";
  const lines = [];
  for (const c of s.cards){
    const name = `${cardNo(c,s)} ${miss==="de"?c.de:c.en}`, rar = special(c.r) ? " (" + rlabel(c.r).replace(/^[★✦◆●] /,"") + ")" : "";
    for (const x of slots(c)) if (!has(x.key,b)) lines.push(name + rar + (x.v ? " – " + x.v.label : ""));
  }
  $("missing").value = lines.length
    ? `Mir fehlen aus ${s.name} (${lang}), ${lines.length} Karten:\n` + lines.join("\n")
    : `${s.name} (${lang}) ist komplett!`;
}
function updateBackup(){ try{ $("backup").value = btoa(unescape(encodeURIComponent(JSON.stringify({v:3, own:st.own, cond:st.cond, buys:st.buys})))); }catch(e){} }
function syncSeg(){
  document.querySelectorAll("#filter button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === st.filter)));
  document.querySelectorAll("#lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.l === st.lang)));
  document.querySelectorAll("#misslang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === st.miss)));
  $("varToggle").setAttribute("aria-pressed", String(showVariants()));
}
function renderAll(){ syncSeg(); renderHead(); renderSummary(); renderCards(); renderMissing(); updateBackup(); renderAccount(); }

// ---------- Kartenzustand: Abzeichen in der Liste ----------
const LANG_LABEL = { 1: "DE", 2: "EN" };
function condBadges(c){
  const out = [];
  for (const x of slots(c)) for (const b of [1,2]){
    const v = st.cond[Condition.key(x.key,b)];
    if (v && has(x.key,b)) out.push(`<span class="cb ${b===1?"de":"en"}${v.kind==="graded"?" g":""}">${LANG_LABEL[b]}${x.v ? " " + esc(x.v.short) : ""} · ${esc(Condition.short(v))}</span>`);
  }
  return out.join("");
}
function refreshCondBadges(cardKey){
  const base = cardKey.split(":")[0];
  const li = document.querySelector(`#cards li[data-key="${CSS.escape(base)}"]`); if (!li || !current) return;
  const c = current.cards.find(x => x.key === base); if (!c) return;
  li.querySelectorAll(".cb").forEach(e => e.remove());
  li.querySelector(".nm small").insertAdjacentHTML("beforeend", condBadges(c));
  li.querySelectorAll("button.box").forEach(btn => btn.dataset.k && btn.setAttribute("aria-pressed", String(has(btn.dataset.k, +btn.dataset.b))));
}

// ---------- Kartendetail: Exemplare hinzufügen, Zustand wählen und bearbeiten ----------
let sheetCard = null, sheetSet = null, sheetOpen = null, sheetKind = null, sheetReturn = null;   // offenes Exemplar und gewählte Art (raw / Firma)
function openCard(c, set = current){
  sheetCard = c; sheetSet = set; sheetOpen = null; sheetKind = null; sheetReturn = document.activeElement;
  $("cardSheet").hidden = false; document.body.classList.add("lock");
  renderSheet(); $("closeCard").focus();
}
function closeCard(){
  $("cardSheet").hidden = true; sheetCard = null; sheetSet = null;
  if ($("picker").hidden && $("collection").hidden) document.body.classList.remove("lock");
  if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus();
}
function renderSheet(){
  const c = sheetCard, s = sheetSet; if (!c || !s) return;
  const main = st.lang === "de" ? c.de : c.en, alt = st.lang === "de" ? c.en : c.de;
  $("csNo").textContent = `${s.name} · ${cardNo(c,s)} · ${rlabel(c.r).replace(/^[★✦◆●] /,"")}`;
  $("csTitle").textContent = main; $("csAlt").textContent = alt !== main ? alt : ""; $("csAlt").hidden = alt === main;
  const langs = isEnOnly(s.id) ? [2] : [1,2];
  const all = [ { key:c.key, v:null }, ...VARIANTS.filter(v => c.f & v.bit).map(v => ({ key:c.key + v.suffix, v })) ];
  const wrap = $("csSlots"); wrap.innerHTML = "";
  for (const x of all){
    const sec = document.createElement("section"); sec.className = "csslot";
    sec.innerHTML = `<h3>${x.v ? esc(x.v.label) : "Normale Karte"}</h3>`;
    for (const b of langs) sec.appendChild(copyRow(x, b));
    wrap.appendChild(sec);
  }
  if (typeof sheetBuys === "function") wrap.appendChild(sheetBuys(c, s));
}
function copyRow(x, b){
  const ck = Condition.key(x.key,b), own = has(x.key,b), v = own ? st.cond[ck] : null, open = sheetOpen === ck;
  const row = document.createElement("div"); row.className = "copy" + (open ? " open" : "");
  const lang = b === 1 ? "Deutsch" : "Englisch";
  row.innerHTML = `<div class="cphead">
      <button type="button" class="box ${b===1?"de":"en"}" aria-pressed="${own}">${LANG_LABEL[b]}</button>
      <span class="cpinfo"><b>${lang}</b><small>${own ? esc(Condition.long(v)) : "Nicht in der Sammlung"}</small></span>
      <button type="button" class="pill cpedit" aria-expanded="${open}">${v ? esc(Condition.short(v)) : own ? "Zustand wählen" : "Hinzufügen"}</button>
    </div>`;
  const [box, , ] = row.querySelectorAll("button");
  box.setAttribute("aria-label", `${lang} ${own ? "aus der Sammlung entfernen" : "zur Sammlung hinzufügen"}`);
  box.onclick = () => { toggle(x.key, b, null); afterSheetChange(x.key); };
  row.querySelector(".cpedit").onclick = () => {
    sheetOpen = open ? null : ck; sheetKind = v ? (v.kind === "raw" ? "raw" : v.company) : null; renderSheet();
  };
  if (open) row.appendChild(condEditor(x, b, v));
  return row;
}
function condEditor(x, b, v){
  const ed = document.createElement("div"); ed.className = "ced";
  const kinds = [ { id:"raw", label:"Raw" }, ...Object.entries(Condition.GRADERS).map(([id,g]) => ({ id, label:`${g.label} Graded` })) ];
  const seg = document.createElement("div"); seg.className = "seg"; seg.setAttribute("role","group"); seg.setAttribute("aria-label","Art der Karte");
  for (const k of kinds){
    const btn = document.createElement("button"); btn.type = "button"; btn.textContent = k.label;
    btn.setAttribute("aria-pressed", String(sheetKind === k.id));
    btn.onclick = () => { sheetKind = k.id; renderSheet(); };
    seg.appendChild(btn);
  }
  ed.appendChild(seg);
  if (sheetKind){
    const opts = sheetKind === "raw" ? Condition.RAW.map(r => ({ grade:r.id, label:r.label, title:r.de }))
                                     : Condition.GRADERS[sheetKind].grades.map(g => ({ grade:g, label:`${Condition.GRADERS[sheetKind].label} ${g}`, title:"" }));
    const grid = document.createElement("div"); grid.className = "grades"; grid.setAttribute("role","group");
    grid.setAttribute("aria-label", sheetKind === "raw" ? "Zustand" : "Note");
    for (const o of opts){
      const val = sheetKind === "raw" ? { kind:"raw", grade:o.grade } : { kind:"graded", company:sheetKind, grade:o.grade };
      const btn = document.createElement("button"); btn.type = "button"; btn.className = "chip"; btn.textContent = o.label;
      if (o.title) btn.title = o.title;
      btn.setAttribute("aria-pressed", String(!!v && Condition.short(v) === Condition.short(val)));
      btn.onclick = () => setCond(x, b, val);
      grid.appendChild(btn);
    }
    ed.appendChild(grid);
  } else {
    const p = document.createElement("p"); p.className = "cphint"; p.textContent = "Ist die Karte gegradet? Wähle zuerst Raw oder Graded.";
    ed.appendChild(p);
  }
  if (v){
    const rm = document.createElement("button"); rm.type = "button"; rm.className = "btn ghost cprm"; rm.textContent = "Zustand entfernen";
    rm.onclick = () => { delete st.cond[Condition.key(x.key,b)]; sheetKind = null; commitSheet(x.key); };
    ed.appendChild(rm);
  }
  return ed;
}
function setCond(x, b, val){
  if (!has(x.key,b)) setOwned(x.key, b, true);          // Zustand wählen fügt das Exemplar hinzu
  st.cond[Condition.key(x.key,b)] = val; sheetOpen = null;
  commitSheet(x.key);
  toast(`${LANG_LABEL[b]}: ${Condition.short(val)} gespeichert`);
}
function commitSheet(cardKey){
  st.dirty = true; save(); schedulePush();
  renderSummary(); renderMissing(); afterSheetChange(cardKey);
}
function afterSheetChange(cardKey){
  if (current && sheetSet === current){ if (st.filter !== "all") renderCards(); else refreshCondBadges(cardKey); }
  else if (current && cardKey.startsWith(current.id + "-")) renderCards();
  if (!$("collection").hidden) renderCollection();
  renderSheet();
}
$("closeCard").onclick = closeCard;
$("cardSheet").addEventListener("click", e => { if (e.target === $("cardSheet")) closeCard(); });

// ---------- Meine Sammlung: alles Abgehakte über alle Sets ----------
// Ein Exemplar = Karte (inkl. Variante) + Sprache. Gezählt wird direkt aus st.own, Namen kommen aus den Set-Dateien.
const col = { lang:"all", kind:"all", q:"" };
const VSUF = Object.fromEntries(VARIANTS.map(v => [v.suffix.slice(1), v]));     // "1e" → 1. Edition, "rh" → Reverse Holo
function parseKey(k){
  const [base, suf] = k.split(":"), i = base.lastIndexOf("-");
  return { set: base.slice(0, i), no: base.slice(i + 1), base, v: suf ? VSUF[suf] || null : null };
}
function collectionCopies(){
  const out = [];
  for (const [k, bits] of Object.entries(st.own)){
    const p = parseKey(k); if (!BYID[p.set]) continue;
    for (const b of [1,2]) if (bits & b && !(b === 1 && isEnOnly(p.set))) out.push({ ...p, key:k, b, cond: st.cond[Condition.key(k,b)] || null });
  }
  return out;
}
let colLoading = null;
async function openCollection(){
  $("collection").hidden = false; document.body.classList.add("lock");
  $("colSearch").value = col.q; syncColSeg();
  $("colList").innerHTML = `<p class="empty">Sammlung wird geladen …</p>`; $("colStats").innerHTML = "";
  const sets = [...new Set(collectionCopies().map(c => c.set))];
  colLoading = Promise.all(sets.map(id => loadSet(id).catch(() => null)));
  await colLoading; renderCollection(); $("closeCollection").focus();
}
function closeCollection(){
  $("collection").hidden = true;
  if ($("picker").hidden && $("cardSheet").hidden) document.body.classList.remove("lock");
}
function syncColSeg(){
  document.querySelectorAll("#colLang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === col.lang)));
  document.querySelectorAll("#colKind button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === col.kind)));
}
function renderCollection(){
  const all = collectionCopies();
  // Kennzahlen über die ganze Sammlung (unabhängig vom Filter)
  const cards = new Set(all.map(c => c.base)), sets = new Set(all.map(c => c.set));
  const n = f => all.filter(f).length;
  const tile = (num, lbl, cls = "", sub = "") => `<div class="ct ${cls}"><span class="num">${num}</span><span class="lbl">${lbl}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`;
  $("colStats").innerHTML = tile(all.length, "Karten gesamt", "wide", `${cards.size} verschiedene`)
    + tile(n(c => c.b === 1), "Deutsch", "de") + tile(n(c => c.b === 2), "Englisch", "en")
    + tile(sets.size, "Sets") + tile(n(c => c.v), "Varianten") + tile(n(c => c.cond && c.cond.kind === "graded"), "Gegradet", "wide");
  // Filter
  const q = col.q.trim().toLowerCase();
  const shown = all.filter(c => (col.lang === "all" || (col.lang === "de" ? c.b === 1 : c.b === 2))
    && (col.kind === "all" || (col.kind === "graded" ? c.cond && c.cond.kind === "graded" : col.kind === "raw" ? c.cond && c.cond.kind === "raw" : !c.cond)));
  // Nach Set gruppieren, neueste Sets zuerst; innerhalb eines Sets nach Kartennummer
  const groups = new Map();
  for (const c of shown){
    const d = LOADED[c.set]; if (!d) continue;
    const card = d.cards.find(x => x.no === c.no); if (!card) continue;
    if (q && !card.en.toLowerCase().includes(q) && !card.de.toLowerCase().includes(q) && card.no.toLowerCase() !== q) continue;
    if (!groups.has(c.set)) groups.set(c.set, new Map());
    const g = groups.get(c.set); if (!g.has(card.key)) g.set(card.key, { card, copies: [] });
    g.get(card.key).copies.push(c);
  }
  const list = $("colList"); list.innerHTML = "";
  let vis = 0; for (const g of groups.values()) for (const r of g.values()) vis += r.copies.length;
  $("colCount").textContent = all.length && vis !== all.length ? `${vis} von ${all.length} Exemplaren` : "";
  if (!all.length){ list.innerHTML = `<p class="empty">Noch keine Karten abgehakt. Hake in einem Set ab, was in deinem Ordner steckt – hier erscheint dann deine ganze Sammlung.</p>`; return; }
  if (!groups.size){ list.innerHTML = `<p class="empty">Keine Karte passt zu diesem Filter.</p>`; return; }
  const ids = [...groups.keys()].sort((a,b) => BYID[b].date.localeCompare(BYID[a].date) || b.localeCompare(a));
  const num = s => /^\d+$/.test(s) ? +s : 1e9;
  for (const id of ids){
    const s = BYID[id], d = LOADED[id], rows = [...groups.get(id).values()].sort((a,b) => num(a.card.no) - num(b.card.no) || a.card.no.localeCompare(b.card.no));
    const sec = document.createElement("section"); sec.className = "series";
    const cnt = rows.reduce((a,r) => a + r.copies.length, 0);
    sec.innerHTML = `<h3><span>${esc(s.name)}</span><span class="cc">${cnt}</span></h3>`;
    const ul = document.createElement("ul");
    for (const { card, copies } of rows){
      const li = document.createElement("li"), btn = document.createElement("button");
      btn.type = "button"; btn.className = "colrow";
      const main = st.lang === "de" ? card.de : card.en;
      copies.sort((a,b) => a.b - b.b || (a.v ? 1 : 0) - (b.v ? 1 : 0));
      const tags = copies.map(c => `<span class="cb ${c.b===1?"de":"en"}${c.cond && c.cond.kind==="graded"?" g":""}">${LANG_LABEL[c.b]}${c.v ? " " + esc(c.v.short) : ""}${c.cond ? " · " + esc(Condition.short(c.cond)) : ""}</span>`).join("");
      btn.innerHTML = `<span class="no">${esc(cardNo(card, d))}</span><span class="sn"><b></b><small>${tags}</small></span>`;
      btn.querySelector("b").textContent = main;
      btn.setAttribute("aria-label", `${main}, ${s.name}, ${copies.length} Exemplar${copies.length > 1 ? "e" : ""} – Details`);
      btn.onclick = () => openCard(card, d);
      li.appendChild(btn); ul.appendChild(li);
    }
    sec.appendChild(ul); list.appendChild(sec);
  }
}
$("openCollection").onclick = openCollection;
$("closeCollection").onclick = closeCollection;
$("colSearch").addEventListener("input", e => { col.q = e.target.value; renderCollection(); });
$("colLang").onclick = e => { const v = e.target.dataset.v; if (v){ col.lang = v; syncColSeg(); renderCollection(); } };
$("colKind").onclick = e => { const v = e.target.dataset.v; if (v){ col.kind = v; syncColSeg(); renderCollection(); } };

// ---------- Set-Auswahl ----------
function renderPicker(){
  const q = $("setSearch").value.trim().toLowerCase();
  const onlyMine = $("pickMine").getAttribute("aria-pressed") === "true";
  const list = $("setList"); list.innerHTML = "";
  const series = [];
  for (const s of INDEX){
    if (q && !s.name.toLowerCase().includes(q) && !s.series.toLowerCase().includes(q) && !s.date.startsWith(q)) continue;
    const p = progress(s.id); if (onlyMine && !p.de && !p.en) continue;
    let g = series.find(x => x.name === s.series); if (!g) series.push(g = { name: s.series, sets: [] });
    g.sets.push(s);
  }
  series.sort((a,b) => (b.sets[0].date).localeCompare(a.sets[0].date));   // neueste Serie zuerst
  if (!series.length){ list.innerHTML = `<p class="empty">${onlyMine ? "Du hast noch in keinem Set etwas abgehakt." : "Kein Set gefunden."}</p>`; return; }
  for (const g of series){
    const sec = document.createElement("section"); sec.className = "series";
    sec.innerHTML = `<h3>${esc(g.name === "Other" ? "Sonstige & Promos" : g.name)}</h3>`;
    const ul = document.createElement("ul");
    for (const s of g.sets.slice().reverse()){
      const p = progress(s.id), li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "setrow" + (s.id === st.set ? " on" : "");
      b.innerHTML = `<span class="sn"><b>${esc(s.name)}</b><small>${s.date.slice(0,4)} · ${s.total} Karten</small></span>
        <span class="sp">${s.enOnly ? "" : `<span class="pd">${p.de}</span>`}<span class="pe">${p.en}</span></span>`;
      b.setAttribute("aria-label", s.enOnly ? `${s.name}, ${p.en} englisch von ${s.total}` : `${s.name}, ${p.de} deutsch und ${p.en} englisch von ${s.total}`);
      b.onclick = () => { closePicker(); openSet(s.id); };
      li.appendChild(b); ul.appendChild(li);
    }
    sec.appendChild(ul); list.appendChild(sec);
  }
}
function openPicker(){ $("picker").hidden = false; document.body.classList.add("lock"); $("setSearch").value = ""; renderPicker();
  const on = $("setList").querySelector(".on"); if (on) on.scrollIntoView({block:"center"}); }
function closePicker(){ $("picker").hidden = true; document.body.classList.remove("lock"); }
$("pickSet").onclick = openPicker;
$("closePicker").onclick = closePicker;
$("setSearch").addEventListener("input", renderPicker);
$("pickMine").onclick = e => { const b = e.currentTarget; b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); renderPicker(); };
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("cardSheet").hidden) closeCard(); else if (!$("picker").hidden) closePicker(); else if (!$("collection").hidden) closeCollection();
});

let tt; function toast(t){ const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2600); }
function copy(el,msg){
  const fallback = () => { el.focus(); el.select(); toast("Text markiert – jetzt kopieren"); };
  try{ navigator.clipboard.writeText(el.value).then(() => toast(msg), fallback); }catch(e){ fallback(); }
}

// ---------- Cloud: Supabase über die REST-Schnittstelle ----------
function setSync(state){
  syncState = state;
  const p = $("syncPill"); p.className = "pill " + ({ok:"ok",busy:"busy",warn:"warn"}[state] || "");
  p.textContent = { local: "Nur auf diesem Gerät", ok: "In der Cloud gespeichert", busy: "Speichert …", warn: "Offline – speichert später" }[state];
}
async function call(path, opts = {}, auth = true){
  const headers = { apikey: CFG.supabaseKey, "Content-Type": "application/json", ...(opts.headers || {}) };
  if (auth && session) headers.Authorization = "Bearer " + session.access_token;
  const res = await fetch(API + path, { ...opts, headers });
  const text = await res.text();
  let data = null; try{ data = text ? JSON.parse(text) : null; }catch(e){}
  if (!res.ok){ const err = new Error((data && (data.msg || data.message || data.error_description)) || ("Fehler " + res.status)); err.status = res.status; throw err; }
  return data;
}
function keepSession(d){
  session = { access_token: d.access_token, refresh_token: d.refresh_token,
              expires_at: d.expires_at || Math.floor(Date.now()/1000) + (d.expires_in || 3600),
              user: { id: d.user.id, email: d.user.email } };
  store.set(SKEY, session);
}
async function fresh(){
  if (!session) return false;
  if (session.expires_at - 60 > Date.now()/1000) return true;
  try{
    keepSession(await call("/auth/v1/token?grant_type=refresh_token", { method:"POST", body: JSON.stringify({ refresh_token: session.refresh_token }) }, false));
    return true;
  }catch(e){
    if (e.status === 400 || e.status === 401){ endSession(); toast("Bitte erneut anmelden"); }
    return false;
  }
}
function endSession(){ session = null; store.del(SKEY); setSync("local"); renderAccount(); }

let pushTimer = null, pushing = false;
function schedulePush(){ if (!CLOUD || !session) return; clearTimeout(pushTimer); setSync("busy"); pushTimer = setTimeout(push, 700); }
async function push(){
  if (!session || pushing) return;
  pushing = true;
  try{
    if (!(await fresh())){ setSync(session ? "warn" : "local"); return; }
    const sent = JSON.stringify([st.own, st.cond, st.buys]);
    await call("/rest/v1/collections", { method:"POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: session.user.id, own: st.own, cond: st.cond, buys: st.buys, updated_at: new Date().toISOString() }) });
    if (JSON.stringify([st.own, st.cond, st.buys]) === sent){ st.dirty = false; save(); setSync("ok"); }
    else schedulePush();   // während des Speicherns wurde weiter abgehakt
  }catch(e){ setSync("warn"); }
  finally{ pushing = false; }
}
async function pull(){
  if (!session) return;
  setSync("busy");
  try{
    if (!(await fresh())) { setSync(session ? "warn" : "local"); return; }
    const rows = await call("/rest/v1/collections?select=own,cond,buys&user_id=eq." + encodeURIComponent(session.user.id));
    const remote = rows && rows[0] ? rows[0].own || {} : null;
    const remoteCond = rows && rows[0] ? Condition.clean(rows[0].cond) : {};
    const remoteBuys = rows && rows[0] ? cleanBuys(rows[0].buys) : [];
    if (st.syncedUser !== session.user.id){
      // Erstes Anmelden auf diesem Gerät: beide Stände zusammenführen, nichts geht verloren
      const merged = { ...(remote || {}) };
      for (const [k,v] of Object.entries(st.own)) merged[k] = (merged[k] || 0) | v;
      st.own = merged; st.cond = { ...remoteCond, ...st.cond };
      const ids = new Set(st.buys.map(x => x.id)); st.buys = [...st.buys, ...remoteBuys.filter(x => !ids.has(x.id))]; st.syncedUser = session.user.id; st.dirty = true;
    } else if (!st.dirty && remote){
      st.own = remote; st.cond = remoteCond; st.buys = remoteBuys;
    }
    save(); renderAll(); renderBuys();
    if (st.dirty || !remote) await push(); else setSync("ok");
  }catch(e){ setSync("warn"); }
}

// ---------- Anmeldung per Code ----------
let pendingMail = "";
function renderAccount(){
  $("accNoConfig").hidden = CLOUD;
  $("accOut").hidden = !CLOUD || !!session;
  $("accIn").hidden = !CLOUD || !session;
  if (session) $("accMail").textContent = session.user.email;
  $("emailForm").hidden = !!pendingMail;
  $("codeForm").hidden = !pendingMail;
  if (!CLOUD) setSync("local");
}
function msg(t){ $("accMsg").textContent = t; }

$("emailForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("email").value.trim(); if (!email) return;
  $("sendCode").disabled = true; msg("Code wird verschickt …");
  try{
    await call("/auth/v1/otp", { method:"POST", body: JSON.stringify({ email, create_user: true }) }, false);
    pendingMail = email; renderAccount(); msg(`Wir haben dir einen Code an ${email} geschickt. Schau auch im Spam-Ordner nach.`);
    $("code").focus();
  }catch(err){
    msg(err.status === 429 ? "Zu viele Anfragen – bitte in ein paar Minuten noch einmal versuchen." : "Der Code konnte nicht verschickt werden: " + err.message);
  }finally{ $("sendCode").disabled = false; }
});
$("codeForm").addEventListener("submit", async e => {
  e.preventDefault();
  const token = $("code").value.replace(/\s/g,"");
  msg("Code wird geprüft …");
  try{
    keepSession(await call("/auth/v1/verify", { method:"POST", body: JSON.stringify({ type:"email", email: pendingMail, token }) }, false));
    pendingMail = ""; $("code").value = ""; msg(""); renderAccount();
    toast("Angemeldet"); await pull();
  }catch(err){ msg("Der Code passt nicht oder ist abgelaufen. Prüfe ihn oder fordere einen neuen an."); }
});
$("otherMail").onclick = () => { pendingMail = ""; msg(""); renderAccount(); };
$("logout").onclick = async () => {
  if (st.dirty){ await push(); if (st.dirty){ msg("Deine letzten Änderungen sind noch nicht gespeichert. Bitte erst wieder online gehen."); return; } }
  try{ await call("/auth/v1/logout", { method:"POST" }); }catch(e){}
  st.own = {}; st.cond = {}; st.buys = []; st.syncedUser = null; st.dirty = false; save();
  endSession(); renderAll(); renderBuys(); msg(""); toast("Abgemeldet");
};
$("syncPill").onclick = () => { $("accountPanel").open = true; $("accountPanel").scrollIntoView({behavior:"smooth", block:"start"}); };

// ---------- Bedienelemente ----------
$("q").addEventListener("input", renderCards);
$("filter").onclick = e => { const f = e.target.dataset.f; if (f){ st.filter = f; save(); syncSeg(); renderCards(); } };
$("varToggle").onclick = () => { st.variants = !showVariants(); save(); syncSeg(); renderSummary(); renderCards(); renderMissing(); };
$("lang").onclick = e => { const l = e.target.dataset.l; if (l){ st.lang = l; save(); syncSeg(); renderCards(); } };
$("misslang").onclick = e => { const m = e.target.dataset.m; if (m){ st.miss = m; save(); syncSeg(); renderMissing(); } };
$("copyMissing").onclick = () => copy($("missing"), "Fehlliste kopiert");
$("copyBackup").onclick = () => copy($("backup"), "Sicherungscode kopiert");
$("importBackup").onclick = () => {
  try{
    const raw = atob($("backup").value.trim()); let d; try{ d = JSON.parse(decodeURIComponent(escape(raw))); }catch(e){ d = JSON.parse(raw); }
    if (!d || typeof d.own !== "object") throw 0;
    st.own = d.own; st.cond = Condition.clean(d.cond); if (d.buys) st.buys = cleanBuys(d.buys); st.dirty = true; save(); renderAll(); renderBuys(); schedulePush(); toast("Sammlung eingelesen");
  }catch(e){ toast("Code nicht lesbar – bitte den ganzen Sicherungscode einfügen"); }
};

window.addEventListener("online", () => { if (session) (st.dirty ? push() : pull()); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && session && !st.dirty) pull(); });

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

async function boot(){
  syncSeg(); renderAccount(); updateBackup();
  try{ await loadIndex(); }
  catch(e){ $("cards").innerHTML = `<li class="empty">Die Setliste konnte nicht geladen werden. Prüfe die Internetverbindung und lade die Seite neu.</li>`; return; }
  await openSet(st.set);
  if (CLOUD && session) pull();
}
boot();

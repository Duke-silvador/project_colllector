import json, re, datetime, pathlib
from playwright.sync_api import sync_playwright

DATA = pathlib.Path("docs/data"); DATA.mkdir(parents=True, exist_ok=True)
TODAY = datetime.date.today().isoformat()
VIN_RE = re.compile(r"\b[A-HJ-NPR-Z0-9]{17}\b")

DEALERS = {
    "gtx": {"name": "GTX Auto Group",
            "url": "https://usedcarscincinnati.com/Inventory/All",
            "card": "li:has(a[href*='Details?stock='])"},
    # Oaks: blocked by Cloudflare from GitHub (own site and CarGurus) - parked
    "cincyautomall": {"name": "Cincy AutoMall",
             "url": "https://cincyautomall.com/inventory",
             "dcs": True},    "becks": {"name": "Beck's Auto Group",
             "url": "https://www.becksautogroup.com/inventory",
             "cfs": True},    "premier": {"name": "Premier Automotive",
             "url": "https://www.premier-autoinc.com/inventory",
             "cfs": True},
    "cag": {"name": "Cincinnati Auto Group",
             "url": "https://www.cag513.com/cars-for-sale",
             "linkcards": "/Inventory/Details/"},
}

LINK_JS = """(pat) => {
  const vre = /\\b[A-HJ-NPR-Z0-9]{17}\\b/g, out = {};
  for (const a of document.querySelectorAll('a[href*="' + pat + '"]')) {
    const id = a.getAttribute('href').split(pat)[1].split(/[?#/]/)[0];
    if (!id || out[id]) continue;
    let c = a;
    while (c.parentElement) {
      const ids = new Set([...c.parentElement.querySelectorAll('a[href*="' + pat + '"]')].map(x => x.getAttribute('href').split(pat)[1].split(/[?#/]/)[0]));
      if (ids.size > 1) break;
      c = c.parentElement;
    }
    const v = [...new Set(c.outerHTML.match(vre) || [])];
    out[id] = {id, href: a.href, vins: v, text: (c.innerText || '').replace(/\\s+/g, ' ').trim()};
  }
  return Object.values(out);
}"""

def scrape_linkcards(page, d, key):
    sf = DATA / f"{key}_state.json"
    old = json.loads(sf.read_text()) if sf.exists() else {}
    lid2vin = {v.get("lid"): k for k, v in old.items() if v.get("lid")}
    looked = 0
    page.goto(d["url"], wait_until="domcontentloaded", timeout=120000); page.wait_for_timeout(7000)
    cars, seen = {}, set()
    for n in range(1, 40):
        new = 0
        for r in page.evaluate(LINK_JS, d["linkcards"]):
            if r["id"] in seen: continue
            seen.add(r["id"]); new += 1
            vin = r["vins"][0] if len(r["vins"]) == 1 else lid2vin.get(r["id"])
            if not vin:
                try:
                    v = VIN_RE.search(page.request.get(r["href"], timeout=60000).text()); looked += 1
                    vin = v.group() if v else None
                except Exception as e: print("  detail failed", r["id"], e)
            if not vin: continue
            t = r["text"]
            ym = re.search(r"\b((?:19|20)\d{2})\s+([A-Za-z][A-Za-z\-]+)\s+(.+?)(?=\s+(?:\$|Price|Mileage|Miles|VIN|Stock|\d{1,3},\d{3}\s*(?:mi|Miles))|$)", t, re.I)
            amounts = [int(x.replace(",", "")) for x in re.findall(r"\$\s?([\d,]{4,7})", t)]
            amounts = [x for x in amounts if 1500 <= x < 300000]
            mi = re.search(r"([\d,]{2,9})\s*(?:mi\b|miles\b|Miles\b)", t) or re.search(r"Mileage:?\s*([\d,]+)", t)
            cars[vin] = {"vin": vin, "lid": r["id"], "year": ym.group(1) if ym else "",
                "make": ym.group(2) if ym else "", "model": ym.group(3).strip()[:50] if ym else "",
                "price": min(amounts) if amounts else None,
                "miles": int(mi.group(1).replace(",", "")) if mi else None, "url": r["href"]}
            if len(cars) <= 2: print("  sample text:", t[:250])
        print(f"  {d['name']} page {n}: +{new} (total {len(cars)})")
        if new == 0 and n > 1: break
        nxt = None
        for sel in ["a[rel=next]", "[aria-label*='Next' i]", ".pagination a:has-text('Next')", "a:has-text('Next')", "button:has-text('Next')", ".pagination a:has-text('›')", ".pagination a:has-text('»')"]:
            for el in page.query_selector_all(sel):
                if el.is_visible(): nxt = el; break
            if nxt: break
        if not nxt: break
        try: nxt.click(); page.wait_for_timeout(5000)
        except Exception as e: print("  next failed", e); break
    print(f"  {d['name']}: {looked} VIN lookups")
    return cars

DCS_JS = """() => [...document.querySelectorAll('.i13r_optVin')].map(v => {
  let c = v;
  while (c.parentElement && c.parentElement.querySelectorAll('.i13r_optVin').length === 1) c = c.parentElement;
  const q = s => (c.querySelector(s) || {}).textContent || '';
  const a = c.querySelector('a[href*="/vdp/"]');
  return {vin: ((v.textContent || '').match(/[A-HJ-NPR-Z0-9]{17}/) || [''])[0],
          title: q('.vehicleTitle'), trim: q('.vehicleTrim'), miles: q('.i13r_optMileage'),
          text: c.textContent || '', href: a ? a.href : ''};
})"""

def scrape_dcs(page, d):
    cars = {}
    for n in range(1, 25):
        page.goto(f"{d['url']}?PageSize=100&page={n}", wait_until="domcontentloaded", timeout=120000)
        page.wait_for_timeout(8000)
        new = 0
        for r in page.evaluate(DCS_JS):
            if not r["vin"] or r["vin"] in cars: continue
            t = " ".join(r["title"].split()).split(" ", 2)
            amounts = [int(x.replace(",", "")) for x in re.findall(r"\$\s?([\d,]{4,7})", r["text"])]
            amounts = [x for x in amounts if 1500 <= x < 300000]
            mi = re.search(r"([\d,]+)", r["miles"])
            cars[r["vin"]] = {"vin": r["vin"], "year": t[0] if t else "",
                "make": t[1] if len(t) > 1 else "",
                "model": ((t[2] if len(t) > 2 else "") + " " + " ".join(r["trim"].split())).strip(),
                "price": min(amounts) if amounts else None,
                "miles": int(mi.group(1).replace(",", "")) if mi else None, "url": r["href"]}
            new += 1
        print(f"  {d['name']} page {n}: +{new} (total {len(cars)})")
        if new == 0: break
    return cars

CARD_JS = """() => {
 const re=/\\b[A-HJ-NPR-Z0-9]{17}\\b/g, out=[];
 for (const el of document.querySelectorAll('body *')) {
   const t=el.innerText||''; const m=t.match(re);
   if(!m||new Set(m).size!==1) continue;
   const p=el.parentElement; const pm=p&&(p.innerText||'').match(re);
   if(pm&&new Set(pm).size===1) continue;
   const a=el.querySelector('a[href]'); out.push([t, a?a.href:'']);
 }
 return out;}"""

def parse_generic(text, href):
    vin = VIN_RE.search(text)
    if not vin: return None
    ym = re.search(r"\b((?:19|20)\d{2})\s+([A-Za-z\-]+)\s+([^\n$]+)", text)
    price = re.search(r"\$\s?([\d,]{4,})", text)
    miles = re.search(r"([\d,]+)\s*(?:mi\b|miles|Miles|MI\b)", text)
    return {"vin": vin.group(), "year": ym.group(1) if ym else "",
            "make": ym.group(2) if ym else "", "model": ym.group(3).strip()[:40] if ym else "",
            "price": int(price.group(1).replace(",", "")) if price else None,
            "miles": int(miles.group(1).replace(",", "")) if miles else None, "url": href}

def scrape_generic(page, d):
    page.goto(d["url"], wait_until="networkidle", timeout=120000)
    page.wait_for_timeout(5000)
    cars = {}
    for _ in range(40):
        before = len(cars)
        for t, href in page.evaluate(CARD_JS):
            c = parse_generic(t, href)
            if c: cars[c["vin"]] = c
        print(f"  {d['name']}: {len(cars)} so far")
        nxt = page.query_selector("a[rel=next], a[aria-label*='Next' i], a:has-text('Next'), button:has-text('Next'), a:has-text('›'), a:has-text('»')")
        if not nxt or len(cars) == before: break
        try:
            nxt.click(); page.wait_for_load_state("networkidle", timeout=60000); page.wait_for_timeout(3000)
        except Exception as e:
            print("  next failed", e); break
    if not cars: print(page.content()[:3000])
    return cars

def parse_card(text, href):
    vin = VIN_RE.search(text)
    if not vin: return None
    ym = re.search(r"(\d{4}) ([A-Z][A-Z\- ]+)\n+(.+)", text)
    price = re.search(r"Internet Price\s*\$([\d,]+)", text)
    miles = re.search(r"([\d,]+) Miles", text)
    return {"vin": vin.group(), "year": ym.group(1) if ym else "",
            "make": ym.group(2).strip() if ym else "",
            "model": ym.group(3).strip(" -") if ym else "",
            "price": int(price.group(1).replace(",", "")) if price else None,
            "miles": int(miles.group(1).replace(",", "")) if miles else None,
            "url": href}

CFS_JS = """() => [...document.querySelectorAll('li.vehicle-snapshot')].map(c => {
  const a = c.querySelector('a[href*="/details/"]');
  const vals = [...c.querySelectorAll('.vehicle-snapshot__main-info-item')].map(x => x.textContent.replace(/\\s+/g,' ').trim());
  return {href: a ? a.getAttribute('href') : '', title: ((c.querySelector('.vehicle-snapshot__title')||{}).textContent||'').trim(),
          info: vals.join(' | ')};
})"""

def scrape_cfs(page, d, key):
    base = re.match(r"https?://[^/]+", d["url"]).group()
    sf = DATA / f"{key}_state.json"
    old = json.loads(sf.read_text()) if sf.exists() else {}
    lid2vin = {v.get("lid"): k for k, v in old.items() if v.get("lid")}
    page.goto(d["url"], wait_until="domcontentloaded", timeout=120000); page.wait_for_timeout(6000)
    rows = {}
    for n in range(1, 40):
        new = 0
        for r in page.evaluate(CFS_JS):
            m = re.search(r"/(\d+)/?$", r["href"] or "")
            if m and m.group(1) not in rows: rows[m.group(1)] = r; new += 1
        print(f"  {d['name']} page {n}: +{new} (total {len(rows)})")
        if new == 0 and n > 1: break
        nxt = None
        for sel in ["a[rel=next]", "[aria-label*='Next' i]", ".pagination a:has-text('Next')", "a:has-text('Next')", "button:has-text('Next')", ".pagination a:has-text('›')", ".pagination a:has-text('»')"]:
            for el in page.query_selector_all(sel):
                if el.is_visible(): nxt = el; break
            if nxt: break
        if not nxt: break
        try: nxt.click(); page.wait_for_timeout(5000)
        except Exception as e: print("  next failed", e); break
    cars, looked = {}, 0
    for lid, r in rows.items():
        vin = lid2vin.get(lid)
        if not vin:
            try:
                html = page.request.get(base + r["href"], timeout=60000).text()
                v = VIN_RE.search(html); vin = v.group() if v else None; looked += 1
            except Exception as e: print("  detail failed", lid, e)
        if not vin: continue
        t = r["title"].split(" ", 2)
        pr = re.search(r"Price \$([\d,]+)", r["info"]); mi = re.search(r"Mileage ([\d,]+)", r["info"])
        cars[vin] = {"vin": vin, "lid": lid, "year": t[0] if t else "", "make": t[1] if len(t) > 1 else "",
                     "model": t[2] if len(t) > 2 else "",
                     "price": int(pr.group(1).replace(",", "")) if pr else None,
                     "miles": int(mi.group(1).replace(",", "")) if mi else None, "url": base + r["href"]}
    print(f"  {d['name']}: {looked} VIN lookups")
    return cars

def scrape(page, d, key=None):
    if d.get("cfs"): return scrape_cfs(page, d, key)
    if d.get("linkcards"): return scrape_linkcards(page, d, key)
    if d.get("dcs"): return scrape_dcs(page, d)
    if d.get("generic"): return scrape_generic(page, d)
    page.goto(d["url"], wait_until="networkidle", timeout=120000)
    page.wait_for_timeout(5000)
    cars = {}
    for card in page.query_selector_all(d["card"]):
        a = card.query_selector("a[href*='Details?stock=']")
        car = parse_card(card.inner_text(), a.get_attribute("href") if a else "")
        if car: cars[car["vin"]] = car
    return cars

def update(key, name, cars):
    sf = DATA / f"{key}_state.json"; soldf = DATA / "sold.json"
    state = json.loads(sf.read_text()) if sf.exists() else {}
    sold = json.loads(soldf.read_text()) if soldf.exists() else []
    if len(cars) < 0.5 * max(len(state), 1):   # safety: bad scrape, don't mark mass sold
        print(f"{name}: only {len(cars)} cars, skipping"); return
    for vin, c in cars.items():
        prev = state.get(vin, {"first_seen": TODAY})
        state[vin] = {**c, "first_seen": prev["first_seen"], "last_seen": TODAY}
    for vin in [v for v in state if v not in cars]:
        c = state.pop(vin)
        days = (datetime.date.today() - datetime.date.fromisoformat(c["first_seen"])).days
        sold.append({**c, "dealer": name, "sold_detected": TODAY, "days_listed": days})
    sf.write_text(json.dumps(state, indent=1))
    soldf.write_text(json.dumps(sold, indent=1))
    print(f"{name}: {len(cars)} active")

with sync_playwright() as p:
    page = p.chromium.launch().new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", viewport={"width":1366,"height":900})
    for key, d in DEALERS.items():
        try: update(key, d["name"], scrape(page, d, key))
        except Exception as e: print(f"{d['name']} FAILED: {e}")

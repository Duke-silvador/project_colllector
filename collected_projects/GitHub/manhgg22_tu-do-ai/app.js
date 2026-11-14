/* Tủ Đồ AI — clickable prototype. Fake [TEST] data only. */
(function () {
  "use strict";

  const KEY = "tudoai_v2";
  const TABS = [
    { id: "homnay", hash: "#hom-nay", label: "Hôm nay" },
    { id: "tudo", hash: "#tu-do", label: "Tủ đồ" },
    { id: "thumoi", hash: "#thu-moi", label: "Thử mới" },
    { id: "stylist", hash: "#stylist", label: "Stylist" },
    { id: "toi", hash: "#toi", label: "Tôi" }
  ];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function defaultState() {
    return {
      onboarded: false,
      photos: [false, false, false],
      swipeIndex: 0,
      swipeVotes: {},
      items: clone(DATA.items),
      activeOutfit: 0,
      custom: [null, null, null],
      wornToday: false,
      ratingToday: 0,
      history: clone(DATA.history),
      settings: { hour: "06:30", mirror: false, backend: "hf-fashn", hfToken: "", fashnKey: "", consent: false, withJacket: false },
      me: { photo: null },
      results: {},
      chat: [
        { role: "bot", text: "Chào anh Minh. Hôm nay 26°C nắng, có họp khách 9:00 và quay phim 14:00. Anh muốn em gợi ý gì?" }
      ],
      tryStyle: null,
      tryLink: "",
      tryResults: null,
      filter: { category: "tất cả", color: "tất cả", season: "tất cả" },
      modal: null,
      addStep: 0,
      addTimer: null
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      const s = JSON.parse(raw);
      const d = defaultState();
      return Object.assign(d, s, {
        settings: Object.assign(d.settings, s.settings || {}),
        filter: Object.assign(d.filter, s.filter || {}),
        modal: null,
        addTimer: null,
        me: Object.assign(d.me, s.me || {}),
        results: s.results || {}
      });
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    const copy = clone(state);
    delete copy.modal;
    delete copy.addTimer;
    delete copy.busy;
    localStorage.setItem(KEY, JSON.stringify(copy));
  }

  let state = loadState();

  function itemById(id) {
    return state.items.find((x) => x.id === id);
  }

  function available(cat) {
    return state.items.filter((x) => x.category === cat && !x.inLaundry);
  }

  function currentSlots() {
    const base = DATA.outfits[state.activeOutfit].items;
    const over = state.custom[state.activeOutfit] || {};
    return Object.assign({}, base, over);
  }

  function currentItems() {
    const slots = currentSlots();
    const out = {};
    Object.keys(slots).forEach((k) => { out[k] = itemById(slots[k]); });
    return out;
  }

  function setSlot(slot, id) {
    const cur = currentSlots();
    cur[slot] = id;
    state.custom[state.activeOutfit] = cur;
    saveState();
    render();
  }

  function cycleSlot(slot, category) {
    const list = available(category);
    if (!list.length) return toast("Không còn món trống trong tủ.");
    const cur = currentSlots()[slot];
    const i = Math.max(0, list.findIndex((x) => x.id === cur));
    const next = list[(i + 1) % list.length];
    setSlot(slot, next.id);
    toast("Đã đổi: " + next.name);
  }

  function formalize() {
    const pickBest = (cat) => {
      const list = available(cat).slice().sort((a, b) => (b.formal || 0) - (a.formal || 0));
      return list[0];
    };
    const map = { ao: "áo", quan: "quần", giay: "giày", khoac: "áo khoác", phukien: "phụ kiện" };
    const next = currentSlots();
    Object.keys(map).forEach((slot) => {
      const best = pickBest(map[slot]);
      if (best) next[slot] = best.id;
    });
    state.custom[state.activeOutfit] = next;
    saveState();
    render();
    toast("Đã chỉnh lịch sự hơn.");
  }

  function toast(msg) {
    const el = $("#toast");
    el.hidden = false;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove("show");
    }, 2200);
  }

  function tabIcon(id, on) {
    const c = on ? "#3D5C4A" : "currentColor";
    const icons = {
      homnay: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>`,
      tudo: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><path d="M5 4h14v16H5z"/><path d="M12 4v16M5 10h7"/></svg>`,
      thumoi: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><path d="M12 4l7 4-7 4-7-4 7-4z"/><path d="M5 12l7 4 7-4M5 16l7 4 7-4"/></svg>`,
      stylist: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><path d="M12 12a4 4 0 100-8 4 4 0 000 8z"/><path d="M5 20c1.5-3 4-4.5 7-4.5S17.5 17 19 20"/></svg>`,
      toi: `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>`
    };
    return icons[id];
  }

  function imgSrc(it) { return it ? Store.src(it.img) : ""; }
  function personRef() { return state.me.photo || "img/sample-person.jpg"; }
  function personSrc() { return Store.src(personRef()); }
  function isSample() { return !state.me.photo; }
  function tryGarments(items) {
    const g = [];
    if (items.ao) g.push({ part: "top", src: imgSrc(items.ao), label: items.ao.name, id: items.ao.id });
    if (items.quan) g.push({ part: "bottom", src: imgSrc(items.quan), label: items.quan.name, id: items.quan.id });
    if (state.settings.withJacket && items.khoac) g.push({ part: "top", src: imgSrc(items.khoac), label: items.khoac.name, id: items.khoac.id });
    return g;
  }
  function cacheKey(items) {
    return [state.me.photo || "sample", state.settings.backend, ...tryGarments(items).map((g) => g.id)].join("|");
  }
  function resultFor(items) {
    const ref = state.results[cacheKey(items)];
    const u = ref ? Store.src(ref) : "";
    return u || "";
  }
  function figureSvg(items, opts) {
    opts = opts || {};
    const res = resultFor(items);
    const order = ["khoac", "ao", "quan", "giay", "phukien"];
    const flat = `<div class="flatlay">${order.filter((k) => items[k]).map((k) => `<div class="fl-cell fl-${k}"><img src="${imgSrc(items[k])}" alt="${escapeAttr(items[k].name)}" loading="lazy"/></div>`).join("")}</div>`;
    if (state.busy) {
      return `<div class="tryon-box busy"><img class="tryon-img dim" src="${res || personSrc()}" alt=""/><div class="busy-msg"><div class="spinner"></div>${state.busy.msg}</div></div>`;
    }
    if (res) {
      return `<div class="tryon-box"><img class="tryon-img" src="${res}" alt="Ảnh thử đồ AI"/>${isSample() ? `<span class="tag-sample">[TEST] người mẫu mẫu</span>` : ""}${opts.dark ? "" : `<button class="mini-btn" id="show-flat">Xem món</button>`}</div>`;
    }
    if (opts.dark) return `<div class="tryon-box"><img class="tryon-img" src="${personSrc()}" alt=""/>${flat}</div>`;
    return `<div class="tryon-box">${flat}<div class="tryon-cta"><img class="person-thumb" src="${personSrc()}" alt=""/><div><b>${isSample() ? "Người mẫu [TEST]" : "Ảnh của anh"}</b><div class="muted">${isSample() ? "Chụp ảnh anh ở tab Tôi để thử lên chính anh" : "Sẵn sàng thử"}</div></div><button class="btn small" id="tryon-btn">✨ Thử lên người</button></div></div>`;
  }

  async function tryOnCurrent() {
    const items = currentItems();
    const garments = tryGarments(items);
    if (!garments.length) return toast("Bộ này chưa có áo/quần để thử.");
    if (!isSample() && state.settings.backend !== "fashn-api" && !state.settings.consent) {
      const ok = confirm("Ảnh của anh sẽ được gửi tới máy chủ thử đồ công khai trên Hugging Face (" + (state.settings.backend === "hf-leffa" ? "Leffa" : "FASHN VTON") + "), bên thứ ba có thể lưu tạm. Chỉ dùng ảnh mặc đồ bình thường. Tiếp tục?");
      if (!ok) return;
      state.settings.consent = true; saveState();
    }
    if (!window.TryOn) return toast("Đang tải bộ thử đồ, thử lại sau 2 giây.");
    const key = cacheKey(items);
    state.busy = { msg: "Đang chuẩn bị…" }; render();
    try {
      const out = await window.TryOn.runOutfit(personRef() === "img/sample-person.jpg" ? "img/sample-person.jpg" : await Store.get(state.me.photo.slice(4)), garments,
        state.settings, (i, n, label) => { state.busy = { msg: `Đang mặc ${label} (${i + 1}/${n})… khoảng ${20 * (n - i)}s` }; render(); });
      const ref = await Store.put("res-" + Date.now(), out.blob);
      state.results[key] = ref;
      state.busy = null; saveState(); render();
      toast("Xong sau " + out.seconds + " giây.");
    } catch (e) {
      state.busy = null; render();
      alert("Thử đồ chưa được: " + e.message);
    }
  }

  function hashTab() {
    const h = location.hash || "#hom-nay";
    if (h === "#mirror") return "mirror";
    const t = TABS.find((x) => x.hash === h);
    return t ? t.id : "homnay";
  }

  function go(hash) {
    if (location.hash !== hash) location.hash = hash;
    else render();
  }

  function render() {
    const root = $("#app");
    if (!state.onboarded && hashTab() !== "mirror") {
      root.innerHTML = renderOnboarding();
      bindOnboarding();
      return;
    }
    if (hashTab() === "mirror") {
      root.innerHTML = renderMirror();
      bindMirror();
      return;
    }
    const tab = hashTab();
    root.innerHTML = `
      <div class="phone">
        <div class="banner">${DATA.banner}</div>
        <div class="content ${tab === "stylist" ? "stylist-layout" : ""}" id="main">${renderScreen(tab)}</div>
        ${tab === "tudo" ? `<button class="fab" id="fab-add" aria-label="Thêm món">＋</button>` : ""}
        <nav class="tabbar">
          ${TABS.map((t) => `<button data-hash="${t.hash}" class="${t.id === tab ? "active" : ""}">${tabIcon(t.id, t.id === tab)}<span>${t.label}</span></button>`).join("")}
        </nav>
        ${renderModal()}
      </div>`;
    bindApp(tab);
  }

  function renderScreen(tab) {
    if (tab === "homnay") return renderToday();
    if (tab === "tudo") return renderWardrobe();
    if (tab === "thumoi") return renderTry();
    if (tab === "stylist") return renderStylist();
    return renderMe();
  }

  function renderToday() {
    const outfit = DATA.outfits[state.activeOutfit];
    const items = currentItems();
    const names = ["Bộ 1", "Bộ 2", "Bộ 3"];
    return `
      <div class="card header-card">
        <div class="between">
          <div class="date-lg">${DATA.todayLabel}</div>
          <div class="weather">☀ ${DATA.weather.temp}°C ${DATA.weather.condition}</div>
        </div>
        <div>
          ${DATA.calendar.map((c) => `<span class="cal-chip">${c.time} ${c.title}</span>`).join("")}
        </div>
      </div>
      <div class="figure-wrap mt-8">${figureSvg(items)}</div>
      <p class="reason">${outfit.reason}</p>
      <div class="muted small-note">Món trong bộ: ${Object.values(items).filter(Boolean).map((x) => x.name).join(" · ")}</div>
      <div class="outfit-pills">
        ${names.map((n, i) => `<button class="pill ${i === state.activeOutfit ? "on" : ""}" data-outfit="${i}">${n}</button>`).join("")}
      </div>
      <div class="chips">
        <button class="chip" data-act="doi-ao">Đổi áo</button>
        <button class="chip" data-act="doi-giay">Đổi giày</button>
        <button class="chip" data-act="lich-su">Lịch sự hơn</button>
        <button class="chip" data-act="noi">🎤 Nói</button>
        <button class="chip" data-act="clip">Làm clip</button>
      </div>
      <button class="btn mt-16" id="wear-btn">${state.wornToday ? "✓ ĐÃ MẶC HÔM NAY" : "✓ MẶC BỘ NÀY"}</button>
      <button class="btn secondary mt-8" id="rate-btn">Chấm điểm tối nay</button>
    `;
  }

  function renderWardrobe() {
    const cats = ["tất cả", "áo", "quần", "giày", "áo khoác", "phụ kiện"];
    const colors = ["tất cả", ...Array.from(new Set(state.items.map((i) => i.color)))];
    const seasons = ["tất cả", "xuân hè", "thu đông", "cả năm"];
    const f = state.filter;
    const list = state.items.filter((it) => {
      if (f.category !== "tất cả" && it.category !== f.category) return false;
      if (f.color !== "tất cả" && it.color !== f.color) return false;
      if (f.season !== "tất cả" && it.season !== f.season) return false;
      return true;
    });
    return `
      <div class="wardrobe-head">
        <div class="h1">Tủ đồ</div>
        <div class="muted">${list.length} món · đã mặc ${state.items.reduce((a, b) => a + (b.timesWorn || 0), 0)} lượt</div>
      </div>
      <div class="filters mt-12" data-filter="category">
        ${cats.map((c) => `<button class="filter ${f.category === c ? "on" : ""}" data-val="${c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join("")}
      </div>
      <div class="filters mt-8" data-filter="color">
        ${colors.map((c) => `<button class="filter ${f.color === c ? "on" : ""}" data-val="${c}">${c}</button>`).join("")}
      </div>
      <div class="filters mt-8" data-filter="season">
        ${seasons.map((c) => `<button class="filter ${f.season === c ? "on" : ""}" data-val="${c}">${c}</button>`).join("")}
      </div>
      <div class="grid">
        ${list.map((it) => `
          <div class="item-card">
            <div class="item-swatch" style="background:#fff">${it.img ? `<img src="${imgSrc(it)}" alt="" loading="lazy"/>` : ""}
              <span class="badge">${it.timesWorn} lần</span>
              ${it.inLaundry ? `<span class="badge laundry">giặt</span>` : ""}
            </div>
            <div class="item-body">
              <div class="item-name">${it.name}</div>
              <div class="item-meta">${it.category} · ${it.color} · ${it.season}</div>
            </div>
          </div>`).join("")}
      </div>
    `;
  }

  function renderTry() {
    const styles = DATA.tryStyles;
    const res = state.tryResults;
    return `
      <div class="h1">Thử mới</div>
      <p class="muted mt-8">Chọn một hướng, hoặc dán link món muốn mua (mẫu [TEST]).</p>
      <div class="style-pick mt-12">
        ${styles.map((s) => `
          <button class="style-btn ${state.tryStyle === s.id ? "on" : ""}" data-style="${s.id}">
            <b>${s.name}</b>
            <span class="muted">${s.desc}</span>
          </button>`).join("")}
      </div>
      <div class="link-row mt-12">
        <input id="try-link" placeholder="Dán link món muốn mua [TEST]" value="${escapeAttr(state.tryLink)}" />
        <button class="btn" id="try-link-btn">Thử phối</button>
      </div>
      ${res ? `<div class="stack mt-16">${res.map((o, i) => `
        <div class="card">
          <div class="between"><div class="h2">${o.title}</div><button class="link" data-apply="${i}">Mặc thử</button></div>
          <p class="reason mt-8">${o.reason}</p>
          <div class="muted mt-8">${itemLine(o.items)}</div>
          <div class="match">Phối được với ${o.match} món trong tủ</div>
        </div>`).join("")}</div>` : ""}
    `;
  }

  function itemLine(ids) {
    return Object.values(ids).map((id) => {
      const it = itemById(id);
      return it ? it.name : "";
    }).filter(Boolean).join(" · ");
  }

  function escapeAttr(s) {
    return String(s || "").replace(/"/g, "&quot;");
  }

  function renderStylist() {
    const u = DATA.user;
    return `
      <div class="card profile">
        <div class="avatar">AM</div>
        <div>
          <div class="h2">${u.name}</div>
          <div class="muted">${u.body}</div>
          <div class="palette">${u.colors.map((c) => `<span class="dot" title="${c.name}" style="background:${c.hex}"></span>`).join("")}</div>
          <div class="tags">${u.styles.map((s) => `<span class="tag">${s}</span>`).join("")}</div>
        </div>
      </div>
      <div class="chips mt-12">
        <button class="chip" data-prompt="Tối nay gặp nhà đầu tư mặc gì">Tối nay gặp nhà đầu tư mặc gì</button>
        <button class="chip" data-prompt="Trời 26°C mặc gì cho buổi quay">Trời 26°C mặc gì cho buổi quay</button>
        <button class="chip" data-prompt="Tủ đồ mình thiếu món nào">Thiếu món nào</button>
      </div>
      <div class="chat" id="chat">
        ${state.chat.map((m) => `<div class="bubble ${m.role === "me" ? "me" : "bot"}">${escapeHtml(m.text)}</div>`).join("")}
      </div>
      <div class="composer">
        <input id="chat-input" placeholder="Hỏi stylist…" />
        <button class="btn" id="chat-send">Gửi</button>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  }

  function stylistReply(q) {
    const t = q.toLowerCase();
    if (t.includes("nhà đầu tư") || t.includes("hop") || t.includes("họp") || t.includes("tối nay gặp")) {
      return "Gặp nhà đầu tư tối nay thì lấy Bộ 1 làm gốc: sơ mi trắng Oxford, quần âu navy, blazer navy, oxford đen nếu muốn lịch sự hơn loafer. Tránh sneaker và áo thun. Em đã để sẵn nút Lịch sự hơn ở trang Hôm nay.";
    }
    if (t.includes("quay") || t.includes("26")) {
      return "Buổi quay 14:00, 26°C nắng: knit xám, chinos be, sneaker trắng, cardigan rêu khoác nhẹ. Thoải mái đứng lâu, vẫn ra dáng đạo diễn. Đó là Bộ 2.";
    }
    if (t.includes("thiếu") || t.includes("mua")) {
      return "Tủ đang thiếu vài món làm dày phong cách old money: áo len merino be, quần pleated wool, loafer da lộn, sơ mi oxford xanh nhạt. Cà vạt navy gần như chưa mặc — giữ lại cho sự kiện tối.";
    }
    if (t.includes("old money") || t.includes("màu")) {
      return "Bảng màu hợp của anh là xanh rêu, be và navy. Bộ 3 đang đúng hướng old money: sơ mi rêu, quần âu xám, derby nâu, áo khoác linen be.";
    }
    return "Em gợi ý 3 bộ sẵn cho hôm nay. Bộ 1 cho họp khách 9:00, Bộ 2 cho buổi quay 14:00, Bộ 3 theo hướng old money. Anh chọn hướng, em chỉnh giúp.";
  }

  function renderMe() {
    const year = 2026, month = 11;
    const first = new Date(year, month - 1, 1);
    const startPad = first.getDay(); // Sun=0
    const daysIn = 30;
    const histMap = {};
    state.history.forEach((h) => { histMap[h.date] = h; });
    if (state.wornToday) histMap[DATA.todayISO] = { date: DATA.todayISO, rating: state.ratingToday };
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(`<div></div>`);
    for (let d = 1; d <= daysIn; d++) {
      const iso = `2026-11-${String(d).padStart(2, "0")}`;
      const has = histMap[iso];
      const isToday = iso === DATA.todayISO;
      cells.push(`<div class="day ${has ? "has" : ""} ${isToday ? "today" : ""}">${d}${has ? `<span class="dotmini" style="background:#3D5C4A"></span>` : ""}</div>`);
    }
    const report = monthlyReport();
    return `
      <div class="h1">Tôi</div>
      <p class="muted mt-8">Lịch mặc tháng 11/2026 [TEST]</p>
      <div class="card mt-12">
        <div class="cal">
          ${["CN","T2","T3","T4","T5","T6","T7"].map((d) => `<div class="dow">${d}</div>`).join("")}
          ${cells.join("")}
        </div>
      </div>
      <div class="card mt-12">
        <div class="h2">Báo cáo tháng</div>
        <div class="report-row"><span>Món mặc nhiều</span><b>${report.most}</b></div>
        <div class="report-row"><span>Món bỏ quên</span><b>${report.forgot}</b></div>
        <div class="report-row"><span>Màu hợp nhất</span><b>${report.color}</b></div>
        <div class="mt-12 muted">3–5 món nên mua</div>
        <ul class="mt-8" style="padding-left:18px;font-size:13px">
          ${DATA.buySuggestions.map((x) => `<li>${x}</li>`).join("")}
        </ul>
      </div>
      <div class="card mt-12">
        <div class="h2">Ảnh của tôi (để thử đồ)</div>
        <div class="me-photo mt-8">
          <img src="${personSrc()}" alt=""/>
          <div>
            <div class="muted">${isSample() ? "Đang dùng người mẫu [TEST]. Chụp 1 ảnh đứng thẳng, thấy từ đầu tới gối, nền gọn." : "Ảnh lưu trên chính điện thoại này."}</div>
            <button class="btn small mt-8" id="cam-live">📷 Mở camera (hẹn giờ 3s)</button>
            <label class="btn small secondary mt-8 file-btn">🖼 Chọn / chụp nhanh<input type="file" accept="image/*" capture="user" id="me-file" hidden/></label>
            ${isSample() ? "" : `<button class="link mt-8" id="me-del">Xoá ảnh của tôi</button>`}
          </div>
        </div>
      </div>
      <div class="card mt-12">
        <div class="h2">Máy thử đồ AI</div>
        <div class="setting"><div>Chọn máy</div>
          <select id="set-backend">
            <option value="hf-fashn" ${state.settings.backend === "hf-fashn" ? "selected" : ""}>FASHN VTON 1.5 (HF, miễn phí)</option>
            <option value="hf-leffa" ${state.settings.backend === "hf-leffa" ? "selected" : ""}>Leffa (HF, miễn phí)</option>
            <option value="fashn-api" ${state.settings.backend === "fashn-api" ? "selected" : ""}>FASHN API (trả phí, cần key)</option>
          </select></div>
        <div class="setting"><div>Thử cả áo khoác (lâu hơn)</div><button class="toggle ${state.settings.withJacket ? "on" : ""}" id="set-jacket"><i></i></button></div>
        <div class="setting col"><div>HF token (tuỳ chọn, thêm lượt GPU)</div><input type="password" id="set-hf" placeholder="hf_…" value="${escapeAttr(state.settings.hfToken)}" autocomplete="off"/></div>
        <div class="setting col"><div>FASHN API key (tuỳ chọn)</div><input type="password" id="set-fashn" placeholder="fa-…" value="${escapeAttr(state.settings.fashnKey)}" autocomplete="off"/></div>
        <p class="muted small-note">⚠️ Khi bấm “Thử lên người”, ảnh người + ảnh món đồ được gửi tới máy chủ đã chọn (HF Space là bên thứ ba, công khai). Key/token chỉ lưu trên điện thoại này. Đã thử: ${Object.keys(state.results).length} ảnh lưu sẵn.</p>
        <button class="btn secondary small mt-8" id="clear-results">Xoá ảnh thử đồ đã lưu</button>
      </div>
      <div class="card mt-12">
        <div class="h2">Cài đặt</div>
        <div class="setting">
          <div>Giờ gợi ý mỗi sáng</div>
          <input type="time" id="set-hour" value="${state.settings.hour}" />
        </div>
        <div class="setting">
          <div>Kết nối gương</div>
          <button class="toggle ${state.settings.mirror ? "on" : ""}" id="set-mirror" aria-label="Kết nối gương"><i></i></button>
        </div>
        <button class="btn mt-16" id="open-mirror">Chế độ gương</button>
        <button class="btn danger mt-8" id="reset-demo">Reset demo</button>
      </div>
    `;
  }

  function monthlyReport() {
    const counts = {};
    const colors = {};
    state.items.forEach((i) => { counts[i.id] = i.timesWorn || 0; colors[i.color] = (colors[i.color] || 0) + (i.timesWorn || 0); });
    const most = state.items.slice().sort((a, b) => (b.timesWorn || 0) - (a.timesWorn || 0))[0];
    const forgot = state.items.filter((i) => !i.inLaundry).slice().sort((a, b) => (a.timesWorn || 0) - (b.timesWorn || 0))[0];
    const color = Object.keys(colors).sort((a, b) => colors[b] - colors[a])[0];
    return { most: most ? most.name : "—", forgot: forgot ? forgot.name : "—", color: color || "—" };
  }

  function renderOnboarding() {
    const step = onboardingStep();
    const titles = ["Chụp 3 ảnh dáng", "Lướt ảnh, chọn sở thích", "Nạp tủ đồ"];
    const photoLabel = ["Trước", "Nghiêng", "Sau"];
    let body = "";
    if (step === 0) {
      body = `
        <p class="muted">Ảnh “Trước” dùng để thử đồ AI. Ảnh lưu trên điện thoại này; chỉ gửi đi khi anh bấm “Thử lên người”.</p>
        <div class="photo-slots mt-16">
          ${state.photos.map((p, i) => `<label class="photo-slot ${p ? "done" : ""}">${i === 0 && state.me.photo ? `<img src="${personSrc()}" alt=""/>` : (p ? "✓ Đã chụp" : "＋")}<span>${photoLabel[i]}</span><input type="file" accept="image/*" capture="user" data-photo="${i}" hidden/></label>`).join("")}
        </div>`;
    } else if (step === 1) {
      const look = DATA.swipeLooks[state.swipeIndex] || DATA.swipeLooks[0];
      body = `
        <p class="muted">${state.swipeIndex + 1}/10 · ${look.name}</p>
        <div class="look-card mt-12">
          <div class="look-colors">${look.colors.map((c) => `<span style="background:${c}"></span>`).join("")}</div>
          <div class="look-info">
            <div class="h2">${look.name}</div>
            <div class="tags">${look.tags.map((t) => `<span class="tag">${t}</span>`).join("")}</div>
          </div>
        </div>
        <div class="vote">
          <button class="btn secondary" id="vote-no">Không thích</button>
          <button class="btn" id="vote-yes">Thích</button>
        </div>`;
    } else {
      body = `
        <p class="muted">Đang nạp 30 món mẫu (ảnh sản phẩm thật, dữ liệu [TEST]). Thêm đồ của anh bằng nút ＋ ở Tủ đồ.</p>
        <div class="progress-list">
          ${["Đọc ảnh tủ đồ", "Tách món", "Tìm ảnh gốc", "Xoá nền", "Gắn nhãn"].map((label, i) => {
            const st = state.loadTick > i ? "done" : state.loadTick === i ? "run" : "";
            return `<div class="prog ${st}"><span class="dotp"></span>${label}</div>`;
          }).join("")}
        </div>`;
    }
    return `
      <div class="phone">
        <div class="banner">${DATA.banner}</div>
        <div class="onboard">
          <div class="top">
            <div class="h1">Làm quen</div>
            <button class="link" id="skip">Bỏ qua</button>
          </div>
          <div class="steps">${[0,1,2].map((i) => `<div class="step-dot ${i <= step ? "on" : ""}"></div>`).join("")}</div>
          <div class="h2">${titles[step]}</div>
          <div class="mt-8">${body}</div>
          <div style="flex:1"></div>
          ${step === 0 ? `<button class="btn mt-16" id="ob-next">Tiếp tục</button>` : ""}
          ${step === 2 && state.loadTick >= 5 ? `<button class="btn mt-16" id="ob-done">Vào tủ đồ</button>` : ""}
        </div>
      </div>`;
  }

  function onboardingStep() {
    if (state._obStep == null) state._obStep = 0;
    return state._obStep;
  }

  function renderMirror() {
    const items = currentItems();
    const slots = currentSlots();
    return `
      <div class="mirror-root">
        <div class="banner">${DATA.banner}</div>
        <div class="mirror-body">
          <div class="mirror-figure">${figureSvg(items, { dark: true })}</div>
          <div class="mirror-side">
            <h2>Chọn bộ</h2>
            ${DATA.outfits.map((o, i) => `<button class="m-outfit ${i === state.activeOutfit ? "on" : ""}" data-outfit="${i}">${o.name || o.title || ("Bộ " + (i + 1))}</button>`).join("")}
            <h2 class="mt-16">Đang thử</h2>
            ${Object.keys(slots).map((k) => {
              const it = itemById(slots[k]);
              if (!it) return "";
              return `<div class="m-item"><img class="m-sw" src="${imgSrc(it)}" alt=""/>${it.name}</div>`;
            }).join("")}
          </div>
        </div>
        <div class="mirror-bar">
          <div>Chào anh Minh, hôm nay 26°C nắng. Bấm bộ bên phải hoặc phím ← → để đổi. <button class="close" id="mirror-try">✨ Thử lên người</button></div>
          <button class="close" id="mirror-close">Đóng</button>
        </div>
      </div>`;
  }

  function renderModal() {
    const m = state.modal;
    if (!m) return "";
    if (m.type === "rate") {
      return `<div class="overlay" id="overlay"><div class="sheet">
        <h3>Chấm điểm tối nay</h3>
        <p class="muted">Bộ hôm nay thế nào? [TEST]</p>
        <div class="stars">${[1,2,3,4,5].map((n) => `<button data-star="${n}" class="${n <= (m.temp || state.ratingToday) ? "on" : ""}">★</button>`).join("")}</div>
        <button class="btn" id="save-rate">Lưu điểm</button>
        <button class="btn secondary mt-8" id="close-modal">Đóng</button>
      </div></div>`;
    }
    if (m.type === "voice") {
      return `<div class="overlay" id="overlay"><div class="center-modal">
        <div class="listening">${m.done ? "Đã nghe" : "Đang nghe…"}</div>
        <div class="wave"><i></i><i></i><i></i><i></i><i></i></div>
        <p class="muted" style="text-align:center">${m.done ? "“Lịch sự hơn một chút”" : "Nói gần micro (mẫu [TEST])"}</p>
        ${m.done ? `<button class="btn mt-12" id="voice-apply">Áp dụng</button>` : ""}
      </div></div>`;
    }
    if (m.type === "clip") {
      return `<div class="overlay" id="overlay"><div class="center-modal">
        <div class="h2">Clip thử đồ</div>
        <div class="clip-frame">
          ${m.ready ? `<div class="play">▶</div>` : `<p style="color:#fff">Đang dựng clip 4s…</p>`}
        </div>
        <p class="muted">Clip mẫu [TEST] — chưa render AI thật.</p>
        <button class="btn mt-12" id="close-modal">Đóng</button>
      </div></div>`;
    }
    if (m.type === "add") {
      const cats = ["áo", "quần", "giày", "áo khoác", "phụ kiện"];
      return `<div class="overlay" id="overlay"><div class="sheet">
        <h3>Thêm món vào tủ</h3>
        ${m.preview ? `<div class="add-preview"><img src="${m.preview}" alt=""/></div>` : `<p class="muted">Đặt món đồ lên nền phẳng (giường, sàn) hoặc treo móc, chụp thẳng.</p>`}
        ${m.working ? `<div class="busy-msg inline"><div class="spinner"></div>${m.working}</div>` : ""}
        <div class="add-btns mt-12">
          <button class="btn small" id="add-cam">📷 Camera</button>
          <label class="btn small secondary file-btn">🖼 Chọn / chụp<input type="file" accept="image/*" capture="environment" id="add-file" hidden/></label>
        </div>
        <label class="check mt-8"><input type="checkbox" id="add-bg" ${m.bg !== false ? "checked" : ""}/> Tách nền trên máy (lần đầu tải ~40MB)</label>
        <input class="mt-8" id="add-name" placeholder="Tên món, vd: Áo sơ mi trắng" value="${escapeAttr(m.name || "")}"/>
        <div class="add-row mt-8">
          <select id="add-cat">${cats.map((c) => `<option ${m.category === c ? "selected" : ""}>${c}</option>`).join("")}</select>
          <input id="add-color" placeholder="Màu" value="${escapeAttr(m.color || "")}"/>
        </div>
        <button class="btn mt-12" id="confirm-add" ${m.blobKey && !m.working ? "" : "disabled"}>Thêm vào tủ</button>
        <button class="btn secondary mt-8" id="close-modal">Huỷ</button>
        <p class="muted small-note">Ảnh lưu trên điện thoại này, không gửi đi khi thêm món.</p>
      </div></div>`;
    }
    if (m.type === "camera") {
      return `<div class="overlay cam" id="overlay"><div class="cam-box">
        <video id="cam-video" playsinline autoplay muted></video>
        ${m.count ? `<div class="cam-count">${m.count}</div>` : ""}
        <div class="cam-bar">
          <button class="btn small secondary" id="cam-flip">↺ Đổi camera</button>
          <button class="btn small" id="cam-shot">${m.timer ? "Chụp (3s)" : "Chụp"}</button>
          <button class="btn small secondary" id="cam-close">Đóng</button>
        </div>
        <p class="cam-hint">Dựng điện thoại, lùi lại để thấy từ đầu tới gối.</p>
      </div></div>`;
    }
    return "";
  }

  function bindApp(tab) {
    $$(".tabbar button").forEach((b) => b.addEventListener("click", () => go(b.dataset.hash)));
    if (tab === "homnay") {
      $$("[data-outfit]").forEach((b) => b.addEventListener("click", () => {
        state.activeOutfit = Number(b.dataset.outfit);
        saveState(); render();
      }));
      $$("[data-act]").forEach((b) => b.addEventListener("click", () => onChip(b.dataset.act)));
      $("#wear-btn").addEventListener("click", wearToday);
      const tb = $("#tryon-btn"); if (tb) tb.addEventListener("click", tryOnCurrent);
      const sf = $("#show-flat"); if (sf) sf.addEventListener("click", () => { delete state.results[cacheKey(currentItems())]; saveState(); render(); });
      $("#rate-btn").addEventListener("click", () => { state.modal = { type: "rate", temp: state.ratingToday }; render(); });
    }
    if (tab === "tudo") {
      $$(".filters").forEach((row) => {
        const key = row.dataset.filter;
        $$(".filter", row).forEach((b) => b.addEventListener("click", () => {
          state.filter[key] = b.dataset.val;
          saveState(); render();
        }));
      });
      const fab = $("#fab-add");
      if (fab) fab.addEventListener("click", () => { state.modal = { type: "add", category: "áo" }; render(); });
    }
    if (tab === "thumoi") {
      $$("[data-style]").forEach((b) => b.addEventListener("click", () => {
        const s = DATA.tryStyles.find((x) => x.id === b.dataset.style);
        state.tryStyle = s.id;
        state.tryResults = s.outfits;
        saveState(); render();
      }));
      const input = $("#try-link");
      $("#try-link-btn").addEventListener("click", () => {
        state.tryLink = input.value.trim();
        // Fake: treat any link as a beige item that pairs with old-money outfits
        state.tryStyle = "link";
        state.tryResults = DATA.tryStyles[0].outfits.map((o, i) => Object.assign({}, o, {
          title: (i === 0 ? "Phối với món vừa dán" : o.title),
          match: o.match,
          reason: state.tryLink ? `Đã nhận link mẫu [TEST]. ${o.reason}` : o.reason
        }));
        saveState(); render();
        toast(state.tryLink ? "Đã tạo 3 phối từ link [TEST]" : "Chưa có link — em dùng phong cách old money mẫu.");
      });
      $$("[data-apply]").forEach((b) => b.addEventListener("click", () => {
        const o = state.tryResults[Number(b.dataset.apply)];
        state.custom[state.activeOutfit] = clone(o.items);
        saveState();
        go("#hom-nay");
        toast("Đã mặc thử bộ này ở Hôm nay.");
      }));
    }
    if (tab === "stylist") {
      const send = () => {
        const input = $("#chat-input");
        const q = (input.value || "").trim();
        if (!q) return;
        pushChat(q);
      };
      $("#chat-send").addEventListener("click", send);
      $("#chat-input").addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
      $$("[data-prompt]").forEach((b) => b.addEventListener("click", () => pushChat(b.dataset.prompt)));
      const chat = $("#chat");
      if (chat) chat.scrollTop = chat.scrollHeight;
    }
    if (tab === "toi") {
      $("#set-hour").addEventListener("change", (e) => { state.settings.hour = e.target.value; saveState(); toast("Đã lưu giờ gợi ý " + e.target.value); });
      $("#set-mirror").addEventListener("click", () => {
        state.settings.mirror = !state.settings.mirror;
        saveState(); render();
        toast(state.settings.mirror ? "Đã kết nối gương [TEST]" : "Đã ngắt gương [TEST]");
      });
      $("#open-mirror").addEventListener("click", () => go("#mirror"));
      $("#cam-live").addEventListener("click", () => openCamera("user", savePersonPhoto));
      $("#me-file").addEventListener("change", (e) => { const f = e.target.files[0]; if (f) savePersonPhoto(f); });
      const md = $("#me-del"); if (md) md.addEventListener("click", async () => { if (!confirm("Xoá ảnh của anh khỏi điện thoại này?")) return; await Store.del(state.me.photo.slice(4)); state.me.photo = null; state.settings.consent = false; saveState(); render(); });
      $("#set-backend").addEventListener("change", (e) => { state.settings.backend = e.target.value; state.settings.consent = false; saveState(); render(); });
      $("#set-jacket").addEventListener("click", () => { state.settings.withJacket = !state.settings.withJacket; saveState(); render(); });
      $("#set-hf").addEventListener("change", (e) => { state.settings.hfToken = e.target.value.trim(); saveState(); toast("Đã lưu trên máy này."); });
      $("#set-fashn").addEventListener("change", (e) => { state.settings.fashnKey = e.target.value.trim(); saveState(); toast("Đã lưu trên máy này."); });
      $("#clear-results").addEventListener("click", async () => { for (const r of Object.values(state.results)) await Store.del(r.slice(4)); state.results = {}; saveState(); render(); toast("Đã xoá."); });
      $("#reset-demo").addEventListener("click", () => {
        if (!confirm("Xoá toàn bộ dữ liệu (cả ảnh của anh và món đã thêm) trên máy này?")) return;
        localStorage.removeItem(KEY);
        Store.clear();
        state = defaultState();
        location.hash = "";
        render();
        toast("Đã reset demo.");
      });
    }
    bindModal();
  }

  function pushChat(q) {
    state.chat.push({ role: "me", text: q });
    state.chat.push({ role: "bot", text: stylistReply(q) });
    saveState();
    render();
  }

  function wearToday() {
    const slots = currentSlots();
    Object.values(slots).forEach((id) => {
      const it = itemById(id);
      if (it && !state.wornToday) it.timesWorn = (it.timesWorn || 0) + 1;
    });
    state.wornToday = true;
    const existing = state.history.find((h) => h.date === DATA.todayISO);
    if (existing) existing.items = clone(slots);
    else state.history.push({ date: DATA.todayISO, items: clone(slots), rating: state.ratingToday || 0 });
    saveState();
    render();
    toast("Đã lưu. Tối nay nhớ chấm điểm nhé.");
  }

  function onChip(act) {
    if (act === "doi-ao") cycleSlot("ao", "áo");
    else if (act === "doi-giay") cycleSlot("giay", "giày");
    else if (act === "lich-su") formalize();
    else if (act === "noi") startVoice();
    else if (act === "clip") startClip();
  }

  function startVoice() {
    state.modal = { type: "voice", done: false };
    render();
    setTimeout(() => {
      if (state.modal && state.modal.type === "voice") {
        state.modal.done = true;
        render();
      }
    }, 1200);
  }

  function startClip() {
    state.modal = { type: "clip", ready: false };
    render();
    setTimeout(() => {
      if (state.modal && state.modal.type === "clip") {
        state.modal.ready = true;
        render();
      }
    }, 1400);
  }

  function bindModal() {
    const close = $("#close-modal");
    if (close) close.addEventListener("click", () => { state.modal = null; render(); });
    const overlay = $("#overlay");
    if (overlay) overlay.addEventListener("click", (e) => { if (e.target === overlay && state.modal.type !== "camera") { state.modal = null; render(); } });
    $$("[data-star]").forEach((b) => b.addEventListener("click", () => {
      state.modal.temp = Number(b.dataset.star);
      render();
    }));
    const save = $("#save-rate");
    if (save) save.addEventListener("click", () => {
      state.ratingToday = state.modal.temp || state.ratingToday || 0;
      if (!state.ratingToday) { toast("Chọn từ 1 đến 5 sao."); return; }
      const rec = state.history.find((h) => h.date === DATA.todayISO);
      if (rec) rec.rating = state.ratingToday;
      else state.history.push({ date: DATA.todayISO, items: currentSlots(), rating: state.ratingToday });
      state.modal = null;
      saveState();
      render();
      toast("Đã lưu " + state.ratingToday + " sao.");
    });
    const voice = $("#voice-apply");
    if (voice) voice.addEventListener("click", () => { state.modal = null; formalize(); });
    if (state.modal && state.modal.type === "add") {
      const m = state.modal;
      const keep = () => { m.name = $("#add-name").value; m.category = $("#add-cat").value; m.color = $("#add-color").value; m.bg = $("#add-bg").checked; };
      $("#add-cam").addEventListener("click", () => { keep(); const back = m; openCamera("environment", (b) => { state.modal = back; handleItemPhoto(b); }, false); });
      $("#add-file").addEventListener("change", (e) => { keep(); const f = e.target.files[0]; if (f) handleItemPhoto(f); });
      ["add-name", "add-cat", "add-color", "add-bg"].forEach((id) => $("#" + id).addEventListener("change", keep));
      $("#confirm-add").addEventListener("click", () => {
        keep();
        const slotCat = m.category || "áo";
        const item = { id: "new-" + Date.now(), img: "idb:" + m.blobKey, name: (m.name || slotCat + " mới").trim(), category: slotCat, color: (m.color || "khác").trim(), hex: "#ccc", season: "cả năm", timesWorn: 0, inLaundry: false, formal: 1, mine: true };
        state.items.unshift(item);
        state.modal = null; saveState(); render();
        toast("Đã thêm " + item.name);
      });
    }
    if (state.modal && state.modal.type === "camera") bindCamera();
  }

  async function handleItemPhoto(file) {
    const m = state.modal;
    m.working = "Đang thu nhỏ ảnh…"; render();
    try {
      let blob = await shrinkImage(file, 1024);
      if (m.bg !== false && window.removeBg) {
        m.working = "Đang tách nền trên máy (lần đầu hơi lâu)…"; render();
        try {
          const cut = await Promise.race([window.removeBg(blob), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000))]);
          blob = await flattenWhite(cut);
        } catch (e) { toast("Không tách nền được, giữ ảnh gốc."); }
      }
      const key = "item-" + Date.now();
      await Store.put(key, blob);
      m.blobKey = key; m.preview = Store.src("idb:" + key); m.working = null;
    } catch (e) { m.working = null; toast("Lỗi ảnh: " + e.message); }
    render();
  }

  function flattenWhite(blob) {
    return new Promise((res) => {
      const img = new Image(); const u = URL.createObjectURL(blob);
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
        const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0);
        URL.revokeObjectURL(u); c.toBlob((b) => res(b || blob), "image/jpeg", 0.9);
      };
      img.onerror = () => res(blob);
      img.src = u;
    });
  }

  async function savePersonPhoto(file) {
    try {
      const blob = await shrinkImage(file, 1024);
      if (state.me.photo) await Store.del(state.me.photo.slice(4));
      state.me.photo = await Store.put("me-" + Date.now(), blob);
      state.settings.consent = false;
      saveState(); render();
      toast("Đã lưu ảnh của anh trên máy này.");
    } catch (e) { toast("Lỗi ảnh: " + e.message); }
  }

  let camStream = null, camCb = null;
  function stopCam() { if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; } }
  function openCamera(facing, cb, timer) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("Trình duyệt chưa cho camera trực tiếp, dùng nút Chọn / chụp."); return; }
    camCb = cb;
    state.modal = { type: "camera", facing: facing, timer: timer !== false, count: 0 };
    render();
  }
  async function bindCamera() {
    const m = state.modal, v = $("#cam-video");
    try {
      if (!camStream) camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: m.facing, width: { ideal: 1280 }, height: { ideal: 1706 } }, audio: false });
      v.srcObject = camStream;
    } catch (e) { stopCam(); state.modal = null; render(); toast("Không mở được camera: " + e.message); return; }
    $("#cam-close").addEventListener("click", () => { stopCam(); state.modal = null; render(); });
    $("#cam-flip").addEventListener("click", () => { stopCam(); m.facing = m.facing === "user" ? "environment" : "user"; render(); });
    $("#cam-shot").addEventListener("click", () => {
      const snap = () => {
        const vv = $("#cam-video"); const c = document.createElement("canvas");
        c.width = vv.videoWidth; c.height = vv.videoHeight;
        const g = c.getContext("2d");
        if (m.facing === "user") { g.translate(c.width, 0); g.scale(-1, 1); }
        g.drawImage(vv, 0, 0);
        c.toBlob((b) => { stopCam(); state.modal = null; const cb = camCb; camCb = null; render(); cb && cb(b); }, "image/jpeg", 0.9);
      };
      if (!m.timer) return snap();
      let n = 3; m.count = n; render();
      const t = setInterval(() => { n -= 1; if (n <= 0) { clearInterval(t); snap(); } else { m.count = n; const el = $(".cam-count"); if (el) el.textContent = n; } }, 1000);
    });
  }

  function startAddProgress() {
    const preset = DATA.addPresets[state.items.length % DATA.addPresets.length];
    const item = Object.assign({
      id: "new-" + Date.now(),
      timesWorn: 0,
      inLaundry: false
    }, preset);
    state.modal = { type: "add", step: 1, item: item };
    render();
    let step = 1;
    const tick = () => {
      if (!state.modal || state.modal.type !== "add") return;
      step += 1;
      state.modal.step = step;
      render();
      if (step < 5) setTimeout(tick, 450);
    };
    setTimeout(tick, 450);
  }

  function bindOnboarding() {
    const skip = $("#skip");
    if (skip) skip.addEventListener("click", finishOnboard);
    $$("[data-photo]").forEach((b) => b.addEventListener("change", async (e) => {
      const i = Number(b.dataset.photo); const f = e.target.files[0]; if (!f) return;
      if (i === 0) await savePersonPhoto(f);
      state.photos[i] = true;
      render();
    }));
    const next = $("#ob-next");
    if (next) next.addEventListener("click", () => { state._obStep = 1; render(); });
    const yes = $("#vote-yes");
    const no = $("#vote-no");
    const vote = (v) => {
      const look = DATA.swipeLooks[state.swipeIndex];
      if (look) state.swipeVotes[look.id] = v;
      state.swipeIndex += 1;
      if (state.swipeIndex >= DATA.swipeLooks.length) {
        state._obStep = 2;
        state.loadTick = 0;
        render();
        runLoadTicks();
      } else render();
    };
    if (yes) yes.addEventListener("click", () => vote(true));
    if (no) no.addEventListener("click", () => vote(false));
    const done = $("#ob-done");
    if (done) done.addEventListener("click", finishOnboard);
  }

  function runLoadTicks() {
    const tick = () => {
      if (state.onboarded) return;
      state.loadTick = (state.loadTick || 0) + 1;
      render();
      if (state.loadTick < 5) setTimeout(tick, 400);
    };
    setTimeout(tick, 400);
  }

  function finishOnboard() {
    state.onboarded = true;
    state._obStep = 0;
    saveState();
    go("#hom-nay");
    toast("Xong phần làm quen [TEST].");
  }

  function bindMirror() {
    $$("[data-outfit]").forEach((b) => b.addEventListener("click", () => {
      state.activeOutfit = Number(b.dataset.outfit);
      saveState(); render();
    }));
    $("#mirror-close").addEventListener("click", () => go("#hom-nay"));
    $("#mirror-try").addEventListener("click", tryOnCurrent);
  }

  function onKey(e) {
    if (hashTab() !== "mirror") return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      state.activeOutfit = (state.activeOutfit + 1) % DATA.outfits.length;
      saveState(); render();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      state.activeOutfit = (state.activeOutfit + 2) % DATA.outfits.length;
      saveState(); render();
    } else if (e.key === "Escape") {
      go("#toi");
    }
  }

  window.addEventListener("hashchange", render);
  window.addEventListener("keydown", onKey);
  Store.preload().then(render, render);
})();
